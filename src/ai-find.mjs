/* eslint-disable */
// @ts-nocheck

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fuse from 'fuse.js';
import { expandConcepts, rankDocs } from './lib/semantic.mjs';

import { PROJECT_ROOT } from './lib/project-root.mjs';
import { VENDOR_DIR } from './lib/vendor.mjs';

const ROOT = PROJECT_ROOT;
const INDEX_ROOT = path.join(ROOT, '.ai-context', 'exb');

function parseArgs (argv) {
  const options = { members: false, usages: 6, source: '', area: '', json: false, all: false, semantic: false, brief: false, in: '', terms: [] };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === '--members') options.members = true;
    else if (value === '--json') options.json = true;
    else if (value === '--all' || value === '--grep') options.all = true;
    else if (value === '--semantic') options.semantic = true;
    else if (value === '--brief') options.brief = true;
    else if (value === '--in') options.in = argv[++index] ?? '';
    else if (value === '--usages') options.usages = Number.parseInt(argv[++index] ?? '6', 10);
    else if (value === '--source') options.source = argv[++index] ?? '';
    else if (value === '--area') options.area = argv[++index] ?? '';
    else options.terms.push(value);
  }
  options.query = options.terms.join(' ').trim();
  return options;
}

function parseTsv (content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split('\t') ?? [];
  return lines.map((line) => Object.fromEntries(line.split('\t').map((value, index) => [header[index], value ?? ''])));
}

async function readTsvOptional (filePath) {
  try {
    return parseTsv(await fs.readFile(filePath, 'utf8'));
  } catch {
    return [];
  }
}

// Expand a few common identifier abbreviations so "DataSrcManager" reaches "DataSourceManager".
// Kept as deterministic query rewriting: their edit distance is too large for fuzzy matching alone.
const ABBREVIATIONS = { src: 'source', mgr: 'manager', cfg: 'config' };
function expandAbbrev (needle) {
  let out = needle;
  for (const [short, long] of Object.entries(ABBREVIATIONS)) {
    out = out.split(short).join(long);
  }
  return out;
}

function scoreText (query, values) {
  const base = query.toLowerCase();
  const needles = [...new Set([base, expandAbbrev(base)])];
  let score = 0;
  for (const needle of needles) {
    const fuzzyable = !needle.includes(' ') && needle.length >= 5;
    for (const [index, value] of values.entries()) {
      const text = String(value ?? '').toLowerCase();
      if (!text) continue;
      if (text === needle) score = Math.max(score, 1000 - index * 20);
      else if (text.startsWith(needle)) score = Math.max(score, 700 - index * 20);
      else if (text.includes(needle)) score = Math.max(score, 400 - index * 20);
      else if (needle.split(/\s+/).every((term) => text.includes(term))) score = Math.max(score, 250 - index * 20);
      else if (fuzzyable) {
        const leaf = text.split(/::|#|\./).pop();
        const { isMatch, score: fuseScore } = Fuse.match(needle, leaf, { threshold: 0.45, ignoreLocation: true });
        if (isMatch) score = Math.max(score, (1 - fuseScore) * 320 - index * 20);
      }
    }
  }
  return score;
}

function visibilityScore (visibility) {
  const scores = {
    'public-documented': 80,
    'public-storybook': 70,
    'public-declared-undocumented': 60,
    'internal-tagged': 20,
    'not-exported': 10,
    'implementation-private': 0,
  };
  return scores[visibility] ?? 5;
}

// Real Fuse.js Token Search over the full row set: per-word typo tolerance plus
// TF-IDF-weighted ranking, replacing the old bounded-Levenshtein fuzzy tier.
// A row's fuseScore (0=exact ... 1=worst) is kept alongside the combined rank score
// so callers can distinguish a confident match from a loose fuzzy neighbor.
function rankSymbolsWithFuse (rows, query) {
  if (!rows.length) return [];
  const index = new Fuse(rows, {
    keys: ['api_id', 'name', 'module_path'],
    includeScore: true,
    useTokenSearch: true,
    ignoreLocation: true,
    threshold: 0.45,
    minMatchCharLength: 2,
  });
  const base = query.toLowerCase();
  const queries = [...new Set([base, expandAbbrev(base)])];
  const bestByRow = new Map();
  for (const term of queries) {
    for (const { item, score } of index.search(term)) {
      const prior = bestByRow.get(item);
      if (prior === undefined || score < prior) bestByRow.set(item, score);
    }
  }
  return [...bestByRow.entries()]
    .map(([row, fuseScore]) => ({ row, fuseScore, score: (1 - fuseScore) * 1000 + visibilityScore(row.visibility) }))
    .sort((left, right) => right.score - left.score || left.row.api_id.localeCompare(right.row.api_id));
}

function packageHead (pkg) {
  return String(pkg || '').split('/')[0];
}

// Parse ratio per package, aggregating only non-excluded coverage rows (intentional
// exclusions like localization/binaries are not a health problem).
function buildCoverageHealth (rows) {
  const agg = new Map();
  for (const row of rows) {
    const owner = String(row.owner || '');
    if (owner.includes(':excluded:')) continue;
    const head = owner.split(/[:/]/)[0];
    if (!head) continue;
    const entry = agg.get(head) || { files_seen: 0, files_parsed: 0 };
    entry.files_seen += Number(row.files_seen || 0);
    entry.files_parsed += Number(row.files_parsed || 0);
    agg.set(head, entry);
  }
  const health = new Map();
  for (const [head, entry] of agg) {
    health.set(head, { ...entry, ratio: entry.files_seen ? entry.files_parsed / entry.files_seen : 1 });
  }
  return health;
}

const SKILL_BY_PACKAGE = {
  'jimu-ui': 'jimu-ui-components',
  'jimu-core': 'jimu-framework-apis',
  'jimu-arcgis': 'jimu-framework-apis',
  'jimu-data-source': 'jimu-framework-apis',
  'jimu-theme': 'jimu-framework-apis',
  'jimu-layouts': 'jimu-framework-apis',
  'jimu-for-builder': 'jimu-framework-apis',
  'jimu-for-test': 'jimu-framework-apis',
};

function skillFor (pkg) {
  return SKILL_BY_PACKAGE[packageHead(pkg)] ?? null;
}

// Deep-link to the member anchor on the API reference page when available.
function docUrlOf (docRow) {
  if (!docRow || !docRow.canonical_url) return '';
  return docRow.anchor ? `${docRow.canonical_url}#${docRow.anchor}` : docRow.canonical_url;
}

async function usageRowsFor (apiIds) {
  const usageDir = path.join(INDEX_ROOT, 'api-usage');
  let entries = [];
  try {
    entries = await fs.readdir(usageDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const rows = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.tsv') && item.name !== 'summary.tsv')) {
    const fileRows = await readTsvOptional(path.join(usageDir, entry.name));
    rows.push(...fileRows.filter((row) => apiIds.has(row.api_id)));
  }
  return rows;
}

function representativeUsages (rows, options) {
  const bindingKinds = new Set(['import', 'export', 'alias']);
  const filtered = rows
    .filter((row) => (!options.source || row.source_kind === options.source) && (!options.area || row.framework_area === options.area))
    .sort((left, right) => Number(bindingKinds.has(left.usage_kind)) - Number(bindingKinds.has(right.usage_kind)) || left.path.localeCompare(right.path));
  const selected = [];
  const usedOwners = new Set();
  const take = (sourceKind, limit) => {
    for (const row of filtered) {
      if (selected.length >= options.usages || limit <= 0 || row.source_kind !== sourceKind || usedOwners.has(row.owner)) continue;
      selected.push(row);
      usedOwners.add(row.owner);
      limit--;
    }
  };
  take('sdk-sample', 2);
  take('ootb-widget', 4);
  take('framework-test', 2);
  take('framework-internal', 2);
  for (const row of filtered) {
    if (selected.length >= options.usages) break;
    const key = `${row.path}:${row.start_line}:${row.start_column}`;
    if (!selected.some((item) => `${item.path}:${item.start_line}:${item.start_column}` === key)) selected.push(row);
  }
  return selected;
}

function storybookSelection (rows) {
  const docs = rows.filter((row) => row.story_type === 'docs').slice(0, 1);
  const stories = rows.filter((row) => row.story_type === 'story').slice(0, 3);
  return [...docs, ...stories];
}

function aggregateUsageSummary (rows) {
  const bindingKinds = new Set(['import', 'export', 'alias']);
  return {
    behavioral_usages: rows.filter((row) => !bindingKinds.has(row.usage_kind)).length,
    binding_usages: rows.filter((row) => bindingKinds.has(row.usage_kind)).length,
    files: new Set(rows.map((row) => row.path)).size,
    owners: new Set(rows.map((row) => row.owner)).size,
  };
}

function formatLocation (row) {
  const line = row.start_line || row.source_line || '';
  return line ? `${row.path || row.source_path}:${line}${row.start_column ? `:${row.start_column}` : ''}` : row.path || row.source_path || '';
}

// Map a symbol's package/module path to its minified runtime bundle (see CLIENT-RUNTIME-MAP.md).
function runtimeBundleFor (row) {
  const base = `${VENDOR_DIR}/client/dist`;
  const mod = String(row?.module_path || row?.package || '');
  if (!mod) return null;
  if (mod.startsWith('jimu-ui/advanced/')) return `${base}/jimu-ui/advanced/${mod.split('/')[2]}.js`;
  if (mod.startsWith('jimu-ui/basic/')) return `${base}/jimu-ui/basic/${mod.split('/')[2]}.js`;
  const area = mod.split('/')[0];
  const map = {
    'jimu-core': `${base}/jimu-core/index.js`,
    'jimu-arcgis': `${base}/jimu-arcgis/index.js`,
    'jimu-data-source': `${base}/jimu-data-source/index.js`,
    'jimu-for-builder': `${base}/jimu-for-builder/index.js`,
    'jimu-layouts': `${base}/jimu-layouts/layout-runtime.js`,
    'jimu-theme': `${base}/jimu-theme/index.js`,
    'jimu-ui': `${base}/jimu-ui/index.js`,
  };
  return map[area] ?? null;
}

function isAppAction (row) {
  return !!row && (String(row.module_path || '').includes('app-actions') || String(row.api_id || '').includes('app-actions'));
}

// A confident match is exact, an abbreviation-expanded exact match, or typo-close;
// this is well below the score a same-family-but-different symbol gets from token search.
const CONFIDENT_MATCH_THRESHOLD = 0.15;

// A result is thin when nothing explains the symbol: no docs, no storybook, no behavioral usages.
function resultIsThin (result) {
  return result.docs.length === 0 && result.storybook.length === 0 &&
    (!result.summary || Number(result.summary.behavioral_usages || 0) === 0);
}

function printEscalation (escalation) {
  console.log('\n! Thin local evidence. This symbol has a declaration but little meaning attached. Escalate:');
  if (escalation.mentions.length) {
    console.log('  1) Named in readable source comments/strings (open these - the wrapper is often nearby):');
    for (const m of escalation.mentions) console.log(`       ${m.path}:${m.line}  [${m.kind}${m.group ? ` ${m.group}/${m.widget}` : ''}]`);
  } else {
    console.log('  1) Grep readable source text incl. comments:');
    console.log(`       grep -rin "${escalation.query}" ${VENDOR_DIR}/client/dist/widgets ${VENDOR_DIR}/sdk-resources`);
  }
  console.log('  2) Trace the runtime bundle (see .ai-context/exb/CLIENT-RUNTIME-MAP.md):');
  console.log(`       ${escalation.bundle || 'select the bundle for this API package from CLIENT-RUNTIME-MAP.md'}`);
  if (escalation.isAppAction) {
    console.log('       app-action creator: dispatched internally - find the Manager wrapper that calls it, then in');
    console.log('       dist/jimu-core/index.js grep the ActionKeys string constant + stable enum member and the reducer `case`.');
  }
  console.log('  Keep the .d.ts as the type contract; treat minified findings as generated-runtime and version-specific.');
}

function printText (results, capabilityRows) {
  if (!results.length && !capabilityRows.length) {
    console.log('No indexed evidence matched.');
    return;
  }
  for (const result of results) {
    console.log(`\n${result.symbol.api_id}  [${result.symbol.kind}; ${result.symbol.visibility}; ${result.symbol.match_status}]`);
    if (!result.confidentMatch) console.log('  ! loose fuzzy match: verify this is really the symbol you meant');
    for (const member of result.matchedMembers) console.log(`  matched member: ${member.api_id}  [${member.kind}]${member.docUrl ? `  ${member.docUrl}` : ''}`);
    if (result.exports.length) console.log(`  exports: ${result.exports.map((row) => `${row.export_module}::${row.export_name}${row.canonical === 'true' ? ' (canonical)' : ''}`).join(', ')}`);
    if (result.skill) console.log(`  see skill: ${result.skill}`);
    if (result.docs.length) console.log(`  docs: ${docUrlOf(result.docs[0])}  ${result.docs[0].summary}`.trimEnd());
    for (const story of result.storybook) console.log(`  storybook ${story.story_type}: ${story.story_name}  ${story.canonical_url}`);
    for (const declaration of result.declarations.slice(0, 3)) console.log(`  declaration: ${formatLocation(declaration)}  ${declaration.declaration_kind}`);
    if (result.members.length) console.log(`  members: ${result.members.map((row) => row.member_name).join(', ')}`);
    for (const link of result.memberDocLinks) console.log(`  member doc ${link.member}: ${link.url}`);
    if (result.summary) console.log(`  usages: behavioral=${result.summary.behavioral_usages} bindings=${result.summary.binding_usages} files=${result.summary.files} owners=${result.summary.owners}`);
    for (const usage of result.usages) console.log(`  ${usage.source_kind}/${usage.framework_area}: ${formatLocation(usage)}  ${usage.usage_kind}  owner=${usage.owner}`);
    if (result.coverageHealth && result.coverageHealth.ratio < 0.95) console.log(`  ! coverage: only ${(result.coverageHealth.ratio * 100).toFixed(0)}% of ${packageHead(result.symbol.package)} source parsed; usage evidence may be partial`);
  }
  if (capabilityRows.length) {
    console.log('\nRelated documentation:');
    for (const row of capabilityRows.slice(0, 10)) console.log(`  ${row.title || row.symbol || row.package}: ${row.canonical_url}`);
  }
}

// --brief: confident matches only, one line per fact, no storybook or related-docs blocks.
function printBrief (results) {
  if (!results.length) {
    console.log('No indexed evidence matched.');
    return;
  }
  const confident = results.filter((result) => result.confidentMatch);
  const shown = confident.length ? confident : results.slice(0, 1);
  for (const result of shown) {
    console.log(`${result.symbol.api_id}  [${result.symbol.kind}; ${result.symbol.visibility}]`);
    !result.confidentMatch && console.log('  ! loose fuzzy match: verify this is really the symbol you meant');
    for (const member of result.matchedMembers) console.log(`  matched member: ${member.api_id}  [${member.kind}]`);
    result.declarations.length && console.log(`  declaration: ${formatLocation(result.declarations[0])}`);
    result.docUrl && console.log(`  docs: ${result.docUrl}`);
    result.skill && console.log(`  see skill: ${result.skill}`);
    result.members.length && console.log(`  members: ${result.members.map((row) => row.member_name).join(', ')}`);
    result.summary && console.log(`  usages: behavioral=${result.summary.behavioral_usages} files=${result.summary.files} owners=${result.summary.owners}  (list them with --in <group/widget or path>)`);
  }
  const others = results.filter((result) => !shown.includes(result));
  others.length && console.log(`other candidates: ${others.map((result) => result.symbol.api_id).join(', ')}`);
}

// Accepts an owner (`common/list`), a group (`common`), or a path prefix or segment.
function inScope (row, scope) {
  const target = scope.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '').toLowerCase();
  if (!target)
    return true;
  const owner = String(row.owner || '').toLowerCase();
  const rowPath = String(row.path || '').toLowerCase();
  return owner === target || owner.startsWith(`${target}/`) || rowPath.startsWith(`${target}/`) || rowPath.includes(`/${target}/`);
}

function localId (apiId) {
  const id = String(apiId).toLowerCase();
  const separator = id.indexOf('::');
  return (separator >= 0 ? id.slice(separator + 2) : id).replace(/#/g, '.');
}

// Resolution order: exact api_id or `Owner.member`, then exact member name, then confident ranked matches.
function scopedTargets (symbols, ranked, query) {
  const needle = query.toLowerCase().replace(/#/g, '.');
  const exact = symbols.filter((row) => row.api_id.toLowerCase() === needle || localId(row.api_id) === needle);
  if (exact.length)
    return exact;
  const members = symbols.filter((row) => row.parent_api_id && String(row.member_name ?? '').toLowerCase() === needle);
  if (members.length)
    return members;
  return ranked.filter((item) => item.fuseScore <= CONFIDENT_MATCH_THRESHOLD).map((item) => item.row);
}

async function runScoped (options, symbols, ranked) {
  const targets = scopedTargets(symbols, ranked, options.query);
  const targetOf = new Map();
  for (const target of targets) {
    targetOf.set(target.api_id, target.api_id);
    if (target.parent_api_id)
      continue;
    for (const member of symbols) {
      member.parent_api_id === target.api_id && targetOf.set(member.api_id, target.api_id);
    }
  }
  const rows = (await usageRowsFor(new Set(targetOf.keys())))
    .filter((row) => inScope(row, options.in) && (!options.source || row.source_kind === options.source) && (!options.area || row.framework_area === options.area))
    .sort((left, right) => left.path.localeCompare(right.path) || Number(left.start_line) - Number(right.start_line) || Number(left.start_column) - Number(right.start_column));
  const files = [...new Set(rows.map((row) => row.path))];

  if (options.json) {
    console.log(JSON.stringify({
      query: options.query,
      mode: 'in',
      scope: options.in,
      targets: targets.map((row) => ({ api_id: row.api_id, kind: row.kind })),
      count: rows.length,
      files,
      jsxAttributeCaveat: !rows.length && targets.some((row) => row.kind === 'interface-member'),
      usages: rows.map((row) => ({ api_id: row.api_id, path: row.path, line: Number(row.start_line), column: Number(row.start_column), usage_kind: row.usage_kind, owner: row.owner })),
    }, null, 2));
    return;
  }

  if (!targets.length) {
    console.log(`No confident match for "${options.query}". Re-run with an exact api_id or Owner.member name.`);
    ranked.length && console.log(`candidates: ${ranked.slice(0, 8).map((item) => item.row.api_id).join(', ')}`);
    return;
  }
  console.log(`${targets.map((row) => `${row.api_id} [${row.kind}]`).join(', ')}`);
  console.log(`${rows.length} usage(s) in "${options.in}" across ${files.length} file(s)`);
  if (options.brief) {
    for (const file of files) {
      const lines = [...new Set(rows.filter((row) => row.path === file).map((row) => Number(row.start_line)))];
      console.log(`  ${file}: ${lines.join(', ')}`);
    }
  } else {
    for (const row of rows) {
      const member = targetOf.get(row.api_id) === row.api_id ? '' : `  ${row.api_id}`;
      console.log(`  ${formatLocation(row)}  ${row.usage_kind}${member}`);
    }
  }
  const leaf = targets[0].name || localId(targets[0].api_id).split('.').pop();
  !rows.length && targets.some((row) => row.kind === 'interface-member') && console.log('! A JSX attribute is indexed only when its component props type is cataloged or named <Component>Props; 0 does not prove the prop is unused.');
  console.log(`The index covers parsed source only. Confirm with a literal search for "${leaf}" in the same scope.`);
}

async function main () {
  const options = parseArgs(process.argv.slice(2));
  if (!options.query) throw new Error('Usage: npm run ai:find -- <term> [--members] [--usages N] [--source KIND] [--area AREA] [--all] [--semantic] [--brief] [--in SCOPE] [--json]');

  const [symbols, declarations, exports, summary, docs, storybook, routes, packages, mentions, coverage] = await Promise.all([
    readTsvOptional(path.join(INDEX_ROOT, 'api', 'symbols.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'api', 'declarations.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'api', 'exports.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'api-usage', 'summary.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'docs', 'api-reference.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'docs', 'storybook.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'docs', 'routes.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'docs', 'packages.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'mentions.tsv')),
    readTsvOptional(path.join(INDEX_ROOT, 'coverage.tsv')),
  ]);
  if (!symbols.length) throw new Error('Canonical API index is missing. Run npm run ai:index:rich first.');

  const coverageHealth = buildCoverageHealth(coverage);

  // Exhaustive substring listing (case-insensitive), bypassing the ranked top-N cap.
  if (options.all) {
    const needle = options.query.replace(/[*?]/g, '').toLowerCase();
    const matches = symbols
      .filter((row) => [row.api_id, row.name, row.module_path].some((value) => String(value ?? '').toLowerCase().includes(needle)))
      .sort((left, right) => visibilityScore(right.visibility) - visibilityScore(left.visibility) || left.api_id.localeCompare(right.api_id));
    if (options.json) console.log(JSON.stringify({ query: options.query, mode: 'all', count: matches.length, matches: matches.map((row) => ({ api_id: row.api_id, kind: row.kind, visibility: row.visibility })) }, null, 2));
    else {
      console.log(`${matches.length} symbol(s) matching "${needle}":`);
      for (const row of matches) console.log(`  ${row.api_id}  [${row.kind}; ${row.visibility}]`);
    }
    return;
  }

  const scoreSymbols = (rows) => rankSymbolsWithFuse(rows, options.query);
  const topLevelRanked = scoreSymbols(symbols.filter((row) => !row.parent_api_id));
  let ranked = (topLevelRanked.length ? topLevelRanked : scoreSymbols(symbols.filter((row) => row.parent_api_id))).slice(0, 12);

  // A bare member name (e.g. createDataSourceByUseDataSource) only fuzzy-matches top-level names, so resolve it to its owners.
  const needle = options.query.toLowerCase();
  const memberHits = symbols.filter((row) => row.parent_api_id && String(row.member_name ?? '').toLowerCase() === needle);
  const hasConfidentTopLevel = topLevelRanked.some((item) => item.fuseScore <= CONFIDENT_MATCH_THRESHOLD);
  if (memberHits.length && !hasConfidentTopLevel) {
    const symbolById = new Map(symbols.map((row) => [row.api_id, row]));
    ranked = [...new Set(memberHits.map((row) => row.parent_api_id))]
      .map((id) => symbolById.get(id))
      .filter(Boolean)
      .sort((left, right) => visibilityScore(right.visibility) - visibilityScore(left.visibility) || left.api_id.localeCompare(right.api_id))
      .slice(0, 12)
      .map((row) => ({ row, fuseScore: 0 }));
  }
  if (options.in) {
    await runScoped(options, symbols, ranked);
    return;
  }
  const matchedParents = new Set(ranked.map((item) => item.row.api_id));
  const memberRows = symbols.filter((row) => matchedParents.has(row.parent_api_id));
  const usageIds = new Set([...matchedParents, ...memberRows.map((row) => row.api_id)]);
  const usages = await usageRowsFor(usageIds);

  const results = ranked.map(({ row, fuseScore }) => {
    const childMembers = memberRows.filter((member) => member.parent_api_id === row.api_id);
    const resultUsages = usages.filter((usage) => usage.api_id === row.api_id || childMembers.some((member) => member.api_id === usage.api_id));
    const matchedMembers = memberHits.filter((member) => member.parent_api_id === row.api_id);
    return {
      symbol: row,
      matchedMembers: matchedMembers.map((member) => ({ api_id: member.api_id, kind: member.kind, docUrl: docUrlOf(docs.find((item) => item.api_id === member.api_id)) })),
      skill: skillFor(row.package),
      matchConfidence: fuseScore,
      confidentMatch: fuseScore <= CONFIDENT_MATCH_THRESHOLD,
      coverageHealth: coverageHealth.get(packageHead(row.package)) ?? null,
      exports: exports.filter((item) => item.api_id === row.api_id),
      declarations: declarations.filter((item) => item.api_id === row.api_id),
      docs: docs.filter((item) => item.api_id === row.api_id),
      docUrl: docUrlOf(docs.find((item) => item.api_id === row.api_id)),
      storybook: storybookSelection(storybook.filter((item) => item.api_id === row.api_id)),
      members: options.members ? childMembers : [],
      memberDocLinks: options.members
        ? childMembers
          .map((member) => ({ member: member.member_name, url: docUrlOf(docs.find((item) => item.api_id === member.api_id)) }))
          .filter((entry) => entry.url)
        : [],
      summary: resultUsages.length ? aggregateUsageSummary(resultUsages) : summary.find((item) => item.api_id === row.api_id) ?? null,
      usages: representativeUsages(resultUsages, options),
    };
  });

  const capabilityCandidates = [
    ...packages.filter((row) => scoreText(options.query, [row.package, row.purpose, row.key_symbols]) > 0),
    ...routes.filter((row) => scoreText(options.query, [row.title, row.slug]) > 0),
    ...docs.filter((row) => scoreText(options.query, [row.symbol, row.member, row.summary]) > 0),
  ].filter((row) => !results.some((result) => result.docs.some((doc) => doc.api_id === row.api_id)));
  const capabilityRows = [...new Map(capabilityCandidates.map((row) => [row.canonical_url, row])).values()];

  // Gate thin/escalation on confident matches only, so a loose fuzzy neighbor's real
  // evidence can never silently suppress escalation for an evidence-free literal target.
  const confidentResults = results.filter((result) => result.confidentMatch);
  const gateResults = confidentResults.length ? confidentResults : results;
  const thin = !results.length || gateResults.every(resultIsThin);
  const candidateNames = new Set([options.query.toLowerCase(), ...ranked.map(({ row }) => String(row.name).toLowerCase())]);
  const mentionMatches = mentions.filter((row) => candidateNames.has(String(row.name).toLowerCase())).slice(0, 8);
  const topRow = results[0]?.symbol ?? null;
  const escalation = thin
    ? { query: options.query, topSymbol: topRow?.api_id ?? null, bundle: runtimeBundleFor(topRow), isAppAction: isAppAction(topRow), mentions: mentionMatches }
    : null;

  const semanticDocumentation = options.semantic
    ? [...new Map(rankDocs(expandConcepts(options.query), [...docs, ...packages, ...routes], 20)
      .map((row) => ({ label: row.symbol || row.title || row.package || row.member || '', url: docUrlOf(row) || row.canonical_url || '' }))
      .filter((entry) => entry.url)
      .map((entry) => [entry.url, entry])).values()].slice(0, 10)
    : [];

  if (options.json) console.log(JSON.stringify({ query: options.query, results, relatedDocumentation: capabilityRows.slice(0, 10), semanticDocumentation, escalation }, null, 2));
  else {
    options.brief ? printBrief(results) : printText(results, capabilityRows);
    if (semanticDocumentation.length) {
      console.log('\nSemantic matches:');
      for (const entry of semanticDocumentation) console.log(`  ${entry.label}: ${entry.url}`);
    }
    if (escalation) printEscalation(escalation);
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});