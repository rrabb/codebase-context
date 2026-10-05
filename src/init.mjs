// Usage: codebase-context init --exb <path to the ExB install, relative to the project> [--force]
// Writes .codebase-context/config.json for the project.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT, TOOL_ROOT } from './lib/project-root.mjs';

const args = process.argv.slice(2);
const exbAt = args.indexOf('--exb');
const exbRoot = exbAt >= 0 ? args[exbAt + 1] : undefined;
const force = args.includes('--force');

if (!exbRoot) {
  console.error('Usage: codebase-context init --exb <path to the ExB install> [--force]');
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(path.join(TOOL_ROOT, 'vendors', 'exb', 'vendor.json'), 'utf8'));
const versionFile = path.resolve(PROJECT_ROOT, exbRoot, pkg.version.file);
if (!existsSync(versionFile)) {
  console.error(`${versionFile} not found. Is "${exbRoot}" the ExB install folder (the one with client/ and server/)?`);
  process.exit(1);
}
const version = JSON.parse(readFileSync(versionFile, 'utf8'))[pkg.version.path];

const dir = path.join(PROJECT_ROOT, '.codebase-context');
const configPath = path.join(dir, 'config.json');
if (existsSync(configPath) && !force) {
  console.error(`${path.relative(PROJECT_ROOT, configPath)} already exists. Re-run with --force to replace it.`);
  process.exit(1);
}

const config = {
  vendors: [{ id: 'exb', root: path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, exbRoot)).replace(/\\/g, '/'), out: '.ai-context/exb' }]
};
mkdirSync(dir, { recursive: true });
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
existsSync(path.join(dir, '.gitignore')) || writeFileSync(path.join(dir, '.gitignore'), 'backup/\n');

console.log(`Wrote ${path.relative(PROJECT_ROOT, configPath)} for ${pkg.name} ${version} at ${config.vendors[0].root}.`);
console.log('Next: add the ai:* npm scripts (see the README), then run: codebase-context refresh, codebase-context install, codebase-context verify');
