# Internal / private Esri component libraries in OTB widgets

Several out-of-the-box (OTB) Experience Builder widgets under
`ArcGISExperienceBuilder/client/dist/widgets/` depend on `@arcgis/*` packages that are NOT the
public `@arcgis/core` (JSAPI). These are the same internal-registry family already documented for
the SDK `briefing-tool` sample. This note catalogs which libraries each OTB widget uses, how they
are imported and registered, and the consequences for lifting these patterns into `src/widgets`.

All snippets below are trimmed real source copied verbatim from the gitignored `dist/widgets`
tree. Exact source paths are given above each snippet.

## What these are

- Most are Stencil / Lumina web-component sets (custom elements like `<arcgis-imagery-display-order>`,
  `<arcgis-infographic>`) plus their loaders (`dist/loader` exporting `defineCustomElements`).
- A few are plain helper libraries (TypeScript types, enums, and utility functions) with no custom
  elements - notably `@arcgis/analysis-ui-schema` (types/enums) and `@arcgis/analysis-shared-utils`
  (util functions). These are consumed as normal ES modules, not registered as elements.
- They are published to Esri's INTERNAL Artifactory registry
  (`https://olympus.esri.com/artifactory/api/npm/npm-repo/`), scoped to `@arcgis:`, NOT to public
  npm. This is the same registry the `briefing-tool` sample pins via its own `.npmrc` - see the
  cross-reference below.

## Library catalog

Widget paths are relative to `ArcGISExperienceBuilder/client/dist/widgets/`. "web components" means
the package ships custom elements + a `defineCustomElements` loader; "helper lib" means types/utils
only.

| Library | What it provides | OTB widgets that use it | Import style |
| --- | --- | --- | --- |
| `@arcgis/business-analyst-components` | Web components (`<arcgis-infographic>`, `<arcgis-infographic-workflow>`, `<arcgis-infographic-modal>`, `<arcgis-ba-search>`, `<arcgis-report-list>`, `<ba-app-state>`) + util classes (`ACLUtils`, `GEClient`, `TokenProvider`, `TransportUtil`, `Environments`, `GeocoderClient`) | `ba-infographic` | Deep relative `node_modules/...` dist import + `defineCustomElements` from `.../loader` |
| `@arcgis/imagery-components` | Web components (`<arcgis-imagery-display-order>`, image-collection-explorer elements, processing-template elements) | `arcgis/display-order`, `arcgis/processing-templates`, `arcgis/image-collection-explorer` | Side-effect / loader import `@arcgis/imagery-components/dist/loader` + `defineCustomElements(window, { resourcesUrl })` |
| `@arcgis/analysis-ui-schema` | Helper lib: TS types + enums for analysis tool UI (`AnalysisToolData`, `AnalysisEngine`, `AnalysisToolParam`, etc.) - NOT web components | `arcgis/analysis` | Named `import`/`import type` from bare specifier |
| `@arcgis/analysis-shared-utils` | Helper lib: util functions + types (`getAnalysisLayers`, `formatMessage`, `getPortalHelpMap`, `AnalysisJobStatus`, etc.) - NOT web components | `arcgis/analysis` | Named `import` / dynamic `import()` from bare specifier |
| `@arcgis/analysis-components` | Web components + CSS for analysis | `arcgis/analysis` | CSS side-effect import + dynamic `import('.../dist/loader')` |
| `@arcgis/analysis-tool-app` | Web-component "tool app" container + CSS | `arcgis/analysis` | CSS side-effect import + dynamic `import('.../dist/loader')` + `import type` |
| `@arcgis/analysis-core` | Helper lib types for analysis | `arcgis/analysis` | `import type * as AnalysisCoreType` |
| `@arcgis/map-config-components` | Web components (map config) | `arcgis/analysis` | Dynamic `import('.../dist/loader')` |
| `@arcgis/common-components` | Web components (shared/common) | `arcgis/analysis` | Dynamic `import('.../dist/loader')` |
| `@arcgis/app-components` | Web components (app-level) | `arcgis/analysis` | Dynamic `import('.../dist/loader')` |
| `@arcgis/raster-function-editor` (aka `arcgis-raster-function-editor`) | Web components (raster function editor) | `arcgis/analysis` | Dynamic `import('.../dist/loader')` |
| `@arcgis/map-components` | Web components / event types for maps (UNVERIFIED whether internal-only vs public npm) | `arcgis/arcgis-map`, `common/edit` | `import type` only in these OTB widgets (e.g. `ArcgisLocateCustomEvent`, `ArcgisPasteCustomEvent`) |
| `@arcgis/charts-components`, `@arcgis/charts-components-react` | Web components / React wrappers for charts | `common/chart` (UNVERIFIED - only matched under `common/chart/tests/**`; confirm runtime `src` usage before relying on this) | Test-file imports only in the scan |

UNVERIFIED + file for anyone extending this: whether `@arcgis/map-components` and the analysis
`*-components` packages are strictly internal-registry-only or also published to public npm can
change per release; confirm against the widget's own `package-lock.json` / `.npmrc` if present.

## Import + registration styles

### Deep dist import (business-analyst-components)

`ba-infographic` reaches directly into the package's built `node_modules` tree (both the public
component barrel and the internal `stencil-components` collection) rather than a top-level entry.

Source: `ArcGISExperienceBuilder/client/dist/widgets/ba-infographic/src/runtime/widget.tsx`

```tsx
import { ArcgisInfographic, ArcgisInfographicWorkflow, ArcgisInfographicModal } from '../../node_modules/@arcgis/business-analyst-components/dist/components'
import { defineCustomElements } from '../../node_modules/@arcgis/business-analyst-components/dist/stencil-components/loader'
import { ACLUtils } from '../../node_modules/@arcgis/business-analyst-components/dist/stencil-components/dist/collection/ACLUtils'
import { GEClient } from '../../node_modules/@arcgis/business-analyst-components/dist/stencil-components/dist/collection/util/mobile/GEClient'
import type { DrivetimeOptions } from '../../node_modules/@arcgis/business-analyst-components/dist/stencil-components/dist/collection/base-util'
import 'calcite-components' // Needed to pull calcite in for ArcGis* components
import BaAppState from '../ba-app-state.js'
```

The settings panel additionally imports the OAuth `TokenProvider` helper from the same collection.

Source: `ArcGISExperienceBuilder/client/dist/widgets/ba-infographic/src/setting/setting.tsx`

```tsx
import { ArcgisBaSearch, ArcgisReportList } from '../../node_modules/@arcgis/business-analyst-components/dist/components'
import { defineCustomElements } from '../../node_modules/@arcgis/business-analyst-components/dist/stencil-components/loader'
import { GEClient } from '../../node_modules/@arcgis/business-analyst-components/dist/stencil-components/dist/collection/util/mobile/GEClient'
import { TokenProvider } from '../../node_modules/@arcgis/business-analyst-components/dist/stencil-components/dist/collection/util/mobile/TokenProvider'
```

`ba-app-state.js` (a small local shim) declares a `<ba-app-state>` HTMLElement that these components
share for cross-widget BA state; the widget/setting register custom elements in their constructors.

Source: `ArcGISExperienceBuilder/client/dist/widgets/ba-infographic/src/runtime/widget.tsx`

```tsx
try {
  defineCustomElements( window )
} catch ( error ) {
  pWinSt.warn( 'Failed to define business analyst custom elements:', error )
}
```

Note: `ba-infographic` calls `defineCustomElements( window )` with NO `resourcesUrl` (no explicit
asset-path override); it relies on the loader's default resource resolution. OAuth token flow for
the BA services is a separate concern wired in `runtime/oauth-util.ts` via `@arcgis/core/identity`
(IdentityManager / OAuthInfo), then handed to the BA util classes (`TransportUtil.setToken(...)`,
`TokenProvider.setToken(...)`).

Source: `ArcGISExperienceBuilder/client/dist/widgets/ba-infographic/src/setting/setting.tsx`

```tsx
const token = this.getToken()
TokenProvider.setToken( username, token )
```

### Side-effect / loader registration import (imagery-components)

The imagery widgets import the loader from the package's public `dist/loader` subpath and register
on mount. `processing-templates` does it as a module side effect; `display-order` does it inside a
React effect keyed on `folderUrl`.

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/processing-templates/src/runtime/components/imagery-components.ts`

```ts
import 'calcite-components'
import { defineCustomElements } from '@arcgis/imagery-components/dist/loader'
import { getImageryComponentsAssetsPath } from '../../utils'
defineCustomElements(window, { resourcesUrl: getImageryComponentsAssetsPath() })
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/display-order/src/runtime/components/imagery-display-order.tsx`

```tsx
import { defineCustomElements } from '@arcgis/imagery-components/dist/loader'
import { getImageryComponentsAssetsPath } from '../../utils'
// ...
React.useEffect(() => {
  defineCustomElements(window, { resourcesUrl: getImageryComponentsAssetsPath(folderUrl) })
  setHasComponentDefined(true)
}, [folderUrl])
// ...
{hasComponentDefined ? <arcgis-imagery-display-order layer={currentLayer} panelHeading="" hideButtons={true} /> : <Loading type={LoadingType.Secondary} />}
```

### defineCustomElements loader for multiple internal packages (analysis)

`arcgis/analysis` lazily loads SIX internal web-component packages in parallel and registers each
with its own `resourcesUrl`. Order matters (comment in source: map-config/common must be defined
before app-components because they may declare the same elements).

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/analysis/src/runtime/widget.tsx`

```tsx
Promise.allSettled([
  import('@arcgis/map-config-components/dist/loader'),
  import('@arcgis/common-components/dist/loader'),
  import('@arcgis/app-components/dist/loader'),
  import('@arcgis/arcgis-raster-function-editor/dist/loader'),
  import('@arcgis/analysis-components/dist/loader'),
  import('@arcgis/analysis-tool-app/dist/loader')
]).then((resArr) => {
  // ... map to each package's defineCustomElements, then call with resourcesUrl (see asset paths below)
})
```

The analysis helper libs are imported as ordinary modules (types + functions), which is what makes
them "helper libs" rather than web-component sets.

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/analysis/src/config.ts`

```ts
import type { AnalysisHistoryItem, AnalysisGPJobStatus, SerializedHistoryItem as ComponentSerializedHistoryItem } from '@arcgis/analysis-shared-utils'
import type { AnalysisToolParam, AnalysisToolData, AnalysisToolDataItem, AnalysisToolInfo, AnalysisEngine } from '@arcgis/analysis-ui-schema'
```

## Runtime asset paths

Unlike `briefing-tool` (which uses `setArcgisAssetPath` + `defineCustomElements({ resourcesUrl })`
fed from `folderUrl`), the OTB widgets here rely ONLY on the lazy-ESM `defineCustomElements(...,
{ resourcesUrl })` path (no separate pure-ESM `setArcgisAssetPath` call), and they build the
`resourcesUrl` from the widget folder URL.

- `ba-infographic`: no asset-path override (`defineCustomElements(window)` only).
- Imagery widgets build the path from the widget `folderUrl` / widget URL.

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/display-order/src/utils.ts`

```ts
export const getImageryComponentsAssetsPath = (widgetUrl: string): string => {
  return `${widgetUrl}dist/imagery-components-assets/assets`
}
```

- `analysis` computes a widget URL from `window.location` + the ExB fixed root path, then appends a
  per-package assets folder.

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/analysis/src/utils/shared-utils.ts`

```ts
export function getAssetsPathByFolderName (folderName: string) {
  const widgetUrl = `${window.location.protocol}//${window.location.host}${urlUtils.getFixedRootPath()}widgets/arcgis/analysis/`
  return `${widgetUrl}dist/assets/${folderName}/`
}
export function getAnalysisAssetPath () {
  return getAssetsPathByFolderName('arcgis-analysis-assets')
}
```

Source: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/analysis/src/runtime/widget.tsx`

```tsx
mapConfigComponentsDefineCustomElements(window, { resourcesUrl: getAssetsPathByFolderName('arcgis-map-config-components') })
commonComponentsDefineCustomElements(window, { resourcesUrl: getAssetsPathByFolderName('arcgis-common-components') })
defineCustomElements(window, { resourcesUrl: getAssetsPathByFolderName('arcgis-app-assets') })
arcgisRasterFunctionEditorDefineCustomElements(window, { resourcesUrl: getAssetsPathByFolderName('arcgis-raster-function-editor-assets') })
analysisToolDefineCustomElements(window, { resourcesUrl: getAnalysisAssetPath() })
analysisComponentsDefineCustomElements(window, { resourcesUrl: getAnalysisAssetPath() })
```

Compared to the `briefing-tool` recipe: the asset-path intent is the same (point each component
library at its own copied assets so the Stencil bundle does not 404 its SVG/locale/t9n files), but
OTB widgets skip the pure-ESM `setArcgisAssetPath` half and drive `resourcesUrl` from the widget
URL instead of a normalized `dist/runtime/` `folderUrl`.

## Consequence for custom widgets

- Building or reinstalling any of these OTB widgets requires authenticated access to Esri's internal
  Artifactory (`@arcgis:registry=https://olympus.esri.com/artifactory/api/npm/npm-repo/`). Without
  those credentials, `npm install` cannot resolve `@arcgis/business-analyst-components`,
  `@arcgis/imagery-components`, `@arcgis/analysis-*`, etc.
- This is exactly why some OTB widgets CANNOT be rebuilt from source in this repo without
  Esri-internal access - they ship as prebuilt `dist` and their `@arcgis/*` deps are not on public
  npm.
- Versions are pinned via each widget's own `package-lock.json` against the internal registry; do
  not assume a public-npm version resolves the same artifact.
- If you lift one of these patterns into `src/widgets`, you must either (a) obtain internal registry
  auth and pin the same versions, or (b) avoid the internal package entirely and reimplement with
  public building blocks (JSAPI `@arcgis/core`, Calcite, jimu-ui). Prefer (b) for anything that must
  build in a clean/CI environment.
- Registration is per-widget and idempotent-guarded (try/catch or a `hasComponentDefined` flag)
  because `defineCustomElements` throws if an element name is already registered by another widget
  instance on the same page.

## Cross-references

- SDK briefing-tool internal registry + asset-path deep dive: [../../sdk-samples/briefing-tool/internal-registry-and-assets.md](../../sdk-samples/briefing-tool/internal-registry-and-assets.md)
- ExB guide - Use third-party libraries: https://developers.arcgis.com/experience-builder/guide/third-party-libraries/
- phase1-inventory "Internal Esri component libraries" note: [../phase1-inventory.md](../phase1-inventory.md)
