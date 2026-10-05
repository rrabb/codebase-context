---
name: exb-source-research
description: "USE WHEN answering questions, explaining, implementing, debugging, or reviewing anything related to ArcGIS Experience Builder (ExB), Jimu, widget development, runtime or settings, framework architecture, app/widget config, layouts, pages, sections, views, jimu-core, jimu-ui, settings components, managers, data sources, SDK samples, or out-of-the-box widgets (OOTB / OTB). Load even for a single API lookup or conceptual question. Covers local source authority, tool routing, vendor-safe patterns, .ai-context/exb indexes, installed guide text, usage coverage, and minified-runtime fallback."
license: Internal
---

# ExB source research workflow

The always-on `exb-source-authority` instruction holds the Tool routing table, Question recipes, and source authority order. This skill holds the longer workflow behind them.

For architecture/layouts/app lifecycle, also load `experience-builder-architecture`; for widget implementation/review, `exb-widget-development`; for core/framework APIs, `jimu-framework-apis`; for UI/settings components, `jimu-ui-components`. Paths in these skills use the default vendor folder as examples: resolve `vendors[].root` in `.codebase-context/config.json` before opening them. The reference material is grounded in ExB 1.20; verify release-sensitive details against the installed version rather than assuming another release matches.

## Search workflow (the semantic index does not cover the vendor tree)

The vendor folder (usually `ArcGISExperienceBuilder/`) is gitignored, so Copilot's `#codebase` semantic index skips it. Text, grep, and file search do see it when the project's `.vscode/settings.json` allows it. For ExB, Jimu, and widget tasks:

1. Use the Tool routing table and Question recipes first. Open `.ai-context/exb/REPOSITORY-MAP.md` (regions and which index to grep) only when a question does not fit a row.
2. Run `npm run ai:find -- <Owner> --members` for a combined API and member lookup. A bare member name also works: it resolves to the owning class, but usage counts still cover the whole class. It ranks local public docs and Storybook, verified declaration and export locators, and diverse compiler-resolved SDK and OOTB usage evidence. For direct table lookup use `api/{symbols,declarations,exports,relations}.tsv`, `docs/*.tsv`, and split `api-usage/<package>.tsv`; review `reports/unresolved-*.tsv` before claiming source-wide coverage.
3. Use codebase-memory `search_graph` and `trace_path` for definitions, callers, and references: the vendor graph for `client/jimu-*`, `client/types`, and `sdk-resources/`, and the OOTB graph for `client/dist/widgets` (see Tool routing).
4. Grep the fast generated indexes (`symbols.tsv`, `reexports.tsv`, `dist-widgets/*.tsv`) when a quick name, file, or widget-capability lookup is enough. `REPOSITORY-MAP.md` lists each table. For resolved types, prefer `dist-widgets-ts/` when present.
5. For concepts and how-to, grep the installed guide as text in `.ai-context/exb/docs-text/guide/` (`index.tsv` lists slugs and online URLs). For checked architecture facts with sources, read `.ai-context/exb/facts/<version>.md`.
6. Exact text search for symbol names and imports in the vendor tree.
7. Read the smallest relevant set of original source files, and verify signatures against the local `.d.ts`.
8. When a symbol has a declaration but no usages, grep `.ai-context/exb/mentions.tsv` for the name. Readable OOTB and SDK comments and strings often name an internal API beside the public wrapper that dispatches it. (`npm run ai:find` prints these mentions automatically when evidence is thin.)
9. If the API has no readable implementation, or the source still cannot explain behavior, open `.ai-context/exb/CLIENT-RUNTIME-MAP.md` and inspect only its mapped minified runtime bundle. Treat the result as generated-runtime evidence, not a supported precedent. Never broad-search `chunks/`, vendor libraries, or all bundles.
10. Cite the local source paths used, then propose or generate code.

The usage graph covers statically resolvable references to cataloged declarations in eligible parsed code. It is not a runtime-complete inventory. Fast fallback usages are stored separately and never merged into canonical totals. Full schemas and exclusions are in `tools/codebase-context/docs/EXB-API-USAGE-INDEX-SPEC.md`.

Do not claim to have searched the whole vendor tree unless an index or processing ledger demonstrates coverage.

When no close local match exists, do not force a poor fit or invent an API: escalate to official Esri sources (ExB Developer Guide and API Reference, ArcGIS Maps SDK for JavaScript samples and reference, Calcite docs, jimu-ui Storybook, the ExB sdk-resources GitHub repo), cite what you used, and mark unverified APIs `⚠️ NOT VERIFIED IN LOCAL EXB SOURCES`.

## Search scope

The graph does not record enum or property reads. For `ai:find -- <term> --in <scope>`, scope can be a widget, group, or folder; results cover parsed source, so finish usage questions with scoped grep. Anchor direct table searches on the identity column, for example `^jimu-core::DataSourceStatus\.NotReady\t.*common/list`. Never grep a bare common word across multi-MB `api-usage/` tables or the entire vendor tree.

## Project structure and external docs

| Location | Purpose |
| --- | --- |
| `src/` | Project-owned widgets, components, tests, utilities |
| Configured `vendors[].root` (usually `ArcGISExperienceBuilder/`) | Read-only vendor source; adapt patterns into `src/` and cite the original |
| `.ai-context/exb/` | Generated indexes; `REPOSITORY-MAP.md` routes tables; rebuild with `npm run ai:refresh` |
| `tools/codebase-context/` | Index tool; project settings in `.codebase-context/` |
| `.github/skills/` | Architecture, source research, widget development, framework APIs, UI skills |

| Topic | Documentation order |
| --- | --- |
| ExB/Jimu/widgets | Local declarations, SDK/OOTB sources, `ai:find`, graph, scoped grep. Context7 only for missing/thin/contradictory evidence or a newer release |
| JSAPI/Calcite | Exact signatures from installed `client/node_modules` declarations, then Context7, then `ps-codex-mcp` Esri samples/skills |

For mixed questions, apply each route separately. If `ps-codex-mcp` is unreachable, say so and continue. Installed JSAPI/Calcite versions appear in `.ai-context/exb/REPOSITORY-MAP.md`.

## Vendor search priorities

| Priority | Folders |
| --- | --- |
| Search first | `sdk-resources/`, `client/dist/widgets/`, `client/jimu-*/`, `client/types/` |
| Ignore by default | `node_modules/`, `chunks/`, minified JS, source maps, generated bundles, very large compiled files |

Inspect built or minified files only when source-level analysis is insufficient.

## Analyzing vendor source

Before you trust a vendor pattern:

- Note the file kind (original `.ts/.tsx` source, `.d.ts` declaration, transpiled or minified JS, generated output, or source map) and prefer source and `.d.ts` over generated or minified JS.
- Classify the API you intend to use: public and documented, public but undocumented, Esri-internal, widget-local, generated, or unknown.

## ExB implementation requirements

- Keep runtime and setting code separate.
- Verify `manifest.json` dependencies against actual imports.
- Verify data-source and map-view readiness before use.
- Clean up watchers, subscriptions, handles, and event listeners.
- Use strict TypeScript typing; avoid unnecessary `as any` casts.

## Examples from the cpe-exb project

Some skills in this package cite files such as `src/widgets/grid-overlay` or `src/libs/debug-introspect.ts`. They come from the cpe-exb project, where these skills were written. If they do not exist in your project, treat them as descriptions of a pattern, not as files to open.
