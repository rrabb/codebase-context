# ExB Managers Index (jimu-core + jimu-for-builder)

All singletons: `SomeManager.getInstance()` (shared across widget/settings/builder). The **store is not a
class** — use `getAppStore()` + `appActions`. Signatures are ExB 1.20. Confirm in the `.d.ts` under
`ArcGISExperienceBuilder/client/jimu-core/lib/*-manager.d.ts` (and `jimu-for-builder/lib/`).

## The Redux store (not a manager)

```ts
import { getAppStore, appActions, observeStore } from 'jimu-core'

getAppStore(): Store<IMState>          // .getState(), .dispatch(action), .subscribe(cb)
createAppStore(initState?): Store<IMState>
observeStore<T>(onChange: (pre: T, cur: T) => void, keys?: string[], triggerOnObserve?: boolean): Unsubscribe
```

`appActions` — action creators (dispatch them): `appConfigChanged(appConfig)`, `openWidget(id)` /
`closeWidget(id)` / `openWidgets(ids)` / `closeWidgets(ids)`, `widgetStatePropChange(widgetId, key, value)`
(transient per-widget state), `widgetRuntimeInfoChange(widgetId, prop, value)`,
`widgetToolbarStateChange(widgetId, toolNames)`, `dataSourceInstanceStatusChanged(dsId, status)`,
`setIsBusy(isBusy, loadingType?, loadingText?)`, `browserSizeModeChanged(mode)`.

```ts
const appConfig = getAppStore().getState().appConfig
getAppStore().dispatch(appActions.openWidget('widget_5'))
getAppStore().dispatch(appActions.widgetStatePropChange(props.id, 'selectedId', 42))
// subscribe to a slice only:
const off = observeStore((pre, cur) => {/* … */}, ['appConfig', 'widgetsRuntimeInfo'])
```

### Reading store state in a React component — `ReactRedux.useSelector`

```ts
import { ReactRedux, type IMState } from 'jimu-core'
const { useSelector } = ReactRedux
// re-renders only when the selected value changes (default equality is reference `===`)
const otherState = useSelector((s: IMState) => s.widgetsRuntimeInfo?.[otherWidgetId]?.state)
```

- `useSelector` runs on every dispatched action; keep it cheap. A selector that returns a **new
  object/array** each call (`s => ({a,b})`, `.map`, `.filter`) re-renders on every action — return a
  primitive, pass `shallowEqual`, or memoize with `reselect`. Do **not** wrap a selector in `useCallback`
  (identity doesn't cause re-subscription); that saves nothing.
- **Per-widget runtime state lives at `state.widgetsRuntimeInfo[widgetId]`** (`RuntimeInfo`: `state`
  `WidgetState`, `windowState`, `controllerWidgetId`, `isClassLoaded`). The framework already **injects
  your own** widget's slice into props, so `props.state` **equals**
  `useSelector(s => s.widgetsRuntimeInfo[props.id].state)` — prefer `props.state` for self (public API,
  no internal-shape coupling); use `useSelector` only to read **another** widget's state or a store slice
  not surfaced as props. Full widget lifecycle/visibility model: `exb-widget-development` skill,
  `references/widget-patterns.md` §8b.


## Runtime managers (`jimu-core`)

| Manager | Import / access | Purpose | Key methods |
|---|---|---|---|
| `DataSourceManager` | `DataSourceManager.getInstance()` | create/get/destroy data sources | `getDataSource(id)`, `getDataSources()`, `getDataSourcesAsArray()`, `getDataViewDataSource(mainId, viewId)`, `createDataSource(id\|dsJson\|options, dataViewId?, localId?)`, `createDataSourceByUseDataSource(useDs, localId?)`, `createAllDataSources()`, `destroyDataSource(id)` |
| `WidgetManager` | `WidgetManager.getInstance()` | load/open/close widgets, configs, i18n | `loadWidgetClass(id)`, `getWidgetClass(id)`, `openWidget(id)`, `closeWidget(id)`, `loadWidgetManifest(uri, checkUri)`, `loadWidgetDefaultConfig(uri)`, `getWidgetUriByItemId(itemId)`; field `dsManager` |
| `MessageManager` | `MessageManager.getInstance()` | publish messages, manage message actions | `publishMessage(message)`, `getActions()`, `getWidgetActions(widgetId)`, `getAction(widgetId, name)`, `registerAction(opts)`, `destroyWidgetActions(id)` |
| `SessionManager` | `SessionManager.getInstance()` | user sign-in sessions (ArcGIS Identity) | `getMainSession()`, `getSessions()`, `getSessionByUrl(url)`, `getUserInfo()`, `signIn(...)`, `signOut(...)`, `removeSession(s)` (=sign out+revoke), `clearSessions()` (local only), `isTrustedServer(url)` |
| `ServiceManager` | `ServiceManager.getInstance()` | fetch/cache service + server metadata | `fetchServiceInfo(url)`, `getServiceInfo(url)`, `fetchArcGISServerInfo(url)`, `getServerInfoByServiceUrl(url)`, `isHostedService(url)`, `fetchChildLayerDefinitionsFromUrls(urls)` |
| `UtilityManager` | `UtilityManager.getInstance()` | resolve configured utility services | `getUtility(id)`, `getUtilityFromJson(json)`, `getUrlOfUseUtility(useUtility)`, `getUtilityJson(id)`, `checkUtilityStatus(json)`; static `getServiceInfo(url)`, `isPrintingTask(info)` |
| `UrlManager` | `UrlManager.getInstance()` | URL query/hash params + navigation | `changePage(pageId)`, `changeView(sectionId, viewId)`, `changeDialog(dialogId)`, `getQueryObject()`, `changeQueryObject(obj, opts)`, `getHashObject()`, `changeUrlHashObject(obj, opts)`, `setWidgetUrlParams(widgetId, params, opts)` |
| `DataActionManager` | `DataActionManager.getInstance()` | register/execute data actions | `getActions()`, `getSupportedActions(widgetId, dataSets, dataLevel)`, `executeDataAction(action, dataSets, dataLevel, widgetId, config?)`, `registerAction(opts)`, `isActionExcluded(id, excluded?)` |
| `ExtensionManager` | `ExtensionManager.getInstance()` | framework extension points | `getExtensions(epName)`, `getAllExtensions()`, `getExtensionById(id)`, `registerExtension({ epName, extension })`, `registerWidgetExtensions(json, isNew)` |
| `ConfigManager` | `ConfigManager.getInstance({ intl })` ⚠ | load/upgrade/translate AppConfig | `loadAppConfig()`, `setAppConfig(raw)`, `upgradeAppConfig(cfg)`, `applyTranslation(locale, cfg)`, `loadAppConfigFromPortal(appId)` |
| `MutableStoreManager` | `MutableStoreManager.getInstance()` | store non-immutable/heavy objects off-Redux | `updateStateValue(widgetId, propKey, value)`, `readStateValue(widgetId, propKey)`, `getStateValue(keyPath[])`, `clearState()` (propKey supports `'a.b.c'`) |
| `AppStateManager` | `AppStateManager.getInstance()` | persist/restore per-widget local state (IndexedDB) | `init()`, `putLocalState(key, value)`, `getLocalState(key)`, `getLastLocalState(key)`, `registerRestoreFunction(fn)`, `restoreLocalState()`; static `isSupportLocalState()` |
| `IdManager` | `IdManager.getInstance()` | unique `<type>_<n>` ids | `getUniqueId(type)`, `initIdCounter(appConfig)` |
| `GuideManager` | `GuideManager.getInstance()` | in-app tour guides | `registerGuide(guide)`, `getGuideById(id)`, `loadGuideModule(guide)`, `loadGuideTranslation(uri)`; enum `GuideLevels` |
| `TrackingManager` | `TrackingManager.getInstance()` | analytics/telemetry (GA + esri/telemetry) | `initialize(analytics)`, `logPageView()` |
| `BaseVersionManager` | **subclass + instantiate** (not a singleton) | ordered config-version upgrades | field `versions: Version<T>[]` (`{ version, description, upgrader(oldConfig, id) }`); `upgrade(cfg, oldVer, newVer, id)` |
| `WidgetVersionManager` (`jimu-core/lib/base-widget.d.ts`) | **subclass + instantiate** | upgrades that also change the widget JSON or output data sources; the local guide recommends it after 1.13 | extends `BaseVersionManager<WidgetUpgradeInfo>`; `versions: WidgetVersion[]` with `upgradeFullInfo?: true` to receive `{ widgetJson, outputDataSourceJsons }`; `widgetUpgrade(...)` |

### Common manager snippets

```ts
import { DataSourceManager, MessageManager, DataRecordsSelectionChangeMessage } from 'jimu-core'
const ds = DataSourceManager.getInstance().getDataSource(props.useDataSources[0].dataSourceId)
MessageManager.getInstance().publishMessage(new DataRecordsSelectionChangeMessage(props.id, records))
```

## Builder-side managers & the settings-write API (`jimu-for-builder`)

### `getAppConfigAction()` — chainable AppConfig editor (⭐ structural edits)

```ts
import { getAppConfigAction } from 'jimu-for-builder'

getAppConfigAction()                    // optional (appConfig?) arg
  .editWidgetConfig(props.widgetId, { ...props.config, foo: 'bar' })
  .exec()                               // nothing commits until .exec(replace?)
```

Chainable methods (return `this` unless noted): `editWidget(partialWidgetJson, outputDsJsons?)`,
`editWidgetConfig(widgetId, config)`, `editWidgetProperty(widgetId, prop, val)`,
`createWidget(widgetJson, createEmbedLayout?)` (→ `IMWidgetJson`), `removeWidget(widgetId)`,
`addPage(pageJson)`, `editPageProperty(pageId, prop, val)`, `addView(sectionId)` (→ id),
`removeView(viewId, sectionId)`, `setAppConfig(appConfig)`, `exec(replace?)`. `replace=true` collapses
into the previous undo entry.

### Settings props (the golden path for config)

`AllWidgetSettingProps<T>` (your `setting.tsx` props) injects `config: T`, `intl`, `theme`, `theme2`,
`user`, `token`, `portalUrl`, `queryObject`, `dispatch`, and:

```ts
onSettingChange: (widgetJson: Partial<WidgetJson>, outputDataSourcesJson?: DataSourceJson[]) => void
// prefer for simple config edits:
props.onSettingChange({ id: props.id, config: props.config.set('foo', 'bar') })
```

### Builder manager singletons

| Manager | Access | Purpose |
|---|---|---|
| `AppWidgetManager` | `AppWidgetManager.getInstance()` | builder-scoped `WidgetManager` (same API) |
| `AppMessageManager` | `AppMessageManager.getInstance()` | `getAllActions()`, `getFilteredActions(messageType, msgWidgetId?)`, `getActionSettingComponentUri(...)`, `loadActionSettingClass(...)` |
| `AppDataActionManager` | `AppDataActionManager.getInstance()` | `loadAllActionSettingClasses()` |
| `AppResourceManager` | `AppResourceManager.getInstance()` | app item resources: `uploadWidgetResource(widgetId, file, originalName?)` (originalName required for Blob), `removeWidgetResource(...)`, `getInUseWidgetResources(id)`; static `getBlobByBlobUrl(url)` |
| `WidgetSettingManager` | `WidgetSettingManager.getInstance()` | `loadWidgetSettingClass(widgetId)`, `getWidgetSettingClass(widgetId)` |

> Blob resource URLs need `appConfigUtils.processResourceUrl` before use in `<img>`/CSS `url()`; the
> jimu-ui `Image`/`Icon` components handle it automatically.

## Novel/gotchas

- **Store subscription by slice:** `observeStore(onChange, keys?)` takes a dotted-path key list to watch a slice of `IMState` instead of the whole store.
- **`getAppConfigAction()` is a queued builder** — mutations only commit on `.exec()`; most methods return `this`, but `createWidget`/`addView` return the created JSON/id.
- **Two config-persist paths:** injected `props.onSettingChange(...)` (preferred for config) vs `getAppConfigAction().editWidgetConfig().exec()` (for structural/multi-part edits).
- **`ConfigManager.getInstance({ intl })`** is the only manager needing a constructor-options arg.
- **`MutableStoreManager`** is the sanctioned escape hatch for FeatureSets / JSAPI instances / 3rd-party libs; it stores them off-store and bumps a version marker to trigger re-render.
  - Always call `updateStateValue(widgetId, propKey, value)`. It writes the value into a plain object outside Redux, then dispatches `widgetMutableStatePropChange(widgetId, propKey)`, which takes no value and only increments `widgetsMutableStateVersion[widgetId][propKey]`. Never dispatch that action yourself.
  - The value is written at the dotted path, but the version is keyed by the **full** `propKey` string. `updateStateValue(id, 'a.b', v)` bumps version key `'a.b'`, so an observer watching key `'a'` never re-renders.
  - Runtime widgets read `props.mutableStateProps.<key>`. A setting panel watches `appStateInBuilder.widgetsMutableStateVersion[id][key]` as an effect dependency, then reads across the iframe with `window._appWindow._mutableStoreManager.getStateValue([id, key])`. Example: OOTB `common/text` runtime `widget.tsx:199` and `setting/setting.tsx:56-64`.
  - Use it for non-serializable runtime objects and runtime-to-setting handoff. Use `onSettingChange` for saved config and `widgetStatePropChange` (which does take a value) for serializable shared state.
  - The reducer behavior is not in a `.d.ts`; it was read from `client/dist/jimu-core/index.js` (ExB 1.20, 2026-08-18).
- **`SessionManager.removeSession()` signs out** (revokes token); `clearSessions()` only drops locally.
- **`BaseVersionManager` isn't a singleton** — subclass it, list `versions`, attach as `Widget.versionManager`. Its `upgrade()` runs upgraders in the half-open interval `(oldVersion, newVersion]`.
