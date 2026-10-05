# OTB Widget: arcgis/display-order

Online widget doc: https://developers.arcgis.com/experience-builder/guide/image-display-order-widget/

Manifest label is "Image Display Order". The widget lets a user reorder overlapping images (mosaic dataset footprints) within a single dynamic `ImageryLayer`.

## Purpose
Provides a runtime UI to set the display/mosaic order for overlapping images inside an imagery layer that is shown in a bound Map widget. The heavy lifting (the actual drag-to-reorder list, thumbnails, apply/reset) is delegated to the `<arcgis-imagery-display-order>` web component from the internal `@arcgis/imagery-components` library; this ExB widget is mostly wiring: pick the map, pick a qualifying imagery layer, mount the custom element against that layer, and expose data actions. The settings side lets an author bind a Map widget and optionally restrict which layers are offered (per map view).

## Source paths inspected
Root (gitignored dist): `ArcGISExperienceBuilder/client/dist/widgets/arcgis/display-order/`
- `manifest.json`
- `src/config.ts`
- `src/utils.ts`
- `src/runtime/constants.ts`
- `src/runtime/types.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/header.tsx`
- `src/runtime/components/imagery-display-order.tsx`
- `src/runtime/components/placeholder.tsx`
- `src/runtime/components/tips.tsx`
- `src/runtime/hooks/use-widget-state.ts`
- `src/setting/setting.tsx`
- `src/setting/components/customize-layer-popper.tsx`
- `src/setting/components/multiple-map-config.tsx`
- `src/setting/components/placeholder.tsx` (referenced; not quoted below)

Note: the widget name in source is `display-order`; it is filed here under the `3d-scene` card folder by request, but it is a 2D imagery widget (no 3D/scene dependency in source).

## Architecture overview
Runtime is a functional component driving a small reducer-like state machine via a custom hook:
- `widget.tsx` renders a `JimuMapViewComponent`, then branches on four gates: no map selected -> `Placeholder`; still loading (`status === 'pending'`) -> `Loading`; loaded but no qualifying layers -> `Tips`; otherwise `Header` (layer `Select` + `DataActionList`) plus `ImageryDisplayOrder`.
- `use-widget-state.ts` holds `{ jimuMapView, layerList, layerId, actionDataSets, status, error }` and an async `onAction` dispatcher keyed by `ActionType` (`SET_JIMU_MAP_VIEW`, `SET_LAYER_LIST`, `SET_LAYER_ID`).
- `imagery-display-order.tsx` lazily registers the `@arcgis/imagery-components` custom elements (`defineCustomElements`) with a `resourcesUrl` derived from `context.folderUrl`, then renders `<arcgis-imagery-display-order layer={currentLayer} ... />`.
- `utils.ts` centralizes layer qualification, layer-view enumeration, data-set assembly for data actions, and the "customize layers" config lookups.

Setting is composed of `MapWidgetSelector` -> per-map-view list (`multiple-map-config.tsx`) -> a `SidePopper` panel (`customize-layer-popper.tsx`) that toggles layer customization and picks specific layer views with `JimuLayerViewSelector`.

## Key imports and packages
Grouped by source file (import -> package):

Runtime `widget.tsx`:
- `React`, `AllWidgetProps` -> `jimu-core`
- `JimuMapViewComponent`, `JimuMapView` -> `jimu-arcgis`
- `Loading`, `LoadingType`, `Paper` -> `jimu-ui`
- `IMConfig` -> `../config`; `getInCustomizedLayerViewIds` -> `../utils`
- local: `Placeholder`, `Tips`, `Header`, `ImageryDisplayOrder`, `ActionType`, `useWidgetState`

Runtime `components/imagery-display-order.tsx`:
- `React`, `AllWidgetProps` -> `jimu-core`
- `Loading`, `LoadingType` -> `jimu-ui`
- `'calcite-components'` -> side-effect import (Calcite custom elements)
- `defineCustomElements` -> `@arcgis/imagery-components/dist/loader` (INTERNAL Esri imagery web-component lib; the loader registers `<arcgis-imagery-display-order>` etc.)
- `getImageryComponentsAssetsPath` -> `../../utils`

Runtime `components/header.tsx`:
- `React`, `hooks`, `DataRecordSet` -> `jimu-core`
- `DataActionList`, `DataActionListStyle`, `Option`, `Select` -> `jimu-ui`

Runtime `hooks/use-widget-state.ts`:
- `React`, `hooks` -> `jimu-core`
- `getActionDataSets`, `getLayerList` -> `../../utils`

Runtime `components/tips.tsx` / `placeholder.tsx`:
- `React`, `hooks` -> `jimu-core`; `WidgetPlaceholder` -> `jimu-ui`; `InfoOutlined` -> `jimu-icons/outlined/suggested/info`

`utils.ts`:
- `DataSourceManager`, `SupportedJSAPILayerTypes`, `DataRecordSet`, `ImmutableArray` -> `jimu-core`
- `MapViewManager`, `JimuMapView`, `JimuLayerViews`, `JimuLayerView` -> `jimu-arcgis`

Setting `setting.tsx`:
- `React`, `jsx`, `hooks` -> `jimu-core` (uses `/** @jsx jsx */` pragma)
- `defaultMessages as jimuUIMessages`, `Alert` -> `jimu-ui`
- `MapWidgetSelector`, `SettingRow`, `SettingSection` -> `jimu-ui/advanced/setting-components`
- `AllWidgetSettingProps` -> `jimu-for-builder`

Setting `components/customize-layer-popper.tsx`:
- `Switch` -> `jimu-ui`; `JimuLayerViewSelector`, `SettingRow` -> `jimu-ui/advanced/setting-components`

Setting `components/multiple-map-config.tsx`:
- `IMState`, `React`, `ReactRedux`, `DataSourceManager`, `jsx`, `css`, `DataSourceStatus`, `hooks` -> `jimu-core`
- `MapViewManager` -> `jimu-arcgis`
- `SidePopper` -> `jimu-ui/advanced/setting-components`
- `List`, `TreeActionDataType`, `TreeItemsType`, `_TreeItem` -> `jimu-ui/basic/list-tree`
- icons -> `jimu-icons/svg/outlined/gis/data-map.svg`, `.../data-scene.svg`, `jimu-icons/svg/outlined/application/setting.svg`

## Reusable patterns found
- JimuMapView binding: single `JimuMapViewComponent` with `useMapWidgetId={useMapWidgetIds?.[0]}` and `onActiveViewChange` dispatching a state action. This is the standard "one active map view" pattern.
- Imagery display-order control via web component: rather than reimplementing the reorder UI, mount `<arcgis-imagery-display-order layer={currentLayer} panelHeading="" hideButtons={true} />` and hand it a live `__esri.ImageryLayer`.
- `@arcgis/imagery-components` custom-element loader: `defineCustomElements(window, { resourcesUrl })` is called once in a `useEffect`, gated by a `hasComponentDefined` state flag so the element only renders after registration. `resourcesUrl` is computed from the widget's own `context.folderUrl` (see `getImageryComponentsAssetsPath`).
- `use-widget-state` custom hook: encapsulates `useState` + an async `onAction(action)` switch keyed by an `ActionType` enum. Acts like a mini reducer that can run async work (layer loading, data-set building) before `setState`. Reusable shape for "widget needs derived async state on map/layer changes".
- DataActionList: `Header` renders `<DataActionList widgetId dataSets={actionDataSets} listStyle={DataActionListStyle.Dropdown} buttonSize='sm' />`; data sets are built in `getActionDataSets` from the selected layer's `JimuLayerView` -> `layerDataSourceId` -> `DataSourceManager`.
- Multi-map config: setting enumerates the map widget's `useDataSources` from `state.appStateInBuilder`, renders a `List` (list-tree) of map views (2D vs 3D icon), and opens a `SidePopper` per view for per-view layer customization.

## Builder vs runtime split
- Runtime (`src/runtime/*`): reads only `config.customizeLayersOptions`, resolves the active `JimuMapView`, builds the qualifying layer list, and mounts the imagery web component. No config writes.
- Builder/setting (`src/setting/*`): writes config. `customize-layer-popper.tsx` mutates config with `config.setIn(['customizeLayersOptions', jimuMapViewId], { isEnabled, selectedLayerViewIds })` and calls `onSettingChange`. Map widget binding is saved via `onSettingChange({ id, useMapWidgetIds })`.
- Bridge key: `jimuMapViewId` is `` `${mapWidgetId}-${dataSourceId}` `` (`getJimuMapViewId`). Both sides key `customizeLayersOptions` by this id, so runtime can look up the author's per-view selection.

## Lifecycle and cleanup
- `widget.tsx` adds/removes JimuLayerView listeners in a `useEffect`, returning a cleanup that removes them:
  - `jimuMapView.addJimuLayerViewCreatedListener(handleLayerListChange)` / `addJimuLayerViewRemovedListener(...)`
  - cleanup: `jimuMapView?.removeJimuLayerViewCreatedListener(...)` / `removeJimuLayerViewRemovedListener(...)`
- A second `useEffect` re-runs `handleLayerListChange` when `customizedLayerViewIds` changes (author edits the allowed-layer set).
- `imagery-display-order.tsx` calls `defineCustomElements` in a `useEffect` keyed on `folderUrl`; there is no explicit teardown for the custom element (registration is process-global and idempotent-safe by the loader).
- Async work in `use-widget-state.onAction` sets `status: 'pending'` before awaiting and resolves to `'resolved'`/`'rejected'`; errors fall back to the translated `unableToGetLayers` message. Note: `setState` after await is not guarded against unmount here (UNVERIFIED whether this can warn on rapid map switching).

## Manifest/config requirements
From `manifest.json`:
- `"dependency": ["jimu-arcgis"]` (required to use `JimuMapViewComponent` / `MapViewManager`).
- `"properties": { "canConsumeDataAction": true, "notShareDynamicModules": true, "showDescription": true }`.
- `"excludeDataActions"`: excludes map/table/edit/etc. actions (see manifest for full list) so only relevant data actions appear.
- `defaultSize`: `{ width: 358, height: 478 }`.
- No explicit `esModules`/JSAPI module list in the manifest; the imagery web component ships as bundled assets under the widget's own `dist/imagery-components-assets/assets` (loaded at runtime via `resourcesUrl`).

Config shape (`src/config.ts`):
```
interface CustomizeLayerOptions {
  [jimuMapViewId: string]: { isEnabled: boolean; selectedLayerViewIds: string[] }
}
interface Config { customizeLayersOptions?: CustomizeLayerOptions }
type QualifiedLayer = __esri.ImageryLayer
```

## Gotchas
- "Qualifying" layer rule (`isQualifiedLayer`): the layer must be `SupportedJSAPILayerTypes.ImageryLayer` (dynamic imagery) AND have `fields.length > 0`. Tiled imagery / imagery without fields is filtered out; that is why an otherwise-visible imagery layer may not appear.
- The reorder UI is not this widget's code. It is the `@arcgis/imagery-components` `<arcgis-imagery-display-order>` element; behavior/props like `panelHeading`, `hideButtons` are owned by that internal lib.
- `resourcesUrl` correctness depends on `context.folderUrl`; `getImageryComponentsAssetsPath` appends `dist/imagery-components-assets/assets`. If assets are not deployed alongside the widget, the custom element fails to load.
- `'calcite-components'` is imported as a bare side-effect module in `imagery-display-order.tsx`; the imagery component depends on Calcite being registered.
- Layer list is loaded with `Promise.allSettled(... layer.load())` before filtering (`getQualifiedLayerViewIds`); unloaded layers must be loaded first or they will be misclassified.
- Setting reads `state.appStateInBuilder` directly (builder-only Redux slice) in `multiple-map-config.tsx`; this component is builder-context only.
- `getJimuMapViewId` builds `` `${widgetId}-${dataSourceId}` `` with defaults of empty string, so an empty data source yields an id like `"-"`; the setting guards this with `isMapWidgetDataSourceEmpty` and shows a warning `Alert` instead.

## Useful snippets and functions

Source: `src/runtime/components/imagery-display-order.tsx`
```tsx
import 'calcite-components'
import { defineCustomElements } from '@arcgis/imagery-components/dist/loader'
import { getImageryComponentsAssetsPath } from '../../utils'

const ImageryDisplayOrder = (props: ImageryDisplayOrderProps) => {
  const { layerId, layerList, context: { folderUrl } } = props
  const [hasComponentDefined, setHasComponentDefined] = React.useState(false)

  React.useEffect(() => {
    defineCustomElements(window, { resourcesUrl: getImageryComponentsAssetsPath(folderUrl) })
    setHasComponentDefined(true)
  }, [folderUrl])

  const currentLayer = layerList.find(({ id }) => id === layerId)
  return (
    <div style={{ flexGrow: 1, overflowY: 'auto', height: 'calc(100%-3rem)' }}>
      {hasComponentDefined
        ? <arcgis-imagery-display-order layer={currentLayer} panelHeading="" hideButtons={true} />
        : <Loading type={LoadingType.Secondary} />}
    </div>
  )
}
```

Source: `src/utils.ts` (asset path + qualification)
```ts
export const getImageryComponentsAssetsPath = (widgetUrl: string): string => {
  return `${widgetUrl}dist/imagery-components-assets/assets`
}

export const isQualifiedLayer = (layer: __esri.Layer): boolean => {
  const { type } = layer
  const isDynamicImageryLayer = type === SupportedJSAPILayerTypes.ImageryLayer
  if (!isDynamicImageryLayer) {
    return false
  }
  const imageryLayer = layer as __esri.ImageryLayer
  return imageryLayer.fields && imageryLayer.fields.length > 0
}
```

Source: `src/utils.ts` (data-action data sets from a JimuLayerView)
```ts
export const getActionDataSets = async (layer: __esri.ImageryLayer, jimuMapView: JimuMapView): Promise<DataRecordSet[]> => {
  if (!layer || !jimuMapView) {
    return []
  }
  await jimuMapView.view.whenLayerView(layer)
  const jimuLyrView = jimuMapView.getJimuLayerViewByAPILayer(layer)
  if (!jimuLyrView?.layerDataSourceId) {
    return []
  }
  const dataSource = DataSourceManager.getInstance().getDataSource(jimuLyrView.layerDataSourceId)
  if (!dataSource) {
    return []
  }
  return [{
    dataSource,
    records: [],
    name: dataSource.getLabel?.() ?? layer.title
  }]
}
```

Source: `src/runtime/widget.tsx` (map view listeners + cleanup)
```tsx
React.useEffect(() => {
  if (jimuMapView) {
    jimuMapView.addJimuLayerViewCreatedListener(handleLayerListChange)
    jimuMapView.addJimuLayerViewRemovedListener(handleLayerListChange)
  }
  return () => {
    jimuMapView?.removeJimuLayerViewCreatedListener(handleLayerListChange)
    jimuMapView?.removeJimuLayerViewRemovedListener(handleLayerListChange)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [jimuMapView, customizedLayerViewIds])
```

Source: `src/runtime/hooks/use-widget-state.ts` (async action dispatcher shape)
```ts
const onAction = async (action: WidgetAction) => {
  switch (action.type) {
    case ActionType.SET_JIMU_MAP_VIEW: {
      const { jimuMapView: updatedJimuMapView, config: { customizeLayersOptions } } = action.payload
      setState((s) => ({ ...s, status: 'pending', error: null }))
      try {
        const updatedLayerList = await getLayerList(updatedJimuMapView?.id, customizeLayersOptions)
        const updatedLayerId = updatedLayerList?.[0]?.id ?? ''
        const layer = updatedLayerList.find(({ id }) => id === updatedLayerId)
        const updatedActionDataSets = await getActionDataSets(layer, updatedJimuMapView)
        setState((s) => ({ ...s, jimuMapView: updatedJimuMapView, layerList: updatedLayerList, layerId: updatedLayerId, actionDataSets: updatedActionDataSets, status: 'resolved', error: null }))
      } catch (err) {
        setState((s) => ({ ...s, status: 'rejected', error: err instanceof Error ? err.message : translate('unableToGetLayers') }))
      }
      break
    }
    // SET_LAYER_LIST, SET_LAYER_ID ...
  }
}
```

Source: `src/setting/components/customize-layer-popper.tsx` (config write via setIn + JimuLayerViewSelector)
```tsx
const onLayerViewSelectionChange = (jimuLayerViewIds: string[]) => {
  setSelectedLayerViewIds(jimuLayerViewIds)
  onSettingChange({
    id,
    config: config.setIn(['customizeLayersOptions', jimuMapViewId], {
      isEnabled: true,
      selectedLayerViewIds: jimuLayerViewIds
    })
  })
}
// ...
<JimuLayerViewSelector
  isMultiSelection={true}
  jimuMapViewId={jimuMapViewId}
  selectedValues={selectedLayerViewIds}
  onChange={onLayerViewSelectionChange}
  hideLayers={shouldHideLayer}
/>
```

Source: `src/setting/components/multiple-map-config.tsx` (2D vs 3D map view icon + per-view SidePopper)
```tsx
const jimuMapView = MapViewManager.getInstance().getJimuMapViewById(jimuMapViewId)
const isWebScene = jimuMapView?.view?.type === '3d'
item = {
  itemStateTitle: dataSourceLabel,
  itemKey: dataSourceId,
  itemStateIcon: { icon: isWebScene ? dataSceneOutlined : dataMapOutlined },
  itemStateCommands: [{ label: translate('selectLayers'), iconProps: () => ({ icon: settingOutlined }) }]
}
```

Source: `src/utils.ts` (JimuMapView id bridge key)
```ts
export const getJimuMapViewId = (widgetId: string = '', dataSourceId: string = ''): string => {
  return `${widgetId}-${dataSourceId}`
}
```
