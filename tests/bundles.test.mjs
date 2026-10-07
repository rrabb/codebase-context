import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import AdmZip from 'adm-zip';
import { bundleContext, installBundle, packBundle, readBundle } from '../src/lib/bundles.mjs';
import { PROJECT_ROOT, TOOL_ROOT } from '../src/lib/project-root.mjs';

function sample () {
  const root = mkdtempSync(path.join(os.tmpdir(), 'bundle-test-'));
  const context = { vendorId: 'exb', version: '1.20.0', vendorRoot: 'ArcGISExperienceBuilder', output: path.join(root, 'index') };
  mkdirSync(path.join(context.output, 'api'), { recursive: true });
  writeFileSync(path.join(context.output, 'api/METADATA.tsv'), 'key\tvalue\nexb_version\t1.20.0\nstatus\tcomplete\n');
  writeFileSync(path.join(context.output, 'symbols.tsv'), 'path\nArcGISExperienceBuilder/client/jimu-core/index.d.ts\n');
  const zip = path.join(root, 'index.zip');
  packBundle(context, zip);
  return { root, context, zip, data: readFileSync(zip), target: { ...context, output: path.join(root, 'target') } };
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

test('bundle round trip verifies hashes and keeps files byte for byte', async () => {
  const sampleData = sample();
  try {
    const { files } = installBundle(await readBundle(sampleData.zip), sampleData.target);
    assert.equal(files, 2);
    assert.deepEqual(readFileSync(path.join(sampleData.target.output, 'symbols.tsv')), readFileSync(path.join(sampleData.context.output, 'symbols.tsv')));
    assert.throws(() => installBundle(sampleData.data, sampleData.target), /--replace-index/);
    installBundle(sampleData.data, sampleData.target, { replace: true });
  } finally { rmSync(sampleData.root, { recursive: true, force: true }); }
});

test('a bundle built for another vendor folder name is refused', () => {
  const sampleData = sample();
  try {
    assert.throws(() => installBundle(sampleData.data, { ...sampleData.target, vendorRoot: 'vendor/exb' }), /built for vendor folder "ArcGISExperienceBuilder"/);
    assert.equal(existsSync(sampleData.target.output), false);
  } finally { rmSync(sampleData.root, { recursive: true, force: true }); }
});

test('invalid bundles preserve an existing index even with --replace-index', () => {
  const sampleData = sample();
  try {
    mkdirSync(sampleData.target.output);
    writeFileSync(path.join(sampleData.target.output, 'keep.txt'), 'keep');
    for (const mutate of [
      (zip) => zip.addFile('index/../../escape.txt', Buffer.from('bad')),
      (zip) => zip.addFile('index/C:/escape.txt', Buffer.from('bad')),
      (zip) => zip.addFile('index/SYMBOLS.tsv', Buffer.from('duplicate')),
      (zip) => zip.addFile('index/link.txt', Buffer.from('target'), '', (0o120777 << 16) >>> 0),
      (zip) => zip.updateFile('index/symbols.tsv', Buffer.from('tampered')),
      (zip) => zip.updateFile('bundle.json', Buffer.from('{}'))
    ]) {
      const zip = new AdmZip(sampleData.data);
      mutate(zip);
      assert.throws(() => installBundle(zip.toBuffer(), sampleData.target, { replace: true }));
      assert.equal(readFileSync(path.join(sampleData.target.output, 'keep.txt'), 'utf8'), 'keep');
    }
    assert.throws(() => installBundle(sampleData.data, { ...sampleData.target, version: '1.21.0' }), /version does not match/);
  } finally { rmSync(sampleData.root, { recursive: true, force: true }); }
});

test('dry run leaves no output; downloads need HTTPS and --sha256; wrong checksums fail', async () => {
  const sampleData = sample();
  try {
    assert.equal(installBundle(sampleData.data, sampleData.target, { dryRun: true }).files, 2);
    assert.throws(() => readFileSync(sampleData.target.output), /ENOENT/);
    await assert.rejects(readBundle('https://example.invalid/index.zip'), /requires --sha256/);
    await assert.rejects(readBundle('http://example.invalid/index.zip', '0'.repeat(64)), /require HTTPS/);
    await assert.rejects(readBundle(sampleData.zip, '0'.repeat(64)), /SHA-256 does not match/);
  } finally { rmSync(sampleData.root, { recursive: true, force: true }); }
});

test('HTTPS download validates data and refuses a redirect to HTTP', async () => {
  const sampleData = sample();
  const originalFetch = globalThis.fetch;
  const hash = sha256(sampleData.data);
  try {
    globalThis.fetch = async () => new Response(sampleData.data, { status: 200 });
    assert.deepEqual(await readBundle('https://example.invalid/index.zip', hash), sampleData.data);
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'http://example.invalid/index.zip' } });
    await assert.rejects(readBundle('https://example.invalid/index.zip', hash), /require HTTPS/);
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(readBundle('https://example.invalid/index.zip', hash), /HTTP 404/);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(sampleData.root, { recursive: true, force: true });
  }
});

test('install does not write through a symlinked output parent', () => {
  const sampleData = sample();
  try {
    const linked = path.join(sampleData.root, 'linked');
    symlinkSync(sampleData.context.output, linked, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => installBundle(sampleData.data, { ...sampleData.target, output: path.join(linked, 'new/index') }), /must not be a symlink/);
    assert.equal(existsSync(path.join(sampleData.context.output, 'new')), false);
  } finally { rmSync(sampleData.root, { recursive: true, force: true }); }
});

test('real vendor bundle installs in a second project and supports API lookup', (context) => {
  if (!existsSync(path.join(PROJECT_ROOT, '.codebase-context/config.json'))) {
    context.skip('needs a project with generated vendor indexes');
    return;
  }
  const source = bundleContext(PROJECT_ROOT);
  if (!existsSync(path.join(source.output, 'api/METADATA.tsv'))) {
    context.skip('needs generated vendor indexes');
    return;
  }
  const root = mkdtempSync(path.join(os.tmpdir(), 'bundle-real-test-'));
  try {
    const zip = path.join(root, 'real.zip');
    packBundle(source, zip);
    mkdirSync(path.join(root, '.codebase-context'));
    mkdirSync(path.join(root, source.vendorRoot), { recursive: true });
    writeFileSync(path.join(root, source.vendorRoot, 'version.json'), JSON.stringify({ exbVersion: source.version }));
    writeFileSync(path.join(root, '.codebase-context/config.json'), JSON.stringify({ vendors: [{ id: 'exb', root: source.vendorRoot, out: '.ai-context/exb' }] }));
    const destination = bundleContext(root);
    installBundle(readFileSync(zip), destination);
    const result = JSON.parse(execFileSync(process.execPath, [path.join(TOOL_ROOT, 'src/ai-find.mjs'), 'DataSourceManager', '--json'], { env: { ...process.env, CODEBASE_CONTEXT_PROJECT: root }, encoding: 'utf8' }));
    assert.equal(result.results[0].symbol.api_id, 'jimu-core::DataSourceManager');
    assert.ok(JSON.stringify(result.results[0].declarations).includes(`${source.vendorRoot}/client/`));
  } finally { rmSync(root, { recursive: true, force: true }); }
});