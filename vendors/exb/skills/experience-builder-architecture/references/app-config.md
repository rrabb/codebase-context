# AppConfig, layouts, and widget config (ExB 1.20)

An Experience Builder app is one JSON document, the **app config**. Pages, windows, layouts, widgets, data sources, and widget-to-widget actions are all entries in it. The builder edits this JSON; the runtime renders it. Type: `AppConfig` in `client/jimu-core/lib/types/app-config.d.ts` (line 1279). Guide: `guide/core-concepts/appconfig/`.

## Where it lives

| Copy | Location | Notes |
| --- | --- | --- |
| Draft | `server/public/apps/<id>/resources/config/config.json` (this repo: `src/apps/<id>/resources/config/config.json`) | Written on Save. The builder reads it from `apps/<id>/resources/config/config.json` (`client/dist/jimu-for-builder/service.js`). |
| Published | `server/public/apps/<id>/config.json` (this repo: `src/apps/<id>/config.json`) | Written on Publish. Used by downloads. |
| Downloaded app | `<zip>/cdn/<n>/config.json` | `attributes.clientId` is set here for private content (`guide/experience-deployment/`). |
| In memory | `getAppStore().getState().appConfig` (immutable) | After load-time processing; adds runtime-only fields such as each widget's `manifest`. |

## Top-level keys

Counts are from this repo's app 5 draft (`src/apps/5/resources/config/config.json`, checked 2026-10-04).

| Key | Holds | App 5 |
| --- | --- | --- |
| `pages` | Page records: `id`, `label`, `type` (`NORMAL`, `FOLDER`, `LINK`), `mode` (`FIT_WINDOW`, `AUTO_SCROLL`), `layout` per size mode, `isDefault`, `header`, `footer` | 1 |
| `pageStructure` | Page order and nesting: `[{ "page_0": [] }]` | 1 |
| `layouts` | Every layout in the app, keyed by layout ID | 34 |
| `widgets` | Every widget instance, keyed by widget ID | 28 |
| `sections`, `views` | Sections (each lists its `views`) and the views' layouts | 1, 3 |
| `dialogs` | Windows: `mode` (`FIXED`, `ANCHORED`), size and position per size mode, `layout` | 1 |
| `screenGroups`, `screens` | Screen groups for scrolling pages | absent |
| `header`, `footer` | Shared header and footer, each with `layout` per size mode | yes |
| `controllerPanels` | Floating panel positions for Widget Controller widgets | absent |
| `dataSources` | Data source definitions (`id`, `type`, `itemId` or `url`, `portalUrl`, child data sources) | 3 |
| `messageConfigs` | Message -> action wiring (triggers set in the builder's Action tab) | 9 |
| `theme`, `customThemeOptions`, `sharedThemeVariables` | Theme URI (for example `"themes/master/"`) and overrides | yes |
| `attributes` | `portalUrl`, `clientId`, `favicon`, and similar app-wide settings | yes |
| `template`, `mainSizeMode`, `mainLocale`, `exbVersion`, `timestamp`, `publishTimestamp` | Origin template, default size mode, language, versions, save times | yes |
| `widgetsManifest`, `useCachedManifest`, `preloadWidgets` | Optional cached manifests and widgets to load at start | `widgetsManifest` empty |
| `forBuilderAttributes`, `historyLabels`, `translations`, `urlParams`, `appStateConfig` | Builder-only settings, old labels kept for stable URLs, multi-language data, URL parameter config | some |

Resource URLs inside the config use the placeholder `${appResourceUrl}`, for example `"${appResourceUrl}/images/icon_picker_in_setting/1779312640044.png"` in app 5's `attributes.favicon`.

## How layout works

Everything that can hold content points to **layouts** by size mode, and each layout lists what it holds.

```text
pages.page_0.layout        = { LARGE: "layout_0", MEDIUM: "layout_32", SMALL: "layout_42" }
layouts.layout_0           = { type: "FIXED", content: { "0": { type: "WIDGET", widgetId: "widget_1", bbox: {...}, setting: {...} },
                                                         "1": { type: "WIDGET", widgetId: "widget_2", ... } },
                               order: ["1", "0"] }
widgets.widget_1           = { uri: "widgets/layout/sidebar/", layouts: { FIRST: { LARGE: "layout_1" }, SECOND: { LARGE: "layout_2" } }, ... }
layouts.layout_1.content.0 = { type: "SECTION", sectionId: "section_1", ... }
sections.section_1         = { views: ["view_10", "view_2", "view_6"] }
views.view_2.layout        = { LARGE: "layout_5", MEDIUM: "layout_35", SMALL: "layout_45" }
```

(Trimmed from app 5's draft config.)

| Concept | Rule | Evidence |
| --- | --- | --- |
| Containers | Pages, views, windows (`dialogs`), screens, header, footer, and some widgets own layouts. | `ContainerType`, `LayoutParentType` in `app-config.d.ts` |
| Size modes | `LARGE`, `MEDIUM`, `SMALL`. Medium and Small are optional and fall back to Large. | `BrowserSizeMode` in `types/common.d.ts`; `guide/core-concepts/layout/` |
| Layout types | `FIXED`, `FLOW`, `GRID`, `COLUMN`, `ROW`, `ACCORDION`, `FLEX_ROW`. A fullscreen page can be fixed or grid; views and windows are always fixed. | `LayoutType` in `jimu-core/lib/types/layout.d.ts`; `guide/core-concepts/layout/`, `page/` |
| Layout items | Each `content` entry is `WIDGET`, `SECTION`, or `SCREEN_GROUP`, with a `bbox` (position and size) and `setting`. `order` gives the z-order or flow order. | `LayoutItemType` in `layout.d.ts`; `LayoutItemJson` in `app-config.d.ts` |
| Widgets that hold widgets | A widget whose `manifest.json` declares `layouts` stores one layout per declared name and size mode in `widgets[id].layouts`. Examples: Sidebar `FIRST`, `SECOND`; Map `MapFixedLayout`; Widget Controller `controller`; List `DEFAULT`, `SELECTED`, `HOVER`. | `client/dist/widgets/{layout/sidebar,arcgis/arcgis-map,common/controller,common/list}/manifest.json`; app 5 |
| Layout widgets vs widgets with a layout | `"widgetType": "LAYOUT"` in the manifest (Row, Column, Sidebar) or `properties.hasEmbeddedLayout: true` plus a `LayoutEntry` component (List, Card, Map, Controller). | `guide/core-concepts/layout/` "Key concepts"; manifests above |
| Widget Controller | Widgets placed in a controller live in the controller's `controller` layout. `inControllerUx` on the widget decides panel, off-panel, or inline display. | `common/controller/manifest.json`; `WidgetJson.inControllerUx` |
| Parent links | `WidgetJson.parent` (which layouts contain a widget) is not present in this repo's saved configs (app 5); inferred to be computed on load (`ConfigManager.buildAppStructure`). Do not write it by hand. | app 5; `config-manager.d.ts` |

To change structure from code (add or remove widgets, pages, views), use `getAppConfigAction()` from `jimu-for-builder` in settings code (see the `jimu-framework-apis` skill, `references/managers.md`). Hand-editing layout JSON is easy to get wrong because one widget is referenced from several layouts and size modes.

## A widget instance in the config

From `WidgetJson` (`app-config.d.ts` line 249) and app 5's Branch Version Editor (`widget_125`):

| Field | Meaning |
| --- | --- |
| `id` | Instance ID, for example `widget_125`. Several instances of one widget each have their own entry. |
| `uri` | Which widget code to load: `widgets/<name>/` for custom widgets, `widgets/arcgis/...`, `widgets/common/...`, `widgets/layout/...` for OOTB. |
| `version` | Widget version when added or last upgraded. |
| `label`, `icon` | Display name and icon. |
| `config` | The widget's own settings (free-form; your `Config` type). |
| `useDataSources` | Data sources the widget reads: `{ dataSourceId, mainDataSourceId, rootDataSourceId?, dataViewId?, fields? }`. |
| `useMapWidgetIds` | Map widgets the widget is bound to, for example `["widget_7"]`. |
| `outputDataSources` | Data source IDs this widget creates for others. |
| `layouts` | Embedded layouts (see above). |
| `manifest` | Added at runtime only, never saved. |

## Widget config life cycle

| Step | What happens | Evidence |
| --- | --- | --- |
| 1. Default | The widget folder's `config.json` holds default settings; `config.ts` declares `Config` and `IMConfig = ImmutableObject<Config>`. | `guide/extend-base-widget/` ("config.json: the widget's default config") |
| 2. Added in the builder | `WidgetManager` loads `config.json` (`loadWidgetDefaultConfig(uri)`) and stores a copy in `appConfig.widgets[<new id>].config`. If `manifest.properties.hasConfig` is false, the config is `null`. | `widget-manager.d.ts`; `client/dist/jimu-core/index.js` (minified, search `loadWidgetDefaultConfig(e.uri)`) |
| 3. Edited | The settings panel calls `props.onSettingChange({ id, config })`. The builder updates its copy and pushes it to the app frame. | `guide/core-concepts/appconfig/`; [runtime-and-builder.md](runtime-and-builder.md) |
| 4. Saved | Save writes the draft file; Publish writes the published file. | [server.md](server.md) |
| 5. Used | At runtime the widget reads `props.config` (immutable). Optional `getFullConfig` on the widget class can fill in defaults for a partial saved config. | `jimu-core/lib/base-widget.d.ts` |
| 6. Upgraded | When the widget's `manifest.json` `version` is newer than `widgets[id].version`, its version manager migrates the saved config. | [runtime-and-builder.md](runtime-and-builder.md) "Versions inside a config" |

Consequences:

- Editing a widget's `config.json` changes only **new** instances. Existing instances keep their saved `config` (step 2 copies the defaults once). To change existing apps, migrate with a version manager or edit them in the builder.
- `config` is immutable at runtime and in settings (`seamless-immutable`): use `config.set('key', value)`, and convert arrays with `Array.from(...)` or `.asMutable()` before mutating. See `guide/immutable/`.

## Data sources and actions in the config

| Key | Example from app 5 | Notes |
| --- | --- | --- |
| `dataSources.<id>` | `{ id: "dataSource_1", type: "WEB_MAP", itemId: "<web map item id>", portalUrl: "https://<org>.maps.arcgis.com" }` | Layers inside a web map get derived IDs such as `dataSource_1-19faef3393f-layer-43`; widgets reference them through `useDataSources` with `rootDataSourceId: "dataSource_1"`. Guide: `guide/core-concepts/data-source/`. |
| `messageConfigs.<id>` | `{ widgetId: "widget_2", messageType: "VIEW_CHANGE", actions: [{ widgetId: "widget_1", actionName: "openSidebar", ... }] }` | The publishing widget must list the message in `manifest.json` `publishMessages`; the target widget declares `messageActions`. Guide: `guide/core-concepts/message-action/`. |
| `widgets.<id>.dataActions`, `enableDataAction` | Per-widget data action settings | Guide: `guide/core-concepts/data-action/`. |

API details (DataSourceManager, MessageManager, DataSourceComponent) are in the `jimu-framework-apis` skill.
