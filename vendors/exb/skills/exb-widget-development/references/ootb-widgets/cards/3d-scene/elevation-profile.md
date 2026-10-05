# OTB Widget: arcgis/elevation-profile

Online widget doc: https://developers.arcgis.com/experience-builder/guide/elevation-profile-widget/

> Source-grounded card built from the ACTUAL widget source shipped in the local ExB
> runtime. The source tree is gitignored, so it was read with `includeIgnoredFiles`.
> Items that could not be fully verified from source are marked UNVERIFIED with the
> file that would confirm them. Plain hyphens only.

## Purpose

Creates elevation profiles from single- or multi-segment lines on a web map (2D) or
web scene (3D). A user either draws a line, or selects an existing polyline feature,
and the widget queries one or more elevation sources (the scene ground and/or custom
`ElevationLayer` image services) plus optional volumetric objects, then renders a
distance-vs-elevation chart with per-series statistics (min/max/avg elevation, gain,
loss, slopes, max distance). It also supports asset intersection (finding point/line
features that cross the profile line or an optional buffer) and can publish statistics
to an output data source for other widgets.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/elevation-profile/`

- `manifest.json`
- `src/config.ts` (there is no `config.json`-typed interface file besides `config.ts`; `config.json` at widget root holds default config values)
- `src/runtime/constants.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/chart-statistics.tsx` (also lists `chart-utils.tsx`, `profile-chart.tsx`, `results-pane.tsx`)
- `src/runtime/lib/style.ts` (imports only, not fully read)
- `src/common/utils.ts`
- `src/common/highlight-symbol-utils.ts`
- `src/common/unit-conversion.ts`
- `src/message-actions/select-line-message-action.ts`
- `src/data-actions/view-profile-data-action.ts`
- `src/setting/setting.tsx` + `src/setting/components/*` (asset-settings.tsx read for module loading; others enumerated)
- `src/version-manager.ts`

Ignored per instructions: `dist/`, `tests/`.

## Architecture overview

- `src/runtime/widget.tsx` is a large class widget (`BaseWidget`) that owns nearly all
  behavior: draw/select tools, elevation view model, chart data, intersection, and
  output statistics. It is roughly 3000+ lines.
- Presentational React children under `src/runtime/components/`:
  - `results-pane.tsx` (the whole result-stage UI shell),
  - `profile-chart.tsx` + `chart-utils.tsx` (the chart),
  - `chart-statistics.tsx` (per-series collapsible statistics legend).
- `src/common/` holds framework-agnostic helpers reused by both runtime and setting:
  data-source traversal (`utils.ts`), unit math (`unit-conversion.ts`), and JSAPI
  highlight-symbol construction (`highlight-symbol-utils.ts`).
- Cross-widget integration is DUAL: a message action AND a data action, both writing
  the same `selectedFeatureRecords` key into the widget's mutable store, which the
  runtime reads in `componentDidUpdate`.
- Settings (`src/setting/`) build the `configInfo` map keyed per map data source.

State machine: the widget flips between `initialStage` (front landing page with
draw/select buttons) and `resultStage` (chart + statistics). Error sub-states are
enumerated in `ElevationProfileErrorState` in `constants.ts`.

## Key imports and packages

### jimu-core (`src/runtime/widget.tsx`)
`React, AllWidgetProps, BaseWidget, jsx, classNames, getAppStore, WidgetState, AppMode,
IMState, DataRecord, DataSourceManager, DataSourceStatus, FeatureLayerQueryParams,
QueriableDataSource, DataSource, geometryUtils, DataSourceSelectionMode,
IMDataSourceInfo, UrlManager, urlUtils, DataSourceComponent, lodash, DataSourceTypes,
SubtypeGroupLayerDataSource, Immutable, SubtypeSublayerDataSource, BrowserSizeMode,
FeatureLayerDataSource, FeatureDataRecord, MessageManager, DataRecordsSelectionChangeMessage`

Note `geometryUtils` (jimu-core) is used for buffering (`geometryUtils.createBuffer`),
not a JSAPI buffer operator.

### jimu-ui (`src/runtime/widget.tsx`)
`WidgetPlaceholder, Card, CardBody, Button, Icon, Loading, LoadingType, Paper` plus
`defaultMessages`.

### jimu-arcgis (`src/runtime/widget.tsx`)
`JimuMapViewComponent, JimuMapView, JimuLayerView`.

### JSAPI via `esri/*` alias (runtime only, `src/runtime/widget.tsx`)
- `esri/widgets/Sketch/SketchViewModel` (line input, select-tool point clicks)
- `esri/widgets/ElevationProfile/ElevationProfileViewModel` (headless profile engine)
- `esri/Graphic`, `esri/layers/GraphicsLayer`, `esri/layers/ElevationLayer`, `esri/layers/FeatureLayer`
- `esri/geometry/Point`, `esri/geometry/Extent`, `esri/geometry/Polyline`, `esri/geometry/SpatialReference`
- Geometry operators: `esri/geometry/operators/geodeticLengthOperator`,
  `.../simplifyOperator`, `.../intersectionOperator`, `.../intersectsOperator`
- `esri/core/reactiveUtils`, `esri/core/units` (as `unitUtils`), `esri/core/promiseUtils`
- `esri/symbols/support/jsonUtils` (as `jsonUtils`), `esri/Color`

### JSAPI in highlight utils (`src/common/highlight-symbol-utils.ts`)
`esri/Graphic`, `esri/Color` (via `esri/*` alias).

### message action (`src/message-actions/select-line-message-action.ts`)
`AbstractMessageAction, AllDataSourceTypes, DataRecordsSelectionChangeMessage,
DataSourceManager, getAppStore, Immutable, ImmutableArray, MessageDescription,
MessageType, MutableStoreManager, UseDataSource` (all jimu-core).

### data action (`src/data-actions/view-profile-data-action.ts`)
`AbstractDataAction, DataRecordSet, MutableStoreManager, DataSource, JSAPILayerMixin,
DataSourceStatus, DataLevel, getAppStore, AllDataSourceTypes` (all jimu-core).

### setting (`src/setting/setting.tsx`)
jimu-core (`DataSourceManager`, `FeatureLayerDataSource`, `lodash`, etc.), jimu-ui,
`jimu-ui/advanced/setting-components` (`MapWidgetSelector, SettingSection, SettingRow,
MultipleJimuMapConfig`), `jimu-for-builder` (`BaseWidgetSetting, AllWidgetSettingProps`),
and jimu-arcgis (`JimuMapView, MapViewManager, loadArcGISJSAPIModules`). Settings load
`esri/layers/ElevationLayer` via `loadArcGISJSAPIModules` rather than a static
`esri/*` import.

## Reusable patterns found

- DUAL cross-widget input: a message action (`select`, on
  `DataRecordsSelectionChange`) AND a data action (`view`, records) both call
  `MutableStoreManager.getInstance().updateStateValue(this.widgetId,
  'selectedFeatureRecords', records)`. The runtime picks the value up through
  `mapExtraStateProps` -> `props.selectedFeatureRecords` and reacts in
  `componentDidUpdate`. This is a clean template for "let other widgets feed a
  selection into my widget" without direct coupling.
- `SketchViewModel` used for BOTH draw and select: for draw it feeds the
  `ElevationProfileViewModel` (`vm.start({ mode: 'sketch' })`); for select it draws a
  point/line then calls `jmv.selectFeaturesByGraphic(...)`.
- `ElevationProfileViewModel` used headless (no widget UI): the widget builds a
  `profiles` array (`type: 'ground' | 'query' | 'input' | ...`), assigns it to
  `vm.profiles`, and watches `vm.errorState`, `vm.input.geometry`, and `vm.progress`
  with `reactiveUtils.watch` / `reactiveUtils.whenOnce`.
- Geometry operators (new JSAPI functional operator API): `simplifyOperator` before
  buffering, `intersectionOperator.execute` / `.executeMany` and `intersectsOperator.execute`
  for asset intersection. `geodeticLengthOperator` is loaded up front
  (`isLoaded()` / `load()` in `componentDidMount`) though length is largely handled by
  the view model.
- `AbortController` + `reactiveUtils.whenOnce(..., signal)` to cancel stale async work
  when the input geometry changes again mid-computation; `promiseUtils.isAbortError`
  distinguishes real errors from cancellations.
- `WidgetVersionManager` (`version-manager.ts`) with multiple dated upgraders
  (1.15.0, 1.16.0, ...) migrating both config and output data source JSON.
- Per-data-source config: `config.configInfo[dataSourceId]` plus `activeDataSource`,
  so a single widget can hold distinct settings for each map/scene it is bound to,
  with a synthetic `'default'` bucket when the map has no data source.

### About the "@arcgis/core + esri/* alias" mix
UNVERIFIED / correction: a repo-wide grep of this widget's `src/**` found NO
`@arcgis/core` imports (`src/**`). Runtime code imports JSAPI exclusively through the
`esri/*` alias (static ESM imports), and the setting loads JSAPI dynamically via
`loadArcGISJSAPIModules`. So the real split is `esri/*` static (runtime) vs
`loadArcGISJSAPIModules` (builder), not a `@arcgis/core` mix. Confirm in
`src/runtime/widget.tsx` (lines 24-44) and `src/setting/setting.tsx` (lines 85, 127, 165).

## Builder vs runtime split

- Runtime imports JSAPI statically through `esri/*` (bundled by the ExB webpack alias).
  See `src/runtime/widget.tsx` top-of-file imports.
- Settings NEVER static-import JSAPI. `src/setting/setting.tsx` and
  `src/setting/components/asset-settings.tsx` call
  `loadArcGISJSAPIModules(['esri/layers/ElevationLayer'])` (and similar) on demand,
  storing the module on the component (`this.ElevationLayer`). This keeps the builder
  bundle lean and defers JSAPI load until a map is selected.
- Settings write the whole `configInfo` map (keyed by data source id) plus
  `useDataSources` and output data source JSONs via `onSettingChange`.
- `getAppConfig()` in both actions branches on `window.jimuConfig.isBuilder` to read
  from `appStateInBuilder.appConfig` vs `appConfig` (see both action files).

## Lifecycle and cleanup

- `componentDidMount` (async): ensures `geodeticLengthOperator.load()` if not loaded,
  then resets error state.
- `activeViewChangeHandler(jmv)`: main wiring. Destroys a previous view's SketchVM,
  clears results, recreates graphics layers, waits for child data sources
  (`waitForChildDataSourcesReady` or `loadConfiguredDataSources`), adds four
  `GraphicsLayer`s to the map, then in a `setTimeout(..., 100)` calls
  `createApiWidget` (SketchVM) and `createEpViewModel` (ElevationProfileViewModel),
  wires `layerview-create` and JimuLayerView-removed listeners.
- `componentDidUpdate`: reacts to `selectedFeatureRecords` (message/data action input),
  to open/close/hidden widget state (stop tools, optionally clear results per
  `keepResultsWhenClosed`), to `appMode` (cursor), and to map/active-data-source
  changes.
- `componentWillUnmount`: `this._defaultViewModel.clear()`,
  `currentSketchVM.cancel()`, `destroyDrawingLayers()`, reset cursor,
  `this._mapView?.clearSelectedFeatures()`.
- `destroyDrawingLayers()`: for each of `_drawingLayer`, `_nextPossibleSelectionLayer`,
  `_bufferLayer`, `_intersectionHighlightLayer` it calls `.removeAll()` then
  `.destroy()`.
- Async cancellation: `_abortController` aborted on new input geometry and on error;
  `reactiveUtils.whenOnce(() => vm.progress === 1, signal)` waits for completion.

## Manifest/config requirements

From `manifest.json`:
- `dependency: "jimu-arcgis"` (needs a Map/Scene widget).
- `properties`: `coverLayoutBackground: true`, `needHiddenState: true`,
  `showDescription: true`.
- `messageActions`: one entry `name: "select"`, label "View profile",
  uri `message-actions/select-line-message-action`.
- `dataActions`: one entry `name: "view"`, label "View Elevation Profile",
  uri `data-actions/view-profile-data-action`, icon
  `runtime/assets/icons/elevation-icon.svg`.
- `defaultSize`: 600 x 400. `version`/`exbVersion`: `1.20.0`.

Config shape (`src/config.ts`): top-level `Config { useMapWidget, activeDataSource,
generalSettings, configInfo }`. Note the strongly typed interfaces (`ElevationLayers`,
`ProfileSettings`, `AssetSettings`, `GeneralSetting`, `SelectionModeOptions`,
`VolumetricObjOptions`, `Statistics`, `LayerIntersectionInfo`, `IntersectionResult`)
BUT `configInfo` is declared `any`, so the per-data-source config bucket is untyped at
compile time. `IMConfig = ImmutableObject<Config>`.

Default custom elevation source (`constants.ts`):
`https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer`.

## Gotchas

- `configInfo` is `any` in `config.ts`. Real access is always
  `config.configInfo[config.activeDataSource]` (or `'default'` when the map has no data
  source id). Do not assume a typed shape; read the setting code for keys like
  `profileSettings`, `assetSettings`, `elevationLayersSettings`,
  `advanceOptions` (legacy).
- Legacy config key migration: code checks `configSettings.hasOwnProperty('advanceOptions')`
  before falling back to `profileSettings.isProfileSettingsEnabled` (see
  `view-profile-data-action.ts`). Old configs use `advanceOptions`; newer ones use
  `profileSettings`. `version-manager.ts` handles the upgrade.
- 3D vs 2D branching everywhere: `jmv.view.type === '3d'` decides ground profile
  (`type: 'ground'`) vs a `type: 'query'` custom `ElevationLayer`, whether an `input`
  profile is pushed, and `hasZ`/`elevationInfo` on graphics layers.
- Buffering uses jimu-core `geometryUtils.createBuffer` (NOT a JSAPI buffer operator);
  the input line is `simplifyOperator.execute`'d first because unsimplified geometry
  gives wrong buffers. See `createBufferGraphics` (widget.tsx ~1130).
- Both the message action and data action write the SAME store key. If you clone this
  pattern, remember only ONE source of truth (`selectedFeatureRecords`) exists, and the
  runtime dedupes via `mutableStatePropsVersion` comparison in `componentDidUpdate`.
- Draw/select tools are re-armed on widget open in `componentDidUpdate` and
  `activeViewChangeHandler` guarded by the app-store widget state
  (`WidgetState.Opened`); do not assume `componentDidMount` alone arms them.
- Setting loads JSAPI lazily; `this.ElevationLayer` is `null` until
  `loadArcGISJSAPIModules` resolves. Guard before use.
- Message action `filterMessage` only passes records whose
  `feature.geometry.type === 'polyline'`; both actions reject non-polyline geometry and
  reject data sources that are not WEB_MAP/WEB_SCENE/polyline FeatureLayer/SubtypeSublayer.

## Useful snippets and functions

### DUAL handler: message action writes selection into the mutable store
Source: `src/message-actions/select-line-message-action.ts`
```ts
onExecute (message: DataRecordsSelectionChangeMessage): boolean {
  const dataRecordsSelectionChangeMessage = message
  MutableStoreManager.getInstance().updateStateValue(
    this.widgetId, 'selectedFeatureRecords', dataRecordsSelectionChangeMessage.records
  )
  return true
}
```

### DUAL handler: data action writes the SAME key; strict isSupported gating
Source: `src/data-actions/view-profile-data-action.ts`
```ts
onExecute (dataSets: DataRecordSet[]): Promise<boolean> {
  const { records } = dataSets[0]
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedFeatureRecords', records)
  return Promise.resolve(true)
}
```
```ts
// accept only polyline map/scene/feature/subtype sources with spatial info
const supportSpatialInfo = dataSource?.supportSpatialInfo && dataSource?.supportSpatialInfo()
if (!supportSpatialInfo) { return Promise.resolve(false) }
if (dataLevel !== DataLevel.Records) { return Promise.resolve(false) }
if (!(dataSource.type === 'WEB_MAP' || dataSource.type === 'WEB_SCENE' ||
  ((dataSource.type === AllDataSourceTypes.FeatureLayer ||
    dataSource.type === AllDataSourceTypes.SubtypeSublayer) &&
    dataSource.getGeometryType() === 'esriGeometryPolyline'))) {
  return Promise.resolve(false)
}
```

### Runtime reads the store value via mapExtraStateProps
Source: `src/runtime/widget.tsx`
```ts
static mapExtraStateProps = (state: IMState, props: AllWidgetProps<IMConfig>): ExtraProps => {
  return {
    appMode: state.appRuntimeInfo?.appMode,
    browserSizeMode: state.browserSizeMode,
    selectedFeatureRecords: props?.mutableStateProps?.selectedFeatureRecords,
    currentPageId: state.appRuntimeInfo?.currentPageId,
    mapSelectionHighlightColor: state.appConfig?.widgets?.[props.useMapWidgetIds?.[0]]?.config?.selectionHighlightColor
  }
}
```
```ts
// componentDidUpdate: react only when the version token changed (dedupe)
const featureRecords = this.props?.selectedFeatureRecords as any
if (featureRecords?.length > 0 &&
  (!prevProps || !prevProps.mutableStatePropsVersion ||
   prevProps?.mutableStatePropsVersion?.selectedFeatureRecords !==
     this.props.mutableStatePropsVersion?.selectedFeatureRecords)) {
  const validRecord = this.getValidFeatureRecord(featureRecords)
  // ...displayFeaturesResult
}
```

### Building the ElevationProfileViewModel profiles (3D ground vs 2D query)
Source: `src/runtime/widget.tsx` (`createEpViewModel`)
```ts
if (jmv.view.type === '3d') {
  profiles.push({ id, type: 'ground', color, title })         // scene ground
} else {
  profiles.push({
    id, type: 'query',                                        // custom elevation source
    source: new ElevationLayer({ url: setAsGroundProfileLayer[0].elevationLayerUrl }),
    color, title
  })
}
// ...later, only in 3D, push the drawn "input" line profile
if (jmv.view.type === '3d') {
  profiles.push({ type: 'input', color: this.state.graphicsHighlightColor })
}
this._defaultViewModel = new ElevationProfileViewModel({ view: jmv.view, profiles })
```

### Watch view model with reactiveUtils + AbortController cancellation
Source: `src/runtime/widget.tsx`
```ts
reactiveUtils?.watch(() => defaultViewModel.errorState, (errorState) => {
  const error = this.getErrorMsgState(errorState)
  if (error?.length === 0 || !error) { return }
  this._abortController?.abort()
  this.onErrorInChartData(error[0], error[1])
}, { initial: true })

reactiveUtils?.watch(() => defaultViewModel.input?.geometry, async () => {
  this._abortController?.abort()
  const { signal } = (this._abortController = new AbortController())
  await reactiveUtils.whenOnce(() => defaultViewModel.progress === 1, signal)
  if (signal.aborted) { return }
  // ...build chart data
})
```

### Geometry operators: simplify then intersect for asset detection
Source: `src/runtime/widget.tsx`
```ts
if (simplifyOperator && !simplifyOperator.isSimple(inputGeometry)) {
  inputGeometry = simplifyOperator.execute(inputGeometry)
}
// ...
intersectionOperator.execute(intersectingFeatureGeom,
  bufferGraphics ? bufferGraphics.geometry : selectedOrBufferLineGeom)
const pts = intersectionOperator.executeMany([intersectingFeatureGeom], selectedOrBufferLineGeom)
const hit = intersectsOperator.execute(intersectingPointFeature, intersectingLineToTheLine)
```

### Buffer via jimu-core geometryUtils (not a JSAPI operator)
Source: `src/runtime/widget.tsx` (`createBufferGraphics`)
```ts
geometryUtils.createBuffer(inputGeometry,
  [this._selectedBufferValues.bufferDistance],
  this._selectedBufferValues.bufferUnits
).then((bufferGeometry) => {
  const firstBufferGeom = Array.isArray(bufferGeometry) ? bufferGeometry[0] : bufferGeometry
  const bufferGraphics = new Graphic({
    geometry: firstBufferGeom,
    symbol: jsonUtils?.fromJSON(this._selectedBufferValues.bufferSymbol)
  })
  this._bufferGraphics = bufferGraphics
})
```

### Ensure a geometry operator is loaded before use
Source: `src/runtime/widget.tsx` (`componentDidMount`)
```ts
if (!geodeticLengthOperator.isLoaded()) {
  await geodeticLengthOperator.load()
}
```

### Lazy JSAPI load in settings (builder)
Source: `src/setting/setting.tsx`
```ts
loadArcGISJSAPIModules(['esri/layers/ElevationLayer']).then(modules => {
  [this.ElevationLayer] = modules
  this.getAvailableDataSources(this.props.useMapWidgetIds)
})
```

### Recursive child data source traversal (feature/subtype leaves only)
Source: `src/common/utils.ts`
```ts
export function getAllLayersFromDataSource (dataSource: string): DataSource[] {
  const visitTree = (ds: DataSource, results: DataSource[]) => {
    const childDss = ds?.isDataSourceSet() && ds?.getChildDataSources()
    childDss && childDss.forEach(childDs => {
      if (childDs?.isDataSourceSet()) {
        visitTree(childDs, results)
      } else if (childDs?.type === DataSourceTypes.FeatureLayer ||
                 childDs?.type === DataSourceTypes.SubtypeSublayer) {
        results.push(childDs)
      }
    })
  }
  const allDss = []
  visitTree(DataSourceManager.getInstance()?.getDataSource(dataSource), allDss)
  return allDss
}
```

### Unit conversion helper (meters as pivot)
Source: `src/common/unit-conversion.ts`
```ts
export function convertSingle (fromValue: number | [], fromUnits: string, toUnits: string | []): number {
  if (fromUnits === toUnits) { return +fromValue }
  return (+fromValue / perMeter(fromUnits)) * perMeter(toUnits)
}
```

### JSAPI highlight symbol per geometry type
Source: `src/common/highlight-symbol-utils.ts`
```ts
export const getHighLightGraphic = (graphic: __esri.Graphic, color?: string): __esri.Graphic => {
  if (!color) { color = '#00FFFF' }
  switch (graphic.geometry.type) {
    case 'point':    return getPointSymbol(graphic, color)
    case 'polyline': return getPolyLineSymbol(graphic, color)
    case 'polygon':  return getPolygonSymbol(graphic, color)
  }
}
```

### WidgetVersionManager with config + output DS migration
Source: `src/version-manager.ts`
```ts
class VersionManager extends WidgetVersionManager {
  versions: any[] = [{
    version: '1.15.0',
    description: 'Upgrade output data source json and use data sources',
    upgradeFullInfo: true,
    upgrader: (oldInfo: WidgetUpgradeInfo) => {
      const configInfo = oldInfo.widgetJson.config.configInfo
      const widgetJson = oldInfo.widgetJson.set('useDataSources', getUseDataSourcesForAllDs(configInfo))
      // ...also set output DS geometryType to 'esriGeometryPolyline'
      return { ...oldInfo, widgetJson }
    }
  }, /* 1.16.0 ... */]
}
```
