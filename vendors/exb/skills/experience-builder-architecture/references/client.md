# ExB client folder (Developer Edition 1.20)

`ArcGISExperienceBuilder/client/` holds everything that runs in the browser. Almost all of it ships prebuilt from Esri in `client/dist/`. The client's `npm start` only compiles **extensions** (custom widgets and themes) and writes them into `client/dist/` next to Esri's files.

## Top-level folders

| Path | What it is | Edit? |
| --- | --- | --- |
| `client/jimu-core/`, `jimu-ui/`, `jimu-arcgis/`, `jimu-layouts/`, `jimu-theme/`, `jimu-for-builder/`, `jimu-data-source/`, `jimu-icons/`, `jimu-for-test/` | Type declarations (`.d.ts`) and some readable source of the jimu framework packages. This is where you verify an API. The runnable code is in `client/dist/jimu-*`. | No |
| `client/types/` | Shared ambient types (framework and third-party). | No |
| `client/dist/` | The built web site: framework, builder, OOTB widgets, themes, templates, and your compiled extensions. The server serves this folder as-is (see [server.md](server.md)). | No (build output) |
| `client/your-extensions/` | Default extension repo (`manifest.json` with `"type": "exb-web-extension-repo"`). In this repo `widgets/`, `themes/`, `libs/` inside it are links to `src/`. | Through `src/` |
| `client/webpack/` | Build scripts for extensions (`webpack-extensions.config.js`, `webpack-extensions.common.js`, `webpack.common.js`, `widget-webpack-override.js`). | No |
| `client/builder/setting.json` | Default portal settings for the builder (`devEnv.prod.portalUrl`, `clientId`). | No |
| `client/node_modules/` | Packages for building and type-checking (`@arcgis/core` 5.0.4 types, Calcite 5.0.2). Not loaded by the browser. | No |
| `client/package.json` | Scripts: `start` = `webpack --watch` (development), `build:dev`, `build:prod`, `build:for-download` (writes `dist-download/` for app export), `test` (Jest), `lint` (ESLint). | No |

## `client/dist/` layout

| Path | What it is |
| --- | --- |
| `index.html`, `config.json` | The app gallery ("site"). `config.json` is a normal app config whose widgets come from `site/widgets/`. |
| `builder/` | The builder. `index.html`, `init.js`, `config.json` (the builder UI is itself a jimu app), `widgets/` (builder panels such as `app-loader`, `toc`, `data-source-setting`). |
| `experience/` | The app viewer: `index.html`, `index.js`, a default `config.json`, `web.config`. Every app runs through this page, and downloads copy it. |
| `template/` | Viewer for templates (same structure as `experience/`). |
| `site/` | Widgets and themes for the gallery page. |
| `jimu-core/`, `jimu-ui/`, `jimu-arcgis/`, `jimu-layouts/`, `jimu-theme/`, `jimu-for-builder/`, `jimu-data-source/` | Built framework packages. `jimu-core/init.js` boots every page. `jimu-core/react.js` and `react-dom.js` provide React. |
| `calcite-components/`, `arcgis-map-components/`, `arcgis-charts-components/`, `arcgis-coding-components/`, `arcgis-portal-components/` | Web component bundles loaded by name through the import map. |
| `widgets/arcgis/`, `widgets/common/`, `widgets/layout/` | OOTB widgets, each with readable `src/` and built `dist/`. Also `widgets/lrs/`, `geobim/`, `survey123/`, `ba-infographic/`. |
| `widgets/<custom-name>/` | Your compiled custom widgets (for example `widgets/branch-version-editor/`). |
| `widgets/shared-code/`, `widgets/chunks/` | Code shared between widgets and lazy-loaded chunks. |
| `widgets/widgets-info.json` | List of every widget the builder offers (OOTB plus custom). Rewritten by each client build. |
| `widgets/widgets-info-existed.json` | The Esri-shipped widget list. The build deletes any `dist/widgets/<uri>` that is in `widgets-info.json` but not in this file, then rebuilds custom widgets (`clearCustomWidgets` in `webpack-extensions.config.js`). |
| `themes/` | Built themes (`default`, `master`, `dark`, `calcite`, ...), each with `manifest.json`, `variables.json`, `style.js`, `thumbnail.svg`, plus `themes-info.json`. |
| `templates/` | App templates (`templates/app/<name>/` with `config.json`, `manifest.json`, thumbnails) and page, window, block, header, footer, screen templates. |
| `service-worker*.js`, `version.json` | Caching for exported apps and the ExB version. |

## How a page loads code

Each entry page (`experience/index.html` and the others) contains two JSON blocks and one script:

| Block | Contents | Effect |
| --- | --- | --- |
| `<script type="webpack-options">` | `mountPath`, `appFolderName`, `arcgisJsApiUrl` (`https://js.arcgis.com/5.0.12/`), `calciteComponentsUrl`, `isDevEdition`, `isBuilder`, `isSite`, `buildNumber` | Becomes `window.jimuConfig`. |
| `<script type="systemjs-importmap">` | `jimu-core`, `jimu-ui`, ... -> `dist/jimu-*/index.js`; `widgets/`, `themes/`, `builder/`, `templates/` -> `dist/...`; `calcite-components` and `arcgis-*-components` -> `dist/...`; `esri/` -> the JSAPI CDN | Tells SystemJS where every shared module lives. |
| `<script src="../jimu-core/init.js">` | Boot script | Starts the app (see [runtime-and-builder.md](runtime-and-builder.md)). |

Consequences:

- Widgets are compiled as SystemJS modules (`libraryTarget: "system"` in `webpack-extensions.common.js`) and loaded on demand by URL, for example `widgets/branch-version-editor/dist/runtime/widget.js`.
- Shared packages are **not** bundled into widgets. `webpack.common.js` (`isRequestExternal`, `externalFunction`) marks as external: `react` and `react-dom` (served by `jimu-core`), all `jimu-*` entry points, `esri/*` and `@arcgis/core/*` (both become `esri/...` and load from the JSAPI CDN), `@esri/calcite-components(-react)`, `@arcgis/map-components`, `@arcgis/coding-components`, `@arcgis/portal-components`, `@emotion/*`, and `widgets/shared-code`. Anything else a widget imports, including `src/libs/*` in this repo, is bundled into that widget.
- So the JSAPI and Calcite versions at runtime come from the URLs in the entry page, not from `node_modules`.

## How the client build finds and builds extensions

From `client/webpack/webpack-extensions.config.js` and `webpack-extensions.common.js`:

1. Every folder directly under `client/` whose `manifest.json` has `"type": "exb-web-extension-repo"` is an extension repo (`isExtensionRepo`). Its `widgets/` and `themes/` folders are scanned.
2. Any folder with a `manifest.json` is a widget or theme (`visitFolder`). The scan does not go deeper once it finds one, and it skips `node_modules`.
3. A widget is skipped if its `manifest.json` `name` differs from its folder name, if the name is already used (including by an OOTB or imported widget in `widgets-info-existed.json`), or if `type`, `version`, or `exbVersion` is missing.
4. Each widget gets these webpack entries (`getOneWidgetEntries`):

| Source file | Built file | Loaded |
| --- | --- | --- |
| `src/runtime/widget.tsx` | `dist/runtime/widget.js` | In the app (and in the builder's app frame) |
| `src/runtime/builder-support.tsx` | `dist/runtime/builder-support.js` | Only when the app runs inside the builder |
| `src/setting/setting.tsx` | `dist/setting/setting.js` | Only in the builder's settings panel |
| `src/setting/item-setting.tsx` | `dist/setting/item-setting.js` | Layout widgets (`widgetType: "LAYOUT"`) only |
| `src/guide/guide.tsx` | `dist/guide/guide.js` | Guided tours |
| `src/<uri>.ts(x)` for each `extensions`, `messageActions`, `dataActions` entry in `manifest.json` | `dist/<uri>.js` | When the framework needs that extension or action |

5. Files copied as-is (`getOneWidgetToBeCopiedFiles`): `manifest.json` (with computed `properties` such as `hasSettingPage: false` when there is no `setting.tsx`), `config.json`, `icon.svg`, `src/runtime/translations`, `src/runtime/assets`, `src/setting/translations`, `src/setting/assets`, `src/guide/*`, a prebuilt `dist/` folder if the widget has one, `doc/`, and anything listed in the widget's `copy-files.json`. Production builds also copy `src/` and `tests/`, which is why OOTB widgets ship readable source.
6. The widget's entry in `widgets-info.json` gets `uri: "widgets/<name>/"`. That `uri` is what an app config stores for each widget instance.

The client must be restarted after adding, removing, or renaming a widget or file, after editing `manifest.json`, or after installing a package (`guide/extend-base-widget/`, "Client server").

## Themes and templates

| Kind | Source | Built to | Referenced from the app config |
| --- | --- | --- | --- |
| Theme | `<extension repo>/themes/<name>/` (`manifest.json`, `variables.json`, `style.ts`, `thumbnail.png`, `translations/`; sample: `sdk-resources/themes/demo-theme/`) | `dist/themes/<name>/` | `appConfig.theme`, for example `"themes/master/"` (must end with `/`, `app-config.d.ts`) |
| App template | Esri-shipped `dist/templates/app/<name>/` (`config.json`, `manifest.json`) | n/a | `appConfig.template`, for example `"tab"`. The builder fetches `templates/<kind>/<name>/config.json` (`client/dist/jimu-for-builder/templates.js`, minified); the template's config is the starting app config when an author creates an app from it. |
| Page, window, block, header, footer, screen templates | Esri-shipped `dist/templates/<kind>/` | n/a | Fetched the same way when an author inserts one; its pages, layouts, and widgets are merged into the app config (merge step inferred, not traced). |

Custom themes deploy only through the Developer Edition (download the app); custom widgets can also be registered in ArcGIS Enterprise 11.0 and later (`guide/widget-theme-deployment/`).
