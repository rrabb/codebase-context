# OTB Widget: lrs/add-line-event

Online widget doc: No dedicated core-widget doc page (LRS = ArcGIS Location Referencing solution). See https://developers.arcgis.com/experience-builder/guide/widgets-overview/ . UNVERIFIED exact page.

## Purpose
The Add Line Event widget lets users create new linear (line) events on a
configured Linear Referencing System (LRS) network. A user picks a route and a
from/to measure range (by measure, by route-and-measure map picking, or by
referent offset), enters event attributes and date range, and the widget calls
the LRS service to add the event. It supports two operation modes exposed as
`OperationType.single` (add one event) and `OperationType.multiple` (add several
events using attribute sets), plus merge/retire concurrency handling. It is
authored by "Esri Solutions" (manifest.json) and is part of the LRS widget
family, not a generic ExB core widget. Three data actions let other widgets
(Search By Route, Identify, attribute tables) push a selected feature into this
widget as the event geometry / from endpoint / to endpoint.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/config.json
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/runtime/constants.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/common/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/common/use-data-source-exist.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/data-actions/add-line-event.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/data-actions/add-line-event-from.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/data-actions/add-line-event-to.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/extensions/lrs-store.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/setting/default-settings.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/setting/layer-config.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/setting/referent-settings.tsx

Note: the runtime component subtree (add-single-line-event.tsx,
add-multiple-line-events.tsx, route-and-measure-form.tsx,
route-selection-form.tsx, merge-retire-add-form.tsx, add-line-event-attributes,
add-line-event-concurrencies, add-line-event-date-form,
add-line-event-operation-type, add-line-event-form-header) and the
data-source/utilities/*.tsx files exist in the tree but were only partially
inspected; details attributed to them are marked UNVERIFIED where relevant. The
additional setting sub-components (display-settings.tsx,
concurrency-settings.tsx, referent-item-config.tsx, constants.ts) were read only
for imports.

## Architecture overview
- `dependency: "jimu-arcgis"` (manifest.json) so the widget can bind a map and
  use the ArcGIS Maps SDK. `notSupportAGOL: true` restricts it to ArcGIS
  Enterprise (LRS services are Enterprise-only).
- The widget is a class component (`Widget extends React.PureComponent`) in
  src/runtime/widget.tsx. It owns a single `GraphicsLayerManager` (from
  `widgets/shared-code/lrs`) and the active `JimuMapView`.
- Map binding uses `JimuMapViewComponent` (single map). If `useMapWidgetIds` is
  not set, it falls back to `findFirstArcgisMapWidgetId(appConfig)` from the
  shared LRS lib.
- Two operating modes are represented by `ModeType` (`Map` vs `Layer`) from the
  shared LRS lib. In Map mode, `MapViewLoader` discovers LRS layers from the live
  map view and per-view settings are stored in `config.settingsPerView[jimuMapViewId]`
  and layer configs in `config.mapViewsConfig[jimuMapViewId]`; in Layer mode,
  `config.lrsLayers` is used directly.
- The widget renders one of two subtrees based on `state.operationType`:
  `AddSingleLineEvent` (OperationType.single) or `AddMultipleLineEvents`
  (OperationType.multiple), and a `WidgetPlaceholder` when there is no usable
  network+event config (`hasConfig`).
- Config values are resolved per active map view through
  `getConfigValue(config, key, activeMapViewId, defaultValue)` and gathered by a
  private `getConfigValues(...)` helper, then spread into the active subtree.
- One manifest `REDUX_STORE` extension (extensions/lrs-store) re-exports the
  shared `LrsStoreExtension`. Three manifest `dataActions` feed the widget.

## Key imports and packages
Grouped by file. Note the recurring `widgets/shared-code/lrs` shared library and
the `lrs-store` REDUX extension.

src/config.ts
- `SearchMethod`, `LrsLayer`, `AttributeSets`, `MapViewConfig`, `ModeType`,
  `ReferentConfig` -- from `widgets/shared-code/lrs`
- `ImmutableObject` -- from `seamless-immutable`

src/runtime/widget.tsx
- `React`, `jsx`, `AllWidgetProps`, `DataSourceManager`, `DataSource`,
  `IMState`, `getAppStore`, `WidgetState`, `ImmutableArray`, `Immutable`,
  `ImmutableObject` -- from `jimu-core`
- `IMConfig`, `OperationType`, `SettingsPerView` -- from `../config`
- `defaultMessages as jimuUIDefaultMessages`, `Paper`, `WidgetPlaceholder` -- from `jimu-ui`
- `JimuMapView`, `JimuMapViewComponent` -- from `jimu-arcgis`
- `AddSingleLineEvent` -- from `./components/add-single-line-event`
- `AddMultipleLineEvents` -- from `./components/add-multiple-line-events`
- `GraphicsLayerManager`, `LrsLayer`, `LrsLayerType`, `MapViewLoader`,
  `ModeType`, `RouteInfo`, `checkConflictPrevention`,
  `findFirstArcgisMapWidgetId`, `getConfigValue`, `getModeType`, `isDefined`,
  `isInWidgetController` -- from `widgets/shared-code/lrs`
- `constructSettingsPerView`, `setValuesForView` -- from `../common/utils`
- `getAppConfigAction` -- from `jimu-for-builder`
- `iconSBR` -- from `./../../icon.svg`

src/data-actions/add-line-event.ts (and -from.ts / -to.ts, near-identical imports)
- `AbstractDataAction`, `DataRecordSet`, `MutableStoreManager`, `DataLevel`,
  `getAppStore`, `DataSourceStatus`, `ImmutableObject`,
  `loadArcGISJSAPIModules`, `DataSourceTypes`, `FeatureLayerDataSource`
  (add-line-event.ts only) -- from `jimu-core`
- `RouteInfo`, `EventInfo`, `isDefined`, `getRouteFromEndMeasures`,
  `QueryRouteMeasures`, `NetworkInfo`, `queryRouteIdOrName`,
  `getDateWithTZOffset`, `findNetworkInfoFromMapViewsConfig`,
  `findEventInfoFromMapViewsConfig` -- from `widgets/shared-code/lrs`
- `Polyline` (type), `Point` (type, -from/-to) -- from `esri/geometry/*` (esri/* alias)
- `round` -- from `lodash-es`

src/common/utils.ts
- `getAppStore`, `Immutable`, `ImmutableObject` -- from `jimu-core`
- `ImmutableArray` -- from `seamless-immutable`
- `LrsLayerType`, `LrsLayer`, `ModeType`, `SearchMethod`, `getDefaultNetwork`,
  `getDefaultAttributeSet`, `getDefaultEvent`, `isDefined`, `getAttributeSets`,
  `isLineEvent`, `getDefaultReferentConfig` -- from `widgets/shared-code/lrs`
- `OperationType`, `IMConfig`, `SettingsPerView` -- from `../config`

src/common/use-data-source-exist.tsx
- `ReactRedux`, `IMState`, `IMAppConfig` -- from `jimu-core`

src/extensions/lrs-store.ts
- `LrsStoreExtension` -- from `widgets/shared-code/lrs` (re-export only, 3 lines)

src/setting/setting.tsx
- `Immutable`, `ImmutableArray`, `ImmutableObject`, `React`, `jsx` -- from `jimu-core`
- `Select`, `hooks`, `defaultMessages as jimuUIDefaultMessages` -- from `jimu-ui`
- `SettingChangeFunction`, `AllWidgetSettingProps` -- from `jimu-for-builder`
- `SettingRow`, `SettingSection` -- from `jimu-ui/advanced/setting-components`
- `LrsLayerType`, `isDefined`, `EmptyPlaceholder`, `ModeType`,
  `lrsDefaultMessages`, `getLayersByType`, `LrsLoader`, `LrsLayer`,
  `MapViewConfig`, `getDefaultNetwork`, `getDefaultEvent`,
  `updateDefaultForMapMode`, `getAttributeSets`, `getDefaultAttributeSet`
  -- from `widgets/shared-code/lrs`
- `constructSettingsPerView`, `resetConfig`, `setValuesForView` -- from `../common/utils`
- `LayerConfig` -- from `./layer-config`
- `DefaultSettings` -- from `./default-settings`
- `DisplaySettings` -- from `./display-settings`
- `ConcurrencySettings` -- from `./concurrency-settings`
- `ReferentSettings` -- from `./referent-settings`

src/setting/default-settings.tsx / referent-settings.tsx / layer-config.tsx
- `SettingSection`, `SettingRow` -- from `jimu-ui/advanced/setting-components`
- `CollapsablePanel`, `Option`, `Select`, `Checkbox`, `Switch`, `TextInput`
  -- from `jimu-ui`
- `List`, `TreeItemsType`, `TreeItemType`, `CommandActionDataType`
  -- from `jimu-ui/basic/list-tree` (layer-config.tsx)
- `getConfigValue`, `SearchMethod`, `isLineEvent`, `updateConfig`,
  `GetEsriUnits`, `lrsDefaultMessages`, `ReferentConfig`, `LrsLayer`,
  `LrsLayerType`, `AttributeFieldSettings`, `advancedActionMap`, `ModeType`
  -- from `widgets/shared-code/lrs`
- `useDataSourceExists` -- from `../common/use-data-source-exist`
- `ReferentItemConfig` -- from `./referent-item-config`

## Reusable patterns found
- Three data actions (manifest `dataActions`: `addLineEvent`,
  `addLineEventFrom`, `addLineEventTo`) that route an externally selected feature
  into this widget as line-event geometry:
  - `add-line-event.ts` (whole event): supports polyline records (a single
    `output_line` result from Search By Route/Identify, or up to two network-line
    table records that share the same line id and date range). It queries the
    route polyline via `queryRouteIdOrName`, computes from/to endpoints with
    `getRouteFromEndMeasures` + `QueryRouteMeasures`, and writes both a
    `selectedNetworkDataSource` and a fully populated `selectedRouteInfo`.
  - `add-line-event-from.ts` (from endpoint): supports point records only; sets
    the from measure/point of the line event.
  - `add-line-event-to.ts` (to endpoint): mirror of -from, sets the to
    measure/point.
  All three publish into the widget via
  `MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedRouteInfo' | 'selectedNetworkDataSource', value)`,
  which the widget reads back through `mapExtraStateProps` -> `props.selectedRouteInfo` /
  `props.selectedNetworkDataSource` and consumes in `componentDidUpdate`. All
  three validate against the widget's own config (`lrsLayers`,
  `mapViewsConfig`) and the network's registered `eventLayers` before returning
  `isSupported = true`.
- `GraphicsLayerManager` from the shared LRS lib as a single feedback-graphics
  facade (created with `createHover/createPicked/createPickedTo/createPickedConcurrency/createFlash/createCoordinate`
  flags), replacing the manual multi-`GraphicsLayer` bookkeeping seen in
  lrs/identify. Cleared via `clearHoverGraphic()` etc. and torn down with
  `destroy()`.
- SettingsPerView multi-map config: per `jimuMapViewId` settings are held in
  `config.settingsPerView[id]` and layer bindings in `config.mapViewsConfig[id]`.
  `constructSettingsPerView()` seeds an immutable default block and
  `setValuesForView(...)` fills network/event/intersection layers, attribute
  sets, and defaults. The runtime persists computed per-view settings back to
  app config via `getAppConfigAction().editWidgetConfig(...)`.
- `useDataSourceExists({ widgetId, useDataSourceId })` hook
  (src/common/use-data-source-exist.tsx) reads builder-vs-runtime app config
  (`state.appStateInBuilder.appConfig` when `window.jimuConfig.isBuilder`, else
  `state.appConfig`) and returns whether a given data source is still registered
  on the widget. Used by layer-config to gate lock/unlock UI.
- `REDUX_STORE` extension that only re-exports the shared store
  (extensions/lrs-store.ts is 3 lines). Multiple LRS widgets share the same
  Redux slice this way (lrs-store).
- Reliance on `widgets/shared-code/lrs` for nearly all domain logic (loaders,
  defaults, config accessors, geometry/route queries, units, the Redux store).
  This is the container-shared-code pattern -- cross-ref:
  patterns/container-shared-code.md.
- `notSupportAGOL: true` in the manifest to hide the widget on ArcGIS Online
  (LRS is Enterprise-only).
- `esri/*` alias imports for JSAPI geometry types (`esri/geometry/Polyline`,
  `esri/geometry/Point`) loaded lazily via `loadArcGISJSAPIModules([...])` inside
  the data actions. Cross-ref patterns/arcgis-core-vs-esri-alias.md.

## Builder vs runtime split
- Runtime: src/runtime/widget.tsx + the `AddSingleLineEvent` /
  `AddMultipleLineEvents` subtrees render the live event-authoring UI, own the
  `GraphicsLayerManager`, and consume data-action input.
- Builder: src/setting/setting.tsx (a function component using
  `AllWidgetSettingProps<IMConfig>`). It manages mode selection (`ModeType.Map`
  vs `ModeType.Layer`), map-widget binding (`handleMapWidgetIdUpdated`),
  per-view layer discovery (`LrsLoader`, `getLayersByType`), attribute sets
  (`getAttributeSets`, `getDefaultAttributeSet`), and reset (`resetConfig`). It
  composes `LayerConfig`, `DefaultSettings`, `DisplaySettings`,
  `ReferentSettings`, and `ConcurrencySettings` sub-components.
- On first load, setting.tsx initializes `config.mode` when undefined, choosing
  `Layer` if `config.lrsLayers.length > 0` else `Map`.
- A `useConfigRef` ref plus an `isRunning` semaphore (`waitForSemaphore`)
  serialize async `handleMapViewsConfigUpdated` calls so overlapping map-view
  updates do not clobber each other.
- When more than one map view is configured, setting.tsx renders a `Select`
  ("select map to edit settings") so each view's defaults/display/referent/
  concurrency settings can be edited independently.
- Config shape is defined in src/config.ts (`Config`/`IMConfig` plus the
  per-view `SettingsPerView` and `OperationType` enum), with runtime defaults in
  config.json.

## Lifecycle and cleanup
- `componentDidMount`: seeds `hideTitle` from `isInWidgetController(...)`, sets
  initial `operationType` from `config.defaultType`, applies any incoming
  data-action state (`selectedNetworkDataSource` / `selectedRouteInfo`), and
  calls `setSettingsPerView()`.
- `componentDidUpdate`: when `jimuMapView` changes it removes then recreates the
  graphics layers; it re-applies incoming data-action props only while the
  widget state is `Opened` (or undefined); it recomputes `operationType` and
  per-view settings when `activeLrsLayers` change; and it re-checks
  `checkConflictPrevention(lrsUrl)` to toggle `isConflictPreventionEnabled`.
- `componentWillUnmount`: calls `removeGraphicLayers()`, which invokes
  `graphicsManager.destroy()` and nulls the manager.
- `onActiveViewChange` waits for child data sources via
  `waitForChildDataSourcesReady` (`whenAllJimuLayerViewLoaded` +
  `childDataSourcesReady`) before setting the active `jimuMapView`.
- `resetDataAction()` clears `routeInfoFromDataAction` and
  `networkDataSourceFromDataAction` after the incoming selection is consumed.

## Manifest/config requirements
- `name: "add-line-event"`, `label: "Add Line Event"`, `type: "widget"`,
  version/exbVersion `1.20.0`, `author: "Esri Solutions"`.
- `dependency: "jimu-arcgis"` (map/ArcGIS SDK access required).
- `notSupportAGOL: true` (Enterprise-only).
- `dataActions` (three):
  - `addLineEvent` -> `data-actions/add-line-event` (icon
    runtime/assets/icons/addlineevent-icon.svg)
  - `addLineEventFrom` -> `data-actions/add-line-event-from`
  - `addLineEventTo` -> `data-actions/add-line-event-to`
- `extensions`: `LRS Store` -> `REDUX_STORE` -> `extensions/lrs-store`.
- `defaultSize`: 350x400.
- `translatedLocales`: en plus ~40 locales.
- config.json defaults: `lrsLayers: []`, `networkLayers: []`, `eventLayers: []`,
  `intersectionLayers: []`, `defaultEvent: ""`, `defaultNetwork: ""`,
  `defaultFromMethod: "ROUTEANDMEASURE"`, `defaultToMethod: "ROUTEANDMEASURE"`,
  `defaultType: "SINGLE"`, `hideType/hideEvent/hideNetwork/hideMethod/
  hideAttributeSet/hideMeasures/hideDates: false`, `useRouteStartEndDate: false`,
  `mode: "MAP"`.
  Note: config.json is a flat/global default block; the richer `Config`
  interface in config.ts adds `settingsPerView`, `mapViewsConfig`,
  `attributeSets`, `defaultReferentConfig`, `hideAddToDominantRouteOption`,
  `enableAddToDominantRouteOption`, `notAllowOverrideEventReplacement`, and
  `defaultReferentConfig`. The runtime reconciles per-view vs global values via
  `getConfigValue` and the `constructSettingsPerView` / `setValuesForView`
  helpers.

## Gotchas
- Heavy dependency on `widgets/shared-code/lrs`. This widget cannot be understood
  or copied in isolation; most authoring logic (loaders, defaults, route
  queries, units, geometry graphics, the Redux store, and `GraphicsLayerManager`)
  lives in the shared library. Cross-ref patterns/container-shared-code.md.
- `notSupportAGOL: true` means the widget will not appear/work against ArcGIS
  Online; it targets Enterprise LRS services only.
- Two `DataSourceManager` meanings: the jimu `DataSourceManager` singleton is
  imported in widget.tsx, while src/runtime/data-source/data-source-manager.tsx
  is a LOCAL component. Do not conflate them.
- Data actions read the widget's own app config directly (`getAppConfig()` picks
  `appStateInBuilder.appConfig` in builder vs `appConfig` at runtime) and match
  the selected data source against `config.lrsLayers` / `config.mapViewsConfig`.
  A feature only qualifies (`isSupported`) if its network is registered on THIS
  widget and that network has at least one registered event layer.
- `add-line-event.ts` distinguishes an LRS-widget source (data source id
  contains `output_line`) from a raw network table: LRS sources allow exactly one
  polyline record, while a network table allows up to two records that must share
  the same line id (and matching date range) to represent both ends of a line.
- Data actions read measures case-insensitively
  (`Object.fromEntries(entries.map(([k, v]) => [k.toLowerCase(), v]))`) because
  service field casing (`Measure` vs `measure`) is not guaranteed. Match this
  when adapting the pattern.
- `getConfigValue(config, key, activeMapViewId, defaultValue)` reconciles
  per-view vs global config; adding a config key without updating both config.ts
  and the `constructSettingsPerView` / `setValuesForView` helpers will silently
  drop the setting per view.
- setting.tsx logs via `pWinSt.log/error` (a bundle-injected logger); these calls
  are not a local import and may not exist in a fresh scaffold. UNVERIFIED origin.

## Useful snippets and functions

Single map bind with fallback to first ArcGIS map widget.
Source: src/runtime/widget.tsx
```tsx
if (!useMapWidgetIds) {
  const appConfig = getAppStore()?.getState()?.appConfig
  useMapWidgetIds = findFirstArcgisMapWidgetId(appConfig)
}
// ...
<JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onActiveViewChange={this.onActiveViewChange} />
```

Create and tear down the shared GraphicsLayerManager.
Source: src/runtime/widget.tsx
```tsx
createGraphicLayers (): void {
  if (isDefined(this.state.jimuMapView)) {
    this.removeGraphicLayers()
    const graphicsManager = new GraphicsLayerManager({
      jimuMapView: this.state.jimuMapView,
      createHover: true,
      createPicked: true,
      createPickedTo: true,
      createPickedConcurrency: true,
      createFlash: true,
      createCoordinate: true
    })
    this.setState({ graphicsManager: graphicsManager })
  }
}

removeGraphicLayers (): void {
  if (this.state.graphicsManager) {
    this.state.graphicsManager.destroy()
    this.setState({ graphicsManager: null })
  }
}
```

Wait for child data sources before activating a map view.
Source: src/runtime/widget.tsx
```tsx
waitForChildDataSourcesReady = async (jmv: JimuMapView): Promise<DataSource> => {
  await jmv?.whenAllJimuLayerViewLoaded()
  const ds = DataSourceManager.getInstance().getDataSource(jmv?.dataSourceId)
  if (ds?.isDataSourceSet() && !ds.areChildDataSourcesCreated()) {
    return ds.childDataSourcesReady().then(() => ds).catch((err) => ds)
  }
  return Promise.resolve(ds)
}
```

Compute and persist per-view settings back into app config.
Source: src/runtime/widget.tsx
```tsx
setSettingsPerView = async () => {
  const { config } = this.props
  const lrsLayers = !config.mode || config.mode === ModeType.Map ? this.state.activeLrsLayers : config.lrsLayers
  const isRuntime = !isDefined(config.settingsPerView?.[this.state.activeMapViewId])
  let settingPerView = config.settingsPerView?.[this.state.activeMapViewId] || constructSettingsPerView()
  if (lrsLayers && lrsLayers.length > 0) {
    settingPerView = await setValuesForView(settingPerView, lrsLayers, true, isRuntime)
    this.setState({ settingPerView })
    const newConfig = config.setIn(['settingsPerView', this.state.activeMapViewId], settingPerView)
    getAppConfigAction().editWidgetConfig(this.props.id, newConfig).exec()
  }
}
```

Data action -> widget hand-off via MutableStoreManager.
Source: src/data-actions/add-line-event-from.ts
```ts
if (dataLevel === DataLevel.DataSource) {
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedNetworkDataSource', dataSource)
} else {
  // ...build rteInfo from the picked point/measure...
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedNetworkDataSource', networkDS)
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedRouteInfo', rteInfo)
}
```

Read builder-vs-runtime app config in a data action.
Source: src/data-actions/add-line-event-from.ts
```ts
function getAppConfig () {
  return window.jimuConfig.isBuilder
    ? getAppStore().getState()?.appStateInBuilder?.appConfig
    : getAppStore().getState()?.appConfig
}
```

Hook: is a data source still registered on this widget.
Source: src/common/use-data-source-exist.tsx
```tsx
export function useDataSourceExists (props: Props) {
  const { widgetId, useDataSourceId } = props
  const exists: boolean = ReactRedux.useSelector((state: IMState) => {
    let appConfig: IMAppConfig
    if (window.jimuConfig.isBuilder) {
      appConfig = state.appStateInBuilder.appConfig
    } else {
      appConfig = state.appConfig
    }
    const useDataSources = appConfig.widgets[widgetId].useDataSources ?? []
    return useDataSources.some(useDs => useDs.dataSourceId === useDataSourceId)
  })
  return exists
}
```

Seed immutable per-view default settings block.
Source: src/common/utils.ts
```ts
export function constructSettingsPerView () {
  const settingsPerView: SettingsPerView = {
    networkLayers: [],
    eventLayers: [],
    intersectionLayers: [],
    attributeSets: { attributeSet: [] },
    defaultAttributeSet: '',
    defaultEvent: { index: -1, name: '' },
    defaultNetwork: { index: -1, name: '' },
    // ...hide* flags default to false...
    defaultReferentConfig: { defaultReferentLayer: null, defaultOffsetUnit: 'esriMiles' }
  }
  return Immutable(settingsPerView)
}
```

REDUX_STORE extension re-export (whole file).
Source: src/extensions/lrs-store.ts
```ts
import { LrsStoreExtension } from 'widgets/shared-code/lrs'

export default LrsStoreExtension
```
