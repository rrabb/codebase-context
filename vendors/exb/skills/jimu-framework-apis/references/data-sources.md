# jimu-data-source Reference (ExB 1.20)

The data-source system abstracts ArcGIS layers/tables/services (and CSV/GeoJSON/KML/WFS/WMS…) behind a
uniform `DataSource` + `DataRecord` API with querying, selection, editing, and data views. Type defs:
`ArcGISExperienceBuilder/client/jimu-data-source/` and `jimu-core/lib/data-source-component.d.ts`.

## Class hierarchy

```
DataSource (interface)
 └─ AbstractDataSource
     ├─ AbstractLoadableDataSource            → CSV, GeoJSON, KML, WFS … (load-once)
     └─ AbstractQueriableDataSource
          └─ AbstractArcGISQueriableDataSource (+ JSAPILayerMixin + ItemMixin)
             └─ FeatureLayerDataSourceImpl, SceneLayerDataSourceImpl, SubtypeSublayer …
 // "set" / container branch:
 ├─ MapDataSourceImpl (+ set mixin)           → Map | WebMap | WebScene
 └─ AbstractLayerFolderDataSource             → FeatureService, MapService, GroupLayer, SceneService …
```

Interfaces: `QueriableDataSource extends DataSource`, `LoadableDataSource extends DataSource`,
`ArcGISQueriableDataSource extends QueriableDataSource`. A *set* DS narrows via
`ds.isDataSourceSet(): this is DataSource & SetDataSourceMixin`.

## DataSource — key API

```ts
id: string; type: string; isDataView: boolean; isLocal: boolean
belongToDataSource?: DataSource; dataViewId?: string
getLabel(): string
getDataSourceJson(): IMDataSourceJson          // .url may be undefined for client-side layers — optional-chain it
getIdField(): string; getSchema(): IMDataSourceSchema; fetchSchema(): Promise<IMDataSourceSchema>
ready(): Promise<void | any>
getStatus(): DataSourceStatus; getInfo(): IMDataSourceInfo
// records
getRecords(): DataRecord[]; getRecord(i): DataRecord; getRecordById(id): DataRecord
buildRecord(data): DataRecord; setRecords(records): void
// edits (service-backed)
addRecord(r): Promise<DataRecord>; updateRecord(r): Promise<boolean>; deleteRecordById(id): Promise<boolean>
// selection
selectRecordsByIds(ids, records?): void; getSelectedRecords(): DataRecord[]
getSelectedRecordIds(): Array<string|number>; clearSelection(): void
// views/hierarchy
getMainDataSource(); getRootDataSource(); getDataViews(): DataSource[]; getDataView(viewId): DataSource
getSelectionDataView(): DataSource; getLocalDataSources(): DataSource[]
```

### QueriableDataSource adds

```ts
url?: string
query(query: QueryParams, options?: QueryOptions): Promise<QueryResult>
queryById(id, fields?): Promise<DataRecord>
queryCount(query, options?): Promise<QueryResult>
queryIds(query, options?): Promise<QueryResult>
queryAll(query, signal?, progressCb?, options?): Promise<QueryResult>
load(query, options?): Promise<DataRecord[]>; loadAll(...); loadById(id, refresh?); loadCount(query, options?)
updateQueryParams(query, widgetId): void
getCurrentQueryParams(); getConfigQueryParams(); getRuntimeQueryParams()
getRecordsByPage(page, pageSize); getAllLoadedRecords(); haveMorePages(page, pageSize)
getCapabilities(); getMaxRecordCount(); getQueryPageSize()
startAutoRefresh(); stopAutoRefresh(); getAutoRefreshInterval()
allowToExportData(): Promise<boolean>
```

`AbstractArcGISQueriableDataSource` extras: `queryExtent`, `getLayerDefinition/setLayerDefinition`,
`getPopupInfo`, `getTimeInfo/supportTime`, `supportAttachment`, `getGDBVersion/changeGDBVersion`,
`setSourceFeatures`, `get/set layer` (JSAPI layer). `FeatureLayerDataSourceImpl` adds
`createRelatedDataSources`, `queryRelatedRecords`, `getCharts`, `loadArcadeFeatures`.

## DataRecord — key API

```ts
getId(): string | number; setId(id): void
getData(): any; setData(data): void; clone(deep?): DataRecord
getFieldValue(jimuFieldName): any
getFormattedFieldValue(jimuFieldName, intl: IntlShape): string
getGeometry(): IGeometry; setGeometry(g): void
```

`FeatureDataRecordImpl` (ArcGIS) adds: `getFeature(): IFeature | __esri.Graphic`,
`getJSAPIGeometry(): __esri.Geometry`, `getJSAPIGraphic(): Promise<__esri.Graphic>`,
`queryAttachments(types?)`, `attachmentInfos`, `hasFullGeometry`.

`DataRecordSet` (used by data actions): `{ name; label?; type?: 'selected'|'loaded'|'current'; dataSource; records: DataRecord[]; fields?: string[] }`.

## Enums & query shapes

```ts
enum DataSourceStatus { NotCreated, Created, CreateError, NotReady, Unloaded, Loading, Loaded, LoadError, … }
enum DataSourceSelectionMode { New, AddToCurrent, RemoveFromCurrent, SelectFromCurrent }
enum QueryScope { InAllData, InRemoteConfigView, InConfigView, InRuntimeView }
// QueryParams { page?; pageSize? } → SqlQueryParams { where?; outFields?; orderByFields?; honorOutFields?; sqlExpression? }
// QueryResult { queryParams; records?; fields?; count?; ids?; extent?; exceededTransferLimit? }
// QueryOptions { scope?; widgetId?; refresh?; excludeQuery? }
```

`DataSourceStatus.NotReady` is special for **widget-output** data sources: queries return empty until the
producing widget flips the status.

## UseDataSource + components

```ts
interface UseDataSource {
  dataSourceId: string        // real id: mainDataSourceId OR `${mainDataSourceId}-${dataViewId}`
  mainDataSourceId: string
  dataViewId?: string
  rootDataSourceId?: string   // needed when DS is a child of a set
  fields?: string[]           // jimu field names
}
// IMUseDataSource = ImmutableObject<UseDataSource>
```

### `DataSourceComponent` (preferred in widget render)

Creates the DS, loads records when `query` is set, and subscribes to changes. Key props:
`useDataSource` | `dataSource`, `widgetId` (or `localId`), `query?: QueryParams` (`{}` = no filter),
`queryCount?`, `queryAll?`, `queryScope?`, `children?: (ds, info, query) => ReactNode | ReactNode`,
callbacks `onDataSourceCreated(ds)`, `onCreateDataSourceFailed(err)`, `onDataSourceInfoChange(info, pre)`,
`onDataSourceStatusChange(status, pre)`, `onSelectionChange(sel, pre)`, `onDataSourceSchemaChange(schema, pre)`.
**There is no `onQueryStatusChange`.**

```tsx
import { React, type AllWidgetProps, type DataSource, type IMDataSourceInfo, DataSourceStatus, DataSourceComponent } from 'jimu-core'

export default function Widget (props: AllWidgetProps<unknown>) {
  const useDs = props.useDataSources?.[0]
  const renderRecords = (ds: DataSource, info: IMDataSourceInfo) => {
    if (info?.status === DataSourceStatus.Loading) return <p>Loading…</p>
    return <ul>{ds?.getRecords().map(r => <li key={r.getId()}>{r.getFieldValue('name')}</li>)}</ul>
  }
  return (
    <DataSourceComponent useDataSource={useDs} widgetId={props.id}
      query={{ where: '1=1', outFields: ['*'], pageSize: 25 }} queryCount>
      {renderRecords}
    </DataSourceComponent>
  )
}
```

`MultipleDataSourceComponent` (default export): `useDataSources?: ImmutableArray<UseDataSource>`,
`widgetId`, `queries?: { [dsId]: any }`, `children?: (dss, infos) => ReactNode`,
`onDataSourceCreated(dss)`, `onDataSourceInfoChange(infos)`.

## Data source implementation types

FeatureLayer, FeatureService*, MapService*, Map*, WebMap*, WebScene*, GroupLayer*, SceneLayer,
SceneService*, BuildingSceneLayer, BuildingGroupSubLayer*, BuildingComponentSubLayer,
SubtypeGroupLayer*, SubtypeSublayer, KnowledgeGraphLayer, KnowledgeGraphSublayer, OrientedImageryLayer,
ImageryLayer, ImageryTileLayer, ElevationLayer, VectorTileService, CSV, GeoJSON, KML, WFS, WMS, WMTS,
SimpleLocal (in-memory), Error (failed-create placeholder). (* = "set"/container data source.)

## Novel / uncommon patterns

- **Four DS kinds, all `DataSource` objects:** main DS, **data view** (`isDataView`, shares schema+selection, own filter), **local DS** (`isLocal`, private records copy — `DataSourceManager.createLocalDataSource()`), and the hidden **selection data view** id `${dataSourceId}-selection`.
- **Local/source-record data sources:** create a DS directly from an array (`sourceRecords`) or a live JSAPI layer (`layer`); `setSourceRecords()`/`setSourceFeatures()` manage the in-memory source and edits mutate the array instead of hitting a service.
- **Cross-view selection:** `setListenSelection(true)` makes a DS react to selections through sibling derived DSes; `updateSelectionInfo(options, triggerDS)` re-checks records against the view filter.
- **Field load-on-demand:** DS merges config fields + runtime `outFields` (`getAllUsedFields`) and batches missing-field requests; `honorOutFields` bypasses the merge.
- **Dual query engines:** ArcGIS DS queries via the JSAPI layer (`changeJimuQueryToJSAPIQuery`) or REST (`changeJimuQueryToRestAPIQuery`, pbf), chosen by capability.
- **Arcade-backed layers:** `FeatureLayerDataSourceImpl.loadArcadeFeatures()` runs an Arcade script into a client-side layer.
- **Related records:** `createRelatedDataSources()`, `queryRelatedRecords()` traverse relationship classes.
- **Guard `getDataSourceJson().url`** before `.includes('FeatureServer')` — client-side/feature-collection layers have no `url` (recorded repo crash).
