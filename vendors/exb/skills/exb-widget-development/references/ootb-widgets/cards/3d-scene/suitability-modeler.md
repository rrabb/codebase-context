# OTB Widget: arcgis/suitability-modeler

Online widget doc: https://developers.arcgis.com/experience-builder/guide/suitability-modeler-widget/

## Purpose
Runtime widget that loads a published Weighted Raster Overlay (WRO) suitability
model (an ImageServer that follows the WRO / geodesign convention) and lets the
end user:
- Adjust per-layer weights and remap ranges, pick a color ramp, then re-run the
  model as a live `ImageryLayer` raster function on the map.
- Draw or select an area of interest and compute suitability histograms, shown
  as a pie chart.
- Optionally export the tuned model back to the portal as a new Image Service
  item (`geodesignModelerLayer`).

The model source is configured in the builder either by an ImageServer URL or by
a portal item id. Despite the folder classification (3d-scene / cards), the code
works against a JimuMapView `view` (MapView or SceneView) and does not require a
SceneView specifically.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/config.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/modeler.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/chart-panel.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/chart.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/colormap.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/export.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/layers-panel.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/model-panel.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/remap.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-context.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-model.ts (imports only)
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-service.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-layer-util.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-raster-util.ts (imports + top)
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-chart-util.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-colormaps.ts (imports only)
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/runtime/wro/wro-util.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/suitability-modeler/src/setting/setting.tsx

(dist/ compiled output and any tests were intentionally ignored.)

## Architecture overview
This widget uses a "WRO engine" pattern under `src/runtime/wro/`. The React
component tree is thin; the heavy lifting lives in a context object plus a set of
plain util modules.

Component tree:
- `widget.tsx` (`Widget`) - top-level class component. Owns the `WroContext`,
  the current `WroModel` and `WroStatus` in React state, and the
  `JimuMapViewComponent` binding. Renders `<Modeler>`.
- `wro/modeler.tsx` (`Modeler`) - tabbed shell (jimu-ui `Tabs`/`Tab`) that swaps
  between the three panels.
  - `wro/model-panel.tsx` (`ModelPanel`) - run / clear / export actions, embeds
    `ColormapSelector`, `RemapRanges`, `Export`.
  - `wro/layers-panel.tsx` (`LayersPanel`) - per-layer enable + weight editing.
  - `wro/chart-panel.tsx` (`ChartPanel`) - AOI draw/select tools + histogram pie
    chart (`wro/chart.tsx` `WroChart`).

Non-UI engine:
- `wro/wro-context.ts` (`WroContext`) - dependency-injection object. Exposes
  getter callbacks (`getView`, `getPortal`, `getUser`, `getTheme`, `nls`, ...)
  that `widget.tsx` overrides with live props, plus a `ModelController` and a
  `loadModel()` that delegates to `WroService`.
- `wro/wro-model.ts` (`ModelFactory`, `ModelController`, types) - the model data
  structures (`WroModel`, `ModelLayer`, `RemapRange`, `RasterLayer`, `WroStatus`,
  `Issue`, `ColormapInfo`) and the controller that mutates them.
- `wro/wro-service.ts` (`WroService`) - loads/validates the model from an
  ImageServer URL or a portal item (`esri/request`, `esri/portal/PortalItem`).
- `wro/wro-layer-util.ts` - builds/adds/removes the live `ImageryLayer`, applies
  the raster function, builds the popup template.
- `wro/wro-raster-util.ts` - converts a `WroModel` to/from an ArcGIS raster
  function JSON graph (Colormap / Local / Remap functions).
- `wro/wro-chart-util.ts` - computes histograms via the ImageServer
  `computeHistograms` REST op, plus sketch/graphics helpers.
- `wro/wro-colormaps.ts` - color ramp catalog and lookup helpers.
- `wro/wro-util.ts` - misc helpers (image layer lookup, `exportModel`).

## Key imports and packages
Grouped by source file. Note that this widget MIXES the `@arcgis/core/*`
package-style imports and the legacy `esri/*` AMD-alias imports in different
files (see Gotchas).

jimu framework:
- `widget.tsx`: `React, type AllWidgetProps, jsx` from `jimu-core`;
  `JimuMapViewComponent, type JimuMapView` from `jimu-arcgis`.
- `setting.tsx`: `React, css, jsx` from `jimu-core`; `loadArcGISJSAPIModules`
  from `jimu-arcgis`; `type AllWidgetSettingProps` from `jimu-for-builder`.
- `config.ts`: `type ImmutableObject` from `jimu-core`.

jimu-ui + advanced + icons:
- `modeler.tsx`: `Tabs, Tab` from `jimu-ui`.
- `model-panel.tsx`: `Alert, AlertPopup, Button, ButtonGroup, Icon, NumericInput`
  from `jimu-ui`; `moreHorizontalIcon` from
  `jimu-ui/lib/icons/property-setting-selected.svg`.
- `chart-panel.tsx`: `Alert, Button, ButtonGroup, Select` from `jimu-ui`;
  icons from `jimu-icons/outlined/gis/select-polygon`,
  `jimu-icons/outlined/gis/select-lasso`, `jimu-icons/outlined/gis/layer`,
  `jimu-icons/outlined/editor/move`.
- `colormap.tsx`: `Dropdown, DropdownButton, DropdownMenu, DropdownItem` from
  `jimu-ui`.
- `export.tsx`: `AlertPopup, Form, FormGroup, Label, Select, TextArea, TextInput`
  from `jimu-ui`.
- `remap.tsx`: `NumericInput, Slider` from `jimu-ui`.
- `layers-panel.tsx`: `Checkbox, Label` from `jimu-ui`.
- `setting.tsx`: `Button, Checkbox, Icon, Label, Radio, TextInput` from `jimu-ui`;
  `MapWidgetSelector, SettingSection` from `jimu-ui/advanced/setting-components`;
  `checkIcon` from `jimu-ui/lib/icons/check.svg`.
- `chart.tsx`: amCharts wrappers from `jimu-ui/advanced/chart-engine`
  (`ResponsiveThemeAm5, DarkThemeAm5, percentAm5, PieChartAm5, LegendAm5,
  createRoot, PieSeriesAm5, colorAm5, TooltipAm5, ScrollbarAm5`).

ArcGIS Maps SDK for JavaScript (JSAPI):
- `chart-panel.tsx`: `type GraphicsLayer` from `esri/layers/GraphicsLayer`;
  `SketchViewModel` from `esri/widgets/Sketch/SketchViewModel`;
  `* as reactiveUtils` from `@arcgis/core/core/reactiveUtils`.
- `wro-chart-util.ts`: `GraphicsLayer` from `esri/layers/GraphicsLayer`;
  `type ImageryLayer` from `esri/layers/ImageryLayer`;
  `type MapView` from `esri/views/MapView`; `Polygon` from
  `esri/geometry/Polygon`; `type SceneView` from `esri/views/SceneView`;
  `esriRequest` from `esri/request`.
- `wro-layer-util.ts`: `ImageryLayer` from `esri/layers/ImageryLayer`;
  `RasterFunction` from `esri/layers/support/RasterFunction`;
  `PopupTemplate` from `@arcgis/core/PopupTemplate`.
- `wro-service.ts`: `PortalItem` from `esri/portal/PortalItem`; `esriRequest`
  from `esri/request`.
- `wro-util.ts`: `PortalItem` from `esri/portal/PortalItem`.
- `model-panel.tsx`: `* as reactiveUtils` from `esri/core/reactiveUtils`.
- `export.tsx`: `Portal` from `esri/portal/Portal`.
- `setting.tsx`: modules loaded lazily via
  `loadArcGISJSAPIModules(['esri/portal/Portal'])`; typed with `__esri.Portal`.

## Reusable patterns found
- JimuMapView binding: `JimuMapViewComponent` + `onActiveViewChange` in
  `widget.tsx`; the live `view` is exposed to the engine through
  `wroContext.getView = () => this.state.jimuMapView?.view` rather than passed as
  a prop. Good example of decoupling the JSAPI view from deep child components.
- Dependency-injection context (`WroContext`): getter callbacks overridden at
  construction time so the util layer never imports React/props directly.
- Direct static JSAPI imports in the runtime bundle (`esri/*` + `@arcgis/core/*`)
  instead of `loadArcGISJSAPIModules`. The builder-side `setting.tsx` DOES use
  the lazy `loadArcGISJSAPIModules` loader.
- SketchViewModel AOI capture: `new SketchViewModel({ view, layer })` on a
  managed `GraphicsLayer`, `svm.create('polygon' | 'rectangle', options)`,
  freehand via `{ mode: 'freehand' }`, cleanup via `svm.cancel()` +
  `svm.destroy()`.
- ImageServer raster-function overlay: build a `RasterFunction.fromJSON(...)`
  graph and assign `layer.rasterFunction`; add the `ImageryLayer` at index 0.
- ImageServer REST ops via `esri/request`: `/computeHistograms`, `/query`, and
  service-root `?f=json` metadata. Uses `responseType: 'json'`.
- Portal item load/validate/export: `PortalItem.load()` + `fetchData('json')` to
  read a saved `renderingRule`; `portal.user.addItem(...)` to export.
- `reactiveUtils.watch(...)` to react to `layer.rasterFunction` changes;
  `reactiveUtils.whenOnce(() => !layerView.updating)` to detect layer refresh
  completion.
- Chart engine: `jimu-ui/advanced/chart-engine` amCharts5 pie chart with
  dark/RTL/locale-aware theming.
- NOTE: this widget MIXES `@arcgis/core/*` and `esri/*` alias imports; see
  Gotchas before copying import style.

## Builder vs runtime split
- Builder (`src/setting/setting.tsx`): picks the map widget
  (`MapWidgetSelector`), toggles config flags (`displayLabel`, `allowExport`,
  `lockSlider`, `hideRanges`), and chooses the model source either by URL
  (`serviceUrl`) or by portal item (`itemId` + `itemTitle`) via a live portal
  search. It lazily loads `esri/portal/Portal` with `loadArcGISJSAPIModules` and
  keeps its own `this.portal: __esri.Portal` to run item searches. All changes go
  through `this.props.onSettingChange({ id, config: this.props.config.set(...) })`
  or `{ id, useMapWidgetIds }`.
- Runtime (`src/runtime/widget.tsx` + `wro/*`): reads config + the bound
  JimuMapView, loads/validates the model, and drives the interactive UI. Model
  source loading is triggered in `componentDidUpdate` when `serviceUrl`/`itemId`
  change or when a view first becomes available.

## Lifecycle and cleanup
- `constructor` (widget): creates `modelerRef`, initial `WroStatus`, wires all
  `WroContext` getters, and sets `modelController.onModelChange` /
  `onStatusChange` to update React state.
- `componentDidUpdate` (widget): the main orchestrator. Detects theme/label/
  config changes (clones `WroStatus`), clears layers and reloads the model on
  source change, and auto-runs the model when a view appears
  (`autoRunModel(true)`).
- `handleActiveViewChange`: clears graphics/model layers from the previous view,
  updates `wroStatus.viewId`.
- `componentWillUnmount` (widget): `clearLayers(view, wroModel)` removes the
  `<id>_drawGfxLayerId`, `<id>_selGfxLayerId` graphics layers and the model
  `ImageryLayer`.
- `ChartPanel`: tracks JSAPI resources itself - `activeSketchViewModel`,
  `watchHandles`, `imageLayerHandle`, `highlightHandle`. `cancelSketch()` calls
  `svm.cancel()` + `svm.destroy()`; `unwatchView()`/`unwatchImageLayer()` remove
  reactive watch handles; `componentWillUnmount` calls `cancelSketch()` +
  `unwatchView()`. Highlight handles are removed via `handle.remove()`.
- `WroChart` (amCharts): `dispose()` calls `root.dispose()` and hides the DOM
  node; called on `componentWillUnmount` and before re-init on theme change.

## Manifest/config requirements
- `manifest.json`: `type: "widget"`, `dependency: ["jimu-arcgis"]` (needed for
  the map view binding and the JSAPI modules), `defaultSize` 400 x 500,
  translated into ~40 locales. No explicit external JSAPI dependency entry is
  declared in the manifest even though it imports `esri/*` and `@arcgis/core/*`
  statically (these resolve through the ExB build).
- `config.json` defaults: `allowExport: true`, `displayLabel: true`,
  `lockSlider: false`, `serviceUrl: null`, `itemId: null`, `itemTitle: null`.
- `src/config.ts` `Config` interface fields: `allowExport?`, `lockSlider?`,
  `displayLabel?`, `hideRanges?`, `serviceUrl?`, `itemId?`, `itemTitle?`
  (`hideRanges` is in the interface/defaults handling but not present in
  `config.json`).
- The widget must be associated with a Map widget (via `useMapWidgetIds[0]`); it
  reads `props.portalUrl`, `props.portalSelf`, `props.user`, `props.theme`,
  `props.intl`.

## Gotchas
- MIXED import styles: some files import from `@arcgis/core/*`
  (`@arcgis/core/core/reactiveUtils`, `@arcgis/core/PopupTemplate`) while others
  import the same kinds of module from the legacy `esri/*` alias
  (`esri/core/reactiveUtils`, `esri/portal/PortalItem`, `esri/request`,
  `esri/layers/*`, `esri/views/*`, `esri/geometry/Polygon`,
  `esri/widgets/Sketch/SketchViewModel`). Do not treat this as a style to copy
  wholesale; pick one convention per this repo's guidance. Both resolve to the
  same SDK at build time here.
- The widget imports JSAPI modules STATICALLY in the runtime bundle (not through
  `loadArcGISJSAPIModules`), which increases initial bundle size; only the
  builder side uses the async loader.
- `pWinSt` is referenced for logging in several files (e.g. `pWinSt.error(...)`)
  but is not imported in the inspected source. UNVERIFIED: it appears to be a
  build-injected global logger. If porting code out of this widget, replace it
  with your own logging.
- The model source is a WRO-convention ImageServer, not an ordinary feature
  layer. `wro-layer-util.validateWROLayer` enforces: `currentVersion >= 10.3`,
  presence of `rasterTypeInfos`, `allowRasterFunction`,
  `defaultResamplingMethod === 'Nearest'`, and required fields (`Title`, `Url`,
  `Description`, `InputRanges`, `OutputValues`, `NoDataRanges`, `RangeLabels`,
  `NoDataRangeLabels`). Arbitrary image services will fail to load.
- Mixed content: `WroService.checkMixedContent` rewrites `http://` service URLs
  to `https:` when the page is served over https.
- `computeHistograms` requires the model layer to have a live `rasterFunction`
  (see `wro-util.canComputeHistograms`); the chart tools are disabled until the
  model has been run.
- `esriRequest(url, options)` calls are annotated with `// @ts-expect-error` in
  the source because the request signature/typing differs from the runtime call
  shape used here.
- Graphics layers are created with fixed ids derived from the widget id
  (`<id>_drawGfxLayerId`, `<id>_selGfxLayerId`) and `listMode: 'hide'`; cleanup
  depends on those ids matching, so do not rename without updating cleanup.

## Useful snippets and functions

Source: src/runtime/widget.tsx - wiring the WroContext getters and binding the map view.
```tsx
const wroContext = new WroContext()
this.wroContext = wroContext
wroContext.nls = this.nls
wroContext.getConfig = (): any => this.props.config
wroContext.getId = (): string => this.props.id
wroContext.getLabel = (): string => this.props.config.displayLabel ? this.props.label : null
wroContext.getPortal = (): any => this.props.portalSelf
wroContext.getPortalUrl = (): string => this.props.portalUrl
wroContext.getTheme = (): any => this.props.theme
wroContext.getUser = (): any => this.props.user
wroContext.getView = (): any => this.state.jimuMapView?.view
wroContext.modelController.onModelChange = this.onWroModelChange
wroContext.modelController.onStatusChange = this.onWroStatusChange
```

Source: src/runtime/widget.tsx - JimuMapViewComponent binding + active view change cleanup.
```tsx
render (): any {
  return (
    <div className='widget-wro jimu-widget'>
      <Modeler ref={this.modelerRef}
        wroContext={this.wroContext} wroModel={this.state.wroModel} wroStatus={this.state.wroStatus}
      />
      <JimuMapViewComponent
        useMapWidgetId={this.props.useMapWidgetIds?.[0]}
        onActiveViewChange={this.handleActiveViewChange}
      />
    </div>
  )
}

handleActiveViewChange = (jimuMapView: JimuMapView): void => {
  const prev = this.state.jimuMapView
  if (prev?.view?.map) {
    this.clearLayers(prev?.view, this.state.wroModel)
  }
  const wroStatus = ModelFactory.cloneStatus(this.state.wroStatus)
  wroStatus.viewId = jimuMapView ? this.newViewId() : null
  this.setState({ jimuMapView, wroStatus })
}
```

Source: src/runtime/wro/wro-layer-util.ts - build a raster function and apply it as an ImageryLayer overlay.
```ts
export async function runWroModel (wroContext: WroContext, wroModel: WroModel): Promise<any> {
  const view = wroContext.getView()
  if (view?.map) {
    const json = rasterUtil.modelToRasterFunctionJson(wroModel)
    const rasterFunction = RasterFunction.fromJSON(json)
    let layer: ImageryLayer = findMapLayer(view, wroModel.mapLayerId)
    if (layer) {
      layer.popupTemplate = createWroPopupTemplate(wroContext, wroModel)
      layer.rasterFunction = rasterFunction
      if (!layer.visible) layer.visible = true
      wroContext.modelController.setMapLayerId(wroModel, layer.id)
    } else {
      layer = new ImageryLayer({
        popupTemplate: createWroPopupTemplate(wroContext, wroModel),
        rasterFunction: rasterFunction,
        url: wroModel.serviceUrl
      })
      await layer.load()
      view.map.add(layer, 0)
      wroContext.modelController.setMapLayerId(wroModel, layer.id)
    }
    return layer
  }
}
```

Source: src/runtime/wro/chart-panel.tsx - SketchViewModel AOI capture on a managed graphics layer.
```tsx
activateSketch = (activeTool, type, createOptions?): void => {
  this.cancelSketch()
  const isSel = (activeTool === 'selectLayer')
  const view = this.props.wroContext.getView()
  if (view?.map) {
    this.setGraphicsLayerVisibility(this.drawGfxLayerId, !isSel)
    const gfxLayerId = isSel ? this.selGfxLayerId : this.drawGfxLayerId
    const graphicsLayer = this.ensureGraphicsLayer(view, gfxLayerId)
    const svm = new SketchViewModel({ view: view, layer: graphicsLayer })
    this.activeSketchViewModel = svm
    svm.on('create', event => {
      if (event.state === 'complete') {
        // ... compute histograms for the drawn / selected geometry ...
        svm.create(type, createOptions)
      }
    })
    svm.create(type, createOptions)
  }
}

cancelSketch = (): void => {
  const svm = this.activeSketchViewModel
  if (svm) {
    try {
      svm.cancel()
      svm.destroy()
    } catch (ex) {
      pWinSt.error('Error canceling SketchViewModel', ex)
    }
    this.activeSketchViewModel = null
  }
}
```

Source: src/runtime/wro/chart-panel.tsx - reactiveUtils.watch on layer.rasterFunction.
```tsx
watchImageLayer (): void {
  this.unwatchImageLayer()
  const imageLayer = this.getImageLayer()
  if (imageLayer) {
    this.imageLayerHandle = reactiveUtils.watch(() => imageLayer.rasterFunction, (): any => {
      // refresh histograms when the model raster function changes
    })
  }
}
```

Source: src/runtime/wro/wro-chart-util.ts - ImageServer computeHistograms via esri/request.
```ts
async function execComputeHistograms (imageLayer, polygon): Promise<any> {
  let result
  if (imageLayer?.rasterFunction && polygon) {
    const layerUrl = imageLayer.url as string
    const url = `${layerUrl}/computeHistograms`
    const pixelSize = getModelPixelSize(imageLayer, polygon)
    const query: any = { f: 'json' }
    query.geometry = JSON.stringify(polygon.toJSON())
    query.geometryType = 'esriGeometryPolygon'
    query.renderingRule = JSON.stringify(imageLayer.rasterFunction.toJSON())
    query.pixelSize = JSON.stringify(pixelSize)
    const options = { query: query, responseType: 'json' }
    // @ts-expect-error
    result = await esriRequest(url, options)
    result = result?.data
  }
  return result
}
```

Source: src/runtime/wro/wro-service.ts - load model by portal item id and read saved renderingRule.
```ts
item = new PortalItem({ id: itemId })
try {
  await item.load()
} catch (ex) {
  pWinSt.error('Error loading item', itemId, ex)
  trackError(nls('wro_validation_errorLoadingItem'), ex)
}
// ...
serviceUrl = (typeof item.url === 'string') ? item.url.trim() : null
const data: any = await item.fetchData('json')
renderingRule = data?.renderingRule
```

Source: src/runtime/wro/wro-service.ts - query ImageServer rasters via esri/request.
```ts
async queryRasters (url: string): Promise<any> {
  url = url + '/query'
  const query = { f: 'json', where: '1=1', outFields: ['*'], returnGeometry: false }
  const options = { query: query, responseType: 'json' }
  // @ts-expect-error
  return esriRequest(url, options).then(result => {
    const features = result?.data?.features
    // ... map features -> RasterLayer[] ...
  })
}
```

Source: src/runtime/wro/wro-util.ts - export the tuned model back to the portal.
```ts
export async function exportModel (task): Promise<any> {
  const { title, summary, description, tags, folder } = task
  const { itemData, portal, serviceUrl } = task
  let tagsA = typeof tags === 'string' ? tags.split(',').filter(v => v.length > 0) : []
  if (tagsA.length === 0) tagsA = ['weightedOverlayModel', 'geodesign']
  const item = new PortalItem({
    type: 'Image Service',
    typeKeywords: ['geodesignModelerLayer'],
    title, snippet: summary, description, tags: tagsA, url: serviceUrl
  })
  const params: any = { item: item }
  if (itemData) params.data = JSON.stringify(itemData)
  if (folder) params.folder = folder
  await portal.user.addItem(params)
}
```

Source: src/setting/setting.tsx - builder lazily loads Portal and searches for model items.
```tsx
async init (): Promise<void> {
  try {
    const modules = await loadArcGISJSAPIModules(['esri/portal/Portal'])
    const Portal: typeof __esri.Portal = modules[0]
    const portal = new Portal({ url: this.props.portalUrl })
    await portal.load()
    this.portal = portal
    this.search().catch(() => null)
  } catch (ex) {
    pWinSt.error(ex)
  }
}
```

Source: src/setting/setting.tsx - map widget selector + config toggles.
```tsx
<MapWidgetSelector
  onSelect={this.handleMapWidgetSelected}
  useMapWidgetIds={this.props.useMapWidgetIds}
/>
// ...
handleAllowExportChange = (evt, checked: boolean): void => {
  if (evt) {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('allowExport', checked)
    })
  }
}
```

Source: src/runtime/wro/chart.tsx - amCharts5 pie chart via jimu-ui/advanced/chart-engine with dark theme.
```tsx
const theme = this.props.wroContext.getTheme()
const dark = (theme?.sys.color.mode === 'dark')
const root = await createRoot(node, locale)
root.setThemes(dark
  ? [ResponsiveThemeAm5.new(root), DarkThemeAm5.new(root)]
  : [ResponsiveThemeAm5.new(root)])
const chart = root.container.children.push(
  PieChartAm5.new(root, { layout: root.verticalLayout, radius: percentAm5(90) })
)
```
