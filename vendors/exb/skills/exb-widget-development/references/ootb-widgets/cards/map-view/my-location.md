# OTB Widget: arcgis/my-location

Online widget doc: https://developers.arcgis.com/experience-builder/guide/my-location-widget/

> Source-grounded card. Everything below is read from the local ExB 1.20 dist source
> at `ArcGISExperienceBuilder/client/dist/widgets/arcgis/my-location/` (gitignored).
> Items I could not verify from source are marked UNVERIFIED with the file that
> would confirm them. Plain hyphens only.

## Purpose

Visualize and analyze the movement or trajectory of a device using the browser
Geolocation API. Two modes:

- Get location (single point): reads the current device position and drops one
  point per request.
- Track location (path): watches the device position over time, builds path
  points and path lines, and streams them to output data sources.

The widget writes results into ExB output feature layer data sources (so other
widgets, Data Actions, and the map can consume them), highlights the current
location on the map, and does per-app housekeeping of IndexedDB caches.

From `manifest.json`:
- `"description": "This is the widget which allows you to visualize and analyze the movement or trajectory of devices."`
- `"enableDataAction": true`
- `"properties.canGenerateMultipleOutputDataSources": true`
- `"properties.canConsumeDataAction": true`
- `"dependency": "jimu-arcgis"`, `"settingDependency": "jimu-arcgis"`

## Source paths inspected

Manifest / config:
- `manifest.json`
- `src/config.ts` (Config interface, enums)
- `src/constants.ts` (defaults, field lists, `STORES`, `DB_VERSION`)
- `src/version-manager.ts` (schema upgraders for 1.16.0 and 1.20.0)

Runtime:
- `src/runtime/widget.tsx` (class widget, state, tracking logic, render)
- `src/runtime/data-source/track-point-output.tsx` (single-point output DS manager)
- `src/runtime/data-source/trackline-output.tsx` (polyline output DS manager)
- `src/runtime/data-source/trackline-point-output.tsx` (path-point output DS manager)
- `src/runtime/data-source/utils.ts` (graphics, layer sync, OID/localStorage helpers)
- `src/runtime/utils/common/db.ts` (IndexedDB name + cleanup)
- `src/runtime/utils/common/geolocate.ts` (Geolocation API wrappers, line math)
- `src/runtime/utils/common/util.ts` (formatting, distance/time math)
- `src/runtime/components/highlight-location.tsx` (GraphicsLayer highlight)
- `src/runtime/components/track*.tsx`, `trackline*.tsx` (list UI, not fully quoted here)

Setting (builder):
- `src/setting/setting.tsx` (settings panel, output DS creation)
- `src/setting/utils.ts` (schemas, `createInitOutputDataSource`, `getInitSchema`, `getHiddenFields`)
- `src/setting/components/*` (`highlight-info`, `track-location`) referenced, not fully quoted.

Ignored per instructions: `dist/` build output and `tests/`.

## Architecture overview

Three output data sources, mode-dependent (all `DataSourceTypes.FeatureLayer`,
`isOutputFromWidget: true`, created in the setting via `createInitOutputDataSource`):

1. `track` - point geometry (`esriGeometryPoint`). Created when Track location is
   OFF. Fields: OBJECTID, location_timestamp, Longitude, Latitude, altitude,
   Orientation, speed, Accuracy.
2. `trackline_point` - point geometry. Created when Track location is ON. Same as
   `track` plus a `LineID` field linking each point to its path.
3. `trackline` - polyline geometry (`esriGeometryPolyline`). Created when Track
   location is ON. Fields: OBJECTID, StartTime, EndTime, AverageAltitude,
   AverageSpeed, AverageAccuracy.

Mode selection is driven by `config.watchLocation`:
- OFF -> one output DS (`track`). Runtime renders `TrackOut` and reads
  `props.outputDataSources[0]`.
- ON -> two output DS (`trackline_point` at index 0, `trackline` at index 1).
  Runtime renders `TrackLinePointOut` (index 0) and `TrackLineOut` (index 1).

Storage / IDs:
- Object IDs are held in `localStorage` (not IndexedDB) via
  `utils.readLocalStorage` / `utils.setLocalStorage`. See `getObjectId` in
  `data-source/utils.ts` and `getOId` in `utils/common/geolocate.ts`.
- IndexedDB is used at the app-housekeeping level: `constants.ts` `STORES`
  describes three stores (`location`, `path-point`, `path`) and `DB_VERSION = 1`;
  `utils/common/db.ts` builds a per-app/per-widget DB name and deletes stale DBs
  on mount (`clearUselessDB`). UNVERIFIED: the actual per-record IndexedDB
  read/write path. `db.ts` only exposes `deleteDB`, `getDBName`, and
  `clearUselessDB`; no store put/get is present in the files inspected. The live
  track/line records flow through the output feature layer data sources and React
  state, with OID counters in localStorage. Confirm in `src/runtime/utils/common/db.ts`.

Geolocation:
- `navigator.geolocation.getCurrentPosition` (single) and `watchPosition`
  (streaming) wrapped in `utils/common/geolocate.ts`. Permission is checked with
  the Permissions API (`navigator.permissions.query({ name: 'geolocation' })`)
  with a `getCurrentPosition` fallback.

## Key imports and packages

widget.tsx (`src/runtime/widget.tsx`):
- `jimu-arcgis`: `JimuMapView` (type), `JimuMapViewComponent`, `MapViewManager`
- `jimu-core`: `AllWidgetProps`, `DataSource`, `FeatureLayerDataSource` (types),
  `DataSourceManager`, `IMState`, `QueryScope`, `React`, `getAppStore`, `jsx`,
  `utils`, `defaultMessages as jimuCoreMsgs`
- `jimu-ui`: `Alert`, `Button`, `ConfirmDialog`, `DataActionList`,
  `DataActionListStyle`, `Icon`, `Loading`, `LoadingType`, `Paper`, `Tooltip`,
  `WidgetPlaceholder`
- `jimu-icons/outlined/*`: `VisibleOutlined`, `InvisibleOutlined`, `PauseOutlined`,
  `PlayOutlined`, `TrashOutlined`, `PinEsriOutlined`, `TracePathOutlined`
- local: `TrackOut`, `TrackLineOut`, `TrackLinePointOut` (data-source managers),
  `HighLightLocation`, `TrackView`, `TrackLineView` (components), plus
  `../version-manager` and the `../constants` defaults.

data-source/utils.ts (`src/runtime/data-source/utils.ts`):
- `@arcgis/core/Graphic` (value import: `import Graphic from '@arcgis/core/Graphic'`)
- `jimu-arcgis`: `JimuLayerView`, `JimuMapView` (types), `zoomToUtils`
- `jimu-core`: `DataSourceStatus`, `getAppStore`, `utils`,
  `FeatureLayerDataSource` (type), `loadArcGISJSAPIModule`
- `__esri.FeatureLayer` loaded lazily via
  `loadArcGISJSAPIModule('esri/layers/FeatureLayer')`.

track-point-output.tsx / trackline-output.tsx / trackline-point-output.tsx:
- `esri/Graphic` (type-only in track-point-output: `import type Graphic from 'esri/Graphic'`)
- `esri/core/reactiveUtils` (`import * as reactiveUtils from 'esri/core/reactiveUtils'`)
- `jimu-core`: `DataSourceComponent`, `DataSource`, `DataSourceJson`,
  `DataSourceStatus`, `FeatureLayerDataSource`, `hooks`, `IMDataSourceInfo`,
  `Immutable`, `ImmutableArray`, `ImmutableObject`, `QueryParams`, `QueryScope`,
  `React`, `UseDataSource` (mixed value/type imports)

highlight-location.tsx (`src/runtime/components/highlight-location.tsx`):
- `esri/Graphic`, `esri/geometry/Point`, `esri/geometry/Circle`,
  `esri/layers/GraphicsLayer` (value imports)
- `jimu-arcgis`: `JimuMapView` (type)
- `jimu-core`: `React`

db.ts (`src/runtime/utils/common/db.ts`):
- `jimu-core`: `getAppStore`, `indexedDBUtils`, `utils`
- browser `indexedDB` global (`indexedDB.deleteDatabase`, `indexedDB.databases`)

setting.tsx (`src/setting/setting.tsx`):
- `jimu-core`: `Immutable`, `LayoutItemType`, `React`, `classNames`, `css`, `jsx`,
  `polished`, `IMFieldSchema`, `UseDataSource`, `DataSourceManager`
- `jimu-for-builder`: `getAppConfigAction`, `AllWidgetSettingProps`
- `jimu-ui`: `Button`, `Icon`, `Label`, `NumericInput`, `Switch`, `defaultMessages`
- `jimu-ui/advanced/setting-components`: `MapWidgetSelector`, `SettingRow`, `SettingSection`
- `jimu-ui/advanced/data-source-selector`: `FieldSelector`, `dataComponentsUtils`
- `jimu-ui/basic/list-tree`: `List`, `TreeItemActionType`
- `jimu-layouts/layout-runtime`: `LayoutItemSizeModes`, `searchUtils`

setting/utils.ts (`src/setting/utils.ts`):
- `@esri/arcgis-rest-request`: `GeometryType` (type)
- `jimu-core`: `DataSourceJson`, `DataSourceSchema`, `DataSourceTypes`,
  `DateTimeFieldFormatProperties`, `dateUtils`, `EsriFieldType`, `IMDataSourceSchema`,
  `IntlShape`, `JimuFieldType`

## Reusable patterns found

- JimuMapView binding: `JimuMapViewComponent` with `useMapWidgetId`,
  `onActiveViewChange`, and `onViewsCreate`; the active view is awaited with
  `activeJimuMapView.whenJimuMapViewLoaded()` before use.
  `MapViewManager.getInstance()` is held as `this.mvManager`.
- Three OUTPUT data source managers, each a small function component wrapping a
  `DataSourceComponent`: `track-point-output`, `trackline-point-output`,
  `trackline-output`. Pattern: build an `ImmutableObject<UseDataSource>` from a
  `dataSourceId`, run a `queryCount` query `where: '1=1'`, and push edits into the
  data source with `setSourceFeatures` / `applyEdits`.
- Output DS <-> map layer sync: `data-source/utils.ts` `syncDataToLayer` /
  `syncToMap` apply `addFeatures` / `deleteFeatures` / `updateFeatures` to the
  layer and mirror them onto the data source with
  `afterAddRecord` / `afterDeleteRecordsByIds` / `afterUpdateRecords` /
  `buildRecord`. `createDataSourceLayer` seeds a data source via
  `setSourceFeatures` then flips status with `setStatus` / `setCountStatus`.
- IndexedDB per-app cache housekeeping: `getDBName(widgetId, widgetName)` builds
  `exb-<appId>-<widgetName>-<widgetId>-cache`; `clearUselessDB` lists
  `indexedDB.databases()`, keeps only DBs whose widget still exists in
  `appConfig.widgets`, and deletes the rest with `indexedDB.deleteDatabase`
  (wrapped by `indexedDBUtils.whenRequest`).
- OID counters in localStorage: `getObjectId(key, reset?)` and `getOId(storeName)`
  increment a stored integer; keys are built per app/widget/store with
  `getWidgetObjectIdKey`. On `beforeunload` and unmount the counters are reset to
  `'0'` (`resetObjectKeys`).
- Geolocation API wrappers: `getCurrentPosition`, `watchPosition`, `clearWatch`,
  and `checkGeolocationPermission` centralize navigator access and error handling.
- Streaming filter: `keepPoint` decides whether a new fix is kept based on either
  distance (`calculateDistance`, Haversine) or elapsed time
  (`calculateTimeDifference`), plus a 1s minimum and duplicate-coordinate guard.
- DataActionList integration: `renderDataActionList` renders a `DataActionList`
  over the selected records of an output DS (`getSelectedRecords`), gated on
  `enableDataAction`.
- Highlight overlay: a dedicated `GraphicsLayer` (id from
  `getHighLightGraphicsLayerId(widgetId)`) with `listMode: 'hide'`, a compass
  picture-marker and an accuracy circle (`esri/geometry/Circle`).
- version-manager schema evolution: `VersionManager extends WidgetVersionManager`
  with `upgradeFullInfo: true` upgraders that rewrite output DS schema fields
  (rename fields in 1.16.0, swap `format` for `fieldFormat` in 1.20.0).

## Builder vs runtime split

Builder (`src/setting/`):
- Picks the map widget (`MapWidgetSelector`) and, on selection, creates the output
  data sources by calling `onSettingChange(..., [outputDsJson, ...])`. Toggling
  Track location recreates the DS set (`crateDataSources(isTrack)`).
- Owns all config toggles: arrangement (Panel vs Toolbar), highlight location and
  highlight info (color, compass, accuracy), zoom to location + zoom scale,
  timeout, default activation, show runtime layers, and the visible field list
  (`FieldSelector` + a draggable `List`).
- Also adjusts the layout item height when arrangement changes
  (`updateLayoutItemHeight` via `getAppConfigAction`) and sets
  `inControllerUx` to `offPanel`/`inPanel`.

Runtime (`src/runtime/`):
- Reads `props.outputDataSources` and `props.useMapWidgetIds`, binds the
  JimuMapView, performs geolocation, and streams graphics into the output DS and
  map layers.
- Renders either Panel (list UI + primary button) or Toolbar (compact icon bar)
  based on `config.arrangement`.

## Lifecycle and cleanup

- `constructor`: seeds a large `WidgetState`; `graphicsLayerId` derived from
  `getHighLightGraphicsLayerId(this.props.id)`; `selectedFields` /
  `selectedLineFields` fall back to constants.
- `componentDidMount`: `clearUselessDB(this.props.manifest.name)` and
  `window.addEventListener('beforeunload', this.resetObjectKeys)`.
- `componentDidUpdate`: announces loading start/end via an `aria-live` status;
  reacts to config changes (`selectedFields`, `watchLocation` -> `clearStores` +
  `clearWidget`); calls `defaultActivate` until first render; stops tracking and
  clears data sources when the map widget changes.
- `componentWillUnmount`: `clearWidget()` and removes the `beforeunload` listener.
- `clearWidget`: removes the highlight graphics layer, destroys output data
  sources (`clearDataSources(jimuMapView, true)` -> `dsManager.destroyDataSource`),
  and stops tracking (`clearWatch(watchId)`).
- `resetObjectKeys`: writes `'0'` back to the location and path OID localStorage
  keys.
- Output DS managers remove their `JimuLayerView` and dispose the
  `reactiveUtils.watch` handle on teardown (`removeJimuLayerViews`).
- Highlight component removes its GraphicsLayer in a `useEffect` cleanup.

## Manifest/config requirements

manifest.json:
- `type: widget`, `version/exbVersion: 1.20.0`
- `dependency: jimu-arcgis`, `settingDependency: jimu-arcgis`
- `enableDataAction: true`
- `properties.canGenerateMultipleOutputDataSources: true`
- `properties.canConsumeDataAction: true`
- `properties.coverLayoutBackground: true`
- `defaultSize: { width: 360, height: 430 }`
- `excludeDataActions`: `relatedData`, `elevation-profile-dev.*`,
  `arcgis-map.flash`, `arcgis-map.addToMap`

Config (`src/config.ts` `Config`):
- `watchLocation: boolean` (mode switch)
- `watchLocationSettings: { streaming: { type, unit, interval }, manualPathTracing }`
- `arrangement: Arrangement` (`PANEL` | `TOOLBAR`)
- `highlightLocation: boolean`
- `highlightInfo: { symbolColor, showCompassOrientation, showLocationAccuracy }`
- `zoomScale: number`, `zoomToLocation: boolean`, `timeOut: number`
- `selectedFields: []`, `selectedLineFields: []`
- `defaultActivation: boolean`, `useMapWidget: boolean`, `showRuntimeLayers?: boolean`

Defaults (`src/constants.ts`): `WATCH_LOCATION=false`, `HIGHLIGHT_LOCATION=true`,
`ZOOM_TO_LOCATION=true`, `ZOOM_SCALE=50000`, `TIME_OUT=15`, `USE_MAPWIDGET=true`,
`MANUAL_PATHTRACING=true`, `SYMBOL_COLOR='#007AC2'`, `STREAMING={ Distance, ft, 15 }`,
plus `SELECTED_FIELDS`, `SELECTED_LINEPOINT_FIELDS`, `SELECTED_LINE_FIELDS`,
`STORES`, `DB_VERSION=1`.

## Gotchas

- `pWinSt` (e.g. `pWinSt.error(...)`, `pWinSt.log(...)`) appears un-imported in
  `data-source/utils.ts` and `utils/common/geolocate.ts`. This is a build-injected
  global logger present in the dist output, not authored source. Do not copy it
  into your own widget; use your project logger instead. Confirm in the same files.
- Two distinct `Operations` enums exist: one in
  `src/runtime/data-source/utils.ts` and an identical copy in `src/setting/utils.ts`.
  Import the right one for the layer you are in.
- Mixed Esri import styles: runtime uses both `@arcgis/core/Graphic` (value, in
  `data-source/utils.ts`) and the `esri/*` alias (`esri/Graphic`,
  `esri/geometry/Point`, `esri/core/reactiveUtils`). Manifest `dependency` is
  `jimu-arcgis`; keep JSAPI imports consistent with the repo's alias config.
- OID state is browser-local (localStorage), reset on unload/unmount. IDs are not
  authoritative across sessions or devices; do not treat them as durable keys.
- Output DS count depends on `watchLocation`: index 0 is `track` (mode off) OR
  `trackline_point` (mode on), and index 1 (`trackline`) exists only when tracking.
  Toggling the mode in settings recreates the output data sources.
- The widget only renders working UI when a map widget is selected
  (`config.useMapWidget`) and `outputDataSources` are present; otherwise it shows a
  `WidgetPlaceholder`.
- IndexedDB per-record persistence is not evident in the inspected `db.ts`
  (only naming + cleanup). Verify before assuming track history survives reload.
- Geolocation requires a secure context (HTTPS) and user permission; the dev
  server runs on `https://localhost:3001`.

## Useful snippets and functions

Source: `src/runtime/utils/common/geolocate.ts`
```ts
export const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
}

export const getCurrentPosition = (options: GeolocationOptions) => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position: Position) => { resolve(position) },
        (error: PositionError) => { reject(error) },
        options || defaultOptions
      )
    } else {
      reject(new Error('Geolocation is not supported by this browser.'))
    }
  })
}

export const watchPosition = (successCallback, errorCallback?, options?) => {
  if (navigator.geolocation) {
    return navigator.geolocation.watchPosition(
      (position: Position) => { successCallback(position) },
      (error: PositionError) => { errorCallback?.(error) },
      options || defaultOptions
    )
  }
  return 0
}

export const clearWatch = (watchId: number) => {
  if (navigator.geolocation) { navigator.geolocation.clearWatch(watchId) }
}
```

Source: `src/runtime/utils/common/geolocate.ts` (permission gate)
```ts
export const checkGeolocationPermission = async (): Promise<boolean> => {
  // uses navigator.permissions.query({ name: 'geolocation' }) with a
  // getCurrentPosition fallback; resolves true for 'granted'/'prompt'->allow,
  // false for 'denied' or PERMISSION_DENIED.
}
```

Source: `src/runtime/widget.tsx` (streaming keep/skip decision)
```ts
keepPoint (position: GeolocationPosition): boolean {
  if (this.state.points.length === 0) return true
  const preCoord = this.state.points[this.state.points.length - 1]
  if (position.timestamp - preCoord.location_timestamp < 1000) return false
  if (preCoord.Longitude === position.coords.longitude &&
      preCoord.Latitude === position.coords.latitude) return false
  const s = this.props.config.watchLocationSettings ?? { manualPathTracing: MANUAL_PATHTRACING, streaming: { type: STREAMING.TYPE, unit: STREAMING.UNIT, interval: STREAMING.INTERVAL } }
  if (s.streaming.type === Types.Distance) {
    const distance = calculateDistance(position.coords.longitude, position.coords.latitude, preCoord.Longitude, preCoord.Latitude, s.streaming.unit)
    return distance > s.streaming.interval
  } else if (s.streaming.type === Types.Time) {
    if (s.streaming.unit === TimeUnits.sec) {
      const time = calculateTimeDifference(Date.now(), preCoord.location_timestamp)
      return time > s.streaming.interval
    }
  }
}
```

Source: `src/runtime/data-source/track-point-output.tsx` (output DS component)
```tsx
return (
  <DataSourceComponent
    query={{
      where: '1=1',
      outFields: props.selectedFields,
      returnGeometry: true
    } as QueryParams}
    queryCount
    widgetId={widgetId}
    useDataSource={useDataSource}
    onDataSourceCreated={handleCreated}
    onSelectionChange={handleSelectionChange}
    onDataSourceInfoChange={handleDataSourceInfoChange}
  />
)
```

Source: `src/runtime/data-source/utils.ts` (sync edits to layer + mirror to DS)
```ts
export const syncDataToLayer = async (dataSource: FeatureLayerDataSource, layer: __esri.FeatureLayer, operation: Operations, operGraphics: Graphic[], isNeedToUpdateDS: boolean = true): Promise<void> => {
  const FeatureLayer = await loadArcGISJSAPIModule('esri/layers/FeatureLayer')
  const ids = operGraphics?.map(o => o.attributes.OBJECTID)
  if (operation === Operations.ADD) {
    await layer.applyEdits({ addFeatures: operGraphics })
    if (isNeedToUpdateDS) dataSource.afterAddRecord(dataSource.buildRecord(operGraphics[0]?.clone()))
    updateLayerSource(layer, FeatureLayer, layer.source.toArray().concat(operGraphics))
  } else if (operation === Operations.DELETE) {
    await layer.applyEdits({ deleteFeatures: operGraphics })
    if (isNeedToUpdateDS) dataSource.afterDeleteRecordsByIds(ids)
    updateLayerSource(layer, FeatureLayer, layer.source.toArray().filter(f => !ids.includes(f.attributes.OBJECTID)))
  }
  // UPDATE / CLEAR / CREATE branches follow the same pattern
}
```

Source: `src/runtime/data-source/utils.ts` (graphics builders + OID counter)
```ts
export const getPointGraphic = (model: TrackPoint | TrackLinePoint): Graphic => {
  const geometry = { type: 'point', x: model.Longitude, y: model.Latitude }
  return Graphic.fromJSON({ geometry, attributes: { ...model } })
}

export const getLineGraphic = (line: TrackLine, points: TrackLinePoint[]): Graphic => {
  const paths = points.map(t => [t.Longitude, t.Latitude])
  if (points.length === 1) paths.push([points[0].Longitude, points[0].Latitude])
  return Graphic.fromJSON({ geometry: { type: 'polyline', paths: [paths] }, attributes: { ...line } })
}

export const getObjectId = (dataSourceKey: string, reset: boolean = false): number => {
  if (reset) { utils.setLocalStorage(dataSourceKey, '1'); return 1 }
  const oid = utils.readLocalStorage(dataSourceKey) ?? '0'
  const nextOid = Number(oid) + 1
  utils.setLocalStorage(dataSourceKey, nextOid.toString())
  return nextOid
}
```

Source: `src/runtime/utils/common/db.ts` (per-app IndexedDB naming + cleanup)
```ts
export function getDBName (widgetId: string, widgetName: string): string {
  const appId = window.jimuConfig?.isBuilder
    ? getAppStore().getState().appStateInBuilder?.appId
    : getAppStore().getState().appId
  return `exb-${appId}-${widgetName}-${widgetId}-cache`
}

export async function clearUselessDB (widgetName: string) {
  const dbNames = await listIndexedDBDatabases()
  const appWidgets = getAppStore().getState()?.appConfig?.widgets
  if (appWidgets !== undefined) {
    const ids = Object.keys(appWidgets).filter(id => appWidgets[id].manifest.name === widgetName)
    const appDBNames = ids.map(id => getDBName(id, widgetName))
    dbNames.forEach(name => { if (!appDBNames.includes(name)) deleteDB(name) })
  }
}
```

Source: `src/constants.ts` (IndexedDB store schema + version)
```ts
export const STORES: storeScheme[] = [
  { storeName: 'location',   indexName: 'timeIndex',   indexKey: 'location_timestamp', keyPath: 'OBJECTID' },
  { storeName: 'path-point', indexName: 'lineIdIndex', indexKey: 'LineID',             keyPath: 'OBJECTID' },
  { storeName: 'path',       indexName: 'timeIndex',   indexKey: 'EndTime',            keyPath: 'OBJECTID' }
]
export const DB_VERSION = 1
```

Source: `src/setting/utils.ts` (create an output feature layer data source)
```ts
export const createInitOutputDataSource = (intl, id, label, name, geometryType: GeometryType) => {
  const schema = getInitSchema(intl, label, name)
  const outputDsJson: DataSourceJson = {
    id,
    type: DataSourceTypes.FeatureLayer,
    label,
    originDataSources: [],
    isOutputFromWidget: true,
    isDataInDataSourceInstance: false,
    schema,
    geometryType,
    layerId: id + '__layer'
  }
  return outputDsJson
}
```

Source: `src/setting/setting.tsx` (register output DS on map selection)
```ts
crateDataSources = (isTrack: boolean) => {
  if (isTrack) {
    const trackLinePointDs = createInitOutputDataSource(this.props.intl, this.trackLinePointOutId, this.trackLinePointLabel, 'trackline_point', 'esriGeometryPoint')
    const trackLineDs = createInitOutputDataSource(this.props.intl, this.props.id + '_output_trackline', trackLineOutLabel, 'trackline', 'esriGeometryPolyline')
    this.props.onSettingChange({ id: this.props.id, useDataSources: [] }, [trackLinePointDs, trackLineDs])
  } else {
    const trackPointDs = createInitOutputDataSource(this.props.intl, this.trackPointOutId, this.trackPointOutLabel, 'track', 'esriGeometryPoint')
    this.props.onSettingChange({ id: this.props.id, useDataSources: [] }, [trackPointDs])
  }
}
```

Source: `src/version-manager.ts` (schema evolution across versions)
```ts
export class VersionManager extends WidgetVersionManager {
  versions = [
    { version: '1.16.0', upgradeFullInfo: true, upgrader: (oldInfo) => { /* rename fields: ObjectID->OBJECTID, Time->location_timestamp, ... on config + output DS schema */ } },
    { version: '1.20.0', upgradeFullInfo: true, upgrader: (oldInfo) => { /* replace schema field `format` with `fieldFormat` for date fields */ } }
  ]
}
export const versionManager = new VersionManager()
```

Source: `src/runtime/widget.tsx` (Data Action list over selected output records)
```tsx
renderDataActionList (index: number, condition: boolean) {
  if (!condition) return null
  const dataSource = this.state.dataSources?.[index]
  const fields = index === 0 ? this.state.selectedFields : this.state.selectedLineFields
  return (
    <DataActionList
      widgetId={this.props.id}
      dataSets={[{ dataSource, type: 'selected', records: dataSource?.getSelectedRecords(), name: dataSource?.getLabel(), fields }]}
      listStyle={DataActionListStyle.Dropdown}
      buttonType='tertiary'
    />
  )
}
```
