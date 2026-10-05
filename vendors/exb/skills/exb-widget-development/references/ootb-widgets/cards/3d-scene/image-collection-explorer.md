# OTB Widget: arcgis/image-collection-explorer

Online widget doc: https://developers.arcgis.com/experience-builder/guide/image-collection-explorer-widget/

## Purpose

Search and explore the image items inside an imagery layer's catalog (an ImageryLayer
whose service `capabilities` include `Catalog`). The widget binds to a Map widget,
finds qualifying dynamic imagery layers in the active map/scene, and renders the Esri
`<arcgis-imagery-collection-explorer>` web component (from the internal
`@arcgis/imagery-components` package) to provide attribute/spatial/image-type filtering,
sorting, list settings, image details, zoom-to, and add-to-map. It also exposes each
qualifying layer's data source through a `DataActionList` so other widgets can act on it.

## Source paths inspected

Source root (gitignored build output):
`ArcGISExperienceBuilder/client/dist/widgets/arcgis/image-collection-explorer/`

- `manifest.json`
- `src/config.ts`
- `src/utils.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/header.tsx`
- `src/runtime/components/image-collection-explorer.tsx`
- `src/runtime/components/layer-coach-message.tsx`
- `src/runtime/components/placeholder.tsx`
- `src/setting/setting.tsx`
- `src/setting/components/customize-layer-popper.tsx`
- `src/setting/components/multiple-map-config.tsx`

Not inspected (out of scope): `src/runtime/translations/*`, `src/setting/translations/*`,
`tests/`, and the shipped `dist/imagery-components-assets/` runtime asset bundle.

Note: the requested paths mentioned a `src/utils.ts` under a components folder and
`version-manager.ts` / `src/setting/constants.ts`; the actual widget keeps a single flat
`src/utils.ts` and a single flat `src/config.ts`, and no `version-manager.ts` was present
in the inspected build. UNVERIFIED whether other builds add those files
(`ArcGISExperienceBuilder/client/dist/widgets/arcgis/image-collection-explorer/`).

## Architecture overview

- `src/runtime/widget.tsx` is the orchestrator. It owns all state:
  `activeJimuMapView`, `activeLayer`, `qualifiedLayers`, `actionDataSets`, `isLoading`.
- A `JimuMapViewComponent` bridges the selected Map widget; `onActiveViewChange` waits for
  `whenJimuMapViewLoaded()` then stores the active `JimuMapView`.
- Layer discovery: the widget reads layer view ids (either from config-customized selection
  or all `jimuLayerViews`), loads each layer, then filters with `isQualifiedLayer` to the
  imagery-catalog layers.
- Presentation is split into small components: `Placeholder` (no map selected),
  `LayerCoachMessage` (map selected but no qualifying layer), `Header` (layer picker Select
  plus `DataActionList`), and `ImageCollectionExplorer` (the actual web component wrapper).
- `src/setting/setting.tsx` is the builder panel: Map widget selection, per-map layer
  customization (`MultipleMapConfig` + `CustomizeLayerPopper`), tool/option toggles, and a
  Calcite numeric input for `maxImageItemCountPerPage`.

## Key imports and packages

Runtime `src/runtime/widget.tsx`:
- `Fragment, useEffect, useState` from `react`
- `type AllWidgetProps` from `jimu-core`
- `type JimuMapView, JimuMapViewComponent` from `jimu-arcgis`
- `Loading, LoadingType, Paper` from `jimu-ui`
- local: `IMConfig` from `../config`; `isQualifiedLayer, getActionDataSets` from `../utils`;
  the four `./components/*`

Runtime `src/runtime/components/image-collection-explorer.tsx`:
- `useEffect, useState` from `react`
- `type AllWidgetProps` from `jimu-core`
- `Loading, LoadingType` from `jimu-ui`
- `"calcite-components"` (side-effect import registering Calcite custom elements)
- `defineCustomElements` from `@arcgis/imagery-components/dist/loader` (INTERNAL Esri lib
  that registers the `<arcgis-imagery-collection-explorer>` web component)
- local: `IMConfig` from `../../config`; `getImageryComponentsAssetsPath` from `../../utils`

Runtime `src/runtime/components/header.tsx`:
- `hooks, type DataRecordSet` from `jimu-core`
- `DataActionList, DataActionListStyle, Option, Select` from `jimu-ui`

Runtime `src/runtime/components/layer-coach-message.tsx`:
- `hooks` from `jimu-core`; `InfoOutlined` from `jimu-icons/outlined/suggested/info`

Runtime `src/runtime/components/placeholder.tsx`:
- `hooks` from `jimu-core`; `WidgetPlaceholder` from `jimu-ui`;
  `ImageCollectionExplorerIcon` from `../../../icon.svg`

Utils `src/utils.ts`:
- `DataSourceManager, SupportedJSAPILayerTypes, type ImmutableArray, type DataRecordSet`
  from `jimu-core`
- `MapViewManager, type JimuLayerView, type JimuLayerViews, type JimuMapView`
  from `jimu-arcgis`
- local: `IMCustomizeLayerOptions` from `./config`
- uses `__esri.Layer` / `__esri.ImageryLayer` ambient JSAPI types

Setting `src/setting/setting.tsx`:
- `hooks` from `jimu-core`
- `Switch, defaultMessages as jimuUIMessages, Label, Alert` from `jimu-ui`
- `MapWidgetSelector, SettingRow, SettingSection` from `jimu-ui/advanced/setting-components`
- `CalciteInputNumber` from `calcite-components`
- `type AllWidgetSettingProps` from `jimu-for-builder`
- local: `IMConfig` from `../config`; `isMapWidgetDataSourceEmpty, getJimuMapViewId`
  from `../utils`; `CustomizeLayerPopper`, `MultipleMapConfig`

Setting `src/setting/components/customize-layer-popper.tsx`:
- `hooks` from `jimu-core`; `Switch` from `jimu-ui`
- `JimuLayerViewSelector, SettingRow` from `jimu-ui/advanced/setting-components`

Setting `src/setting/components/multiple-map-config.tsx`:
- `React, type IMState, ReactRedux, DataSourceManager, css, DataSourceStatus, hooks`
  from `jimu-core`
- `MapViewManager` from `jimu-arcgis`
- `defaultMessages as jimuUIMessages` from `jimu-ui`
- `SidePopper` from `jimu-ui/advanced/setting-components`
- `List, type TreeActionDataType, type TreeItemsType, type _TreeItem`
  from `jimu-ui/basic/list-tree`
- `jimu-icons/svg/outlined/...` SVGs

## Reusable patterns found

- JimuMapView binding: single `JimuMapViewComponent` with `useMapWidgetId={useMapWidgetIds?.[0]}`
  and an async `onActiveViewChange` that always calls `await jimuMapView.whenJimuMapViewLoaded()`
  before using the view. Null view resets all layer state.
- Imagery layer filtering: `isQualifiedLayer` checks `layer.type === SupportedJSAPILayerTypes.ImageryLayer`
  then inspects `(layer as __esri.ImageryLayer).sourceJSON.capabilities` (a comma string) for
  `"Catalog"`. This is the gate for which layers the widget can explore.
- Layer-view listeners: the widget registers `addJimuLayerViewCreatedListener` and
  `addJimuLayerViewRemovedListener` (paired removes in cleanup) so the layer picker stays in
  sync as layers are added/removed from the map at runtime.
- Data action integration: `canConsumeDataAction: true` in the manifest plus a manifest
  `excludeDataActions` allowlist-by-exclusion, plus a runtime `DataActionList` fed by
  `getActionDataSets` (builds a `DataRecordSet[]` from the layer's `layerDataSourceId`).
- Multi-map config: `MultipleMapConfig` lists each map data source (map vs scene icon by
  `jimuMapView.view.type === '3d'`) in a `List`, and opens a `SidePopper` hosting
  `CustomizeLayerPopper`, which uses `JimuLayerViewSelector` (multi-select, `hideLayers`)
  to persist per-`jimuMapViewId` selected layer view ids into `config.customizeLayersOptions`.
- Internal web component wrapper: `ImageCollectionExplorer` lazily calls `defineCustomElements`
  with a `resourcesUrl` derived from `context.folderUrl`, gates render on a
  `hasComponentDefined` flag, and maps config booleans to the component's `*Disabled` props.

## Builder vs runtime split

- Runtime (`src/runtime/*`): discovers qualifying layers, renders the imagery explorer web
  component, and surfaces data actions. Reads config booleans and `maxImageItemCountPerPage`;
  reads `customizeLayersOptions` to decide which layer view ids to consider.
- Builder (`src/setting/*`): writes config. Handles Map widget selection
  (`MapWidgetSelector`), warns when the map has no data source (`isMapWidgetDataSourceEmpty`),
  lets the author pick specific layers per map data source (`customizeLayersOptions`), toggles
  tool/option flags, and validates the per-page count (1..1000, resets to 60 on invalid blur).
- Shared code lives in the flat `src/utils.ts` and `src/config.ts`, imported by both sides.

## Lifecycle and cleanup

- `handleActiveViewChange`: resets layer/view state on null; otherwise awaits
  `whenJimuMapViewLoaded()` then sets `activeJimuMapView`.
- `useEffect` on `[activeJimuMapView, config.customizeLayersOptions, activeLayer, qualifiedLayers]`
  adds the two Jimu layer-view listeners and returns a cleanup that removes both with optional
  chaining (`activeJimuMapView?.removeJimuLayerViewCreatedListener(...)`).
- `useEffect` on `[config.customizeLayersOptions, activeJimuMapView?.id]` triggers
  `handleMapLayerChange` (full reload of layer ids, qualify, pick first, load action data).
- `ImageCollectionExplorer` `useEffect` on `[folderUrl]` calls `defineCustomElements` once and
  flips `hasComponentDefined`; there is no explicit un-define on unmount (web component
  registration is process-global).
- Setting: `useEffect` on `[config]` attaches/detaches a native `blur` listener on the Calcite
  numeric input ref to clamp invalid values back to 60.
- `MultipleMapConfig` gates rendering on `isAllDataSourcesReady`, computed from
  `DataSourceStatus.Created` / `CreateError` across the map's `useDataSources`.

## Manifest/config requirements

`manifest.json`:
- `type: "widget"`, `dependency: ["jimu-arcgis"]`, `defaultSize` 400 x 800.
- `properties.canConsumeDataAction: true`, `properties.notShareDynamicModules: true`,
  `properties.showDescription: true`.
- `excludeDataActions`: `arcgis-map.showOnMap`, `arcgis-map.addToMap`, `arcgis-map.showPopup`,
  `arcgis-map.addMarker`, `dataStatistics`, `directions.*`, `edit.*`, `elevation-profile.*`,
  `near-me.*`, `relatedData`, `setFilter`, `table.*`.

`Config` interface (`src/config.ts`):
- booleans: `enableAttributeFilter`, `enableSpatialFilter`, `enableImageTypeFilter`,
  `enableSort`, `enableListSettings`, `enableViewImageDetails`, `enableZoomTo`, `enableAddToMap`
- `maxImageItemCountPerPage: number`
- optional `customizeLayersOptions?: CustomizeLayerOptions`, keyed by `jimuMapViewId` to
  `{ isEnabled: boolean, selectedLayerViewIds: string[] }`
- exported types `IMConfig` and `IMCustomizeLayerOptions` are `ImmutableObject<...>`.

UNVERIFIED: default config values are not in `src/config.ts`; they live in the widget's
`config.json` which was not inspected
(`ArcGISExperienceBuilder/client/dist/widgets/arcgis/image-collection-explorer/config.json`).

## Gotchas

- The map data source must exist. If `isMapWidgetDataSourceEmpty(mapWidgetId)` is true the
  settings panel shows a warning and skips layer customization entirely.
- Only ImageryLayers whose service `capabilities` contain `Catalog` qualify. A plain
  ImageryLayer will not appear even though its `type` matches.
- Layers must be `load()`ed before `isQualifiedLayer` can read `sourceJSON.capabilities`; the
  widget uses `Promise.allSettled` on `layer.load()` before filtering.
- `@arcgis/imagery-components` and `calcite-components` are internal/bundled dependencies; the
  web component assets are served from `${folderUrl}dist/imagery-components-assets/assets` via
  `getImageryComponentsAssetsPath`. Wrong `resourcesUrl` breaks icon/asset loading.
- `maxImageItemCountPerPage` is stored as `number` but the setting temporarily allows `''`
  during editing and clamps invalid values to 60 on blur; range is 1..1000.
- The `DataActionList` only shows when `enableDataAction` is true (an ExB-provided prop), and
  its dataset comes from the layer's `layerDataSourceId`; layers without a data source yield an
  empty action list.
- Manifest `excludeDataActions` uses wildcard entries (`directions.*` etc.), so any matching
  data action id is filtered out even if newly added.

## Useful snippets and functions

Source: `src/utils.ts`
```ts
export const isQualifiedLayer = (layer: __esri.Layer): boolean => {
  const isDynamicImageryLayer = layer?.type === SupportedJSAPILayerTypes.ImageryLayer
  if(!isDynamicImageryLayer) {
    return false
  }

  const { capabilities } = (layer as __esri.ImageryLayer).sourceJSON || {}
  return (
    typeof capabilities === "string" &&
    capabilities
      .split(",")
      .map((c) => c.trim())
      .includes("Catalog")
  )
}
```

Source: `src/utils.ts`
```ts
export const getActionDataSets = async (layer: __esri.Layer, jimuMapView: JimuMapView): Promise<DataRecordSet[]> => {
  if (!layer || !jimuMapView) return []

  await jimuMapView.view.whenLayerView(layer)
  const jimuLyrView = jimuMapView.getJimuLayerViewByAPILayer(layer)

  if (!jimuLyrView?.layerDataSourceId) return []

  const dataSource = DataSourceManager.getInstance().getDataSource(jimuLyrView.layerDataSourceId)
  if (!dataSource) return []

  const dataSets = [{
    dataSource,
    records: [],
    name: dataSource.getLabel?.() ?? layer.title
  }]
  return dataSets
}
```

Source: `src/utils.ts`
```ts
export const getImageryComponentsAssetsPath = (widgetUrl: string): string => {
  return `${widgetUrl}dist/imagery-components-assets/assets`
}
```

Source: `src/runtime/widget.tsx` (active-view bridge + layer-view listeners)
```tsx
const handleActiveViewChange = async (jimuMapView: JimuMapView): Promise<void> => {
  if (!jimuMapView) {
    setActiveLayer(null)
    setQualifiedLayers([])
    setActiveJimuMapView(null)
    return
  }

  await jimuMapView.whenJimuMapViewLoaded()
  setActiveJimuMapView(jimuMapView)
}

useEffect(() => {
  if (activeJimuMapView) {
     activeJimuMapView.addJimuLayerViewCreatedListener(handleLayerViewChange)
     activeJimuMapView.addJimuLayerViewRemovedListener(handleLayerViewChange)
  }
  return () => {
    activeJimuMapView?.removeJimuLayerViewCreatedListener(handleLayerViewChange)
    activeJimuMapView?.removeJimuLayerViewRemovedListener(handleLayerViewChange)
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeJimuMapView, config.customizeLayersOptions, activeLayer, qualifiedLayers])
```

Source: `src/runtime/widget.tsx` (which layer view ids to consider)
```tsx
const getLayerIds = (): string[] => {
  return config?.customizeLayersOptions?.[activeJimuMapView?.id]?.isEnabled ?
      Array.from(config.customizeLayersOptions[activeJimuMapView?.id].selectedLayerViewIds) :
      Object.keys(activeJimuMapView?.jimuLayerViews)
}
```

Source: `src/runtime/components/image-collection-explorer.tsx` (internal web component wrapper)
```tsx
import "calcite-components"
import { defineCustomElements } from "@arcgis/imagery-components/dist/loader"

useEffect(() => {
  defineCustomElements(window, {
    resourcesUrl: getImageryComponentsAssetsPath(folderUrl),
  })
  setHasComponentDefined(true)
}, [folderUrl])

// ...
<arcgis-imagery-collection-explorer
  view={mapView}
  layer={layer}
  hidePanelHeader={true}
  attributeFilterDisabled={!config.enableAttributeFilter}
  spatialFilterDisabled={!config.enableSpatialFilter}
  imageTypeFilterDisabled={!config.enableImageTypeFilter}
  viewImageDetailsDisabled={!config.enableViewImageDetails}
  zoomToDisabled={!config.enableZoomTo}
  addToMapDisabled={!config.enableAddToMap}
  sortDisabled={!config.enableSort}
  listSettingsDisabled={!config.enableListSettings}
  maxImageItemCountPerPage={config.maxImageItemCountPerPage}
/>
```

Source: `src/runtime/components/header.tsx` (layer Select + DataActionList)
```tsx
<Select
    aria-label={translate('selectLayers')}
    size='sm'
    value={layerId}
    useFirstOption={true}
    onChange={onSelectedLayerChange}
    style={{ minWidth: '150px', width: 'fit-content' }}
>
    {layerList.map(({ id: layerId, title }) => (
        <Option key={layerId} value={layerId}>{title}</Option>
    ))}
</Select>
{enableDataAction && <DataActionList
    widgetId={widgetId}
    dataSets={actionDataSets}
    listStyle={DataActionListStyle.Dropdown}
    buttonSize='sm'
/>}
```

Source: `src/setting/components/customize-layer-popper.tsx` (per-map layer selection persisted to config)
```tsx
const handleLayerViewSelectionChange = (jimuLayerViewIds: string[]): void => {
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
    onChange={handleLayerViewSelectionChange}
    hideLayers={shouldHideLayer}
/>
```

Source: `src/setting/components/multiple-map-config.tsx` (map vs scene icon + SidePopper host)
```tsx
const jimuMapView = MapViewManager.getInstance().getJimuMapViewById(jimuMapViewId)
const isWebScene = jimuMapView?.view?.type === '3d'
// ...
itemStateIcon: { icon: isWebScene ? dataSceneOutlined : dataMapOutlined },
```
