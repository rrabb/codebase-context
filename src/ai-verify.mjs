/* eslint-disable */
// @ts-nocheck
// Freshness + coverage gate for the ExB evidence index. Exits non-zero on version drift,
// a missing/empty required index, or an API-to-usage ratio below the floor. For CI and
// pre-regeneration checks. Run: npm run ai:verify

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROJECT_ROOT } from './lib/project-root.mjs';

const ROOT = PROJECT_ROOT;
const INDEX_ROOT = path.join(ROOT, '.ai-context', 'exb');

// Below this fraction of public top-level APIs having at least one behavioral usage, fail.
const MIN_API_USAGE_RATIO = 0.25;

const REQUIRED_FILES = [
  'api/symbols.tsv',
  'api/declarations.tsv',
  'api/exports.tsv',
  'api/METADATA.tsv',
  'api-usage/summary.tsv',
  'docs/api-reference.tsv',
  'docs/packages.tsv',
  'docs/routes.tsv',
  'coverage.tsv',
  'files.tsv',
  'reports/unresolved-summary.tsv',
];

const PUBLIC_VISIBILITIES = new Set([
  'public-documented',
  'public-storybook',
  'public-declared-undocumented',
]);

function parseTsv (content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split('\t') ?? [];
  return lines.map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((key, index) => [key, cells[index] ?? '']));
  });
}

async function loadTsv (relativePath) {
  return parseTsv(await fs.readFile(path.join(INDEX_ROOT, relativePath), 'utf8'));
}

async function main () {
  const problems = [];
  const notes = [];

  for (const relativePath of REQUIRED_FILES) {
    try {
      const stat = await fs.stat(path.join(INDEX_ROOT, relativePath));
      if (stat.size === 0) {
        problems.push(`empty index file: ${relativePath}`);
      }
    } catch {
      problems.push(`missing index file: ${relativePath} (run the ai:index* generators)`);
    }
  }

  if (problems.length) {
    for (const problem of problems) console.error(`FAIL ${problem}`);
    process.exit(1);
  }

  const metadata = Object.fromEntries((await loadTsv('api/METADATA.tsv')).map((row) => [row.key, row.value]));
  const version = JSON.parse(await fs.readFile(path.join(ROOT, 'ArcGISExperienceBuilder', 'version.json'), 'utf8'));
  if (metadata.exb_version !== version.exbVersion) {
    problems.push(`catalog exb_version ${metadata.exb_version} != installed ${version.exbVersion} (regenerate: npm run ai:index:rich)`);
  } else {
    notes.push(`version ${metadata.exb_version} matches installed ExB`);
  }
  if (metadata.status && metadata.status !== 'complete') {
    problems.push(`catalog status is ${metadata.status}, expected complete`);
  }

  const symbols = await loadTsv('api/symbols.tsv');
  const summary = await loadTsv('api-usage/summary.tsv');
  const publicTopLevel = symbols.filter((row) => !row.parent_api_id && PUBLIC_VISIBILITIES.has(row.visibility));
  const usedApiIds = new Set(summary.filter((row) => Number(row.behavioral_usages || 0) > 0).map((row) => row.api_id));
  const publicWithUsage = publicTopLevel.filter((row) => usedApiIds.has(row.api_id)).length;
  const ratio = publicTopLevel.length ? publicWithUsage / publicTopLevel.length : 0;
  notes.push(`API-to-usage ratio ${(ratio * 100).toFixed(1)}% (${publicWithUsage}/${publicTopLevel.length} public top-level APIs used)`);
  if (ratio < MIN_API_USAGE_RATIO) {
    problems.push(`API-to-usage ratio ${(ratio * 100).toFixed(1)}% below floor ${(MIN_API_USAGE_RATIO * 100).toFixed(0)}%`);
  }

  const coverage = await loadTsv('coverage.tsv');
  const catalog = coverage.find((row) => row.source_root === 'api-catalog');
  const canonical = Number(catalog?.usages ?? 0);
  const unresolved = (await loadTsv('reports/unresolved-summary.tsv')).reduce((sum, row) => sum + Number(row.occurrences || 0), 0);
  if (canonical > 0) {
    notes.push(`unresolved ${unresolved} of ${canonical} canonical usages (${((unresolved / canonical) * 100).toFixed(2)}%)`);
  }

  for (const note of notes) console.log(`ok   ${note}`);
  if (problems.length) {
    for (const problem of problems) console.error(`FAIL ${problem}`);
    process.exit(1);
  }
  console.log('ai:verify passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
