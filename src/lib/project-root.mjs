// The project being indexed is CODEBASE_CONTEXT_PROJECT (set by bin/codebase-context.mjs), else the current folder.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(process.env.CODEBASE_CONTEXT_PROJECT || process.cwd());
export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
