# SDK Samples - Web Components

Five sdk-resources samples (base: `ArcGISExperienceBuilder/sdk-resources/widgets/web-component-widgets/`) show how to use native web components (custom elements) inside an ExB widget instead of `@esri/*-components-react` React wrappers. They form an evolution: `use-calcite-components` (raw Calcite elements + a config-driven slider) -> `use-map-components` (dual import path, ref-based `.view` assignment, the ExB 1.15-1.18 style) -> `use-web-components-19` (React 19 property-binding in JSX, no refs, current on 1.20); plus `use-coding-components` (Arcade editor configured via ref + `useEffect`) and `web-component` (author your OWN custom element). Repo convention prefers `@esri/calcite-components-react` wrappers (see repo memory: native `<calcite-*>` are not in `JSX.IntrinsicElements` under the repo `src/tsconfig.json`); these samples are the raw-element alternative, which relies on JSX intrinsic typings shipped by the aliased `calcite-components` / `arcgis-map-components` entries.

Key resolution fact (from `ArcGISExperienceBuilder/client/webpack/webpack.common.js`): the bare specifiers `calcite-components`, `arcgis-map-components`, `arcgis-coding-components` are webpack aliases to `jimu-ui/{calcite-components,arcgis-map-components,arcgis-coding-components}`, and `@arcgis/map-components` / `@esri/calcite-components` are externalized to the SAME shared SystemJS entry - so `import { ArcgisLayerList } from 'arcgis-map-components'` and `import { ArcgisLegend } from '@arcgis/map-components-react'` load the identical registered elements (never bundled into the widget).

### use-calcite-components · Verified vs 1.20: yes
Raw `<calcite-*>` custom elements in JSX, driven by widget config + React state.

- **Source:** `use-calcite-components/src/runtime/widget.tsx`, `use-calcite-components/src/config.ts`, `manifest.json`, `config.json` (no setting panel)
- **Manifest reqs:** no `dependency` (does NOT need `jimu-arcgis`); `exbVersion` `1.20.0`; no extra `package.json` in the sample (Calcite comes from the aliased `calcite-components` entry)
- **Config shape:**
  ```ts
  export interface Config { text?: string }
  export type IMConfig = ImmutableObject<Config>
  ```
  (`config.json` default: `{ "text": "calcite" }`)
- **Key imports (exact):**
  ```tsx
  import { React, type AllWidgetProps, } from 'jimu-core'
  import type { IMConfig } from '../config'
  import 'calcite-components'
  ```
- **Runtime usage:** side-effect import registers the elements; JSX uses them directly with property binding (`value={sliderValue}`) and a kebab-cased native event prop (`oncalciteSliderInput`):
  ```tsx
  const [sliderValue, setSliderValue] = React.useState(50)
  // ...
  <calcite-button>Test</calcite-button>
  <calcite-icon icon="banana" />
  <calcite-slider
    min={1} max={100} value={sliderValue} step={1}
    oncalciteSliderInput={(e) => {
      const value = Array.isArray(e.target.value) ? e.target.value[0] : e.target.value
      setSliderValue(Number(value))
    }} />
  <p>The slider currently has a value of {sliderValue}</p>
  ```
- **Lifecycle/timing:** `import 'calcite-components'` at module top registers the custom elements before first render; props/state bind reactively via JSX on every render. No `JimuMapView` involved.
- **Cleanup/teardown:** none needed (no refs, no view handles, no listeners added imperatively)
- **Critical gotchas:** `e.target.value` on `calcite-slider` may be a number OR an array (range slider) - the code guards with `Array.isArray(...)`. Native event props are lowercase `oncalcite<Event>` (NOT React camelCase `onCalcite...` used by the `-react` wrappers). The side-effect import MUST be at module top so elements register before JSX renders. Uses `props.config.text` directly (Immutable config).
- **When to use which:** pick this when you want plain Calcite UI controls (button/slider/icon) with zero map dependency and are fine with raw custom elements.
- **Lift-into-repo:** per repo convention, rewrite with `@esri/calcite-components-react` wrappers (`CalciteSlider`, `CalciteButton`, `CalciteIcon`) and camelCase `onCalciteSliderInput`; the array-value guard still applies to a range slider.
- **See also:** `use-web-components-19` (same raw-element approach + a map), jimu-ui-components skill (themed wrapper alternatives)

### use-map-components · Verified vs 1.20: check
Dual import + ref-based `.view` assignment - the ExB 1.15-1.18 pattern for ArcGIS map components.

- **Source:** `use-map-components/src/runtime/widget.tsx`, `use-map-components/src/setting/setting.tsx`, `manifest.json`, `config.json` (empty)
- **Manifest reqs:** `"dependency": "jimu-arcgis"` (needs the map bridge); `exbVersion` `1.20.0`; no extra `package.json` (components come from the shared `arcgis-map-components` entry). README header still says 1.19 but manifest is 1.20.0.
- **Config shape:** none (uses `AllWidgetProps<{ [key: string]: never }>`; only `useMapWidgetIds`)
- **Key imports (exact):**
  ```tsx
  import { React, type AllWidgetProps } from 'jimu-core'
  import { type JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
  import { ArcgisLayerList } from 'arcgis-map-components'
  import { ArcgisLegend } from '@arcgis/map-components-react'
  ```
  (Deliberately shows BOTH import styles resolving to the same registered elements.)
- **Runtime usage:** hold a ref to each element; imperatively assign the JSAPI `MapView` to the element's `.view` property when the active view changes:
  ```tsx
  const legendRef = React.useRef(null)
  const layerListRef = React.useRef(null)
  const onActiveViewChange = (activeView: JimuMapView) => {
    if (!activeView || !legendRef.current || !layerListRef.current) return
    legendRef.current.view = activeView.view
    layerListRef.current.view = activeView.view
  }
  // ...
  <JimuMapViewComponent onActiveViewChange={onActiveViewChange} useMapWidgetId={props.useMapWidgetIds[0]} />
  <ArcgisLegend ref={legendRef}></ArcgisLegend>
  <ArcgisLayerList ref={layerListRef}></ArcgisLayerList>
  ```
- **Lifecycle/timing:** guards on `props.useMapWidgetIds` (renders "Please select a map widget" if empty); `.view` is assigned in `JimuMapViewComponent.onActiveViewChange` AFTER the view is ready and refs are attached.
- **Cleanup/teardown:** none in the sample (view assignment is idempotent; a stricter version would null `ref.current.view` on unmount)
- **Critical gotchas:** ref-based `.view =` assignment is the OLD pattern - superseded by JSX property binding in `use-web-components-19`. Both import paths (`arcgis-map-components` alias and `@arcgis/map-components-react`) resolve to the SAME shared entry, so the components are never double-bundled. `ref.current` may be null before mount - the handler guards for it.
- **When to use which:** use this on older ExB (1.15-1.18) or when a component exposes only imperative properties; otherwise prefer property-binding (next card).
- **Lift-into-repo:** prefer the React 19 property-binding form (`view={activeView?.view}`) from `use-web-components-19`; keep `JimuMapViewComponent` + `onActiveViewChange` to source the view.
- **See also:** `use-web-components-19`, `use-calcite-components`, jimu-framework-apis skill (JimuMapViewComponent)

### use-web-components-19 · Verified vs 1.20: yes
React 19 property-binding: pass the `MapView` straight into JSX, no refs.

- **Source:** `use-web-components-19/src/runtime/widget.tsx`, `use-web-components-19/src/setting/setting.tsx`, `manifest.json`, `config.json` (`{ "exampleConfigProperty": "test" }`, unused by runtime)
- **Manifest reqs:** `"dependency": "jimu-arcgis"`; `exbVersion` `1.20.0`; no extra `package.json`
- **Config shape:** none used at runtime (`AllWidgetProps<object>`)
- **Key imports (exact):**
  ```tsx
  import { React, type AllWidgetProps } from 'jimu-core'
  import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
  import 'calcite-components'
  import 'arcgis-map-components'
  ```
- **Runtime usage:** store the active view in state, then BIND it as a JSX property on the native element (`view={activeView?.view}`) - no ref, no imperative assignment:
  ```tsx
  const [activeView, setActiveView] = React.useState<JimuMapView | null>(null)
  const onActiveViewChange = (activeView: JimuMapView) => {
    if (!activeView) return
    setActiveView(activeView)
  }
  // ...
  <calcite-button appearance="outline" scale="m" icon-start="home">
    This is a calcite button
  </calcite-button>
  <JimuMapViewComponent onActiveViewChange={onActiveViewChange} useMapWidgetId={props.useMapWidgetIds[0]} />
  <arcgis-legend view={activeView?.view}></arcgis-legend>
  ```
- **Lifecycle/timing:** guards on `props.useMapWidgetIds`; `activeView` set in `onActiveViewChange`; React 19 reactively writes the `view` PROPERTY (not attribute) to `<arcgis-legend>` whenever state changes - `undefined` until the view is ready.
- **Cleanup/teardown:** none needed - React owns the property binding; when `activeView` is null the prop is `undefined`
- **Critical gotchas:** React 19 removes the need for refs - it writes non-string values to custom-element PROPERTIES automatically (older React set them as attributes, forcing the ref pattern). Both side-effect imports at module top so elements register before render. Native attribute props stay kebab-cased (`icon-start`, `appearance`, `scale`). This is the CURRENT recommended pattern on 1.20.
- **When to use which:** default choice on ExB 1.20 (React 19) for any ArcGIS/Calcite web component that takes object properties like `view`.
- **Lift-into-repo:** this IS the target pattern; per repo convention swap raw `<calcite-button>` for `CalciteButton` from `@esri/calcite-components-react`, but keep JSX property-binding for `<arcgis-legend view={...}>` (no wrapper needed).
- **See also:** `use-map-components` (the ref-based predecessor), `use-calcite-components`

### use-coding-components · Verified vs 1.20: yes
Arcgis Arcade editor configured imperatively via ref + `useEffect`, fed by a data source record.

- **Source:** `use-coding-components/src/runtime/widget.tsx`, `use-coding-components/src/setting/setting.tsx`, `manifest.json`, `config.json` (empty)
- **Manifest reqs:** `"dependency": "jimu-arcgis"`; `exbVersion` `1.20.0`; settings uses a FeatureLayer data source
- **Config shape:** none (`AllWidgetProps<{ [key: string]: never }>`); consumes `props.useDataSources`
- **Key imports (exact):**
  ```tsx
  import { DataSourceComponent, type FeatureLayerDataSource, React, type AllWidgetProps, DataSourceManager, type IMDataSourceInfo, type FeatureDataRecord, type ArcGISQueryParams } from 'jimu-core'
  import { ArcgisArcadeEditor } from 'arcgis-coding-components'
  ```
  Settings:
  ```tsx
  import { React, Immutable, type UseDataSource, DataSourceTypes } from 'jimu-core'
  import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
  // <DataSourceSelector types={Immutable([DataSourceTypes.FeatureLayer])} ... />
  ```
- **Runtime usage:** the Arcade editor exposes NON-string object properties (`profile`, `testData`) that must be assigned to `ref.current` inside `useEffect` once a feature is available:
  ```tsx
  const ref = React.useRef(null)
  const [feature, setFeature] = React.useState(null)
  const useDs = props.useDataSources?.[0]
  React.useEffect(() => {
    if (!ref.current || !feature) return
    const arcadeEditorElt = ref.current
    arcadeEditorElt.profile = {
      bundles: ['core', 'dataAccess', 'geometry', 'portal'],
      variables: [{ name: '$feature', type: 'feature', description: '...',
        definition: (DataSourceManager.getInstance().getDataSource(useDs.dataSourceId) as FeatureLayerDataSource).layer }]
    }
    arcadeEditorElt.testData = { profileVariableInstances: { $feature: feature }, spatialReference: { wkid: 3857 } }
  }, [feature, useDs])
  // ...
  <ArcgisArcadeEditor ref={ref}/>
  <DataSourceComponent useDataSource={useDs} query={{ outFields: ['*'] } as ArcGISQueryParams}
    widgetId={props.id} onDataSourceInfoChange={onInfoChange}/>
  ```
- **Lifecycle/timing:** `DataSourceComponent.onDataSourceInfoChange` fires when records load; the handler pulls `ds.getRecords()[0].feature` into state; the `useEffect` (deps `[feature, useDs]`) then assigns `profile`/`testData` to the element once the ref AND feature exist.
- **Cleanup/teardown:** none in the sample (assignments overwrite on each run; no listeners to remove)
- **Critical gotchas:** ref-based assignment is used here (NOT property binding) because `profile`/`testData` are complex objects wired after async data load, guarded by `useEffect`. `definition` needs the LIVE `FeatureLayerDataSource.layer` (cast `as FeatureLayerDataSource`). `onDataSourceInfoChange` (not a query-status callback) is the trigger. `spatialReference.wkid` is hardcoded `3857`.
- **When to use which:** pick this when a web component is configured through rich object properties available only after a data source resolves.
- **Lift-into-repo:** keep the `useEffect`-after-data pattern; `ArcgisArcadeEditor` has no `-react` wrapper concern (assign object props via ref or React 19 property binding). Add a cleanup only if you attach editor event listeners.
- **See also:** jimu-framework-apis skill (DataSourceComponent, DataSourceManager), `use-map-components`

### web-component · Verified vs 1.20: yes
Author your OWN custom element and drop it into a widget.

- **Source:** `web-component/src/runtime/widget.tsx`, `web-component/src/runtime/my-component.js` (the custom element), `manifest.json`, `src/runtime/translations/` (no config.json)
- **Manifest reqs:** no `dependency`; `exbVersion` `1.20.0`; nothing extra (native `HTMLElement`, no ArcGIS/Calcite)
- **Config shape:** none (`AllWidgetProps<unknown>`)
- **Key imports (exact):**
  ```tsx
  import { type AllWidgetProps, React } from 'jimu-core'
  import './my-component'
  ```
  Custom element (`my-component.js` - plain JS, license header trimmed):
  ```js
  class MyComponent extends HTMLElement {
    constructor () {
      super()
      const shadowRoot = this.attachShadow({ mode: 'open' })
      shadowRoot.innerHTML = 'My first component'
    }
  }
  window.customElements.define('my-component', MyComponent)
  ```
- **Runtime usage:** side-effect import runs `customElements.define(...)`, then the tag is used directly in JSX:
  ```tsx
  export default function Widget (props: AllWidgetProps<unknown>) {
    return <div className="widget-use-web-component jimu-widget" style={{ overflow: 'auto' }}>
      <div>This widget demonstrates how to use a web component.</div>
      <my-component></my-component>
    </div>
  }
  ```
- **Lifecycle/timing:** `import './my-component'` at module top registers `my-component` (via `customElements.define`) before the widget renders; the element builds its shadow DOM in its own `constructor`.
- **Cleanup/teardown:** none needed (registration is global/one-time; the element self-manages its shadow root)
- **Critical gotchas:** the custom-element file MUST be `.js`, NOT `.ts` - ExB's transpile/SystemJS output breaks the native `class extends HTMLElement` (transpiled classes cannot extend built-in `HTMLElement`). Register with `window.customElements.define` at module load. `customElements.define` throws if the tag name is already registered, so import each element file exactly once.
- **When to use which:** pick this when you need a bespoke encapsulated element (shadow DOM) not provided by Calcite/ArcGIS components.
- **Lift-into-repo:** keep the element in a `.js` file and side-effect import it; give the tag a unique, namespaced name to avoid `define` collisions; for typed props consider a thin React 19 property-binding wrapper.
- **See also:** `use-web-components-19` (consuming vendor elements), MDN Custom Elements

---

## When to use which (quick contrast on 1.20)

| Need | Use sample | Approach |
| --- | --- | --- |
| Plain Calcite controls, no map | `use-calcite-components` | raw element + `oncalcite*` event + state binding |
| ArcGIS map component, older ExB (1.15-1.18) | `use-map-components` | `ref.current.view = activeView.view` |
| ArcGIS map component, current (1.20 / React 19) | `use-web-components-19` | JSX property binding `view={activeView?.view}` |
| Web component needing rich object props after async data | `use-coding-components` | ref + `useEffect` after data source loads |
| Your own encapsulated element | `web-component` | `.js` custom element + `customElements.define` |

Repo default (per memory): prefer `@esri/calcite-components-react` wrappers with camelCase `onCalcite*` handlers, and the React 19 property-binding form for ArcGIS map components. Native `<calcite-*>` tags require the JSX intrinsic typings shipped by the aliased entries; the repo `src/tsconfig.json` does NOT expose them, so wrappers are the safer lift.

Unverified signatures/imports: none. The custom-element event/property signatures (`calcite-slider` value, `arcgis-legend`/`ArcgisArcadeEditor` `.view`/`.profile`/`.testData`) come from the aliased `jimu-ui/{calcite-components,arcgis-map-components,arcgis-coding-components}` entries whose `.d.ts` were not opened here - treat those member types as (signature approx).
