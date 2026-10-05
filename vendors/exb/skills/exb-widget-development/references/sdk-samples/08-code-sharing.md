# SDK Samples - Code Sharing

Three ways an ExB widget can share TypeScript code with sibling widgets, plus the consumed
`shared-code` library that two of them target. Pick the mechanism by how/when you want the code
bundled: a lazy separate chunk, an inlined static import, or a runtime-resolved module load. All
snippets below are trimmed verbatim from the 1.20 SDK samples under
`ArcGISExperienceBuilder/sdk-resources/widgets/`.

| Variant | Mechanism | Bundling | When |
| --- | --- | --- | --- |
| `share-code-chunk` | `import('../../../common/my-module')` (dynamic) | Separate webpack chunk, loaded lazily on first use | Two+ of your own widgets share private code you ship alongside them |
| `share-code-entry` | `import { fn } from 'widgets/shared-code/entry1'` (static, aliased) | Inlined into each widget bundle at build time | You want the shared API resolved and tree-shaken at build, simplest DX |
| `share-code-entry-dynamic` | `moduleLoader.loadModule('widgets/shared-code/entry1', folderUrl)` | Resolved by the ExB runtime at load time (separate output) | You want the shared lib fetched lazily and resolved by ExB, not statically linked |

`shared-code` is the consumed library (not a widget). `share-code-entry` and
`share-code-entry-dynamic` both consume its `entry1` barrel; `share-code-chunk` is self-contained
and shares its own `common/` folder instead.

---

### share-code-chunk · Verified vs 1.20: yes
Two sibling widgets lazily `import()` a shared module that lives in a `common/` folder OUTSIDE either widget's `src/`.

- **Source:** `share-code-widgets/share-code-chunk/widget1/src/runtime/widget.tsx`, `.../widget2/src/runtime/widget.tsx`, `.../common/my-module.ts`, `.../common/fn.ts`; `widget1/manifest.json`, `widget2/manifest.json`
- **Manifest reqs:** none special (standard `type: "widget"`, `version`/`exbVersion` `1.20.0`; no `dependency` or extra fields for sharing)
- **Sharing mechanism (exact):** dynamic `import('../../../common/my-module')`. The relative path climbs three levels up from `src/runtime/` (`runtime` -> `src` -> `widget1`) into the sibling `common/` folder. `my-module.ts` re-exports through `fn.ts` (`f1` calls `f`). Webpack sees the dynamic `import()` and emits `my-module` as its own chunk shared by both widgets.
- **Runtime side:**
  ```tsx
  const [myModule, setModule] = React.useState(null)

  React.useEffect(() => {
    import('../../../common/my-module').then(m => { setModule(m) })
  }, [])

  return (
    <div className="widget-demo jimu-widget m-2">
      <div>Widget 1</div>
      {myModule && <div>Module loaded.<br/>{myModule.f1('chunky widget 1')}</div>}
    </div>
  )
  ```
- **Lifecycle/timing:** lazy runtime. The chunk is fetched only after the widget mounts and the `useEffect` fires; `myModule` is `null` until the promise resolves, hence the `myModule && ...` guard before calling `f1`.
- **Cleanup/teardown:** none needed (no listeners/handles; module stays cached).
- **Critical gotchas:** the shared code path goes up 3 levels to `common/` which sits OUTSIDE `src/` - move/rename either widget folder and the relative path breaks. Both widgets resolve to the same emitted chunk, so the browser caches it after the first widget loads it. Must null-guard (`myModule &&`) because the value is absent on first render.
- **Lift-into-repo:** prefer this when the shared code is private to a small set of your own widgets and you want it lazy-loaded but not exposed as a public `widgets/shared-code` API. In this repo keep the `common/` folder as a sibling of the widget folders under `src/widgets/`; use always-semicolons and split the `if` body onto its own line per repo code-style.
- **See also:** `share-code-entry` (static alias), `share-code-entry-dynamic` (runtime loader), `shared-code`.

---

### share-code-entry · Verified vs 1.20: yes
Statically import a named export from the `widgets/shared-code` alias so it is resolved and inlined at build time.

- **Source:** `share-code-widgets/share-code-entry/src/runtime/widget.tsx`, `share-code-entry/manifest.json`; consumes `shared-code/entry1.ts`
- **Manifest reqs:** none special (no `dependency` entry needed; the alias is provided by webpack, not the manifest)
- **Sharing mechanism (exact):** static `import { sampleFunction1 } from 'widgets/shared-code/entry1'`. The `widgets/shared-code` specifier is a webpack module alias set in `webpack-extensions.common.js` (`webpackCommon.moduleAlias['widgets/shared-code'] = sharedCodeFolder`) and treated as a partial-match package in `webpack.common.js` (`partialMatchPackages = [..., 'widgets/shared-code']`). `entry1.ts` is `export * from './lib/entry1/module1'` / `module2`, so `sampleFunction1` comes from `lib/entry1/module1.ts`.
- **Runtime side:**
  ```tsx
  import { React, type AllWidgetProps } from 'jimu-core'
  import { sampleFunction1 } from 'widgets/shared-code/entry1'

  const Widget = (props: AllWidgetProps<object>) => {
    return (
      <div className="widget-demo jimu-widget m-2">
        <p>A widget using a shared entry</p>
        <p>The shared code: { sampleFunction1() }</p>
      </div>
    )
  }
  ```
- **Lifecycle/timing:** static build-time. The symbol is available synchronously on first render; no promise, no null-guard, no `useEffect`.
- **Cleanup/teardown:** none needed.
- **Critical gotchas:** requires the webpack alias `widgets/shared-code` -> the `shared-code` folder; without it the import will not resolve. Import from an entry barrel (`entry1`/`entry2`), not directly from `lib/**`. Because it is inlined at build, changes to the shared lib require a rebuild of every consuming widget.
- **Lift-into-repo:** prefer this for the simplest DX when you want a build-time-linked shared API and lazy loading is not a concern. Ensure the repo's shared library sits at `src/widgets/shared-code/` so the ExB webpack alias picks it up.
- **See also:** `share-code-entry-dynamic` (same lib, runtime load), `share-code-chunk` (private lazy chunk), `shared-code`.

---

### share-code-entry-dynamic · Verified vs 1.20: yes
Load the same shared entry at runtime via jimu-core `moduleLoader.loadModule`, passing the widget's `folderUrl` for resolution.

- **Source:** `share-code-widgets/share-code-entry-dynamic/src/runtime/widget.tsx`, `share-code-entry-dynamic/manifest.json`; consumes `shared-code/entry1.ts`
- **Manifest reqs:** none special (no `dependency` entry; the loader resolves the path at runtime)
- **Sharing mechanism (exact):** `moduleLoader.loadModule('widgets/shared-code/entry1', props.context.folderUrl)`. Signature (verified in `jimu-core/lib/module-loader.d.ts`): `loadModule<T = any>(module: string, parentUrl?: string): Promise<T>`. The first arg is the same `widgets/shared-code/entry1` id; the second is the base URL the ExB runtime resolves against. `moduleLoader` is imported from `jimu-core`.
- **Runtime side:**
  ```tsx
  import { React, type AllWidgetProps, moduleLoader } from 'jimu-core'

  const Widget = (props: AllWidgetProps<object>) => {
    const [module, setModule] = React.useState(null)

    React.useEffect(() => {
      moduleLoader.loadModule('widgets/shared-code/entry1', props.context.folderUrl).then((module) => {
        setModule(module)
      })
    }, [])
    return (
      <div className="widget-demo jimu-widget m-2">
        <p>The shared code: { module?.sampleFunction1() }</p>
      </div>
    )
  }
  ```
- **Lifecycle/timing:** lazy runtime. The module is undefined until the `loadModule` promise resolves; the code uses optional chaining `module?.sampleFunction1()` so the first render (before resolution) does not throw.
- **Cleanup/teardown:** none needed (no subscriptions; the widget just holds the resolved module in state).
- **Critical gotchas:** you must pass `props.context.folderUrl` as the `parentUrl` so the runtime resolves the shared entry relative to the app; omitting it can break resolution when deployed under a subpath. Access members with optional chaining (`module?.fn()`) because the value is `null` on first render. The original sample keeps an `// eslint-disable-next-line react-hooks/exhaustive-deps` on the empty dep array.
- **Lift-into-repo:** prefer this when you want the shared lib fetched lazily and resolved by ExB (not statically linked), for example to keep consumer bundles small or to swap the lib without rebuilding consumers. Follow repo code-style: always-semicolons, `&&`/optional-chaining guards, plain hyphens in comments.
- **See also:** `share-code-entry` (static build-time link to same lib), `share-code-chunk` (private `common/` chunk), `shared-code`.

---

### shared-code · Verified vs 1.20: yes
The consumed shared library: entry barrels expose a public API backed by `lib/**` modules; it is not a widget.

- **Source:** `shared-code/entry1.ts`, `shared-code/entry2.ts`, `shared-code/lib/entry1/module1.ts`, `.../entry1/module2.ts`, `.../entry2/module1.ts`, `.../entry2/module2.ts`
- **Manifest reqs:** none - there is NO `manifest.json`. `shared-code` is a code library, not a widget; webpack (`webpack-extensions.common.js`) treats every `.ts`/`.tsx` at the folder root as a build entry (`widgets/shared-code/<file>`), aliases `widgets/shared-code` to this folder, and emits shared chunks under `widgets/shared-code/chunks/`.
- **Sharing mechanism (exact):** the entry files are pure `export *` barrels - the public API surface:
  ```ts
  // entry1.ts
  export * from './lib/entry1/module1'
  export * from './lib/entry1/module2'
  ```
  ```ts
  // entry2.ts
  export * from './lib/entry2/module1'
  export * from './lib/entry2/module2'
  ```
  Backing modules are trivial named exports, e.g. `lib/entry1/module1.ts` -> `export function sampleFunction1 () { return 'sample function1' }` and `module2.ts` -> `sampleFunction2`.
- **Runtime side:** none - this package has no runtime component. Consumers import from the entry barrels (`widgets/shared-code/entry1`, `.../entry2`), never directly from `lib/**`.
- **Lifecycle/timing:** the entry barrels are the public API contract; `lib/**` is the private implementation. How/when the code loads depends on the consumer's mechanism (static alias vs `moduleLoader`).
- **Cleanup/teardown:** none needed (stateless pure functions).
- **Critical gotchas:** only files at the folder root count as entries/public API; nest private code under `lib/**` and re-export via a barrel. Do not add a `manifest.json` (it would make webpack treat it as a widget). Keep the folder name exactly `shared-code` so the `widgets/shared-code` alias resolves.
- **Consumed by:** `share-code-entry` (static `import ... from 'widgets/shared-code/entry1'`) and `share-code-entry-dynamic` (`moduleLoader.loadModule('widgets/shared-code/entry1', folderUrl)`) - both target `entry1`. `entry2` is provided but unused by these two samples. `share-code-chunk` does NOT consume `shared-code`; it shares its own private `common/` folder instead.
- **Lift-into-repo:** use a `src/widgets/shared-code/` library with root-level `entryN.ts` barrels when several widgets need a common, versioned API; prefer `share-code-entry` for build-time linking or `share-code-entry-dynamic` for runtime loading.
- **See also:** `share-code-entry`, `share-code-entry-dynamic`, `share-code-chunk`.
