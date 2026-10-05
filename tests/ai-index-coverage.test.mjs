/* eslint-disable */
// @ts-nocheck
// Coverage-quality tests: is the generated index internally consistent, versioned, and honest about gaps?

import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadTsv, indexExists, INDEX_ROOT, ROOT } from './helpers.mjs';
import { VENDOR_ROOT } from '../src/lib/vendor.mjs';
import { installedExpectations } from '../src/lib/test-expectations.mjs';

const { knownGoodApiIds: KNOWN_GOOD_API_IDS, maxUnresolvedRatio: MAX_UNRESOLVED_RATIO, minApiUsageRatio: MIN_API_USAGE_RATIO } = installedExpectations();
const PUBLIC_VISIBILITIES = new Set([
  'public-documented',
  'public-storybook',
  'public-declared-undocumented',
]);
const PARITY_FILES = [
  { file: 'catalog.tsv', header: 'group\twidget\tlabel\texbVersion\tdependencies\tcomponents\thooks\tclasses\tsymbols' },
  { file: 'manifests.tsv', header: 'group\twidget\tname\tlabel\tversion\texbVersion\tdependency\tpublishMessages\tmessageActions\tdataActions\tlayouts\tproperties\textensions\tpath' },
  { file: 'module-usage.tsv', header: 'module\tfiles\twidgets\twidget_names' },
  { file: 'jsx-usage.tsv', header: 'tag\tfiles\twidgets\twidget_names' },
];

test('canonical catalog is versioned to the installed ExB', async () => {
  const metadata = await loadTsv('api/METADATA.tsv');
  const map = Object.fromEntries(metadata.map((row) => [row.key, row.value]));
  const version = JSON.parse(await fs.readFile(path.join(VENDOR_ROOT, 'version.json'), 'utf8'));
  assert.equal(map.exb_version, version.exbVersion, 'catalog exb_version drifted from version.json');
  assert.equal(map.status, 'complete', 'catalog build did not complete');
});

test('known-good API identities are present in the catalog', async () => {
  const symbols = await loadTsv('api/symbols.tsv');
  const ids = new Set(symbols.map((row) => row.api_id));
  for (const id of KNOWN_GOOD_API_IDS) {
    assert.ok(ids.has(id), `missing canonical identity: ${id}`);
  }
});

test('exports, declarations, and usage summaries all join to a catalog symbol', async () => {
  const symbols = await loadTsv('api/symbols.tsv');
  const ids = new Set(symbols.map((row) => row.api_id));
  const [exportsRows, declarationRows, summaryRows] = await Promise.all([
    loadTsv('api/exports.tsv'),
    loadTsv('api/declarations.tsv'),
    loadTsv('api-usage/summary.tsv'),
  ]);
  assert.equal(exportsRows.filter((row) => !ids.has(row.api_id)).length, 0, 'exports reference unknown api_id');
  assert.equal(declarationRows.filter((row) => !ids.has(row.api_id)).length, 0, 'declarations reference unknown api_id');
  assert.equal(summaryRows.filter((row) => !ids.has(row.api_id)).length, 0, 'usage summary references unknown api_id');
});

test('coverage ledger balances files seen against parsed and skipped', async () => {
  assert.ok(await indexExists('coverage.tsv'), 'coverage.tsv missing; run npm run ai:index:usages');
  const rows = await loadTsv('coverage.tsv');
  assert.ok(rows.length > 0, 'coverage ledger is empty');
  for (const row of rows) {
    const seen = Number(row.files_seen);
    const parsed = Number(row.files_parsed);
    const skipped = Number(row.files_skipped);
    assert.ok(seen >= 0 && parsed >= 0 && skipped >= 0, `negative counts in ${row.source_root}/${row.owner}`);
    assert.ok(parsed <= seen, `parsed exceeds seen in ${row.source_root}/${row.owner}`);
    assert.equal(parsed + skipped, seen, `seen != parsed + skipped in ${row.source_root}/${row.owner}`);
  }
});

test('file audit ledger holds a hash for every eligible source file', async () => {
  assert.ok(await indexExists('files.tsv'), 'files.tsv missing; run npm run ai:index:usages');
  const rows = await loadTsv('files.tsv');
  assert.ok(rows.length > 0, 'file ledger is empty');
  assert.equal(rows.filter((row) => !row.sha256).length, 0, 'files missing sha256');
  assert.equal(rows.filter((row) => row.excluded === 'true').length, 0, 'per-file ledger should hold only eligible files');
});

test('unresolved references stay a small fraction of resolved usages', async () => {
  const coverage = await loadTsv('coverage.tsv');
  const catalog = coverage.find((row) => row.source_root === 'api-catalog');
  const canonical = Number(catalog?.usages ?? 0);
  assert.ok(canonical > 0, 'expected a canonical usage total in coverage.tsv');
  const unresolved = await loadTsv('reports/unresolved-summary.tsv');
  const total = unresolved.reduce((sum, row) => sum + Number(row.occurrences || 0), 0);
  const ratio = total / canonical;
  assert.ok(ratio < MAX_UNRESOLVED_RATIO, `unresolved ratio ${ratio.toFixed(4)} exceeds ${MAX_UNRESOLVED_RATIO}`);
});

test('a healthy fraction of public APIs have at least one behavioral usage', async () => {
  const symbols = await loadTsv('api/symbols.tsv');
  const summary = await loadTsv('api-usage/summary.tsv');
  const publicTopLevel = symbols.filter((row) => !row.parent_api_id && PUBLIC_VISIBILITIES.has(row.visibility));
  const used = new Set(summary.filter((row) => Number(row.behavioral_usages || 0) > 0).map((row) => row.api_id));
  const covered = publicTopLevel.filter((row) => used.has(row.api_id)).length;
  const ratio = publicTopLevel.length ? covered / publicTopLevel.length : 0;
  assert.ok(ratio >= MIN_API_USAGE_RATIO, `API-to-usage ratio ${(ratio * 100).toFixed(1)}% below floor ${(MIN_API_USAGE_RATIO * 100).toFixed(0)}%`);
});

test('dist-widgets-ts is at file parity with dist-widgets for the reverse indexes', async () => {
  for (const { file, header } of PARITY_FILES) {
    assert.ok(await indexExists(`dist-widgets-ts/${file}`), `dist-widgets-ts missing ${file}`);
    const raw = await fs.readFile(path.join(INDEX_ROOT, 'dist-widgets-ts', file), 'utf8');
    const firstLine = raw.split(/\r?\n/)[0];
    assert.equal(firstLine, header, `header mismatch in dist-widgets-ts/${file}`);
  }
});
