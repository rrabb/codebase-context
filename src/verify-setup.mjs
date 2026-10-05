// Setup checks for a project that uses codebase-context. Prints ok / warn / fail lines; exits 1 on any fail.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { PROJECT_ROOT, TOOL_ROOT } from './lib/project-root.mjs';

let fails = 0;
const ok = (msg) => console.log(`ok   ${msg}`);
const warn = (msg) => console.log(`warn ${msg}`);
const fail = (msg) => {
  fails++;
  console.log(`FAIL ${msg}`);
};
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const hash = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

const nodeMajor = Number(process.versions.node.split('.')[0]);
nodeMajor >= 24 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node}; codebase-context needs 24 or later`);

const configPath = path.join(PROJECT_ROOT, '.codebase-context', 'config.json');
if (!existsSync(configPath)) {
  fail('.codebase-context/config.json missing (run: codebase-context init --exb <path>)');
} else {
  const config = readJson(configPath);
  for (const vendor of config.vendors ?? []) {
    const packageDir = vendor.package ? path.resolve(PROJECT_ROOT, vendor.package) : path.join(TOOL_ROOT, 'vendors', vendor.id);
    const root = path.resolve(PROJECT_ROOT, vendor.root);
    if (!existsSync(path.join(packageDir, 'vendor.json'))) {
      fail(`vendor "${vendor.id}": no package at ${packageDir}`);
      continue;
    }
    const pkg = readJson(path.join(packageDir, 'vendor.json'));
    const versionFile = path.join(root, pkg.version.file);
    existsSync(versionFile)
      ? ok(`${pkg.name} ${readJson(versionFile)[pkg.version.path]} at ${vendor.root}`)
      : fail(`vendor "${vendor.id}": ${path.join(vendor.root, pkg.version.file)} not found`);
    existsSync(path.resolve(PROJECT_ROOT, vendor.out))
      ? ok(`indexes at ${vendor.out}`)
      : warn(`no indexes at ${vendor.out} yet (run refresh)`);

    const skillsDir = path.join(packageDir, 'skills');
    for (const name of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
      const target = path.join(PROJECT_ROOT, '.github', 'skills', name);
      if (!existsSync(target))
        warn(`skill ${name} not installed (run install)`);
      else if (!lstatSync(target).isSymbolicLink() || realpathSync(target) !== realpathSync(path.join(skillsDir, name)))
        warn(`skill ${name} is not linked to this tool (run install --force)`);
    }
  }
}

const manifestPath = path.join(PROJECT_ROOT, '.codebase-context', 'installed.json');
if (existsSync(manifestPath)) {
  const installed = readJson(manifestPath);
  const changed = Object.entries(installed).filter(([file, h]) => {
    const p = path.join(PROJECT_ROOT, file);
    return !existsSync(p) || hash(readFileSync(p, 'utf8')) !== h;
  });
  changed.length
    ? changed.forEach(([file]) => warn(`${file} was edited or removed since install (move changes into the template, then run install)`))
    : ok(`${Object.keys(installed).length} generated files unchanged since install`);
}

const pkgPath = path.join(PROJECT_ROOT, 'package.json');
if (existsSync(pkgPath)) {
  const scripts = readJson(pkgPath).scripts ?? {};
  const missing = ['ai:find', 'ai:refresh', 'ai:install'].filter((s) => !scripts[s]);
  missing.length ? warn(`package.json lacks ${missing.join(', ')}; skills and instructions call these`) : ok('package.json defines ai:find, ai:refresh, ai:install');
}

const cbmName = process.platform === 'win32' ? 'codebase-memory-mcp.exe' : 'codebase-memory-mcp';
const cbmDefault = process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'codebase-memory-mcp', cbmName)
  : path.join(process.env.HOME ?? '', '.local', 'bin', cbmName);
const cbmFound = (process.env.CBM_EXE && existsSync(process.env.CBM_EXE)) || spawnSync(cbmName, ['--version'], { encoding: 'utf8' }).status === 0 || existsSync(cbmDefault);
cbmFound ? ok('codebase-memory-mcp found') : warn('codebase-memory-mcp not found (set CBM_EXE or add it to PATH); graph refresh will be skipped');

const toolStatus = spawnSync('git', ['-C', TOOL_ROOT, 'status', '--porcelain'], { encoding: 'utf8' });
if (toolStatus.status === 0) {
  const lines = toolStatus.stdout.split('\n').filter(Boolean).length;
  lines ? warn(`codebase-context has ${lines} uncommitted change(s) (skill edits land there)`) : ok('codebase-context has no uncommitted changes');
}

process.exitCode = fails ? 1 : 0;
