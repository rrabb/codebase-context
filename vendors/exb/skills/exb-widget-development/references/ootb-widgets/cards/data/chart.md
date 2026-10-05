# OTB Widget: common/chart

Online widget doc: https://developers.arcgis.com/experience-builder/guide/chart-widget/

## Purpose

The Chart widget renders ArcGIS charts (bar, column, line, area, pie/donut, scatter, histogram, gauge) from a single feature/scene layer data source. It is the reference "developer guide" widget bundled with ExB (manifest `description`: "This is the widget used in developer guide") and is by far the most complex OTB data widget. Beyond drawing a chart it acts as a data-producing widget: it builds an OUTPUT data source of aggregated/statistic records, syncs chart selection to that output data source, and publishes `DATA_RECORDS_SELECTION_CHANGE` messages so other widgets can react to chart selections.

Key value for our repo: it is the canonical example of the original-vs-output data source pattern, statistic-driven queries (`StatisticDefinition` / `outStatistics`), building `DataRecord`s from chart-engine payloads, and two-way selection sync between a web component and a jimu data source.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/common/chart/` (gitignored). Focus was the data-source / output-DS parts.

Inspected in full:
- `manifest.json` - messages, properties, extensions, dependencies
- `config.json` - `{}` (no static default config; defaults come from templates + `constants.ts`)
- `src/config.ts` - `Config` / `IMConfig` / `IWebChart` / `WebChartSeries` types
- `src/constants.ts` - field-name constants, `ChartLimits`, `WebChartCurrentVersion`
- `src/runtime/widget.tsx` - widget entry, state provider wiring
- `src/runtime/chart/index.tsx` - split-by series orchestration + DS manager mount
- `src/runtime/chart/data-source/index.tsx` - `FeatureLayerDataSourceManager` (schema sync)
- `src/runtime/chart/data-source/original.tsx` - `OriginDataSourceManager`
- `src/runtime/chart/data-source/output.tsx` - `OutputSourceManager` (runtime)
- `src/runtime/chart/data-source/utils.ts` - `useMemoizedQuery`, `updateDataSourceJson`
- `src/runtime/chart/web-chart/index.tsx` - render-state gate + `ChartRoot`
- `src/runtime/chart/web-chart/web-chart-component.tsx` - `<Chart>` engine bridge
- `src/runtime/chart/web-chart/utils/index.ts` - record building from chart payloads
- `src/runtime/chart/web-chart/utils/use-selection.ts` - selection sync + message publish
- `src/runtime/chart/web-chart/utils/use-render-state.ts` - loading/placeholder/warning logic
- `src/runtime/chart/tools/index.tsx` - toolbar + `DataActionList`
- `src/runtime/state/index.tsx` - reducer/context runtime state
- `src/setting/setting.tsx` - builder entry, DataSourceSelector, output ds lifecycle
- `src/setting/data-source/index.tsx` - builder `OutputSourceManager`
- `src/setting/data-source/utils.ts` - `createInitOutputDataSource`, schema helpers
- `src/utils/common/schema.ts` (getDataSourceSchema*), `src/utils/common/series.ts` (DS guards, `queryFieldUniqueValues`)
- `src/version-manager.ts` (header + upgrade version list only)

Skipped (out of scope for a data card; noted as UNVERIFIED where referenced):
- Compiled `dist/`, all `tests/` folders
- The large `src/setting/settings/**` builder UI tree (chart-type-selector, web-chart sections: axes, series, gauge, histogram, pie, scatter, appearance). Only `chart-type-selector` role is summarized from imports; internals UNVERIFIED.
- `src/utils/common/series.ts` beyond the inspected functions (~49 KB), `src/utils/default/index.ts` (~23 KB), `src/version-manager.ts` body (~24 KB), `src/tools/builder-operations.ts`, all `src/setting/template/*.json`, translations, SVG assets.

## Architecture overview

The widget is layered top-down; each layer is a thin React component that pushes state into a shared reducer (`ChartRuntimeStateProvider`).

```
Widget (widget.tsx)
  -> ChartRuntimeStateProvider (state/index.tsx: chart, dataSource, outputDataSource, records, queryVersion, renderStatus)
    -> Chart (chart/index.tsx)            // resolves split-by series, memoizes webChart
       -> FeatureLayerDataSourceManager (chart/data-source/index.tsx)
            -> OriginDataSourceManager    // original.tsx  -> DataSourceComponent(useDataSource)
            -> OutputSourceManager        // output.tsx    -> DataSourceComponent(outputDataSourceId)
       -> WebChart (chart/web-chart/index.tsx)   // useChartRenderState gate
            -> ChartRoot (placeholder/loading/message/tools shell)
               -> WebChartComponent (web-chart-component.tsx)  // <Chart> from jimu-ui/advanced/chart
```

Data flow (runtime):
1. `OriginDataSourceManager` creates the original data source instance (the user-selected layer) and stores it in runtime state (`SET_DATA_SOURCE`). Its `onQueryRequired` bumps `queryVersion`.
2. `OutputSourceManager` (runtime) creates the widget output data source instance (`SET_OUTPUT_DATA_SOURCE`) and copies the layer definition from the origin via `syncOriginDsInfo`.
3. `FeatureLayerDataSourceManager` computes an output `schema` from the current query + series type (`getDataSourceSchema` / `getDataSourceSchemaForSplitBy`) and writes it into the app config data source JSON (`updateDataSourceJson`).
4. `WebChartComponent` renders the chart-engine `<Chart>`, feeds it `config`, `layer`, `runtimeDataFilters`, and `chartLimits`. When the engine finishes processing (`onarcgisDataProcessComplete`), it turns the chart data items into `DataRecord`s (`createRecordsFromChartData`) and dispatches `SET_RECORDS`.
5. `OutputSourceManager` observes `records`, calls `outputDataSource.setSourceRecords(records)` and marks the output DS `Unloaded` so downstream consumers re-read it.
6. `useSelection` keeps chart selection and output DS `selectedIds` in sync and publishes `DataRecordsSelectionChangeMessage`.

Builder side: `setting.tsx` picks the origin data source (`DataSourceSelector`), owns the output data source JSON lifecycle (create/label/originDataSources), and mounts a builder `OutputSourceManager` that seeds the output DS schema and reports used fields back onto `useDataSources[0].fields`.

## Key imports and packages

jimu-core (framework primitives):
- `src/runtime/widget.tsx`: `React`, `AllWidgetProps`
- `src/runtime/chart/data-source/original.tsx`: `DataSourceComponent`, `DataSource`, `DataSourceStatus`, `UseDataSource`, `ImmutableObject`
- `src/runtime/chart/data-source/output.tsx`: `DataSourceComponent`, `DataSourceManager`, `dataSourceUtils`, `getAppStore`, `FeatureLayerDataSource`, `SceneLayerDataSource`, `IMDataSourceSchema`, `Immutable`
- `src/runtime/chart/data-source/index.tsx`: `getAppStore`, `DataSourceStatus`, `lodash`, `IMDataSourceSchema`
- `src/runtime/chart/data-source/utils.ts`: `IMFeatureLayerQueryParams`, `getAppStore`, `DataSourceJson`, `utils` (`utils.changeAppConfig`)
- `src/runtime/chart/web-chart/web-chart-component.tsx`: `hooks`, `appActions`, `getAppStore`, `dataSourceUtils`, `QueriableDataSource`, `FeatureLayerDataSource`, `FeatureLayerQueryParams`, `WidgetInitDragCallback`
- `src/runtime/chart/web-chart/utils/use-selection.ts`: `DataRecordsSelectionChangeMessage`, `MessageManager`, `ReactRedux`, `DataRecord`, `IMState`, `hooks`, `lodash`
- `src/runtime/chart/web-chart/utils/use-render-state.ts`: `appConfigUtils`, `CONSTANTS` (`SELECTION_DATA_VIEW_ID`), `DataSourceManager`, `DataSourceStatus`, `ReactRedux`, `IMState`, `hooks`
- `src/runtime/chart/tools/index.tsx`: `MessageManager`, `DataRecordsSelectionChangeMessage`, `DataRecordSet`, `ReactRedux`, `IMState`
- `src/setting/setting.tsx`: `DataSourceTypes`, `dataSourceUtils`, `AppMode`, `DataSourceJson`, `getAppStore`

jimu-ui/advanced/chart (the ArcGIS chart engine bridge - THE core dependency):
- `src/runtime/chart/web-chart/web-chart-component.tsx`: `Chart`, `HTMLArcgisChartElement`, `WebChart`, `getSeriesType`, `WebChartDataFilters`, `SupportedLayer`, `ArcgisChartCustomEvent`, `DataProcessCompletePayload`, `AxesMinMaxChangePayload`
- `src/runtime/chart/web-chart/utils/use-selection.ts`: `getSplitByField`, `WebChartDataItem`, `SelectionData`, `SelectionCompletePayload`
- `src/runtime/chart/index.tsx`: `getSplitByField`
- `src/config.ts` / `src/constants.ts`: `WebChart`, `WebChartSeries`, `WebChartAxis`, `WebGaugeChart`, `ChartElementLimit`, order/label types
- `src/setting/setting.tsx`, `use-render-state.ts`: `getSeriesType`, `ChartTypes`

jimu-ui / jimu-ui/advanced/setting-components / data-source-selector:
- `src/runtime/chart/tools/index.tsx`: `DataActionList`, `DataActionListStyle`
- `src/setting/setting.tsx`: `SettingRow`, `SettingSection`, `DataSourceSelector`

jimu-for-builder:
- `src/setting/setting.tsx`: `AllWidgetSettingProps`, `builderActions`

jimu-theme:
- `src/runtime/chart/tools/index.tsx`: `styled` (toolbar `Root`, uses `theme.sys.color.*` tokens)

## Reusable patterns found

- DataSourceComponent per role: two independent `DataSourceComponent` instances - one for the ORIGINAL selected layer (`original.tsx`) and one for the widget OUTPUT data source (`output.tsx`). Both push their created instances into a reducer instead of local state so sibling components can read them.
- Original vs output data-source subfolders: `chart/data-source/original.tsx` (input layer, the query source) and `chart/data-source/output.tsx` (widget-produced statistics DS). `FeatureLayerDataSourceManager` (`index.tsx`) mounts both and owns the schema-sync effect between them.
- OUTPUT data source creation + management:
  - Builder: `createInitOutputDataSource` (`setting/data-source/utils.ts`) builds a `DataSourceJson` with `type: FeatureLayer`, `isOutputFromWidget: true`, `isDataInDataSourceInstance: true`, `originDataSources: [useDataSource]`, and a minimal schema containing only the `__outputid__` OID field.
  - Runtime: `OutputSourceManager` calls `outputDataSource.setSourceRecords(records)` and toggles status (`Unloaded` / `NotReady`) so consumers reload.
  - Schema is recomputed from the query + series type and written back to app config with `updateDataSourceJson` -> `utils.changeAppConfig`.
- publishMessages `DATA_RECORDS_SELECTION_CHANGE` with `messageCarryData: OUTPUT_DATA_SOURCE`: declared in `manifest.json`; the actual publish happens in `use-selection.ts` and `tools/index.tsx` via `MessageManager.getInstance().publishMessage(new DataRecordsSelectionChangeMessage(widgetId, records, [outputDsId]))`.
- DataRecordsSelectionChange selection sync (two-way): chart -> DS (`useSelection.handleSelectionChange` matches chart selection items to output source records, then `outputDataSource.selectRecordsByIds`) and DS -> chart (a `ReactRedux.useSelector` on `dataSourcesInfo[outputDsId].selectedIds` rebuilds `selectionItems` fed back into the engine as `selectionData`). A `preSelectedIdsRef` guards against echo loops.
- StatisticDefinition / `outStatistics`: `ChartStatisticType` in `config.ts`; queries carry `outStatistics` + `groupByFieldsForStatistics`; `buildUniqueQuery` (`utils/common/series.ts`) merges multiple series `outStatistics` into one query.
- FeatureLayerQueryParams usage: `useMemoizedQuery` (`data-source/utils.ts`) reduces a query to only the meaningful keys (`where`, `groupByFieldsForStatistics`, `outFields`, `outStatistics`) so effects do not re-fire on identity changes. `WebChartComponent` reads live params via `(dataSource as QueriableDataSource).getCurrentQueryParams()` and `getMaxRecordCount()` and translates them into engine `runtimeDataFilters`.
- Building records from a web component payload: `createRecordsFromChartData` (`web-chart/utils/index.ts`) synthesizes features (`{ attributes }`) from chart-engine data items and calls `outputDataSource.buildRecord(feature)`.
- use-selection / use-render-state hooks: co-located hooks that encapsulate selection sync and the loading/placeholder/warning state machine.
- version-manager: `Widget.versionManager = versionManager` (`widget.tsx`); `src/version-manager.ts` has upgrade steps for 1.6.0 -> 1.20.0.
- Runtime state via reducer + context (`state/index.tsx`): a lightweight local store (`chart`, `dataSource`, `outputDataSource`, `records`, `queryVersion`, `renderStatus`) instead of prop drilling.
- Split-by field handling: `getSplitByField(query.where, true)` (jimu-ui/advanced/chart) drives dynamic series creation; unique split values are fetched with `queryFieldUniqueValues` and used to synthesize both runtime series and the output schema (`getDataSourceSchemaForSplitBy`).

## Builder vs runtime split

Builder (`src/setting/**`):
- `setting.tsx` owns config edits and the output data source JSON. On origin DS change it clears `webChart`/`tools`/`template` if the new DS is not derived from the same main (`dataSourceUtils.areDerivedFromSameMain`) and updates the output DS `originDataSources`.
- Creates the output DS JSON via the builder `OutputSourceManager` -> `createInitOutputDataSource` when none exists; keeps the output DS label in sync with the widget label; reports schema origin fields back to `useDataSources[0].fields` (`getSchemaOriginFields`).
- Disables the message-action setting panel in Express app mode (`builderActions.changeMessageActionSettingOpenState`).
- Delegates the entire chart-type / axes / series / gauge configuration UI to `ChartSettings` (`src/setting/settings/**`, largely UNVERIFIED here).

Runtime (`src/runtime/**`):
- Consumes `config`, `outputDataSources[0]`, `useDataSources[0]`; never writes config. It does write the output DS schema back into app config (`updateDataSourceJson`) so the runtime output DS matches the live query - this is a runtime side-effect on app config, notable and worth remembering.
- `getAppStore().getState().appContext.isInBuilder` gates builder-only behavior in `output.tsx` (setting output DS `NotReady` on schema change only in builder).

## Lifecycle and cleanup

- Origin DS creation: `OriginDataSourceManager.handleCreated` -> `dispatch(SET_DATA_SOURCE)`. `onQueryRequired` -> `SET_QUERY_VERSION` (increment) to re-derive `queryParams`.
- Output DS creation: `OutputSourceManager.handleCreated` -> `syncOriginDsInfo` (copy layer definition intersection, null out `timeInfo`) then `SET_OUTPUT_DATA_SOURCE`.
- Records lifecycle: engine `onarcgisDataProcessComplete` -> `SET_RECORDS`; effect in `output.tsx` writes them to the output DS and sets status `Unloaded`. Gauge charts also update min/max mixed values on `onarcgisAxesMinMaxChange`.
- Not-ready propagation: `handleDataSourceStatusChange` sets the output DS `NotReady` and dispatches `SET_RECORDS: undefined` when the origin DS becomes NotReady.
- Drag/refresh: `hooks.useEffectOnce` registers `onInitDragHandler` to call `chart.refresh({ updateData: false, resetAxesBounds: false })`; `hooks.useUpdateEffect` refreshes with `updateData: true` when the layer or `gdbVersion` changes.
- Cleanup: no explicit `destroy()`/`unsubscribe` on unmount is present in the inspected runtime files. `DataSourceComponent` owns DS instance lifecycle; selection/redux subscriptions use `ReactRedux.useSelector` (auto-cleaned). Chart element cleanup is handled by the `<Chart>` web component from `jimu-ui/advanced/chart` (UNVERIFIED - inspect the jimu-ui/advanced/chart package if you need teardown details).

## Manifest/config requirements

`manifest.json`:
- `dependency: "jimu-arcgis"`, `settingDependency: "jimu-arcgis"` (needs the ArcGIS Maps SDK).
- `publishMessages`: `[{ messageType: "DATA_RECORDS_SELECTION_CHANGE", messageCarryData: "OUTPUT_DATA_SOURCE" }]`.
- `properties`: `hasSettingPage: true`, `canConsumeDataAction: true`, `coverLayoutBackground: true`, `notAutoLoadUsedFieldsData: true` (the widget manages field loading itself).
- `excludeDataActions`: `arcgis-map.*`, `setFilter`, `near-me.locate`, `elevation-profile.*`, `directions.*`, `relatedData`, `edit.edit`.
- `extensions`: one `BUILDER_OPERATIONS` extension at `tools/builder-operations`.
- `defaultSize`: `540 x 360`.

`config.json` is `{}`. There is no baked-in default config; the effective config (`Config`: `template`, `webChart: IWebChart`, `tools`, `options`, `messages`, `_templateType`) is produced by the settings UI from template JSON under `src/setting/template/*.json` plus constants. `DefaultOptions` = `{ hideEmptySeries: false }`. Chart spec version pinned by `WebChartCurrentVersion = '25.0.0'`.

Output data source is not in the manifest; it is created dynamically at author time (id `"<widgetId>_output"`, `isOutputFromWidget: true`).

## Gotchas

- Runtime writes app config: `updateDataSourceJson` calls `utils.changeAppConfig` from the runtime to keep the output DS schema in sync with the live query. Do not assume runtime is read-only for chart-like widgets.
- Output DS OID field is the literal `__outputid__` (`ObjectIdField` in `constants.ts`), not a real layer OID. Records are built with a synthetic sequential id (`data[idField] = i`). Selection matching deliberately strips `__outputid__`, `arcgis_charts_slice_id`, and the split-by field before comparing (`use-selection.ts`).
- Selection echo protection: `preSelectedIdsRef` plus `lodash.isDeepEqual` prevents feedback loops between the redux `selectedIds` and the chart engine; if you refactor selection, keep this guard.
- Selection is only published for user-driven sources (`SelectionByClick` / `SelectionByRange` / `ClearSelection`); programmatic selections are ignored to avoid message storms.
- "no aggregation" split-by: field names come back as `{field}_{value}` from the engine but the schema uses `{field}_of_{value}`; `convertSplitByNoAggregationDataToSchemaFormat` rewrites keys - and there is a documented edge case where two non-OID-identical records can collide (`getMatchedRecords` note).
- `notAutoLoadUsedFieldsData: true` means the widget is responsible for field loading; the builder pushes used fields onto `useDataSources[0].fields` via `getSchemaOriginFields`. Removing this without wiring field loading will break queries.
- Layer definition sync nulls `timeInfo` (`syncOriginDsInfo`) - the output DS intentionally drops time info from the origin layer.
- Empty selection-view handling: `useEmptySelectionDataSource` treats a selection data view with zero records as "show placeholder", separate from a genuine query error.
- Changing origin DS to an unrelated layer wipes `webChart`/`tools`/`template` (config reset). This is intended but surprising when re-pointing a chart.

## Useful snippets and functions

Source: `src/runtime/chart/data-source/original.tsx` - original layer DS via DataSourceComponent, pushing instance into runtime state and bumping query version.
```tsx
const OriginDataSourceManager = (props: OriginDataSourceManagerProps) => {
  const { widgetId, useDataSource, onQueryRequired, onDataSourceStatusChange } = props
  const { queryVersion } = useChartRuntimeState()
  const dispatch = useChartRuntimeDispatch()

  const handleCreated = (dataSouce: DataSource) => {
    dispatch({ type: 'SET_DATA_SOURCE', value: dataSouce })
  }
  const handleQueryRequired = () => {
    dispatch({ type: 'SET_QUERY_VERSION', value: queryVersion + 1 })
    onQueryRequired?.()
  }

  return <DataSourceComponent
    widgetId={widgetId}
    useDataSource={useDataSource}
    onDataSourceCreated={handleCreated}
    onQueryRequired={handleQueryRequired}
    onDataSourceStatusChange={onDataSourceStatusChange}
  />
}
```

Source: `src/runtime/chart/data-source/output.tsx` - runtime output DS: push records into it, mark Unloaded, sync origin layer definition.
```tsx
React.useEffect(() => {
  if (!isDataSourceValid(outputDataSource) || !records) return
  outputDataSource.setSourceRecords(records)
  if (outputDataSource.getStatus() !== DataSourceStatus.Unloaded) {
    outputDataSource.setStatus(DataSourceStatus.Unloaded)
    outputDataSource.setCountStatus(DataSourceStatus.Unloaded)
  }
}, [outputDataSource, records])

const syncOriginDsInfo = (outputDataSource: FeatureLayerDataSource | SceneLayerDataSource) => {
  const originDs = DataSourceManager.getInstance().getDataSource(
    outputDataSource?.getDataSourceJson()?.originDataSources?.[0]?.dataSourceId
  ) as FeatureLayerDataSource | SceneLayerDataSource
  if (!outputDataSource || !originDs) return
  outputDataSource.setLayerDefinition({
    ...dataSourceUtils.getLayerDefinitionIntersection(originDs.getLayerDefinition(), outputDataSource),
    timeInfo: null
  })
}
```

Source: `src/setting/data-source/utils.ts` - initial output data source JSON (builder).
```ts
export const createInitOutputDataSource = (id: string, label: string, useDataSource: UseDataSource) => {
  const schema = getInitSchema(label) // only the __outputid__ OID field
  const outputDsJson: DataSourceJson = {
    id,
    type: DataSourceTypes.FeatureLayer,
    label,
    originDataSources: [useDataSource],
    isOutputFromWidget: true,
    isDataInDataSourceInstance: true,
    schema
  }
  return outputDsJson
}
```

Source: `src/runtime/chart/data-source/utils.ts` - memoize query and write DS schema back into app config at runtime.
```ts
export const updateDataSourceJson = (dsId: string, dsJson: ImmutableObject<DataSourceJson>) => {
  const oldAppConfig = getAppStore().getState().appConfig
  const appConfig = oldAppConfig.setIn(['dataSources', dsId], dsJson)
  utils.changeAppConfig(appConfig)
}
```

Source: `src/runtime/chart/data-source/index.tsx` - recompute output schema from query + series type and persist only when changed.
```tsx
let schema = null
if (splitByField) {
  if (splitByValues?.[splitByField]) {
    schema = getDataSourceSchemaForSplitBy(outputDataSource, dataSourceId, query, seriesRef.current, splitByValues[splitByField])
  }
} else {
  const seriesType = getSeriesType(seriesRef.current as any)
  schema = getDataSourceSchema(outputDataSource, dataSourceId, query, seriesType)
}
if (!schema) return
if (lodash.isDeepEqual(schema, dsJson.schema.asMutable({ deep: true }))) return
dsJson = dsJson.set('schema', schema)
updateDataSourceJson(outputDataSourceId, dsJson)
```

Source: `src/runtime/chart/web-chart/web-chart-component.tsx` - engine payload -> DataRecords, and the `<Chart>` bridge wiring.
```tsx
const handleDataProcessComplete = hooks.useEventCallback((e: ArcgisChartCustomEvent<DataProcessCompletePayload>) => {
  const dataItems = getDataItemsFromChartPayloadData(type, e.detail.chartData)
  const records = createRecordsFromChartData(dataItems, outputDataSource, isSplitByNoAggregation)
  dispatch({ type: 'SET_RECORDS', value: records })
  dispatch({ type: 'SET_RENDER_STATE', value: 'success' })
})

return (<Chart
  {...options}
  ref={handleCreated}
  config={webMapWebChart}
  runtimeDataFilters={runtimeDataFilters}
  layer={layer}
  chartLimits={chartLimits}
  selectionData={selectionData}
  onarcgisSelectionComplete={handleSelectionChange}
  onarcgisDataProcessComplete={handleDataProcessComplete}
  onarcgisDataProcessError={handleDataProcessError}
  onarcgisAxesMinMaxChange={handleAxesMinMaxChange}
/>)
```

Source: `src/runtime/chart/web-chart/utils/index.ts` - build DataRecords from arbitrary chart data items.
```ts
export const createRecordsFromChartData = (data = [], dataSource: DataSource, isSplitByNoAggregation?: boolean) => {
  const idField = dataSource.getIdField()
  if (isSplitByNoAggregation) {
    data = convertSplitByNoAggregationDataToSchemaFormat(data, dataSource.getSchema()?.fields)
  }
  return data?.map((item, i) => {
    const feature = { attributes: null }
    let data = { ...item }
    data[idField] = i
    data = matchCodedValueLabel(data)
    feature.attributes = data
    return dataSource.buildRecord(feature)
  })
}
```

Source: `src/runtime/chart/web-chart/utils/use-selection.ts` - publish selection change + two-way sync.
```ts
const selectedRecords = getMatchedRecords(sourceRecords, selectionItems)
const selectedIds = selectedRecords.map(record => record.getId())
preSelectedIdsRef.current = selectedIds

MessageManager.getInstance().publishMessage(
  new DataRecordsSelectionChangeMessage(widgetId, selectedRecords, [dataSourceId])
)
outputDataSource.selectRecordsByIds(selectedIds)

// DS -> chart
const originalSelectedIds = ReactRedux.useSelector(
  (state: IMState) => state.dataSourcesInfo?.[outputDataSource?.id]?.selectedIds
)
```

Source: `src/runtime/chart/tools/index.tsx` - data action list fed by the output DS selected records.
```tsx
const actionDataSets: DataRecordSet[] = React.useMemo(() => {
  const records = outputDataSource?.getSelectedRecords()
  const fields = getDataSourceFields(outputDataSource)
  return outputDataSource ? [{ name: dataActionLabel, type: 'selected', dataSource: outputDataSource, records, fields }] : []
}, [dataActionLabel, outputDataSource, selectedIds])
```

Source: `src/runtime/state/index.tsx` - the runtime store shape (context + reducer).
```ts
export interface ChartRuntimeState {
  chart?: HTMLArcgisChartElement
  dataSource?: DataSource
  outputDataSource?: DataSource
  records?: DataRecord[]
  queryVersion?: number
  renderStatus?: RenderStatus
}
```
