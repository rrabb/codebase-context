---
description: "Always-on routing, architecture facts, source authority, and vendor safety for all ArcGIS Experience Builder (ExB), Jimu, widget, framework, layout, UI, and settings questions/tasks, including outside src/**."
applyTo: "**"
---

# ExB: routing, architecture, and source authority

Widget rules: `exb-widget-development.instructions.md` (`src/**`). Read `exb-source-research` for every ExB/Jimu question or task; it holds detailed search and vendor-safety guidance.

## Required skills for ExB questions and tasks

Load matching skills before research, explanation, implementation, debugging, or review, including outside `src/**`. Multiple rows can apply. Do not wait for a multi-step search to load the research skill.

| Topic or task | Read skill |
| --- | --- |
| Any ArcGIS Experience Builder (ExB), Jimu, custom widget, SDK sample, or out-of-the-box widget (OOTB / OTB) question or task | `exb-source-research` |
| Client/server, framework architecture, app creation/storage, AppConfig, widget config, pages, layouts, sections, views, builder/runtime, build/deploy | `experience-builder-architecture` |
| Widget development, runtime/settings, manifest, config, Map widget integration, debugging or review | `exb-widget-development` |
| Jimu core/framework APIs, managers, Redux/store, data sources, map bridge, theme, layouts, builder APIs | `jimu-framework-apis` |
| Jimu UI, settings components, SettingSection/SettingRow, selectors, controls, component props/imports | `jimu-ui-components` |

## Tool routing (mandatory for every code search, trace, or explanation)

Before any grep, file read, or semantic search to answer a question about code, pick the first tool from this table. Grep and manual reading are the fallback, not the starting point.

| Question | First tool | Scope / project |
| --- | --- | --- |
| Definitions, callers, calls, impact, dependencies, architecture | graph: `search_graph` -> `trace_path` -> `get_code_snippet` | `{{PROJECT_GRAPH}}`: `src/`, `.scripts/` |
| Same, `tools/` code | graph | {{TOOLS_GRAPHS}}; project graph skips linked tools |
| Same, Jimu declarations / SDK samples | graph | `{{VENDOR_GRAPH}}` |
| ExB/Jimu APIs, members, docs, usage | `npm run ai:find -- <Owner> --members` (or bare member name) | Bare member resolves to owner; usage totals are owner-wide |
| Same structural questions, OOTB source | graph | `{{OOTB_GRAPH}}`; paths relative to `client/dist/widgets` |
| Minified runtime behavior | `exb-source-research`, step 9 | `dist` is not graphed; ignore negation cannot override it |
| Concepts / how-to | `grep_search` | `.ai-context/exb/docs-text/guide/`: installed {{EXB_VERSION}} guide |
| Strings, config keys, JSON, Markdown, errors | `grep_search` or graph `search_code` | Scope to the relevant subtree |
| JSAPI (`@arcgis/core`, `__esri`) / Calcite | Installed `.d.ts`, Context7, `ps-codex-mcp` samples | Details: `exb-source-research` |

Rules:

- Load deferred graph tools via `tool_search` ("codebase-memory"); agents without tool search call them directly.
- Use graph and `ai:find` when a question spans project structure and ExB APIs.
- Call `check_index_coverage` on cited FILE paths, not folders. Read source for partial, excluded, or stale results.
- Unavailable, stale, or empty tool: say so, then use scoped grep/source reads.
- End code-research answers with `Evidence:` naming tools and fallback reasons.

## Question recipes

Keep the final source/coverage check even when the first lookup succeeds.

| Question | Steps | Done when |
| --- | --- | --- |
| API meaning | `ai:find -- <Name> --brief` (`--members` if needed), read cited `.d.ts`; open docs if JSDoc is insufficient | Cite local signature |
| OOTB behavior / member usage | `ai:find -- <Owner.member> --in <group/widget> --brief`, read hits, scoped grep of widget `src/**`, read missed hits | Explain all hits; graph misses enum/property reads |
| Call path | Graph sequence above, file coverage check, source for gaps | Cite file/line per hop |
| Widget capabilities (messages, actions, UI, imports) | Grep exact name in `dist-widgets/{manifests,jsx-usage,module-usage}.tsv`, read matching manifest/source | Confirm every listed widget |
| Literal | Scoped `grep_search` | Cite hits |
| JSAPI / Calcite | Installed `.d.ts`, Context7, Esri samples | Match installed signature |

Keep custom code in `src/`. `{{VENDOR_ROOT}}/` is read-only vendor source: never modify it without an explicit vendor-patch request. Detailed index notes, project structure, and external-doc routing are in `exb-source-research`.

## How ExB works (summary)

Installed ExB: {{EXB_VERSION}}, `{{VENDOR_ROOT}}/` (gitignored). Read `experience-builder-architecture` for folders, apps/config/layouts, builder, and builds.

| Piece | What it does |
| --- | --- |
| `server/` | Koa (`https://localhost:3001`), serves `client/dist/`; local app storage: `server/public/apps/<id>/`. |
| App files | `resources/config/config.json` = draft (Save), `config.json` = published (Publish), `info.json` = item metadata. Downloads use the published copy. |
| `client/` | `dist/`: prebuilt framework, builder, OOTB widgets/themes/templates. `npm start` only compiles `your-extensions` into `dist/widgets/<name>/`. |
| Runtime | `experience/index.html`: `window.jimuConfig`, SystemJS imports (`jimu-*`, `widgets/`, `esri/` -> CDN), `jimu-core/init.js`, app config, widgets on demand. |
| Builder | `/builder/?id=<id>` edits config; runtime iframe: `experience/<id>/?draft=true`. Settings/runtime have separate windows and Redux stores. |
| App config | One JSON: `pages`, `layouts` (per size mode), `sections`, `views`, `dialogs`, `widgets` (each with `uri`, `config`, `useDataSources`, `useMapWidgetIds`), `dataSources`, `messageConfigs`, `theme`. A widget's `config.json` is copied into `widgets[id].config` once, when the widget is added. |
| Docs | `exb-api-ref-docs/experience-builder/guide/` under vendor root; text: `.ai-context/exb/docs-text/guide/`. Online guide may be newer. |

## Source authority (highest first)

Never invent a Jimu, ExB, Calcite, or ArcGIS API. Verify against, in order:

1. Local Jimu `.d.ts` declarations and type-check results.
2. `sdk-resources/` under vendor root: preferred supported custom-widget patterns.
3. `client/dist/widgets/**/src/`: readable OOTB source; reject Esri-internal APIs as custom-widget precedents.
4. `client/jimu-*/`: declarations for signatures, source for behavior.
5. `client/types/`: shared types. All paths above are under `{{VENDOR_ROOT}}/`.
6. Official Esri docs: ArcGIS Experience Builder, ArcGIS Maps SDK for JavaScript, Calcite Components.
7. Model training knowledge (lowest; not authoritative for Jimu/ExB).

If an API cannot be verified from sources 1-5, say `⚠️ NOT VERIFIED IN LOCAL EXB SOURCES` and name what to search next.

For ExB/Jimu, use Context7 only when local evidence is missing, thin, contradictory, or targets a newer release. For JSAPI/Calcite, check installed signatures, then Context7 and Esri samples. If `ps-codex-mcp` is unreachable, say so and continue.
