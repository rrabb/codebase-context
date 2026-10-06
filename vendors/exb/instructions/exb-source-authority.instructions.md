---
description: "Always-on routing, architecture facts, source authority, and vendor safety for all ArcGIS Experience Builder (ExB), Jimu, widget, framework, layout, UI, and settings questions/tasks, including outside src/**."
applyTo: "**"
---

# ExB: routing, architecture, and source authority

Widget rules: `exb-widget-development.instructions.md` (`src/**`). Correct and complete answers come before fewer tool calls.

If `{{VENDOR_ROOT}}/` or `.ai-context/exb/` is missing, project setup has not run. Say so, ask the user to run the project setup, and mark every ExB/Jimu API claim `⚠️ NOT VERIFIED IN LOCAL EXB SOURCES`.

## Required skills for ExB questions and tasks

Load matching skills before research, explanation, implementation, debugging, or review, including outside `src/**`. Multiple rows can apply. The first row applies to every ExB question, even a single API lookup.

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
| ExB/Jimu APIs, members, docs, usage | `npm run ai:find -- <Owner> --members` (or bare member name) | Bare member resolves to its owner and prints a `matched member:` line; usage totals are owner-wide |
| Same structural questions, OOTB source | graph | `{{OOTB_GRAPH}}`; paths relative to `client/dist/widgets`, for example `arcgis/feature-info/src/...` |
| Minified runtime bundles (`client/dist/jimu-*/*.js`) | `exb-source-research`, step 9 | `dist` is not graphed; ignore negation cannot override it |
| Concepts / how-to | `grep_search` | `.ai-context/exb/docs-text/guide/`: installed {{EXB_VERSION}} guide |
| Strings, config keys, JSON, Markdown, errors | `grep_search` or graph `search_code` | Scope to the relevant subtree |
| JSAPI (`@arcgis/core`, `__esri`) / Calcite | Installed `.d.ts` under `{{VENDOR_ROOT}}/client/node_modules`, then Context7, then `ps-codex-mcp` samples | Installed versions: `.ai-context/exb/REPOSITORY-MAP.md` |

Rules:

- Load deferred graph tools via `tool_search` ("codebase-memory"). Not seeing them in the tool list is not a reason to skip them. Agents without tool search call them directly.
- Use graph and `ai:find` when a question spans project structure and ExB APIs.
- Call `check_index_coverage` on cited FILE paths, not folders. Read source for partial, excluded, or stale results.
- Unavailable, stale, or empty tool: say so, then use scoped grep/source reads.
- End code-research answers with `Evidence:` naming tools and fallback reasons.
- Scope vendor greps to a subtree with `includePattern`: a grep across all of `{{VENDOR_ROOT}}/` can time out. Never grep a bare common word across `.ai-context/exb/api-usage/` (several MB per file); anchor on the first column, for example `^jimu-core::DataSourceStatus\.NotReady\t.*common/list`.

## Question recipes

Keep the final source/coverage check even when the first lookup succeeds.

| Question | Steps | Done when |
| --- | --- | --- |
| API meaning | `ai:find -- <Name> --brief` (`--members` if needed), read cited `.d.ts`; open docs if JSDoc is insufficient | Cite local signature |
| OOTB behavior / member usage | `ai:find -- <Owner.member> --in <group/widget> --brief` (for example `DataSourceStatus.NotReady --in common/list`), read hits, scoped grep of widget `src/**`, read missed hits | Explain all hits; graph misses enum/property reads |
| Call path | Graph sequence above, file coverage check, source for gaps | Cite file/line per hop |
| Widget capabilities (messages, actions, UI, imports) | Grep exact name in `dist-widgets/{manifests,jsx-usage,module-usage}.tsv`, read matching manifest/source | Confirm every listed widget |
| Literal | Scoped `grep_search` | Cite hits |
| JSAPI / Calcite | Installed `.d.ts`, Context7, Esri samples | Match installed signature |

Keep custom code in `src/`. `{{VENDOR_ROOT}}/` is read-only vendor source: never modify it without an explicit vendor-patch request. Detailed index notes, project structure, and external-doc routing are in `exb-source-research`.

## How ExB works (summary)

Everything in this repo runs inside the installed ExB Developer Edition {{EXB_VERSION}} in `{{VENDOR_ROOT}}/` (gitignored). Read `experience-builder-architecture` for folders, apps/config/layouts, builder, and builds.

| Piece | What it does |
| --- | --- |
| `{{VENDOR_ROOT}}/server/` | Koa server on `https://localhost:3001`. Serves `client/dist/` and stands in for an ArcGIS portal: each app is a folder `server/public/apps/<id>/`. |
| App files | `resources/config/config.json` = draft (Save), `config.json` = published (Publish), `info.json` = item metadata. Downloads use the published copy. |
| `{{VENDOR_ROOT}}/client/` | `dist/` is Esri's prebuilt site: framework, builder, OOTB widgets, themes, templates. Client `npm start` only compiles `your-extensions` into `dist/widgets/<name>/`. |
| Runtime | `experience/index.html`: `window.jimuConfig`, SystemJS imports (`jimu-*`, `widgets/`, `esri/` -> CDN), `jimu-core/init.js`, app config, widgets on demand. |
| Builder | `/builder/?id=<id>` edits config; runtime iframe: `experience/<id>/?draft=true`. Settings/runtime have separate windows and Redux stores. |
| App config | One JSON: `pages`, `layouts` (per size mode), `sections`, `views`, `dialogs`, `widgets` (each with `uri`, `config`, `useDataSources`, `useMapWidgetIds`), `dataSources`, `messageConfigs`, `theme`. A widget's `config.json` is copied into `widgets[id].config` once, when the widget is added. |
| Docs | `exb-api-ref-docs/experience-builder/guide/` under vendor root; text: `.ai-context/exb/docs-text/guide/`. Online guide may be newer. |

## Source authority (highest first)

Never invent a Jimu, ExB, Calcite, or ArcGIS API. Verify against, in order:

1. Local Jimu `.d.ts` declarations and type-check results.
2. `{{VENDOR_ROOT}}/sdk-resources/`: preferred supported custom-widget patterns.
3. `{{VENDOR_ROOT}}/client/dist/widgets/**/src/`: readable OOTB source; confirm a pattern is not an Esri-internal API before copying it.
4. `{{VENDOR_ROOT}}/client/jimu-*/`: `.d.ts` for signatures, source for behavior.
5. `{{VENDOR_ROOT}}/client/types/`: shared types.
6. Official Esri docs: ArcGIS Experience Builder, ArcGIS Maps SDK for JavaScript, Calcite Components.
7. Model training knowledge (lowest; not authoritative for Jimu/ExB).

If an API cannot be verified from sources 1-5, say `⚠️ NOT VERIFIED IN LOCAL EXB SOURCES` and name what to search next.

For ExB/Jimu, use Context7 only when local evidence is missing, thin, contradictory, or targets a newer release. For JSAPI/Calcite, check installed signatures, then Context7 and Esri samples. If `ps-codex-mcp` is unreachable, say so and continue.
