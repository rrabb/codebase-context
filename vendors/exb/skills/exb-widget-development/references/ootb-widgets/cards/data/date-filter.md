# OTB Widget: common/date-filter

Online widget doc: https://developers.arcgis.com/experience-builder/guide/date-filter-widget/

## Purpose

The Date Filter widget applies a date/time filter (SQL where clause) to one or more
feature layer/table data sources based on a date the user picks. It is the OOTB
"filter by date" card. Two ways to bind data:

- By data: user selects one or more layer/table data sources directly (data selector).
- By Map widget: the widget binds to a Map widget, discovers time-aware layers/tables in
  the active JimuMapView, and can either sync to all supported layers or let the author
  customize which layers are filtered.

The user picks a single date or a date range; the widget builds an intersect SQL clause
against a start field (and optional end field) and pushes it to each data source via
`updateQueryParams`. Three UI styles: Inline (embedded Calcite date picker), Icon (a pill
button that opens the picker in a Popper), and Input (a Calcite input-date-picker).

NOTE: This widget's manifest describes it as "the widget used in developer guide" and it
lives under widgets/common, so treat it as an Esri sample/OOTB reference implementation.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/common/date-filter/` (gitignored; dist/ and tests/ ignored per task)

- `manifest.json` - widget metadata (VERIFIED: no `dependencies` array declared)
- `config.json` - default config values
- `src/config.ts` - config types, enums (SelectionMode, FilterStyle, FilterRelationship), LayerConfig/MapViewConfig types
- `src/utils/utils.ts` - shared layer/table support checks, date-field discovery, virtual date list
- `src/runtime/widget.tsx` - runtime entry, state orchestration, filter apply
- `src/runtime/components/date-picker.tsx` - picker dispatcher (Inline/Icon/Input)
- `src/runtime/components/inline-date-picker.tsx` - Calcite `calcite-date-picker` + apply/clear/today footer
- `src/runtime/components/icon-date-picker.tsx` - pill Button + Badge + Popper wrapping InlineDatePicker
- `src/runtime/components/input-date-picker.tsx` - Calcite `calcite-input-date-picker`
- `src/runtime/components/filter-ds.tsx` - DataSourceComponent wrapper (class component)
- `src/runtime/components/utils.ts` - applyFiltersByData / applyFiltersByMap / getIntersectSQL / getDatesForDefaultDay
- `src/runtime/components/types.ts` - DateProps interface
- `src/runtime/components/placeholder.tsx` - runtime WidgetPlaceholder
- `src/setting/setting.tsx` - settings entry (class component)
- `src/setting/components/source.tsx` - source mode radios + MapWidgetSelector + JimuMapViewComponent
- `src/setting/components/source-data-layers.tsx` - data mode layer list + SidePopper editor
- `src/setting/components/source-map-layers.tsx` - map mode LayerSetting binding
- `src/setting/components/source-layer-config.tsx` - DataSourceSelector + FieldSelector (start/end field)
- `src/setting/components/options.tsx` - selection mode, default date, auto apply
- `src/setting/components/styles.tsx` - filter style picker + controller inControllerUx handling
- `src/setting/components/filter-ds.tsx` - settings DataSourceComponent wrapper
- `src/setting/components/placeholder.tsx` - settings placeholder
- `src/setting/components/utils.ts` - getDefaultLayerConfig

## Architecture overview

Runtime (`widget.tsx`) is a function component that keeps two parallel data paths driven by
`config.addSourceByData`:

- Data mode: renders one `FilterDataSource` (wrapping `DataSourceComponent`) per `useDataSources`
  entry, collecting created data sources into a `dataSources` map and tracking not-ready
  output ds ids. Filters applied via `applyFiltersByData`.
- Map mode: renders a single `JimuMapViewComponent`, listens for the active JimuMapView,
  discovers loaded JimuLayerViews and JimuTables, keeps only time-aware ones, and applies
  filters via `applyFiltersByMap`.

A shared `DatePicker` component renders the chosen style and calls back `onDatePickerChange`,
which stores the current dates in a ref and calls `onDateChange`. `onDateChange` branches on
source mode and delegates to the apply-by-data or apply-by-map helper.

Settings (`setting.tsx`) is a class component composing `Source`, `Styles`, and `Options`
sections, plus a placeholder when no data source is selected. `Source` swaps between
`SourceDataLayers` (data mode) and `SourceMapLayers` (map mode).

## Key imports and packages

Grouped by module; file path shown per group.

jimu-core (widget.tsx): `React`, `classNames`, `DataSource` (type), `AllWidgetProps` (type), `hooks`, `DataSourceStatus`
jimu-arcgis (widget.tsx): `JimuMapViewComponent`, `JimuMapView` (type), `JimuLayerView` (type), `JimuTable` (type)

jimu-core (runtime/components/utils.ts): `ClauseLogic`, `ClauseOperator`, `dataSourceUtils`, `dateUtils`, `Immutable`, `QueriableDataSource` (type), `DataSource` (type), `SqlResult` (type), `JimuFieldType` (type)
jimu-arcgis (runtime/components/utils.ts): `JimuLayerView`, `JimuMapView`, `JimuTable` (types)

jimu-core (runtime/components/filter-ds.tsx): `React`, `jsx`, `DataSourceComponent`, `IMUseDataSource` (type), `DataSource` (type), `DataSourceStatus`  (uses `/** @jsx jsx */` pragma)

jimu-theme (inline-date-picker.tsx): `colorUtils`, `styled`
jimu-core (inline-date-picker.tsx): `dateUtils`, `hooks`, `React`
jimu-ui (inline-date-picker.tsx): `Button`, `defaultMessages`
side-effect import (inline-date-picker.tsx, input-date-picker.tsx): `import 'calcite-components'`
jimu-icons (inline-date-picker.tsx): `FilterClearOutlined` from `jimu-icons/outlined/editor/filter-clear`, `FilterApplyOutlined` from `jimu-icons/outlined/editor/filter-apply`

jimu-core (icon-date-picker.tsx): `React`, `IMIconResult` (type)
jimu-ui (icon-date-picker.tsx): `Badge`, `Button`, `FlipOptions` (type), `Icon`, `Popper`

jimu-theme (input-date-picker.tsx): `colorUtils`, `styled`
jimu-core (input-date-picker.tsx): `React`, `ReactResizeDetector`, `getAppStore`

jimu-core (utils/utils.ts): `DataSource` (type), `JSAPILayerTypes`, `DataSourceTypes`, `EsriFieldType`, `dateUtils`, `FieldSchema` (type)
jimu-arcgis (utils/utils.ts): `JimuLayerView`, `JimuMapView`, `JimuTable` (types); uses `__esri.Layer`, `__esri.FeatureLayer`, `__esri.Field`

jimu-core (setting/setting.tsx): `React`, `DataSource` (type)
jimu-for-builder (setting/setting.tsx): `AllWidgetSettingProps` (type)

jimu-core (setting/components/source.tsx): `hooks`, `Immutable`, `React`, `DataSourceManager`, plus types `ImmutableArray`, `UseDataSource`, `ImmutableObject`, `DataSource`
jimu-arcgis (source.tsx): `JimuMapView` (type), `JimuMapViewComponent`
jimu-for-builder (source.tsx): `SettingChangeFunction` (type)
jimu-ui (source.tsx): `Button`, `Label`, `Radio`, `Tooltip`
jimu-ui/advanced/setting-components (source.tsx): `MapWidgetSelector`, `SettingRow`, `SettingSection`
jimu-icons (source.tsx): `InfoOutlined` from `jimu-icons/outlined/suggested/info`

jimu-core (source-data-layers.tsx): `classNames`, `DataSource` (type), `hooks`, `Immutable`, `React`, `urlUtils`
jimu-theme (source-data-layers.tsx): `styled`
jimu-ui (source-data-layers.tsx): `Alert`, `Button`, `defaultMessages as jimuUIMessages`
jimu-ui/advanced/setting-components (source-data-layers.tsx): `SettingRow`, `SettingSection`, `SidePopper`
jimu-ui/basic/list-tree (source-data-layers.tsx): `List`, `TreeItemActionType`
jimu-icons (source-data-layers.tsx): `PlusOutlined`, `CloseOutlined`

jimu-core (source-map-layers.tsx): `DataSourceManager`, `DataSourceTypes`, `DataSource` (type), `Immutable`, `ImmutableArray`, `ImmutableObject`, `React`, `hooks`
jimu-arcgis (source-map-layers.tsx): `JimuLayerView`, `JimuMapView`, `JimuTable` (types)
jimu-ui (source-map-layers.tsx): `Alert`, `IconComponentProps` (type)
jimu-ui/advanced/setting-components (source-map-layers.tsx): `LayerSetting`, `SettingRow`
jimu-icons svg (source-map-layers.tsx): `IconWarning` from `jimu-icons/svg/outlined/suggested/warning.svg`

jimu-core (source-layer-config.tsx): `DataSource` (type), `DataSourceManager`, `hooks`, `Immutable`, `IMUseDataSource` (type), `JimuFieldType`, `React`
jimu-ui (source-layer-config.tsx): `defaultMessages as jimuUIMessages`, `Loading`, `LoadingType`
jimu-ui/advanced/data-source-selector (source-layer-config.tsx): `DataSourceSelector`, `FieldSelector`
jimu-ui/advanced/setting-components (source-layer-config.tsx): `SettingRow`, `SettingSection`

jimu-core (options.tsx): `DateTimeFieldFormatProperties` (type), `dateUtils`, `hooks`, `React`
jimu-for-builder (options.tsx): `SettingChangeFunction` (type)
jimu-ui (options.tsx): `Label`, `Radio`, `Switch`, `defaultMessages as jimuUIMessages`
jimu-ui/advanced/setting-components (options.tsx): `SettingRow`, `SettingSection`
jimu-ui/basic/date-picker (options.tsx): `DatePicker`

jimu-core (styles.tsx): `hooks`
jimu-for-builder (styles.tsx): `getAppConfigAction`, `SettingChangeFunction` (type)
jimu-theme (styles.tsx): `styled`, `useTheme`
jimu-ui (styles.tsx): `Button`, `Icon`, `Tooltip`, `defaultMessages as jimuUIMessages`
jimu-ui/advanced/setting-components (styles.tsx): `SettingRow`, `SettingSection`

Calcite: uses custom elements `calcite-date-picker` (inline-date-picker.tsx) and
`calcite-input-date-picker` (input-date-picker.tsx), enabled via side-effect
`import 'calcite-components'`. Theming through Calcite CSS custom properties
(`--calcite-date-picker-*`, `--calcite-input-date-picker-*`, `--calcite-select-*`,
`--calcite-color-foreground-1`) and jimu-theme `sys` tokens exposed as CSS vars
(`--sys-color-surface-paper`, `--sys-color-surface-overlay`, `--sys-color-action-selected`, etc).

## Reusable patterns found

- DataSourceComponent wrapper (`filter-ds.tsx`): a small PureComponent that owns a single
  `DataSourceComponent`, forwarding created/failed/info-change callbacks and clearing state on
  unmount. Runtime maps this per `useDataSource`; settings maps it per `useDataSource` too.
- SelectionMode SINGLE vs RANGE (`config.ts`): drives whether the picker is single or range
  (`range={mode === SelectionMode.Range}`) and which SQL clause set is built in `getIntersectSQL`.
- Map-layer + table binding (`widget.tsx`, `source-map-layers.tsx`): discovers
  `getAllLoadedJimuLayerViews()` and `getLoadedJimuTables()`, filters by `isJimuLayerViewSupported`
  / `isJimuTableSupported`, then creates layer/table data sources and applies filters. Sync mode
  vs customize mode decided by `syncToMapWidget()`.
- Calcite date/time pickers in three styles (inline embedded, icon in Popper, input) sharing a
  `DateProps` contract (`types.ts`) and a common `DatePicker` dispatcher.
- dateUtils usage: `getDateByStrictYMDFormat`, `getStrictYMDFormat`, `getRealDateByVirtualDate`,
  and `VirtualDateType` (Today/Yesterday/Tomorrow) for the "default day" virtual date support.
- colorUtils + styled Calcite theming: `colorUtils.colorMixOpacity('var(--sys-color-action-selected)', 0.2)`
  feeds Calcite range-background CSS variables inside a `styled('div')` root.
- dataSourceUtils SQL building: `createSQLClause`, `createSQLClauseSet`, `createSQLExpression`
  produce an `SqlResult` that is pushed via `(ds as QueriableDataSource).updateQueryParams(...)`.

## Builder vs runtime split

- Runtime (`src/runtime/`) reads `config` + `useDataSources` + `useMapWidgetIds`, resolves data
  sources / map views, and applies filters. It never mutates config.
- Builder/settings (`src/setting/`) writes config and the widget's `useDataSources` /
  `useMapWidgetIds` via `onSettingChange(...)`. Notable builder-only behavior:
  - `styles.tsx` calls `getAppConfigAction().editWidgetProperty(widgetId, 'inControllerUx', ...)`
    to switch controller UX between `inPanel` (Input style) and `offPanel` (Inline/Icon).
  - `source.tsx` clears both `layerConfigList` and `mapViewConfigList` when switching source mode
    (`config.without('layerConfigList').without('mapViewConfigList').set('addSourceByData', ...)`).
  - Default `addSourceByData` in settings is `!window.isExpressBuilder` (express builder defaults
    to map mode); config.json ships `false`.
- Shared code in `src/utils/utils.ts` (layer/table support checks, date-field discovery) is used
  by both runtime and settings.

## Lifecycle and cleanup

- `widget.tsx`:
  - Initial `useEffect([])` applies auto-apply filters when `autoApply && defaultDay`.
  - `useEffect([config])` bumps `datePickerVersion` to reset the picker to config state.
  - `hooks.useUpdateEffect([addSourceByData])` clears filters from the previous mode and resets
    data/map state when the source mode changes.
  - `hooks.useUpdateEffect([layerConfigList, useMapWidgetIds, mapViewConfigList])` updates or
    clears filters depending on whether field vs length/map changed.
  - Active view effect adds `addJimuLayerViewCreatedListener` and returns a cleanup that calls
    `removeJimuLayerViewCreatedListener`.
- `filter-ds.tsx` (runtime): `componentWillUnmount` calls back with `null` ds and marks the ds
  not-ready so the parent drops it from state.
- `inline-date-picker.tsx`: `onGetPickerRef` waits for `datePicker.componentOnReady()` before
  showing the footer (`isReady`).
- `source.tsx`: `onJimuViewsCreate` awaits `whenJimuMapViewLoaded()` and
  `whenAllJimuLayerViewLoaded()` before storing views.

## Manifest/config requirements

- `manifest.json`: `name: date-filter`, `label: Date Filter`, `type: widget`,
  version/exbVersion `1.20.0`. `properties.coverLayoutBackground: true`,
  `properties.defaultInControllerUx: "offPanel"`. `defaultSize` 298x390 with
  `autoWidth`/`autoHeight` true.
- VERIFIED: manifest declares NO `dependencies` array. Calcite is pulled in at module scope via
  `import 'calcite-components'`; ArcGIS types are only `__esri.*` type references (no runtime
  `esri/*` module loading in the inspected files). UNVERIFIED whether a `dependencies` entry
  would still be recommended for repo widgets that load JSAPI modules; this sample does not.
- `config.json` defaults: `addSourceByData: false`, `filterStyle: "INLINE"`,
  `selectionMode: "SINGLE"`, `autoApply: false`.
- `config.ts` config shape: `addSourceByData`, optional `layerConfigList` (data mode),
  optional `mapViewConfigList` (map mode), `filterStyle`, `selectionMode`, `defaultDay`,
  `autoApply`. Enums: `SelectionMode` (SINGLE/RANGE), `FilterStyle` (INLINE/ICON/INPUT),
  `FilterRelationship` (BEFORE/AFTER/INTERSECT - defined but not used by the inspected apply
  logic, which always builds an intersect query).

## Gotchas

- Input style forces `autoApply: true` and cannot toggle it (`options.tsx` disables the Switch
  when `filterStyle === Input`; `styles.tsx` sets `autoApply` true when switching to Input and
  back to false when leaving Input for Inline/Icon).
- Controller UX: on a Controller widget with Icon style, runtime downgrades to Inline
  (`pickerStyle = (controllerWidgetId && filterStyle === Icon) ? Inline : filterStyle`).
- Calcite range bug workarounds in `inline-date-picker.tsx`: handles the `'0NaN-NaN-NaN'`
  sentinel and re-starts a range when a completed range is re-clicked; comments note that
  `activeDate` only works for single mode and `value` cannot clear to null, so `valueAsDate` is
  used instead.
- `getIntersectSQL` treats `startField === endField` as a single-field case (sets endField null).
- Sync vs customize (`syncToMapWidget`): sync mode is when `mapViewConfigList` is missing, the
  view id has no entry, or `customizeLayers` is false. In sync mode a normal layer with multiple
  date fields is skipped (start field resolves to null).
- Date field discovery ignores runtime-added layers (`layerView.fromRuntime`).
- `updateJimuTablesLoaded` may run before `getMapDataSource()` is ready and returns early
  (mapDs can be null while the mapView is ready).
- Values are pushed to data sources as UTC (`isUTC: true`) and for DATE fields converted via
  `getDateTimeByLabel` (epoch ms); DATE_ONLY fields use the ymd string directly.
- `SUPPORTED_LAYER_TYPES` (data ds) and `SUPPORTED_JSAPI_LAYER_TYPES` (map layers) are two
  separate allow-lists; keep them in sync when adding layer types.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - runtime render branches on source mode, mapping a
DataSourceComponent per data source and a single JimuMapViewComponent for map mode.

```tsx
const hasData = useDataSources?.length || useMapWidgetIds?.length
if (!hasData) {
  return (
    <Placeholder controllerWidgetId={controllerWidgetId} autoWidth={autoWidth} autoHeight={autoHeight} />
  )
}

const pickerStyle = (controllerWidgetId && filterStyle === FilterStyle.Icon) ? FilterStyle.Inline : filterStyle
return (
  <div className={classNames('jimu-widget widget-date-filter', { 'overflow-auto': filterStyle === FilterStyle.Inline, 'p-1': filterStyle === FilterStyle.Input })}>
    {
      useMapWidgetIds?.length > 0 &&
      <JimuMapViewComponent useMapWidgetId={useMapWidgetIds[0]} onActiveViewChange={onActiveViewChange} />
    }
    {
      useDataSources?.length > 0 && useDataSources?.map((useDs) => (
        <FilterDataSource
          key={useDs.dataSourceId}
          useDataSource={useDs}
          onIsDataSourceNotReady={onIsDataSourceNotReady}
          onCreateDataSourceCreatedOrFailed={onCreateDataSourceCreatedOrFailed}
        />
      ))
    }
    <DatePicker
      label={label} icon={icon} style={pickerStyle}
      autoWidth={autoWidth} layoutId={layoutId} layoutItemId={layoutItemId}
      mode={selectionMode} defaultDay={defaultDay as any} autoApply={autoApply}
      version={datePickerVersion} onChange={onDatePickerChange}
    />
  </div>
)
```

Source: `src/runtime/components/filter-ds.tsx` - minimal DataSourceComponent wrapper with
unmount cleanup.

```tsx
export default class FilterDataSource extends React.PureComponent<DataSourceProps> {
  componentWillUnmount () {
    this.props.onCreateDataSourceCreatedOrFailed(this.props.useDataSource.dataSourceId, null, true)
    this.props.onIsDataSourceNotReady(this.props.useDataSource.dataSourceId, DataSourceStatus.NotReady)
  }
  onDataSourceCreated = (ds) => {
    this.props.onCreateDataSourceCreatedOrFailed(this.props.useDataSource.dataSourceId, ds)
  }
  onCreateDataSourceFailed = () => {
    this.props.onCreateDataSourceCreatedOrFailed(this.props.useDataSource.dataSourceId, null)
  }
  onDataSourceInfoChange = (info) => {
    this.props.onIsDataSourceNotReady(this.props.useDataSource.dataSourceId, info?.status)
  }
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
}
```

Source: `src/runtime/components/utils.ts` - build SQL and push it to a queriable data source.

```ts
function applyFilters (props: ApplyFiltersProps) {
  const { widgetId, date, selectionMode, dataSource: ds, startField, endField } = props
  if (!ds) return
  const dateFieldType = ds.getSchema().fields[startField].type
  const sqlResult = getIntersectSQL({ dateFieldType, startField, endField, date, selectionMode, dataSource: ds })
  const queryParams = { where: sqlResult.sql, sqlExpression: sqlResult.sqlExpression } as any
  (ds as QueriableDataSource).updateQueryParams?.(queryParams, widgetId)
}
```

Source: `src/runtime/components/utils.ts` - sync-vs-customize decision.

```ts
export function syncToMapWidget (mapViewConfigList: IMMapViewConfigList, jimuMapViewId: string): boolean {
  return !mapViewConfigList || !mapViewConfigList[jimuMapViewId] || !mapViewConfigList[jimuMapViewId].customizeLayers
}
```

Source: `src/runtime/components/utils.ts` - resolve default day (supports virtual dates) to ymd.

```ts
export function getDatesForDefaultDay (defaultDay: DateType, mode: SelectionMode): DateType {
  if (mode === SelectionMode.Single) {
    return getYmdDateByLabel(defaultDay as string)
  } else {
    const dates = (defaultDay as string[])?.filter(d => !!d) || []
    if (dates.length === 0) {
      return null
    }
    const startDate = getYmdDateByLabel(dates[0])
    const endDate = getYmdDateByLabel(dates[1] || dates[0])
    return [startDate, endDate]
  }
}

function getYmdDateByLabel (dateLabel: string): string {
  let ymd: string = null
  if (VIRTUAL_LIST.includes(dateLabel as dateUtils.VirtualDateType)) {
    const date = dateUtils.getRealDateByVirtualDate(dateLabel as dateUtils.VirtualDateType) as Date
    ymd = dateUtils.getStrictYMDFormat(date)
  } else if (dateLabel) {
    ymd = dateLabel
  }
  return ymd
}
```

Source: `src/utils/utils.ts` - decide if a JimuLayerView is a supported time-aware layer.

```ts
export function isJimuLayerViewSupported (jimuLayerView: JimuLayerView): boolean {
  if (!jimuLayerView || !jimuLayerView.type) {
    return false
  }
  const viewType = jimuLayerView.type
  const isViewPass = (viewType !== JSAPILayerTypes.BuildingComponentSublayer) || (viewType === JSAPILayerTypes.BuildingComponentSublayer && jimuLayerView.view)
  const isSupported = isViewPass && SUPPORTED_JSAPI_LAYER_TYPES.includes(viewType)
  if (!isSupported) {
    return false
  }
  const fields = jimuLayerView.layer.fields || jimuLayerView.layer.sourceJSON.fields
  if (!fields || fields.length === 0) {
    return null
  }
  return !!getFirstDateFieldFromEsriFields(fields)
}
```

Source: `src/utils/utils.ts` - load JimuTables (calls table.load() manually).

```ts
export async function getLoadedJimuTables (jimuMapView: JimuMapView): Promise<JimuTable[]> {
  const jimuTables = jimuMapView.getJimuTables()
  const promises = jimuTables.map(async jimuTable => {
    const table = jimuTable.table
    if (table && !table.loaded) {
      try {
        await table.load()
      } catch {}
    }
    return jimuTable
  })
  await Promise.all(promises)
  return jimuTables.filter(jimuTable => jimuTable.table?.loaded)
}
```

Source: `src/runtime/components/inline-date-picker.tsx` - styled Calcite date picker root using
sys + Calcite CSS vars, and the calcite element with valueAsDate.

```tsx
const DatePickerRoot = styled('div')(({ theme, styleState }) => {
  const isInPopper = (styleState as any).isInPopper
  const overlayBgColor = 'var(--sys-color-surface-overlay)'
  const textColor = isInPopper ? 'var(--sys-color-surface-overlay-text)' : 'var(--sys-color-surface-paper-text)'
  return {
    width: '298px',
    height: '390px',
    'calcite-date-picker': {
      borderWidth: '0px',
      '--calcite-date-picker-day-range-background-color': colorUtils.colorMixOpacity('var(--sys-color-action-selected)', 0.2),
      '--calcite-date-picker-day-text-color': textColor
    }
  }
})

// ...
<calcite-date-picker
  className='calcite-date-picker'
  aria-label={label}
  range={range}
  activeDate={activeDate}
  valueAsDate={valueAsDate}
  calendars={1}
  oncalciteDatePickerChange={onCalciteDateChange}
  ref={onGetPickerRef}
/>
```

Source: `src/runtime/components/icon-date-picker.tsx` - Badge + Button pill opening a Popper
that hosts the InlineDatePicker.

```tsx
<div className='filter-widget-popper'>
  <Badge dot className='m-1' hideBadge={!applied} color='primary'>
    <Button icon size='sm' className='filter-widget-pill h-100' ref={ref => { iconRef.current = ref }}
      title={label} aria-label={label} variant='text' color='inherit'
      onClick={onTogglePopperByEvent} aria-pressed={applied} aria-haspopup='dialog'>
      <Icon size={16}
        icon={typeof icon === 'string' ? icon : icon.svg}
        color={typeof icon === 'string' ? 'inherit' : icon.properties.color} />
    </Button>
  </Badge>
  <Popper open={isPopperOpen} autoUpdate keepMount toggle={onTogglePopper}
    arrowOptions sizeOptions={false} flipOptions={FallbackFlipOptions} forceLatestFocusElements reference={iconRef}>
    <InlineDatePicker {...otherProps} isInPopper label={label} defaultDate={defaultDate}
      autoApply={autoApply} isPopperClosed={!isPopperOpen} onApplyChanged={onApplyChanged} />
  </Popper>
</div>
```

Source: `src/setting/components/source.tsx` - source mode radios + MapWidgetSelector; clearing
config when mode changes.

```tsx
const getConfigWithoutLayerAndMapData = (byData: boolean) => {
  return config.without('layerConfigList').without('mapViewConfigList').set('addSourceByData', byData)
}

const onMapWidgetSelected = (useMapWidgetIds: string[]) => {
  onSettingChange({
    id: widgetId,
    config: getConfigWithoutLayerAndMapData(false),
    useMapWidgetIds: useMapWidgetIds
  })
}

// map mode UI
<SettingSection className='pt-1'>
  <JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onViewsCreate={onJimuViewsCreate} />
  <SettingRow>
    <MapWidgetSelector onSelect={onMapWidgetSelected} useMapWidgetIds={useMapWidgetIds} />
  </SettingRow>
  {useMapWidgetIds?.length > 0 &&
    <SourceMapLayers useMapWidgetIds={useMapWidgetIds} jimuMapViews={jimuMapViews}
      mapViewConfigList={mapViewConfigList} onChange={onMapViewsConfigChange} />}
</SettingSection>
```

Source: `src/setting/components/source-layer-config.tsx` - DataSourceSelector + FieldSelector
restricted to date field types.

```tsx
const LAYER_TYPES = Immutable(SUPPORTED_LAYER_TYPES)
const FIELD_TYPES = Immutable([JimuFieldType.Date, JimuFieldType.DateOnly])

<DataSourceSelector
  types={LAYER_TYPES}
  useDataSources={useDs}
  mustUseDataSource
  hideDataView={hideDataView}
  hideDs={hideDs}
  closeDataSourceListOnChange
  disableRemove={() => true}
  onChange={onDataSourceChange}
  disableDataSourceList={!addDataByData}
/>

<FieldSelector
  types={FIELD_TYPES}
  dataSources={[dataSource]}
  selectedFields={Immutable([startField])}
  isDataSourceDropDownHidden
  useDropdown
  onChange={(allSelectedFields) => { onStartFieldChange(allSelectedFields) }}
/>
```

Source: `src/setting/components/options.tsx` - default date via jimu-ui date-picker with virtual
date list, and the auto-apply switch disabled for Input style.

```tsx
<DatePicker
  style={{ width: '226px' }}
  aria-label={i18n('defaultDate')}
  disablePortal={false}
  selectedDate={selectedDate[0]}
  dateFormat={{ dateStyle: 'short' } as DateTimeFieldFormatProperties}
  showDoneButton
  runtime
  supportVirtualDateList
  virtualDateList={VIRTUAL_LIST}
  onChange={(value) => { onDefaultDayChange(value, true) }}
/>

<Switch
  checked={autoApply}
  disabled={config.filterStyle === FilterStyle.Input}
  onChange={() => { onChange('autoApply', !autoApply) }}
/>
```

Source: `src/setting/components/styles.tsx` - style picker also updates controller UX.

```tsx
const changeStyle = (style: FilterStyle) => {
  if (style !== filterStyle) {
    let newConfig = config
    if (style === FilterStyle.Input) {
      newConfig = newConfig.set('autoApply', true)
    } else if (config.filterStyle === FilterStyle.Input) {
      newConfig = newConfig.set('autoApply', false)
    }
    onChange('filterStyle', style, newConfig)
    getAppConfigAction().editWidgetProperty(widgetId, 'inControllerUx', style === FilterStyle.Input ? 'inPanel' : 'offPanel').exec()
  }
}
```

Source: `src/setting/components/source-map-layers.tsx` - LayerSetting binding with custom
warning icon for layers missing a date field.

```tsx
<LayerSetting
  mapWidgetId={mapWidgetId}
  mapViewId={activeMapViewId}
  keepLastTimeMap
  onMapItemClick={handleMapItemClick}
  isJlvLoading={!jimuMapViews || !activeMapViewId || !activeJimuLayerViews}
  isCustomizeEnabled={isCustomizeEnabled}
  isShowRuntimeAddedLayerEnabled={false}
  showRuntimeAddedLayerOption={false}
  selectedValues={selectedLayerViewIds}
  disableLayers={disableLayers}
  disableTables={disableTables}
  getLayerCustomIcon={getLayerCustomIcon}
  showTable
  onToggleCustomize={handleToggleCustomize}
  onSelectedLayerIdChange={handleSelectedLayerIdChange}
  showSelectedLayers
  dndEnabled={false}
  onLayerItemClick={handleLayerItemClick}
>
  <SourceLayerConfig addDataByData={false} useDataSource={activeLayerConfig?.useDataSource}
    dataSource={activeDs} startField={activeLayerConfig?.startField}
    endField={activeLayerConfig?.endField} onFieldsChange={onFieldsChange} />
</LayerSetting>
```
