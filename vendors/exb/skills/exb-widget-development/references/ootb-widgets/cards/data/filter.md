# OTB Widget: common/filter

Online widget doc: https://developers.arcgis.com/experience-builder/guide/filter-widget/

## Purpose
The Filter widget applies SQL WHERE clauses to one or more feature/scene data sources so end users can narrow what is shown across the app. It does not render features itself; it computes SQL from configured "filter items" and pushes each SQL onto every affected data source via `QueriableDataSource.updateQueryParams(..., widgetId)`, then broadcasts a `DataSourceFilterChangeMessage` so other widgets (maps, lists, charts) refresh. It supports three filter kinds (Single, Group, Custom), three layouts (Block/Inline/Popper), two activation triggers (Toggle/Button), URL-parameter driven filters, and "Reset all" / "Turn off all" tools.

## Source paths inspected
- Manifest: [manifest.json](../../../../../../../ArcGISExperienceBuilder/client/dist/widgets/common/filter/manifest.json) (read)
- Default config: `dist/widgets/common/filter/config.json` (read)
- Config model: `dist/widgets/common/filter/src/config.ts` (read)
- Runtime widget: `dist/widgets/common/filter/src/runtime/widget.tsx` (read fully)
- Runtime filter item: `dist/widgets/common/filter/src/runtime/filter-item.tsx` (read fully)
- Runtime ds wrapper: `dist/widgets/common/filter/src/runtime/filter-item-ds.tsx` (read fully)
- Runtime URL utils: `dist/widgets/common/filter/src/runtime/utils.ts` (read fully)
- Runtime styles: `dist/widgets/common/filter/src/runtime/style.ts` (read head only)
- Setting panel: `dist/widgets/common/filter/src/setting/setting.tsx` (read fully)
- Setting filter item: `dist/widgets/common/filter/src/setting/filter-item.tsx` (read fully)
- Setting utils: `dist/widgets/common/filter/src/setting/utils.ts` (read head; tail functions UNVERIFIED - see Gotchas)
- Extensions: `dist/widgets/common/filter/src/tools/app-config-operations.ts` + `builder-operations.ts` (read)
- Version manager: `dist/widgets/common/filter/src/version-manager.ts` (read head only; full upgrader list UNVERIFIED)
- SKIPPED: `dist/` build output, `tests/`, `src/*/translations/*`, `src/setting/assets/*.svg`, `src/setting/filter-item-ds.tsx` (assumed near-identical to runtime variant - UNVERIFIED, inspect if needed), `src/runtime/style.ts` body and `src/setting/style.ts`.

## Architecture overview
- runtime: `src/runtime/widget.tsx` is a class component (`React.PureComponent`) that owns all data sources and SQL orchestration. It renders one `FilterItemDataSource` per `props.useDataSources` entry (data source loaders) plus a set of `FilterItem` components (one per configured filter item). It computes/merges SQL and publishes the filter-change message.
- setting: `src/setting/setting.tsx` is the builder panel (add/remove/duplicate/reorder filter items, choose arrange/trigger/logic, advanced tools). `src/setting/filter-item.tsx` is the per-item editor rendered inside a `SidePopper` (data source picker, label, icon, SQL builder popup, options).
- components: runtime `FilterItem` (per-item UI + trigger + popper), `FilterItemDataSource` (thin `DataSourceComponent` wrapper), setting `FilterItem` (item config form).
- utils: runtime `utils.ts` = URL-parameter serialization/merging + `FallbackFlipOptions`. setting `utils.ts` = useDataSources bookkeeping, group-name generation, `isTurnOffAllSupported`, view helpers.
- config model: `filterConfig` / `IMConfig` (see below). Each item is a `filterItemConfig`.
- data-source deps: strong. Uses `DataSourceComponent`, `QueriableDataSource.updateQueryParams`, `DataSourceManager`, `dataSourceUtils` (SQL conversion + merge), `UseDataSource`, `DataSourceStatus`, output-data-source awareness.
- map deps: none direct. The widget never imports a map/JSAPI module. It affects maps indirectly because the map widget consumes the same data sources and reacts to `DATA_SOURCE_FILTER_CHANGE`. `defaultSize` is small (350x54, autoHeight) since it is a control, not a map.

## Key imports and packages
Grouped by package (file path noted per import):

jimu-core (runtime/widget.tsx)
- `React, classNames, jsx, Immutable, lodash` - base
- `AllWidgetProps, IMState, ImmutableArray, ImmutableObject, IconResult, UseDataSource` - types
- `DataSource, QueriableDataSource, DataSourceStatus, dataSourceUtils, SqlQueryParams, IMSqlExpression` - data source + SQL
- `MessageManager, DataSourceFilterChangeMessage` - publish filter change
- `UrlManager, AppMode` - URL parameters
- `focusElementInKeyboardMode` - a11y

jimu-core (runtime/filter-item.tsx)
- `ClauseLogic, IMSqlExpression, IMUseDataSource, DataSource, IMThemeVariables, IntlShape`
- `appConfigUtils` (`getWidgetIdByOutputDataSource`), `getAppStore`, `dataSourceUtils`
- `SqlExpressionMode`, `moduleLoader` (lazy-load custom SQL builder), `isKeyboardMode`, `focusElementInKeyboardMode`, `defaultMessages as jimuCoreMessages`

jimu-core (runtime/utils.ts)
- `ClauseDisplayType, ClauseOperator, ClauseSourceType, ClauseType, ImmutableArray, utils as jimuCoreUtils` (`diffArrays`)

jimu-core (runtime/filter-item-ds.tsx)
- `React, jsx, DataSourceComponent, IMUseDataSource, DataSource, DataSourceStatus`

jimu-ui (runtime)
- widget.tsx: `WidgetPlaceholder, Button, Icon, Popper, Badge, defaultMessages as jimuUIMessages`
- filter-item.tsx: `Switch, Icon, Button, Popper, Card, Alert, Select, Option, Label, Paper, defaultMessages`
- utils.ts: `FlipOptions` (type)

jimu-ui SQL subpackages (the SQL focus of this widget)
- `jimu-ui/basic/sql-expression-runtime` -> `SqlExpressionRuntime`, `getShownClauseNumberByExpression`, `getTotalClauseNumberByExpression` (runtime/filter-item.tsx, runtime/widget.tsx)
- `jimu-ui/basic/sql-expression-runtime` -> `getJimuFieldNamesBySqlExpression`, `getUpdatedGroupExpression` (setting/setting.tsx), `getKeysInSqlExprBuilder` (tools/builder-operations.ts), `getShownClauseNumberByExpression` (setting/utils.ts), `updateSQLExpressionByVersion` (version-manager.ts)
- `jimu-ui/advanced/sql-expression-builder` -> `SqlExpressionBuilder` (lazy via `moduleLoader` in runtime/filter-item.tsx for Custom items); `SqlExpressionBuilderPopup`, `GroupSqlExpressionBuilderPopup` (setting/filter-item.tsx)

jimu-ui/advanced/setting-components (setting)
- `SettingSection, SettingRow, SidePopper` (setting.tsx)
- `SettingSection, SettingRow` (filter-item.tsx)

jimu-ui/advanced/data-source-selector (setting/filter-item.tsx)
- `DataSourceSelector`

jimu-ui/advanced/resource-selector (setting/filter-item.tsx)
- `IconPicker`

jimu-ui/basic/list-tree (setting/setting.tsx)
- `List, TreeItemActionType` (reorderable filter item list, DnD)

jimu-for-builder (setting/setting.tsx)
- `getAppConfigAction, AllWidgetSettingProps` (edit layout item size on arrange change, controller UX)

jimu-layouts/layout-runtime (setting/setting.tsx)
- `LayoutItemSizeModes` (Auto/Custom width when switching to/from Popper)

jimu-icons (runtime + setting)
- runtime: `TurnOffOutlined`, `ResetOutlined` (outlined/editor), `DownFilled` (filled/directional)
- setting: `ClickOutlined, CloseOutlined, PlusOutlined, InfoOutlined, DownOutlined, DuplicateOutlined`; svg requires `filter.svg`, `filter-group.svg`, `filter-custom.svg`

esri/@arcgis / Calcite
- None. No `@arcgis/*`, `esri/*`, `__esri`, or Calcite imports in this widget's src.

## Reusable patterns found
- DataSourceComponent per useDataSource: `FilterItemDataSource` wraps a single `DataSourceComponent` and forwards `onDataSourceCreated` / `onCreateDataSourceFailed` / `onDataSourceInfoChange` up to the widget; the widget stores created data sources in `state.dataSources[dsId]`. On unmount it reports `null` + `NotReady`.
- SQL model via config: single items use `IMSqlExpression` (`sqlExprObj`); group items use `IMGroupSqlExpression` (`sqlExprObjForGroup`, array with `[0]` = main ds). Custom items load the builder lazily and have no persisted expression until the user builds one.
- SqlExpressionRuntime (end-user run) vs SqlExpressionBuilder/*Popup (author): runtime renders `SqlExpressionRuntime` for Single/Group and lazily-loaded `SqlExpressionBuilder` (Simple mode) for Custom; setting renders `SqlExpressionBuilderPopup` (Single) and `GroupSqlExpressionBuilderPopup` (Group).
- DATA_SOURCE_FILTER_CHANGE publish: `MessageManager.getInstance().publishMessage(new DataSourceFilterChangeMessage(widgetId, changedDsIds, clearedDsIds))`. Declared in manifest `publishMessages`.
- updateQueryParams keyed by widgetId: SQL is scoped per widget via `(ds as QueriableDataSource).updateQueryParams({ where, sqlExpression }, this.props.id)`; previously-applied SQL read back from `ds.getInfo().widgetQueries?.[widgetId].where`.
- SQL merge across clauses: `dataSourceUtils.getArcGISSQL`, `dataSourceUtils.getMergedSQLExpressions(sqlExprs, ds, logicalOperator)`, `dataSourceUtils.getSQLExpressionFromGroupSQLExpression`, `getDisplayedSQLExpressionFromGroupSQLExpression`.
- urlParameters: manifest declares a `filters` URL parameter; `UrlManager.getInstance().setWidgetUrlParams(id, { filters })`. `mapExtraStateProps` reads `state.urlHashObject[id].filters` (only in `AppMode.Run`), and `utils.ts` serializes/merges (`getUpdatedFilterItemsByURL`, `getCachedURLParamsByFilterItems`, `getURLStringByUrlParams`). Items set by URL are forced `autoApplyWhenWidgetOpen = true`.
- ClauseLogic (AND/OR): `config.logicalOperator` drives cross-item merge; builder switches it via `AdvancedButtonGroup`.
- appConfigUtils: `getWidgetIdByOutputDataSource` (label an output ds's source widget), `parseUniqueLabel` (auto-number Group/Custom names).
- appConfigOperations extension: `afterWidgetCopied` remaps output data sources when the widget is duplicated (via `contentMap` / `dataSourceUtils.mapUseDataSources`).
- builderOperations extension: `getTranslationKey` exposes filter item names + SQL builder value keys for i18n string extraction (`getKeysInSqlExprBuilder`).
- filter arrange/trigger types: `FilterArrangeType` (BLOCK/INLINE/POPPER), `FilterTriggerType` (TOGGLE/BUTTON), `FilterItemType` (SINGLE/GROUP/CUSTOM) - see config below.
- Reorderable list with DnD: `List` + `TreeItemActionType` render overrides in setting.
- Output data source readiness: `onIsDataSourceNotReady` tracks `isOutputFromWidget` ds not-ready state to disable toggles and show warnings.

## Builder vs runtime split
- Builder (`src/setting/**`): CRUD of filter items via `SidePopper` + `DataSourceSelector`; picks arrange/trigger/logic/omit-internal-style; toggles Reset all / Turn off all; authors SQL with `SqlExpressionBuilderPopup` / `GroupSqlExpressionBuilderPopup`; maintains `config.useDataSources` bookkeeping (add/remove/field tracking) through setting `utils.ts`; adjusts layout item size (`getAppConfigAction`) when arrange type crosses the Popper boundary; sets controller `inControllerUx` (`offPanel` for Popper).
- Runtime (`src/runtime/**`): loads data sources, computes/merges SQL, applies via `updateQueryParams`, publishes `DataSourceFilterChangeMessage`, renders end-user controls (`SqlExpressionRuntime`, toggles, apply/cancel buttons, pills, popper), handles URL parameters, auto-apply-at-start, Reset/Turn-off.
- config.ts is shared by both.

## Lifecycle and cleanup
- constructor: instantiates `UrlManager`; seeds `state.filterItems` from `getFilterItemsByURLParameters()` (config or URL-merged).
- static `mapExtraStateProps`: caches initial URL `filters` per widget id (only when `AppMode.Run` and `urlHashObject[id]` present) into `urlParams` prop.
- componentDidUpdate: on `config` change -> resync `filterItems` + `setSqlToAllDs()`; on `dataSources` change -> `applyAutoFiltersAtStart()` (deferred `setTimeout(0)` once all `useDataSources` are created).
- componentWillUnmount (widget): sets `__unmount`; for each ds that had a WHERE from this widget, clears it with `updateQueryParams(null, widgetId)` and publishes a final `DataSourceFilterChangeMessage` so consumers reset. This is the critical cleanup - removing the widget removes its filters.
- componentWillUnmount (`FilterItemDataSource`): reports ds `null` + `NotReady` to the widget so stale references are dropped.
- `__unmount` guard used inside async-ish callbacks (`onFilterItemChange`, `onFilterItemCollapseChange`, `componentDidUpdate`) to avoid setState after unmount.
- Custom item: `moduleLoader.loadModule('jimu-ui/advanced/sql-expression-builder')` on mount / when type becomes Custom.

## Manifest/config requirements
manifest.json:
- `"type": "widget"`, `version`/`exbVersion` `1.20.0`, author "Esri R&D Center Beijing".
- `"publishMessages": ["DATA_SOURCE_FILTER_CHANGE"]`.
- `"properties": { "notAutoLoadUsedFieldsData": true }` (do not auto-load field data).
- `"urlParameters": [{ "name": "filters", "label": "Filters" }]`.
- `"extensions"`: `appConfigOperations` -> `tools/app-config-operations` (point `APP_CONFIG_OPERATIONS`); `builderOperations` -> `tools/builder-operations` (point `BUILDER_OPERATIONS`).
- `"defaultSize": { "width": 350, "height": 54, "autoHeight": true }`.
- No `dependencies` array (no JSAPI/CDN modules needed).

config model (`src/config.ts`):
```ts
export enum FilterArrangeType { Block = 'BLOCK', Inline = 'INLINE', Popper = 'POPPER' }
export enum FilterTriggerType { Toggle = 'TOGGLE', Button = 'BUTTON' }
export enum FilterItemType { Single = 'SINGLE', Group = 'GROUP', Custom = 'CUSTOM' }

export interface filterItemConfig {
  icon?: IMIconResult
  name: string
  type: FilterItemType
  useDataSources: IMUseDataSource[]
  sqlExprObj?: IMSqlExpression          // Single/Custom
  sqlExprObjForGroup?: IMGroupSqlExpression  // Group ([0] = main ds)
  exprInvert?: boolean
  autoApplyWhenWidgetOpen?: boolean
  collapseFilterExprs?: boolean
}

export interface filterConfig {
  id: string
  arrangeType: FilterArrangeType
  triggerType: FilterTriggerType
  wrap?: boolean                 // only for inline arrangement
  omitInternalStyle: boolean
  filterItems?: ImmutableArray<filterItemConfig>
  logicalOperator: ClauseLogic
  resetAll: boolean
  turnOffAll: boolean
}
export type IMConfig = ImmutableObject<filterConfig>
```
Default config.json: `{ logicalOperator: "AND", filterItems: [], arrangeType: "BLOCK", triggerType: "TOGGLE", omitInternalStyle: false, resetAll: false, turnOffAll: false }`.

## Gotchas
- SQL is applied per data source AND per widget id. To read the current WHERE for this widget use `ds.getInfo().widgetQueries?.[widgetId].where`; clearing means `updateQueryParams(null, widgetId)`. Removing/unmounting the widget must clear these or filters "stick".
- Do not push empty SQL on the auto-apply initial pass: `setSqlToDs` skips `sql === ''` when `_autoApplyInit` is true "to avoid many useless requests".
- `omitInternalStyle` mode changes semantics: a single-clause item with 1 shown clause is treated as always-applied (`getAppliedState`), and `getQuerySqlFromDs` will include it even without `autoApplyWhenWidgetOpen`.
- `turnOffAll` is conditionally supported: `isTurnOffAllSupported` returns false when every item is a single-shown-clause under `omitInternalStyle`; the builder auto-clears `turnOffAll` accordingly (`onSettingChange` with `updateTurnOffState`).
- URL-driven items are always forced `autoApplyWhenWidgetOpen = true`; only `ClauseDisplayType.UseAskForValue` clauses can be set from URL (`getClausesByURL`).
- Custom items: no persisted `sqlExprObj` until built; the builder is lazy-loaded, so `state.SqlExpressionBuilder` may be null on first render. Custom items are excluded from URL params (`getURLParamsByFilterItem` returns null for Custom).
- Group main data source is `sqlExprObjForGroup[0]`; removing the main ds triggers non-trivial reselection logic (`removeDsForGroupFilterItem` promotes the first checked view). Handle with care.
- Supported ds types are limited (setting `SupportedDsTypes`): FeatureLayer, SceneLayer, BuildingComponentSubLayer, OrientedImageryLayer, ImageryLayer, SubtypeGroupLayer, SubtypeSublayer.
- Arrange-type change to/from Popper rewrites layout item size (`getAppConfigAction().editLayoutItemProperty(... autoProps ...)`) and controller `inControllerUx`; do not assume the size is static.
- UNVERIFIED: tail of `src/setting/utils.ts` (`getAllUsedFieldsByDataSourceId`, `areUsedFieldsChanged`, `getUseDataSourcesByDssAdded/RemovedAction/GroupFiltersChanged`) - only the head was read; inspect that file for exact field-bookkeeping semantics.
- UNVERIFIED: full version list in `src/version-manager.ts` (read through `1.16.0` start only). Inspect for upgraders past `1.16.0`.
- UNVERIFIED: `src/setting/filter-item-ds.tsx` (assumed equivalent to runtime `FilterItemDataSource` minus the not-ready callback) and both `style.ts` bodies. Inspect if styling/DS-wrapper detail matters.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - apply merged SQL to all affected data sources and publish change
```tsx
setSqlToAllDs = (dss = this.state.dataSources, filterItems = this.props.config.filterItems) => {
  const dsIds = []
  const clearFilterDsIds = []
  Object.keys(dss).forEach(dsId => {
    const ds = dss[dsId]
    if (ds) {
      const prevSqlForDs = (ds.getInfo().widgetQueries?.[this.props.id] as SqlQueryParams)?.where || ''
      const sqlResult = this.getQuerySqlFromDs(ds, filterItems)
      this.setSqlToDs(ds, sqlResult)
      if (prevSqlForDs !== sqlResult.sql) {
        dsIds.push(ds.id)
        if (!sqlResult.sql) { clearFilterDsIds.push(ds.id) }
      }
    }
  })
  if (dsIds.length > 0) { this.publishFilterMessage(dsIds, clearFilterDsIds) }
}
```

Source: `src/runtime/widget.tsx` - write SQL onto a QueriableDataSource scoped to this widget
```tsx
setSqlToDs = (dataSource: DataSource, sqlResult) => {
  if (this._autoApplyInit && sqlResult.sql === '') { return }
  if (dataSource) {
    const queryParams = { where: sqlResult.sql, sqlExpression: sqlResult.sqlExpression } as any
    (dataSource as QueriableDataSource).updateQueryParams?.(queryParams, this.props.id)
  }
}

publishFilterMessage = (dataSourceIds: string[], clearFilterDsIds: string[]) => {
  MessageManager.getInstance().publishMessage(
    new DataSourceFilterChangeMessage(this.props.id, dataSourceIds, clearFilterDsIds)
  )
}
```

Source: `src/runtime/widget.tsx` - merge clause SQL across filter items with AND/OR
```tsx
getQuerySqlFromDs = (dataSource: DataSource, filterItems = this.props.config.filterItems) => {
  const sqlExprs = []
  filterItems.forEach(item => {
    if (item.autoApplyWhenWidgetOpen || (this.props.config.omitInternalStyle && getShownClauseNumberByExpression(item.sqlExprObj) === 1)) {
      const sqlExprObj = item.type === FilterItemType.Group
        ? dataSourceUtils.getSQLExpressionFromGroupSQLExpression(item.sqlExprObjForGroup, dataSource)
        : item.useDataSources.filter(useDs => useDs.dataSourceId === dataSource?.id).length && item.sqlExprObj
      if (sqlExprObj) {
        const sqlResult = dataSourceUtils.getArcGISSQL(sqlExprObj, dataSource)
        if (sqlResult.sql) { sqlExprs.push(sqlResult.sqlExpression) }
      }
    }
  })
  let sqlExpression = sqlExprs[0] || null
  if (sqlExprs.length > 1) {
    sqlExpression = dataSourceUtils.getMergedSQLExpressions(sqlExprs, dataSource, this.props.config.logicalOperator)
  }
  return { sql: sqlExpression?.sql || '', sqlExpression }
}
```

Source: `src/runtime/widget.tsx` - clear this widget's filters on unmount
```tsx
componentWillUnmount () {
  this.__unmount = true
  const dsIds = []
  Object.keys(this.state.dataSources).forEach(dsId => {
    const ds = this.state.dataSources[dsId]
    if (ds && (ds.getInfo().widgetQueries?.[this.props.id] as SqlQueryParams)?.where) {
      (ds as QueriableDataSource)?.updateQueryParams(null, this.props.id)
      dsIds.push(ds.id)
    }
  })
  if (dsIds.length > 0) { this.publishFilterMessage(dsIds, dsIds) }
}
```

Source: `src/runtime/filter-item-ds.tsx` - one DataSourceComponent per useDataSource, reporting up
```tsx
render () {
  const { useDataSource } = this.props
  return (
    <DataSourceComponent
      useDataSource={useDataSource}
      onDataSourceCreated={this.onDataSourceCreated}
      onCreateDataSourceFailed={this.onCreateDataSourceFailed}
      onDataSourceInfoChange={this.onDataSourceInfoChange}
    />
  )
}
```

Source: `src/runtime/filter-item.tsx` - end-user SQL runtime vs lazy Custom builder
```tsx
getSqlExpression = () => {
  if (!this.isDataSourceValid()) { return null }
  if (this.props.config.type === FilterItemType.Custom) {
    return this.getCustomSqlExpressionBuilder()
  }
  return <SqlExpressionRuntime
    widgetId={this.props.widgetId}
    dataSource={this.props.selectedDs}
    expression={this.state.sqlExprObj}
    onChange={this.onSqlExpressionChange}
  />
}

loadSqlExpressionBuilder = () => {
  if (this.props.config.type === FilterItemType.Custom && !this.state.SqlExpressionBuilder) {
    moduleLoader.loadModule<typeof sqlExpressionBuilderModule>('jimu-ui/advanced/sql-expression-builder')
      .then(modules => { this.setState({ SqlExpressionBuilder: modules?.SqlExpressionBuilder }) })
  }
}
```

Source: `src/setting/filter-item.tsx` - author SQL with the builder popups
```tsx
{!isDisabled && type === FilterItemType.Single &&
  <SqlExpressionBuilderPopup
    dataSource={selectedDss[0]}
    isOpen={this.state.isSqlExprShow}
    toggle={this.toggleSqlExprPopup}
    expression={sqlExprObj}
    onChange={this.props.onSqlExprBuilderChange}
  />}
{!isDisabled && type === FilterItemType.Group &&
  <GroupSqlExpressionBuilderPopup
    dataSources={selectedDss}
    isOpen={this.state.isSqlExprShow}
    toggle={this.toggleSqlExprPopup}
    expression={sqlExprObjForGroup}
    onChange={this.props.onGroupSqlExprBuilderChange}
  />}
```

Source: `src/setting/utils.ts` - when Turn-off-all is supported
```ts
export const isTurnOffAllSupported = (config: filterConfig): boolean => {
  const { omitInternalStyle, filterItems } = config
  if (!omitInternalStyle || filterItems.length === 0) { return true }
  let isSupported = false
  filterItems.some(item => {
    if (item.type === FilterItemType.Custom) {
      isSupported = true
    } else if (item.type === FilterItemType.Single) {
      isSupported = !item.sqlExprObj || getShownClauseNumberByExpression(item.sqlExprObj) !== 1
    } else {
      isSupported = !item.sqlExprObjForGroup || item.sqlExprObjForGroup[0].clause.displayType === ClauseDisplayType.None
    }
    return isSupported
  })
  return isSupported
}
```

Source: `src/runtime/utils.ts` - merge URL filters into config items (forces auto-apply)
```ts
export const getUpdatedFilterItemsByURL = (filterItems, urlParams) => {
  return filterItems.asMutable({ deep: true }).map(fItem => {
    const itemURLParams = urlParams.find(p => p.name === fItem.name)
    if (!itemURLParams) { return fItem }
    const sqlProps: any = {}
    if (fItem.type === FilterItemType.Single) {
      sqlProps.sqlExprObj = { ...fItem.sqlExprObj, parts: getClausesByURL(fItem.sqlExprObj.parts, itemURLParams.clauses) }
    } else {
      sqlProps.sqlExprObjForGroup = [
        { ...fItem.sqlExprObjForGroup[0], clause: getClausesByURL([fItem.sqlExprObjForGroup[0].clause], itemURLParams.clauses)[0] },
        ...fItem.sqlExprObjForGroup.slice(1)
      ]
    }
    return { ...fItem, autoApplyWhenWidgetOpen: true, ...sqlProps }
  })
}
```

Source: `src/tools/builder-operations.ts` - expose SQL builder strings for i18n extraction
```ts
if (filterItem.sqlExprObj) {
  const sqlKeys = getKeysInSqlExprBuilder(
    filterItem.sqlExprObj,
    `widgets.${this.widgetId}.config.filterItems[${filterIndex}].sqlExprObj`
  )
  sqlKeys.length > 0 && keys.push(...sqlKeys)
}
```
