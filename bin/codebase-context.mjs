#!/usr/bin/env node
// Usage: codebase-context <command> [--project <dir>] [args...]
// The project defaults to the current folder. Run with no command to list commands.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIG_HEAP = ['--max-old-space-size=8192'];

const commands = {
  index: { script: 'src/build-ai-index.mjs', about: 'Fast source indexes (symbols, trees, widget tables, maps)' },
  'index:docs': { script: 'src/build-ai-doc-index.mjs', about: 'Local docs and Storybook route index' },
  'index:rich': { script: 'src/build-ai-index-ts.mjs', node: BIG_HEAP, about: 'Type-accurate widget index and API catalog (ts-morph)' },
  'index:usages': { script: 'src/build-ai-usage-index.mjs', node: BIG_HEAP, about: 'Compiler-resolved API usages' },
  knowledge: { script: 'src/knowledge/cli.mjs', defaultArgs: ['all'], about: 'Facts and docs-to-text (facts | docs | all)' },
  find: { script: 'src/ai-find.mjs', about: 'Look up an API, member, or capability' },
  verify: { scripts: ['src/verify-setup.mjs', 'src/ai-verify.mjs'], about: 'Check setup (vendor, link, Node, scripts, installed files), then index version and coverage' },
  init: { script: 'src/init.mjs', about: 'Write .codebase-context/config.json (--exb <path> [--force])' },
  refresh: { script: 'src/ai-refresh.mjs', about: 'Graphs, then index, then knowledge (--graph-only | --no-graph)' },
  'combine-dts': { script: 'src/combine-dts.mjs', about: 'Combine a folder of .d.ts files into one file' },
  pack: { script: 'src/pack.mjs', about: 'Pack a versioned vendor index ZIP (--vendor <id>, --out <zip>)' },
  install: { script: 'src/install.mjs', about: 'Install guidance and optional index (--prebuilt <zip|HTTPS URL>, --sha256 <hash>, --dry-run, --force)' },
  test: { about: 'Run the tool tests against the project' }
};

const args = process.argv.slice(2);
const projectAt = args.indexOf('--project');
const project = path.resolve(projectAt >= 0 ? args.splice(projectAt, 2)[1] : process.cwd());
const name = args.shift();
const command = commands[name];

if (!command) {
  name && console.error(`Unknown command "${name}".`);
  console.log('Usage: codebase-context <command> [--project <dir>] [args...]\n');
  Object.entries(commands).forEach(([key, c]) => console.log(`  ${key.padEnd(14)} ${c.about}`));
  process.exit(name ? 2 : 0);
}

const run = (nodeArgs) => spawnSync(process.execPath, nodeArgs, {
  cwd: project,
  stdio: 'inherit',
  env: { ...process.env, CODEBASE_CONTEXT_PROJECT: project }
}).status ?? 1;

if (command.scripts) {
  const statuses = command.scripts.map((script) => run([path.join(TOOL_ROOT, script), ...args]));
  process.exit(statuses.some((s) => s !== 0) ? 1 : 0);
}

const nodeArgs = name === 'test'
  ? ['--test', ...readdirSync(path.join(TOOL_ROOT, 'tests')).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(TOOL_ROOT, 'tests', f))]
  : [...(command.node ?? []), path.join(TOOL_ROOT, command.script), ...(args.length ? args : command.defaultArgs ?? [])];

process.exit(run(nodeArgs));
