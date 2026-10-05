# OTB Widget: arcgis/arcgis-map

Online widget doc: https://developers.arcgis.com/experience-builder/guide/map-widget/

## Purpose
The Map widget is the primary map host in Experience Builder. It creates and owns the ArcGIS Maps SDK view (`esri/views/MapView` for a WebMap, `esri/views/SceneView` for a WebScene), wraps every view in a `JimuMapView`, and registers those views with the global `MapViewManager` so all other widgets (Legend, Search, Table, etc.) can bind to them. On top of the raw view it layers: an embedded map-tool framework (zoom, home, search, layers, basemap, measure, select, scalebar, locate, overview map, full screen and more), an embedded layout host so other widgets can be dropped onto the map, six message actions and six data actions, URL-parameter driven map state, multi-source map switching, custom in-map tool layout, and a large settings surface. `canCreateMapView: true` in the manifest is what marks this widget as a map producer.

## Source paths inspected
Because the widget is large (about 212 files under `src/`, roughly 78 hand-authored .ts/.tsx modules plus assets and translations), only the highest-value files were read in full; the rest were sampled or skipped.

Inspected in depth:
- `.../arcgis-map/manifest.json`
- `.../arcgis-map/config.json` (baked default config)
- `.../arcgis-map/src/config.ts`
- `.../arcgis-map/src/runtime/widget.tsx` (the main container, ~1300 lines; read constructor, styles, `mapExtraStateProps`, lifecycle, `getInnerContent`, view callbacks, `render`)
- `.../arcgis-map/src/runtime/components/mapbase.tsx` (view creation core, ~3300 lines; read imports, render, view-creation flow, `createJimuMapView`, destroy/cleanup)
- `.../arcgis-map/src/runtime/components/multisourcemap.tsx` (two-map switch + layout host; read imports, `render`, `JimuMapViewComponent` wiring)
- `.../arcgis-map/src/runtime/components/default-map.tsx` (fallback default web map)
- `.../arcgis-map/src/runtime/layout/tool-modules.ts` (tool registry)
- `.../arcgis-map/src/runtime/layout/layout.tsx` (tool layout host - props/skeleton)
- `.../arcgis-map/src/runtime/layout/base/base-tool.tsx` (abstract tool base)
- `.../arcgis-map/src/runtime/tools/zoom.tsx` (sample embedded tool)
- `.../arcgis-map/src/message-actions/pan-to-action.ts` (sample message action)
- `.../arcgis-map/src/data-actions/zoom-to.ts` (sample data action)
- `.../arcgis-map/src/tools/app-config-operations.ts` (APP_CONFIG_OPERATIONS extension)
- `.../arcgis-map/src/runtime/builder-support.tsx` (builderSupportModules export)
- `.../arcgis-map/src/setting/setting.tsx` (settings entry - imports + shape)

Sampled / listed only (contents mostly UNVERIFIED beyond signatures):
- `src/runtime/components/map-thumb.tsx`, `multisourcemap-context.ts`
- `src/runtime/tools/*` (attribution, basemap, compass, extent-navigate, fullscreen, home, layers, locate, mapswitch, measure, navigation, overview-map, placeholder, scalebar, search, select/, selectstate/, clear-action-data, utils.ts) - only `zoom.tsx` + `tool-modules.ts` fully read
- `src/runtime/layout/{base/*, config.ts, custom-layout-json.ts, map-fixed-layout.tsx, mobile-layout-json.ts, pc-layout-json.ts, tool-modules-config.ts}` - only `layout.tsx`, `tool-modules.ts`, `base/base-tool.tsx` read
- `src/message-actions/{add-to-map-action, filter-action, flash-action, show-on-map-action, zoom-to-feature-action}.ts` + their `*-setting.tsx` + `action-utils.ts`, `flash-filter-utils.ts`, `zoom-to-pan-to-utils.ts` - only `pan-to-action.ts` fully read
- `src/data-actions/{add-marker, add-to-map, pan-to, show-on-map, show-popup}.ts` + `*-setting.tsx` - only `zoom-to.ts` fully read
- `src/common/{add-marker-common.ts, show-on-map-common.ts}`
- `src/tools/custom-layout.tsx` (CONTEXT_TOOL extension)
- `src/setting/components/*`, `src/runtime/builder/*`, `src/utils.ts`, `src/version-manager.ts`, `src/runtime/utils.ts`

Skipped entirely:
- `dist/**` (compiled output), `tests/**`, all `translations/*.js`, `assets/**`

## Architecture overview
Layered composition, top to bottom:

1. `runtime/widget.tsx` -> `Widget extends React.PureComponent<MapWidgetProps, State>`. The stateful shell. It never touches the SDK view directly for creation; it manages loading gates (`startLoadModules`, `mapComponentsLoaded` via `loadArcGISMapComponents()`), full-screen mode, resize/breakpoint, data-action list DOM, popup-selected-feature watching, and custom-layout inline editing. It adds a big block of Redux-derived props through the static `mapExtraStateProps`.

2. It renders either `DefaultMap` (no data source configured -> loads the portal default web map via `portalUtils.getDefaultWebMap`) or `MultiSourceMap` (one or more `useDataSources`). Both ultimately render `MultiSourceMap`.

3. `MultiSourceMap` hosts up to two `MapBase` instances (map1 / map2) for the switch/animation feature, plus the two ExB layout hosts: `MapFixedLayout` (widgets dropped on the map) and `MapToolLayout` (the map tools). It also renders a `JimuMapViewComponent` and reports the created `JimuMapViewGroup` back up through `onViewGroupCreate`.

4. `MapBase` is the real workhorse. It uses a `DataSourceComponent` to resolve the WebMap/WebScene data source, lazily loads the SDK modules (`esri/views/MapView` + `esri/WebMap`, or `esri/views/SceneView` + `esri/WebScene`), builds a `MapViewProperties`/`SceneViewProperties` options object (applying config: popup dock, scale range/LODs, URL-hash viewpoint/center/scale/level/rotation), does `new this.MapView(...)` / `new this.SceneView(...)`, then calls `MapViewManager.getInstance().createJimuMapView(...)`. After `view.when()` and `jimuMapView.whenJimuMapViewLoaded()` it fires `onJimuMapViewCreated`.

JimuMapView creation + registration (the important bit for other widgets):
- `MapViewManager.getInstance().createJimuMapView({ mapWidgetId, dataSourceId, view, isEnablePopup, mapViewManager, useUrlHashLayersVisibility })` registers the view.
- `view.dataSourceInfo.jimuMapViewId` is the key; look it up with `mapViewManager.getJimuMapViewById(jimuMapViewId)`.
- Groups: `mapViewManager.getJimuMapViewGroup(mapWidgetId).getAllJimuMapViews()`.
- Destruction: `mapViewManager.destroyJimuMapView(jimuMapViewId)`.

Multisource vs default map:
- Default map path: no `useDataSources[0].dataSourceId` -> `DefaultMap` fetches the portal default web map, then renders `MultiSourceMap` with `isDefaultMap` and a single `MapBase` (dataSourceId null).
- Multisource path: `useDataSources.length >= 1` -> `MultiSourceMap` renders map1/map2 `MapBase` instances keyed to `firstMapDsId` / `secondMapDsId`, and `switchMap()` cross-fades between them (also swaps the active `JimuMapView` and re-syncs viewpoint of the hidden map).

Embedded tools framework:
- `layout/tool-modules.ts` is a name -> class registry: `Zoom, Home, Navigation, Locate, ClearActionData, Compass, Search, Layers, BaseMap, Measure, MapSwitch, FullScreen, ScaleBar, Attribution, Select, SelectState, ExtentNavigate, OverviewMap, Placeholder`.
- Each tool extends `BaseTool<BaseToolProps, S>` (in `layout/base/base-tool.tsx`) which extends `UIComponent`. Tools implement `getTitle()`, `getIcon()`, `getExpandPanel()`, optional `getExtendCssStyle()`, and a static `isAvailable(toolShellProps)` (e.g. ScaleBar hides on SceneView). `MapToolLayout` (`layout/layout.tsx`) arranges them into groups (`Group`) and supports a custom in-map layout.

Message + data actions:
- Message actions (`src/message-actions/*`) extend `AbstractMessageAction`: panTo, zoomToFeature, flash, filter, showOnMap, addToMap. They react to ExB messages (DataRecordSetChange, DataRecordsSelectionChange, DataSourceFilterChange, ExtentChange) and lazily load `esri/Graphic` etc. to manipulate the view.
- Data actions (`src/data-actions/*`) extend `AbstractDataAction`: zoomToFeature, panTo, showOnMap, addToMap, showPopup, addMarker. They gate on `isSupported(dataSets, dataLevel)` and push results through `MutableStoreManager` into the widget's `mutableStateProps`.

Settings:
- `setting/setting.tsx` -> `Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig> & ExtraProps>`. Wires `DataSourceSelector`, `JimuMapViewComponent`, `MapStatesEditor` (initial map state), scale-range / custom-LOD editors, popup dock position, scene quality, tool on/off (`ToolModulesConfig`), scalebar / locate / overview-map sub-settings, and custom-layout placement helpers.

## Key imports and packages

runtime/widget.tsx:
- `jimu-core`: `React, ReactDOM, css, jsx, getAppStore, type AllWidgetProps, SessionManager, type DataRecordSet, TimezoneConfig, AppMode, type IMState, classNames, ReactResizeDetector, MutableStoreManager, type IMUrlParameters, type DataSource, ExBAddedJSAPIProperties, DataSourceManager, AppStateManager, UrlManager, ViewVisibilityContext, loadArcGISMapComponents, PageVisibilityContext, type FeatureDataRecord, appActions`
- `jimu-arcgis`: `type JimuMapViewGroup, type ShowOnMapDatas, type AddToMapDatas, type JimuMapView, type JimuLayerView, DataChangeStatus, loadArcGISJSAPIModules, MapViewManager, type MarkerGroup, type UnparsedMapUrlParams`
- `jimu-layouts/layout-runtime`: `ViewportVisibilityContext`
- `jimu-ui`: `Loading, LoadingType, Icon, DataActionList, DataActionListStyle, Paper`
- `jimu-theme`: `Global`
- `jimu-ui/advanced/lib/map/styles/components/map-common`: `mapCommonStyles`
- local: `type IMConfig` (../config), `MultiSourceMap`, `DefaultMap`, `versionManager`, action value types, translations

runtime/components/mapbase.tsx:
- `jimu-core`: `React, DataSourceManager, ExtentChangeMessage, DataSourceComponent, portalUrlUtils, type SqlQueryParams, type DataSourceJson, getAppStore, MutableStoreManager, type ImmutableObject, type FeatureLayerDataSource, type JSAPILayerMixin, css, jsx, lodash, serviceUrlUtils, observeStore, type ResourceSessions, ServiceManager, type ArcGISSubLayer, type MapDataSource, DataSourceTypes, postMessage, PostMessageType, type WebMapDataSource, type WebSceneDataSource, listenToPostMessage, ListenMessageType, ...` and many message types, `geometryUtils`
- `jimu-arcgis`: `loadArcGISJSAPIModules, MapViewManager, type JimuMapView, zoomToUtils, type DefaultMapInfo, type ZoomToOptions, type MarkerGroup, type UnparsedMapUrlParams`
- `jimu-ui/advanced/map`: `type InitialMapState`
- `jimu-ui`: `defaultMessages, Icon`
- JSAPI modules loaded lazily via `loadArcGISJSAPIModules([...])`: `esri/geometry/Extent, esri/Viewpoint, esri/portal/Portal, esri/portal/PortalItem, esri/Color, esri/geometry/SpatialReference, esri/geometry/Point, esri/core/reactiveUtils` (common set), then `esri/views/MapView + esri/WebMap + esri/Basemap + esri/layers/TileLayer + esri/webmap/InitialViewProperties + esri/geometry/Geometry` (2D) or `esri/views/SceneView + esri/WebScene` (3D). Uses `esri/geometry/support/jsonUtils` and `esri/Graphic` elsewhere.

runtime/components/multisourcemap.tsx:
- `jimu-core`: `React, classNames, MessageManager, type ImmutableArray, Immutable, observeStore, ReactResizeDetector, lodash, getAppStore, appActions, MutableStoreManager, type ExtentChangeMessage, type UseDataSource, WIDGET_PREFIX_FOR_A11Y_SKIP`
- `jimu-arcgis`: `MapViewManager, type JimuMapView, type JimuMapViewGroup, JimuMapViewComponent, type DefaultMapInfo`
- local: `MapBase`, `MapFixedLayout`, `MapToolLayout`, layout jsons/utils

runtime/components/default-map.tsx:
- `jimu-core`: `React, classNames`
- `jimu-arcgis`: `type JimuMapViewGroup, portalUtils, type DefaultMapInfo, type JimuMapView`

runtime/layout/base/base-tool.tsx:
- `jimu-core`: `React, css, jsx, classNames, ReactDOM, ErrorBoundary, ReactResizeDetector, type IntlShape, focusElementInKeyboardMode`
- `jimu-ui`: `Icon, Popper, MobilePanelManager, type ShiftOptions, type FlipOptions`
- local: `UIComponent`, layout/config types, `MultiSourceMapContext`

runtime/tools/zoom.tsx:
- `jimu-core`: `React, css, jsx`
- `jimu-arcgis`: `type JimuMapView`
- `jimu-ui`: `defaultMessages`
- uses SDK web component `HTMLArcgisZoomElement` (map components / calcite-adjacent, from `loadArcGISMapComponents`)

runtime/layout/layout.tsx:
- `jimu-core`: `React, css, jsx, AppMode, type SizeModeLayoutJson, type IntlShape, type IMThemeVariables, getAppStore, classNames`
- `jimu-arcgis`: `type JimuMapView`
- `jimu-ui`: `type Size`

message-actions/pan-to-action.ts:
- `jimu-core`: `AbstractMessageAction, MessageType, type Message, getAppStore, ...message types..., MutableStoreManager, AppMode`
- `jimu-arcgis`: `loadArcGISJSAPIModules` (loads `esri/Graphic`)

data-actions/zoom-to.ts:
- `jimu-core`: `type DataRecordSet, type FeatureDataRecord, type DataSource, type JSAPILayerMixin, type DataRecord, AbstractDataAction, DataSourceStatus, MutableStoreManager, DataLevel`
- `jimu-arcgis`: `loadArcGISJSAPIModules, type ZoomToOptions` (loads `esri/Graphic`)

setting/setting.tsx:
- `jimu-core`: `React, Immutable, type ImmutableObject, type DataSourceJson, type IMState, FormattedMessage, lodash, css, jsx, DataSourceManager, getAppStore, polished, classNames, type UseDataSource, AllDataSourceTypes, type ImmutableArray`
- `jimu-arcgis`: `loadArcGISJSAPIModules, type JimuMapView, JimuMapViewComponent`
- `jimu-ui`: `Alert, Switch, Image, Radio, defaultMessages, Select, Checkbox, Label, Tooltip, CollapsablePanel, Button`
- `jimu-ui/advanced/map`: `type IMJimuMapConfig, MapStatesEditor`
- `jimu-ui/advanced/data-source-selector`: `DataSourceSelector`
- `jimu-ui/basic/color-picker`: `ColorPicker`
- `jimu-ui/advanced/setting-components`: `SettingSection, SettingRow, SidePopper`
- `jimu-for-builder`: `type AllWidgetSettingProps, builderAppSync, helpUtils`
- `jimu-icons/outlined/*`: `InfoOutlined, WidgetMapOutlined, SettingOutlined`

tools/app-config-operations.ts:
- `jimu-core`: `dataSourceUtils, type extensionSpec, type IMAppConfig, type DuplicateContext, type UseDataSource`

## Reusable patterns found
- Map producer flag: `properties.canCreateMapView: true` in the manifest, plus `hasEmbeddedLayout: true`, `coverLayoutBackground: true`, `watchViewportVisibility: true`, `needActiveState: true`. Any widget that creates JimuMapViews must set `canCreateMapView`.
- JimuMapView registration through the singleton `MapViewManager.getInstance()` keyed by `view.dataSourceInfo.jimuMapViewId`; groups are keyed by `mapWidgetId`. Other widgets consume via `JimuMapViewComponent` / `MapViewManager`.
- Deferred first render gate: `startLoadModules` toggled on a `setTimeout(..., 100)` (`startRenderMap`) so the heavy SDK only loads after mount, and `loadArcGISMapComponents()` gates SDK web components.
- Extra Redux props via `static mapExtraStateProps(state, props)` returning a typed `ExtraMapWidgetProps` (appMode, url-hash params, persistent map state, timezone, custom-layout-editing) merged into widget props.
- Lazy JSAPI loading with `loadArcGISJSAPIModules([...])` and caching module refs on `this` (never top-level `import 'esri/...'`); each call site notes that the same list must be mirrored in `getMapBaseRestoreData()`.
- Full-screen with graceful iOS fallback: real Fullscreen API when available, else a `fake-fullscreen-map` CSS class (fixed positioning) for iPhone.
- Embedded tool framework: name -> class registry (`tool-modules.ts`) + abstract `BaseTool` with `getTitle/getIcon/getExpandPanel` and static `isAvailable`; tools that only work in 2D return false from `isAvailable` on SceneView.
- Message vs data actions split into `AbstractMessageAction` / `AbstractDataAction` subclasses, each declared in the manifest with `uri` + optional `settingUri`.
- APP_CONFIG_OPERATIONS extension (`tools/app-config-operations.ts`) implements `afterWidgetCopied` to fix up client-query ownership and message-action linkage when a page/widget is duplicated.

## Builder vs runtime split
- Runtime: `src/runtime/**`, `src/message-actions/*.ts`, `src/data-actions/*.ts`, `src/common/*`, `src/config.ts`, `src/utils.ts`, `src/version-manager.ts`.
- Builder-only settings UI: `src/setting/**`, `*-action-setting.tsx`, `*-setting.tsx` (data-action settings).
- Bridge: `runtime/builder-support.tsx` exports `default { customLayoutUtils, CustomLayoutInteract, getInlineEditingLayoutStyle }`. The comment states these modules are injected into the map runtime as `props.builderSupportModules.widgetModules` only in builder mode (manifest `hasBuilderSupportModule: true`). Runtime reads them via `this.props.builderSupportModules?.widgetModules` and `...builderSupportModules.LayoutEntry` (see `MultiSourceMap` passing `LayoutEntry` into the layout hosts).
- `mapExtraStateProps` distinguishes `isDesignMode` / `isRunAppMode` / `isLiveMode` (via `checkIsLive`) to switch pointer-events and inline editing on/off. Inline custom-layout editing only enables in design mode at non-`xsmall` breakpoints.

## Lifecycle and cleanup
widget.tsx:
- `constructor`: builds warning-icon SVG, sets `mapRootClassName = map-widget-root-<widgetId>`, creates `dataActionListContainer` DOM, calls `loadReactiveUtils()` (loads `esri/core/reactiveUtils`).
- `componentDidMount`: if `window.jimuConfig.isInBuilder` or not a placeholder, call `startRenderMap()`; add `fullscreenchange` / `webkitfullscreenchange` listeners; push persistent map state into `UrlManager`; call `loadArcGISMapComponents()` then set `mapComponentsLoaded`.
- `componentDidUpdate`: propagate `props.state` -> `jimuMapView.setMapWidgetState`; react to `showPopupUponSelection`, `enableDataAction`, `config.layoutIndex`, and `appMode` changes for inline editing / custom-layout toolbar.
- `componentWillUnmount`: remove fullscreen listeners; if the widget was removed from `appConfig.widgets`, clear its `restoreData` in `MutableStoreManager`.

mapbase.tsx (per view):
- `componentDidMount`: create the `.widget-map` container DOM, `loadCommonModules()`, restore cached view if present.
- View creation: `cacheLoadModulesAndCreateMapbaseView` -> `createMapbaseView` -> `new MapView/SceneView` -> `afterCreateView` (wires many `__esri.WatchHandle`s onto the view) -> `createJimuMapView`.
- Cleanup: `destroyMapbaseView(view)` removes `watchInteractingHandle`, `extentWatchHandle`, `watchLodsHandle`, `fatalErrorWatchHandle`, clears `stationaryTimerId`, releases highlight + event handles, calls `MapViewManager.destroyJimuMapView(jimuMapViewId)` and `view.destroy()`. `createJimuMapView` also proactively destroys any stale JimuMapView bound to a different view instance.

## Manifest/config requirements
- `type: widget`, `version/exbVersion 1.20.0`.
- `publishMessages`: `EXTENT_CHANGE`, `DATA_RECORDS_SELECTION_CHANGE`, `LOCATION_CHANGE`.
- `properties`: `canCreateMapView: true`, `hasEmbeddedLayout: true`, `passDataSourceToChildren: false`, `coverLayoutBackground: true`, `watchViewportVisibility: true`, `supportAutoSize: false`, `canConsumeDataAction: true`, `needActiveState: true`, `handleA11yLabelInWidget: true`, `hasBuilderSupportModule: true`.
- `messageActions`: panTo, zoomToFeature, flash, filter, showOnMap, addToMap (each `uri` + most with `settingUri`).
- `dataActions`: zoomToFeature, panTo, showOnMap, addToMap, showPopup, addMarker (with `icon`, some with `settingUri`).
- `excludeDataActions`: `setFilter, arcgis-map.addToMap, dataStatistics, table.addToTable, directions.PlanRoute`.
- `layouts`: one `MapFixedLayout` of `type: FIXED`.
- `urlParameters`: viewpoint, center, scale, level, rotation, layer_visibility, marker.
- `extensions`: `appConfigOperations` (point `APP_CONFIG_OPERATIONS`, uri `tools/app-config-operations`) and `custom-layout` (point `CONTEXT_TOOL`, uri `tools/custom-layout`).
- Baked default `config.json`: `{ "toolConfig": { "canZoom": true, "canHome": true, "canSearch": true, "canNavigation": true }, "isUseCustomMapState": false }`.
- `Config extends JimuMapConfig` (from `jimu-ui/advanced/map`) adding `isUseCustomMapState`, `popupDockPosition`, `sceneQualityMode`, `clientQueryDataSourceIds`, `customLODs`/`scaleRange` (mutually exclusive), `toolOptions`, `preLayoutIndex`, `customLayoutPlacement`.

## Gotchas
- Never `import 'esri/...'` at module top for view classes here; everything is lazy via `loadArcGISJSAPIModules`. If you add a module you must also mirror it into `getMapBaseRestoreData()` (repeated comment in mapbase.tsx), or the cached-restore path breaks.
- `view.dataSourceInfo.jimuMapViewId` is the identity used everywhere; do not assume one map widget == one view. Multisource maps hold two `MapBase`/view instances, and the active view swaps on `switchMap()`.
- `dataSourceId` may be null (default map) - the code coerces to `''` before calling `createJimuMapView`. `isReadyToCreateJimuMapView()` returns true for the default map without a data source but requires `this.mapDs.id === props.dataSourceId` otherwise.
- Two-way extent sync between two map widgets is guarded by `extentChangeRelatedWidgetIds` / `firstPublishExtentChangeTime` on the view; naive extent forwarding can loop.
- SceneView-only vs MapView-only tools: guard with `BaseTool.isAvailable` (ScaleBar hides on SceneView). SceneView also stashes `config.sceneQualityMode` on the view via `view[exbQualityProfileKey]`.
- Popup z-index is heavily CSS-patched for SDK 4.32+ (`contain`, `container-type`, `container-name` resets) and for real vs fake fullscreen - do not strip those global styles.
- Pointer-events depend on live/design/custom-layout-editing classes on the root (`map-is-live-mode`, `map-is-design-mode`, `custom-layout-editing`, `not-custom-layout-editing`); tools use `.exbmap-ui*` classes.
- `mapExtraStateProps` caches persistent map state per widget id in a static (`cachedInitPersistentMapStates`) so it never changes after first read.
- URL-hash viewpoint handling sets `constraints.snapToZoom = false` for float zoom coming from a MapViewer viewpoint, unless custom LODs force `snapToZoom = true`.

## Useful snippets and functions

Source: `.../arcgis-map/src/runtime/components/mapbase.tsx` - create the SDK view then register the JimuMapView.
```tsx
// create map view or scene view (options built earlier from config + url params)
let view: MapbaseView = null
if (dataSourceInfo.isWebMap) {
  view = new this.MapView(mapViewOption) as MapbaseView
} else {
  view = new this.SceneView(sceneViewOption) as MapbaseView
  view[exbQualityProfileKey] = config?.sceneQualityMode
}
this.afterCreateView(view, dataSourceInfo, config, initUrlHashMapOptions, isPersistentMapStateUsed)
if (this.view) {
  this.destroyCurrentMapbaseView()
  this.view = null
}
this.view = view
if (this.isReadyToCreateJimuMapView()) {
  this.createJimuMapView()
}
```

Source: `.../arcgis-map/src/runtime/components/mapbase.tsx` - register + resolve a JimuMapView through MapViewManager.
```tsx
const mapViewManager = MapViewManager.getInstance()
const view = this.view
const dataSourceId = this.props.dataSourceId || ''
const useUrlHashLayersVisibility = this.props.baseWidgetProps.isRunAppMode

mapViewManager.createJimuMapView({
  mapWidgetId: this.props.baseWidgetProps.id,
  dataSourceId,
  view,
  isEnablePopup: this.props.baseWidgetProps.config && !this.props.baseWidgetProps.config.disablePopUp,
  mapViewManager,
  useUrlHashLayersVisibility
})

view.when(() => {
  const jimuMapViewId = view.dataSourceInfo.jimuMapViewId
  const jimuMapView = mapViewManager.getJimuMapViewById(jimuMapViewId)
  if (jimuMapView?.view) {
    jimuMapView.whenJimuMapViewLoaded().then(() => {
      if (!jimuMapView.view) {
        mapViewManager.destroyJimuMapView(jimuMapViewId)
        return
      }
      if (this.isViewExpected(view) && this.props.onJimuMapViewCreated) {
        this.props.onJimuMapViewCreated(jimuMapView)
      }
    })
  }
})
```

Source: `.../arcgis-map/src/runtime/widget.tsx` - enumerate all JimuMapViews for this map widget.
```tsx
getJimuMapViews (): JimuMapView[] {
  let jimuMapViews: JimuMapView[] = []
  const jimuMapViewGroup = MapViewManager.getInstance().getJimuMapViewGroup(this.props.id)
  if (jimuMapViewGroup) {
    jimuMapViews = jimuMapViewGroup.getAllJimuMapViews()
  }
  return jimuMapViews
}
```

Source: `.../arcgis-map/src/runtime/widget.tsx` - active-view change wires the popup-selected-feature watcher.
```tsx
onJimuMapViewCreated = (jimuMapView: JimuMapView) => {
  jimuMapView.setMapWidgetState(this.props.state)
  this.setShowPopupUponSelectionForJimuMapView(jimuMapView)
}

onActiveJimuMapViewChange = (jimuMapView: JimuMapView) => {
  this.activeJimuMapView = jimuMapView
  this.watchPopupSelectedFeatureChange()
}
```

Source: `.../arcgis-map/src/runtime/widget.tsx` - the deferred SDK load gate.
```tsx
startRenderMap = () => {
  setTimeout(() => {
    this.setState({ startLoadModules: true })
  }, 100)
}

componentDidMount () {
  if (!this.state.startLoadModules) {
    if (window.jimuConfig.isInBuilder || !this.props.config.canPlaceHolder) {
      this.startRenderMap()
    }
  }
  // ...fullscreen listeners...
  loadArcGISMapComponents().then(() => {
    this.setState({ mapComponentsLoaded: true })
  })
}
```

Source: `.../arcgis-map/src/runtime/layout/tool-modules.ts` - the embedded tool registry.
```ts
const ToolModules: { [ModuleName: string]: new (props: BaseToolProps, ctx?: any) => BaseTool<BaseToolProps, any> } = {
  Zoom, Home, Navigation, Locate, ClearActionData, Compass, Search, Layers, BaseMap,
  Measure, MapSwitch, FullScreen, ScaleBar, Attribution, Select, SelectState,
  ExtentNavigate, OverviewMap, Placeholder
}
export default ToolModules
```

Source: `.../arcgis-map/src/runtime/tools/zoom.tsx` - an embedded tool extending BaseTool.
```tsx
export default class Zoom extends BaseTool<BaseToolProps, unknown> {
  toolName = 'Zoom'
  getTitle () {
    return this.props.intl.formatMessage({ id: 'ZoomLabel', defaultMessage: defaultMessages.ZoomLabel })
  }
  getIcon (): IconType { return null }
  getExpandPanel (): React.JSX.Element {
    return (
      <ZoomInner
        jimuMapView={this.props.jimuMapView}
        mapComponentsLoaded={this.props.mapComponentsLoaded}
        direction={this.props.direction}
      />
    )
  }
}
```

Source: `.../arcgis-map/src/data-actions/zoom-to.ts` - AbstractDataAction gating with dataLevel.
```ts
export default class ZoomTo extends AbstractDataAction {
  async isSupported (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
    const supportedDataSets = this.getSupportedDataSets(dataSets, dataLevel)
    if (supportedDataSets.length === 1) {
      return true
    } else if (supportedDataSets.length >= 2) {
      return dataLevel === DataLevel.Records
    }
    return false
  }
  async onExecute (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
    const [Graphic] = await loadArcGISJSAPIModules(['esri/Graphic']) as [typeof __esri.Graphic]
    const supportedDataSets = this.getSupportedDataSets(dataSets, dataLevel)
    // ...clone features, push zoom-to value via MutableStoreManager...
  }
}
```

Source: `.../arcgis-map/src/message-actions/pan-to-action.ts` - AbstractMessageAction reacting to messages.
```ts
export default class PanToAction extends AbstractMessageAction {
  onExecute (message: Message, actionConfig?: IMConfig): Promise<boolean> | boolean {
    return loadArcGISJSAPIModules(['esri/Graphic']).then(modules => {
      const [Graphic] = modules as [typeof __esri.Graphic]
      switch (message.type) {
        case MessageType.DataRecordSetChange: {
          if (isWidgetSendZoomToActionToAnother(message.widgetId, this.widgetId, MessageType.DataRecordSetChange)) {
            break // avoid conflict when the sender also sends zoomTo
          }
          // ...collect geometries from records, pan the active view...
        }
        // DataRecordsSelectionChange, DataSourceFilterChange, ExtentChange, etc.
      }
      return true
    })
  }
}
```

Source: `.../arcgis-map/src/runtime/builder-support.tsx` - modules injected as props.builderSupportModules.widgetModules in builder mode.
```tsx
import * as customLayoutUtils from './builder/custom-layout-utils'
import CustomLayoutInteract from './builder/custom-layout-interact'
import { getInlineEditingLayoutStyle } from './builder/custom-layout-style'
export default { customLayoutUtils, CustomLayoutInteract, getInlineEditingLayoutStyle }
```
