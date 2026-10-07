import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { TOOL_ROOT } from '../src/lib/project-root.mjs';
import { readBlock, writeBlock } from '../src/lib/marked-block.mjs';
import { resolveTargets, skillDirsFor } from '../src/lib/targets.mjs';

const SKILLS = readdirSync(path.join(TOOL_ROOT, 'vendors/exb/skills')).filter((n) => existsSync(path.join(TOOL_ROOT, 'vendors/exb/skills', n, 'SKILL.md')));

function project (agentsText) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'install-targets-'));
  mkdirSync(path.join(root, '.codebase-context'));
  mkdirSync(path.join(root, 'ArcGISExperienceBuilder'));
  writeFileSync(path.join(root, 'ArcGISExperienceBuilder/version.json'), '{"exbVersion":"1.20.0"}');
  writeFileSync(path.join(root, '.codebase-context/config.json'), '{"vendors":[{"id":"exb","root":"ArcGISExperienceBuilder","out":".ai-context/exb"}]}');
  agentsText !== undefined && writeFileSync(path.join(root, 'AGENTS.md'), agentsText);
  return root;
}

const install = (root, ...args) => spawnSync(process.execPath, [path.join(TOOL_ROOT, 'bin/codebase-context.mjs'), 'install', '--project', root, ...args], { encoding: 'utf8' });
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');
const isLink = (p) => existsSync(p) && lstatSync(p).isSymbolicLink();

// Unlink skill junctions before deleting, so cleanup can never reach the tool's own skill folders.
function cleanup (root) {
  for (const dir of ['.github/skills', '.claude/skills', '.agents/skills']) {
    for (const name of SKILLS)
      isLink(path.join(root, dir, name)) && unlinkSync(path.join(root, dir, name));
  }
  rmSync(root, { recursive: true, force: true });
}

test('targets map to the fewest skill folders and reject unknown names', () => {
  assert.deepEqual(skillDirsFor(['copilot']), ['.github/skills']);
  assert.deepEqual(skillDirsFor(['copilot', 'claude']), ['.claude/skills']);
  assert.deepEqual(skillDirsFor(['codex']), ['.agents/skills']);
  assert.deepEqual(skillDirsFor(['claude', 'codex']), ['.claude/skills', '.agents/skills']);
  assert.deepEqual(resolveTargets({}), ['copilot']);
  assert.deepEqual(resolveTargets({ targets: ['copilot'] }, 'Claude, codex'), ['claude', 'codex']);
  assert.throws(() => resolveTargets({ targets: ['cursor'] }), /Unknown or empty targets: cursor/);
});

test('writeBlock inserts after the first heading, replaces in place, and keeps CRLF', () => {
  const text = '# Guide\r\n\r\nHand-written intro.\r\n';
  const once = writeBlock(text, 'exb', 'Facts v1');
  assert.ok(once.startsWith('# Guide\r\n\r\n<!-- codebase-context:begin exb -->\r\nFacts v1\r\n<!-- codebase-context:end exb -->'));
  assert.ok(once.includes('Hand-written intro.\r\n'));
  const twice = writeBlock(once, 'exb', 'Facts v2');
  assert.equal(twice.split('codebase-context:begin exb').length, 2);
  assert.equal(readBlock(twice, 'exb').trim(), 'Facts v2');
  assert.ok(writeBlock('No heading\n', 'exb', 'X').startsWith('<!-- codebase-context:begin exb -->'));
});

test('default install links Copilot skills, adds the AGENTS.md block and .gitignore entries, and is repeatable', () => {
  const root = project('# Team guide\n\nKeep this hand-written line.\n');
  try {
    const first = install(root);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    for (const name of SKILLS)
      assert.ok(isLink(path.join(root, '.github/skills', name)), `missing link ${name}`);
    const agents = read(root, 'AGENTS.md');
    assert.ok(agents.startsWith('# Team guide\n\n<!-- codebase-context:begin exb -->'));
    assert.ok(agents.includes('Keep this hand-written line.'));
    const block = readBlock(agents, 'exb');
    assert.ok(block.includes('stands in for an ArcGIS portal'));
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(block), 'unresolved placeholder');
    assert.ok(!/C-_|[A-Z]:[\\/]/.test(block), 'machine-specific value in committed block');
    assert.ok(read(root, '.gitignore').includes(`.github/skills/${SKILLS[0]}/`));
    assert.equal(existsSync(path.join(root, 'CLAUDE.md')), false);
    assert.ok(existsSync(path.join(root, '.github/instructions/exb-source-authority.instructions.md')));

    const before = { agents, ignore: read(root, '.gitignore') };
    const second = install(root);
    assert.equal(second.status, 0, second.stdout + second.stderr);
    assert.equal(read(root, 'AGENTS.md'), before.agents);
    assert.equal(read(root, '.gitignore'), before.ignore);
  } finally { cleanup(root); }
});

test('switching targets moves skill links, creates CLAUDE.md, and protects hand edits in the block', () => {
  const root = project('# Guide\n');
  try {
    assert.equal(install(root).status, 0);
    const claude = install(root, '--targets', 'copilot,claude');
    assert.equal(claude.status, 0, claude.stdout + claude.stderr);
    for (const name of SKILLS) {
      assert.ok(isLink(path.join(root, '.claude/skills', name)));
      assert.equal(existsSync(path.join(root, '.github/skills', name)), false, `stale link ${name}`);
    }
    assert.equal(read(root, 'CLAUDE.md'), '@AGENTS.md\n');

    writeFileSync(path.join(root, 'AGENTS.md'), read(root, 'AGENTS.md').replace('stands in for an ArcGIS portal', 'HAND EDIT'));
    const blocked = install(root, '--targets', 'copilot,claude');
    assert.equal(blocked.status, 1);
    assert.match(blocked.stdout, /edited by hand/);
    assert.ok(read(root, 'AGENTS.md').includes('HAND EDIT'));
    const forced = install(root, '--targets', 'copilot,claude', '--force');
    assert.equal(forced.status, 0, forced.stdout + forced.stderr);
    assert.ok(!read(root, 'AGENTS.md').includes('HAND EDIT'));

    writeFileSync(path.join(root, 'CLAUDE.md'), '# My own Claude notes\n');
    const warned = install(root, '--targets', 'claude');
    assert.equal(warned.status, 1);
    assert.match(warned.stdout, /without an "@AGENTS\.md" line/);
    assert.equal(existsSync(path.join(root, '.github/instructions')), true, 'earlier copilot files are left in place');
  } finally { cleanup(root); }
});
