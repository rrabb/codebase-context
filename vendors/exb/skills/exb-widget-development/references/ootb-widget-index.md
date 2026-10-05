# OOTB Widget Source Index (grounding examples)

The out-of-the-box (OOTB) Esri widgets ship as **readable TypeScript source** under
`ArcGISExperienceBuilder/client/dist/widgets/**` (ignore `node_modules`). They are the most
authoritative, version-accurate (**ExB 1.20**) examples of every API and pattern. **When building a
feature, find the OOTB widget that already does something similar and read its source first.**

Each widget folder has the standard shape:

```
<widget>/
  manifest.json        # identity, dependency, publishMessages, messageActions, defaultSize, properties
  config.json          # default config
  icon.svg
  src/
    config.ts          # Config interface, enums, IMConfig
    version-manager.ts # BaseVersionManager config migrations (very common OOTB convention)
    runtime/
      widget.tsx       # default export Widget (functional); often Widget.versionManager = versionManager
      style.ts         # emotion getStyles(theme) (used with the /** @jsx jsx */ pragma)
      components/       # sub-components
      translations/     # default.ts i18n
    setting/
      setting.tsx      # default export Setting
      style.ts
    data-actions/      # e.g. export-csv, edit — data action classes
    message-actions/   # e.g. pan-to-action, zoom-to-feature-action (declared in manifest)
    tools/ utils/ state/ guide/
  dist/                # built output (ignore)
  tests/
```

---

## Find an example by what you're building

### Map, view & layers
| Want to… | Read | Demonstrates |
|---|---|---|
| Host/create a Map, publish extent/selection messages | `arcgis/arcgis-map` | The `MapWidget`; `publishMessages: EXTENT_CHANGE, DATA_RECORDS_SELECTION_CHANGE, LOCATION_CHANGE`; `message-actions/` (panTo, zoomToFeature, flash) |
| Bind to a JimuMapView, draw graphics, snapping | `arcgis/draw` | `JimuMapViewComponent` + `onActiveViewChange`; `JimuDraw` from `jimu-ui/advanced/map`; `SnappingUtils`; emotion `jsx` pragma + `style.ts`; `versionManager` |
| Legend / layer list / basemap | `arcgis/legend`, `arcgis/map-layers`, `arcgis/basemap-gallery` | Reading `jimuMapView.jimuLayerViews`, layer visibility, basemap swaps |
| Bookmarks, extent navigation | `arcgis/bookmark` | Saving/applying viewpoints; `reactiveUtils` on `view` |
| Measurement, elevation, coordinates | `arcgis/measurement`, `arcgis/elevation-profile`, `arcgis/coordinate-conversion` | JSAPI measurement/analysis modules loaded via `esri/*` |
| Swipe / compare layers | `arcgis/swipe` | Multi-layer view manipulation |
| Floor filter, building explorer, 3D | `arcgis/floor-filter`, `arcgis/building-explorer`, `arcgis/3d-toolbox` | SceneView (`view.type === '3d'`) handling |
| Branch versioning / editing versions | `arcgis/branch-version-management` | `GDBVersionManager`, VMS URLs (mirrored by this repo's `branch-version-editor`) |
| Near-me / analysis / suitability | `arcgis/near-me`, `arcgis/analysis`, `arcgis/suitability-modeler` | Geoprocessing/analysis service calls |

### Data sources, records & tables
| Want to… | Read | Demonstrates |
|---|---|---|
| Render records from a data source (cards/repeat) | `common/list` | `DataRecord`, `UseDataSource`, `state/`, `builder-support.tsx`, `LayoutItemSizeModes`; theme + `AppMode`/`BrowserSizeMode` |
| Feature table / grid | `common/table` | `FeatureLayer` tables, selection sync |
| Query features with UI | `arcgis/query` | Building queries against data sources |
| Filter / date filter | `common/filter`, `common/date-filter` | `SqlExpression`, `SqlExpressionBuilder`, data source filtering |
| Edit feature attributes/geometry | `common/edit` | `EditModeType` enum; `props.state`/`WidgetState` visibility; `controllerWidgetId`; privilege checks; `data-actions/edit.ts` |
| Add data at runtime | `common/add-data` | Creating data sources dynamically |
| Charts | `common/chart` | `jimu-ui/advanced/chart` |
| Export data (data actions) | `common/table`, `common/edit/src/data-actions` | Data action classes (export CSV/JSON/GeoJSON) |

### Layout, UI & app-level
| Want to… | Read | Demonstrates |
|---|---|---|
| Controller (widget launcher) | `common/controller` | `controllerWidgetId`, opening/closing child widgets via `WidgetManager`/`appActions` |
| Search / geocode | `common/search` | Locator/geocode + data source search |
| Print / feature report | `common/print`, `common/feature-report` | `UtilityManager`, print service |
| Embed / iframe, text, image, button, card | `common/embed`, `common/text`, `common/image`, `common/button`, `common/card` | Config-driven presentational widgets; `IMLinkParam`, dynamic URLs |
| List/menu/navigation | `common/menu`, `common/navigator`, `common/timeline` | Navigation + `jimuHistory` |
| Theme / login / share | `common/theme-mode`, `common/login`, `common/share` | `SessionManager`, theming, session-aware UI |
| Select across widgets | `common/select` | Selection messages via `MessageManager` |

---

## Verified OOTB conventions (grounded in the source above)

1. **Functional widgets.** `function Widget (props: AllWidgetProps<IMConfig>): React.ReactElement` (or an arrow). See `arcgis/draw`, `common/edit`, `common/list`.
2. **Config migration via `version-manager.ts`.** Extend `BaseVersionManager`, list `{ version, description, upgrader }`, and attach it: `Widget.versionManager = versionManager` (see `common/edit/src/runtime/widget.tsx`, `arcgis/draw/src/version-manager.ts`). Add a version entry whenever you change the config shape.
3. **Widget lifecycle via `WidgetState`.** Read `props.state` (`WidgetState.Active | Opened | Hidden`) and `props.controllerWidgetId` to decide visibility (see `common/edit`).
4. **Map binding** is always `JimuMapViewComponent` + `onActiveViewChange`, gated on `props.useMapWidgetIds?.[0]`, with `WidgetPlaceholder` (from `jimu-ui`) shown when no map is bound (see `arcgis/draw`).
5. **Advanced map UI** comes from `jimu-ui/advanced/map` (e.g. `JimuDraw`, `JimuDrawVisibleElements`).
6. **Styling** uses emotion: `/** @jsx jsx */` + `import { jsx } from 'jimu-core'` + `getStyles(theme)` in `style.ts`. (This repo's custom widgets also use plain CSS classes — both are valid.)
7. **Inter-widget messaging** is declared in `manifest.json` (`publishMessages`, `messageActions` with `uri`/`settingUri`) and handled through `MessageManager` (see `arcgis/arcgis-map`).
8. **Rich manifests:** OOTB widgets set `properties` (e.g. `coverLayoutBackground`, `needHiddenState`), `defaultSize.autoWidth/autoHeight`, and a full `translatedLocales` list. Copy only what you need.
9. **Config types** import framework types (`UseDataSource`, `FieldSchema`, `DataRecord`, `IMThemeVariables`, `SqlExpression`) from `jimu-core` and use `enum`s for modes.

> Note: some folders under `dist/widgets/` (e.g. `schema-switcher`, `grid-overlay`, `branch-version-editor`) are **this repo's own** widgets copied in at build time — the authored source lives under `src/widgets/`. The `arcgis/*` and `common/*` trees are the true Esri OOTB widgets.
