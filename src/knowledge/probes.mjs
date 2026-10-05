// Declarative fact probes. Each probe reads one value from a file or folder and reports where it came from.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const readText = (file) => readFileSync(file, 'utf8');

const getPath = (obj, dotted) => dotted.split('.').reduce((o, key) => (o == null ? undefined : o[key]), obj);

// Text of a `{ ... }` block that starts at the first `{` after `start`.
const blockAfter = (text, start) => {
  const open = text.indexOf('{', start);
  if (open < 0)
    return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    text[i] === '{' && depth++;
    if (text[i] === '}' && --depth === 0)
      return text.slice(open + 1, i);
  }
  return null;
};

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const kinds = {
  json (probe, file) {
    const value = getPath(JSON.parse(readText(file)), probe.path);
    return value === undefined ? { status: 'not-found' } : { value };
  },

  regex (probe, file) {
    const text = readText(file);
    const re = new RegExp(probe.pattern, (probe.flags ?? '') + 'g');
    const matches = [...text.matchAll(re)];
    if (!matches.length)
      return { status: 'not-found' };
    const pick = (m) => m[probe.group ?? 0];
    const line = lineOf(text, matches[0].index);
    return probe.all
      ? { value: [...new Set(matches.map(pick))], line }
      : { value: pick(matches[0]), line };
  },

  enum (probe, file) {
    const text = readText(file);
    const at = text.search(new RegExp(`export declare enum ${probe.name}\\s*\\{`));
    const body = at < 0 ? null : blockAfter(text, at);
    if (body == null)
      return { status: 'not-found' };
    const members = [...body.matchAll(/^\s*(\w+)\s*=\s*("[^"]*"|'[^']*'|[\w.-]+)/gm)].map((m) => `${m[1]}=${m[2].replace(/['"]/g, '')}`);
    return { value: members, line: lineOf(text, at) };
  },

  interface (probe, file) {
    const text = readText(file);
    const at = text.search(new RegExp(`export (declare )?interface ${probe.name}(<[^>]*>)?(\\s+extends [^{]+)?\\s*\\{`));
    const body = at < 0 ? null : blockAfter(text, at);
    if (body == null)
      return { status: 'not-found' };
    // Drop nested blocks so only top-level member names remain.
    let flat = '';
    let depth = 0;
    for (const ch of body) {
      ch === '{' && depth++;
      depth === 0 && (flat += ch);
      ch === '}' && depth--;
    }
    const members = [...flat.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/^\s*(?:readonly\s+)?(\w+)\??\s*[:(]/gm)].map((m) => m[1]);
    return { value: [...new Set(members)], line: lineOf(text, at) };
  },

  dir (probe, dir) {
    const want = probe.type ?? 'any';
    const match = probe.match ? new RegExp(probe.match) : null;
    const names = readdirSync(dir).filter((name) => {
      const isDir = statSync(path.join(dir, name)).isDirectory();
      if ((want === 'dir' && !isDir) || (want === 'file' && isDir))
        return false;
      return !match || match.test(name);
    });
    return { value: names.sort() };
  },

  contains (probe, file) {
    const text = readText(file);
    const value = Object.fromEntries(probe.strings.map((s) => [s, text.includes(s)]));
    const missing = Object.values(value).filter((found) => !found).length;
    return { value, status: missing === 0 ? 'found' : missing === probe.strings.length ? 'not-found' : 'partial' };
  }
};

export function runProbe (probe, roots) {
  const base = roots[probe.root ?? 'vendor'];
  const target = probe.file ?? probe.dir;
  const source = path.join(base, target);
  const fact = { section: probe.section, description: probe.description, kind: probe.kind, source: path.relative(roots.project, source).replace(/\\/g, '/') };

  const run = kinds[probe.kind];
  if (!run)
    return { ...fact, status: 'error', error: `unknown probe kind "${probe.kind}"` };
  if (!existsSync(source))
    return { ...fact, status: 'missing-source' };

  try {
    const result = run(probe, source);
    return { ...fact, status: 'found', ...result, source: result.line ? `${fact.source}:${result.line}` : fact.source, line: undefined };
  } catch (e) {
    return { ...fact, status: 'error', error: e.message };
  }
}
