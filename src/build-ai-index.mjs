/* eslint-disable */
// @ts-nocheck
// Builds a compact, grep-friendly index of the authoritative ExB / jimu sources.
// Output lives under .ai-context/exb and is meant to be searched on demand by an AI
// agent, not loaded wholesale into context. Re-run after any `npm run setup` bump.
//
// Design notes:
// - Localization / i18n / t9n / help files are excluded everywhere (they blow up
//   the indexes and carry no reusable code).
// - dist/widgets ships readable .ts/.tsx source per widget and is indexed in DETAIL:
//   symbols (incl. non-exported), components (+props), hooks, classes, methods (+params),
//   functions (+params), interface/class fields, imports, JSX usage, and messaging.
// - Imports + JSX usage carry reverse indexes so an agent can grep a module or a
//   component/tag name to find example widgets that use it.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addUsage, catalogRows, manifestRow, usageRows } from './lib/widget-catalog.mjs';

import { PROJECT_ROOT } from './lib/project-root.mjs';

const ROOT = PROJECT_ROOT;
const OUT_DIR = path.join(ROOT, '.ai-context', 'exb');
const DIST_OUT_DIR = path.join(OUT_DIR, 'dist-widgets');
const PRESERVED_OUTPUTS = new Set([
  'api',
  'api-usage',
  'api-usage-fast',
  'coverage.tsv',
  'dist-widgets-ts',
  'docs',
  'docs-text',
  'facts',
  'files.tsv',
  'reports',
]);

const CLIENT = 'ArcGISExperienceBuilder/client';

// mentions index: an API name is a useful "mention" signal only when it is named in a
// handful of files. Names that appear in many files are generic (Config/Props/View) and
// are dropped. Only framework symbol names at least this long are tracked.
const MENTION_MAX_FILES = 12;
const MENTION_MIN_LEN = 5;

// symbols: extract top-level exports + re-exports into the shared symbols.tsv/reexports.tsv.
// detailed: emit per-kind detailed indexes for .ts/.tsx.
// manifests: digest every manifest.json found.
const AREAS = [
  { name: 'jimu-arcgis', dir: `${CLIENT}/jimu-arcgis`, symbols: true },
  { name: 'jimu-core', dir: `${CLIENT}/jimu-core`, symbols: true },
  { name: 'jimu-data-source', dir: `${CLIENT}/jimu-data-source`, symbols: true },
  { name: 'jimu-for-builder', dir: `${CLIENT}/jimu-for-builder`, symbols: true },
  { name: 'jimu-for-test', dir: `${CLIENT}/jimu-for-test`, symbols: true },
  { name: 'jimu-icons', dir: `${CLIENT}/jimu-icons`, symbols: true },
  { name: 'jimu-layouts', dir: `${CLIENT}/jimu-layouts`, symbols: true },
  { name: 'jimu-theme', dir: `${CLIENT}/jimu-theme`, symbols: true },
  { name: 'jimu-ui', dir: `${CLIENT}/jimu-ui`, symbols: true },
  { name: 'client-types', dir: `${CLIENT}/types`, symbols: true },
  { name: 'sdk-resources', dir: 'ArcGISExperienceBuilder/sdk-resources', symbols: true },
  // dist/widgets ships readable .ts/.tsx source per widget: index it in detail.
  { name: 'dist-widgets', dir: `${CLIENT}/dist/widgets`, detailed: true, manifests: true },
];

const PARSE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']);
const DETAIL_EXT = new Set(['.ts', '.tsx']);
const SKIP_DIR = new Set(['node_modules', 'chunks', '.git']);
const MAX_PARSE_BYTES = 512 * 1024; // skip likely-minified blobs

// Non-code binaries / assets that are useless for writing code - never indexed.
const BINARY_EXT = new Set([
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.cur', '.tif', '.tiff',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.webm', '.ogg', '.ogv', '.mp3', '.wav', '.flac', '.avi', '.mov', '.mkv', '.m4a', '.m4v',
  '.zip', '.gz', '.tgz', '.7z', '.rar', '.bz2', '.xz',
  '.pdf', '.psd', '.ai', '.eps',
  '.wasm', '.bin', '.glb', '.gltf', '.fbx', '.obj', '.mtl', '.hdr', '.ktx', '.ktx2', '.dds', '.basis',
  '.map', // sourcemaps
]);

// Localization / i18n / t9n / nls / help files - excluded everywhere (string tables,
// no reusable code, they blow up the indexes).
const LOCALE_SKIP_RE = [
  /(?:^|\/)(?:i18n|t9n|nls|translations)(?:\/|$)/i,
  /\.(?:i18n|t9n)\b/i,
  /\/assets\/[^]*?(?:i18n|t9n|translation)/i,
  /\/help\/[^]*\.html?$/i,
];
function isLocaleFile (rel) {
  return LOCALE_SKIP_RE.some((re) => re.test(rel));
}
function isLocaleModule (mod) {
  return /(?:^|\/)(?:i18n|t9n|nls|translations)(?:\/|$)|\.(?:i18n|t9n)\b/i.test(mod);
}

// Declarations: export [declare] [default] [abstract] [async] <kind> <Name>
const DECL_RE =
  /^\s*export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(class|interface|type|enum|function\*?|const|let|var|namespace|module)\s+([A-Za-z_$][\w$]*)/;
// Top-level declaration (exported OR not) - used for the dist-widgets deep index.
const TOPDECL_RE =
  /^(export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(class|interface|type|enum|function\*?|const|let|var|namespace|module)\s+([A-Za-z_$][\w$]*)/;
const REEXPORT_STAR_RE = /^\s*export\s+\*\s+(?:as\s+([\w$]+)\s+)?from\s+['"]([^'"]+)['"]/;
const REEXPORT_NAMED_RE = /^\s*export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/;
const CLASS_RE =
  /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s*<[^>]*>)?(?:\s+extends\s+([\w$.]+(?:<[^>]*>)?))?(?:\s+implements\s+([^{]+?))?\s*\{?/;
const INTERFACE_RE =
  /^\s*(?:export\s+)?(?:declare\s+)?interface\s+([A-Za-z_$][\w$]*)(?:\s*<[^>]*>)?(?:\s+extends\s+([^{]+?))?\s*\{?/;
const MEMBER_RE =
  /^(\s*(?:(?:public|private|protected|static|readonly|abstract|async|override|declare|get|set)\s+)*)(?:\*\s*)?([A-Za-z_$][\w$]*|\[[^\]]+\])\s*(?:<[^>]*>)?\s*\(/;
// Property/field signature inside an interface or class body (not a method).
const FIELD_RE =
  /^\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+|abstract\s+|declare\s+)*([A-Za-z_$][\w$]*|'[^']*'|"[^"]*"|\[[^\]]+\])\s*(\?)?\s*:\s*(.+?)\s*$/;
// Clause restricted to import-clause chars so a side-effect import (no `from`)
// cannot make the match span across the next import statement.
const IMPORT_FROM_RE = /import\s+(type\s+)?([\w$*,{}\s]+?)\s+from\s+['"]([^'"]+)['"]/g;
const IMPORT_SIDE_RE = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
// JSX usage: PascalCase React components (incl. dotted) and hyphenated web components.
const JSX_COMP_RE = /<([A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]*)?)/g;
const JSX_TAG_RE = /<([a-z][a-z0-9]*-[a-z0-9-]+)/g;

const PASCAL_RE = /^[A-Z][A-Za-z0-9]*$/;
const HOOK_RE = /^use[A-Z0-9]/;
const REACT_COMPONENT_RE = /(?:React\.)?(?:Pure)?Component\b/;

const MEMBER_STOP = new Set([
  'if', 'else', 'for', 'while', 'switch', 'catch', 'do', 'return', 'new', 'typeof', 'await',
  'yield', 'function', 'super', 'delete', 'void', 'throw', 'case', 'in', 'of', 'instanceof',
  'as', 'from', 'import', 'export', 'this',
]);
// Field lines that are really control-flow / not property signatures.
const FIELD_STOP = new Set(['if', 'for', 'while', 'switch', 'return', 'case', 'default', 'else', 'do', 'try', 'catch']);

async function walk (absDir, relDir, out) {
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory() && SKIP_DIR.has(e.name)) {
      continue;
    }
    const abs = path.join(absDir, e.name);
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      await walk(abs, rel, out);
    } else if (e.isFile() && !BINARY_EXT.has(path.extname(e.name).toLowerCase()) && !isLocaleFile(rel)) {
      out.push({ abs, rel });
    }
  }
}

function extractFromContent (content, repoRel, area, symbols, reexports) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf('export') === -1) {
      continue;
    }
    const ln = i + 1;
    const decl = DECL_RE.exec(line);
    if (decl) {
      const kind = decl[1].replace('function*', 'function');
      symbols.push(`${decl[2]}\t${kind}\t${area}\t${repoRel}\t${ln}`);
      continue;
    }
    const star = REEXPORT_STAR_RE.exec(line);
    if (star) {
      if (!isBinaryModule(star[2]) && !isLocaleModule(star[2])) {
        const spec = star[1] ? `* as ${star[1]}` : '*';
        reexports.push(`${area}\t${repoRel}\t${ln}\tstar\t${spec}\t${star[2]}`);
      }
      continue;
    }
    const named = REEXPORT_NAMED_RE.exec(line);
    if (named && !isBinaryModule(named[2]) && !isLocaleModule(named[2])) {
      for (const it of splitNamed(named[1])) {
        reexports.push(`${area}\t${repoRel}\t${ln}\tnamed\t${it}\t${named[2]}`);
      }
    }
  }
}

function isBinaryModule (mod) {
  return BINARY_EXT.has(path.extname(mod).toLowerCase());
}

function splitNamed (inner) {
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = /\bas\s+([\w$]+)$/.exec(s);
      return m ? m[1] : s.replace(/^type\s+/, '');
    });
}

// Best-effort strip of string/template literal contents so brace counting is saner.
function stripStrings (line) {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

function widgetOf (rel) {
  const after = rel.split('client/dist/widgets/')[1];
  if (!after) {
    return { group: '', widget: '' };
  }
  const seg = after.split('/');
  return { group: seg[0] || '', widget: seg[1] || '' };
}

function bump (counts, wkey, field) {
  let c = counts.get(wkey);
  if (!c) {
    c = { symbols: 0, components: 0, hooks: 0, classes: 0 };
    counts.set(wkey, c);
  }
  c[field]++;
}

function clean (s, max = 160) {
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}

// Capture the balanced parameter list starting at the `(` at openIdx (single line).
function paramsFrom (line, openIdx) {
  if (openIdx < 0 || line[openIdx] !== '(') {
    return '';
  }
  let depth = 0;
  let out = '';
  for (let i = openIdx; i < line.length; i++) {
    const ch = line[i];
    if (ch === '(') {
      depth++;
      if (depth === 1) {
        continue;
      }
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return clean(out);
      }
    }
    out += ch;
  }
  return clean(out) + '...'; // unterminated on this line
}

// Best-effort props type for a React component signature line.
function propsOf (sig) {
  let m = /:\s*(?:React\.)?(?:FC|FunctionComponent|VFC)\s*<\s*([^>]+?)\s*>/.exec(sig);
  if (m) {
    return clean(m[1], 80);
  }
  m = /(?:React\.)?(?:Pure)?Component\s*<\s*([^,>]+)/.exec(sig);
  if (m) {
    return clean(m[1], 80);
  }
  m = /\(\s*(?:\{[^}]*\}|[\w$]+)\s*:\s*([\w$.]+(?:<[^>]*>)?)/.exec(sig);
  if (m) {
    return clean(m[1], 80);
  }
  return '';
}

function parseImportClause (clause) {
  const names = [];
  const trimmed = clause.trim();
  const ns = /\*\s+as\s+([\w$]+)/.exec(trimmed);
  if (ns) {
    names.push({ kind: 'namespace', name: ns[1] });
  }
  const braced = /\{([\s\S]*?)\}/.exec(trimmed);
  if (braced) {
    for (const it of splitNamed(braced[1])) {
      names.push({ kind: 'named', name: it });
    }
  }
  const def = /^([\w$]+)\s*(?:,|$)/.exec(trimmed);
  if (def && def[1] !== 'type') {
    names.push({ kind: 'default', name: def[1] });
  }
  return names;
}

// Detailed extraction for readable .ts/.tsx.
function extractDetailed (content, rel, out) {
  const { group, widget } = widgetOf(rel);
  const wkey = `${group}/${widget}`;
  const suffix = `${group}\t${widget}\t${rel}`;
  const isTsx = rel.endsWith('.tsx');

  const lines = content.split(/\r?\n/);
  const stack = [];
  let depth = 0;
  let pending = null;
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    let line = lines[i];

    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) {
        continue;
      }
      line = line.slice(end + 2);
      inBlock = false;
    }

    // Re-exports (barrels).
    if (line.indexOf('export') !== -1) {
      const star = REEXPORT_STAR_RE.exec(line);
      if (star) {
        if (!isBinaryModule(star[2]) && !isLocaleModule(star[2])) {
          out.reexports.push(`${star[1] ? `* as ${star[1]}` : '*'}\tstar\t${star[2]}\t${suffix}\t${ln}`);
        }
      } else {
        const named = REEXPORT_NAMED_RE.exec(line);
        if (named && !isBinaryModule(named[2]) && !isLocaleModule(named[2])) {
          for (const it of splitNamed(named[1])) {
            out.reexports.push(`${it}\tnamed\t${named[2]}\t${suffix}\t${ln}`);
          }
        }
      }
    }

    // Top-level declarations (module scope only) - exported and non-exported.
    if (depth === 0) {
      const td = TOPDECL_RE.exec(line);
      if (td) {
        const exported = td[1] ? 'export' : '-';
        const kind = td[2].replace('function*', 'function');
        const name = td[3];
        const afterName = td.index + td[0].length;
        const rest = line.slice(afterName);
        const callableRhs = /=>|=\s*(?:async\s*)?function\b|=\s*(?:async\s*)?\(|=\s*(?:React\.)?(?:memo|forwardRef|observer)\s*\(|=\s*[\w$]+\s*=>/.test(rest);

        // symbols: always for real decls; const/let/var only if exported or callable.
        const isVar = kind === 'const' || kind === 'let' || kind === 'var';
        if (!isVar || exported === 'export' || callableRhs) {
          out.symbols.push(`${name}\t${kind}\t${exported}\t${suffix}\t${ln}`);
          bump(out.counts, wkey, 'symbols');
        }

        // functions: signatures for top-level function-like decls (skip HOC-wrapped
        // components - they are captured in components.tsv with their props).
        const hocWrapped = /=\s*(?:React\.)?(?:memo|forwardRef|observer)\s*\(/.test(rest);
        if (kind === 'function' || (isVar && callableRhs && !hocWrapped)) {
          const openIdx = line.indexOf('(', afterName);
          out.functions.push(`${name}\t${exported}\t${paramsFrom(line, openIdx)}\t${suffix}\t${ln}`);
        }

        // hooks: useX functions/consts.
        const isHook = (kind === 'function' || kind === 'const') && HOOK_RE.test(name);
        if (isHook) {
          out.hooks.push(`${name}\t${exported}\t${suffix}\t${ln}`);
          bump(out.counts, wkey, 'hooks');
        }

        // components: PascalCase function/const (not a hook), with best-effort props type.
        if (!isHook && PASCAL_RE.test(name)) {
          let form = null;
          if (kind === 'function' && isTsx) {
            form = 'function';
          } else if (kind === 'const') {
            if (/=\s*(?:React\.)?forwardRef\b/.test(rest)) {
              form = 'forwardRef';
            } else if (/=\s*(?:React\.)?memo\b/.test(rest)) {
              form = 'memo';
            } else if (/:\s*(?:React\.)?FC\b/.test(line)) {
              form = 'fc';
            } else if (isTsx && callableRhs) {
              form = 'arrow';
            }
          }
          if (form) {
            out.components.push(`${name}\t${form}\t${exported}\t${propsOf(line)}\t${suffix}\t${ln}`);
            bump(out.counts, wkey, 'components');
          }
        }
      }
    }

    // Classes (any depth) - for classes.tsv, method scope, and class components.
    const cm = CLASS_RE.exec(line);
    if (cm) {
      const ext = (cm[2] || '').trim();
      const impl = (cm[3] || '').trim().replace(/\s+/g, ' ');
      const exportedC = /^\s*export\b/.test(line) ? 'export' : '-';
      out.classes.push(`${cm[1]}\t${ext}\t${impl}\t${exportedC}\t${suffix}\t${ln}`);
      bump(out.counts, wkey, 'classes');
      if (REACT_COMPONENT_RE.test(ext)) {
        out.components.push(`${cm[1]}\tclass\t${exportedC}\t${propsOf(ext)}\t${suffix}\t${ln}`);
        bump(out.counts, wkey, 'components');
      }
      pending = { name: cm[1], kind: 'class', atDepth: depth };
    } else {
      const im = INTERFACE_RE.exec(line);
      if (im) {
        pending = { name: im[1], kind: 'interface', atDepth: depth };
      }
    }

    // Member methods / property fields (inside class or interface body).
    const top = stack[stack.length - 1];
    if (top && depth === top.bodyDepth) {
      const mm = MEMBER_RE.exec(line);
      if (mm && !MEMBER_STOP.has(mm[2])) {
        const openIdx = mm.index + mm[0].length - 1;
        const mods = mm[1].trim().replace(/\s+/g, ' ');
        out.methods.push(`${top.name}\t${mm[2]}\t${mods}\t${paramsFrom(line, openIdx)}\t${suffix}\t${ln}`);
      } else if (!mm) {
        const fm = FIELD_RE.exec(line);
        if (fm && !FIELD_STOP.has(fm[1])) {
          const type = clean(fm[3].replace(/[;,]\s*$/, '').replace(/\s*=.*$/, ''), 120);
          if (type) {
            out.fields.push(`${top.name}\t${fm[1]}\t${fm[2] ? '?' : ''}\t${type}\t${suffix}\t${ln}`);
          }
        }
      }
    }

    // Brace tracking.
    const scan = stripStrings(line);
    const bc = scan.indexOf('/*');
    if (bc !== -1 && scan.indexOf('*/', bc) === -1) {
      inBlock = true;
      line = scan.slice(0, bc);
    } else {
      line = scan;
    }
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '{') {
        depth++;
        if (pending && depth === pending.atDepth + 1) {
          stack.push({ name: pending.name, kind: pending.kind, bodyDepth: depth });
          pending = null;
        }
      } else if (ch === '}') {
        depth--;
        while (stack.length && depth < stack[stack.length - 1].bodyDepth) {
          stack.pop();
        }
      }
    }
  }

  // Imports - aggregate per (module, kind); one row per statement-kind.
  const byMod = new Map(); // "mod\tkind" -> Set(names)
  IMPORT_FROM_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_FROM_RE.exec(content)) !== null) {
    const mod = m[3];
    if (isBinaryModule(mod) || isLocaleModule(mod)) {
      continue;
    }
    const prefix = m[1] ? 'type-' : '';
    for (const n of parseImportClause(m[2])) {
      const key = `${mod}\t${prefix}${n.kind}`;
      if (!byMod.has(key)) {
        byMod.set(key, new Set());
      }
      byMod.get(key).add(n.name);
    }
  }
  IMPORT_SIDE_RE.lastIndex = 0;
  while ((m = IMPORT_SIDE_RE.exec(content)) !== null) {
    const mod = m[1];
    if (isBinaryModule(mod) || isLocaleModule(mod)) {
      continue;
    }
    const key = `${mod}\tside-effect`;
    if (!byMod.has(key)) {
      byMod.set(key, new Set(['-']));
    }
  }
  const pkgMods = new Set();
  for (const [key, set] of byMod) {
    const [mod, kind] = key.split('\t');
    out.imports.push(`${mod}\t${Array.from(set).sort().join(',')}\t${kind}\t${suffix}`);
    if (!mod.startsWith('.')) {
      pkgMods.add(mod);
    }
  }
  for (const mod of pkgMods) {
    addUsage(out.moduleUsage, mod, wkey);
  }

  // JSX usage (.tsx only): PascalCase components + hyphenated web components.
  if (isTsx) {
    const tags = new Set();
    let g;
    JSX_COMP_RE.lastIndex = 0;
    while ((g = JSX_COMP_RE.exec(content)) !== null) {
      const before = g.index > 0 ? content[g.index - 1] : ' ';
      if (!/[\w$.]/.test(before)) { // skip generic type args like Array<Foo>
        tags.add(g[1]);
      }
    }
    JSX_TAG_RE.lastIndex = 0;
    while ((g = JSX_TAG_RE.exec(content)) !== null) {
      tags.add(g[1]);
    }
    for (const t of tags) {
      addUsage(out.jsxUsage, t, wkey);
    }
  }
}

async function readManifest (absManifest, repoRel, rows, byWidget) {
  try {
    const raw = await fs.readFile(absManifest, 'utf8');
    const j = JSON.parse(raw);
    const { group, widget } = widgetOf(repoRel);
    const { row, catalogEntry } = manifestRow(j, group, widget, repoRel);
    rows.push(row);
    if (catalogEntry) {
      byWidget.set(`${group}/${widget}`, catalogEntry);
    }
  } catch {
    // ignore malformed manifests
  }
}

async function collectFiles (area) {
  const files = [];
  await walk(path.join(ROOT, area.dir), area.dir, files);
  return files;
}

async function writeTsv (file, header, rows) {
  rows.sort();
  await fs.writeFile(file, [header, ...rows].join('\n') + '\n', 'utf8');
}

// Reverse index of framework API names named in comments / string literals of readable
// OOTB + SDK source. This surfaces undocumented internals that code references in prose
// (often beside the public wrapper that dispatches them), which the usage graph misses.
const MENTION_TOKEN_RE = /[A-Za-z_$][\w$]*/g;

function scanMentionText (text, emit) {
  if (!text) {
    return;
  }
  MENTION_TOKEN_RE.lastIndex = 0;
  const local = new Set();
  let t;
  while ((t = MENTION_TOKEN_RE.exec(text)) !== null) {
    if (!local.has(t[0])) {
      local.add(t[0]);
      emit(t[0]);
    }
  }
}

function extractMentions (content, rel, area, record) {
  const { group, widget } = rel.includes('/dist/widgets/') ? widgetOf(rel) : { group: '', widget: '' };
  const lines = content.split(/\r?\n/);
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    let s = lines[i];
    const emitComment = (name) => record(name, 'comment', area, group, widget, rel, ln);
    const emitString = (name) => record(name, 'string', area, group, widget, rel, ln);
    if (inBlock) {
      const end = s.indexOf('*/');
      if (end === -1) {
        scanMentionText(s, emitComment);
        continue;
      }
      scanMentionText(s.slice(0, end), emitComment);
      s = s.slice(end + 2);
      inBlock = false;
    }
    for (let c = 0; c < s.length; c++) {
      const ch = s[c];
      const nx = s[c + 1];
      if (ch === '/' && nx === '/') {
        scanMentionText(s.slice(c + 2), emitComment);
        break;
      }
      if (ch === '/' && nx === '*') {
        const end = s.indexOf('*/', c + 2);
        if (end === -1) {
          scanMentionText(s.slice(c + 2), emitComment);
          inBlock = true;
          break;
        }
        scanMentionText(s.slice(c + 2, end), emitComment);
        c = end + 1;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        let j = c + 1;
        let buf = '';
        while (j < s.length && s[j] !== ch) {
          if (s[j] === '\\') {
            j++;
          }
          buf += s[j] || '';
          j++;
        }
        scanMentionText(buf, emitString);
        c = j;
        continue;
      }
    }
  }
}

async function buildMentions (nameSet) {
  const perName = new Map();
  const record = (name, kind, area, group, widget, rel, ln) => {
    if (!nameSet.has(name)) {
      return;
    }
    let e = perName.get(name);
    if (!e) {
      e = { files: new Set(), rows: [] };
      perName.set(name, e);
    }
    e.files.add(rel);
    e.rows.push(`${name}\t${kind}\t${area}\t${group}\t${widget}\t${rel}\t${ln}`);
  };
  const areas = AREAS.filter((a) => a.detailed || a.name === 'sdk-resources');
  for (const area of areas) {
    const files = await collectFiles(area);
    for (const f of files) {
      if (!DETAIL_EXT.has(path.extname(f.rel))) {
        continue;
      }
      let st;
      try {
        st = await fs.stat(f.abs);
      } catch {
        continue;
      }
      if (st.size > MAX_PARSE_BYTES) {
        continue;
      }
      const content = await fs.readFile(f.abs, 'utf8');
      extractMentions(content, f.rel, area.name, record);
    }
  }
  const rows = [];
  const seen = new Set();
  for (const [, e] of perName) {
    if (e.files.size > MENTION_MAX_FILES) {
      continue;
    }
    for (const r of e.rows) {
      if (!seen.has(r)) {
        seen.add(r);
        rows.push(r);
      }
    }
  }
  const names = new Set(rows.map((r) => r.slice(0, r.indexOf('\t'))));
  await writeTsv(path.join(OUT_DIR, 'mentions.tsv'), 'name\tkind\tarea\tgroup\twidget\tpath\tline', rows);
  return { rows: rows.length, names: names.size };
}

async function main () {
  // Independent generators own the preserved subtrees.
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const entry of await fs.readdir(OUT_DIR)) {
    if (PRESERVED_OUTPUTS.has(entry)) {
      continue;
    }
    await fs.rm(path.join(OUT_DIR, entry), { recursive: true, force: true });
  }

  const symbols = [];
  const reexports = [];
  const stats = [];

  for (const area of AREAS) {
    const files = await collectFiles(area);
    await fs.writeFile(
      path.join(OUT_DIR, `tree.${area.name}.txt`),
      files.map((f) => f.rel).sort().join('\n') + '\n',
      'utf8',
    );

    let symCount = 0;
    const detailed = {
      symbols: [], reexports: [], imports: [], classes: [], methods: [], components: [], hooks: [],
      functions: [], fields: [], moduleUsage: new Map(), jsxUsage: new Map(), counts: new Map(),
    };

    if (area.symbols || area.detailed) {
      const wanted = area.detailed ? DETAIL_EXT : PARSE_EXT;
      for (const f of files) {
        if (!wanted.has(path.extname(f.rel))) {
          continue;
        }
        let st;
        try {
          st = await fs.stat(f.abs);
        } catch {
          continue;
        }
        if (st.size > MAX_PARSE_BYTES) {
          continue;
        }
        const content = await fs.readFile(f.abs, 'utf8');
        if (area.detailed) {
          extractDetailed(content, f.rel, detailed);
        } else {
          const before = symbols.length;
          extractFromContent(content, f.rel, area.name, symbols, reexports);
          symCount += symbols.length - before;
        }
      }
    }

    const manifestByWidget = new Map();
    let manifestCount = 0;
    if (area.manifests) {
      const rows = [];
      for (const f of files) {
        if (path.basename(f.rel) === 'manifest.json') {
          await readManifest(f.abs, f.rel, rows, manifestByWidget);
        }
      }
      manifestCount = rows.length;
      const dir = area.detailed ? DIST_OUT_DIR : OUT_DIR;
      await fs.mkdir(dir, { recursive: true });
      await writeTsv(path.join(dir, 'manifests.tsv'), 'group\twidget\tname\tlabel\tversion\texbVersion\tdependency\tpublishMessages\tmessageActions\tdataActions\tlayouts\tproperties\textensions\tpath', rows);
    }

    if (area.detailed) {
      await fs.mkdir(DIST_OUT_DIR, { recursive: true });
      await writeTsv(path.join(DIST_OUT_DIR, 'symbols.tsv'), 'name\tkind\texported\tgroup\twidget\tpath\tline', detailed.symbols);
      await writeTsv(path.join(DIST_OUT_DIR, 'components.tsv'), 'name\tform\texported\tprops\tgroup\twidget\tpath\tline', detailed.components);
      await writeTsv(path.join(DIST_OUT_DIR, 'hooks.tsv'), 'name\texported\tgroup\twidget\tpath\tline', detailed.hooks);
      await writeTsv(path.join(DIST_OUT_DIR, 'functions.tsv'), 'name\texported\tparams\tgroup\twidget\tpath\tline', detailed.functions);
      await writeTsv(path.join(DIST_OUT_DIR, 'classes.tsv'), 'name\textends\timplements\texported\tgroup\twidget\tpath\tline', detailed.classes);
      await writeTsv(path.join(DIST_OUT_DIR, 'methods.tsv'), 'class\tmethod\tmodifiers\tparams\tgroup\twidget\tpath\tline', detailed.methods);
      await writeTsv(path.join(DIST_OUT_DIR, 'fields.tsv'), 'owner\tfield\toptional\ttype\tgroup\twidget\tpath\tline', detailed.fields);
      await writeTsv(path.join(DIST_OUT_DIR, 'imports.tsv'), 'module\tnames\tkind\tgroup\twidget\tpath', detailed.imports);
      await writeTsv(path.join(DIST_OUT_DIR, 'reexports.tsv'), 'exported\tkind\tfrom\tgroup\twidget\tpath\tline', detailed.reexports);
      await writeTsv(path.join(DIST_OUT_DIR, 'module-usage.tsv'), 'module\tfiles\twidgets\twidget_names', usageRows(detailed.moduleUsage));
      await writeTsv(path.join(DIST_OUT_DIR, 'jsx-usage.tsv'), 'tag\tfiles\twidgets\twidget_names', usageRows(detailed.jsxUsage));

      const catRows = catalogRows(detailed.counts, manifestByWidget);
      await writeTsv(path.join(DIST_OUT_DIR, 'catalog.tsv'), 'group\twidget\tlabel\texbVersion\tdependencies\tcomponents\thooks\tclasses\tsymbols', catRows);

      symCount = detailed.symbols.length;
      stats.push({
        area: area.name, files: files.length, symbols: symCount, manifests: manifestCount,
        detail: {
          classes: detailed.classes.length, methods: detailed.methods.length, imports: detailed.imports.length,
          components: detailed.components.length, hooks: detailed.hooks.length, functions: detailed.functions.length,
          fields: detailed.fields.length, modules: detailed.moduleUsage.size, jsx: detailed.jsxUsage.size,
        },
      });
    } else {
      stats.push({ area: area.name, files: files.length, symbols: symCount, manifests: manifestCount, detail: null });
    }
  }

  await writeTsv(path.join(OUT_DIR, 'symbols.tsv'), 'name\tkind\tarea\tpath\tline', symbols);
  await writeTsv(path.join(OUT_DIR, 'reexports.tsv'), 'area\tpath\tline\tkind\texported\tfrom', reexports);

  const mentionNameSet = new Set(symbols.map((r) => r.slice(0, r.indexOf('\t'))).filter((n) => n.length >= MENTION_MIN_LEN));
  const mentions = await buildMentions(mentionNameSet);
  console.log(`ai-index mentions: ${mentions.rows} rows across ${mentions.names} API names -> .ai-context/exb/mentions.tsv`);

  const dist = stats.find((s) => s.detail);
  await writeReadme(stats, symbols.length, reexports.length);
  await writeRepoMap(stats, symbols.length, reexports.length);
  await writeClientRuntimeMap();
  await writeDistReadme(dist);

  const total = stats.reduce((a, s) => a + s.files, 0);
  console.log(`ai-index written to .ai-context/exb (${total} files, ${symbols.length} framework symbols, ${reexports.length} re-exports)`);
  for (const s of stats) {
    const d = s.detail;
    const extra = d
      ? `components=${d.components} hooks=${d.hooks} functions=${d.functions} classes=${d.classes} methods=${d.methods} fields=${d.fields} imports=${d.imports} modules=${d.modules} jsx=${d.jsx}`
      : `manifests=${s.manifests}`;
    console.log(`  ${s.area.padEnd(18)} files=${String(s.files).padEnd(7)} symbols=${String(s.symbols).padEnd(7)} ${extra}`);
  }
}

const REGION_DOCS = {
  'jimu-core': 'Framework core: React re-export, managers (DataSource/Widget/Message/Session/...), Redux store, data-source interfaces, types (AppState/manifest), utils.',
  'jimu-arcgis': 'Map / JSAPI bridge: JimuMapView, MapViewManager, JimuLayerView, JimuMapViewComponent, loadArcGISJSAPIModules, map utils.',
  'jimu-ui': 'UI component library: basic components + advanced/ setting-components (SettingSection, MapWidgetSelector, JimuLayerViewSelector, ...).',
  'jimu-data-source': 'Data-source base classes + concrete implementations.',
  'jimu-for-builder': 'Builder-side settings APIs (AllWidgetSettingProps, getAppConfigAction).',
  'jimu-for-test': 'Test utilities (withStoreThemeIntlRender, mocks).',
  'jimu-layouts': 'Layout runtime + builder (ViewportVisibilityContext, LayoutType).',
  'jimu-theme': 'Theming (useTheme, styled, IMThemeVariables, theme.sys tokens).',
  'jimu-icons': 'Icon components + SVGs.',
  'client-types': 'Shared + third-party ambient type declarations.',
  'sdk-resources': 'Official MINIMAL teaching sample widgets (single-concept). Curated: references/sdk-sample-index.md',
  'dist-widgets': 'OOTB PRODUCTION widgets (arcgis/* map, common/* data+layout, ...) - the primary grounding; deep-indexed under dist-widgets/. Curated: references/ootb-widget-index.md',
};

async function readJsonSafe (p) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return null;
  }
}

async function writeRepoMap (stats, symTotal, reexTotal) {
  const dirByName = Object.fromEntries(AREAS.map((a) => [a.name, a.dir]));
  const ver = await readJsonSafe(path.join(ROOT, 'ArcGISExperienceBuilder', 'version.json'));
  const exbVersion = (ver && (ver.version || ver.exbVersion)) || 'unknown';
  const core = await readJsonSafe(path.join(ROOT, CLIENT, 'node_modules', '@arcgis', 'core', 'package.json'));
  const sdkVersion = (core && core.version) || '5.0.x';
  const now = new Date().toISOString();

  const grepHint = (name) => (name === 'dist-widgets'
    ? '`dist-widgets/*.tsv` + `dist-widgets-ts/`'
    : `\`symbols.tsv\` (area=${name}), \`tree.${name}.txt\``);
  const rows = stats
    .map((s) => `| \`${s.area}\` | \`${dirByName[s.area] || ''}\` | ${REGION_DOCS[s.area] || ''} | ${grepHint(s.area)} |`)
    .join('\n');

  const md = `# ArcGIS Experience Builder Repository Map (generated)

Generated by codebase-context (\`src/build-ai-index.mjs\`) on ${now}.
Do NOT hand-edit. Regenerate with \`npm run ai:index\`. Router for the machine-readable
indexes in this folder; see also [README.md](README.md).

Grep-first map of the authoritative (gitignored) ExB / jimu vendor source so an AI agent can
navigate ~275 MB without a semantic index. Indexes are TSV (one fact per line - GREP them, do
not read whole files). \`ArcGISExperienceBuilder/\` is READ-ONLY; adapt patterns into \`src/\`.

## Framework metadata

- Source root: \`ArcGISExperienceBuilder/\`
- ExB version: **${exbVersion}**
- ArcGIS Maps SDK for JavaScript: **${sdkVersion}** (Calcite 5.0.x, React 19, Node 24)
- Index generated: ${now}
- Framework symbols: **${symTotal}**  |  re-exports: **${reexTotal}**

## Major source regions

| region | path | what it is | grep these |
|---|---|---|---|
${rows}

## OOTB widget deep index (\`dist-widgets/\`)

Per-widget detail from readable \`.ts/.tsx\` source; each row carries \`group\`/\`widget\` columns:
\`catalog.tsv\` (per-widget overview), \`components.tsv\` (+props) / \`components-props.tsv\`, \`hooks.tsv\`,
\`functions.tsv\` (+params), \`classes.tsv\`, \`methods.tsv\` (+params), \`fields.tsv\` (interface/class members),
\`symbols.tsv\`, \`imports.tsv\`, \`module-usage.tsv\` (who imports a module = find examples), \`jsx-usage.tsv\`
(who renders a component/tag), \`manifests.tsv\` (per-widget manifest digest: identity + dependency + publishMessages/messageActions/dataActions/layouts/properties/extensions).
TYPE-ACCURATE variant \`dist-widgets-ts/\` (ts-morph): resolved props/types, per-prop table, resolved import
targets - regenerate with \`npm run ai:index:rich\`.

## Canonical API and evidence indexes

- \`api/symbols.tsv\`: stable API/member identities, kinds, parents, visibility, and match status.
- \`api/declarations.tsv\` + \`api/exports.tsv\`: exact declaration locators and verified import surfaces.
- \`api/relations.tsv\`: resolved declaration relationships, not usage counts.
- \`docs/\`: local guide/API/sample routes and barrel-verified Storybook component entries.
- \`docs-text/guide/<slug>.md\`: the installed guide pages as plain text (grep these for concepts and how-to); \`docs-text/guide/index.tsv\` lists slug, title, local path, online URL. Built by \`npm run ai:knowledge\`.
- \`facts/<version>.json|.md\`: architecture facts read from the install (server routes, client externals, AppConfig keys, enums), each with its source; \`facts/changes-<version>.md\` lists what changed since the last run or older version. Built by \`npm run ai:knowledge\`; older versions are kept.
- \`api-usage/<package>.tsv\`: compiler-resolved static references; \`summary.tsv\` aggregates counts.
- \`api-usage-fast/\`: separate lower-confidence import-scoped fallback evidence.
- \`reports/unresolved-*.tsv\`: dynamic or unmatched static candidates excluded from resolved totals.
- \`mentions.tsv\`: framework API names named in comments / string literals of readable OOTB/SDK source (rare-mention filtered). Use when a symbol has a declaration but no usages - a comment often names it beside the public wrapper that dispatches it.

Run \`npm run ai:find -- <term>\` for ranked docs, declarations, members, and representative SDK/OOTB usages. Add \`--brief\` for confident matches only, and \`--in <group/widget or path>\` to list every usage inside a scope (for example \`npm run ai:find -- DataSourceStatus.NotReady --in common/list --brief\`).

## Client Runtime Fallback

When declarations and readable OOTB source do not explain framework behavior, use
[CLIENT-RUNTIME-MAP.md](CLIENT-RUNTIME-MAP.md) to select one package-specific minified runtime bundle.
It is a last-resort behavior trace, not canonical usage evidence.

## Default lookup strategy

1. **Capability/API** -> \`npm run ai:find -- <term>\`, then \`docs/\` and \`api/\`.
2. **Supported precedent** -> \`api-usage/\` for SDK/OOTB references; widget capabilities -> \`dist-widgets/{catalog,manifests,module-usage,jsx-usage}.tsv\`.
3. **Definition** -> \`api/declarations.tsv\` and \`api/exports.tsv\`; legacy name lookup -> \`symbols.tsv\` / \`reexports.tsv\`.
4. **Resolved types / real props** -> \`dist-widgets-ts/{components-props,fields,methods,functions}.tsv\`.
5. **Open** the smallest set of exact source files at \`path\`:\`line\` and verify against local \`.d.ts\`.
6. **Runtime fallback** -> for opaque local framework behavior, inspect the one bundle selected by
  [CLIENT-RUNTIME-MAP.md](CLIENT-RUNTIME-MAP.md). Do not search \`chunks/\`, vendored libraries, or
  all minified bundles broadly.
7. **Escalate** if no close local match: official Esri docs / API reference / sdk-resources repo / JS SDK
   samples / Calcite / Storybook; mark unverified APIs \`\u26a0\ufe0f NOT VERIFIED IN LOCAL EXB SOURCES\`.

## Regeneration

- \`npm run ai:index\` rebuilds the fast source indexes and preserves independently generated subtrees.
- \`npm run ai:index:docs\` rebuilds local documentation and Storybook navigation metadata.
- \`npm run ai:index:rich\` rebuilds \`dist-widgets-ts/\` and the canonical \`api/\` catalog.
- \`npm run ai:index:usages\` rebuilds canonical/fallback usages and unresolved reports.
- \`npm run ai:knowledge\` rebuilds \`facts/\` and \`docs-text/\` (config: \`.codebase-context/config.json\`).
- Re-run after \`npm run setup\` version bumps.
`;
  await fs.writeFile(path.join(OUT_DIR, 'REPOSITORY-MAP.md'), md, 'utf8');
}

async function writeClientRuntimeMap () {
  const md = `# Client Runtime Bundle Map (generated)

Generated by codebase-context (\`src/build-ai-index.mjs\`).
Do NOT hand-edit. Regenerate with \`npm run ai:index\`.

Use this only after declarations, local docs, SDK samples, and readable OOTB widget source do not
explain a framework behavior. These bundles are minified generated runtime code. They can establish
implementation behavior, but are not canonical API usage or supported-custom-widget precedent.

## Client Source Tiers

1. **Type contract** - \`client/jimu-{core,ui,arcgis,data-source,for-builder,layouts,theme,for-test,icons}/\`
  and \`client/types/\` are primarily \`.d.ts\` declarations. \`jimu-core/lib/\` has one readable
  implementation file, \`set-public-path.ts\`; \`jimu-for-test\` also ships a readable \`index.tsx\`.
  Read their JSDoc for intent. HTML API reference and Storybook metadata are outside \`client/\` under
  \`ArcGISExperienceBuilder/exb-api-ref-docs/\` and indexed under \`.ai-context/exb/docs/\`.
2. **Readable OOTB source** - \`client/dist/widgets/<group>/<widget>/src/\` contains the primary
  production precedent in \`.ts/.tsx\`. Major groups include \`arcgis/\` (28 widgets), \`common/\`
  (24), \`layout/\`, \`lrs/\`, \`geobim/\`, \`ba-infographic/\`, \`survey123/\`, and \`shared-code/\`.
3. **Minified runtime fallback** - \`client/dist/jimu-*/\` provides behavior when tiers 1 and 2 do not.
  An import subpath normally maps directly to a bundle path: \`jimu-ui/advanced/setting-components\`
  maps to \`dist/jimu-ui/advanced/setting-components.js\`.

## Search Order

1. Start with the matching \`client/jimu-*/\` declaration and readable OOTB widget \`.ts/.tsx\` source.
   Also grep \`.ai-context/exb/mentions.tsv\` for the API name - a comment or string in readable source
   often names an internal API beside the public wrapper that dispatches it.
2. Map the import package or question to exactly one runtime bundle below.
3. Search the exported API name first. Minified identifiers are mangled, but these anchors are stable:
   exported API names, enum member names, and string literals. For an action, grep the \`ActionKeys\`
   string constant (e.g. \`"WIDGET_MUTABLE_STATE_PROP_CHANGE"\`) to find the enum, then grep the stable
   enum member (e.g. \`.WidgetMutableStatePropChange\`) to reach both the creator and the reducer \`case\`.
   Only fall back to a mangled \`function <id>(\` when no stable anchor exists, resolving it via the
   webpack export map \`apiName:()=>MangledId\`.

| Need | First bundle to inspect |
|---|---|
| App actions, Redux reducers, store, managers, messages, sessions, mutable store | \`ArcGISExperienceBuilder/client/dist/jimu-core/index.js\` |
| \`JimuMapView\`, \`MapViewManager\`, \`JimuLayerView\`, map bridge behavior | \`ArcGISExperienceBuilder/client/dist/jimu-arcgis/index.js\` |
| Data-source implementation behavior | \`ArcGISExperienceBuilder/client/dist/jimu-data-source/index.js\` |
| Settings and builder APIs | \`ArcGISExperienceBuilder/client/dist/jimu-for-builder/index.js\` or its matching subpath bundle: \`service.js\`, \`guides.js\`, \`templates.js\`, \`json-editor-setting.js\` |
| Layout runtime or builder behavior | \`ArcGISExperienceBuilder/client/dist/jimu-layouts/layout-runtime.js\` or \`layout-builder.js\` |
| Theme behavior | \`ArcGISExperienceBuilder/client/dist/jimu-theme/index.js\` |
| Core jimu-ui component behavior | \`ArcGISExperienceBuilder/client/dist/jimu-ui/index.js\` |
| \`jimu-ui/advanced/<name>\` | \`ArcGISExperienceBuilder/client/dist/jimu-ui/advanced/<name>.js\` |
| \`jimu-ui/basic/<name>\` | \`ArcGISExperienceBuilder/client/dist/jimu-ui/basic/<name>.js\` |
| Builder application shell | \`ArcGISExperienceBuilder/client/dist/builder/index.js\` |
| Published experience shell | \`ArcGISExperienceBuilder/client/dist/experience/index.js\` |
| One shipped widget after its adjacent \`src/\` does not explain behavior | \`ArcGISExperienceBuilder/client/dist/widgets/<group>/<widget>/dist/runtime/widget.js\`, \`setting/setting.js\`, or \`runtime/builder-support.js\` |

## Exclusions

Do not search \`node_modules/\`, any \`chunks/\` directory, \`*.LICENSE.txt\`, translations,
assets, source maps, \`dist/calcite-components/\`, \`dist/arcgis-*-components/\`, or vendored
libraries in \`dist/jimu-core/\` such as \`wkid.js\`, React, JSZip, Bowser, Emotion, and Request.
Also skip \`client/dist-report/\`, \`client/scripts/\`, \`client/webpack/\`, and \`client/__mocks__/\`.

## Known Limitation

The installed runtime bundles do not ship source maps. Treat minified findings as version-specific,
and rerun the investigation after an Experience Builder upgrade.
`;
  await fs.writeFile(path.join(OUT_DIR, 'CLIENT-RUNTIME-MAP.md'), md, 'utf8');
}

async function writeReadme (stats, symTotal, reexTotal) {
  const rows = stats
    .map((s) => `| \`${s.area}\` | ${s.files} | ${s.symbols} | ${s.detail ? 'see dist-widgets/' : (s.manifests || '-')} |`)
    .join('\n');
  const md = `# AI source index (generated)

Generated by codebase-context (\`src/build-ai-index.mjs\`) on ${new Date().toISOString()}.
Do NOT hand-edit. Regenerate with: \`npm run ai:index\`.

Compact, grep-friendly index of the authoritative ExB / jimu sources (gitignored
under \`ArcGISExperienceBuilder/\`) so an AI agent can locate symbols and files on
demand without scanning ~275 MB of vendor code. Binary/asset files (images, fonts,
media, archives, sourcemaps) and localization files (i18n / t9n / nls / translations
/ help) are excluded everywhere.

## How an agent should use this

- **Find where a framework symbol is defined:** grep \`symbols.tsv\`
  (\`name  kind  area  path  line\`). Open \`path\` at \`line\`.
- **Resolve a barrel / re-export:** grep \`reexports.tsv\`
  (\`area  path  line  kind  exported  from\`).
- **Browse an area's files:** open \`tree.<area>.txt\` (repo-relative paths).
- **OOTB widget deep index:** see [dist-widgets/](dist-widgets/) and its \`README.md\`
  (components, hooks, functions, symbols, classes, methods, fields, imports, module
  usage, JSX usage, manifests, per-widget catalog).
- **Canonical Jimu API/member lookup:** grep \`api/symbols.tsv\`, then open its
  \`api/declarations.tsv\` or verified \`api/exports.tsv\` record.
- **Public intent and examples:** grep \`docs/{routes,api-reference,storybook}.tsv\`.
- **Statically resolved usage evidence:** grep \`api-usage/<package>.tsv\`; inspect
  \`reports/unresolved-*.tsv\` before making any completeness claim.
- **Named in comments/strings:** grep \`mentions.tsv\` (\`name  kind  area  group  widget  path  line\`)
  for an API named in readable OOTB/SDK prose - useful for undocumented internals called via a wrapper.
- **Opaque framework implementation:** open [CLIENT-RUNTIME-MAP.md](CLIENT-RUNTIME-MAP.md) only after
  declarations and readable source leave behavior unresolved.
- **Combined query:** run \`npm run ai:find -- <term>\`.

Framework symbols come from TypeScript declarations (\`.d.ts\`) and readable
sources across the jimu-* areas + \`sdk-resources\`. The \`dist-widgets\` area is
indexed in detail from its readable \`.ts/.tsx\` source (see its own folder).

Totals: **${symTotal}** framework symbols, **${reexTotal}** re-exports.

| area | files | symbols | manifests |
|---|---|---|---|
${rows}
`;
  await fs.writeFile(path.join(OUT_DIR, 'README.md'), md, 'utf8');
}

async function writeDistReadme (dist) {
  if (!dist) {
    return;
  }
  const d = dist.detail;
  const md = `# dist-widgets detailed index (generated)

Detailed, grep-friendly indexes extracted from the readable \`.ts/.tsx\` source of
every OOTB widget under \`ArcGISExperienceBuilder/client/dist/widgets\`. Do NOT
hand-edit. Regenerate with \`npm run ai:index\`.

Every row carries \`group\` (arcgis|common|layout|...) and \`widget\` columns so you
can scope a grep to one widget, plus the repo-relative \`path\`. \`exported\` is
\`export\` or \`-\` (widget-internal). Localization files are excluded.

| file | columns | rows |
|---|---|---|
| \`catalog.tsv\` | \`group  widget  label  exbVersion  dependencies  components  hooks  classes  symbols\` | per-widget |
| \`components.tsv\` | \`name  form  exported  props  group  widget  path  line\` | ${d.components} |
| \`hooks.tsv\` | \`name  exported  group  widget  path  line\` | ${d.hooks} |
| \`functions.tsv\` | \`name  exported  params  group  widget  path  line\` | ${d.functions} |
| \`symbols.tsv\` | \`name  kind  exported  group  widget  path  line\` | ${dist.symbols} |
| \`classes.tsv\` | \`name  extends  implements  exported  group  widget  path  line\` | ${d.classes} |
| \`methods.tsv\` | \`class  method  modifiers  params  group  widget  path  line\` | ${d.methods} |
| \`fields.tsv\` | \`owner  field  optional  type  group  widget  path  line\` | ${d.fields} |
| \`imports.tsv\` | \`module  names  kind  group  widget  path\` | ${d.imports} |
| \`module-usage.tsv\` | \`module  files  widgets  widget_names\` | ${d.modules} |
| \`jsx-usage.tsv\` | \`tag  files  widgets  widget_names\` | ${d.jsx} |
| \`reexports.tsv\` | \`exported  kind  from  group  widget  path  line\` | - |
| \`manifests.tsv\` | \`group  widget  name  label  version  exbVersion  dependency  publishMessages  messageActions  dataActions  layouts  properties  extensions  path\` | ${dist.manifests} |

## Recipes

- **Find a reusable component to copy:** grep \`components.tsv\` for a name; \`props\`
  is its props type, \`form\` = function|arrow|memo|forwardRef|fc|class.
- **Find example widgets that render a component / web component:** grep
  \`jsx-usage.tsv\` for the tag (e.g. \`CalciteButton\`, \`SettingSection\`,
  \`calcite-list\`, \`arcgis-map\`) -> \`widget_names\` lists examples.
- **Find example widgets that use a module/API:** grep \`module-usage.tsv\` for the
  module -> \`widget_names\`; then grep \`imports.tsv\` for exact files.
- **See a function/method signature:** grep \`functions.tsv\` / \`methods.tsv\`
  (\`params\` column).
- **See a config/props interface's fields:** grep \`fields.tsv\` for the owner type.
- **Find widgets that publish/consume messages, expose data actions, or declare an extension:** grep
  \`manifests.tsv\` (publishMessages/messageActions/dataActions/properties/extensions columns).
- **Per-widget code counts:** grep \`catalog.tsv\`.

Notes: \`symbols.tsv\` includes NON-exported top-level declarations (const/let/var only
when exported or callable). \`components\`/\`methods\`/\`fields\`/\`jsx\` are regex
best-effort - treat as leads, not gospel. \`imports.tsv\` \`kind\` is default | named |
namespace | side-effect (a leading \`type-\` marks an \`import type\`); binary and
localization imports are omitted.
`;
  await fs.writeFile(path.join(DIST_OUT_DIR, 'README.md'), md, 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
