/* eslint-disable */
// @ts-nocheck
// Builds compact navigation metadata from the local ExB documentation export.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROJECT_ROOT } from './lib/project-root.mjs';
import { VENDOR_DIR, VENDOR_ROOT } from './lib/vendor.mjs';

const ROOT = PROJECT_ROOT;
const EXB_ROOT = VENDOR_ROOT;
const DOC_ROOT = path.join(EXB_ROOT, 'exb-api-ref-docs', 'experience-builder');
const OUT_DIR = path.join(ROOT, '.ai-context', 'exb', 'docs');
const SITE_PREFIX = '/experience-builder/';
const CANONICAL_ORIGIN = 'https://developers.arcgis.com';
const SUMMARY_LIMIT = 240;

const PATHS = {
  flisting: path.join(DOC_ROOT, 'flisting.htm'),
  xrefs: path.join(DOC_ROOT, 'experience-builder.xrefs.json'),
  apiIndex: path.join(DOC_ROOT, 'api-reference', 'index.html'),
  storybookIndex: path.join(DOC_ROOT, 'storybook', 'index.json'),
  storybookProject: path.join(DOC_ROOT, 'storybook', 'project.json'),
  exbVersion: path.join(EXB_ROOT, 'version.json'),
  sdkWidgets: path.join(EXB_ROOT, 'sdk-resources', 'widgets'),
};

const EXCLUDED_EXT = new Set([
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.cur', '.tif', '.tiff',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.flac',
  '.zip', '.gz', '.tgz', '.7z', '.rar', '.bz2', '.xz', '.pdf', '.wasm', '.bin', '.map',
]);
const EXCLUDED_PATH_RE = /(?:^|\/)(?:chunks?|i18n|t9n|nls|translations?|locales?|page-data|static|sb-(?:addons|common-assets|manager|preview))(?:\/|$)/i;
const COMPILED_ASSET_RE = /(?:\.min\.(?:js|css)$|\.bundle\.js$|^(?:app|component---|framework|webpack-runtime)-.*\.js$)/i;

function normalizePath (value) {
  return value.replace(/\\/g, '/');
}

function cleanCell (value, limit = Infinity) {
  return decodeHtml(String(value ?? ''))
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function decodeHtml (value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;|&#xA0;|&#160;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

function escapeRegex (value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function routeToLocalPath (route) {
  const relative = route.startsWith(SITE_PREFIX) ? route.slice(SITE_PREFIX.length) : route.replace(/^\//, '');
  return path.join(DOC_ROOT, ...relative.split('/').filter(Boolean), 'index.html');
}

function repoRelative (absolutePath) {
  return normalizePath(path.relative(ROOT, absolutePath));
}

function canonicalUrl (route) {
  return `${CANONICAL_ORIGIN}${route}`;
}

function normalizeVersion (version) {
  const parts = String(version ?? '').match(/\d+/g) ?? [];
  while (parts.length < 3) parts.push('0');
  return parts.slice(0, 3).join('.');
}

function getMeta (html, name) {
  const escaped = escapeRegex(name);
  const direct = new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i').exec(html);
  if (direct) return cleanCell(direct[1]);
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["']`, 'i').exec(html);
  return reversed ? cleanCell(reversed[1]) : '';
}

function getTitle (html) {
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (heading) return cleanCell(heading[1]);
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return title ? cleanCell(title[1]).replace(/\s*\|.*$/, '') : '';
}

function getSummary (html) {
  const mainStart = html.search(/<main\b|<article\b/i);
  const searchable = mainStart >= 0 ? html.slice(mainStart) : html;
  for (const match of searchable.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = cleanCell(match[1], SUMMARY_LIMIT);
    if (text && !/^copyright\b/i.test(text)) return text;
  }
  return '';
}

function slugTitle (slug) {
  return slug
    .split(/[\/-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function classifyRoute (route) {
  const parts = route.slice(SITE_PREFIX.length).split('/').filter(Boolean);
  const category = parts[0] ?? '';
  let routeKind = 'topic';
  let packageName = '';
  let slug = parts.at(-1) ?? '';

  if (category === 'api-reference') {
    packageName = parts[1] ?? '';
    routeKind = parts.length <= 2 ? 'container' : 'symbol';
  } else if (category === 'sample-code') {
    if (parts.includes('src') || parts.includes('lib')) routeKind = 'asset-subtree';
    else if (parts.length <= 2 || ['widgets', 'themes', 'data-action-widgets', 'data-source-widgets', 'layout-widgets', 'share-code-widgets', 'web-component-widgets'].includes(slug)) routeKind = 'container';
    else routeKind = 'sample';
  } else if (category === 'guide') {
    routeKind = parts.length === 1 || slug === 'core-concepts' || slug === 'tutorials' ? 'container' : 'topic';
  } else {
    routeKind = 'container';
  }

  return { category, routeKind, packageName, slug };
}

function isExcludedRoute (route) {
  const normalized = normalizePath(route);
  return /\/404\.html\/$/i.test(normalized) || EXCLUDED_EXT.has(path.extname(normalized).toLowerCase()) || COMPILED_ASSET_RE.test(path.basename(normalized));
}

function tsv (header, rows) {
  return `${header.join('\t')}\n${rows.map((row) => row.map((value) => cleanCell(value)).join('\t')).join('\n')}\n`;
}

async function exists (filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson (filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function discoverSdkSamples () {
  const samples = new Map();
  async function walk (dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && entry.name === 'manifest.json') {
        const manifest = await readJson(absolute);
        const sampleDir = path.dirname(absolute);
        const relative = normalizePath(path.relative(PATHS.sdkWidgets, sampleDir));
        const slug = relative.split('/').at(-1);
        const list = samples.get(slug) ?? [];
        list.push({
          path: repoRelative(sampleDir),
          version: cleanCell(manifest.exbVersion ?? manifest.version ?? ''),
        });
        samples.set(slug, list);
      }
    }
  }
  await walk(PATHS.sdkWidgets);
  return samples;
}

function getXrefMap (xrefsJson) {
  const byUrl = new Map();
  for (const [xrefId, value] of Object.entries(xrefsJson.xrefs ?? {})) {
    const valueRoute = `${SITE_PREFIX}${String(value.url ?? '').replace(/^\//, '')}`;
    const route = valueRoute.endsWith('/') ? valueRoute : `${valueRoute}/`;
    byUrl.set(route, { xrefId, title: cleanCell(value.title) });
  }
  return byUrl;
}

async function buildRoutes (flistingHtml, xrefsJson, docsVersion) {
  const xrefs = getXrefMap(xrefsJson);
  const routeSet = new Set();
  for (const match of flistingHtml.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)) {
    let route = decodeHtml(match[1]).trim();
    if (!route.startsWith(SITE_PREFIX)) continue;
    route = route.split(/[?#]/, 1)[0];
    route = route.endsWith('/') ? route : `${route}/`;
    !isExcludedRoute(route) && routeSet.add(route);
  }

  const rows = [];
  for (const route of [...routeSet].sort()) {
    const info = classifyRoute(route);
    const localPath = routeToLocalPath(route);
    const pathExists = await exists(localPath);
    const xref = xrefs.get(route);
    let title = xref?.title ?? '';
    let pageCanonical = '';
    let pageVersion = '';
    if (pathExists && (!title || info.routeKind === 'symbol')) {
      const html = await fs.readFile(localPath, 'utf8');
      title ||= getTitle(html);
      pageCanonical = getMeta(html, 'og:url');
      pageVersion = getMeta(html, 'version');
    }
    rows.push([
      route,
      info.category,
      info.routeKind,
      info.packageName,
      info.slug,
      title || slugTitle(info.slug),
      xref?.xrefId ?? '',
      pageVersion || docsVersion,
      repoRelative(localPath),
      pageCanonical || canonicalUrl(route),
      String(pathExists),
    ]);
  }
  return rows;
}

function parsePackageRows (apiIndexHtml, docsVersion) {
  const rows = [];
  for (const tr of apiIndexHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => cleanCell(match[1]));
    if (cells.length < 3 || !/^jimu-/.test(cells[0])) continue;
    const packageName = cells[0];
    const localPath = path.join(DOC_ROOT, 'api-reference', packageName, 'index.html');
    rows.push([
      packageName,
      cells[1],
      cells[2],
      docsVersion,
      repoRelative(localPath),
      canonicalUrl(`${SITE_PREFIX}api-reference/${packageName}/`),
    ]);
  }
  return rows.sort((a, b) => a[0].localeCompare(b[0]));
}

function memberAnchors (html, symbol) {
  const anchors = new Set();
  for (const match of html.matchAll(/<h[2-4]\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)) {
    const anchor = cleanCell(match[1]);
    if (anchor && anchor !== symbol && !/^(?:constructors?|properties|methods?|events?|parameters?|returns?)$/i.test(anchor)) anchors.add(anchor);
  }
  return [...anchors].sort();
}

function memberApiId (packageName, symbol, member, html) {
  const escaped = escapeRegex(member);
  const heading = new RegExp(`<h[2-4]\\b[^>]*id=["']${escaped}["'][^>]*>[\\s\\S]{0,1200}`, 'i').exec(html)?.[0] ?? '';
  const isStatic = /static/i.test(cleanCell(heading)) || /^[A-Z0-9_]+$/.test(member);
  return `${packageName}::${symbol}${isStatic ? '.' : '#'}${member}`;
}

async function buildApiReference (routeRows, docsVersion) {
  const rows = [];
  for (const routeRow of routeRows) {
    const [route, category, routeKind, packageName, symbol, , , , localRepoPath, canonical] = routeRow;
    if (category !== 'api-reference' || routeKind !== 'symbol') continue;
    const localPath = path.join(ROOT, ...localRepoPath.split('/'));
    if (!await exists(localPath)) continue;
    const html = await fs.readFile(localPath, 'utf8');
    const summary = getSummary(html);
    const version = getMeta(html, 'version') || docsVersion;
    rows.push([`${packageName}::${symbol}`, packageName, symbol, '', '', version, localRepoPath, canonical, '', summary]);
    for (const member of memberAnchors(html, symbol)) {
      rows.push([memberApiId(packageName, symbol, member, html), packageName, symbol, member, '', version, localRepoPath, canonical, member, '']);
    }
  }
  return rows.sort((a, b) => `${a[0]}\t${a[3]}`.localeCompare(`${b[0]}\t${b[3]}`));
}

function storybookEntrypoint (title) {
  const parts = String(title).split('/').filter(Boolean);
  if (parts[0] !== 'Components' || parts[1] !== 'jimu-ui' || parts.length < 4) return '';
  return parts.slice(1, -1).join('/').replace(/\/index$/, '');
}

function storybookComponent (title) {
  return String(title).split('/').filter(Boolean).at(-1) ?? '';
}

async function resolveDeclarationFile (candidate) {
  for (const filePath of [`${candidate}.d.ts`, path.join(candidate, 'index.d.ts'), candidate]) {
    if (await exists(filePath)) return filePath;
  }
  return '';
}

async function barrelExportsName (filePath, exportName, seen = new Set()) {
  const key = `${filePath}\0${exportName}`;
  if (seen.has(key)) return false;
  seen.add(key);
  const source = await fs.readFile(filePath, 'utf8');
  const escaped = escapeRegex(exportName);
  const directDeclaration = new RegExp(`\\bexport\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:class|interface|function|const|let|var|type|enum|namespace)\\s+${escaped}\\b`);
  if (directDeclaration.test(source)) return true;

  for (const match of source.matchAll(/\bexport\s+(?:type\s+)?\{([^}]+)\}(?:\s+from\s+["']([^"']+)["'])?/g)) {
    for (const item of match[1].split(',')) {
      const parts = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      const sourceName = parts[0]?.trim();
      const exportedName = (parts[1] ?? parts[0])?.trim();
      if (exportedName !== exportName) continue;
      if (!match[2]) return true;
      const target = await resolveDeclarationFile(path.resolve(path.dirname(filePath), match[2]));
      if (target && await barrelExportsName(target, sourceName, seen)) return true;
    }
  }

  for (const match of source.matchAll(/\bexport\s+\*\s+from\s+["']([^"']+)["']/g)) {
    const target = await resolveDeclarationFile(path.resolve(path.dirname(filePath), match[1]));
    if (target && await barrelExportsName(target, exportName, seen)) return true;
  }
  return false;
}

async function verifiedStorybookEntrypoint (candidate, component, cache) {
  if (!candidate || !component) return '';
  const key = `${candidate}\0${component}`;
  if (cache.has(key)) return cache.get(key);
  const relative = candidate === 'jimu-ui' ? 'index' : candidate.slice('jimu-ui/'.length);
  const barrel = await resolveDeclarationFile(path.join(EXB_ROOT, 'client', 'jimu-ui', relative));
  const verified = barrel && await barrelExportsName(barrel, component) ? candidate : '';
  cache.set(key, verified);
  return verified;
}

async function buildStorybook (storybookIndex, storybookProject) {
  const docVersion = cleanCell(storybookProject.storybookPackages?.storybook?.version ?? storybookProject.storybook ?? '');
  const rows = [];
  const exportCache = new Map();
  for (const entry of Object.values(storybookIndex.entries ?? {})) {
    if (!['docs', 'story'].includes(entry.type)) continue;
    const component = storybookComponent(entry.title);
    const candidateEntrypoint = storybookEntrypoint(entry.title);
    const entrypoint = await verifiedStorybookEntrypoint(candidateEntrypoint, component, exportCache);
    const apiId = component && entrypoint ? `${entrypoint}::${component}` : '';
    const routeType = entry.type === 'docs' ? 'docs' : 'story';
    rows.push([
      apiId,
      component,
      entrypoint,
      entry.title,
      entry.id,
      entry.name,
      entry.type,
      (entry.tags ?? []).join(','),
      entry.importPath ?? '',
      entry.componentPath ?? '',
      docVersion,
      `${VENDOR_DIR}/exb-api-ref-docs/experience-builder/storybook/index.html?path=/${routeType}/${entry.id}`,
      `${CANONICAL_ORIGIN}${SITE_PREFIX}storybook/?path=/${routeType}/${entry.id}`,
    ]);
  }
  return rows.sort((a, b) => `${a[3]}\t${a[4]}`.localeCompare(`${b[3]}\t${b[4]}`));
}

async function buildSampleMap (routeRows) {
  const sdkSamples = await discoverSdkSamples();
  const matchedSdkPaths = new Set();
  const rows = [];
  for (const routeRow of routeRows) {
    const [route, category, routeKind, , slug, , , , localDocPath] = routeRow;
    if (category !== 'sample-code') continue;
    if (routeKind === 'container') {
      rows.push([route, slug, route.split('/').filter(Boolean).at(-2) ?? '', localDocPath, '', '', 'category-container']);
      continue;
    }
    if (routeKind === 'asset-subtree') {
      rows.push([route, slug, 'asset-subtree', localDocPath, '', '', 'asset-subtree']);
      continue;
    }
    const candidates = sdkSamples.get(slug) ?? [];
    if (candidates.length === 1) {
      matchedSdkPaths.add(candidates[0].path);
      rows.push([route, slug, route.split('/').filter(Boolean).at(-2) ?? '', localDocPath, candidates[0].path, candidates[0].version, 'exact']);
    } else if (candidates.length > 1) {
      rows.push([route, slug, route.split('/').filter(Boolean).at(-2) ?? '', localDocPath, candidates.map((item) => item.path).join(','), candidates.map((item) => item.version).join(','), 'ambiguous']);
      candidates.forEach((candidate) => matchedSdkPaths.add(candidate.path));
    } else {
      rows.push([route, slug, route.split('/').filter(Boolean).at(-2) ?? '', localDocPath, '', '', 'docs-only']);
    }
  }
  for (const [slug, candidates] of sdkSamples) {
    for (const candidate of candidates) {
      if (!matchedSdkPaths.has(candidate.path)) rows.push(['', slug, 'sdk', '', candidate.path, candidate.version, 'sdk-only']);
    }
  }
  return rows.sort((a, b) => `${a[1]}\t${a[6]}\t${a[0]}`.localeCompare(`${b[1]}\t${b[6]}\t${b[0]}`));
}

function assertKnownRows (routeRows, packageRows, apiRows, storybookRows) {
  const counts = new Map();
  for (const row of routeRows) counts.set(row[1], (counts.get(row[1]) ?? 0) + 1);
  const expected = { 'sample-code': 49, guide: 161, 'api-reference': 345 };
  for (const [category, count] of Object.entries(expected)) {
    if (counts.get(category) !== count) throw new Error(`Expected ${count} ${category} routes, found ${counts.get(category) ?? 0}.`);
  }
  const enrichedGuideRoutes = routeRows.filter((row) => row[1] === 'guide' && row[6]).length;
  // The xref file has 77 guide entries for 74 unique URLs.
  if (enrichedGuideRoutes !== 74) throw new Error(`Expected 74 unique xref-enriched guide routes, found ${enrichedGuideRoutes}.`);
  if (packageRows.length !== 6) throw new Error(`Expected 6 API packages, found ${packageRows.length}.`);
  if (!apiRows.some((row) => row[0] === 'jimu-core::DataSourceManager')) throw new Error('Missing DataSourceManager API documentation row.');
  for (const component of ['Button', 'SettingSection', 'JimuLayerViewSelector']) {
    if (!storybookRows.some((row) => row[1] === component)) throw new Error(`Missing Storybook component ${component}.`);
  }
}

async function main () {
  for (const required of Object.values(PATHS)) {
    if (!await exists(required)) throw new Error(`Required index input is missing: ${repoRelative(required)}`);
  }

  const startedAt = Date.now();
  const [flistingHtml, xrefsJson, apiIndexHtml, storybookIndex, storybookProject, exbVersionJson] = await Promise.all([
    fs.readFile(PATHS.flisting, 'utf8'),
    readJson(PATHS.xrefs),
    fs.readFile(PATHS.apiIndex, 'utf8'),
    readJson(PATHS.storybookIndex),
    readJson(PATHS.storybookProject),
    readJson(PATHS.exbVersion),
  ]);

  const exbVersion = normalizeVersion(exbVersionJson.version ?? exbVersionJson.exbVersion);
  const docsVersion = normalizeVersion(getMeta(apiIndexHtml, 'version'));
  const storybookVersion = normalizeVersion(storybookProject.storybookPackages?.storybook?.version ?? storybookProject.storybook);
  if (!exbVersion || docsVersion !== exbVersion || storybookVersion !== exbVersion) {
    throw new Error(`Version mismatch: ExB=${exbVersion || 'unknown'} docs=${docsVersion || 'unknown'} Storybook=${storybookVersion || 'unknown'}.`);
  }

  const routeRows = await buildRoutes(flistingHtml, xrefsJson, docsVersion);
  const packageRows = parsePackageRows(apiIndexHtml, docsVersion);
  const [apiRows, sampleRows] = await Promise.all([
    buildApiReference(routeRows, docsVersion),
    buildSampleMap(routeRows),
  ]);
  const storybookRows = await buildStorybook(storybookIndex, storybookProject);
  assertKnownRows(routeRows, packageRows, apiRows, storybookRows);

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, 'routes.tsv'), tsv(['route', 'category', 'route_kind', 'package', 'slug', 'title', 'xref_id', 'doc_version', 'local_path', 'canonical_url', 'exists'], routeRows)),
    fs.writeFile(path.join(OUT_DIR, 'packages.tsv'), tsv(['package', 'purpose', 'key_symbols', 'doc_version', 'local_path', 'canonical_url'], packageRows)),
    fs.writeFile(path.join(OUT_DIR, 'api-reference.tsv'), tsv(['api_id', 'package', 'symbol', 'member', 'kind', 'doc_version', 'local_path', 'canonical_url', 'anchor', 'summary'], apiRows)),
    fs.writeFile(path.join(OUT_DIR, 'sample-code-map.tsv'), tsv(['route', 'sample_slug', 'category', 'local_doc_path', 'sdk_source_path', 'sdk_manifest_version', 'match_status'], sampleRows)),
    fs.writeFile(path.join(OUT_DIR, 'storybook.tsv'), tsv(['api_id', 'component', 'entrypoint', 'title_path', 'story_id', 'story_name', 'story_type', 'tags', 'story_source_path', 'component_path', 'doc_version', 'local_url', 'canonical_url'], storybookRows)),
    fs.writeFile(path.join(OUT_DIR, 'storybook-unresolved.tsv'), tsv(['component', 'candidate_entrypoint', 'title_path', 'story_id', 'reason'], storybookRows.filter((row) => !row[0]).map((row) => [row[1], storybookEntrypoint(row[3]), row[3], row[4], 'not-exported-from-candidate-barrel']))),
  ]);

  const brokenRoutes = routeRows.filter((row) => row[10] !== 'true').length;
  const sampleStatuses = Object.fromEntries([...new Set(sampleRows.map((row) => row[6]))].sort().map((status) => [status, sampleRows.filter((row) => row[6] === status).length]));
  console.log(`docs index: routes=${routeRows.length} packages=${packageRows.length} api=${apiRows.length} storybook=${storybookRows.length} storybookUnresolved=${storybookRows.filter((row) => !row[0]).length} samples=${sampleRows.length} broken=${brokenRoutes}`);
  console.log(`docs versions: exb=${exbVersion} docs=${docsVersion} storybook=${storybookVersion} elapsedMs=${Date.now() - startedAt}`);
  console.log(`sample status: ${Object.entries(sampleStatuses).map(([status, count]) => `${status}=${count}`).join(' ')}`);
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
