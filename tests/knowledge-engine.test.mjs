import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { htmlToText } from '../src/knowledge/docs-to-text.mjs';
import { diffFacts, runFacts } from '../src/knowledge/facts.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'knowledge-test-'));
after(() => rmSync(root, { recursive: true, force: true }));

writeFileSync(path.join(root, 'version.json'), JSON.stringify({ v: { n: '1.2.3' } }));
writeFileSync(path.join(root, 'types.d.ts'), [
  'export declare enum Mode {',
  '    Fixed = "FIXED",',
  '    Flow = "FLOW"',
  '}',
  'export interface Item<T> extends Base {',
  '    /** doc */',
  '    id: string;',
  '    nested?: {',
  '        inner: number;',
  '    };',
  '    run(x: T): void;',
  '}'
].join('\n'));
writeFileSync(path.join(root, 'bundle.js'), 'a.option("--port");a.option("--path");zipApp()');
mkdirSync(path.join(root, 'dir', 'b'), { recursive: true });
mkdirSync(path.join(root, 'dir', 'a'), { recursive: true });
writeFileSync(path.join(root, 'dir', 'file.txt'), '');

const probes = [
  { id: 'json', kind: 'json', file: 'version.json', path: 'v.n' },
  { id: 'enum', kind: 'enum', file: 'types.d.ts', name: 'Mode' },
  { id: 'iface', kind: 'interface', file: 'types.d.ts', name: 'Item' },
  { id: 'regex', kind: 'regex', file: 'bundle.js', pattern: '\\.option\\("([^"]+)"', group: 1, all: true },
  { id: 'contains', kind: 'contains', file: 'bundle.js', strings: ['zipApp', 'missing'] },
  { id: 'dir', kind: 'dir', dir: 'dir', type: 'dir' },
  { id: 'gone', kind: 'json', file: 'nope.json', path: 'x' },
  { id: 'nokey', kind: 'json', file: 'version.json', path: 'v.missing' }
];

test('probes read values and report status', () => {
  const facts = runFacts(probes, { vendor: root, project: root });
  assert.equal(facts.json.value, '1.2.3');
  assert.deepEqual(facts.enum.value, ['Fixed=FIXED', 'Flow=FLOW']);
  assert.deepEqual(facts.iface.value, ['id', 'nested', 'run']);
  assert.deepEqual(facts.regex.value, ['--port', '--path']);
  assert.equal(facts.contains.status, 'partial');
  assert.deepEqual(facts.dir.value, ['a', 'b']);
  assert.equal(facts.gone.status, 'missing-source');
  assert.equal(facts.nokey.status, 'not-found');
  assert.match(facts.enum.source, /types\.d\.ts:1$/);
});

test('diffFacts reports value, status, added, and removed changes', () => {
  const before = { a: { status: 'found', value: 1 }, b: { status: 'found', value: 2 }, c: { status: 'found', value: 3 } };
  const after = { a: { status: 'found', value: 1 }, b: { status: 'found', value: 9 }, d: { status: 'found', value: 4 } };
  const changes = Object.fromEntries(diffFacts(before, after).map((c) => [c.id, c.change]));
  assert.deepEqual(changes, { b: 'value', c: 'removed', d: 'added' });
});

test('htmlToText keeps code indentation and drops gutters and noise lines', () => {
  const html = '<title></title><main><h1>Title</h1><p>Use dark colors for code blocksCopy</p><pre><code>1\n2\nif (a) {\n  b();\n}</code></pre><p>a &amp; b</p></main>';
  const { title, text } = htmlToText(html, 'main', ['Use dark colors for code blocksCopy']);
  assert.equal(title, 'Title');
  assert.ok(text.includes('```\nif (a) {\n  b();\n}\n```'));
  assert.ok(!text.includes('Use dark colors'));
  assert.ok(text.includes('a & b'));
});
