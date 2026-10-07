## ArcGIS Experience Builder (ExB): core facts

This project builds custom widgets that run inside the installed ExB Developer Edition {{EXB_VERSION}} in `{{VENDOR_ROOT}}/` (gitignored, downloaded by project setup). The vendor folder must be named `ArcGISExperienceBuilder`. Custom code lives in `src/`; `{{VENDOR_ROOT}}/` is read-only Esri source.

| Piece | What it is |
| --- | --- |
| `{{VENDOR_ROOT}}/server/` | Koa server on `https://localhost:3001`. Serves `client/dist/` and stands in for an ArcGIS portal: each app is a folder `server/public/apps/<id>/`. |
| App files | `resources/config/config.json` = draft (Save), `config.json` = published (Publish), `info.json` = item metadata. Downloads use the published copy. |
| `{{VENDOR_ROOT}}/client/` | `dist/` is Esri's prebuilt site: framework, builder, out-of-the-box (OOTB) widgets, themes, templates. Client `npm start` only compiles custom widgets into `dist/widgets/<name>/`. |
| Jimu | The ExB framework packages (`jimu-core`, `jimu-ui`, `jimu-arcgis`, `jimu-layouts`, `jimu-theme`, `jimu-for-builder`, ...). Types in `client/jimu-*/`, built code in `client/dist/jimu-*/`. |
| Widget | A folder with `manifest.json`, `config.json` (defaults), `src/runtime/widget.tsx`, and optional `src/setting/setting.tsx`. |
| App config | One JSON: `pages`, `layouts` (per size mode), `sections`, `views`, `dialogs`, `widgets` (each with `uri`, `config`, `useDataSources`, `useMapWidgetIds`), `dataSources`, `messageConfigs`, `theme`. A widget's `config.json` is copied into `widgets[id].config` once, when the widget is added. |
| Builder vs runtime | `/builder/?id=<id>` edits the app config and runs the app in an iframe (`experience/<id>/?draft=true`). Settings panels and runtime widgets run in separate windows with separate Redux stores. |

Before answering or changing anything about ExB, Jimu, widgets, layouts, app or widget config, or settings panels, read the matching skills (installed by project setup):

| Topic | Skill |
| --- | --- |
| Any ExB or Jimu question or task: where to look, how to verify | `exb-source-research` |
| Client/server, apps, app config, pages, layouts, builder vs runtime, build and deploy | `experience-builder-architecture` |
| Writing, debugging, or reviewing a widget: runtime, settings, manifest, config, map binding | `exb-widget-development` |
| Jimu framework APIs: managers, data sources, Redux store, map views, theme, layouts | `jimu-framework-apis` |
| Jimu UI components and settings components (`SettingSection`, `SettingRow`, selectors) | `jimu-ui-components` |

Rules:

- Never invent an ExB or Jimu API. Verify against the local `.d.ts` files in `{{VENDOR_ROOT}}/client/jimu-*/`, then the SDK samples in `{{VENDOR_ROOT}}/sdk-resources/`, then the OOTB widget source in `{{VENDOR_ROOT}}/client/dist/widgets/**/src/`. If you cannot verify it there, write `NOT VERIFIED IN LOCAL EXB SOURCES`.
- Look up ExB APIs with `npm run ai:find -- <Name> --members`. Search the installed {{EXB_VERSION}} guide as text in `.ai-context/exb/docs-text/guide/`; the online guide may describe a newer release.
- If `{{VENDOR_ROOT}}/` or `.ai-context/exb/` is missing, project setup has not run. Say so and ask the user to run it.
- End research answers with an `Evidence:` line naming the files, commands, and tools you used.
