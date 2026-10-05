# SDK Sample Index (Esri sdk-resources widgets)

Task-indexed **router** for the Esri-shipped sample widgets under
`ArcGISExperienceBuilder/sdk-resources/widgets/**`. These are **curated, minimal, single-concept
teaching samples** - the complement to the full production OOTB widgets indexed in
[ootb-widget-index.md](ootb-widget-index.md). When you need to learn *how to do one thing cleanly*,
start here; when you need a *version-accurate production pattern*, cross-check the OOTB index.

**Two-tier layout:** this file is the lean router - each section below has a concise at-a-glance card
per sample plus a link to its **rich card**. The rich cards (exact API signatures, real code snippets,
builder-vs-runtime split, lifecycle/timing, cleanup, manifest reqs, gotchas, lift-into-repo notes) live
in the per-category files under [sdk-samples/](sdk-samples/). Open only the category you need so you
never pay context for the rest.

## Rich card files (load on demand)

1. [sdk-samples/01-map-view-binding.md](sdk-samples/01-map-view-binding.md) - 7 cards
2. [sdk-samples/02-feature-layer-selection.md](sdk-samples/02-feature-layer-selection.md) - 6 cards
3. [sdk-samples/03-data-sources.md](sdk-samples/03-data-sources.md) - 6 cards
4. [sdk-samples/04-data-actions-messaging-state.md](sdk-samples/04-data-actions-messaging-state.md) - 6 cards
5. [sdk-samples/05-web-components.md](sdk-samples/05-web-components.md) - 5 cards
6. [sdk-samples/06-third-party-tooling.md](sdk-samples/06-third-party-tooling.md) - 7 cards
7. [sdk-samples/07-layouts.md](sdk-samples/07-layouts.md) - 2 cards
8. [sdk-samples/08-code-sharing.md](sdk-samples/08-code-sharing.md) - 4 cards
9. [sdk-samples/09-demos-complex.md](sdk-samples/09-demos-complex.md) - 4 cards
   - [sdk-samples/briefing-tool/](sdk-samples/briefing-tool/README.md) - deep-dive set (6 files): vendor web-component restyling, Context/state, wizard flow, print composition, session save + widget communication, internal registry + asset paths

## Version caveat (read first)

- All samples target **exbVersion 1.20.0** EXCEPT two that predate it at **1.17.0**:
  `bmt-layout-manager` and `briefing-tool`. Do NOT copy them verbatim - validate every import/signature
  against installed 1.20 `.d.ts` first (briefing-tool also pins `@arcgis/*-components` v4.33 + html2canvas).
- Samples are **read-only vendor reference** (Apache-licensed). Do not edit in place; lift patterns into
  `src/widgets/**` (and apply repo code-style: semicolons + short-circuit guards).
- Rich-card badges: `Verified vs 1.20: yes` = signatures confirmed against 1.20 `.d.ts`; `check` = works
  but reflects an older idiom (e.g. ref-based web components); `1.17 - validate` = predates 1.20.

## Taxonomy (9 categories)

1. [Map / view binding](#1-map--view-binding) -> [rich](sdk-samples/01-map-view-binding.md)
2. [Feature layer / selection](#2-feature-layer--selection) -> [rich](sdk-samples/02-feature-layer-selection.md)
3. [Data sources](#3-data-sources) -> [rich](sdk-samples/03-data-sources.md)
4. [Data actions / messaging / state / expressions](#4-data-actions--messaging--state--expressions) -> [rich](sdk-samples/04-data-actions-messaging-state.md)
5. [Web components](#5-web-components) -> [rich](sdk-samples/05-web-components.md)
6. [Third-party libs / tooling / i18n / testing](#6-third-party-libs--tooling--i18n--testing) -> [rich](sdk-samples/06-third-party-tooling.md)
7. [Layouts](#7-layouts) -> [rich](sdk-samples/07-layouts.md)
8. [Code sharing](#8-code-sharing) -> [rich](sdk-samples/08-code-sharing.md)
9. [Baseline demos + complex references](#9-baseline-demos--complex-references) -> [rich](sdk-samples/09-demos-complex.md)

## Recurring teaching axes

- **Class vs function** of the same concept: `feature-layer-class`/`feature-layer-function`,
  `get-map-coordinates-class`/`get-map-coordinates-function`, `demo`/`demo-function`.
- **Three code-sharing mechanisms**: `share-code-chunk` (dynamic `import()` webpack chunk),
  `share-code-entry` (static aliased import, inlined), `share-code-entry-dynamic` (jimu `moduleLoader`).
- **Web-component evolution**: `use-calcite-components` -> `use-map-components` (ref-based, 1.15-1.18)
  -> `use-web-components-19` (React 19 property-binding, the current recommended pattern).

---

## 1. Map / view binding

### map-view
- **Teaches:** Build a MapView from a WebMap data source and register it as a JimuMapView.
- **Key files:** `src/runtime/widget.tsx`, `src/setting/setting.tsx`
- **Pattern:** class widget; `DataSourceComponent` + `onDataSourceCreated`; `new MapView(...)`;
  `MapViewManager.createJimuMapView()`; extent <-> URL via `jimuHistory`; `static mapExtraStateProps`
  injects `queryObject` from Redux.
- **APIs:** `DataSourceComponent`, `MapViewManager`, `jimuHistory`, esri `MapView`/`WebMap`/`Extent`,
  `IMUrlParameters`.
- **Manifest:** `dependency: "jimu-arcgis"`, `canCreateMapView: true`.
- **Code-only knowledge:** parses extent from URL search params; watches extent and serializes back to
  URL; `mapContainer` ref is the DOM node passed to the MapView constructor.

### showextent
- **Teaches:** Watch extent of an existing map view (no new MapView).
- **Key files:** `src/runtime/widget.tsx`
- **Pattern:** class `PureComponent`; `JimuMapViewComponent` + `onActiveViewChange`;
  `watch(jimuMapView.view, 'extent', ...)`; cleanup in `componentWillUnmount`.
- **APIs:** `JimuMapViewComponent`, `JimuMapView`, `__esri.WatchHandle`.
- **Manifest:** `dependency: "jimu-arcgis"`.
- **Code-only knowledge:** MUST `.remove()` watch handles to avoid leaks; `isConfigured()` guards
  `useMapWidgetIds`.

### get-map-coordinates-class
- **Teaches:** Live lat/lon + scale + zoom readout (class).
- **Key files:** `src/runtime/widget.tsx`, `src/config.ts`
- **Pattern:** dual listeners - `extent` watch AND `pointer-move` event; `view.toMap()` converts screen
  to geographic coords; conditional render via `showScale`/`showZoom` config.
- **APIs:** `JimuMapViewComponent`, esri `Point`, `view.toMap()`.
- **Code-only knowledge:** separate lat/lon state for extent vs pointer; ready-flag gates first render.

### get-map-coordinates-function
- **Teaches:** Same as above, functional/hooks variant.
- **Pattern:** `useState` per value; identical dual listeners.
- **Code-only knowledge / GOTCHA:** the function variant has **no watch-handle cleanup** (handles
  accumulate = leak); the class variant cleans up. Prefer wiring `useEffect` cleanup when lifting this.

### js-api-widget
- **Teaches:** Embed an ArcGIS web component (`arcgis-legend`) imperatively.
- **Pattern:** functional; `useRef` + `useEffect`; `document.createElement('arcgis-legend')`; assign
  `.view`; recreate on active-view change.
- **APIs:** `arcgis-map-components`, `JimuMapViewComponent`.
- **Code-only knowledge:** call `.destroy()` before recreating; guard DOM node existence before
  `removeChild`.

### view-layers-toggle
- **Teaches:** Add/remove FeatureLayers on the map from a dropdown.
- **Pattern:** class; `map.remove(old)` then `map.add(new)`; layer URLs in config (newline-delimited).
- **APIs:** esri `FeatureLayer`, `JimuMapViewComponent`.
- **Code-only knowledge:** bare `new FeatureLayer({url})` auto-fetches metadata; must remove before
  re-adding to avoid dupes; no invalid-URL error handling.

### add-layers
- **Teaches:** Lazy-load JSAPI modules and add a layer with optional zoom-to-extent.
- **Pattern:** class; `loadArcGISJSAPIModules()` only on button press; `layer.on('layerview-create')`;
  `layer.createQuery()` + `queryExtent()`; emotion `css`.
- **APIs:** `loadArcGISJSAPIModules`, esri `FeatureLayer`/`Query`/`SpatialReference`.
- **Code-only knowledge:** module load returns a tuple matching import order; stashes classes on
  `this.*` after load; extent query uses wkid 102100.

---

## 2. Feature layer / selection

### feature-layer-class
- **Teaches:** Query + render records from a feature layer data source (class).
- **Pattern:** `PureComponent`; state holds `FeatureLayerQueryParams`; `DataSourceComponent`
  render-prop; `FieldSelector` in settings.
- **APIs:** jimu-core (`DataSourceComponent`, `DataSourceStatus`, `FeatureLayerQueryParams`),
  `jimu-ui/advanced/data-source-selector` (`DataSourceSelector`, `FieldSelector`).
- **Code-only knowledge:** builds WHERE from `useDataSources[0].fields[0]`; placeholder until
  `isDsConfigured()`.

### feature-layer-function
- **Teaches:** Same, functional variant (`useState`/`useRef`/`useEffect`).
- **Code-only knowledge:** contains a commented `createOutputDs()` prototype (disabled) showing how a
  dynamic output DS would be created.

### filter-feature-layer
- **Teaches:** Programmatically filter a DS.
- **Pattern:** functional; `DataSourceManager.getInstance().getDataSource(id)`; `ds.updateQueryParams()`
  with a LIKE clause; `SettingSection`/`SettingRow` + `FieldSelector` (String fields).
- **APIs:** `DataSourceManager`, `FeatureLayerDataSource`, `SqlQueryParams`, `JimuFieldType`.
- **Code-only knowledge:** filters on every keystroke (no debounce - add one when lifting).

### clustering
- **Teaches:** Toggle point clustering on a layer.
- **Pattern:** class; `JimuMapViewComponent`; mutate `layer.featureReduction` (cluster config object)
  or set null.
- **APIs:** `JimuMapViewComponent`, `jimuMapView.jimuLayerViews[layerId].layer`.
- **Code-only knowledge:** `jimuLayerViews` is keyed by layer id; inline cluster renderer config
  (radius/min/max size, popupTemplate, labelingInfo).

### listen-selection-change
- **Teaches:** Read and set data source selection.
- **Pattern:** functional; `DataSourceComponent` with `{where:'1=1'}`; buttons call
  `ds.selectRecordById()`; `getSelectedRecordIds()` drives styling via `classNames`.
- **APIs:** `DataSourceComponent`, `DataSource.selectRecordById`/`getSelectedRecordIds`.
- **Code-only knowledge:** emotion css uses theme token `var(--sys-color-primary-main)`.

### editor
- **Teaches:** Embed `arcgis-editor` web component bridged to a JimuMapView.
- **Pattern:** class; `<arcgis-editor view={jmv.view}>`; module-level `import 'arcgis-map-components'`
  (not lazy) so the element registers.
- **APIs:** `JimuMapViewComponent`, `arcgis-map-components`.
- **Code-only knowledge:** `jmv.view` is the native esri MapView; fallback UI when no view selected.
- **See also:** OOTB `common/edit` + `src/widgets/branch-version-editor` (production Editor patterns).

---

## 3. Data sources

High-value cluster. Be precise about which output-DS mechanism each uses.

### client-side-output
- **Teaches:** Client-side output DS that caches queried records.
- **Pattern:** load origin via `DataSourceComponent`; `query({where})`; `outputDs.setSourceRecords(...)`;
  `setStatus(Unloaded)` to signal ready; manual update button (origin changes do not auto-propagate).
- **APIs:** `DataSourceManager`, `setSourceRecords`, `setStatus`, `DataSourceStatus`,
  `dataSourceUtils.getArcGISSQL`.
- **Manifest:** output DS `isDataInDataSourceInstance: true`, `originDataSources:[useDataSource[0]]`.
- **Code-only knowledge:** the output DS **instance only exists once another widget consumes it**
  (`getOutputDataSource()` returns null otherwise); track SQL fields via
  `getJimuFieldNamesBySqlExpression()`.

### server-side-output
- **Teaches:** Server-side output DS that delegates queries (no caching).
- **Pattern:** `getCurrentQueryParams()` on origin; `mergeQueryParams(originParams, configParams)`;
  `outputDs.updateQueryParams(merged, widgetId)`; server runs the merged query on demand.
- **APIs:** `updateQueryParams`, `getCurrentQueryParams`, `mergeQueryParams`.
- **Code-only knowledge:** output DS copies origin url/itemId/layerId/portalUrl/geometryType; contrast
  with client-side which pre-loads records.

### statistic-client-side-output
- **Teaches:** Output DS of aggregate statistics.
- **Pattern:** `query({outStatistics:[{onStatisticField, outStatisticFieldName, statisticType}]})`;
  schema built dynamically in the setting from selected stat functions; inject `objectid` per result
  row; `setSourceRecords`.
- **APIs:** `query` w/ `outStatistics`, `DataSourceSchema`, `JimuFieldType.Number`.
- **Code-only knowledge:** stat results have no natural objectid (add loop index); setting rebuilds the
  whole `outputDsJsons` on each config change.

### how-to-use-fields
- **Teaches:** `load()` vs `query()` semantics + field configuration.
- **Pattern:** load mode = `DataSourceComponent query={{where:'1=1'}}` (framework loads into the DS
  instance, auto-fetches missing fields); query mode = `ds.query({where, outFields})` (results in
  component state only, not persisted).
- **Code-only knowledge:** fetch the DS on demand via `DataSourceManager.getDataSource()` rather than
  caching (avoids stale refs after DS destruction).

### output-data-source-without-original-data-sources
- **Teaches:** Output DS from external (non-feature-service) data, no origin DS.
- **Pattern:** predefine schema in `constants.ts` (`DataSourceSchema` w/ explicit fields); fetch
  external API; `ds.buildRecord({attributes})`; `setSourceRecords`; status `Unloaded`.
- **Manifest:** output DS `isDataInDataSourceInstance: true`, **no** `originDataSources`, no
  `useDataSources`.
- **Code-only knowledge:** schema MUST be predefined (nothing to infer from); `buildRecord()` wraps raw
  JSON into a FeatureDataRecord.

### runtime-data-source-without-saving-to-config
- **Teaches:** Create a feature layer DS at runtime from a URL, no config persistence.
- **Pattern:** normalize URL (strip query, force https, trim slash, require numeric layer id);
  `ServiceManager.fetchServiceInfo()`;
  `dataSourceUtils.dataSourceJsonCreator.createDataSourceJsonByLayerDefinition()`;
  `DataSourceManager.createDataSource({id, dataSourceJson})`; `load()`; destroy old before recreate.
- **APIs:** `DataSourceManager.createDataSource`/`destroyDataSource`, `ServiceManager.fetchServiceInfo`,
  `dataSourceJsonCreator`.
- **Code-only knowledge:** alt factory `createDataSourceJsonByJSAPILayer()` (comment) when you already
  have a JSAPI layer object.

---

## 4. Data actions / messaging / state / expressions

### data-action-only
- **Teaches:** A data action with no runtime widget.
- **Pattern:** extend `AbstractDataAction`; `isSupported(dataSets)`; `onExecute()` returns
  `Promise<React.ReactElement>` rendered in a `Popper`.
- **Manifest:** `dataActions:[{name,label,uri,icon}]`; no config/runtime.

### show-record-id
- **Teaches:** Data action -> widget state bridge (no Redux).
- **Pattern:** `onExecute()` calls
  `MutableStoreManager.getInstance().updateStateValue(widgetId, key, value)`; runtime reads
  `props.mutableStateProps[key]`.
- **Code-only knowledge:** simpler than message actions - synchronous state mutation.

### message-subscriber
- **Teaches:** Subscribe to app messages and act on them.
- **Pattern:** extend `AbstractMessageAction`; `filterMessageDescription()` by `MessageType`
  (`StringSelectionChange`/`DataRecordsSelectionChange`); `getSettingComponentUri()`; `onExecute()`
  dispatches `appActions.widgetStatePropChange()`.
- **APIs:** `AbstractMessageAction`, `MessageType`, `getAppStore`, `appActions`, `FieldSelector`.
- **Manifest:** `messageActions:[{name,label,uri,settingUri}]`, `dependency: jimu-arcgis`,
  `properties.hasConfig: true`.
- **Code-only knowledge:** the action setting reads the publisher widget's `useDataSources` from
  appConfig to prefill the field selector.

### control-the-widget-state
- **Teaches:** Open/close/collapse OTHER widgets.
- **Pattern:** `ReactRedux.useSelector` on `state.widgetsState[id]` + `state.widgetsRuntimeInfo[id]`;
  `WidgetManager.loadWidgetClass()` before `appActions.openWidget/closeWidget`; check `WidgetState`.
- **Code-only knowledge:** controller children found by filtering `appConfig.widgets` by parent LARGE
  `layoutId`; sidebar widgets have a `.collapse` prop; widget class must be loaded before open/close.

### redux
- **Teaches:** Custom Redux store extension.
- **Pattern:** implement `extensionSpec.ReduxStoreExtension` (`getStoreKey`, `getInitLocalState`,
  `getActions`, `getReducer`); **module-augment** the `State` interface; widget reads via
  `mapExtraStateProps(state)` and `this.props.dispatch(actionObject)`.
- **Manifest:** `extensions:[{name, point: REDUX_STORE, uri}]`.
- **Code-only knowledge:** reducer receives (localState Immutable, action, full appState); dispatch uses
  plain action objects, not creators.

### use-expression
- **Teaches:** Bind + resolve ExB expressions, configured via ExpressionBuilder.
- **Pattern:** `ExpressionResolverComponent` wraps render;
  `expressionUtils.getDataSourceIdsFromExpression()` -> `DataSourceManager.getDataSource(dsId)`;
  settings use `ExpressionBuilder` with type filters (Attribute/Statistics/Expression).
- **Code-only knowledge:** pass both the populated record and all referenced-DS records into the
  resolver; resolver returns null when `isSuccessful` is false.

---

## 5. Web components

Approaches evolve left-to-right; prefer `use-web-components-19` on 1.20.

### use-calcite-components
- **Teaches:** Use Calcite web components directly in JSX.
- **Pattern:** `import 'calcite-components'` at module top; `<calcite-button>`/`<calcite-slider>`;
  camelCase custom-event handlers (`oncalciteSliderInput`).
- **Code-only knowledge:** `e.target.value` may be an array (`Array.isArray` check); top-level import
  ensures registration before render.
- **Repo note:** repo convention for Calcite is the React wrappers `@esri/calcite-components-react`
  (typed JSX) - see repo memory; this sample shows the raw-element alternative.

### use-map-components
- **Teaches:** Dual import of ArcGIS Map Components (raw vs React wrapper), ref-based (1.15-1.18).
- **Pattern:** `import {ArcgisLayerList} from 'arcgis-map-components'` AND
  `import {ArcgisLegend} from '@arcgis/map-components-react'`; assign `.view` via ref on active view.
- **Code-only knowledge:** both import paths resolve to the same shared entry (no duplication); property
  assigned via ref, not JSX prop.

### use-web-components-19
- **Teaches:** React 19 native web-component interop (the current pattern).
- **Pattern:** plain `import 'calcite-components'` / `import 'arcgis-map-components'`; bind properties
  directly in JSX (`view={activeView?.view}`), kebab-case attributes, NO refs.
- **Code-only knowledge:** React 19 handles web-component property reactivity - cleaner than the
  ref-based approach; use this over `use-map-components` on 1.20.

### use-coding-components
- **Teaches:** ArcGIS Coding Components (`ArcgisArcadeEditor`) wired to a DS.
- **Pattern:** `useRef`; imperatively set `.profile = {variables, ...}` in `useEffect` after data loads;
  `DataSourceComponent` + `onDataSourceInfoChange`; extract feature via `getRecords()[0]`.
- **Code-only knowledge:** component props are imperative ref assignments, not React props;
  `profile.variables` defines the Arcade execution context.

### web-component
- **Teaches:** Author + register your OWN custom element.
- **Pattern:** `class extends HTMLElement` in a **`.js`** file; `attachShadow({mode:'open'})`;
  `window.customElements.define('my-component', ...)`; import the `.js` for its registration side effect.
- **Code-only knowledge / GOTCHA:** the file MUST be `.js`, not `.ts` - ExB transpiles `.ts` in a way
  that breaks native custom-element class syntax; registration must run before first render.

---

## 6. Third-party libs / tooling / i18n / testing

### d3
- **Teaches:** Bundle a local minified lib.
- **Pattern:** commit `lib/d3/d3.min.js` into the widget; `import * as d3 from './lib/d3/d3.min.js'`;
  render into a DOM ref.
- **Code-only knowledge:** version-locked + offline-safe (no CDN); synchronous import; D3 mutates the
  DOM node, then mounted via React ref.

### jquery
- **Teaches:** Load libs from CDN via manifest.
- **Pattern:** `dependency: ["https://.../jquery.js", "https://.../tree.jquery.js"]`; access `$` global.
- **Code-only knowledge:** the `dependency` array is loaded **in order** (jqtree relies on jquery being
  present first); URLs are version-pinned; no import statements for jquery.

### react-data-grid
- **Teaches:** Use an npm React lib bundled by webpack.
- **Pattern:** per-widget `package.json` (`"react-data-grid":"^6.1.0"`); `import * as ReactDataGrid`.
- **Code-only knowledge:** each widget can have its OWN `package.json` deps; no manifest `dependency`
  needed (webpack + node_modules resolves).

### web-worker
- **Teaches:** Run a Web Worker.
- **Pattern:** worker file lives in `src/runtime/assets/worker.js`; URL =
  `${props.context.folderUrl}dist/runtime/assets/worker.js`; `new Worker(url)` + `postMessage`/`onmessage`.
- **Code-only knowledge / GOTCHA:** worker MUST stay plain `.js` (NOT compiled) - ExB output is SystemJS
  which a worker cannot load (explicit code comment).

### use-assets
- **Teaches:** Three static-asset strategies.
- **Pattern:** (1) `props.context.folderUrl + 'dist/runtime/assets/...'` (copied, keeps URL);
  (2) `require('./file.png')` (inlined at build); (3) `<Icon icon={...}>` (jimu-ui, scalable SVG).
- **Code-only knowledge:** use folderUrl for dynamic/external refs, require() to inline + shrink the
  folder; `<img>` rasterizes an SVG while `<Icon>` keeps it DOM/colorable.

### translation
- **Teaches:** App-wide i18n placeholder substitution.
- **Pattern:** manifest `extensions:[{point:"APP_CONFIG_PROCESSOR", uri}]`; implement
  `AppConfigProcessorExtension.process()`; `createIntl()` +
  `utils.replaceI18nPlaceholdersInObject(appConfig)` to swap `${key}` recursively.
- **Code-only knowledge:** skips builder mode (`if (window.jimuConfig.isInBuilder) return`); locale from
  `getAppStore().getState().appContext.locale`; `default.ts` (ES6) + `zh-cn.js` (SystemJS).

### show-unit-tests
- **Teaches:** Jest widget tests with `jimu-for-test`.
- **Pattern:** `widgetRender()`/`wrapWidget()`/`getInitState()`/`getDefaultAppConfig()`/`setTheme()`;
  `@testing-library/react` (`fireEvent`, `findByText`); `jest.mock()`.
- **Code-only knowledge:** mock `jimu-core.loadArcGISJSAPIModule` per moduleId (e.g. a `FeatureLayer`
  factory whose `queryFeatureCount()` resolves a count); `getAppStore().dispatch()` sets up state.

---

## 7. Layouts

### dock
- **Teaches:** A custom `widgetType: LAYOUT` with dock/floating panels.
- **Pattern:** own `Layout` (runtime) + `LayoutBuilder` (builder) under `src/runtime/layout/**`;
  builder path implements `DropHandlers`, uses `CanvasPane`/`DropArea`/`getAppConfigAction`.
- **Manifest:** `widgetType:"LAYOUT"`, `layouts:[{name:"DEFAULT", type:"FIXED"}]`,
  `supportAutoSize:false`.
- **Code-only knowledge:** runtime layout tracks `activeItemId`/`minimizedList`; renders a
  `PanelLayoutItem` per `layout.content[layoutItemId]`.

### widget-with-layout
- **Teaches:** Embed a jimu layout into a regular widget.
- **Pattern:** `LayoutEntry` from `jimu-layouts/layout-runtime` (`isInWidget` prop); builder-support just
  re-exports `LayoutBuilder` from `jimu-layouts/layout-builder`; custom header via emotion `styled`.
- **Manifest:** `widgetType:"LAYOUT"`, `layouts:[{DEFAULT, FIXED}]`.
- **Code-only knowledge:** contrast with `dock` - this reuses the stock LayoutEntry instead of a custom
  Layout.

---

## 8. Code sharing

Consumes the `shared-code` library (below). Pick by need:

| Variant | Mechanism | When |
|---|---|---|
| share-code-chunk | dynamic `import('../../../common/my-module')` -> separate webpack chunk, lazy | large shared modules, bundle size matters |
| share-code-entry | static `import {fn} from 'widgets/shared-code/entry1'` (aliased) -> inlined | small utils, guaranteed availability |
| share-code-entry-dynamic | `moduleLoader.loadModule('widgets/shared-code/entry1', props.context.folderUrl)` | ExB runtime folder-context resolution |

### share-code-chunk
- **Code-only knowledge:** both sibling widgets `useEffect` -> dynamic import of a `common/` module that
  lives OUTSIDE `src/` (path up 3 levels); browser caches the shared chunk.

### share-code-entry
- **Code-only knowledge:** relies on a webpack alias mapping `widgets/shared-code` to the folder; code
  inlined into each consuming bundle at build time.

### share-code-entry-dynamic
- **Code-only knowledge:** ExB-specific `moduleLoader` (not webpack); resolves via `folderUrl`; access
  `module?.sampleFunction1()` with optional chaining.

### shared-code
- **Teaches:** The consumed library - multi-entry barrel structure.
- **Pattern:** `entry1.ts`/`entry2.ts` are `export *` barrels over `lib/entry1/**`, `lib/entry2/**`.
- **Note:** no manifest (it is a library, not a widget); entry points are the public API.

---

## 9. Baseline demos + complex references

### demo
- **Teaches:** Baseline CLASS widget (config + settings + i18n + theme).
- **Pattern:** `AllWidgetProps<IMConfig>` / `AllWidgetSettingProps<IMConfig>`; `config.set()` immutable
  updates; `FormattedMessage`/`nls()`; emotion `styled` w/ `theme.sys.color.*`; jimu-ui `Tabs`/`Button`.

### demo-function
- **Teaches:** Baseline FUNCTION widget with Redux state injection.
- **Pattern:** static `mapExtraStateProps(state, ownProps)` returns `{locale}` from
  `state.appContext.locale`; minimal (no styled/theme) vs `demo`.

### bmt-layout-manager  (1.17.0)
- **Teaches:** Inert "mounting point" bridge to an external layout manager.
- **Pattern:** renders only `<div id={config.layoutManagerElementId} class="w-100 h-100">`; no state /
  effects; external code manages that node.
- **Version flag:** 1.17.0 - validate before lifting.

### briefing-tool  (1.17.0)
- **Teaches:** Rich multi-step wizard widget (the richest sample).
- **Structure:** `context.tsx` (global state), ~13 component folders (each `index.ts` barrel + css +
  tsx), `constants/types.ts`, `setting/`, print sub-tree, assets, `copy-files.json`, `package.json`.
- **Patterns:** React Context + `useReducer` global store; `CalciteFlow`/`CalciteFlowItem` wizard;
  promise-based confirm dialog (resolver in `useRef`); `forwardRef` + `useImperativeHandle` for
  parent/child (print scale bar/compass/legend/inset); `MutationObserver` + `createPortal` to render
  into a dynamically-created node; dynamic widget init via `WidgetManager.loadWidgetClass` +
  `appActions.openWidget/closeWidget` (load without display); `Portal`/`IMUser` auth; html2canvas print
  composition with corner-stacking layout; `copy-files.json` copies `@arcgis/*-components` assets to
  `dist/runtime/assets`.
- **APIs:** jimu (`WidgetManager`, `appActions`, `getAppStore`, `JimuMapViewComponent`,
  `MapViewManager`, jimu-ui inputs, setting-components), Calcite React wrappers, `@arcgis/core`
  (`Portal`, `Extent`, `MapView`, `ScaleBar`), `@arcgis/{coding,common,map-config}-components` v4.33,
  react-dom `createPortal`, html2canvas, lodash `uniqueId`.
- **Version flag:** 1.17.0 + pinned component versions - highest-value but validate against 1.20.

---

## Maintenance

- The concise cards below are the quick-reference layer; the **rich cards** live in
  [sdk-samples/](sdk-samples/) (one file per category). Update both when you lift or re-verify a
  pattern; flip the rich card's `Verified vs 1.20` badge as samples are validated.
- Record surprising runtime behavior in `/memories/repo/exb-runtime-patterns.md`, not here (this router
  + the category files = stable catalog; memory = volatile learnings).
- Cross-link production equivalents in [ootb-widget-index.md](ootb-widget-index.md).
