# OTB Widget: common/select

Online widget doc: https://developers.arcgis.com/experience-builder/guide/select-widget/

## Purpose
The Select widget lets end users select features from map layers or from stand-alone
data sources, either by attribute (SQL filter) or by drawing a geometry on the map
(spatial selection). It publishes the selected records so other widgets (List, Table,
Chart, etc.) can react. Manifest label is "Select"; `manifest.json` description says
"This is the widget used in developer guide", so Esri also ships it as the canonical
teaching sample - it is a rich, production widget, not a toy.

Two top-level modes (driven by `config.useMap`):
- `useMap: true` - "Interact with a Map widget": binds to a Map widget, reads its
  `JimuLayerView`s, supports both attribute selection and spatial (draw) selection.
- `useMap: false` - "Select by attributes": binds directly to configured data sources
  and does attribute-only selection (spatial selection can still run against those data
  sources when `spatialSelection.enable` is true).

## Source paths inspected
Widget root: `ArcGISExperienceBuilder/client/dist/widgets/common/select/` (gitignored dist copy).

- `manifest.json` - INSPECTED (full)
- `config.json` - INSPECTED (full, default config)
- `src/config.ts` - INSPECTED (full; Config interface, enums, spatial-rel maps, defaults)
- `src/utils.ts` - INSPECTED (supported ds/layer-view types, config validation, sync/allow-generated helpers)
- `src/runtime/widget.tsx` - INSPECTED (full; display-mode state machine, runtimeInfo map, mapExtraStateProps)
- `src/runtime/utils.ts` - INSPECTED (runtimeInfo types, SelectTaskInfo, filter-icon logic, sql helpers)
- `src/runtime/data-source-extension.ts` - INSPECTED (full; selectRecords / clearSelection / publishMessage)
- `src/runtime/components/custom-sql-builder.tsx` - INSPECTED (full; moduleLoader + portal)
- `src/runtime/components/select-by-filter.tsx` - INSPECTED (batch layer toggle, DataActionList, list render)
- `src/runtime/components/data-source-list-item.tsx` - INSPECTED (lines 1-180 + grep of full file; per-item select engine)
- `src/runtime/components/use-map-entry.tsx` - INSPECTED (lines 1-120 + grep; map-mode wiring)
- `src/runtime/components/select-by-location.tsx` - INSPECTED (DataSourceComponent usage ~lines 395-430 + grep)
- `src/setting/setting.tsx` - INSPECTED (full; section layout)
- `src/setting/utils.ts` - INSPECTED (getUseDataSourcesByConfig)
- `src/setting/components/data-attribute-source-section.tsx` - grep-confirmed DataSourceComponent usage (not fully read)

Not read in full (structure/grep only): `src/runtime/components/use-data-source-entry.tsx`,
`select-header.tsx`, `select-progress.tsx`, `use-data-source-entry.tsx` bodies,
`src/setting/components/*` bodies, `tools/*` extensions, `version-manager.ts`, `translations/*`.

## Architecture overview
```
widget.tsx (Widget)
  |- holds dataSourceItemRuntimeInfoMap (per data-source-item UI/select state) + WidgetDisplayMode
  |- mapExtraStateProps -> injects isRTL, dataSourceCount, mapWidgetId, autoControlWidgetId, validated config
  |- branch on config.useMap:
       |- false -> UseDataSourceEntry ---------------------------\
       |- true  -> UseMapEntry (JimuMapViewComponent) ------------|
                                                                  v
                                    SelectByFilter (attribute list) + SelectByLocation (draw)
                                                                  |
                                                                  v
                                        DataSourceListItem (one per layer / data source)
                                          |- SqlExpressionRuntime (configured SQL, ask-for-values)
                                          |- CustomSqlBuilder (runtime-generated ds, full builder)
                                          |- DataSourceExtension.selectRecords / clearSelection
                                                                  |
                                                                  v
                                        DataRecordsSelectionChangeMessage -> MessageManager
```
The widget keeps almost no selection state in Redux config; instead it maintains a
runtime-only `DataSourceItemRuntimeInfoMap` (uid -> `DataSourceItemRuntimeInfo`) in
`widget.tsx` React state, and mutates it via a set of memoized callbacks
(`mixin...`, `updateDataSourceItemRuntimeInfoForUid`, `removeNotUsed...`, `clearAll...`).

Two-tier data-source-item concept:
- Config-defined items (`dataAttributeInfo.dataSourceItems` or per-map-view `dataSourceItems`)
  carry a configured `sqlExpression` / `sqlHint`.
- Runtime-generated items (created on the fly from visible `JimuLayerView`s when
  `syncWithMap`/`allowGenerated`) get `supportCustomSQLBuilder = true` so users build SQL live.

## Key imports and packages
Grouped by source file (import -> package):

`src/config.ts`
- `ImmutableObject, UseDataSource, SqlExpression, Immutable` <- `jimu-core`
- `SpatialRelationship` (type) <- `@esri/arcgis-rest-feature-service` (mapped to JSAPI `esriSpatialRel*` strings)

`src/runtime/widget.tsx`
- `React, hooks, jsx, css, AllWidgetProps, IMState, DataSourceStatus` <- `jimu-core`
- `WidgetPlaceholder, Loading, LoadingType, Paper, defaultMessages` <- `jimu-ui`
- `InfoOutlined` <- `jimu-icons/outlined/suggested/info`

`src/runtime/utils.ts`
- `dataSourceUtils, Immutable, uuidv1, DataSourceSelectionMode, AllWidgetProps, DataSource, UseDataSource, IMSqlExpression, ImmutableArray` <- `jimu-core`
- `JimuLayerView` (type) <- `jimu-arcgis`
- `IGeometry, GeometryType, SpatialRelationship` (types) <- `@esri/arcgis-rest-feature-service`
- `getShownClauseNumberByExpression` <- `jimu-ui/basic/sql-expression-runtime`

`src/runtime/data-source-extension.ts`
- `ArcGISQueriableDataSource, FeatureLayerQueryParams, QueryProgressCallback, MessageManager, DataRecordsSelectionChangeMessage, dataSourceUtils, DataSourceSelectionMode, DataRecord` <- `jimu-core`
- `JimuLayerView, JimuFeatureLayerView, JimuSceneLayerView` (types) <- `jimu-arcgis`

`src/runtime/components/custom-sql-builder.tsx`
- `React, ReactDOM, jsx, css, hooks, moduleLoader, IMSqlExpression, DataSource, SqlExpressionMode, QueryScope, focusElementInKeyboardMode` <- `jimu-core`
- `Button, Label` <- `jimu-ui`; `ArrowLeftOutlined` <- `jimu-icons/outlined/directional/arrow-left`
- `SqlExpressionBuilderModule` (type-only) <- `jimu-ui/advanced/sql-expression-builder` (loaded lazily via `moduleLoader`)

`src/runtime/components/data-source-list-item.tsx`
- `observeStore, DataSourceManager, DataSourceStatus, getAppStore, DataSourceSelectionMode, JSAPILayerTypes, ArcGISQueriableDataSource, FeatureLayerQueryParams, ...` <- `jimu-core`
- `JimuMapView, JimuLayerView` (types) <- `jimu-arcgis`; `Unsubscribe` <- `redux`
- `Checkbox, Label, Button, Switch, DataActionList, DataActionListStyle` <- `jimu-ui`
- `SqlExpressionRuntime` <- `jimu-ui/basic/sql-expression-runtime`

`src/runtime/components/select-by-filter.tsx`
- `Dropdown, DropdownButton, DropdownMenu, DropdownItem, Label, DataActionList, DataActionListStyle` <- `jimu-ui`

`src/runtime/components/use-map-entry.tsx`
- `JimuMapView, JimuMapViewComponent, JimuLayerView` <- `jimu-arcgis`
- `DataSourceManager, DataSourceTypes, JSAPILayerTypes, utils as jimuCoreUtils` <- `jimu-core`

`src/runtime/components/select-by-location.tsx`
- `DataSourceComponent, DataSourceSelectionMode, ArcGISQueriableDataSource` <- `jimu-core`

`src/setting/*`
- `AllWidgetSettingProps` <- `jimu-for-builder`; `DataSourceComponent` <- `jimu-core` (in `data-attribute-source-section.tsx`)

## Reusable patterns found
- DataSourceComponent (headless bind): `select-by-location.tsx` renders
  `<DataSourceComponent useDataSource=... onDataSourceCreated=... />` per spatial-selection
  source, and a second `<DataSourceComponent dataSource=... onSelectionChange=... />` on the
  main data source of a selection view (comment notes a selection view does not fire
  `onSelectionChange`, so it binds the MAIN ds). Setting panel's
  `data-attribute-source-section.tsx` also uses `DataSourceComponent` to load labels.
- Combined SPATIAL + ATTRIBUTE selection: config splits into `interactiveTools` (draw
  tools + `partiallyWithin`) and `spatialSelection` (relationships + buffer) for geometry,
  plus `sqlExpression` per data-source-item for attributes. A single `SelectTaskInfo`
  merges `appliedGeometryInfo` + `appliedSql`; when `selectionMode === New` both apply, and
  for Add/Remove/SelectFromCurrent only geometry applies (SQL ignored) - see `utils.ts`.
- CustomSqlBuilder via moduleLoader: `jimu-ui/advanced/sql-expression-builder` is large, so
  it is lazy-loaded with `moduleLoader.loadModules([...])` and rendered through
  `ReactDOM.createPortal` into the widget DOM (full-cover overlay). Runtime-generated data
  sources use this; configured ones use the lighter `SqlExpressionRuntime` instead.
- data-source-extension.ts for select/clear binding: a thin `DataSourceExtension` wraps an
  `ArcGISQueriableDataSource` + `widgetId`; it centralizes `selectRecords`, `clearSelection`,
  and message publishing so `DataSourceListItem` does not talk to the ds selection API directly.
- DATA_RECORDS_SELECTION_CHANGE: declared in `manifest.publishMessages`; emitted by
  `DataSourceExtension.publishMessage` via `new DataRecordsSelectionChangeMessage(widgetId,
  records, [ds.id])` + `MessageManager.getInstance().publishMessage(...)`.
- ArcGISQueriableDataSource: the widget only operates on queriable ArcGIS data sources;
  selection uses `dataSourceUtils.selectBySelectionMode({ ds, query, selectionMode, jimuLayerView, ... })`.
- supportCustomSQLBuilder flag: computed per item at creation
  (`getInitialDataSourceItemRuntimeInfoMap`) - `true` for generated/no-config items,
  `false` for config-driven items - and drives which SQL UI (builder vs runtime) and whether
  the filter icon always shows.
- Excluded data actions: `manifest.excludeDataActions` blocks `setFilter`,
  `arcgis-map.addToMap`, `table.addToTable` (a Select widget should not re-filter or re-add
  its own selection). `DataActionList` is shown at batch (SelectByFilter) and per-item level,
  gated by `enableDataAction` (defaults enabled unless `props.enableDataAction === false`).

## Builder vs runtime split
Setting (`src/setting/`, entry `setting.tsx`, props `AllWidgetSettingProps<IMConfig>`):
- Three sections rendered conditionally: `SourceSection` (always), `InteractiveToolSection`
  (only when `useMap && currMapWidgetId`), `SpatialSection`
  (when `(useMap && mapWidgetId)` or `(!useMap && hasDataSourceItem)`).
- `onNewConfig` recomputes `useDataSources` via `getUseDataSourcesByConfig(newConfig)` and
  writes `{ id, config, useDataSources }`; when switching from map-mode to attribute-mode it
  also nulls `useMapWidgetIds`.
- `getUseDataSourcesByConfig` aggregates useDataSources from `dataAttributeInfo.dataSourceItems`,
  every `mapInfo[viewId].dataSourceItems`, and `spatialSelection.useDataSources`, de-dupes by id,
  and returns `undefined` (not `[]`) when empty and `useMap` is true (intentional, per linked issue).

Runtime (`src/runtime/`, entry `widget.tsx`):
- Owns the runtimeInfo map + display-mode machine; no persistent selection stored in config.
- `Widget.mapExtraStateProps` validates config with `getConfigWithValidDataSourceItems`,
  counts `Created` data sources from `state.dataSourcesInfo`, resolves the first
  `useMapWidgetIds` entry, and reads `autoControlWidgetId` from `state.mapWidgetsInfo`.

Config-operation extensions (`manifest.extensions`, bodies not read):
- `appConfigOperations` -> `tools/app-config-operations` (APP_CONFIG_OPERATIONS point)
- `builderOperations` -> `tools/builder-operations` (BUILDER_OPERATIONS point)

## Lifecycle and cleanup
- Display-mode state machine (`widget.tsx`): `Placeholder -> Loading -> (Normal | NoLayersTip)`.
  Loading is shown at most once (`alreadySetLoadingDisplayModeRef`); a 20s `setTimeout`
  falls back to `NoLayersTip` if still loading. The timer is cleared in a
  `React.useEffect(() => () => clearTimeout(timerRef.current), [])` unmount cleanup.
- `useMap` change resets everything: `hooks.useEffectWithPreviousValues` compares previous vs
  current `useMap` and calls `clearAllDataSourceItemRuntimeInfoMap()` only on real change
  (avoids first-render clear).
- runtimeInfo housekeeping: `removeNotUsedDataSourceItemRuntimeInfoMap(allUsedUids)` prunes
  stale uids; `removeGeneratedJimuLayerViewDataSourceItemRuntimeInfoMap()` drops entries whose
  `jimuLayerView.fromRuntime` is true (when leaving sync-with-map).
- Per-item selection cancellation (`data-source-list-item.tsx`): each item holds an
  `AbortControllerExt` (with `selectVersion` + `ignoreAbortedSelection`); a new select task
  aborts the previous one before starting. Selection change subscription is stored in
  `dataSourceUnsubscribeRef` (`redux` `Unsubscribe`) for cleanup.
- `CustomSqlBuilder` lazy-loads `SqlExpressionBuilder` in a `useEffect` and unmounts cleanly
  via the portal; nothing to manually tear down beyond React.

## Manifest/config requirements
Manifest (`manifest.json`):
- `type: "widget"`, `name: "select"`, version/exbVersion `1.20.0`.
- `publishMessages: ["DATA_RECORDS_SELECTION_CHANGE"]`; `messageActions: []`.
- `properties`: `hasSettingPage: true`, `coverLayoutBackground: true`,
  `canConsumeDataAction: true`, `needHiddenState: true`.
- `excludeDataActions`: `["setFilter", "arcgis-map.addToMap", "table.addToTable"]`.
- `extensions`: `appConfigOperations` (APP_CONFIG_OPERATIONS) + `builderOperations` (BUILDER_OPERATIONS).
- `defaultSize`: 400x400.
- No `dependency` block for JSAPI in the manifest; the widget reaches the JSAPI through
  `jimu-arcgis` (`JimuMapView`/`JimuLayerView`, `__esri` types) and `jimu-core` utils rather
  than importing `esri/*` modules directly. (UNVERIFIED that no dependency is ever needed -
  inspect full `manifest.json` + any `esri/*` imports if adding raw JSAPI modules.)

Config (`config.json` default + `src/config.ts` `Config`):
- `useMap` (boolean) - selects the two modes.
- `dataAttributeInfo: { allowGenerated, dataSourceItems: DataSourceItem[] }` - used when `useMap=false`.
- `mapInfo: { [jimuMapViewId]: JimuMapViewConfigInfo }` - used when `useMap=true`
  (`syncWithMap`, `allowGenerated`, `enableAttributeSelection`, `dataSourceItems`).
- `interactiveTools: { tools: InteractiveToolType[], partiallyWithin, defaultTool?, activateByDefault? }`
  (default `tools: ["rectangle"]`, `partiallyWithin: true`) - map mode only.
- `spatialSelection: { enable, useDataSources, relationships: SpatialRelation[], buffer }`
  (default `enable:false`, `relationships:["Intersects"]`, `buffer:{enable:false,distance:0,unit:"Meters"}`).
- Supported data source types (`utils.ts`): FeatureLayer, SceneLayer, BuildingComponentSubLayer,
  OrientedImageryLayer, ImageryLayer, SubtypeGroupLayer, SubtypeSublayer (and matching
  `JSAPILayerTypes` for layer views).
- `DataSourceItem`: `{ uid, sqlHint?, useDataSource, sqlExpression?, jimuLayerViewId? }`
  (`jimuLayerViewId` only present when `useMap=true`).

## Gotchas
- Two config shapes for the SAME UI: attribute-mode reads `dataAttributeInfo.dataSourceItems`;
  map-mode reads `mapInfo[viewId].dataSourceItems`. Do not assume one list.
- `getUseDataSourcesByConfig` returns `undefined` (not empty array) when there are no data
  sources and `useMap` is true - deliberate; code that consumes it must handle `undefined`.
- `JimuMapViewConfigInfo` invariants: if `syncWithMap` is true then `allowGenerated` is forced
  true and `enableAttributeSelection` forced false, and `dataSourceItems` is `undefined`
  (NOT `[]`, so on/off toggling can pick up all visible queriable layer views). See defaults
  in `config.ts` and `getFinalAllowGeneratedForMap`/`getFinalEnableAttributeSelectionForMap`.
- `SpatialRelation` enum values must equal their keys, and are mapped to JSAPI
  `esriSpatialRel*` via `mapConfigSpatialRelToJSAPISpatialRel` - use the map, do not hand-write
  the JSAPI strings elsewhere.
- Selection-view quirk: a selection-view data source does not fire `onSelectionChange`, so
  `select-by-location.tsx` binds `DataSourceComponent` to the MAIN data source instead.
- Data sources are created on demand (performance): a runtimeInfo item is only "ready to
  display" once its `dataSource` (no map) or `jimuLayerView` (map) exists - see
  `getReadyToDisplayRuntimeInfos`. Missing labels usually mean the ds/layer-view has not loaded yet.
- Loading UI only ever shows once, then a 20s timeout flips to NoLayersTip; if you add async
  work, the widget will not re-show Loading.
- `enableDataAction` defaults to enabled: it is only off when `props.enableDataAction === false`
  (note the explicit `!== false` check).

## Useful snippets and functions

Source: `src/runtime/data-source-extension.ts`
```ts
// Thin wrapper that runs a select and publishes DATA_RECORDS_SELECTION_CHANGE.
async selectRecords (
  query: FeatureLayerQueryParams,
  selectionMode: DataSourceSelectionMode,
  signal: AbortSignal,
  jimuLayerView: JimuLayerView,
  progressCallback: QueryProgressCallback,
  updateSelectionIfAborted: () => boolean
): Promise<void> {
  let records: DataRecord[] = null
  const widgetId = this.widgetId
  const ds = this.ds

  if (selectionMode === DataSourceSelectionMode.New && !query.objectIds && !query.geometry && (!query.where || query.where === '1=1')) {
    records = []
    ds.selectRecords({ widgetId, records })
  } else {
    const selectResult = await dataSourceUtils.selectBySelectionMode({
      widgetId, ds, query, selectionMode, signal,
      checkLayerVisibility: false,
      jimuLayerView: jimuLayerView as JimuFeatureLayerView | JimuSceneLayerView,
      progressCallback, updateSelectionIfAborted
    })
    if (selectResult) { records = selectResult.records }
  }

  if (records) { this.publishMessage(records) }
}

private publishMessage (records: DataRecord[]): void {
  const message = new DataRecordsSelectionChangeMessage(this.widgetId, records, [this.ds.id])
  MessageManager.getInstance().publishMessage(message)
}
```

Source: `src/config.ts`
```ts
// Config SpatialRelation enum -> JSAPI spatial relationship strings.
export const mapConfigSpatialRelToJSAPISpatialRel: { [key: string]: SpatialRelationship } = {
  [SpatialRelation.Intersects]: 'esriSpatialRelIntersects',
  [SpatialRelation.Contains]: 'esriSpatialRelContains',
  [SpatialRelation.Crosses]: 'esriSpatialRelCrosses',
  [SpatialRelation.EnvelopeIntersects]: 'esriSpatialRelEnvelopeIntersects',
  [SpatialRelation.IndexIntersects]: 'esriSpatialRelIndexIntersects',
  [SpatialRelation.Overlaps]: 'esriSpatialRelOverlaps',
  [SpatialRelation.Touches]: 'esriSpatialRelTouches',
  [SpatialRelation.Within]: 'esriSpatialRelWithin'
}
```

Source: `src/runtime/components/custom-sql-builder.tsx`
```ts
// Lazy-load the heavy SqlExpressionBuilder, then render it in a portal over the widget.
React.useEffect(() => {
  async function loadSqlExpressionBuilder () {
    try {
      const modules = await moduleLoader.loadModules<[typeof SqlExpressionBuilderModule]>(['jimu-ui/advanced/sql-expression-builder'])
      if (modules && modules[0].SqlExpressionBuilder) {
        setSqlExpressionBuilder(modules[0].SqlExpressionBuilder)
      }
    } catch (e) {
      pWinSt.error('load SqlExpressionBuilder error', e)
    }
  }
  loadSqlExpressionBuilder()
}, [])

return ReactDOM.createPortal(
  <div className='select-custom-sql-builder surface-1 border-0' css={style}>
    {/* ... header ... */}
    {SqlExpressionBuilder && dataSource &&
      <SqlExpressionBuilder
        className='raw-sql-expression-builder'
        dataSource={dataSource}
        mode={SqlExpressionMode.Simple}
        widgetId={widgetId}
        expression={currImSqlExpression}
        noScrollForList
        queryScope={QueryScope.InRuntimeView}
        onChange={onExpressionChange}
      />}
  </div>,
  widgetDom
)
```

Source: `src/runtime/utils.ts`
```ts
// Whether the attribute-filter icon should show for an item.
export function shouldShowAttributeFilterIcon (supportCustomSQLBuilder: boolean, imConfigSqlExpression: IMSqlExpression): boolean {
  let show = false
  if (supportCustomSQLBuilder) {
    show = true // runtime-generated ds: always allow building SQL
  } else if (imConfigSqlExpression) {
    show = (!!getFinalAppliedSql(imConfigSqlExpression.sql)) ||
           shouldShowSqlExpressionRuntime(supportCustomSQLBuilder, imConfigSqlExpression)
  }
  return show
}
```

Source: `src/setting/utils.ts`
```ts
// Aggregate every UseDataSource referenced by config (attr items + per-map-view items + spatial),
// de-dupe, and return undefined (not []) for empty map-mode config.
export function getUseDataSourcesByConfig (config: IMConfig): UseDataSource[] {
  const tempUseDataSources: UseDataSource[] = []
  // ... push from config.dataAttributeInfo.dataSourceItems
  // ... push from each config.mapInfo[viewId].dataSourceItems
  // ... push from config.spatialSelection.useDataSources
  const finalDataSourceIds: string[] = []
  const finalUseDataSources: UseDataSource[] = []
  tempUseDataSources.forEach(uds => {
    if (!finalDataSourceIds.includes(uds.dataSourceId)) {
      finalDataSourceIds.push(uds.dataSourceId)
      finalUseDataSources.push(uds)
    }
  })
  if (finalUseDataSources.length === 0 && config.useMap) {
    return undefined
  }
  return finalUseDataSources
}
```

Source: `src/runtime/components/select-by-location.tsx`
```tsx
// Headless binding of spatial-selection sources; selection views bind their MAIN ds.
{imUseDataSourcesOfSpatialSelection.map(imUseDataSource => (
  <DataSourceComponent
    key={imUseDataSource.dataSourceId}
    useDataSource={imUseDataSource}
    onDataSourceCreated={onDataSourceCreated}
  />
))}
{(selectedDataSource && mainDsOfSelectedDs && isSelectionView(selectedDataSource)) &&
  <DataSourceComponent
    dataSource={mainDsOfSelectedDs}
    onSelectionChange={onSelectionChange}
  />}
```

Source: `src/runtime/widget.tsx`
```ts
// Reset all per-item runtime state only when useMap actually flips (not on first render).
hooks.useEffectWithPreviousValues((preValues) => {
  const preUseMap = preValues[0] || false
  if (useMap !== preUseMap) {
    clearAllDataSourceItemRuntimeInfoMapRef.current?.()
  }
}, [useMap])
```
