# ArcGIS JS API in OTB widgets: @arcgis/core (new modules) vs esri/* alias (legacy)

How the out-of-the-box (OTB) ArcGIS Experience Builder widgets pull in the ArcGIS Maps SDK
for JavaScript splits into two distinct systems. This note characterizes both, lists which
OTB widgets use which, and calls out the type-identity trap that bites custom widgets.

All snippets below are trimmed but verbatim from the shipped widget source under
`ArcGISExperienceBuilder/client/dist/widgets/**` (this tree is gitignored; grep it with
`includeIgnoredFiles: true`). The exact source path is given above each snippet.

## The two systems

### 1. `esri/*` alias + `loadArcGISJSAPIModules` (jimu-arcgis) - the legacy / historical way

The historical ExB pattern: ask jimu-arcgis to asynchronously load one or more SDK modules by
their AMD-style `esri/...` module id. `loadArcGISJSAPIModules` returns a `Promise` of a tuple
(one entry per requested id, in order), which you destructure. This is code-split - the SDK
chunk is only fetched when the widget actually needs it - and it is how the vast majority of
OTB widgets touch the SDK. Type-only references in the same file typically use the ambient
`__esri.*` namespace (provided by jimu-arcgis) rather than importing a type.

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/src/runtime/widget.tsx`

```tsx
import { loadArcGISJSAPIModules, JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
// ...
private legend: __esri.Legend
private Legend: typeof __esri.Legend
// ...
createLegend = async (view: __esri.MapView | __esri.SceneView) => {
  if (!this.Legend) {
    [this.Legend] = await loadArcGISJSAPIModules(['esri/widgets/Legend'])
  }
  // ...
}
```

The multi-module + typed-destructure shape (source:
`ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/src/runtime/components/measure-widget.tsx`):

```tsx
loadArcGISJSAPIModules([
  'esri/widgets/DistanceMeasurement2D',
  'esri/widgets/AreaMeasurement2D',
  'esri/widgets/DirectLineMeasurement3D',
  'esri/widgets/AreaMeasurement3D',
  'esri/core/reactiveUtils'
]).then((modules) => {
  const [DistanceMeasurement2D, AreaMeasurement2D, DirectLineMeasurement3D, AreaMeasurement3D, reactiveUtils] = modules
  setJsApiModules({ DistanceMeasurement2D, AreaMeasurement2D, DirectLineMeasurement3D, AreaMeasurement3D, reactiveUtils })
})
```

Because the tuple is loosely typed, code that needs precise types casts the result, e.g.
(source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/arcgis-map/src/runtime/components/mapbase.tsx`):

```tsx
const [geometryJsonUtils] = await loadArcGISJSAPIModules(['esri/geometry/support/jsonUtils']) as [typeof __esri.jsonUtils]
```

Note: some widgets also use a static `import ... from 'esri/...'` (not `loadArcGISJSAPIModules`).
In this repo the `esri/*` path alias resolves to `@arcgis/core` (see Guidance below), so a static
`esri/*` import is effectively the same module system as `@arcgis/core` - it is just spelled with
the legacy alias. `arcgis/coordinates` mixes both: static `esri/*` value imports in runtime plus
`loadArcGISJSAPIModules(['esri/geometry/SpatialReference'])` in settings.

### 2. `@arcgis/core/*` direct ESM imports - the new module system

Newer widgets import SDK classes and modules directly as ES modules from the `@arcgis/core`
package. These are synchronous, statically resolved imports with full compile-time typing (the
imported symbol carries its own module type; no `__esri` needed). Frequently the imports are
`import type` for annotations, with the concrete value loaded elsewhere, but value imports are
also used (e.g. `OrientedImageryViewer`, `reactiveUtils`, `createTask`, `PopupTemplate`).

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/runtime/widget.tsx`

```tsx
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils'
import type Layer from '@arcgis/core/layers/Layer'
import type OrientedImageryLayer from '@arcgis/core/layers/OrientedImageryLayer'
import type MapView from '@arcgis/core/views/MapView'
import type SceneView from '@arcgis/core/views/SceneView'
import OrientedImageryViewer from '@arcgis/core/widgets/OrientedImageryViewer'
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/src/config.ts`

```ts
import type AreaMeasurement2D from '@arcgis/core/widgets/AreaMeasurement2D'
import type AreaMeasurement3D from '@arcgis/core/widgets/AreaMeasurement3D'
import type DirectLineMeasurement3D from '@arcgis/core/widgets/DirectLineMeasurement3D'
import type DistanceMeasurement2D from '@arcgis/core/widgets/DistanceMeasurement2D'
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/floor-filter/src/runtime/widget.tsx`

```tsx
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils.js'
import { createTask } from '@arcgis/core/core/asyncUtils.js'
import { throwIfAborted } from '@arcgis/core/core/promiseUtils.js' // not public
```

(Floor-filter shows the `.js` extension form of the subpath, and even reaches for a non-public
internal - `throwIfAborted` - which the source itself flags. Do not copy the non-public bit.)

## Which OTB widgets use which

Counts below come from grepping `dist/widgets/arcgis/**` (`.ts` + `.tsx`, `includeIgnoredFiles: true`).
`loadArcGISJSAPIModules(` appears in ~45 files across ~25 widgets; `from '@arcgis/core'` appears in
far fewer and is concentrated in a handful of widgets (heavily `import type`).

| System | Representative OTB widgets | Example source path |
| --- | --- | --- |
| `esri/*` alias via `loadArcGISJSAPIModules` (async, code-split) - the common case | legend, coordinates (settings), my-location, arcgis-map (many call sites), bookmark, directions, feature-info, query, near-me, measurement (loader), 3d-toolbox, basemap-gallery, coordinate-conversion, fly-controller, map-layers, utility-network-trace | `arcgis/legend/src/runtime/widget.tsx` (line ~64) |
| Static `esri/*` value imports (alias, statically typed) | coordinates (runtime), my-location (runtime components + data sources), elevation-profile (runtime), suitability-modeler (most of `wro/`) | `arcgis/coordinates/src/runtime/widget.tsx` (lines ~12-20) |
| `@arcgis/core/*` direct ESM imports (new module system) | oriented-imagery-viewer, measurement (types), floor-filter, analysis (type-only `Portal`/`ParameterValue`/`JobInfo`/etc.) | `arcgis/oriented-imagery-viewer/src/runtime/widget.tsx` (lines ~3-8) |
| Mixes BOTH `esri/*` and `@arcgis/core/*` in the same widget | suitability-modeler, elevation-profile | see next section |

Takeaway: the `esri/*` alias + `loadArcGISJSAPIModules` path dominates the OTB codebase; the direct
`@arcgis/core/*` module system is used by a smaller, newer set of widgets - cleanest in
oriented-imagery-viewer, measurement, and floor-filter.

### Widgets that MIX both

Some widgets import from `@arcgis/core/*` AND from `esri/*` (and/or `loadArcGISJSAPIModules`) in the
same widget, sometimes in the same file:

- `arcgis/suitability-modeler` - source
  `.../suitability-modeler/src/runtime/wro/chart-panel.tsx` has both on adjacent lines:

  ```tsx
  import type GraphicsLayer from 'esri/layers/GraphicsLayer'
  import SketchViewModel from 'esri/widgets/Sketch/SketchViewModel'
  import * as reactiveUtils from '@arcgis/core/core/reactiveUtils'
  ```

  and `.../suitability-modeler/src/runtime/wro/wro-layer-util.ts` mixes
  `import ImageryLayer from 'esri/layers/ImageryLayer'` with
  `import PopupTemplate from '@arcgis/core/PopupTemplate'`; settings still use
  `loadArcGISJSAPIModules(['esri/portal/Portal'])`.

- `arcgis/elevation-profile` - runtime files import many `esri/*` modules
  (`.../elevation-profile/src/runtime/widget.tsx` imports `esri/Graphic`, `esri/geometry/*`,
  `esri/widgets/*`, `esri/core/reactiveUtils`, ...), while settings load via
  `loadArcGISJSAPIModules([...])` (`.../elevation-profile/src/setting/setting.tsx`).

Because the repo's `esri/*` alias resolves to `@arcgis/core`, these "mixed" imports are really the
same underlying modules under two spellings - which is exactly what makes the type-identity trap
below easy to trigger.

## Static vs async loading + typing implications

- `loadArcGISJSAPIModules(ids: string[])` returns `Promise<any[]>` - a tuple whose element order
  matches `ids`. It is asynchronous and code-split (SDK chunk fetched on demand), so you must
  `await`/`.then` and generally cannot use the modules until the promise resolves. The returned
  tuple is loosely typed; to get precise types you cast, e.g. `as [typeof __esri.reactiveUtils]`
  or `as [typeof __esri.jsonUtils]`. Type-only references in the same file lean on the ambient
  `__esri.*` namespace.
- `@arcgis/core/*` direct imports are synchronous static ES imports - resolved and type-checked at
  import. Each imported symbol carries its own module type, so you get full IntelliSense without
  `__esri` and without a cast. The tradeoff versus `loadArcGISJSAPIModules` is that a static import
  is not itself lazy at the source level (bundling/splitting is decided by the build, not by an
  explicit async call).

Rule of thumb: reach for `loadArcGISJSAPIModules` when you want jimu-managed, on-demand loading and
are fine annotating with `__esri.*`; reach for `@arcgis/core/*` (or a static `esri/*` import) when
you want ordinary statically-typed imports.

## Type identity

Inside `client/dist/widgets`, `@arcgis/core/*`, `esri/*`, and the ambient `__esri` namespace all
resolve to the client copy of `@arcgis/core`, so OOTB widgets can mix them without casts. In this
repo's `src/`, a bare `@arcgis/core/*` import resolves to the repo root copy instead, which matches
only while the root `package.json` pins the ExB version. See section 2 of
`references/arcgis-jsapi-integration.md` for the measured cases.

## Guidance: when to use which in a custom widget

- Either system requires the widget `manifest.json` to declare `"dependency": ["jimu-arcgis"]`
  (settings that touch the SDK add `"settingDependency": "jimu-arcgis"`). This is what lets the
  `esri/*` alias and `loadArcGISJSAPIModules` resolve at runtime.
- In THIS repo the `esri/*` path alias resolves to `@arcgis/core` (verified: e.g.
  `import Basemap from 'esri/Basemap'`, `import * as reactiveUtils from 'esri/core/reactiveUtils'`
  work in widgets declaring `jimu-arcgis`). So `esri/*` and `@arcgis/core/*` are the same modules;
  the difference is spelling + whether you load statically or via `loadArcGISJSAPIModules`.
- Repo convention: import JSAPI classes through `esri/*` and annotate with `__esri.*` or the
  imported types; no `as any` is needed between them. Use `loadArcGISJSAPIModules` when you
  specifically want jimu's managed async/code-split load.
- UNVERIFIED: whether the bundler ultimately code-splits a static `esri/*` / `@arcgis/core` import
  the same way `loadArcGISJSAPIModules` does was not confirmed here - if lazy loading matters for a
  large module, prefer `loadArcGISJSAPIModules`. FILE for follow-up.

## Cross-references

- `references/arcgis-jsapi-integration.md` - the repo's `esri/*` alias usage and the measured
  type-identity rules (section 2).
- ExB guide: Use Map View and Scene View in a widget -
  https://developers.arcgis.com/experience-builder/guide/use-mapview-sceneview-in-a-widget/
- `references/ootb-widgets/phase1-inventory.md` - the "@arcgis/core vs esri/* alias" note (most
  widgets use the `esri/*` alias via `loadArcGISJSAPIModules`; oriented-imagery-viewer, measurement,
  floor-filter use `@arcgis/core/*` direct imports).
