// The vendor install folder, relative to the project: vendors[].root in .codebase-context/config.json.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT } from './project-root.mjs';

const DEFAULT_DIRS = { exb: 'ArcGISExperienceBuilder' };

export function vendorDir (id = 'exb') {
  const configPath = path.join(PROJECT_ROOT, '.codebase-context', 'config.json');
  const root = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf8')).vendors?.find((v) => v.id === id)?.root
    : undefined;
  return (root ?? DEFAULT_DIRS[id]).replace(/\\/g, '/').replace(/\/+$/, '');
}

export const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const VENDOR_DIR = vendorDir();
export const VENDOR_ROOT = path.join(PROJECT_ROOT, VENDOR_DIR);
export const VENDOR_RE = escapeRegExp(VENDOR_DIR);
