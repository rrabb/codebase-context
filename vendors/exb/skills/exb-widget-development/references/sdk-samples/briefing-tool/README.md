# briefing-tool - deep dive (index)

`briefing-tool` is the richest widget in the Esri SDK samples
(`ArcGISExperienceBuilder/sdk-resources/widgets/briefing-tool/`): a multi-step **wizard** that
guides a user to pick an area of interest, browse a catalog, add/edit/style layers, customize and
render a print/briefing map, and save/restore the whole session. It is worth studying not as a
copy-paste source but as a catalog of **reusable patterns** for building large ExB widgets.

> **Version flag:** `briefing-tool` is **exbVersion 1.17.0** and was authored outside the Esri R&D
> sample pipeline. Do NOT copy it verbatim - validate every import path and API signature against the
> installed 1.20 `.d.ts` first. It also depends on Esri **internal-only** component libraries (see the
> registry note). For the higher-level one-card summary see
> [../09-demos-complex.md](../09-demos-complex.md); the files here are the deep extraction.

## Read the file for your task

| File | Covers | Load when |
|---|---|---|
| [vendor-webcomponent-restyling.md](vendor-webcomponent-restyling.md) | Restyle/re-skin OTB/vendor web components you cannot configure (`arcgis-smart-mapping`, `arcgis-map-config-*` + Calcite popovers) via MutationObserver + shadow-DOM piercing (`adjustSMPopover`, `adjustLabelConfigStylePopover`, `hideHeader`/`hideFooter`, `handleSmartMappingClick`) | You must change the look/feel of a vendor/OTB web component whose header/footer/popover has no prop to configure |
| [context-and-state.md](context-and-state.md) | A widget-scoped React **Context + reducers** (`WidgetContextProvider`, `useWidgetContext`, `alertsReducer`, `printConfigReducer`, functional `setPrintConfig`, promise-based `confirm()`) to share large state across ~20 components without prop-drilling | Your widget has grown many components sharing a lot of ephemeral UI/session state |
| [wizard-flow.md](wizard-flow.md) | A single `CalciteFlow` wizard whose visible step is driven by a Context `Panel` enum; forward/back navigation; the vendor smart-mapping flow-within-a-flow | Building a multi-step widget UX |
| [print-composition.md](print-composition.md) | Compose a print image from a live MapView + overlay widgets (scale bar, compass, legend, map inset) via `forwardRef`/`useImperativeHandle`, corner placement, per-component MutationObservers, and `html2canvas` | Building map export / print composition |
| [session-and-widget-communication.md](session-and-widget-communication.md) | Save/restore a full session (extent, basemap, AOI, layers incl. client-side uploads, print + grid settings) to a feature-service table + attachment; plus the three cross-widget **communication** patterns (state-prop push, warm-up, cross-widget portal) | Persisting widget/app state, or making widgets talk to each other |
| [internal-registry-and-assets.md](internal-registry-and-assets.md) | Integrating Esri **internal-only** packages (`.npmrc` -> `olympus.esri.com` Artifactory), which internal web-component libs are used, and the build-time + runtime **resource-path** wiring (`copy-files.json` + `setArcgisAssetPath`/`defineCustomElements` from `folderUrl`) | Pulling in Esri internal web components / wiring their runtime asset paths |

## Cross-cutting takeaways

- **MutationObserver is the workhorse**: the same "wait for async render, then read/adjust the DOM,
  re-apply on re-render, disconnect on cleanup" loop appears in FOUR places - vendor restyling
  (layer-edit), print recomposition (PrintLegend/PrintScaleBar/PrintMapInset), and the cross-widget
  DOM portal (widget.tsx). See the restyling and print docs. The repo's `branch-version-editor`
  (`use-editor-chrome.ts` `patchChrome`) uses the identical technique on the OTB Editor - see
  [../../editor-calcite-flow.md](../../editor-calcite-flow.md).
- **One Context, many reducers** beats prop-drilling once a widget passes a handful of components.
- **Cross-widget comms without imports**: `appActions.widgetStatePropChange(channelId, 'message', payload)`
  (push) + `WidgetManager.loadWidgetClass` + `openWidget`/`closeWidget` (warm up the receiver) +
  `createPortal` into another widget's DOM node.
- **Serialize by stripping live SDK objects**: persistence uses `*.toJSON()`/`*.fromJSON()` and
  deliberately drops non-serializable live objects (e.g. `mapInsetMapView`), reset-preserving them on
  restore.

## Lift-into-repo checklist (applies to every file here)

1. Validate all jimu/ArcGIS imports + signatures against 1.20 (this sample is 1.17.0).
2. Internal component libs need Artifactory registry auth (see the registry doc).
3. Guard every shadow-DOM hop with `?.` + `typeof` checks; disconnect observers and remove listeners
   on cleanup; gate debug logs with `isDebug()`.
4. Prefer typed message contracts over magic-string widget ids; centralize (de)serialization.
5. Apply repo code-style: semicolons, `&&` guard calls, if-body on its own line, plain hyphens.
