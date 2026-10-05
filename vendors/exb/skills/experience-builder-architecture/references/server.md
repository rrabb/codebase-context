# ExB server folder (Developer Edition 1.20)

`ArcGISExperienceBuilder/server/` is a small Node.js web server. It does two jobs: it serves the prebuilt files in `client/dist/`, and in the Developer Edition it stands in for an ArcGIS portal so the builder can create, save, publish, copy, import, and download apps that live as folders on disk.

The server source is minified JavaScript. To read it, reformat a copy outside the repo (for example with `terser` from `client/node_modules`, `compress: false, mangle: false, format: { beautify: true }`). Cite the original file and a search string, not the line number of your formatted copy.

## Files

| Path | What it is |
| --- | --- |
| `server/src/server.js` | Koa app entry. Reads command-line options, sets `global.isDevEdition` and `global.mountPath`, starts HTTP and HTTPS servers. |
| `server/src/setting.json` | `{ "isDevEdition": true }`. Turns on the dev routes below. |
| `server/src/middlewares/static-server.js` | Serves `client/dist/` at the mount path and `server/public/apps/` at `<mount>/apps/`. |
| `server/src/middlewares/common/exb-404.js`, `path-utils.js` | Returns the right `index.html` for any deep URL under `experience/`, `builder/`, `template/`, `site/`, and rewrites `<base href>` for a custom mount path. |
| `server/src/middlewares/dev/index.js` | Route table for the fake portal REST API and app download. |
| `server/src/middlewares/dev/apps/app-request.js` | Create, read, update, delete, copy, search app items and their resources on disk. |
| `server/src/middlewares/dev/apps/app-import.js` | Import an app ZIP, including any compiled custom widgets inside it. |
| `server/src/middlewares/dev/apps/app-download.js` | Build the downloadable app ZIP. Exports `zipApp`, which this repo's `.scripts/export.mjs` calls directly. |
| `server/src/middlewares/dev/apps/utils.js` | Path constants (`appFolderPath`, `CLIENT_PATH`, `widgets/widgets-info.json`) and the default `info.json`. |
| `server/src/middlewares/dev/signin-info/` | Reads and writes `server/public/signin-info.json`. |
| `server/public/apps/<id>/` | One folder per app. In this repo it is a link to `src/apps/` (see [export-deploy-and-repo.md](export-deploy-and-repo.md)). |
| `server/public/signin-info.json` | The portal URL and client ID entered on first launch (`portalUrl`, `clientId`, `isWebTier`, `supportsOAuth`). |
| `server/public/user_resources/tags.json` | Tags shown in the builder's app gallery (created on first use, `utils.js`). |
| `server/cert/` | Self-signed `server.key` and `server.cert` for HTTPS. |
| `server/download-app.js`, `download-app.sh` | Command-line wrappers around `zipApp`. |

## Command-line options

From `server/src/server.js` (`program.option(...)` and `init()`):

| Option | Environment variable | Default | Effect |
| --- | --- | --- | --- |
| `-p, --port` | `EXB_HTTP_PORT` | 3000 | HTTP port. HTTP requests redirect to HTTPS unless `--http_only`. |
| `--https_port` | `EXB_HTTPS_PORT` | 3001 | HTTPS port. The builder is at `https://localhost:3001/`. |
| `--path` | `EXB_MOUNT_PATH` | `/` | Serve everything under a subfolder. |
| `-h, --host_env` | `EXB_HOST_ENV` | `prod` | Sets `global.hostEnv`. |
| `-c, --cert_folder` | none | `server/cert` | Folder with `server.key` and `server.cert`. |
| `--http_only` | none | off | No HTTPS server. |
| `--disable_gzip`, `--enable_file_cache`, `--host_static_file`, `-d, --dev_edition` | none | off | Compression, caching, and edition switches. |

`npm start` in `server/` runs `cross-env NODE_ENV=production node src/server` (`server/package.json`).

## URL map

| URL | Served from | What it is |
| --- | --- | --- |
| `/` | `client/dist/index.html` (`appFolderName: "site"`) | App gallery (home page). Its own app config is `client/dist/config.json`. |
| `/builder/?id=<id>` | `client/dist/builder/index.html` | The builder. Its UI is a jimu app configured by `client/dist/builder/config.json`. |
| `/experience/<id>/` | `client/dist/experience/index.html` | Runs app `<id>`. Add `?draft=true` to load the draft config. |
| `/template/<id>/` | `client/dist/template/index.html` | Runs a template. |
| `/apps/<id>/...` | `server/public/apps/<id>/` | Raw app files (config, resources, thumbnail). Dev Edition only. |
| `/sharing/rest/content/users/...`, `/sharing/rest/search` | `dev/index.js` routes | Fake portal REST API backed by `server/public/apps/`. |
| `/download/:appId`, `/download/:appId/status`, `/download/:appId/getZip` | `dev/index.js` routes | App ZIP download. |
| `/signininfo` | `dev/index.js` routes | Read and save `signin-info.json`. |

## How an app is stored

The builder talks to the server as if it were a portal. Each "item" is a folder (`app-request.js`, `utils.js`):

| File in `server/public/apps/<id>/` | Portal equivalent | Written when |
| --- | --- | --- |
| `info.json` | Item metadata (title, owner, `typeKeywords`, thumbnail path) | Create, rename, publish |
| `resources/config/config.json` | Draft app config (item resource) | Every **Save** in the builder |
| `config.json` | Published app config (item data) | **Publish** |
| `resources/images/`, other `resources/*` | Item resources | Uploads in the builder |
| `thumbnail/` | Item thumbnail | Thumbnail upload |

Facts:

- A new app gets the next free integer folder name (`getFolderIndex` in `utils.js`). App IDs in the Developer Edition are `"0"`, `"1"`, and so on; on ArcGIS Online and Enterprise they are item IDs (`jimu-core/lib/types/state.d.ts`, `appId`).
- Draft vs published is documented in the local guide: `guide/core-concepts/appconfig/` ("Draft and published versions").
- `info.json` `typeKeywords` record status and versions, for example `"status: Changed"`, `"version:1.20.0"`, `"publishVersion:1.20.0"` (see `src/apps/5/info.json`).
- Download and `zipApp` read the **published** `config.json` (`app-download.js`, reads `path.join(<app folder>, "config.json")`). Unpublished draft changes are not exported. The guide says the same: "You must publish the application before you are able to download it" (`guide/experience-deployment/`).

## Import

`app-import.js` accepts an app ZIP that was downloaded from Experience Builder:

- It checks the ZIP has `config.json` and the `jimu-*`, `widgets`, and `config` folders (`checkIsAppValid`).
- It writes the imported config as both draft and published config, and rejects widgets newer than the installed ones (`checkWidgetVersion`).
- It copies compiled custom widgets from the ZIP into `client/dist/widgets/<uri>` and adds them to **both** `widgets-info.json` and `widgets-info-existed.json` (`copyCustomWidget`). After that, the client build treats them as built-in widgets, and a widget folder in `your-extensions/widgets` with the same name is skipped with `Name is duplicated.` (`client/webpack/webpack-extensions.common.js`, `getWidgetsInfoForWebpack`). Run `npm run check:widgets` if a custom widget stops building after an import.

## Download (export)

`zipApp(appId, zipPath, clientId?, options?)` in `app-download.js` (documented in `guide/experience-deployment/`, "Automated deployments"):

1. Reads the published `config.json`, sets `attributes.clientId`, and applies `options.configModifier` if given.
2. Copies `client/dist/experience/index.html` and `web.config` to the ZIP root and fixes the index file (`copyAppCode`, `fixIndexFile`).
3. Copies the service worker (`service-worker.prod.js` when `NODE_ENV=production`).
4. Copies the `jimu-*` packages (`copyJimuFolder`), the `calcite-components` and `arcgis-*-components` folders (`copyComponents`), the app's theme folder, and only the widgets the app uses (`getWidgetsUriFromAppConfig`, `copyWidgets`).
5. When `NODE_ENV=production` and the app has custom widgets, runs `npm run build:for-download` in `client/` first, which builds extensions into `client/dist-download/`.
6. Puts the app files under `cdn/<n>/` and the app's `resources/` beside its `config.json`.

See [export-deploy-and-repo.md](export-deploy-and-repo.md) for the ZIP layout and this repo's build.
