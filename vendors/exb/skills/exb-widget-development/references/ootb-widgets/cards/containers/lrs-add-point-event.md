# OTB Widget: lrs/add-point-event

Online widget doc: No dedicated core-widget doc page (LRS = ArcGIS Location Referencing solution). See https://developers.arcgis.com/experience-builder/guide/widgets-overview/ . UNVERIFIED exact page.

## Purpose

Runtime widget that lets a user add one or more point events to an ArcGIS Location Referencing (LRS) network. It supports two operation modes (single point event and multiple point events), route selection by measure or by geometry, optional referent-based location entry, concurrency handling, date ranges, and an "add to dominant route" option. It also ships a data action ("Add Point Event") that pre-populates the widget from a selected feature record produced by other LRS widgets (Search By Route, Identify) or from a network/event feature layer.

The widget is heavily config-driven and delegates almost all LRS domain logic to the shared library `widgets/shared-code/lrs`.

## Source paths inspected

Source root (gitignored build output): `ArcGISExperienceBuilder/client/dist/widgets/lrs/add-point-event/`

- manifest.json
- config.json (default config, not re-listed here)
- src/config.ts
- src/common/utils.ts
- src/common/use-data-source-exist.tsx
- src/data-actions/add-point-event.ts
- src/extensions/lrs-store.ts
- src/runtime/constants.ts
- src/runtime/widget.tsx
- src/runtime/data-source/data-source-manager.tsx
- src/runtime/data-source/attribute-set-data-source-manager.tsx (UNVERIFIED: listed, not opened)
- src/runtime/components/add-single-point-event.tsx (header/imports only)
- src/runtime/components/add-multiple-point-events.tsx (UNVERIFIED: listed, not opened)
- src/runtime/components/* (remaining form/attribute/concurrency/date/header/route-selection/operation-type/dominant-route components; UNVERIFIED: listed, not opened)
- src/setting/setting.tsx
- src/setting/layer-config.tsx (partial)
- src/setting/referent-item-config.tsx (partial)
- src/setting/default-settings.tsx (UNVERIFIED: listed, not opened)
- src/setting/display-settings.tsx (UNVERIFIED: listed, not opened)
- src/setting/referent-settings.tsx (UNVERIFIED: listed, not opened)
- src/setting/concurrency-settings.tsx (UNVERIFIED: listed, not opened)
- src/setting/constants.ts (UNVERIFIED: listed, not opened)

## Architecture overview

Class component runtime (`Widget extends React.PureComponent`) rather than a function component. High-level flow:

1. `Widget` reads its `IMConfig` and, in Map mode, resolves the active `JimuMapView` via `JimuMapViewComponent` + `MapViewLoader` (from shared-code). In Layer mode it uses the statically configured `lrsLayers`.
2. Per-view settings are materialized at runtime through `constructSettingsPerView()` / `setValuesForView()` (src/common/utils.ts) and stored back into config via `getAppConfigAction().editWidgetConfig(...)`.
3. Based on `operationType` (SINGLE vs MULTIPLE) it renders either `AddSinglePointEvent` or `AddMultiplePointEvents`, passing a large flattened prop set (network/event layers, defaults, hide-flags, referent config, graphics manager, data-action inputs).
4. Child forms use `DataSourceComponent` (via the local `DataSourceManager` wrapper) to load the network + event feature layer data sources and report readiness upward.
5. A `GraphicsLayerManager` (shared-code) owns hover / picked / flash / coordinate graphics on the map view.
6. The data action `add-point-event.ts` runs outside the widget UI: it validates a selected record, derives `RouteInfo`, and pushes it into the widget through `MutableStoreManager` mutable-state props, which `mapExtraStateProps` reads back into the component.

Builder side: `Setting` is a function component that drives layer/map-view configuration through the shared-code `LrsLoader` and specialized sub-setting panels.

## Key imports and packages

jimu-core (framework):
- `React, jsx` - src/runtime/widget.tsx, setting.tsx, most components
- `AllWidgetProps, IMState, WidgetState, getAppStore` - src/runtime/widget.tsx
- `DataSourceManager, DataSource, DataSourceComponent, DataSourceStatus, IMDataSourceInfo` - src/runtime/data-source/data-source-manager.tsx, widget.tsx
- `Immutable, ImmutableArray, ImmutableObject` - widget.tsx, common/utils.ts, config.ts
- `MutableStoreManager, AbstractDataAction, DataRecordSet, DataLevel, DataSourceTypes, FeatureLayerDataSource, loadArcGISJSAPIModules` - src/data-actions/add-point-event.ts
- `ReactRedux, IMAppConfig` - src/common/use-data-source-exist.tsx

jimu-arcgis (map/JSAPI bridge):
- `JimuMapView, JimuMapViewComponent` - src/runtime/widget.tsx, add-single-point-event.tsx

jimu-ui + jimu-ui/advanced/setting-components + jimu-ui/basic/list-tree:
- `Paper, WidgetPlaceholder, defaultMessages, Select, hooks, Button, Label, Option, Tooltip, Checkbox, Switch, TextInput` - widget.tsx, setting.tsx, layer-config.tsx, add-single-point-event.tsx
- `SettingRow, SettingSection` - setting.tsx, layer-config.tsx, referent-item-config.tsx
- `List, TreeItemsType, CommandActionDataType` - layer-config.tsx

jimu-for-builder:
- `getAppConfigAction` - src/runtime/widget.tsx (runtime writes config back)
- `AllWidgetSettingProps, SettingChangeFunction` - src/setting/setting.tsx, layer-config.tsx

jimu-theme:
- `getTheme` - src/runtime/components/add-single-point-event.tsx

jimu-icons:
- `jimu-icons/svg/outlined/editor/lock.svg`, `unlock.svg` (via require) - src/setting/layer-config.tsx

widgets/shared-code/lrs (LRS domain library; the bulk of behavior):
- Types: `LrsLayer, LrsLayerType, SearchMethod, AttributeSets, ModeType, MapViewConfig, ReferentConfig, RouteInfo, EventInfo, NetworkInfo, ReferentProperties` - config.ts, widget.tsx, utils.ts, data-actions
- Runtime helpers: `GraphicsLayerManager, MapViewLoader, getConfigValue, getModeType, isDefined, isInWidgetController, findFirstArcgisMapWidgetId, checkConflictPrevention` - widget.tsx
- Data helpers: `getRouteFromEndMeasures, QueryRouteMeasures, queryRouteIdOrName, getDateWithTZOffset, findNetworkInfoFromMapViewsConfig, findEventInfoFromMapViewsConfig` - data-actions/add-point-event.ts
- Setting helpers: `LrsLoader, getLayersByType, getDefaultEvent, getDefaultNetwork, getAttributeSets, getDefaultAttributeSet, getDefaultReferentConfig, updateDefaultForMapMode, isPointEvent, EmptyPlaceholder, lrsDefaultMessages` - setting.tsx, common/utils.ts
- REDUX extension: `LrsStoreExtension` - src/extensions/lrs-store.ts (registered as `REDUX_STORE` in manifest under name "LRS Store")

esri (ArcGIS Maps SDK for JavaScript, JSAPI):
- `esri/geometry/Polyline` (type import) - src/data-actions/add-point-event.ts
- `esri/geometry/Point`, `esri/geometry/Polyline` loaded lazily via `loadArcGISJSAPIModules([...])` - data action `onExecute`
- `__esri.*` namespace types - data action

third-party:
- `lodash-es` `round` - data-actions/add-point-event.ts, add-single-point-event.tsx

## Reusable patterns found

1. DATA ACTION for point-event creation (`src/data-actions/add-point-event.ts`)
   - Extends `AbstractDataAction`; implements `isSupported()` (heavy guard chain) and `onExecute()`.
   - Reads the app config with a builder-vs-runtime aware helper and locates the widget's own JSON via `this.widgetId`.
   - Publishes results to the target widget with `MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedNetworkDataSource', ...)` and `'selectedRouteInfo'`.
   - The widget reads these back through `static mapExtraStateProps` -> `props.mutableStateProps` and reacts in `componentDidMount` / `componentDidUpdate` using `mutableStatePropsVersion` to detect changes.

2. GraphicsLayerManager (shared-code) lifecycle
   - Created in `createGraphicLayers()` when `jimuMapView` changes, with `{ createHover, createPicked, createFlash, createCoordinate }` all true.
   - Destroyed in `removeGraphicLayers()` and on `componentWillUnmount`.

3. SettingsPerView materialization
   - `constructSettingsPerView()` returns an immutable default block; `setValuesForView()` fills defaults (network/event/attribute set/referent) from `lrsLayers`. Runtime persists the computed per-view settings back into widget config via `getAppConfigAction().editWidgetConfig`.

4. use-data-source-exist hook (`src/common/use-data-source-exist.tsx`)
   - Small selector hook using `ReactRedux.useSelector` that checks whether a `useDataSources` entry exists for a given `dataSourceId`, builder-vs-runtime aware.

5. lrs-store REDUX extension
   - `src/extensions/lrs-store.ts` re-exports `LrsStoreExtension` from shared-code and is wired via manifest `extensions[].point = REDUX_STORE`. This is the standard LRS shared cross-widget store.

6. Local DataSourceManager wrapper (`src/runtime/data-source/data-source-manager.tsx`)
   - Wraps two `DataSourceComponent` instances (network + event), tracks readiness via `onDataSourceInfoChange`, and reports combined readiness up through `dataSourcesReady(networkDsReady && eventDsReady)`.

See also cross-reference: [../../patterns/container-shared-code.md](../../patterns/container-shared-code.md)

## Builder vs runtime split

- Runtime: `src/runtime/widget.tsx` + `src/runtime/components/*` + `src/runtime/data-source/*`. Class component; owns map view binding, graphics, operation-type switching, and data-action intake.
- Builder: `src/setting/setting.tsx` (function component) + `layer-config.tsx`, `default-settings.tsx`, `display-settings.tsx`, `concurrency-settings.tsx`, `referent-settings.tsx`, `referent-item-config.tsx`. Uses shared-code `LrsLoader` to add/configure LRS layers and map views, and writes config through `onSettingChange` / `updateWidgetJson`.
- Shared between both: `src/config.ts` (types), `src/common/utils.ts` (`constructSettingsPerView`, `setValuesForView`, `resetConfig`). Note runtime also writes config back via `getAppConfigAction().editWidgetConfig` in `setSettingsPerView`.
- Two config shapes: `Config` (Layer mode, flat lists) and `SettingsPerView` (Map mode, keyed by `jimuMapViewId`). `getConfigValue(config, key, activeMapViewId, fallback)` (shared-code) abstracts the lookup across both modes.

## Lifecycle and cleanup

- `constructor`: seeds `state` with defaults incl. `constructSettingsPerView()`, computes `widgetOuterDivId = 'widget-outer-div-' + props.id`.
- `componentDidMount`: applies data-action inputs if `mutableStatePropsVersion` is present, sets `hideTitle` from `isInWidgetController(...)`, sets `operationType` from `config.defaultType`, calls `setSettingsPerView()`.
- `componentDidUpdate`: recreates graphics when `jimuMapView` changes; only ingests data-action props when widget state is `Opened` (or undefined); recomputes operation type and settings when `activeLrsLayers` changes; re-runs `checkConflictPrevention(lrsUrl)` and updates `isConflictPreventionEnabled`.
- `componentWillUnmount`: `removeGraphicLayers()` -> `graphicsManager.destroy()`.
- `onActiveViewChange`: waits for child data sources via `whenAllJimuLayerViewLoaded()` + `childDataSourcesReady()` before setting `jimuMapView`.
- Graphics reset via `clearGraphics()` clears hover/picked/flash/coordinate graphics on operation-type change.

## Manifest/config requirements

From `manifest.json`:
- `type: widget`, `version`/`exbVersion` `1.20.0`, `author: "Esri Solutions"`.
- `notSupportAGOL: true` - LRS requires ArcGIS Enterprise, not ArcGIS Online.
- `dependency: "jimu-arcgis"` - required because the widget binds a Map widget / JimuMapView.
- `dataActions`: one entry `addPointEvent` -> `uri: data-actions/add-point-event`, with an icon.
- `extensions`: one `REDUX_STORE` extension `"LRS Store"` -> `uri: extensions/lrs-store`.
- `defaultSize`: 350 x 400.
- `translatedLocales`: full locale set (runtime + setting each have their own translations folder).
- Config typing lives in `src/config.ts` (`Config`, `SettingsPerView`, `IMConfig = ImmutableObject<Config>`, `OperationType` enum SINGLE/MULTIPLE).

## Gotchas

- Class component, not hooks: runtime uses `React.PureComponent` and `static mapExtraStateProps`. Mutable-state intake relies on comparing `mutableStatePropsVersion.selected*` between prev/next props, not the values themselves.
- Runtime writes config: `setSettingsPerView()` calls `getAppConfigAction().editWidgetConfig(...)` at runtime, which mutates persisted widget config. Be careful when reasoning about "read-only runtime".
- Dual config modes: always resolve values through `getConfigValue(config, key, activeMapViewId, fallback)`; do not read `config.eventLayers` directly when in Map mode - use per-view settings.
- Data action guard is strict: `isSupported()` returns false for multi-record selections, unset/NotReady data sources, missing route id field, networks with no associated events, and output data sources whose id lacks `output_point`/`output_line`. Origin datasource is resolved via `getOriginDataSources()[0]` for LRS output layers.
- Potential bug spotted (UNVERIFIED intent): in `data-source-manager.tsx` the network branch passes `onDataSourceInfoChange={() => handleNetworkDsInfoChange}` (returns the handler instead of invoking it), while the event branch passes `onDataSourceInfoChange={handleEventDsInfoChange}` directly. This looks inconsistent; treat network readiness wiring as suspect.
- `add-single-point-event.tsx` receives the map view prop as `JimuMapView` (capitalized) while `add-multiple-point-events.tsx` uses `jimuMapView`; prop names differ between the two child forms.
- LRS domain logic is not local: nearly every real operation (route query, measures, concurrency, locks, referents) is imported from `widgets/shared-code/lrs`. To change behavior, inspect shared-code, not this widget.

## Useful snippets and functions

Source: `src/runtime/widget.tsx`
```tsx
static mapExtraStateProps = (state: IMState,
  props: AllWidgetProps<IMConfig>): ExtraProps => {
  return {
    selectedRouteInfo: props?.mutableStateProps?.selectedRouteInfo,
    selectedNetworkDataSource: props?.mutableStateProps?.selectedNetworkDataSource
  }
}
```

Source: `src/runtime/widget.tsx`
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

Source: `src/runtime/widget.tsx`
```tsx
createGraphicLayers (): void {
  if (isDefined(this.state.jimuMapView)) {
    this.removeGraphicLayers()
    const graphicsManager = new GraphicsLayerManager({
      jimuMapView: this.state.jimuMapView,
      createHover: true,
      createPicked: true,
      createFlash: true,
      createCoordinate: true
    })
    this.setState({ graphicsManager: graphicsManager })
  }
}
```

Source: `src/runtime/widget.tsx`
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

Source: `src/data-actions/add-point-event.ts`
```ts
// set the point from the feature
if (isDefined(dataAttributes.Measure)) {
  let Point: typeof __esri.Point = null
  let Polyline: typeof __esri.Polyline = null
  await loadArcGISJSAPIModules(['esri/geometry/Point', 'esri/geometry/Polyline']).then(modules => {
    [Point, Polyline] = modules
  }).then(() => {
    const geometry = record.getRawGeometry() as __esri.Geometry
    if (geometry.type === 'point') {
      const point = new Point(geometry)
      rteInfo.selectedPoint = point
    } else if (geometry.type === 'polyline') {
      const polyline = new Polyline(geometry)
      const point = polyline.getPoint(0, 0)
      rteInfo.selectedPoint = point
    }
  })
}
```

Source: `src/data-actions/add-point-event.ts`
```ts
MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedNetworkDataSource', networkDS)
MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedRouteInfo', rteInfo)
```

Source: `src/data-actions/add-point-event.ts`
```ts
// get the whole app config
function getAppConfig () {
  return window.jimuConfig.isBuilder ? getAppStore().getState()?.appStateInBuilder?.appConfig : getAppStore().getState()?.appConfig
}
```

Source: `src/extensions/lrs-store.ts`
```ts
import { LrsStoreExtension } from 'widgets/shared-code/lrs'

export default LrsStoreExtension
```

Source: `src/common/use-data-source-exist.tsx`
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

Source: `src/common/utils.ts`
```ts
export function constructSettingsPerView () {
  const settingsPerView: SettingsPerView = {
    networkLayers: [],
    eventLayers: [],
    intersectionLayers: [],
    attributeSets: { attributeSet: [] },
    defaultMethod: SearchMethod.Measure,
    defaultType: OperationType.single,
    defaultAttributeSet: '',
    defaultEvent: { index: -1, name: '' },
    defaultNetwork: { index: -1, name: '' },
    // ...hide flags default false...
    defaultReferentConfig: { defaultReferentLayer: null, defaultOffsetUnit: 'esriMiles' }
  }
  return Immutable(settingsPerView)
}
```

Source: `src/setting/setting.tsx`
```tsx
const handleLrsLayersUpdated = React.useCallback(async (lrsLayers: ImmutableArray<LrsLayer>, allDataSources: any) => {
  let updatedConfig = config.set('lrsLayers', lrsLayers)
  const { networks, pointEvents, intersections } = getLayersByType(lrsLayers, Immutable([]))
  updatedConfig = updatedConfig.set('networkLayers', networks).set('eventLayers', pointEvents).set('intersectionLayers', intersections)
  // ...resolve attribute sets + defaults...
  updateWidgetJson({
    config: updatedConfig,
    useDataSources: Object.values(allDataSources.useDataSourceMap)
  })
}, [config, portalUrl, updateWidgetJson])
```
