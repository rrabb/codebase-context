# SDK Samples - Data Actions, Messaging, State & Expressions

Minimal, teaching-only widgets from `ArcGISExperienceBuilder/sdk-resources/widgets/**` that isolate one framework mechanism each: a DATA action (`AbstractDataAction`), a MESSAGE action (`AbstractMessageAction`), cross-widget state control (`appActions` + `WidgetManager`), a per-widget REDUX store extension, and expression resolution over records. Treat these as read-only vendor reference; lift patterns into `src/widgets/**`, do not edit in place. All samples declare `exbVersion 1.20.0` and signatures below are verified against the local `jimu-core` 1.20 `.d.ts`.

Key distinction to keep straight:
- DATA action (`AbstractDataAction`) - user-triggered action on a data source / records; returns `Promise<boolean | React.ReactElement>`; declared under manifest `dataActions[]`.
- MESSAGE action (`AbstractMessageAction`) - reacts to a published `Message` (e.g. selection change); returns `Promise<boolean> | boolean`; declared under manifest `messageActions[]`, may have a `settingUri`.
- REDUX store extension (`extensionSpec.ReduxStoreExtension`) - registers a keyed slice + reducer into the app store; declared under manifest `extensions[]` at point `REDUX_STORE`.
- `MutableStoreManager` - lightweight per-widget mutable state reaching the widget via `props.mutableStateProps` (no reducer).
- Expression resolution (`ExpressionResolverComponent` / `expressionUtils`) - resolves a configured `Expression` against records at runtime.

---

### data-action-only · Verified vs 1.20: yes
Registers a data action that returns a React element (rendered by ExB in a Popper) instead of mutating state.

- **Source:** `manifest.json`, `src/data-actions/show-id.tsx` (no runtime widget UI; action-only widget).
- **Manifest reqs:** `properties: {}`; declares one data action:
  ```json
  "dataActions": [
    { "name": "showId", "label": "show id", "uri": "data-actions/show-id", "icon": "../icon.svg" }
  ]
  ```
  `uri` is the module path (no extension) resolved from `src/`. No `messageActions`, no `extensions`, no `hasConfig`.
- **Config shape:** none.
- **Key APIs (exact):**
  - `abstract isSupported(dataSets: DataRecordSet[], dataLevel: DataLevel, widgetId: string): Promise<boolean>`
  - `abstract onExecute(dataSets: DataRecordSet[], dataLevel: DataLevel, widgetId: string, actionConfig?: any): Promise<boolean | React.ReactElement>`
  - (base class) `export declare abstract class AbstractDataAction implements DataAction`
  - `Popper` (from `jimu-ui`) - `open`, `toggle`, `reference`, `arrowOptions` props.
- **Builder side (setting.tsx):** no setting.
- **Runtime side (widget.tsx):** none. The action class IS the deliverable. `onExecute` collects unique data source ids and returns a `MyPopper` element:
  ```tsx
  export default class ExportJson extends AbstractDataAction {
    isSupported (dataSets, dataLevel): Promise<boolean> {
      return Promise.resolve(true)
    }
    onExecute (dataSets, dataLevel, actionConfig?): Promise<React.ReactElement<any>> {
      const ids = []
      dataSets.forEach(dataSet => {
        if (!ids.includes(dataSet.dataSource.id)) { ids.push(dataSet.dataSource.id) }
      })
      return Promise.resolve(<MyPopper ids={ids} />)
    }
  }
  // MyPopper anchors to document.querySelector('.active-data-action-item')
  ```
- **Lifecycle/timing:** `isSupported` is called first to decide whether the action appears in the data-action menu; `onExecute` fires on click. When it resolves to a `React.ReactElement`, ExB renders it (here a `Popper` anchored to the active data-action menu item `.active-data-action-item`).
- **Cleanup/teardown:** none needed; the returned `Popper` manages its own open state and ExB unmounts it.
- **Critical gotchas:** the sample overrides `isSupported`/`onExecute` with the 2-arg (`dataSets, dataLevel`) shape, but the base abstract signatures include a trailing `widgetId: string` (and `onExecute` returns `Promise<boolean | React.ReactElement>`); the extra arg is optional at the override site. Returning an element (not a boolean) is what makes ExB show UI. The Popper anchor relies on the internal `.active-data-action-item` DOM class - brittle across ExB versions.
- **Lift-into-repo:** apply repo code-style; add semicolons; use short-circuit guard `!ids.includes(id) && ids.push(id)` or keep the explicit `if` body on its own line; type `onExecute` return as `Promise<boolean | React.ReactElement>` to match the base class.
- **See also:** `data-action-widgets/show-record-id` (boolean + `MutableStoreManager` variant); OOTB data actions (`ExportJson`, `ExportCSV`, `SetFilter`) in `jimu-core/lib/data-actions/**`; `jimu-framework-apis` skill (DataActionManager).

---

### show-record-id · Verified vs 1.20: yes
Data action that writes selected record ids into mutable widget state; the runtime widget reads them from `props.mutableStateProps`.

- **Source:** `manifest.json`, `src/data-actions/show-id.ts`, `src/runtime/widget.tsx`.
- **Manifest reqs:** `properties: {}`; one data action:
  ```json
  "dataActions": [
    { "name": "showId", "label": "show id", "uri": "data-actions/show-id",
      "icon": "runtime/assets/icons/show-record-id.svg" }
  ]
  ```
- **Config shape:** none.
- **Key APIs (exact):**
  - `abstract isSupported(dataSets: DataRecordSet[], dataLevel: DataLevel, widgetId: string): Promise<boolean>`
  - `abstract onExecute(dataSets: DataRecordSet[], dataLevel: DataLevel, widgetId: string, actionConfig?: any): Promise<boolean | React.ReactElement>`
  - `MutableStoreManager.getInstance().updateStateValue(widgetId: string, propKey: string, value: any): void`
  - `record.getId()` (from `DataRecord`).
- **Builder side (setting.tsx):** no setting.
- **Runtime side (widget.tsx):** reads the value the action wrote, via `this.props?.mutableStateProps?.featureIds`:
  ```tsx
  export default class Widget extends React.PureComponent<AllWidgetProps<unknown>> {
    render () {
      const featureIds = this.props?.mutableStateProps?.featureIds
      return <div>{featureIds || 'No records to display.'}</div>
    }
  }
  ```
  Action side writes it:
  ```ts
  onExecute (dataSets, dataLevel, actionConfig?): Promise<boolean> {
    const { records } = dataSets[0]
    const ids = records.map(r => r.getId())
    MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'featureIds', JSON.stringify(ids))
    return Promise.resolve(true)
  }
  ```
- **Lifecycle/timing:** `isSupported` gates the menu item (`false` if more than one dataset, else true when records exist). `onExecute` runs on click, calls `updateStateValue`, and the store update re-renders the widget with new `mutableStateProps.featureIds`. State reaches the widget via `mutableStateProps` (NOT Redux `stateProps`, NOT `mapExtraStateProps`).
- **Cleanup/teardown:** none needed; mutable state persists until overwritten. Widget is a `PureComponent`.
- **Critical gotchas:** the action uses `this.widgetId` (populated by the framework on the action instance) as the mutable-store key, which matches the widget instance whose `mutableStateProps` is read - the action and the reading widget are the same widget id. Value is stringified JSON; the widget renders it raw. `updateStateValue` returns `void` (fire-and-forget); `onExecute` still returns `Promise<boolean>`.
- **Lift-into-repo:** add semicolons; guard `dataSets[0]` before destructuring (`dataSets?.length && ...`); prefer typing `mutableStateProps` when you control the config generic instead of `unknown`.
- **See also:** `data-action-only` (element-returning variant); `jimu-framework-apis` skill (MutableStoreManager, MutableStoreProps); repo memory `exb-runtime-patterns.md`.

---

### message-subscriber · Verified vs 1.20: yes
Custom MESSAGE action that turns a selection message into a SQL where-clause, saved to widget Redux state, then consumed by the runtime widget to drive a `DataSourceComponent` query.

- **Source:** `manifest.json`, `src/actions/query-action.ts`, `src/actions/query-action-setting.tsx`, `src/runtime/widget.tsx`.
- **Manifest reqs:** `dependency: "jimu-arcgis"`; `properties: { hasConfig: true }`; one message action with a `settingUri`:
  ```json
  "messageActions": [
    { "name": "query", "label": "query", "uri": "actions/query-action",
      "settingUri": "actions/query-action-setting" }
  ]
  ```
- **Config shape:** action setting config (per action, not widget config): `interface Config { useDataSource: UseDataSource }` plus a runtime-added `fieldName` string. `export type IMConfig = ImmutableObject<Config>`.
- **Key APIs (exact):**
  - `abstract filterMessageDescription(messageDescription: MessageDescription): boolean`
  - `abstract filterMessage(message: Message): boolean`
  - `getSettingComponentUri(messageType: MessageType, messageWidgetId?: string): string`
  - `abstract onExecute(message: Message, actionConfig?: any): Promise<boolean> | boolean`
  - `appActions.widgetStatePropChange(widgetId: string, propKey: string, value: any): WidgetStatePropChangeAction`
- **Builder side (setting.tsx):** `QueryActionSetting` (a `React.PureComponent<ActionSettingProps<IMConfig>>`) reads the PUBLISHER widget's `useDataSources` from `appConfig` to seed the action's data source, then lets the user pick a field with `FieldSelector`:
  ```tsx
  getInitConfig = () => {
    const messageWidgetId = this.props.messageWidgetId
    const config = getAppStore().getState().appStateInBuilder.appConfig
    const messageWidgetJson = config.widgets[messageWidgetId]
    // ...seed useDataSource from messageWidgetJson.useDataSources[0]
  }
  onFieldSelected = (allSelectedFields, ds) => {
    const field = allSelectedFields[0]
    // ...
    this.props.onSettingChange({ actionId: this.props.actionId,
      config: this.props.config.set('fieldName', field.name).set('useDataSource', { /* ...ids... */,
        fields: allSelectedFields.map(f => f.jimuName) }) })
  }
  ```
- **Runtime side (widget.tsx):** rebuilds an `esri/rest/support/Query` from `props.stateProps.queryString` whenever it changes, feeds it to a `DataSourceComponent`:
  ```tsx
  componentDidUpdate (prevProps) {
    if (utils.getValue(this.props, 'stateProps.queryString') !== utils.getValue(prevProps, 'stateProps.queryString')) {
      const q = new Query({ where: this.props.stateProps.queryString, outFields: ['*'] })
      this.setState({ query: q.toJSON() })
    }
  }
  // render: <DataSourceComponent useDataSource={...} query={this.state.query} localId="query-result">...
  ```
  Action `onExecute` builds the clause and dispatches it:
  ```ts
  onExecute (message, actionConfig?): Promise<boolean> | boolean {
    let q = `${actionConfig.fieldName} = '${message}'`
    switch (message.type) {
      case MessageType.StringSelectionChange:
        q = `${actionConfig.fieldName} = '${(message as StringSelectionChangeMessage).str}'`; break
      case MessageType.DataRecordsSelectionChange:
        q = `${actionConfig.fieldName} = ` + `${records.length > 0 ? `'${records[0].getFieldValue(actionConfig.fieldName)}'` : ''}`; break
    }
    getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'queryString', q))
    return true
  }
  ```
- **Lifecycle/timing:** `filterMessageDescription` runs at wiring time to advertise which message types this action accepts (`StringSelectionChange`, `DataRecordsSelectionChange`); `getSettingComponentUri` supplies the action setting panel. At runtime, when a matching message is published, `onExecute` runs and dispatches `widgetStatePropChange`, which lands in `state.widgetsState[widgetId]` and surfaces to the subscriber widget as `props.stateProps`. The widget's `componentDidUpdate` then re-queries.
- **Cleanup/teardown:** base class provides `destroy()` / `onRemoveListen(...)` hooks; this sample overrides none. The `DataSourceComponent` manages its own query lifecycle. No manual subscription to remove.
- **Critical gotchas:** the action setting reads the PUBLISHER widget's `useDataSources` via `messageWidgetId` from `appConfig` (builder-time), not the subscriber's - this is the crux of message-action settings. `getSettingComponentUri` returns the same `settingUri` declared in the manifest. `onExecute` may return a plain `boolean` or `Promise<boolean>`. The dispatched key `queryString` maps to `props.stateProps.queryString` (Redux widget state), which is distinct from `mutableStateProps`. Naive string interpolation into SQL is injection-prone; sanitize / parameterize before reuse.
- **Lift-into-repo:** add semicolons; replace `switch` fallthrough default with a guard; escape/validate `fieldName` and message values before building the where-clause (OWASP injection); prefer `Immutable`/`utils.getValue` guards already present.
- **See also:** OOTB message actions (`select-data-record-action`, `filter-data-record-action`, `change-view-action`) in `jimu-core/lib/message-actions/**`; `jimu-framework-apis` skill (MessageManager, appActions, DataSourceComponent).

---

### control-the-widget-state · Verified vs 1.20: yes
Function widget that controls OTHER widgets: collapse/expand a Sidebar and open/close a widget inside a Controller, using `appActions` + `WidgetManager`.

- **Source:** `manifest.json`, `src/runtime/widget.tsx` (no setting, no config).
- **Manifest reqs:** `properties: {}`; no actions, no extensions. Just a plain runtime widget (`defaultSize` 300x300).
- **Config shape:** none.
- **Key APIs (exact):**
  - `ReactRedux.useSelector((state: IMState) => ...)` - reads `state.widgetsState[id]` (sidebar collapse) and `state.widgetsRuntimeInfo[id]?.state` (openness).
  - `appActions.widgetStatePropChange(widgetId: string, propKey: string, value: any): WidgetStatePropChangeAction`
  - `appActions.openWidget(widgetId: string): OpenWidgetAction`
  - `appActions.closeWidget(widgetId: string): CloseWidgetAction`
  - `WidgetManager.getInstance().loadWidgetClass(widgetId: string): Promise<React.ComponentType<WidgetProps>>` and `getWidgetClass(widgetId): React.ComponentType<WidgetProps>`
- **Builder side (setting.tsx):** no setting.
- **Runtime side (widget.tsx):** discovers target widgets from `appConfig.widgets` by `uri` (`widgets/layout/sidebar/`, `widgets/common/controller/`), reads their live state via `useSelector`, and toggles them. Openness requires loading the class first:
  ```tsx
  const sidebarWidgetState = useSelector((state: IMState) => state.widgetsState[sidebarWidgetId])
  const inControllerWidgetState = useSelector((state: IMState) => state.widgetsRuntimeInfo[openCloseWidgetId]?.state)

  const handleToggleSidebar = () => {
    if (sidebarWidgetState?.collapse === true) {
      getAppStore().dispatch(appActions.widgetStatePropChange(sidebarWidgetId, 'collapse', !sidebarVisible))
    } else if (sidebarWidgetState?.collapse === false) {
      getAppStore().dispatch(appActions.widgetStatePropChange(sidebarWidgetId, 'collapse', sidebarVisible))
    }
  }

  const loadWidgetClass = (widgetId) => {
    const isClassLoaded = getAppStore().getState().widgetsRuntimeInfo?.[widgetId]?.isClassLoaded
    return isClassLoaded
      ? Promise.resolve(WidgetManager.getInstance().getWidgetClass(widgetId))
      : WidgetManager.getInstance().loadWidgetClass(widgetId)
  }

  const handleOpenWidget = () => {
    const openAction = appActions.openWidget(openCloseWidgetId)
    loadWidgetClass(openCloseWidgetId).then(() => { getAppStore().dispatch(openAction) })
  }
  ```
- **Lifecycle/timing:** target widget list is computed once on mount (`useEffect([])` reads `appConfig.widgets`) then filtered when `appWidgets` changes. `useSelector` keeps the displayed `[State: ...]` labels live. Sidebar collapse is Redux widget state (`widgetsState[id].collapse`); open/close is runtime info (`widgetsRuntimeInfo[id].state`, a `WidgetState` enum). Actions dispatch synchronously; open/close is gated behind `loadWidgetClass(...).then(...)`.
- **Cleanup/teardown:** none needed; `useSelector` subscriptions are cleaned up by `ReactRedux` on unmount. No timers or listeners added.
- **Critical gotchas:** the widget class MUST be loaded before dispatching `openWidget`/`closeWidget` - dispatching against an unloaded class renders nothing, hence the `isClassLoaded` check + `loadWidgetClass`. Sidebar `collapse` is tri-state here (`true` / `false` / undefined -> alert), so guard on explicit boolean, not truthiness. Target discovery keys off exact widget `uri` strings (`widgets/layout/sidebar/`, `widgets/common/controller/`) and controller layout traversal - fragile if OOTB uris change.
- **Lift-into-repo:** add semicolons; add early-return guards (already partly present) with the `if` body on its own line; wrap the `alert` (repo lint disallows) behind a proper notification; narrow the many `as any[]` state casts.
- **See also:** `jimu-framework-apis` skill (WidgetManager, appActions, WidgetState, getAppStore); redux sample (store wiring counterpart).

---

### redux · Verified vs 1.20: yes
Registers a widget-scoped Redux store slice via a `REDUX_STORE` extension; the runtime widget maps that slice in with `mapExtraStateProps` and dispatches plain actions.

- **Source:** `manifest.json`, `src/extensions/my-store.ts`, `src/runtime/widget.tsx`.
- **Manifest reqs:** `properties: {}`; one extension at point `REDUX_STORE`:
  ```json
  "extensions": [
    { "name": "My store", "point": "REDUX_STORE", "uri": "extensions/my-store" }
  ]
  ```
- **Config shape:** none. The store slice type is declared via module augmentation:
  ```ts
  interface MyState { a: string; b: string }
  declare module 'jimu-core/lib/types/state' {
    interface State { myState?: IMMyState }
  }
  ```
- **Key APIs (exact):**
  - `export interface ReduxStoreExtension extends BaseExtension`
  - `getStoreKey: () => string`
  - `getInitLocalState: () => any`
  - `getActions: () => string[]` (returns the action-type strings this reducer handles)
  - `getReducer: () => (localState: any, action: any, state: IMState) => any`
  - `static mapExtraStateProps: (state: IMState, ownProps: Partial<AllWidgetProps<any>>) => any`
- **Builder side (setting.tsx):** no setting.
- **Runtime side (widget.tsx):** maps the slice into props and dispatches by action-type string:
  ```tsx
  export default class Widget extends React.PureComponent<AllWidgetProps<unknown> & { a: string }, unknown> {
    static mapExtraStateProps (state: IMState) {
      return { a: state.myState.a }
    }
    onChange = (evt) => {
      this.props.dispatch({ type: 'MY_ACTION_1', val: evt.target.value })
    }
    render () {
      return <div className="widget-use-redux jimu-widget m-2">
        <Input onChange={this.onChange}/>
        <div>{this.props.a}</div>
      </div>
    }
  }
  ```
  The extension class:
  ```ts
  export default class MyReduxStoreExtension implements extensionSpec.ReduxStoreExtension {
    id = 'my-local-redux-store-extension'
    getActions () { return Object.values(MyActionKeys) }
    getInitLocalState (): MyState { return { a: '', b: '' } }
    getReducer () {
      return (localState: IMMyState, action: ActionTypes, appState: IMState): IMMyState => {
        switch (action.type) {
          case MyActionKeys.MyAction1: return localState.set('a', action.val)
          case MyActionKeys.MyAction2: return localState.set('b', action.val)
        }
      }
    }
    getStoreKey () { return 'myState' }
  }
  ```
- **Lifecycle/timing:** the extension is registered at app start (manifest `extensions[]` at `REDUX_STORE`). `getInitLocalState` seeds `state.myState`; `getStoreKey()` (`'myState'`) is where the slice lives. On dispatch, ExB routes the action to `getReducer()` only if its `type` is in `getActions()`. State reaches the widget via `mapExtraStateProps` (NOT `stateProps`, NOT `mutableStateProps`) - a static method that selects from `IMState` into props.
- **Cleanup/teardown:** none needed; the store slice lives for the app lifetime. Immutable `.set(...)` returns a new state (no mutation).
- **Critical gotchas:** you MUST augment `jimu-core/lib/types/state`'s `State` interface (`declare module ...`) so `state.myState` type-checks; without it `mapExtraStateProps` won't compile. `getActions()` gates which action `type`s hit the reducer, so action-type strings must match exactly (`'MY_ACTION_1'` in the widget equals `MyActionKeys.MyAction1`). The reducer has no `default` branch, so unhandled actions return `undefined` for the slice - real code should return `localState` by default. `this.props.dispatch` is provided by the widget framework.
- **Lift-into-repo:** add semicolons; add a `default: return localState` branch to the reducer; keep the module augmentation next to the extension; type the widget's extra props explicitly rather than `& { a: string }` inline for larger slices.
- **See also:** `control-the-widget-state` (consumes app store without owning a slice); `jimu-framework-apis` skill (extensionSpec, getAppStore, appActions, observeStore, mapExtraStateProps).

---

### use-expression · Verified vs 1.20: yes
Configures an `Expression` in settings and resolves it per record at runtime with `ExpressionResolverComponent`, handling expressions that span multiple data sources.

- **Source:** `manifest.json`, `src/config.ts`, `src/setting/setting.tsx`, `src/runtime/widget.tsx`.
- **Manifest reqs:** `properties: { hasSettingPage: true }`; no actions, no extensions.
- **Config shape:**
  ```ts
  export interface Config { expression?: Expression }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `expressionUtils.getDataSourceIdsFromExpression(expression: IMExpression): string[]`
  - `ExpressionResolverComponent` - `React.FC<...>`; props `ExpressionResolverComponentProps { expression: IMExpressionMap | IMExpression | IMAdvancedExpression; widgetId: string; useDataSources?: ImmutableArray<UseDataSource>; records?: { [dataSourceId: string]: DataRecord[] }; children?: ResolverRenderFunction | React.ReactNode; onChange?: (...) => void }` (must pass one of `useDataSources` or `records`).
  - `DataSourceManager.getInstance().getDataSource(dsId)`
  - `SingleExpressionResolveResult` - render input has `isSuccessful` and `value`.
  - Setting: `ExpressionBuilder` + `ExpressionBuilderType` (Attribute / Statistics / Expression), `DataSourceSelector`.
- **Builder side (setting.tsx):** picks a FeatureLayer data source and builds an expression; both write to config via `onSettingChange`:
  ```tsx
  const SUPPORT_DATA_SOURCE_TYPES = Immutable([DataSourceTypes.FeatureLayer])
  const SUPPORT_EXPRESSION_TYPES = Immutable([ExpressionBuilderType.Attribute, ExpressionBuilderType.Statistics, ExpressionBuilderType.Expression])
  // ...
  const onExpression = (expression: Expression) => {
    onSettingChange({ id, config: { ...config, expression } })
  }
  // <DataSourceSelector ... mustUseDataSource />
  // <ExpressionBuilder useDataSources={useDataSources} types={SUPPORT_EXPRESSION_TYPES}
  //   onChange={onExpression} expression={expression} widgetId={id} />
  ```
- **Runtime side (widget.tsx):** for each record of the selected data source it resolves the expression, supplying records for every data source the expression touches:
  ```tsx
  const renderData = (dataSource: DataSource) => {
    const dsIdsUsedInExpression = expressionUtils.getDataSourceIdsFromExpression(expression)
    const dssUsedInExpression = dsIdsUsedInExpression.map(dsId => DataSourceManager.getInstance().getDataSource(dsId))
    if (dssUsedInExpression.filter(ds => !!ds).length === 0) { return <div>No data source.</div> }
    if (dssUsedInExpression.some(ds => ds.getRecords().length === 0)) { return <div>No records.</div> }
    return <div className='record-list'>{
      dataSource.getRecords().map((r, i) =>
        <ExpressionResolverComponent key={i}
          records={getRecordsForExpression(r, dataSource.id, dssUsedInExpression)}
          expression={expression} widgetId={id}>{renderExpressionResult}</ExpressionResolverComponent>)
    }</div>
  }
  const renderExpressionResult = (resolvedResults: SingleExpressionResolveResult) => {
    if (!resolvedResults?.isSuccessful) { return null }
    return <div className='record-item'>{resolvedResults.value}</div>
  }
  // outer: <DataSourceComponent useDataSource={useDataSources[0]} query={DEFAULT_QUERY} widgetId={id}>{renderData}</DataSourceComponent>
  ```
- **Lifecycle/timing:** settings persist `expression` (and `useDataSources`) into config. At runtime a `DataSourceComponent` loads records (`DEFAULT_QUERY = { where: '1=1', outFields: ['*'] }`); for each record an `ExpressionResolverComponent` resolves asynchronously and calls its child render fn with a `SingleExpressionResolveResult`. `getDataSourceIdsFromExpression` determines which data sources must supply records so cross-data-source expressions resolve.
- **Cleanup/teardown:** none needed; `ExpressionResolverComponent` and `DataSourceComponent` manage their own async resolution/subscriptions and unmount cleanly. Pass a stable `key` per record (sample uses index `i`).
- **Critical gotchas:** pass exactly ONE of `useDataSources` or `records` to `ExpressionResolverComponent` (this sample passes `records`, built per record via `getRecordsForExpression`, mixing the populated record with `ds.getRecords()` for other data sources). An expression can reference more data sources than the widget's primary one - resolve them all or parts silently fail. Resolution is async, so render both the `isSuccessful` and the not-yet/failed states. `getDataSourceIdsFromExpression` expects the immutable expression (`IMExpression`).
- **Lift-into-repo:** add semicolons; keep guard `if` bodies on their own line; prefer a stable record id (`r.getId()`) over array index for `key`; short-circuit the empty-data-source and empty-records checks as guards.
- **See also:** `jimu-ui-components` skill (ExpressionBuilder, DataSourceSelector, SettingSection/SettingRow); `jimu-framework-apis` skill (DataSourceComponent, DataSourceManager, expressionUtils); OOTB Text/List widgets that resolve expressions.

---

## Cross-sample cheat sheet

| Mechanism | Base / API | Manifest | How state reaches widget |
| --- | --- | --- | --- |
| Data action (element) | `AbstractDataAction.onExecute -> Promise<React.ReactElement>` | `dataActions[]` | rendered directly (Popper) |
| Data action (state) | `AbstractDataAction` + `MutableStoreManager.updateStateValue` | `dataActions[]` | `props.mutableStateProps` |
| Message action | `AbstractMessageAction` + `appActions.widgetStatePropChange` | `messageActions[]` (+`settingUri`, `hasConfig`) | `props.stateProps` |
| Cross-widget control | `appActions.openWidget/closeWidget/widgetStatePropChange` + `WidgetManager.loadWidgetClass` | none | `useSelector(state.widgetsState / widgetsRuntimeInfo)` |
| Redux store slice | `extensionSpec.ReduxStoreExtension` (`getStoreKey/getInitLocalState/getActions/getReducer`) | `extensions[]` point `REDUX_STORE` | `static mapExtraStateProps` |
| Expression | `ExpressionResolverComponent` + `expressionUtils.getDataSourceIdsFromExpression` | `hasSettingPage` | resolved per record via render fn |
