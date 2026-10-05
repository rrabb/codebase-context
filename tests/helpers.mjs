/* eslint-disable */
// @ts-nocheck
// Shared helpers for the ai-index test suites. Zero dependencies; Node built-ins only.

import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROJECT_ROOT, TOOL_ROOT } from '../src/lib/project-root.mjs';

export const ROOT = PROJECT_ROOT;
export const INDEX_ROOT = path.join(ROOT, '.ai-context', 'exb');
const FIND_SCRIPT = path.join(TOOL_ROOT, 'src', 'ai-find.mjs');

// Invoke the real ai:find CLI in --json mode and parse its payload, so tests
// exercise the same contract an AI assistant consumes.
export function runFind (terms, flags = []) {
  const args = [FIND_SCRIPT, ...terms, ...flags, '--json'];
  const stdout = execFileSync(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, CODEBASE_CONTEXT_PROJECT: ROOT },
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

export function parseTsv (content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split('\t') ?? [];
  return lines.map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((key, index) => [key, cells[index] ?? '']));
  });
}

export async function loadTsv (relativePath) {
  const absolute = path.join(INDEX_ROOT, relativePath);
  return parseTsv(await fs.readFile(absolute, 'utf8'));
}

export async function indexExists (relativePath) {
  try {
    await fs.access(path.join(INDEX_ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}
