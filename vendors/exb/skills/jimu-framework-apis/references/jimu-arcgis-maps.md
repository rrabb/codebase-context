# jimu-arcgis Reference (ExB 1.20 / ArcGIS Maps SDK for JavaScript 5.x)

The bridge between ExB and the ArcGIS Maps SDK for JavaScript. Type defs:
`ArcGISExperienceBuilder/client/jimu-arcgis/`. Widgets that use it need `"dependency": ["jimu-arcgis"]`
in `manifest.json` (and `"settingDependency": "jimu-arcgis"` for map/layer setting pickers).

## Package surface

```ts
export * from './lib/views'                 // JimuMapView, JimuMapViewGroup, JimuLayerView + subtypes
export * from './lib/mapview-manager'       // MapViewManager
export * from './lib/arcgis-js-api-module-loader'  // loadArcGISJSAPIModules
export { JimuMapViewComponent, JimuLayerViewComponent, init }
export { zoomToUtils, portalUtils, featureUtils, basemapUtils, mapViewUtils, SnappingUtils }
```

## JimuMapView

```ts
// properties
id: string                       // `${mapWidgetId}-dataSource_x` style id
mapWidgetId: string
dataSourceId: string
isActive?: boolean               // PROPERTY (setIsActive(bool) mutates it); top view in a multi-source map
view: __esri.MapView | __esri.SceneView
status: JimuMapViewStatus        // 'LOADING' | 'LOADED' | 'FAILED'
jimuLayerViews?: { [jimuLayerViewId: string]: JimuLayerView }
jimuMapViewGroup: JimuMapViewGroup

// lifecycle — ALWAYS await before touching .view/.layer
whenJimuMapViewLoaded(): Promise<JimuMapView>
whenAllJimuLayerViewLoaded(): Promise<JimuLayerViews>
whenJimuLayerViewLoaded(jimuLayerViewId): Promise<JimuLayerView>
whenJimuLayerViewLoadedByDataSource(ds): Promise<JimuLayerView>

// layer views
getAllJimuLayerViews(): JimuLayerView[]           // render-order sorted; MAY be unloaded
getAllLoadedJimuLayerViews(): JimuLayerView[]
getJimuLayerViewByDataSourceId(dataSourceId): JimuLayerView
getJimuLayerViewByAPILayer(layerOrSubLayer): JimuLayerView
getChildJimuLayerViews(id); getParentJimuLayerViews(id)
getMapDataSource(): MapDataSource

// selection / graphics (NO drawGraphicOnMap)
getSelectedFeatures(): Promise<__esri.Graphic[]>
clearSelectedFeatures(): void
selectFeaturesByGraphic(graphic, spatialRelationship, selectionMode: DataSourceSelectionMode, options?)
  : Promise<{ [jimuLayerViewId: string]: Array<__esri.Graphic | IFeature> }>
addMarkers(markerGroups): Promise<void>; removeMarker(graphic): void

// runtime layers (NO createJimuLayerViewByView)
createJimuLayerView(layerOrSubLayer, parentJimuLayerId, index, runtimeAddedDataSource?, fromRuntime?): Promise<JimuLayerView>
addLayerAndCreateJimuLayerView(layer, dataSource): Promise<JimuLayerView>
removeJimuLayerView(jimuLayerView): void          // jimuLayerView.fromRuntime must be true

// popup / highlight toggles
enableClickOpenPopup(); disableClickOpenPopup(); isClickOpenPopupEnabled()
enableClickHighlight(); disableClickHighlight()

// cross-context watch (prefer over importing reactiveUtils)
watch<T>(getValue: () => T, callback: (n: T, o: T) => void, options?): Promise<__esri.Handle>

isActive; isDestroyed(); isCached(); destroy()
// listeners: addJimuLayerViewCreatedListener(l), addJimuLayerViewRemovedListener(l), addJimuLayerViewsVisibleChangeListener(l)
```

## MapViewManager (singleton)

```ts
MapViewManager.getInstance()
getJimuMapViewById(id): JimuMapView
getAllJimuMapViewIds(): string[]
getAllJimuMapViews(): JimuMapView[]
getJimuMapViewGroup(mapWidgetId): JimuMapViewGroup
createJimuMapView(opts): Promise<JimuMapView>
destroyJimuMapView(id): void
```
No `getUseMapWidgetIds` — the manager is keyed by resolved `JimuMapView` id; `useMapWidgetIds` is a widget
prop from `MapWidgetSelector`. Builder and app windows share the same instance.

## Components

```tsx
// JimuMapViewComponent — note singular-verb callback names
<JimuMapViewComponent
  useMapWidgetId={props.useMapWidgetIds?.[0]}
  onActiveViewChange={(activeView: JimuMapView, prevActiveViewId: string) => {}}
  onViewsCreate={(views: { [id: string]: JimuMapView }) => {}}   // NOT onViewsCreated
  onViewGroupCreate={(group) => {}}
/>

// JimuLayerViewComponent
<JimuLayerViewComponent jimuMapViewId={id} jimuLayerViewId={jlvId}
  onJimuLayerViewLoaded={(jlv) => {}} />
```

## JimuLayerView

```ts
id: string                       // `${jimuMapViewId}-${jimuLayerId}`  (jimuLayerId = layer.id chain joined by '-')
layer: any                       // raw __esri.Layer
view: __esri.LayerView
type: string; index: number; fromRuntime: boolean; isLoaded: boolean
hierarchyLevel: string           // e.g. "0.4.3.5" nesting for group/sublayer trees

ready(): Promise<this>           // await this on the layer view itself
getLayerDataSource(): DataSource
createLayerDataSource(): Promise<DataSource>
getJimuMapView(): JimuMapView
isLayerVisible(): boolean
```

Selection lives on **`JimuQueriableLayerView`** (feature/scene/imagery/subtype…):
`selectFeatureById(id, record?)`, `selectFeaturesByIds(ids, records?)`,
`selectFeaturesByQuery(query, selectionMode)`, `getSelectedFeatures()`,
`setDefinitionExpression(expr)`. `JimuFeatureLayerView` narrows `layer: __esri.FeatureLayer`,
`getLayerDataSource(): FeatureLayerDataSource`.

52 subtypes exist (feature, scene, group, imagery, imagery-tile, tile, vector-tile, csv, geojson, kml(+sublayer),
wfs/wms(+sublayer)/wmts, map-image, map-service, subtype-group(+sublayer), building-scene(+group/component sublayer),
catalog(+dynamic-group/footprint), knowledge-graph(+sublayer), oriented-imagery, point-cloud, integrated-mesh(+3dtiles),
media, mosaic, stream, route, line-of-sight, link-chart, dimension, annotation(+sublayer), voxel, viewshed, video, wcs,
geo-rss, bing-maps, open-street-map, web-tile, elevation).

## loadArcGISJSAPIModules

```ts
import { loadArcGISJSAPIModules } from 'jimu-arcgis'
const [Graphic, GraphicsLayer, Point] = await loadArcGISJSAPIModules([
  'esri/Graphic', 'esri/layers/GraphicsLayer', 'esri/geometry/Point'
])   // returned array order matches input
```

Alternative to the static `esri/*` path alias. Use across builder/app iframes to avoid cross-context
type-identity issues; and prefer `jimuMapView.watch(...)` over importing `reactiveUtils` directly.

## Utils

- **`zoomToUtils`**: `zoomTo(view, target, options: ZoomToOptions)`, `getExtentFromScale(...)`, `layerExtent(view, layer, queryParams?)`, `projectToSpatialReference(geoms, sr)`. Types `ViewPadding`, `ZoomToOptions { scale?, queryParams?, padding? }`.
- **`basemapUtils`**: `isBasemap3D(basemap)`, `getBasemapItemsByGroup(...)`, `getOrgBasemaps()`, `loadBasemap(basemap)`. Enum `BasemapGroupType` (EsriDefault/EsriDefault3d/OrgDefault/Google3DTiles).
- **`mapViewUtils`**: `getCopiedJimuMapViewId(...)`, `getCopiedJimuLayerViewId(...)` (view duplication).
- **`SnappingUtils`** (capitalized): `getAllSnappingLayerItems(jimuMapViews)`, `getSnappingFeatureSourcesCollection(...)`, `useGetTipsForSnappingOptions(...)`.
- **`featureUtils`**: `convertDataRecordSetToFeatureSet(dsSet): Promise<__esri.FeatureSet>`, `getDefaultSymbol('point'|'polyline'|'polygon')`.
- **`portalUtils`**: `getDefaultWebMap(portalUrl)`, `getDefaultWebMapWithoutCache(portalUrl): Promise<DefaultMapInfo>`, `getItemQueryStringByTypes(itemTypes)`.

## Snippets

```tsx
// Bind + safely use view/layer views
import { React } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'

function MyWidget (props: { useMapWidgetIds: string[] }) {
  const onActiveViewChange = React.useCallback((jmv: JimuMapView) => {
    if (!jmv) return
    jmv.whenJimuMapViewLoaded().then(async () => {
      await jmv.whenAllJimuLayerViewLoaded()
      jmv.watch(() => jmv.view.zoom, (z) => console.log('zoom', z))
    })
  }, [])
  return <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds?.[0]} onActiveViewChange={onActiveViewChange} />
}
```

```ts
// jimuLayerViews -> each layer's DataSource
async function collectLayerDataSources (jmv: JimuMapView) {
  await jmv.whenAllJimuLayerViewLoaded()
  const out = []
  for (const jlv of jmv.getAllJimuLayerViews()) {
    await jmv.whenJimuLayerViewLoaded(jlv.id)
    out.push(jlv.getLayerDataSource() ?? await jlv.createLayerDataSource())
  }
  return out
}
```

## Novel / traps

- **`JimuLayerView.id` = `` `${jimuMapViewId}-${jimuLayerId}` ``**; `jimuLayerId` is the chain of `layer.id`s joined by `-`. Never treat a plain `layer.id` as a JimuLayerView id. Settings layer pickers deal in these ids (convert to raw `layer.id` for config).
- **No `drawGraphicOnMap`, no `createJimuLayerViewByView`** — use `view.graphics`/`addMarkers` and `createJimuLayerView`/`addLayerAndCreateJimuLayerView`.
- **`onViewsCreate`/`onViewsChange`** (singular verb), not `onViewsCreated`.
- **`getAllJimuLayerViews()` may return unloaded entries** — gate on `whenAllJimuLayerViewLoaded()` / `whenJimuLayerViewLoaded(id)`.
- **View groups**: one Map widget owns a `JimuMapViewGroup` (multi-source maps); `isActive` toggles the stacked views; use `onViewGroupCreate` + group methods.
- **Cache vs destroy**: off-screen maps are cached (`isCached()`), not destroyed (`isDestroyed()`).
- **JSAPI 5.x**: map tools are web-component element types (`HTMLArcgisZoomElement`, …); REST types come from `@esri/arcgis-rest-*` (`IFeature`, `ISpatialReference`); selection returns `Array<__esri.Graphic | IFeature>`.
