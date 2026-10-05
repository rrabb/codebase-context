# OTB Widget: common/list

Online widget doc: https://developers.arcgis.com/experience-builder/guide/list-widget/

## Purpose

The List widget renders records from a single data source as repeated "cards", where each
card is an embedded ExB layout the author designs once and the widget repeats per record.
It is the canonical "repeat data source" widget: it supplies a repeated data source to its
child layout so inner widgets (Text, Image, Button, etc.) bind to per-record fields. It
supports three card states (Default / Selected / Hover), single/multiple selection with
selection sync back to the data source, paging (scroll or multi-page), search, filter, sort,
refresh, dynamic styling, and data actions. It is a large, heavily-decomposed widget.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/common/list/`

Inspected:
- `manifest.json` - properties, layouts, publishMessages, extensions.
- `config.json` - default config values.
- `src/config.ts` - config interface, enums, constants, `ListProps`.
- `src/version-manager.ts` - config upgraders 1.1.0 -> 1.18.0.
- `src/common-builder-support.tsx` - shared builder helpers (selectSelf, handleResizeCard).
- `src/runtime/widget.tsx` - thin runtime wrapper (state provider + extra state).
- `src/runtime/builder-support.tsx` - builder-only module bundle (`builderSupportModules`).
- `src/runtime/state/index.tsx` - reducer + context (`useListRuntimeState`/`Dispatch`).
- `src/runtime/components/list-widget.tsx` - main runtime container.
- `src/runtime/components/list-content-element.tsx` - class component, selection publish.
- `src/runtime/components/data-source/data-source-component.tsx` - DS query/paging bridge.
- `src/runtime/components/list/list.tsx` + `list-item.tsx` - virtualized list, repeat provider.
- `src/runtime/components/tools/top-tools.tsx` - search/filter/sort/refresh, filter message.
- `src/runtime/utils/list-service.tsx` - query building, records fetch, query compare.
- `src/tools/app-config-operations.ts` + `builder-operations.ts` - extensions.
- `src/setting/setting.tsx` + `components/data-source.tsx` - settings entry, DS selector.

Skipped / partially skimmed (large, lower value here):
- `dist/` (compiled) and `tests/` per instructions.
- `src/runtime/styles/*`, `src/runtime/utils/list-element-util.ts` (layout math), most
  `src/setting/components/**` (style-setting, default-setting subtrees), `src/guide/*`,
  `src/runtime/components/list-status-component/*` (loading/mask/a11y helpers).

## Architecture overview

```
runtime/widget.tsx (Widget)
  -> ListRuntimeStateProvider (React.useReducer context, NOT Redux)
  -> List = components/list-widget.tsx  (functional container)
       - reads extra Redux state via getExtraStateProps + useSelector
       - computes sizing/paging, top/bottom tool visibility, editing state
       -> list-content-element.tsx  (class component "Widget")
            - owns LayoutEntry, selection publish, scroll/page orchestration
            -> data-source/data-count.tsx (DataCountComponent)
                 -> DataSourceComponent (jimu-core) -> query, selection, status
            -> list/list.tsx -> react-window List/Grid (virtualized)
                 -> list/list-item.tsx
                      -> RepeatedDataSourceProvider (per-record repeat DS)
                      -> ListCardEditor (builder) / ListCardViewer (runtime)
                           -> LayoutEntry (renders the embedded DEFAULT/SELECTED/HOVER layout)
            -> tools/top-tools.tsx  (search / filter / sort / refresh / data action)
            -> tools/bottom-tools.tsx (paginator)
```

Two state systems coexist: (1) a widget-local reducer/context in `runtime/state` for
runtime UI state (page, records, dataSource, sizing, selection ids), and (2) the ExB Redux
store for cross-widget concerns (appMode, browserSizeMode, builderStatus, dynamicStyleState,
widgetsState props via `appActions.widgetStatePropChange`).

## Key imports and packages

jimu-core (`runtime/widget.tsx`, `list-widget.tsx`, `list-content-element.tsx`,
`data-source-component.tsx`, `list-item.tsx`, `list-service.tsx`):
- `React, ReactRedux, lodash, hooks, jsx, classNames, Immutable, utils`
- `AppMode, appActions, getAppStore`, types `IMState, AllWidgetProps`
- `DataSourceComponent, DataSourceManager, DataSourceStatus, dataSourceUtils, CONSTANTS`
- types `DataSource, QueriableDataSource, QueryParams, DataRecord, IMDataSourceInfo,`
  `UseDataSource, ImmutableArray, IMSqlExpression, QueryRequiredInfo, FeatureLayerDataSource`
- `MessageManager, DataRecordsSelectionChangeMessage` (`list-content-element.tsx`)
- `DataSourceFilterChangeMessage` (`tools/top-tools.tsx`)
- `RepeatedDataSourceProvider`, type `RepeatedDataSource` (`list/list-item.tsx`)
- `focusElementInKeyboardMode` (`list-content-element.tsx`)

jimu-core/dnd (`runtime/builder-support.tsx`):
- `interact`

jimu-ui:
- `Paper` (`widget.tsx`), `WidgetPlaceholder`, `defaultMessages`, `getFocusableElements`
  (`list-widget.tsx`, `list-content-element.tsx`)
- `ButtonGroup, Button, Popper`, `utils` (`builder-support.tsx`, `app-config-operations.ts`)
- `DistanceUnits` (`list/list.tsx`)

jimu-ui/advanced:
- `LinkContainer` from `jimu-ui/advanced/link-container` (`list/list.tsx`)
- `updateSQLExpressionByVersion`, `getKeysInSqlExprBuilder` from
  `jimu-ui/basic/sql-expression-runtime` (`version-manager.ts`, `builder-operations.ts`)
- type `SortSettingOption` from `jimu-ui/advanced/setting-components` (`config.ts`)

jimu-layouts:
- `LayoutEntry`, `searchUtils` from `jimu-layouts/layout-runtime`
- `GLOBAL_DRAGGING_CLASS_NAME, GLOBAL_RESIZING_CLASS_NAME, GLOBAL_H5_DRAGGING_CLASS_NAME`
  from `jimu-layouts/layout-builder` (`builder-support.tsx`)
- type `LayoutItemSizeModes` from `jimu-layouts/layout-runtime` (`config.ts`)

jimu-for-builder (`common-builder-support.tsx`, `builder-support.tsx`, `setting.tsx`):
- `getAppConfigAction, builderAppSync, builderActions, LayoutServiceProvider, widgetService`
- types `AppConfigAction, AllWidgetSettingProps, SettingChangeFunction`

jimu-theme (`builder-support.tsx`, `list/list.tsx`):
- `withBuilderTheme`, `useTheme`

Third-party:
- `react-window`: `List, Grid, useGridCallbackRef, useListCallbackRef, getScrollbarSize`,
  type `RowComponentProps` (`list/list.tsx`, `list-item.tsx`) - virtualization engine.
- `seamless-immutable` type `ImmutableObject` (`config.ts`).

## Reusable patterns found

- REPEAT data source (`canProvideRepeatDataSource: true` in manifest): each record is wrapped
  in `RepeatedDataSourceProvider` (`list/list-item.tsx`) so descendant widgets in the embedded
  layout resolve field bindings against the current record.
- Embedded layout with three FIXED layouts DEFAULT / SELECTED / HOVER (manifest `layouts`) plus
  `hasEmbeddedLayout: true` and `lockChildren: true`. Rendered through `LayoutEntry`
  (`list/list-item.tsx`, chosen from `builderSupportModules.LayoutEntry` in builder vs the
  runtime `LayoutEntry` import in `list-content-element.tsx`).
- DataSourceComponent bridge (`data-source/data-source-component.tsx`): wraps a single
  `useDataSources[0]` and reacts via `onDataSourceCreated`, `onDataSourceInfoChange`,
  `onSelectionChange`, `onDataSourceStatusChange`, `onQueryRequired`; `queryCount` toggled by
  `checkIsQueryCount(config)`.
- list-service query pattern (`runtime/utils/list-service.tsx`): `getQueryOptions` composes
  orderByFields (sort) + where/sqlExpression (filter + search merged via
  `dataSourceUtils.getMergedSQLExpressions`) + paging; `compareQueryOptionsExceptPaging`
  strips `page/pageSize/resultOffset/resultRecordCount` before deep-compare to detect whether
  only paging changed; `getDsRecords` reads records via
  `ds.getRecordsByPage` / `getRecordsByPageWithSelection` and supports scroll-accumulate
  (page 1..N*size) vs multi-page; fake placeholder records rendered in builder design mode.
- Selection sync outward: `selectRecordsAndPublishMessageAction`
  (`list-content-element.tsx`) publishes `DataRecordsSelectionChangeMessage(id, records, [ds.id])`
  AND calls `dataSource.selectRecordsByIds(...)` (declared in manifest `publishMessages`).
- Selection sync inward: `onSelectionChange` -> `dataSource.getSelectedRecords()` refreshes
  records and scrolls to selected items (`data-source-component.tsx`).
- DATA_SOURCE_FILTER_CHANGE: `publishDataFilterChangeMessage` (`tools/top-tools.tsx`) publishes
  `DataSourceFilterChangeMessage(id, [ds.id], clearFilterDataSourceIds)`.
- SqlExpression config: `config.filter` (SqlExpression) applied when `filterOpen && filterApplied`;
  search builds SQL via `dataSourceUtils.getSQL`; suggestions via `dataSourceUtils.querySuggestions`.
- version-manager (`version-manager.ts`): `BaseVersionManager` with upgraders that migrate
  SQL expression versions, auto-refresh flag, direction->layoutType, comma-string searchFields,
  page-total flag, and per-state card sizes.
- Builder-support module bundle (`runtime/builder-support.tsx`, `hasBuilderSupportModule: true`):
  exports a `widgetModules` object of builder-only heavy deps (interact, searchUtils,
  LayoutEntry, theme-wrapped Button/Popper/Dropdown, ListCardEditor, resize/select helpers) so
  the runtime bundle stays lean; consumed as `props.builderSupportModules`.
- Extensions (manifest `extensions`): `APP_CONFIG_OPERATIONS` (`tools/app-config-operations.ts`)
  for `useDataSourceWillChange` / `afterWidgetCopied` (remaps dynamic style + linkParam), and
  `BUILDER_OPERATIONS` (`tools/builder-operations.ts`) for i18n `getTranslationKey`.
- Widget-local reducer + React context (`runtime/state/index.tsx`) instead of Redux for
  high-frequency runtime state; `useListRuntimeState()` / `useListRuntimeDispatch()` hooks and a
  combined `ListContainerContext` used by the class component (`static contextType`).

## Builder vs runtime split

- `hasBuilderSupportModule: true` -> builder-only code lives in `runtime/builder-support.tsx`
  and is injected as `props.builderSupportModules`. Runtime code path uses the plain
  `LayoutEntry` import; builder path uses `builderSupportModules.LayoutEntry` (see
  `list-content-element.componentDidMount`).
- `common-builder-support.tsx` holds pure helpers usable from both builder-support and setting
  (e.g. `handleResizeCard` builds an `AppConfigAction` setting cardSize for all three states;
  `selectSelf` drives builder selection via `builderAppSync` / `appActions.selectionChanged`).
- Setting (`setting/setting.tsx`) is a class component using
  `AllWidgetSettingProps<IMConfig>` + `static mapExtraStateProps` reading
  `state.appStateInBuilder.*` (appConfig, appMode, browserSizeMode, widget builderStatus /
  showCardSetting / layoutInfo / widgetRect / parentSize). Data source is picked in
  `setting/components/data-source.tsx` via `DataSourceComponent`.
- Runtime writes builder-facing widget state via `appActions.widgetStatePropChange(id, name,
  value)` (e.g. `builderStatus`, `showCardSetting`, `layoutInfo`, `parentSize`,
  `selectionIsInSelf`, `dsId`) that setting reads back.

## Lifecycle and cleanup

- `runtime/widget.tsx` memoizes `getExtraStateProps` via `useSelector` + `lodash.isDeepEqual`
  ref cache to avoid re-renders.
- `list-widget.tsx` uses many `useEffect`s: init widgetRect/currentCardSize on mount; recompute
  page size on config/size/tool changes (guarded when `widgetRect.height === 0` to avoid
  scrollbar jump on collapsed accordion); reset page to 1 when `itemsPerPage`/`pageStyle`
  change; push `parentSize`/`layoutInfo`/`selectionIsInSelf` into Redux widget state.
- `list-content-element.tsx` is a `React.PureComponent` holding numerous instance refs
  (timeouts, scroll flags). Timers used: `updateCardToolTimeout`, `selectRecordTimeout`,
  `setPageTimeout`, `onItemsRenderedTimeout`, `loadMoreDataTimeout`. UNVERIFIED whether every
  timeout is cleared in `componentWillUnmount` - inspect
  `src/runtime/components/list-content-element.tsx` `componentWillUnmount`.
- `data-source-component.tsx` clears `setPageTimeoutRef` / `setRecordTimeoutRef` before
  re-setting; `setting.tsx` clears `settingPanelChange` widget state in `componentWillUnmount`.
- Virtualization lifecycle is delegated to `react-window` (`list/list.tsx`), with
  `onItemsRendered` feeding `firstItemIndexInViewport` back into runtime state for dynamic-style
  preview and scroll-to-selected.

## Manifest/config requirements

manifest.json highlights:
- `publishMessages`: `["DATA_RECORDS_SELECTION_CHANGE", "DATA_SOURCE_FILTER_CHANGE"]`.
- `properties`: `hasEmbeddedLayout`, `lockChildren`, `flipIcon`, `canConsumeDataAction`,
  `canProvideRepeatDataSource`, `showDescription`, `hasBuilderSupportModule`, `hasGuide`,
  `guideType: "PROGRAM"`.
- `excludeDataActions`: `["arcgis-map.addToMap"]`.
- `extensions`: `appConfigOperations` (APP_CONFIG_OPERATIONS -> `tools/app-config-operations`),
  `builderOperations` (BUILDER_OPERATIONS -> `tools/builder-operations`).
- `layouts`: `DEFAULT`, `SELECTED`, `HOVER` (all `type: FIXED`).
- `defaultSize`: 620 x 275.

config (see `src/config.ts` `Config` + `config.json` defaults):
- Data binding is via widget `useDataSources` (single source); no `dataSource` field in config.
- Key config keys: `itemStyle` (must be set or the widget shows a placeholder),
  `cardConfigs` (per-status Default/Hover/Selected: cardSize per device, selectionMode,
  backgroundStyle, dynamicStyleConfig), `layoutType` (ROW/COLUMN/GRID), `pageStyle`
  (SCROLL/MULTIPAGE), `itemsPerPage`, `searchOpen/searchFields/searchExact`,
  `filterOpen/filter` (SqlExpression), `sortOpen/sorts` (SortSettingOption[]),
  `showRefresh`, `linkParam`, `isItemStyleConfirm`.
- Defaults (config.json): `itemStyle: "STYLE5"`, `layoutType: "ROW"`, `pageStyle: "SCROLL"`,
  `itemsPerPage: 10`, `scrollBarOpen: true`, `alignType: "CENTER"`, `isItemStyleConfirm: false`.
- Constants (`config.ts`): `MAX_PAGE_SIZE = 2000`, `MAX_ITEMS_PER_PAGE = 200`,
  `DEFAULT_CARD_SIZE = 200`, `GRID_TEMPLATE_WIDTH = 620`.

## Gotchas

- Two independent state stores. High-frequency runtime state is in the local reducer
  (`runtime/state`), NOT Redux. Do not expect page/records/selection in the Redux widget state;
  only a subset is mirrored via `widgetStatePropChange`.
- The visible widget is `Widget` (the class) in `list-content-element.tsx`, not
  `list-widget.tsx`; `list-widget.tsx` is the functional container that wires props/state.
- `config.itemStyle` unset => `WidgetPlaceholder` renders and no list. Template/state confirm
  flow is gated by `isItemStyleConfirm`.
- In builder design mode, `getDsRecords` injects fake placeholder records (`{ fake: true }`) so
  the card layout is visible before data loads; do not treat these as real records.
- Scroll page style accumulates records (`getRecordsByPage(1, size*page)`) while multi-page uses
  `getRecordsByPage(page, size)`; mixing assumptions breaks paging.
- Selection requires BOTH publishing the message and calling `selectRecordsByIds`; the message
  alone will not update the data source selection.
- `compareQueryOptionsExceptPaging` deletes paging keys on cloned queries via
  `getRealQueryParams`; when only paging changes it deliberately keeps the prior query and resets
  page to 1 (see `getQuery` in `data-source-component.tsx`).
- Builder-only heavy modules must come through `builderSupportModules`; importing them directly
  in runtime code would bloat/break the runtime bundle.
- `queryCount` is conditional (`checkIsQueryCount(config)`); count-dependent paging resets only
  fire when count querying is enabled.

## Useful snippets and functions

Source: `src/runtime/widget.tsx`
```tsx
const Widget = (props: AllWidgetProps<IMConfig>): React.ReactElement => {
  const extraStatePropsRef = React.useRef(null)
  const extraStateProps = useSelector((state: IMState) => {
    const extraState = getExtraStateProps(state, props)
    if (lodash.isDeepEqual(extraStatePropsRef.current, extraState)) {
      return extraStatePropsRef.current
    } else {
      extraStatePropsRef.current = extraState
      return extraState
    }
  })
  return (
    <Paper shape="none" transparent className='jimu-widget widget-list'>
      <ListRuntimeStateProvider>
        <List {...extraStateProps} {...props} />
      </ListRuntimeStateProvider>
    </Paper>
  )
}
Widget.versionManager = versionManager
```

Source: `src/runtime/components/data-source/data-source-component.tsx`
```tsx
<DataSourceComponent
  query={query}
  useDataSource={useDataSources && useDataSources[0]}
  onDataSourceCreated={onDSCreated}
  onCreateDataSourceFailed={onCreateDataSourceFailed}
  widgetId={id}
  queryCount={checkIsQueryCount(config)}
  onDataSourceInfoChange={onDataSourceInfoChange}
  onSelectionChange={onDsSelectionChange}
  onDataSourceStatusChange={onDataSourceStatusChange}
  onQueryRequired={onQueryRequired}
>
  {props.children}
</DataSourceComponent>
```

Source: `src/runtime/components/list-content-element.tsx`
```tsx
private readonly selectRecordsAndPublishMessageAction = (records: DataRecord[]) => {
  const { dataSource } = this.context.state
  if (dataSource) {
    MessageManager.getInstance().publishMessage(
      new DataRecordsSelectionChangeMessage(this.props.id, records, [dataSource.id]))
    if (records) {
      const selectedRecordsId = records?.map(record => record.getId()) || []
      this.context.dispatch({ type: 'SET_SELECTED_RECORDS_ID', value: selectedRecordsId })
      clearTimeout(this.selectRecordTimeout)
      this.selectRecordTimeout = setTimeout(() => {
        dataSource.selectRecordsByIds(records.map(record => record.getId()))
      })
    }
  }
}
```

Source: `src/runtime/components/tools/top-tools.tsx`
```tsx
const publishDataFilterChangeMessage = React.useCallback(() => {
  const clearFilter = checkIsClearFilter()
  const clearFilterDataSourceIds = clearFilter ? [dataSource.id] : []
  MessageManager.getInstance().publishMessage(
    new DataSourceFilterChangeMessage(id, [dataSource.id], clearFilterDataSourceIds))
}, [id, dataSource])
```

Source: `src/runtime/utils/list-service.tsx`
```ts
// Build query: sort + filter + search (merged) + paging
const orderBys = getOrderByFields(config.sorts, config.sortOpen, sortOptionName, activeSort)
if (orderBys.length > 0) options.orderByFields = orderBys
if (config.filterOpen && filterApplied && config.filter && currentFilter?.sql) {
  options.where = currentFilter.sql
  options.sqlExpression = currentFilter
}
if (config.searchOpen && config.searchFields && searchText) {
  const sqlExpr = dataSourceUtils.getSQL(searchText, config.searchFields.asMutable({ deep: true }), datasource, config?.searchExact)
  if (options.where) {
    const mergedExpr = dataSourceUtils.getMergedSQLExpressions([options.sqlExpression.asMutable({ deep: true }), sqlExpr], datasource)
    options.where = mergedExpr.sql; options.sqlExpression = Immutable(mergedExpr)
  } else { options.where = sqlExpr.sql; options.sqlExpression = Immutable(sqlExpr) }
}
if (pageSize > 0) { options.page = page; options.pageSize = pageSize }
```

Source: `src/runtime/utils/list-service.tsx`
```ts
// Scroll page style accumulates records; multi-page reads a single page.
records = config.pageStyle === PageStyle.Scroll
  ? ds.getRecordsByPageWithSelection(1, recordSizePerPage * page)
  : ds.getRecordsByPageWithSelection(page, recordSizePerPage)
```

Source: `src/runtime/components/list/list-item.tsx`
```tsx
<RepeatedDataSourceProvider data={providerData}>
  {showListCardEditor && <ListCardEditor {...memoizedItemProps} LayoutEntry={LayoutEntry} />}
  {!isEditor && <ListCardViewer {...memoizedItemProps} LayoutEntry={LayoutEntry} />}
</RepeatedDataSourceProvider>
```

Source: `src/version-manager.ts`
```ts
class VersionManager extends BaseVersionManager {
  versions = [
    { version: '1.8.0', description: '1.8.0', upgrader: (oldConfig, id) => {
      let newConfig = oldConfig
      if (oldConfig?.direction && !oldConfig?.layoutType) {
        const layoutType = oldConfig.direction === DirectionType.Horizon
          ? ListLayoutType.Column : ListLayoutType.Row
        newConfig = newConfig.set('layoutType', layoutType).set('keepAspectRatio', false)
      }
      return newConfig
    } }
    // ...1.1.0 (SQL migrate), 1.5.0 (auto-refresh), 1.13.0 (searchFields split),
    //    1.16.0 (hidePageTotal), 1.18.0 (per-state card sizes)
  ]
}
```

Source: `src/common-builder-support.tsx`
```ts
export function handleResizeCard (option: HandleResizeCardOptions): AppConfigAction {
  const { widgetId, browserSizeMode, newCardSize, widgetConfig } = option
  const appConfig = option?.appConfig ?? getAppConfigAction().appConfig
  const action = getAppConfigAction(appConfig)
  action.editWidgetConfig(widgetId, widgetConfig
    .setIn(['cardConfigs', Status.Default, 'cardSize', browserSizeMode], newCardSize)
    .setIn(['cardConfigs', Status.Hover, 'cardSize', browserSizeMode], newCardSize)
    .setIn(['cardConfigs', Status.Selected, 'cardSize', browserSizeMode], newCardSize))
  return action
}
```
