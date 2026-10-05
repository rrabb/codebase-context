# SDK Samples - Baseline Demos & Complex References

Source-grounded reference cards for the baseline documentation demos (`demo`, `demo-function`) and the two richest multi-file reference widgets (`bmt-layout-manager`, `briefing-tool`) that ship under `ArcGISExperienceBuilder/sdk-resources/widgets/` (read-only vendor teaching samples). Each card is extracted from the ACTUAL `src`, not the README. Signatures were verified against the gitignored `ArcGISExperienceBuilder/client/**/*.d.ts` (read with `includeIgnoredFiles`) for 1.20.0; anything not fully checkable is marked `(signature approx)`.

> [!WARNING]
> `bmt-layout-manager` and `briefing-tool` are **exbVersion 1.17.0** - they predate 1.20 and were authored outside the Esri R&D pipeline. Do NOT copy them verbatim. Validate every import path and API signature against the local 1.20 `.d.ts` first: 1.17-era code drifts on Calcite import aliases (`calcite-components` vs `@esri/calcite-components-react`), React 18 vs 19 web-component binding, and JSAPI package layout. `briefing-tool` additionally pins `@arcgis/*-components@4.33` + `html2canvas` and bundles assets via `copy-files.json`.

---

### demo · Verified vs 1.20: yes
The canonical baseline **class** widget - shows the four ExB styling mechanisms (Emotion `css`, `styled`, theme tokens, raw `<style>`), i18n, and dumps `this.props` into a table.

- **Source:** `demo/src/runtime/widget.tsx` (class), `demo/src/setting/setting.tsx` (class), `demo/src/config.ts`, `demo/src/runtime/translations/default.ts`, `demo/src/setting/translations/default.ts`, `demo/manifest.json`, `demo/config.json`.
- **Manifest reqs:** `type: "widget"`; `version`/`exbVersion` `1.20.0`; `translatedLocales: ["en", "zh-cn"]`; `defaultSize {800,500}`; empty `properties`. No `dependency`.
- **Config shape:**
  ```ts
  export interface Config { p1: string; p2: string }
  export type IMConfig = ImmutableObject<Config>
  ```
  `config.json` seeds `{ "p1": "abc", "p2": "123" }`.
- **Key APIs (exact):**
  - `AllWidgetProps<T> = WidgetProps & WidgetInjectedProps<T>` (from `jimu-core`)
  - `css` and `jsx` (Emotion) from `jimu-core`; `styled` from `jimu-theme`
  - `<FormattedMessage id defaultMessage />` + `this.props.intl.formatMessage({ id, defaultMessage })`
  - `this.props.theme.sys.color.*` tokens (e.g. `theme.sys.color.primary.light`)
- **Builder side (setting.tsx):** Two `<input>` fields; each handler writes back via immutable `set`:
  ```tsx
  onP1Change = (evt: React.FormEvent<HTMLInputElement>) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('p1', evt.currentTarget.value)
    })
  }
  ```
- **Runtime side (widget.tsx):** `class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, any>`; defines styles inside `render()` and iterates `Object.keys(this.props)` into `<tr>` rows.
  ```tsx
  export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, any> {
    nls = (id: keyof typeof defaultMessages) =>
      this.props.intl ? this.props.intl.formatMessage({ id, defaultMessage: defaultMessages[id] }) : id
    render () {
      const styleLiteral = css`color: ${this.props.theme.sys.color.error.light}; font-size: 1.25rem;`
      const StyledBSButton = styled(Button)`background-color: hotpink !important; ...`
      // ... builds propsTr from Object.keys(this.props)
      return <div className="widget-demo jimu-widget" style={{ overflow: 'auto' }}>{/* Tabs + tables */}</div>
    }
  }
  ```
- **Lifecycle/timing:** Pure render; no data source, no map, no `mapExtraStateProps`. All state comes from injected props.
- **Cleanup/teardown:** none needed.
- **Critical gotchas:** Requires the `/** @jsx jsx */` capability - here it imports `css, jsx` from `jimu-core` and relies on the ExB build's automatic Emotion pragma. `styled(Button)` needs `!important` to override Bootstrap component styles. Class widget reads props via `this.props`; contrast `demo-function`.
- **Lift-into-repo:** Fine as a styling/i18n reference. Repo code-style (see `.github/instructions/code-style.instructions.md`) wants always-semicolons and `&&` guard calls - this sample omits semicolons, so normalize on paste.
- **See also:** paired `demo-function` (below); repo `src/widgets/simple`, `src/widgets/branch-version-editor`; `references/widget-patterns.md`.

---

### demo-function · Verified vs 1.20: yes
The baseline **function** widget - same config as `demo` but demonstrates a functional component plus `mapExtraStateProps` to pull `locale` out of the Redux store.

- **Source:** `demo-function/src/runtime/widget.tsx` (function), `demo-function/src/setting/setting.tsx` (function), `demo-function/src/config.ts`, translations, `demo-function/manifest.json`, `demo-function/config.json`.
- **Manifest reqs:** identical to `demo` (`name: "demo-function"`, `label: "Demo (Function)"`, `1.20.0`, `translatedLocales ["en","zh-cn"]`, size `{800,500}`).
- **Config shape:** identical to `demo` (`{ p1: string; p2: string }`).
- **Key APIs (exact):**
  - `AllWidgetProps<IMConfig>` intersected with a local `ExtraProps` interface
  - `Widget.mapExtraStateProps: (state: IMState, ownProps: Partial<AllWidgetProps<any>>) => any` (static on the function; from `base-widget.d.ts`)
  - `state.appContext.locale` (source of the injected `locale`)
  - `<FormattedMessage id defaultMessage />`
- **Builder side (setting.tsx):** Same two-field form as `demo`, written as a function component with `props.onSettingChange` closures (`onP1Change`/`onP2Change`).
- **Runtime side (widget.tsx):** Function component; extra store-derived prop injected by the static `mapExtraStateProps`:
  ```tsx
  interface ExtraProps { locale: string }

  export default function Widget (props: AllWidgetProps<IMConfig> & ExtraProps) {
    return <div className="widget-demo-function jimu-widget" style={{ overflow: 'auto' }}>
      <div>config: {JSON.stringify(props.config)}</div>
      <div>locale: {props.locale}</div>
      <div>i18n: <FormattedMessage id="str1" defaultMessage={defaultMessage.str1} /></div>
    </div>
  }

  Widget.mapExtraStateProps = (state: IMState, ownProps: AllWidgetProps<IMConfig>): ExtraProps => ({
    locale: state.appContext.locale
  })
  ```
- **Lifecycle/timing:** `mapExtraStateProps` runs on every store change and merges its return into the widget's props BEFORE render - this is how a widget subscribes to global Redux state without wiring `connect` itself. It is a static assigned to the function object (works for both function and class widgets).
- **Cleanup/teardown:** none needed.
- **Critical gotchas:** The ONLY structural difference from `demo` is function-vs-class + `mapExtraStateProps`. Function widgets cannot use `this.props`; read `props` and hooks instead. `mapExtraStateProps` must be a pure selector - keep it cheap, it runs on every state change.
- **Lift-into-repo:** Preferred starting shape for new repo widgets (function + hooks). Use `mapExtraStateProps` only for genuinely global state (locale, user); prefer `DataSourceComponent`/`JimuMapViewComponent` for data/map.
- **See also:** paired `demo` (above); `references/widget-patterns.md` (function-widget + `mapExtraStateProps` section); repo `src/widgets/simple`.

---

### bmt-layout-manager · Verified vs 1.20: 1.17 - validate
A deliberately **inert** widget - renders a single empty `<div>` whose `id` is a well-known mounting point; ALL logic lives elsewhere (`briefing-tool` portals its `LayoutManager` into this div). Teaches the "DOM bridge / mounting-point" pattern.

- **Source:** `bmt-layout-manager/src/runtime/widget.tsx` (8 lines), `bmt-layout-manager/src/config.ts`, `bmt-layout-manager/manifest.json`, `bmt-layout-manager/config.json`. No setting, no translations.
- **Manifest reqs:** `version`/`exbVersion` **`1.17.0`**; `translatedLocales: ["en"]`; size `{800,500}`; empty `properties`; no `dependency`.
- **Config shape:**
  ```ts
  export interface Config { layoutManagerElementId: string }
  export type IMConfig = ImmutableObject<Config>   // NOTE: imports ImmutableObject from 'seamless-immutable', not 'jimu-core'
  ```
  `config.json` seeds `{ "layoutManagerElementId": "bmt_layout_manager" }`.
- **Key APIs (exact):** `AllWidgetProps<IMConfig>` only. No jimu managers, no data source, no map.
- **Builder side:** no setting.
- **Runtime side (widget.tsx):** the entire widget:
  ```tsx
  import { React, type AllWidgetProps } from "jimu-core";
  import { type IMConfig } from "../config";

  const Widget = (props: AllWidgetProps<IMConfig>) => {
    return <div id={props.config.layoutManagerElementId} className="w-100 h-100" />;
  };

  export default Widget;
  ```
- **Lifecycle/timing:** Mounts an empty container into the app DOM. It does nothing else - a separate widget (`briefing-tool`) uses a `MutationObserver` to detect this `id` appearing in the DOM and then `createPortal`s content into it.
- **Cleanup/teardown:** none needed (the consumer disconnects its own observer).
- **Critical gotchas:** Inert by design - if you expect it to "do" something, you are reading the wrong widget. The `id` is a hard-coded contract shared with `briefing-tool.config.layoutManagerElementId`; both must match. Imports `ImmutableObject` from `seamless-immutable` directly (1.17 habit); on 1.20 prefer `import type { ImmutableObject } from 'jimu-core'`.
- **Lift-into-repo:** Useful pattern when a heavy widget must render UI into a slot owned by another widget/layout. On 1.20, re-point the `ImmutableObject` import and confirm the `w-100 h-100` utility classes still resolve.
- **See also:** `briefing-tool` (its consumer, below) - specifically the `MutationObserver` + `createPortal(<LayoutManager />, layoutManagerEl)` in `briefing-tool/src/runtime/widget.tsx`.

---

### briefing-tool · Verified vs 1.20: 1.17 - validate
The richest sample in the SDK: a multi-panel **wizard** (guide the user to pick an AOI, browse a catalog, edit layers, then compose and print a briefing map). Function widget built on React Context + `useReducer`, a `CalciteFlow` wizard, `forwardRef`/`useImperativeHandle` print sub-components, `MutationObserver` + `createPortal`, a promise-based confirm dialog, dynamic widget init via `WidgetManager`, and `html2canvas` print composition.

> **Deep dive:** briefing-tool has a dedicated deep-dive set under [briefing-tool/](briefing-tool/README.md) covering vendor web-component restyling (MutationObserver + shadow-DOM piercing), the Context/reducers state model, the CalciteFlow wizard, print composition, session save + cross-widget communication, and the internal Esri Artifactory registry + build-time/runtime asset-path wiring.

- **Source (Structure map):**
  ```
  briefing-tool/
    manifest.json            exbVersion 1.17.0, translatedLocales ["en"], size {300,700}
    package.json             pins @arcgis/{coding,common,map-config}-components@^4.33 + html2canvas@^1.4.1
    copy-files.json          copies component assets into dist/runtime/assets
    config.json / src/config.ts   large Config (catalog, AOI services, layout-manager table, ...)
    src/runtime/
      widget.tsx             shell: providers + Alerts + Confirm + portal(LayoutManager) + CalciteFlow(panels)
      context.tsx            WidgetContextProvider: Context + useReducer state, confirm(), JimuMapViewComponent bridge
      index.css
      constants/types.ts     Panel enum, PanelProps, Alert, ConfirmDialog, ServiceRequestInfo
      constants/custom-elements.d.ts
      components/
        alerts/  confirm/  file-upload-input/         (global UI: toasts, promise-confirm)
        select-aoi/  catalog/  layer-list/  layer-edit/
        layer-add/  layer-upload/  layer-from-url/     (wizard flow panels = CalciteFlowItem)
          select-aoi/components/{search,select-cocom,select-country,aoi-upload}
        layout-manager/       layout-manager.tsx (+ layer_utils.ts) portalled into bmt-layout-manager
        print/                print.tsx orchestrator; PrintCompass/PrintScaleBar/PrintMapInset/PrintLegend
                              (forwardRef handles); utils.tsx (html2canvas); components/LegendFormatPanel
      assets/print.html, thumbnails
    src/setting/setting.tsx   class setting: MapWidgetSelector + many SettingSection/SettingRow groups
  ```
- **Manifest reqs:** `version`/`exbVersion` **`1.17.0`**; `translatedLocales: ["en"]`; default size `{300,700}`; empty `properties`.
  - `package.json` deps: `@arcgis/coding-components ^4.33`, `@arcgis/common-components ^4.33`, `@arcgis/map-config-components ^4.33`, `html2canvas ^1.4.1` (+ `@types/html2canvas` dev).
  - `copy-files.json` copies web-component assets into the widget's `dist/runtime/assets` so Calcite/map components can load their SVG/locale assets at runtime:
    ```json
    [
      { "from": "./node_modules/@arcgis/map-config-components/dist/arcgis-map-config-components/assets", "to": "./dist/runtime/assets" },
      { "from": "./node_modules/@arcgis/common-components/dist/cdn/assets", "to": "./dist/runtime/assets" }
    ]
    ```
- **Config shape:** large `Config` (excerpt) - catalog services, AOI request info, and the layout-manager bridge id:
  ```ts
  export interface Config {
    servicesAddTimeout: number; useTableConfig: boolean;
    servicesTable: string; servicesTableFields: { id; parentId; isFolder; title; url; serviceType; description; description_link };
    servicesJson: string;
    cocomRequestInfo: ServiceRequestInfo; cocomRequestIdToName: Map<number, string>;
    countryRequestInfo: ServiceRequestInfo; /* ... */
    basemapGroupId: string;
    layoutManagerElementId: string; layoutManagerTableUrl: string; /* + table fields ... */
  }
  export type IMConfig = ImmutableObject<Config>   // ImmutableObject from 'seamless-immutable'
  ```
- **Key APIs (exact):**
  - `AllWidgetProps<IMConfig>` / `AllWidgetSettingProps<IMConfig>`
  - `WidgetManager.getInstance().loadWidgetClass(widgetId: string): Promise<React.ComponentType<WidgetProps>>`
  - `appActions.openWidget(widgetId: string): OpenWidgetAction` / `appActions.closeWidget(widgetId: string): CloseWidgetAction`
  - `getAppStore().getState()` / `getAppStore().dispatch(action)`
  - `JimuMapViewComponent` props `useMapWidgetId` (singular) + `onActiveViewChange(jmv: JimuMapView)`
  - `createPortal(children, container: Element)` (react-dom; signature approx - standard React DOM API)
  - `onSettingChange({ id, useMapWidgetIds?, config? })` where `SettingChangeFunction = (widgetJson: Partial<WidgetJson>, outputDataSourcesJson?: DataSourceJson[]) => void`
- **Builder side (setting.tsx):** Class setting. `MapWidgetSelector` binds a map widget; grouped `SettingSection`/`SettingRow` panels (AOI COCOM/country services, catalog, layout-manager) each write nested config via spread + immutable `set`:
  ```tsx
  import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
  onMapWidgetSelected = (useMapWidgetIds: string[]) => {
    this.props.onSettingChange({ id: this.props.id, useMapWidgetIds })
  }
  onAoiCocomUrlChange = (val: string) => {
    const updated = { ...this.props.config.cocomRequestInfo, url: val }
    this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('cocomRequestInfo', updated) })
  }
  ```
- **Runtime side (widget.tsx):** Thin shell - wrap children in the context provider, mount global overlays (`Alerts`, `Confirm`), portal the layout manager into `bmt-layout-manager`'s div once it appears, and render the wizard panels inside a single `CalciteFlow`:
  ```tsx
  const Widget = (props: AllWidgetProps<IMConfig>) => {
    const [layoutManagerEl, setLayoutManagerEl] = useState<HTMLElement | null>(null);

    // Wait for bmt-layout-manager's div to appear, then capture it as a portal target
    useEffect(() => {
      const observer = new MutationObserver((mutations, obs) => {
        for (const m of mutations)
          for (const node of m.addedNodes)
            if (node.nodeType === Node.ELEMENT_NODE && (node as Element).id === props.config.layoutManagerElementId) {
              setLayoutManagerEl(node as HTMLElement); obs.disconnect(); return;
            }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }, []);

    // Two-phase: warm up the grid-overlay widget so layouts can drive it
    useEffect(() => { initializeWidgetByUri('widgets/grid-overlay/'); }, []);

    return (
      <WidgetContextProvider {...props}>
        <Alerts /><Confirm />
        {layoutManagerEl && createPortal(<LayoutManager />, layoutManagerEl)}
        <CalciteFlow id="briefing-tool-flow" className="e-flow calcite-mode-light">
          <SelectAOI /><Catalog /><LayerList /><LayerEdit />
          <LayerAdd /><LayerUpload /><LayerFromUrl /><Print />
        </CalciteFlow>
      </WidgetContextProvider>
    );
  };
  ```
  Dynamic widget "warm-up" (load class, open then immediately close so its runtime is registered):
  ```tsx
  async function initializeWidgetByUri(widgetUri: string): Promise<void> {
    const widgetId = getWidgetIdFromUri(widgetUri);           // scans getAppStore().getState().appConfig.widgets by uri
    const info = getAppStore().getState()?.widgetsRuntimeInfo?.[widgetId];
    if (!info?.isClassLoaded) await WidgetManager.getInstance().loadWidgetClass(widgetId);
    getAppStore().dispatch(appActions.openWidget(widgetId));
    getAppStore().dispatch(appActions.closeWidget(widgetId));
  }
  ```
- **Patterns:**
  - **Context + `useReducer`** - `WidgetContextProvider` (context.tsx) holds all shared state; `alertsReducer` and `printConfigReducer` back the alert list and the large `printConfig` object; `useWidgetContext()` is the single accessor for every child.
  - **CalciteFlow wizard** - one `<CalciteFlow>` with each panel as a `CalciteFlowItem`; a `Panel` enum + `panel`/`setPanel` in context drives which item is `selected`; `previousPanel` enables multi-source back navigation.
  - **`forwardRef` + `useImperativeHandle`** - print sub-widgets (`PrintCompass`, `PrintScaleBar`, `PrintMapInset`, `PrintLegend`) expose imperative getters (e.g. `getCompassElement`, `getCompassWidget`) to the `Print` orchestrator via refs.
  - **`MutationObserver` + `createPortal`** - detect `bmt-layout-manager`'s div in the DOM, then render `<LayoutManager />` into it (cross-widget rendering).
  - **Promise-based confirm dialog** - `confirm(data): Promise<boolean>` stores the resolver in a `useRef` and shows a portalled `CalciteDialog`; button clicks call `confirmRef.current(choice)` to resolve.
  - **Dynamic widget init via `WidgetManager`** - `loadWidgetClass` + `openWidget`/`closeWidget` to register another widget's runtime on demand.
  - **Portal / `IMUser` auth** - context loads an `@arcgis/core` `Portal({ url: portalUrl, authMode: 'no-prompt' })` and exposes `user: IMUser`.
  - **`html2canvas` print composition** - `print/utils.tsx` rasterizes legend/scale-bar/compass DOM into canvases and composites the final print image; assets shipped via `copy-files.json`.
  - **`copy-files.json` asset bundling** - web-component SVG/locale assets copied into `dist/runtime/assets` at build.
- **Lifecycle/timing:** Two-phase init. Phase 1 (mount): `MutationObserver` armed + `grid-overlay` warmed up + `CalciteFlow` z-index fix. Phase 2 (async): context's effects load the `Portal` and, when a map widget is bound, `JimuMapViewComponent.onActiveViewChange` injects the `__esri.MapView` into context (`handleMapViewReady`). The map bridge lives in `context.tsx`, NOT `widget.tsx`.
- **Cleanup/teardown:** The mount `MutationObserver` calls `observer.disconnect()` as soon as the target div is found (self-cleaning). `handleMapViewReady` adds a `window` `resize` listener that is NOT removed - a real leak to fix on lift. The `initializeWidgetByUri` open-then-close leaves the warmed widget closed. Portalled dialogs/overlays unmount with the widget.
- **Critical gotchas:** 1.17 API drift is significant - imports are inconsistent across files: `widget.tsx`/`context.tsx`/most panels use `@esri/calcite-components-react`, while `layout-manager.tsx` and `print.tsx` import from the bare `calcite-components` alias AND `print.tsx` side-effect-imports `@arcgis/map-components/components/*`. Pins `@arcgis/{coding,common,map-config}-components@4.33` + `html2canvas`, and REQUIRES `copy-files.json` or web-component assets 404 at runtime. `layout-manager.tsx` imports repo code via a deep relative path (`../../../../../../libs/serviceUtils`) - fragile. `if (false) { ... }` dead "missing config" branch in `widget.tsx`. Validate ALL of the above against 1.20 before reuse.
- **Lift-into-repo:** Treat as an architecture reference, not copy-paste. Before lifting: (1) normalize every Calcite import to one 1.20-approved alias; (2) confirm `@arcgis/*-components` versions match the repo's SDK and re-run `copy-files`; (3) replace the deep `../../../libs/serviceUtils` path with the repo's `src/libs/serviceUtils`; (4) add the missing `resize` listener cleanup; (5) apply repo code-style (semicolons, `&&` guard calls, if-body on its own line, plain hyphens). The Context+`useReducer` + `CalciteFlow` wizard skeleton and the promise-based `confirm()` are the most reusable pieces.
- **See also:** `bmt-layout-manager` (its portal target, above); repo `src/widgets/branch-version-editor` and `src/widgets/simple`; `references/widget-patterns.md`; `01-map-view-binding.md` (for the `JimuMapViewComponent` + `onActiveViewChange` map bridge used in `context.tsx`).
