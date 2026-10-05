---
name: exb-widget-development
description: "Build, extend, and debug ArcGIS Experience Builder (ExB) widgets and functionality in this repo. USE WHEN: creating or editing an ExB widget (runtime/settings/config/manifest), working with the jimu framework (jimu-core, jimu-arcgis, jimu-ui, jimu-data-source, jimu-for-builder, jimu-layouts, jimu-theme, jimu-icons), using ExB managers (DataSourceManager, AppStateManager, AppStore, MessageManager, WidgetManager, SessionManager), binding a Map widget / JimuMapView, using Calcite components inside ExB, wiring widget settings/config, ExB i18n, or integrating the ArcGIS Maps SDK for JavaScript (JSAPI / @arcgis/core / __esri / esri/* alias) inside a widget. Mentions of ExB, Experience Builder, jimu, JimuMapView, widget.tsx, setting.tsx, IMConfig, useMapWidgetIds, or __esri should trigger this skill."
license: Internal
---

# ExB Widget Development

Authoritative, version-accurate workflow for building ArcGIS Experience Builder widgets in this repo.
Pair this with the always-on instruction `.github/instructions/exb-widget-development.instructions.md`
and the repo memory `/memories/repo/exb-runtime-patterns.md`.

**Runtime here is ExB 1.20.0** → ArcGIS Maps SDK for JavaScript 5.0.x, Calcite 5.0.x, React 19, Node 24.

## Golden rule: ground in the OOTB source first

The installed `.d.ts` files **and the readable TypeScript source of the OOTB Esri widgets** are the
source of truth for this exact version. **Before recalling an API from memory or writing a feature,
find the OOTB widget that already does something similar and read its source** — signatures and
patterns change between ExB releases. The OOTB widgets live under
`ArcGISExperienceBuilder/client/dist/widgets/**` (the `arcgis/*` and `common/*` trees) and are indexed
by task in **[references/ootb-widget-index.md](references/ootb-widget-index.md)**.

| Need | Look in |
|---|---|
| OOTB widget implementations | `ArcGISExperienceBuilder/client/dist/widgets/**` (ignore `node_modules`) |
| Framework/base classes, managers, store, hooks | `ArcGISExperienceBuilder/client/jimu-core/` |
| Map/view/layer bindings, `JimuMapView`, JSAPI loader | `ArcGISExperienceBuilder/client/jimu-arcgis/` |
| Data sources (query, records, types) | `ArcGISExperienceBuilder/client/jimu-data-source/` |
| Settings-side helpers & props | `ArcGISExperienceBuilder/client/jimu-for-builder/` |
| UI components (basic + advanced) | `ArcGISExperienceBuilder/client/jimu-ui/` |
| Icons, layouts, theming, test utils | `jimu-icons/`, `jimu-layouts/`, `jimu-theme/`, `jimu-for-test/` |
| Minimal single-concept examples | Esri `sdk-resources/widgets/**`, indexed by task in **[references/sdk-sample-index.md](references/sdk-sample-index.md)** |
| Proven local patterns | `src/widgets/{schema-switcher,grid-overlay,branch-version-editor,simple}` |

## When types/docs aren't enough: instrument at runtime

The `.d.ts` and public docs describe **shape**, not always **behavior** - they won't tell you which
internal method a native Editor/Calcite button invokes, or why a public API appears to no-op. When you
are stuck, do not guess or reverse-engineer minified code: **wrap the object's methods and watch the
console** to see what actually fires, then replicate that call.

Utility: **`src/libs/debug-introspect.ts`** - `instrumentMethods(obj, { label })` wraps every function
on an object (own + prototype chain) to log each call + args and returns a `restore()`; `instrumentAll({...})`
does several at once. Companions in the same file: `describeSignature(obj)` (dump method/accessor/field names
+ constructor chain - run this FIRST on a no-`.d.ts` object), `traceEvents(evented)` (log an esri Evented's
`emit`/`on`), `snapshot(obj)` + `diffSnapshots(before, after)` (what did an interaction mutate?), an
`instrumentMethods` `logStack: true` option (who called a method), `traceProps(obj)` (a logging `Proxy`
for get/set), `waitForMethod(obj, 'save')` (a Promise that resolves the next time a method fires), and
`installConsoleRepl({ editor, dsm })` (hangs `$bve` = your refs + the whole toolbelt on `window` so you
can explore from DevTools). For **server-side** behavior use **`src/libs/debug-net.ts`**: `traceRequests()`
logs every ArcGIS REST call via the official `esriConfig.request.interceptors`, and `traceFetch({ xhr: true })`
covers non-esri fetch/XHR (tiles, OAuth, CDN). **DEV-ONLY** (they mutate objects/globals) - every tool is
gated by `isDebug()` (same file) and no-ops unless served from `localhost` (`npm start`) or you set
`window._isDebug = true` (there is no ExB runtime "dev build" flag - `jimuConfig.isDevEdition`/`hostEnv` are
edition/AGOL-tier, not build mode); each still returns a `restore()` you should call, and never ship
instrumented objects.

Workflow:
1. Get a handle to the object. In widget code you already have it; for DevTools, expose a debug handle
    (e.g. `if (isDebug()) (window as any).__x = editor` in an effect, cleared on unmount). Many framework
    objects are ALREADY on `window` in dev - `window._dataSourceManager`, `_mapViewManager`, `_widgetManager`,
    `_messageManager`, ... (full list + `window.jimuConfig` env flags in the `jimu-framework-apis` skill), so
    you can often grab a manager straight from the console.
2. Instrument the likely owners, then trigger the native interaction. In code during dev:
    ```ts
    const restore = instrumentAll({ workflow: editor.activeWorkflow, vm: editor.viewModel });
   // ...click the native button, read the [instrument] logs...
    restore();
    ```
    Or a self-contained DevTools paste-in (no import needed):
    ```js
    const wrap = (o, label) => { for (let p = o; p && p !== Object.prototype; p = Object.getPrototypeOf(p))
      for (const k of Object.getOwnPropertyNames(p)) { const d = Object.getOwnPropertyDescriptor(p, k);
        if (d && typeof d.value === 'function' && k !== 'constructor' && !Object.prototype.hasOwnProperty.call(o, k)) {
          const f = o[k]; o[k] = function (...a) { console.log('[native]', label + '.' + k, a); return f.apply(this, a); }; } } };
    wrap(window.__x.activeWorkflow, 'workflow'); wrap(window.__x.viewModel, 'vm');
    ```
3. Read the `[native]`/`[instrument]` logs, find the method that does the real work, call it directly,
    then `restore()`.

Real example (branch-version-editor): the create-features footer **Save** button turned out to call the
**undocumented** `activeWorkflow.save()` (validate -> `commit()` -> `viewModel._applyEdits` -> reset/restart),
while the public `Workflow.commit()` was a no-op on its own. This was only discoverable by instrumenting.
Prefer a public API when one exists; treat discovered internals (underscore-prefixed or absent from the
`.d.ts`) as version-fragile and guard them (`typeof obj.method === 'function'`) with a fallback.

### Other tactics (when method instrumentation isn't enough)

- **Network** - `traceRequests()` (in `src/libs/debug-net.ts`) logs every ArcGIS REST call via the
  official `esriConfig.request.interceptors`; `traceFetch({ xhr: true })` covers everything else
  (tiles, OAuth, CDN). Use these to learn WHAT a workflow sends to the server after instrumentation
  tells you WHICH method runs.
- **Property access** - `traceProps(obj)` returns a logging `Proxy` (get/set/delete); `waitForMethod(obj,
  'save')` resolves the next time a method fires (await an internal call); `installConsoleRepl({ editor,
  dsm })` hangs `$bve` (refs + toolbelt) on `window` for ad-hoc DevTools exploration.
- **DevTools built-ins** - `getEventListeners($0)` (what's bound to the selected element), `monitorEvents($0,
  'click')` (log events live), `queryObjects(Ctor)` (every live instance of a constructor). Under Sources ->
  Breakpoints: "Event Listener Breakpoints -> Mouse -> click" steps into a native handler; "XHR/fetch
  Breakpoints" breaks on a URL substring; right-click a DOM node -> "Break on -> subtree/attribute
  modifications" to catch what re-renders a panel.
- **Source maps / pretty-print** - check whether `@arcgis/core` ships `*.js.map`; if so enable Source Maps
  for readable stepping. If not, use DevTools `{ }` pretty-print on the minified file, then set breakpoints.
- **Grep the shipped source** - `@arcgis/core/**/*.js` and `jimu-*/**` are minified but greppable once you
  know a name; search with `includeIgnoredFiles: true` (the vendor tree is git-ignored). This is how the
  native create-features panel render path (`CreateFeaturesPanelContent`) was located.
- **Harvest scattered `.d.ts`** - when types DO exist but are spread across the vendor tree, dispatch an
  Explore subagent to map the API surface (see the `jimu-framework-apis` skill).
- **Drive the running app** - the integrated browser tools (`open_browser_page`, `read_page`,
  `screenshot_page`, `click_element`, `run_playwright_code`) work against `npm start`. Observed
  2026-08-07:
  - The dev server's self-signed certificate makes `open_browser_page` fail with
    `net::ERR_CERT_AUTHORITY_INVALID`. Open `data:text/html,<h1>x</h1>` first, then navigate with
    `run_playwright_code`: `await page.goto('https://localhost:3001/experience/<id>', { waitUntil: 'domcontentloaded' })`.
  - The browser reuses your signed-in ArcGIS session, so no OAuth prompt appears.
  - `page.evaluate` can read `window.jimuConfig` and the `window._*` managers.
  - The browser scales `setViewportSize` by about 0.8, so request about 1.25x the target width.
  - Resizing into ExB's small-screen layout remounts widgets and drops unsaved edits.
  - Keep `page.evaluate` results small. Results over about 8 KB go to a temp file.

## Reference files (load on demand)

- **[references/ootb-widget-index.md](references/ootb-widget-index.md)** — index of the OOTB Esri widget source (`dist/widgets/arcgis/*`, `common/*`) by task, plus the conventions verified from that source. **Start here to ground any new feature in a real, working example.**
- **[references/sdk-sample-index.md](references/sdk-sample-index.md)** - task-indexed **router** for the Esri **sdk-resources** sample widgets (`ArcGISExperienceBuilder/sdk-resources/widgets/**`): concise cards + links to 9 rich per-category files under `references/sdk-samples/` (data sources, data actions/messages/state, web components, feature layer, map/view, layouts, code-sharing, workers/i18n/tests, demos). Rich cards carry exact API signatures, real code snippets, builder-vs-runtime split, lifecycle/timing, cleanup, manifest reqs, and gotchas. Includes a **briefing-tool deep-dive set** (`references/sdk-samples/briefing-tool/`) mining reusable patterns: **restyling vendor/OTB web components via MutationObserver + shadow-DOM piercing**, widget-scoped Context+reducers, CalciteFlow wizard, print composition, session save + cross-widget communication, and Esri internal-registry + asset-path wiring. **Use when you need a clean how-to for one concept**; cross-check the OOTB index for production patterns.
- **[references/jimu-and-ui-reference.md](references/jimu-and-ui-reference.md)** — the jimu library map, exact import paths, the jimu-ui + Calcite component catalog, and the ExB managers (DataSourceManager, AppStateManager, AppStore, etc.).
- **[references/widget-patterns.md](references/widget-patterns.md)** — annotated, copy-ready templates for `manifest.json`, `config.ts`, runtime `widget.tsx`, `setting.tsx`, the map-view hook, i18n, and data sources — drawn from this repo's real widgets.
- **[references/arcgis-jsapi-integration.md](references/arcgis-jsapi-integration.md)** — ArcGIS Maps SDK for JavaScript inside ExB: the `esri/*` alias, type identity and the root `@arcgis/core` pin, map/view binding, `reactiveUtils`, basemap/layer edits, and repo gotchas.
- **[references/editor-calcite-flow.md](references/editor-calcite-flow.md)** — the OTB `Editor` widget's runtime state machine + workflow API (`activeWorkflow`, `save()`) and its `calcite-flow` / `calcite-flow-item` slot anatomy, with recipes to relabel/hide/rearrange the OTB UI and inject your own. **Load before customizing the Editor's create/update UI.**

**Related skill:** for the full jimu-ui component catalog (props + examples) and the advanced/setting-components used in Settings panels, use the **`jimu-ui-components`** skill. For the non-UI framework — ExB managers, the data-source system, JimuMapView/JSAPI, theme, layouts, and widget testing — use the **`jimu-framework-apis`** skill.

## Anatomy of a widget

```
src/widgets/<name>/
  manifest.json                 # identity, exbVersion, dependency, settingDependency, defaultSize, publishMessages, messageActions
  icon.svg                      # widget icon
  config.json                   # default config values (optional)
  config.ts                     # Config interface + enums + IMConfig = ImmutableObject<Config>
  src/
    version-manager.ts          # BaseVersionManager config migrations (OOTB convention; add on config-shape changes)
    runtime/
      widget.tsx                # default export Widget: (props: AllWidgetProps<IMConfig>) => …; often Widget.versionManager = versionManager
      style.ts                  # emotion getStyles(theme) (optional)
      components/               # sub-components (optional)
      translations/default.ts   # i18n strings (optional)
    setting/
      setting.tsx               # default export Setting: (props: AllWidgetSettingProps<IMConfig>) => …
    data-actions/               # data action classes, declared in manifest (optional)
    message-actions/            # message action handlers, declared in manifest (optional)
  tests/                        # jest + jimu-for-test (optional)
```

This mirrors the OOTB widgets (`arcgis/draw`, `common/edit`, `common/list`). Include only the folders
your widget needs — `src/widgets/simple` is the minimal shape.

## Build workflow

1. **Scaffold** by copying `src/widgets/simple` (barebones) or a closer match, then rename in `manifest.json` (`name`, `label`, `description`) and set `"exbVersion": "1.20.0"`.
2. **Model config** in `config.ts`: define `Config`, export `IMConfig = ImmutableObject<Config>`. Keep runtime state out of config.
3. **Declare dependencies** in `manifest.json`: add `"dependency": ["jimu-arcgis"]` for map/JSAPI use; add `"settingDependency": "jimu-arcgis"` if settings use map/layer pickers. Declare any extra CDN/JSAPI needs here too.
4. **Build the runtime** (`widget.tsx`): `import { React, type AllWidgetProps } from 'jimu-core'`. Bind the map with `JimuMapViewComponent` + `onActiveViewChange` (see hook pattern). Read config via `props.config` (use `Array.from(...)` for arrays).
5. **Build settings** (`setting.tsx`): `import type { AllWidgetSettingProps } from 'jimu-for-builder'` and pickers from `jimu-ui/advanced/setting-components`. Persist with `props.onSettingChange({ id, config: props.config.set('key', value) })` and `{ id, useMapWidgetIds }`.
6. **Style** with the `widget-<name>` / `widget-setting-<name>` class convention; prefer Calcite + jimu-ui + theme CSS vars (`var(--sys-color-…)`).
7. **i18n**: keep strings in `runtime/translations/default.ts`; read with `props.intl.formatMessage({ id, defaultMessage })` or `hooks.useTranslation`.
8. **Type-check authoritatively:** `npm run tscheck:bve` (from the repo root). `strictNullChecks` is off in the real build, so ignore editor null-assignment noise; confirm with `tsc`.
9. **Run/iterate:** `npm start` (root) → https://localhost:3001. Restart the client dev server after adding/removing/renaming files, adding libs, or editing `manifest.json`.

## Non-negotiable rules

- **React comes from `jimu-core`** (`import { React } from 'jimu-core'`), not from `'react'`. Same for `ReactRedux`, `Immutable`, `hooks`, and most shared libs.
- **Config is immutable** (`seamless-immutable`). Never mutate `props.config`; use `.set()` / `.setIn()`. `ImmutableArray<T>` ≠ `readonly T[]` — convert with `Array.from`.
- **Bind maps through `JimuMapViewComponent`/`onActiveViewChange`**, not by grabbing `MapViewManager.getAllJimuMapViewIds()[0]` — the useMapWidget id can differ from internal JimuMapView ids.
- **Managers are singletons:** always `SomeManager.getInstance()`. The instance is shared between runtime and settings.
- **Import JSAPI classes through `esri/*`.** They share types with the ambient `__esri` namespace, so `view.map.basemap = new Basemap()` needs no cast. A bare `@arcgis/core/...` import in `src/` resolves to the repo root copy, which matches only while the root `package.json` pins the ExB version. See the JSAPI reference.
- **Migrate config with a `version-manager.ts`.** When you change the `Config` structure, add a `BaseVersionManager` version entry and attach it (`Widget.versionManager = versionManager`) so saved apps upgrade - the OOTB convention (`arcgis/draw`, `common/edit`). Use `WidgetVersionManager` when the upgrade must also change the widget JSON or output data sources (see `references/widget-patterns.md` 8a).
- **Respect widget lifecycle.** Use `props.state` (`WidgetState`) and `props.controllerWidgetId` for visibility rather than assuming the widget is always mounted/active.
- **Don't edit `ArcGISExperienceBuilder/**`** (vendor runtime) except when a task explicitly requires it. Custom code lives under `src/`. (Note: `dist/widgets/` is read-only OOTB source for reference — never edit it.)

## When stuck

1. **Find the OOTB widget that does something similar** via [references/ootb-widget-index.md](references/ootb-widget-index.md), then read its source under `ArcGISExperienceBuilder/client/dist/widgets/{arcgis,common}/<widget>/src`. Grep it for the exact API.
2. Read the relevant `.d.ts` in the matching `jimu-*` package.
3. Check `/memories/repo/exb-runtime-patterns.md` for a recorded gotcha.
4. Consult the SDK resources repo and API reference (links in the instruction file). For JSAPI class docs, use Context7 / the ArcGIS code-samples MCP if available.
