import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import AdmZip from 'adm-zip';
import { TOOL_ROOT } from './project-root.mjs';

const MAX_ZIP_BYTES = 128 * 1024 * 1024;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const MAX_FILES = 10000;
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const versionPattern = /^\d+\.\d+\.\d+$/;

// Windows antivirus and search indexing can briefly lock files that were just written.
function renameWithRetry (from, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      return renameSync(from, to);
    } catch (error) {
      if (attempt >= 8 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code))
        throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * 2 ** attempt);
    }
  }
}

function safePath (name) {
  return typeof name === 'string' && name.length > 0 && name.length < 240 &&
    !/[\\:\x00-\x1f]/.test(name) && !name.startsWith('/') &&
    name.split('/').every((part) => part && part !== '.' && part !== '..' &&
      !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}

export function bundleContext (project, id = 'exb') {
  const config = JSON.parse(readFileSync(path.join(project, '.codebase-context/config.json'), 'utf8'));
  const vendor = config.vendors.find((item) => item.id === id);
  if (!vendor || !safePath(vendor.root) || !safePath(vendor.out) || vendor.out === vendor.root || vendor.out.startsWith(`${vendor.root}/`) || vendor.root.startsWith(`${vendor.out}/`)) {
    throw new Error('Bundle vendor root and output must be separate project-relative folders.');
  }
  if (config.project?.out && (vendor.out === config.project.out || vendor.out.startsWith(`${config.project.out}/`) || config.project.out.startsWith(`${vendor.out}/`))) {
    throw new Error('Vendor index output must not overlap project facts.');
  }
  const pkg = JSON.parse(readFileSync(path.join(vendor.package ? path.resolve(project, vendor.package) : path.join(TOOL_ROOT, 'vendors', id), 'vendor.json'), 'utf8'));
  const version = JSON.parse(readFileSync(path.join(project, vendor.root, pkg.version.file), 'utf8'))[pkg.version.path];
  if (!versionPattern.test(version))
    throw new Error('Missing or invalid installed vendor version.');
  return { vendorId: id, version, vendorRoot: vendor.root, output: path.join(project, vendor.out) };
}

export function packBundle (context, destination) {
  const metadata = readFileSync(path.join(context.output, 'api/METADATA.tsv'), 'utf8');
  if (!metadata.split(/\r?\n/).includes(`exb_version\t${context.version}`) || !metadata.split(/\r?\n/).includes('status\tcomplete')) {
    throw new Error('Index metadata must be complete and match the installed vendor version.');
  }
  const archive = new AdmZip();
  const files = [];
  let total = 0;
  function visit (dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      const relative = prefix + name;
      if (!safePath(relative))
        throw new Error(`Unsafe index path: ${relative}`);
      const absolute = path.join(dir, name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink())
        throw new Error(`Index links cannot be packed: ${relative}`);
      if (stat.isDirectory()) {
        visit(absolute, `${relative}/`);
      } else {
        if (!stat.isFile() || !/\.(tsv|json|md|txt)$/.test(name))
          throw new Error(`Not an index text file: ${relative}`);
        if (stat.size > MAX_FILE_BYTES || (total += stat.size) > MAX_TOTAL_BYTES || files.length >= MAX_FILES)
          throw new Error('Index exceeds bundle size limits.');
        const data = readFileSync(absolute);
        files.push({ path: relative, bytes: data.length, sha256: sha256(data) });
        archive.addFile(`index/${relative}`, data);
      }
    }
  }
  visit(context.output);
  const manifest = { format: 1, vendorId: context.vendorId, version: context.version, vendorRoot: context.vendorRoot, files };
  archive.addFile('bundle.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  const zip = archive.toBuffer();
  if (zip.length > MAX_ZIP_BYTES)
    throw new Error('Compressed bundle exceeds 128 MB.');
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, zip, { flag: 'wx' });
  return { files: files.length, bytes: zip.length, sha256: sha256(zip) };
}

function readEntry (entry, maxBytes = MAX_FILE_BYTES) {
  if (entry.isDirectory || entry.header.encrypted || entry.header.size > maxBytes || ![0, 8].includes(entry.header.method)) {
    throw new Error(`Unsupported or oversized ZIP entry: ${entry.entryName}`);
  }
  const compressed = entry.getCompressedData();
  const data = entry.header.method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: maxBytes });
  if (data.length !== entry.header.size || data.length > maxBytes)
    throw new Error(`ZIP size mismatch: ${entry.entryName}`);
  return data;
}

export async function readBundle (source, expectedHash) {
  const remote = /^https?:/i.test(source);
  if (remote && !expectedHash)
    throw new Error('Downloading a bundle requires --sha256 <hash> from a trusted source.');
  let data;
  if (remote) {
    let url = new URL(source);
    const signal = AbortSignal.timeout(120000);
    for (let redirects = 0; ; redirects++) {
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('Bundle downloads require HTTPS without URL credentials.');
      const response = await fetch(url, { redirect: 'manual', signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= 5 || !response.headers.get('location'))
          throw new Error('Too many or invalid download redirects.');
        await response.body?.cancel();
        url = new URL(response.headers.get('location'), url);
        continue;
      }
      if (!response.ok)
        throw new Error(`Bundle download failed: HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > MAX_ZIP_BYTES) {
        await response.body?.cancel();
        throw new Error('Bundle download exceeds 128 MB.');
      }
      const chunks = [];
      let bytes = 0;
      for await (const chunk of response.body) {
        if ((bytes += chunk.length) > MAX_ZIP_BYTES)
          throw new Error('Bundle download exceeds 128 MB.');
        chunks.push(chunk);
      }
      data = Buffer.concat(chunks);
      break;
    }
  } else {
    if (statSync(source).size > MAX_ZIP_BYTES)
      throw new Error('Bundle exceeds 128 MB.');
    data = readFileSync(source);
  }
  if (expectedHash && (!/^[a-f0-9]{64}$/i.test(expectedHash) || sha256(data) !== expectedHash.toLowerCase()))
    throw new Error('Bundle SHA-256 does not match.');
  return data;
}

export function installBundle (data, context, { replace = false, dryRun = false } = {}) {
  if (data.length > MAX_ZIP_BYTES)
    throw new Error('Bundle exceeds 128 MB.');
  const entries = new AdmZip(data).getEntries();
  const names = new Set();
  let total = 0;
  for (const entry of entries) {
    const name = entry.entryName;
    const type = (entry.attr >>> 16) & 0xf000;
    if (!safePath(name) || (type && type !== 0x8000) || names.has(name.toLowerCase()))
      throw new Error(`Unsafe or duplicate ZIP entry: ${name}`);
    names.add(name.toLowerCase());
    if ((total += entry.header.size) > MAX_TOTAL_BYTES || names.size > MAX_FILES + 1)
      throw new Error('Bundle exceeds unpacked size limits.');
  }
  const manifestEntry = entries.find((entry) => entry.entryName === 'bundle.json');
  if (!manifestEntry)
    throw new Error('Missing bundle.json.');
  const manifest = JSON.parse(readEntry(manifestEntry, 1024 * 1024).toString('utf8'));
  if (manifest.format !== 1 || manifest.vendorId !== context.vendorId || manifest.version !== context.version || !safePath(manifest.vendorRoot) || !Array.isArray(manifest.files)) {
    throw new Error('Bundle format, vendor, or version does not match the installed vendor.');
  }
  if (manifest.vendorRoot !== context.vendorRoot) {
    throw new Error(`Bundle was built for vendor folder "${manifest.vendorRoot}" but this project uses "${context.vendorRoot}". Index paths start with the folder name, so they must match. Rename the folder or regenerate the index locally (npm run ai:refresh).`);
  }
  if (entries.length !== manifest.files.length + 1 || !manifest.files.length)
    throw new Error('Bundle file list does not match ZIP contents.');
  const verified = [];
  const paths = new Set();
  for (const file of manifest.files) {
    if (!safePath(file.path) || !/\.(tsv|json|md|txt)$/.test(file.path) || paths.has(file.path.toLowerCase()) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > MAX_FILE_BYTES)
      throw new Error('Invalid bundle file record.');
    paths.add(file.path.toLowerCase());
    const entry = entries.find((item) => item.entryName === `index/${file.path}`);
    if (!entry)
      throw new Error(`Missing index entry: ${file.path}`);
    const content = readEntry(entry);
    if (content.length !== file.bytes || sha256(content) !== file.sha256)
      throw new Error(`Bundle file checksum mismatch: ${file.path}`);
    verified.push({ path: file.path, content });
  }
  const metadata = verified.find((file) => file.path === 'api/METADATA.tsv')?.content.toString('utf8').split(/\r?\n/);
  if (!metadata?.includes(`exb_version\t${context.version}`) || !metadata.includes('status\tcomplete'))
    throw new Error('Bundle index metadata is incomplete or mismatched.');
  if (existsSync(context.output) && !replace)
    throw new Error('Index output already exists. Use --replace-index to replace it after validation.');
  if (dryRun)
    return { files: verified.length };
  const parent = path.dirname(context.output);
  for (let dir = parent; ; dir = path.dirname(dir)) {
    if (existsSync(dir) && lstatSync(dir).isSymbolicLink())
      throw new Error('Index output parent must not be a symlink.');
    if (path.dirname(dir) === dir)
      break;
  }
  mkdirSync(parent, { recursive: true });
  const stage = mkdtempSync(path.join(parent, '.bundle-'));
  const old = `${stage}-previous`;
  let moved = false;
  try {
    for (const file of verified) {
      const target = path.join(stage, file.path);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, file.content, { flag: 'wx' });
    }
    if (existsSync(context.output)) {
      if (lstatSync(context.output).isSymbolicLink())
        throw new Error('Index output must not be a symlink.');
      renameWithRetry(context.output, old);
      moved = true;
    }
    try {
      renameWithRetry(stage, context.output);
    } catch (error) {
      moved && renameWithRetry(old, context.output);
      throw error;
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  moved && rmSync(old, { recursive: true, force: true });
  return { files: verified.length };
}