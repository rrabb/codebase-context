import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { TOOL_ROOT } from '../src/lib/project-root.mjs';

const vendor = path.join(TOOL_ROOT, 'vendors/exb');
const read = (file) => readFileSync(path.join(vendor, file), 'utf8');

test('discovery descriptions and mandatory routing cover ExB questions and tasks', () => {
  const authority = read('instructions/exb-source-authority.instructions.md');
  const skills = {
    'exb-source-research': ['questions', 'ExB', 'Jimu', 'widget development', 'layouts', 'jimu-ui', 'jimu-core', 'settings components', 'OOTB', 'OTB'],
    'experience-builder-architecture': ['question', 'task', 'layouts', 'AppConfig', 'client', 'server'],
    'exb-widget-development': ['ExB', 'jimu-core', 'runtime/settings', 'manifest'],
    'jimu-framework-apis': ['questions', 'jimu-core', 'jimu-layouts', 'jimu-for-builder', 'OOTB', 'OTB'],
    'jimu-ui-components': ['questions', 'settings components', 'SettingSection', 'SettingRow', 'OOTB', 'OTB']
  };
  for (const [name, triggers] of Object.entries(skills)) {
    const source = read(`skills/${name}/SKILL.md`);
    assert.ok(source.startsWith(`---\nname: ${name}\n`) || source.startsWith(`---\r\nname: ${name}\r\n`));
    const description = source.match(/^description: "(.+)"\r?$/m)?.[1];
    assert.ok(description, `missing quoted description: ${name}`);
    for (const trigger of triggers) assert.ok(description.toLowerCase().includes(trigger.toLowerCase()), `${name} lacks ${trigger}`);
    assert.ok(authority.includes(`| \`${name}\` |`), `mandatory route missing: ${name}`);
  }
  for (const section of ['## Tool routing', '## Question recipes', '## How ExB works', '## Source authority']) assert.ok(authority.includes(section));
  assert.ok(!authority.includes('## Project structure'));
  assert.ok(read('skills/exb-source-research/SKILL.md').includes('## Project structure and external docs'));
});

test('install renders complete project-specific guidance without unresolved variables', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'guidance-test-'));
  try {
    mkdirSync(path.join(root, '.codebase-context'));
    mkdirSync(path.join(root, 'vendor/exb'), { recursive: true });
    writeFileSync(path.join(root, 'vendor/exb/version.json'), '{"exbVersion":"1.20.0"}');
    writeFileSync(path.join(root, '.codebase-context/config.json'), '{"vendors":[{"id":"exb","root":"vendor/exb","out":".ai-context/exb"}]}');
    const result = spawnSync(process.execPath, [path.join(TOOL_ROOT, 'bin/codebase-context.mjs'), 'install', '--project', root], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const generated = readFileSync(path.join(root, '.github/instructions/exb-source-authority.instructions.md'), 'utf8');
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(generated));
    assert.ok(generated.includes('vendor/exb/'));
    assert.ok(generated.includes('Required skills for ExB questions and tasks'));
    assert.ok(generated.includes('stands in for an ArcGIS portal'));
    assert.ok(generated.includes('project setup has not run'));
    assert.ok(Buffer.byteLength(generated) < 10000, `always-on file too large: ${Buffer.byteLength(generated)}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});