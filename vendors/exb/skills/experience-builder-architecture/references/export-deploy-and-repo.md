# Export, deploy, and how this repo uses ExB

## Downloaded app (ZIP) layout

Built by `zipApp` in `server/src/middlewares/dev/apps/app-download.js` (see [server.md](server.md), "Download (export)"). Guide: `guide/experience-deployment/`.

| Path in the ZIP | Comes from | Notes |
| --- | --- | --- |
| `index.html` | `client/dist/experience/index.html`, rewritten by `fixIndexFile` | `<base href="./cdn/<n>/"/>`, `buildNumber: "<n>"`, `appFolderName: "."`, `isOutOfExb: true`, `useStructuralUrl: false`, `<title>` = app title. The JSAPI and Calcite URLs are kept, so the deployed app loads them from the same CDN as the dev app unless you replace this file. |
| `web.config` | `client/dist/experience/web.config` | IIS defaults. |
| `service-worker.js` | `service-worker.prod.js` when `NODE_ENV=production`, else `service-worker.js` | Caches `cdn/<n>/`. To patch files inside an unzipped app, rename `cdn/<n>` and update `<base href>` and `buildNumber` (guide, "Service worker cache"). |
| `cdn/<n>/config.json` | The app's **published** config, with `attributes.clientId` set | Edit `attributes.clientId` here when the app uses private content. |
| `cdn/<n>/resources/` | The app's `resources/` folder | Images and other uploads. |
| `cdn/<n>/jimu-core/`, `jimu-ui/`, ... | `client/dist/jimu-*` | When `zipApp` gets a `locales` list, only those translations are kept; otherwise all. |
| `cdn/<n>/calcite-components/`, `arcgis-*-components/` | `client/dist/` | |
| `cdn/<n>/themes/<theme>/` | `client/dist/<appConfig.theme>` | |
| `cdn/<n>/widgets/...` | `client/dist/widgets/<uri>` for OOTB; custom widgets from `client/dist/` or, when `NODE_ENV=production`, from `client/dist-download/` (built by `npm run build:for-download`) | Only widgets the app uses (`getWidgetsUriFromAppConfig`). A widget's `download-files-filter.js` can exclude files. |

Deploy: copy the unzipped folder to a web server and open `<server>/<folder>/index.html`. Apps with private content need a registered client ID (guide).

## This repo's setup (`npm run setup -- 1.20`)

`.scripts/install.mjs` (lines 314-344) installs ExB into `ArcGISExperienceBuilder/` and links the repo's folders into it:

| Link in ExB | Points to | Effect |
| --- | --- | --- |
| `server/public/apps` | `src/apps` | Every app you create, Save, or Publish in the builder is written straight into `src/apps/<id>/`, which is tracked in git. A new app in the builder becomes a new folder here. |
| `client/your-extensions/widgets` | `src/widgets` | The client build compiles `src/widgets/<name>` to `client/dist/widgets/<name>/`; app configs refer to it as `uri: "widgets/<name>/"`. |
| `client/your-extensions/themes` | `src/themes` | Custom themes (currently none; only `.gitkeep`). |
| `client/your-extensions/libs` | `src/libs` | Not an ExB concept. The ExB build only scans `widgets/` and `themes/` (`client/webpack/webpack-extensions.config.js`). Widgets import these files by relative path (for example `src/widgets/help-resources/src/runtime/widget.tsx` imports `../../../../libs/serviceUtils`), so each widget bundles its own copy. ExB's own way to share code is `widgets/shared-code` (`guide/share-code-between-widgets/`). |

Setup also adds `resolve: { symlinks: false }` to `client/webpack.config.js` so webpack keeps the linked paths. If link creation fails, setup copies the folders instead, and edits in `src/` no longer reach ExB until you run setup again (`AGENTS.md`, "Known pitfalls").

## This repo's commands

From the root `package.json`:

| Command | What it runs |
| --- | --- |
| `npm start` | `check:widgets --warn` (prints problems, never blocks), then `start:server` (`ArcGISExperienceBuilder/server`, `npm start`) and `start:client` (`ArcGISExperienceBuilder/client`, `npm start` = `webpack --watch`) together. Open `https://localhost:3001/`. |
| `npm run check:widgets` | `.scripts/check-widgets.mjs`: lists `src/widgets` folders the client build would skip (name differs from folder, incomplete manifest, name already in `widgets-info-existed.json`, duplicate names). Exits 1 if any. |
| `npm run build` | `check:widgets` first (fails the build if a widget would be skipped), then `.scripts/export.mjs`, then `npm run createCustomBuilds` (`.scripts/updateConfigs.mjs`). |

`npm run build` in detail:

| Step | Script | What happens |
| --- | --- | --- |
| 1 | `export.mjs` | Runs `npm run build:dev` and `npm run build:prod` in `ArcGISExperienceBuilder/client`. |
| 2 | `export.mjs` | For each `src/apps/<id>/` whose `info.json` `type` is `"Web Experience"`, calls ExB's `zipApp(id, dist/apps/<title>_<version>.zip, clientId)`. `<version>` is the root `package.json` `version` (currently `0.0.1`). |
| 3 | `export.mjs` | Renames `cdn/<n>/` inside the ZIP to `cdn/<version>/` and sets `<base href>` and `buildNumber` to match. |
| 4 | `export.mjs` | Writes `dist/apps/index.html`, a page that links to every exported app. |
| 5 | `updateConfigs.mjs` | For each app and environment in `src/build-configs/settings.json`, copies the ZIP to `dist/apps/<title>_<version>_<env>.zip` and replaces listed files from `src/build-configs/<app>/<env>/`, for example the root `index.html` (which sets the deployed JSAPI and Calcite URLs) and `cdn/<version>/config.json`. |
| 6 | `updateConfigs.mjs` | Replaces `@@@BUILD_INFO@@@` in every JSON file in the ZIP with `<version> - <date>`. |

Things to know:

- The ZIP uses the **published** config. Publish in the builder before `npm run build`, or the build exports the last published state.
- The `zipPath` values in `src/build-configs/settings.json` contain the version (for example `"cdn//0.0.1"`). They must match the root `package.json` `version`; change both together (see `docs/Build-Deployments.md`, "Build Configurations").
- `zipApp` checks `NODE_ENV`, and neither `npm run build` nor `export.mjs` sets it. Unless your shell sets `NODE_ENV=production`, the ZIP gets the development `service-worker.js` and custom widgets are copied from `client/dist/` (which step 1 just built with `build:prod`).
