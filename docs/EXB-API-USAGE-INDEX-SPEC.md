# ExB API Evidence Index

## Purpose

This index helps developers and coding agents locate authoritative ArcGIS Experience Builder evidence quickly. It does not duplicate vendor implementations, replace the TypeScript language service, or claim runtime-complete usage coverage.

`ArcGISExperienceBuilder/` is read-only input. Generated evidence lives under `.ai-context/exb/`.

## Evidence order

1. Local Jimu `.d.ts` declarations and verified public barrels define the installed API contract.
2. Local SDK samples show supported custom-widget patterns.
3. Readable OOTB widget source shows production patterns, including internal usage that may not be public.
4. Local Jimu implementation source explains behavior when declarations are insufficient.
5. Local API-reference, guide, sample, and Storybook metadata establish public intent and navigation.
6. Original source, declaration, or HTML files remain the final evidence.

## Stable identities

Public identities use verified import surfaces:

- Top-level: `jimu-core::WidgetManager`
- Instance member: `jimu-core::WidgetManager#getWidgetClass`
- Static or enum member: `jimu-core::WidgetManager.getInstance`
- Advanced component: `jimu-ui/advanced/setting-components::SettingSection`

Unexported declarations use deterministic package-relative IDs such as `jimu-core@lib/foo::helper`. Paths locate declarations but are not public identities. Overloads and merged declarations share one API ID and have separate declaration rows.

## Outputs

### Fast source indexes

`npm run ai:index` writes the existing grep-first framework and OOTB indexes:

- `symbols.tsv`, `reexports.tsv`, and `tree.<area>.txt`
- `dist-widgets/*.tsv`

### Documentation router

`npm run ai:index:docs` writes:

- `docs/routes.tsv`: guide, sample, API-reference, and container routes
- `docs/packages.tsv`: Esri's six documented package categories
- `docs/api-reference.tsv`: symbol and unique member-anchor locators
- `docs/sample-code-map.tsv`: documentation-to-SDK sample reconciliation
- `docs/storybook.tsv`: docs/story entries with barrel-verified component IDs

`flisting.htm` is route authority. Xrefs and HTML metadata enrich routes. Storybook extraction reads only `index.json` and `project.json`; it never parses generated bundles.

### Canonical API catalog

`npm run ai:index:rich` writes the existing `dist-widgets-ts/` tables and:

- `api/symbols.tsv`: identities, kinds, ownership, visibility, and match status
- `api/declarations.tsv`: overload/merge-aware source locators
- `api/exports.tsv`: verified public aliases and canonical import surface
- `api/relations.tsv`: resolved declaration relationships
- `api/METADATA.tsv`: schema, version, provenance, and status

Visibility is evidence-based. Documentation or Storybook presence proves public intent; absence does not prove an API is unsupported or internal.

### Usage graph

`npm run ai:index:usages` writes:

- `api-usage/<package>.tsv`: compiler-resolved static references
- `api-usage/summary.tsv`: behavioral/binding totals and owner diversity
- `api-usage-fast/<package>.tsv`: separate import-scoped fallback evidence
- `reports/unresolved-usages.tsv`: dynamic or unmatched occurrences
- `reports/unresolved-summary.tsv`: unresolved aggregates

The canonical pass scans identifiers once and resolves symbols to catalog declaration locators. It does not invoke `findReferences()` once per API. Definitions are excluded from usage totals. Leaf-most member references are emitted where the checker resolves them.

## Usage scope

Eligible code includes readable TypeScript/TSX, plus JS/JSX only where no TypeScript counterpart exists, under:

- OOTB `client/dist/widgets`
- `sdk-resources`
- in-scope `jimu-*` implementation and tests
- `jimu-for-test` source and examples

Project `src/**` is excluded from vendor precedent counts.

Source kinds are `sdk-sample`, `ootb-widget`, `framework-test`, and `framework-internal`. Framework area is derived from paths as `runtime`, `setting`, `message-action`, `data-action`, `config`, `shared`, `test`, or `unknown`.

## Exclusions

Every pass excludes:

- `jimu-icons`
- chunks and generated runtime bundles
- images, fonts, media, archives, WebAssembly, and other binaries
- source maps and minified files
- localization, i18n, t9n, nls, and translation trees
- generated Gatsby, Storybook, and Webpack assets

Excluded content never contributes symbols or resolved usage rows.

## Match and confidence

Catalog match status is `matched`, `declared-only`, `docs-only`, `storybook-only`, or `ambiguous`. Docs-only and Storybook-only records remain navigable but are not usage-resolvable until matched to a local declaration/export.

The canonical usage graph is compiler-resolved. The fast graph is lower-confidence fallback evidence and is never merged into canonical totals. Dynamic/computed and unresolved occurrences are retained only in reports.

## Completeness contract

The usage graph covers statically resolvable references to cataloged declarations in eligible, successfully parsed code files. It does not cover runtime reflection, dynamically computed modules/properties, excluded files, failed parses, configuration mentions, CSS, JSON, documentation prose, or behavior introduced after startup.

Never describe it as all runtime usages. Review unresolved and coverage records before making source-wide claims.

## Querying

Run:

```powershell
npm run ai:find -- DataSourceManager --members --usages 8
npm run ai:find -- SettingSection --area setting
npm run ai:find -- JimuMapViewComponent --source sdk-sample --json
npm run ai:find -- SourceManager --all
npm run ai:find -- "loading spinner" --semantic
npm run ai:find -- DataSourceStatus --brief
npm run ai:find -- DataSourceStatus.NotReady --in common/list --brief
```

The CLI ranks public documentation and Storybook first, then declarations and diverse SDK/OOTB evidence. It shows all visibility classes by default and labels them explicitly.

Retrieval aids:

- Fuzzy matching uses a Fuse.js Token Search index over the full canonical symbol set (per-word typo tolerance, TF-IDF ranking), plus a small deterministic abbreviation map for identifiers too far apart for edit distance alone (`Src`->`Source`, `Mgr`->`Manager`, `Cfg`->`Config`). Each result carries `matchConfidence`/`confidentMatch`; only confident (near-exact) matches gate the thin-evidence escalation, so a loose fuzzy neighbor's real usage evidence can never silently suppress escalation for an evidence-free literal target.
- `--all` lists every case-insensitive substring match, bypassing the ranked top-N cap.
- `--semantic` adds a conceptual tier: a curated concept map plus zero-dependency TF-IDF over local doc summaries. It never displaces exact or behavioral evidence, and it is off by default. Vector embeddings remain a deferred upgrade.
- `--brief` prints confident matches only, one line per fact (declaration, docs URL, skill, usage counts), and lists the remaining candidates on one line. It changes text output only; `--json` output is unchanged.
- `--in <scope>` lists every resolved usage inside a scope, with no sampling. The scope can be an owner (`common/list`), a group (`common`), or a path prefix or segment (`client/dist/widgets/common/list`). The target is resolved in this order: an exact `api_id` or `Owner.member` name, then an exact member name, then confident ranked matches. With `--brief`, usages are grouped as one line per file with its line numbers. JSON mode adds `mode: "in"`, `targets`, `files`, `count`, and `jsxAttributeCaveat`.
- JSX attribute names (`<DataSourceComponent onDataSourceInfoChange={...}>`) are recorded as `jsx-prop` usages of the Props member. The builder first resolves the attribute as a property of the component's contextual props type. When the emitted `.d.ts` inlines the props as a type literal (for example a Redux-connected component), it falls back to `<Component>Props#<attribute>` if that member is cataloged. Attributes of other components are skipped, so `--in` warns when a Props member has 0 usages. Always confirm a scoped result with a literal search in the same scope.
- Each result carries `skill` (the relevant `.github/skills` playbook), member deep-links (`canonical_url#anchor`), and `coverageHealth` (the package parse ratio from `coverage.tsv`, aggregated over non-excluded rows).

## Freshness gate

`npm run ai:verify` fails (non-zero exit) on version drift between `api/METADATA.tsv` and `ArcGISExperienceBuilder/version.json`, on a missing or empty required index, or when the API-to-usage ratio (public top-level APIs with at least one behavioral usage) drops below its floor. `npm run ai:test` runs the golden-query and coverage-quality suites. Both are intended for CI and pre-regeneration checks.

## Generator ownership

Each command deletes only the subtree it owns:

- `ai:index`: fast root files and `dist-widgets/`
- `ai:index:docs`: `docs/`
- `ai:index:rich`: `dist-widgets-ts/` and `api/`
- `ai:index:usages`: `api-usage/`, `api-usage-fast/`, and unresolved reports

Both widget-index generators share `src/lib/widget-catalog.mjs` for the manifest, catalog, and reverse-index (`module-usage`, `jsx-usage`) rows, so the `dist-widgets/` and `dist-widgets-ts/` variants cannot diverge on those outputs.

Commands may run in any order without erasing another generator's output. Rebuild all indexes after an ExB setup/version change.
