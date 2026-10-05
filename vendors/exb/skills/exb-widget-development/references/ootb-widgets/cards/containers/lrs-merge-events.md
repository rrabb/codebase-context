# OTB Widget: lrs/merge-events

Online widget doc: No dedicated core-widget doc page (LRS = ArcGIS Location Referencing solution). See https://developers.arcgis.com/experience-builder/guide/widgets-overview/ . UNVERIFIED exact page.

## Purpose
Merge Events is an ArcGIS Location Referencing (LRS) editing widget. It lets an editor
select two or more line-event features that share the same route (or the same line, when
the event layer can span routes), review/sort them, pick which event's attributes are
preserved, choose the effective date, and merge them into a single event via the LRS
service. It binds to a Map widget, uses graphics layers for hover/pick/flash highlighting,
and exposes a "Merge Events" data action so a selection made elsewhere (a Table/List, etc.)
can be routed into the widget.

Source note: this widget is authored under `widgets/lrs/merge-events` but its heavy lifting
lives in `widgets/shared-code/lrs` (the shared LRS library). Most imports below resolve into
that shared code. Cross-ref: patterns/container-shared-code.md.

## Source paths inspected
ACTUAL source (from the gitignored ExB runtime `dist` tree; `dist/` build output and
`tests/` excluded):
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/manifest.json`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/config.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/common/utils.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/common/use-data-source-exist.tsx` (name only, not read in full)
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/data-actions/merge-events.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/extensions/lrs-store.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/runtime/widget.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/runtime/utils.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/runtime/data-source/data-source-manager.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/runtime/components/merge-events.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/setting/setting.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/setting/default-settings.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/lrs/merge-events/src/setting/layer-config.tsx`

Other runtime components present but not fully read (names only):
`merge-events-attributes.tsx`, `merge-events-change-event-selection-form.tsx`,
`merge-events-date-form.tsx`, `merge-events-event-selection-form.tsx`,
`merge-events-form-header.tsx`, `merge-events-list-form.tsx`,
`merge-events-route-selection-form.tsx`, `route-and-measure-form.tsx`,
plus `setting/constants.ts` and `runtime/constants.ts`.

UNVERIFIED: The task brief referenced a `setting/referent` file; no `referent.*` file exists
under `merge-events/src/setting` (only `default-settings.tsx` and `layer-config.tsx`). That
pattern may exist in a sibling LRS widget, not here.

## Architecture overview
- `widget.tsx` (default class `Widget extends React.PureComponent`) is the runtime shell.
  It owns all mutable state (selected event/network layers, event features, route info,
  graphics layers, sketch view model, toast state, conflict-prevention flag, per-view
  settings). It renders a `JimuMapViewComponent`, an optional `MapViewLoader` (map mode),
  and the `MergeEvents` presentational container once a valid config exists; otherwise a
  `WidgetPlaceholder`.
- `components/merge-events.tsx` (`MergeEvents`) is the large presentational container that
  composes the sub-forms (event selection, route selection, attributes, form header,
  date form, list form) and a `DataSourceManager` for network/event data sources.
- `runtime/data-source/data-source-manager.tsx` wraps two `DataSourceComponent`s (network +
  event) and reports readiness up.
- `setting/setting.tsx` drives the builder UI through the shared `LrsLoader`, delegating
  per-layer config to `LayerConfig` and defaults to `DefaultSettings`.
- `data-actions/merge-events.ts` is the "Merge Events" data action that pushes a selected
  event layer into the widget's mutable state.
- `extensions/lrs-store.ts` re-exports the shared `LrsStoreExtension` as this widget's
  REDUX_STORE extension.

## Key imports and packages
Grouped by source; note where each resolves.

From `jimu-core` (widget.tsx):
`React, jsx, AllWidgetProps, DataSourceManager, DataSource, ImmutableObject,
FeatureDataRecord, FeatureLayerDataSource, IMState, getAppStore, WidgetState,
DataSourceSelectionMode, SupportedJSAPILayerTypes, ImmutableArray, Immutable`.

From `jimu-arcgis` (widget.tsx):
`loadArcGISJSAPIModules, JimuMapView, JimuMapViewComponent, JimuFeatureLayerView,
JimuSceneLayerView`.

From `jimu-ui` (widget.tsx / merge-events.tsx / settings):
`defaultMessages as jimuUIDefaultMessages, Paper, WidgetPlaceholder, Select, Option,
Label, Alert, Tooltip, Button, hooks`, and setting components from
`jimu-ui/advanced/setting-components` (`SettingSection, SettingRow`),
`jimu-ui/basic/list-tree` (`List, TreeItemActionType, ...`).

From `jimu-for-builder` (widget.tsx + setting.tsx):
`getAppConfigAction` (runtime, to persist per-view settings), `SettingChangeFunction,
AllWidgetSettingProps` (builder).

From `jimu-theme` (merge-events.tsx): `getTheme`.

Raw JSAPI (`esri/*` alias) in widget.tsx:
`esri/layers/GraphicsLayer`, `esri/widgets/Sketch/SketchViewModel`, `esri/Graphic`;
`esri/geometry/operators/bufferOperator` loaded lazily via `loadArcGISJSAPIModules`.

From `widgets/shared-code/lrs` (the shared LRS library - the bulk of behavior):
- widget.tsx: `LrsLayer, RouteInfo, isDefined, queryRouteId, queryEventsByEventObjectIds,
  getDateWithTZOffset, isInWidgetController, LrsLayerType, MapViewLoader,
  findFirstArcgisMapWidgetId, getModeType, getConfigValue, ModeType, checkConflictPrevention`.
- common/utils.ts: `LrsLayerType, LrsLayer, ModeType, getDefaultEvent, isLineEvent`.
- runtime/utils.ts: `isDefined, getNetworkOutFields, queryRouteIds`.
- merge-events.tsx: `getInitialRouteInfoState, LrsLayerType, RouteInfo, DefaultInfo,
  isDefined, LrsLayer, formatMessage, LockAction, AcquireLockResponse, LrsLocksInfo,
  getIntialLocksInfo, LockManagerComponent, waitTime`.
- setting.tsx: `LrsLayerType, LrsLayer, ModeType, lrsDefaultMessages, MapViewConfig,
  getLayersByType, updateDefaultForMapMode, getDefaultEvent, LrsLoader, EmptyPlaceholder`.
- default-settings.tsx: `lrsDefaultMessages, LrsLayer, DefaultInfo, getConfigValue, updateConfig`.
- layer-config.tsx: `LrsLayer, AttributeFieldSettings, ModeType, getConfigValue, isLineEvent`.
- extensions/lrs-store.ts: `LrsStoreExtension`.
- data-actions/merge-events.ts (from `widgets/shared-code/lrs`): `isDefined, LrsLayerType`.

From `jimu-core` in the data action:
`AbstractDataAction, DataRecordSet, MutableStoreManager, DataLevel, getAppStore,
DataSourceStatus, DataSourceTypes, Immutable, FeatureLayerDataSource`.

## Reusable patterns found
1. DATA ACTION ("Merge Events", `mergeEvents` in manifest) - a record-level data action
   (`AbstractDataAction`) that gates on selection (`isSupported` requires >= 2 records, a
   single feature/scene layer data source, and that the layer is registered as an LRS Event
   layer in this widget's config, including nested `mapViewsConfig`). `onExecute` writes the
   matched `LrsLayer` into the widget's mutable state via
   `MutableStoreManager.updateStateValue(this.widgetId, 'selectedEventLyr', ...)`. See
   patterns/container-shared-code.md.
2. GraphicsLayer management - three dedicated `GraphicsLayer`s (`hoverGraphic`,
   `pickedGraphic`, `flashGraphic`, all `listMode: 'hide'`) created on map view change and
   torn down on unmount; plus a `SketchViewModel` for rectangle selection with a buffered
   query. See "Lifecycle and cleanup".
3. SettingsPerView - per-`jimuMapViewId` settings (`settingsPerView` in config, built by
   `constructSettingsPerView` / `setValuesForView` in common/utils.ts) so one widget can
   serve multiple map views. Runtime resolves the active view's values with `getConfigValue`.
4. lrs-store REDUX extension - `extensions/lrs-store.ts` re-exports shared `LrsStoreExtension`
   at the `REDUX_STORE` extension point (manifest `extensions[]`). See
   patterns/container-shared-code.md.
5. DataSourceComponent pair - `DataSourceManager` renders two `DataSourceComponent`s and
   aggregates `network`/`event` readiness via info-change callbacks.
6. Mode split (Layer vs Map) - `ModeType.Layer` uses `config.lrsLayers` directly; `ModeType.Map`
   uses the `MapViewLoader` + per-view `activeLrsLayers`. Resolved everywhere by
   `getModeType` / `getConfigValue`.

## Builder vs runtime split
- Builder (`src/setting/*`): `setting.tsx` composes the shared `LrsLoader` (map-widget
  selection, LRS layer discovery, mode reset, per-view maps) and renders `LayerConfig` for
  the selected layer and `DefaultSettings` for default event / display options. It writes
  config exclusively through `onSettingChange` / a wrapped `updateWidgetJson`
  (`SettingChangeFunction` from `jimu-for-builder`). A `useRef` + `isRunning` semaphore
  serializes async `onMapViewsConfigUpdated` writes.
- Runtime (`src/runtime/*`): `widget.tsx` reads the resolved config, binds the map, manages
  selection/merge state, and (notably) also writes config at runtime: `setSettingsPerView`
  calls `getAppConfigAction().editWidgetConfig(...)` to persist the current view's derived
  `settingsPerView`. Treat that as an intentional runtime->config write, not a bug.

## Lifecycle and cleanup
- `componentDidMount`: seeds `selectedEventLayer` from mutable state if a data action already
  ran, sets `hideTitle` when inside the Widget Controller (`isInWidgetController`), and calls
  `setSettingsPerView`.
- `componentDidUpdate`: when `jimuMapView` changes, removes then recreates graphics layers and
  rebuilds the sketch view model (`createApiWidget`); re-applies data-action selection when the
  mutable `selectedEventLyr` version changes; re-derives per-view settings when `activeLrsLayers`
  changes; and re-checks `checkConflictPrevention(lrsUrl)` to toggle `isConflictPreventionEnabled`.
- `componentWillUnmount`: `removeGraphicLayers()` calls `removeAll()` + `destroy()` on all three
  graphics layers. Sketch VM is created per view; selection listeners
  (`add/removeJimuLayerViewSelectedFeaturesChangeListener`) are swapped on active-view change.
- Data-action handoff uses a `setTimeout(..., 1000)` before writing mutable state (see Gotchas).

## Manifest/config requirements
From `manifest.json`:
- `"type": "widget"`, `"dependency": "jimu-arcgis"` (map binding required).
- `"notSupportAGOL": true` - LRS requires ArcGIS Enterprise, not ArcGIS Online.
- `dataActions`: one entry `mergeEvents` -> `uri: "data-actions/merge-events"`,
  icon `runtime/assets/icons/mergeevents-icon.svg`.
- `extensions`: one `REDUX_STORE` extension "LRS Store" -> `uri: "extensions/lrs-store"`.
- `defaultSize`: `350 x 400`. Version/exbVersion `1.20.0`, author "Esri Solutions".
- Config shape (`src/config.ts`): `lrsLayers`, flat `networkLayers/eventLayers/
  intersectionLayers`, optional `defaultEvent`, `displayConfig { hideEvent }`, `mode`
  (`ModeType`), `mapViewsConfig[jimuMapViewId] -> MapViewConfig`, and
  `settingsPerView[jimuMapViewId] -> SettingsPerView`.

## Gotchas
- Shared-code coupling: nearly all logic lives in `widgets/shared-code/lrs`. Reading only the
  `merge-events` folder is misleading; behavior for locking (`LockManagerComponent`), route
  queries, and the data action all live in shared code. Cross-ref patterns/container-shared-code.md.
- Runtime writes config: `setSettingsPerView` persists to the app config via
  `getAppConfigAction().editWidgetConfig` during runtime. Do not assume config is read-only
  at runtime for this widget.
- Magic `setTimeout`s: data action `onExecute` waits 1000 ms before writing mutable state,
  and selection queries use `setTimeout(..., 100)`. These are timing hacks around data-source
  readiness/selection propagation; changing them can break the handoff. UNVERIFIED rationale.
- AGOL unsupported: `notSupportAGOL: true`; the widget assumes an Enterprise LRS service and
  `checkConflictPrevention` / lock APIs.
- Same-line vs same-route: `areEventsOnSameLineOrRoute` (runtime/utils.ts) branches on
  `eventInfo.canSpanRoutes`. Line-spanning events are validated by line id and sorted by
  line order then measure; non-spanning events must share one route id. Errors surface as
  toast messages, suppressed when a merge just succeeded (`toastMsgType !== 'success'`).
- `mapExtraStateProps` bridges `mutableStateProps.selectedEventLyr` into props; the data
  action and widget communicate only through that mutable store key.

## Useful snippets and functions
REAL snippets copied from the ACTUAL source; source path precedes each.

Source: `merge-events/manifest.json` (data action + REDUX_STORE extension)
```json
"dataActions": [
  {
    "name": "mergeEvents",
    "label": "Merge Events",
    "uri": "data-actions/merge-events",
    "icon": "runtime/assets/icons/mergeevents-icon.svg"
  }
],
"extensions": [
  {
    "name": "LRS Store",
    "point": "REDUX_STORE",
    "uri": "extensions/lrs-store"
  }
]
```

Source: `merge-events/src/extensions/lrs-store.ts` (re-export shared REDUX store)
```ts
import { LrsStoreExtension } from 'widgets/shared-code/lrs'

export default LrsStoreExtension
```

Source: `merge-events/src/data-actions/merge-events.ts` (gate + handoff via mutable store)
```ts
onExecute (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
  const dataSet = dataSets[0]
  const ds = dataSet.dataSource as FeatureLayerDataSource
  const appConfig = getAppConfig()
  const widgetJson = appConfig?.widgets?.[this.widgetId]

  let selectedLrsLayer
  widgetJson.config.lrsLayers.forEach((lrsLayer: any) => {
    if (lrsLayer.id === ds.id) {
      selectedLrsLayer = lrsLayer
    }
  })
  setTimeout(() => {
    MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedEventLyr', Immutable(selectedLrsLayer))
  }, 1000)
  return Promise.resolve(true)
}
```

Source: `merge-events/src/runtime/widget.tsx` (three graphics layers created on view change)
```tsx
createGraphicLayers (): void {
  if (isDefined(this.state.jimuMapView)) {
    this.removeGraphicLayers()
    const newHoverGraphicLayer = new GraphicsLayer({ listMode: 'hide' })
    const newPickedGraphicLayer = new GraphicsLayer({ listMode: 'hide' })
    const newFlashGraphicLayer = new GraphicsLayer({ listMode: 'hide' })
    this.state.jimuMapView?.view?.map.addMany([newPickedGraphicLayer, newFlashGraphicLayer, newHoverGraphicLayer])
    this.setState({ hoverGraphic: newHoverGraphicLayer })
    this.setState({ pickedGraphic: newPickedGraphicLayer })
    this.setState({ flashGraphic: newFlashGraphicLayer })
  }
}
```

Source: `merge-events/src/runtime/widget.tsx` (teardown on unmount)
```tsx
removeGraphicLayers (): void {
  if (isDefined(this.state.hoverGraphic)) {
    this.state.hoverGraphic.removeAll()
    this.state.hoverGraphic.destroy()
    this.setState({ hoverGraphic: null })
  }
  if (isDefined(this.state.pickedGraphic)) {
    this.state.pickedGraphic.removeAll()
    this.state.pickedGraphic.destroy()
    this.setState({ pickedGraphic: null })
  }
  if (isDefined(this.state.flashGraphic)) {
    this.state.flashGraphic.removeAll()
    this.state.flashGraphic.destroy()
    this.setState({ flashGraphic: null })
  }
}
```

Source: `merge-events/src/runtime/widget.tsx` (lazy JSAPI module + buffered spatial query)
```tsx
selectFeaturesByGraphic = async (graphic: __esri.Graphic, spatialRelationship: string, selectionMode: DataSourceSelectionMode, outputAllFields = false): Promise<any> => {
  return loadArcGISJSAPIModules([
    'esri/geometry/operators/bufferOperator'
  ]).then(async modules => {
    const bufferOperator: __esri.bufferOperator = modules[0]
    let geometry = graphic.geometry
    if ((geometry.type === 'point' || geometry.type === 'polyline')) {
      const resolution = this.state.jimuMapView.view.scale * 2.54 / 9600
      geometry = bufferOperator.execute(geometry as __esri.GeometryUnion, 10 * resolution, {unit: 'meters'}) as any
    }
    // ...builds query, iterates jimuLayerViews, selectFeaturesByQuery...
  })
}
```

Source: `merge-events/src/runtime/widget.tsx` (runtime persists per-view settings to config)
```tsx
setSettingsPerView = () => {
  const { config } = this.props
  const lrsLayers = !config.mode || config.mode === ModeType.Map ? this.state.activeLrsLayers : config.lrsLayers
  let settingPerView = config.settingsPerView?.[this.state.activeMapViewId] || constructSettingsPerView()
  if (lrsLayers && lrsLayers.length > 0) {
    settingPerView = setValuesForView(settingPerView, lrsLayers, true)
    this.setState({ settingPerView })
    const newConfig = config.setIn(['settingsPerView', this.state.activeMapViewId], settingPerView)
    getAppConfigAction().editWidgetConfig(this.props.id, newConfig).exec()
  }
}
```

Source: `merge-events/src/common/utils.ts` (build immutable per-view settings)
```ts
export function constructSettingsPerView () {
  const settingsPerView: SettingsPerView = {
    networkLayers: [],
    eventLayers: [],
    intersectionLayers: [],
    defaultEvent: { index: -1, name: '' },
    displayConfig: { hideEvent: false },
  }
  return Immutable(settingsPerView)
}
```

Source: `merge-events/src/runtime/data-source/data-source-manager.tsx` (paired DataSourceComponent readiness)
```tsx
{selectedNetwork && (
  <DataSourceComponent
    useDataSource={selectedNetwork.useDataSource}
    onDataSourceInfoChange={handleNetworkDsInfoChange}
    onCreateDataSourceFailed={handleNetworkDsCreateFailed}
    onDataSourceCreated={handleNetworkDsCreated}
  />
)}
{selectedEvent && (
  <DataSourceComponent
    useDataSource={selectedEvent.useDataSource}
    onDataSourceInfoChange={handleEventDsInfoChange}
    onCreateDataSourceFailed={handleEventDsCreateFailed}
    onDataSourceCreated={handleEventDsCreated}
  />
)}
```

Source: `merge-events/src/setting/setting.tsx` (builder shell delegating to shared LrsLoader)
```tsx
<LrsLoader
  intl={intl}
  portalUrl={portalUrl}
  theme={theme}
  widgetId={widgetId}
  mode={config.mode}
  useMapWidgetIds={useMapWidgetIds}
  lrsLayers={config.lrsLayers}
  mapViewsConfig={config.mapViewsConfig}
  supportedLrsTypes={supportedLrsTypes}
  requiredLrsTypes={requiredLrsTypes}
  outputDataSourceWidgetType='sld'
  onLrsLayersUpdated={handleLrsLayersUpdated}
  onMapViewsConfigUpdated={handleMapViewsConfigUpdated}
  onMapWidgetSelected={handleMapWidgetIdUpdated}
  onReset={handleReset}
  onSelectionChanged={handleSelectionChanged}>
  {selectedIndex > -1 &&
    <LayerConfig
      widgetId={widgetId}
      config={config}
      index={selectedIndex}
      activeMapViewId={mapViewIdLayerSettings}
      onSettingChange={onSettingChange}
    />
  }
</LrsLoader>
```
