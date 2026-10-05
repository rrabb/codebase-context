# OTB Widget: lrs/identify

Online widget doc: No dedicated core-widget doc page (LRS ships with the ArcGIS Location Referencing solution). See https://developers.arcgis.com/experience-builder/guide/widgets-overview/ and the ArcGIS Location Referencing docs. UNVERIFIED exact page.

## Purpose
The LRS Identify widget lets users click a point on the map and identify the
route(s) and measure(s) at that location for a configured Linear Referencing
System (LRS). It resolves the picked map point against configured network,
event, and intersection layers, shows the results in a floating popup, flashes
and highlights the selected geometry, and writes the picked feature into an
`identify` output data source so other widgets can consume the selection. It is
authored by "Esri Solutions" (manifest.json) and is part of the LRS widget
family, not a generic ExB core widget.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/config.json
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/runtime/constants.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/runtime/components/identify-route.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/runtime/components/route-picker-popup.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/common/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/extensions/lrs-store.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/tools/app-config-operations.ts

Note: `route-picker.tsx`, `data-source/*`, and `utils/service-utils.tsx` exist in
the tree but were only partially inspected; details attributed to them are marked
UNVERIFIED where relevant. Setting sub-components under `src/setting/componenets/`
(note the misspelled folder name) were not fully read.

## Architecture overview
- `dependency: "jimu-arcgis"` (manifest.json) so the widget can bind a map and
  use the ArcGIS Maps SDK. `notSupportAGOL: true` restricts it to ArcGIS
  Enterprise (LRS services are Enterprise-only).
- The widget is a class component (`Widget extends React.PureComponent`) in
  src/runtime/widget.tsx. It owns three `GraphicsLayer`s (hover, picked, flash)
  and the active `JimuMapView`.
- Map binding uses `JimuMapViewComponent` (single map). If `useMapWidgetIds` is
  not set, it falls back to `findFirstArcgisMapWidgetId(appConfig)` from
  `widgets/shared-code/lrs`.
- Two operating modes are represented by `ModeType` (`Map` vs `Layer`) from the
  shared LRS lib. In Map mode, `MapViewLoader` discovers LRS layers from the live
  map view; in Layer mode, `config.lrsLayers` is used directly. Per-view settings
  are stored in `config.settingsPerView[jimuMapViewId]` and layer configs in
  `config.mapViewsConfig[jimuMapViewId]`.
- The heavy runtime logic lives in the `IdentifyRoute` component
  (src/runtime/components/identify-route.tsx), which composes:
  - `DataSourceManager` (local component, not the jimu manager) to create the
    output point data source.
  - `RoutePicker` to capture map clicks and resolve routes/measures.
  - `RoutePickerPopup` to render results, publish messages, and drive the output
    data source.
- Two manifest extensions: an `APP_CONFIG_OPERATIONS` tool
  (tools/app-config-operations) and a `REDUX_STORE` extension
  (extensions/lrs-store) that just re-exports the shared `LrsStoreExtension`.

## Key imports and packages
Grouped by file. Note the recurring `widgets/shared-code/lrs` shared library.

src/config.ts
- `ImmutableObject` -- from `seamless-immutable`
- `FeatureLayerDataSource`, `DataSource` -- from `jimu-core`
- `AttributeSet`, `AttributeSets`, `DefaultInfo`, `LrsLayer`, `MapViewConfig`,
  `ModeType` -- from `widgets/shared-code/lrs`

src/runtime/widget.tsx
- `React`, `jsx`, `AllWidgetProps`, `DataSourceManager`, `DataSource`, `css`,
  `ImmutableArray`, `Immutable`, `getAppStore` -- from `jimu-core`
- `defaultMessages as jimuUIDefaultMessages`, `Paper`, `WidgetPlaceholder` -- from `jimu-ui`
- `JimuMapView`, `JimuMapViewComponent` -- from `jimu-arcgis`
- `GraphicsLayer` -- from `esri/layers/GraphicsLayer` (esri/* alias)
- `IdentifyRoute` -- from `./components/identify-route`
- `isDefined`, `RouteInfo`, `getGeometryGraphic`, `getSimpleLineGraphic`,
  `getSimplePointGraphic`, `LrsLayerType`, `LrsLayer`, `MapViewLoader`,
  `findFirstArcgisMapWidgetId`, `getModeType`, `getConfigValue`, `ModeType`
  -- from `widgets/shared-code/lrs`
- `colorCyan`, `colorGreen` -- from `./constants`
- `constructSettingsPerView`, `setValuesForView` -- from `../common/utils`

src/runtime/components/identify-route.tsx
- `React`, `jsx`, `ImmutableArray`, `DataSource`, `IntlShape` -- from `jimu-core`
- `JimuMapView` -- from `jimu-arcgis`
- `GraphicsLayer` -- from `esri/layers/GraphicsLayer` (esri/* alias)
- `DataSourceManager` -- from `../data-source/data-source-manager` (LOCAL component)
- `RoutePicker` -- from `./route-picker`
- `RoutePickerPopup` -- from `./route-picker-popup`
- `isDefined`, `RouteInfo`, `getGeometryGraphic`, `getSimpleLineGraphic`,
  `getSimplePointGraphic`, `LrsLayer`, `NetworkInfo`, `AttributeSets`,
  `DefaultInfo` -- from `widgets/shared-code/lrs`
- `getDataRecord` -- from `../utils/service-utils`

src/runtime/components/route-picker-popup.tsx
- `React`, `ReactRedux`, `IMState`, `DataRecord`, `hooks`, `jsx`,
  `DataRecordSet`, `DataSourceStatus`, `DataRecordSetChangeMessage`,
  `MessageManager`, `RecordSetChangeType`, `IntlShape`, `DataSource`,
  `FeatureLayerDataSource`, `ImmutableArray` -- from `jimu-core`
- `FloatingPanel`, `Select`, `Label`, `Pagination`, `CollapsablePanel`,
  `DataActionList`, `DataActionListStyle` (and types) -- from `jimu-ui`
- `CalciteTable`, `CalciteTableRow`, `CalciteTableHeader`, `CalciteTableCell`
  -- from `calcite-components`
- `FeatureLayer` -- from `@arcgis/core/layers/FeatureLayer` (@arcgis/core)
- `IFieldInfo` -- from `@esri/arcgis-rest-feature-service`
- `Graphic` -- from `esri/Graphic` (esri/* alias)
- `RouteInfo`, `getDateWithTZOffset`, `isDefined`, `formatMessage`,
  `getCalciteBasicTheme`, `NetworkInfo`, `measureFields`, `LrsLayer` -- from
  `widgets/shared-code/lrs`

src/common/utils.ts
- `Immutable`, `ImmutableObject` -- from `jimu-core`
- `ImmutableArray` -- from `seamless-immutable`
- `LrsLayerType`, `LrsLayer`, `ModeType`, `getDefaultEvent`,
  `getDefaultNetwork`, `getDefaultAttributeSet`, `highlightColor` -- from
  `widgets/shared-code/lrs`

src/extensions/lrs-store.ts
- `LrsStoreExtension` -- from `widgets/shared-code/lrs` (re-export only)

src/setting/setting.tsx
- `Immutable`, `React`, `jsx`, `ImmutableArray`, `ImmutableObject` -- from `jimu-core`
- `SettingChangeFunction`, `AllWidgetSettingProps` -- from `jimu-for-builder`
- `SettingRow`, `SettingSection` -- from `jimu-ui/advanced/setting-components`
- `hooks`, `defaultMessages as jimuUIDefaultMessages`, `Select` -- from `jimu-ui`
- `EmptyPlaceholder`, `getAttributeSets`, `getDefaultAttributeSet`,
  `getDefaultEvent`, `getDefaultNetwork`, `getLayersByType`, `isDefined`,
  `lrsDefaultMessages`, `LrsLayer`, `LrsLayerType`, `LrsLoader`, `MapViewConfig`,
  `ModeType`, `updateDefaultForMapMode` -- from `widgets/shared-code/lrs`
- `constructSettingsPerView`, `resetConfig`, `setValuesForView` -- from `../common/utils`
- `LayerConfig` -- from `./componenets/layer-item-config`
- `DefaultSettings` -- from `./componenets/default-settings`

src/tools/app-config-operations.ts
- `extensionSpec`, `IMAppConfig`, `DuplicateContext` -- from `jimu-core`
- `LrsLayerType` -- from `widgets/shared-code/lrs`

## Reusable patterns found
- Single map binding via `JimuMapViewComponent` with a graceful fallback to
  `findFirstArcgisMapWidgetId(appConfig)` when `useMapWidgetIds` is empty. See
  src/runtime/widget.tsx.
- Manual `GraphicsLayer` management for map feedback: three dedicated layers
  (hover / picked / flash), created on active-view change, added with
  `map.addMany([...])`, and torn down with `removeAll()` + `destroy()`. The flash
  layer uses chained `setTimeout` calls to blink the selected geometry 3x.
- `LrsLayerType` filtering (`Network`, `Event`, `LineEvent`, `PointEvent`,
  `Intersection`) to split configured LRS layers into role-specific groups (see
  `setValuesForView` in src/common/utils.ts and `supportedLrsLayerTypes` in
  widget.tsx).
- Reliance on the `widgets/shared-code/lrs` shared library for nearly all domain
  logic: geometry graphics (`getGeometryGraphic`, `getSimpleLineGraphic`,
  `getSimplePointGraphic`), layer discovery (`MapViewLoader`, `LrsLoader`), mode
  helpers (`getModeType`, `ModeType`), config accessors (`getConfigValue`),
  defaults (`getDefaultNetwork`, `getDefaultEvent`, `getDefaultAttributeSet`),
  and the `LrsStoreExtension` Redux store. This is the container-shared-code
  pattern -- cross-ref: patterns/container-shared-code.md.
- `REDUX_STORE` extension that only re-exports the shared store
  (extensions/lrs-store.ts is 3 lines). Multiple LRS widgets can share the same
  Redux slice this way.
- Cross-widget publishing: `MessageManager.getInstance().publishMessage(new
  DataRecordSetChangeMessage(...))` in route-picker-popup.tsx after populating the
  output data source. The manifest also declares publishing of
  `DATA_RECORDS_SELECTION_CHANGE` (carrying `OUTPUT_DATA_SOURCE`) and
  `DATA_RECORD_SET_CHANGE` (carrying `USE_DATA_SOURCE`). The selection-change
  message is emitted implicitly via `outputDS.selectRecordById(id)`. UNVERIFIED
  exact emission site.
- Output data source lifecycle on a `FeatureLayerDataSource`: `clearRecords()` /
  `clearSelection()` / `setStatus` / `setCountStatus` (`DataSourceStatus`), then
  `setSourceRecords` + `setRecords` + `selectRecordById`. Records are built with
  `outputDS.buildRecord(graphic)`.
- `notSupportAGOL: true` in the manifest to hide the widget on ArcGIS Online
  (LRS is Enterprise-only).
- `afterWidgetCopied` app-config operation that remaps the network output data
  source id (`networkInfo.outputPointDsId`) through the `contentMap` when a page
  is duplicated, so copied widgets keep valid data-source linkage.

## Builder vs runtime split
- Runtime: src/runtime/widget.tsx + the `IdentifyRoute` subtree render the live
  identify UI, own the map graphics, and drive the output data source.
- Builder: src/setting/setting.tsx (a function component using
  `AllWidgetSettingProps<IMConfig>`). It manages mode selection
  (`ModeType.Map` vs `ModeType.Layer`), map-widget binding
  (`handleMapWidgetIdUpdated`), per-view layer/default settings, attribute sets,
  and reset (`resetConfig`). It composes `LayerConfig` and `DefaultSettings`
  sub-components and uses shared LRS setting helpers (`LrsLoader`,
  `getLayersByType`, `getDefaultNetwork`, etc.).
- On first load, setting.tsx initializes `config.mode` when undefined, choosing
  `Layer` if `config.lrsLayers.length > 0` else `Map`.
- Config shape is defined in src/config.ts (`Config`/`IMConfig`), with runtime
  defaults in config.json.

## Lifecycle and cleanup
- `componentDidUpdate`: when `jimuMapView` changes, removes then recreates the
  three graphics layers.
- `componentWillUnmount`: calls `removeGraphicLayers()` (each layer:
  `removeAll()` + `destroy()` + state reset to null).
- `onActiveViewChange` waits for child data sources via
  `waitForChildDataSourcesReady` (`whenAllJimuLayerViewLoaded` +
  `childDataSourcesReady`) before setting the active `jimuMapView`.
- In IdentifyRoute, a `view.on('click', handler)` effect suppresses default map
  click behavior while the route picker is active and removes the handler in its
  cleanup. Popup enablement is toggled: `view.popupEnabled = false` while
  picking, restored to `defaultShowPp` when picking stops.
- The output data source is reset (`clearRecords`/`clearSelection`/`setStatus`
  NotReady) before each new set of records is written.

## Manifest/config requirements
- `name: "identify"`, `label: "LRS Identify"`, `type: "widget"`,
  version/exbVersion `1.20.0`, `author: "Esri Solutions"`.
- `dependency: "jimu-arcgis"` (map/ArcGIS SDK access required).
- `notSupportAGOL: true` (Enterprise-only).
- `publishMessages`:
  - `DATA_RECORDS_SELECTION_CHANGE` with `messageCarryData: "OUTPUT_DATA_SOURCE"`
  - `DATA_RECORD_SET_CHANGE` with `messageCarryData: "USE_DATA_SOURCE"`
- `properties`: `canConsumeDataAction: true`,
  `canGenerateMultipleOutputDataSources: true`.
- `defaultSize`: 100x50 with `autoWidth`/`autoHeight` true.
- `extensions`:
  - `appConfigOperations` -> `APP_CONFIG_OPERATIONS` -> `tools/app-config-operations`
  - `LRS Store` -> `REDUX_STORE` -> `extensions/lrs-store`
- config.json defaults: `lrsLayers: []`, `networkLayers: []`, `eventLayers: []`,
  `intersectionLayers: []`, `defaultEvent: ""`, `defaultMethod: "ROUTEANDMEASURE"`,
  `defaultType: "SINGLE"`, `defaultAttributeSet: ""`, `attributeSets: []`,
  `eventToggle: false`, `mode: "MAP"`.
  Note: config.json keys differ somewhat from the richer `Config` interface in
  config.ts (which uses `settingsPerView`, `mapViewsConfig`, `highlightStyle`,
  `defaultPointAttributeSet`/`defaultLineAttributeSet`, etc.). The runtime builds
  the effective per-view settings via `constructSettingsPerView` /
  `setValuesForView`.

## Gotchas
- Heavy dependency on `widgets/shared-code/lrs`. This widget cannot be understood
  or copied in isolation; most identify logic (geometry, loaders, defaults,
  Redux store) lives in the shared library. Cross-ref
  patterns/container-shared-code.md.
- `notSupportAGOL: true` means the widget will not appear/work against ArcGIS
  Online; it targets Enterprise LRS services only.
- Two data-source layers of meaning: the local `DataSourceManager` component
  (src/runtime/data-source/data-source-manager.tsx) is NOT the jimu
  `DataSourceManager` singleton (the singleton is imported separately in
  widget.tsx). Do not conflate them.
- Setting sub-component folder is spelled `componenets/` (typo preserved in the
  shipped source). Match the exact path when importing.
- Mixed ArcGIS module import styles coexist: `esri/*` alias
  (`esri/layers/GraphicsLayer`, `esri/Graphic`) and `@arcgis/core/*`
  (`@arcgis/core/layers/FeatureLayer`). Cross-ref
  patterns/arcgis-core-vs-esri-alias.md.
- The flash animation is a nested `setTimeout` chain (no cancellation token). If
  the component unmounts mid-flash, `flashGraphic` is destroyed in
  `removeGraphicLayers`, but pending timeouts still fire against the (now null)
  layer via `flashGraphic.add`. UNVERIFIED whether this throws in practice.
- `getConfigValue(config, key, activeMapViewId, defaultValue)` is the accessor
  that reconciles per-view vs global config values; changing config keys without
  updating both config.ts and the per-view helpers will silently drop settings.

## Useful snippets and functions

Single map bind with fallback to first ArcGIS map widget.
Source: src/runtime/widget.tsx
```tsx
if (!useMapWidgetIds) {
  const appConfig = getAppStore()?.getState()?.appConfig
  useMapWidgetIds = findFirstArcgisMapWidgetId(appConfig)
}
// ...
<JimuMapViewComponent
  useMapWidgetId={useMapWidgetIds?.[0]}
  onActiveViewChange={this.onActiveViewChange}
/>
```

Create and tear down dedicated feedback graphics layers.
Source: src/runtime/widget.tsx
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

removeGraphicLayers (): void {
  if (isDefined(this.state.hoverGraphic)) {
    this.state.hoverGraphic.removeAll()
    this.state.hoverGraphic.destroy()
    this.setState({ hoverGraphic: null })
  }
  // ...same for pickedGraphic and flashGraphic
}
```

Wait for child data sources before activating a map view.
Source: src/runtime/widget.tsx
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

Blink selected geometry 3x via chained timeouts.
Source: src/runtime/widget.tsx
```tsx
flashSelectedGeometry = (graphic: __esri.Graphic) => {
  if (isDefined(graphic)) {
    this.state.flashGraphic.add(graphic)
    setTimeout(() => {
      this.state.flashGraphic.removeAll()
      setTimeout(() => {
        this.state.flashGraphic.add(graphic)
        // ...nested removeAll/add repeats, 800ms each
      }, 800)
    }, 800)
  }
}
```

Build per-view LRS settings from configured layers.
Source: src/common/utils.ts
```ts
export function setValuesForView (settingsPerView, lrsLayers, getLayers) {
  if (getLayers) {
    const networkLayers = lrsLayers.filter((layer) => layer.layerType === LrsLayerType.Network).map((layer) => layer.name)
    const eventLayers = lrsLayers.filter((layer) => layer.layerType === LrsLayerType.Event).map((layer) => layer.name)
    const intersectionLayers = lrsLayers.filter((layer) => layer.layerType === LrsLayerType.Intersection).map((layer) => layer.name)
    settingsPerView = settingsPerView
      .set('networkLayers', networkLayers)
      .set('eventLayers', eventLayers)
      .set('intersectionLayers', intersectionLayers)
  }
  // ...applies getDefaultEvent / getDefaultNetwork / getDefaultAttributeSet
}
```

Publish a DataRecordSetChangeMessage after populating the output data source.
Source: src/runtime/components/route-picker-popup.tsx
```tsx
const publishMessage = (outputDS: FeatureLayerDataSource, widgetId: string) => {
  if (!outputDS) { return }
  const originDs = outputDS.getOriginDataSources()[0] as FeatureLayerDataSource
  const popupInfo = originDs.getPopupInfo()
  const layerDefinition = originDs.getLayerDefinition()
  const fieldInfos = ((f) => (f.length ? f : [
    { fieldName: layerDefinition?.objectIdField ?? 'objectid', label: 'OBJECTID', tooltip: '', visible: true }
  ]))((popupInfo?.fieldInfos || []).filter((i) => i.visible))

  const dataRecordSetChangeMessage = new DataRecordSetChangeMessage(widgetId, RecordSetChangeType.CreateUpdate, [{
    records: outputDS.getRecords(),
    fields: fieldInfos.map((fieldInfo) => fieldInfo.fieldName),
    dataSource: outputDS,
    name: outputDS.id
  }])
  MessageManager.getInstance().publishMessage(dataRecordSetChangeMessage)
}
```

Reset the output data source before writing new records.
Source: src/runtime/components/route-picker-popup.tsx
```tsx
const setRecordsToDs = (newDataRecords, selectedRecord, id) => {
  clearDs() // clearRecords/clearSelection/setCountStatus/setStatus NotReady
  outputDS?.setStatus(DataSourceStatus.Unloaded)
  outputDS?.setCountStatus(DataSourceStatus.Unloaded)
  outputDS?.setSourceRecords(newDataRecords)
  outputDS?.setRecords(newDataRecords)
  outputDS?.selectRecordById(id)
  publishMessage(outputDS, widgetId)
}
```

Remap output data-source linkage when a page is copied.
Source: src/tools/app-config-operations.ts
```ts
config.lrsLayers?.forEach((lrsLayer, index) => {
  if (lrsLayer.layerType === LrsLayerType.Network) {
    if (lrsLayer.networkInfo.outputPointDsId && contentMap[lrsLayer.networkInfo.outputPointDsId]) {
      newAppConfig = newAppConfig.setIn(
        ['widgets', destWidgetId, 'config', 'lrsLayers', `${index}`, 'networkInfo', 'outputPointDsId'],
        contentMap[lrsLayer.networkInfo.outputPointDsId]
      )
    }
  }
})
```

REDUX_STORE extension is a pure re-export of the shared store.
Source: src/extensions/lrs-store.ts
```ts
import { LrsStoreExtension } from 'widgets/shared-code/lrs'
export default LrsStoreExtension
```
