# SDK Samples - Feature Layer & Selection

Source-grounded reference cards for the minimal, single-concept feature-layer / selection widgets that ship under `ArcGISExperienceBuilder/sdk-resources/widgets/` (read-only vendor teaching samples, exbVersion 1.20.0). Each card is extracted from the ACTUAL `src` (not the README). For production patterns cross-check the OOTB arcgis widgets (`arcgis-feature-info`, `arcgis-list`, `arcgis-editor`) and the repo widgets that query feature data (`src/widgets/mesh-locations`, `src/widgets/premium-poi`, `src/widgets/wdvlos`).

Signatures below were verified against `ArcGISExperienceBuilder/client/{jimu-core,jimu-arcgis,jimu-data-source}/**/*.d.ts` for 1.20.0. jimu APIs are marked exact; JSAPI/`esri` and web-component (`arcgis-editor`) APIs are not jimu, so they are marked `(signature approx)`.

---

### feature-layer-class · Verified vs 1.20: yes
Teaches the DECLARATIVE query path: drive a `DataSourceComponent` with a `query` state object and re-render the resulting records; class-component form.

- **Source:** `feature-layer-class/src/runtime/widget.tsx`, `feature-layer-class/src/setting/setting.tsx`, `feature-layer-class/manifest.json`, `feature-layer-class/config.json` (empty).
- **Manifest reqs:** NONE special - `exbVersion 1.20.0`, `properties: {}`, NO `dependency` (no `jimu-arcgis`, no JSAPI). Consumes a data source, not a map.
- **Config shape:** none (`config.json` = `{}`). State only: `interface State { query: FeatureLayerQueryParams }`.
- **Key APIs (exact):**
  - `DataSourceComponent` props `useDataSource?: IMUseDataSource`, `query?: QueryParams`, `widgetId?: string`, `queryCount?: boolean`, `children?: DataRenderFunction | React.ReactNode`
  - `FeatureLayerQueryParams` (from `jimu-core`) - `{ where, outFields, pageSize, ... }` shape used here
  - `DataSource.getRecords(): DataRecord[]` and `DataSource.getStatus(): DataSourceStatus` (exact - common data source interface)
  - `DataRecord.getData(): any` / `DataRecord.getId(): string` (exact)
  - `DataSourceStatus` enum member `Loaded` (exact)
- **Builder side (setting.tsx):** `DataSourceSelector` (types `Immutable([DataSourceTypes.FeatureLayer])`) plus a `FieldSelector` (both from `jimu-ui/advanced/data-source-selector`). Field selection is folded back into `useDataSources[0].fields`:
  ```tsx
  onFieldChange = (allSelectedFields: IMFieldSchema[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useDataSources: [{ ...this.props.useDataSources[0], ...{ fields: allSelectedFields.map(f => f.jimuName) } }]
    })
  }
  ```
- **Runtime side (widget.tsx):** Build the `where` from an `<input>` ref, push it into `state.query`, and let `DataSourceComponent` execute it; render records in the child render function.
  ```tsx
  query = () => {
    if (!this.isDsConfigured()) return
    const fieldName = this.props.useDataSources[0].fields[0]
    const w = this.cityNameRef.current && this.cityNameRef.current.value
      ? `${fieldName} like '%${this.cityNameRef.current.value}%'`
      : '1=1'
    this.setState({ query: { where: w, outFields: ['*'], pageSize: 10 } })
  }
  // render:
  <DataSourceComponent useDataSource={this.props.useDataSources[0]} query={this.state.query} widgetId={this.props.id} queryCount>
    {this.dataRender}
  </DataSourceComponent>
  ```
- **Lifecycle/timing:** `componentDidMount()` calls `this.query()` once so the initial `where:'1=1'` is set. Each `Query` button click rebuilds `state.query`; the `DataSourceComponent` fires a new query only when the `query` OBJECT reference changes. `queryCount` makes `ds.count` available; `dataRender` guards on `ds.getStatus() === DataSourceStatus.Loaded`.
- **Cleanup/teardown:** none needed - no map view, no JSAPI handles, no manually created data source. `DataSourceComponent` manages its own subscription.
- **Critical gotchas:** The component does NOT run a query when `query` is undefined; pass `{}` (or `{where:'1=1'}`) to load everything. `isDsConfigured()` requires EXACTLY one field selected (`fields.length === 1`) because the render reads `useDataSources[0].fields[0]`. The `where` is built via string interpolation with raw user input - SQL-injection-shaped and unescaped; fine for a sample, must be parameterized/escaped on lift. `pageSize: 10` caps records per page.
- **Lift-into-repo:** Escape/whitelist the filter value (do not interpolate raw input into `where`). Apply repo code-style: always semicolons, `cond && fn();` guards, if-bodies on their own line. Class form is fine when you want explicit `componentDidMount` timing; otherwise prefer the function variant. See the function twin for the `createOutputDs` output-data-source prototype.
- **See also:** `feature-layer-function` (direct twin), `listen-selection-change`, `filter-feature-layer`; OOTB `arcgis-list`; repo `src/widgets/mesh-locations`, `references/sdk-samples/03-data-sources.md`.

---

### feature-layer-function · Verified vs 1.20: yes
Function-component twin of `feature-layer-class` - identical APIs and behavior via hooks; additionally ships a COMMENTED `createOutputDs` prototype showing how to publish an output data source.

- **Source:** `feature-layer-function/src/runtime/widget.tsx`, `feature-layer-function/src/setting/setting.tsx`, `feature-layer-function/manifest.json`, `feature-layer-function/config.json` (empty).
- **Manifest reqs:** NONE special - same as the class variant (`exbVersion 1.20.0`, no `dependency`).
- **Config shape:** none. Local hook state `useState<FeatureLayerQueryParams>(null)`.
- **Key APIs (exact):** same set as `feature-layer-class`:
  - `DataSourceComponent` props `useDataSource` / `query` / `widgetId` / `queryCount`
  - `DataSource.getRecords()` / `DataSource.getStatus()` / `DataSourceStatus.Loaded`
  - Commented prototype uses `DataSourceManager.getInstance()`, `getDataSource(dsId: string): DataSource`, `destroyDataSource(...)`, `createDataSource(...)` (exact - see `03-data-sources.md`)
- **Builder side (setting.tsx):** identical to the class variant (`DataSourceSelector` + `FieldSelector`, `onFieldChange` maps `f.jimuName` into `useDataSources[0].fields`).
- **Runtime side (widget.tsx):** Same query logic, hook form. The initial query runs from a mount-only `useEffect`:
  ```tsx
  const [query, setQuery] = useState<FeatureLayerQueryParams>(null)
  const cityNameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { queryFunc() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [])

  const queryFunc = () => {
    if (!isDsConfigured()) return
    const fieldName = props.useDataSources[0].fields[0]
    const w = cityNameRef.current && cityNameRef.current.value
      ? `${fieldName} like '%${cityNameRef.current.value}%'`
      : '1=1'
    setQuery({ where: w, outFields: ['*'], pageSize: 10 })
  }
  // dataRender begins with the commented hook: //createOutputDs(ds);
  ```
  The commented output-DS prototype (verbatim intent):
  ```tsx
  // const createOutputDs = (useDs: DataSource) => {
  //   if (!props.outputDataSources) return
  //   const outputDsId = props.outputDataSources[0]
  //   const dsManager = DataSourceManager.getInstance()
  //   if (dsManager.getDataSource(outputDsId)) {
  //     if (dsManager.getDataSource(outputDsId).getDataSourceJson().originDataSources[0].dataSourceId !== useDs.id) {
  //       dsManager.destroyDataSource(outputDsId)
  //     }
  //   }
  //   dsManager.createDataSource(outputDsId).then(ods => { ods.setRecords(useDs.getRecords()) })
  // }
  ```
- **Lifecycle/timing:** `useEffect(..., [])` seeds the first query on mount (equivalent to the class `componentDidMount`). Re-query on button click via `setQuery(newObject)`. Same `query`-object-identity trigger rule.
- **Cleanup/teardown:** none needed for the active sample. If you enable `createOutputDs`, you own that output data source lifecycle (`destroyDataSource` on origin change; the manager owns it otherwise).
- **Critical gotchas:** Same unescaped-`where` interpolation and `fields.length === 1` requirement as the class variant. The `createOutputDs` block is COMMENTED and requires `outputDataSources` to be declared in the manifest (`outputDataSources` / `useMutableStateProps`) plus importing `DataSourceManager` - it will no-op without manifest wiring. `queryFunc` is recreated every render (fine here; if referenced in deps, memoize).
- **Lift-into-repo:** Same escaping fix as the class twin. Prefer this function form for new widgets (hooks, less boilerplate). To emit an output DS, un-comment `createOutputDs`, declare `outputDataSources` in the manifest, and manage `destroy`/`create` per `03-data-sources.md`. Repo code-style: semicolons + short-circuit guards.
- **Class-vs-function contrast:** Same public APIs (`DataSourceComponent` + `FeatureLayerQueryParams` + `DataSourceStatus`). The CLASS variant uses `state.query` + `componentDidMount` for explicit lifecycle; the FUNCTION variant uses `useState` + mount `useEffect`. Only the function variant carries the `createOutputDs` output-DS prototype. No behavioral difference at runtime.
- **See also:** `feature-layer-class` (twin), `03-data-sources.md` (output data sources); OOTB `arcgis-list`; repo `src/widgets/premium-poi`.

---

### filter-feature-layer · Verified vs 1.20: yes
Teaches the IMPERATIVE filter path: grab the live `FeatureLayerDataSource` from `DataSourceManager` and call `updateQueryParams` to filter every widget bound to that source (e.g. a map layer), driven by a `TextInput`.

- **Source:** `filter-feature-layer/src/runtime/widget.tsx`, `filter-feature-layer/src/setting/setting.tsx`, `filter-feature-layer/src/config.ts`, `filter-feature-layer/manifest.json`.
- **Manifest reqs:** NONE special - `exbVersion 1.20.0`, `properties: {}`, NO `dependency` (uses `jimu-core` DS APIs, not the map view).
- **Config shape:**
  ```ts
  export interface Config { filterField: string }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `DataSourceManager.getInstance(): DataSourceManager` and `getDataSource(dsId: string): DataSource` (exact)
  - `FeatureLayerDataSource extends ArcGISQueriableDataSource` (exact type)
  - `updateQueryParams: (query: ArcGISQueryParams, widgetId: string) => void` (exact - on `ArcGISQueriableDataSource`)
  - `SqlQueryParams` (from `jimu-core`) - `{ where }` shape used here
  - `TextInput` (from `jimu-ui`) prop `onChange(evt)`; `WidgetPlaceholder` prop `icon` / `message`
- **Builder side (setting.tsx):** `DataSourceSelector` (`types Immutable([DataSourceTypes.FeatureLayer])`, `mustUseDataSource`, `hideDataView`) + `FieldSelector` restricted to `Immutable([JimuFieldType.String])`. Chosen field is stored in config:
  ```tsx
  const fieldsListChangeHandler = (evt) => {
    if (evt && evt.length === 1) {
      props.onSettingChange({ id: props.id, config: props.config.set('filterField', evt[0].name) })
    }
  }
  ```
- **Runtime side (widget.tsx):** Resolve the DS by id and filter on every keystroke.
  ```tsx
  const textInputChangeHandler = (evt) => {
    if (props.useDataSources.length > 0) {
      const dsManager = DataSourceManager.getInstance()
      const useDataSource = props.useDataSources[0]
      const ds: FeatureLayerDataSource = dsManager.getDataSource(useDataSource.dataSourceId) as FeatureLayerDataSource
      const queryParams: SqlQueryParams = {
        where: `${props.config.filterField} LIKE '%${evt.target.value}%'`
      }
      ds.updateQueryParams(queryParams, props.id)
    }
  }
  // render: <TextInput placeholder={...} onChange={(e) => { textInputChangeHandler(e) }} />
  // or a WidgetPlaceholder when no filterField is configured
  ```
- **Lifecycle/timing:** `updateQueryParams(query, widgetId)` sets the source's active filter immediately and pushes it to ALL widgets consuming that data source (the map layer re-renders filtered). No initial query is run by this widget - it only filters an already-configured source. Requires `props.config.filterField` before the `TextInput` renders.
- **Cleanup/teardown:** none created by the widget, but note the filter it applies PERSISTS on the shared data source after this widget unmounts. If a clean state matters, clear it (`ds.updateQueryParams({ where: '1=1' }, props.id)`) on unmount.
- **Critical gotchas:** Fires the query on EVERY keystroke - NO debounce; each character triggers a full `updateQueryParams` round-trip. The `where` is built by raw interpolation of `filterField` + user input (unescaped - SQL-injection-shaped). `getDataSource` returns `undefined` if the source is not yet created; the sample only guards `useDataSources.length > 0`, not DS existence. `widgetId` (2nd arg) namespaces the filter so different widgets' filters compose.
- **Lift-into-repo:** ADD debounce (e.g. debounce the handler ~300ms) so you do not hammer the service per keystroke. Escape/parameterize the value. Guard `if (!ds) return;`. Consider clearing the filter on unmount. Repo code-style: semicolons + `cond && fn();` guards, if-body on its own line.
- **See also:** `feature-layer-class` (declarative alternative via `DataSourceComponent query`), `listen-selection-change`; repo `src/widgets/wdvlos` (SQL filtering), `03-data-sources.md` (`updateQueryParams` / `mergeQueryParams`).

---

### clustering · Verified vs 1.20: yes
Teaches toggling JSAPI `featureReduction` clustering on the FIRST feature layer of the consumed map, reached through `JimuMapView.jimuLayerViews`.

- **Source:** `clustering/src/runtime/widget.tsx`, `clustering/src/setting/setting.tsx`, `clustering/manifest.json`, `clustering/config.json` (empty).
- **Manifest reqs:** `"dependency": "jimu-arcgis"` (string form); `exbVersion 1.20.0`; `properties: {}`. Consumes a map widget (`useMapWidgetIds`).
- **Config shape:** none (`config.json` = `{}`). State: `{ jimuMapView, clusterLayer: string, clusterStatus: boolean, errorTip: boolean }`.
- **Key APIs (exact):**
  - `JimuMapViewComponent` props `useMapWidgetId: string` (SINGULAR), `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void` (exact)
  - `JimuMapView.jimuLayerViews: JimuLayerViews` where `interface JimuLayerViews { [jimuLayerViewId: string]: JimuLayerView }` (exact)
  - `JimuLayerView.layer: any` (exact - typed `any` in the .d.ts; the underlying `__esri.FeatureLayer`)
  - `__esri.FeatureLayer.featureReduction` (signature approx - JSAPI property set to a `{ type: 'cluster', ... }` config or `null`)
  - `Checkbox` / `Label` / `WidgetPlaceholder` (from `jimu-ui`)
- **Builder side (setting.tsx):** `MapWidgetSelector` (from `jimu-ui/advanced/setting-components`) wired to `useMapWidgetIds`:
  ```tsx
  onMapSelected = (useMapWidgetIds: string[]) => {
    this.props.onSettingChange({ id: this.props.id, useMapWidgetIds: useMapWidgetIds })
  }
  ```
- **Runtime side (widget.tsx):** Capture the first `jimuLayerView` id on active-view change, then set/clear `featureReduction` from a checkbox.
  ```tsx
  clusterConfig = { type: 'cluster', clusterRadius: '100px', popupTemplate: { /* ... */ }, clusterMinSize: '24px', clusterMaxSize: '60px', labelingInfo: [ /* ... */ ] }

  clusterSwitch = (e) => {
    if (this.state.clusterStatus) {
      this.state.jimuMapView.jimuLayerViews[this.state.clusterLayer].layer.featureReduction = this.clusterConfig
    }
    if (!this.state.clusterStatus) {
      this.state.jimuMapView.jimuLayerViews[this.state.clusterLayer].layer.featureReduction = this.state.clusterStatus ? this.clusterConfig : null
    }
  }

  activeViewChangeHandler = (jmv: JimuMapView) => {
    if (jmv) {
      const jimuLayerViews = jmv.jimuLayerViews
      const jimuLayerViewIds = Object.keys(jimuLayerViews)[0]   // FIRST layer only
      if (jimuLayerViewIds === undefined) { jmv = null; return }
      this.setState({ jimuMapView: jmv, clusterLayer: jimuLayerViewIds, errorTip: false })
    } else {
      this.setState({ jimuMapView: undefined, clusterLayer: undefined, errorTip: true, clusterStatus: false })
    }
  }
  ```
- **Lifecycle/timing:** `onActiveViewChange` gives the `JimuMapView`; `jimuLayerViews` is keyed by JimuLayerView id and only populated once layer views have been created (this sample reads it synchronously in the handler and takes `Object.keys(...)[0]`). The cluster toggle mutates the layer's `featureReduction` on demand. For guaranteed-loaded layer views, `jmv.whenAllJimuLayerViewLoaded(): Promise<JimuLayerViews>` exists (exact) - the sample does not await it.
- **Cleanup/teardown:** none explicit. Because `featureReduction` mutates the SHARED map layer, the clustering it enables persists on the layer after this widget unmounts; reset to `null` on unmount if you need a clean map.
- **Critical gotchas:** Only ever clusters `Object.keys(jimuLayerViews)[0]` - the FIRST layer view; multi-layer maps are unhandled. `jimuLayerViews` may be empty at the moment `onActiveViewChange` fires (layer views load asynchronously); the sample guards `=== undefined` but does not await `whenAllJimuLayerViewLoaded()`, so a slow layer can miss the toggle. `clusterConfig` object literals (`type: 'cluster'`, sizes as `'px'` strings) are JSAPI `featureReduction` shapes, not typed here. The odd two-`if` `clusterSwitch` is faithful to source.
- **Lift-into-repo:** Await `jmv.whenAllJimuLayerViewLoaded()` before reading `jimuLayerViews`; let the user pick WHICH layer (or iterate all) instead of `[0]`. Type the cluster config against `__esri.FeatureReductionCluster`. Reset `featureReduction = null` on unmount. Repo code-style: semicolons, short-circuit guards.
- **See also:** `view-layers-toggle` (add/remove layers on `view.map`), `editor`, `showextent`; repo `src/widgets/grid-overlay`; `references/sdk-samples/01-map-view-binding.md`, `arcgis-jsapi-integration.md`.

---

### listen-selection-change · Verified vs 1.20: yes
Teaches selection: click a record to `selectRecordById`, and reflect the shared selection state via `getSelectedRecordIds` - selection is synced across every widget on that data source.

- **Source:** `listen-selection-change/src/runtime/widget.tsx`, `listen-selection-change/src/setting/setting.tsx`, `listen-selection-change/manifest.json`, `listen-selection-change/config.json` (empty).
- **Manifest reqs:** NONE special - `exbVersion 1.20.0`, `properties: {}`, NO `dependency`.
- **Config shape:** none (`config.json` = `{}`). No local state - render is data-source driven.
- **Key APIs (exact):**
  - `DataSource.selectRecordById: (id: string | number, record?: DataRecord) => void` (exact)
  - `DataSource.getSelectedRecordIds: () => Array<string | number>` (exact)
  - `DataSource.getRecords(): DataRecord[]`, `DataSource.getStatus(): DataSourceStatus`, `DataRecord.getId()` (exact)
  - `DataSourceComponent` props `useDataSource` / `query` / `widgetId` (exact); render prop `(ds: DataSource, info: IMDataSourceInfo) => ...`
  - `DataSourceStatus.Loaded` (exact); `classNames` (from `jimu-core`)
- **Builder side (setting.tsx):** `DataSourceSelector` only (from `jimu-ui/advanced/data-source-selector`) with `onToggleUseDataEnabled` + `onDataSourceChange`; no field selection needed (renders `getId()`).
- **Runtime side (widget.tsx):** Render each record as a button; click selects it, and the selected id gets a highlight class computed from `getSelectedRecordIds()`.
  ```tsx
  const dataRender = (ds: DataSource, info: IMDataSourceInfo) => {
    return <div className='record-list'>
      {ds && ds.getStatus() === DataSourceStatus.Loaded
        ? ds.getRecords().map((r, i) => (
            <Button type='tertiary' key={i}
              onClick={() => { ds.selectRecordById(r.getId()) }}
              className={classNames({ 'blue-border': ds.getSelectedRecordIds()?.includes(r.getId()) })}>
              {r.getId()}
            </Button>
          ))
        : null}
    </div>
  }
  // render:
  <DataSourceComponent useDataSource={props.useDataSources[0]} query={{ where: '1=1' } as FeatureLayerQueryParams} widgetId={props.id}>
    {dataRender}
  </DataSourceComponent>
  ```
- **Lifecycle/timing:** `query={{ where: '1=1' }}` loads all records on mount (a non-undefined `query` is required for `DataSourceComponent` to run). Clicking a button calls `selectRecordById(id)`, which updates the SHARED selection on the data source; because `DataSourceComponent` re-renders on info change, the `blue-border` class recomputes from `getSelectedRecordIds()`. Selection changes made by OTHER widgets (map, table) also re-render this one.
- **Cleanup/teardown:** none needed - `DataSourceComponent` owns the subscription; no map, no JSAPI. Note the selection itself is shared state that outlives this widget.
- **Critical gotchas:** `query={{ where: '1=1' }}` (not `undefined`) is what forces the load - an undefined `query` means no query runs. Selection is GLOBAL to the data source, not local to this widget (selecting here highlights the same record in a bound map/list). To also react to selections without owning them, a local data source must call `setListenSelection(true)`, or use `DataSourceComponent`'s `onSelectionChange?: (selection, preSelection) => void` (exact) instead of polling `getSelectedRecordIds`. `getSelectedRecordIds()` is called during render on every button - fine for small lists, O(n) per record for large ones.
- **Lift-into-repo:** For large lists, compute the selected-id `Set` once per render instead of calling `getSelectedRecordIds()` inside `.map`. Prefer the declarative `onSelectionChange` callback when you need to react to selection. Repo code-style: semicolons, short-circuit guards, if-body on its own line.
- **See also:** `feature-layer-class` / `feature-layer-function` (record rendering), `filter-feature-layer` (imperative filter); OOTB `arcgis-list` / `arcgis-feature-info`; repo `src/widgets/mesh-locations`; `03-data-sources.md`.

---

### editor · Verified vs 1.20: yes
Teaches embedding the JSAPI `arcgis-editor` web component, bound to the consumed `JimuMapView.view` - minimal map-editing surface with almost no glue code.

- **Source:** `editor/src/runtime/widget.tsx`, `editor/src/setting/setting.tsx`, `editor/manifest.json`, `editor/config.json` (empty).
- **Manifest reqs:** `"dependency": "jimu-arcgis"`; `exbVersion 1.20.0`; `properties: {}`. Runtime does a MODULE-LEVEL `import 'arcgis-map-components'` to register the `<arcgis-editor>` custom element.
- **Config shape:** none (`config.json` = `{}`). State: `{ jimuMapView: JimuMapView }`.
- **Key APIs (exact):**
  - `JimuMapViewComponent` props `useMapWidgetId: string`, `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void` (exact)
  - `JimuMapView.view` (exact - the `__esri.MapView | __esri.SceneView`)
  - `<arcgis-editor view={...}>` web component with a `view` property (signature approx - from `arcgis-map-components`, not jimu)
  - `import 'arcgis-map-components'` side-effect import that upgrades `<arcgis-*>` elements (approx)
- **Builder side (setting.tsx):** `MapWidgetSelector` wired to `useMapWidgetIds` (same shape as `clustering`'s setting).
- **Runtime side (widget.tsx):** Store the active view, then render the web component with its `view` property bound (React 19 property-binding style, no ref).
  ```tsx
  import { type AllWidgetProps, React } from 'jimu-core'
  import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
  import 'arcgis-map-components'

  activeViewChangeHandler = (jmv: JimuMapView) => { this.setState({ jimuMapView: jmv }) }

  render () {
    return (
      <div className="widget-js-api-editor" style={{ height: '100%', overflow: 'auto' }}>
        {this.state.jimuMapView
          ? <arcgis-editor view={this.state.jimuMapView?.view}></arcgis-editor>
          : <p>Please select a map.</p>}
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]} onActiveViewChange={this.activeViewChangeHandler} />
      </div>
    )
  }
  ```
- **Lifecycle/timing:** `<arcgis-editor>` only renders once `state.jimuMapView` is set (after `onActiveViewChange` fires); until then a `Please select a map.` placeholder shows. Setting `view` as a PROPERTY (JSX attribute maps to the element property under React 19) binds the editor to the live map. The custom element must be registered - hence the module-level `import 'arcgis-map-components'` before any render.
- **Cleanup/teardown:** none explicit in the sample. The `<arcgis-editor>` element is created/removed by React render (mount/unmount of the JSX), so no manual `.destroy()` is wired. If a view swaps to null the element unmounts via the ternary. When lifting, consider explicit teardown if the editor holds edit sessions.
- **Critical gotchas:** The `import 'arcgis-map-components'` is REQUIRED and must run at module load (not inside a handler) or `<arcgis-editor>` never upgrades and renders as an empty unknown element. `view` is bound as a property, not a string attribute - contrast the older ref-based `use-map-components` pattern (repo memory: `use-web-components-19` supersedes it). `useMapWidgetId` is singular; pass `useMapWidgetIds?.[0]`. This is JSAPI/web-component territory - the editor's own API surface is not in the jimu `.d.ts`.
- **Lift-into-repo:** Ensure `arcgis-map-components` is available in the build; keep the import module-level. Prefer this JSX property-binding form over `document.createElement`. If your app allows unsaved edits, add explicit teardown/guard around edit sessions. Repo code-style: semicolons, short-circuit guards.
- **See also:** `js-api-widget` (same web-component pattern for `arcgis-legend` with manual `createElement`/`destroy`), `clustering`, `showextent`; OOTB `arcgis-editor` widget; `references/sdk-samples/01-map-view-binding.md`, `arcgis-jsapi-integration.md`.

---
