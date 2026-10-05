# Plan: optimize ExB research routing (draft, not approved)

Saved copy of the working plan. Kept in sync with the session plan. Location: `docs/temp/plan-optimize-exb-research-routing.md` (untracked; `.vscode/settings.json` excludes `**/temp/**` from search, so open it by path).

## Findings
- 3 model runs (Astra 37 calls, Luna 44, Opus subagent 69) on List/NotReady question; 2 of 3 incomplete (missed data-count.tsx:32-33, record-load-status-a11y.tsx).
- Usage index already has all List NotReady rows (.ai-context/exb/api-usage/jimu-core-*.tsv, usage_kind enum-member); ai:find shows only 6 diverse "representative" usages (.scripts/ai-find.mjs representativeUsages ~L181) so they're hidden. Fix: widget/path filter + compact output (opt-in).
- AGENTS.md says guidance-* skills always-on (~29 KB); esri-skills-always-on.instructions.md already says coding only.
- /memories/repo/exb-runtime-patterns.md bloated and mixes ~10 domains.
- Routing conflict: table says graph first, workflow step 1 says REPOSITORY-MAP first. tool_search rule doesn't apply to subagents.

## Context7 scoping - corrected
- VS Code docs: instruction sources are additive; don't rely on precedence; fix conflicts at the source (narrow the personal rule). So a repo "override" alone is unreliable.
- Two global drivers: ~/.claude/rules/context7.md (paths defaults to **) AND ~/.agents/skills/context7-mcp/SKILL.md.
- chat.instructionsFilesLocations / chat.agentSkillsLocations deprecated, Local agent only; no explicit values in user settings.json.
- Options: (A) narrow global rule+skill text with an explicit cpe-exb/ExB exception (behavior changes only there); (B) disable Context7 MCP server per workspace (unverified UI); (C) repo override as reinforcement only.

## DECIDED: Context7 = A + C (2026-10-02)
Rule meaning (same in all 3 files): for ExB, Jimu, OOTB/custom widgets and the vendor tree, local sources come first (installed .d.ts + source, npm run ai:find, codebase-memory graphs, grep). Use Context7 only when (1) local sources lack the answer, (2) local results are wrong/thin/contradictory, or (3) user asks for newer docs, versions, or APIs than installed ExB 1.20. NOT exempted: ArcGIS Maps SDK for JS (JSAPI/@arcgis/core), Calcite, other libs -> keep Context7 + ps-codex MCP (mcp.json server "ps-codex-mcp", http://psdc-tools.esri.com/ps-codex-mcp, tools list_codex_repositories, search_code_samples, list_skills, get_skill; chat tool prefix mcp_arcgis-code-s_). Mixed questions: ExB part local-first, JSAPI/Calcite part Context7/ps-codex.
- ps-codex-mcp was DOWN on 2026-10-02. Local copies of its skills live in .github/skills (arcgis-*, arcpy-*, guidance-*), but none target JSAPI or Calcite inside ExB: arcgis-svelte-application covers JSAPI v5 + Calcite v5 for Svelte/Vite only. The copies record no source/version, so drift from the server can't be detected.
- JSAPI/Calcite lookup order: (1) installed @arcgis/core and Calcite .d.ts for exact signatures (types 5.0.4 / Calcite 5.0.2; runtime JSAPI 5.0.12); (2) Context7 for docs and usage; (3) ps-codex-mcp search_code_samples/get_skill when reachable; if unreachable, say so in one line and continue.
- Optional later: add a "source: ps-codex-mcp, fetched <date>" line to each copied skill; when the server is back, diff list_skills against .github/skills.
- mcp.json findings: Context7 configured TWICE (stdio "io.github.upstash/context7" + http "context7") -> duplicate tool sets; keep one. Context7 API key is plaintext in both entries; an unused input CONTEXT7_API_KEY already exists -> use ${input:CONTEXT7_API_KEY} and rotate the key.
- Files: A1 ~/.claude/rules/context7.md "Exception" section; A2 ~/.agents/skills/context7-mcp/SKILL.md description + body; C exb-source-authority.instructions.md "External docs (Context7, ps-codex)" table + routing row.
- Verify: new chat, Chat: Open Customizations; ask (1) List/NotReady question -> expect no Context7 calls; (2) a JSAPI question -> expect Context7/ps-codex used; (3) repeat in the multi-root w/s. Check References.

## User answers
- Priority: CORRECTNESS first, then tokens, then call count. Keep verification steps even if they add calls.
- ai:find: new behavior only via opt-in flags; default output unchanged.
- Memory: split + sanitize exb-runtime-patterns.md by domain, keep all content.
- General ExB/Jimu notes -> skills; repo tooling notes -> instruction file; BVE notes -> untracked instruction file; chat-exporter notes -> that repo.
- Benchmark: under docs/exb/benchmark/, run via /trace prompt, main chat AND subagent runs; draft hard questions that training data can't answer.
- Commit NOTHING; user commits manually. /trace prompt stays uncommitted for now.
- Work step by step; check facts while moving memory content.
- (2026-10-04) Cite websites, files, or commands for every claim. Ask instead of assuming when context is missing or paths fork. Both go in AGENTS.md as rules for all agent work.

## Steps
1. Guidance cleanup: AGENTS.md guidance-skills scope; Context7 A+C.
2. ai:find opt-in flags `--in <scope>` and `--brief` + tests + docs.
3. Routing: Question recipes table after Tool routing; routing table first, REPOSITORY-MAP only if no row fits.
4. Memory split of /memories/repo/exb-runtime-patterns.md (66 lines). Sanitize = fold CORRECTION/SUPERSEDED items into the final statement, drop machine/session-only details from tracked files, check each fact against source, append only what's missing.
   - 4.1 repo tooling -> .github/instructions/repo-tooling.instructions.md
   - 4.2 framework + widget-building facts -> jimu-framework-apis and exb-widget-development skill references
   - 4.3 map-notes -> src/widgets/map-notes/NOTES.md (tracked). grid-overlay L3 already covered by arcgis-jsapi-integration.md section 4 (delete from memory only).
   - 4.4 AI index history (L49-57) -> readme-ai-index.md history + EXB-API-USAGE-INDEX-SPEC.md; check whether the Tier 3 SCIP plan (L52) is superseded by ai:index:usages. Customization map (L20-22) -> AGENTS.md / skill files.
   - 4.5 branch-version-editor (L9-11, 16-19, 26, 38-48) -> UNTRACKED .github/instructions/branch-version-editor.instructions.md (applyTo "src/widgets/branch-version-editor/**" + description) + long history in untracked .github/notes/branch-version-editor.md; both in topo/.git/info/exclude as CPE/WebApps/cpe-exb/.github/instructions/branch-version-editor.instructions.md and CPE/WebApps/cpe-exb/.github/notes/ (git root = c:\_DATA\PROJECTS\NGA-CPE\topo-cpe-git\topo).
   - 4.6 chat exporter (L59-63) -> tools/copilot-chat-exporter docs (diff vs CHAT-SESSION-SCHEMA.md, UPGRADING.md, migration-plan.md; drop phase status). Its .github/copilot-instructions.md loads only when that repo is a workspace root.
   - 4.7 leave exb-runtime-patterns.md as a ~20-line router (domain -> file + top traps).
5. Benchmark (docs/exb/benchmark/, uncommitted): 6 hard questions with verified expected answers. Candidates: (a) List + DataSourceStatus.NotReady (3 files); (b) MutableStoreManager dotted propKey version key + Text widget cross-iframe read; (c) widgets publishing DATA_RECORDS_SELECTION_CHANGE that also declare canConsumeDataAction; (d) Query widget call path Apply -> DataSource query; (e) CreateFeaturesWorkflow steps vs createFeatureState + post-draw event; (f) SnappingUtils.getSnappingFeatureSourcesCollection 2nd arg + OOTB Edit usage. Score correctness first, then calls, Context7 use, oversized outputs; main chat and subagent.
6. (added 2026-10-04) AGENTS.md: working rules (cite evidence, ask on forks, search tools can miss files) DONE; "How this project runs on ExB" section PROPOSED, awaiting approval and team facts.

## Progress
- Step 1 DONE 2026-10-02.
- Step 2 DONE 2026-10-02: --brief (DataSourceStatus 9.5 KB -> 1.4 KB), --in (owner/group/path; exact api_id or Owner.member, then member name, then confident ranked). Docs: EXB-API-USAGE-INDEX-SPEC.md, readme-ai-index.md, build-ai-index.mjs repo map note.
- Index gap FIXED 2026-10-02: build-ai-usage-index.mjs resolves JSX attribute names to Props members (contextual props type, then `<Component>Props#attr` fallback) and stops matching attribute names to imports by text (670 false rows removed). jsx-prop 670 -> 21485; canonical 79173 -> 99988. 35 tests pass; ai:verify passes. Old index backup %TEMP%\api-usage-before.
- Step 3 DONE 2026-10-02.
- Step 4.1 DONE 2026-10-02. Stale memory found: L13 (junction include path), L64 (rg not installed; it is), L23 dropped (in code-style.instructions.md).
- Step 4.2 DONE 2026-10-04:
  - tscheck-bve.json include `client/**/*.d.ts` -> `client/jimu-*/**/*.d.ts`. The old include walked your-extensions links and dropped all 30 BVE files (checked 0). Now exit 2 with 4 real errors (listed in repo-tooling.instructions.md).
  - Root package.json pinned to client versions: @arcgis/core 5.0.4, charts/coding-components 5.0.9, map-components 5.0.4, map-components-react 5.0.4, portal-components 5.0.4 (root core had drifted to 5.1.14, causing TS2345 on @arcgis/core imports = the old "dual identity"). After pin: @arcgis/core and esri/* both assign to __esri without casts. Editor.supportingWidgetDefaults still TS2740 (narrow cast).
  - Docs: arcgis-jsapi-integration.md, exb-widget-development SKILL.md, exb-widget-development.instructions.md, ootb-widgets/patterns/arcgis-core-vs-esri-alias.md, managers.md, jimu-and-ui-reference.md, repo-tooling.instructions.md.
- Versions review 2026-10-04 (Esri release table https://developers.arcgis.com/experience-builder/guide/release-versions/: ExB 1.20 = JSAPI 5.0, Calcite 5.0, React 19, Node 24):
  - ExB webpack externals (client/webpack/webpack.common.js:530-590): `esri/*` and `@arcgis/core/*` -> `system esri/...`; `@esri/calcite-components(-react)` -> `system calcite-components`; `@arcgis/{map,coding,portal}-components` -> jimu-ui systems. Not external: `@arcgis/map-components-react`, `@arcgis/charts-components`.
  - Types: client/node_modules (core 5.0.4, Calcite 5.0.2); bare imports in src/ -> root node_modules.
  - Runtime: npm start loads JSAPI 5.0.12 + Calcite 5.0.2 from Esri's prebuilt client/dist/{index,builder,experience,template}/index.html. Exported apps copy ExB's client/dist/experience/index.html (server/src/middlewares/dev/apps/app-download.js, copyAppCode; corrected 2026-10-04, was "client/dist/index.html"; both load 5.0.12). Deployed builds: src/build-configs/<app>/<env>/index.html.
- Step 4.3 DONE 2026-10-04: src/widgets/map-notes/NOTES.md.
- Step 6 rules DONE 2026-10-04: AGENTS.md "Working rules" section.
- CORRECTIONS 2026-10-04 (my mistakes): (a) docs/temp/agent-tooling-plan.md exists; I called it missing because `search.exclude` hides `**/temp/**` from file search; memory ref restored. (b) npm start JSAPI is 5.0.12 (client/dist/*/index.html), not 5.0.10 (webpack.common.js:43 is not used by the dev app). (c) Root Calcite: package.json declares "^5.0.2", npm installed 5.1.2; runtime is unaffected; "fail at runtime" was overstated. (d) App 0 build configs are intentional, not stale.

## Deferred (do NOT forget)
- Fix the 4 BVE type errors (exit 2): branch-version-manager.ts:39-40 imports `ArcGISExperienceBuilder/client/node_modules/@esri/arcgis-rest-request/dist/esm/utils/{IRequestOptions,IParams}`; editor-host.tsx:27 undeclared `window._isDebug`. Code task.
- Remove now-unneeded JSAPI `as any` casts in src (BVE base-layer.ts, use-editor.ts basemap/layer seams; keep the supportingWidgetDefaults cast with a reason). Verify each with tscheck. Code task.
- Type-check the other widgets that import @arcgis/* directly (map-notes: @arcgis/core; wdvlos: @arcgis/map-components-react 5.0.4) with a copy of tscheck-bve.json.
- package.json `lint:src` uses the VENDOR eslint config -> false "Extra semicolon". Switch to `--config eslint.config.js`; real findings across src/ will surface; count per widget, decide fix vs per-rule config; recheck docs citing lint:src.
- export.mjs starter page (lists exported apps) loads Calcite 2.13.0: bump to 5.0.2 AND update calcite-card etc. attributes for Calcite 5. Later.

## Decided: leave as is
- App 0 build configs (aws, xc_dev) JSAPI 4.33 + Calcite 3.2.1, xc_qa placeholders: intentional.
- print-3d print.html JSAPI 4.32 + Calcite 3.0.3.
- Root @esri/calcite-components(-react) range "^5.0.2" (5.1.2 installed): do NOT pin (2026-10-04).
- Team facts (environments, active apps and widgets): not needed (2026-10-04).

## Step 7: ExB architecture guide (DECIDED 2026-10-04)
- Problem: agents lack basic ExB understanding: client and server folders, jimu, how apps are created, app config, widget config, layouts.
- Placement: new skill `.github/skills/experience-builder-architecture/` (SKILL.md plus one references/ file per topic), a 10-15 line summary in exb-source-authority, and a link in AGENTS.md.
- exb-source-authority keeps its file name; its title and description spell out "ArcGIS Experience Builder (ExB)".
- Topics: server (Koa, routes, fake portal REST, app storage, draft vs published, build/export/import), client (jimu packages, dist, SystemJS, your-extensions, webpack), runtime boot, builder vs app windows, AppConfig (checked against app 5), widget config life cycle, themes and templates, export and deploy plus build-configs, this repo's setup links, and a link map of the guide sections (local 1.20 path and online URL).
- Then a separate step: `ai:index` extracts the installed 1.20 guide pages to text under `.ai-context/exb/docs/guide/`.
- Finding: the online guide is now 1.21 (JSAPI 5.1, pnpm column); the version-matched 1.20 guide is installed at `ArcGISExperienceBuilder/exb-api-ref-docs/experience-builder/guide/`.
- DONE 2026-10-04 (uncommitted): skill `.github/skills/experience-builder-architecture/` (SKILL.md + references/server.md, client.md, runtime-and-builder.md, app-config.md, export-deploy-and-repo.md, guide-map.md); exb-source-authority title, description, and "How ExB works (summary)" section; AGENTS.md link; repo memory line.
- Findings to raise with the user (not changed): (a) `npm run build` does not set NODE_ENV, so `zipApp` uses the development service worker; (b) `src/build-configs/settings.json` `zipPath` hard-codes the package version `0.0.1`; (c) the guide recommends `WidgetVersionManager` after 1.13 while `exb-widget-development.instructions.md` rule 7 names only `BaseVersionManager` (OOTB: 25 Base, 8 Widget); (d) importing an app ZIP registers its custom widgets as built-in, which blocks a same-named widget in `src/widgets` from building.
- NEXT: step 7b, `ai:index` extracts the local guide pages to text under `.ai-context/exb/docs/guide/`.
- Goal clarified 2026-10-05: all ExB knowledge extraction (scripts, prompts, skills, instructions, indexes) is an untracked prototype that will become a separate, reusable tool for any configurable vendor codebase. Design for that. Correction: `.github/skills/` and `.github/prompts/` are gitignored (`.gitignore` lines 28-29), so the skill is not tracked. Open: tracked `package.json` `prestart` calls the untracked `.scripts/check-widgets.mjs`.
- 2026-10-05 answers: Q1 prestart removed; `check-widgets.mjs` to be committed as a project build guard (where it runs: pending, recommend `prebuild` strict). Q2 three-layer split approved. Q3 prototype in place. Q4 tool repo in `C:\_DEV\<name>`, linked under `tools/`; name pending.
- DONE 2026-10-05 (prototype, untracked): `.scripts/knowledge/engine/{cli,facts,probes,docs-to-text}.mjs` + `tests/engine.test.mjs` (3 pass; `ai:test` 38 pass); vendor package `.scripts/knowledge/vendors/exb/{vendor.json,facts.json}` (60 facts, all found); project config `.knowledge/{config.json,project-facts.json}` (11 facts). Outputs `.ai-context/exb/facts/<version>.{json,md}`, `changes-<version>.md`, `.ai-context/exb/docs-text/guide/` (160 pages + index.tsv), `.ai-context/project/facts.{json,md}`. `npm run ai:knowledge`; `ai-refresh` runs it after `ai:index`; `build-ai-index.mjs` preserves `facts` and `docs-text` and lists them in REPOSITORY-MAP.
- Finding to ask: `src/build-configs/settings.json` app 5 entries use `zipPath` `cdn//0.0.5` (package version 0.0.1) and `replacementPath` `0//aws` / `0//xc_dev` (app 0's folders). With 0.0.1, `updateZipConfigFile` adds a new `cdn/0.0.5/config.json` and leaves the real one unchanged.
- Separation risks to resolve: tracked `package.json` mixes the @arcgis pins with prototype `ai:*` scripts, `postsetup` -> untracked `ai-refresh.mjs` (breaks `npm run setup` for teammates if committed), and `ts-morph`/`fuse.js` deps; old `build-ai-*.mjs` compute ROOT from `__dirname` (wrong once run through a `tools/` link); vendor-derived content (docs-text, OOTB cards with code excerpts) should not be committed to a shared tool repo without a license check.
- 2026-10-05 answers: check-widgets runs as `prestart --warn` and `prebuild` (strict); documented in docs/Build-Deployments.md and the skill. User fixed app 5 `zipPath` to `cdn//0.0.1`. Still to ask: app 5 `replacementPath` is `0//aws` and `0//xc_dev`, but `src/build-configs/5/aws/` exists (135 KB config.json) and every `src/build-configs/0/*/config.json` is 0 bytes, so `updateConfigs` would replace the app config with an empty file. Tool name: user proposed `codebase-memory`; conflicts with the codebase-memory MCP server, its skills and agents. Next: approve the inventory table, pick a name, then create the tool repo.
- Answers 2026-10-04: (b) documented in docs/Build-Deployments.md and the skill; (c) WidgetVersionManager added to exb-widget-development.instructions.md rule 7, exb-widget-development SKILL.md, widget-patterns.md 8a, jimu-framework-apis managers.md; (d) `.scripts/check-widgets.mjs` + `npm run check:widgets` + `prestart` (warn only), tested with a temp folder (clash, name mismatch, incomplete manifest).
- DEFERRED (a), explain then ask later: ExB's download code (`zipApp`) behaves differently when the environment variable `NODE_ENV` is `production`. With it, the ZIP gets the production service worker (the browser cache script for offline and fast reloads) and custom widgets are rebuilt into `client/dist-download/`. Without it, the ZIP gets the development service worker and copies widgets from `client/dist/`. `npm run build` never sets `NODE_ENV`, so today's ZIPs use the development service worker. Questions to ask: do deployed apps rely on caching or offline behavior; should `npm run build` set `NODE_ENV=production` (for example with `cross-env`); first compare a ZIP built each way.
