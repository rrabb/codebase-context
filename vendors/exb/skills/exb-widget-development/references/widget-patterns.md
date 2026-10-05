# ExB Widget Patterns (copy-ready templates)

Templates distilled from this repo's real widgets (`schema-switcher`, `grid-overlay`, `simple`,
`branch-version-editor`). ExB 1.20 / React 19 / JSAPI 5.0.x.

---

## 1. `manifest.json`

Barebones (no map):

```json
{
  "name": "my-widget",
  "label": "My Widget",
  "type": "widget",
  "version": "1.20.0",
  "exbVersion": "1.20.0",
  "author": "your-name",
  "description": "What this widget does.",
  "license": "http://www.apache.org/licenses/LICENSE-2.0",
  "properties": {},
  "translatedLocales": ["en"],
  "defaultSize": { "width": 800, "height": 500 }
}
```

Map/JSAPI widget — add dependencies (enables `JimuMapView`, the `esri/*` alias, and `__esri`):

```json
{
  "dependency": ["jimu-arcgis"],
  "settingDependency": "jimu-arcgis"
}
```

- `"defaultSize"` may use numbers or `"AUTO"` (e.g. a dropdown-style widget: `{ "width": "AUTO", "height": "AUTO" }`).
- Premium/enterprise gating: `"requireLicense": "Enterprise"`.
- After editing `manifest.json`, **restart the client dev server** (webpack watch limitation).

---

## 2. `config.ts` — typed, immutable config

```ts
import type { ImmutableObject } from 'seamless-immutable'

/** Persisted, immutable widget configuration (authored in settings). */
export interface Config {
  exampleText?: string
  /** Store ArcGIS layer.id values, not JimuLayerView ids. */
  layerIds?: string[]
  enabled?: boolean
}

export type IMConfig = ImmutableObject<Config>
```

- Optional `config.json` beside `config.ts` supplies default values.
- **Read arrays with `Array.from(props.config.layerIds ?? [])`.** `ImmutableArray<string>` is not assignable to `readonly string[]`.

---

## 3. Runtime `src/runtime/widget.tsx`

Minimal:

```tsx
import { React, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'

const Widget = (props: AllWidgetProps<IMConfig>) => {
  return (
    <div className="widget-my-widget jimu-widget m-2">
      <p>{props.config.exampleText}</p>
    </div>
  )
}

export default Widget
```

With a bound map view (the golden path):

```tsx
import { React, type AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent } from 'jimu-arcgis'
import type { IMConfig } from '../config'
import { useJimuMapView } from './useJimuMapView'

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const { view, onActiveViewChange } = useJimuMapView()

  React.useEffect(() => {
    if (!view?.map) return
    // interact with view.map.allLayers, view.goTo, etc.
  }, [view])

  return (
    <div className="widget-my-widget jimu-widget">
      {props.useMapWidgetIds?.[0] && (
        <JimuMapViewComponent
          useMapWidgetId={props.useMapWidgetIds[0]}
          onActiveViewChange={onActiveViewChange}
        />
      )}
      {/* widget UI */}
    </div>
  )
}

export default Widget
```

### The map-view hook — `src/runtime/useJimuMapView.tsx`

```tsx
import { useState, useCallback } from 'react'
import type { JimuMapView } from 'jimu-arcgis'

interface UseJimuMapViewResult {
  jimuMapView: JimuMapView | null
  view: __esri.MapView | __esri.SceneView | null
  onActiveViewChange: (jmv: JimuMapView) => void
}

export function useJimuMapView (): UseJimuMapViewResult {
  const [jimuMapView, setJimuMapView] = useState<JimuMapView | null>(null)

  const onActiveViewChange = useCallback((jmv: JimuMapView) => {
    if (!jmv?.view) return
    setJimuMapView(jmv)
  }, [])

  return { jimuMapView, view: jimuMapView?.view ?? null, onActiveViewChange }
}
```

> Why not `MapViewManager.getAllJimuMapViewIds()[0]`? The widget's `useMapWidgetIds` value can differ
> from the internal JimuMapView id (e.g. `widget_1` vs `widget_1-dataSource_1`). Bind via the component.

---

## 4. Settings `src/setting/setting.tsx`

```tsx
import { React, type ImmutableArray } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import {
  MapWidgetSelector, JimuMapViewSelector, JimuLayerViewSelector,
  SettingSection, SettingRow
} from 'jimu-ui/advanced/setting-components'
import { MapViewManager, type JimuMapView } from 'jimu-arcgis'
import type { IMConfig } from '../config'

const { useState, useCallback } = React

export default function Setting (props: AllWidgetSettingProps<IMConfig>): React.ReactElement {
  const { id, config, useMapWidgetIds, onSettingChange } = props
  const [jimuMapViewId, setJimuMapViewId] = useState<string>('')

  const onMapWidgetSelected = useCallback((ids: string[]) => {
    setJimuMapViewId('') // a different map means a different layer set
    onSettingChange({ id, useMapWidgetIds: ids })
  }, [id, onSettingChange])

  const hasMapWidget = !!useMapWidgetIds?.length

  return (
    <div className="widget-setting-my-widget p-2">
      <SettingSection title="Select Map widget">
        <SettingRow>
          <MapWidgetSelector onSelect={onMapWidgetSelected} useMapWidgetIds={useMapWidgetIds} />
        </SettingRow>
      </SettingSection>

      {hasMapWidget && (
        <SettingSection title="Select Map view">
          <SettingRow>
            <JimuMapViewSelector
              useMapViewIds={jimuMapViewId ? [jimuMapViewId] : []}
              onChange={(ids) => { setJimuMapViewId(ids?.[0] ?? '') }}
            />
          </SettingRow>
        </SettingSection>
      )}

      {jimuMapViewId && (
        <SettingSection title="Select layers">
          <SettingRow>
            <JimuLayerViewSelector
              jimuMapViewId={jimuMapViewId}
              isMultiSelection
              selectedValues={/* jimuLayerViewIds, see conversion below */[]}
              onChange={(jlvIds) => {
                onSettingChange({ id, config: config.set('layerIds', jlvIdsToLayerIds(jimuMapViewId, jlvIds)) })
              }}
            />
          </SettingRow>
        </SettingSection>
      )}
    </div>
  )
}
```

### Persisting settings

- Config: `onSettingChange({ id, config: config.set('key', value) })` (immutable `.set`/`.setIn`).
- Map binding: `onSettingChange({ id, useMapWidgetIds: ids })`.

### Layer pickers deal in `jimuLayerViewId`, not raw `layer.id`

`JimuLayerViewSelector` values are `jimuLayerViewId`s of the form `${jimuMapViewId}-${jimuLayerId}`.
The runtime and config store raw ArcGIS `layer.id`. Convert both ways (await layer views first):

```ts
// selected jimuLayerViewIds -> raw layer.ids (for saving)
function jlvIdsToLayerIds (jmvId: string, jlvIds: string[]): string[] {
  const jmv = MapViewManager.getInstance().getJimuMapViewById(jmvId)
  const jlvs = jmv?.jimuLayerViews
  if (!jlvs) return []
  return jlvIds.map(id => jlvs[id]?.layer?.id).filter(Boolean)
}

// stored layer.ids -> current view's jimuLayerViewIds (for selectedValues)
function layerIdsToJlvIds (jmv: JimuMapView | null, layerIds: string[] = []): string[] {
  const jlvs = jmv?.jimuLayerViews
  if (!jlvs || !layerIds.length) return []
  const wanted = new Set(layerIds)
  return Object.keys(jlvs).filter(k => wanted.has(jlvs[k]?.layer?.id))
}
```

Call `await jmv.whenAllJimuLayerViewLoaded()` before converting (layer views load asynchronously; with
400+ layers, memoize the conversion).

---

## 5. Using a data source (non-map data)

```tsx
import { React, DataSourceComponent, type UseDataSource, type DataSource, type FeatureLayerDataSource } from 'jimu-core'

const Widget = (props) => {
  const [ds, setDs] = React.useState<FeatureLayerDataSource | null>(null)

  const onDsCreated = (dataSource: DataSource) => setDs(dataSource as FeatureLayerDataSource)

  const query = async () => {
    if (!ds) return
    const result = await ds.query({ where: '1=1', outFields: ['*'], returnGeometry: false })
    // result.records -> DataRecord[]; record.getData(), record.getFeature()
  }

  return (
    <>
      {props.useDataSources?.[0] && (
        <DataSourceComponent useDataSource={props.useDataSources[0]} onDataSourceCreated={onDsCreated} />
      )}
    </>
  )
}
```

Settings side: pick sources with `DataSourceSelector` from `jimu-ui/advanced/data-source-selector`, and
persist via `onSettingChange({ id, useDataSources })`.

---

## 6. i18n — `src/runtime/translations/default.ts`

```ts
export default {
  _widgetLabel: 'My Widget',
  greeting: 'Hello {name}'
}
```

```tsx
// in the widget:
props.intl.formatMessage({ id: 'greeting', defaultMessage: 'Hello {name}' }, { name: 'World' })
// or the hook:
const t = hooks.useTranslation(defaultMessages)
```

---

## 7. Type-check & run

```sh
# authoritative type-check (strictNullChecks off, matches the real build; from repo root)
npm run tscheck:bve

# dev server (from repo root) -> https://localhost:3001
npm start
```

Ignore editor/`get_errors` `strictNullChecks` null-assignment noise (e.g. `useState<T>(null)`); confirm
real errors with `tsc`. `get_errors` can also show stale diagnostics after edits — re-run `tsc`.

---

## 8. OOTB-verified patterns

These are lifted from the OOTB Esri widget source (`ArcGISExperienceBuilder/client/dist/widgets/{arcgis,common}/*`).
See [ootb-widget-index.md](ootb-widget-index.md) to find the widget that best matches your feature.

### 8a. Config migration — `src/version-manager.ts`

When you change the `Config` structure, add a version entry so existing saved apps upgrade. This is a
near-universal OOTB convention (`arcgis/draw`, `common/edit`, `common/list`). If an upgrade must also change the widget JSON (for example `useDataSources`) or output data sources, extend `WidgetVersionManager` instead and set `upgradeFullInfo: true` on that version (`jimu-core/lib/base-widget.d.ts`; local guide `make-widgets-backward-compatible`).

```ts
// src/version-manager.ts
import { BaseVersionManager } from 'jimu-core'

class VersionManager extends BaseVersionManager {
  versions = [{
    version: '1.20.0',
    description: 'add measurementsInfo',
    upgrader: (oldConfig) => oldConfig.setIn(['measurementsInfo'], { decimalPlaces: { point: 5 } })
  }]
}

export const versionManager: BaseVersionManager = new VersionManager()
```

```tsx
// src/runtime/widget.tsx — attach it to the widget
import { versionManager } from '../version-manager'
const Widget = (props: AllWidgetProps<IMConfig>) => { /* ... */ }
Widget.versionManager = versionManager
export default Widget
```

### 8b. Widget lifecycle, state & visibility — `WidgetState`, `windowState`, viewport

ExB tracks each widget's lifecycle in `state.widgetsRuntimeInfo[widgetId]` (`RuntimeInfo` in
`jimu-core/lib/types/state.d.ts`) and injects that slice into your widget props. Reference
implementation in this repo: `src/widgets/branch-version-editor/src/runtime/components/use-widget-lifecycle.ts`.

**Framework-provided signals (do not hand-roll):**
- `props.state` — `WidgetState` enum: `Opened`/`Active`/`Closed`/`Hidden`. **`undefined` is normal**: a
  plain shown widget has *no* state (ExB skips tracking for perf), so always treat `!state` as "shown".
- `props.windowState` — `'normal' | 'minimized' | 'maximized'` (floating-panel placement only).
- `props.controllerWidgetId` — set when the widget lives inside a Widget Controller.
- `ViewportVisibilityContext` — `import { ViewportVisibilityContext } from 'jimu-layouts/layout-runtime'`
  (a `React.Context<boolean>`; read with `React.useContext`). Browser-viewport **scroll** intersection.
- `props.isClassLoaded` — the widget class is loaded.

**Manifest gates (default `false`; without them the state never appears):**
- `needActiveState` → enables `ACTIVE`.
- `needHiddenState` → enables `HIDDEN` when the layout container is hidden.
- `watchViewportVisibility` → installs the `ViewportVisibilityContext` provider.

**Canonical "am I visible" derivation (OOTB `common/edit`):**

```tsx
import { React, WidgetState, type AllWidgetProps } from 'jimu-core'

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const { state, controllerWidgetId } = props
  const visible = controllerWidgetId
    ? [WidgetState.Active, WidgetState.Opened].includes(state)
    : state !== WidgetState.Hidden
  // gate expensive work / effects on `visible`
}
```

**Verified placement behavior — Section widget + View Navigation (NOT a controller):**
- Showing/hiding a view drives `HIDDEN` ⇄ `undefined`. This is the ONLY stable visible/hidden signal here.
- `OPENED`/`CLOSED` are documented as controller-only, but a **Section behaves controller-like** and
  emits transient `undefined → ACTIVE → OPENED → HIDDEN` sequences during show/hide. `state` is a
  **single value** — those are steps passed through in milliseconds; only the final resting value counts.
  `CLOSED` does NOT appear in a Section (it uses `HIDDEN`).
- **React to the HIDDEN boundary (suspend/resume), NOT the transient `ACTIVE`/`OPENED` churn.**
- **`inViewport` is not a container-hide signal.** It tracks scroll position and stays `true` in a fixed
  Section/panel (collapsing the panel doesn't scroll the widget out of the viewport). It only flips on a
  long **scrollable page**. Don't use it for show/hide in panels — `watchViewportVisibility` is only
  worth enabling for scrollable-page placements.
- **Mount != visible.** ExB mounts the component into the DOM while it is `HIDDEN`.
- **`HIDDEN` is a pause, not a teardown** — the component stays mounted. Suspend interactivity (remove
  map handlers, restore cursor) and keep session refs; do full teardown on **unmount** and explicit Stop.

**Reading state — `props.state` vs `useSelector`:** same value. `props.state` is the framework's public
mirror of `widgetsRuntimeInfo[id].state`; prefer it for *your own* state (no id juggling, no coupling to
the internal store shape). Use `ReactRedux.useSelector((s: IMState) => s.widgetsRuntimeInfo?.[otherId]?.state)`
only to observe **another** widget's state (or a store slice not in your props). Don't wrap a selector in
`useCallback` (selector identity doesn't cause re-subscription or re-render); for expensive/derived
selectors use `reselect`, not `useCallback`.

### 8c. "Select a map" placeholder — `WidgetPlaceholder`

Show a placeholder until a Map widget is bound (from `arcgis/draw`):

```tsx
import { WidgetPlaceholder } from 'jimu-ui'
import DrawIcon from '../../icon.svg'

if (!props.useMapWidgetIds?.[0]) {
  return <WidgetPlaceholder icon={DrawIcon} widgetId={props.id} message={props.intl.formatMessage({ id: '_widgetLabel' })} />
}
```

### 8d. Advanced map UI — `jimu-ui/advanced/map`

Rich map interactions ship as advanced components, e.g. the drawing toolbar:

```tsx
import { JimuDraw, type JimuDrawVisibleElements, SnappingMode } from 'jimu-ui/advanced/map'
// <JimuDraw jimuMapView={currentJimuMapView} visibleElements={visibleElements} onDrawingFinished={...} />
```

### 8e. Emotion styling (OOTB style) — the `jsx` pragma + `style.ts`

OOTB widgets style with emotion instead of CSS classes. Both are valid in this repo (custom widgets
here also use plain `widget-<name>` CSS classes).

```tsx
/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import { getStyles } from './style'

const Widget = (props) => {
  const theme = props.theme // IMThemeVariables
  return <div css={getStyles(theme)}>…</div>
}
```

```ts
// src/runtime/style.ts
import { css, type SerializedStyles, type IMThemeVariables } from 'jimu-core'
export function getStyles (theme: IMThemeVariables): SerializedStyles {
  return css`
    padding: ${theme.sys.spacing?.(2)};
    color: ${theme.sys.color.primary.main};
  `
}
```

### 8f. Inter-widget messaging & data actions

Declare in `manifest.json`, then publish/handle via `MessageManager` / data-action classes. The Map
widget (`arcgis/arcgis-map`) is the canonical example.

```jsonc
// manifest.json
{
  "publishMessages": ["EXTENT_CHANGE", "DATA_RECORDS_SELECTION_CHANGE"],
  "messageActions": [
    { "name": "panTo", "label": "Pan to", "uri": "message-actions/pan-to-action", "settingUri": "message-actions/pan-to-action-setting" }
  ]
}
```

```ts
// publish a message
import { MessageManager, DataRecordsSelectionChangeMessage } from 'jimu-core'
MessageManager.getInstance().publishMessage(new DataRecordsSelectionChangeMessage(props.id, records))
```

Data actions (export CSV/JSON/GeoJSON, custom) live under `src/data-actions/` and are declared in the
manifest — see `common/edit/src/data-actions/edit.ts` and jimu-core's `ExportCSV`/`ExportJSON`/`ExportGeoJSON`.
