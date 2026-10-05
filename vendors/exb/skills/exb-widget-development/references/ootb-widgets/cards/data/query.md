# OTB Widget: arcgis/query

Online widget doc: https://developers.arcgis.com/experience-builder/guide/query-widget/

## Purpose
The Query widget lets end users run one or more preconfigured "query tasks" against a data source, combining an attribute filter (SQL expression) and/or a spatial filter (current map extent, interactive draw, or a spatial relation to another data source, with optional buffer). Each query task produces its own output data source; results are shown in a paged or lazy-loaded list, can be selected, exported, and are published to the rest of the app.

Grounded in:
- manifest.json declares `dependency: jimu-arcgis`, `publishMessages` for `DATA_RECORDS_SELECTION_CHANGE` (carry `OUTPUT_DATA_SOURCE`) and `DATA_RECORD_SET_CHANGE` (carry `USE_DATA_SOURCE`), and property `canGenerateMultipleOutputDataSources: true`.
- config.ts `QueryItemType` models per-task attribute filter (`sqlExprObj`), spatial filter (`spatialFilterTypes`, `spatialRelationUseDataSources`, buffer fields), result display, sorting, export, and `outputDataSourceId`.

## Source paths inspected
- manifest.json (widget root, not src) - dependencies, publishMessages, extensions, excludeDataActions
- src/config.ts - full config model (enums + `QueryItemType`, `SettingConfig`, `IMConfig`)
- src/version-manager.ts - config upgraders (1.5.0, 1.6.0)
- src/runtime/widget.tsx - top-level render, arrangement switch
- src/runtime/widget-context.tsx - `QueryWidgetContext`
- src/runtime/query-task-list.tsx - task list + navigation staging
- src/runtime/query-task.tsx - core task orchestration (query lifecycle, messages, output DS)
- src/runtime/query-utils.ts - `generateQueryParams`, `executeCountQuery`, `executeQuery`, `getPopupTemplate`, `combineFields`
- src/runtime/geometry-from-map.tsx - current-map-extent geometry source
- src/runtime/geometry-from-draw.tsx - interactive draw + buffer geometry source
- src/runtime/interactive-draw-tool.tsx - `JimuDraw` wrapper (from jimu-ui/advanced/map)
- src/runtime/query-result.tsx - result list, selection, data actions
- src/runtime/useAutoHeight.tsx - auto-height detection from layout
- src/runtime/query-task-context.tsx - `QueryTaskContext` (reset symbol)
- src/common/use-ds-exists.tsx - `useDataSourceExists`
- src/common/data-source-tip.tsx - data-source status/error UI
- src/data-actions/index.tsx - extra data actions (select loaded / clear selection)
- src/setting/setting.tsx - builder settings + output DS generation
- src/setting/setting-utils.ts - `getOutputJsonOriginDs`
- src/tools/app-config-operations.ts - copy-remap on widget/page copy

LARGE-widget files skipped (present but not read in depth): src/runtime/geometry-from-ds.tsx, query-task-form.tsx, query-task-spatial-form.tsx, query-task-label.tsx, query-task-list-inline.tsx, query-task-list-item.tsx, query-task-list-popper-wrapper.tsx, query-result-item.tsx, lazy-list.tsx, paging-list.tsx, loading-result.tsx, buffer-input.tsx, widget-config.ts; most of src/setting/* sub-panels (arrangement.tsx, attribute-filter.tsx, spatial-filter.tsx, results*.tsx, query-item-*.tsx, buffer.tsx, titleComponent.tsx, setting-config.ts); src/common/common-components.tsx, utils.tsx; src/tools/builder-operations.ts; default-query-item.ts; all tests/ and dist/.

## Architecture overview
- Runtime side: class `Widget` (widget.tsx) is thin - it branches on `config.arrangeType` (Block/Inline/Popper) and renders one of `QueryTaskList`, `TaskListInline`, or `TaskListPopperWrapper`, wrapped in `QueryWidgetContext.Provider` carrying `${layoutId}:${layoutItemId}`. `QueryTaskList` (function component) manages a two-stage view (task list -> selected task) and delegates each task to `QueryTask`.
- `QueryTask` is the orchestration hub: it holds a source `DataSource` (via `DataSourceTip`/`DataSourceComponent`) and an output `DataSource` (via `DataSourceComponent` on `outputDataSourceId`), builds query params from the attribute+spatial form, runs count then records, and manages three internal stages (0 form, 1 result, 2 loading).
- Shared components: `QueryTaskForm` (attribute + spatial), geometry sources (`geometry-from-map`, `geometry-from-draw`, `geometry-from-ds`), `InteractiveDraw`, `QueryTaskResult` with `LazyList`/`PagingList`.
- Utilities: query-utils.ts (params + execution + popup template), setting-utils.ts (origin DS resolution), config.ts JSAPI<->REST maps (`mapJSAPISpatialRelToDsSpatialRel`, `mapJSAPIUnitToDsUnit`).
- Config model: `IMConfig = ImmutableObject<SettingConfig>`; `SettingConfig.queryItems` is `ImmutableArray<QueryItemType>` plus widget-level arrangement/result defaults.
- Data-source deps: each query task has a `useDataSource` (source) and an `outputDataSourceId`; output DS is generated in setting.tsx and marked `isOutputFromWidget`. Multiple output DS supported (`canGenerateMultipleOutputDataSources`).
- Map deps: spatial filters use `JimuMapViewComponent`/`JimuMapView` and JSAPI modules loaded lazily via `loadArcGISJSAPIModule(s)`; `dependency: jimu-arcgis`.

## Key imports and packages
- jimu-core
  - `React, jsx, css, AllWidgetProps` (widget.tsx)
  - `DataSourceComponent, DataSourceManager, DataSource, FeatureLayerDataSource, QueriableDataSource, DataSourceStatus, QueryParams, FeatureLayerQueryParams, DataRecord` (query-task.tsx, query-utils.ts)
  - `MessageManager, DataRecordSetChangeMessage, DataRecordsSelectionChangeMessage, RecordSetChangeType` (query-task.tsx, query-utils.ts, query-result.tsx, data-actions/index.tsx)
  - `hooks, lodash, Immutable, ImmutableObject, ImmutableArray, IMSqlExpression, ReactRedux, IMState, CONSTANTS, focusElementInKeyboardMode, dataSourceUtils` (query-task.tsx, query-utils.ts)
  - `BaseVersionManager` (version-manager.ts)
  - `loadArcGISJSAPIModule, moduleLoader, utils` (geometry-from-*.tsx, interactive-draw-tool.tsx)
  - `getAppStore, appConfigUtils, IMDataSourceInfo` (common/data-source-tip.tsx)
- jimu-arcgis
  - `JimuMapViewComponent, JimuMapView, loadArcGISJSAPIModules` (geometry-from-map.tsx, geometry-from-draw.tsx)
- jimu-ui
  - `Paper, WidgetPlaceholder, Button, Tooltip, FOCUSABLE_CONTAINER_CLASS` (widget.tsx, query-task.tsx)
  - `List, TreeItemActionType` from `jimu-ui/basic/list-tree` (query-task-list.tsx)
  - `Icon, DataActionList, DataActionListStyle, NumericInput, Select` (query-result.tsx, setting.tsx)
  - `Checkbox`, `jimu-ui/advanced/map` (`JimuDraw`) (interactive-draw-tool.tsx)
- jimu-icons
  - `TrashOutlined, MenuOutlined, ArrowLeftOutlined` (query-task.tsx); warning/error svg (data-source-tip.tsx)
- jimu-for-builder
  - `AllWidgetSettingProps, SettingChangeFunction, getAppConfigAction` (setting.tsx)
- jimu-ui/advanced/data-source-selector, jimu-ui/advanced/setting-components
  - `DataSourceRemoveWarningPopup, DataSourceRemoveWaringReason, dataComponentsUtils`; `SettingRow, SettingSection, DirectionSelector` (setting.tsx)
- jimu-layouts/layout-runtime
  - `LayoutItemSizeModes` (useAutoHeight.tsx)
- @esri/arcgis-rest-feature-service
  - types `SpatialRelationship, Units, IFieldInfo` (config.ts, query-utils.ts)
- @arcgis/core / esri/* (loaded lazily by string module id, not imported)
  - `esri/core/reactiveUtils`, `esri/geometry/Polygon` (geometry-from-map.tsx)
  - `esri/Graphic`, `esri/geometry/operators/geodesicBufferOperator`, `esri/geometry/operators/bufferOperator`, `esri/rest/geometryService`, `esri/rest/support/BufferParameters` (geometry-from-draw.tsx)

## Reusable patterns found
- Multiple output data source creation from a source DS: setting.tsx `getAllDataSources` builds an `outputDataSourceJson` per query task (copying type/url/itemId/geometryType from the origin DS, `originDataSources: [useDataSource]`) and passes them as the second arg to `onSettingChange`; `canGenerateMultipleOutputDataSources: true` in manifest.
- Scene/subtype origin normalization: `getOutputJsonOriginDs` (setting-utils.ts) maps SceneLayer/BuildingComponentSubLayer to their associated FeatureLayer DS before generating output.
- Query params from attribute + spatial + sort + fields: `generateQueryParams` (query-utils.ts) merges origin query params, converts a `SqlExpression` via `dataSourceUtils.getArcGISSQL`, and appends `geometryType/geometry/spatialRel/distance/units` and `orderByFields/outFields`.
- Count-then-load: `executeCountQuery` (`outputDS.loadCount`) runs before `executeQuery` (`outputDS.load`) so the result header can show `from - to / total`.
- publishMessage flow: `executeQuery` publishes `DataRecordSetChangeMessage(..., RecordSetChangeType.CreateUpdate, ...)`; clearing publishes `RecordSetChangeType.Remove` + empty `DataRecordsSelectionChangeMessage`; selecting a result row publishes `DataRecordsSelectionChangeMessage` with selected records (query-result.tsx `toggleSelection`).
- Interactive draw from map: `GeometryFromDraw` + `InteractiveDraw` wrap `JimuDraw` (from `jimu-ui/advanced/map`), capturing `getGraphicsLayer` and the drawn `graphic`, with a "clear drawing after apply" checkbox.
- Current map extent as geometry: `GeometryFromMap` watches `jimuMapView.view.extent` via `reactiveUtils.watch` and converts extent to a polygon with `Polygon.fromExtent`.
- Buffering with SR-aware operators: `GeometryFromDraw.applyBufferEffect` picks `geodesicBufferOperator` (WGS84/WebMercator), `bufferOperator` (projected), or geometryService buffer (non-WGS84 geographic).
- Extra data actions: `getExtraActions` (data-actions/index.tsx) returns "select all loaded" and "clear selection" `DataAction`s wired to `QueriableDataSource.selectAllLoadedRecords()`/`clearSelection()` and republishing selection messages; rendered via `DataActionList` with `extraActions`.
- `useDataSourceExists` (common/use-ds-exists.tsx) - Redux selector guard that reads from `appStateInBuilder.appConfig` in builder vs `appConfig` at runtime.
- `useAutoHeight` (useAutoHeight.tsx) - reads layout item `autoProps.height === LayoutItemSizeModes.Auto` using the `${layoutId}:${layoutItemId}` value from `QueryWidgetContext`.
- Reset via symbol context: `QueryTaskContext.resetSymbol` change triggers geometry/layer cleanup in `GeometryFromDraw`.

## Builder vs runtime split
- Builder (src/setting/**, src/tools/**): defines query tasks and their filters/results, generates output data sources, wires arrangement + result style, handles removal warnings (`DataSourceRemoveWarningPopup`), and remaps ids on copy (`tools/app-config-operations.ts` `afterWidgetCopied`). `BUILDER_OPERATIONS` and `APP_CONFIG_OPERATIONS` extensions are registered in manifest.
- Runtime (src/runtime/**): executes queries against the output data source, renders lists/results, publishes selection and record-set messages, and drives map interactions. Runtime reads some config live from Redux (e.g. `state.appConfig.widgets[widgetId].config.resultPagingStyle`) rather than only from props.

## Lifecycle and cleanup
- `GeometryFromMap`: `reactiveUtils.watch` handle removed in the effect cleanup; sets initial extent on mount.
- `GeometryFromDraw`: `useEffectOnce` creates the buffer `Graphic` and defers initial `onBufferChange`; buffer operators/geometryService modules cached in refs and lazily loaded; on map view change it clears the graphics layer; reacts to `resetSymbol` changes to clear geometry.
- `QueryTask`: on source `dataSourceId` change it destroys the stale output DS (`DataSourceManager.getInstance().destroyDataSource(outputDataSourceId)`); `handleFormSubmit` sets output DS status to `Unloaded`/count `Unloaded` before loading, and clears any `clearAfterApply` draw layer in `finally`. `useEffectOnce` focuses the back button.
- `QueryTaskResult`: publishes an empty selection message and clears selection when `resultSelectMode` changes; syncs selected records from the DS in `onDataSourceInfoChange`.
- DataSource readiness gated by `DataSourceTip` (maps `IMDataSourceInfo.instanceStatus/status` to creating/error/warning) and `useDataSourceExists`.
- MapView readiness: geometry sources set state only when `jimuMapView?.view != null`.

## Manifest/config requirements
- manifest dependency: `"dependency": "jimu-arcgis"`.
- manifest publishMessages: `DATA_RECORDS_SELECTION_CHANGE` (carry `OUTPUT_DATA_SOURCE`), `DATA_RECORD_SET_CHANGE` (carry `USE_DATA_SOURCE`).
- manifest properties: `canConsumeDataAction: true`, `coverLayoutBackground: true`, `canGenerateMultipleOutputDataSources: true`.
- manifest excludeDataActions: `arcgis-map.addToMap`, `edit.edit`.
- manifest extensions: `appConfigOperations` (tools/app-config-operations), `builderOperations` (tools/builder-operations).
- config shape (real excerpt from config.ts):

```ts
export interface QueryItemType {
  configId: string
  icon?: IconResult
  name?: string
  useDataSource?: UseDataSource
  outputDataSourceId?: string
  useAttributeFilter?: boolean
  useSpatialFilter?: boolean
  sqlExprObj?: SqlExpression
  spatialMapWidgetIds?: string[]
  spatialFilterTypes?: SpatialFilterType[]
  spatialInteractiveCreateToolTypes?: CreateToolType[]
  spatialInteractiveEnableBuffer?: boolean
  spatialRelationUseDataSources?: UseDataSource[]
  resultPagingStyle?: PagingType
  resultFieldsType?: FieldsType
  resultDisplayFields?: string[]
  resultTitleExpression?: string
  resultSelectMode?: ResultSelectMode
  allowExport?: boolean
  sortOptions?: OrderByOption[]
  // ...spatial buffer/relation/result fields omitted
}

export interface SettingConfig {
  queryItems?: ImmutableArray<QueryItemType>
  arrangeType: QueryArrangeType
  arrangeWrap?: boolean
  resultListDirection?: ListDirection
  resultPagingStyle?: PagingType
  defaultPageSize?: number
  sizeMap?: { arrangementIconPopper?: SizeMap }
}

export type IMConfig = ImmutableObject<SettingConfig>
```

## Gotchas
- widget.tsx only honors arrangement branches when `!controllerWidgetId`; inside a controller widget it always falls back to the Block `QueryTaskList` render.
- Some result config (paging style, list direction) is read live from Redux `state.appConfig.widgets[widgetId].config` in query-task.tsx/query-result.tsx, and widget-level values fall back to the first query item's values (setting.tsx render + version-manager 1.6.0 upgrader). Editing config in Redux directly affects runtime behavior.
- Output DS auto-disables the spatial filter: `updateDataSource` in query-task.tsx sets `spatialFilterEnabled=false` when the output DS `isOutputFromWidget` and already carries a geometry in its current query params.
- Buffering path branches on spatial reference: geographic-but-not-WGS84 uses the geometry service (`utils.getGeometryService()`), otherwise geodesic vs planar buffer operators; negative buffers on point/line geometries are ignored.
- `generateQueryParams` uses `where: '1=1'` when no attribute filter, and derives `outFields` from either selected attributes (`combineFields`, always adding id fields + title-expression fields) or visible popup `fieldInfos`.
- Removing a query task shows `DataSourceRemoveWarningPopup` only when other widgets consume the output DS (`dataComponentsUtils.getWidgetsUsingDsOrItsDescendantDss`).
- `LazyLoad` paging forces page size to `CONSTANTS.DEFAULT_QUERY_PAGE_SIZE` regardless of `defaultPageSize` (query-task.tsx `handleFormSubmit`).
- `excludeDataActions` removes `arcgis-map.addToMap` and `edit.edit` from the result data-action menu; custom "select loaded"/"clear selection" are injected as `extraActions`.

## Useful snippets and functions

Source: src/runtime/query-task.tsx (count-then-load lifecycle and message clearing)
```ts
const featureDS = outputDS as FeatureLayerDataSource
setStage(2)
await publishDataClearedMsg()
let pageSize = defaultPageSize
if (pagingTypeInConfig === PagingType.LazyLoad) {
  pageSize = CONSTANTS.DEFAULT_QUERY_PAGE_SIZE
}
const queryParams = generateQueryParams(featureDS, sqlExpr, spatialFilter, currentItem, 1, pageSize)
queryParamRef.current = queryParams
featureDS.setStatus(DataSourceStatus.Unloaded)
featureDS.setCountStatus(DataSourceStatus.Unloaded)
executeCountQuery(props.widgetId, featureDS, queryParams)
  .then((count) => {
    setResultCount(count)
    featureDS.updateQueryParams(queryParamRef.current, props.widgetId)
    return executeQuery(props.widgetId, queryItem, featureDS, queryParamRef.current)
  })
```

Source: src/runtime/query-task.tsx (clear-result message publishing)
```ts
const publishDataClearedMsg = React.useCallback(async () => {
  if (!outputDS) return
  const dataRecordSetChangeMessage = new DataRecordSetChangeMessage(props.widgetId, RecordSetChangeType.Remove, [outputDS.id])
  MessageManager.getInstance().publishMessage(dataRecordSetChangeMessage)
  await MessageManager.getInstance().publishMessage(new DataRecordsSelectionChangeMessage(props.widgetId, [], [outputDS.id]))
}, [props.widgetId, outputDS])
```

Source: src/runtime/query-utils.ts (spatial + attribute + sort into query params)
```ts
if (useSpatialFilter && spatialFilter?.geometry) {
  const { geometry, relation = SpatialRelation.Intersect, buffer } = spatialFilter
  const spatialQueryParams: FeatureLayerQueryParams = {
    geometryType: dataSourceUtils.changeJSAPIGeometryTypeToRestAPIGeometryType(geometry.type),
    geometry: geometry.toJSON(),
    spatialRel: mapJSAPISpatialRelToDsSpatialRel[relation],
    distance: buffer?.distance,
    units: buffer?.unit ? mapJSAPIUnitToDsUnit[buffer.unit] : undefined
  }
  Object.assign(queryParams, spatialQueryParams)
}
```

Source: src/runtime/query-result.tsx (selection message on row toggle)
```ts
MessageManager.getInstance().publishMessage(new DataRecordsSelectionChangeMessage(widgetId, selectedDatas, [outputDS.id]))
outputDS.selectRecordsByIds?.(selectedDatas.map(record => record.getId()))
```

Source: src/runtime/geometry-from-map.tsx (watch map extent as geometry)
```ts
loadArcGISJSAPIModule('esri/core/reactiveUtils').then((reactiveUtils: __esri.reactiveUtils) => {
  handler = reactiveUtils.watch(() => jimuMapView.view.extent, (extent: __esri.Extent) => {
    if (PolygonRef.current) {
      onGeometryChange(PolygonRef.current.fromExtent(extent))
    } else {
      loadArcGISJSAPIModules(['esri/geometry/Polygon']).then(modules => {
        PolygonRef.current = modules[0]
        onGeometryChange(PolygonRef.current.fromExtent(extent))
      })
    }
  })
  onGeometryChange(jimuMapView.view.extent)
})
return () => { if (handler) { handler.remove() } }
```

Source: src/data-actions/index.tsx (extra data action - select all loaded)
```ts
onExecute: (dataSets, dataLevel, widgetId): Promise<boolean> => {
  const { dataSource } = dataSets[0]
  const queriableDS = dataSource as QueriableDataSource
  queriableDS.selectAllLoadedRecords()
  MessageManager.getInstance().publishMessage(new DataRecordsSelectionChangeMessage(widgetId, (dataSource as QueriableDataSource).getAllLoadedRecords(), [dataSource.id]))
  return Promise.resolve(true)
}
```

Source: src/setting/setting.tsx (generate one output data source json per query task)
```ts
const outputDataSourceJson = {
  id: queryItem.outputDataSourceId,
  label: this.getI18nMessage('outputDsLabel', { values: { label: queryItem.name } }),
  type: originDataSourceJson?.type === AllDataSourceTypes.SubtypeSublayer ? AllDataSourceTypes.FeatureLayer : originDataSourceJson?.type,
  geometryType: originDataSourceJson?.geometryType,
  url: originDataSourceJson?.url,
  itemId: originDataSourceJson?.itemId,
  portalUrl: originDataSourceJson?.portalUrl,
  originDataSources: [queryItem.useDataSource],
  layerId: originDataSourceJson?.layerId,
  isDataInDataSourceInstance: originDataSourceJson?.isDataInDataSourceInstance,
  query: originDataSourceJson?.type === AllDataSourceTypes.SubtypeSublayer ? getQueryOfSubtypeSublayer(originDs as any) : null
}
currentDsMap.outputDataSources.push(outputDataSourceJson)
```

Source: src/common/use-ds-exists.tsx (builder vs runtime app config selector)
```ts
const exists: boolean = ReactRedux.useSelector((state: IMState) => {
  let appConfig: IMAppConfig
  if (window.jimuConfig.isBuilder) {
    appConfig = state.appStateInBuilder.appConfig
  } else {
    appConfig = state.appConfig
  }
  const useDataSources = appConfig.widgets[widgetId].useDataSources ?? []
  return useDataSources.some(useDs => useDs.dataSourceId === useDataSourceId)
})
```
