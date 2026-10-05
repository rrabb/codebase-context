# OTB Widget: arcgis/processing-templates

Online widget doc: https://developers.arcgis.com/experience-builder/guide/processing-templates-widget/

> Note: this reference lives under the `cards/3d-scene/` folder for organizational
> reasons, but `processing-templates` is NOT a 3D-scene widget. It works against
> Imagery Layers and Tiled Imagery Layers in either a 2D map or a 3D scene view.
> The setting UI does track whether a connected view is a WebScene (see the
> `isWebScene` icon logic in `multiple-map-config.tsx`), but the widget itself is
> not scene-specific.

## Purpose

Applies a processing (raster function) template to an ArcGIS imagery layer and
performs on-the-fly raster processing. The runtime embeds the Esri imagery web
component `<arcgis-imagery-processing-template>` (from `@arcgis/imagery-components`)
and drives it with the currently selected qualifying layer plus the active portal.

Manifest description (ACTUAL, from manifest.json):
"A widget to apply a processing template to an imagery layer and perform on-the-fly
raster processing."

Only two layer kinds qualify (from `isQualifiedLayer` in `src/utils.ts`):
- `ImageryLayer` (dynamic image service) whose `sourceJSON.allowRasterFunction` is true.
- `ImageryTileLayer` (tiled imagery), always allowed.

## Source paths inspected

Root:
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/processing-templates/manifest.json`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/processing-templates/config.json` (empty object `{}`)

src:
- `src/config.ts`
- `src/utils.ts`
- `src/runtime/constants.ts`
- `src/runtime/types.ts`
- `src/runtime/widget.tsx`
- `src/runtime/hooks/useWidgetState.ts`
- `src/runtime/components/header.tsx`
- `src/runtime/components/imagery-components.ts`
- `src/runtime/components/placeholder.tsx`
- `src/runtime/components/tips.tsx`
- `src/runtime/translations/default.ts`
- `src/setting/setting.tsx`
- `src/setting/components/customize-layer-popper.tsx`
- `src/setting/components/multiple-map-config.tsx`
- `src/setting/components/placeholder.tsx`

Not inspected in detail: the per-locale `translations/*.js` files (39 locales each
for runtime and setting) and the compiled `dist/` output.

## Architecture overview

Runtime (`src/runtime/widget.tsx`):
- A single functional `Widget` component wired to a `JimuMapViewComponent`.
- All non-trivial state lives in the `useWidgetState` reducer-style hook.
- Rendering is a cascading ternary that shows one of four states:
  1. No map widget selected -> `Placeholder`.
  2. Loading (status pending or portal not loaded) -> `Loading`.
  3. Map selected but no qualifying imagery layers -> `Tips`.
  4. Ready -> `Header` (layer `Select` + `DataActionList`) plus the
     `<arcgis-imagery-processing-template>` custom element.

Setting (`src/setting/setting.tsx`):
- `MapWidgetSelector` picks the source map/scene widget.
- For a connected map, `MultipleMapConfig` renders a `List` (tree) of the map's
  data sources; clicking one opens a `SidePopper` containing
  `CustomizeLayerPopper`, which toggles per-view "customize layers" and uses a
  `JimuLayerViewSelector` to choose which layer views are exposed at runtime.
- Empty maps show an `Alert`; no map selected shows a `Placeholder`.

Shared helpers live in `src/utils.ts` (layer qualification, layer-list building,
data-action data sets, customize-layers config accessors).

## Key imports and packages

Grouped by source file (ACTUAL import lines):

`src/runtime/widget.tsx`
- `import { React, type AllWidgetProps } from 'jimu-core'`
- `import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'`
- `import { Loading, LoadingType, Paper } from 'jimu-ui'`
- `import './components/imagery-components'` (side-effect: registers the custom elements)

`src/runtime/hooks/useWidgetState.ts`
- `import { React, hooks } from 'jimu-core'`
- `import { loadArcGISJSAPIModules } from 'jimu-arcgis'`
- Loads `'esri/portal/Portal'` lazily via `loadArcGISJSAPIModules(['esri/portal/Portal'])`.

`src/runtime/components/imagery-components.ts`
- `import 'calcite-components'`
- `import { defineCustomElements } from '@arcgis/imagery-components/dist/loader'`
- `@arcgis/imagery-components` is an INTERNAL Esri web-component library bundled
  with the widget; its assets are served from
  `widgets/arcgis/processing-templates/dist/imagery-components-assets/assets`
  (see `getImageryComponentsAssetsPath` in `src/utils.ts`).

`src/runtime/components/header.tsx`
- `import { React, hooks, type DataRecordSet } from 'jimu-core'`
- `import { DataActionList, DataActionListStyle, Option, Select } from 'jimu-ui'`

`src/runtime/components/placeholder.tsx`
- `import { WidgetPlaceholder } from 'jimu-ui'`
- `import ImageryProcessingTemplateIcon from '../../../icon.svg'`

`src/runtime/components/tips.tsx`
- `import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'`

`src/utils.ts`
- `import { DataSourceManager, SupportedJSAPILayerTypes, urlUtils, type DataRecordSet, type ImmutableArray } from 'jimu-core'`
- `import { MapViewManager, type JimuMapView, type JimuLayerViews, type JimuLayerView } from 'jimu-arcgis'`

`src/setting/setting.tsx`
- `import { React, jsx, hooks } from 'jimu-core'` (with `/** @jsx jsx */` pragma)
- `import { defaultMessages as jimuUIMessages, Alert } from 'jimu-ui'`
- `import { MapWidgetSelector, SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components'`
- `import type { AllWidgetSettingProps } from 'jimu-for-builder'`

`src/setting/components/multiple-map-config.tsx`
- `import { type IMState, React, ReactRedux, DataSourceManager, jsx, css, DataSourceStatus, hooks } from 'jimu-core'`
- `import { MapViewManager } from 'jimu-arcgis'`
- `import { SidePopper } from 'jimu-ui/advanced/setting-components'`
- `import { List, type TreeActionDataType, type TreeItemsType, type _TreeItem } from 'jimu-ui/basic/list-tree'`
- `import dataMapOutlined from 'jimu-icons/svg/outlined/gis/data-map.svg'`
- `import dataSceneOutlined from 'jimu-icons/svg/outlined/gis/data-scene.svg'`
- `import settingOutlined from 'jimu-icons/svg/outlined/application/setting.svg'`

`src/setting/components/customize-layer-popper.tsx`
- `import { Switch } from 'jimu-ui'`
- `import { JimuLayerViewSelector, SettingRow } from 'jimu-ui/advanced/setting-components'`

`src/setting/components/placeholder.tsx`
- `import { React, css, jsx, type IMThemeVariables } from 'jimu-core'`
- `import { useTheme } from 'jimu-theme'`
- `import { ClickOutlined } from 'jimu-icons/outlined/application/click'`

Notes on packages the task asked about:
- `esri/layers` and `esri/request`: NOT directly imported anywhere in this widget's
  source. Layer references come from the map view (`JimuLayerView.layer`) and are
  typed only through the `__esri` global namespace (`__esri.ImageryLayer`,
  `__esri.ImageryTileLayer`, `__esri.Layer`, `__esri.Portal`). (UNVERIFIED whether
  the bundled imagery web components load those internally; not visible in source.)
- `loadArcGISJSAPIModules`: used only to construct `esri/portal/Portal`.
- `MapViewManager` / `JimuLayerView`: used in `src/utils.ts` and the setting's
  `multiple-map-config.tsx` to resolve views and layers.

## Reusable patterns found

- JimuMapView binding: `JimuMapViewComponent` + `onActiveViewChange` in the runtime
  drives a `SET_JIMU_MAP_VIEW` action; the widget also subscribes to
  `addJimuLayerViewCreatedListener` / `addJimuLayerViewRemovedListener` to refresh
  the layer list when layers appear/disappear.
- Imagery raster function templates: rendered by the Esri custom element
  `<arcgis-imagery-processing-template layer={...} portal={...} panelHeading="" hideButtons={true} />`.
- `useWidgetState` reducer hook: a `React.useState` object plus an async `onAction`
  dispatcher with a `switch` over `ActionType`. Each branch sets `status`
  ('idle' | 'pending' | 'resolved' | 'rejected') and an optional `error`. This is a
  hand-rolled reducer (not `useReducer`) because branches are async.
- `@arcgis/imagery-components`: registered once via a side-effect import of
  `imagery-components.ts` which calls `defineCustomElements(window, { resourcesUrl })`.
- DataRecordSet output: `getActionDataSets` builds a `DataRecordSet[]` from the
  selected layer's data source so the `DataActionList` in the header can offer data
  actions on the active imagery layer.
- Multiple-map-config TreeList: `multiple-map-config.tsx` uses `List` from
  `jimu-ui/basic/list-tree` to list a map widget's data sources, with a `SidePopper`
  for per-data-source configuration - a reusable "configure each connected map"
  builder pattern. It also renders a two-item skeleton `List` while data sources load.

## Builder vs runtime split

- Runtime state (selected layer, layer list, portal, action data sets, status) is
  entirely local to `useWidgetState`; nothing is persisted except the config.
- Config is tiny: only `customizeLayersOptions` keyed by `jimuMapViewId`
  (`{ isEnabled, selectedLayerViewIds }`). Shipped `config.json` is `{}` (empty),
  so by default all qualifying layers are shown.
- The builder writes config through `onSettingChange` using seamless-immutable
  `config.setIn(['customizeLayersOptions', jimuMapViewId], {...})` in
  `customize-layer-popper.tsx`.
- `useMapWidgetIds` (the selected map widget) is written via `onSettingChange({ id, useMapWidgetIds })`
  in `setting.tsx`; runtime reads `useMapWidgetIds?.[0]`.
- Shared `src/utils.ts` is imported by both runtime and setting, keeping layer
  qualification logic identical on both sides.

## Lifecycle and cleanup

- On mount, the runtime dispatches `SET_PORTAL` once (empty dep array) to build and
  `load()` an `esri/portal/Portal` from `portalUrl` / `portalSelf`.
- A `useEffect` keyed on `customizedLayerViewIds` re-runs `handleLayerListChange`
  when the configured customize-layer selection changes.
- A `useEffect` keyed on `[jimuMapView, customizedLayerViewIds]` adds the
  JimuLayerView created/removed listeners and returns a cleanup that removes both
  listeners (`removeJimuLayerViewCreatedListener` / `removeJimuLayerViewRemovedListener`).
- In the setting, `multiple-map-config.tsx` gates rendering on `allDataSourcesReady`
  which is derived from `dataSourcesInfo` instance status (`Created` / `CreateError`);
  a skeleton list is shown until then.
- `customize-layer-popper.tsx` reloads selected layer view ids via a `useEffect`
  keyed on `[jimuMapViewId, isCustomized]`.
- No explicit teardown of the `<arcgis-imagery-processing-template>` element or the
  Portal instance is done beyond React unmount. (UNVERIFIED whether the web
  component self-cleans on removal.)

## Manifest/config requirements

From `manifest.json` (ACTUAL):
- `name`: `processing-templates`; `label`: "Processing Templates"; `type`: `widget`.
- `version` / `exbVersion`: `1.20.0`; `author`: Esri.
- `properties`: `canConsumeDataAction: true`, `notShareDynamicModules: true`,
  `showDescription: true`.
- `excludeDataActions`: a large exclusion list (e.g. `arcgis-map.showOnMap`,
  `arcgis-map.addToMap`, `arcgis-map.showPopup`, `arcgis-map.addMarker`,
  `dataStatistics`, `directions.*`, `edit.*`, `elevation-profile.*`, `near-me.*`,
  `relatedData`, `setFilter`, `table.*`).
- `defaultSize`: `{ width: 358, height: 478 }`.
- `dependency`: `["jimu-arcgis"]`.
- `translatedLocales`: 40 locales (en plus 39 others).

Config (`src/config.ts`):
```ts
export interface CustomizeLayerOptions {
  [jimuMapViewId: string]: {
    isEnabled: boolean
    selectedLayerViewIds: string[]
  }
}
export interface Config {
  customizeLayersOptions?: CustomizeLayerOptions
}
export type QualifiedLayer = __esri.ImageryLayer | __esri.ImageryTileLayer
```

## Gotchas

- Only imagery layers qualify. A dynamic `ImageryLayer` is excluded unless its
  `sourceJSON.allowRasterFunction` is true; `ImageryTileLayer` always qualifies.
  The `sourceJSON.allowRasterFunction` access uses a `// @ts-expect-error` because
  it is not in the typings.
- The custom elements are registered by a side-effect import
  (`import './components/imagery-components'`); if that import is dropped, the
  `<arcgis-imagery-processing-template>` element silently fails to upgrade.
- Web-component assets must resolve to
  `widgets/arcgis/processing-templates/dist/imagery-components-assets/assets`
  (built via `getImageryComponentsAssetsPath`, which relies on
  `urlUtils.getFixedRootPath()`); a broken deploy path breaks the imagery UI.
- The layer `Select` uses `useFirstOption`, and the hook defaults `layerId` to the
  first qualifying layer's id, so switching maps resets the active layer.
- `imagery-components.ts` also imports `'calcite-components'`; the widget depends on
  Calcite being available even though no Calcite JSX is used directly here.
- `multiple-map-config.tsx` reaches into `state.appStateInBuilder` via `ReactRedux`
  selectors; this is builder-only state and will be undefined at runtime.
- Empty map data source is detected by `isMapWidgetDataSourceEmpty` (single view with
  no `dataSourceId`); an empty map shows a warning `Alert` and no layer config.

## Useful snippets and functions

Source: `src/utils.ts` - layer qualification
```ts
export const isQualifiedLayer = (layer: __esri.Layer): boolean => {
  const { type } = layer
  const isDynamicImageryLayer = type === SupportedJSAPILayerTypes.ImageryLayer
  const isImageryTileLayer = type === SupportedJSAPILayerTypes.ImageryTileLayer
  // @ts-expect-error
  const isRasterFunctionAllowed = !!layer?.sourceJSON?.allowRasterFunction
  return (isDynamicImageryLayer && isRasterFunctionAllowed) || isImageryTileLayer
}
```

Source: `src/utils.ts` - build DataRecordSet[] for the header's DataActionList
```ts
export const getActionDataSets = async (layer: __esri.Layer, jimuMapView: JimuMapView): Promise<DataRecordSet[]> => {
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
  return [{ dataSource, records: [], name: dataSource.getLabel?.() ?? layer.title }]
}
```

Source: `src/utils.ts` - resolve JimuLayerViews from a map view id, load layers, filter
```ts
export const getQualifiedLayerViewIds = async (jimuMapViewId: string): Promise<string[]> => {
  const layerViews = await getJimuLayerViews(jimuMapViewId)
  const allLayerViewIds = Object.keys(layerViews)
  await Promise.allSettled(allLayerViewIds.map((layerViewId) => layerViews[layerViewId].layer.load()))
  return allLayerViewIds.filter((layerViewId) => isQualifiedLayer(layerViews[layerViewId].layer))
}
```

Source: `src/utils.ts` - imagery web-component asset path
```ts
export const getImageryComponentsAssetsPath = (): string => {
  const rootPath = `${window.location.protocol}//${window.location.host}${urlUtils.getFixedRootPath()}`
  const widgetUrl = `${rootPath}widgets/arcgis/processing-templates/`
  return `${widgetUrl}dist/imagery-components-assets/assets`
}
```

Source: `src/runtime/components/imagery-components.ts` - register custom elements (side-effect import)
```ts
import 'calcite-components'
import { defineCustomElements } from '@arcgis/imagery-components/dist/loader'
import { getImageryComponentsAssetsPath } from '../../utils'

defineCustomElements(window, { resourcesUrl: getImageryComponentsAssetsPath() })
```

Source: `src/runtime/hooks/useWidgetState.ts` - lazy Portal construction in the reducer
```ts
case ActionType.SET_PORTAL: {
  const { portalUrl, portalSelf } = action.payload
  const modules = await loadArcGISJSAPIModules(['esri/portal/Portal'])
  const [Portal] = modules as [typeof __esri.Portal]
  const portal = new Portal({ url: portalUrl, sourceJSON: portalSelf })
  await portal.load()
  setState((currentState) => ({ ...currentState, portal }))
  break
}
```

Source: `src/runtime/widget.tsx` - JimuLayerView listeners with cleanup
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

Source: `src/runtime/widget.tsx` - embedding the imagery processing-template element
```tsx
<arcgis-imagery-processing-template
  layer={currentLayer}
  portal={portal}
  panelHeading=""
  hideButtons={true}
/>
```

Source: `src/setting/components/customize-layer-popper.tsx` - immutable config write
```ts
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
```

Source: `src/setting/components/multiple-map-config.tsx` - WebScene vs map icon per data source
```ts
const jimuMapView = MapViewManager.getInstance().getJimuMapViewById(jimuMapViewId)
const isWebScene = jimuMapView?.view?.type === '3d'
// ...
itemStateIcon: { icon: isWebScene ? dataSceneOutlined : dataMapOutlined },
```
