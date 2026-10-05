# OTB Widget: arcgis/directions

Online widget doc: https://developers.arcgis.com/experience-builder/guide/directions-widget/

## Purpose
Provides turn-by-turn routing between two or more stops, backed by an ArcGIS routing (network analysis) service. Per manifest.json: "This is the widget which can provide a way to build directions." The runtime hosts the native JSAPI `esri/widgets/Directions` UI wired to an `esri/layers/RouteLayer`, plus optional geocoded search, preset stops, and barrier layers pulled from the bound map. The widget also ships three data actions (`DirectionsTo`, `DirectionsFrom`, `PlanRoute`) so other widgets can push feature geometries in as route stops, and it emits four output data sources (stops, route, direction points, direction lines).

Map binding is required: the widget only renders once a Map widget is selected AND both a routing utility and at least one search source (geocode utility or feature-layer source) are ready (`isReadyToRender` gate). Otherwise it shows a `WidgetPlaceholder`.

## Source paths inspected
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/directions/manifest.json`
- `.../directions/src/config.ts`
- `.../directions/src/constants.ts`
- `.../directions/src/utils.ts`
- `.../directions/src/runtime/widget.tsx`
- `.../directions/src/runtime/components/utils-alert.tsx`
- `.../directions/src/data-actions/directions-to.ts`
- `.../directions/src/data-actions/directions-from.ts`
- `.../directions/src/data-actions/plan-route.ts`
- `.../directions/src/data-actions/utils.ts`
- `.../directions/src/setting/setting.tsx`
- `.../directions/src/setting/components/stops-selector.tsx`
- `.../directions/src/tools/builder-operations.ts`
- Skipped per instruction: `dist/`, `tests/`, `src/*/translations/`, `src/runtime/assets/*.svg`

Note: the widget source lives under a gitignored `dist/widgets` tree; it was read with ignored files included.

## Architecture overview
Function-component runtime (`Widget`, hooks-based) plus a function-component builder setting (`Setting`). Unlike some OTB widgets, the runtime DOES render the native JSAPI `Directions` DOM widget (into a manually created `div`), not a headless view model reimplementation.

Runtime data flow:
1. `JimuMapViewComponent` supplies a `JimuMapView` via `onActiveViewChange` -> `jimuMapView` state.
2. A gating `useEffect` computes `isReadyToRender` by checking that a map is selected, `routeConfig.useUtility` exists, and at least one search source is ready (utility present in `appConfig.utilities`, or a `useDataSource`).
3. The main `useEffect` (`updateDirectionsWidget`) runs when `isReadyToRender && jimuMapView?.view && containerRef.current`: it builds a `RouteLayer` (with barriers), constructs a `Directions` widget bound to `jimuMapView.view`, adds the layer to the map, sets `routeParameters`, wires preset stops, and starts a `reactiveUtils.watch` on `directions.lastRoute`.
4. Data-action input is applied via `updateFromDataAction()`, which reads `props.mutableStateProps` (`directionsFromPoint` / `directionsToPoint` / `routeStops`), reverse-geocodes each point to a name, mutates `directions.layer.stops`, then clears the mutable state key.
5. When `lastRoute` changes, output data sources are populated from `RouteLayerSolveResult` (`stops`, `routeInfo`, `directionPoints`, `directionLines`) via `setSourceFeatures`.

Data actions (`src/data-actions/*.ts`): each is an `AbstractDataAction`. On execute they convert the selected record(s) to JSAPI graphics and stash geometry into this widget's mutable store; the runtime `useEffect` picks it up. `isSupported` (in `data-actions/utils.ts`) requires single-data-set, record-level (not whole-DataSource) point features, and that the directions widget is fully configured.

Builder side (`src/setting/setting.tsx`): map selector, routing `UtilitySelector`, preset stops (`StopsSelector`), barrier layer selectors per JimuMapView, search data/general/suggestion settings, and general options (unit, save toggle, layer-list visibility). Selecting a map generates the four output data source JSONs.

## Key imports and packages
Grouped by file, with the exact import path.

jimu framework (from `src/runtime/widget.tsx`):
- `React, jsx, css, AllWidgetProps, DataSourceManager, DataSourceStatus, FeatureLayerDataSource, UtilityManager, getAppStore, hooks, MutableStoreManager, ReactRedux, IMState, ServiceManager, ResourceSessions, IMThemeVariables` from `jimu-core`
- `JimuMapView, JimuMapViewComponent` from `jimu-arcgis`
- `defaultMessages as jimuUIMessages, Paper, WidgetPlaceholder` from `jimu-ui`
- `useTheme` from `jimu-theme`

JSAPI / esri modules (static imports, from `src/runtime/widget.tsx`):
- `Directions` from `esri/widgets/Directions`
- `RouteLayer` from `esri/layers/RouteLayer`
- `PointBarrier` from `esri/rest/support/PointBarrier`
- `PolylineBarrier` from `esri/rest/support/PolylineBarrier`
- `PolygonBarrier` from `esri/rest/support/PolygonBarrier`
- `reactiveUtils` from `esri/core/reactiveUtils`

JSAPI (lazy, from `src/utils.ts`):
- `loadArcGISJSAPIModule('esri/rest/locator')` for reverse geocoding (`locationToAddress`)

JSAPI (lazy, from `src/setting/setting.tsx`):
- `loadArcGISJSAPIModules(['esri/rest/support/Stop', 'esri/rest/support/DirectionPoint', 'esri/rest/support/DirectionLine', 'esri/rest/support/RouteInfo'])` to read `.fields` when generating output data source schemas

Data actions (from `src/data-actions/*.ts`):
- `AbstractDataAction, DataLevel, DataRecordSet, MutableStoreManager, dataSourceUtils` from `jimu-core`
- `DataLevel, getAppStore, DataRecordSet, dataSourceUtils` from `jimu-core` (in `data-actions/utils.ts`)

Setting (from `src/setting/setting.tsx`):
- `AllWidgetSettingProps` from `jimu-for-builder`
- `MapWidgetSelector, SettingRow, SettingSection, SearchGeneralSetting, SearchDataSetting, SearchSuggestionSetting, SearchDataType, JimuLayerViewSelectorDropdown, ...` from `jimu-ui/advanced/setting-components`
- `addNewUtility, extractService, UtilitySelector` from `jimu-ui/advanced/utility-selector`
- `JimuLayerView, JimuMapView, JimuMapViewComponent, MapViewManager` from `jimu-arcgis`

Stops selector (from `src/setting/components/stops-selector.tsx`):
- `loadArcGISJSAPIModules` from `jimu-core`; `JimuMap, IMJimuMapConfig` from `jimu-ui/advanced/map`; `AlertPopup, Badge, Button, Loading` from `jimu-ui`; `Global, useTheme` from `jimu-theme`

Builder operations (from `src/tools/builder-operations.ts`):
- `extensionSpec, IMAppConfig` from `jimu-core` (implements `BuilderOperationsExtension` for translatable hint keys)

## Reusable patterns found
- **Three `AbstractDataAction` subclasses sharing a helper.** `DirectionsTo`, `DirectionsFrom`, `PlanRoute` each override `isSupported` + `onExecute`, all delegating validation to a bound `isRecordValid` helper (`data-actions/utils.ts`). `DirectionsTo`/`DirectionsFrom` require exactly one record; `PlanRoute` requires `> 1` records of `type === 'selected'`.
- **Cross-widget input via MutableStoreManager.** Data actions write geometry to the target widget's mutable state (`directionsToPoint` / `directionsFromPoint` / `routeStops`); the runtime `useEffect` reads `props.mutableStateProps`, applies it, then clears the key with `updateStateValue(..., null)`. This is the canonical "push data into another widget" pattern.
- **Native JSAPI widget hosted in a manually created container.** Instead of a ref div alone, `updateDirectionsWidget` creates a child `div.directions-container` and appends it, so it can toggle a `dark-theme` class and fully reset the widget on config change.
- **`RouteLayer` + `Directions` pairing.** A `RouteLayer` (routing service URL + barriers) is created, then passed as `layer` to the `Directions` widget; the layer is also added to the map so results draw.
- **Barriers built per JimuMapView.** `getBarrierLayers` reads configured `barrierLayers[jimuMapView.id]`, queries each barrier JimuLayerView data source, and builds `PointBarrier` / `PolylineBarrier` / `PolygonBarrier` arrays by geometry type.
- **`UtilityManager` / `ServiceManager` for routing + geocode utilities.** URLs come from `UtilityManager.getInstance().getUtilityJson(id).url`; `ServiceManager.fetchArcGISServerInfo` resolves owning-system URLs when watching `resourceSessions` to detect sign-in/token changes.
- **Reverse geocode chain with default fallback.** `getAddressFromSources` tries each configured locator source, then falls back to the world GeocodeServer if none returns an address.
- **`reactiveUtils.watch` for result-driven output DS updates.** Watching `directions.lastRoute` flips the four output data sources between `NotReady` and `Unloaded` and repopulates them via `setSourceFeatures`.
- **Multiple output data sources.** manifest declares `properties.canGenerateMultipleOutputDataSources: true`; four output DS IDs are derived from the widget id (`getStopOutputDsId`, `getRouteOutputDsId`, `getDirectionPointOutputDsId`, `getDirectionLineOutputDsId`).
- **Heavy Calcite CSS variable theming.** The runtime `style(theme)` maps dozens of `--calcite-*` custom properties onto ExB `--sys-color-*` / `--ref-palette-*` tokens to make the native Directions/Calcite UI match the app theme (light and dark).

## Builder vs runtime split
- **Runtime** (`src/runtime/widget.tsx`): renders the live `Directions` widget, applies data-action input, manages barriers/preset stops, and maintains the four output data sources. Renders `WidgetPlaceholder` until `isReadyToRender`.
- **Builder** (`src/setting/setting.tsx`): map selection (generates output DS JSONs via `getOutputDataSourceJsons`), routing utility selection (auto-adds the org routing utility when none chosen), preset stops via `StopsSelector` (which spins up a `JimuMap` + JSAPI `Search` to pick start/end), barrier layer selection per view, search source/general/suggestion settings, and general options (`unit`, `enableRouteSaving`, `showRuntimeLayers`).
- **Builder operations extension** (`src/tools/builder-operations.ts`): registered via manifest `extensions[].point: BUILDER_OPERATIONS`; contributes translatable value keys for configured search hints (`searchConfig.generalConfig.hint` and each `dataConfig[i].hint`).
- **Config validation in builder**: `getValidSearchDataConfig` / `getValidRouteConfig` prune sources whose utilities are no longer in `useUtilities`, keeping config and `useUtilities` in sync via `getUsedUtilities`.

## Lifecycle and cleanup
- The main `useEffect` returns a cleanup that calls `watchLastRouteRef.current?.remove()` and `destroyDirectionsWidget()`.
- `destroyDirectionsWidget` removes the previous `RouteLayer` from the map (found by widget `id`), calls `directions.destroy()`, clears `containerRef.current.innerHTML`, and removes the leftover "save as" Calcite popover appended to `document.body`.
- `updateDirectionsWidget` calls `destroyDirectionsWidget()` first, so re-runs fully rebuild the widget (a large dependency array drives re-creation on any relevant config/theme/view change).
- The `Directions` `viewModel.reset` is overridden to re-run `updateDirectionsWidget(true)` so preset barriers survive a user reset while runtime-added barriers are dropped.
- `sessionsRef` guards the utility-account effect against redundant runs when `resourceSessions` is unchanged.

## Manifest/config requirements
- `dependency: "jimu-arcgis"` (map/JSAPI access).
- `properties.canGenerateMultipleOutputDataSources: true` (four output DS).
- `dataActions[]`: `DirectionsTo` (uri `data-actions/directions-to`), `DirectionsFrom` (`data-actions/directions-from`), `PlanRoute` (`data-actions/plan-route`), each with an icon under `runtime/assets/`.
- `extensions[]`: `builderOperations` at point `BUILDER_OPERATIONS`, uri `tools/builder-operations`.
- `defaultSize`: 400 x 550.
- Config shape (`src/config.ts`): `routeConfig` (`useUtility`, `barrierLayers` keyed by JimuMapView id, `presetStart`, `presetEnd`), `searchConfig` (`dataConfig`, `generalConfig.hint`, `suggestionConfig`), `showRuntimeLayers?`, `unit?` (`UnitOption.Imperial | Metric`), `enableRouteSaving?`.
- Constants (`src/constants.ts`): `DEFAULT_ROUTE_URL` (World/Route NAServer), `MAX_SUGGESTIONS = 6`, `DefaultJSAPISearchProperties` (`includeDefaultSources: false`, `locationEnabled: false`).

## Gotchas
- **Requires a fully configured routing + search stack.** No render until a map is bound AND `routeConfig.useUtility` plus at least one ready search source exist. Missing/expired utilities are surfaced at runtime by `UtilsAlert` (invalid vs needs-login messages).
- **Data-action geometries must be points.** `isRecordValid` rejects non-point features and whole-DataSource-level actions; `PlanRoute` additionally requires `type === 'selected'` and more than one record.
- **Reverse geocoding on every pushed stop.** Each data-action point is run through `getAddressFromSources` (one locator call per configured source, plus a default GeocodeServer fallback) to derive a stop name - this adds network round-trips.
- **Proxy support is present but commented out.** In `utils.ts` and `widget.tsx` the `proxyUtils` proxy-URL wrapping is commented; only raw utility URLs are used currently.
- **`locationEnabled` is not in the JSAPI type.** `constants.ts` notes it "isn't defined in `__esri.DirectionsSearchProperties`, but works" and casts around it.
- **Manual DOM cleanup for Calcite popovers.** The "save as" panel is appended to `document.body` by Calcite and must be manually removed on destroy (wrapped in try/catch).
- **`unit` default is org-derived.** `getDefaultOrgUnit()` maps the signed-in user's `units` (`english` -> Imperial, else Metric); do not assume a hardcoded default.
- **Output data sources have four distinct IDs** derived from the widget id; consumers must target the right one (stops / route / direction points / direction lines).
- Logging uses `pWinSt` (a build-time logger shim) - not something to copy into custom widgets.

## Useful snippets and functions
Real snippets from the source; path noted above each.

`src/data-actions/directions-to.ts` - data action pushing a stop geometry into the widget's mutable store:
```ts
export default class DirectionsTo extends AbstractDataAction {
  async isSupported (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
    return (await isRecordValid.bind(this)(dataSets, dataLevel)) && dataSets[0].records.length === 1
  }

  async onExecute (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean | ReactElement<any, string | JSXElementConstructor<any>>> {
    const feature = await dataSourceUtils.changeToJSAPIGraphic((dataSets[0].records[0] as any)?.feature)
    const directionsToPoint = feature.geometry
    MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'directionsToPoint', directionsToPoint)
    return true
  }
}
```

`src/data-actions/plan-route.ts` - multi-record "plan route" action:
```ts
async isSupported (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
  return (await isRecordValid.bind(this)(dataSets, dataLevel)) && dataSets[0].records.length > 1 && dataSets[0].type === 'selected'
}

async onExecute (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean | ReactElement<any, string | JSXElementConstructor<any>>> {
  const features = await Promise.all(dataSets[0].records.map(record => {
    return dataSourceUtils.changeToJSAPIGraphic((record as any)?.feature)
  }))
  const routeStops = features.map(feature => feature.geometry)
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'routeStops', routeStops)
  return true
}
```

`src/data-actions/utils.ts` - shared point-only validation + config-ready gate:
```ts
export async function isRecordValid (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
  if (dataSets.length > 1 || dataLevel === DataLevel.DataSource || !isDirectionsReady(this.widgetId)) {
    return false
  }
  const dataSet = dataSets[0]
  if (dataSet.records.length >= 1) {
    for (const record of dataSet.records) {
      const feature = await dataSourceUtils.changeToJSAPIGraphic((record as any)?.feature)
      if (!feature.geometry || feature.geometry.type !== 'point') {
        return false
      }
    }
    return true
  }
}
```

`src/runtime/widget.tsx` - consuming mutable data-action input and applying it to stops:
```ts
const updateFromDataAction = useCallback(async () => {
  if (isReadyToRender && directionsRef.current && props.mutableStateProps) {
    const { directionsFromPoint, directionsToPoint, routeStops } = props.mutableStateProps

    if (directionsToPoint) {
      const address = await getAddressFromSources(directionsToPoint, searchConfig)
      const stopLength = directionsRef.current.layer.stops.length
      directionsRef.current.layer.stops.at(stopLength - 1).geometry = directionsToPoint
      directionsRef.current.layer.stops.at(stopLength - 1).name = address
      MutableStoreManager.getInstance().updateStateValue(props.widgetId, 'directionsToPoint', null)
      return
    }
    // ... directionsFromPoint / routeStops handled similarly
  }
}, [isReadyToRender, props.mutableStateProps, props.widgetId, searchConfig])
```

`src/runtime/widget.tsx` - building the `RouteLayer` and `Directions` widget:
```ts
const newRouteLayer = new RouteLayer({
  id,
  url: routeServiceUrl,
  title: routeTitle,
  pointBarriers: barrierLayers?.points,
  polylineBarriers: barrierLayers?.polylines,
  polygonBarriers: barrierLayers?.polygons
})

directionsRef.current = new Directions({
  id,
  layer: newRouteLayer,
  container: c,
  view: jimuMapView?.view,
  searchProperties: searchProperties,
  unit: config?.unit ?? getDefaultOrgUnit(),
})

jimuMapView?.view?.map?.add(newRouteLayer)

directionsRef.current.viewModel.routeParameters.returnRoutes = true
directionsRef.current.viewModel.routeParameters.returnDirections = true
directionsRef.current.viewModel.routeParameters.returnStops = true
```

`src/runtime/widget.tsx` - barriers from JimuLayerView data sources, split by geometry type:
```ts
const { records } = await (ds as any).query({ where: '1=1', returnGeometry: true })
switch (ds.getGeometryType()) {
  case 'esriGeometryPoint': {
    const barriers = records.map(record => new PointBarrier({ geometry: record.getGeometry() }))
    barrierLayers.points.push(...barriers)
    break
  }
  case 'esriGeometryPolyline': {
    const barriers = records.map(record => new PolylineBarrier({ geometry: record.getGeometry() }))
    barrierLayers.polylines.push(...barriers)
    break
  }
  case 'esriGeometryPolygon': {
    const barriers = records.map(record => new PolygonBarrier({ geometry: record.getGeometry() }))
    barrierLayers.polygons.push(...barriers)
    break
  }
}
```

`src/runtime/widget.tsx` - watching `lastRoute` to drive output data sources:
```ts
function watchLastRoute () {
  watchLastRouteRef.current = reactiveUtils.watch(() => { return directionsRef.current.lastRoute }, () => {
    if (directionsRef.current.lastRoute) {
      setOutputDssUnloadedAndSetLayer(id, directionsRef.current.lastRoute)
    } else {
      setOutputDssNotReady(id)
    }
  })
}
```

`src/runtime/widget.tsx` - populating the four output data sources from the solve result:
```ts
await createJSAPILayerForDs(stopOutputDs, 'point', convertToJSAPIGraphic(result.stops?.toArray()))
await createJSAPILayerForDs(routeOutputDs, 'polyline', convertToJSAPIGraphic(result.routeInfo ? [result.routeInfo] : []))
await createJSAPILayerForDs(directionPointOutputDs, 'point', convertToJSAPIGraphic(result.directionPoints?.toArray()))
await createJSAPILayerForDs(directionLineOutputDs, 'polyline', convertToJSAPIGraphic(result.directionLines?.toArray()))
```

`src/utils.ts` - reverse geocode with per-source attempts and a default fallback:
```ts
export async function getAddressFromSources (point: __esri.Point, searchConfig: IMSearchConfig) {
  const locator = await loadArcGISJSAPIModule('esri/rest/locator')
  const sources = searchConfig.dataConfig.map(c => getUrlOfUseUtility(c.useUtility)).asMutable()
  const DEFAULT_GEOCODING_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer'

  let res = null
  for (const source of sources) {
    try {
      const { address } = await locator.locationToAddress(source, { location: point })
      if (address) { res = address; break }
    } catch (err) { /* try next source */ }
  }
  if (!res) {
    const { address } = await locator.locationToAddress(DEFAULT_GEOCODING_URL, { location: point })
    res = address
  }
  return res
}
```

`src/utils.ts` - deriving the four output data source IDs from the widget id:
```ts
export function getStopOutputDsId (widgetId: string): string { return `${widgetId}_output_stop` }
export function getDirectionPointOutputDsId (widgetId: string): string { return `${widgetId}_output_direction_point` }
export function getDirectionLineOutputDsId (widgetId: string): string { return `${widgetId}_output_direction_line` }
export function getRouteOutputDsId (widgetId: string): string { return `${widgetId}_output_route` }
```

`src/setting/setting.tsx` - generating output data source JSONs when a map is selected (schemas read from JSAPI support classes):
```ts
const [Stop, DirectionPoint, DirectionLine, RouteInfo] = await loadArcGISJSAPIModules(
  ['esri/rest/support/Stop', 'esri/rest/support/DirectionPoint', 'esri/rest/support/DirectionLine', 'esri/rest/support/RouteInfo'])
return [
  {
    id: getStopOutputDsId(widgetId),
    label: translate('outputStops'),
    type: DataSourceTypes.FeatureLayer,
    isOutputFromWidget: true,
    geometryType: 'esriGeometryPoint',
    schema: {
      idField: Stop.fields.find(f => f.type === 'esriFieldTypeOID')?.name || '__OBJECTID',
      fields: { ...convertJSAPIFieldsToJimuFields(Stop.fields) }
    }
  },
  // ... RouteInfo / DirectionPoint / DirectionLine
]
```

`src/tools/builder-operations.ts` - contributing translatable search-hint keys:
```ts
export default class BuilderOperations implements extensionSpec.BuilderOperationsExtension {
  id = 'directions-builder-operation'
  widgetId: string

  getTranslationKey (appConfig: IMAppConfig): Promise<extensionSpec.TranslationKey[]> {
    const keys: extensionSpec.TranslationKey[] = []
    const { searchConfig } = appConfig.widgets[this.widgetId].config as IMConfig
    if (searchConfig?.generalConfig?.hint) {
      keys.push({ keyType: 'value', key: `widgets.${this.widgetId}.config.searchConfig.generalConfig.hint`, /* ... */ valueType: 'text' } as any)
    }
    return Promise.resolve(keys)
  }
}
```
