---
name: jimu-framework-apis
description: "USE WHEN answering questions, explaining, implementing, debugging, or reviewing Jimu core/framework APIs in ArcGIS Experience Builder (ExB): jimu-core, jimu-arcgis, jimu-data-source, jimu-layouts, jimu-theme, jimu-for-builder, jimu-for-test. Includes managers (DataSourceManager, WidgetManager, MessageManager, SessionManager, MutableStoreManager, AppStateManager), Redux (getAppStore, appActions, observeStore), DataSource/DataRecord/QueryParams/DataSourceStatus, JimuMapView/MapViewManager/JimuMapViewComponent, loadArcGISJSAPIModules, theme tokens, LayoutType, builder settings (getAppConfigAction, AllWidgetSettingProps, onSettingChange), and widget tests. Load for API meaning/signature/import questions and OOTB / OTB framework usage, not only when writing code. Complements exb-source-research, exb-widget-development, and jimu-ui-components."
license: Internal
---

# jimu Framework APIs (non-UI)

Version-accurate reference for the ExB **1.20** framework services — the managers, data-source
system, map/JSAPI bridge, theme, layouts, builder-settings, and testing utilities. For UI components
use the `jimu-ui-components` skill; for the widget authoring workflow use `exb-widget-development`.

**Ground truth:** the `.d.ts` files under `ArcGISExperienceBuilder/client/jimu-*/`. The vendor folder is
**excluded from workspace search** — pass `includeIgnoredFiles: true` to grep it. Read the def before
guessing a signature; several APIs differ from what an older model expects (see the traps below).

For a manager, data-source, map, theme, layout, or test API, begin with
`npm run ai:find -- <API> --members`. The canonical index returns verified import surfaces, exact `.d.ts`
locators, local public docs, and representative compiler-resolved SDK/OOTB usages. Open the referenced
declaration/source before writing code. The graph is static evidence only; review unresolved reports before
making source-wide usage claims.

When an API has a declaration but no readable implementation, or its readable source does not explain the
observed behavior, use [.ai-context/exb/CLIENT-RUNTIME-MAP.md](../../../.ai-context/exb/CLIENT-RUNTIME-MAP.md)
to select one matching minified bundle. This is a narrow, version-specific behavior trace. It supplements
the declaration contract and never replaces OOTB or SDK source as a supported implementation precedent.

## Reference files (load on demand)

- **[references/managers.md](references/managers.md)** — every ExB manager singleton (runtime + builder), import path, `getInstance()` access, key methods, and the `getAppStore()`/`appActions`/`observeStore` store API + `getAppConfigAction().exec()` settings-write chain.
- **[references/data-sources.md](references/data-sources.md)** — the `DataSource` class hierarchy, query/record/selection APIs, `DataSourceComponent`/`MultipleDataSourceComponent`, `UseDataSource`, every data-source implementation type, and data views / local / selection views.
- **[references/jimu-arcgis-maps.md](references/jimu-arcgis-maps.md)** — `JimuMapView`, `MapViewManager`, `JimuLayerView` (+ subtypes), `JimuMapViewComponent`/`JimuLayerViewComponent`, `loadArcGISJSAPIModules`, and the map utils (`zoomToUtils`, `basemapUtils`, `mapViewUtils`, `SnappingUtils`, `featureUtils`, `portalUtils`).
- **[references/theme-layouts-testing.md](references/theme-layouts-testing.md)** — `jimu-theme` (`useTheme`, `styled`, the `theme.sys.*` token model, dual-theme `theme2`), `jimu-layouts` (`LayoutType`, viewers/builders), and `jimu-for-test` (`widgetRender`, `wrapWidget`, `mockTheme`, `*BySelector` queries).

## Top-level facts

- **Managers are singletons:** `SomeManager.getInstance()`. The instance is shared across widget, settings, and builder. The **store is not a class** — use `getAppStore()` (a Redux `Store<IMState>`) and dispatch `appActions.*` action creators.
- **Two exceptions to `getInstance()`:** `BaseVersionManager` is **subclassed/instantiated** (config migrations), and `ConfigManager.getInstance({ intl })` requires an options arg carrying an `IntlShape`.
- **Data queries:** prefer the `<DataSourceComponent>` wrapper in widget render over calling `DataSourceManager` directly; it handles create + load + change subscriptions.
- **Maps:** bind via `<JimuMapViewComponent>` + `onActiveViewChange`; gate on `whenJimuMapViewLoaded()` / `whenAllJimuLayerViewLoaded()` before touching `.view`/`.layer`.
- **Settings persistence:** prefer the injected `props.onSettingChange(partialWidgetJson, outputDataSourcesJson?)`; reach for `getAppConfigAction()...exec()` only for structural edits (create/remove widgets, pages, views).
- **Theme:** read `theme.sys.*` (semantic tokens) — not `theme.ref.*` (raw tonal ramps). `spacing` is callable **and** indexable: `theme.sys.spacing(1, 2)`.

## High-value traps (verified against ExB 1.20 defs — likely wrong in an older model)

- `JimuMapView` has **no `drawGraphicOnMap`**. Draw via `jimuMapView.view.graphics.add(...)` or `addMarkers(markerGroups)`; select via `selectFeaturesByGraphic(...)` / layer-view `selectFeaturesBy*`.
- Runtime layer views are created with `createJimuLayerView(...)` / `addLayerAndCreateJimuLayerView(layer, ds)` — there is **no `createJimuLayerViewByView`**.
- `JimuMapViewComponent` callbacks are `onViewsCreate` / `onViewsChange` / `onActiveViewChange` (singular-verb), **not** `onViewsCreated`.
- `MapViewManager` has **no `getUseMapWidgetIds`** — it's keyed by resolved `JimuMapView` id; `useMapWidgetIds` is a widget prop from `MapWidgetSelector`.
- `DataSourceComponent` surfaces status via `onDataSourceStatusChange` / `onDataSourceInfoChange` — there is **no `onQueryStatusChange`** prop. It only queries when `query` is set (`{}` = query with no filter).
- `LayoutType` (in `jimu-core`) has **7** members incl. `FlexRowLayout = "FLEX_ROW"` — there is **no `CONTROLLER`** member.
- Import `reactiveUtils` cautiously across builder/app iframes — prefer `jimuMapView.watch(getValue, cb)` for cross-context watching.
- Use `MutableStoreManager` for non-immutable/heavy objects (FeatureSets, JSAPI instances) — never put them in the immutable Redux config/state.

## Runtime globals: `window._*` singletons + `window.jimuConfig`

ExB hangs every manager singleton on `window` at runtime, so in DevTools you can grab one directly (no need to `import` or wire a handle): `window._dataSourceManager`, `_mapViewManager`, `_widgetManager`, `_messageManager`, `_sessionManager`, `_serviceManager`, `_utilityManager`, `_extensionManager`, `_dataActionManager`, `_mutableStoreManager`, `_configManager`, `_urlManager`, `_jimuHistory`, `_appStateManager`, `_appStore`, `_appState`, `_idManager`, `_guideManager`, `_arcadeProfileVariableManager`, `_am` (analytics), `_appWindow`. (`_mapViewManager` is set by **jimu-arcgis**, `_theme` by **jimu-theme**; the rest by **jimu-core**.) These are debug/introspection conveniences — in code still call the typed `XxxManager.getInstance()`.

- **Builder cross-iframe gotcha:** in the Builder, `MapViewManager.getInstance()` returns `window._appWindow._mapViewManager` (the app iframe's instance), not the builder window's `window._mapViewManager`. `window._appWindow` is the running app's `window`. When reading `window._*` from a Builder session, prefer `window._appWindow?._x ?? window._x`, or just use `getInstance()` which already resolves this.

**`window.jimuConfig`** (type `JimuConfig`, `jimu-core/lib/types/jimu-config.d.ts`) describes the ExB **edition, environment, and context** — NOT a dev/prod build mode (ExB exposes no runtime build-mode flag; `process.env.NODE_ENV` is build-time only and is not inlined into the browser):
- **Edition / flavor** — ExB ships in three flavors: ArcGIS Online-hosted, **Developer Edition**, and ArcGIS Enterprise/Portal-hosted. `isDevEdition: boolean` (baked at build from webpack `IS_DE`) is true for the Developer Edition (this repo's local runtime); `isInPortal: boolean` (webpack `IS_PORTAL`) is true for the Portal-hosted flavor; both false = AGOL-hosted. `isDevEdition` is an EDITION, not "am I in dev mode" — a Developer-Edition build can still be deployed.
- `hostEnv: 'dev' | 'qa' | 'prod'` — the **Esri ArcGIS Online tier** the hosted app talks to (`prod`→`www.arcgis.com`, `dev`→`devext.arcgis.com`, `qa`→`qaext.arcgis.com`), used only when `!isDevEdition` to compute the portal URL/clientId. This is Esri-internal and is effectively always `'prod'`; it is NOT your app's build environment. (Overridable in dev/qa via the `__env__` query param.)
- **Context** — `isBuilder` / `isInBuilder` (running inside the Builder editing app vs a published experience), `isSite`, `isOutOfExb` (true once an app is downloaded/deployed standalone), `useStructuralUrl`.
- **Misc** — `exbVersion`, `buildNumber` (empty in Developer Edition), `mountPath` / `rootPath` / `baseUrl`, `arcgisJsApiUrl`.

Because none of these means "debug build," gate DEV-ONLY code (debug logging, `window.__x` handles, the instrument tools below) on an explicit opt-in plus a genuinely-local check: `src/libs/debug-introspect.ts` exports `isDebug()` = an explicit `window._isDebug` boolean override, else auto-on only when served from `localhost` (`npm start`), off on every deployed host unless `window._isDebug = true`.

## Debugging opaque managers / view-models at runtime

When a manager, data source, or JSAPI view-model behaves in a way the `.d.ts` doesn't explain, instrument it instead of guessing. `src/libs/debug-introspect.ts` wraps an object's methods and logs each call (`instrumentMethods`/`instrumentAll`), dumps its shape (`describeSignature`), traces events (`traceEvents`) or property access (`traceProps`), awaits a specific internal call (`waitForMethod`), and can hang a `$bve` REPL (refs + toolbelt) on `window` (`installConsoleRepl`). `src/libs/debug-net.ts` logs server traffic — `traceRequests()` via the official `esriConfig.request.interceptors`, `traceFetch()` for raw fetch/XHR. All are **DEV-ONLY**, gated by `isDebug()` (no-op in qa/prod unless `window._isDebug = true`), and return a `restore()`. See the **`exb-widget-development`** skill section *"When types/docs aren't enough: instrument at runtime"* for the full workflow and DevTools techniques.
