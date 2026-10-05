# OTB Widget: geobim/document-viewer

Online widget doc: https://developers.arcgis.com/experience-builder/guide/document-viewer-widget/

## Purpose
Displays and interacts with 2D and 3D documents (BIM models) from Autodesk Construction Cloud (ACC / APS) inside a container. The widget authenticates against Autodesk Platform Services (APS), listens for map feature selection, resolves the document linked to the selected feature, and renders it in an embedded Autodesk model viewer. It is one of the GeoBIM family of widgets and leans almost entirely on the shared `widgets/shared-code/geobim` library plus a shared Redux store extension.

## Source paths inspected
All under `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-viewer/` (gitignored vendor runtime; read with includeIgnoredFiles):
- `manifest.json`
- `config.json` (default config; runtime instance config)
- `src/config.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/model-viewer-widget.tsx`
- `src/runtime/components/model-viewer.tsx`
- `src/runtime/hooks/use-geobim-model-viewer-widget.tsx`
- `src/runtime/hooks/use-document-selection.tsx` (present; not read in full)
- `src/runtime/hooks/use-selected-feature-linked-document.tsx` (present; not read in full)
- `src/runtime/hooks/use-model-viewer-component.tsx` (present; not read in full)
- `src/extensions/geobim-store.ts`
- `src/setting/setting.tsx`
- `icon.svg`, `dist/` (compiled output - IGNORED), `**/tests/` (IGNORED)

## Architecture overview
Layered composition, with almost all real logic delegated to the shared GeoBIM library:

1. `widget.tsx` (`DocumentViewerWidget`) is a thin shell. It builds an `i18nMessage` translator, reads the optional map widget id, and wraps everything in `GeoBIMProvider` (shared context) then renders `ModelViewerWidget`.
2. `ModelViewerWidget` (component) is the real container UI: header with a document lock toggle, permission / login gates, loading states, multiple-selection warnings, and the model viewer body. It pulls state from Redux (`modelViewerDisabledSelector`) and from GeoBIM context (`useGeoBIM`, `useApsAuth`).
3. `useGeoBimModelViewerWidget` hook aggregates document-selection state, model-viewer options (including the APS access-token provider), and computed loading flags into one memoized object.
4. `ModelViewer` + `ModelViewerProvider` + `ReactModelViewer` (shared) render the actual Autodesk viewer and surface viewer error messages.
5. `geobim-store.ts` re-exports the shared `GeoBIMStoreExtension` as a `REDUX_STORE` extension so multiple GeoBIM widgets share state.
6. `setting.tsx` only exposes a Map widget selector plus a GeoBIM feature-service validation notice.

## Key imports and packages
Grouped by source; file path noted per group.

From `jimu-core` (`widget.tsx`, `model-viewer-widget.tsx`, `model-viewer.tsx`, `use-geobim-model-viewer-widget.tsx`, `setting.tsx`):
- `React`, `ReactRedux`, `type AllWidgetProps`, `type IMState`, `type IMThemeVariables`

From `jimu-ui` (`widget.tsx`, `model-viewer-widget.tsx`, `model-viewer.tsx`):
- `Paper`, `Loading`, `Button`, `Alert`, `Typography`, `Surface`

From `jimu-icons/outlined/editor/*` (`model-viewer-widget.tsx`):
- `LockOutlined`, `UnlockOutlined`

From `jimu-for-builder` (`setting.tsx`):
- `type AllWidgetSettingProps`

From `jimu-ui/advanced/setting-components` (`setting.tsx`):
- `SettingSection`, `SettingRow`, `MapWidgetSelector`

From `redux` (`model-viewer-widget.tsx`):
- `type Dispatch`

From `widgets/shared-code/geobim` (shared GeoBIM lib - the heart of the widget):
- `widget.tsx`: `defaultSharedMessages`, `GeoBIMProvider`, `useSharedMessages`
- `model-viewer-widget.tsx`: `useApsAuth`, `ModelViewerProvider`, `type defaultSharedMessages`, `modelViewerDisabledSelector`, `type ActionTypes`, `setModelViewerDisabled`, `geoBIMWidgetContainerStyle`, `loadingContainerStyle`, `useGeoBIM`, `widgetHeaderStyle`, `hidableContainerStyle`, `ApsLogIn`, `UserTypeNotPermissible`
- `model-viewer.tsx`: `type SelectedBimDocument`, `type defaultSharedMessages`, `ReactModelViewer`, `hidableContainerStyle`
- `use-geobim-model-viewer-widget.tsx`: `useGeoBIM`, `type IModelViewerOptions`, `type SelectedBimDocument`, `type APSTokenAuth`
- `extensions/geobim-store.ts`: `GeoBIMStoreExtension` (REDUX_STORE extension)
- `setting.tsx`: `defaultSharedMessages`, `FeatureServiceErrors`, `useSharedMessages`

Local module imports:
- `../config` (`IMConfig`), `./translations/default` (`defaultMessages`), local `../styles`, local `../hooks/*`, local components.

## Reusable patterns found
- GeoBIMProvider context: runtime wraps children in `GeoBIMProvider` supplying `mapWidgetId`, `widgetId`, and `widgetState`; descendants consume shared state via `useGeoBIM()` (returns `apsAuthenticated`, `userHasPermission`, `geoBIMInitialized`, `geoBIMLoading`, `mapWidgetLoaded`, etc.). See patterns/container-shared-code.md.
- useSharedMessages i18n: both runtime and setting build a merged message table (`{ ...defaultSharedMessages.default, ...defaultMessages }`) and translate through `translateMessage` from `useSharedMessages(intl, manifest.translatedLocales)`. Local `defaultMessages` is spread last so it wins over shared strings. See patterns/container-shared-code.md.
- useMapWidgetIds optional: `const currentMapWidgetId = useMapWidgetIds?.[0]` - the widget tolerates no bound map; the map is used to drive feature selection, not required for the shell to render.
- geobim-store REDUX_STORE extension: `extensions/geobim-store.ts` simply re-exports `GeoBIMStoreExtension`; registered in manifest under `extensions` with `point: REDUX_STORE`. This gives every GeoBIM widget instance shared, widget-scoped Redux state (e.g. model-viewer disabled flag). See patterns/container-shared-code.md.
- widgets/shared-code/geobim shared lib: nearly all providers, hooks, selectors, actions, styles, and UI gates (`ApsLogIn`, `UserTypeNotPermissible`, `FeatureServiceErrors`, `ReactModelViewer`) come from the shared code library; the widget itself is glue.
- requireLicense Autodesk: `manifest.json` sets `"requireLicense": "Autodesk"`, so the widget is gated behind an Autodesk license/entitlement in addition to APS user login.
- Redux-driven UI lock: `modelViewerDisabledSelector(widgetId, state)` + `setModelViewerDisabled(widgetId, value, dispatch)` implement a per-widget lock toggle that prevents the viewer from reloading documents.

## Builder vs runtime split
- Builder (`setting/setting.tsx`, `DocumentViewerWidgetSetting`): only a `MapWidgetSelector` (single map, `autoSelect={false}`) and a `FeatureServiceErrors` panel that validates the bound map has exactly one GeoBIM feature service. On selection it calls `props.onSettingChange({ id, useMapWidgetIds })` - the comment warns settings will NOT persist unless the `id` is supplied.
- Runtime (`runtime/widget.tsx` -> `ModelViewerWidget`): consumes `useMapWidgetIds?.[0]`, sets up GeoBIM context, APS auth gating, document selection, and the embedded model viewer.
- Config is effectively empty: `src/config.ts` exports `IMConfig = ImmutableObject<object>` (no config fields); the only persisted setting is `useMapWidgetIds`. `manifest.json` `properties.showDescription` is true.

## Lifecycle and cleanup
- No class lifecycle; function components with hooks only.
- `hasBimDocumentDisplayed` state latches true the first time a `bimDocument` appears, and is used to keep the viewer mounted (avoid reload) during subsequent loading states.
- APS access token is provided lazily via `modelViewerOptions.getAccessToken` (async) memoized on `getApsAuthToken` (already wrapped in `useCallback` upstream in `useApsAuth`).
- `useGeoBimModelViewerWidget` memoizes its whole return object and each derived flag to keep referential stability across renders.
- Multiple-feature-selection warning can be dismissed via `cancelMultipleFeatureSelectionWarning()`.
- Model viewer instance lifecycle (init/teardown of the Autodesk viewer) is owned by shared `ReactModelViewer` / `useModelViewerComponent` (not implemented in this widget). UNVERIFIED: exact viewer disposal logic lives in `widgets/shared-code/geobim`.

## Manifest/config requirements
From `manifest.json`:
- `"type": "widget"`, `"dependency": "jimu-arcgis"` (needs the ArcGIS map stack).
- `"requireLicense": "Autodesk"`.
- `extensions`: one entry `{ name: "GeoBIM Store", point: "REDUX_STORE", uri: "extensions/geobim-store" }`.
- `properties.showDescription: true`.
- `defaultSize`: `{ width: 300, height: 500 }`.
- Broad `translatedLocales` list (40+ locales) - but strings are resolved through the shared `translateMessage` path, not the framework, per the in-code note.
- `config.json` is present as the default instance config (empty object shape matching `IMConfig`).

## Gotchas
- Settings will silently fail to save unless `id` is included in `onSettingChange` (`props.onSettingChange({ id, useMapWidgetIds })`) - explicitly called out in a source comment.
- `useMapWidgetIds` is an array by API but `MapWidgetSelector` only ever yields one map id (comment in setting.tsx). Treat index 0 as the map.
- Translations do NOT flow through `intl.formatMessage` here; a shared `translateMessage` is used because framework string loading is not wired up (see the commented-out `formatMessage` call). Add new strings to local `translations/default` and they override shared ones.
- The lock button disable logic is intentionally asymmetric: `disabled={lockButtonDisabled && !modelViewerDisabled}` so a locked document can always be unlocked even when other disable conditions hold.
- Two independent gates must pass before the viewer renders: Autodesk license (`requireLicense`) and APS user auth/permission (`apsAuthenticated`, `userHasPermission`). Missing permission shows `UserTypeNotPermissible`; not logged in shows `ApsLogIn`.
- The widget is heavily coupled to `widgets/shared-code/geobim`; do not attempt to reason about behavior without that shared library.
- FeatureServiceErrors in settings expects exactly one GeoBIM feature service on the bound map; zero or multiple produces warnings.

## Useful snippets and functions

Runtime shell wrapping children in the shared GeoBIM context.
Source: `src/runtime/widget.tsx`
```tsx
const DocumentViewerWidget = (props: AllWidgetProps<IMConfig>): JSX.Element => {
  const { useMapWidgetIds, intl, theme, widgetId, state, manifest } = props
  const { translateMessage } = useSharedMessages(
    intl,
    manifest.translatedLocales,
  )
  const currentMapWidgetId = useMapWidgetIds?.[0]

  const i18nMessage = useCallback(
    (id, values) => {
      const defaultLocaleMessages = {
        ...defaultSharedMessages.default,
        ...defaultMessages,
      }
      return translateMessage(id, defaultLocaleMessages, values)
    },
    [translateMessage],
  )

  return (
    <Paper shape="none" className="jimu-widget widget-document-viewer">
      <GeoBIMProvider
        mapWidgetId={currentMapWidgetId}
        widgetId={widgetId}
        widgetState={state}
      >
        <ModelViewerWidget
          i18nMessage={i18nMessage}
          theme={theme}
          widgetId={widgetId}
        />
      </GeoBIMProvider>
    </Paper>
  )
}
```

REDUX_STORE extension re-exporting the shared GeoBIM store.
Source: `src/extensions/geobim-store.ts`
```ts
import { GeoBIMStoreExtension } from 'widgets/shared-code/geobim'

export default GeoBIMStoreExtension
```

Redux-backed per-widget lock toggle plus GeoBIM/APS gates.
Source: `src/runtime/components/model-viewer-widget.tsx`
```tsx
const modelViewerDisabled = useSelector((state: IMState) =>
  modelViewerDisabledSelector(widgetId, state),
)
const { apsAuthenticated, userHasPermission, geoBIMInitialized } = useGeoBIM()
const { getApsAuthToken } = useApsAuth()
const dispatch = useDispatch<Dispatch<ActionTypes>>()

const toggleDocumentLock = (): void => {
  setModelViewerDisabled(widgetId, !modelViewerDisabled, dispatch)
}
```

Async APS access-token provider passed to the model viewer options.
Source: `src/runtime/hooks/use-geobim-model-viewer-widget.tsx`
```tsx
const modelViewerOptions = useMemo(() => {
  const options: IModelViewerOptions = {
    getAccessToken: async () => {
      const token = await getApsAuthToken()
      return {
        accessToken: token?.accessToken ?? null,
        expiresInSeconds: token?.expiresInSeconds ?? null,
      }
    },
  }
  return options
}, [getApsAuthToken])
```

Settings map selector requiring `id` to persist.
Source: `src/setting/setting.tsx`
```tsx
const onMapWidgetSelected = (newUseMapWidgetIds: string[]): void => {
  // NOTE: settings will NOT be saved without supplying the ID!
  props.onSettingChange({ id, useMapWidgetIds: newUseMapWidgetIds })
}

// ...
<MapWidgetSelector
  autoSelect={false}
  onSelect={onMapWidgetSelected}
  useMapWidgetIds={useMapWidgetIds}
/>
```

Empty config type (only `useMapWidgetIds` is persisted).
Source: `src/config.ts`
```ts
import type { ImmutableObject } from 'seamless-immutable'

export type IMConfig = ImmutableObject<object>
```
