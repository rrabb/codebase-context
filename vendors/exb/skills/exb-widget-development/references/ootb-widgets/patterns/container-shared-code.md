# ExB container widgets + shared code (lrs, geobim, layout)

How three OTB (out-the-box) top-level folders in `ArcGISExperienceBuilder/client/dist/widgets/`
are not single widgets but CONTAINERS that ship several sibling widgets sharing one architecture.
Every snippet below is trimmed from the actual dist source; the exact path is printed above it.
Anything not directly confirmed in readable source is marked UNVERIFIED with the file to inspect.

## The pattern in one paragraph

`lrs/`, `geobim/`, and `layout/` are each a top-level folder that holds several SIBLING widget
folders (each with its own `manifest.json`, `src/runtime/widget.tsx`, `config.ts`, `setting.tsx`).
The siblings are cohesive because they share one of three mechanisms: `lrs/*` and `geobim/*` both
import a compiled SHARED-CODE library (`widgets/shared-code/lrs`, `widgets/shared-code/geobim`) and
register a shared REDUX_STORE extension so every sibling reads/writes one Redux slice; `layout/*`
siblings are all `widgetType: "LAYOUT"` container widgets that render a `jimu-layouts` Viewer at
runtime and a Builder module (via `builderSupportModules`) in the builder. Folder membership as of
1.20: `lrs/` = 7 widgets (identify, search-by-route, add-line-event, add-point-event,
dynamic-segmentation, merge-events, split-event); `geobim/` = 3 (document-explorer,
document-viewer, link-explorer); `layout/` = 7 (row, column, accordion, fixed, flowrow, grid,
sidebar).

## Mechanism 1: shared-code library (widgets/shared-code/<name>)

The shared library is a compiled bundle, one per family:
`ArcGISExperienceBuilder/client/dist/widgets/shared-code/lrs.js` and `.../shared-code/geobim.js`
(sibling `chunks/` + `lib/<name>/translations/`). Sibling widgets import from the webpack alias
`widgets/shared-code/<name>` rather than a relative path. Declare the alias target in each
consuming widget `manifest.json` when required by the SDK (see cross-links to
`../../sdk-samples/08-code-sharing.md`).

Real import from an `lrs/*` sibling:

Source: `ArcGISExperienceBuilder/client/dist/widgets/lrs/add-point-event/src/runtime/widget.tsx`
```tsx
import { checkConflictPrevention, findFirstArcgisMapWidgetId, getConfigValue, getModeType,
  GraphicsLayerManager, isDefined, isInWidgetController, type LrsLayer, LrsLayerType,
  MapViewLoader, ModeType, type RouteInfo } from 'widgets/shared-code/lrs'
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/lrs/add-line-event/src/runtime/widget.tsx`
```tsx
import { isDefined, type RouteInfo, getGeometryGraphic, getSimpleLineGraphic,
  getSimplePointGraphic, LrsLayerType, type LrsLayer, MapViewLoader,
  findFirstArcgisMapWidgetId, getModeType, getConfigValue, ModeType } from 'widgets/shared-code/lrs'
```

Real import from a `geobim/*` sibling (note the shared i18n hook + provider):

Source: `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/runtime/widget.tsx`
```tsx
import { defaultSharedMessages, GeoBIMProvider, useSharedMessages } from 'widgets/shared-code/geobim'
// ...
const { translateMessage } = useSharedMessages(intl, manifest.translatedLocales)
```

What the bundles expose (confirmed present in the compiled export maps):

Source: `ArcGISExperienceBuilder/client/dist/widgets/shared-code/lrs.js` (minified `d.d(h, {...})` map)
```js
// ...GraphicsLayerManager:()=>Rw, LrsLayerType:()=>Sp, LrsStoreExtension:()=>g,
//    MapViewLoader:()=>fy, LrsLoader:()=>qy, LrsViewSelector:()=>HS, ModeType:()=>...
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/shared-code/geobim.js` (minified `d.d(h, {...})` map)
```js
// ...GeoBIMProvider:()=>S, GeoBIMContext:()=>w, useSharedMessages:()=>...,
//    DocumentViewerWidgetList:()=>_e, GeoBIMStoreExtension:()=>...,
//    DOCUMENT_VIEWER_WIDGET_ID_CONFIG_KEY:()=>i, defaultSharedMessages:()=>...
```

UNVERIFIED: the readable TypeScript source of the shared library (the `.ts` files that define
`GraphicsLayerManager`, `GeoBIMProvider`, etc.) is not shipped in dist; only the minified bundles
above are. To confirm signatures inspect the ExB SDK share-code sample sources referenced in
`../../sdk-samples/08-code-sharing.md`, or the Esri repo the bundle was built from.

## Mechanism 2: REDUX store extension (REDUX_STORE) shared across siblings

Each family declares ONE Redux slice, defined once in the shared library and registered by every
sibling through the `REDUX_STORE` extension point. The sibling's extension file only re-exports the
shared extension class:

Source: `ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/src/extensions/lrs-store.ts`
```ts
import { LrsStoreExtension } from 'widgets/shared-code/lrs'
export default LrsStoreExtension
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/extensions/geobim-store.ts`
```ts
import { GeoBIMStoreExtension } from 'widgets/shared-code/geobim'
export default GeoBIMStoreExtension
```

The `extensionSpec.ReduxStoreExtension` shape (from the compiled class, confirmed):

Source: `ArcGISExperienceBuilder/client/dist/widgets/shared-code/lrs.js`
```js
class g { // LrsStoreExtension
  constructor(){ this.id = "lrs-store-extension" }
  getActions(){ return Object.keys(u).map(e=>u[e]) }
  getStoreKey(){ return h }            // the shared slice key
  getInitLocalState(){ return f }
  getReducer(){ return d }
}
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/shared-code/geobim.js`
```js
class Do { // GeoBIMStoreExtension
  constructor(){ this.id = "geobim-store-extension" }
  getActions(){ return Object.values(Ie) }
  getStoreKey(){ return Oo }
  getInitLocalState(){ return jo }
  getReducer(){ return ko }
}
```

Every sibling manifest registers the same extension so the reducer is mounted once the app loads
any one sibling:

Source: `ArcGISExperienceBuilder/client/dist/widgets/lrs/identify/manifest.json`
```json
"extensions": [
  { "name": "appConfigOperations", "point": "APP_CONFIG_OPERATIONS", "uri": "tools/app-config-operations" },
  { "name": "LRS Store", "point": "REDUX_STORE", "uri": "extensions/lrs-store" }
]
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/manifest.json`
```json
"extensions": [
  { "name": "GeoBIM Store", "point": "REDUX_STORE", "uri": "extensions/geobim-store" }
]
```

How a sibling reads the shared slice: through `mapExtraStateProps` (Redux -> props). The lrs
siblings surface shared values via `props.mutableStateProps`:

Source: `ArcGISExperienceBuilder/client/dist/widgets/lrs/add-point-event/src/runtime/widget.tsx`
```tsx
static mapExtraStateProps = (state: IMState, props: AllWidgetProps<IMConfig>): ExtraProps => {
  return {
    selectedRouteInfo: props?.mutableStateProps?.selectedRouteInfo,
    selectedNetworkDataSource: props?.mutableStateProps?.selectedNetworkDataSource
  }
}
```

UNVERIFIED: the module augmentation of jimu-core `State`/`IMState` that types the slice under
`getStoreKey()` is not readable in the minified dist. Inspect the shared-library TypeScript source
(look for `declare module 'jimu-core'` extending `State` in the `lrs`/`geobim` shared-code package)
to confirm the exact augmented property name.

## Mechanism 3: layout container widgets (builderSupportModules LayoutViewer/Builder)

`layout/*` siblings do not use shared-code or a Redux slice. They are `widgetType: "LAYOUT"`
containers: the manifest declares `layouts` and `properties.hasBuilderSupportModule: true`, the
`builder-support.tsx` exports the Builder module(s), and `widget.tsx` picks Viewer vs Builder at
render time via `window.jimuConfig.isInBuilder`.

Source: `ArcGISExperienceBuilder/client/dist/widgets/layout/row/manifest.json`
```json
"widgetType": "LAYOUT",
"properties": { "hasBuilderSupportModule": true },
"layouts": [ { "name": "DEFAULT", "label": "Default", "type": "ROW" } ]
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/layout/row/src/runtime/builder-support.tsx`
```tsx
import { RowLayoutBuilder } from 'jimu-layouts/layout-builder'
export default { RowLayoutBuilder }
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/layout/row/src/runtime/widget.tsx`
```tsx
import { RowLayoutViewer } from 'jimu-layouts/layout-runtime'
// ...
const LayoutComponent = !window.jimuConfig.isInBuilder
  ? RowLayoutViewer
  : builderSupportModules.widgetModules.RowLayoutBuilder
const layoutName = Object.keys(layouts)[0]
// <LayoutComponent layouts={layouts[layoutName]} widgetId={id} {...otherProps}>
```

`layout/sidebar` is the most complex sibling: a CUSTOM layout (not a stock `jimu-layouts` viewer),
TWO FIXED layouts (`FIRST`/`SECOND`), message-actions, an `APP_CONFIG_OPERATIONS` extension, a
`versionManager`, and `mapExtraStateProps` reading `widgetsState.collapse`.

Source: `ArcGISExperienceBuilder/client/dist/widgets/layout/sidebar/manifest.json`
```json
"widgetType": "LAYOUT",
"properties": { "flipIcon": true, "supportAutoSize": false, "hasBuilderSupportModule": true },
"messageActions": [
  { "name": "toggleSidebar", "label": "Toggle sidebar", "uri": "message-actions/toggle-sidebar" },
  { "name": "openSidebar", "label": "Open sidebar", "uri": "message-actions/open-sidebar",
    "settingUri": "message-actions/open-sidebar-setting" }
],
"layouts": [ { "name": "FIRST", "type": "FIXED" }, { "name": "SECOND", "type": "FIXED" } ],
"extensions": [ { "name": "appConfigOperations", "point": "APP_CONFIG_OPERATIONS",
  "uri": "tools/app-config-operations" } ]
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/layout/sidebar/src/runtime/builder-support.tsx`
```tsx
import { SidebarLayoutBuilder } from '../layout/builder/layout'
export default { SidebarLayoutBuilder } as { SidebarLayoutBuilder: typeof SidebarLayoutBuilder }
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/layout/sidebar/src/runtime/widget.tsx`
```tsx
import { SidebarLayout } from '../layout/runtime/layout'
import { versionManager } from '../version-manager'
// static mapExtraStateProps -> sidebarVisible: state?.widgetsState?.[props.id]?.collapse ?? defaultCollapse
static versionManager = versionManager
const LayoutComponent = !window.jimuConfig.isInBuilder
  ? SidebarLayout
  : builderSupportModules.widgetModules.SidebarLayoutBuilder
```

`layout/accordion` shows a sibling that adds `CONTEXT_TOOL` extensions on top of the Builder module:

Source: `ArcGISExperienceBuilder/client/dist/widgets/layout/accordion/src/runtime/builder-support.tsx`
```tsx
import { AccordionLayoutBuilder } from 'jimu-layouts/layout-builder'
import { QuickStyle } from './builder/quick-style'
export default { AccordionLayoutBuilder, QuickStyle }
```

## Comparison table: lrs vs geobim vs layout

| Aspect | `lrs/*` (7 widgets) | `geobim/*` (3 widgets) | `layout/*` (7 widgets) |
| --- | --- | --- | --- |
| Container mechanism | shared-code lib + REDUX_STORE | shared-code lib + REDUX_STORE | `widgetType: LAYOUT` + builderSupportModules |
| Shared-code import | `widgets/shared-code/lrs` | `widgets/shared-code/geobim` | none (uses `jimu-layouts`) |
| Shared bundle | `shared-code/lrs.js` | `shared-code/geobim.js` | n/a |
| Redux slice | `LrsStoreExtension` (`id: lrs-store-extension`) | `GeoBIMStoreExtension` (`id: geobim-store-extension`) | none |
| Manifest extension | `REDUX_STORE -> extensions/lrs-store` | `REDUX_STORE -> extensions/geobim-store` | none (layouts drive it) |
| Key shared exports | `GraphicsLayerManager`, `MapViewLoader`, `LrsLayerType`, `LrsLayer` utils | `GeoBIMProvider`, `useSharedMessages`, `DocumentViewerWidgetList` | `RowLayoutViewer`/`Builder`, custom `SidebarLayout` |
| Runtime vs builder switch | standard widget | standard widget | `window.jimuConfig.isInBuilder` picks Viewer/Builder |
| License / gating | `notSupportAGOL` (most) | `requireLicense: "Autodesk"` | none |
| dependency | `jimu-arcgis` | `jimu-arcgis` | none |

## Reusable takeaways for building your own multi-widget container

- Put shared logic/UI/hooks in a `widgets/shared-code/<family>` library and import it from every
  sibling via the `widgets/shared-code/<family>` alias, not relative paths. Declare the alias in
  each consuming manifest per the SDK guidance.
- For cross-widget runtime state, define ONE `extensionSpec.ReduxStoreExtension`
  (`id` + `getStoreKey` + `getReducer` + `getActions` + `getInitLocalState`) in the shared library,
  and have each sibling `extensions/*-store.ts` re-export it and register it with a
  `{ point: "REDUX_STORE", uri: "extensions/<family>-store" }` manifest entry. Read the slice
  through `mapExtraStateProps` (surface via `mutableStateProps` as lrs does).
- For layout containers, set `widgetType: "LAYOUT"`, `properties.hasBuilderSupportModule: true`,
  and a `layouts` array; export the Builder module(s) from `builder-support.tsx`; and in
  `widget.tsx` branch on `window.jimuConfig.isInBuilder` between a `jimu-layouts/layout-runtime`
  Viewer and `builderSupportModules.widgetModules.<X>LayoutBuilder`.
- Siblings can diverge: a shared family still lets each widget add its own manifest extensions
  (`APP_CONFIG_OPERATIONS`, `CONTEXT_TOOL`), message/data actions, and version manager
  (see `layout/sidebar`, `layout/accordion`, `lrs/add-line-event`).

## Cross-references

- SDK share-code cards: [../../sdk-samples/08-code-sharing.md](../../sdk-samples/08-code-sharing.md)
  (chunk/entry/entry-dynamic strategies + `moduleLoader`).
- ExB guide - Share code between widgets: https://developers.arcgis.com/experience-builder/guide/share-code-between-widgets/
- ExB guide - Extension points (REDUX_STORE, APP_CONFIG_OPERATIONS): https://developers.arcgis.com/experience-builder/guide/extension-points/
- Inventory rows for these families:
  [../phase1-inventory.md](../phase1-inventory.md) (`lrs/*` lines 92-98, `geobim/*` 99-101,
  `layout/*` 102-108; cross-widget summaries at lines 188-191).
