# OTB Widget: common/timeline

Online widget doc: https://developers.arcgis.com/experience-builder/guide/timeline-widget/

## Purpose
The Timeline widget renders an interactive time ruler/slider that lets users step or play through
time and temporally filter time-aware layers. It supports two data-binding modes:
1. Add data directly (`addSourceByData = true`): the widget owns one or more data sources (WebMap,
   WebScene, MapService, FeatureLayer, ImageryLayer, ImageryTileLayer, SubtypeGroupLayer, SceneLayer)
   and applies temporal filters to those layers directly (no Map widget required).
2. Bind to a Map widget (`addSourceByData = false`): the widget reads time-aware layers from the
   active `JimuMapView` and filters the layer views.
It can either honor the WebMap's saved time-slider settings (`honorTimeSettings`) or use custom time
settings (start/end, accuracy, step length or divided count, display strategy, speed, play position).
Manifest `description` says "This is the widget used in developer guide" (boilerplate), but the code
is the full production Timeline widget.

## Source paths inspected
Root: `ArcGISExperienceBuilder/client/dist/widgets/common/timeline/` (gitignored dist source).
- `manifest.json` (read fully)
- `src/config.ts` (read fully - enums + config interfaces)
- `src/version-manager.ts` (read fully - 1.11.0 + 1.12.0 upgraders)
- `src/runtime/widget.tsx` (read fully - main runtime)
- `src/runtime/components/timeline.tsx` (read: imports + props + top of `TimeLine`; ruler/play UI body skimmed)
- `src/runtime/components/timeline-ds.tsx` (read fully - DataSourceComponent wrapper)
- `src/runtime/components/utils.ts` (read: imports + `TimelineAccuracy`/`TimelineDetails` types; tick-math body UNVERIFIED past line ~60)
- `src/utils/utils.ts` (read: through ~line 500 - time settings + timezone + accuracy helpers; tail of `getUpdatedEndTimeByStepLength` UNVERIFIED)
- `src/setting/setting.tsx` (read: constructor + handlers + source/timeSetting/style/appearance/options sections; final `render()` composition UNVERIFIED - see Gotchas)
- `src/setting/time-panel.tsx` (read: imports + Props/State; body UNVERIFIED)
- `src/setting/timeline-ds.tsx` (read fully)
- `src/setting/components/input-range.tsx` (read: imports + props + effect head; interact binding body UNVERIFIED)
- `src/setting/components/time-span.tsx` (read: imports + props + effect head; layer-extent body UNVERIFIED)
- `src/setting/components/utils.tsx` (read: `DATE_TIME_FORMAT` + `getLineInfo` + `ResizeHandlerProps` head)

Skipped intentionally: `src/**/translations/*` (40 locales), `**/style.ts`, `assets/*.svg`, and any
`tests/` (none present in tree) and compiled `dist/` (excluded per instructions).

## Architecture overview
- `runtime/widget.tsx` is a function component. It resolves which data sources to use (map-widget vs
  direct data), creates them via `DataSourceManager`, computes runtime time settings, then renders the
  presentational `runtime/components/timeline.tsx` ruler and pushes time extents back onto layers.
- `runtime/components/timeline-ds.tsx` is a thin class wrapper over `DataSourceComponent` used only in
  the single-layer path; it reports create/failed/notReady status back to the widget.
- `runtime/components/timeline.tsx` (`TimeLine`) is the pure UI: renders the ruler ticks, thumbs,
  zoom +/-, play/pause/previous/next, speed dropdown, apply switch; emits `onTimeChanged`.
- `utils/utils.ts` is the shared (runtime + setting) time-math module: virtual-date resolution,
  webmap honored-settings extraction, accuracy/step-length calculation, timezone offsetting.
- `runtime/components/utils.ts` is the ruler tick-geometry module (zoom levels, tick sizes, drag/resize
  handlers via `jimu-core/dnd`).
- `setting/setting.tsx` is a `React.PureComponent` builder panel: source selection, honor-vs-custom
  time settings, style, appearance, options; opens the `time-panel` in a `SidePopper`.
- `setting/time-panel.tsx` + `components/time-span.tsx` + `components/input-range.tsx` provide the
  custom time-configuration UI (overall extent, start/end range drag).

Data flow (runtime): `useDataSources`/`useMapWidgetIds` -> create DS -> `getCalculatedTimeSettings`
or `getTimeSettingsFromHonoredWebMap` -> `timeSettingsForRuntime` -> `TimeLine` -> `onTimeChanged`
-> `getTimeExtentByTzOffset` -> `updateLayerQueryParams` -> `layerDs.updateQueryParams` /
`MapServiceDataSource.changeTimeExtent`.

## Key imports and packages
Grouped by module, with the file each is used in.

- `jimu-core` (runtime/widget.tsx): `React`, `AllWidgetProps`, `jsx`, `ReactResizeDetector`,
  `DataSourceStatus`, `utils`, `DataSourceManager`, `Immutable`, `DataSourceTypes`, `css`, `hooks`,
  `getAppStore`, `IMState`, `ReactRedux`, `TimezoneConfig`, plus types `DataSource`, `MapDataSource`,
  `MapServiceDataSource`, `FeatureLayerDataSource`.
- `jimu-arcgis` (runtime/widget.tsx): `JimuLayerView`, `JimuLayerViews`, `JimuMapView`,
  `JimuMapViewComponent`, `loadArcGISJSAPIModules`, `MapViewManager`.
- `jimu-ui` (runtime/widget.tsx): `Alert`, `Paper`, `WidgetPlaceholder`.
- ArcGIS JS API / `__esri` (runtime/widget.tsx): `esri/core/reactiveUtils` loaded lazily via
  `loadArcGISJSAPIModules(['esri/core/reactiveUtils'])`; typed as `typeof __esri.reactiveUtils`.
- `jimu-core` (runtime/components/timeline.tsx): `React`, `jsx`, `classNames`, `useIntl`, `AppMode`,
  `lodash`, `getAppStore`, `hooks`, `focusElementInKeyboardMode`, `dateUtils`, `ReactRedux`, `IMState`.
- `jimu-core/dnd` (timeline.tsx + setting/components/input-range.tsx + time-span.tsx): `interact`
  (interact.js) for drag/resize of thumbs and range.
- `jimu-icons` (timeline.tsx): `PlusCircleOutlined`, `MinusCircleOutlined`, `InfoOutlined`,
  `PlayOutlined`, `PauseOutlined`, `PreviousOutlined`, `NextOutlined`, `SpeedOutlined`.
- `jimu-ui/advanced/style-setting-components` (config.ts, utils.ts, timeline.tsx): types
  `DateTimeUnits`, `DateUnitInputValue`, `DateWeekUnits`, `TimeUnits`; component `DateUnitInput` (time-panel).
- `jimu-core` (utils/utils.ts): `DataSource`, `dataSourceUtils`, `dateUtils`, `FeatureLayerDataSource`,
  `MapServiceDataSource`, `Immutable`, `DataSourceTypes`, `getAppStore`, `TimezoneConfig`, `MapDataSource`.
- `jimu-for-builder` (setting/setting.tsx): `AllWidgetSettingProps`, `getAppConfigAction`.
- `jimu-ui/advanced/setting-components` (setting.tsx + time-panel.tsx): `SettingSection`, `SettingRow`,
  `SidePopper`, `MapWidgetSelector`.
- `jimu-ui/advanced/data-source-selector` (setting.tsx + time-panel.tsx): `DataSourceSelector`.
- `jimu-ui/basic/color-picker` (setting.tsx): `ThemeColorPicker`.
- `jimu-ui/basic/date-picker` (time-panel.tsx): `DatePicker`.
- `jimu-core` (version-manager.ts): `BaseVersionManager`.

## Reusable patterns found
- JimuMapView binding (runtime): renders `<JimuMapViewComponent useMapWidgetId={useMapWidgetIds[0]}
  onActiveViewChange={onActiveViewChange} />`; `onActiveViewChange` stores `jimuMapView.dataSourceId`
  in a ref and calls `jimuMapView.whenAllJimuLayerViewLoaded()`, filtering to time-aware layer views
  (`jimuLayerViews[id].supportTime()` and `layer.type !== 'sublayer'`).
- MapViewManager (runtime): `MapViewManager.getInstance()`; `getAllJimuMapViewIds()`,
  `getJimuMapViewById(id)` used to find layer views for the active WebMap when playing.
- DataSourceManager (runtime + setting): `DataSourceManager.getInstance()`;
  `createDataSourceByUseDataSource(Immutable(useDs))`; DS-set handling via `isDataSourceSet()`,
  `areChildDataSourcesCreated()`, `childDataSourcesReady()`.
- Multiple DS-type support: `SUPPORTED_TYPES` in setting = WebMap, MapService, FeatureLayer,
  ImageryLayer, ImageryTileLayer, SubtypeGroupLayer, WebScene, SceneLayer. `isWebMapOrWebScene()` and
  `isSingleLayer()` branch behavior. `getInsideLayersFromWebmapOrWebScene()` enumerates supported
  time-aware child layers (excludes FeatureLayers that live inside a MapService via
  `dataSourceUtils.findMapServiceDataSource(layer)`).
- Temporal filtering: `updateLayerQueryParams` calls `MapServiceDataSource.changeTimeExtent(time, id)`
  for MapService, and `layerDs.updateQueryParams({ time: [start, end] }, id)` for single layers;
  gated on `layerDs.supportTime()`. `getTimeOffsetQueryParams` shifts the extent by the layer's
  `getTimeInfo().exportOptions.TimeOffset` in the correct `timeOffsetUnits`.
- Timezone/date handling: `getTimeExtentByTzOffset(start, end, withOffset)` reads
  `appConfig.attributes.timezone` (or `appStateInBuilder` in builder) and, for
  `TimezoneConfig.Specific`, adjusts by `dataSourceUtils.getTimeZoneOffsetByName(value)` minus
  `getLocalTimeOffset()`. Data-timezone (`TimezoneConfig.Data`) is unsupported and shows a warning.
  Virtual dates handled via `dateUtils.VirtualDateType` (`Min`, `Max`, `Today`, `Now`).
- reactiveUtils: `reactiveUtils.whenOnce(() => !layerView.view.updating)` batched with `Promise.all`
  in `watchDsUpdating()` to clear the widget's updating spinner after each play step.
- version-manager: `Widget.versionManager = versionManager` with `BaseVersionManager` upgraders for
  1.11.0 (round `stepLength.val`/`dividedCount`) and 1.12.0 (drop legacy top-level `speed`, move to
  `timeSettings.speed`).
- Honored WebMap extraction: `getTimeSettingsFromHonoredWebMap` reads
  `(webMap as MapServiceDataSource).getItemData().widgets.timeSlider.properties` and maps
  `thumbMovingRate`->speed, `timeStopInterval`/`numberOfStops`->accuracy/step, `thumbCount`+
  `currentTimeExtent`->display strategy.

## Builder vs runtime split
- Builder-only (`setting/`): source mode radios (data vs map widget), `DataSourceSelector` /
  `MapWidgetSelector`, honor-vs-custom radios, `configureTime` button opening `time-panel` in a
  `SidePopper`, style picker (Classic/Modern SVGs), `ThemeColorPicker` appearance, options switches
  (play control, autoPlay, apply-by-default, display accuracy + `DISPLAY_ACCURACY` select). Writes
  config via `onSettingChange` and `getAppConfigAction().editWidgetProperty(...,'inControllerUx',
  'offPanel')`.
- Runtime-only (`runtime/`): DS creation/tracking, layer-view discovery, time computation, the actual
  ruler/play UI, and pushing time extents to layers.
- Shared (`utils/utils.ts`): both call `getCalculatedTimeSettings` and `getTimeSettingsFromHonoredWebMap`
  (setting passes `isRuntime=false` and gets `{config, exactStartTime, exactEndTime, minAccuracy,
  accuracyList}`; runtime passes `isRuntime=true` and gets resolved `timeSettings`).

## Lifecycle and cleanup
- Mount effect (widget.tsx): sets width, lazy-loads `esri/core/reactiveUtils`. Cleanup calls
  `onTimeChanged(null, null, true)` which sets `queryParams.time = null` and clears the temporal
  filter on every bound layer / layer view (unmount cleanup so layers are not left filtered).
- `TimelineDataSource.componentWillUnmount` (runtime): reports the DS removed
  (`onCreateDataSourceCreatedOrFailed(id, null, true)`) and `NotReady` so the parent prunes it.
- Effects reset caches when `dataSourceType` changes (clears `dataSources`, `layerUseDss`,
  runtime settings) and re-sync `applied` when `applyFilteringByDefault` changes.
- `watchDsUpdating()` registers `reactiveUtils.whenOnce` watchers per play step; they self-resolve
  (one-shot) so no manual handle removal is stored - UNVERIFIED whether any long-lived watch handles
  leak (none observed; all are `whenOnce`).

## Manifest/config requirements
From `manifest.json`:
- `name: "timeline"`, `label: "Timeline"`, `type: "widget"`, `version/exbVersion: 1.20.0`,
  `author: "Esri R&D Center Beijing"`.
- `properties`: `coverLayoutBackground: true`, `defaultInControllerUx: "offPanel"` (widget expects to
  render off-panel inside a Controller; setting forces `inControllerUx = 'offPanel'` on style change).
- `defaultSize`: `width 480`, `height 156`, `autoHeight: true`.
- No `dependency` array is declared in the manifest (no `jimu-arcgis`/`arcgis` dependency entry seen).
  The ArcGIS JS API is reached only through `jimu-arcgis` helpers and lazy `loadArcGISJSAPIModules`.
  UNVERIFIED: whether an implicit dependency is injected by the build; inspect `manifest.json` if a
  custom rebuild fails to load `esri/core/reactiveUtils`.
- Config shape (`src/config.ts`): `addSourceByData?`, `dataSourceType?` (`DataSourceTypes`),
  `honorTimeSettings?`, `timeStyle?` (`TimeStyle.Classic|Modern`), `foregroundColor/backgroundColor/
  sliderColor?`, `enablePlayControl?`, `autoPlay?`, `enableDisplayAccuracy?`, `displayAccuracy?`
  (`DateTimeUnits`), `applyFilteringByDefault?`, and `timeSettings?` (`layerList`, `startTime`,
  `endTime`, `accuracy`, `timeDisplayStrategy`, `stepLength`, `dividedCount`, `speed`, `playPosition`,
  `currentTimeExtent`). Enums: `TimeStyle`, `TimeSpeed`, `TimeDisplayStrategy`, `TimePlayPosition`.

## Gotchas
- `useMapWidgetIds` is nulled when `addSourceByData` is true: `const useMapWidgetIds = addSourceByData
  ? null : _useMapWidgetIds`. The two source modes are mutually exclusive.
- FeatureLayers inside a MapService are deliberately excluded from direct filtering
  (`dataSourceUtils.findMapServiceDataSource(layer) === null` gate) - the MapService is filtered
  instead via `changeTimeExtent`.
- Time-offset is applied by SUBTRACTING the layer's `TimeOffset` from the query extent
  (`getTimeOffsetQueryParams`), matched to `timeOffsetUnits` (years/months/days/hours/etc). Getting
  the unit switch wrong silently mis-filters.
- Timezone type `Data` is not supported: shows `timezoneWarning`; `Specific` timezone requires the
  offset dance in `getTimeExtentByTzOffset` (double conversion: display adds offset, filtering removes it).
- `getTimeInfo()` may be `undefined` (scene-layer associated DS failed to create, or a layer became
  non-time-aware via an Arcade data layer) - all callers null-check it.
- Arcade data layers can flip from time-aware to non-time-aware; both `widget.tsx` and `setting.tsx`
  detect `getDataSourceJson().arcadeScript && !supportTime()` and remove the DS from state / useDataSources.
- Equal start/end time renders the placeholder instead of the ruler (guarded in the runtime return).
- Honored-map path returns `null` settings when the WebMap has no `timeSlider.properties`, surfaced as
  `noTlFromHonoredMapWarning`.
- UNVERIFIED: the final `render()` JSX of `setting/setting.tsx` (past ~line 560, the options section
  tail + SidePopper wiring) and the bodies of `time-panel.tsx`, `input-range.tsx`, `time-span.tsx`,
  and the tick-geometry math in `runtime/components/utils.ts` were not read line-by-line. Inspect
  those files directly before relying on exact prop names in the custom time-config UI.

## Useful snippets and functions

Source: `src/runtime/widget.tsx`
```tsx
// Two mutually-exclusive source modes; map ids are dropped in data mode.
const useMapWidgetIds = addSourceByData ? null : _useMapWidgetIds

React.useEffect(() => {
  setWidth(isOffPanel ? WIDGET_WIDTH : widgetRef.current?.clientWidth)
  loadArcGISJSAPIModules(['esri/core/reactiveUtils']).then(modules => {
    setReactiveUtils(modules[0])
  })
  return () => {
    onTimeChanged(null, null, true) // clear temporal filter on all layers at unmount
  }
}, [])
```

Source: `src/runtime/widget.tsx`
```tsx
// Push a resolved time extent onto a layer/map-service data source.
const updateLayerQueryParams = (layerDs, queryParams, id) => {
  if (layerDs.type === DataSourceTypes.MapService) {
    layerDs = layerDs as MapServiceDataSource
    if (layerDs.supportTime?.()) {
      queryParams = getTimeOffsetQueryParams(layerDs, queryParams)
      layerDs.changeTimeExtent?.(queryParams.time, id)
    }
  } else if (isSingleLayer(layerDs.type)) {
    if (layerDs.supportTime?.()) {
      queryParams = getTimeOffsetQueryParams(layerDs, queryParams)
      layerDs.updateQueryParams?.(queryParams, id)
    }
  }
}
```

Source: `src/runtime/widget.tsx`
```tsx
// Only keep time-aware layer views from the active JimuMapView.
const getAllJimuLayerViews = async (jimuMapViewId: string) => {
  const jimuMapView = MapViewManager.getInstance().getJimuMapViewById(jimuMapViewId)
  const jimuLayerViews = await jimuMapView.whenAllJimuLayerViewLoaded()
  const supportedLayerViews = {}
  Object.keys(jimuLayerViews).forEach(id => {
    if (jimuLayerViews[id].layer.type !== 'sublayer' && jimuLayerViews[id].supportTime()) {
      supportedLayerViews[id] = jimuLayerViews[id]
    }
  })
  return supportedLayerViews
}
```

Source: `src/utils/utils.ts`
```ts
// Enumerate supported time-aware child layers of a WebMap/WebScene.
export function getInsideLayersFromWebmapOrWebScene (dataSources, layerList) {
  let layers = null
  const mapDs = Object.keys(dataSources).map(dsId => dataSources[dsId] as MapDataSource)[0]
  if (isWebMapOrWebScene(mapDs?.type)) {
    const fLayers = []
    mapDs.getAllChildDataSources().forEach(layer => {
      if ((
        layer.type === DataSourceTypes.MapService ||
        layer.type === DataSourceTypes.SubtypeGroupLayer ||
        layer.type === DataSourceTypes.ImageryLayer ||
        layer.type === DataSourceTypes.ImageryTileLayer ||
        (layer.type === DataSourceTypes.FeatureLayer &&
          dataSourceUtils.findMapServiceDataSource(layer as FeatureLayerDataSource) === null) ||
        layer.type === DataSourceTypes.SceneLayer
      ) && (layer as any).supportTime()) {
        fLayers.push(layer)
      }
    })
    const layerListIds = layerList?.map(layer => layer.dataSourceId) || []
    layers = {}
    fLayers.forEach(layer => {
      if (layerListIds.length === 0 || layerListIds.includes(layer.id)) {
        layers[layer.id] = layer
      }
    })
  }
  return layers
}
```

Source: `src/utils/utils.ts`
```ts
// Timezone offset conversion driven by appConfig.attributes.timezone.
export function getTimeExtentByTzOffset (startTime, endTime, withOffset = false) {
  let timezone
  if (window.jimuConfig.isBuilder) {
    timezone = getAppStore().getState().appStateInBuilder.appConfig.attributes.timezone
  } else {
    timezone = getAppStore().getState().appConfig.attributes.timezone
  }
  if (timezone?.type === TimezoneConfig.Specific) {
    const tzOffset = dataSourceUtils.getTimeZoneOffsetByName(timezone.value)
    const localTzOffset = dataSourceUtils.getLocalTimeOffset()
    if (withOffset) {
      startTime = startTime - localTzOffset + tzOffset
      endTime = endTime - localTzOffset + tzOffset
    } else {
      startTime = startTime + localTzOffset - tzOffset
      endTime = endTime + localTzOffset - tzOffset
    }
  }
  return { startTime, endTime }
}
```

Source: `src/utils/utils.ts`
```ts
// Read a WebMap's saved time-slider config (honor mode).
export function getTimeSettingsFromHonoredWebMap (dataSources, isRuntime = false): timeSettings {
  const webMap = dataSources[Object.keys(dataSources)
    .filter(id => isWebMapOrWebScene(dataSources[id].type))[0]]
  const props = (webMap as MapServiceDataSource)?.getItemData()?.widgets?.timeSlider?.properties
  // ...maps thumbMovingRate->speed, timeStopInterval/numberOfStops->accuracy/step,
  //    thumbCount+currentTimeExtent->display strategy...
}
```

Source: `src/runtime/components/timeline-ds.tsx`
```tsx
// Thin DataSourceComponent wrapper reporting status back to the widget.
export default class TimelineDataSource extends React.PureComponent<DataSourceProps> {
  componentWillUnmount () {
    this.props.onCreateDataSourceCreatedOrFailed(this.props.useDataSource.dataSourceId, null, true)
    this.props.onIsDataSourceNotReady(this.props.useDataSource.dataSourceId, DataSourceStatus.NotReady)
  }
  render () {
    return (
      <DataSourceComponent
        useDataSource={this.props.useDataSource}
        onDataSourceCreated={this.onDataSourceCreated}
        onCreateDataSourceFailed={this.onCreateDataSourceFailed}
        onDataSourceInfoChange={this.onDataSourceInfoChange}
      />
    )
  }
}
```

Source: `src/version-manager.ts`
```ts
class VersionManager extends BaseVersionManager {
  versions = [{
    version: '1.11.0',
    upgrader: (oldConfig) => { /* round stepLength.val or dividedCount */ }
  }, {
    version: '1.12.0',
    upgrader: (oldConfig) => {
      let newConfig = oldConfig.without('speed')
      if (!newConfig.honorTimeSettings && newConfig.timeSettings) {
        newConfig = newConfig.setIn(['timeSettings', 'speed'], TimeSpeed.Medium)
      }
      return newConfig
    }
  }]
}
export const versionManager: BaseVersionManager = new VersionManager()
```
