/* eslint-disable */
// @ts-nocheck
// Builds compiler-resolved and import-scoped fallback usages for cataloged Jimu APIs.

import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { apiCatalogGlobs } from './build-ai-api-catalog.mjs';

import { PROJECT_ROOT } from './lib/project-root.mjs';

const ROOT = PROJECT_ROOT;
const CLIENT_ROOT = path.join(ROOT, 'ArcGISExperienceBuilder', 'client');
const TSCONFIG = path.join(CLIENT_ROOT, 'tsconfig.json');
const INDEX_ROOT = path.join(ROOT, '.ai-context', 'exb');
const API_DIR = path.join(INDEX_ROOT, 'api');
const OUT_DIR = path.join(INDEX_ROOT, 'api-usage');
const FAST_OUT_DIR = path.join(INDEX_ROOT, 'api-usage-fast');
const REPORT_DIR = path.join(INDEX_ROOT, 'reports');
const MAX_TSV_BYTES = 10 * 1024 * 1024;
const TYPE_LIMIT = 240;
const LOCALE_RE = /(?:^|\/)(?:i18n|t9n|nls|translations?|locales?)(?:\/|$)|\.(?:i18n|t9n)\b/i;
const EXCLUDED_RE = /(?:^|\/)(?:node_modules|chunks?)(?:\/|$)|\.min\.(?:js|jsx)$|\.bundle\.(?:js|jsx)$/i;
const BINARY_EXT = new Set([
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.cur', '.tif', '.tiff',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.flac',
  '.zip', '.gz', '.tgz', '.7z', '.rar', '.bz2', '.xz', '.pdf', '.wasm', '.bin', '.map',
]);

const USAGE_HEADER = [
  'api_id', 'name', 'usage_kind', 'source_root', 'source_kind', 'owner', 'framework_area', 'path',
  'start_line', 'start_column', 'end_line', 'end_column', 'containing_symbol', 'receiver_api_id',
  'receiver_type', 'receiver_type_truncated', 'component_api_id', 'imported_as', 'module_path',
  'resolved_overload_index',
];

function normalizePath (value) {
  return value.replace(/\\/g, '/');
}

function clean (value, limit = TYPE_LIMIT) {
  const normalized = String(value ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length > limit ? normalized.slice(0, limit) : normalized;
}

function safe (callback, fallback = '') {
  try {
    return callback();
  } catch {
    return fallback;
  }
}

function repoRelative (filePath) {
  return normalizePath(path.relative(ROOT, filePath));
}

function parseTsv (content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split('\t') ?? [];
  return lines.map((line) => Object.fromEntries(line.split('\t').map((value, index) => [header[index], value ?? ''])));
}

async function readTsv (filePath) {
  return parseTsv(await fs.readFile(filePath, 'utf8'));
}

function sourceContext (relative) {
  let match = /^ArcGISExperienceBuilder\/client\/dist\/widgets\/([^/]+)\/([^/]+)/.exec(relative);
  if (match) return { sourceRoot: 'ootb-widget', sourceKind: 'ootb-widget', owner: `${match[1]}/${match[2]}` };
  match = /^ArcGISExperienceBuilder\/sdk-resources\/widgets\/(.+?)(?:\/src\/|\/tests?\/|\/manifest\.json|$)/.exec(relative);
  if (match) return { sourceRoot: 'sdk-sample', sourceKind: 'sdk-sample', owner: match[1] };
  match = /^ArcGISExperienceBuilder\/client\/(jimu-[^/]+)\/(.*)$/.exec(relative);
  if (match) {
    const isTest = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.test\.[jt]sx?$|\.spec\.[jt]sx?$/i.test(match[2]);
    return {
      sourceRoot: isTest ? 'framework-test' : 'framework-internal',
      sourceKind: isTest ? 'framework-test' : 'framework-internal',
      owner: match[1],
    };
  }
  return { sourceRoot: 'unknown', sourceKind: 'unknown', owner: '' };
}

function frameworkArea (relative) {
  if (/(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\.[jt]sx?$/i.test(relative)) return 'test';
  if (/(?:^|\/)message-actions?(?:\/|$)/i.test(relative)) return 'message-action';
  if (/(?:^|\/)data-actions?(?:\/|$)/i.test(relative)) return 'data-action';
  if (/(?:^|\/)setting(?:\/|$)/i.test(relative)) return 'setting';
  if (/(?:^|\/)runtime(?:\/|$)/i.test(relative)) return 'runtime';
  if (/(?:^|\/)(?:config|manifest|version-manager)(?:\.|\/|$)/i.test(relative)) return 'config';
  if (/(?:^|\/)(?:shared|common|utils?|lib)(?:\/|$)/i.test(relative)) return 'shared';
  return 'unknown';
}

function isEligibleUsageFile (sourceFile, pilotGroup, allSourcePaths) {
  const relative = repoRelative(sourceFile.getFilePath());
  if (!/\.(?:ts|tsx|js|jsx)$/.test(relative) || relative.endsWith('.d.ts') || LOCALE_RE.test(relative) || EXCLUDED_RE.test(relative)) return false;
  if (relative.includes('/client/jimu-icons/')) return false;
  if (relative.includes('/client/dist/widgets/')) {
    if (/\.jsx?$/.test(relative)) return false;
    if (!pilotGroup) return true;
    return relative.includes(`/client/dist/widgets/${pilotGroup}/`);
  }
  if (pilotGroup) return false;
  if (relative.includes('/sdk-resources/')) {
    if (/\/(?:assets?|dist|lib)\//i.test(relative) && /\.jsx?$/.test(relative)) return false;
    if (/\.jsx?$/.test(relative)) {
      const stem = relative.replace(/\.jsx?$/, '');
      if (allSourcePaths.has(`${stem}.ts`) || allSourcePaths.has(`${stem}.tsx`)) return false;
    }
    return true;
  }
  if (/\/client\/jimu-[^/]+\//.test(relative)) return /\.tsx?$/.test(relative);
  if (/\.jsx?$/.test(relative)) {
    const stem = relative.replace(/\.jsx?$/, '');
    if (allSourcePaths.has(`${stem}.ts`) || allSourcePaths.has(`${stem}.tsx`)) return false;
  }
  return false;
}

function declarationLocator (node) {
  const sourceFile = node.getSourceFile();
  const start = sourceFile.getLineAndColumnAtPos(node.getStart());
  return `${repoRelative(sourceFile.getFilePath())}\0${start.line}\0${start.column}`;
}

function positionOf (node) {
  const sourceFile = node.getSourceFile();
  const start = sourceFile.getLineAndColumnAtPos(node.getStart());
  const end = sourceFile.getLineAndColumnAtPos(node.getEnd());
  return { startLine: start.line, startColumn: start.column, endLine: end.line, endColumn: end.column };
}

function isDefinitionName (identifier) {
  const parent = identifier.getParent();
  if (!parent) return false;
  if (Node.isImportSpecifier(parent) || Node.isImportClause(parent) || Node.isNamespaceImport(parent) || Node.isExportSpecifier(parent)) return false;
  const nameNode = safe(() => parent.getNameNode(), null);
  return nameNode === identifier && /(?:Declaration|Signature|Parameter|BindingElement)$/.test(parent.getKindName());
}

function containingSymbol (node) {
  for (const ancestor of node.getAncestors()) {
    if (Node.isFunctionDeclaration(ancestor) || Node.isMethodDeclaration(ancestor) || Node.isClassDeclaration(ancestor) || Node.isInterfaceDeclaration(ancestor)) {
      return clean(safe(() => ancestor.getName(), ''), 160);
    }
    if (Node.isVariableDeclaration(ancestor)) return clean(ancestor.getName(), 160);
  }
  return '';
}

function importContext (sourceFile, exportsByModuleName) {
  const bindings = new Map();
  const unresolved = [];
  for (const declaration of sourceFile.getImportDeclarations()) {
    const modulePath = declaration.getModuleSpecifierValue();
    if (!/^jimu-(?!icons(?:\/|$))/.test(modulePath)) continue;
    for (const specifier of declaration.getNamedImports()) {
      const importedName = specifier.getName();
      const localName = specifier.getAliasNode()?.getText() || importedName;
      const apiId = exportsByModuleName.get(`${modulePath}\0${importedName}`) ?? '';
      bindings.set(localName, { apiId, importedName, importedAs: localName, modulePath, kind: 'named', node: specifier.getAliasNode() ?? specifier.getNameNode() });
      if (!apiId) unresolved.push({ candidateModule: modulePath, candidateName: importedName, syntaxKind: 'import', reason: 'no-catalog-export', node: specifier });
    }
    const defaultImport = declaration.getDefaultImport();
    if (defaultImport) {
      const localName = defaultImport.getText();
      const apiId = exportsByModuleName.get(`${modulePath}\0default`) ?? '';
      bindings.set(localName, { apiId, importedName: 'default', importedAs: localName, modulePath, kind: 'default', node: defaultImport });
      if (!apiId) unresolved.push({ candidateModule: modulePath, candidateName: 'default', syntaxKind: 'import', reason: 'no-catalog-export', node: defaultImport });
    }
    const namespaceImport = declaration.getNamespaceImport();
    if (namespaceImport) bindings.set(namespaceImport.getText(), { apiId: '', importedName: '*', importedAs: namespaceImport.getText(), modulePath, kind: 'namespace', node: namespaceImport });
  }
  return { bindings, unresolved };
}

function createResolver (declarationsByLocator) {
  const symbolCache = new Map();
  const resolveSymbol = (symbol, depth = 0) => {
    if (!symbol || depth > 3) return '';
    const compilerSymbol = safe(() => symbol.compilerSymbol, null);
    if (compilerSymbol && symbolCache.has(compilerSymbol)) return symbolCache.get(compilerSymbol);
    let apiId = '';
    const aliased = safe(() => symbol.getAliasedSymbol(), null);
    if (aliased && aliased !== symbol) apiId = resolveSymbol(aliased, depth + 1);
    if (!apiId) {
      for (const declaration of safe(() => symbol.getDeclarations(), []) ?? []) {
        apiId = declarationsByLocator.get(declarationLocator(declaration)) ?? '';
        if (apiId) break;
      }
    }
    compilerSymbol && symbolCache.set(compilerSymbol, apiId);
    return apiId;
  };
  const resolveNode = (node) => resolveSymbol(safe(() => node.getSymbol(), null));
  resolveNode.symbol = resolveSymbol;
  return resolveNode;
}

function isJsxAttributeName (identifier) {
  const parent = identifier.getParent();
  return !!parent && Node.isJsxAttribute(parent) && parent.getNameNode() === identifier;
}

// An attribute name's own symbol points at the JSX attribute, so resolve it as a property of the props type, like go-to-definition does.
// Fallback: emitted .d.ts files often inline the props as a type literal (for example connected components), so map `<X attr>` to `XProps#attr`.
function jsxAttributeApiId (identifier, checker, resolveNode, lookup) {
  const name = identifier.getText();
  const attributes = identifier.getParent().getParent();
  const propsType = safe(() => checker.getContextualType(attributes), null);
  const property = safe(() => propsType?.getProperty(name), null);
  const direct = property ? resolveNode.symbol(property) : '';
  if (direct)
    return direct;
  const component = lookup.symbolsById.get(componentApiId(identifier, resolveNode));
  for (const propsId of lookup.propsInterfacesByName.get(`${component?.name}Props`) ?? []) {
    const memberId = lookup.memberByParentName.get(`${propsId}\0${name}`);
    if (memberId)
      return memberId;
  }
  return '';
}

function componentApiId (node, resolveNode) {
  const opening = node.getFirstAncestor((ancestor) => Node.isJsxOpeningElement(ancestor) || Node.isJsxSelfClosingElement(ancestor));
  return opening ? resolveNode(opening.getTagNameNode()) : '';
}

function classifyUsage (identifier, record, symbolsById, resolveNode, memberByParentName) {
  const parent = identifier.getParent();
  if (!parent) return { apiId: record.api_id, usageKind: 'bare-reference', componentApiId: '' };
  if (Node.isImportSpecifier(parent) || Node.isImportClause(parent) || Node.isNamespaceImport(parent)) return { apiId: record.api_id, usageKind: 'import', componentApiId: '' };
  if (Node.isExportSpecifier(parent)) return { apiId: record.api_id, usageKind: 'export', componentApiId: '' };
  if (Node.isJsxAttribute(parent)) return { apiId: record.api_id, usageKind: 'jsx-prop', componentApiId: componentApiId(identifier, resolveNode) };
  if (Node.isJsxOpeningElement(parent) || Node.isJsxSelfClosingElement(parent) || Node.isJsxClosingElement(parent)) return { apiId: record.api_id, usageKind: 'jsx-component', componentApiId: record.api_id };
  if (Node.isNewExpression(parent) && parent.getExpression() === identifier) {
    const constructorId = memberByParentName.get(`${record.api_id}\0constructor`);
    return { apiId: constructorId ?? record.api_id, usageKind: 'constructor-call', componentApiId: '' };
  }

  const access = Node.isPropertyAccessExpression(parent) && parent.getNameNode() === identifier ? parent : null;
  const call = access && Node.isCallExpression(access.getParent()) && access.getParent().getExpression() === access
    ? access.getParent()
    : Node.isCallExpression(parent) && parent.getExpression() === identifier ? parent : null;
  if (call) {
    if (record.kind === 'hook') return { apiId: record.api_id, usageKind: 'hook-call', componentApiId: '' };
    if (record.parent_api_id) return { apiId: record.api_id, usageKind: record.static === 'true' ? 'static-call' : 'instance-call', componentApiId: '' };
    return { apiId: record.api_id, usageKind: 'function-call', componentApiId: '' };
  }
  if (record.parent_api_id && symbolsById.get(record.parent_api_id)?.kind === 'enum') return { apiId: record.api_id, usageKind: 'enum-member', componentApiId: '' };
  if (identifier.getFirstAncestorByKind(SyntaxKind.Decorator)) return { apiId: record.api_id, usageKind: 'decorator', componentApiId: '' };
  if (identifier.getFirstAncestor((ancestor) => Node.isHeritageClause(ancestor))) {
    const heritage = identifier.getFirstAncestor((ancestor) => Node.isHeritageClause(ancestor));
    return { apiId: record.api_id, usageKind: heritage.getToken() === SyntaxKind.ImplementsKeyword ? 'implementation' : 'extension', componentApiId: '' };
  }
  if (identifier.getFirstAncestor((ancestor) => /Type(?:Reference|Query|Literal|Operator|Argument)|ExpressionWithTypeArguments/.test(ancestor.getKindName()))) {
    return { apiId: record.api_id, usageKind: 'type-reference', componentApiId: '' };
  }
  if (access) {
    const accessParent = access.getParent();
    const write = Node.isBinaryExpression(accessParent) && accessParent.getLeft() === access || Node.isPrefixUnaryExpression(accessParent) || Node.isPostfixUnaryExpression(accessParent);
    return { apiId: record.api_id, usageKind: write ? 'property-write' : 'property-read', componentApiId: '' };
  }
  if (Node.isPropertyAccessExpression(parent) && parent.getExpression() === identifier) {
    return { apiId: record.api_id, usageKind: 'property-read', componentApiId: '' };
  }
  return { apiId: record.api_id, usageKind: 'bare-reference', componentApiId: '' };
}

function receiverFields (identifier, record, resolveNode) {
  if (!record.parent_api_id) return { receiverApiId: '', receiverType: '', receiverTypeTruncated: false };
  const access = identifier.getFirstAncestor((ancestor) => Node.isPropertyAccessExpression(ancestor) && ancestor.getNameNode() === identifier);
  if (!access) return { receiverApiId: record.parent_api_id, receiverType: '', receiverTypeTruncated: false };
  const expression = access.getExpression();
  const fullType = clean(safe(() => expression.getType().getText(expression), ''), 10000);
  return {
    receiverApiId: resolveNode(expression) || record.parent_api_id,
    receiverType: clean(fullType, TYPE_LIMIT),
    receiverTypeTruncated: fullType.length > TYPE_LIMIT,
  };
}

function usageRow ({ apiId, usageKind, identifier, record, context, area, importBinding, receiver, componentId }) {
  const position = positionOf(identifier);
  return [
    apiId,
    record.name,
    usageKind,
    context.sourceRoot,
    context.sourceKind,
    context.owner,
    area,
    repoRelative(identifier.getSourceFile().getFilePath()),
    position.startLine,
    position.startColumn,
    position.endLine,
    position.endColumn,
    containingSymbol(identifier),
    receiver.receiverApiId,
    receiver.receiverType,
    String(receiver.receiverTypeTruncated),
    componentId,
    importBinding?.importedAs ?? '',
    importBinding?.modulePath ?? record.module_path,
    '',
  ];
}

function fastUsages (sourceFile, bindings, symbolsById, memberByParentName, context, area) {
  const rows = [];
  for (const identifier of sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)) {
    if (isDefinitionName(identifier) || isJsxAttributeName(identifier)) continue;
    const binding = bindings.get(identifier.getText());
    if (!binding?.apiId) continue;
    let apiId = binding.apiId;
    let semanticNode = identifier;
    const parent = identifier.getParent();
    if (Node.isPropertyAccessExpression(parent) && parent.getExpression() === identifier) {
      const memberId = memberByParentName.get(`${apiId}\0${parent.getName()}`);
      if (memberId) {
        apiId = memberId;
        semanticNode = parent.getNameNode();
      }
    }
    const record = symbolsById.get(apiId);
    if (!record) continue;
    const classified = classifyUsage(semanticNode, record, symbolsById, () => '', memberByParentName);
    rows.push(usageRow({
      apiId: classified.apiId,
      usageKind: classified.usageKind,
      identifier: semanticNode,
      record: symbolsById.get(classified.apiId) ?? record,
      context,
      area,
      importBinding: binding,
      receiver: { receiverApiId: record.parent_api_id, receiverType: '', receiverTypeTruncated: false },
      componentId: classified.componentApiId,
    }));
  }
  return rows;
}

async function writeTsv (filePath, header, rows) {
  rows.sort((left, right) => left.join('\t').localeCompare(right.join('\t')));
  await fs.writeFile(filePath, `${header.join('\t')}\n${rows.map((row) => row.map((value) => clean(value, Infinity)).join('\t')).join('\n')}\n`, 'utf8');
}

async function writePackageTables (outputDir, rows, symbolsById) {
  const byPackage = new Map();
  for (const row of rows) {
    const packageName = symbolsById.get(row[0])?.package ?? row[0].split(/[@/:]/)[0] ?? 'unknown';
    const packageRows = byPackage.get(packageName) ?? [];
    packageRows.push(row);
    byPackage.set(packageName, packageRows);
  }
  const sizes = [];
  for (const [packageName, packageRows] of [...byPackage].sort(([left], [right]) => left.localeCompare(right))) {
    const estimatedBytes = Buffer.byteLength(packageRows.map((row) => row.join('\t')).join('\n'));
    const chunks = estimatedBytes > MAX_TSV_BYTES ? Math.ceil(estimatedBytes / MAX_TSV_BYTES) : 1;
    const chunkSize = Math.ceil(packageRows.length / chunks);
    for (let index = 0; index < chunks; index++) {
      const suffix = chunks > 1 ? `-${String(index + 1).padStart(2, '0')}` : '';
      const fileName = `${packageName}${suffix}.tsv`;
      const chunkRows = packageRows.slice(index * chunkSize, (index + 1) * chunkSize);
      await writeTsv(path.join(outputDir, fileName), USAGE_HEADER, chunkRows);
      sizes.push([fileName, chunkRows.length, (await fs.stat(path.join(outputDir, fileName))).size]);
    }
  }
  return sizes;
}

function summaryRows (rows) {
  const byApi = new Map();
  const bindingKinds = new Set(['import', 'export', 'alias']);
  for (const row of rows) {
    const item = byApi.get(row[0]) ?? { behavioral: 0, binding: 0, files: new Set(), owners: new Set(), sdk: 0, ootb: 0, test: 0, ownerCounts: new Map() };
    if (bindingKinds.has(row[2])) item.binding++;
    else item.behavioral++;
    item.files.add(row[7]);
    item.owners.add(row[5]);
    if (row[4] === 'sdk-sample') item.sdk++;
    if (row[4] === 'ootb-widget') item.ootb++;
    if (row[4] === 'framework-test') item.test++;
    item.ownerCounts.set(row[5], (item.ownerCounts.get(row[5]) ?? 0) + 1);
    byApi.set(row[0], item);
  }
  return [...byApi].map(([apiId, item]) => [
    apiId,
    item.behavioral,
    item.binding,
    item.files.size,
    item.owners.size,
    item.sdk,
    item.ootb,
    item.test,
    [...item.ownerCounts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 5).map(([owner, count]) => `${owner}:${count}`).join(','),
  ]);
}

function unresolvedRows (unresolved, context, relative) {
  return unresolved.map((item) => {
    const position = positionOf(item.node);
    return [item.candidateModule, item.candidateName, item.syntaxKind, item.reason, context.sourceRoot, context.owner, relative, position.startLine, position.startColumn];
  });
}

function exclusionReason (relative) {
  if (relative.includes('/jimu-icons/')) return 'jimu-icons';
  if (LOCALE_RE.test(relative)) return 'localization';
  if (/(?:^|\/)chunks?(?:\/|$)/i.test(relative)) return 'chunk';
  if (relative.includes('/client/dist/widgets/') && /\.jsx?$/.test(relative)) return 'compiled-bundle';
  if (relative.includes('/sdk-resources/') && /\/(?:assets?|dist|lib)\//i.test(relative) && /\.jsx?$/.test(relative)) return 'third-party-library';
  if (/\/client\/jimu-[^/]+\//.test(relative) && /\.jsx?$/.test(relative)) return 'compiled-bundle';
  if (/\.min\.(?:js|jsx|css)$|\.bundle\.(?:js|jsx)$/i.test(relative)) return 'compiled-bundle';
  if (BINARY_EXT.has(path.extname(relative).toLowerCase())) return 'binary-asset';
  if (!/\.(?:ts|tsx|js|jsx)$/.test(relative)) return 'non-code';
  if (relative.endsWith('.d.ts')) return 'declaration-not-usage';
  return '';
}

async function walkAuditFiles (dir, rows, excludedCounts, parsedPaths, pilotGroup) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 1;
  }
  let errors = 0;
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      errors += await walkAuditFiles(absolute, rows, excludedCounts, parsedPaths, pilotGroup);
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = repoRelative(absolute);
    if (pilotGroup && relative.includes('/client/dist/widgets/') && !relative.includes(`/client/dist/widgets/${pilotGroup}/`)) continue;
    const reason = exclusionReason(relative);
    const context = sourceContext(relative);
    if (reason) {
      const key = `${context.sourceRoot}\0${context.owner}\0${reason}`;
      excludedCounts.set(key, (excludedCounts.get(key) ?? 0) + 1);
      continue;
    }
    let stat;
    try {
      stat = await fs.stat(absolute);
    } catch {
      errors++;
      continue;
    }
    let lines = '';
    let sha256 = '';
    try {
      const content = await fs.readFile(absolute);
      lines = content.length ? content.toString('utf8').split(/\r?\n/).length : 0;
      sha256 = createHash('sha256').update(content).digest('hex');
    } catch {
      errors++;
    }
    rows.push([relative, `${context.sourceRoot}:${context.owner}`, path.extname(relative).slice(1), stat.size, lines, sha256, 'false', '', String(parsedPaths.has(relative))]);
  }
  return errors;
}

async function buildAuditLedger (files, canonicalRows, unresolved, pilotGroup) {
  const parsedPaths = new Set(files.map((sourceFile) => repoRelative(sourceFile.getFilePath())));
  const ledgerRows = [];
  const excludedCounts = new Map();
  const roots = pilotGroup
    ? [path.join(CLIENT_ROOT, 'dist', 'widgets', pilotGroup)]
    : [path.join(CLIENT_ROOT, 'dist', 'widgets'), path.join(ROOT, 'ArcGISExperienceBuilder', 'sdk-resources')];
  const jimuEntries = await fs.readdir(CLIENT_ROOT, { withFileTypes: true });
  roots.push(...jimuEntries.filter((entry) => entry.isDirectory() && entry.name.startsWith('jimu-')).map((entry) => path.join(CLIENT_ROOT, entry.name)));
  let errors = 0;
  for (const auditRoot of roots) errors += await walkAuditFiles(auditRoot, ledgerRows, excludedCounts, parsedPaths, pilotGroup);

  const coverage = new Map();
  for (const row of ledgerRows) {
    const key = row[1];
    const item = coverage.get(key) ?? { seen: 0, parsed: 0, skipped: 0, usages: 0 };
    item.seen++;
    if (row[8] === 'true') item.parsed++;
    else item.skipped++;
    coverage.set(key, item);
  }
  for (const row of canonicalRows) {
    const key = `${row[3]}:${row[5]}`;
    const item = coverage.get(key) ?? { seen: 0, parsed: 0, skipped: 0, usages: 0 };
    item.usages++;
    coverage.set(key, item);
  }
  for (const [key, count] of excludedCounts) {
    const [sourceRoot, owner, reason] = key.split('\0');
    coverage.set(`${sourceRoot}:${owner}:excluded:${reason}`, { seen: count, parsed: 0, skipped: count, usages: 0 });
  }
  const [apiSymbols, apiDeclarations] = await Promise.all([
    readTsv(path.join(API_DIR, 'symbols.tsv')),
    readTsv(path.join(API_DIR, 'declarations.tsv')),
  ]);
  const docsRoutes = await readTsv(path.join(INDEX_ROOT, 'docs', 'routes.tsv')).catch(() => []);
  const coverageRows = [...coverage].map(([key, item]) => {
    const split = key.indexOf(':');
    return [key.slice(0, split), key.slice(split + 1), item.seen, item.parsed, item.skipped, '', item.usages, pilotGroup ? 'pilot' : 'complete', ''];
  });
  const catalogFiles = new Set(apiDeclarations.map((row) => row.path)).size;
  coverageRows.push(['api-catalog', 'jimu-framework', catalogFiles, catalogFiles, 0, apiSymbols.length, canonicalRows.length, pilotGroup ? 'pilot' : 'complete', '']);
  coverageRows.push(['documentation', 'local-export', docsRoutes.length, docsRoutes.filter((row) => row.exists === 'true').length, docsRoutes.filter((row) => row.exists !== 'true').length, '', '', docsRoutes.length ? 'complete' : 'missing', '']);
  coverageRows.push(['unresolved', 'static-candidates', unresolved.length, 0, unresolved.length, '', 0, unresolved.length ? 'complete-with-warnings' : 'complete', '']);
  errors && coverageRows.push(['audit', 'filesystem', ledgerRows.length, 0, 0, '', '', 'complete-with-warnings', errors]);
  return { ledgerRows, coverageRows };
}

async function main () {
  const pilotGroup = process.argv[2] ?? '';
  const startedAt = Date.now();
  const [symbolRows, declarationRows, exportRows] = await Promise.all([
    readTsv(path.join(API_DIR, 'symbols.tsv')),
    readTsv(path.join(API_DIR, 'declarations.tsv')),
    readTsv(path.join(API_DIR, 'exports.tsv')),
  ]);
  if (!symbolRows.length || !declarationRows.length || !exportRows.length) throw new Error('Canonical API catalog is missing or empty. Run npm run ai:index:rich first.');

  const symbolsById = new Map(symbolRows.map((row) => [row.api_id, row]));
  const declarationsByLocator = new Map(declarationRows.map((row) => [`${row.path}\0${row.start_line}\0${row.start_column}`, row.api_id]));
  const exportsByModuleName = new Map(exportRows.map((row) => [`${row.export_module}\0${row.export_name}`, row.api_id]));
  const memberByParentName = new Map(symbolRows.filter((row) => row.parent_api_id).map((row) => [`${row.parent_api_id}\0${row.member_name}`, row.api_id]));
  const propsInterfacesByName = new Map();
  for (const row of symbolRows) {
    !row.parent_api_id && row.name.endsWith('Props') && propsInterfacesByName.set(row.name, [...(propsInterfacesByName.get(row.name) ?? []), row.api_id]);
  }
  const jsxLookup = { symbolsById, memberByParentName, propsInterfacesByName };

  const project = new Project({ tsConfigFilePath: TSCONFIG, skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths(apiCatalogGlobs());
  const usageGlobs = pilotGroup
    ? [`ArcGISExperienceBuilder/client/dist/widgets/${pilotGroup}/**/*.ts`, `ArcGISExperienceBuilder/client/dist/widgets/${pilotGroup}/**/*.tsx`]
    : [
        'ArcGISExperienceBuilder/client/dist/widgets/**/*.{ts,tsx}',
        'ArcGISExperienceBuilder/sdk-resources/**/*.{ts,tsx,js,jsx}',
        'ArcGISExperienceBuilder/client/jimu-*/**/*.{ts,tsx}',
        '!ArcGISExperienceBuilder/client/jimu-icons/**',
      ];
  const added = project.addSourceFilesAtPaths([
    ...usageGlobs,
    '!**/{node_modules,chunks,chunk,i18n,t9n,nls,translations,locales}/**',
    '!**/*.{i18n,t9n}.*',
    '!**/*.min.{js,jsx}',
    '!**/*.bundle.{js,jsx}',
  ]);
  const allSourcePaths = new Set(project.getSourceFiles().map((sourceFile) => repoRelative(sourceFile.getFilePath())));
  const files = added.filter((sourceFile) => isEligibleUsageFile(sourceFile, pilotGroup, allSourcePaths));
  const resolveNode = createResolver(declarationsByLocator);
  const checker = project.getTypeChecker();
  console.log(`  usage project loaded ${project.getSourceFiles().length} files; scanning ${files.length}${pilotGroup ? ` (pilot=${pilotGroup})` : ''}...`);

  const canonicalRows = [];
  const fastRows = [];
  const unresolved = [];
  const canonicalKeys = new Set();
  const fastKeys = new Set();
  let identifierCount = 0;

  for (const sourceFile of files) {
    const relative = repoRelative(sourceFile.getFilePath());
    const context = sourceContext(relative);
    const area = frameworkArea(relative);
    const imports = importContext(sourceFile, exportsByModuleName);
    unresolved.push(...unresolvedRows(imports.unresolved, context, relative));

    for (const row of fastUsages(sourceFile, imports.bindings, symbolsById, memberByParentName, context, area)) {
      const key = `${row[0]}\0${row[7]}\0${row[8]}\0${row[9]}\0${row[2]}\0${row[16]}`;
      if (!fastKeys.has(key)) {
        fastKeys.add(key);
        fastRows.push(row);
      }
    }

    for (const identifier of sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)) {
      identifierCount++;
      if (isDefinitionName(identifier)) continue;
      const attributeName = isJsxAttributeName(identifier);
      let apiId = attributeName ? jsxAttributeApiId(identifier, checker, resolveNode, jsxLookup) : resolveNode(identifier);
      const binding = attributeName ? undefined : imports.bindings.get(identifier.getText());
      apiId ||= binding?.apiId ?? '';
      if (!apiId) continue;

      const parent = identifier.getParent();
      if (Node.isPropertyAccessExpression(parent) && parent.getExpression() === identifier) {
        const childApiId = resolveNode(parent.getNameNode());
        if (childApiId) continue;
      }
      let record = symbolsById.get(apiId);
      if (!record) continue;
      const classified = classifyUsage(identifier, record, symbolsById, resolveNode, memberByParentName);
      apiId = classified.apiId;
      record = symbolsById.get(apiId) ?? record;
      const receiver = receiverFields(identifier, record, resolveNode);
      const row = usageRow({ apiId, usageKind: classified.usageKind, identifier, record, context, area, importBinding: binding, receiver, componentId: classified.componentApiId });
      const key = `${row[0]}\0${row[7]}\0${row[8]}\0${row[9]}\0${row[2]}\0${row[16]}`;
      if (!canonicalKeys.has(key)) {
        canonicalKeys.add(key);
        canonicalRows.push(row);
      }
    }

    for (const elementAccess of sourceFile.getDescendantsOfKind(SyntaxKind.ElementAccessExpression)) {
      const receiverApiId = resolveNode(elementAccess.getExpression());
      if (!receiverApiId) continue;
      const argument = elementAccess.getArgumentExpression();
      const propertyName = argument && Node.isStringLiteral(argument) ? argument.getLiteralText() : '';
      if (propertyName && memberByParentName.has(`${receiverApiId}\0${propertyName}`)) continue;
      const position = positionOf(elementAccess);
      unresolved.push([symbolsById.get(receiverApiId)?.module_path ?? '', propertyName || '*', 'element-access', propertyName ? 'unknown-literal-member' : 'dynamic-property', context.sourceRoot, context.owner, relative, position.startLine, position.startColumn]);
    }

    if ((canonicalRows.length + fastRows.length) % 5000 < 100) {
      const heapMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log(`  ...files=${canonicalRows.length ? files.indexOf(sourceFile) + 1 : 0}/${files.length} identifiers=${identifierCount} resolved=${canonicalRows.length} heap=${heapMb}MB`);
    }
  }

  await Promise.all([
    fs.rm(OUT_DIR, { recursive: true, force: true }),
    fs.rm(FAST_OUT_DIR, { recursive: true, force: true }),
  ]);
  await Promise.all([
    fs.mkdir(OUT_DIR, { recursive: true }),
    fs.mkdir(FAST_OUT_DIR, { recursive: true }),
    fs.mkdir(REPORT_DIR, { recursive: true }),
  ]);
  const [canonicalSizes, fastSizes] = await Promise.all([
    writePackageTables(OUT_DIR, canonicalRows, symbolsById),
    writePackageTables(FAST_OUT_DIR, fastRows, symbolsById),
  ]);
  await Promise.all([
    writeTsv(path.join(OUT_DIR, 'summary.tsv'), ['api_id', 'behavioral_usages', 'binding_usages', 'files', 'owners', 'sdk_usages', 'ootb_usages', 'test_usages', 'top_owners'], summaryRows(canonicalRows)),
    writeTsv(path.join(FAST_OUT_DIR, 'summary.tsv'), ['api_id', 'behavioral_usages', 'binding_usages', 'files', 'owners', 'sdk_usages', 'ootb_usages', 'test_usages', 'top_owners'], summaryRows(fastRows)),
    writeTsv(path.join(REPORT_DIR, 'unresolved-usages.tsv'), ['candidate_module', 'candidate_name', 'syntax_kind', 'reason', 'source_root', 'owner', 'path', 'line', 'column'], unresolved),
  ]);
  const unresolvedSummary = new Map();
  for (const row of unresolved) {
    const key = `${row[3]}\0${row[0]}\0${row[1]}`;
    unresolvedSummary.set(key, (unresolvedSummary.get(key) ?? 0) + 1);
  }
  await writeTsv(path.join(REPORT_DIR, 'unresolved-summary.tsv'), ['reason', 'candidate_module', 'candidate_name', 'occurrences'], [...unresolvedSummary].map(([key, count]) => {
    const [reason, modulePath, name] = key.split('\0');
    return [reason, modulePath, name, count];
  }));
  const audit = await buildAuditLedger(files, canonicalRows, unresolved, pilotGroup);
  await Promise.all([
    writeTsv(path.join(INDEX_ROOT, 'files.tsv'), ['path', 'area', 'kind', 'bytes', 'lines', 'sha256', 'excluded', 'exclusion_reason', 'parsed'], audit.ledgerRows),
    writeTsv(path.join(INDEX_ROOT, 'coverage.tsv'), ['source_root', 'owner', 'files_seen', 'files_parsed', 'files_skipped', 'symbols', 'usages', 'status', 'errors'], audit.coverageRows),
  ]);

  const elapsedMs = Date.now() - startedAt;
  const heapMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  console.log(`usage index: files=${files.length} identifiers=${identifierCount} canonical=${canonicalRows.length} fast=${fastRows.length} unresolved=${unresolved.length}`);
  console.log(`usage metrics: elapsedMs=${elapsedMs} heapMb=${heapMb} canonicalBytes=${canonicalSizes.reduce((sum, row) => sum + row[2], 0)} fastBytes=${fastSizes.reduce((sum, row) => sum + row[2], 0)}`);
  console.log(`coverage ledger: files=${audit.ledgerRows.length} groups=${audit.coverageRows.length}`);
  if (!canonicalRows.length) throw new Error('Usage build produced zero canonical rows.');
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});