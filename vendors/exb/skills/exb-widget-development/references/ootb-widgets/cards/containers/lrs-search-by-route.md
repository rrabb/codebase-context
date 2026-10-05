# OTB Widget: lrs/search-by-route

Online widget doc: No dedicated core-widget doc page (LRS = ArcGIS Location Referencing solution). See https://developers.arcgis.com/experience-builder/guide/widgets-overview/ . UNVERIFIED exact page.

## Purpose
The LRS Search By Route widget lets users locate features along a Linear
Referencing System (LRS) route by measure, line-and-measure, referent, or
coordinate. The user selects a network (and optional referent layer), picks a
search method, enters route/measure/station/coordinate input, and the widget
runs the ArcGIS LRS server operations (measureToGeometry, geometryToMeasure,
referentToGeometry, and route queries) to produce point and/or line results. It
writes results into per-network output point and line data sources, renders them
in a paged result list, and flashes/highlights/zooms the selected geometry on
the map. Selecting a result publishes a `DATA_RECORDS_SELECTION_CHANGE` message
so other widgets can consume the selection. It is authored by "Esri Solutions"
(manifest.json) and belongs to the LRS widget family, not a generic ExB core
widget.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/config.json
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/constants.ts (empty / whitespace only)
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/runtime/components/search-by-route-task.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/runtime/components/search-by-route-result-item.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/runtime/data-source/data-source-manager.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/runtime/utils/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/runtime/utils/service-utils.ts (publishMessage + operation helpers)
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/common/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/extensions/lrs-store.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/search-by-route/src/tools/app-config-operations.ts

Note: the many form/result sub-components (search-by-route-method-form,
search-by-route-measure-form, search-by-line-measure-form,
search-by-referent-form, search-by-coordinates-form, search-by-route-results,
search-by-route-result-list, measure/route/measures input controls,
item-feature-info, status-utils, graphics-utils) exist in the tree and are
referenced from the inspected files, but were only partially read; details
attributed to them are UNVERIFIED. Setting sub-components under
src/setting/components/ (network-item-config, referent-item-config,
default-settings) were not fully read.

## Architecture overview
- `dependency: "jimu-arcgis"` (manifest.json) so the widget can bind a map and
  use the ArcGIS Maps SDK. `notSupportAGOL: true` restricts it to ArcGIS
  Enterprise (LRS services are Enterprise-only).
- The runtime root is a class component (`Widget extends React.PureComponent`)
  in src/runtime/widget.tsx. It owns one `GraphicsLayer` (coordinate graphics),
  the active `JimuMapView`, and the active `LrsLayer[]` for the current view.
- Map binding uses `JimuMapViewComponent` (single map). If `useMapWidgetIds` is
  not set, it falls back to `findFirstArcgisMapWidgetId(appConfig)` from
  `widgets/shared-code/lrs`.
- Two operating modes are represented by `ModeType` (`Map` vs `Layer`) from the
  shared LRS lib. In Map mode, `MapViewLoader` discovers LRS layers from the
  live map view (outputDataSourceType='searchByRoute'); in Layer mode,
  `config.lrsLayers` is used directly. Per-view settings live in
  `config.settingsPerView[jimuMapViewId]` and layer configs in
  `config.mapViewsConfig[jimuMapViewId]`.
- The heavy runtime logic lives in the `SearchByRouteTask` function component
  (src/runtime/components/search-by-route-task.tsx), which composes:
  - `DataSourceManager` (local component in src/runtime/data-source/, not the
    jimu manager) to create the origin network data source and the output line
    and point data sources.
  - Four search forms chosen by `SearchMethod` (`Measure`, `LineAndMeasure`,
    `Coordinate`, `Referent`) driven via refs so a single footer Search button
    submits the active form.
  - `SearchTaskResult` (result list) plus per-item `SearchByRouteResultItem`.
- Manifest extensions: an `APP_CONFIG_OPERATIONS` tool
  (tools/app-config-operations) and a `REDUX_STORE` extension
  (extensions/lrs-store) that just re-exports the shared `LrsStoreExtension`.
- The widget can generate multiple output data sources
  (`canGenerateMultipleOutputDataSources: true`, plus
  `canConsumeDataAction` and `coverLayoutBackground` in manifest properties).

## Key imports and packages
Grouped by file. Note the recurring `widgets/shared-code/lrs` shared library and
the `esri/*` alias.

src/runtime/widget.tsx
- `jimu-core`: `React`, `jsx`, `AllWidgetProps`, `DataSourceManager` (jimu
  manager, distinct from the local component of the same name), `DataSource`,
  `Immutable`, `ImmutableArray`, `getAppStore`.
- `widgets/shared-code/lrs`: `isInWidgetController`, `isDefined`,
  `LrsLayerType`, `LrsLayer` (type), `MapViewLoader`,
  `findFirstArcgisMapWidgetId`, `getModeType`, `getConfigValue`, `ModeType`.
- `jimu-ui`: `defaultMessages` (as jimuUIDefaultMessages), `Paper`,
  `WidgetPlaceholder`.
- `jimu-arcgis`: `JimuMapView` (type), `JimuMapViewComponent`.
- `esri/layers/GraphicsLayer` (esri alias, JSAPI).
- Local: `../config` (IMConfig), `./translations/default`, `./../../icon.svg`,
  `./components/search-by-route-task`, `../common/utils`
  (constructSettingsPerView, setValuesForView).

src/runtime/components/search-by-route-task.tsx
- `jimu-core`: `React`, `jsx`, `css`, `hooks`, `classNames`, `DataRecord`,
  `ImmutableObject`, `DataSource`, `DataSourceStatus`, `MessageManager`,
  `DataRecordSetChangeMessage`, `RecordSetChangeType`, `loadArcGISJSAPIModules`,
  `FeatureLayerDataSource`, `QueriableDataSource`, `IntlShape`, `Immutable`,
  `ImmutableArray`, `FeatureDataRecord`.
- `widgets/shared-code/lrs`: `LrsLayer`, `LrsLayerType`, `SearchMethod`,
  `SpatialReferenceFrom`, `createLabelLayer`, `isDefined`, `removeLabelLayer`,
  `isWithinTolerance`.
- `jimu-ui`: `Alert`, `Button`, `FOCUSABLE_CONTAINER_CLASS`, `Label`, `Tooltip`;
  `jimu-ui/lib/components/alert/type` (`AlertType`).
- `jimu-arcgis`: `JimuMapView` (type).
- `jimu-theme`: `getTheme`.
- `esri/layers/GraphicsLayer` (type, esri alias).
- Local: `../utils/service-utils` (executeMeasureToGeometry, queryRoutes,
  executeReferentToGeometry, executeGeometryToMeasure, queryRoutesByGeometry,
  queryRoutesByGeometryWithTolerance, queryRoutesByClosestResults,
  executeGeometryToMeasureWithTolerance, executeMeasureToGeometryLine,
  getAliasRecord), `../data-source/data-source-manager` (local DataSourceManager),
  `../data-source/use-data-source-exist` (useDataSourceExists),
  `../utils/utils` (createLabelExpression, getLabelFields), plus the form/result
  sub-components.

src/runtime/components/search-by-route-result-item.tsx
- `jimu-core`: `React`, `ReactRedux`, `jsx`, `css`, `DataSource`,
  `FeatureDataRecord`, `MessageManager`, `DataRecordsSelectionChangeMessage`,
  `IMState`, `classNames`, `DataRecord`, `IntlShape`, `ImmutableObject`,
  `FeatureLayerDataSource`, `ImmutableArray`.
- `jimu-arcgis`: `geometryUtils`, `JimuMapView`.
- `esri/layers/GraphicsLayer` (type), `esri/Graphic` (esri alias).
- `widgets/shared-code/lrs`: `getGeometryGraphic`, `isDefined`, `LrsLayer`.

src/runtime/data-source/data-source-manager.tsx
- `jimu-core`: `React`, `jsx`, `ImmutableObject`, `DataSource`, `Immutable`,
  `UseDataSource`, `DataSourceComponent`, `DataSourceStatus`,
  `IMDataSourceInfo`.
- `widgets/shared-code/lrs`: `LrsLayer`.

src/common/utils.ts
- `jimu-core`: `Immutable`, `ImmutableObject`.
- `widgets/shared-code/lrs`: `LrsLayer`, `ModeType`, `highlightColor`,
  `colorBlack`, `LrsLayerType`, `ReferentProperties`.

src/setting/setting.tsx
- `jimu-core`: `React`, `ReactRedux` (via hooks), `Immutable`, `jsx`,
  `ImmutableArray`, `ImmutableObject`.
- `jimu-ui`: `hooks`, `defaultMessages` (jimuUIDefaultMessages), `Select`;
  `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`.
- `jimu-for-builder`: `AllWidgetSettingProps`, `SettingChangeFunction`.
- `widgets/shared-code/lrs`: `EmptyPlaceholder`, `LrsLoader`, `ModeType`,
  `LrsLayerType`, `lrsDefaultMessages`, `LrsLayer`, `MapViewConfig`,
  `getConfigValue`, `isDefined`.
- Local setting components: `./components/referent-item-config`,
  `./components/network-item-config`, `./components/default-settings`.

src/extensions/lrs-store.ts
- `widgets/shared-code/lrs`: `LrsStoreExtension` (re-exported as default). This
  is the LRS REDUX store extension shared across the LRS widget family.

src/tools/app-config-operations.ts
- `jimu-core`: `extensionSpec`, `IMAppConfig`, `DuplicateContext`.

## Reusable patterns found
- Single-map binding via `JimuMapViewComponent` + `onActiveViewChange`, with a
  `findFirstArcgisMapWidgetId(appConfig)` fallback when `useMapWidgetIds` is
  unset. See patterns/container-shared-code.md.
- `GraphicsLayer` lifecycle owned by the widget: created on map-view change,
  `removeAll()` + `destroy()` on unmount and before re-create
  (`listMode: 'hide'`, added with `map.addMany`).
- LRS layer typing and mode handling from `widgets/shared-code/lrs`
  (`LrsLayerType`, `ModeType`, `getModeType`, `MapViewLoader`, `getConfigValue`).
  The widget filters `LrsLayerType.Network` to decide whether it has a usable
  configuration.
- Shared LRS REDUX store: `extensions/lrs-store` re-exports `LrsStoreExtension`
  from `widgets/shared-code/lrs`; the widget declares it as a `REDUX_STORE`
  manifest extension. Cross-ref patterns/container-shared-code.md.
- Selection propagation via `MessageManager.getInstance().publishMessage(new
  DataRecordsSelectionChangeMessage(widgetId, records, [dataSourceId]))` on
  result-item click, matching the manifest `DATA_RECORDS_SELECTION_CHANGE`
  publish message (carry `OUTPUT_DATA_SOURCE`).
- Output data-source record-set publishing via `DataRecordSetChangeMessage`
  (`RecordSetChangeType.CreateUpdate` when results are written,
  `RecordSetChangeType.Remove` when cleared), matching the manifest
  `DATA_RECORD_SET_CHANGE` publish message (carry `USE_DATA_SOURCE`).
- Local `DataSourceManager` component wrapping three `DataSourceComponent`s
  (network origin + output line + output point) to create/track data sources by
  id from `networkInfo.outputLineDsId` / `outputPointDsId` / `useDataSource`.
- JSAPI geometry ops loaded lazily with `loadArcGISJSAPIModules([...])` for
  `esri/time/TimeExtent`, `esri/geometry/Point`, `esri/geometry/SpatialReference`,
  `esri/geometry/operators/proximityOperator`.
- Ref-driven form submission: each search form exposes `submitForm()` via a ref;
  the task's footer button calls the ref for the currently selected
  `SearchMethod`.

## Builder vs runtime split
- Runtime: src/runtime/** (widget.tsx + components/ + data-source/ + utils/ +
  translations/). Reads `config`, binds the map, runs LRS operations, and
  publishes messages.
- Builder: src/setting/setting.tsx (+ src/setting/components/**). Uses
  `AllWidgetSettingProps<IMConfig>`, `SettingSection`/`SettingRow`, and the
  shared `LrsLoader`/`EmptyPlaceholder`. It manages Map vs Layer mode
  (`ModeType`), map-widget selection (`handleMapWidgetIdUpdated` calls
  `resetConfig`), per-view settings, network/referent item config, and default
  settings.
- Shared between build and runtime: src/config.ts (config typings) and
  src/common/utils.ts (constructSettingsPerView, setValuesForView,
  getDefaultReferent, getDefaultNetwork, resetConfig, getReferentProperties).
- App-config operation: src/tools/app-config-operations.ts remaps output data
  source ids (`outputLineDsId`, `outputPointDsId`) via `contentMap` when the
  widget/page is copied (`afterWidgetCopied`); `widgetWillRemove` is a no-op.

## Lifecycle and cleanup
- `componentDidMount`: detects whether the widget is inside a Widget Controller
  (`isInWidgetController`) and sets `hideTitle` accordingly.
- `componentDidUpdate`: when the `jimuMapView` changes, removes then re-creates
  the coordinate `GraphicsLayer`.
- `componentWillUnmount`: calls `removeGraphicLayers()` which does
  `removeAll()` + `destroy()` and nulls state.
- `onActiveViewChange` waits for child data sources via
  `waitForChildDataSourcesReady` (`whenAllJimuLayerViewLoaded` +
  `childDataSourcesReady`) before storing the active `JimuMapView`.
- In `SearchByRouteTask`, `onNavBack` clears selection/records/status on the
  active output DS, removes the label layer (`removeLabelLayer`), and publishes a
  `Remove` record-set change; it is re-run whenever `lrsLayers` change.
- Result submission clears prior data first (`publishDataClearedMsg` + reset
  `recordsRef`) before writing new records.

## Manifest/config requirements
- `dependency: "jimu-arcgis"`, `notSupportAGOL: true`.
- `publishMessages`: `DATA_RECORDS_SELECTION_CHANGE` (carry `OUTPUT_DATA_SOURCE`)
  and `DATA_RECORD_SET_CHANGE` (carry `USE_DATA_SOURCE`). No `messageActions`.
- `properties`: `canConsumeDataAction: true`, `coverLayoutBackground: true`,
  `canGenerateMultipleOutputDataSources: true`.
- `defaultSize`: 350 x 400.
- `extensions`: `appConfigOperations` (point `APP_CONFIG_OPERATIONS`, uri
  `tools/app-config-operations`) and `LRS Store` (point `REDUX_STORE`, uri
  `extensions/lrs-store`).
- config.json defaults (see also src/config.ts `Config`/`IMConfig`):
  `lrsLayers: []`, `highlightStyle {color:'#00FFFF', size:3}`,
  `labelStyle {color:'#000000', size:12}`,
  `resultConfig {pageSize:25, defaultReferentLayer:null, defaultOffsetUnit:''}`,
  `defaultNetwork:''`, `hideMethod:false`, `hideNetwork:false`, `mode:'MAP'`.
  In Map mode, per-view settings/layers live under `settingsPerView` and
  `mapViewsConfig` keyed by `jimuMapViewId`.

## Gotchas
- Two different `DataSourceManager` symbols are in play: the jimu-core singleton
  (imported in widget.tsx) and the local wrapper component in
  src/runtime/data-source/data-source-manager.tsx. Do not confuse them.
- src/constants.ts is empty (whitespace only); do not expect shared constants
  there.
- `setValuesForView` has a likely bug: it sets `hideRoute` from
  `settingsPerView.hideMethod` (not `hideRoute`). Preserved here as-is from
  source; treat `hideRoute` derivation with caution.
- The coordinate search path falls back to a tolerance query
  (`queryRoutesByGeometryWithTolerance` +
  `executeGeometryToMeasureWithTolerance`) and then picks the closest result
  using `proximityOperator.getNearestCoordinate`; spatial reference is chosen
  from `networkInfo.defaultSpatialReferenceFrom` (Map => wkid 102100, else the
  network's wkid/wkt).
- Label layers are only created when `labelStyle.size > 0`; otherwise labeling is
  skipped entirely.
- `notSupportAGOL: true` means this widget will not work against ArcGIS Online;
  LRS services require ArcGIS Enterprise.

## Useful snippets and functions

Source: src/runtime/widget.tsx (GraphicsLayer create/remove lifecycle)
```tsx
removeGraphicLayers (): void {
  if (isDefined(this.state.coordinateGraphic)) {
    this.state.coordinateGraphic.removeAll()
    this.state.coordinateGraphic.destroy()
    this.setState({ coordinateGraphic: null })
  }
}

createGraphicLayers (): void {
  if (isDefined(this.state.jimuMapView)) {
    this.removeGraphicLayers()
    const newCoordinateGraphicLayer = new GraphicsLayer({ listMode: 'hide' })
    this.state.jimuMapView?.view?.map.addMany([newCoordinateGraphicLayer])
    this.setState({ coordinateGraphic: newCoordinateGraphicLayer })
  }
}
```

Source: src/runtime/widget.tsx (map-widget fallback + wait for child data sources)
```tsx
waitForChildDataSourcesReady = async (jmv: JimuMapView): Promise<DataSource> => {
  await jmv?.whenAllJimuLayerViewLoaded()
  const ds = DataSourceManager.getInstance().getDataSource(jmv?.dataSourceId)
  if (ds?.isDataSourceSet() && !ds.areChildDataSourcesCreated()) {
    return ds.childDataSourcesReady().then(() => ds).catch(err => ds)
  }
  return Promise.resolve(ds)
}
```
```tsx
if (!useMapWidgetIds) {
  const appConfig = getAppStore()?.getState()?.appConfig
  useMapWidgetIds = findFirstArcgisMapWidgetId(appConfig)
}
```

Source: src/runtime/components/search-by-route-result-item.tsx (publish selection change)
```tsx
const handleClickResultItem = React.useCallback(() => {
  const dataSourceId = outputDS.id
  const dataItemRecordId = data.getId()
  const nextSelectedDataItems = (outputDS.getSelectedRecordIds() ?? []).includes(dataItemRecordId) ? [] : [data]
  if (dataSourceId && nextSelectedDataItems?.length > 0) {
    MessageManager.getInstance().publishMessage(new DataRecordsSelectionChangeMessage(widgetId, nextSelectedDataItems, [dataSourceId]))
    outputDS.selectRecordsByIds?.(nextSelectedDataItems.map((item) => item.getId()))
    highlightGeometry(data)
  } else {
    clearAllHighLights()
  }
}, [data, outputDS, widgetId, highlightGeometry, clearAllHighLights])
```

Source: src/runtime/components/search-by-route-task.tsx (publish/clear output record set)
```tsx
const publishDataClearedMsg = React.useCallback(() => {
  if (outputLineDS && outputPointDS) {
    const id = isOutputPoint ? outputPointDS.id : outputLineDS.id
    const dataRecordSetChangeMessage = new DataRecordSetChangeMessage(widgetId, RecordSetChangeType.Remove, [id])
    MessageManager.getInstance().publishMessage(dataRecordSetChangeMessage)
  }
}, [outputLineDS, outputPointDS, isOutputPoint, widgetId])
```

Source: src/runtime/utils/service-utils.ts (publish CreateUpdate record set for output DS)
```ts
function publishMessage (outputDS: FeatureLayerDataSource, widgetId: string) {
  if (!outputDS) { return }
  const originDs: FeatureLayerDataSource = outputDS.getOriginDataSources()[0] as FeatureLayerDataSource
  const popupInfo = originDs.getPopupInfo()
  const layerDefinition = originDs.getLayerDefinition()
  const getDefaultFieldInfos = () =>
    [
      { fieldName: layerDefinition?.objectIdField ?? 'objectid', label: 'OBJECTID', tooltip: '', visible: true }
    ] as IFieldInfo[]
  const fieldInfos = ((fieldInfos) => (fieldInfos.length ? fieldInfos : getDefaultFieldInfos()))(
    (popupInfo?.fieldInfos || []).filter((i) => i.visible)
  )

  const dataRecordSetChangeMessage = new DataRecordSetChangeMessage(widgetId, RecordSetChangeType.CreateUpdate, [{
    records: outputDS.getRecords(),
    fields: fieldInfos.map((fieldInfo) => fieldInfo.fieldName),
    dataSource: outputDS,
    name: outputDS.id
  }])

  MessageManager.getInstance().publishMessage(dataRecordSetChangeMessage)
}
```

Source: src/runtime/data-source/data-source-manager.tsx (three DataSourceComponents: origin + line + point)
```tsx
return (
  <div>
    <DataSourceComponent
      useDataSource={useLineOutputDs}
      onDataSourceCreated={handleLineOutputDataSourceCreated} />
    <DataSourceComponent
      useDataSource={usePointOutputDs}
      onDataSourceCreated={handlePointOutputDataSourceCreated}
      onCreateDataSourceFailed={handlePointOutputDataSourceFailed} />
    <DataSourceComponent
      useDataSource={selectedNetwork.useDataSource}
      onDataSourceInfoChange={handleDsInfoChange}
      onCreateDataSourceFailed={handleDsCreateFailed}
      onDataSourceCreated={handleDsCreated} />
  </div>
)
```

Source: src/common/utils.ts (default per-view settings factory)
```ts
export function constructSettingsPerView () {
  const settingsPerView: SettingsPerView = {
    highlightStyle: { color: highlightColor, size: 2 },
    labelStyle: { color: colorBlack, size: 12 },
    resultConfig: { pageSize: 100, defaultReferentLayer: null, defaultOffsetUnit: '' },
    defaultNetwork: '',
    hideMethod: false,
    hideNetwork: false,
    hideRoute: false,
  }

  return Immutable(settingsPerView)
}
```

Source: src/tools/app-config-operations.ts (remap output DS ids on copy)
```ts
config.lrsLayers?.forEach((networkItem, index) => {
  if (networkItem.networkInfo.outputLineDsId && contentMap[networkItem.networkInfo.outputLineDsId]) {
    newAppConfig = newAppConfig.setIn(['widgets', destWidgetId, 'config', 'lrsLayers', `${index}`, 'networkInfo', 'outputLineDsId'], contentMap[networkItem.networkInfo.outputLineDsId])
  }
  if (networkItem.networkInfo.outputPointDsId && contentMap[networkItem.networkInfo.outputPointDsId]) {
    newAppConfig = newAppConfig.setIn(['widgets', destWidgetId, 'config', 'lrsLayers', `${index}`, 'networkInfo', 'outputPointDsId'], contentMap[networkItem.networkInfo.outputPointDsId])
  }
})
```

Source: src/extensions/lrs-store.ts (shared LRS REDUX store extension)
```ts
import { LrsStoreExtension } from 'widgets/shared-code/lrs'

export default LrsStoreExtension
```
