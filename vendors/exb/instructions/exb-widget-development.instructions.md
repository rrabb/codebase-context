---
description: "Environment map, framework facts, and golden-path rules for building ArcGIS Experience Builder (ExB) widgets, jimu-library code, and ArcGIS Maps SDK for JavaScript (JSAPI) functionality in this repo. Auto-applies to custom source under src/**."
applyTo: "src/**"
---

# ExB Widget Development — Always-On Context

This repo's custom code runs **inside the ArcGIS Experience Builder (ExB) / jimu framework**. When
building or modifying widgets, settings, libs, or ArcGIS Maps SDK for JavaScript (JSAPI) functionality,
apply the rules below. For deep API surface, patterns, and templates, use the companion skill
`exb-widget-development` (in `.github/skills/exb-widget-development/`).

## Framework facts (this repo)

- **ExB runtime: 1.20.0** (`ArcGISExperienceBuilder/version.json`).
- **ArcGIS Maps SDK for JavaScript: 5.0 line** (types from `client/node_modules/@arcgis/core` 5.0.4; runtime loaded from `arcgisJsApiUrl`: 5.0.12 in `client/dist/*/index.html` under `npm start`, per build config when deployed). **Calcite Components: 5.0.2**. **React 19**. **Node 24** (`.nvmrc`).
- New widgets should set `"exbVersion": "1.20.0"` in `manifest.json`.

## Authoritative sources — consult before guessing

The OOTB widget source, esri exb sdk resources, and installed type definitions are the ground truth for this exact version.
**Before writing a feature, find the OOTB Esri widget or sample from sdk-resources that already does something similar and read its
source** — prefer that over recalling from memory:

- always search source code for authoritative esri-authored widgets: `ArcGISExperienceBuilder\client\dist\widgets\**` (you can search for ts, tsx, and md files)
- always check the `references/ootb-widget-index.md` for indexed tasks and patterns from the OOTB widgets.
- always search source for authoritative Esri sdk-resources sample widgets/patterns: `ArcGISExperienceBuilder/sdk-resources/**` (you can search for ts, tsx, and md files)
- always check the `references/sdk-sample-index.md` for indexed tasks and patterns from the Esri sdk-resources sample widgets.
- Each widget has a **manifest.json file**, spec/type def: `ArcGISExperienceBuilder\client\jimu-core\lib\types\manifest.d.ts`
- **OOTB widget source (the primary grounding):** `ArcGISExperienceBuilder/client/dist/widgets/arcgis/*` (map widgets) and `ArcGISExperienceBuilder/client/dist/widgets/common/*` (data/layout widgets) ship readable TypeScript under each `src/`. Indexed by task in `.github/skills/exb-widget-development/references/ootb-widget-index.md`. This tree is read-only reference — never edit it.
- jimu framework type defs: `ArcGISExperienceBuilder/client/jimu-*/` — `jimu-arcgis`, `jimu-core`, `jimu-data-source`, `jimu-for-builder`, `jimu-for-test`, `jimu-icons`, `jimu-layouts`, `jimu-theme`, `jimu-ui`.
- Review all the type definition files for jimu-core  library at: `ArcGISExperienceBuilder\client\jimu-core\**`
- Managers live in `ArcGISExperienceBuilder/client/jimu-core/lib/*-manager.d.ts` — e.g. `DataSourceManager` (`data-source-manager.d.ts`) for map/layers/data, `AppStateManager` (`app-state-manager.d.ts`) + `AppState` (`lib/types/state.d.ts`) + `AppStore` (`store.d.ts`) for app state; plus `WidgetManager`, `MessageManager`, `SessionManager`, `ServiceManager`, `ExtensionManager`, `DataActionManager`, `UrlManager`, etc. The `jimu-framework-apis` skill indexes them all (+ data sources, JimuMapView/JSAPI, theme, layouts, testing).
- Existing repo widgets to mirror: `src/widgets/schema-switcher`, `src/widgets/grid-overlay`, `src/widgets/branch-version-editor`, `src/widgets/simple`.
- Repo memory: `/memories/repo/exb-runtime-patterns.md` holds hard-won gotchas — read it for map-binding, type-identity, and settings-picker pitfalls.

### Pick the precedent automatically, then escalate if needed

- **The user need not name a template.** Given a task, start with `npm run ai:find -- <API-or-capability>` for verified API/member identities, public docs/Storybook, and compiler-resolved SDK/OOTB evidence. Then find the closest widget precedent by capability using `.ai-context/exb/dist-widgets/catalog.tsv` (what each widget is), `manifests.tsv` (publish/consume messages, data actions, properties, extensions), `module-usage.tsv` / `jsx-usage.tsv` (which widgets use an API / render a component), `components-props.tsv` + `fields.tsv` (shapes to reuse). Compare 1-3 candidates, pick the optimal, cite it, then adapt into `src/`. Prefer a specific widget only when the user names one.
- **Do not limit yourself to local sources.** If the index + local vendor source have no close match (or the pattern cannot be verified), do NOT force a poor local fit or invent an API. Escalate to official Esri sources: the ExB sdk-resources GitHub repo, the ExB Developer Guide + API Reference, the ArcGIS Maps SDK for JavaScript samples/reference, Calcite Components docs, and the jimu-ui Storybook (links under 'Web references' below). Cite what you used and mark anything still unverified with `⚠️ NOT VERIFIED IN LOCAL EXB SOURCES`.

## Golden-path rules

1. **Import shared libs from `jimu-*`, not raw npm.** Use `import { React, hooks } from 'jimu-core'` (React comes from `jimu-core`). Use jimu-ui / Calcite for UI. Only import `@arcgis/core` for JSAPI classes.
2. **Widget shape:** `manifest.json`, `config.ts` (typed `Config` + `IMConfig`), `src/runtime/widget.tsx` (default `Widget`), optional `src/setting/setting.tsx` (default `Setting`), `icon.svg`, `src/runtime/translations/default.ts`.
3. **Config is immutable** (`seamless-immutable`). Type it `export type IMConfig = ImmutableObject<Config>`. Read arrays with `Array.from(config.foo)`; in settings write with `config.set('foo', value)`. `ImmutableArray<string>` is not assignable to `readonly string[]`.
4. **Bind the map via `JimuMapViewComponent` + `onActiveViewChange`** (not `MapViewManager.getAllJimuMapViewIds()[0]`). Gate on `props.useMapWidgetIds?.[0]`. See `src/widgets/schema-switcher/src/runtime/useJimuMapView.tsx`.
5. **Declare dependencies in `manifest.json`.** Any widget using the map/JSAPI needs `"dependency": ["jimu-arcgis"]` and, if its settings use map/layer pickers, `"settingDependency": "jimu-arcgis"`. This also enables the `esri/*` path alias (`import Basemap from 'esri/Basemap'`) and the ambient `__esri` namespace.
6. **Settings** import from `jimu-for-builder` (`AllWidgetSettingProps`) and `jimu-ui/advanced/setting-components` (`MapWidgetSelector`, `JimuMapViewSelector`, `JimuLayerViewSelector`, `SettingSection`, `SettingRow`). Persist via `props.onSettingChange({ id, config })` / `{ id, useMapWidgetIds }`.
7. **Migrate config with `src/version-manager.ts`** whenever the `Config` structure changes, attached via `Widget.versionManager = versionManager`. Extend `WidgetVersionManager` (`jimu-core/lib/base-widget.d.ts`; recommended after 1.13 by the local guide `make-widgets-backward-compatible`) when an upgrade also changes the widget JSON or output data sources; `BaseVersionManager` (config only) still works and most OOTB widgets use it (25 of 33 `version-manager.ts` files on 2026-10-04). Use `props.state`/`WidgetState` + `controllerWidgetId` for lifecycle/visibility.
8. **CSS class naming:** `widget-<widget-name>` for runtime, `widget-setting-<widget-name>` for settings. (OOTB widgets often use emotion `css`/`style.ts` instead — both are valid.)
9. **Type-check authoritatively** (strictNullChecks is off in the real build):
   `npm run tscheck:bve` (from the repo root — runs the client's tsc against the root `tscheck-bve.json`).
   The editor / `get_errors` can show `strictNullChecks` null-assignment noise and stale diagnostics — confirm with `tsc`.
   The **editor** type-checks `src/**` via `src/tsconfig.json` (a different config than the build). The ambient `__esri` global comes from `@arcgis/core/interfaces.d.ts` (deprecated but present in v5); `/// <reference types="arcgis-js-api" />` is dead (no such package). If the editor reports `Cannot find namespace '__esri'`, ensure `src/tsconfig.json` `include`s that interfaces file.
10. **Webpack watch caveat:** restart the client dev server after adding/removing/renaming files, adding libraries, or editing a widget `manifest.json`.
11. **Widget lifecycle/state** (see skill patterns 8b + repo `src/widgets/branch-version-editor/src/runtime/components/use-widget-lifecycle.ts`): read framework signals — `props.state` (`WidgetState` Opened/Active/Closed/Hidden; **`undefined` = normal shown**), `props.windowState` (min/max), `props.controllerWidgetId`, and `ViewportVisibilityContext` (from `jimu-layouts/layout-runtime`; browser-scroll intersection, NOT container hide — stays `true` in a Section/panel). Enable the matching manifest flags `needActiveState`/`needHiddenState`/`watchViewportVisibility` or the state never fires. In a **Section + View Navigation** placement visibility is `HIDDEN` ⇄ `undefined` (react to that suspend/resume boundary); `ACTIVE`/`OPENED` are transient churn and `CLOSED` is controller-only. `props.state` equals `widgetsRuntimeInfo[id].state` — use `useSelector` only to read *another* widget's state.
12. **When the `.d.ts` + docs don't explain the runtime behavior, instrument at runtime instead of guessing.** For opaque OOTB/JSAPI/Calcite internals (e.g. *which* method a native button actually calls, or when a public API seems to no-op), temporarily wrap the object's methods and read the console. Use `src/libs/debug-introspect.ts` (`instrumentMethods`/`instrumentAll`, plus `describeSignature`/`traceProps`/`waitForMethod`/`installConsoleRepl`) and, for server calls, `src/libs/debug-net.ts` (`traceRequests` via `esriConfig.request.interceptors`, `traceFetch`): expose the object for DevTools (a debug `(window as any).__x = editor`), instrument the candidates (`editor.activeWorkflow`, `editor.viewModel`), trigger the native interaction, note the method(s) that fire, then replicate that call in your wrapper UI and `restore()`. This is how the create-features finalize was found to be the undocumented `activeWorkflow.save()` (not `commit()`). DEV-ONLY - always `restore()`; never ship instrumented objects; guard discovered internals with `typeof obj.method === 'function'` since they are version-fragile. Gate all such debug code with `isDebug()` (from `debug-introspect.ts`: honors an explicit `window._isDebug`, else auto-on only at `localhost`) so it no-ops on deployed hosts; the tools already self-gate. Note there is no ExB runtime "dev build" flag - `window.jimuConfig.isDevEdition` is the ExB edition (Developer Edition vs AGOL-/Portal-hosted) and `hostEnv` is the Esri AGOL tier (devext/qaext/www), neither means "debug build". In DevTools the framework managers are pre-exposed as `window._dataSourceManager`/`_mapViewManager`/`_widgetManager`/... and env flags live on `window.jimuConfig` (see the `jimu-framework-apis` skill). See the `exb-widget-development` skill for the full workflow, the DevTools techniques, and a paste-in snippet.

## Web references

- Github repo of SDK resources (code samples/patterns/description): https://github.com/esri/arcgis-experience-builder-sdk-resources (may also be available locally under `ArcGISExperienceBuilder/sdk-resources`)
- ExB API reference: https://developers.arcgis.com/experience-builder/api-reference (jimu-for-builder, jimu-for-test, jimu-theme, jimu-ui, jimu-arcgis, jimu-core)
- ExB jimu-core ref: https://developers.arcgis.com/experience-builder/api-reference/jimu-core/
- ExB jimu-arcgis ref: https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/
- jimu-ui Storybook: https://developers.arcgis.com/experience-builder/storybook/
- Guide — core concepts: https://developers.arcgis.com/experience-builder/guide/core-concepts/
- Guide — getting started with widget dev: https://developers.arcgis.com/experience-builder/guide/getting-started-widget/
- Guide — widgets overview: https://developers.arcgis.com/experience-builder/guide/widgets-overview/


