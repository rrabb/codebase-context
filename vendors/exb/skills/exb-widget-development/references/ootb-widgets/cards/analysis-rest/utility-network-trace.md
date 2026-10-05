# OTB Widget: arcgis/utility-network-trace

Online widget doc: https://developers.arcgis.com/experience-builder/guide/utility-network-trace-widget/

## Purpose
Wraps the ArcGIS Maps SDK for JavaScript (JSAPI) `esri/widgets/UtilityNetworkTrace` widget inside an ExB widget so users can run published named trace configurations against an ArcGIS Utility Network in a Web Map. It runs traces, selects the resulting features across the bound map's layer data sources, publishes those selected records to the rest of the app, and can optionally build a "trace result area" output feature data source (statistics per trace) usable by other widgets. This is an Enterprise-only widget (`requireEnterprise: true`, `notSupportAGOL: true`).

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/config.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/common/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/runtime/widget-model.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/message-actions/filter-action.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/message-actions/filter-action-setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/setting/constants.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/utility-network-trace/src/setting/components/trace-result-area.tsx

UNVERIFIED (not opened, referenced only): src/runtime/lib/* (style helpers `getStyle`, `getFullHeight`), src/setting/lib/* (`getStyle`, `getStyleForLI`, `traceResultAreaStyle`), src/runtime/translations/* and src/setting/translations/* (message dictionaries). Names appear in imports but files were not read.

## Architecture overview
Three layers:
- Runtime UI (`src/runtime/widget.tsx`): a class `BaseWidget` that renders a container `div` plus a `JimuMapViewComponent`. It owns almost no logic itself; it delegates all JSAPI work to a singleton model.
- Runtime model (`src/runtime/widget-model.ts`): a singleton (`WidgetModel.getInstance()`) that instantiates the JSAPI `UtilityNetworkTrace` widget into a DOM node, registers JSAPI events, translates trace selections into ExB data source selections, and builds an optional output feature layer data source of trace-area statistics.
- Builder settings (`src/setting/setting.tsx` + `components/trace-result-area.tsx`): pick the Map widget, validate that each map view has a Utility Network with shared named trace configurations, create the widget's output data source schema, and configure the per-data-source "trace result area" appearance.

A separate message action (`src/message-actions/filter-action.ts` + `filter-action-setting.tsx`) lets other widgets react to this widget's `DATA_RECORDS_SELECTION_CHANGE` message (and `ExtentChange`) by filtering a target data source. Note this is the generic ExB filter action pattern; despite the request wording it is a message-action consumer, not a bespoke bidirectional protocol.

## Key imports and packages
Grouped by concern; file path shown per import.

Runtime UI - src/runtime/widget.tsx
- `React, AllWidgetProps, jsx, lodash, IMState, ImmutableObject, DataSourceJson, BaseWidget` from `jimu-core`
- `JimuMapViewComponent, JimuMapView` from `jimu-arcgis`
- `Paper, WidgetPlaceholder` from `jimu-ui`
- `IMConfig` from `../config`
- `WidgetModel` from `./widget-model`
- `getStyle, getFullHeight` from `./lib/style` (UNVERIFIED)
- `traceIcon` from `jimu-icons/svg/outlined/brand/widget-utility-network-trace.svg`

Runtime model - src/runtime/widget-model.ts
- `DataSourceManager, MessageManager, DataRecordsSelectionChangeMessage, DataSourceJson, ImmutableObject, FeatureLayerQueryParams, getAppStore, DataSourceStatus, FeatureLayerDataSource, QueriableDataSource, SubtypeSublayerDataSource` from `jimu-core`
- `JimuMapView, MapViewManager` from `jimu-arcgis`
- `defaultMessages as jimuUIDefaultMessages` from `jimu-ui`
- `UtilityNetworkTrace` from `esri/widgets/UtilityNetworkTrace` (JSAPI widget being wrapped)
- `* as reactiveUtils` from `esri/core/reactiveUtils`
- `FeatureLayer` from `esri/layers/FeatureLayer`
- `Graphic` from `esri/Graphic`
- `traceInformation` from `../setting/constants`
- `getOutputDataSourceId` from `../common/utils`

Settings - src/setting/setting.tsx
- `jsx, React, DataSourceManager, defaultMessages as jimuCoreDefaultMessages, DataSourceJson, DataSourceTypes, DataSourceSchema, JimuFieldType, FieldSchema, classNames, getAppStore, JimuMapViewStatus, UseDataSource, Immutable` from `jimu-core`
- `BaseWidgetSetting, AllWidgetSettingProps` from `jimu-for-builder`
- `Tooltip, Alert, Label, defaultMessages as jimuUIDefaultMessages` from `jimu-ui`
- `MapWidgetSelector, SettingSection, SettingRow, MultipleJimuMapConfig, MultipleJimuMapValidateResult` from `jimu-ui/advanced/setting-components`
- `JimuMapView, MapViewManager` from `jimu-arcgis`
- `WebMap` from `esri/WebMap`
- `InfoOutlined` from `jimu-icons/outlined/suggested/info`

Trace result area - src/setting/components/trace-result-area.tsx
- `loadArcGISJSAPIModules` from `jimu-arcgis` (async loads `esri/Color`)
- `ThemeColorPicker` from `jimu-ui/basic/color-picker`
- `colorUtils, getAppThemeVariables, getTheme2` from `jimu-theme`
- `SettingRow, SettingSection` from `jimu-ui/advanced/setting-components`

Filter message action - src/message-actions/filter-action.ts and filter-action-setting.tsx
- `AbstractMessageAction, MessageType, Message, getAppStore, appActions, FieldSchema, DataRecordsSelectionChangeMessage, DataSourceManager, FeatureQueryDataSource, ImmutableObject, dataSourceUtils, ExtentChangeMessage, MessageDescription, FeatureLayerDataSource` from `jimu-core`
- `SqlExpressionBuilderPopup` from `jimu-ui/advanced/sql-expression-builder`
- `FieldSelector, DataSourceSelector` from `jimu-ui/advanced/data-source-selector`

## Reusable patterns found
- JimuMapView binding: runtime renders `<JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onActiveViewChange={...} />`; the callback receives a `JimuMapView` (or null on unbind) and drives model setup/teardown. See src/runtime/widget.tsx.
- Wrapping a JSAPI widget in a singleton model: `WidgetModel` builds a fresh DOM `div` and constructs `new UtilityNetworkTrace({ container, utilityNetwork, view, ... })`, keeping the instance on `this.unt`. The Utility Network is taken from `jimuMapView.view.map.utilityNetworks.getItemAt(0)`. See `loadTraceWidgetFromAPI` in src/runtime/widget-model.ts.
- Translating JSAPI selection to ExB selection + publishing: on the JSAPI viewModel `select-features` event, the model matches result layers to ExB layer data sources via `jimuLayerViews` / `jimuTables`, queries records with `QueriableDataSource.queryAll`, calls `ds.selectRecordsByIds(...)`, then publishes `new DataRecordsSelectionChangeMessage(this.props.id, allRecords, allDataSources)` through `MessageManager.getInstance().publishMessage(...)`. Manifest declares `publishMessages: ["DATA_RECORDS_SELECTION_CHANGE"]`.
- Filter message action (consumer side): `FilterAction extends AbstractMessageAction` listens to `DataRecordsSelectionChange` and `ExtentChange`, builds a `whereSql`/`querySQL`, and dispatches `appActions.widgetStatePropChange(this.widgetId, MessageType..., value)`. Its setting (`filter-action-setting.tsx`) uses `DataSourceSelector` + `SqlExpressionBuilderPopup` to map trigger data source to action data source. This is the standard bidirectional wiring: this widget publishes selection changes, and any widget (including another instance) can use the filter action to respond.
- DataSourceManager usage: `DataSourceManager.getInstance().getDataSource(id)`, `.createDataSource(id)`, and child data source readiness via `ds.isDataSourceSet()`, `ds.areChildDataSourcesCreated()`, `ds.childDataSourcesReady()`. See src/common/utils.ts `waitForChildDataSourcesReady` and model `loadAllChildDS`.
- Output data source built at runtime: `buildTraceResultStatsAsOutput` constructs an in-memory `FeatureLayer` from trace result-area graphics, assigns it to a `FeatureLayerDataSource.layer`, then flips status via `setStatus/setCountStatus(DataSourceStatus.Unloaded)` and `addSourceVersion()` so downstream widgets refresh.
- Trace result area config: per-data-source config under `config.configInfo[dataSourceId].traceResultAreaSettings` with `enableResultArea` + `resultAreaProperties` (shape type, distance, unit, area unit, color). Defaults live in src/setting/constants.ts `defaultConfiguration`; builder edits them through `TraceResultArea`.
- Enterprise-only gating: manifest sets `requireEnterprise: true`, `requireLicense: "Enterprise"`, `notSupportAGOL: true`; ExB hides/blocks this widget on ArcGIS Online. No extra runtime check is needed in code because the platform enforces it from the manifest.

## Builder vs runtime split
- Builder (`src/setting`): choose Map widget via `MapWidgetSelector`; enumerate map views with `MapViewManager.getInstance().getJimuMapViewGroup(useMapWidgetIds)`; validate each view has a Utility Network with `sharedNamedTraceConfigurations` (`checkIfMapViewHasTraces`, `getTracesInMapView`); seed per-data-source config (`setConfigForSelectedDs`) and the output data source schema (`getInitOutDataSource` / `getInitSchema`); edit result-area appearance in a `MultipleJimuMapConfig` side popper hosting `TraceResultArea`. Persists via `this.props.onSettingChange(settings, outputDsJsons)`.
- Runtime (`src/runtime`): reads `props.config.configInfo[dataSourceId].traceResultAreaSettings` and instantiates/updates the JSAPI widget accordingly; performs traces, selection sync, and output-DS generation. Runtime never writes config; it only reads it and reacts to `componentDidUpdate` config changes.

## Lifecycle and cleanup
- `constructor`: seeds state `{ jmv, unt, hasMapWidget, activeDataSource }`; grabs the `WidgetModel` singleton.
- `onActiveViewChange(jimuMapView)`: on a valid view, destroys any prior `unt` (calling `clearAll()` first when a utility network exists), creates a fresh `.trace-container` div, then `await viewModel.loadTraceWidgetFromAPI(...)`, and after setState runs `loadAllChildDS()` + `getURLVersion()`. On null view, resets/destroys the JSAPI widget and clears state.
- `componentDidUpdate`: in builder, re-syncs `hasMapWidget` / rebuilds when the map widget binding changes; in all modes, when `traceResultAreaSettings.enableResultArea` or `resultAreaProperties` changes it calls `viewModel.updateUntProps(...)` (uses `lodash.isDeepEqual` to detect changes).
- `componentWillUnmount`: `viewModel.clearAll()` to clear flags, selections, and graphics.
- Model cleanup helpers: `clearAll()` closes popups, clears selection on all layer data sources, removes view graphics, and resets the JSAPI widget; `callResetOnJSWidget()` calls `unt.viewModel.reset()`; `clearSelection(res)` clears selection per matched data source. JSAPI `reset`, `clear-selection`, and `create-result-area` events are wired in `registerEvents`.
- Note: the model is a process-wide singleton, so a single UtilityNetworkTrace instance is shared; switching map views destroys and recreates `this.unt`.

## Manifest/config requirements
- `name: "utility-network-trace"`, `type: "widget"`, `version` / `exbVersion` `1.20.0`.
- `dependency: "jimu-arcgis"` (needed because it consumes JSAPI modules and JimuMapView).
- `requireEnterprise: true`, `requireLicense: "Enterprise"`, `notSupportAGOL: true` - Enterprise portal only, blocked on ArcGIS Online.
- `publishMessages: ["DATA_RECORDS_SELECTION_CHANGE"]`.
- `defaultSize: { width: 300, height: 550 }`.
- On-disk `config.json` is minimal: `{ "configInfo": {} }`. Real config is populated per data source in the builder; shape defined by `src/config.ts` (`Config.configInfo[dataSourceId].traceResultAreaSettings`) and defaults in `src/setting/constants.ts`.
- JSAPI modules used: `esri/widgets/UtilityNetworkTrace`, `esri/layers/FeatureLayer`, `esri/Graphic`, `esri/core/reactiveUtils`, `esri/WebMap` (settings), and `esri/Color` (loaded lazily via `loadArcGISJSAPIModules`).

## Gotchas
- Enterprise + Utility Network required: the map's Web Map must contain a Utility Network with published `sharedNamedTraceConfigurations`; otherwise the builder shows a warning and no traces are available (`checkIfMapViewHasTraces`).
- Singleton model: because `WidgetModel` is a static singleton, multiple instances of this widget in one app would contend over one shared JSAPI widget/state. Treat one instance per app as the safe assumption.
- Several JSAPI events are undocumented for the target SDK version and are typed with `@ts-expect-error` (`create-result-area`, `clear-selection`, `reset`, viewModel `select-features`). These are brittle across JSAPI upgrades.
- `select-features` handling reads `mapDS.jimuLayerViews` and `mapDS.jimuTables`; table keys are prefixed and are split with `key.split('-').slice(1).join('-')` to recover the data source id. SUBTYPE_SUBLAYER matching compares `rs.layer.layerId` to `parseInt(ds.layerId)` and filters by subtype code.
- Output data source status dance: after building the output `FeatureLayer`, the code sets status to `Unloaded` (not `Ready`) and calls `addSourceVersion()`; downstream consumers rely on this to re-read. Empty result-area graphics set the output DS to `NotReady`.
- Area statistics fields/aliases are pulled from `appConfigDataSources[outputDsId].schema.fields[...]`, so the builder-created output schema (`getInitSchema`) must stay in sync with `traceInformation` in constants.ts and the chosen `areaUnit`.
- Result-area units: builder seeds unit from portal (`getPortalUnit()` -> feet/meters) and area unit as `'square-' + getPortalUnit()`; buffer distance is capped by `validateMaxBufferDistance` / `getMaxBufferLimit`.
- gdbVersion sync: the model watches the feature layer's `gdbVersion` with `reactiveUtils.watch` and also reads a `data_version` URL query param (`getURLVersion`) to set `unt.utilityNetwork.gdbVersion`; branch-versioned data can silently change trace results.

## Useful snippets and functions
Real snippets copied from source; source path precedes each.

src/runtime/widget.tsx - bind JimuMapView and render placeholder
```tsx
render () {
  return (
    <Paper
      shape="none"
      css={getStyle(this.props.theme, this.props.config)}
      className="jimu-widget"
    >
      <div ref={this.containerRef} css={this.state.hasMapWidget ? getFullHeight() : ''}></div>
      {this.state.hasMapWidget
        ? ''
        : <WidgetPlaceholder icon={traceIcon} message={this.props.intl.formatMessage({ id: '_widgetLabel', defaultMessage: defaultMessages._widgetLabel })} widgetId={this.props.id} />
      }
      {this.props.useMapWidgetIds?.length > 0 &&
        <JimuMapViewComponent
          useMapWidgetId={this.props.useMapWidgetIds?.[0]}
          onActiveViewChange={this.onActiveViewChange}
        />
      }
    </Paper>
  )
}
```

src/runtime/widget-model.ts - instantiate the JSAPI UtilityNetworkTrace widget
```ts
let un = null
if (jimuMapView.view.map.utilityNetworks) {
  un = jimuMapView.view.map.utilityNetworks.getItemAt(0)
}
const unt = new UtilityNetworkTrace({
  container: domRef,
  utilityNetwork: un,
  view: jimuMapView.view,
  showSelectionAttributes: true,
  selectOnComplete: true,
  showGraphicsOnComplete: true,
  selectedTraces: [],
  flags: [],
  enableResultArea: this.props.config.configInfo?.[jimuMapView.dataSourceId]?.traceResultAreaSettings?.enableResultArea,
  resultAreaProperties: this.props.config.configInfo?.[jimuMapView.dataSourceId]?.traceResultAreaSettings?.resultAreaProperties
})
this.unt = unt
this.activeDataSourceId = jimuMapView.dataSourceId
this.appConfigDataSources = appConfigDataSources
this.updatedConfig = this.props.config
await this.loadAllChildDS()
this.registerEvents()
return unt
```

src/runtime/widget-model.ts - publish DataRecordsSelectionChangeMessage after selection
```ts
Promise.all(fetchRecordPromises).then((fetchedRecords) => {
  let allRecords = []
  const alldatasources: string[] = []
  listOfKeys.forEach((key, index) => {
    if (fetchedRecords[index]?.length > 0) {
      const ds = mapLyrVwsSel[key].ds
      ds.selectRecordsByIds(mapLyrVwsSel[key].objectIdList, fetchedRecords[index], true)
      allRecords = allRecords.concat(fetchedRecords[index])
      alldatasources.push(ds.id)
    }
  })
  if (allRecords.length > 0) {
    const message = new DataRecordsSelectionChangeMessage(this.props.id, allRecords, alldatasources)
    MessageManager.getInstance().publishMessage(message)
  }
})
```

src/runtime/widget-model.ts - query records for selected object ids
```ts
private async fetchRecords (ds, objectIdList) {
  const query: FeatureLayerQueryParams = {}
  query.objectIds = objectIdList
  query.returnGeometry = true
  query.outFields = ['*']
  const queryDS = ds as QueriableDataSource
  const result = await queryDS?.queryAll(query)
  return Promise.resolve(result?.records)
}
```

src/runtime/widget-model.ts - watch gdbVersion via reactiveUtils
```ts
reactiveUtils.watch(
  //@ts-expect-error
  () => layerToWatch.gdbVersion,
  (value) => {
    this.unt.utilityNetwork.gdbVersion = value
  })
```

src/common/utils.ts - wait for all child data sources of a map view
```ts
export const waitForChildDataSourcesReady = async (mapView: JimuMapView): Promise<DataSource> => {
  await mapView?.whenAllJimuLayerViewLoaded()
  const ds = DataSourceManager.getInstance().getDataSource(mapView?.dataSourceId)
  if (ds?.isDataSourceSet() && !ds.areChildDataSourcesCreated()) {
    return ds.childDataSourcesReady().then(() => ds).catch(err => ds)
  }
  return Promise.resolve(ds)
}
```

src/common/utils.ts - deterministic output data source id
```ts
export const getOutputDataSourceId = (widgetId: string): string => {
  return `${widgetId}-output`
}
```

src/setting/setting.tsx - validate a map view has a Utility Network with trace configs
```tsx
checkIfMapViewHasTraces = (jmv: JimuMapView) => {
  let valid: boolean = false
  let UNloaded = true
  const view = jmv.view
  return view.when().then(() => {
    const map = view.map as WebMap
    if (map.hasOwnProperty('utilityNetworks')) {
      if (map.utilityNetworks !== null) {
        const un = map.utilityNetworks.getItemAt(0)
        un.load().catch(() => { UNloaded = false })
        if (UNloaded) {
          if (un.hasOwnProperty('sharedNamedTraceConfigurations')) {
            if (un.sharedNamedTraceConfigurations.length > 0) {
              valid = true
            }
          }
        }
      }
    }
    return valid
  })
}
```

src/setting/setting.tsx - persist per-data-source result area settings + output DS
```tsx
updateResultAreaSettings = (property: string, value: boolean | __esri.ResultAreaPropertiesExtend) => {
  const updatedConfigInfo = this.props.config.setIn(['configInfo', this.state.activeDataSource, 'traceResultAreaSettings', property], value)
  const outputDsJsons: DataSourceJson[] = [this.getInitOutDataSource(updatedConfigInfo)]
  this.props.onSettingChange({
    id: this.props.id,
    config: updatedConfigInfo
  }, outputDsJsons)
}
```

src/setting/constants.ts - default per-data-source config
```ts
export const defaultConfiguration = {
  traceResultAreaSettings: {
    enableResultArea: false,
    resultAreaProperties: {
      type: 'convexhull',
      distance: 10,
      unit: '',
      areaUnit: '',
      color: {
        color: [255, 165, 0, 0.5],
        haloOpacity: 0.9,
        fillOpacity: 0.2,
        hex: '#ffa500'
      },
      show: false
    }
  }
}
```

src/message-actions/filter-action.ts - respond to selection/extent change
```ts
filterMessageDescription (messageDescription: MessageDescription): boolean {
  return (
    messageDescription.messageType === MessageType.DataRecordsSelectionChange ||
    messageDescription.messageType === MessageType.ExtentChange
  )
}
```
