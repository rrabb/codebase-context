// The project being indexed is CODEBASE_CONTEXT_PROJECT (set by bin/codebase-context.mjs), else the current folder.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(process.env.CODEBASE_CONTEXT_PROJECT || process.cwd());
export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// codebase-memory derives a project name from its root path ("C:/a/b" -> "C-a-b").
export const graphName = (dir) => dir.replace(/\\/g, '/').replace(/\/+$/, '').replace(/:/g, '').replace(/\//g, '-');
