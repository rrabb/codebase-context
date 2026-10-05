# OTB Widget: arcgis/bookmark

Online widget doc: https://developers.arcgis.com/experience-builder/guide/bookmark-widget/

## Purpose
The Bookmark widget lets an app author capture and replay map/scene viewpoints ("bookmarks"). At runtime each bookmark drives the connected Map widget to a saved `Viewpoint`/`extent`, and optionally restores basemap, ground opacity/transparency, scene lighting/weather, time extent, layer visibility, and author-drawn graphics. Authors pick one of several presentation templates (card grid, list, gallery, several slide/suspension layouts, and two fully custom embedded-layout templates). Additional capabilities: display bookmarks that already exist in the web map/scene (`displayFromWeb`), let end users add their own runtime bookmarks (`runtimeAddAllow`, cached locally), and auto-play through bookmarks on a timer.

## Source paths inspected
Root: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/bookmark/` (gitignored; inspected with grep `includeIgnoredFiles: true`). The `dist/` compiled JS and per-locale `translations/*.js` plus `tests/` were ignored; the `.ts`/`.tsx` under `src/` are the real source.
- `manifest.json`
- `config.json` (default config partial)
- `src/config.ts` (Config / Bookmark interfaces, enums)
- `src/constants.ts`
- `src/utils.ts` (getDefaultConfig, layer-visibility helpers)
- `src/version-manager.ts` (referenced; `static versionManager`)
- `src/runtime/widget.tsx`
- `src/runtime/builder-support.tsx`
- `src/runtime/utils/utils.ts` (cache keys, getTotalBookmarks, applyTimeExtent, card sizing)
- `src/runtime/components/nav-buttons.tsx`
- `src/runtime/components/card/card-list.tsx`, `card/card-example.tsx`
- `src/runtime/components/gallery/gallery-list.tsx`, `gallery/gallery-example.tsx`
- `src/runtime/components/list/list-item.tsx`
- `src/tools/app-config-operations.ts`
- `src/tools/builder-operations.ts`
- `src/setting/setting.tsx`
- `src/setting/components/mark-popper.tsx` (JimuDraw dialog)
- `src/setting/components/text-style-setting.tsx`
- `src/setting/components/arrangement/{card-arrangement-setting,gallery-arrangement-setting,item-size-selector}.tsx`

## Architecture overview
- `Widget` is a `React.PureComponent` (class), not a function component. It receives `AllWidgetProps<IMConfig>` plus extra props injected by a static `mapExtraStateProps`.
- The connected map is obtained via `JimuMapViewComponent` (from `jimu-arcgis`); the active `JimuMapView` and the `JimuMapViewGroup` are held in component state. Navigation is done with `jimuMapView.view.goTo(Viewpoint.fromJSON(...))`.
- ArcGIS JSAPI classes (`Graphic`, `GraphicsLayer`, `Viewpoint`, `Basemap`) are lazy-loaded in `componentDidMount` via `loadArcGISJSAPIModules` and stored as typed instance fields (`this.Graphic`, etc.).
- The two "custom" templates render an EMBEDDED LAYOUT per bookmark via `LayoutEntry` (from `jimu-layouts/layout-runtime`), which is why the manifest sets `hasEmbeddedLayout: true`.
- Author bookmark creation/editing happens in the settings panel through `MarkPopper`, a floating dialog that mounts its own `JimuMap` + `JimuDraw` so authors can pan/zoom and draw graphics that are saved with the bookmark.
- Three primary "simple" display modes map to reusable list components: card (`card-list.tsx`), gallery (`gallery-list.tsx`), list (`list-item.tsx`). Slide/suspension and custom variants are rendered inline in `widget.tsx`.

## Key imports and packages
Grouped by source module (import site noted).

From `jimu-core` (`widget.tsx`): `React`, `classNames`, `AllWidgetProps`, `IMState`, `AppMode`, `appActions`, `getAppStore`, `TransitionContainer`, `BrowserSizeMode`, `indexedDBUtils`, `ReactResizeDetector`, `ViewVisibilityContext` + `ViewVisibilityContextProps`, `lodash`, `css`, `utils`, `ImmutableArray`, `ImmutableObject`, `IMAppConfig`, `defaultMessages as jimuCoreMessages`.

From `jimu-arcgis` (`widget.tsx`, `mark-popper.tsx`, `app-config-operations.ts`, `runtime/utils/utils.ts`): `JimuMapViewComponent`, `JimuMapView`, `JimuMapViewGroup`, `loadArcGISJSAPIModules`, and `MapViewManager` (used in the app-config-operations tool to reach live views without the component).

From `jimu-layouts/layout-runtime`: `LayoutEntry` (embedded per-bookmark layout in `widget.tsx`), `searchUtils` (in `builder-support.tsx`), `utils` + `defaultMessages as jimuLayoutsDefaultMessages` (in `setting.tsx`).

From `jimu-ui` (`widget.tsx`): `Button`, `Image`, `NavButtonGroup`, `Select`, `ImageFillMode`, `Dropdown`/`DropdownButton`/`DropdownMenu`/`DropdownItem`, `Paper`, `defaultMessages as jimuUIDefaultMessages`.

From `jimu-ui/advanced/map` (`mark-popper.tsx`): `JimuMap`, `JimuDraw`, `JimuDrawCreatedDescriptor`, `DrawingUpdatedDescriptor`.

From `jimu-ui/advanced/setting-components` (`setting.tsx`): `MapWidgetSelector`, `SettingSection`, `SettingRow`. Also `FontStyle`, `InputUnit` in `text-style-setting.tsx`.

From `jimu-for-builder`: `AllWidgetSettingProps`, `getAppConfigAction`, `templateUtils`, `builderAppSync`, `widgetService` (`setting.tsx`); `AppResourceManager`, `ResourceItemInfo`, `getAppConfigAction` (`mark-popper.tsx`). Extension base types `extensionSpec`, `IMAppConfig` in the `tools/` files.

From `jimu-theme` (`text-style-setting.tsx`): `getTheme2`. (Note: the theme is otherwise threaded through `this.props.theme`; `useTheme` is not used here because the widget is a class component.)

From `jimu-icons/*`: `TextDotsOutlined`, `PlayCircleFilled`, `PauseOutlined`, `PinOutlined`, `PlusOutlined` (widget), directional/editor icons in nav-buttons and mark-popper.

## Reusable patterns found
- `JimuMapViewComponent` map binding
  - `<JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onActiveViewChange={...} onViewGroupCreate={...} />` gives you the active view and the view group.
  - `onActiveViewChange` awaits `jimuMapView.whenJimuMapViewLoaded()` before use.
  - Multi-map: when a bookmark points at a different map data source, it calls `viewGroup.switchMap().then(() => this.viewBookmark(item))`. `getMapBookmarks` reads native bookmarks from the view: 2D from `map.bookmarks`, 3D from `map.presentation.slides.toJSON()`.
- EMBEDDED LAYOUT via `LayoutEntry`
  - `getLayoutEntry()` returns `this.props.builderSupportModules.LayoutEntry` when in the builder Design mode, else the imported `LayoutEntry`. Rendered as `<LayoutEntry isRepeat layouts={layouts[item.layoutName]} isInWidget className='layout-height' />`. Requires `hasEmbeddedLayout: true` in the manifest.
- Three display modes plus advanced
  - `TemplateType` enum: `Card`, `List`, `Slide1/2/3`, `Gallery`, `Navigator`, `Custom1`, `Custom2`. Card -> `card-list.tsx`, Gallery -> `gallery-list.tsx`, List -> `list-item.tsx`; slide/suspension and custom variants render inline. `Custom1`/`Custom2` are the "advanced" templates and deliberately do NOT include web-map bookmarks (see `getTotalBookmarks`).
- `hasBuilderSupportModule` + `builder-support`
  - Manifest sets `hasBuilderSupportModule: true`; `builder-support.tsx` exports `widgetModules` with `selectionInBookmark(...)`, consumed inside the widget's static `mapExtraStateProps` via `props.builderSupportModules.widgetModules.selectionInBookmark(...)` to detect selection inside the widget's embedded layout.
- `JimuDraw` spatial bookmark creation (settings)
  - In `mark-popper.tsx`, `<JimuDraw jimuMapView={currentJimuMapView} operatorWidgetId={id} drawingOptions={...} uiOptions={...} onJimuDrawCreated={...} onDrawingFinished={...} onDrawingUpdated={...} onDrawingCleared={...} />`. Graphics are serialized with `graphic.toJSON()` and stored on the bookmark; each graphic carries `attributes.jimuDrawId` used to match/replace on edit.
- Extent / viewpoint capture and app-config-operations
  - Bookmarks store both `extent` (`view.extent.toJSON()`) and `viewpoint` (`view.viewpoint.toJSON()`); runtime playback uses `Viewpoint.fromJSON(viewpoint)`.
  - The `APP_CONFIG_OPERATIONS` extension (`app-config-operations.ts`) implements `widgetWillRemove` to clean the drawn `GraphicsLayer` (`bookmark-layer-<widgetId>...`) from every live view via `MapViewManager.getInstance()` when the widget is removed (e.g. via controller).
- Camera / viewpoint restore beyond extent
  - `viewBookmark` also restores `baseMap` (`Basemap.fromJSON`), `ground.opacity`/`ground.transparency`, SceneView `environment.lighting` and `environment.weather` (3D), and `timeExtent` via `applyTimeExtent`.

## Builder vs runtime split
- Runtime (`src/runtime/`): `widget.tsx` plus card/gallery/list/nav-buttons components; only reads config and drives the map.
- Builder (`src/setting/`): `setting.tsx` composes `MapWidgetSelector` (map binding), template pickers, arrangement panels (`card-arrangement-setting`, `gallery-arrangement-setting`, `item-size-selector`), `TextStyleSetting`, `BookmarkList`, and the `MarkPopper` create/edit dialog. Templates for the two custom layouts are loaded from `template/mark-styleCustom1.json` / `...Custom2.json` and processed by `templateUtils.processForTemplate`.
- Tools (`src/tools/`): `builder-operations.ts` implements `BUILDER_OPERATIONS.getTranslationKey` so bookmark `name` (and slide `description`) become translatable app strings; `app-config-operations.ts` implements `APP_CONFIG_OPERATIONS.widgetWillRemove` for cleanup. Both are wired in `manifest.json` `extensions[]`.
- `getLayoutEntry()` and `mapExtraStateProps` are the seam: in Design mode the widget uses builder-provided modules (`builderSupportModules.LayoutEntry`, `builderSupportModules.widgetModules`).
- `Widget.getFullConfig` merges `getDefaultConfig()` over the saved config (defaults are intentionally not persisted; see `getDefaultConfig` note), and `static versionManager` handles config migrations.

## Lifecycle and cleanup
- `componentDidMount`: lazy-load JSAPI modules; if not in builder (`this.isUseCache`) call `initRuntimeSnaps()` to hydrate runtime bookmark thumbnails from an `indexedDBUtils.IndexedDBCache`.
- `getDerivedStateFromProps`: clears the auto-play interval when another widget takes map control (`autoplayActiveId !== id`).
- `componentDidUpdate`: recomputes gallery/scroll arrow visibility, clears graphics when map control changes, activates the first bookmark when switching Design -> Run with `initBookmark`, handles print-preview auto-play suspend/resume, reacts to setting-driven active-bookmark changes, and clears the layer on last-bookmark delete.
- `componentWillUnmount`: if the widget no longer exists in `appConfig.widgets`, remove the widget's `GraphicsLayer` from the view (`bookmarkLayer.removeAll()`); disconnect the `IntersectionObserver`.
- Viewport gating: `rootRefCallback` sets up an `IntersectionObserver` (threshold 0.5) so `JimuMapViewComponent` is only mounted when >50% of the widget is in view (manifest `watchViewportVisibility: true`); also wrapped in `ViewVisibilityContext.Consumer` so it does not load in an off-screen embedded view. Auto-play uses `setInterval` cleared on stop/unmount/control-loss.

## Manifest/config requirements
- `manifest.json` properties: `hasEmbeddedLayout: true`, `watchViewportVisibility: true`, `hasBuilderSupportModule: true`.
- `manifest.json` extensions: `appConfigOperations -> APP_CONFIG_OPERATIONS -> tools/app-config-operations`; `builderOperations -> BUILDER_OPERATIONS -> tools/builder-operations`.
- `defaultSize`: `{ width: 516, height: 210 }`. Many translated locales listed.
- UNVERIFIED: the manifest does NOT declare a `dependency` array (no `"dependency": ["jimu-arcgis"]` present) even though the widget uses `jimu-arcgis`; whether the map dependency is implicit for `arcgis/*` widgets in 1.20 is unconfirmed from source. (`manifest.json`)
- `config.json` (persisted defaults kept intentionally): `displayFromWeb: true`, `galleryItemWidth: 200`, `galleryItemHeight: 237.5`, `galleryItemSpace: 24`, `cardItemWidth: "50%"`. The comment in `getDefaultConfig()` explains why these specific keys stay in `config.json` while other defaults are computed at runtime.
- Config shape (`src/config.ts`): `Config` includes `templateType`, `bookmarks: Bookmark[]`, `displayFromWeb`, `initBookmark`, `runtimeAddAllow`, `ignoreLayerVisibility`, `autoPlayAllow/autoInterval/autoLoopAllow`, `direction` (`DirectionType`), `pageStyle` (`PageStyle`), `displayType` (`DisplayType`), gallery/card sizing fields, `itemSizeType` (`ItemSizeType`), and text-style objects (`cardNameStyle`, `slidesNameStyle`, `slidesDescriptionStyle`). `Bookmark` carries `viewpoint`, `extent`, `graphics`, `layersConfig`, `type: '2d' | '3d'`, plus optional restored `baseMap`/`ground`/`environment`/`timeExtent`.

## Gotchas
- Two config copies: defaults live partly in `config.json` (persisted) and partly in `getDefaultConfig()` (runtime-only). Do not assume every default is written into the saved app config, and do not "fix" this by persisting all defaults (regression notes reference issues #20598, #21431, and `displayFromWeb` 2024R02/R03 behavior).
- Advanced templates (`Custom1`/`Custom2`) exclude web-map bookmarks; `getTotalBookmarks` short-circuits `displayFromWeb` for them.
- Graphics are matched by `attributes.jimuDrawId`, not object identity; edit flow removes-then-repaints matched graphics. Missing/duplicate ids break edit replay.
- Runtime user bookmarks are cached in `localStorage` (keys from `getKey`/`getOldKey`, includes `utils.getLocalStorageAppKey()`) and thumbnails in an IndexedDB cache; only active when NOT in the builder (`this.isUseCache = !window.jimuConfig.isInBuilder`).
- 3D vs 2D diverge: native bookmarks come from `map.presentation.slides` (3D) vs `map.bookmarks` (2D); scene-only restore paths (`visibleLayers`, `environment`) run only for `view.type === '3d'`.
- The drawn `GraphicsLayer` id pattern is `bookmark-layer-<widgetId>-<viewId>-<timestamp>`; the cleanup tool matches on `bookmark-layer-<widgetId>`. Renaming this pattern silently leaks layers on removal.
- Map control is cooperative: viewing a bookmark dispatches `appActions.requestAutoControlMapWidget(mapWidgetId, id)` to take control from other widgets; forgetting this makes auto-play fight other map widgets.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` (lazy-load JSAPI classes)
```tsx
componentDidMount () {
  if (!this.state.apiLoaded) {
    loadArcGISJSAPIModules([
      'esri/Graphic',
      'esri/layers/GraphicsLayer',
      'esri/Viewpoint',
      'esri/Basemap'
    ]).then(modules => {
      ;[this.Graphic, this.GraphicsLayer, this.Viewpoint, this.Basemap] = modules
      this.setState({ apiLoaded: true })
    })
  }
  if (this.isUseCache) { this.initRuntimeSnaps() }
}
```

Source: `src/runtime/widget.tsx` (map binding + viewport gating in render)
```tsx
<ViewVisibilityContext.Consumer>
  {({ isInView, isInCurrentView }: ViewVisibilityContextProps) => {
    const embedLoad = isInView ? isInCurrentView : true
    return embedLoad && (
      <div ref={this.rootRefCallback.bind(this)} className={classes} css={getStyle(/* ... */)}>
        {(isPrintPreview || showInView) && apiLoaded && <JimuMapViewComponent
          useMapWidgetId={useMapWidgetIds?.[0]}
          onActiveViewChange={this.onActiveViewChange}
          onViewGroupCreate={this.handleViewGroupCreate}
        />}
        {/* ...bookmark list... */}
      </div>
    )
  }}
</ViewVisibilityContext.Consumer>
```

Source: `src/runtime/widget.tsx` (IntersectionObserver so a bookmark only loads the map when >50% visible)
```tsx
rootRefCallback (rootRef: HTMLDivElement) {
  if (!rootRef) return
  if (this.intersectionObserver) this.intersectionObserver.disconnect()
  const handler = (entries: IntersectionObserverEntry[]) => {
    const showInView = entries[0]?.intersectionRatio > 0.5
    if (showInView) this.alreadyActiveLoading = false
    this.setState({ showInView })
  }
  this.intersectionObserver = new IntersectionObserver(handler, { threshold: [0, 0.5, 1] })
  this.intersectionObserver.observe(rootRef)
}
```

Source: `src/runtime/widget.tsx` (navigate the map to a bookmark; multi-map switch)
```tsx
onViewBookmark = (item, isRuntime?, index?) => {
  const { jimuMapView, viewGroup } = this.state
  const { id, useMapWidgetIds } = this.props
  if (useMapWidgetIds?.length) {
    getAppStore().dispatch(appActions.requestAutoControlMapWidget(useMapWidgetIds[0], id))
  }
  if (jimuMapView) {
    if (item && jimuMapView.dataSourceId !== item.mapDataSourceId) {
      viewGroup && viewGroup.switchMap().then(() => { this.viewBookmark(item) })
    } else {
      this.viewBookmark(item)
    }
  }
}

viewBookmark = (item) => {
  const { jimuMapView } = this.state
  jimuMapView.view.goTo(this.Viewpoint.fromJSON(item.viewpoint), { duration: AUTOPLAY_DURATION })
  if (item.baseMap) {
    jimuMapView.view.map.basemap = this.Basemap.fromJSON(item.baseMap.asMutable
      ? item.baseMap.asMutable({ deep: true }) : item.baseMap, { origin: 'web-scene' })
  }
}
```

Source: `src/runtime/widget.tsx` (embedded per-bookmark layout via LayoutEntry)
```tsx
getLayoutEntry () {
  if (window.jimuConfig.isInBuilder && this.props.appMode === AppMode.Design) {
    return this.props.builderSupportModules.LayoutEntry
  }
  return LayoutEntry as any
}

renderCustomContents = item => {
  const LayoutEntry = this.getLayoutEntry()
  const { layouts } = this.props
  if (!layouts || !item.layoutName) return <div key={item.id} />
  return (
    <div className='w-100 h-100 bookmark-custom-contents bookmark-pointer' onClick={() => this.onViewBookmark(item)}>
      <LayoutEntry isRepeat layouts={layouts[item.layoutName]} isInWidget className='layout-height' />
    </div>
  )
}
```

Source: `src/runtime/widget.tsx` (read native web map / scene bookmarks from the view)
```tsx
getMapBookmarks = (jimuMapView: JimuMapView) => {
  const view = jimuMapView?.view
  if (!view || !jimuMapView?.dataSourceId) return
  const mapSource = view.map as any
  let extraBookmarks = []
  if (view.type === '3d') {
    extraBookmarks = mapSource.presentation?.slides?.toJSON?.() || []
  } else if (view.type === '2d') {
    extraBookmarks = mapSource?.bookmarks ? JSON.parse(JSON.stringify(mapSource.bookmarks)) : []
  }
  return extraBookmarks.map((item, index) => {
    item.id = `mapOrigin-${index}`
    item.runTimeFlag = true
    item.mapOriginFlag = true
    item.mapDataSourceId = jimuMapView.dataSourceId
    return item
  })
}
```

Source: `src/runtime/widget.tsx` (capture a runtime bookmark, including a screenshot thumbnail)
```tsx
const { dataUrl } = await view.takeScreenshot({ width: 444, height: 360, layers: usedScreenshotLayers })
const bookmark: Bookmark = {
  id: newBookmarkId,
  name: `${this.formatMessage('_widgetLabel')}(${this.rtBookmarkId})`,
  type: view.type,
  imgSourceType: ImgSourceType.Snapshot,
  extent: view.extent.toJSON(),
  viewpoint: view.viewpoint.toJSON(),
  runTimeFlag: true,
  mapDataSourceId: jimuMapView.dataSourceId,
  layersConfig
}
```

Source: `src/setting/components/mark-popper.tsx` (author draw tools bound to a JimuMap in the settings dialog)
```tsx
<JimuDraw
  jimuMapView={currentJimuMapView}
  operatorWidgetId={this.props.id}
  drawingOptions={this._drawingOptions}
  uiOptions={this._uiOptions}
  onJimuDrawCreated={this.onDrawCreatedCallback}
  onDrawingFinished={this.onDrawEndCallback}
  onDrawingUpdated={this.onDrawUpdatedCallback}
  onDrawingCleared={this.onDrawClearedCallback}
/>

onDrawCreatedCallback = ({ sketch, completeOperation, enableSymbolSelector }: JimuDrawCreatedDescriptor) => {
  this.setState({ currentSketch: sketch, completeOperation, enableSymbolSelector })
}
onDrawEndCallback = (newGraphic: __esri.Graphic) => {
  this.setState({ graphics: this.state.graphics.concat(newGraphic.toJSON()) }, () => this.checkChange())
}
```

Source: `src/tools/app-config-operations.ts` (clean drawn layers when the widget is removed)
```ts
export default class AppConfigOperation implements extensionSpec.AppConfigOperationsExtension {
  id = 'bookmark-app-config-operation'
  widgetId: string
  widgetWillRemove (appConfig: IMAppConfig): IMAppConfig {
    const widgetJson = appConfig.widgets[this.widgetId]
    const useMapWidgetId = widgetJson?.useMapWidgetIds?.[0]
    const mvManager = MapViewManager.getInstance()
    const jimuMapViews = mvManager.getJimuMapViewGroup(useMapWidgetId)?.jimuMapViews || {}
    for (const id in jimuMapViews) {
      const bookmarkLayer = jimuMapViews[id].view?.map?.allLayers?.find(
        layer => layer.id.includes(`bookmark-layer-${this.widgetId}`)
      ) as __esri.GraphicsLayer
      if (bookmarkLayer) bookmarkLayer.removeAll()
    }
    return appConfig
  }
}
```

Source: `src/tools/builder-operations.ts` (make bookmark names/descriptions translatable)
```ts
export default class BuilderOperations implements extensionSpec.BuilderOperationsExtension {
  id = 'bookmark-builder-operation'
  widgetId: string
  slideTypes = [TemplateType.Slide1, TemplateType.Slide2, TemplateType.Slide3]
  getTranslationKey (appConfig: IMAppConfig): Promise<extensionSpec.TranslationKey[]> {
    const config = appConfig.widgets[this.widgetId].config as IMConfig
    const isSlideTypes = this.slideTypes.includes(config.templateType)
    const keys = getKeysInBookmarks(config.bookmarks, `widgets.${this.widgetId}.config`, isSlideTypes)
    return Promise.resolve(keys)
  }
}
```

Source: `src/runtime/builder-support.tsx` (selection detection inside the embedded layout)
```ts
const widgetModules = {
  selectionInBookmark: (layoutInfo, id, appConfig, useCurrentSizeMode = true) => {
    if (!layoutInfo?.layoutItemId || !layoutInfo?.layoutId) return false
    const layoutItems = searchUtils.getRelatedLayoutItemsInWidgetByLayoutInfo(
      appConfig, layoutInfo, id, getAppStore().getState().browserSizeMode)
    return layoutItems.length > 0
  }
}
export default widgetModules
```

Source: `src/runtime/utils/utils.ts` (web-map bookmark inclusion rule + local cache keys)
```ts
export const getTotalBookmarks = (config: IMConfig, mapBookmarks: any[]) => {
  const advancedTemplates = [TemplateType.Custom1, TemplateType.Custom2]
  return !advancedTemplates.includes(config.templateType) && config.displayFromWeb
    ? config.bookmarks.concat(mapBookmarks)
    : config.bookmarks
}

export const getKey = (widgetId, mapWidgetId) =>
  `${localAppKey}-bookmark-${widgetId}-bookmarks-${mapWidgetId || 'default'}`
```

Source: `src/runtime/utils/utils.ts` (restore a saved time extent onto feature layer views)
```ts
export const applyTimeExtent = (jimuMapView: JimuMapView, timeExtent: __esri.TimeExtentProperties) => {
  loadArcGISJSAPIModules(['esri/layers/support/FeatureFilter', 'esri/TimeExtent']).then(([FeatureFilter, TimeExtent]) => {
    jimuMapView.getAllJimuLayerViews().forEach(async jimuLayerView => {
      await jimuMapView.whenJimuLayerViewLoaded(jimuLayerView.id)
      const flv = jimuLayerView.view as __esri.FeatureLayerView
      if (!flv) return
      const filter = flv.filter ? flv.filter.clone() : new FeatureFilter({})
      filter.timeExtent = new TimeExtent({ start: timeExtent[0], end: timeExtent[1] })
      flv.filter = filter
    })
  })
}
```

Source: `src/setting/setting.tsx` (map binding + template custom layout loading in settings)
```tsx
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { getAppConfigAction, templateUtils, builderAppSync, widgetService } from 'jimu-for-builder'

const originAllStyles = {
  CUSTOM1: require('./template/mark-styleCustom1.json'),
  CUSTOM2: require('./template/mark-styleCustom2.json')
}
// each is prepared for use with templateUtils.processForTemplate(originAllStyles[style], widgetId, messages)
```
