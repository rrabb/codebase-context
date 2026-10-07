import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TOOL_ROOT } from './project-root.mjs';
import { VENDOR_DIR, VENDOR_ROOT } from './vendor.mjs';

export function loadExpectations (version, vendorDir = VENDOR_DIR) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid ExB version: ${version}`);
  }
  const file = path.join(TOOL_ROOT, 'vendors', 'exb', 'tests', version, 'expectations.json');
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT')
      throw error;
    throw new Error(`No reviewed test expectations for ExB ${version}. Add vendors/exb/tests/${version}/expectations.json; do not reuse another version.`, { cause: error });
  }
  const replacePaths = (value) => {
    if (typeof value === 'string')
      return value.replaceAll('{{VENDOR_ROOT}}', vendorDir);
    if (Array.isArray(value))
      return value.map(replacePaths);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [replacePaths(key), replacePaths(item)]));
    }
    return value;
  };
  return replacePaths(JSON.parse(text));
}

export function installedExpectations () {
  const { exbVersion } = JSON.parse(readFileSync(path.join(VENDOR_ROOT, 'version.json'), 'utf8'));
  return loadExpectations(exbVersion);
}