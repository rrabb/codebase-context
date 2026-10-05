# SDK Samples - Data Sources

These are the six minimal, single-concept teaching samples that live under
`ArcGISExperienceBuilder/sdk-resources/widgets/data-source-widgets/`. They are read-only vendor
reference (do NOT edit in place; lift patterns into `src/widgets/**`). Each isolates ONE data-source
concept: client-side output, server-side output, statistic output, field usage, external output DS,
and runtime DS. For a production-grade, fully wired implementation always cross-check the OOTB
`arcgis/query` widget (and other OOTB widgets that output data sources) - these samples deliberately
skip debouncing, i18n, error UX, and edge-case handling.

Verified against ExB 1.20 `.d.ts` under `ArcGISExperienceBuilder/client/{jimu-core,jimu-data-source,jimu-for-builder}`.
All six manifests declare `exbVersion 1.20.0`.

Core distinction to keep straight:
- **client-side** output: `isDataInDataSourceInstance: true` + query origin -> `outputDs.setSourceRecords(records)`.
- **server-side** output: copy origin url/itemId/layerId -> `outputDs.mergeQueryParams(...)` + `outputDs.updateQueryParams(...)`.
- **statistic** output: origin `.query({ outStatistics })` -> client-side `setSourceRecords` with a hand-built stat schema.
- **external** output (no origin): explicit `schema` in the DS json + `ds.buildRecord({ attributes })` from arbitrary data.
- **runtime** DS: `ServiceManager.fetchServiceInfo` -> `dataSourceUtils.dataSourceJsonCreator.createDataSourceJsonByLayerDefinition` -> `DataSourceManager.createDataSource(options)`, never saved to config.

Output data sources for the first three samples are registered via the **2nd argument** of
`props.onSettingChange(widgetJson, outputDataSourcesJson)`, NOT via the manifest.

---

### client-side-output · Verified vs 1.20: yes
Runs an attribute (SQL) query on the origin DS and pushes the resulting records into a client-side output DS.

- **Source:** `src/runtime/widget.tsx`, `src/setting/setting.tsx`, `src/config.ts`, `manifest.json`
- **Manifest reqs:** NONE. `manifest.json` has no `outputDataSources` and no `dependency` key. The output DS is registered at design time through the 2nd arg of `props.onSettingChange(widgetJson, outputDsJsons)` in `setting.tsx`; the framework then exposes it at runtime as `props.outputDataSources[0]`.
- **Config shape:**
  ```ts
  export interface Config { sqlExpression?: IMSqlExpression }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `onSettingChange: (widgetJson: Partial<WidgetJson>, outputDataSourcesJson?: DataSourceJson[]) => void`
  - `dataSourceUtils.getArcGISSQL(sqlExprObj: IMSqlExpression, dataSource: DataSource, intl?: IntlShape): SqlResult`
  - `query: (query: ArcGISQueryParams, options?: QueryOptions) => Promise<QueryResult>` (FeatureLayerDataSource)
  - `setSourceRecords: (records: FeatureDataRecord[]) => void`
  - `setStatus?: (status: DataSourceStatus) => void` and `setCountStatus?: (status: DataSourceStatus) => void`
- **Builder side (setting.tsx):** `DataSourceSelector` picks a FeatureLayer; on change it builds a `DataSourceJson` with `isDataInDataSourceInstance: true` and registers it as the output DS. A `SqlExpressionBuilderPopup` saves the SQL to config and mirrors used fields onto the use-data-source.
  ```tsx
  const outputDsJsons: DataSourceJson[] = [{
    id: `${this.props.id}-ouput`,
    type: DataSourceTypes.FeatureLayer,
    label: `${this.props.manifest.name}-output-data-source`,
    geometryType: originDs.getDataSourceJson().geometryType,
    originDataSources: [useDataSources[0]],
    isDataInDataSourceInstance: true
  }]
  this.props.onSettingChange({ id: this.props.id, useDataSources }, outputDsJsons)
  ```
- **Runtime side (widget.tsx):** A `DataSourceComponent` for the origin DS fires `onDataSourceCreated`, which queries the origin with the configured SQL and copies records into the output DS.
  ```tsx
  const sql = dataSourceUtils.getArcGISSQL(this.props.config.sqlExpression, this.getOriginDataSource()).sql || '1=1'
  const featureLayerDs = this.getOriginDataSource() as FeatureLayerDataSource
  featureLayerDs.query({ where: sql }).then(res => {
    this.getOutputDataSource()?.setSourceRecords(res.records)
    this.getOutputDataSource()?.setStatus(DataSourceStatus.Unloaded)
    this.getOutputDataSource()?.setCountStatus(DataSourceStatus.Unloaded)
  })
  ```
- **Lifecycle/timing:** Builder registers the output DS json on data-source change. At runtime the output DS **instance** does not exist until a consumer widget (e.g. List) uses it via a `DataSourceComponent`; the framework then creates it on the fly. Population is triggered by the origin `DataSourceComponent`'s `onDataSourceCreated`/`onCreateDataSourceFailed`, and manually by the "Update output data source" button.
- **Cleanup/teardown:** None needed. No watchers or handles are registered; the origin `DataSourceComponent` is torn down by React. The output DS lifecycle is framework-managed.
- **Critical gotchas:**
  - If `getOutputDataSource()` is falsy, the code returns early - the output DS instance only exists **once another widget consumes it**. A lone widget populating "nothing" is expected.
  - Output DS starts as `NotReady` (widget-generated DS default). You must flip it to `Unloaded` after `setSourceRecords` so consumers know it can be queried; set it back to `NotReady` if the origin instance is missing.
  - `isDataInDataSourceInstance: true` is what makes it client-side: records live in the instance and are served from memory, not re-fetched from a service.
  - No auto-refresh: if the origin filter changes, the output is stale until the button re-runs the query.
- **Lift-into-repo:** Repo code-style wants semicolons and short-circuit guard calls (`ds && ds.setStatus(...)`). Note the sample typo `-ouput` in the id/label - keep it consistent within a widget but prefer fixing to `-output` in new code. Consider debouncing the "update" path and watching origin query changes instead of relying on a manual button.
- **See also:** `server-side-output` (query-params variant), `statistic-client-side-output` (stat variant), OOTB `arcgis/query`.

---

### server-side-output · Verified vs 1.20: yes
Builds a server-side output DS that points at the same service as the origin and applies a merged SQL query params, so consumers re-query the service.

- **Source:** `src/runtime/widget.tsx`, `src/setting/setting.tsx`, `src/config.ts`, `manifest.json`
- **Manifest reqs:** NONE. Same as client-side: no `outputDataSources`/`dependency` in `manifest.json`; the output DS is registered via the 2nd arg of `props.onSettingChange`.
- **Config shape:**
  ```ts
  export interface Config { sqlExpression?: IMSqlExpression }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `getCurrentQueryParams: (options?: GetCurrentQueryParamsOptions) => ArcGISQueryParams`
  - `mergeQueryParams: (...queries: ArcGISQueryParams[]) => ArcGISQueryParams`
  - `updateQueryParams: (query: ArcGISQueryParams, widgetId: string) => void`
  - `dataSourceUtils.getArcGISSQL(sqlExprObj, dataSource, intl?): SqlResult`
  - `setStatus?/setCountStatus?: (status: DataSourceStatus) => void`
- **Builder side (setting.tsx):** Same shape as client-side, but the output `DataSourceJson` copies the origin service coordinates so the output DS can hit the server, and mirrors the origin's `isDataInDataSourceInstance` (typically false = server-side).
  ```tsx
  const outputDsJsons: DataSourceJson[] = [{
    id: `${this.props.id}-ouput`,
    type: DataSourceTypes.FeatureLayer,
    label: `${this.props.manifest.name}-output-data-source`,
    geometryType: originDs.getDataSourceJson().geometryType,
    originDataSources: [useDataSources[0]],
    url: originDs.getDataSourceJson().url,
    itemId: originDs.getDataSourceJson().itemId,
    layerId: originDs.getDataSourceJson().layerId,
    portalUrl: originDs.getDataSourceJson().portalUrl,
    isDataInDataSourceInstance: originDs.getDataSourceJson().isDataInDataSourceInstance
  }]
  this.props.onSettingChange({ id: this.props.id, useDataSources }, outputDsJsons)
  ```
- **Runtime side (widget.tsx):** Instead of `setSourceRecords`, it merges the origin's current query params with the configured SQL and pushes them onto the output DS.
  ```tsx
  const sql = dataSourceUtils.getArcGISSQL(this.props.config.sqlExpression, this.getOriginDataSource()).sql || '1=1'
  const configuredQueryParams = { where: sql } as QueryParams
  const mergedQueryParams = featureLayerOutputDs.mergeQueryParams(
    featureLayerOriginDs.getCurrentQueryParams(), configuredQueryParams)
  featureLayerOutputDs.updateQueryParams(mergedQueryParams, this.props.id)
  featureLayerOutputDs.setStatus(DataSourceStatus.Unloaded)
  featureLayerOutputDs.setCountStatus(DataSourceStatus.Unloaded)
  ```
- **Lifecycle/timing:** Same as client-side: builder registers the json, the runtime instance appears only when a consumer uses it, population fires from the origin `DataSourceComponent` callbacks and the manual button.
- **Cleanup/teardown:** None needed. `updateQueryParams` is keyed by `this.props.id`; the framework tracks per-widget applied queries, no manual removal in this sample.
- **Critical gotchas:**
  - The output DS carries `url`/`itemId`/`layerId`/`portalUrl` so it can query the service itself - omit these and the server-side DS has nothing to hit.
  - `updateQueryParams(query, widgetId)` requires the widget id; it registers this widget's applied query against the output DS rather than materializing records.
  - Consumers do the actual fetch; this widget only sets params + status. `NotReady` -> `Unloaded` semantics are identical to client-side.
  - Same "no auto-refresh on origin change" trap; the button re-merges current origin params.
- **Lift-into-repo:** Prefer server-side output for large layers (no client memory blow-up). Add semicolons + short-circuit guards; the `-ouput` typo is present here too. If you need consumers to react to origin filters live, watch the origin query in an effect rather than a button.
- **See also:** `client-side-output` (records-in-instance variant), OOTB `arcgis/query`.

---

### statistic-client-side-output · Verified vs 1.20: yes
Runs an `outStatistics` aggregation on the origin DS and stores the single stat row as a client-side output DS with a hand-built schema.

- **Source:** `src/runtime/widget.tsx`, `src/setting/setting.tsx`, `src/config.ts`, `manifest.json`
- **Manifest reqs:** NONE. Output DS registered via 2nd arg of `props.onSettingChange`; no manifest keys.
- **Config shape:**
  ```ts
  export enum StatFunctions { avg = 'avg', sum = 'sum', min = 'min', max = 'max' }
  export interface Config { statFunctions?: StatFunctions[]; numberField?: string }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `query: (query: ArcGISQueryParams, options?: QueryOptions) => Promise<QueryResult>` (with `outStatistics`)
  - `setSourceRecords: (records: FeatureDataRecord[]) => void`
  - `getSchema: () => IMDataSourceSchema` / `getRecords: () => DataRecord[]`
  - `onSettingChange(widgetJson, outputDataSourcesJson?: DataSourceJson[])` (schema supplied inline)
  - `DataSourceComponent` with `onDataSourceInfoChange` for loading state
- **Builder side (setting.tsx):** `FieldSelector` (numeric only) + a `MultiSelect` of stat functions. On any change it rebuilds an output `DataSourceJson` whose `schema` has an `objectid` id field plus one numeric field per selected stat function.
  ```tsx
  getOutputDsSchema = (originFieldName?, statFuncs?): DataSourceSchema => {
    const statFields = {}
    statFuncs?.forEach(s => {
      statFields[s] = { jimuName: s, type: JimuFieldType.Number, name: s,
        originFields: originFieldName ? [originFieldName] : [] }
    })
    return { label: `${this.props.manifest.name}-output-data-source`, idField: 'objectid',
      fields: { objectid: { jimuName: 'objectid', type: JimuFieldType.Number, name: 'objectid' }, ...statFields } }
  }
  // ...output json also sets isDataInDataSourceInstance: true and schema: outputDsSchema
  ```
- **Runtime side (widget.tsx):** Queries the origin with `outStatistics`, stamps a synthetic `objectid` onto each returned feature, and stores rows client-side. A second `DataSourceComponent` (on the output DS) renders the stat rows.
  ```tsx
  const outStatistics = this.props.config.statFunctions.asMutable().map(f => ({
    onStatisticField: this.props.config.numberField,
    outStatisticFieldName: f,
    statisticType: f
  }))
  featureLayerDs.query({ outFields: ['*'], outStatistics }).then(statResult => {
    const records = statResult.records.map((r, i) => {
      const rec = r as FeatureDataRecord
      const data = rec.getData(); data.objectid = i; rec.feature.attributes = data
      return r
    })
    this.getOutputDataSource()?.setSourceRecords(records)
    this.getOutputDataSource()?.setStatus(DataSourceStatus.Unloaded)
    this.getOutputDataSource()?.setCountStatus(DataSourceStatus.Unloaded)
  })
  ```
- **Lifecycle/timing:** Builder writes both config and output json on every field/function change. Runtime population fires from the origin `DataSourceComponent` callbacks + manual button. The second `DataSourceComponent` (output) is rendered only when `props.outputDataSources[0]` exists, and drives `isLoading` via `onDataSourceInfoChange`.
- **Cleanup/teardown:** None needed. Both `DataSourceComponent`s are unmounted by React; `isLoading` state is derived from `onDataSourceInfoChange`.
- **Critical gotchas:**
  - Statistic query results have no OID, so the sample injects `objectid = i` and writes it back to `feature.attributes` - required because the output schema's `idField` is `objectid`.
  - The output schema is **synthesized in the builder** (one field per stat function). Change the selected functions and the schema/output json must be re-registered, or consumers see stale fields.
  - Early-return guard also checks `statFunctions?.length > 0` and `numberField`; without both, the DS is forced to `NotReady`.
  - Still client-side (`isDataInDataSourceInstance: true`) + `NotReady` -> `Unloaded` after populate.
- **Lift-into-repo:** Good template for KPI/summary widgets. Add semicolons + guards; validate the numeric field type as the sample does (`JimuFieldType.Number`). The mutation of `feature.attributes` is a controlled hack - document it if you copy it.
- **See also:** `client-side-output` (non-stat variant), OOTB `arcgis/query` and chart/summary widgets.

---

### how-to-use-fields · Verified vs 1.20: yes
Contrasts `DataSourceComponent`/`load` (records cached in the instance and shared) against a direct `ds.query` (results returned, not cached), and shows how selected fields flow through both.

- **Source:** `src/runtime/widget.tsx`, `src/setting/setting.tsx`, `src/config.ts`, `manifest.json`
- **Manifest reqs:** NONE. No output DS at all; this sample only **consumes** a data source. `useDataSources` and selected `fields` are saved on the widget json.
- **Config shape:**
  ```ts
  export interface Config {} // empty - state lives in useDataSources.fields, not config
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `DataSourceManager.getInstance().getDataSource(dsId)` and `createDataSourceByUseDataSource(useDs, localId?, batchInstanceStatusChange?): Promise<DataSource>`
  - `query: (query: ArcGISQueryParams, options?: QueryOptions) => Promise<QueryResult>`
  - `DataSourceComponent` (load path) + `ds.getRecords(): DataRecord[]`
  - `FieldSelector` `onChange(fields: IMFieldSchema[])`; fields saved via `useDataSource.set('fields', ...)`
- **Builder side (setting.tsx):** `DataSourceSelector` + multi `FieldSelector`. Selected fields are written onto `useDataSources[0].fields` (not into config).
  ```tsx
  const onFieldsChange = (fields: IMFieldSchema[]) => {
    const useDataSource = props.useDataSources[0]
      .set('fields', fields?.map(f => f.jimuName)).asMutable({ deep: true })
    props.onSettingChange({ id: props.id, useDataSources: [useDataSource] })
  }
  ```
- **Runtime side (widget.tsx):** A `Select` toggles LOAD vs QUERY. LOAD uses `DataSourceComponent` (no `outFields` needed - fields come from the saved use-data-source) and reads `ds.getRecords()`. QUERY calls `ds.query` with explicit `outFields` and holds results in local state.
  ```tsx
  // QUERY path
  createDataSource(props.useDataSources[0]).then((ds: FeatureLayerDataSource) =>
    ds.query({ where: '1=1', outFields: props.useDataSources[0].fields?.asMutable() })
      .then(res => setQueryResults(res.records as FeatureDataRecord[])))
  // helper: get-then-create, never cache the instance
  return DataSourceManager.getInstance().getDataSource(useDataSource.dataSourceId)
    || (await DataSourceManager.getInstance().createDataSourceByUseDataSource(useDataSource))
  ```
- **Lifecycle/timing:** In LOAD mode the effect resets local results and lets `DataSourceComponent` fetch + cache into the instance. In QUERY mode the effect (keyed on `queryType` + `useDataSources`) creates/gets the DS and queries directly. Field changes in settings re-run the effect.
- **Cleanup/teardown:** None needed. No manual watchers; the DS instance is fetched on demand (never stored in state) so it cannot be accessed after destroy.
- **Critical gotchas:**
  - **load vs query semantics:** `load` (via `DataSourceComponent`) caches records in the instance and shares them; adding fields triggers a top-up fetch, but **removing** fields does not change load status (stale-wide records remain). `query` re-requests whenever fields change and never caches.
  - Do not stash the DS instance in state/refs; get it fresh each time (`getDataSource() || createDataSourceByUseDataSource()`), otherwise you risk using a destroyed instance.
  - LOAD path intentionally omits `outFields` because fields are persisted on `useDataSources`; QUERY path must pass `outFields` explicitly.
- **Lift-into-repo:** Best reference for "should I load or query?". Add semicolons + guards. Persist consumed fields on the use-data-source (as here) so other widgets and the framework know which fields you need.
- **See also:** `client-side-output` (produces output vs this one consumes), OOTB `arcgis/query`, `arcgis/table`.

---

### output-data-source-without-original-data-sources · Verified vs 1.20: yes
Creates a fully external output DS (no origin service) from arbitrary REST data (GitHub issues), using an explicit schema and `ds.buildRecord`.

- **Source:** `src/runtime/widget.tsx`, `src/setting/setting.tsx`, `src/constants.ts`, `src/config.ts`, `manifest.json`
- **Manifest reqs:** NONE. `manifest.json` has no `outputDataSources`/`dependency`. The output DS (with explicit `schema`, no `originDataSources`) is registered via the 2nd arg of `props.onSettingChange` when the user clicks "Save the output data source".
- **Config shape:**
  ```ts
  export interface Config { defaultRepo: string; defaultOwner: string }
  export type IMConfig = ImmutableObject<Config>
  // constants.ts: DEFAULT_CONFIG = Immutable({ defaultOwner: 'facebook', defaultRepo: 'react' })
  ```
- **Key APIs (exact):**
  - `DataSourceManager.getInstance().createDataSource(dsJson: IMDataSourceJson, ...): Promise<DataSource>`
  - `buildRecord: (data: any) => DataRecord` (base) / `(feature: IFeature | __esri.Graphic) => FeatureDataRecord` (feature layer)
  - `setSourceRecords: (records: DataRecord[]) => void` / `getSourceRecords: () => DataRecord[]`
  - `setStatus?/setCountStatus?: (status: DataSourceStatus) => void` (uses `NotReady`, `Unloaded`, `LoadError`)
  - `record.getFieldValue: (jimuFieldName: string) => any`
- **Builder side (setting.tsx):** A button registers an output `DataSourceJson` with an explicit `SCHEMA` (from `constants.ts`) and `isDataInDataSourceInstance: true`, and no `originDataSources`. After that, two `TextInput`s edit owner/repo into config.
  ```tsx
  const outputDsJsons: DataSourceJson[] = [{
    id: `${props.id}-output`,
    type: DataSourceTypes.FeatureLayer,
    label: `${props.manifest.name}-output-data-source`,
    geometryType: 'esriGeometryPoint',
    isDataInDataSourceInstance: true,
    schema: SCHEMA
  }]
  props.onSettingChange({ id: props.id }, outputDsJsons)
  ```
- **Runtime side (widget.tsx):** On mount it creates the output DS **instance itself** (there is no consumer needed), fetches issues over `fetch`, and turns each into a record via `ds.buildRecord({ attributes })`.
  ```tsx
  useEffect(() => {
    if (props.outputDataSources?.[0]) {
      setIsLoading(true)
      DataSourceManager.getInstance().createDataSource(props.outputDataSources[0]).finally(() => setIsLoading(false))
    }
  }, [props.outputDataSources])
  // ...after fetch:
  ds.setSourceRecords(issues.map(d => ds.buildRecord({ attributes: d })))
  ds.setStatus(DataSourceStatus.Unloaded); ds.setCountStatus(DataSourceStatus.Unloaded)
  // on error: ds.setStatus(DataSourceStatus.LoadError)
  ```
- **Lifecycle/timing:** Builder registers the json only once (button). Unlike the first three samples, the runtime **explicitly** calls `createDataSource(props.outputDataSources[0])` on mount so the instance exists without a consumer. `Widget.getFullConfig`/`Setting.getFullConfig` merge `DEFAULT_CONFIG`.
- **Cleanup/teardown:** None explicit. The instance is fetched fresh via `getDataSource` inside effects (comment warns against caching it). Framework owns destroy.
- **Critical gotchas:**
  - No `originDataSources` -> you MUST supply a complete `schema` (idField + fields) in the DS json; the framework has nothing to infer from.
  - `buildRecord({ attributes })` maps raw object keys to the schema's field names; keys must line up with `SCHEMA.fields.*.name`.
  - This is the sample that creates its own output DS instance at runtime (`createDataSource`) instead of waiting for a consumer - because it also renders the data itself.
  - Uses `LoadError` on fetch failure (the other outputs only toggle `NotReady`/`Unloaded`).
  - `getFullConfig` on both widget and setting is required so `defaultOwner`/`defaultRepo` exist before the user edits them.
- **Lift-into-repo:** Ideal template for "wrap an external/non-ArcGIS API as a data source". Add semicolons + guards. Never send tokens through logs; the sample reads a PAT in a password `TextInput` and sends it in the `Authorization` header - keep secrets out of config/state persistence. Consider paging limits (sample caps at 3 pages).
- **See also:** `runtime-data-source-without-saving-to-config` (also builds a DS at runtime but from a service), OOTB `arcgis/query`.

---

### runtime-data-source-without-saving-to-config · Verified vs 1.20: yes
Creates a throwaway FeatureLayer DS from a user-entered service URL at runtime, never persisted to config, and destroys/recreates it on each run.

- **Source:** `src/runtime/widget.tsx`, `src/setting/setting.tsx` (empty), `src/config.ts`, `manifest.json`
- **Manifest reqs:** NONE. No `outputDataSources`, no `dependency`, no settings. The DS is created entirely at runtime with a widget-scoped id (`${props.id}_runtime_data`) and never registered in the app config.
- **Config shape:**
  ```ts
  export interface Config {} // empty - nothing is saved
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `ServiceManager.getInstance().fetchServiceInfo(url: string): Promise<ServiceInfo>`
  - `dataSourceUtils.dataSourceJsonCreator.createDataSourceJsonByLayerDefinition(dsId: string, layerDefinition: ServiceDefinition, url: string, dsJsonInConfig?, schemaInConfig?): IMDataSourceJson`
  - `DataSourceManager.getInstance().createDataSource(options: DataSourceConstructorOptions): Promise<DataSource>`
  - `DataSourceManager.getInstance().destroyDataSource(dsId: string): void`
  - `load: (query: ArcGISQueryParams, options?: QueryOptions) => Promise<FeatureDataRecord[]>`
- **Builder side (setting.tsx):** Nothing - literally renders `No settings are needed`. All work happens at runtime.
- **Runtime side (widget.tsx):** A `TextInput` holds a layer URL. "Create" destroys any prior instance, fetches service info, builds a DS json from the layer definition, creates the instance, and `load`s it.
  ```tsx
  DataSourceManager.getInstance().destroyDataSource(DATA_SOURCE_ID)
  createDataSource(DATA_SOURCE_ID, url)
    .then((ds: FeatureLayerDataSource) => ds.load({ where: '1=1', outFields: ['*'] }, { widgetId: props.id }))
  // helper:
  const layerDefinition = await ServiceManager.getInstance().fetchServiceInfo(url).then(res => res.definition)
  const dsJson = dataSourceUtils.dataSourceJsonCreator.createDataSourceJsonByLayerDefinition(dsId, layerDefinition, normalizedUrl)
  const dsOptions: FeatureLayerDataSourceConstructorOptions = { id: dsId, dataSourceJson: dsJson }
  return DataSourceManager.getInstance().createDataSource(dsOptions)
  ```
- **Lifecycle/timing:** All at runtime, driven by the "Create" button (effect keyed on `isLoading`/`url`). The instance id is namespaced to the widget (`${props.id}_runtime_data`). Nothing touches `onSettingChange` or config.
- **Cleanup/teardown:** `destroyDataSource(DATA_SOURCE_ID)` is called at the **start** of each create to reset the prior instance. Note there is no unmount cleanup effect in the sample - a production version should also `destroyDataSource` in an effect cleanup / on unmount.
- **Critical gotchas:**
  - Two-step build is mandatory: `fetchServiceInfo(url).definition` -> `createDataSourceJsonByLayerDefinition(id, definition, url)` -> `createDataSource({ id, dataSourceJson })`. You cannot create a service DS from a bare URL directly.
  - URL is normalized (strip query, force https, trim slashes) and must end in a numeric layer id, else it rejects.
  - `createDataSource` here takes the **options** overload `{ id, dataSourceJson }` (a `FeatureLayerDataSourceConstructorOptions`), distinct from the `dsJson`/`mainDataSourceId` overloads.
  - Because it is never saved to config, the DS vanishes on reload; it is not shareable with other widgets across sessions. Re-running destroys and recreates the same id.
  - `createDataSourceJsonByJSAPILayer(dsId, layer, ...)` is the alternative when you already hold a Maps SDK layer (commented in the sample).
- **Lift-into-repo:** Great template for ad-hoc "add layer by URL" tools. Add semicolons + guards; add an unmount cleanup that calls `destroyDataSource`. Validate/normalize the URL as the sample does. Prefer passing `{ widgetId: props.id }` to `load` so applied queries are attributed correctly.
- **See also:** `output-data-source-without-original-data-sources` (runtime create from external data), OOTB `arcgis/query`, add-data / map widgets that add runtime layers.
