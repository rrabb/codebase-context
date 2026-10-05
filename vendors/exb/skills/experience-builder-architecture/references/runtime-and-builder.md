# Runtime boot and the builder (ExB 1.20)

## Two kinds of page, one framework

The gallery, the builder, and every app are jimu apps: each is an `index.html` with an import map that boots `jimu-core/init.js` and renders an app config (see [client.md](client.md)). What differs is the config they load and the flags in `window.jimuConfig` (`isSite`, `isBuilder`).

## What happens when an app opens

Declared in `client/jimu-core/lib/config-manager.d.ts` and `widget-manager.d.ts`. The order below follows the method names and the local guide; it is not a traced call sequence. Use DevTools (`window._configManager`, `window._widgetManager`) if exact order matters.

| Step | What runs | Evidence |
| --- | --- | --- |
| 1. Page | `experience/index.html` sets `window.jimuConfig` from the `webpack-options` block and loads `jimu-core/init.js` through SystemJS. | `client/dist/experience/index.html` |
| 2. Find the config | `ConfigManager.loadAppConfigWithDefault()`: `?config=<url>`, `?id=<item id>`, or the `/:appId` path segment. Dev Edition apps load from the local server (`loadAppConfigFromLocalServer`), portal apps from the item (`loadAppConfigFromPortal`). `?draft=true` loads the draft. | `config-manager.d.ts` JSDoc; `guide/url-parameters/` "View draft mode" |
| 3. Prepare the config | `applyAppConfigProcessorExtension` (widgets can rewrite the config through the `AppConfigProcessor` extension point), `upgradeAppConfig`, `loadAllWidgetsManifest`, `processAppConfigAfterLoad` (adds defaults, builds the page structure, fixes IDs and the theme URI). | `config-manager.d.ts`; `guide/extension-points/` |
| 4. Store | The result becomes `state.appConfig` in the Redux store (`getAppStore()`), immutable. | `jimu-core/lib/types/state.d.ts` (`State.appConfig`) |
| 5. Render | Only the current page's content is rendered. All views of a section render, but only the active view is visible. Windows render when opened. | `guide/core-concepts/section-view/` "Differences between sections and views" |
| 6. Load each widget | `WidgetManager.loadWidgetManifest` -> `loadWidgetDependency` (for example `jimu-arcgis`, which loads the JSAPI) -> `loadWidgetClass` (SystemJS import of `widgets/<name>/dist/runtime/widget.js`). `registerManifestProps` registers the widget's message actions, data actions, and extensions. | `widget-manager.d.ts` |

The JSAPI is not loaded at app start. A widget that needs it declares `"dependency": ["jimu-arcgis"]` in `manifest.json` or calls `loadArcGISJSAPIModules` (`guide/extend-base-widget/`, "Modules in the ArcGIS Maps SDK for JavaScript").

## App URLs

From `guide/url-parameters/` (local) and the server routes in [server.md](server.md):

| URL | Meaning |
| --- | --- |
| `https://localhost:3001/experience/<id>/` | Published app `<id>` in the Developer Edition |
| `.../experience/<id>/?draft=true` | Draft config (what Preview and the builder use) |
| `.../experience/<id>/page/<page-label>/` | Open a page |
| `?views=<view-label>`, `?dlg=<window-label>`, `?locale=fr` | Open a view, a window, or a language |
| `#data_s=id:<dataSourceId>:<ids>` | Select records on load |
| `https://localhost:3001/builder/?id=<id>` | Edit app `<id>` in the builder |
| `<web server>/<app folder>/index.html` | A downloaded, self-hosted app. `state.appId` is `null` here (`state.d.ts`). |

## Builder and app are two windows

The builder does not render your widget directly. Its `app-loader` panel puts the app in an iframe named `_appWindow` whose `src` is `<mountPath>experience/<id>/?draft=true` (`client/dist/builder/widgets/app-loader/dist/runtime/widget.js`, `setAppUrl`).

| | Builder window (`/builder/?id=<id>`) | App window (iframe `_appWindow`) |
| --- | --- | --- |
| Renders | Builder panels and each widget's `dist/setting/setting.js` | Each widget's `dist/runtime/widget.js` (and `builder-support.js` when inside the builder) |
| Redux store | Its own, with builder state (`appStateInBuilder`, `builder`) | Its own, with the app state |
| Managers | Its own singletons | Its own singletons; `window._appWindow` in the builder points to this window |
| Owns | The app config being edited; Save and Publish | Running widgets, data sources, map views |

They stay in sync through messages (`client/jimu-for-builder/lib/sync-type.d.ts`): `builderAppSync.publishAppConfigChangeToApp`, `publishPageChangeToApp`, `publishChangeSelectionToApp`, and others go builder -> app; `appBuilderSync.publishAppStateChangeToBuilder` and others go app -> builder.

What this means for widget code:

- A settings panel cannot reach a runtime widget's React state or JSAPI objects directly. It changes the widget's config with `props.onSettingChange({ id, config })`; the builder updates its app config and pushes it to the app frame, where the widget re-renders with the new `props.config`.
- Some APIs resolve across windows for you. For example, in the builder `MapViewManager.getInstance()` returns the app frame's manager (see the `jimu-framework-apis` skill, "Builder cross-iframe gotcha").
- `builder-support.tsx` modules load only when the app runs inside the builder (`props.builderSupportModules`), for inline editing and embedded layouts (`guide/extend-base-widget/`, "Support inline editing").

## Save, Preview, Publish

| Action | What changes | Evidence |
| --- | --- | --- |
| Save | Builder writes the draft config: `server/public/apps/<id>/resources/config/config.json` | `guide/core-concepts/appconfig/`; [server.md](server.md) |
| Preview | Opens `experience/<id>/?draft=true`. Shows saved changes only. | `guide/save-preview-publish/`; `guide/url-parameters/` |
| Publish | Writes the published config: `server/public/apps/<id>/config.json`. Downloads use this file. | same |

## Versions inside a config

| Field | Meaning | Evidence |
| --- | --- | --- |
| `appConfig.exbVersion` | Replaced with the running code version when the app loads. | `app-config.d.ts` (`AppConfig.exbVersion`) |
| `appConfig.originExbVersion` | The version the config was saved with before that replacement. | same |
| `widgets[id].version`, `originVersion` | Widget version from `manifest.json` when added; upgraded when opened in a newer release. | `app-config.d.ts` (`WidgetJson.version`) |
| Widget upgrade | `WidgetManager.upgradeWidget(widgetJson, versionManager)` runs the widget's `Widget.versionManager`: a `BaseVersionManager` (config only) or a `WidgetVersionManager` (can also upgrade the whole widget JSON and output data sources; the guide recommends it after 1.13). OOTB `version-manager.ts` files: 25 use `BaseVersionManager`, 8 use `WidgetVersionManager`. At runtime the upgrade is not saved; in the builder it is saved on the next Save. | `widget-manager.d.ts`; `base-widget.d.ts` (`WidgetVersionManager`); `guide/save-preview-publish/` "Widget versions"; `guide/make-widgets-backward-compatible/` |
