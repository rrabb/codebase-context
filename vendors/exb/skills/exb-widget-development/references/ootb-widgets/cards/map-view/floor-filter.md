# OTB Widget: arcgis/floor-filter

Online widget doc: https://developers.arcgis.com/experience-builder/guide/floor-filter-widget/

## Purpose
Displays the ArcGIS Maps SDK `FloorFilter` widget for a floor-aware map, letting the user pick a site / facility / level. Beyond the core widget, this OTB implementation adds ExB-specific "data-centric floor awareness": it can push the active floor selection into ExB DataSources (so Table/List/Chart/etc. only show features on the active floor), and it can auto-switch the floor when a single floor-aware feature is selected in another widget. It renders a `WidgetPlaceholder` when the bound map is missing or not floor-aware.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/config.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/ds-filter.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/setting/setting.tsx

(dist/ and any tests/ intentionally not treated as source; source root is gitignored so it was read with ignored-file inclusion.)

## Architecture overview
- `Widget` (src/runtime/widget.tsx) is a class-based `React.PureComponent`. It binds to a Map widget via `JimuMapViewComponent`, and on an active view change it instantiates the core `FloorFilter` widget into a container `<div>`.
- `DsFilter` (src/runtime/ds-filter.ts) is a plain (non-React) helper class owned by the widget instance (`this.dsFilter`). It wires up reactive watchers and Jimu layer-view listeners to translate the core widget's floor selection into ExB DataSource query params (or, for non-DataSource layers, direct `definitionExpression` edits).
- `config.ts` defines `Config` / `IMConfig` (all optional booleans plus a `position` string).
- `setting.tsx` is a class-based `React.PureComponent` settings panel using `MapWidgetSelector`, `SettingSection`, `Checkbox`, `Label`, `Select`.

Data / control flow (runtime):
1. `JimuMapViewComponent.onActiveViewChange` -> `handleActiveViewChange` sets `state.jimuMapView`.
2. `componentDidUpdate` detects the view (or a relevant config prop) changed and calls `loadCoreWidget()`.
3. `loadCoreWidget()` builds a fresh `FloorFilter`, waits (via `reactiveUtils.watch` on `viewModel.filterFeatures`) for level data to load, then calls `this.dsFilter.init(jimuMapView, this, coreWidget)`.
4. `DsFilter.init` sets up watchers/listeners that call `updateDataSources(...)` to filter data by floor and/or `selectedFeaturesChangeListener(...)` to auto-set the floor on feature selection.

## Key imports and packages
Grouped by file. Note the DIRECT `@arcgis/core/*` imports (deep-path, `.js` suffix) and the `esri/widgets/FloorFilter` alias import.

src/runtime/widget.tsx
- `React, type AllWidgetProps, jsx` from `jimu-core`
- `type IMConfig` from `../config`
- `defaultMessages` from `./translations/default`
- `JimuMapViewComponent, type JimuMapView` from `jimu-arcgis`
- `DsFilter` from `./ds-filter`
- `FloorFilter` from `esri/widgets/FloorFilter` (core widget, AMD-style alias import)
- `* as reactiveUtils` from `@arcgis/core/core/reactiveUtils.js` (DIRECT @arcgis/core)
- `{ createTask }` from `@arcgis/core/core/asyncUtils.js` (DIRECT @arcgis/core)
- `{ throwIfAborted }` from `@arcgis/core/core/promiseUtils.js` (DIRECT @arcgis/core; marked `// @ts-expect-error` + `// not public`)
- `{ WidgetPlaceholder }` from `jimu-ui`
- `widgetFloorFilterOutlined` from `jimu-icons/svg/outlined/brand/widget-floor-filter.svg`
- `'./style.css'`

src/runtime/ds-filter.ts
- `type JimuMapView, type JimuLayerView` from `jimu-arcgis`
- `ClauseLogic, ClauseOperator, dataSourceUtils, type DataSource, type QueriableDataSource, type QueryParams` from `jimu-core`
- `* as reactiveUtils` from `@arcgis/core/core/reactiveUtils.js` (DIRECT @arcgis/core)

src/setting/setting.tsx
- `React, jsx` from `jimu-core`
- `Checkbox, Label, Select` from `jimu-ui`
- `MapWidgetSelector, SettingSection` from `jimu-ui/advanced/setting-components`
- `type AllWidgetSettingProps` from `jimu-for-builder`
- `type IMConfig` from `../config`
- `i18n` from `./translations/default`
- `'./style.css'`

src/config.ts
- `type ImmutableObject` from `jimu-core`

Manifest `dependency`: `["jimu-arcgis"]` only.

## Reusable patterns found

### FloorFilter core widget instantiation (into an ExB-owned container)
Instead of relying on the map's `view.ui`, the widget creates its own `<div>` inside a container ref and instantiates `FloorFilter` with `{ container, longNames, view }`. It overrides the private `_getComponentPosition` to return the configured position. See src/runtime/widget.tsx `loadCoreWidget()`.

### Custom DataSource filter (ds-filter.ts / `DsFilter`)
This is the notable reusable pattern: translate a map-widget selection into ExB DataSource queries.
- For layers backed by an ExB DataSource that is `QueriableDataSource`, it calls `dataSource.updateQueryParams(queryParams, widgetId)` with a floor SQL expression built via `dataSourceUtils.createSQLClause` / `createSQLExpression` (using `ClauseOperator.StringOperatorIs`, `StringOperatorIsBlank`, and `ClauseLogic.Or`).
- For floor-aware layers WITHOUT a DataSource, it edits the layer's `definitionExpression` directly (preserving the original in a custom `layer.xtnOrigDefExpr` property so it can be restored/combined).
- Cleans up its query contributions on `clear()` by calling `updateDataSources(..., null, true)`.

### Reactive layer / feature-selection listeners
- `reactiveUtils.watch(() => coreWidget.level, ...)` when "filter by active floor only" is on.
- `reactiveUtils.watch(() => coreWidget.view.floors, ...)` otherwise.
- `jimuMapView.addJimuLayerViewCreatedListener(...)` to filter newly created layer views.
- `jimuMapView.addJimuLayerViewSelectedFeaturesChangeListener(...)` to auto-set the floor when exactly one floor-aware feature is selected (reading the feature's floor field, calling `coreFloorFilterWidget.viewModel.getLevel/getFacility` and optionally `viewModel.goTo(facility)`).

### Class-based widget with explicit lifecycle
Uses `componentDidMount` -> `wasMounted` flag, then a heavily branched `componentDidUpdate` to decide when to rebuild vs. cheaply update the core widget.

### @arcgis/core direct-import style
Mixes the classic `esri/widgets/FloorFilter` alias with modern deep `@arcgis/core/core/*.js` utility imports; uses `// @ts-expect-error` for non-public APIs.

## Builder vs runtime split
- Builder (src/setting/setting.tsx): `MapWidgetSelector` (map binding via `useMapWidgetIds`) plus checkboxes/select that write config keys through `onSettingChange` / `config.set(...)`:
  - `longNames`, `filterDataSources`, `filterByActiveFloorOnly` (disabled unless `filterDataSources`), `autoSetOnFeatureSelection`, `zoomOnAutoSet` (disabled unless `autoSetOnFeatureSelection`), `position` (top-left / top-right / bottom-left / bottom-right).
  - `displayLabel` handler exists but its section is rendered with `style={{ display: 'none' }}` (UNVERIFIED intent - possibly deprecated UI; src/setting/setting.tsx).
- Runtime (src/runtime/widget.tsx): reads `this.props.config.*` and `this.props.useMapWidgetIds?.[0]`, instantiates the core widget, and drives `DsFilter`.

## Lifecycle and cleanup
- `constructor`: creates `this.dsFilter = new DsFilter()` and initial state.
- `componentDidMount`: sets `wasMounted: true` (triggers first `loadCoreWidget` via update).
- `componentDidUpdate`: rebuilds core widget when the view or a rebuild-relevant config prop changes; for `longNames` it just sets `coreWidget.longNames`; for `position` it calls `coreWidget.scheduleRender()`.
- `componentWillUnmount` -> `destroyCoreWidget()`:
  - `this.dsFilter.clear()` (removes handles/listeners and reverts DataSource contributions).
  - `coreWidget.destroy()`, restores `view.floors` to `vwOriginalFloors`.
  - Removes `vwHeightHandle`, `vwWidthHandle`, `gdbVersionHandle` via `clearHandles`.
- `DsFilter.clearHandles()` removes the Jimu layer-view created/selected listeners and the `reactiveUtils.watch` handles.

## Manifest/config requirements
- manifest.json: `type: "widget"`, `dependency: ["jimu-arcgis"]`, `version`/`exbVersion` `1.20.0`, `defaultSize` `{ width:120, height:48, autoWidth:true, autoHeight:true }`.
- config.json defaults: `displayLabel:false`, `filterDataSources:false`, `filterByActiveFloorOnly:false`, `autoSetOnFeatureSelection:false`, `zoomOnAutoSet:false`, `longNames:false`, `position:"top-left"`.
- config.ts `Config`: all fields optional; `position?: string`.
- Requires a floor-aware map: `render()` gates on `map.floorInfo` (`hasFloorInfo()`), otherwise shows `WidgetPlaceholder` / a "not floor aware" message.

## Gotchas
- Core widget expects to live in `view.ui`; this widget deliberately breaks that assumption. It overrides the private `_getComponentPosition` and manually patches breakpoint sizing (`fixBreakpoints` writes `viewModel._viewWidthBreakpoint` / `_viewHeightBreakpoint` on a `setTimeout(..., 100)`, keyed off ExB `size-mode-*` classes on `document.documentElement`). Both are private-API dependencies and could break on SDK upgrades.
- `throwIfAborted` from `@arcgis/core/core/promiseUtils.js` is explicitly "not public" (`// @ts-expect-error`).
- `refreshFloorFilterData` reaches deep into `viewModel` internals (`_updateFloorFilterTask`, `_updateFloorFilterFromMap`, `_isOverridden`, `_setInitialViewState`, `filterFeatures`) to re-init after a branch (gdbVersion) change - highly version-fragile, UNVERIFIED across SDK versions (src/runtime/widget.tsx).
- References a global `pWinSt` (e.g. `pWinSt.error(...)`, `pWinSt.log(...)`) that is not imported in these files - it is an ambient/global logger provided elsewhere (UNVERIFIED origin; src/runtime/widget.tsx and src/runtime/ds-filter.ts).
- `DsFilter.updateDataSources` mutates non-DataSource layers by adding a custom `layer.xtnOrigDefExpr` property and rewriting `definitionExpression`; make sure `clear()` runs to avoid leaving stale filters.
- When both `filterDataSources` and `autoSetOnFeatureSelection` are on, `makeQueryParams` calls `dataSource.clearSelection()` to avoid a re-select/level-revert loop (commented as a workaround with possible side effects, e.g. clearing the active edit feature).
- 3D "all levels" handling: a `levelId` starting with `'all--'` is treated as null and expanded to the facility's level ids (`levelsForFacility3D`).
- Rebuild churn: several config props (`filterDataSources`, `filterByActiveFloorOnly`, `autoSetOnFeatureSelection`, `zoomOnAutoSet`) fully rebuild the core widget in `componentDidUpdate`.

## Useful snippets and functions

### Instantiate core FloorFilter into an ExB container and wait for level data
Source: ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/widget.tsx
```tsx
const coreNode = document.createElement('div')
this.coreContainer.appendChild(coreNode)
const view = this.state.jimuMapView.view
this.coreWidget = new FloorFilter({
  container: coreNode,
  longNames: !!this.props.config.longNames,
  view: view
})

// wait for the floor filter to load level data before initializing the data source filter
let initDS = true
const ffHandle = reactiveUtils.watch(
  // @ts-expect-error
  () => this.coreWidget.viewModel.filterFeatures,
  () => {
    if (initDS) {
      initDS = false
      this.dsFilter.init(this.state.jimuMapView, this, this.coreWidget)
    }
    ffHandle.remove()
  }
)

// the core widget expects to be part of the view-ui; override component position
// @ts-expect-error
this.coreWidget._getComponentPosition = () => {
  return this.props.config.position || 'top-left'
}
```

### Detect a floor-aware map
Source: ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/widget.tsx
```tsx
hasFloorInfo = (): boolean => {
  return !!((this.state.jimuMapView?.view?.map as any)?.floorInfo)
}

hasMap = (): boolean => {
  return !!(this.state.jimuMapView?.view?.map)
}
```

### Push floor filter into a QueriableDataSource; edit definitionExpression for non-DataSource layers
Source: ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/ds-filter.ts
```ts
const processLayerView = async (jimuLayerView: JimuLayerView): Promise<void> => {
  const dataSource = jimuLayerView?.getLayerDataSource()
  const forceFloors = false

  // @ts-expect-error
  const dsLayer = dataSource?.layer
  const lvLayer = jimuLayerView?.layer
  if (lvLayer?.floorInfo?.floorField && (typeof lvLayer.when === 'function') && (lvLayer.loadStatus === 'loading')) {
    await lvLayer.when()
  }

  if (dataSource) {
    let floorField = dsLayer?.floorInfo?.floorField || lvLayer?.floorInfo?.floorField
    if (floorField && dsLayer && (dsLayer.type === 'feature' || dsLayer.type === 'scene')) {
      floorField = findFloorField(dsLayer.fields, floorField)
      const qDataSource = (dataSource as QueriableDataSource)
      if (typeof qDataSource.updateQueryParams === "function") {
        const queryParams = makeQueryParams(floorField, qDataSource, forceFloors, lvLayer?.title)
        if (queryParams) {
          qDataSource.updateQueryParams(queryParams, widgetId)
        }
      }
    }
  } else {
    let floorField = lvLayer?.floorInfo?.floorField
    if (floorField && lvLayer && (lvLayer?.type === 'feature' || dsLayer?.type === 'scene')) {
      floorField = findFloorField(lvLayer.fields, floorField)
      const where = makeWhere(floorField, forceFloors)
      applyWhere(lvLayer, where)   // preserves layer.xtnOrigDefExpr
    }
  }
}
```

### Build a floor SQL expression with jimu-core dataSourceUtils
Source: ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/ds-filter.ts
```ts
const clause = dataSourceUtils.createSQLClause(
  floorField, ClauseOperator.StringOperatorIs,
  [{ value: levelId, label: levelId + '' }]
)
const outdoor = dataSourceUtils.createSQLClause(
  floorField, ClauseOperator.StringOperatorIsBlank,
  [{ value: null, label: 'null' }]
)
const sqlExpression = dataSourceUtils.createSQLExpression(ClauseLogic.Or, [clause, outdoor], dataSource)
const queryParams = { where: sqlExpression.sql, sqlExpression } as QueryParams
```

### Auto-set the floor from a single selected floor-aware feature
Source: ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/ds-filter.ts
```ts
private selectedFeaturesChangeListener (jimuLayerView, coreFloorFilterWidget, zoomOnAutoSet: boolean) {
  const dataSource = jimuLayerView?.getLayerDataSource()
  // @ts-expect-error
  const dsLayer = dataSource?.layer
  const lvLayer = jimuLayerView?.layer
  let floorField = dsLayer?.floorInfo?.floorField || lvLayer?.floorInfo?.floorField
  if (dataSource && floorField && coreFloorFilterWidget) {
    const selectedRecords: any = dataSource?.getSelectedRecords()
    if ((selectedRecords?.length === 1) && selectedRecords[0]?.feature?.attributes) {
      const levelId = selectedRecords[0].feature.attributes[floorField]
      if (levelId && (coreFloorFilterWidget.level !== levelId)) {
        const prevFid = coreFloorFilterWidget.facility
        const level = coreFloorFilterWidget.viewModel?.getLevel(levelId)
        if (level) {
          coreFloorFilterWidget.level = levelId
          const facilityId = coreFloorFilterWidget.facility
          const facility = coreFloorFilterWidget.viewModel?.getFacility(facilityId)
          if (zoomOnAutoSet && facility && (prevFid !== facilityId)) {
            coreFloorFilterWidget.viewModel.goTo(facility)
          }
        }
      }
    }
  }
}
```

### DsFilter listener/watcher wiring
Source: ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/ds-filter.ts
```ts
if (filterDataSources) {
  if (filterByActiveFloorOnly) {
    this.ffLevelHandle = reactiveUtils.watch(
      () => coreFloorFilterWidget.level,
      (levelId) => this.updateDataSources(jimuMapView, widgetId, levelId, filterByActiveFloorOnly)
    )
  } else {
    this.vwFloorsHandle = reactiveUtils.watch(
      () => coreFloorFilterWidget.view.floors,
      () => this.updateDataSources(jimuMapView, widgetId, coreFloorFilterWidget.level, filterByActiveFloorOnly)
    )
  }
  this.registeredLvCreatedListener = (lv: JimuLayerView) => {
    this.updateDataSources(jimuMapView, widgetId, coreFloorFilterWidget.level, filterByActiveFloorOnly, lv)
  }
  jimuMapView.addJimuLayerViewCreatedListener(this.registeredLvCreatedListener)
}

if (autoSetOnFeatureSelection) {
  this.registeredSelChangeListener = (jimuLayerView: JimuLayerView) => {
    this.selectedFeaturesChangeListener(jimuLayerView, coreFloorFilterWidget, zoomOnAutoSet)
  }
  jimuMapView.addJimuLayerViewSelectedFeaturesChangeListener(this.registeredSelChangeListener)
}
```

### Cleanup / destroy
Source: ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/widget.tsx
```tsx
destroyCoreWidget () {
  this.dsFilter.clear()
  if (this.coreWidget) {
    const view = this.coreWidget.view
    this.coreWidget.destroy()
    this.coreWidget = null
    if (view) {
      view.floors = this.vwOriginalFloors || null
    }
  }
  // ...remove vwHeightHandle / vwWidthHandle / gdbVersionHandle via clearHandles
}
```
