# OTB Widget: arcgis/branch-version-management

Online widget doc: https://developers.arcgis.com/experience-builder/guide/branch-version-management-widget/

## Purpose

Manages geodatabase branch versions (branch versioning) exposed by an ArcGIS Enterprise
feature/map service that has a `VersionManagementServer` endpoint. The widget lets a user
list versions, create/alter/delete versions, set access permissions (public / protected /
private), change the version owner, and switch the active version that the bound data
sources read from. Switching a version re-points the client data sources (and any Map
widget layers they feed) at the selected branch version so the app renders that version's
data.

This widget is ENTERPRISE-only (`"requireLicense": "Enterprise"` in the manifest) because
branch versioning is an ArcGIS Enterprise capability. Portal/AGOL-hosted services do not
expose a Version Management Server.

## Source paths inspected

All under `ArcGISExperienceBuilder/client/dist/widgets/arcgis/branch-version-management/`
(this tree is gitignored; it is the shipped OTB widget source, not repo-authored code):

- `manifest.json` - widget metadata, `requireLicense: "Enterprise"`, default size.
- `config.json` - default config seed (`versionConfig` with empty `services`).
- `src/config.ts` - `Config` / `IMConfig` type (a thin wrapper around `versionConfig: any`).
- `src/runtime/widget.tsx` - main runtime widget (~4000 lines): render, data source
  binding, version table, create/switch/delete/alter lifecycle, pagination, sorting.
- `src/runtime/branch-version-manager.tsx` - `GDBVersionManager` singleton: all REST
  calls to `VersionManagementServer` and the data-source version-switch bridge.
- `src/setting/setting.tsx` - builder settings: data source selection, allowances,
  startup version, field/column config, layout style.

(dist/ compiled output and tests/ were intentionally NOT used as source of truth.)

## Architecture overview

Three cooperating pieces:

1. `GDBVersionManager` (singleton, `branch-version-manager.tsx`) - stateless-ish service
   layer. It discovers which bound feature services are VMS-enabled, performs all raw REST
   requests against `.../VersionManagementServer/...`, and bridges version switches down to
   jimu data sources by calling `changeGDBVersion(name)` on each `FeatureLayerDataSource` /
   `FeatureService` / `MapService` data source. It holds no React state.

2. Runtime `Widget` (`widget.tsx`) - a class `BaseWidget`. Holds all UI state (version
   list, selected service/version, modals, pagination, sort, portal users). Uses a
   `DataSourceComponent` to guarantee child data sources are created before it reads the
   data source list, then drives the manager for every user action.

3. Builder `Setting` (`setting.tsx`) - a `BaseWidgetSetting`. Lets the author pick which
   feature/map services participate (via `DataSourceSelector`), validate that they are
   VMS-enabled, configure per-service allowances (create/edit/delete), choose the startup
   version, configure visible columns, refresh interval, and layout style (simple vs
   advanced, expanded vs collapsed).

The config shape is deliberately loose: `versionConfig` is typed `any` and carries
`services[]` (each with `configuredSettings`: `startupVersion`, `persistVersion`,
`allowance`, `displayInfo`), plus `arrangement` (`'simple' | 'advanced'`), `expandMode`,
and `pageCounter`.

## Key imports and packages

Runtime `src/runtime/widget.tsx`:

- From `jimu-core`: `BaseWidget`, `jsx`, `css`, `DataSourceManager`,
  `DataSourceComponent`, `DataSourceTypes`, `Immutable`, `lodash`, `getAppStore`,
  `SessionManager`, `urlUtils`, `defaultMessages as jimuCoreMessages`, plus the
  `AllWidgetProps`, `IMThemeVariables`, `SerializedStyles` types.
- From `jimu-ui`: layout/controls used to build the table + modals - `Button`, `Input`,
  `InputGroup`, `TextInput`, `TextArea`, `Select`, `Checkbox`, `Switch`, `Table`,
  `Pagination`, `Modal`/`ModalHeader`/`ModalBody`/`ModalFooter`, `Popper`, `Tooltip`,
  `Alert`, `ListGroup`, `Icon`, `WidgetPlaceholder`, `Paper`, `FlipOptions`.
- Local: `GDBVersionManager` from `./branch-version-manager`, `IMConfig` from `../config`,
  `defaultMessages` from `./translations/default`, `./css/custom.css`, and several
  `jimu-ui/lib/icons/*.svg` requires.

Manager `src/runtime/branch-version-manager.tsx` (small, focused import surface):

- From `jimu-core`: `DataSourceManager`, `DataSourceTypes`, `esri`, and the types
  `FeatureLayerDataSource`, `FeatureQueryDataSource`.
- `esri.restRequest.request(url, { params, httpMethod })` is the ONLY network primitive
  used (no `@arcgis/core` VersionManagement classes are imported; it talks to the REST
  endpoints directly). `esri` is the JSAPI bridge re-exported by `jimu-core`.

Builder `src/setting/setting.tsx`:

- From `jimu-core`: `React`, `Immutable`, `css`, `DataSourceManager`, `SessionManager`,
  `urlUtils`, `AllDataSourceTypes`, and the `UseDataSource`, `IMThemeVariables`,
  `SerializedStyles` types.
- From `jimu-for-builder`: `BaseWidgetSetting`, `AllWidgetSettingProps`.
- From `jimu-ui`: `Select`, `Checkbox`, `Table`, `Button`, `Icon`, `TextInput`,
  `Tooltip`, `Alert`, `Switch`, `NumericInput`, `FloatingPanel`.
- From `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`, `SidePopper`.
- From `jimu-ui/advanced/data-source-selector`: `DataSourceSelector`.
- Local: `GDBVersionManager` from `../runtime/branch-version-manager` (same singleton is
  reused in the builder to validate/preview versions).

Note: this widget does NOT use `MapWidgetSelector` or `JimuMapViewComponent`. It is
data-source-driven, not map-widget-driven. It reads map views from the app store
(`getAppStore().getState().jimuMapViewsInfo`) only to make sure child data sources are
created; the version binding happens through data sources, not through a JimuMapView.

## Reusable patterns found

### GDBVersionManager singleton

`branch-version-manager.tsx` uses the classic private-constructor singleton:

```
private static instance: GDBVersionManager
static getInstance (): GDBVersionManager {
  if (!GDBVersionManager.instance) {
    GDBVersionManager.instance = new GDBVersionManager()
  }
  return GDBVersionManager.instance
}
```

Both the runtime widget and the settings panel grab the same instance
(`vms: GDBVersionManager = GDBVersionManager.getInstance()`), so discovered VMS URLs are
cached (`private uniqueURLs`) and shared.

### VMS discovery from bound data sources

`getUniqueVMSURL()` walks `DataSourceManager.getInstance().getDataSources()`, keeps
`FeatureLayer` data sources whose `url` contains `FeatureServer`, truncates each to the
service root, then probes each root with `checkValidVMS()` (a POST to
`<root>VersionManagementServer?f=json` that succeeds only when the response `name ===
'Version Management Server'`). Only validated services are surfaced to the user. This is
how the widget filters "which of my services actually support branch versioning".

### Version create / alter / delete / switch lifecycle (REST)

All lifecycle calls are thin POSTs against `VersionManagementServer` sub-endpoints, built
by string-truncating the service URL and appending the action:

- Create: `.../VersionManagementServer/create` with `versionName`, `description`,
  `accessPermission`, `token`.
- Alter (rename / change scope / owner): `.../VersionManagementServer/versions/<guid>/alter`.
- Delete: `.../VersionManagementServer/delete`.
- Read state: `.../VersionManagementServer/versions/<guid>`.
- List: `.../VersionManagementServer/versionInfos` (or `/versions`).
- Start/stop reading a version: `.../VersionManagementServer/versions/<guid>/<action>Reading/`.

`reconcileDate`, `evaluationDate`, previous-ancestor date, etc. are surfaced as optional
columns in the version table, but this widget does NOT itself run reconcile/post; it reads
and displays that state and manages version lifecycle + access, then switches the active
read version.

### DataSourceManager / FeatureLayerDataSource version binding

The actual "switch the map to this version" is `changeGDBVersion`:

```
changeGDBVersion (name: string, dsList: any[]): boolean {
  for (const key in dsList) {
    if (dsList[key].type === DataSourceTypes.FeatureLayer ||
        dsList[key].type === DataSourceTypes.SubtypeGroupLayer ||
        dsList[key].type === DataSourceTypes.SubtypeSublayer) {
      const dsObj = this.getLayerObject(dsList[key])
      dsObj.changeGDBVersion(name)
    }
    if (dsList[key].type === DataSourceTypes.FeatureService) {
      dsList[key].changeGDBVersion(name)
    } else if (dsList[key].type === DataSourceTypes.MapService) {
      dsList[key].changeGDBVersion(name)
    }
  }
}
```

The jimu `FeatureLayerDataSource` / `FeatureService` / `MapService` data sources expose a
`changeGDBVersion(versionName)` method that repoints them at the branch version; the widget
just fans that call out across every relevant bound data source. This is the key reusable
idea: version switching is a data-source operation, and the Map widget updates because it
shares those data sources.

### Ensuring child data sources exist before reading them

Both `componentDidMount` and a `DataSourceComponent` guard call `childDataSourcesReady()`
before enumerating data sources, so map-backed feature layers are fully created before the
widget tries to discover VMS URLs (see snippets below).

### Paginated + sortable version table

Runtime state carries `versionList`, `filteredVersionList`, `maxDisplayRows`
(from `pageCounter`), `currentDisplayIndex`, and `sort: { field, direction }`. The table is
rendered with jimu-ui `Table` + `Pagination`; `pullVersions`, `searchVersions`, and
`sortVersions` keep the filtered/sorted slice in sync. Column visibility is author-driven
via `displayInfo` in config.

### ENTERPRISE-only requireLicense gate

`manifest.json` sets `"requireLicense": "Enterprise"`. ExB hides/blocks the widget outside
an Enterprise deployment, matching the fact that only Enterprise services expose VMS.

## Builder vs runtime split

- Builder (`setting.tsx`): authors WHICH services participate and HOW the widget behaves.
  `DataSourceSelector` (multi-select, `types = [FeatureService, MapService]`) picks the
  services; on change `validateVMSExist` uses the shared `GDBVersionManager` to confirm the
  service has a VMS endpoint before adding it. It also configures per-service allowances
  (create/edit/delete/change-owner), startup version, visible columns, refresh interval,
  page size (`pageCounter`), and layout (`arrangement` simple/advanced, `expandMode`). All
  writes go through `this.props.onSettingChange({ id, config, useDataSources })`.
- Runtime (`widget.tsx`): consumes `config.versionConfig` + `useDataSources`, discovers the
  live data sources, lists/creates/switches versions, and applies the switch to the bound
  data sources. It also honors a `data_version` URL query param
  (`getAppStore().getState().queryObject`) to deep-link a startup version.

The same `GDBVersionManager` singleton is imported in both, so REST/discovery logic is not
duplicated between builder and runtime.

## Lifecycle and cleanup

- `constructor`: seeds a large mutable state object from `config.versionConfig` (deep
  `Immutable.asMutable`), including `arrangement`, `expandMode`, empty version lists,
  default selected version `sde.DEFAULT`, sort/pagination defaults.
- `componentWillMount`: copies each service's `startupVersion` into a runtime
  `persistVersion` field.
- `componentDidMount`: reads any `data_version` URL param, then for each map view ensures
  child data sources are created (`_createChildDatasources`).
- `componentDidUpdate`: in builder live-view, reacts to setting changes (arrangement,
  expand, service list, page count, allowances, display fields, startup version) and
  re-pulls/re-switches versions so the canvas preview stays in sync.
- `DataSourceComponent` `onAllChildDataSourcesCreated`: double `setTimeout` + explicit
  `childDataSourcesReady()` awaits, then `_populateSwitchableSources('runtime')` which loads
  config once data sources exist.
- `componentWillUnmount`: clears the refresh interval (`clearInterval(this.refreshHandler)`)
  - the only explicit teardown. There are no map-view watchers/handles to remove because the
  widget never attaches to a JimuMapView.

## Manifest/config requirements

- `manifest.json`: `"type": "widget"`, `"requireLicense": "Enterprise"`, autoWidth/
  autoHeight default size. Notably it declares NO `dependency` array (no `jimu-arcgis`
  dependency) - the widget relies only on `jimu-core`/`jimu-ui` and the `esri` bridge
  re-exported by `jimu-core`, plus data sources supplied via `useDataSources`.
- `config.json` seed: `{ versionConfig: { services: [], arrangement: "simple",
  pageCounter: 5 } }`.
- `src/config.ts`: `interface Config { versionConfig: any }` -> `IMConfig =
  ImmutableObject<Config>`. The loose `any` typing means the real schema lives implicitly in
  the code (each service object carries `name`, `url`, `activeInBuilder`, and
  `configuredSettings` with `startupVersion`, `persistVersion`, `allowance`, `displayInfo`).
- Data sources are declared through `useDataSources` (feature/map services), populated by
  the settings `DataSourceSelector`; runtime reads them via `this.props.useDataSources`.

## Gotchas

- NOTE: this OTB widget is the conceptual basis for the repo's CUSTOM
  `branch-version-editor` widget (see `src/widgets/branch-version-editor`). Cross-reference
  when working on either. Key DIFFERENCES to keep straight:
  - The custom `branch-version-editor` declares `"dependency": ["jimu-arcgis"]` and
    `"settingDependency": "jimu-arcgis"` in its manifest; the OTB widget declares no
    dependency. If you copy patterns from the OTB widget into the custom one, keep the
    jimu-arcgis dependency where the custom widget needs JimuMapView/JSAPI editing.
  - The custom widget is focused on GUIDED EDITING against a branch version; the OTB widget
    is focused on version LIFECYCLE MANAGEMENT (create/alter/delete/switch/permissions).
    Do not assume feature parity.
- `versionConfig` is typed `any`; there is no compile-time schema. Mistyped keys fail
  silently. When editing config logic, mirror the exact key names used in code
  (`configuredSettings.startupVersion` / `persistVersion` / `allowance` / `displayInfo`).
- Version switching depends on the bound data source exposing `changeGDBVersion`; it iterates
  over data source `type` and only handles `FeatureLayer`, `SubtypeGroupLayer`,
  `SubtypeSublayer`, `FeatureService`, `MapService`. Other data source types are ignored.
- `requestService` swallows errors: it resolves (not rejects) on `.catch`, returning the
  error object as the result. Callers must inspect the resolved value (e.g. check for a
  `versionInfo` / `name` property) rather than relying on a rejected promise.
- VMS discovery relies on the service URL containing `FeatureServer` (or `MapServer`) and is
  truncated by string index. Non-standard URLs may not be discovered.
- The widget must wait for `childDataSourcesReady()`; reading `getDataSources()` too early
  (before map child layers are created) yields an empty/incomplete list. The double
  `setTimeout(..., 1000)` in the `DataSourceComponent` callback is a deliberate (if fragile)
  guard around that timing.
- Enterprise-only: outside an Enterprise deployment the VMS probe fails and no services are
  selectable. Do not expect this widget to work against AGOL / hosted feature layers.

## Useful snippets and functions

Source: `src/runtime/branch-version-manager.tsx`

Singleton + VMS validation probe:

```
export default class GDBVersionManager {
  private static instance: GDBVersionManager
  static getInstance (): GDBVersionManager {
    if (!GDBVersionManager.instance) {
      GDBVersionManager.instance = new GDBVersionManager()
    }
    return GDBVersionManager.instance
  }

  async checkValidVMS (url: string, token?: string): Promise<boolean> {
    let trunURL = url
    if (trunURL.includes('FeatureServer')) {
      trunURL = trunURL.substring(0, trunURL.indexOf('FeatureServer'))
    }
    if (trunURL.includes('MapServer')) {
      trunURL = trunURL.substring(0, trunURL.indexOf('MapServer'))
    }
    const requestURL = trunURL + 'VersionManagementServer'
    const params = token ? { f: 'json', token } : { f: 'json' }
    return await this.requestService({ method: 'POST', url: requestURL, params })
      .then((result: any) => {
        if (result.hasOwnProperty('name')) {
          return result.name === 'Version Management Server'
        }
        return false
      })
      .catch(() => false)
  }
```

Source: `src/runtime/branch-version-manager.tsx`

Create a version, then optionally switch bound data sources to it:

```
createGDBVersion (versionObj, token, dsList, service?, url?, autoSwitch?): Promise<any> {
  return new Promise((resolve) => {
    let requestURL = null
    // ... resolve service root URL, then:
    requestURL = serviceURL + 'VersionManagementServer/create'
    this.requestService({
      method: 'POST',
      url: requestURL,
      params: {
        f: 'json',
        versionName: versionObj.versionName,
        description: versionObj.versionDescription,
        accessPermission: versionObj.versionScope,
        token
      }
    }).then((result: any) => {
      if (autoSwitch && result.hasOwnProperty('versionInfo')) {
        this.changeGDBVersion(result.versionInfo.versionName, dsList)
      }
      resolve(result)
    }).catch((e) => resolve(e))
  })
}
```

Source: `src/runtime/branch-version-manager.tsx`

The single network primitive (JSAPI bridge via jimu-core `esri`), note it resolves on error:

```
private requestService (opts: any): Promise<any> {
  return new Promise(function (resolve, reject) {
    const requestOptions = {
      params: opts.params,
      httpMethod: opts.method
    }
    esri.restRequest.request(opts.url, requestOptions)
      .then((result: any) => { resolve(result) })
      .catch((e: any) => { resolve(e) })
  })
}
```

Source: `src/runtime/widget.tsx`

Wait for child data sources before discovering the switchable data source list:

```
_createChildDatasources = async (dsId: string) => {
  const ds = DataSourceManager.getInstance()
  const mapDS = ds.getDataSource(dsId)
  if (mapDS.isDataSourceSet() && !mapDS.areChildDataSourcesCreated()) {
    await mapDS.childDataSourcesReady()
    this._populateSwitchableSources(null)
  }
}

_populateSwitchableSources = (status: string) => {
  if (this.props.useDataSources && this.props.useDataSources.length > 0) {
    const ds = DataSourceManager.getInstance()
    const dsList = ds.getDataSources()
    this.setState({ dsList }, () => {
      if (status === 'runtime') {
        this.loadConfig()
      }
    })
  }
}
```

Source: `src/runtime/widget.tsx`

`DataSourceComponent` guard that guarantees child data sources are created at runtime:

```
{this.state.isReady === false && <DataSourceComponent
  useDataSource={this.props.useDataSources && this.props.useDataSources[0]}
  onAllChildDataSourcesCreated={() => {
    setTimeout(async () => {
      const mapViews = this._getMapViews()
      if (Object.keys(mapViews).length > 0) {
        const ds = DataSourceManager.getInstance()
        for (const key in mapViews) {
          const mapDS = ds.getDataSource(mapViews[key].dataSourceId)
          if (mapDS.isDataSourceSet() && !mapDS.areChildDataSourcesCreated()) {
            await mapDS.childDataSourcesReady()
          }
        }
        setTimeout(() => { this._populateSwitchableSources('runtime') }, 1000)
      } else {
        this._populateSwitchableSources('runtime')
      }
    }, 1000)
  }}
  widgetId={this.props.id}
></DataSourceComponent>}
```

Source: `src/setting/setting.tsx`

Multi-select data source picker limited to feature/map services, validated for VMS:

```
<DataSourceSelector
  types={Immutable.from([AllDataSourceTypes.FeatureService, AllDataSourceTypes.MapService])}
  isMultiple={true}
  useDataSourcesEnabled={this.props.useDataSourcesEnabled}
  onChange={this.validateVMSExist}
  widgetId={this.props.id}
  closeDataSourceListOnChange={true}
/>
```
