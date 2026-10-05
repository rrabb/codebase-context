/* eslint-disable no-console */
/**
 * 
 * Combines multiple ts declaration files into a single file. 
 * This is useful for generating a single declaration file for a package that has multiple entry points.
 * Used to feed to ai chat when needed. 
 * Avoid feeding excessive or large files to the model, as it may cause the model to truncate the input and lose context while wasting tokens. 
 * 
 * I tried this with dts-bundle-generator, but it cannot bundle the ExB jimu-arcgis declaration graph successfully.
 * 
 * This script recursively finds and combines all .d.ts files under a folder. 
 * The package command is: `npm run ai:combine:dts:jimu-arcgis`
 * "ai:combine:dts:jimu-arcgis": "node .scripts/codebase-context.mjs combine-dts ArcGISExperienceBuilder/client/jimu-arcgis relative/path-to/jimu-arcgis-combined.d.ts",
 * `codebase-context combine-dts ArcGISExperienceBuilder/client/jimu-arcgis docs/chat-exports/jimu-arcgis-combined.d.ts`
 * 
 * It generated jimu-arcgis-combined.d.ts containing: 
 *   - 77 declaration files 
 *   - 77 labeled source sections 
 *   - Deterministic alphabetical ordering 
 *   - Relative source-file markers for easier searching
 * The output is a text snapshot, not a guaranteed compilable replacement for the package barrel
 * because imports and module boundaries remain represented as source text.
 * 
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROJECT_ROOT } from './lib/project-root.mjs';

const repositoryRoot = PROJECT_ROOT;

function usage () {
  console.error('Usage: codebase-context combine-dts <input-folder> <output-file>');
  process.exitCode = 1;
}

async function declarationFiles (directory, outputFile) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await declarationFiles(entryPath, outputFile));
    } else if (entry.isFile() && entry.name.endsWith('.d.ts') && path.resolve(entryPath) !== outputFile) {
      files.push(entryPath);
    }
  }

  return files;
}

async function main () {
  const [inputArgument, outputArgument] = process.argv.slice(2);
  if (!inputArgument || !outputArgument) {
    usage();
    return;
  }

  const inputDirectory = path.resolve(repositoryRoot, inputArgument);
  const outputFile = path.resolve(repositoryRoot, outputArgument);
  const files = (await declarationFiles(inputDirectory, outputFile)).sort((left, right) => left.localeCompare(right));
  const sections = [
    `// Combined declaration snapshot generated from ${path.relative(repositoryRoot, inputDirectory).replaceAll(path.sep, '/')}`,
    `// Source files: ${files.length}`,
    '',
  ];

  for (const file of files) {
    const relativePath = path.relative(inputDirectory, file).replaceAll(path.sep, '/');
    const content = (await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '').trimEnd();
    sections.push(`// ===== ${relativePath} =====`, content, '');
  }

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${sections.join('\n')}\n`, 'utf8');
  console.log(`Combined ${files.length} declaration files into ${path.relative(repositoryRoot, outputFile).replaceAll(path.sep, '/')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});