/* eslint-disable */
// @ts-nocheck

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Node, SyntaxKind } from 'ts-morph';

import { VENDOR_DIR, VENDOR_RE } from './lib/vendor.mjs';

const PACKAGE_NAMES = [
  'jimu-arcgis',
  'jimu-core',
  'jimu-data-source',
  'jimu-for-builder',
  'jimu-for-test',
  'jimu-layouts',
  'jimu-theme',
  'jimu-ui',
];
const API_SCHEMA_VERSION = '1';
const EXCLUSION_POLICY_VERSION = '1';
const TYPE_LIMIT = 240;
const SKIP_PATH_RE = /(?:^|\/)(?:node_modules|tests?|__tests__|i18n|t9n|nls|translations?|locales?|chunks?)(?:\/|$)/i;
const SOURCE_EXT_RE = /(?:\.d)?\.tsx?$/;

function normalizePath (value) {
  return value.replace(/\\/g, '/');
}

function clean (value, limit = TYPE_LIMIT) {
  return String(value ?? '')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function safe (callback, fallback = '') {
  try {
    return callback();
  } catch {
    return fallback;
  }
}

function repoRelative (root, filePath) {
  return normalizePath(path.relative(root, filePath));
}

function packageInfo (root, sourceFile) {
  const relative = repoRelative(root, sourceFile.getFilePath());
  const match = new RegExp(`^${VENDOR_RE}/client/(jimu-[^/]+)/(.+)$`).exec(relative);
  if (match && PACKAGE_NAMES.includes(match[1])) {
    return { packageName: match[1], packageRelative: match[2], relative };
  }
  const typeMatch = new RegExp(`^${VENDOR_RE}/client/types/(arcgis-(?:js-api-adaptor|map-components)\\.d\\.ts)$`).exec(relative);
  if (typeMatch) {
    return { packageName: 'client-types', packageRelative: typeMatch[1], relative };
  }
  return null;
}

export function apiCatalogGlobs () {
  const globs = PACKAGE_NAMES.flatMap((packageName) => [
    `${VENDOR_DIR}/client/${packageName}/**/*.ts`,
    `${VENDOR_DIR}/client/${packageName}/**/*.tsx`,
  ]);
  globs.push(
    `${VENDOR_DIR}/client/types/arcgis-js-api-adaptor.d.ts`,
    `${VENDOR_DIR}/client/types/arcgis-map-components.d.ts`,
    `!${VENDOR_DIR}/client/jimu-icons/**`,
    `!${VENDOR_DIR}/client/jimu-*/**/{node_modules,test,tests,__tests__,i18n,t9n,nls,translations,locales,chunks,chunk}/**`,
    `!${VENDOR_DIR}/client/jimu-*/**/*.{i18n,t9n}.*`,
  );
  return globs;
}

export function eligibleApiSourceFiles (root, sourceFiles) {
  const seen = new Set();
  return sourceFiles.filter((sourceFile) => {
    const info = packageInfo(root, sourceFile);
    if (!info || info.packageName === 'jimu-icons' || SKIP_PATH_RE.test(info.relative)) return false;
    const key = normalizePath(sourceFile.getFilePath()).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return SOURCE_EXT_RE.test(info.relative);
  });
}

function isPublicEntrypoint (info) {
  if (info.packageName === 'client-types' || !info.packageRelative.endsWith('.d.ts')) return false;
  return !/(?:^|\/)(?:lib|src|support|base-classes|implementations|mixins)(?:\/|$)/.test(info.packageRelative);
}

function moduleForEntrypoint (info) {
  let relative = info.packageRelative.replace(/\.d\.ts$/, '');
  relative = relative.replace(/(?:^|\/)index$/, '');
  return relative ? `${info.packageName}/${relative}` : info.packageName;
}

function declarationName (node) {
  if (Node.isConstructorDeclaration(node)) return 'constructor';
  return clean(safe(() => node.getName(), ''), 160);
}

function nodeKey (node) {
  return `${normalizePath(node.getSourceFile().getFilePath())}\0${node.getStart()}\0${node.getKind()}`;
}

function logicalDeclarationKey (root, node, ownerName = '') {
  const info = packageInfo(root, node.getSourceFile());
  if (!info) return '';
  const stem = info.packageRelative.replace(/\.d\.ts$|\.tsx?$/g, '');
  return `${info.packageName}\0${stem}\0${ownerName}\0${declarationName(node)}`;
}

function getTopLevelDeclarations (sourceFile) {
  const declarations = [];
  declarations.push(
    ...sourceFile.getFunctions(),
    ...sourceFile.getClasses(),
    ...sourceFile.getInterfaces(),
    ...sourceFile.getTypeAliases(),
    ...sourceFile.getEnums(),
  );
  for (const statement of sourceFile.getVariableStatements()) {
    declarations.push(...statement.getDeclarations());
  }
  for (const statement of sourceFile.getStatements()) {
    if (Node.isModuleDeclaration(statement)) declarations.push(statement);
  }
  return declarations.filter((node) => declarationName(node));
}

function declarationKind (node) {
  const kindName = node.getKindName();
  const kinds = {
    ClassDeclaration: 'class',
    Constructor: 'ctor',
    ConstructorType: 'ctor',
    ConstructSignature: 'ctor',
    EnumDeclaration: 'enum',
    EnumMember: 'enum-member',
    FunctionDeclaration: 'function',
    GetAccessor: 'getter',
    InterfaceDeclaration: 'interface',
    MethodDeclaration: 'method',
    MethodSignature: 'interface-member',
    ModuleDeclaration: 'namespace',
    PropertyDeclaration: 'property',
    PropertySignature: 'interface-member',
    SetAccessor: 'setter',
    TypeAliasDeclaration: 'type',
    VariableDeclaration: 'variable',
    CallSignature: 'interface-member',
    IndexSignature: 'interface-member',
  };
  return kinds[kindName] ?? kindName.replace(/Declaration$|Signature$/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function memberDeclarations (owner) {
  if (Node.isEnumDeclaration(owner)) return owner.getMembers();
  if (Node.isClassDeclaration(owner) || Node.isInterfaceDeclaration(owner)) return owner.getMembers();
  return [];
}

function memberName (member) {
  const kind = member.getKindName();
  if (kind === 'Constructor') return 'constructor';
  if (kind === 'CallSignature') return '()';
  if (kind === 'ConstructSignature') return 'new';
  if (kind === 'IndexSignature') return '[]';
  return declarationName(member);
}

function isStaticMember (owner, member) {
  return Node.isEnumDeclaration(owner) || safe(() => member.isStatic(), false);
}

function accessibilityOf (member) {
  const scope = clean(safe(() => member.getScope(), ''), 20).toLowerCase();
  if (scope) return scope;
  if (safe(() => member.hasModifier(SyntaxKind.PrivateKeyword), false)) return 'private';
  if (safe(() => member.hasModifier(SyntaxKind.ProtectedKeyword), false)) return 'protected';
  return 'public';
}

function jsdocEvidence (node) {
  let deprecated = false;
  let deprecationMessage = '';
  let internal = false;
  for (const doc of safe(() => node.getJsDocs(), [])) {
    for (const tag of safe(() => doc.getTags(), [])) {
      const tagName = safe(() => tag.getTagName(), '').toLowerCase();
      if (tagName === 'deprecated') {
        deprecated = true;
        deprecationMessage ||= clean(safe(() => tag.getCommentText(), '') || safe(() => tag.getComment(), ''), 240);
      }
      if (tagName === 'internal') internal = true;
    }
  }
  return { deprecated, deprecationMessage, internal };
}

function tsvRows (content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => Object.fromEntries(line.split('\t').map((value, index) => [header[index], value ?? ''])));
}

async function readTsvOptional (filePath) {
  try {
    return tsvRows(await fs.readFile(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function canonicalExport (exports, docsIds, storybookIds) {
  return [...exports].sort((left, right) => {
    const leftId = `${left.exportModule}::${left.exportName}`;
    const rightId = `${right.exportModule}::${right.exportName}`;
    const score = (candidate, id) => (docsIds.has(id) ? 1000 : 0) + (storybookIds.has(id) ? 900 : 0) + (candidate.exportModule === candidate.packageName ? 100 : 0) - candidate.exportModule.length;
    return score(right, rightId) - score(left, leftId) || leftId.localeCompare(rightId);
  })[0];
}

function publicExportLine (entrypoint, exportName, declaration) {
  if (entrypoint === declaration.getSourceFile()) return declaration.getStartLineNumber();
  for (const exportDeclaration of entrypoint.getExportDeclarations()) {
    if (exportDeclaration.getNamedExports().some((named) => (named.getAliasNode()?.getText() || named.getName()) === exportName)) {
      return exportDeclaration.getStartLineNumber();
    }
  }
  return entrypoint.getExportDeclarations()[0]?.getStartLineNumber() ?? 1;
}

function positionOf (root, node) {
  const sourceFile = node.getSourceFile();
  const start = sourceFile.getLineAndColumnAtPos(node.getStart());
  const end = sourceFile.getLineAndColumnAtPos(node.getEnd());
  return {
    path: repoRelative(root, sourceFile.getFilePath()),
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

function targetApiId (node, apiIdByNode) {
  const type = safe(() => node.getType(), null);
  const symbol = type && (safe(() => type.getAliasSymbol(), null) || safe(() => type.getSymbol(), null));
  for (const declaration of safe(() => symbol?.getDeclarations(), []) ?? []) {
    const id = apiIdByNode.get(nodeKey(declaration));
    if (id) return id;
  }
  const symbolAtNode = safe(() => node.getSymbol(), null);
  for (const declaration of safe(() => symbolAtNode?.getDeclarations(), []) ?? []) {
    const id = apiIdByNode.get(nodeKey(declaration));
    if (id) return id;
  }
  return '';
}

function relationTargets (owner, members) {
  const rows = [];
  if (Node.isClassDeclaration(owner)) {
    const extension = owner.getExtends();
    extension && rows.push({ kind: 'extends', node: extension });
    owner.getImplements().forEach((node) => rows.push({ kind: 'implements', node }));
  } else if (Node.isInterfaceDeclaration(owner)) {
    owner.getExtends().forEach((node) => rows.push({ kind: 'extends', node }));
  } else if (Node.isTypeAliasDeclaration(owner)) {
    const typeNode = owner.getTypeNode();
    typeNode && rows.push({ kind: 'type-alias-target', node: typeNode });
  }
  for (const member of members) {
    const typeNode = safe(() => member.getReturnTypeNode(), null) || safe(() => member.getTypeNode(), null);
    typeNode && rows.push({ kind: 'member-type', node: typeNode, member });
  }
  return rows;
}

function physicalModule (info) {
  const stem = info.packageRelative.replace(/\.d\.ts$|\.tsx?$/g, '').replace(/\/index$/, '');
  return stem ? `${info.packageName}/${stem}` : info.packageName;
}

function localApiId (info, name) {
  const stem = info.packageRelative.replace(/\.d\.ts$|\.tsx?$/g, '');
  return `${info.packageName}@${stem}::${name}`;
}

function symbolVisibility (apiId, isPublic, accessibility, jsdoc, docsIds, storybookIds) {
  if (accessibility === 'private' || accessibility === 'protected') return 'implementation-private';
  if (jsdoc.internal) return 'internal-tagged';
  if (docsIds.has(apiId)) return 'public-documented';
  if (storybookIds.has(apiId)) return 'public-storybook';
  return isPublic ? 'public-declared-undocumented' : 'not-exported';
}

async function writeTsv (filePath, header, rows) {
  rows.sort((left, right) => left.join('\t').localeCompare(right.join('\t')));
  const content = `${header.join('\t')}\n${rows.map((row) => row.map((value) => clean(value, Infinity)).join('\t')).join('\n')}\n`;
  await fs.writeFile(filePath, content, 'utf8');
}

export async function buildCanonicalApiCatalog ({ root, project, sourceFiles, outputDir, command }) {
  const docsDir = path.join(root, '.ai-context', 'exb', 'docs');
  const [docRows, storyRows, exbVersionJson] = await Promise.all([
    readTsvOptional(path.join(docsDir, 'api-reference.tsv')),
    readTsvOptional(path.join(docsDir, 'storybook.tsv')),
    fs.readFile(path.join(root, VENDOR_DIR, 'version.json'), 'utf8').then(JSON.parse),
  ]);
  const docsIds = new Set(docRows.map((row) => row.api_id).filter(Boolean));
  const storybookIds = new Set(storyRows.map((row) => row.api_id).filter(Boolean));
  const files = eligibleApiSourceFiles(root, sourceFiles);
  const entrypoints = files.filter((sourceFile) => isPublicEntrypoint(packageInfo(root, sourceFile)));
  const exportsByNode = new Map();
  const publicByLogicalKey = new Map();

  for (const entrypoint of entrypoints) {
    const info = packageInfo(root, entrypoint);
    const exportModule = moduleForEntrypoint(info);
    for (const [exportName, declarations] of entrypoint.getExportedDeclarations()) {
      for (const declaration of declarations) {
        const exported = {
          packageName: info.packageName,
          exportModule,
          exportName,
          entrypoint,
          declaration,
        };
        const key = nodeKey(declaration);
        const list = exportsByNode.get(key) ?? [];
        list.push(exported);
        exportsByNode.set(key, list);
        const logicalKey = logicalDeclarationKey(root, declaration);
        if (logicalKey) {
          const logical = publicByLogicalKey.get(logicalKey) ?? [];
          logical.push(exported);
          publicByLogicalKey.set(logicalKey, logical);
        }
      }
    }
  }

  const symbolsById = new Map();
  const declarationsById = new Map();
  const apiIdByNode = new Map();
  const exportRowsById = new Map();
  const pendingRelations = [];

  const registerSymbol = (record, node) => {
    const existing = symbolsById.get(record.apiId);
    if (!existing || existing.visibility === 'not-exported' && record.visibility !== 'not-exported') symbolsById.set(record.apiId, record);
    const nodes = declarationsById.get(record.apiId) ?? [];
    if (!nodes.some((candidate) => nodeKey(candidate.node) === nodeKey(node))) nodes.push({ node, containingSymbol: record.parentName ?? '' });
    declarationsById.set(record.apiId, nodes);
    apiIdByNode.set(nodeKey(node), record.apiId);
  };

  for (const sourceFile of files) {
    const info = packageInfo(root, sourceFile);
    for (const declaration of getTopLevelDeclarations(sourceFile)) {
      const name = declarationName(declaration);
      const publicExports = exportsByNode.get(nodeKey(declaration)) ?? publicByLogicalKey.get(logicalDeclarationKey(root, declaration)) ?? [];
      const canonical = publicExports.length ? canonicalExport(publicExports, docsIds, storybookIds) : null;
      const apiId = canonical ? `${canonical.exportModule}::${canonical.exportName}` : localApiId(info, name);
      const jsdoc = jsdocEvidence(declaration);
      let kind = declarationKind(declaration);
      if (storybookIds.has(apiId)) kind = 'react-component';
      else if (/^use[A-Z0-9]/.test(name) && kind === 'function') kind = 'hook';
      registerSymbol({
        apiId,
        packageName: info.packageName,
        modulePath: canonical?.exportModule ?? physicalModule(info),
        name,
        kind,
        parentApiId: '',
        parentName: '',
        memberName: '',
        staticMember: false,
        optional: safe(() => declaration.hasQuestionToken(), false),
        accessibility: 'public',
        visibility: symbolVisibility(apiId, !!canonical, 'public', jsdoc, docsIds, storybookIds),
        matchStatus: docsIds.has(apiId) || storybookIds.has(apiId) ? 'matched' : 'declared-only',
        ...jsdoc,
      }, declaration);

      if (canonical) {
        const rows = exportRowsById.get(apiId) ?? [];
        for (const exported of publicExports) {
          rows.push({
            apiId,
            exportModule: exported.exportModule,
            exportName: exported.exportName,
            exportKind: exported.entrypoint === exported.declaration.getSourceFile() ? 'direct' : 're-export',
            canonical: exported.exportModule === canonical.exportModule && exported.exportName === canonical.exportName,
            sourcePath: repoRelative(root, exported.entrypoint.getFilePath()),
            sourceLine: publicExportLine(exported.entrypoint, exported.exportName, exported.declaration),
          });
        }
        exportRowsById.set(apiId, rows);
      }

      const members = memberDeclarations(declaration);
      for (const member of members) {
        const name = memberName(member);
        if (!name) continue;
        const staticMember = isStaticMember(declaration, member);
        const memberApiId = `${apiId}${staticMember ? '.' : '#'}${name}`;
        const accessibility = accessibilityOf(member);
        const memberJsdoc = jsdocEvidence(member);
        registerSymbol({
          apiId: memberApiId,
          packageName: info.packageName,
          modulePath: canonical?.exportModule ?? physicalModule(info),
          name,
          kind: declarationKind(member),
          parentApiId: apiId,
          parentName: declarationName(declaration),
          memberName: name,
          staticMember,
          optional: safe(() => member.hasQuestionToken(), false),
          accessibility,
          visibility: symbolVisibility(memberApiId, !!canonical, accessibility, memberJsdoc, docsIds, storybookIds),
          matchStatus: docsIds.has(memberApiId) ? 'matched' : 'declared-only',
          ...memberJsdoc,
        }, member);
      }
      pendingRelations.push({ fromApiId: apiId, owner: declaration, members });
    }
  }

  // Preserve public Jimu aliases even when they resolve into excluded third-party declarations.
  for (const publicExports of exportsByNode.values()) {
    const canonical = canonicalExport(publicExports, docsIds, storybookIds);
    const apiId = `${canonical.exportModule}::${canonical.exportName}`;
    const declaration = canonical.declaration;
    if (!symbolsById.has(apiId)) {
      const jsdoc = jsdocEvidence(declaration);
      symbolsById.set(apiId, {
        apiId,
        packageName: canonical.packageName,
        modulePath: canonical.exportModule,
        name: canonical.exportName,
        kind: declarationKind(declaration),
        parentApiId: '',
        memberName: '',
        staticMember: false,
        optional: false,
        accessibility: 'public',
        visibility: symbolVisibility(apiId, true, 'public', jsdoc, docsIds, storybookIds),
        matchStatus: docsIds.has(apiId) || storybookIds.has(apiId) ? 'matched' : 'declared-only',
        ...jsdoc,
      });
      const declarationInfo = packageInfo(root, declaration.getSourceFile());
      if (declarationInfo && files.includes(declaration.getSourceFile())) {
        const nodes = declarationsById.get(apiId) ?? [];
        nodes.push({ node: declaration, containingSymbol: '' });
        declarationsById.set(apiId, nodes);
        apiIdByNode.set(nodeKey(declaration), apiId);
      }
    }
    if (!exportRowsById.has(apiId)) {
      exportRowsById.set(apiId, publicExports.map((exported) => ({
        apiId,
        exportModule: exported.exportModule,
        exportName: exported.exportName,
        exportKind: exported.entrypoint === exported.declaration.getSourceFile() ? 'direct' : 're-export',
        canonical: exported.exportModule === canonical.exportModule && exported.exportName === canonical.exportName,
        sourcePath: repoRelative(root, exported.entrypoint.getFilePath()),
        sourceLine: publicExportLine(exported.entrypoint, exported.exportName, exported.declaration),
      })));
    }
  }

  for (const row of docRows) {
    if (!row.api_id || symbolsById.has(row.api_id)) continue;
    const parentApiId = row.member ? row.api_id.replace(/[.#][^.#]+$/, '') : '';
    symbolsById.set(row.api_id, {
      apiId: row.api_id,
      packageName: row.package,
      modulePath: row.package,
      name: row.member || row.symbol,
      kind: row.kind || 'unknown',
      parentApiId,
      memberName: row.member,
      staticMember: row.api_id.includes('.'),
      optional: false,
      accessibility: 'public',
      visibility: 'public-documented',
      matchStatus: 'docs-only',
      deprecated: false,
      deprecationMessage: '',
      internal: false,
    });
  }
  for (const row of storyRows) {
    if (!row.api_id || symbolsById.has(row.api_id)) continue;
    symbolsById.set(row.api_id, {
      apiId: row.api_id,
      packageName: row.entrypoint?.split('/')[0] ?? 'jimu-ui',
      modulePath: row.entrypoint,
      name: row.component,
      kind: 'react-component',
      parentApiId: '',
      memberName: '',
      staticMember: false,
      optional: false,
      accessibility: 'public',
      visibility: 'public-storybook',
      matchStatus: 'storybook-only',
      deprecated: false,
      deprecationMessage: '',
      internal: false,
    });
  }

  const declarationRows = [];
  for (const [apiId, records] of declarationsById) {
    records.sort((left, right) => nodeKey(left.node).localeCompare(nodeKey(right.node)));
    const overload = records.length > 1 && records.every((record) => ['function', 'method', 'interface-member', 'ctor'].includes(declarationKind(record.node)));
    records.forEach((record, index) => {
      const position = positionOf(root, record.node);
      declarationRows.push([
        apiId,
        overload ? index + 1 : '',
        !overload && records.length > 1 ? index + 1 : '',
        position.path,
        position.startLine,
        position.startColumn,
        position.endLine,
        position.endColumn,
        record.containingSymbol,
        declarationKind(record.node),
      ]);
    });
  }

  const relationRows = [];
  const relationKeys = new Set();
  for (const pending of pendingRelations) {
    for (const relation of relationTargets(pending.owner, pending.members)) {
      const fromApiId = relation.member ? apiIdByNode.get(nodeKey(relation.member)) : pending.fromApiId;
      const toApiId = targetApiId(relation.node, apiIdByNode);
      if (!fromApiId || !toApiId || fromApiId === toApiId) continue;
      const position = positionOf(root, relation.node);
      const key = `${fromApiId}\0${relation.kind}\0${toApiId}\0${position.path}\0${position.startLine}`;
      if (relationKeys.has(key)) continue;
      relationKeys.add(key);
      relationRows.push([fromApiId, relation.kind, toApiId, position.path, position.startLine, 'true']);
    }
  }

  const symbolRows = [...symbolsById.values()].map((record) => [
    record.apiId,
    record.packageName,
    record.modulePath,
    record.name,
    record.kind,
    record.parentApiId,
    record.memberName,
    String(record.staticMember),
    String(record.optional),
    record.accessibility,
    record.visibility,
    record.matchStatus,
    String(record.deprecated),
    record.deprecationMessage,
  ]);
  const exportRows = [];
  const exportKeys = new Set();
  for (const rows of exportRowsById.values()) {
    for (const row of rows) {
      const key = `${row.apiId}\0${row.exportModule}\0${row.exportName}`;
      if (exportKeys.has(key)) continue;
      exportKeys.add(key);
      exportRows.push([row.apiId, row.exportModule, row.exportName, row.exportKind, String(row.canonical), row.sourcePath, row.sourceLine]);
    }
  }

  const requiredIds = [
    'jimu-core::WidgetManager.getInstance',
    'jimu-core::DataSourceManager#getDataSource',
    'jimu-arcgis::JimuMapViewComponent',
    'jimu-ui/advanced/setting-components::JimuLayerViewSelectorDropdown',
    'jimu-ui/advanced/setting-components::SettingSection',
  ];
  for (const apiId of requiredIds) {
    if (!symbolsById.has(apiId)) throw new Error(`Canonical API catalog is missing known API: ${apiId}`);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeTsv(path.join(outputDir, 'symbols.tsv'), ['api_id', 'package', 'module_path', 'name', 'kind', 'parent_api_id', 'member_name', 'static', 'optional', 'accessibility', 'visibility', 'match_status', 'deprecated', 'deprecation_message'], symbolRows),
    writeTsv(path.join(outputDir, 'declarations.tsv'), ['api_id', 'overload_index', 'merge_index', 'path', 'start_line', 'start_column', 'end_line', 'end_column', 'containing_symbol', 'declaration_kind'], declarationRows),
    writeTsv(path.join(outputDir, 'exports.tsv'), ['api_id', 'export_module', 'export_name', 'export_kind', 'canonical', 'source_path', 'source_line'], exportRows),
    writeTsv(path.join(outputDir, 'relations.tsv'), ['from_api_id', 'relation_kind', 'to_api_id', 'path', 'line', 'resolved'], relationRows),
    writeTsv(path.join(outputDir, 'METADATA.tsv'), ['key', 'value'], [
      ['schema_version', API_SCHEMA_VERSION],
      ['exb_version', exbVersionJson.version ?? exbVersionJson.exbVersion ?? 'unknown'],
      ['docs_version', docRows[0]?.doc_version ?? 'not-generated'],
      ['storybook_version', storyRows[0]?.doc_version ?? 'not-generated'],
      ['generated_at', new Date().toISOString()],
      ['source_roots', `${VENDOR_DIR}/client/jimu-*;${VENDOR_DIR}/client/types`],
      ['exclusion_policy_version', EXCLUSION_POLICY_VERSION],
      ['command', command],
      ['status', 'complete'],
    ]),
  ]);

  return {
    files: files.length,
    entrypoints: entrypoints.length,
    symbols: symbolRows.length,
    declarations: declarationRows.length,
    exports: exportRows.length,
    relations: relationRows.length,
    docsOnly: symbolRows.filter((row) => row[11] === 'docs-only').length,
    storybookOnly: symbolRows.filter((row) => row[11] === 'storybook-only').length,
  };
}