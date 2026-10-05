# ArcGIS Maps SDK for JavaScript inside ExB

How to use the ArcGIS Maps SDK for JavaScript (`@arcgis/core`, JSAPI 5.0.x) from a widget in this repo.
Includes the type-identity rules verified against the installed build configuration.

> **Stuck on undocumented runtime behavior?** When the `.d.ts`/docs don't explain what a JSAPI object
> actually does (e.g. which internal method a native `Editor` button calls, or a public method that
> no-ops), instrument it at runtime rather than guessing - wrap its methods and watch the console. See
> the SKILL section *"When types/docs aren't enough: instrument at runtime"* and the utility
> `src/libs/debug-introspect.ts` (`instrumentMethods`/`instrumentAll`/`traceProps`/`waitForMethod`). This
> is how the create-features finalize was found to be the undocumented `activeWorkflow.save()` (not
> `commit()`). For **server-side** behavior, `src/libs/debug-net.ts` `traceRequests()` logs every ArcGIS
> REST call through the official `esriConfig.request.interceptors` (and `traceFetch()` covers raw fetch/XHR).

---

## 1. Two ways to load JSAPI modules

### A. Static `esri/*` path alias (preferred for typed code)

Widgets whose `manifest.json` declares `"dependency": ["jimu-arcgis"]` can import `@arcgis/core`
classes via the `esri/*` alias:

```ts
import Basemap from 'esri/Basemap'
import FeatureLayer from 'esri/layers/FeatureLayer'
import Graphic from 'esri/Graphic'
import * as reactiveUtils from 'esri/core/reactiveUtils'
import Extent from 'esri/geometry/Extent'
```

`esri/X` resolves to `@arcgis/core/X`. This gives full types and tree-shaking through the ExB build.

### B. Runtime loader (dynamic / when you need AMD-style loading)

```ts
import { loadArcGISJSAPIModules } from 'jimu-arcgis'
const [FeatureLayer, Graphic] = await loadArcGISJSAPIModules([
  'esri/layers/FeatureLayer', 'esri/Graphic'
])
```

Use this when modules must load lazily or conditionally.

---

## 2. Type identity: one copy of `@arcgis/core`, no casts

The ambient `__esri` namespace (from `jimu-arcgis`) and `esri/*` imports both get their type declarations
from the ExB copy of `@arcgis/core` in `ArcGISExperienceBuilder/client/node_modules/@arcgis/core`, so they
are the same types and need no cast. (At runtime both load from the JSAPI URL; see section 6.)

```ts
import Basemap from 'esri/Basemap'
import GraphicsLayer from 'esri/layers/GraphicsLayer'

view.map.basemap = new Basemap({ /* ... */ })
view.map.add(new GraphicsLayer())
```

A bare `import X from '@arcgis/core/...'` in `src/` is different: Node resolution starts at the real
file path and finds the repo root `node_modules/@arcgis/core`, a second copy. It matches the ExB types
only while the root `package.json` pins `@arcgis/core` (and the `@arcgis/*-components` packages) to the
versions ExB ships. When the root copy had drifted to 5.1.14, `view.map.add(new GraphicsLayer())` with
the `@arcgis/core` import failed with TS2345. That drift is the source of the old advice to put
`as any` between `__esri` and module types.

| Situation | What to do |
| --- | --- |
| New widget code | Import through `esri/*`; it always matches the runtime copy |
| A JSAPI assignment seems to need a cast | First compare the root `node_modules/@arcgis/core/package.json` version with the client copy; fix the pin, not the call site |
| `editor.supportingWidgetDefaults = { featureTemplates: { visibleElements: { filter: false } } }` | Still fails (TS2740): the property is typed with full widget `VisibleElements` class instances. Cast only this assignment, with a one-line comment giving the reason |

Verified 2026-10-02 with `tsc` 5.9.3 and the client tsconfig, using a throwaway file that also held a
deliberate error to prove it was checked. OOTB widgets under `client/dist/widgets` resolve `@arcgis/core`
to the client copy, so their mixed `esri/*` and `@arcgis/core` imports are the same types.

---

## 3. Binding to the map/view

Always go through `JimuMapViewComponent` + `onActiveViewChange` (see `widget-patterns.md`). From a
`JimuMapView` you get:

```ts
jmv.view          // __esri.MapView | __esri.SceneView
jmv.view.map      // __esri.Map (allLayers, basemap, add/remove)
jmv.jimuLayerViews            // { [jimuLayerViewId]: JimuLayerView }
await jmv.whenJimuMapViewLoaded()
await jmv.whenAllJimuLayerViewLoaded()
```

Common operations:

```ts
// iterate layers
view.map.allLayers.forEach((layer: __esri.Layer) => { layer.visible = true })

// find a layer by id
const layer = view.map.findLayerById(layerId)

// zoom
await view.goTo({ target: graphic.geometry })

// add a graphics layer (import GraphicsLayer from 'esri/layers/GraphicsLayer')
const gl = new GraphicsLayer()
view.map.add(gl)
```

---

## 4. Watching view/layer state with `reactiveUtils`

Prefer `reactiveUtils` over legacy `.watch()`:

```ts
import * as reactiveUtils from 'esri/core/reactiveUtils'

React.useEffect(() => {
  if (!view) return
  const handle = reactiveUtils.watch(
    () => view.stationary,
    (stationary) => { if (stationary) { /* read view.extent / view.scale */ } }
  )
  return () => handle.remove()
}, [view]) // depend on the view only, to avoid re-registering on config changes
```

> Repo note: keep stationary/extent watch effects dependent on the `view`/`jimuMapView` only, not on
> config, or they re-register repeatedly.

---

## 5. Data sources vs raw layers

- For **map layers tied to ExB data sources**, prefer `DataSourceManager` / `DataSourceComponent` and query through the data source (`ds.query(...)`, `DataRecord`), so selection, filters, and actions stay in sync with the app.
- For **direct cartography/graphics** (drawing, client-side layers, basemap swaps), use the JSAPI classes on `view.map` directly.

Guard against undefined service URLs on client-side / feature-collection layers:

```ts
const dsJson = ds.getDataSourceJson?.()
if (dsJson?.url?.includes('FeatureServer')) { /* server-backed */ }
// A missing url (client-side layer) will crash `.includes(...)` — always optional-chain.
```

---

## 6. Version & environment facts

- ExB **1.20** targets the ArcGIS Maps SDK for JavaScript **5.0** line, Calcite **5.0**, **React 19**, and **Node 24** (Esri release table: https://developers.arcgis.com/experience-builder/guide/release-versions/).
- Type versions and runtime versions differ, because ExB's webpack config treats `esri/*`, `@arcgis/core/*`, `@esri/calcite-components(-react)`, and `@arcgis/{map,coding,portal}-components` as externals loaded at runtime:

  | What | Version | Set in |
  | --- | --- | --- |
  | Type declarations for `esri/*` and `__esri` | `@arcgis/core` 5.0.4, Calcite 5.0.2 | `ArcGISExperienceBuilder/client/node_modules` |
  | Type declarations for bare `@arcgis/core` and Calcite imports in `src/` | Whatever the root `package.json` installs; keep it equal to the client copy | Root `package.json` |
  | JSAPI and Calcite loaded by `npm start` | JSAPI 5.0.12, Calcite 5.0.2 | `arcgisJsApiUrl` and `calciteComponentsUrl` in Esri's prebuilt `ArcGISExperienceBuilder/client/dist/{index,builder/index,experience/index,template/index}.html` (client `npm start` only rebuilds extensions) |
  | JSAPI and Calcite loaded by a deployed app | `arcgisJsApiUrl` and `calciteComponentsUrl` | `src/build-configs/<app>/<env>/index.html` |

- `@arcgis/map-components-react` and `@arcgis/charts-components` are not on the externals list, so a widget that imports them bundles the copy from `node_modules`. Keep those pinned to the matching 5.0 versions.
- The root `package.json` pins `@arcgis/core` and the `@arcgis/*-components` packages to the client versions. Update the pins when ExB is upgraded.
- TypeScript, tsconfig, and lint setup: see `.github/instructions/repo-tooling.instructions.md`.
- Version mismatches (JSAPI/Calcite) can surface as runtime failures in `Table`/`FeatureTable`.

---

## 7. Quick gotcha checklist (from repo memory)

- [ ] `manifest.json` declares `"dependency": ["jimu-arcgis"]` (+ `"settingDependency"` if settings use map pickers).
- [ ] Map bound via `JimuMapViewComponent`, not `getAllJimuMapViewIds()[0]`.
- [ ] Import JSAPI classes through `esri/*`; no `as any` between `__esri` and constructed instances.
- [ ] `reactiveUtils` watch effects depend on the view only.
- [ ] Optional-chain `getDataSourceJson()?.url` before `.includes(...)`.
- [ ] Type-check with `npm run tscheck:bve` (or a copy of `tscheck-bve.json` for another widget); editor null-check errors are not authoritative.
- [ ] For JSAPI class docs/signatures, consult the ArcGIS code-samples MCP / Context7 or https://developers.arcgis.com/javascript/latest/api-reference/.
