/* eslint-disable */
// @ts-nocheck
// Tier 2 (ts-morph) type-ACCURATE index for dist/widgets.
// Complements the fast regex index (src/build-ai-index.mjs). Uses the real
// TypeScript checker (via the client tsconfig, which resolves jimu-* / esri) to emit
// resolved types, real component props, signatures, and resolved import targets.
//
// Output: .ai-context/exb/dist-widgets-ts/ (parallel to dist-widgets/ so we can diff
// regex vs ts-morph before switching). Same filenames + columns as the regex index,
// with extra resolved-type / jsdoc columns appended.
//
// Usage: codebase-context index:rich [group]   (group optional, e.g. "common")

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, SyntaxKind } from 'ts-morph';
import { apiCatalogGlobs, buildCanonicalApiCatalog, eligibleApiSourceFiles } from './build-ai-api-catalog.mjs';
import { addUsage, catalogRows, manifestRow, usageRows } from './lib/widget-catalog.mjs';

import { PROJECT_ROOT } from './lib/project-root.mjs';

const ROOT = PROJECT_ROOT;
const OUT_DIR = path.join(ROOT, '.ai-context', 'exb', 'dist-widgets-ts');
const API_OUT_DIR = path.join(ROOT, '.ai-context', 'exb', 'api');
const TSCONFIG = path.join(ROOT, 'ArcGISExperienceBuilder', 'client', 'tsconfig.json');
const WIDGETS_ABS = path.join(ROOT, 'ArcGISExperienceBuilder', 'client', 'dist', 'widgets');
const WIDGETS_GLOB = 'ArcGISExperienceBuilder/client/dist/widgets';

const BINARY_EXT = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.map']);
const PASCAL_RE = /^[A-Z][A-Za-z0-9]*$/;
const HOOK_RE = /^use[A-Z0-9]/;
const JSX_RET_RE = /\b(?:JSX\.Element|React\.JSX\.Element|ReactElement|React\.ReactElement|ReactNode|React\.ReactNode|Element)\b/;

function isLocale (rel) {
  return /(?:^|\/)(?:i18n|t9n|nls|translations)(?:\/|$)|\.(?:i18n|t9n)\b|\/assets\/[^]*?(?:i18n|t9n|translation)|\/help\/[^]*\.html?$/i.test(rel);
}
function isBinaryModule (mod) {
  return BINARY_EXT.has(path.extname(mod).toLowerCase());
}
function isLocaleModule (mod) {
  return /(?:^|\/)(?:i18n|t9n|nls|translations)(?:\/|$)|\.(?:i18n|t9n)\b/i.test(mod);
}

function relOf (sf) {
  return path.relative(ROOT, sf.getFilePath()).split(path.sep).join('/');
}
function widgetOf (rel) {
  const after = rel.split('client/dist/widgets/')[1];
  if (!after) {
    return { group: '', widget: '' };
  }
  const seg = after.split('/');
  return { group: seg[0] || '', widget: seg[1] || '' };
}
function clean (s, max = 200) {
  if (!s) {
    return '';
  }
  s = String(s).replace(/import\(["'][^"']*["']\)\./g, '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '...' : s;
}
function safe (fn) {
  try {
    return fn();
  } catch {
    return '';
  }
}
function typeOf (node, max = 200) {
  return clean(safe(() => node.getType().getText(node)), max);
}
function paramText (node) {
  const ps = safe(() => node.getParameters()) || [];
  return clean(ps.map((p) => {
    const nm = p.getName();
    const q = p.hasQuestionToken && p.hasQuestionToken() ? '?' : '';
    const t = (p.getTypeNode && p.getTypeNode()?.getText()) || safe(() => p.getType().getText(p)) || '';
    return t ? `${nm}${q}: ${clean(t, 60)}` : `${nm}${q}`;
  }).join(', '), 200);
}
function jsdocOf (node) {
  const docs = safe(() => (node.getJsDocs ? node.getJsDocs() : [])) || [];
  return docs.length ? clean(docs.map((d) => d.getDescription()).join(' '), 120) : '';
}
function returnsJSX (fnLike) {
  const rt = safe(() => fnLike.getReturnType().getText(fnLike)) || (fnLike.getReturnTypeNode && fnLike.getReturnTypeNode()?.getText()) || '';
  return JSX_RET_RE.test(rt);
}
function firstGeneric (typeText) {
  const m = /<\s*([^,>]+)/.exec(typeText || '');
  return m ? clean(m[1], 80) : '';
}

const out = {
  symbols: [], components: [], componentsProps: [], hooks: [], functions: [],
  classes: [], methods: [], fields: [], imports: [], reexports: [],
  moduleUsage: new Map(), jsxUsage: new Map(),
};

function pushProps (compName, propsType, atNode, ctx) {
  if (!propsType) {
    return;
  }
  let props;
  try {
    props = propsType.getProperties();
  } catch {
    return;
  }
  for (const sym of props.slice(0, 60)) {
    const pname = sym.getName();
    let ptype = '';
    let optional = '';
    let jsdoc = '';
    try {
      const decl = sym.getDeclarations()[0];
      const t = decl ? sym.getTypeAtLocation(decl) : sym.getTypeAtLocation(atNode);
      ptype = clean(t.getText(atNode), 120);
      if (decl && typeof decl.hasQuestionToken === 'function') {
        optional = decl.hasQuestionToken() ? '?' : '';
      }
      if (decl && typeof decl.getJsDocs === 'function') {
        const jd = decl.getJsDocs();
        jsdoc = jd.length ? clean(jd.map((d) => d.getDescription()).join(' '), 100) : '';
      }
    } catch {
      // best effort
    }
    out.componentsProps.push(`${compName}\t${pname}\t${optional}\t${ptype}\t${jsdoc}\t${ctx.suffix}\t${ctx.line}`);
  }
}

function extractFile (sf) {
  const rel = relOf(sf);
  if (isLocale(rel)) {
    return;
  }
  const { group, widget } = widgetOf(rel);
  const suffix = `${group}\t${widget}\t${rel}`;
  const isTsx = rel.endsWith('.tsx');

  // Functions.
  for (const fn of sf.getFunctions()) {
    const name = fn.getName();
    if (!name) {
      continue;
    }
    const line = fn.getStartLineNumber();
    const exported = fn.isExported() ? 'export' : '-';
    const params = paramText(fn);
    const ret = clean(safe(() => fn.getReturnType().getText(fn)), 120);
    out.symbols.push(`${name}\tfunction\t${exported}\t${typeOf(fn)}\t${suffix}\t${line}`);
    out.functions.push(`${name}\t${exported}\t${params}\t${ret}\t${suffix}\t${line}`);
    if (HOOK_RE.test(name)) {
      out.hooks.push(`${name}\t${exported}\t${params}\t${ret}\t${suffix}\t${line}`);
    } else if (PASCAL_RE.test(name) && (returnsJSX(fn) || isTsx)) {
      const p0 = safe(() => fn.getParameters()[0]);
      const propsText = p0 ? clean(safe(() => p0.getType().getText(p0)), 80) : '';
      out.components.push(`${name}\tfunction\t${exported}\t${propsText}\t${jsdocOf(fn)}\t${suffix}\t${line}`);
      p0 && pushProps(name, safe(() => p0.getType()), p0, { suffix, line });
    }
  }

  // Variable declarations (const/let/var) - arrow/HOC components, hooks, callables.
  for (const vs of sf.getVariableStatements()) {
    const exported = vs.isExported() ? 'export' : '-';
    const kind = vs.getDeclarationKind();
    for (const decl of vs.getDeclarations()) {
      const name = decl.getName();
      if (!name || !PASCAL_RE.test(name) && !HOOK_RE.test(name) && exported !== 'export') {
        // still capture exported non-callable consts as symbols below; skip noise otherwise
      }
      const line = decl.getStartLineNumber();
      const init = decl.getInitializer();
      const initText = init ? init.getText().slice(0, 120) : '';
      const vtype = typeOf(decl, 160);
      const callable = !!init && (/^\(|=>|^async|^function|^React\.(memo|forwardRef)|^(memo|forwardRef|observer)\(/.test(initText) || /\b(?:FC|FunctionComponent|MemoExoticComponent|ForwardRefExoticComponent|ComponentType)\b/.test(vtype));
      if (exported === 'export' || callable) {
        out.symbols.push(`${name}\t${kind}\t${exported}\t${vtype}\t${suffix}\t${line}`);
      }

      // Resolve the inner function for arrow/HOC forms.
      let innerFn = null;
      let form = null;
      if (init) {
        const k = init.getKindName();
        if (k === 'ArrowFunction' || k === 'FunctionExpression') {
          innerFn = init;
          form = 'arrow';
        } else if (k === 'CallExpression') {
          const callee = safe(() => init.getExpression().getText()) || '';
          if (/(?:^|\.)forwardRef$/.test(callee)) {
            form = 'forwardRef';
          } else if (/(?:^|\.)memo$/.test(callee)) {
            form = 'memo';
          } else if (/(?:^|\.)observer$/.test(callee)) {
            form = 'memo';
          }
          const arg0 = safe(() => init.getArguments()[0]);
          if (arg0 && /Function/.test(arg0.getKindName())) {
            innerFn = arg0;
          }
        }
      }
      if (!form && /\b(?:FC|FunctionComponent)\b/.test(vtype)) {
        form = 'fc';
      }

      if (HOOK_RE.test(name) && (innerFn || callable)) {
        const params = innerFn ? paramText(innerFn) : '';
        const ret = innerFn ? clean(safe(() => innerFn.getReturnType().getText(innerFn)), 120) : firstGeneric(vtype);
        out.hooks.push(`${name}\t${exported}\t${params}\t${ret}\t${suffix}\t${line}`);
        if (!/(?:memo|forwardRef)/.test(form || '')) {
          out.functions.push(`${name}\t${exported}\t${params}\t${ret}\t${suffix}\t${line}`);
        }
      } else if (PASCAL_RE.test(name) && form && (isTsx || form === 'memo' || form === 'forwardRef' || form === 'fc' || (innerFn && returnsJSX(innerFn)))) {
        const p0 = innerFn ? safe(() => innerFn.getParameters()[0]) : null;
        let propsText = p0 ? clean(safe(() => p0.getType().getText(p0)), 80) : firstGeneric(vtype);
        out.components.push(`${name}\t${form}\t${exported}\t${propsText}\t${jsdocOf(decl)}\t${suffix}\t${line}`);
        p0 && pushProps(name, safe(() => p0.getType()), p0, { suffix, line });
      } else if (innerFn && !PASCAL_RE.test(name) && !/(?:memo|forwardRef)/.test(form || '')) {
        // plain callable const -> functions.tsv
        out.functions.push(`${name}\t${exported}\t${paramText(innerFn)}\t${clean(safe(() => innerFn.getReturnType().getText(innerFn)), 120)}\t${suffix}\t${line}`);
      }
    }
  }

  // Classes.
  for (const cls of sf.getClasses()) {
    const name = cls.getName();
    if (!name) {
      continue;
    }
    const line = cls.getStartLineNumber();
    const exported = cls.isExported() ? 'export' : '-';
    const extNode = cls.getExtends();
    const extText = extNode ? clean(extNode.getText(), 80) : '';
    const impls = cls.getImplements().map((i) => clean(i.getText(), 60)).join(' ');
    out.classes.push(`${name}\t${extText}\t${impls}\t${exported}\t${suffix}\t${line}`);
    out.symbols.push(`${name}\tclass\t${exported}\t${extText}\t${suffix}\t${line}`);
    if (/(?:React\.)?(?:Pure)?Component\b/.test(extText)) {
      const propsText = extNode ? firstGeneric(extNode.getText()) : '';
      out.components.push(`${name}\tclass\t${exported}\t${propsText}\t${jsdocOf(cls)}\t${suffix}\t${line}`);
      const ta = safe(() => extNode.getTypeArguments()[0]);
      ta && pushProps(name, safe(() => ta.getType()), ta, { suffix, line });
    }
    for (const ctor of cls.getConstructors()) {
      out.methods.push(`${name}\tconstructor\t\t${paramText(ctor)}\t\t${suffix}\t${ctor.getStartLineNumber()}`);
    }
    for (const mth of cls.getMethods()) {
      const mods = mth.getModifiers().map((m) => m.getText()).join(' ');
      const ret = clean(safe(() => mth.getReturnType().getText(mth)), 100);
      out.methods.push(`${name}\t${mth.getName()}\t${mods}\t${paramText(mth)}\t${ret}\t${suffix}\t${mth.getStartLineNumber()}`);
    }
    for (const p of cls.getProperties()) {
      const opt = p.hasQuestionToken() ? '?' : '';
      out.fields.push(`${name}\t${p.getName()}\t${opt}\t${typeOf(p, 120)}\t${jsdocOf(p)}\t${suffix}\t${p.getStartLineNumber()}`);
    }
  }

  // Interfaces.
  for (const itf of sf.getInterfaces()) {
    const name = itf.getName();
    const line = itf.getStartLineNumber();
    const exported = itf.isExported() ? 'export' : '-';
    out.symbols.push(`${name}\tinterface\t${exported}\t\t${suffix}\t${line}`);
    for (const p of itf.getProperties()) {
      const opt = p.hasQuestionToken() ? '?' : '';
      out.fields.push(`${name}\t${p.getName()}\t${opt}\t${typeOf(p, 120)}\t${jsdocOf(p)}\t${suffix}\t${p.getStartLineNumber()}`);
    }
    for (const m of itf.getMethods()) {
      const ret = clean(safe(() => m.getReturnType().getText(m)), 100);
      out.methods.push(`${name}\t${m.getName()}\t\t${paramText(m)}\t${ret}\t${suffix}\t${m.getStartLineNumber()}`);
    }
  }

  // Type aliases + enums (symbols only).
  for (const ta of sf.getTypeAliases()) {
    out.symbols.push(`${ta.getName()}\ttype\t${ta.isExported() ? 'export' : '-'}\t${typeOf(ta)}\t${suffix}\t${ta.getStartLineNumber()}`);
  }
  for (const en of sf.getEnums()) {
    out.symbols.push(`${en.getName()}\tenum\t${en.isExported() ? 'export' : '-'}\t\t${suffix}\t${en.getStartLineNumber()}`);
  }

  // Imports (aggregated per module) with the RESOLVED target file.
  const byMod = new Map();
  for (const imp of sf.getImportDeclarations()) {
    const mod = imp.getModuleSpecifierValue();
    if (isBinaryModule(mod) || isLocaleModule(mod)) {
      continue;
    }
    const resolved = safe(() => imp.getModuleSpecifierSourceFile());
    const target = resolved ? relOf(resolved) : '';
    const typePrefix = imp.isTypeOnly() ? 'type-' : '';
    const add = (kind, nm) => {
      const key = `${mod}\t${typePrefix}${kind}\t${target}`;
      if (!byMod.has(key)) {
        byMod.set(key, new Set());
      }
      byMod.get(key).add(nm);
    };
    const def = imp.getDefaultImport();
    def && add('default', def.getText());
    const ns = imp.getNamespaceImport();
    ns && add('namespace', ns.getText());
    for (const ni of imp.getNamedImports()) {
      add('named', ni.getAliasNode()?.getText() || ni.getName());
    }
    if (!def && !ns && imp.getNamedImports().length === 0) {
      add('side-effect', '-');
    }
  }
  for (const [key, set] of byMod) {
    const [mod, kind, target] = key.split('\t');
    out.imports.push(`${mod}\t${Array.from(set).sort().join(',')}\t${kind}\t${suffix}\t${target}`);
  }

  // Module usage (package imports) reverse index.
  const pkgMods = new Set();
  for (const key of byMod.keys()) {
    const mod = key.split('\t')[0];
    if (!mod.startsWith('.')) {
      pkgMods.add(mod);
    }
  }
  for (const mod of pkgMods) {
    addUsage(out.moduleUsage, mod, `${group}/${widget}`);
  }

  // JSX usage (.tsx only): real JSX elements resolved by the parser (more accurate than the regex guess).
  if (isTsx) {
    const tags = new Set();
    for (const el of sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)) {
      tags.add(el.getTagNameNode().getText());
    }
    for (const el of sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)) {
      tags.add(el.getTagNameNode().getText());
    }
    for (const tag of tags) {
      if (/[A-Z]/.test(tag) || tag.includes('-')) {
        addUsage(out.jsxUsage, tag, `${group}/${widget}`);
      }
    }
  }

  // Re-exports.
  for (const ex of sf.getExportDeclarations()) {
    const mod = ex.getModuleSpecifierValue();
    if (!mod || isBinaryModule(mod) || isLocaleModule(mod)) {
      continue;
    }
    const line = ex.getStartLineNumber();
    if (ex.isNamespaceExport()) {
      out.reexports.push(`*\tstar\t${mod}\t${suffix}\t${line}`);
    } else {
      for (const ne of ex.getNamedExports()) {
        out.reexports.push(`${ne.getAliasNode()?.getText() || ne.getName()}\tnamed\t${mod}\t${suffix}\t${line}`);
      }
    }
  }
}

async function writeTsv (file, header, rows) {
  rows.sort();
  await fs.writeFile(file, [header, ...rows].join('\n') + '\n', 'utf8');
}

// manifest.json lives outside the ts project (only .ts/.tsx are loaded), so walk the tree.
async function collectManifestRows () {
  const rows = [];
  const byWidget = new Map();
  const walk = async (abs) => {
    let entries;
    try {
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules') {
        continue;
      }
      const child = path.join(abs, e.name);
      if (e.isDirectory()) {
        await walk(child);
      } else if (e.name === 'manifest.json') {
        try {
          const rel = path.relative(ROOT, child).split(path.sep).join('/');
          const j = JSON.parse(await fs.readFile(child, 'utf8'));
          const { group, widget } = widgetOf(rel);
          const { row, catalogEntry } = manifestRow(j, group, widget, rel);
          rows.push(row);
          if (catalogEntry) {
            byWidget.set(`${group}/${widget}`, catalogEntry);
          }
        } catch {
          // ignore malformed manifest
        }
      }
    }
  };
  await walk(WIDGETS_ABS);
  return { rows, byWidget };
}

// Per-widget code counts derived from the extracted rows (group/widget columns).
function tallyCounts () {
  const counts = new Map();
  const bump = (wkey, field) => {
    let c = counts.get(wkey);
    if (!c) {
      c = { symbols: 0, components: 0, hooks: 0, classes: 0 };
      counts.set(wkey, c);
    }
    c[field]++;
  };
  const wkeyAt = (row, idx) => {
    const cells = row.split('\t');
    return `${cells[idx]}/${cells[idx + 1]}`;
  };
  for (const r of out.symbols) { bump(wkeyAt(r, 4), 'symbols'); }
  for (const r of out.components) { bump(wkeyAt(r, 5), 'components'); }
  for (const r of out.hooks) { bump(wkeyAt(r, 4), 'hooks'); }
  for (const r of out.classes) { bump(wkeyAt(r, 4), 'classes'); }
  return counts;
}

async function main () {
  const only = process.argv[2];
  const groups = (await fs.readdir(WIDGETS_ABS, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && (!only || e.name === only))
    .map((e) => e.name)
    .sort();

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Single project over all selected groups: pay the checker warmup once.
  const t0 = Date.now();
  const project = new Project({ tsConfigFilePath: TSCONFIG, skipAddingFilesFromTsConfig: true });
  const apiFiles = project.addSourceFilesAtPaths(apiCatalogGlobs());
  const globs = [];
  for (const group of groups) {
    globs.push(`${WIDGETS_GLOB}/${group}/**/*.ts`, `${WIDGETS_GLOB}/${group}/**/*.tsx`);
  }
  globs.push(`!${WIDGETS_GLOB}/**/{i18n,t9n,nls,translations}/**`, `!${WIDGETS_GLOB}/**/*.{i18n,t9n}.*`);
  const files = project.addSourceFilesAtPaths(globs);
  console.log(`  loaded ${files.length} files in ${((Date.now() - t0) / 1000).toFixed(1)}s, extracting...`);

  let totalFiles = 0;
  for (const sf of files) {
    const rel = relOf(sf);
    if (isLocale(rel)) {
      continue;
    }
    extractFile(sf);
    totalFiles++;
    if (totalFiles % 250 === 0) {
      const mb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log(`  ...${totalFiles} files, ${((Date.now() - t0) / 1000).toFixed(0)}s, heap=${mb}MB`);
    }
  }

  await writeTsv(path.join(OUT_DIR, 'symbols.tsv'), 'name\tkind\texported\ttype\tgroup\twidget\tpath\tline', out.symbols);
  await writeTsv(path.join(OUT_DIR, 'components.tsv'), 'name\tform\texported\tprops\tjsdoc\tgroup\twidget\tpath\tline', out.components);
  await writeTsv(path.join(OUT_DIR, 'components-props.tsv'), 'component\tprop\toptional\ttype\tjsdoc\tgroup\twidget\tpath\tline', out.componentsProps);
  await writeTsv(path.join(OUT_DIR, 'hooks.tsv'), 'name\texported\tparams\treturns\tgroup\twidget\tpath\tline', out.hooks);
  await writeTsv(path.join(OUT_DIR, 'functions.tsv'), 'name\texported\tparams\treturns\tgroup\twidget\tpath\tline', out.functions);
  await writeTsv(path.join(OUT_DIR, 'classes.tsv'), 'name\textends\timplements\texported\tgroup\twidget\tpath\tline', out.classes);
  await writeTsv(path.join(OUT_DIR, 'methods.tsv'), 'class\tmethod\tmodifiers\tparams\treturns\tgroup\twidget\tpath\tline', out.methods);
  await writeTsv(path.join(OUT_DIR, 'fields.tsv'), 'owner\tfield\toptional\ttype\tjsdoc\tgroup\twidget\tpath\tline', out.fields);
  await writeTsv(path.join(OUT_DIR, 'imports.tsv'), 'module\tnames\tkind\tgroup\twidget\tpath\tresolvedTarget', out.imports);
  await writeTsv(path.join(OUT_DIR, 'reexports.tsv'), 'exported\tkind\tfrom\tgroup\twidget\tpath\tline', out.reexports);

  const { rows: manifestRows, byWidget: manifestByWidget } = await collectManifestRows();
  await writeTsv(path.join(OUT_DIR, 'manifests.tsv'), 'group\twidget\tname\tlabel\tversion\texbVersion\tdependency\tpublishMessages\tmessageActions\tdataActions\tlayouts\tproperties\textensions\tpath', manifestRows);
  await writeTsv(path.join(OUT_DIR, 'module-usage.tsv'), 'module\tfiles\twidgets\twidget_names', usageRows(out.moduleUsage));
  await writeTsv(path.join(OUT_DIR, 'jsx-usage.tsv'), 'tag\tfiles\twidgets\twidget_names', usageRows(out.jsxUsage));
  await writeTsv(path.join(OUT_DIR, 'catalog.tsv'), 'group\twidget\tlabel\texbVersion\tdependencies\tcomponents\thooks\tclasses\tsymbols', catalogRows(tallyCounts(), manifestByWidget));

  await fs.writeFile(path.join(OUT_DIR, 'README.md'), `# dist-widgets type-accurate index (ts-morph, generated)

Generated by codebase-context (\`src/build-ai-index-ts.mjs\`) on ${new Date().toISOString()}.
Do NOT hand-edit. Regenerate with \`npm run ai:index:rich\`.

Type-ACCURATE variant of \`../dist-widgets/\`, built with the real TypeScript checker
(ts-morph over the client tsconfig). Compared to the regex index it adds resolved
type text (\`type\`/\`returns\` columns), real component \`props\` (+ per-prop
\`components-props.tsv\` with jsdoc), resolved \`fields\` types, and the resolved
import target file (\`resolvedTarget\`). This folder exists to diff against the regex
\`dist-widgets/\` before switching over. Columns 1..N match the regex files; extra
resolved columns are appended.

It also emits the same capability/reverse indexes as the regex variant: \`catalog.tsv\`,
\`manifests.tsv\`, \`module-usage.tsv\`, and \`jsx-usage.tsv\` (the last built from real
JSX elements, so it is more accurate than the regex tag guess).
`, 'utf8');

  const apiStats = await buildCanonicalApiCatalog({
    root: ROOT,
    project,
    sourceFiles: eligibleApiSourceFiles(ROOT, apiFiles),
    outputDir: API_OUT_DIR,
    command: 'npm run ai:index:rich',
  });

  const t = out;
  console.log(`ts-index written to .ai-context/exb/dist-widgets-ts (${totalFiles} files)`);
  console.log(`  symbols=${t.symbols.length} components=${t.components.length} props=${t.componentsProps.length} hooks=${t.hooks.length} functions=${t.functions.length} classes=${t.classes.length} methods=${t.methods.length} fields=${t.fields.length} imports=${t.imports.length}`);
  console.log(`  manifests=${manifestRows.length} module-usage=${out.moduleUsage.size} jsx-usage=${out.jsxUsage.size}`);
  console.log(`api catalog written to .ai-context/exb/api (${apiStats.files} files, ${apiStats.entrypoints} entrypoints)`);
  console.log(`  symbols=${apiStats.symbols} declarations=${apiStats.declarations} exports=${apiStats.exports} relations=${apiStats.relations} docsOnly=${apiStats.docsOnly} storybookOnly=${apiStats.storybookOnly}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
