# SDK Samples - Third-party Libs, Tooling, i18n & Testing

Source-grounded reference cards for the ExB 1.20 SDK samples that integrate external
libraries (D3, jQuery, react-data-grid), platform primitives (web worker, assets),
content translation (APP_CONFIG_PROCESSOR), and unit testing (jimu-for-test). Every
snippet below is trimmed from the actual sample source under
`ArcGISExperienceBuilder/sdk-resources/widgets/`, not the README. Watch the worker,
jquery-load-order, translation-extension, and testing gotchas - those carry the most
non-obvious ExB mechanics.

---

### d3 · Verified vs 1.20: yes
Bundle a version-locked, committed copy of a third-party lib and drive DOM via a React ref.

- **Source:** `d3/manifest.json`, `d3/src/runtime/widget.tsx`, `d3/src/runtime/lib/d3/d3.min.js` (committed), `d3/src/runtime/translations/default.ts`
- **Manifest reqs:** no `dependency[]`, no `extensions[]`; no per-widget `package.json` (lib is vendored in-tree under `src/runtime/lib/d3/`); `translatedLocales: ["en"]`; `defaultSize` 800x500.
- **Config shape:** none.
- **Key APIs / mechanism (exact):** direct relative import of the committed minified file - `import * as d3 from './lib/d3/d3.min.js'`. No manifest declaration is needed because webpack resolves and bundles the local file at compile time.
- **Runtime side (widget.tsx):** functional widget, `useRef` + `useEffect` to run imperative d3 after mount, then splice d3's detached node into the React-owned container.

```tsx
import { React, jsx } from 'jimu-core'
import * as d3 from './lib/d3/d3.min.js'
const { useEffect, useRef } = React

export default function Widget () {
  const mainRef = useRef<HTMLDivElement>(undefined)
  useEffect(() => {
    if (mainRef && mainRef.current) {
      const data = [4, 8, 15, 16, 23, 42]
      const x = d3.scaleLinear().domain([0, d3.max(data)]).range([0, 100])
      const div = d3.create('div')
      // ...
      const barNew = div.selectAll('div').data(data).join('div')
      barNew.style('width', (d) => `${x(d)}px`).text((d) => d)
      mainRef.current.appendChild(div.node())
    }
  }, [mainRef])
  return <div className="widget-d3 jimu-widget p-2">{/* ... */}<div ref={mainRef}></div></div>
}
```

- **Build/loading detail:** `d3.min.js` (plus `d3.js`, `LICENSE`, `API.md`, `CHANGES.md`) is committed into the widget tree. webpack pulls the local file into the widget bundle at build time - nothing is fetched at runtime.
- **Lifecycle/timing:** d3 code runs once inside `useEffect([mainRef])` after first mount; d3 builds a detached DOM subtree and it is appended to the ref'd `<div>`.
- **Cleanup/teardown:** none needed (no timers/subscriptions; detached node is GC'd with the widget).
- **Critical gotchas:** the lib is committed minified on purpose - version-lock and offline/air-gapped safety; there is no CDN or npm resolution. d3 owns its DOM node, React owns the container - never let both mutate the same node.
- **Lift-into-repo:** viable for pinning a specific lib build offline. For repo code-style, use always-semicolons and short-circuit guards (`mainRef?.current && ...`). Prefer vendoring under a clearly named `lib/` folder and keep the license file alongside.
- **See also:** `react-data-grid` (npm-resolved lib), `jquery` (CDN-loaded lib), `use-assets` (asset copy vs inline).

---

### jquery · Verified vs 1.20: yes
Load runtime CDN dependencies declared in the manifest, in strict declared order.

- **Source:** `jquery/manifest.json`, `jquery/src/runtime/widget.tsx`, `jquery/src/runtime/translations/default.ts`
- **Manifest reqs:** `dependency[]` lists two CDN scripts loaded IN ORDER; no `package.json`; no `extensions[]`; `translatedLocales: ["en"]`.

```json
"dependency": [
  "https://unpkg.com/jquery@3.5.1/dist/jquery.js",
  "https://unpkg.com/jqtree@1.4.12/build/tree.jquery.js"
]
```

- **Config shape:** none.
- **Key APIs / mechanism (exact):** ExB injects each URL in `dependency[]` as a `<script>` sequentially before the widget renders. The plugin (`jqtree`) depends on `jquery` already being on `window`, so jquery MUST be listed first. Globals (`$`) are used directly - there is no ES import.
- **Runtime side (widget.tsx):** class widget; call the jquery plugin against the widget's root element in `componentDidMount`.

```tsx
import { React, type AllWidgetProps, jsx } from 'jimu-core'

export default class Widget extends React.PureComponent<AllWidgetProps<object>, any> {
  componentDidMount () {
    const data = [ /* ...tree nodes... */ ]
    $('.widget-3rd-lib').tree({ data: data, autoOpen: true, dragAndDrop: true })
  }
  render () { return <div className="widget-3rd-lib"></div> }
}
```

- **Build/loading detail:** nothing is bundled - both libs are fetched from unpkg at runtime and attach to the global scope. TypeScript sees `$` as an ambient global (no import), so lint/TS config must tolerate it.
- **Lifecycle/timing:** ExB guarantees all `dependency[]` scripts finish loading before the widget's first render, so `$` and `.tree()` are safe in `componentDidMount`.
- **Cleanup/teardown:** none in the sample; a production widget calling a stateful plugin should destroy the plugin instance on unmount.
- **Critical gotchas:** ORDER MATTERS - `jquery` before `jqtree`; reversing them throws "`$` is undefined". Runtime CDN fetch means offline/air-gapped or CSP-locked deployments will break; pin exact versions in the URL (as the sample does with `@3.5.1` / `@1.4.12`). Globals bypass tree-shaking and typing.
- **Lift-into-repo:** in this repo prefer vendoring or npm over CDN for air-gapped targets. If you must use `dependency[]`, pin versions and confirm CSP allows the host. Add semicolons per repo code-style; guard the selector (`$('.widget-3rd-lib').length && ...`).
- **See also:** `d3` (vendored lib), `react-data-grid` (npm dep), `use-assets` (folderUrl loading).

---

### react-data-grid · Verified vs 1.20: yes
Consume an npm-published React component declared as a per-widget package dependency.

- **Source:** `react-data-grid/manifest.json`, `react-data-grid/package.json`, `react-data-grid/src/runtime/widget.tsx`, `react-data-grid/package-lock.json`, `react-data-grid/.gitignore`
- **Manifest reqs:** no `dependency[]`, no `extensions[]`; the lib is a per-widget npm dep in `package.json`:

```json
"dependencies": { "react-data-grid": "^6.1.0" }
```

  `translatedLocales: ["en"]`; `.gitignore` present (excludes local `node_modules`).
- **Config shape:** none (`AllWidgetProps<any>`).
- **Key APIs / mechanism (exact):** `import * as ReactDataGrid from 'react-data-grid'`. The dep is installed into the widget folder's `node_modules` and webpack resolves + bundles it at build time (module resolution, not CDN).
- **Runtime side (widget.tsx):** class widget renders the grid with static columns/rows via the legacy v6 API (`rowGetter` / `rowsCount`).

```tsx
import { React, type AllWidgetProps, jsx } from 'jimu-core'
import * as ReactDataGrid from 'react-data-grid'

export default class Widget extends React.PureComponent<AllWidgetProps<any>, any> {
  private readonly columns = [{ key: 'id', name: 'ID' }, /* ... */]
  private readonly rows = [{ id: 0, title: 'row1', count: 20 }, /* ... */]
  render () {
    return (
      <ReactDataGrid columns={this.columns} rowGetter={(i) => this.rows[i]}
        rowsCount={3} minHeight={150} />
    )
  }
}
```

- **Build/loading detail:** run `npm install` inside the widget folder so `react-data-grid` lands in its `node_modules`; webpack then bundles it. Nothing loads at runtime. (`render()` className is left as `widget-d3` in the sample - a copy/paste artifact.)
- **Lifecycle/timing:** standard React render; no async load.
- **Cleanup/teardown:** none needed.
- **Critical gotchas:** the sample pins the OLD `react-data-grid@^6` API (`rowGetter`, `rowsCount`, `minHeight`); v7+ changed to a `rows`-array API and will not accept these props. A per-widget `package.json` means that widget carries its own `node_modules` and lockfile - remember to install before building.
- **Lift-into-repo:** prefer adding the dep at the repo/app level rather than a nested widget `package.json` where practical. Pin the major version deliberately; validate the component's peer React version against the ExB-provided React. Apply repo semicolons + short-circuit style.
- **See also:** `d3` (vendored), `jquery` (CDN), `08-code-sharing` for shared-module patterns.

---

### web-worker · Verified vs 1.20: yes
Offload work to a Worker whose script is shipped as a plain-JS asset and loaded by URL.

- **Source:** `web-worker/manifest.json`, `web-worker/src/runtime/widget.tsx`, `web-worker/src/runtime/assets/worker.js`
- **Manifest reqs:** none special - no `dependency[]`, no `extensions[]`; `translatedLocales: ["en"]`; `defaultSize` 200x200. The mechanism relies entirely on the `assets/` folder convention, not manifest declarations.
- **Config shape:** none.
- **Key APIs / mechanism (exact):** browser `new Worker(url)` + `postMessage` / `onmessage`. The worker URL is built from the widget's deployed folder: `${props.context.folderUrl}dist/runtime/assets/worker.js`.
- **Runtime side (widget.tsx):** functional widget spins up the worker in `useEffect([])`, posts a start message, and tracks status from the worker's reply.

```tsx
import { React, type AllWidgetProps } from 'jimu-core'

const Widget = (props: AllWidgetProps<object>) => {
  const [status, setStatus] = React.useState('idle')
  React.useEffect(() => {
    // Put the worker script in `assets` folder to make sure it's included in the build.
    // We can't compile the worker script with webpack, because the ExB output format is
    // SystemJS format, which can't be loaded in a web worker.
    const workerUrl = `${props.context.folderUrl}dist/runtime/assets/worker.js`
    const worker = new Worker(workerUrl)
    worker.postMessage({ type: 'start' })
    setStatus('running')
    worker.onmessage = (e) => {
      if (e.data.type === 'done') { setStatus('done') }
    }
  }, [])
  return <div className="widget-demo jimu-widget m-2">Status: {status}</div>
}
export default Widget
```

  The worker itself is plain JS:

```js
self.onmessage = function (e) {
  if (e.data.type === 'start') {
    setTimeout(() => { self.postMessage({ type: 'done' }) }, 1000) // long task
  }
}
```

- **Build/loading detail:** files under `src/runtime/assets/` are copied verbatim to `dist/runtime/assets/` on compile (NOT transpiled/bundled). The worker is fetched at runtime from that copied path via `folderUrl`.
- **Lifecycle/timing:** worker is created once after mount (`useEffect([])`); it runs concurrently and posts `done` when finished; the widget flips `idle -> running -> done`.
- **Cleanup/teardown:** sample does not terminate; a robust version should return a cleanup that calls `worker.terminate()` to avoid leaking the worker across unmounts.
- **Critical gotchas:** the worker script MUST stay a plain `.js` file in `assets/` - do NOT let webpack compile it, because ExB's SystemJS output format cannot be loaded inside a Worker (quote the in-code comment). The URL MUST be `props.context.folderUrl + 'dist/runtime/assets/worker.js'`; a bare relative path will not resolve under the deployed app. The sample also omits `worker.terminate()`.
- **Lift-into-repo:** keep worker source as hand-written `.js` under `assets/`; add a `return () => worker.terminate()` cleanup; add semicolons per repo code-style. Confirm CSP allows worker creation from the app origin.
- **See also:** `use-assets` (same assets-copy-to-dist + folderUrl mechanism), `d3` (bundled compute alternative).

---

### use-assets · Verified vs 1.20: check
Two asset strategies: `assets/`-folder files served via `folderUrl`, vs `require()`-inlined files.

- **Source:** `use-assets/manifest.json`, `use-assets/src/runtime/widget.tsx`, `use-assets/src/runtime/config.ts`, assets under `src/runtime/assets/` (`large-image.jpg`, `mysvg.svg`, `icons/mysvg3.svg`), root-level `src/runtime/small-image.png` + `mysvg2.svg`, `src/runtime/translation/default.ts`
- **Manifest reqs:** none special (no `dependency[]`, no `extensions[]`); `translatedLocales: ["en"]`. (Verified: manifest/widget faithful; "check" because behavior depends on the build's copy-to-dist step running - lift with a build check.)
- **Config shape:** empty interface -

```ts
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Config {}
```

- **Key APIs / mechanism (exact):** two loading modes:
  - URL mode: `` `${props.context.folderUrl}dist/runtime/assets/<file>` `` - file must live in an `assets/` folder so it is copied to `dist/`.
  - Inline mode: `const smallImage = require('./small-image.png')` / `require('./mysvg2.svg')` - file is inlined into the bundle at compile time and does NOT need to be in `assets/`.
  - `Icon` (jimu-ui): `<Icon icon={...} color width height />` renders an SVG url as live SVG DOM, or an inlined/require'd svg as an image.
- **Runtime side (widget.tsx):** functional widget demonstrating all four combinations.

```tsx
import { type AllWidgetProps, jsx } from 'jimu-core'
import { Icon } from 'jimu-ui'
import type { Config } from './config'
const smallImage = require('./small-image.png')
const svg2 = require('./mysvg2.svg')
const svg3 = require('./assets/icons/mysvg3.svg')

export default function (props: AllWidgetProps<Config>) {
  return (<div className="widget-use-assets jimu-widget">
    {/* 1. URL from assets folder */}
    <img src={`${props.context.folderUrl}dist/runtime/assets/large-image.jpg`} />
    {/* 2. require-inlined image */}
    <img src={smallImage} />
    {/* 3.2 Icon renders url as live SVG DOM */}
    <Icon icon={`${props.context.folderUrl}dist/runtime/assets/mysvg.svg`} color="red" width="200px" height="200px" />
    {/* 3.3 Icon renders require-inlined svg as image */}
    <Icon icon={svg2} color="red" width="200px" height="200px" />
  </div>)
}
```

- **Build/loading detail:** everything under `src/runtime/assets/` (and `src/setting/assets/`) is copied to `dist/runtime/assets/` (and setting) on compile - reference those via `folderUrl`. `require()`'d files are inlined into the compiled bundle (base64/data-url) regardless of folder, so they must NOT rely on `folderUrl`.
- **Lifecycle/timing:** pure render; URL-mode images are fetched by the browser at paint; inlined assets ship inside the JS bundle.
- **Cleanup/teardown:** none needed.
- **Critical gotchas:** `folderUrl`-loaded files MUST live under `assets/` or they will 404 in the deployed app (they are the only files copied to `dist/`). `require()` inlines - great for small icons, bloats the bundle for large images (use `folderUrl` for `large-image.jpg`). SVG via `<img>` renders as a static image (no `color` restyling); SVG via `<Icon>` from a url renders as inline SVG DOM (recolorable via `color`).
- **Lift-into-repo:** pick inline (`require`) for tiny recolorable icons, `folderUrl` for large media. Keep `assets/` naming exact. In this repo add semicolons; guard `props.context?.folderUrl`.
- **See also:** `web-worker` (same assets-copy mechanism for the worker `.js`), `jimu-ui-components` skill for `Icon` props.

---

### translation · Verified vs 1.20: yes
Runtime content translation of app config text via an APP_CONFIG_PROCESSOR extension.

- **Source:** `translation/manifest.json`, `translation/src/extensions/translation.ts`, `translation/src/runtime/translations/default.ts`, `translation/src/runtime/translations/zh-cn.js`, `translation/sample-app-config.json`
- **Manifest reqs:** registers an extension point (no `dependency[]`/`package.json`); `translatedLocales: ["en","zh-cn"]`:

```json
"extensions": [
  { "point": "APP_CONFIG_PROCESSOR", "uri": "extensions/translation" }
]
```

- **Config shape:** none (the widget has no runtime component; it is an extension-only widget).
- **Key APIs / mechanism (exact - all verified in gitignored jimu-core `.d.ts`):**
  - `interface AppConfigProcessorExtension { process: (appConfig: AppConfig) => Promise<AppConfig> }`
  - `utils.replaceI18nPlaceholdersInObject(obj: any, intl: IntlShape, defaultMessages: any): any`
  - `createIntl(...)` - re-exported by jimu-core from react-intl (signature approx: `createIntl(config, cache?)`).
  - `getAppStore().getState().appContext.locale` - current locale.
- **Runtime side (extension .ts, not widget.tsx):**

```ts
import { type extensionSpec, type AppConfig, utils, createIntl, getAppStore } from 'jimu-core'
import defaultMessage from '../runtime/translations/default'

export default class Translation implements extensionSpec.AppConfigProcessorExtension {
  id = 'translation'
  widgetId: string
  async process (appConfig: AppConfig): Promise<AppConfig> {
    // Do not replace when run in builder.
    if (window.jimuConfig.isInBuilder) { return Promise.resolve(appConfig) }
    const widgetJson = appConfig.widgets[this.widgetId]
    const intl = createIntl({
      locale: getAppStore().getState().appContext.locale,
      messages: Object.assign({}, defaultMessage, widgetJson.manifest.i18nMessages)
    })
    utils.replaceI18nPlaceholdersInObject(appConfig, intl, defaultMessage)
    return Promise.resolve(appConfig)
  }
}
```

  The processor rewrites `${key}` placeholders in app config text. Example target (Text widget config) from `sample-app-config.json`: `"text": "<p>This is key1: ${key1}</p><p>This is key2: ${key2}</p>"`; `default.ts` maps `key1`/`key2` to English, `zh-cn.js` (SystemJS module) supplies Chinese.
- **Build/loading detail:** the extension is compiled and registered at the `APP_CONFIG_PROCESSOR` point via `manifest.extensions`. Non-default locale strings ship as SystemJS-registered `.js` (`zh-cn.js`), the default locale as a `.ts` default export.
- **Lifecycle/timing:** APP_CONFIG_PROCESSOR runs ONCE against the whole app config BEFORE any widget renders. It short-circuits (`return appConfig` unchanged) when `window.jimuConfig.isInBuilder` is true - so builder authoring keeps raw `${key}` placeholders visible and only the published/runtime app is translated.
- **Cleanup/teardown:** none - it is a one-shot config transform, not a subscription.
- **Critical gotchas:** the builder-mode skip (`window.jimuConfig.isInBuilder`) is essential - without it you would translate placeholders inside the authoring experience and lose them. `replaceI18nPlaceholdersInObject` mutates the passed `appConfig` in place (then it is returned). Messages merge order is `defaultMessage` first, then `manifest.i18nMessages` overrides. Placeholders use `${key}` syntax inside any string field of the config.
- **Lift-into-repo:** strong pattern for translating end-user-authored content (Text widget etc.) at runtime. Keep the builder-skip guard. In this repo, add semicolons and short-circuit (`window.jimuConfig?.isInBuilder && return`). Consult the guidance-testing skill before shipping.
- **See also:** `use-assets` translation folder (widget label i18n), the exb-widget-development skill for extension points.

---

### show-unit-tests · Verified vs 1.20: yes
Unit-test a widget with jimu-for-test: render, store state, theme, events, and mocked JSAPI.

- **Source:** `show-unit-tests/manifest.json`, `show-unit-tests/src/config.ts`, `show-unit-tests/src/runtime/widget.tsx`, `show-unit-tests/tests/widget.test.tsx`, `show-unit-tests/config.json`
- **Manifest reqs:** none special; `translatedLocales: ["en"]`. Tests live under `tests/` and run via the client Jest setup (`cd ArcGISExperienceBuilder/client; npm test`).
- **Config shape:**

```ts
export interface Config { p1: boolean }
export type IMConfig = ImmutableObject<Config>
```

- **Key APIs / mechanism (exact - jimu-for-test, verified in gitignored `.d.ts`):**
  - `widgetRender(needsStoreInit?, theme?, locale?, messages?, theme2?): WithRenderResult` - factory returning a render fn.
  - `wrapWidget(WidgetClass, props?)` - injects default props (id, config, theme, intl) so the raw widget can be rendered standalone.
  - `getInitState(): IMState` and `getDefaultAppConfig(): IMAppConfig` - build store state.
  - `setTheme(theme: IMThemeVariables): void` - swap the active theme module.
  - Widget under test uses `loadArcGISJSAPIModule(module: string): Promise<any>` - mocked per `moduleId`.
- **Runtime side (widget.tsx):** functional widget with a config flag, a click counter, a theme read, and an async JSAPI query.

```tsx
import { type AllWidgetProps, jsx, React, loadArcGISJSAPIModule } from 'jimu-core'
const onQueryFeatures = React.useCallback((evt) => {
  loadArcGISJSAPIModule('esri/layers/FeatureLayer').then(FeatureLayer => {
    const layer: __esri.FeatureLayer = new FeatureLayer({ url: 'https://abc' })
    layer.queryFeatureCount({ where: '1=1' }).then(setQueryCount)
  })
}, [])
```

- **Build/loading detail (the test itself):**

```tsx
import { React, getAppStore, appActions, Immutable, type IMThemeVariables } from 'jimu-core'
import _Widget from '../src/runtime/widget'
import { widgetRender, wrapWidget, getInitState, getDefaultAppConfig, setTheme } from 'jimu-for-test'
import { fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const render = widgetRender()
const Widget = wrapWidget(_Widget, { config: {} })

jest.mock('jimu-core', () => ({
  ...jest.requireActual('jimu-core'),
  loadArcGISJSAPIModule: jest.fn().mockImplementation(moduleId => {
    let module
    if (moduleId === 'esri/layers/FeatureLayer') {
      module = jest.fn().mockImplementation(() => ({ queryFeatureCount: () => Promise.resolve(5) }))
    }
    return Promise.resolve(module)
  })
}))

it('test label, map from state', () => {
  getAppStore().dispatch(appActions.updateStoreState(getInitState().merge({
    appConfig: getDefaultAppConfig().merge({ widgets: { w1: { label: 'W 1' } } })
  })))
  const renderResult = render(<Widget widgetId="w1" />)
  expect(renderResult.queryByText('Widget label:W 1')).toBeInTheDocument()
})

it('test theme variable', () => {
  setTheme(Immutable({ ref: { palette: { black: '#FFF' } } } as IMThemeVariables))
  expect(render(<Widget />).queryByText('Theme variable:#FFF')).toBeInTheDocument()
})

it('test api', async () => {
  const { findByText, queryByRole } = render(<Widget />)
  fireEvent.click(queryByRole('button', { name: 'Query features' }))
  await findByText('Query Result count:5')  // resolves the mocked promise
})
```

- **Lifecycle/timing:** `widgetRender()` sets up the Redux store + ThemeProvider + IntlProvider wrapper; each `render(...)` mounts the wrapped widget. Store-driven props (`label`) come from `getInitState()/getDefaultAppConfig()` dispatched into the store; async assertions use `findBy*` to await the mocked promise.
- **Cleanup/teardown:** none authored per-test (Testing Library auto-cleans between tests); the `jest.mock` is module-scoped.
- **Critical gotchas:** `jest.mock('jimu-core', ...)` MUST spread `...jest.requireActual('jimu-core')` or you lose `React`, `getAppStore`, etc. Mock `loadArcGISJSAPIModule` per `moduleId` and return a constructor-shaped `jest.fn()` so `new FeatureLayer(...)` works. Async JSAPI paths require `await findByText(...)` (not `queryByText`) to flush the resolved promise. `wrapWidget` supplies default props; pass overrides via JSX props (`<Widget config={{ p1: true }} />`, `widgetId="w1"`). Use `setTheme(Immutable({ ref: { palette: {...} } }))` to control `props.theme`.
- **Lift-into-repo:** canonical test harness for this repo's widgets. Run under `ArcGISExperienceBuilder/client` Jest. Keep the `requireActual` spread and per-moduleId mock. Apply repo semicolons/short-circuit style in lifted specs; see the guidance-testing skill.
- **See also:** guidance-testing skill (repo testing conventions), jimu-framework-apis skill (store/theme/JSAPI APIs), `04-data-actions-messaging-state`.

---

## Cross-cutting notes

- Three ways to bring in an external lib: vendor + relative import (`d3`), npm per-widget dep (`react-data-grid`), or manifest `dependency[]` CDN scripts (`jquery`). Prefer vendoring/npm for air-gapped or CSP-locked targets.
- `assets/` folder = copied verbatim to `dist/` (reference via `props.context.folderUrl`); `require(...)` = inlined into the bundle. The `web-worker` script relies on the former and MUST stay uncompiled plain JS.
- `APP_CONFIG_PROCESSOR` runs before render and must skip builder mode; jimu-for-test wraps store/theme/intl and expects a `requireActual` mock spread.
