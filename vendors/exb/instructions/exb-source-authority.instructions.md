---
description: "Always-on rules for ArcGIS Experience Builder (ExB) Developer Edition and Jimu work in this repo: how ExB is put together, source authority, tool routing, and vendor safety. Applies everywhere (not just src/**) so research, Q&A, and non-src tasks share the same grounding as widget code."
applyTo: "**"
---

# ArcGIS Experience Builder (ExB): architecture summary, source authority, and tool routing (always-on)

Widget-building rules live in `exb-widget-development.instructions.md` (loads on `src/**`). The full search workflow, search scope, and vendor-source checks are in the `exb-source-research` skill; read it before any multi-step vendor search.

## Tool routing (mandatory for every code search, trace, or explanation)

Before any grep, file read, or semantic search to answer a question about code, pick the first tool from this table. Grep and manual reading are the fallback, not the starting point.

| Question | First tool | Scope / project |
| --- | --- | --- |
| Who calls X, what does X call, call path, impact, dependencies, architecture, where is X defined (project code) | codebase-memory: `search_graph` -> `trace_path` -> `get_code_snippet` | `{{PROJECT_GRAPH}}` (`src/`, `.scripts/`) |
| Same questions for `tools/` code | codebase-memory, same calls | {{TOOLS_GRAPHS}} (`tools/*` are links, which the repo graph skips) |
| Same questions for jimu `.d.ts` or `sdk-resources/` | codebase-memory, same calls | `{{VENDOR_GRAPH}}` |
| What an ExB/Jimu API is, its members, docs, and real usage examples | `npm run ai:find -- <Owner> --members` or `npm run ai:find -- <memberName>` | A bare member name resolves to its owning class and prints a `matched member:` line |
| Who calls X / call path / structure inside OOTB widget source (`client/dist/widgets/**/src`) | codebase-memory, same calls | `{{OOTB_GRAPH}}` (paths are relative to `client/dist/widgets`, e.g. `arcgis/feature-info/src/...`) |
| Minified runtime bundles (`client/dist/jimu-*/*.js`) | `exb-source-research` skill, step 9 | Not graphed: codebase-memory skips any folder named `dist`, and `.cbmignore` negation cannot override it |
| ExB concepts and how-to (guide pages) | `grep_search` in `.ai-context/exb/docs-text/guide/` | The installed {{EXB_VERSION}} guide as text |
| Literal text: strings, config keys, JSON, Markdown, error messages | `grep_search` or codebase-memory `search_code` | Any |
| ArcGIS Maps SDK for JavaScript (`@arcgis/core`, `__esri`) or Calcite API docs and usage | Installed `.d.ts` for exact signatures, then Context7, then `ps-codex-mcp` for Esri samples | See External docs below |

Rules:

- codebase-memory tools are deferred: load them with `tool_search` ("codebase-memory") first. Not seeing them in the tool list is not a reason to skip them. Subagents may have no `tool_search`; they call the codebase-memory tools directly.
- Use both tools when a question spans project code and ExB APIs, for example a trace from a widget into `DataSourceManager`.
- After the graph gives candidate paths, call `check_index_coverage` once with those file paths (not folders: a folder returns `not_tracked`, which proves nothing), and read source for any reported partial, excluded, or stale range.
- If a tool is unavailable, stale, or returns nothing useful, say so in one line, then fall back to grep.
- End every code-research answer with an `Evidence:` line naming the tools used (graph, ai:find, grep, source read) and any fallback reason. This keeps a skipped tool visible.

## Question recipes

The routing table picks the first tool. These recipes give the full sequence for common questions. Correct and complete answers come before fewer calls, so keep the final check step.

| Question | Steps | Done when |
| --- | --- | --- |
| What an ExB/Jimu API is or does | 1. `npm run ai:find -- <Name> --brief` (add `--members` for members). 2. Read the `.d.ts` at the cited declaration line. 3. Open the docs URL only if the JSDoc does not explain the behavior. | The signature is cited from the local `.d.ts` |
| How OOTB widget X handles Y, or where API Y is used in widget X | 1. `npm run ai:find -- <Owner.member> --in <group/widget> --brief` (for example `DataSourceStatus.NotReady --in common/list`). 2. Read each cited line. 3. Final check: `grep_search` for the member name with `includePattern` set to that widget's `src/**`, and read any hit the index missed. | Every hit from step 1 and step 3 is explained |
| Who calls X, what X calls, call path | 1. codebase-memory `search_graph` -> `trace_path` -> `get_code_snippet` (project per the routing table). 2. `check_index_coverage` on the cited file paths. 3. Read source for partial or stale ranges. | The path is shown with file and line for each hop |
| Which widgets have capability C (publish a message, accept a data action, render a component, import a module) | 1. Grep `.ai-context/exb/dist-widgets/manifests.tsv`, `jsx-usage.tsv`, or `module-usage.tsv` for the exact name. 2. Open the manifest or source of the matching widgets. | Each listed widget is confirmed in its manifest or source |
| Literal text, config key, message string | `grep_search` with `includePattern` scoped to a subtree | Hits are cited |
| JSAPI or Calcite API | Installed `.d.ts`, then Context7, then `ps-codex-mcp` (see External docs) | The signature matches the installed `.d.ts` |

Notes:

- The graph does not record enum member reads or property reads (for example `DataSourceStatus.NotReady`). Use the second recipe for those, not `search_graph`.
- `npm run ai:find -- <term> --in <scope>` lists every resolved usage in a widget (`common/list`), group (`common`), or folder path. It covers parsed source only, which is why the recipe ends with a grep.
- To grep an index table directly, anchor on the first column and add a scope word, for example `^jimu-core::DataSourceStatus\.NotReady\t.*common/list` on `.ai-context/exb/api-usage/*.tsv`. Never grep a bare common word across `api-usage/` (each file is several MB).
- Scope vendor greps with `includePattern` to a subtree. A grep across the whole `{{VENDOR_ROOT}}/` tree can time out.

## Project structure

- `src/` - project-owned widget code. New widgets, components, tests, and utilities go here.
- `{{VENDOR_ROOT}}/` - read-only Esri vendor source. Never modify unless the user explicitly asks for a vendor patch; adapt vendor patterns into `src/` and cite the vendor source path as evidence.
- `.ai-context/` - generated, grep-first indexes of the vendor source (map of regions and tables: `exb/REPOSITORY-MAP.md`). Rebuild with `npm run ai:refresh`.
- `tools/codebase-context/` - the tool that builds `.ai-context/` and installed this file. Its settings for this project are in `.codebase-context/`.
- `.github/skills/` - ExB knowledge skills: `experience-builder-architecture`, `exb-source-research`, `exb-widget-development` (OOTB and SDK sample cards), `jimu-framework-apis`, `jimu-ui-components`.

## How ExB works (summary)

Everything in this repo runs inside the installed ExB Developer Edition {{EXB_VERSION}} in `{{VENDOR_ROOT}}/` (gitignored). Read the `experience-builder-architecture` skill before answering any question about folders, app storage, app config, layouts, the builder, or the build. Short version:

| Piece | What it does |
| --- | --- |
| `{{VENDOR_ROOT}}/server/` | Koa server on `https://localhost:3001`. Serves `client/dist/`, and stands in for a portal: each app is a folder `server/public/apps/<id>/`. |
| App files | `resources/config/config.json` = draft (Save), `config.json` = published (Publish), `info.json` = item metadata. Downloads use the published copy. |
| `{{VENDOR_ROOT}}/client/` | `dist/` is Esri's prebuilt site (framework, builder, OOTB widgets, themes, templates). Client `npm start` only compiles `your-extensions` into `dist/widgets/<name>/`. |
| Runtime | `experience/index.html` sets `window.jimuConfig`, uses a SystemJS import map (`jimu-*`, `widgets/`, `esri/` -> JSAPI CDN), boots `jimu-core/init.js`, loads the app config, and loads widgets on demand. |
| Builder | `/builder/?id=<id>` edits the app config and runs the app in an iframe (`experience/<id>/?draft=true`). Settings panels and runtime widgets are in different windows with different Redux stores. |
| App config | One JSON: `pages`, `layouts` (per size mode), `sections`, `views`, `dialogs`, `widgets` (each with `uri`, `config`, `useDataSources`, `useMapWidgetIds`), `dataSources`, `messageConfigs`, `theme`. A widget's `config.json` is copied into `widgets[id].config` once, when the widget is added. |
| Docs for this version | `{{VENDOR_ROOT}}/exb-api-ref-docs/experience-builder/guide/` ({{EXB_VERSION}}), searchable as text in `.ai-context/exb/docs-text/guide/`. The online guide may be newer. |

## Source authority (highest first)

Never invent a Jimu, ExB, Calcite, or ArcGIS API. Verify against, in order:

1. Local Jimu `.d.ts` declarations and type-check results.
2. Local SDK samples: `{{VENDOR_ROOT}}/sdk-resources/` (preferred supported custom-widget patterns).
3. Local OOTB widget source: `{{VENDOR_ROOT}}/client/dist/widgets/**` (readable `.ts/.tsx` under each `src/`; confirm a pattern is not an internal Esri-only API before copying it).
4. Local Jimu source: `{{VENDOR_ROOT}}/client/jimu-*/` (`.d.ts` for signatures, source for behavior when declarations are insufficient).
5. Local shared types: `{{VENDOR_ROOT}}/client/types/`.
6. Official Esri docs: ArcGIS Experience Builder, ArcGIS Maps SDK for JavaScript, Calcite Components.
7. Model training knowledge (lowest; not authoritative for Jimu/ExB).

If an API cannot be verified from sources 1-5, say `⚠️ NOT VERIFIED IN LOCAL EXB SOURCES` and name what to search next.

### External docs (Context7, ps-codex)

| Question about | Order | Use Context7 when |
| --- | --- | --- |
| ExB, Jimu, or widgets (OOTB, SDK samples, custom) | Local sources 1-5 above, `npm run ai:find`, codebase-memory, grep | Local sources lack the answer, give wrong, thin, or contradictory results, or the user asks about docs, versions, or APIs newer than the installed ExB |
| ArcGIS Maps SDK for JavaScript (`@arcgis/core`, `__esri`) or Calcite | Installed `.d.ts` under `{{VENDOR_ROOT}}/client/node_modules` for exact signatures, then Context7 for docs and usage, then `ps-codex-mcp` for Esri samples and skills | Always allowed for docs and usage; the installed `.d.ts` wins on signatures because it matches the ExB release |

- For a question that mixes both, handle the ExB part locally and the JSAPI or Calcite part as above.
- If `ps-codex-mcp` is unreachable, say so in one line and continue.
- Installed JSAPI and Calcite versions are listed in `.ai-context/exb/REPOSITORY-MAP.md`.
