# OTB Widget: lrs/split-event

Online widget doc: No dedicated core-widget doc page (LRS = ArcGIS Location Referencing solution). See https://developers.arcgis.com/experience-builder/guide/widgets-overview/ . UNVERIFIED exact page.

## Purpose
The LRS Split Event widget lets a user split an existing linear/point event on a
configured Linear Referencing System (LRS) network at a chosen route measure or
date. The user selects an event layer, picks a route (either from the map or via
a data action coming from another widget), enters/adjusts the split measure and
attributes, and submits the split back to the LRS service. It is authored by
"Esri Solutions" (manifest.json), is `notSupportAGOL` (ArcGIS Enterprise only),
and is part of the LRS widget family rather than a generic ExB core widget.

A key integration path: it registers a `splitEvent` data action, so a selection
made in another widget (for example a Table/List showing an event feature) can
be pushed into this widget to pre-seed the event layer, object id, route id, and
from-date.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/runtime/constants.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/runtime/components/split-event.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/runtime/data-source/data-source-manager.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/common/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/data-actions/split-event.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/extensions/lrs-store.ts
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/lrs/split-event/src/setting/layer-config.tsx

Note: sibling runtime components (route-and-measure-form.tsx,
split-event-attributes.tsx, split-event-date-form.tsx, split-event-form-header.tsx,
split-event-route-selection-form.tsx), src/setting/default-settings.tsx,
src/setting/constants.ts, and src/common/use-data-source-exist.tsx exist in the
tree and are referenced from the files above but were only partially inspected;
details attributed to them are marked UNVERIFIED where relevant.

## Architecture overview
- `dependency: "jimu-arcgis"` (manifest.json) so the widget can bind a map and
  use the ArcGIS Maps SDK. `notSupportAGOL: true` restricts it to ArcGIS
  Enterprise (LRS services are Enterprise-only).
- The widget shell is a class component (`Widget extends React.PureComponent`)
  in src/runtime/widget.tsx. It owns the active `JimuMapView`, a
  `GraphicsLayerManager` (hover/picked/flash graphics), the settings resolved for
  the current map view, and the state fed in via the `splitEvent` data action.
- Two operating modes via `ModeType` (`Map` vs `Layer`) from the shared LRS lib:
  - Map mode: `MapViewLoader` discovers LRS layers from the live map view and
    calls back through `onLrsLayersChanged`; per-view layer config lives in
    `config.mapViewsConfig[jimuMapViewId]` and per-view settings in
    `config.settingsPerView[jimuMapViewId]`.
  - Layer mode: `config.lrsLayers` is used directly.
  `getModeType(config.mode, lrsLayers)` decides whether the `MapViewLoader` is
  rendered.
- Map binding uses `JimuMapViewComponent` (single map). If `useMapWidgetIds` is
  not set, it falls back to `findFirstArcgisMapWidgetId(appConfig)` from
  `widgets/shared-code/lrs`.
- Rendering is gated by `hasConfig` (both `networkLayers` and `eventLayers`
  resolved). When satisfied it renders the `SplitEvent` component
  (src/runtime/components/split-event.tsx); otherwise a `WidgetPlaceholder`.
- The heavy runtime logic lives in the `SplitEvent` function component, which
  composes:
  - `DataSourceManager` (local component in src/runtime/data-source, not the
    jimu manager) to create the network and event data sources and report ready
    state.
  - Sub-forms (route selection, route-and-measure, date, attributes) plus a form
    header (partially inspected, UNVERIFIED internals).
  - `LockManagerComponent` from the shared LRS lib for conflict-prevention
    locking when the service has conflict prevention enabled.
- Two manifest extensions/features:
  - A `splitEvent` data action (dataActions in manifest.json, uri
    `data-actions/split-event`).
  - A `REDUX_STORE` extension (extensions/lrs-store) that just re-exports the
    shared `LrsStoreExtension`.

## Key imports and packages
Grouped by file. Note the recurring `widgets/shared-code/lrs` shared library and
the `lrs-store` Redux extension.

src/config.ts
- `type { LrsLayer, DefaultInfo, ModeType, MapViewConfig }` from
  `widgets/shared-code/lrs` (shared LRS types).
- `type { ImmutableObject }` from `seamless-immutable`.

src/runtime/widget.tsx
- From `jimu-core`: `React`, `jsx`, `type AllWidgetProps`, `DataSourceManager`
  (the real jimu manager, used in `waitForChildDataSourcesReady`),
  `type DataSource`, `type IMState`, `getAppStore`, `WidgetState`,
  `type ImmutableObject`, `Immutable`, `type ImmutableArray`.
- From `widgets/shared-code/lrs`: `GraphicsLayerManager`, `isDefined`,
  `type LrsLayer`, `type RouteInfo`, `setRouteInfoByRouteIdOrName`,
  `queryRouteIdOrName`, `getInitialRouteInfoState`, `isInWidgetController`,
  `LrsLayerType`, `MapViewLoader`, `findFirstArcgisMapWidgetId`, `getModeType`,
  `getConfigValue`, `ModeType`, `checkConflictPrevention`.
- From `jimu-ui`: `defaultMessages as jimuUIDefaultMessages`, `Paper`,
  `WidgetPlaceholder`.
- From `jimu-arcgis`: `type JimuMapView`, `JimuMapViewComponent`.
- From `jimu-for-builder`: `getAppConfigAction` (used at runtime to persist
  resolved per-view settings back to config).
- Local: `type { IMConfig, SettingsPerView }` from `../config`; `SplitEvent`
  from `./components/split-event`; `constructSettingsPerView`, `setValuesForView`
  from `../common/utils`; icon from `./../../icon.svg`.

src/runtime/components/split-event.tsx
- From `jimu-core`: `React`, `jsx`, `hooks`, `type ImmutableArray`, `css`,
  `type ImmutableObject`, `Immutable`, `type DataSource`, `type IntlShape`,
  `type FeatureLayerDataSource`.
- From `widgets/shared-code/lrs`: `InlineEditableDropdown`, `LrsLayerType`,
  `type RouteInfo`, `isDefined`, `formatMessage`, `type LrsLayer`,
  `type DefaultInfo`, `LockAction`, `getIntialLocksInfo`, `type LrsLocksInfo`,
  `LockManagerComponent`, `type AcquireLockResponse`, `getInitialRouteInfoState`,
  `waitTime`, `type GraphicsLayerManager`.
- From `jimu-ui`: `Alert`, `Button`, `Label`, `Option`, `Select`, `Tooltip`.
- From `jimu-ui/lib/components/alert/type`: `type AlertType` (deep import).
- From `jimu-theme`: `getTheme`.
- Local sub-components: `SplitEventFormHeader`, `SplitEventAttributes`,
  `DataSourceManager` (local), `SplitEventRouteSelectionForm`.

src/runtime/data-source/data-source-manager.tsx
- From `jimu-core`: `React`, `jsx`, `type ImmutableObject`, `type DataSource`,
  `DataSourceComponent`, `DataSourceStatus`, `type IMDataSourceInfo`.
- From `widgets/shared-code/lrs`: `type LrsLayer`.

src/data-actions/split-event.ts
- From `jimu-core`: `AbstractDataAction`, `type DataRecordSet`,
  `MutableStoreManager`, `DataLevel`, `getAppStore`, `DataSourceStatus`,
  `type ImmutableObject`, `DataSourceTypes`, `Immutable`,
  `type FeatureLayerDataSource`.
- From `widgets/shared-code/lrs`: `isDefined`, `type EventInfo`,
  `findEventInfoFromMapViewsConfigAndEventDS`.

src/extensions/lrs-store.ts
- From `widgets/shared-code/lrs`: `LrsStoreExtension` (re-exported as default).

src/common/utils.ts
- From `jimu-core`: `Immutable`, `type ImmutableObject`.
- From `seamless-immutable`: `type ImmutableArray`.
- From `widgets/shared-code/lrs`: `LrsLayerType`, `type LrsLayer`,
  `type ModeType`, `getDefaultEvent`, `isLineEvent`.

src/setting/setting.tsx
- From `jimu-core`: `Immutable`, `type ImmutableArray`, `type ImmutableObject`,
  `React`, `jsx`.
- From `widgets/shared-code/lrs`: `type LrsLayer`, `LrsLayerType`,
  `lrsDefaultMessages`, `ModeType`, `getLayersByType`, `getDefaultEvent`,
  `type MapViewConfig`, `updateDefaultForMapMode`, `LrsLoader`,
  `EmptyPlaceholder`.
- From `jimu-ui`: `Select`, `defaultMessages as jimuUIDefaultMessages`, `hooks`.
- From `jimu-for-builder`: `type SettingChangeFunction`,
  `type AllWidgetSettingProps`.
- From `jimu-ui/advanced/setting-components`: `SettingRow`, `SettingSection`.
- Local: `constructSettingsPerView`, `resetConfig`, `setValuesForView` from
  `../common/utils`; `LayerConfig` from `./layer-config`; `DefaultSettings` from
  `./default-settings`.

src/setting/layer-config.tsx
- From `jimu-core`: `React`, `jsx`, `css`, `type ImmutableObject`, `hooks`,
  `type ImmutableArray`, `Immutable`.
- From `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`.
- From `jimu-ui`: `Checkbox`, `Switch`, `TextInput`.
- From `jimu-ui/basic/list-tree`: `type CommandActionDataType`, `List`,
  `TreeItemActionType`, `type TreeItemsType`, `type TreeItemType`.
- From `widgets/shared-code/lrs`: `type LrsLayer`,
  `type AttributeFieldSettings`, `ModeType`, `getConfigValue`, `isLineEvent`.
- From `jimu-icons/svg/outlined/editor/lock.svg` and `unlock.svg` (require).
- Local: `useDataSourceExists` from `../common/use-data-source-exist`.

## Reusable patterns found
Cross-ref: patterns/container-shared-code.md (shared `widgets/shared-code/lrs`
library) and the sibling card cards/containers/lrs-identify.md (same family).

- One data action (`splitEvent`): `src/data-actions/split-event.ts` extends
  `AbstractDataAction`. `isSupported` filters to a single selected record on a
  Feature/Scene layer that maps to a configured LRS event layer (rejects network
  layers); `onExecute` writes the picked event layer, object id, route id and
  from-date into the widget's mutable store via `MutableStoreManager`. This is
  the canonical "push a selection from another widget into my widget" pattern.
- `MutableStoreManager` + `mapExtraStateProps`: the data action calls
  `MutableStoreManager.getInstance().updateStateValue(this.widgetId, key, value)`
  for four keys; the runtime widget re-reads them via the static
  `mapExtraStateProps(state, props)` from `props.mutableStateProps.*` and
  syncs them into React state in `componentDidMount`/`componentDidUpdate`,
  guarded by `mutableStatePropsVersion`. See "Useful snippets" below.
- `GraphicsLayerManager` lifecycle: constructed with
  `{ jimuMapView, createHover, createPicked, createFlash }`, recreated when
  `jimuMapView` changes, and `destroy()`ed on unmount. Shared LRS helper.
- Per-view settings (`SettingsPerView`): `constructSettingsPerView()` builds an
  immutable default; `setValuesForView()` derives network/event layers and
  default event from `lrsLayers`. The runtime persists the resolved per-view
  settings back to config via `getAppConfigAction().editWidgetConfig(...)` (an
  unusual runtime-writes-config pattern, see Gotchas).
- `getConfigValue(config, key, mapViewId, fallback)`: single accessor that
  resolves a value from either flat config (Layer mode) or
  `settingsPerView[mapViewId]` (Map mode). Used both at runtime
  (`getConfigValues`) and in settings (`LayerConfig`).
- `lrs-store` Redux extension: `extensions/lrs-store.ts` re-exports the shared
  `LrsStoreExtension` under a `REDUX_STORE` manifest extension point, giving the
  widget access to shared LRS Redux state.
- `notSupportAGOL: true` manifest flag: LRS services are Enterprise-only; the
  same flag appears across the LRS family.
- Settings use `LrsLoader` (shared) to drive map-widget selection, LRS layer
  discovery, and mode reset, with `LayerConfig`/`DefaultSettings` as children.

## Builder vs runtime split
- Runtime (src/runtime/**): binds the map, resolves LRS layers/settings for the
  active view, creates network/event data sources, renders the split forms,
  handles locking, and consumes the `splitEvent` data action. It also writes the
  resolved per-view settings back into the widget config using
  `getAppConfigAction()` from `jimu-for-builder` (imported into runtime code).
- Settings (src/setting/**): `Setting` wraps `LrsLoader` to pick the map widget,
  discover LRS layers, choose Map vs Layer mode, and reset config. `LayerConfig`
  edits per-layer options (label, field alias, attribute field enable/disable,
  lock indicators) and writes to either `config.lrsLayers` (Layer mode) or
  `config.mapViewsConfig[mapId].lrsLayers` (Map mode). `DefaultSettings`
  (partially inspected) edits default event and hide/date toggles per view.
- Shared config contract: `src/config.ts` defines `Config`, `IMConfig`, and the
  `SettingsPerView` shape used by both sides.

## Lifecycle and cleanup
- `constructor`: seeds state (no map view, null graphics manager, empty
  per-view settings via `constructSettingsPerView()`), computes
  `widgetOuterDivId = 'widget-outer-div-' + props.id`.
- `componentDidMount`: hydrates the four data-action-driven state fields from
  `props` when their `mutableStatePropsVersion` is set; detects widget-controller
  embedding via `isInWidgetController(widgetOuterDivId)` to hide the title;
  calls `setSettingsPerView()`.
- `componentDidUpdate`: recreates graphics layers when `jimuMapView` changes;
  when the widget is open (or state unknown), diffs `mutableStatePropsVersion.*`
  to pull new data-action values and calls `setRouteInfoFromDataAction(...)`;
  refreshes per-view settings when `activeLrsLayers` changes; and re-checks
  `checkConflictPrevention(lrsUrl)` to toggle `isConflictPreventionEnabled`.
- `componentWillUnmount`: calls `removeGraphicLayers()` which
  `graphicsManager.destroy()`s and nulls the manager.
- `onActiveViewChange`: awaits `waitForChildDataSourcesReady(jmv)` (uses
  `jmv.whenAllJimuLayerViewLoaded()` and the jimu `DataSourceManager` to wait for
  child data sources) before setting `jimuMapView`.
- In `SplitEvent` (function component): several `useEffect`s reset the form on
  `lrsLayers` change (using `waitTime(800)`), react to incoming data-action
  route info, and build lock info; `LockManagerComponent` (partially inspected)
  acquires/releases LRS locks when conflict prevention is on.
- The local `DataSourceManager` component reports ready state only when both the
  network and event `DataSourceComponent`s report a non-error, ready status.

## Manifest/config requirements
- `manifest.json`: `type: "widget"`, `dependency: "jimu-arcgis"`,
  `notSupportAGOL: true`, `defaultSize: { width: 350, height: 400 }`.
- `dataActions`: one entry `{ name: "splitEvent", label: "Split Event", uri:
  "data-actions/split-event", icon: "runtime/assets/icons/splitevent-icon.svg" }`.
- `extensions`: one `{ name: "LRS Store", point: "REDUX_STORE", uri:
  "extensions/lrs-store" }`.
- `config.ts` `Config` fields: `lrsLayers: LrsLayer[]`, `networkLayers: string[]`,
  `eventLayers: string[]`, optional `defaultEvent`, `hideEvent`, `hideNetwork`,
  `hideDate`, `useRouteStartDate`, `mode?: ModeType`, `mapViewsConfig?` keyed by
  `jimuMapViewId`, and `settingsPerView?` keyed by `jimuMapViewId`.
- Because it depends on `jimu-arcgis` and binds via `JimuMapViewComponent`, an
  ArcGIS Map widget must exist in the app; the widget will fall back to the first
  map widget if `useMapWidgetIds` is empty.

## Gotchas
- Runtime writes config: `setSettingsPerView()` calls
  `getAppConfigAction().editWidgetConfig(this.props.id, newConfig).exec()` from
  the runtime widget. This mutates app config at runtime, which is unusual for a
  pure runtime widget and can cause churn if it runs repeatedly; it is guarded
  only by "lrsLayers length > 0".
- Data action uses timers: `onExecute` wraps its `MutableStoreManager` writes in
  `setTimeout(..., 1000)`, and the form resets use `waitTime(800)` /
  `setTimeout(800)`. These fixed delays are timing-fragile and not awaited.
- `getAppConfig()` in the data action branches on `window.jimuConfig.isBuilder`
  to read from `appStateInBuilder.appConfig` vs `appConfig` - copy this helper if
  you write your own data action that must work in both builder and runtime.
- Mode ambiguity on first load: if `config.mode` is `undefined`, the setting
  infers `ModeType.Layer` when `lrsLayers` exist else `ModeType.Map`. New configs
  must let this run once before other settings behave correctly.
- Deep imports: `jimu-ui/lib/components/alert/type` (AlertType) and
  `jimu-ui/basic/list-tree` are internal-path imports and may break across ExB
  versions.
- Class file misnames its default export as `ExportJson` in
  src/data-actions/split-event.ts (leftover naming); it is still the data action
  class, not a JSON exporter.
- `notSupportAGOL: true` means this widget will not run against ArcGIS Online;
  do not reuse patterns here for AGOL-targeted widgets without removing LRS deps.

## Useful snippets and functions

Data action pushing a selection into the widget store.
Source: src/data-actions/split-event.ts
```ts
onExecute (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
  const dataSet = dataSets[0]
  const ds = dataSet.dataSource as FeatureLayerDataSource
  const appConfig = getAppConfig()
  const widgetJson = appConfig?.widgets?.[this.widgetId]
  let lrsLayerFound
  widgetJson.config.lrsLayers.forEach((lrsLayer: any) => {
    if (lrsLayer.id === ds.id) {
      lrsLayerFound = lrsLayer
    }
  })

  if (!isDefined(lrsLayerFound)) {
    const mapViewsConfig = widgetJson.config.mapViewsConfig
    const eventDS = dataSet.dataSource
    lrsLayerFound = findEventInfoFromMapViewsConfigAndEventDS(mapViewsConfig, eventDS)
  }

  setTimeout(() => {
    MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedEventLyr', Immutable(lrsLayerFound))
    const record = dataSet.records[0]
    const data = record.getData()
    MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedEventObjectId', data[dataSet.dataSource.getSchema().idField])
    MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedEventRouteId', data[lrsLayerFound.eventInfo.routeIdFieldName])
    MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedEventFromDate', new Date(data[lrsLayerFound.eventInfo.fromDateFieldName]))
  }, 1000)
  return Promise.resolve(true)
}
```

Builder-vs-runtime app-config accessor used by the data action.
Source: src/data-actions/split-event.ts
```ts
function getAppConfig () {
  return window.jimuConfig.isBuilder ? getAppStore().getState()?.appStateInBuilder?.appConfig : getAppStore().getState()?.appConfig
}
```

Reading data-action values back in the widget via mapExtraStateProps.
Source: src/runtime/widget.tsx
```tsx
static mapExtraStateProps = (state: IMState,
  props: AllWidgetProps<IMConfig>): ExtraProps => {
  return {
    selectedEventLyr: props?.mutableStateProps?.selectedEventLyr,
    selectedEventObjectId: props?.mutableStateProps?.selectedEventObjectId,
    selectedEventRouteId: props?.mutableStateProps?.selectedEventRouteId,
    selectedEventFromDate: props?.mutableStateProps?.selectedEventFromDate
  }
}
```

GraphicsLayerManager create/destroy lifecycle.
Source: src/runtime/widget.tsx
```tsx
removeGraphicLayers (): void {
  if (this.state.graphicsManager) {
    this.state.graphicsManager.destroy()
    this.setState({ graphicsManager: null })
  }
}

createGraphicLayers (): void {
  if (isDefined(this.state.jimuMapView)) {
    this.removeGraphicLayers()
    const graphicsManager = new GraphicsLayerManager({
      jimuMapView: this.state.jimuMapView,
      createHover: true,
      createPicked: true,
      createFlash: true,
    })
    this.setState({ graphicsManager: graphicsManager })
  }
}
```

Waiting for child data sources before adopting a new JimuMapView.
Source: src/runtime/widget.tsx
```tsx
waitForChildDataSourcesReady = async (jmv: JimuMapView): Promise<DataSource> => {
  await jmv?.whenAllJimuLayerViewLoaded()
  const ds = DataSourceManager.getInstance().getDataSource(jmv?.dataSourceId)
  if (ds?.isDataSourceSet() && !ds.areChildDataSourcesCreated()) {
    return ds.childDataSourcesReady().then(() => ds).catch(err => ds)
  }
  return Promise.resolve(ds)
}
```

Runtime persisting resolved per-view settings back to config.
Source: src/runtime/widget.tsx
```tsx
setSettingsPerView = () => {
  const { config } = this.props
  const lrsLayers = !config.mode || config.mode === ModeType.Map ? this.state.activeLrsLayers : config.lrsLayers
  let settingPerView = config.settingsPerView?.[this.state.activeMapViewId] || constructSettingsPerView()
  if (lrsLayers && lrsLayers.length > 0) {
    settingPerView = setValuesForView(settingPerView, lrsLayers, true)
    this.setState({ settingPerView })
    const newConfig = config.setIn(['settingsPerView', this.state.activeMapViewId], settingPerView)
    getAppConfigAction().editWidgetConfig(this.props.id, newConfig).exec()
  }
}
```

Local DataSourceManager wrapping two DataSourceComponents and reporting ready.
Source: src/runtime/data-source/data-source-manager.tsx
```tsx
React.useEffect(() => {
  dataSourcesReady(networkDsReady && eventDsReady)
}, [dataSourcesReady, eventDsReady, networkDsReady])
```

Immutable default per-view settings factory.
Source: src/common/utils.ts
```ts
export function constructSettingsPerView () {
  const settingsPerView: SettingsPerView = {
    networkLayers: [],
    eventLayers: [],
    defaultEvent: { index: -1, name: '' },
    hideEvent: false,
    hideNetwork: false,
    hideDate: false,
    useRouteStartDate: false,
  }
  return Immutable(settingsPerView)
}
```
