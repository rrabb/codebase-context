# briefing-tool - deep dive (internal web components, resource paths, internal-registry integration)

## What this is + version flag

The `briefing-tool` is the richest widget in the local SDK samples (`ArcGISExperienceBuilder/sdk-resources/widgets/briefing-tool/`): a multi-step wizard for building a briefing map print-out. Its `manifest.json` declares `"version": "1.17.0"` and `"exbVersion": "1.17.0"`, and it was authored outside the Esri R&D sample pipeline (manifest `author` "Esri Joey Harig", `package.json` `author` is a local developer account). Do NOT copy it verbatim; the repo SDK targets a newer ExB, so validate every jimu/ArcGIS API against 1.20 before lifting. For the higher-level architecture/wizard/context/print walkthrough, see the summary card in [09-demos-complex.md](../09-demos-complex.md); this file only covers the reusable internal-registry + web-component + asset-path integration patterns.

## 1. Integrating packages from an internal-only Esri repo

The widget adds its own `.npmrc` that points the `@arcgis` scope at an internal Artifactory registry while leaving the default registry public:

```ini
registry=https://registry.npmjs.org/
@arcgis:registry=https://olympus.esri.com/artifactory/api/npm/npm-repo/
```

The `package.json` only lists a few direct deps, but they pull a large internal graph:

```json
"dependencies": {
  "@arcgis/coding-components": "^4.33",
  "@arcgis/common-components": "^4.33",
  "@arcgis/map-config-components": "^4.33",
  "html2canvas": "^1.4.1"
}
```

From `package-lock.json`, the `@arcgis/*` (and related) packages resolve from `https://olympus.esri.com/artifactory/api/npm/npm-repo/`, at these pinned versions:

| Package | Resolved version |
| --- | --- |
| `@arcgis/core` | 4.33.12 |
| `@arcgis/coding-components` | 4.33.14 |
| `@arcgis/common-components` | 4.33.14 |
| `@arcgis/map-config-components` | 4.33.14 |
| `@arcgis/map-components` | 4.33.15 |
| `@arcgis/components-utils` | 4.33.14 / 4.33.15 |
| `@arcgis/core-adapter` | 4.33.14 |
| `@arcgis/lumina` | 4.33.14 / 4.33.15 |
| `@arcgis/embeddable-components` | 4.33.14 |
| `@arcgis/portal-components` | 4.33.14 |
| `@arcgis/template-components` | 4.33.1 |
| `@arcgis/field-apps-custom-elements` | 4.33.1 |
| `@arcgis/field-apps-utils` | 4.33.1 |
| `@arcgis/arcade-languageservice` | 4.33.14 |
| `@arcgis/languages-api-utils` | 4.33.14 |
| `@arcgis/languages-sdk-spec` | 4.33.14 |
| `@arcgis/ohm-arcade-grammar` | 4.33.1 |
| `@arcgis-internal/ckeditor5-custom-build` | 2.5.13 |
| `@stencil/core` | 4.36.2 (also 4.20.0 nested) |
| `@esri/calcite-components` | 3.2.1 |

Implication for THIS repo: the internal component libraries above (`@arcgis/core`, `@stencil/core`, `@arcgis/lumina`, `@arcgis-internal/ckeditor5-custom-build`, `@arcgis/embeddable-components`, `@arcgis/field-apps-custom-elements`, `@arcgis/portal-components`, `@arcgis/template-components`, plus `@arcgis/coding-components`, `@arcgis/common-components`, `@arcgis/map-config-components`, `@arcgis/map-components`) are NOT published to public npm. Any install/build that touches this widget needs authenticated access to the internal Artifactory via the scoped `@arcgis:registry`. Lifting this widget (or its patterns) into `src/widgets` requires the same registry credentials configured in an `.npmrc`; without them the install fails on the first `@arcgis/*` fetch. In this particular lock, even ordinarily-public packages (for example `luxon`, `@floating-ui/*`, `rollup`, `sortablejs`) also show an `olympus.esri.com` `resolved` URL because they were cached through the Artifactory mirror at install time; those remain fetchable from public npm, but the `@arcgis/*` component libraries do not.

## 2. Esri internal web components used

These libraries ship framework-agnostic custom elements (Stencil / Lumina web components) that the widget renders inside its React/TSX tree.

| Library | Provides | How imported |
| --- | --- | --- |
| `@arcgis/map-config-components` | `arcgis-map-config-label`, `arcgis-map-config-symbol-picker`, `arcgis-map-config-symbol-styler`, `arcgis-map-config-layer-override`, `arcgis-smart-mapping` | deep per-component `dist/components/...` import + loader + `setArcgisAssetPath` |
| `@arcgis/common-components` | shared portal/config building-block elements | loader import + `setArcgisAssetPath` |
| `@arcgis/map-components` | `arcgis-scale-bar`, `arcgis-legend`, `arcgis-basemap-gallery` | side-effect `components/...` registration import |
| `@arcgis/coding-components` | Arcade/expression editing elements (+ CSS) | CSS side-effect import |

Three import styles appear (all real lines from the widget):

(a) deep per-component `dist` import (tree-shaken, pulls one element definition), from `layer-edit.tsx`:

```tsx
import { ArcgisMapConfigLabel } from "@arcgis/map-config-components/dist/components/arcgis-map-config-label";
import { ArcgisMapConfigSymbolPicker } from "@arcgis/map-config-components/dist/components/arcgis-map-config-symbol-picker";
import { ArcgisMapConfigSymbolStyler } from "@arcgis/map-config-components/dist/components/arcgis-map-config-symbol-styler";
import { ArcgisMapConfigLayerOverride } from "@arcgis/map-config-components/dist/components/arcgis-map-config-layer-override";
import { ArcgisSmartMapping } from "@arcgis/map-config-components/dist/components/arcgis-smart-mapping";
```

(b) side-effect registration import (registers the element, no binding), from `print.tsx`:

```tsx
import "@arcgis/map-components/components/arcgis-scale-bar";
import "@arcgis/map-components/components/arcgis-legend";
import "@arcgis/map-components/components/arcgis-basemap-gallery";
```

(c) loader import (`defineCustomElements` from the library's `dist/loader`), from `layer-edit.tsx`:

```tsx
import { defineCustomElements as defineCommonCustomElements } from "@arcgis/common-components/dist/loader";
import { defineCustomElements as defineMapConfigCustomElements } from "@arcgis/map-config-components/dist/loader";
```

To make these elements type-check inside TSX, the widget adds a JSX intrinsic-typing bridge in `src/runtime/constants/custom-elements.d.ts`:

```ts
import { ArcgisMapConfigLabel } from '@arcgis/map-config-components/dist/components/arcgis-map-config-label';
import { ArcgisSmartMapping } from '@arcgis/map-config-components/dist/components/arcgis-smart-mapping';
// ...

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "arcgis-smart-mapping": React.DetailedHTMLProps<React.HTMLAttributes<HTMLArcgisSmartMappingElement>, ArcgisSmartMapping>;
      "arcgis-map-config-label": React.DetailedHTMLProps<React.HTMLAttributes<ArcgisMapConfigLabel>, ArcgisMapConfigLabel>;
      "arcgis-symbol-picker": React.DetailedHTMLProps<React.HTMLAttributes<ArcgisMapConfigSymbolPicker>, ArcgisMapConfigSymbolPicker>;
      "arcgis-symbol-styler": React.DetailedHTMLProps<React.HTMLAttributes<ArcgisMapConfigSymbolStyler>, ArcgisMapConfigSymbolStyler>;
      "arcgis-layer-override": React.DetailedHTMLProps<React.HTMLAttributes<ArcgisMapConfigLayerOverride>, ArcgisMapConfigLayerOverride>;
    }
  }
}
```

For Calcite, the widget relies on a triple-slash directive at the top of `layer-edit.tsx` to load the React JSX typings for `<calcite-*>` elements:

```tsx
/// <reference types="@esri/calcite-components/types/react" />
```

Both mechanisms only add compile-time typings so the custom elements type-check in TSX; they do not register or load the runtime element code (that is what the side-effect / loader imports in styles (a)-(c) do). (signature approx: `@arcgis/*` component classes, `HTMLArcgis*Element` globals, and the `@esri/calcite-components` React type reference are third-party stencil/lumina typings, not jimu APIs.)

## 3. Runtime + build-time resource paths (the key pattern)

Stencil/Lumina web components fetch their own assets (SVG icons, locale/t9n JSON, symbol resources) at runtime from a configurable base path. The widget wires this in two halves.

BUILD TIME - `copy-files.json` copies each library's shipped `assets` folder into the widget's `dist/runtime/assets`:

```json
[
  {
    "from": "./node_modules/@arcgis/map-config-components/dist/arcgis-map-config-components/assets",
    "to": "./dist/runtime/assets"
  },
  {
    "from": "./node_modules/@arcgis/common-components/dist/cdn/assets",
    "to": "./dist/runtime/assets"
  }
]
```

RUNTIME - `setAssetPaths(fUrl)` in `layer-edit.tsx` takes the widget's runtime `folderUrl`, normalizes it to end with `dist/runtime/`, then points BOTH the pure-ESM path (`setArcgisAssetPath`) and the lazy-ESM path (`defineCustomElements(..., { resourcesUrl })`) at it:

```tsx
import { setArcgisAssetPath as setCommonComponentsAssetPath } from "@arcgis/map-config-components/dist/components";
import { setArcgisAssetPath as setMapConfigComponentsAssetPath } from "@arcgis/map-config-components/dist/components";
import { defineCustomElements as defineCommonCustomElements } from "@arcgis/common-components/dist/loader";
import { defineCustomElements as defineMapConfigCustomElements } from "@arcgis/map-config-components/dist/loader";

function setAssetPaths(fUrl: string) {
  // By default and during dev it is always ../widgets/briefing-tool/dist/runtime/
  // But we can't always use the default convention since during production build
  // paths can change, e.g. it could be ../cdn/0.0.1/widgets/briefing-tool/dist/runtime/

  if (!fUrl) {
    // default path
    fUrl = "../widgets/briefing-tool/dist/runtime/";
  } else {
    // Normalize path so it ends with 'dist/runtime/' exactly once
    fUrl = fUrl.replace(/\\/g, "/");
    if (fUrl.endsWith("dist/runtime/")) {
      // already normalized
    } else if (fUrl.endsWith("dist/runtime")) {
      fUrl += "/";
    } else {
      fUrl = fUrl.replace(/\/+$/, "") + "/dist/runtime/";
    }
  }

  // PURE ESM
  setCommonComponentsAssetPath(fUrl);
  setMapConfigComponentsAssetPath(fUrl);

  // LAZY ESM
  defineCommonCustomElements(window, { resourcesUrl: fUrl });
  defineMapConfigCustomElements(window, { resourcesUrl: fUrl });
  return true;
}
```

It is triggered once per `folderUrl` change, memoized inside the component:

```tsx
const isAssetsSet: boolean = useMemo(() => {
  return setAssetPaths(folderUrl);
}, [folderUrl]);
```

WHY this matters: the components resolve relative asset URLs (for example `assets/smart-mapping/t9n/messages.en.json`) against the base path you set. The in-code comment gives the concrete example - runtime `folderUrl` `https://localhost:3001/experience/../widgets/briefing-tool/` plus `dist/runtime/` plus `assets/smart-mapping/t9n/messages.en.json` must form `https://localhost:3001/widgets/briefing-tool/dist/runtime/assets/smart-mapping/t9n/messages.en.json`. If you do not set the base path to where `copy-files.json` deposited the assets, the components 404 their own SVG/locale/t9n files. The reusable recipe: copy-files (build) plus `setArcgisAssetPath` + `defineCustomElements({ resourcesUrl })` fed from `folderUrl` (runtime).

`folderUrl` source: it is the jimu `WidgetContext.folderUrl` (verified: `WidgetContext.folderUrl: string` in `jimu-core/lib/types/app-config.d.ts` - "Absolute URL points to widget folder, like this: http://.../widgets/abc/"). The widget threads it through its own context in `context.tsx`:

```tsx
// value assembled in WidgetContextProvider
folderUrl: context?.folderUrl,
```

then consumers read it via `useWidgetContext()`:

```tsx
const {
  // ...
  folderUrl,
} = useWidgetContext();
```

## 4. Standalone print document

`src/runtime/assets/print.html` is a self-contained print/export page (used by the html2canvas-based print composition), independent of the ExB-bundled Calcite. Its `<head>` loads Calcite and the ArcGIS map components from the PUBLIC CDN, not from the widget bundle:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>FDT Map Print</title>

    <script type="module" src="https://js.arcgis.com/calcite-components/3.0.3/calcite.esm.js"></script>
    <link rel="stylesheet" href="https://js.arcgis.com/4.32/esri/themes/light/main.css" />
    <script src="https://js.arcgis.com/4.32/"></script>
    <!-- Load Map components from CDN-->
    <script type="module" src="https://js.arcgis.com/map-components/4.32/arcgis-map-components.esm.js"></script>
  </head>
  <!-- ... -->
</html>
```

Because this document is opened as its own browser page for printing/PDF export, it cannot reuse the widget's bundled/registered Calcite; it deliberately pulls Calcite `3.0.3` and the JSAPI `4.32` map components straight from `js.arcgis.com`. Note this is a different Calcite version than the bundled `@esri/calcite-components` `3.2.1` and a different map-components line than the internal `4.33.15` - a print-only surface, not the ExB runtime.

## 5. Lift-into-repo checklist

- Configure internal registry auth: add an `.npmrc` with the scoped `@arcgis:registry=https://olympus.esri.com/artifactory/api/npm/npm-repo/` (plus credentials) before installing.
- Pin component versions to match the repo SDK line; do not carry the `4.33.x` / `1.17.0` pins blindly onto a 1.20 install - re-resolve against the repo's ArcGIS/Calcite versions.
- Reproduce the build-time asset copy: wire a `copy-files.json` equivalent that copies each library's `dist/.../assets` into the widget's `dist/runtime/assets`.
- On mount, call `setArcgisAssetPath(...)` + `defineCustomElements(window, { resourcesUrl })` for each component library, fed from `props.context.folderUrl` (normalized to end with `dist/runtime/`).
- Add the `custom-elements.d.ts` JSX intrinsic-typing bridge and the `/// <reference types="@esri/calcite-components/types/react" />` directive so the elements type-check.
- Normalize Calcite imports to the repo-approved alias/convention (this sample mixes `@esri/calcite-components-react` and a bare `calcite-components` import - reconcile to one approved source).
- Apply repo code-style: always-semicolons, `&&` guard calls, `if` bodies on their own line, plain hyphens only (never em/en dashes) - the sample uses several patterns that violate these.
- Flag the 1.17 drift: re-verify every jimu manager/hook (`WidgetManager`, `appActions`, `getAppStore`, `useWidgetContext` threading) and the `WidgetContext.folderUrl` shape against 1.20 before shipping.

## See also

- [09-demos-complex.md](../09-demos-complex.md) - the `briefing-tool` summary card (overall architecture, wizard flow, context provider, print pipeline).
- [06-third-party-tooling.md](../06-third-party-tooling.md) - `use-assets` (`folderUrl` vs `require`) and `web-worker` (`folderUrl`) patterns that mirror the runtime asset-path approach here.
- Repo memory on `window._*` debug flags and `folderUrl` usage (`/memories/repo/exb-runtime-patterns.md`).
