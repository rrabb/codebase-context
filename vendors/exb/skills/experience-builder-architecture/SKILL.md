---
name: experience-builder-architecture
description: "How ArcGIS Experience Builder (ExB) Developer Edition 1.20 is put together and how this repo plugs into it. USE WHEN: a question or task depends on what the ExB client or server folder does; what jimu is; how apps are created, stored, saved, published, imported, downloaded, or deployed; draft vs published config; the app config (AppConfig: pages, layouts, sections, views, windows/dialogs, screen groups, header, footer, widgets, dataSources, messageConfigs, size modes); how a widget's config.json becomes props.config; builder vs app windows (settings panel vs runtime, iframe, two Redux stores); how custom widgets and themes are built and registered (your-extensions, client/dist/widgets, widgets-info.json, SystemJS import map, webpack externals); app and page templates; URL forms (/builder/?id=, /experience/<id>/, ?draft=true); this repo's setup links (src/apps, src/widgets, src/libs) and npm run build / build-configs. Also use before explaining ExB to someone or when an answer depends on where a file lives or what actually runs."
license: Internal
---

# Experience Builder architecture

ExB Developer Edition 1.20.0 (`ArcGISExperienceBuilder/version.json`). This skill explains the mechanics that model training data usually gets wrong: which folder does what, what runs where, and how an app goes from the builder to a deployed ZIP. For APIs use the `jimu-framework-apis` and `jimu-ui-components` skills; for writing widget code use `exb-widget-development`.

Every claim in the reference files names its source: a file under `ArcGISExperienceBuilder/`, this repo, or the local 1.20 guide at `ArcGISExperienceBuilder/exb-api-ref-docs/experience-builder/guide/`. The online guide is now 1.21 and may not match (see [references/guide-map.md](references/guide-map.md)). Items marked "inferred" were not traced; verify them before relying on them.

## The whole system in one table

| Piece | What it is | Where |
| --- | --- | --- |
| Server | Node (Koa) web server. Serves `client/dist/` and, in the Developer Edition, pretends to be an ArcGIS portal so apps can be stored as folders. | `ArcGISExperienceBuilder/server/` -> [references/server.md](references/server.md) |
| Client | Everything the browser loads. Esri ships it prebuilt in `client/dist/`; the client's `npm start` only compiles your custom widgets and themes into it. | `ArcGISExperienceBuilder/client/` -> [references/client.md](references/client.md) |
| Jimu | The framework packages (`jimu-core`, `jimu-ui`, `jimu-arcgis`, `jimu-layouts`, `jimu-theme`, `jimu-for-builder`, `jimu-data-source`, ...). Built code in `client/dist/jimu-*`, types in `client/jimu-*`. | `guide/core-concepts/jimu/` |
| App | One JSON document (the app config) plus resources. Stored as `server/public/apps/<id>/` with a draft and a published copy. | [references/app-config.md](references/app-config.md) |
| Builder | A jimu app at `/builder/?id=<id>` that edits the app config. It runs the app in an iframe. | [references/runtime-and-builder.md](references/runtime-and-builder.md) |
| App viewer | `client/dist/experience/index.html`. Boots `jimu-core/init.js`, loads the config, renders pages, loads widgets on demand through SystemJS. | [references/runtime-and-builder.md](references/runtime-and-builder.md) |
| Widget | A folder with `manifest.json`, `config.json` (defaults), `src/runtime/widget.tsx`, optional `src/setting/setting.tsx`. Built to `client/dist/widgets/<name>/`. Each use in an app is an entry in `appConfig.widgets`. | [references/client.md](references/client.md), [references/app-config.md](references/app-config.md) |
| Download | `zipApp` turns the published config, the framework, and the used widgets into a self-hosted ZIP. | [references/export-deploy-and-repo.md](references/export-deploy-and-repo.md) |
| This repo | `src/apps`, `src/widgets`, `src/themes`, `src/libs` are linked into ExB; `npm run build` exports every app and applies per-environment files. | [references/export-deploy-and-repo.md](references/export-deploy-and-repo.md) |

## Where things live

| Question | Answer |
| --- | --- |
| Where is app 5's config? | Draft: `src/apps/5/resources/config/config.json`. Published: `src/apps/5/config.json`. Item metadata: `src/apps/5/info.json`. |
| Where does a custom widget's built code go? | `ArcGISExperienceBuilder/client/dist/widgets/<name>/dist/runtime/widget.js` (and `dist/setting/setting.js`). |
| Which widgets does the builder offer? | `client/dist/widgets/widgets-info.json`. Esri-shipped ones are also in `widgets-info-existed.json`. |
| Where do JSAPI and Calcite come from at runtime? | The `arcgisJsApiUrl` and `calciteComponentsUrl` in the page's `index.html` (CDN), not `node_modules`. |
| Where are the API types? | `ArcGISExperienceBuilder/client/jimu-*/**/*.d.ts`; JSAPI types in `client/node_modules/@arcgis/core`. |
| Where are the docs for this version? | `ArcGISExperienceBuilder/exb-api-ref-docs/experience-builder/` ([references/guide-map.md](references/guide-map.md)). |

## Facts that are easy to get wrong

| Fact | Evidence |
| --- | --- |
| Save writes the draft (`resources/config/config.json`); Publish writes `config.json`. Downloads and this repo's `npm run build` use the **published** copy. | `guide/core-concepts/appconfig/`; `server/src/middlewares/dev/apps/app-download.js` |
| Builder edits in this repo land directly in `src/apps/<id>/` (git-tracked), because `server/public/apps` is a link to `src/apps`. | `.scripts/install.mjs` lines 314-344 |
| The settings panel runs in the builder window; the widget runs in the app iframe (`_appWindow`). They have separate Redux stores and talk through `onSettingChange` and sync messages, not shared memory. | `client/dist/builder/widgets/app-loader/dist/runtime/widget.js`; `client/jimu-for-builder/lib/sync-type.d.ts` |
| A widget's `config.json` is copied into the app config once, when the widget is added. Changing it later does not change existing instances; use a version manager. | `client/dist/jimu-core/index.js` (`loadWidgetDefaultConfig`); `guide/make-widgets-backward-compatible/` |
| `react`, `jimu-*`, `esri/*`, `@arcgis/core/*`, Calcite, and `@arcgis/{map,coding,portal}-components` are not bundled into widgets; they load at runtime from `client/dist` or the JSAPI CDN. Other imports, including `src/libs/*`, are bundled into each widget. | `client/webpack/webpack.common.js` (`isRequestExternal`, `externalFunction`) |
| A widget folder is skipped by the build if its `manifest.json` `name` differs from the folder name or the name is already taken, including by a widget that came in with an imported app. `npm run check:widgets` reports these; it warns before `npm start` and fails `npm run build`. | `client/webpack/webpack-extensions.common.js` (`getWidgetsInfoForWebpack`); `server/.../app-import.js` (`copyCustomWidget`); `.scripts/check-widgets.mjs` |
| Restart the client watcher after adding, removing, or renaming a widget or file, after editing `manifest.json`, or after installing a package. | `guide/extend-base-widget/` "Client server" |
| A layout is referenced per size mode (`LARGE`, `MEDIUM`, `SMALL`); Medium and Small fall back to Large. One widget can appear in several layouts. Change structure with `getAppConfigAction()`, not by hand. | `guide/core-concepts/layout/`; `client/jimu-core/lib/types/app-config.d.ts` |
| Only the current page renders; all views in a section render but only one is visible. | `guide/core-concepts/section-view/` |
| The JSAPI is not loaded at app start. A widget needs `"dependency": ["jimu-arcgis"]` in `manifest.json` or `loadArcGISJSAPIModules`. | `guide/extend-base-widget/` |
| App IDs are integers (`"0"`, `"5"`) in the Developer Edition, item IDs in ArcGIS Online and Enterprise, and `null` in a downloaded app. | `client/jimu-core/lib/types/state.d.ts` (`appId`) |

## Reference files

| File | Covers |
| --- | --- |
| [references/server.md](references/server.md) | Server files, options, URL map, fake portal REST routes, app storage, import, download |
| [references/client.md](references/client.md) | Client folders, `client/dist` layout, import map and externals, how the build finds and builds widgets and themes, templates |
| [references/runtime-and-builder.md](references/runtime-and-builder.md) | App boot steps, URL forms, builder vs app windows, Save/Preview/Publish, version fields and widget upgrades |
| [references/app-config.md](references/app-config.md) | AppConfig keys, layout model with app 5 examples, widget instance fields, widget config life cycle, data sources and message configs |
| [references/export-deploy-and-repo.md](references/export-deploy-and-repo.md) | Downloaded ZIP layout, this repo's setup links, `npm start`, `npm run build`, build-configs |
| [references/guide-map.md](references/guide-map.md) | Every guide section with its local 1.20 path and online URL |

## How to check something not covered here

1. Grep the local 1.20 guide as text: `.ai-context/exb/docs-text/guide/` (slugs in [references/guide-map.md](references/guide-map.md)). Checked facts with sources: `.ai-context/exb/facts/<version>.md`.
2. Read the `.d.ts` in `ArcGISExperienceBuilder/client/jimu-*/` or run `npm run ai:find -- <Name>`.
3. Read the readable source: OOTB widgets in `client/dist/widgets/**/src`, webpack scripts in `client/webpack/`.
4. For the server and the `client/dist/jimu-*` and `builder` bundles, the code is minified. Search the bundle for a known string, or reformat a copy outside the repo. Treat what you find as evidence of current behavior, not a supported API.
5. Look at a real app: `src/apps/<id>/resources/config/config.json`.
6. Run it: `npm start`, then use DevTools (`window._appStore.getState().appConfig`, `window._widgetManager`, `window.jimuConfig`).
