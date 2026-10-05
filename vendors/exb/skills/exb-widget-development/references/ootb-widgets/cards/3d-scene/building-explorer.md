# OTB Widget: arcgis/building-explorer

Online widget doc: https://developers.arcgis.com/experience-builder/guide/building-explorer-widget/

## Purpose
The Building Explorer widget lets an app user explore `BuildingSceneLayer`s in a 3D web scene by filtering the building along three axes: level (floor), building phase (construction phase), and disciplines/categories (architectural, structural, mechanical, etc.). It is a thin ExB wrapper around the ArcGIS Maps SDK `esri/widgets/BuildingExplorer` widget: the OTB widget owns map binding, a building-layer picker, config-driven visible tool toggles, optional zoom-to-layer on selection, and optional propagation of the SDK filter down to Experience Builder data sources (so other widgets can honor the same filter). All real level/phase/discipline UI is rendered by the SDK widget itself into a DOM container the ExB widget provides.

The widget only works against a 3D `SceneView`. When the active map view is 2D (or no map is bound), the runtime shows a placeholder instead of the panel.

## Source paths inspected
Root: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/building-explorer/` (gitignored; read with includeIgnoredFiles). `dist/**`, `tests/**`, and all `translations/*.js` were ignored.

Read in full:
- `manifest.json`
- `config.json` (baked default config)
- `src/config.ts`
- `src/common/utils.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/main-panel/index.tsx`
- `src/runtime/components/main-panel/building-explorer.ts` (the SDK-widget wrapper hook)
- `src/runtime/components/main-panel/status-tips.tsx`
- `src/runtime/components/main-panel/ds-helpers/ds-utils.ts`
- `src/runtime/components/main-panel/ds-helpers/cache-utils.ts`
- `src/runtime/components/main-panel/ds-helpers/layers-utils.ts`
- `src/runtime/components/main-panel/layer-selectors/index.tsx`
- `src/runtime/components/main-panel/layer-selectors/single-mode-selector.tsx`
- `src/setting/setting.tsx`
- `src/setting/components/map-settings.tsx`
- `src/setting/components/general-setting.tsx`
- `src/tools/app-config-operations.ts`

Listed / not read in depth (contents UNVERIFIED beyond existence):
- `src/runtime/components/main-panel/style.tsx`, `src/runtime/components/place-holder/{index.tsx,style.tsx}`
- `src/setting/style.ts`, `src/setting/components/style.tsx`
- `src/setting/components/calculate-for-setting.tsx` (imported but commented out in `setting.tsx` and `map-settings.tsx`; the level/phase min/max `ViewModelResult` it would compute is passed as `null` at runtime -> see Gotchas)
- `src/setting/components/sub-components/level-setting.tsx`, `src/setting/components/sub-components/phase-setting.tsx` (rendered by `map-settings.tsx`; only their props wiring was verified from the parent)

## Architecture overview
Runtime composition, top to bottom:

1. `runtime/widget.tsx` -> functional `Widget`. Owns the active `JimuMapView` state. It renders a `JimuMapViewComponent` for `useMapWidgetIds[0]`; `onActiveViewChange` only accepts the view when `activeView.view.type === '3d'` (after `await activeView.whenJimuMapViewLoaded()`), otherwise it stores `null`. It shows `PlaceHolder` when there is no map or the view is not 3D, and shows `MainPanel` otherwise. Note the panel div uses `d-flex`/`d-none` toggling rather than unmounting.

2. `main-panel/index.tsx` -> `MainPanel` (`React.memo`). Reads the per-map config via `props.config.mapSettings[jimuMapView.dataSourceId]`. Holds `selectedLayerViewIdsState` (the currently chosen building layer view ids). Renders:
   - `LayerSelectors` (the building-layer picker) - only when building layers exist.
   - `StatusTips` - shown when no layer is selected, no building layers exist, or all three tools are disabled.
   - a raw `<div ref={domContainerRef}>` that is the mount point for the SDK widget.
   It delegates all SDK-widget lifecycle to the `useBuildingExplorer` hook and drives updates through refs (`updateWidgetRef`, `clearToInitRef`).

3. `main-panel/building-explorer.ts` -> `useBuildingExplorer` hook. This is the SDK bridge. It creates `new BuildingExplorer(options)` with an explicit `new BuildingExplorerViewModel(...)`, mounts it into the container dom, registers `reactiveUtils` watchers on the view model's `level`/`phase` state, maps selected layer view ids to `BuildingSceneLayer`s, toggles overview/fullModel sublayer visibility, and (optionally) pushes the resulting solid filter expression onto ExB data sources.

4. `ds-helpers/*` - support modules: `layers-utils.ts` (overview vs full-model sublayer resolution + visibility mode), `cache-utils.ts` (per-ds level/phase state cache; much of the restore path is commented out), `ds-utils.ts` (extract solid filter from the VM and call `updateQueryParams` on `BuildingComponentSubLayer` data sources).

Settings composition:
- `setting/setting.tsx` -> `Setting`. `MapWidgetSelector` + `JimuMapViewComponent` (again gated to 3D), then `MapSettings` and `GeneralSetting`. Writes back via `props.config.setIn(['mapSettings'], ...)` and `setIn(['general'], ...)`.
- `setting/components/map-settings.tsx` -> `MapSettings`. Uses `MultipleJimuMapConfig` to present one entry per map data source; each is validated (`isDataSourceValid`) to be a 3D map that actually has building layers. The per-map side popper hosts: the on-load layer `Select`, `LevelSetting`, `PhaseSetting`, and a disciplines/categories `Switch`.
- `setting/components/general-setting.tsx` -> two switches: `zoomToLayer` and `applyFilterOnDs`.

## Key imports and packages
Grouped by file; SDK (`esri/*`) and jimu specifics called out.

`src/common/utils.ts`:
- `jimu-core`: `type ImmutableArray`
- `jimu-arcgis`: `MapViewManager`, `type JimuLayerView`, `type JimuMapView`
- `esri/core/Collection` (default import `Collection`) - builds `__esri.Collection<__esri.BuildingSceneLayer>`

`src/runtime/widget.tsx`:
- `jimu-core`: `React, jsx, css, type AllWidgetProps`
- `jimu-arcgis`: `type JimuMapView, JimuMapViewComponent`
- `jimu-ui`: `Paper`

`src/runtime/components/main-panel/index.tsx`:
- `jimu-core`: `React, jsx`
- `jimu-theme`: `useTheme`
- `jimu-arcgis`: `type JimuMapView`
- local: `useBuildingExplorer` + `UpdateReason`, `getBuildingLayerViews`

`src/runtime/components/main-panel/building-explorer.ts`:
- `jimu-core`: `React, type ImmutableObject`
- `lodash-es`: `isEqual`
- `jimu-arcgis`: `type JimuMapView`
- `esri/widgets/BuildingExplorer` (default import `BuildingExplorer`)
- `esri/widgets/BuildingExplorer/BuildingExplorerViewModel` (default import)
- `esri/core/reactiveUtils` (namespace import `* as reactiveUtils`)

`src/runtime/components/main-panel/ds-helpers/ds-utils.ts`:
- `jimu-arcgis`: `type JimuMapView`
- `jimu-core`: `lodash, type SqlQueryParams, AllDataSourceTypes, type DataSource, type BuildingComponentSubLayerDataSource`

`src/runtime/components/main-panel/ds-helpers/cache-utils.ts`:
- `esri/widgets/BuildingExplorer/BuildingExplorerViewModel` (type only)
- local `LayerMode`

`src/runtime/components/main-panel/ds-helpers/layers-utils.ts`:
- `jimu-arcgis`: `type JimuMapView`
- otherwise pure `__esri.*` typings (`BuildingSceneLayer`, `BuildingComponentSublayer`, `BuildingGroupSublayer`)

`src/runtime/components/main-panel/layer-selectors/index.tsx`:
- `jimu-core`: `React, jsx, type ImmutableObject`
- `jimu-arcgis`: `type JimuMapView, zoomToUtils, type JimuLayerView`
- `lodash-es`: `isEqual`

`src/runtime/components/main-panel/layer-selectors/single-mode-selector.tsx`:
- `jimu-core`: `React, jsx, hooks, css`
- `jimu-arcgis`: `type JimuLayerView`
- `jimu-ui`: `Dropdown, DropdownMenu, DropdownButton, DropdownItem, defaultMessages as jimuUIMessages`

`src/runtime/components/main-panel/status-tips.tsx`:
- `jimu-icons/outlined/suggested/warning` (`WarningOutlined`), `.../suggested/info` (`InfoOutlined`), `jimu-icons/outlined/brand/widget-building-explorer` (`WidgetBuildingExplorerOutlined`)

`src/setting/setting.tsx`:
- `jimu-core`: `jsx, React, classNames, hooks, type ImmutableObject`
- `jimu-arcgis`: `JimuMapViewComponent, type JimuMapView`
- `jimu-theme`: `useTheme`
- `jimu-for-builder`: `type AllWidgetSettingProps`
- `jimu-ui/advanced/setting-components`: `MapWidgetSelector, SettingRow, SettingSection`
- `jimu-icons/outlined/application/click` (`ClickOutlined`)

`src/setting/components/map-settings.tsx`:
- `jimu-core`: `React, jsx, hooks, Immutable, type ImmutableObject, type ImmutableArray`
- `jimu-arcgis`: `type JimuMapView, type JimuLayerView`
- `jimu-ui`: `Alert, Switch, Select, Option, defaultMessages as jimuUIMessages`
- `jimu-ui/advanced/setting-components`: `SettingRow, SettingSection, MultipleJimuMapConfig, type MultipleJimuMapValidateResult`

`src/tools/app-config-operations.ts`:
- `jimu-core`: `Immutable, type DuplicateContext, type extensionSpec, type IMAppConfig`
- `jimu-arcgis`: `mapViewUtils` (uses `mapViewUtils.getCopiedJimuLayerViewId`)

## Reusable patterns found
1. SceneView-only JimuMapView gate. Both runtime and setting reuse the same `onActiveMapViewChange` shape: accept the view only when `activeView.view.type === '3d'`, `await activeView.whenJimuMapViewLoaded()` first, else store `null`. `common/utils.isMapContainWebScene` and `map-settings._is3DMap` provide the same check from a `useMapWidgetIds` array.

2. Wrapping an SDK widget in a React hook. `useBuildingExplorer` is a clean template for hosting any `esri/widgets/*` widget inside ExB: keep the instance in a `widgetRef`, keep the latest props in a `propsRef` (so `reactiveUtils` callbacks read fresh values), build an `options` object with an explicit `viewModel`, `new BuildingExplorer(options)`, and gate follow-up work behind `widgetRef.current.when(...)`.

3. Manual dom container mount. The SDK widget is not rendered by React; `main-panel/index.tsx` creates a plain `<div>` (`createContainerDom`) and passes it as `options.container`. Destroy path clears `domContainerRef.current.innerHTML` and calls `widgetRef.current.destroy()`.

4. Building-layer view cache utilities (`common/utils.ts`): `getBuildingLayerViews` filters `getAllJimuLayerViews()` to `type === 'building-scene'`; `getBuildingSceneLayersByLayerViewIds` returns an `esri/core/Collection` of the underlying `BuildingSceneLayer`s; `filterRuntimeAddedLayerViews` drops `fromRuntime` layers for the setting picker.

5. Overview vs full-model sublayer management (`layers-utils.ts`): resolve the `Overview` building-component sublayer and the `FullModel` building-group sublayer by `modelName`, then toggle their `visible` flags to switch a layer between `'overview'` and `'fullModel'` display. Selected layers go `fullModel`; deselected layers are restored to `overview`.

6. Push SDK filter to ExB data sources (`ds-utils.ts`): read the VM's solid filter expression per layer, resolve the layer's `BuildingComponentSubLayer` child data sources, and call `updateQueryParams({ where }, widgetId)` so other widgets/queries honor the same filter. Debounced with `lodash.debounce(..., 200)`.

7. Add/remove-data resilience: both `MainPanel` and `LayerSelectors` register `addJimuLayerViewCreatedListener` / `addJimuLayerViewRemovedListener` to recompute the building-layer set at runtime (issue #19024). If the currently selected layer is removed, the selector resets to None (`['']`).

8. `appConfigOperations` extension for copy: `afterWidgetCopied` remaps each stored `layersOnLoad` JimuLayerView id to the copied id via `mapViewUtils.getCopiedJimuLayerViewId(contentMap, layerViewId)`.

## Builder vs runtime split
- Builder (`src/setting/**`): chooses the map widget, and per map data source configures the on-load layer (`layersOnLoad`), the three visible-element toggles (`enableLevel`, `enablePhase`, `enableCtegories`), and the two general switches (`zoomToLayer`, `applyFilterOnDs`). Config is keyed by map data source id under `config.mapSettings[dsId]`. `MultipleJimuMapConfig` validates each candidate map (3D + has building layers) and hosts the per-map side popper.
- Runtime (`src/runtime/**`): binds the active 3D `JimuMapView`, renders the building-layer picker, instantiates the SDK `BuildingExplorer`, applies the configured `visibleElements`, manages overview/fullModel visibility, and optionally applies the filter to data sources. Runtime reads `mapSettings[jimuMapView.dataSourceId]`; if there is no entry the defaults `?? true` apply for the three toggles.
- Shared: `src/config.ts` types, `src/common/utils.ts` layer helpers, and the `LayerMode` enum (only `Single` is active; `Multiple` is commented out throughout).

## Lifecycle and cleanup
- Create: `MainPanel`'s effect on `jimuMapView.dataSourceId` calls `updateWidgetRef.current(createContainerDom(), UpdateReason.SwitchMap)` (does not clear filters). A separate effect on `mapConfig.layerMode`/`mapConfig.layersOnLoad` calls `clearToInit()` then re-inits with `UpdateReason.Init` (skipped the first render via `jimuMapViewChangedFlagRef`).
- Inside the hook: `_updateWidget` builds `options` (`container`, `view` cast to `__esri.SceneView`, `viewModel`, `layers: []`, plus `visibleElements`), assigns a fresh `BuildingExplorerViewModel`, `new BuildingExplorer(options)`, registers listeners, then `_updateVMParams`, then a `when()` callback that runs `_updateVMParams(..., UpdateReason.Init)`.
- Watchers: `reactiveUtils.whenOnce(() => vm.state === 'ready')` guards listener registration; `reactiveUtils.watch` on level/phase `[state, value, enabled/allowedValues]` re-saves state and re-applies the filter.
- Destroy: `MainPanel.destroyWidget` (run from an unmount effect) calls `destroyBuildingExplorerWidget()` (currently a no-op ref), then `widgetRef.current.destroy()`, nulls the ref, and empties the container. UNVERIFIED: the hook's exported `destroyBuildingExplorerWidget` (`_destroyWidget`) is an empty callback, so SDK teardown relies on the component-level `widgetRef.current.destroy()` in `index.tsx`.
- Listener cleanup: the add/remove-data effects return a cleanup that removes the created/removed listeners. Note a likely bug: the removed-listener cleanup passes `jimuLayerViewCreatedListener` to `removeJimuLayerViewRemovedListener` in `index.tsx` (see Gotchas).

## Manifest/config requirements
From `manifest.json`:
- `type: widget`, `dependency: jimu-arcgis`, `settingDependency: jimu-arcgis`.
- `properties.hasSettingPage: true`, `properties.coverLayoutBackground: true`.
- `defaultSize: { width: 300, height: 465 }`.
- Extension: `appConfigOperations` at point `APP_CONFIG_OPERATIONS`, uri `tools/app-config-operations`.
- No explicit `esri/*` module list in the manifest; SDK modules (`esri/widgets/BuildingExplorer`, `BuildingExplorerViewModel`, `esri/core/Collection`, `esri/core/reactiveUtils`) are imported directly via the `esri/*` alias.

Config shape (`src/config.ts` + baked `config.json`):
- `config = { mapSettings: MapsSettings; general: GeneralConfig }`.
- `MapsSettings = { [jimuMapViewId? / dsId]: MapSetting }` (keyed by map data source id at runtime).
- `MapSetting = { layerMode?, layersOnLoad?: ImmutableArray<string>, enableLevel?, enablePhase?, enableCtegories? }`.
- `GeneralConfig = { zoomToLayer: boolean; applyFilterOnDs: boolean }`.
- `LayerMode` enum: only `Single = 'SINGLE'` (Multiple commented out).
- Baked defaults: `mapSettings: {}`, `general: { zoomToLayer: true, applyFilterOnDs: false }`.

## Gotchas
- 3D only. A 2D `MapView` yields a placeholder; nothing renders. Both runtime and setting hard-gate on `view.type === '3d'`.
- `enableCtegories` is a misspelling of "categories" and is the actual config key/prop name everywhere (interface, setting handler, `visibleElements.disciplines`). Do not "fix" it.
- Default-on toggles. When a map has no `mapSettings[dsId]` entry, `enableLevel/enablePhase/enableCtegories` fall back to `true` (via `?? true` in `_getVisibleElementsConfig` and `getEnable`). The "no tool" tips branch in `index.tsx` also treats `undefined` as enabled.
- `viewModelResult` is always `null` at runtime and in settings. `calculate-for-setting.tsx` (which would compute level/phase min/max/allowed values) is imported but commented out; `useState<ViewModelResult>(null)` is never updated. So `LevelSetting`/`PhaseSetting` min/max-driven UI and `isShowPhaseSetting` operate on `null` -> UNVERIFIED behavior for numeric level/phase range configuration (`level`/`phase` NumericRange fields on `MapSetting` are also commented out).
- `LayerMode.Multiple` is entirely disabled (commented out in config, layer-selectors, cache-utils, building-explorer). Only single-layer selection works. Cache-utils' `_getLayerId` still references `(LayerMode as any).Multiple`.
- The SDK widget is mounted into a manually created dom node, not via JSX. React only sees the empty container `<div ref={domContainerRef}>`; do not try to render SDK children through React.
- Likely listener-cleanup bug (`runtime/components/main-panel/index.tsx`): the effect calls `removeJimuLayerViewRemovedListener(jimuLayerViewCreatedListener)` instead of the removed listener, so the removed-listener handler may not be detached. Verify before copying this pattern.
- Filter propagation is opt-in: `applyFilterOnDs` defaults to `false`. When off, `_applyFilterOnDs` returns immediately and no `updateQueryParams` is issued.
- `destroyBuildingExplorerWidget` exported from the hook is an empty function; real SDK teardown is the `widgetRef.current.destroy()` in the component. Keep both if refactoring.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - accept only a loaded 3D view.
```tsx
const onActiveMapViewChange = React.useCallback(async (activeView) => {
  if (activeView?.view?.type === '3d') {
    await activeView.whenJimuMapViewLoaded()
    setActivatedJimuMapViewState(activeView)
  } else {
    setActivatedJimuMapViewState(null)
  }
}, [])
```

Source: `src/common/utils.ts` - collect building-scene layer views and their SDK layers.
```ts
export function getBuildingLayerViews (jimuMapView: JimuMapView): JimuLayerView[] {
  const buildingLayerViews = []
  jimuMapView?.getAllJimuLayerViews()?.forEach((layerView) => {
    if (layerView.type === 'building-scene') {
      buildingLayerViews.push(layerView)
    }
  })
  return buildingLayerViews
}

export function getBuildingSceneLayersByLayerViewIds (layerViewIds: string[], jimuMapView: JimuMapView): __esri.Collection<__esri.BuildingSceneLayer> {
  const allBuildingLayerViews = getBuildingLayerViews(jimuMapView)
  const buildingLayers = new Collection()
  allBuildingLayerViews?.forEach((layerView) => {
    if (layerViewIds?.includes(layerView.id)) {
      buildingLayers.push(layerView.layer)
    }
  })
  return buildingLayers
}
```

Source: `src/runtime/components/main-panel/building-explorer.ts` - instantiate the SDK widget with an explicit view model.
```ts
let options = {
  container: domRef,
  view: propsRef.current.jimuMapView.view as __esri.SceneView,
  viewModel: null,
  layers: []
}
const viewModelOptions: __esri.BuildingExplorerViewModelProperties = {
  view: propsRef.current.jimuMapView.view as __esri.SceneView
}
if (propsRef.current.mapConfig) {
  options = Object.assign(options, _getVisibleElementsConfig(propsRef.current.mapConfig))
}
options.viewModel = new BuildingExplorerViewModel(viewModelOptions)
widgetRef.current = new BuildingExplorer(options)
```

Source: `src/runtime/components/main-panel/building-explorer.ts` - map config toggles to SDK `visibleElements` (note default-on and the `enableCtegories` spelling).
```ts
const _getVisibleElementsConfig = (mapConfig: ImmutableObject<MapSetting>) => {
  return {
    visibleElements: {
      levels: (mapConfig?.enableLevel ?? true),
      phases: (mapConfig?.enablePhase ?? true),
      disciplines: mapConfig?.enableCtegories ?? true
    }
  }
}
```

Source: `src/runtime/components/main-panel/building-explorer.ts` - react to view-model readiness and level/phase changes.
```ts
reactiveUtils.whenOnce(() => (vm.state === 'ready')).then(() => {
  if (reason === UpdateReason.Init || (_widgetStatesRef.current === null)) {
    _recordInit()
    applyFilter()
  }
  reactiveUtils.watch(() => ([(vm.level as any).state, vm.level.value, vm.level.enabled, vm.level.allowedValues]),
    ([state, levelValue, enabled, allowedValues]) => {
      if (state === 'ready') {
        enabled ? _saveWidgetStates(UpdateReason.LevelEnabledOn) : _saveWidgetStates(UpdateReason.LevelEnabledOff)
        applyFilter()
      }
    })
})
```

Source: `src/runtime/components/main-panel/ds-helpers/layers-utils.ts` - switch a building layer between overview and full-model display.
```ts
export function setLayersMode (layers: __esri.Collection<__esri.BuildingSceneLayer>, mode: 'fullModel' | 'overview', jimuMapView: JimuMapView) {
  if (!(jimuMapView && !jimuMapView.isDestroyed())) {
    return
  }
  layers?.forEach((layer) => {
    const fullModelVisibility = mode === 'fullModel'
    const fullModelLayer = getFullModel(layer)
    const overviewLayer = getOverview(layer)
    if (fullModelLayer) {
      fullModelLayer.visible = fullModelVisibility
    }
    if (overviewLayer) {
      overviewLayer.visible = !fullModelVisibility
    }
  })
}
```

Source: `src/runtime/components/main-panel/ds-helpers/ds-utils.ts` - extract the SDK solid filter and apply it to building-component data sources (debounced).
```ts
export const applyFilterOnDs = lodash.debounce(_applyFilterOnDs, 200)

function _getFiltersFromLayers (vm: __esri.BuildingExplorerViewModel): Map<string, string> {
  const filtersMap = new Map<string, string>()
  for (const layer of vm.layers) {
    for (const filter of layer.filters) {
      for (const block of filter.filterBlocks) {
        if (block.filterMode.type === 'solid') {
          filtersMap.set(layer.id, block.filterExpression)
        }
      }
    }
  }
  return filtersMap
}
```

Source: `src/runtime/components/main-panel/layer-selectors/index.tsx` - zoom to the selected building layers on selection.
```ts
const _zoomToLayers = React.useCallback((selectedLayerViews: string[]) => {
  const skipZoomToFlag = _cacheLayers(selectedLayerViews)
  if (props.generalConfig.zoomToLayer && !skipZoomToFlag) {
    const layers = getBuildingSceneLayersByLayerViewIds(selectedLayerViews, _jimuMapViewRef?.current)
    const zoomTargets = layers?.toArray()
    if (zoomTargets && zoomTargets.length > 0) {
      zoomToUtils.zoomTo(_jimuMapViewRef?.current?.view, zoomTargets, {})
    }
  }
}, [props.generalConfig.zoomToLayer, _cacheLayers])
```

Source: `src/tools/app-config-operations.ts` - remap stored layer ids when a page/widget is copied.
```ts
const newLayersOnLoad = mapSettingConfig.layersOnLoad.map((layerViewId) => {
  return mapViewUtils.getCopiedJimuLayerViewId(contentMap, layerViewId)
})
mapSettingConfig = mapSettingConfig.setIn(['layersOnLoad'], newLayersOnLoad)
```
