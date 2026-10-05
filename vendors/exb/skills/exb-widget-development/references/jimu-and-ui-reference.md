# jimu Libraries, UI Components & Managers Reference

Import paths and key symbols for the ExB 1.20 jimu framework. **Signatures change between ExB
versions — always confirm against the installed `.d.ts` under `ArcGISExperienceBuilder/client/jimu-*/`.**

---

## 1. The jimu packages (what lives where)

| Package | Purpose | Typical imports |
|---|---|---|
| `jimu-core` | Framework core: React re-export, base widget, store/state, managers, utils, i18n, data-source components, hooks | `React`, `AllWidgetProps`, `BaseWidget`, `DataSourceComponent`, `appActions`, `hooks`, managers |
| `jimu-arcgis` | Bridge to the ArcGIS Maps SDK for JS | `JimuMapViewComponent`, `JimuMapView`, `MapViewManager`, `loadArcGISJSAPIModules` |
| `jimu-data-source` | Data-source base classes, record types, query params | `FeatureLayerDataSource`, `DataRecord`, `QueriableDataSource`, `DataSourceStatus` |
| `jimu-for-builder` | Settings-side APIs (builder only) | `AllWidgetSettingProps`, `getAppStore` (builder), setting services |
| `jimu-for-test` | Jest/RTL helpers | `widgetRender`, `wrapWidget`, `mockTheme` |
| `jimu-ui` | UI components (basic) + `advanced/*` subpaths | `Button`, `Select`, `TextInput`, `Loading`, `Alert`, `Tooltip` |
| `jimu-icons` | SVG icon components | `import { ... } from 'jimu-icons/outlined/...'` |
| `jimu-layouts` | Layout runtime/builder | layout components (rarely imported directly in widgets) |
| `jimu-theme` | Theming, styled, theme hooks | `styled`, `useTheme`, `ThemeSwitchComponent` |

### jimu-core — commonly used exports

```ts
import {
  React, ReactDOM, ReactRedux, Immutable, classNames, hooks, jimuHistory,
  type AllWidgetProps, type IMState, type UseDataSource, type DataSource,
  BaseWidget, BaseVersionManager, WidgetState, DataSourceComponent, MultipleDataSourceComponent,
  DataSourceManager, AppStateManager, MessageManager, WidgetManager,
  SessionManager, ServiceManager, ExtensionManager, DataActionManager,
  UrlManager, MutableStoreManager, IdManager, GuideManager,
  appActions, utils, urlUtils, portalUtils, dataSourceUtils, geometryUtils,
  moduleLoader, FormattedMessage, getAppStore
} from 'jimu-core'
```

- `React` (and `ReactRedux`, `Immutable`) **must** come from `jimu-core`, never from raw `react`.
- `getAppStore()` returns the Redux `AppStore`; `getAppStore().getState()` is the `IMState` app state.
- `appActions` are Redux action creators (e.g. `appActions.openWidget(id)`, `appActions.closeWidget(id)`).
- `hooks` includes `useTranslation`, `useEffectOnce`, `useUpdateEffect`, etc. — check `jimu-core/lib/hooks`.
- `BaseVersionManager` backs `src/version-manager.ts` config migrations; `WidgetState` (`Active`/`Opened`/`Hidden`) is `props.state` for lifecycle/visibility.

### jimu-arcgis — map bridge

```ts
import {
  JimuMapViewComponent, type JimuMapViewComponentProps,
  JimuLayerViewComponent, MapViewManager, type JimuMapView,
  loadArcGISJSAPIModules, zoomToUtils, basemapUtils, mapViewUtils, featureUtils
} from 'jimu-arcgis'
```

- `JimuMapView` wraps an `__esri.MapView | __esri.SceneView` — `.view`, `.map`, `.jimuLayerViews`, `.whenAllJimuLayerViewLoaded()`.
- `MapViewManager.getInstance().getJimuMapViewById(id)` resolves a JimuMapView (settings side).
- `loadArcGISJSAPIModules(['esri/…'])` lazy-loads JSAPI modules AMD-style (alternative to the `esri/*` static alias).

---

## 2. jimu-ui component catalog

> For the **full jimu-ui component catalog, props, and copy-ready examples**, use the dedicated
> **`jimu-ui-components`** skill (`.github/skills/jimu-ui-components/`). The summary below is a quick index.

### Basic — `import { X } from 'jimu-ui'`

Layout/typography: `Button`, `ButtonGroup`, `Card`, `Surface`, `Icon`, `Label`, `Badge`, `Typography`,
`Link`, `Pagination`, `Tooltip`, `Alert`, `AlertPopup`, `Loading`, `Progress`, `Drawer`, `Overlay`,
`Nav`, `Navigation`, `Tabs`, `Tab`, `WidgetPlaceholder` (empty-state for map/data widgets).

Inputs: `TextInput`, `TextArea`, `NumericInput`, `UrlInput`, `Select`, `MultiSelect`, `AdvancedSelect`,
`Switch`, `Slider`, `Checkbox`, `Radio`, `TagInput`, `Dropdown` (`DropdownButton`, `DropdownMenu`, `DropdownItem`).

Feedback/motion: `Fade`, `Grow`, `Slide`, `Collapse`, `Collapsable`, `Resizable`, `Draggable`,
`Scrollable`, `MobilePanel`, `Message`, `Notification`.

### Advanced — `import { X } from 'jimu-ui/advanced/<subpath>'`

| Subpath | Notable exports |
|---|---|
| `jimu-ui/advanced/setting-components` | `MapWidgetSelector`, `JimuMapViewSelector`, `JimuLayerViewSelector`, `JimuLayerViewSelectorDropdown`, `SettingSection`, `SettingRow`, `SettingCollapse`, `SidePopper` |
| `jimu-ui/advanced/data-source-selector` | `DataSourceSelector`, `DataSourceSelectorProps`, `AllDataSourceTypes` |
| `jimu-ui/advanced/expression-builder` | `ExpressionBuilder`, `ExpressionInput` |
| `jimu-ui/advanced/sql-expression-builder` | `SqlExpressionBuilder`, `SqlExpressionRuntime` |
| `jimu-ui/advanced/style-setting-components` | background/border/box-shadow/spacing style pickers |
| `jimu-ui/advanced/map` | runtime + setting map components, e.g. `JimuDraw`, `JimuDrawVisibleElements`, `SnappingMode` |
| `jimu-ui/advanced/chart` | chart components |
| `jimu-ui/advanced/resource-selector` | `ResourceSelectorPopup` (images/icons) |
| `jimu-ui/advanced/rich-text-editor` | rich text editor |
| `jimu-ui/advanced/utility-selector` | `UtilitySelector` |
| `jimu-ui/advanced/coordinate-control` | coordinate input controls |

### Calcite components (design system, v5)

Used directly inside widgets via the React wrappers:

```tsx
import { CalciteButton, CalciteDropdown, CalciteDropdownItem, CalciteAccordion,
  CalciteAccordionItem, CalcitePanel, CalciteBlock, CalciteList, CalciteListItem }
  from '@esri/calcite-components-react'
```

Prefer jimu-ui for form controls that must match the ExB theme; use Calcite for richer panels,
accordions, and map-adjacent UI. See the jimu-ui Storybook and the Calcite docs for props.

| Rule | Why |
| --- | --- |
| Use the `@esri/calcite-components-react` wrappers, not native `<calcite-*>` tags | Native tags fail the type-check: "Property 'calcite-button' does not exist on type 'JSX.IntrinsicElements'" |
| Event props are camelCase `onCalcite<Component><Event>` (for example `onCalciteSelectChange`, `onCalciteInputTextInput`, `onCalciteTabsActivate`) | Read the value from `e.target.value` |

Verified 2026-10-02 with `tsc` 5.9.3 and the client tsconfig.

### Icons

```tsx
import DirectionIcon from 'jimu-icons/outlined/directional/down'
```

Icons live under `jimu-icons/outlined/**`, `jimu-icons/filled/**`, `jimu-icons/svg/**`.

---

## 3. ExB managers (all singletons — `Manager.getInstance()`)

Located in `jimu-core/lib/*-manager.d.ts`. The instance is shared between runtime and settings.

| Manager | File | Responsibility |
|---|---|---|
| `DataSourceManager` | `data-source-manager.d.ts` | Create/get/destroy data sources: `getInstance().getDataSource(dsId)`, `.getDataSources()`, `.createDataSource(...)`. Backs map layers/tables. |
| `AppStateManager` | `app-state-manager.d.ts` | Reads/writes the ExB `AppState` (`lib/types/state.d.ts`). |
| `AppStore` (`getAppStore()`) | `store.d.ts` | Redux store. `getAppStore().getState()` → `IMState`; `.dispatch(appActions.…)`; `.subscribe(cb)`. |
| `WidgetManager` | `widget-manager.d.ts` | Load/open/close widgets, widget runtime info. |
| `MessageManager` | `message-manager.d.ts` | Publish/subscribe framework messages (e.g. `DataRecordsSelectionChangeMessage`, `ViewChangeMessage`). |
| `SessionManager` | `session-manager.d.ts` | Auth/session, portal sign-in, `getInstance().getSessionByUrl(url)`. |
| `ServiceManager` | `service-manager.d.ts` | ArcGIS service metadata/requests. |
| `ExtensionManager` | `extension-manager.d.ts` | Framework extension points. |
| `DataActionManager` | `data-action-manager.d.ts` | Data actions (export CSV/JSON/GeoJSON, set filter). |
| `UrlManager` | `url-manager.d.ts` | URL/query params, deep-linking. |
| `MutableStoreManager` | `mutable-store-manager.d.ts` | Cross-widget mutable state outside Redux immutability. |
| `IdManager` | `id-manager.d.ts` | Unique id generation. |
| `GuideManager` | `guide-manager.d.ts` | In-app guided tours. |
| `UtilityManager` | `utility-manager.d.ts` | Geometry/print/geocode utility services. |

### Reading app state

```ts
import { getAppStore, type IMState } from 'jimu-core'
const state: IMState = getAppStore().getState()
// e.g. selected widgets, current page, app config:
const appConfig = state.appConfig
```

### Getting a data source (prefer the component in widgets)

```ts
import { DataSourceManager } from 'jimu-core'
const ds = DataSourceManager.getInstance().getDataSource(dsId)
```

In widget runtime, prefer `<DataSourceComponent useDataSource={...} />` (handles lifecycle) over calling
the manager directly. See `references/widget-patterns.md`.
