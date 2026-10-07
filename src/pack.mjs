import path from 'node:path';
import { PROJECT_ROOT } from './lib/project-root.mjs';
import { bundleContext, packBundle } from './lib/bundles.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  if (index < 0)
    return undefined;
  if (!args[index + 1] || args[index + 1].startsWith('--'))
    throw new Error(`${name} requires a value.`);
  return args[index + 1];
};
try {
  const context = bundleContext(PROJECT_ROOT, option('--vendor') ?? 'exb');
  const destination = path.resolve(PROJECT_ROOT, option('--out') ?? `.codebase-context/bundles/${context.vendorId}-${context.version}-index.zip`);
  const result = packBundle(context, destination);
  console.log(`${destination}\n${result.files} files, ${result.bytes} bytes\nSHA-256: ${result.sha256}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}