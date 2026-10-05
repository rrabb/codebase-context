#!/usr/bin/env node
// Usage: codebase-context knowledge <facts|docs|all> [--config <path>] [--vendor <id>]
// Paths in the config are relative to the project root (the folder that contains the config folder).
// A vendor's package defaults to <tool>/vendors/<id>.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT, TOOL_ROOT } from '../lib/project-root.mjs';
import { convertDocs } from './docs-to-text.mjs';
import { runFacts, writeProjectFacts, writeVendorFacts } from './facts.mjs';

const args = process.argv.slice(2);
const command = args[0] ?? 'all';
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const configPath = path.resolve(PROJECT_ROOT, option('--config') ?? '.codebase-context/config.json');
const projectRoot = path.resolve(path.dirname(configPath), '..');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const config = readJson(configPath);
const fromProject = (p) => path.resolve(projectRoot, p);
const onlyVendor = option('--vendor');

if (!['facts', 'docs', 'all'].includes(command)) {
  console.error(`Unknown command "${command}". Use facts, docs, or all.`);
  process.exit(2);
}

let failed = false;

for (const vendor of config.vendors) {
  if (onlyVendor && vendor.id !== onlyVendor)
    continue;
  const packageDir = vendor.package ? fromProject(vendor.package) : path.join(TOOL_ROOT, 'vendors', vendor.id);
  const pkg = readJson(path.join(packageDir, 'vendor.json'));
  const vendorRoot = fromProject(vendor.root);
  const outDir = fromProject(vendor.out);
  const version = String(readJson(path.join(vendorRoot, pkg.version.file))[pkg.version.path]);
  console.log(`\n${pkg.name} ${version} (${vendor.root})`);

  if (command === 'facts' || command === 'all') {
    const probes = readJson(path.join(packageDir, pkg.facts));
    const facts = runFacts(probes, { vendor: vendorRoot, project: projectRoot });
    const { jsonPath, baselineLabel, changes } = writeVendorFacts({ vendorId: vendor.id, version, facts, outDir });
    const problems = Object.entries(facts).filter(([, f]) => f.status !== 'found');
    console.log(`  facts: ${Object.keys(facts).length} -> ${path.relative(projectRoot, jsonPath)}`);
    problems.forEach(([id, f]) => console.warn(`  ${f.status}: ${id} (${f.source}${f.error ? `: ${f.error}` : ''})`));
    baselineLabel && console.log(`  changes since ${baselineLabel}: ${changes.length}${changes.length ? ` (see facts/changes-${version}.md)` : ''}`);
    failed ||= problems.some(([, f]) => f.status === 'error');
  }

  if (command === 'docs' || command === 'all') {
    for (const docs of pkg.docs ?? []) {
      const docsOut = path.join(outDir, 'docs-text', docs.id);
      const { written } = convertDocs({
        sourceDir: path.join(vendorRoot, docs.root),
        outDir: docsOut,
        select: docs.select,
        onlineBase: docs.onlineBase,
        dropLines: docs.dropLines,
        relativeTo: projectRoot
      });
      console.log(`  docs "${docs.id}": ${written} pages -> ${path.relative(projectRoot, docsOut)}`);
    }
  }
}

if (config.project && (command === 'facts' || command === 'all')) {
  const probes = readJson(fromProject(config.project.facts));
  const facts = runFacts(probes, { project: projectRoot, vendor: projectRoot });
  const { jsonPath, changes } = writeProjectFacts({ facts, outDir: fromProject(config.project.out) });
  console.log(`\nProject facts: ${Object.keys(facts).length} -> ${path.relative(projectRoot, jsonPath)} (changes since last run: ${changes.length})`);
  Object.entries(facts).filter(([, f]) => f.status !== 'found').forEach(([id, f]) => console.warn(`  ${f.status}: ${id} (${f.source})`));
}

process.exitCode = failed ? 1 : 0;
