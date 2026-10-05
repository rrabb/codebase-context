# OTB Widget: arcgis/fly-controller

Online widget doc: https://developers.arcgis.com/experience-builder/guide/fly-controller-widget/

## Purpose

The Fly Controller widget flies the camera of a 3D SceneView along user-defined
motions: rotating around a point (or the map center), following a drawn/selected
path (smoothed curve or real line), or replaying a pre-planned route made of
recorded camera positions. It binds to a Map widget, requires a 3D scene, and
provides two runtime skins (a horizontal "bar" and a compact "palette"). Speed,
tilt, altitude, direction, and playback (play/pause/progress) are exposed in the
runtime UI; routes and records are authored in the Settings panel.

Note: the manifest `description` reads "This is the widget used in developer
guide" and `author` is "Esri R&D Center Beijing" (see manifest.json). Despite the
generic description, this is a full-featured, shipped OTB widget.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/fly-controller/`
(gitignored dist; read with includeIgnoredFiles).

- `manifest.json`
- `src/config.ts`
- `src/common/constraints.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/interactive-panel.tsx`
- `src/runtime/components/route-menu.tsx`
- `src/runtime/components/error-tips-manager.ts`
- `src/runtime/skins/bar/layout.tsx`
- `src/runtime/skins/palette/layout.tsx`
- `src/common/utils/gl-camera-utils.ts`
- `src/common/utils/utils.ts` (webgl coord transforms, partial)
- `src/common/graphics/graphics-info.ts`
- `src/common/graphics/default-symbols.ts`
- `src/common/fly-facade/fly-manager.ts`
- `src/common/fly-facade/controllers/base-fly-controller.ts`
- `src/common/fly-facade/controllers/rotating-fly-controller.ts` (partial)
- `src/tools/app-config-operations.ts`
- `src/tools/builder-operations.ts`
- `src/setting/setting.tsx`

Not fully read (existence confirmed via file listing, contents UNVERIFIED):
`src/common/components/graphic-interaction-manager.tsx` and its `helpers/`
(draw-helper, pick-helper, highlight-helper, popup-helper, draw-layers-group);
the other controllers (curve/line/around-map-center/trackball), `common/animate`,
`common/path/*` (bspline, catmull-rom, douglas-peucker, real-path), `plan-routes`
(routes.ts, record/record.ts), `fly-facade/helpers/*`, `version-manager.ts`, and
the individual setting subcomponents under `src/setting/components/**`.

## Architecture overview

Three layers:

1. Runtime shell `Widget` (`src/runtime/widget.tsx`) - binds the Map widget via
   `JimuMapViewComponent`, validates that the active view is a 3D scene, shows a
   `WidgetPlaceholder` + `Tooltip` error state otherwise, and otherwise renders
   `InteractivePanel`.
2. `InteractivePanel` (`src/runtime/components/interactive-panel.tsx`) - the UI
   controller and state machine. It owns a `FlyManager`, a
   `GraphicInteractionManager` (draw/pick/highlight), the play/pause/progress
   state, live-view tilt/altitude/speed sliders, and chooses which skin
   (`BarLayout` or `PaletteLayout`) to render.
3. `fly-facade` (`src/common/fly-facade/*`) - non-React flight engine.
   `FlyManager` owns the item list (Rotate/Path/Route), builds temporary records,
   and delegates the actual camera animation to per-mode controllers created via
   a controller factory. `BaseFlyController` loads the ArcGIS gl-matrix + webgl
   modules and drives the SceneView camera.

Fly modes (`FlyItemMode` in `src/config.ts`): `Rotate`, `Path`, `Route`.
Rotate has a `targetMode` of `Point` or `MapCenter` (`RotateTargetMode`); Path
has `style` `Smoothed` (CURVED) or `RealPath` (LINE). Controller modes
(`ControllerMode` in `base-fly-controller.ts`): `Rotate`, `Smoothed`, `RealPath`,
`AroundMapCenter`.

Skins are selected by `PanelLayout` (`Horizontal` = Bar, `Palette`; `Vertical`
is declared in the enum but the two rendered skins are Bar and Palette).

## Key imports and packages

Grouped by source file.

`src/runtime/widget.tsx`
- `jimu-core`: `React`, `jsx`, `AllWidgetProps`, `appActions`, `IMState`.
- `jimu-ui`: `WidgetPlaceholder`, `Tooltip`.
- `jimu-arcgis`: `JimuMapViewComponent`, `JimuMapView`, `JimuMapViewGroup`.
- local: `IMConfig`/`PanelLayout` from `../config`, `ErrorTipsManager`,
  `InteractivePanel`, `versionManager`, `Constraints`.

`src/runtime/components/interactive-panel.tsx`
- `jimu-core`: `React`, `jsx`, `IntlShape`, `IMThemeVariables`, `getAppStore`,
  `appActions`, `ImmutableArray`.
- `jimu-ui`: `Button`, `Slider`, `Dropdown`, `DropdownButton`, `DropdownMenu`,
  `DropdownItem`, `defaultMessages as jimuUiNls`, `NumericInput`, `Progress`.
- `jimu-arcgis`: `JimuMapView`, `JimuMapViewGroup`.
- `jimu-icons/outlined/*`: `SettingOutlined`, `PlayOutlined`, `PauseOutlined`,
  `RoutePointOutlined`, `AlongPathOutlined`, `RouteOutlined`.
- Uses `__esri.Graphic`, `__esri.SceneView`, `__esri.Camera` types.

`src/common/fly-facade/fly-manager.ts`
- `jimu-arcgis`: `JimuMapView`, `JimuMapViewGroup` (types).
- Uses `__esri.SceneView`, `__esri.Camera`, `__esri.Graphic`.

`src/common/fly-facade/controllers/base-fly-controller.ts`
- `jimu-arcgis`: `loadArcGISJSAPIModules` (loads the ArcGIS AMD modules).
- ArcGIS modules loaded: `esri/core/libs/gl-matrix-2/{vec3f64,mat4f64,vec3,mat4,
  quatf64,quat}`, `esri/views/3d/webgl`, `esri/geometry/Point`,
  `esri/views/3d/support/mathUtils`, `esri/core/reactiveUtils`, `esri/Camera`.

`src/common/utils/utils.ts`
- `import * as arcgisWebgl from 'esri/views/3d/webgl'` - direct alias import of
  the SDK module; uses `arcgisWebgl.toRenderCoordinates` /
  `arcgisWebgl.fromRenderCoordinates` (geographic <-> render/webgl coordinate
  transforms).
- `jimu-core`: `lodash`.

`src/common/utils/gl-camera-utils.ts`
- No imports; operates on `sceneView.state.camera`. Header comments note a 4.30
  API upgrade and that `esri/views/3d/webgl-engine/lib/Camera` and
  `esri/views/3d/webgl/RenderNode` were the previous approach (now commented out).

`src/common/graphics/default-symbols.ts`
- `jimu-arcgis`: `loadArcGISJSAPIModules` (loads
  `esri/symbols/support/jsonUtils`). Uses `__esri.symbolsSupportJsonUtils`,
  `__esri.PointSymbol3D`.

`src/tools/app-config-operations.ts`
- `jimu-core`: `ImmutableObject`, `DuplicateContext`, `extensionSpec`,
  `IMAppConfig`.
- `jimu-arcgis`: `mapViewUtils` (uses `mapViewUtils.getCopiedJimuMapViewId`).

`src/tools/builder-operations.ts`
- `jimu-core`: `extensionSpec`, `IMAppConfig`.
- `jimu-ui`: `defaultMessages as jimuUiNls`.

`src/setting/setting.tsx`
- `jimu-core`: `React`, `jsx`, `Immutable`, `ImmutableObject`, `IMState`,
  `IMAppConfig`, `LayoutInfo`, `IMThemeVariables`, `getAppStore`, `appActions`.
- `jimu-arcgis`: `JimuMapView`, `JimuMapViewComponent`, `JimuMapViewGroup`.
- `jimu-for-builder`: `getAppConfigAction`, `AllWidgetSettingProps`.
- `jimu-ui/advanced/setting-components`: `MapWidgetSelector`, `SettingSection`,
  `SettingRow`.
- `jimu-ui`: `Radio`, `Label`, `Loading`, `LoadingType`.
- `jimu-ui/basic/list-tree`: `TreeItemType`, `TreeItemsType`.

## Reusable patterns found

- SceneView camera fly: a non-React facade (`FlyManager` + `BaseFlyController`
  subclasses) drives `sceneView` camera animation, decoupled from the React UI.
- WebGL / render-coordinate transforms: `esri/views/3d/webgl`
  `toRenderCoordinates` / `fromRenderCoordinates` to move between geographic and
  render space, plus `apiWebGLUtils.fromRenderCamera` / `toRenderCamera` to
  convert between a `__esri.Camera` and a GL camera. gl-matrix modules
  (`vec3`, `mat4`, `quat`, and their `f64` variants) are loaded for the math.
- Multiple skins: one `InteractivePanel` feeds identical `React.ReactElement`
  slots (fly-style selector, graphic interaction manager, live-view settings,
  play button, progress bar, speed controller, route list) into two layout
  components (`BarLayout`, `PaletteLayout`) chosen by `PanelLayout`.
- Extension registration: two manifest extensions,
  `appConfigOperations` (APP_CONFIG_OPERATIONS) and
  `builderOperations` (BUILDER_OPERATIONS). App-config-operations remaps
  `mapViewId` on route records after a page copy; builder-operations exposes
  route/record `displayName` strings to the translation system.
- Flight graphics: `GraphicsInfo` wraps `__esri.Graphic[]` and strips symbols on
  serialize (`_graphic.symbol = null`) to reduce stored config size;
  `DefaultSymbols` rebuilds symbols from JSON at runtime (`SymbolTypes.Default`
  vs `Custom`).
- Auto-control map arbitration: publishes `appActions.requestAutoControlMapWidget`
  before flying so only one widget drives the map camera at a time; pauses when
  another widget takes control or on print preview.
- Immutable config editing in Settings via `.asMutable({ deep: true })`,
  `Immutable(...)`, `.set(...)`, `.setIn(...)`, and `onSettingChange`.

## Builder vs runtime split

Runtime (`src/runtime/**`):
- `widget.tsx` validates 3D scene, renders placeholder-or-panel.
- `InteractivePanel` runs the live fly UI with a non-builder `FlyManager`
  (`isBuilderSettingFlag: false`).

Builder / Settings (`src/setting/**`):
- `Setting` (`setting.tsx`) uses `AllWidgetSettingProps<IMConfig>` plus
  `mapExtraStateProps` to read `appConfig`, `layoutInfo`, `autoControlWidgetId`,
  and `settingPanelChange` from `IMState` (`state.appStateInBuilder`).
- `MapWidgetSelector` binds the map; `onSettingChange` persists config; page
  navigation is driven by a `PageMode` enum (Common list, RouteDetails,
  RecordLoading, RecordDetails) and `NewFeatureMode` (Empty/Point/Path/Pick).
- Uses its own `FlyManager` (builder flag), `GraphicInteractionManager`, and a
  `MapPopper` for on-map drawing/picking during authoring.
- Layout selection forces `inControllerUx` to `'offPanel'` via
  `getAppConfigAction().editWidgetProperty(...)` when the layout changes
  (comment "both skin in Fly should be off panel, #21271").

Tools (`src/tools/**`) run in the builder/app-config context, not the runtime UI.

## Lifecycle and cleanup

`Widget` (`src/runtime/widget.tsx`):
- `componentDidMount` dispatches `appActions.widgetStatePropChange(id,
  'layoutInfo', { layoutId, layoutItemId })`.
- `componentDidUpdate` re-runs `errorTipsManager.checkErrorInConfig()` while in
  an error state.
- `handleActiveViewChange` sets an error and clears the view when the active view
  is null or `type === '2d'`; a `componentWillUnmount` exists but its body is
  commented out at this layer.

`InteractivePanel`:
- `componentDidMount` calls `_reset(jimuMapView)` which wires UI/fly callbacks and
  builds a `FlyManager` (`_resetFlyManager`).
- `componentDidUpdate` reacts to config change (`_resetFlyManager` +
  `handleClearBtnClick`), map change (updates the JimuMapView on the existing
  manager or rebuilds it, resets terrain-loaded flag), view-group change, auto-
  control-widget change (pause), and print preview (pause).
- `componentWillUnmount` calls `resetDefaultUI({ isCleanGraphics: true })` and
  `this.flyManager?.destructor()`.

`FlyManager` (`src/common/fly-facade/fly-manager.ts`):
- Constructor calls `this.stop()` first, wires callbacks, updates view group and
  JimuMapView, builds the item list.
- `updateJimuMapView` caches `sceneView = jimuMapView.view as __esri.SceneView`
  and re-arms a `TerrainLoadingHelper`.
- `destructor()` calls `stop()`. `unRegisterItem()` calls
  `activatedItem.routes.destructor()`.

`BaseFlyController` loads all ArcGIS modules in `setup()` via
`loadArcGISJSAPIModules(...)` then `clear()`s before configuring; controllers
hold `eventHandlers: __esri.Handle[]` and an `AbortSignalHandler` for teardown.

## Manifest/config requirements

From `manifest.json`:
- `type: "widget"`, `dependency: ["jimu-arcgis"]`, `settingDependency:
  "jimu-arcgis"`.
- `version` / `exbVersion`: `1.20.0`.
- `properties.hasSettingPage: true`, `properties.defaultInControllerUx:
  "offPanel"`.
- `defaultSize`: `{ width: 262, height: 44, autoWidth: true, autoHeight: true }`
  (matches `Constraints.ControllerStyleSize[PanelLayout.Horizontal]`).
- `extensions`: `appConfigOperations` -> `tools/app-config-operations`;
  `builderOperations` -> `tools/builder-operations`.
- Broad `translatedLocales` list.

`Config` (`src/config.ts`):
```
interface Config {
  itemsList: ItemsType[] // (RotateItemConfig | PathItemConfig | RouteItemConfig)
  layout: PanelLayout
}
```
`useMapWidgetIds` is a standard widget prop (the commented-out field in Config
shows it is intentionally not stored inside `config`). Map binding uses the
normal `useMapWidgetIds[0]` path.

## Gotchas

- 3D only: a 2D view (`view.type === '2d'`) or missing view triggers the
  `Choose3DMap` error and the widget renders only a placeholder. `ErrorTypes`
  are `Choose3DMap` and `ConfigError`; `isError()` also returns true when no
  enabled fly item exists (`getEnabledItemNum(...) < 1`).
- Direct SDK alias import: `utils.ts` does `import * as arcgisWebgl from
  'esri/views/3d/webgl'`. That relies on the `esri/*` alias being resolvable at
  build time; most other SDK access here goes through
  `loadArcGISJSAPIModules(...)`.
- API-version sensitivity: `gl-camera-utils.ts` comments call out a 4.30 API
  upgrade and reference an issue about `RenderNode`; camera acquisition now uses
  `sceneView.state.camera.clone()`. UNVERIFIED whether older SDK versions behave
  identically (`src/common/utils/gl-camera-utils.ts`).
- Possible bug in `getGLCamera`: it assigns `glCamera` from `camera.set('eye',
  ...)` but then overwrites it with `camera.set('center', ...)` and `camera.set(
  'up', ...)`; because `camera.set` mutates and returns the same camera the
  result is still correct, but the intermediate `glCamera` assignments look
  redundant (`src/common/utils/gl-camera-utils.ts`).
- Auto-control coordination: flying dispatches
  `appActions.requestAutoControlMapWidget(useMapWidgetIds[0], widgetId)`;
  another widget grabbing control or entering print preview pauses playback.
  Missing this handshake would let multiple widgets fight over the camera.
- Symbols are stripped on serialize (`GraphicsInfo.getConfig` sets `symbol =
  null`) and rebuilt from `DefaultSymbols`; a graphic saved without matching
  default-symbol logic would render without a symbol.
- `PanelLayout.Vertical` exists in the enum but only Bar (Horizontal) and Palette
  skins are rendered here; `Constraints.ControllerStyleSize` only defines
  Horizontal and Palette sizes.
- App-config-operations only remaps records when `contentMap` (a
  `DuplicateContext`) is present; a straight copy without page duplication
  returns `destAppConfig` unchanged.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - map binding + 3D-scene validation
```tsx
handleActiveViewChange = (jimuMapView: JimuMapView): void => {
  if (jimuMapView === null || undefined === jimuMapView) {
    this.errorTipsManager.setErrorByType(ErrorTypes.Choose3DMap)
    this.setState({ jimuMapView: null })
    return // skip null
  }
  if (jimuMapView.view.type === '2d') {
    this.errorTipsManager.setErrorByType(ErrorTypes.Choose3DMap)
    this.setState({ jimuMapView: null })
    return // skip 2D
  }
  this.errorTipsManager.setError('') // ok, so clean error tip
  this.setState({ jimuMapView: jimuMapView }) // 3d scene
}
```

Source: `src/runtime/widget.tsx` - map extra state props (auto-control + print)
```tsx
static mapExtraStateProps = (state: IMState, props: AllWidgetProps<IMConfig>): ExtraStateProps => {
  const { useMapWidgetIds } = props
  const mapWidgetId = useMapWidgetIds && useMapWidgetIds.length !== 0 ? useMapWidgetIds[0] : undefined
  const mapWidgetsInfo = state && state.mapWidgetsInfo
  const isPrintPreview = state?.appRuntimeInfo?.isPrintPreview ?? false
  return {
    autoControlWidgetId: mapWidgetId ? mapWidgetsInfo[mapWidgetId]?.autoControlWidgetId : undefined,
    isPrintPreview: isPrintPreview
  }
}
```

Source: `src/common/utils/utils.ts` - geographic <-> render (webgl) coordinates
```ts
import * as arcgisWebgl from 'esri/views/3d/webgl'

export function geoCoordToRenderCoord (inCood: number[] | Float32Array, num: number, sceneView: __esri.SceneView): number[] {
  const transNum = isDefined(num) ? num : 1
  const renderCoordinates = []
  arcgisWebgl.toRenderCoordinates(sceneView, inCood, 0,
    null, // null: means follow this.scene.sp
    renderCoordinates, 0, transNum)
  return renderCoordinates
}

export function renderCoordToGeoCoord (varCood: number[] | Float32Array, num: number, sceneView: __esri.SceneView): number[] {
  const transNum = isDefined(num) ? num : 1
  const outGeographicCoordinates = []
  arcgisWebgl.fromRenderCoordinates(sceneView, varCood, 0, outGeographicCoordinates, 0,
    null,
    transNum)
  return outGeographicCoordinates
}
```

Source: `src/common/utils/gl-camera-utils.ts` - build a GL camera from a SceneView
```ts
// update for 4.30 API upgrade
// cameraParams: eye Pos, center Pos, up-direction
export function getGLCamera (sceneView, cameraParams: { eye, center, up }) {
  const camera = sceneView.state.camera.clone()
  let glCamera = camera.set('eye', cameraParams.eye)
  glCamera = camera.set('center', cameraParams.center)
  glCamera = camera.set('up', cameraParams.up)
  return glCamera
}
```

Source: `src/common/fly-facade/controllers/base-fly-controller.ts` - loading the
ArcGIS gl-matrix + webgl + camera modules
```ts
await loadArcGISJSAPIModules([
  'esri/core/libs/gl-matrix-2/vec3f64',
  'esri/core/libs/gl-matrix-2/mat4f64',
  'esri/core/libs/gl-matrix-2/vec3',
  'esri/core/libs/gl-matrix-2/mat4',
  'esri/core/libs/gl-matrix-2/quatf64',
  'esri/core/libs/gl-matrix-2/quat',
  'esri/views/3d/webgl',
  'esri/geometry/Point',
  'esri/views/3d/support/mathUtils',
  'esri/core/reactiveUtils',
  'esri/Camera'
]).then(async (modules) => {
  [
    this.libVec3f64, this.libMat4f64, this.libVec3, this.libMat4, this.libQuatf64, this.libQuat,
    this.apiWebGLUtils,
    this.Point, this.esriMathUtils, this.reactiveUtils, this.Camera
  ] = modules
  this.vec3 = this.libVec3.vec3; this.vec3d = this.libVec3f64.vec3f64
  this.mat4 = this.libMat4.mat4; this.mat4d = this.libMat4f64.mat4f64
  this.quat = this.libQuat.quat; this.quatd = this.libQuatf64.quatf64
  // ...
})
```

Source: `src/common/fly-facade/controllers/rotating-fly-controller.ts` - GL camera
back to an `__esri.Camera` (fromRenderCamera) and jsonify
```ts
const glCamera = getGLCamera(this.sceneView, {
  eye: this._cache.cameraGL.pos,
  center: this._cache.lookAtTargetGL.pos,
  up: this._cache.cameraGL.upDir
})
this.cameraInfo = this.apiWebGLUtils.fromRenderCamera(this.sceneView, glCamera)
this.cameraInfo = this.cameraInfo.toJSON() // jsonify
```

Source: `src/common/graphics/graphics-info.ts` - strip symbols to shrink stored config
```ts
getConfig (): GraphicsInfoConfig {
  const graphicsInfoConfig = {
    graphics: null,
    isPicked: this.isPicked,
    symbolType: SymbolTypes.Default
  }
  graphicsInfoConfig.graphics = this.graphics?.map((g) => {
    const _graphic = g.clone()
    _graphic.symbol = null // g.delete('symbol')
    if (_graphic.toJSON) {
      return _graphic.toJSON()
    }
    return undefined
  })
  return graphicsInfoConfig
}
```

Source: `src/common/graphics/default-symbols.ts` - rebuild a 3D point symbol from JSON
```ts
getDefaultPointSymbol = (color): __esri.PointSymbol3D => {
  const pt = this.symbolJsonUtils.fromJSON({
    type: 'PointSymbol3D',
    symbolLayers: [{
      type: 'Icon',
      material: { color: color },
      size: 12,
      outline: { color: [255, 255, 255], size: 0.75 }
    }],
    verticalOffset: { screenLength: 5, minWorldLength: 5, maxWorldLength: 10 },
    callout: { type: 'line', color: [255, 255, 255], size: 2, border: { color: [50, 50, 50] } }
  }) as __esri.PointSymbol3D
  return pt
}
```

Source: `src/runtime/components/interactive-panel.tsx` - publish auto-control before flying
```tsx
handleAutoControlMapPublish = (): void => {
  getAppStore().dispatch(appActions.requestAutoControlMapWidget(this.props.useMapWidgetIds[0], this.props.widgetId))
}
```

Source: `src/tools/app-config-operations.ts` - remap record mapViewId on page copy
```ts
const newRecords = route.records.map((record: ImmutableObject<RecordConfig>) => {
  const newJimuMapViewId = mapViewUtils.getCopiedJimuMapViewId(contentMap, record.mapViewId)
  return record.setIn(['mapViewId'], newJimuMapViewId)
})
return route.setIn(['records'], newRecords)
```

Source: `src/tools/builder-operations.ts` - expose route/record displayName to translation
```ts
keys.push({
  keyType: 'value',
  key: `widgets.${this.widgetId}.config.itemsList[${res.routeConfigIdx}].routes[${routeIdx}].displayName`,
  label: { key: 'routeLabel', enLabel: intl.routeLabel },
  valueType: 'text'
})
```

Source: `src/common/constraints.ts` - runtime size + value constraints
```ts
export const Constraints = {
  ControllerStyleSize: {
    [PanelLayout.Horizontal]: { w: 262, h: 44 },
    [PanelLayout.Palette]: { w: 146, h: 94 }
  },
  SPEED: { MIN: 0, MAX: 1, MULTIPLIER: 8, DECIMAL: 3, DEFAULT_SPEED: 50 },
  ALT: { MIN: 0, MAX: 800, STEP: 10 },
  TILT: { MIN: 0, MAX: 90, STEP: 1 },
  TIME: { MIN: 0 },
  CALCULATED_VALUE_ROUNDED: { ANGLE: 0, ELEV: 1, TIME: 1 }
}
```
