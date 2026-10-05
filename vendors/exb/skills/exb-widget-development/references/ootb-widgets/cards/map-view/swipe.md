# OTB Widget: arcgis/swipe

Online widget doc: https://developers.arcgis.com/experience-builder/guide/swipe-widget/

## Purpose
The Swipe widget lets an app user compare map content by dragging a divider across the map. It supports three comparison workflows: swiping between layers of one map, swiping between two maps (webmaps or webscenes), and an "advanced" scroll-driven comparison that steps through stacked layers as the user scrolls. It renders a control panel inside the widget (a toggle plus layer lists) and injects a swipe/divider onto the associated Map widget's view. Configuration (style, mode, which layers/maps to compare, slider position, colors) is done in the builder Setting panel; runtime activation is via an in-panel Switch.

The widget only supports 2D map views for the actual swipe/scroll effect. For 3D scene views it shows a "not supported" message (`WebScenePanel`).

## Source paths inspected
Root (gitignored, transpiled `.ts`/`.tsx` source under `dist`):
`ArcGISExperienceBuilder/client/dist/widgets/arcgis/swipe/`
- `manifest.json`
- `src/config.ts`, `src/constants.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/swipe-between-layers.tsx`
- `src/runtime/components/swipe-between-maps.tsx`
- `src/runtime/components/scroll-layers.tsx`
- `src/runtime/panels/swipe-between-layers-panel.tsx`
- `src/runtime/panels/swipe-between-maps-panel.tsx`
- `src/runtime/panels/scroll-layers-panel.tsx`
- `src/runtime/panels/layer-list.tsx`
- `src/runtime/panels/tree-layer-list.tsx`
- `src/runtime/panels/web-scene-panel.tsx`
- `src/runtime/panels/empty-layer-message.tsx` (referenced; not fully read)
- `src/tools/app-config-operations.ts`
- `src/utils/utils.ts`
- `src/setting/setting.tsx` (setting components under `src/setting/components/**` referenced, not fully read)

Ignored per instructions: `dist/`-only build noise beyond source, `tests/`, translation `.js` bundles.

## Architecture overview
Two orthogonal axes drive everything:

1. `swipeStyle` (from `config.ts`): `SIMPLE_HORIZONTAL`, `SIMPLE_VERTICAL`, `ADVANCED_HORIZONTAL`, `ADVANCED_VERTICAL`. "Simple" = draggable swipe divider; "Advanced" = scroll-driven stepping.
2. `swipeMode` (only meaningful for simple styles): `SWIPE_BETWEEN_LAYERS_OF_ONE_MAP` vs `SWIPE_BETWEEN_WEBMAPS_OR_WEBSCENES`.

That yields three runtime engines, each a headless component (`return null`) that manipulates the DOM / JSAPI view directly:

- swipe-between-layers (simple + `SwipeBetweenLayers` mode): uses the native `<arcgis-swipe>` web component (`arcgis-map-components`) with `leadingLayers` / `trailingLayers` on a single active 2D `JimuMapView`. Panel = `SwipeBetweenLayersPanel`.
- swipe-between-maps (simple + `SwipeBetweenMaps` mode): needs exactly 2 map views in one Map widget (`JimuMapViewGroup`). It does NOT use `<arcgis-swipe>`; it builds a custom divider `<div>` and clip-paths the two stacked map DOM nodes (`.multisourcemap-item-appear-noanimate` / `.multisourcemap-item-disappear-noanimate`), driven by interact.js dragging. Panel = `SwipeBetweenMapsPanel`. Works for both webmap and webscene because it only clips DOM.
- scroll-layers (advanced styles): a scroll container overlays the map; scrolling steps through first-map layers, transitions across the two maps, then steps through second-map layers, using multiple `<arcgis-swipe>` elements plus `reactiveUtils.watch` on view size and `requestAnimationFrame` throttling. Panel = `ScrollLayersPanel`.

`widget.tsx` computes a set of boolean "show*" guards from `activeMapView`, `jimuMapViewGroup`, `mapUseDataSources`, `view.type === '2d'|'3d'`, and style/mode, then conditionally renders the matching panel (inside the widget body) and the matching engine (added to `activeMapView.view.ui` / the map container).

## Key imports and packages
Grouped by concern (path = file that imports it):

jimu-core (framework primitives)
- `React, jsx, css, polished, ReactRedux, Immutable, hooks, AppMode, classNames, lodash` and types `AllWidgetProps, IMState, ImmutableArray, IMThemeVariables` - `src/runtime/widget.tsx`
- `getAppStore` (RTL flag) - `swipe-between-layers.tsx`, `swipe-between-maps.tsx`
- `interact` from `jimu-core/dnd` (interact.js) - `swipe-between-maps.tsx`
- `DataSourceManager, JSAPILayerTypes, DataSourceTypes` - `utils/utils.ts`, `swipe-between-maps-panel.tsx`
- `LayoutItemType` - `setting.tsx`

jimu-arcgis (map bridge)
- `JimuMapView, JimuLayerView, JimuMapViewComponent, MapViewManager, JimuMapViewGroup` - `src/runtime/widget.tsx`
- `JimuMapViewGroup` (2-map group + `switchMap`, `hideMapTools`/`showMapTools`) - `swipe-between-maps.tsx`, `scroll-layers.tsx`
- `JimuLayerViews, JimuLayerView` - `utils/utils.ts`, `tree-layer-list.tsx`
- `mapViewUtils` (`getCopiedJimuMapViewId`, `getCopiedJimuLayerViewId`) - `tools/app-config-operations.ts`

jimu-ui / advanced components
- `Icon, WidgetPlaceholder, Switch, Alert, Label, Paper, defaultMessages` - `src/runtime/widget.tsx`
- `CollapsablePanel` - `swipe-between-layers-panel.tsx`, `scroll-layers-panel.tsx`
- `List` from `jimu-ui/basic/list-tree` - `layer-list.tsx`
- `Tree, TreeCollapseStyle, TreeItemActionType, ...` from `jimu-ui/basic/list-tree` - `tree-layer-list.tsx`
- `Loading, LoadingType` - `tree-layer-list.tsx`
- `LinearUnit, DistanceUnits` - `config.ts`, `constants.ts`, components
- Setting: `MapWidgetSelector, SettingRow, SettingSection` (`jimu-ui/advanced/setting-components`), `InputUnit` (`jimu-ui/advanced/style-setting-components`), `ThemeColorPicker` (`jimu-ui/basic/color-picker`) - `setting.tsx`

jimu-for-builder
- `getAppConfigAction, AllWidgetSettingProps` - `setting.tsx` (drives layout auto-height edits and cross-widget map-occupation check)

jimu-layouts / jimu-theme
- `LayoutItemSizeModes, searchUtils` from `jimu-layouts/layout-runtime` - `setting.tsx`
- `Global` from `jimu-theme` (inject global CSS on the map DOM) - `widget.tsx`; `useTheme` - `swipe-between-maps.tsx`; `getTheme2` - `setting.tsx`

ArcGIS Maps SDK (JSAPI, via `esri/*` alias)
- `import 'arcgis-map-components'` (registers the `<arcgis-swipe>` custom element) - `swipe-between-layers.tsx`, `scroll-layers.tsx`
- `type Collection` from `esri/core/Collection`, `type Layer` from `esri/layers/Layer` - `swipe-between-layers.tsx`, `scroll-layers.tsx`
- `import * as reactiveUtils from 'esri/core/reactiveUtils'` - `scroll-layers.tsx`, `scroll-layers-panel.tsx`, `swipe-between-layers-panel.tsx`
- `import Legend from 'esri/widgets/Legend'` - `scroll-layers-panel.tsx`
- `__esri.WatchHandle` type used widely for watch cleanup

## Reusable patterns found
- JimuMapViewComponent + JimuMapViewGroup: `widget.tsx` mounts a single `<JimuMapViewComponent useMapWidgetId=... onActiveViewChange onViewsCreate/>`. `onViewsCreate` grabs the group via `MapViewManager.getInstance().getJimuMapViewGroup(useMapWidgetId)` and records the inactive view; `onActiveMapViewChange` sets the active view and resets the "layer updated" flags. This is the canonical way to react to a multi-view Map widget.
- Two-map compare using the group: `swipe-between-maps.tsx` reads `jimuMapViewGroup.switchMap(true)` to flip active/inactive on click, and `hideMapTools()`/`showMapTools()` to suppress map UI while comparing.
- Tree layer list (`tree-layer-list.tsx`): reusable checkbox tree built on jimu-ui `Tree`, constructs a hierarchy from `jimuMapView.getAllJimuLayerViews()`, honors parent/child selection + indeterminate state, optional per-layer visibility toggle command, and can hide/disable unsupported layer types via injected `hideLayers` predicate. Group layers are unsupported by the swipe API (`isLayersDisabled` returns true for `GroupLayer`).
- Separate builder-selected vs runtime-added layers: panels track config-selected layers AND layers added at runtime (Add Data widget) separately (`runtimeAdded*`, `getRuntimeAddedJimuLayerViews` in `widget.tsx` checks `jimuLayerView.fromRuntime`). Selections are merged (`selected.concat(runtime...)`) before feeding the engine.
- Scene support: rather than special-casing 3D everywhere, the widget renders `WebScenePanel` (a warning message) when `activeMapView.view.type === '3d'` for layer/advanced modes; between-maps mode still works for scenes because it only clips DOM.
- app-config-operations map duplication: `AppConfigOperation.afterWidgetCopied` remaps `swipeMapViewList` / `scrollMapViewList` keys and layer IDs using `mapViewUtils.getCopiedJimuMapViewId` / `getCopiedJimuLayerViewId` so a copied page keeps valid map/layer linkages. Registered via manifest `APP_CONFIG_OPERATIONS` extension.
- Layer visibility watching: panels use `reactiveUtils.watch(() => jimuLayerView.layer.visible, cb)` and keep arrays of `WatchHandle`s in refs, removing them on cleanup.

## Builder vs runtime split
Builder (`src/setting/setting.tsx`):
- `MapWidgetSelector` binds the Map widget (`onMapWidgetSelected` resets `swipeMode` to `SwipeBetweenLayers`).
- Style templates (`SwipeTemplates`) pick `swipeStyle`; radios choose `swipeMode` (between-maps radio disabled unless exactly 2 map data sources: `mapUseDataSources?.length !== 2`).
- Per-mode layer/map pickers: `CustomizeSwipeLayers`, `CustomizeSwipeMaps`, `CustomizeScrollLayers` write `swipeMapViewList` / `scrollMapViewList` / `mapUseDataSourcesOrderList`.
- Style config: `detailsVisibility`, `defaultActivation`, `isAllowDeactivateLayers`, `toggleLayerVisibility`, `sliderPosition` (InputUnit), `dividerColor`/`handleColor` (ThemeColorPicker).
- Side effect: when `detailsVisibility` toggles, it rewrites the widget's layout auto-height via `getAppConfigAction()` + `searchUtils.getLayoutInfosHoldContent` + `LayoutItemSizeModes` and sets `inControllerUx` to `inPanel`/`offPanel`.
- On mount it prunes stale `swipeMapViewList` / `scrollMapViewList` entries whose map views no longer exist and clears `mapUseDataSourcesOrderList` if the map's data sources changed.
- `isMapUnoccupied()` scans all `swipe` widgets in the app config to detect two swipe widgets bound to the same map.

Runtime (`src/runtime/widget.tsx` + components/panels):
- Reads config, subscribes to `useDataSources` from the store, tracks active/inactive views and many "selected layers" arrays, then renders the correct panel + engine. Engines mutate the JSAPI view / map DOM directly and return `null`.

## Lifecycle and cleanup
- swipe-between-layers: an effect creates `<arcgis-swipe>` (`document.createElement('arcgis-swipe')`), sets `leadingLayers`/`trailingLayers`/`direction`/`swipePosition`/`autoDestroyDisabled = true`, assigns `.view`, and `activeMapView.view.ui.add(...)`. Cleanup calls `destroySwipeWidget()` which saves current `swipePosition`, `ui.remove(...)`, then `await swipe.destroy()`. An `isUnmounted` ref guards the async layer-resolution `Promise.all` from acting after unmount.
- swipe-between-maps: multiple effects keyed on `activeMapView`. It disables popups/highlight on both views (recording prior state to restore later), clips the active map DOM, binds interact.js dragging, listens for view `resize`, and registers `addCacheListener`/`addRestoreListener` on the JimuMapView to rebuild DOM refs when the view is cached/restored. Cleanup: `destroySwipeWidget()` removes the divider, `interactable.unset()`, clears clip/opacity styles, removes mousedown/click/wheel listeners, and `restorePopupAndHighlight()` (guarded by `isDestroyed()`).
- scroll-layers: adds scroll/wheel listeners, `reactiveUtils.watch` on view width/height (stored in `WatchHandle` refs), and `requestAnimationFrame` throttling via `ticking` refs. It manages arrays of `<arcgis-swipe>` elements (`swipesFirstRef`, `swipesSecondRef`) and swaps `leadingLayers`/`trailingLayers` to fake infinite scroll; `addRestoreListener` re-applies clip paths after restore.
- widget.tsx: `hideErrorMsgTimer` (setTimeout to auto-hide the "map occupied" Alert after 3s); adds `addJimuLayerViewCreatedListener` / `addJimuLayerViewRemovedListener` on the active view to recompute runtime-added layers, removed in the effect cleanup.

## Manifest/config requirements
`manifest.json`:
- `"dependency": "jimu-arcgis"` (map access).
- `extensions`: `appConfigOperations` at point `APP_CONFIG_OPERATIONS`, uri `tools/app-config-operations` (page-copy layer remapping).
- `properties.coverLayoutBackground: true`; `defaultSize` 350x400.

`config.ts` (`IMConfig`):
- `swipeStyle: SwipeStyle`, `swipeMode: SwipeMode`
- `styleConfig`: `sliderPosition (LinearUnit)`, `dividerColor`, `handleColor`, `isAllowDeactivateLayers`, `defaultActivation`, `detailsVisibility`, `toggleLayerVisibility`
- `mapUseDataSourcesOrderList: string[]` (stable order of the two map data source IDs)
- `swipeMapViewList: { [mapViewId]: { leadingLayersId, trailingLayersId } }` (between-layers)
- `scrollMapViewList: { [mapViewId]: string[] }` (advanced scroll)

`constants.ts`: `DEFAULT_SWIPE_STYLE = SimpleHorizontal`, `DEFAULT_SLIDER_POSITION = { distance: 35, unit: PERCENTAGE }`.

Runtime requires `props.useMapWidgetIds?.[0]`; between-maps needs 2 views + 2 map data sources; layer/scroll effects require `view.type === '2d'`.

## Gotchas
- `<arcgis-swipe>` needs the side-effect import `import 'arcgis-map-components'` and `autoDestroyDisabled = true`, and its `leadingLayers`/`trailingLayers` are typed as JSAPI `Collection<Layer>` but assigned plain arrays with `as unknown as Collection<Layer>`; `.view` is assigned with a `// @ts-expect-error`.
- Between-maps mode does NOT use `<arcgis-swipe>` at all - it hand-builds a divider `<div>` and clip-paths two specific map DOM nodes selected by class (`.multisourcemap-item-appear-noanimate` / `-disappear-noanimate`). These class names and `div[data-widgetid=...] .multi-map-container` are internal contracts; brittle if ExB changes DOM.
- Group layers, subtype-sublayers, and sublayers of MapImage/Tile/WMS/KML layers are unsupported by the swipe API and are disabled/hidden in the tree (`utils.ts` `isLayersDisabled` / `isLayersHidden`).
- Only one swipe can be "on" per map at a time: turning a swipe on programmatically clicks off any other active swipe switch (`querySelector('.swipe-title .checked:not(.<id>)')`) and shows a temporary warning Alert.
- RTL is handled manually: horizontal slider position is mirrored (`100 - distance`) and transforms flip sign; check `getAppStore().getState()?.appContext?.isRTL`.
- Popups/highlights are force-disabled during between-maps compare and must be restored on cleanup; restore is guarded by `isDestroyed()`/`isCached()` to avoid calling into a torn-down JimuMapView.
- Two swipe widgets on the same map is a supported-but-guarded case; builder `isMapUnoccupied()` detects it, runtime shows the "map occupied" message.
- Setting mutates layout auto-height and `inControllerUx` as a side effect of `detailsVisibility`; be careful replicating - it edits app config directly.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - bind the multi-view Map widget and capture the group
```tsx
const onViewsCreate = (views: { [viewId: string]: JimuMapView }) => {
  const jimuMapViewGroup = MapViewManager.getInstance().getJimuMapViewGroup(useMapWidgetId)
  setJimuMapViewGroup(jimuMapViewGroup)
  Object.keys(views).forEach(viewId => {
    const jimuMapView = views[viewId]
    if (!jimuMapView.isActive) {
      setInactiveMapView(jimuMapView)
    }
  })
}
const onActiveMapViewChange = (activeView: JimuMapView) => {
  if (activeView?.view) {
    setActiveMapView(activeView)
    setIsLayerUpdated(false)
    setIsScrollLayerUpdated(false)
  } else {
    setActiveMapView(null)
  }
}
// ...
{useMapWidgetId && <JimuMapViewComponent useMapWidgetId={useMapWidgetId} onActiveViewChange={onActiveMapViewChange} onViewsCreate={onViewsCreate}/>}
```

Source: `src/runtime/widget.tsx` - detect runtime-added layers via `fromRuntime`
```tsx
const getRuntimeAddedJimuLayerViews = (jimuMapView: JimuMapView) => {
  const runtimeLayerList = []
  const mapLayers = jimuMapView?.view?.map?.layers?.toArray()
  mapLayers?.forEach(layer => {
    const jimuLayerView = jimuMapView.getJimuLayerViewByAPILayer(layer)
    if (jimuLayerView?.fromRuntime) {
      runtimeLayerList.push(jimuLayerView.id)
    }
  })
  return runtimeLayerList
}
```

Source: `src/runtime/components/swipe-between-layers.tsx` - create and add the native swipe web component
```tsx
swipeRef.current = document.createElement('arcgis-swipe')
swipeRef.current.classList.add(`exb-swipe-${widgetId}`)
swipeRef.current.leadingLayers = leadingArray as unknown as Collection<Layer>
swipeRef.current.trailingLayers = trailingArray as unknown as Collection<Layer>
swipeRef.current.direction = swipeDirection // 'vertical' | 'horizontal'
swipeRef.current.swipePosition = positionRef.current
swipeRef.current.autoDestroyDisabled = true
// @ts-expect-error
swipeRef.current.view = activeMapView?.view
activeMapView?.view.ui.add(swipeRef.current)
```

Source: `src/runtime/components/swipe-between-layers.tsx` - proper destroy on cleanup
```tsx
async function destroySwipeWidget () {
  if (swipeRef.current) {
    positionRef.current = swipeRef.current.swipePosition
    activeMapView?.view?.ui.remove(swipeRef.current)
    await swipeRef.current.destroy()
    swipeRef.current = null
  }
}
return () => { destroySwipeWidget() }
```

Source: `src/runtime/components/swipe-between-maps.tsx` - clip two stacked maps to create a divider without arcgis-swipe
```tsx
const clipActiveMap = (pos?: Position) => {
  const newPosition = pos || position
  let leadingClipPath = null, trailingClipPath = null
  if (swipeStyle === SwipeStyle.SimpleVertical) {
    leadingClipPath = `inset(0px 0px ${mapViewHeightRef.current - newPosition.y}px 0px)`
    trailingClipPath = `inset(${newPosition.y}px 0px 0px 0px)`
  } else if (swipeStyle === SwipeStyle.SimpleHorizontal) {
    leadingClipPath = `inset(0px ${mapViewWidthRef.current - newPosition.x}px 0px 0px)`
    trailingClipPath = `inset(0px 0px 0px ${newPosition.x}px)`
  }
  const leadingMap = isLeadingMapActiveRef.current ? activeMapDOMRef.current : inactiveMapDOMRef.current
  const trailingMap = isLeadingMapActiveRef.current ? inactiveMapDOMRef.current : activeMapDOMRef.current
  leadingMap && (leadingMap.style.clipPath = leadingClipPath)
  trailingMap && (trailingMap.style.clipPath = trailingClipPath)
}
```

Source: `src/runtime/components/swipe-between-maps.tsx` - switch active map on clicking the hidden map, via the group
```tsx
const changeActiveMap = async () => {
  await jimuMapViewGroup.switchMap(true)
  isSwitchingMapRef.current = false
}
```

Source: `src/runtime/components/scroll-layers.tsx` - build a disabled arcgis-swipe per layer for scroll stepping + watch view size
```tsx
const swipe = document.createElement('arcgis-swipe')
swipe.classList.add(`exb-swipe-scroll-${widgetId}`)
swipe.leadingLayers = [] as unknown as Collection<Layer>
swipe.trailingLayers = [layer] as unknown as Collection<Layer>
swipe.disabled = true
swipe.direction = swipeDirection
swipe.swipePosition = 100
swipe.hideHandle = true
swipe.autoDestroyDisabled = true
// ...
secondMapSizeWatchHandleRef.current = reactiveUtils.watch(
  () => inactiveMapView?.view?.width, () => { updateSizeSecond() }
)
```

Source: `src/tools/app-config-operations.ts` - remap map/layer IDs when the page is copied
```ts
afterWidgetCopied (sourceWidgetId, sourceAppConfig, destWidgetId, destAppConfig, contentMap?) {
  if (!contentMap) return destAppConfig
  const config: IMConfig = sourceAppConfig.widgets[sourceWidgetId]?.config
  const newSwipeMapViewList = {}
  for (const mapViewId of Object.keys(config.swipeMapViewList || {})) {
    const newMapViewId = mapViewUtils.getCopiedJimuMapViewId(contentMap, mapViewId)
    newSwipeMapViewList[newMapViewId] = {
      leadingLayersId: config.swipeMapViewList[mapViewId].leadingLayersId
        .map(id => mapViewUtils.getCopiedJimuLayerViewId(contentMap, id)).asMutable(),
      trailingLayersId: config.swipeMapViewList[mapViewId].trailingLayersId
        .map(id => mapViewUtils.getCopiedJimuLayerViewId(contentMap, id)).asMutable()
    }
  }
  return destAppConfig.setIn(['widgets', destWidgetId, 'config', 'swipeMapViewList'], newSwipeMapViewList)
    // ...also remaps scrollMapViewList the same way
}
```

Source: `src/utils/utils.ts` - which layer types the swipe API cannot handle
```ts
export const isLayersDisabled = (jimuLayerView: JimuLayerView): boolean => {
  return jimuLayerView.type === JSAPILayerTypes.GroupLayer // swipe API has no group-layer support
}
export const isLayersHidden = (jimuLayerView, jimuLayerViews): boolean => {
  return jimuLayerView.type === JSAPILayerTypes.SubtypeSublayer || subLayersHaveNoView(jimuLayerView, jimuLayerViews)
}
```

Source: `src/setting/setting.tsx` - reset swipe mode when the map is re-bound
```tsx
const onMapWidgetSelected = (ids: string[]) => {
  onSettingChange({
    id,
    config: { swipeStyle, swipeMode: SwipeMode.SwipeBetweenLayers },
    useMapWidgetIds: ids
  })
}
// between-maps radio only enabled when the map has exactly 2 data sources:
// disabled={mapUseDataSources?.length !== 2}
```

Source: `src/setting/setting.tsx` - guard against two swipe widgets on one map
```tsx
const isMapUnoccupied = (): boolean => {
  if (!useMapWidgetIds?.length) return true
  const usedMapWidgetId = useMapWidgetIds[0]
  const appConfig = getAppConfigAction().appConfig
  for (const widgetId of Object.keys(appConfig.widgets)) {
    const widget = appConfig.widgets[widgetId]
    if (widget.manifest.name === 'swipe' && widget.id !== id &&
        widget.useMapWidgetIds?.[0] === usedMapWidgetId) {
      return false
    }
  }
  return true
}
```
