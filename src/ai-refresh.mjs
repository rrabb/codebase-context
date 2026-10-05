/**
 * Refresh every AI search index: the three codebase-memory graphs, then the .ai-context indexes.
 *
 * Usage: codebase-context refresh [--graph-only | --no-graph]   (cpe-exb: npm run ai:refresh)
 * Runs automatically after `npm run setup` (postsetup), because setup replaces the vendor tree.
 * The codebase-memory executable is found via CBM_EXE, then PATH, then its default install folder.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT, TOOL_ROOT, graphName as projectNameFor } from './lib/project-root.mjs';

const ROOT = PROJECT_ROOT;
const VENDOR = path.join(ROOT, 'ArcGISExperienceBuilder');
const OOTB_WIDGETS = path.join(VENDOR, 'client', 'dist', 'widgets');
const CBMIGNORE = path.join(TOOL_ROOT, 'vendors', 'exb', 'exb.cbmignore');

const args = new Set(process.argv.slice(2));
const graphOnly = args.has('--graph-only');
const noGraph = args.has('--no-graph');

// codebase-memory skips any folder named "dist", so OOTB widget source must be its own project root.
const GRAPHS = [
  { repo_path: ROOT, mode: 'full' },
  { repo_path: VENDOR, mode: 'full', cbmignore: true },
  { repo_path: OOTB_WIDGETS, mode: 'moderate', cbmignore: true, name: `${projectNameFor(ROOT)}-ootb-widgets` },
  { repo_path: TOOL_ROOT, mode: 'full' },
];

function findCbmExe () {
  if (process.env.CBM_EXE) return existsSync(process.env.CBM_EXE) ? process.env.CBM_EXE : null;
  const exeName = process.platform === 'win32' ? 'codebase-memory-mcp.exe' : 'codebase-memory-mcp';
  const probe = spawnSync(exeName, ['--version'], { encoding: 'utf8' });
  if (probe.status === 0) return exeName;
  const installDir = process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'codebase-memory-mcp', exeName)
    : path.join(process.env.HOME ?? '', '.local', 'bin', exeName);
  return existsSync(installDir) ? installDir : null;
}

function refreshGraphs () {
  const exe = findCbmExe();
  if (!exe) {
    console.warn('codebase-memory-mcp not found (set CBM_EXE or add it to PATH); skipping graph refresh.');
    return true;
  }
  let ok = true;
  for (const graph of GRAPHS) {
    if (!existsSync(graph.repo_path)) {
      console.warn(`Skipping missing folder: ${graph.repo_path}`);
      continue;
    }
    if (graph.cbmignore) copyFileSync(CBMIGNORE, path.join(graph.repo_path, '.cbmignore'));
    const { cbmignore, ...toolArgs } = graph;
    const params = { ...toolArgs, repo_path: graph.repo_path.replace(/\\/g, '/') };
    console.log(`\nIndexing ${params.repo_path} (${graph.mode})...`);
    // An argument array keeps the JSON intact; a shell (PowerShell 5.1 especially) strips its quotes.
    const result = spawnSync(exe, ['cli', '--quiet', '--json', 'index_repository', JSON.stringify(params)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) {
      ok = false;
      console.error(`  failed (exit ${result.status}): ${(result.stderr || result.stdout || '').trim().slice(0, 500)}`);
      continue;
    }
    try {
      const envelope = JSON.parse(result.stdout);
      const text = envelope?.content?.[0]?.text ?? result.stdout;
      const summary = typeof text === 'string' ? JSON.parse(text) : text;
      console.log(`  ${summary.project}: ${summary.status}, ${summary.nodes} nodes, ${summary.edges} edges, ${summary.parse_partial_count ?? 0} partly parsed`);
    } catch {
      console.log(`  ${result.stdout.trim().slice(0, 300)}`);
    }
  }
  return ok;
}

function runStep (label, script, args = []) {
  console.log(`\nRunning ${label}...`);
  const result = spawnSync(process.execPath, [path.join(TOOL_ROOT, 'src', script), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, CODEBASE_CONTEXT_PROJECT: ROOT },
  });
  return result.status === 0;
}

function refreshAiIndex () {
  const indexOk = runStep('index', 'build-ai-index.mjs');
  const knowledgeOk = runStep('knowledge', path.join('knowledge', 'cli.mjs'), ['all']);
  return indexOk && knowledgeOk;
}

const graphsOk = noGraph ? true : refreshGraphs();
const indexOk = graphOnly ? true : refreshAiIndex();
process.exitCode = graphsOk && indexOk ? 0 : 1;
