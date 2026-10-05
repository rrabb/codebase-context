# OTB Widget: arcgis/measurement

Online widget doc: https://developers.arcgis.com/experience-builder/guide/measurement-widget/

## Purpose
Provides interactive distance and area measurement on a bound Map widget. It renders the ArcGIS Maps SDK (JSAPI) measurement widgets inside an ExB widget shell, choosing the 2D vs 3D variant based on the active view type. Users pick a tool (distance or area), pick units, measure by clicking on the map, and clear results. It is the canonical example widget referenced in the ExB developer guide (`manifest.json` description: "This is the widget used in developer guide").

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/config.json
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/src/runtime/components/measure-tools.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/src/runtime/components/measure-widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/arcgis/measurement/src/setting/setting.tsx

(dist/ compiled output and translations/*.js not inspected in detail; icon/asset SVG/PNG files not inspected.)

## Architecture overview
Three React function components split by responsibility:

- `Widget` (src/runtime/widget.tsx): top-level shell. Holds `jimuMapView` state via `JimuMapViewComponent`, `activeButton` (which tool is selected), and `activeTool` (the current JSAPI measurement widget instance). Renders a `WidgetPlaceholder` until a map + at least one tool is configured, then renders `MeasureTools` (toolbar/buttons + unit selects) and `MeasureWidget` (JSAPI widget host). Manages ExB auto-control of the map widget.
- `MeasureTools` (src/runtime/components/measure-tools.tsx): pure UI. Renders the distance/area tool `Button`s and, in Toolbar arrangement, the unit `Select` and a clear (`TrashOutlined`) button. Emits `onSelectTool`, `onChangeUnit`, `onClear`. It is a `React.forwardRef` so its root div can be used as the Popper reference/width source.
- `MeasureWidget` (src/runtime/components/measure-widget.tsx): the heavy lifter. Lazy-loads the four JSAPI measurement widget classes + `reactiveUtils`, instantiates the correct one per view type, caches instances per map view id, watches measure state, wires snapping, and destroys instances on cleanup. Hosts the JSAPI DOM either in an inline panel (Classic) or a `Popper` (Toolbar).

Data flow: `Widget` owns `activeButton`/`activeTool`; `MeasureTools` changes `activeButton` via `onSelectTool`; `MeasureWidget` reacts to `activeButton` changes to create/show/start the matching JSAPI widget and calls `setActiveTool` back up so unit-change and clear handlers in `Widget` can act on the live instance.

## Key imports and packages
Grouped by source file.

src/config.ts
```ts
import type AreaMeasurement2D from '@arcgis/core/widgets/AreaMeasurement2D'
import type AreaMeasurement3D from '@arcgis/core/widgets/AreaMeasurement3D'
import type DirectLineMeasurement3D from '@arcgis/core/widgets/DirectLineMeasurement3D'
import type DistanceMeasurement2D from '@arcgis/core/widgets/DistanceMeasurement2D'
import type { ImmutableObject } from 'jimu-core'
```

src/runtime/widget.tsx
```ts
import { React, type AllWidgetProps, hooks, css, classNames, AppMode, type IMState, ReactRedux, WidgetState, appActions, getAppStore } from 'jimu-core'
import { type JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import { Loading, LoadingType, Paper, WidgetPlaceholder, defaultMessages as jimuUIMessages } from 'jimu-ui'
import { MeasurementArrangement, type MeasurementClass, type IMConfig, type MeasureButton } from '../config'
import MeasureTools from './components/measure-tools'
import MeasureWidget from './components/measure-widget'
import defaultMessages from './translations/default'
import MeasurementIcon from '../../icon.svg'
```

src/runtime/components/measure-tools.tsx
```ts
import { React, css, classNames, type ImmutableObject, type WidgetContext } from 'jimu-core'
import { Button, Icon, Select } from 'jimu-ui'
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash'
import { type IMConfig, areaUnitList, lengthUnitList, measurementSystemList, type MeasureButton, MeasurementArrangement, type MeasurementClass } from '../../config'
```

src/runtime/components/measure-widget.tsx
```ts
import { React, css, classNames, AppMode, type IMState, ReactRedux, loadArcGISJSAPIModules, hooks, focusElementInKeyboardMode } from 'jimu-core'
import type { JimuMapView } from 'jimu-arcgis'
import { Button, type FlipOptions, Loading, LoadingType, Popper, type ShiftOptions, Typography } from 'jimu-ui'
import type DistanceMeasurement2D from '@arcgis/core/widgets/DistanceMeasurement2D'
import type AreaMeasurement2D from '@arcgis/core/widgets/AreaMeasurement2D'
import type DirectLineMeasurement3D from '@arcgis/core/widgets/DirectLineMeasurement3D'
import type AreaMeasurement3D from '@arcgis/core/widgets/AreaMeasurement3D'
import { MeasurementArrangement, type MeasurementClass, type IMConfig, type MeasureButton, type MeasureState } from '../../config'
import { Global } from 'jimu-theme'
```

src/setting/setting.tsx
```ts
import { React, hooks, css, classNames, LayoutItemType, defaultMessages as jimuCoreMessages, LayoutType } from 'jimu-core'
import { getAppConfigAction, type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultMessages as jimuUIMessages, Label, Checkbox, Select, Button, Icon, Alert, Switch } from 'jimu-ui'
import { MapWidgetSelector, SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components'
import { ClickOutlined } from 'jimu-icons/outlined/application/click'
import { type IMConfig, MeasurementArrangement, measurementSystemList, lengthUnitList, areaUnitList } from '../config'
import defaultMessages from './translations/default'
import { LayoutItemSizeModes, searchUtils } from 'jimu-layouts/layout-runtime'
```

Notes:
- The four `@arcgis/core/widgets` measurement classes are imported only as `type` in TS source; the actual runtime classes are loaded via `loadArcGISJSAPIModules` (AMD `esri/*` paths), not statically imported. See snippet below.
- `esri/core/reactiveUtils` is also loaded via `loadArcGISJSAPIModules` and used to `watch` viewModel state.

## Reusable patterns found
- JimuMapViewComponent binding: `Widget` renders `<JimuMapViewComponent useMapWidgetId={...} onActiveViewChange={handleActiveViewChange} />` and stores the resulting `JimuMapView` in state, driving a `loading` flag off view presence.
- Dynamic 2D vs 3D JSAPI widget loading: `MeasureWidget` selects `DistanceMeasurement2D` vs `DirectLineMeasurement3D` (and `AreaMeasurement2D` vs `AreaMeasurement3D`) based on `jimuMapView.view.type === '2d'`. All four classes + `reactiveUtils` are lazy-loaded once via `loadArcGISJSAPIModules`.
- Instance caching per map view: `mapViewWidgetRef.current[jimuMapView.id]` caches `measureDistance` / `measureArea` instances so switching tools or returning to a view reuses widgets instead of re-creating them.
- reactiveUtils state watch: `reactiveUtils.watch(() => curTool?.viewModel?.state, (state) => { ... }, { initial: true })` drives a local `MeasureState` and configures snapping when the tool becomes `ready`.
- Snapping config (2D only): when `state === 'ready'` and view is `2d` and the tool has `snappingOptions`, snapping is enabled from `jimuMapView.getSnappingLayers()` unless `disableSnapping` config is set.
- Unit config: `defaultDistanceUnit` / `defaultAreaUnit` are pushed into `viewModel.unit`; unit lists come from `config.ts` (`measurementSystemList`, `lengthUnitList`, `areaUnitList`).
- Auto-control map handshake: selecting a tool dispatches `appActions.requestAutoControlMapWidget(useMapWidgetId, id)`; deselecting dispatches `appActions.releaseAutoControlMapWidget(useMapWidgetId)`. The widget also resets `activeButton` when it loses control (`isControlMapWidget`).
- Click-highlight toggling: original highlight state is captured once, then `disableClickHighlight()` while measuring and `enableClickHighlight()` otherwise, so measurement clicks do not trigger feature popups.
- forwardRef + Popper width sync: `MeasureTools` forwards its root ref; `MeasureWidget` sets `popperRef.style.width = rootRef.offsetWidth + 'px'` so the Toolbar Popper matches the toolbar width.

## Builder vs runtime split
- Runtime: src/runtime/widget.tsx + src/runtime/components/*. Consumes `AllWidgetProps<IMConfig>`, reads `useMapWidgetIds`, `config`, `context`.
- Builder (settings): src/setting/setting.tsx. Consumes `AllWidgetSettingProps<IMConfig>`; uses `MapWidgetSelector` to bind a Map widget and `SettingSection`/`SettingRow` for tool toggles, default units, snapping switch, and arrangement.
- The arrangement setting does more than edit config: `onChangeArrangement` uses `getAppConfigAction()` to also mutate layout item sizing and `inControllerUx`. For FixedLayout items, Toolbar switches width/height to `LayoutItemSizeModes.Auto` and `inControllerUx: 'offPanel'`; Classic switches to `Custom` sizing, `bbox` 300px x 420px, and `inControllerUx: 'inPanel'`. Non-FixedLayout just `exec()`s the config edit. This is a notable pattern: a setting that reshapes the widget's layout footprint.
- `MeasureWidget` reads builder state at runtime too: `state.appContext.isInBuilder` triggers `destroyWidgets()` on `jimuMapView`/`arrangement`/`isInBuilder` changes (via `hooks.useUpdateEffect`) so stale JSAPI widgets are torn down while editing.

## Lifecycle and cleanup
Cleanup is central to this widget. From src/runtime/components/measure-widget.tsx:

- Destroy callback:
```ts
// destroy widgets before unmount
const destroyWidgets = React.useCallback(() => {
  Object.values(mapViewWidgetRef.current).forEach(mapViewWidget => {
    mapViewWidget.measureDistance?.destroy?.()
    mapViewWidget.measureDistance = null
    mapViewWidget.measureArea?.destroy?.()
    mapViewWidget.measureArea = null
  })
}, [])
```
- Unmount effect (also clears the up-lifted active tool):
```ts
React.useEffect(() => {
  return () => {
    destroyWidgets()
    setActiveTool(null)
  }
}, [destroyWidgets, setActiveTool])
```
- In-builder teardown on view/arrangement change:
```ts
hooks.useUpdateEffect(() => {
  if (isInBuilder) {
    destroyWidgets()
    setMeasureState('disabled')
  }
}, [jimuMapView, arrangement, isInBuilder])
```
- reactiveUtils watch handle cleanup happens inside the main tool-switch effect before creating a new watch:
```ts
// clear previous watch
if (watchRef.current) {
  watchRef.current?.remove?.()
  watchRef.current = null
}
```
- Previous tool is hidden and, if `ready`/`measuring`, cleared when switching tools:
```ts
const prevState = prevTool?.viewModel?.state
if (['ready', 'measuring'].includes(prevState)) {
  prevTool.viewModel.clear()
}
```

## Manifest/config requirements
manifest.json (key fields):
```json
{
  "name": "measurement",
  "label": "Measurement",
  "type": "widget",
  "version": "1.20.0",
  "exbVersion": "1.20.0",
  "defaultSize": { "width": 300, "height": 420 },
  "properties": { "coverLayoutBackground": true },
  "dependency": [ "jimu-arcgis" ]
}
```
- `dependency: ["jimu-arcgis"]` is required because the widget binds a Map widget and loads JSAPI modules. Note it does NOT declare an explicit `arcgis-maps-sdk` / JSAPI CDN dependency in the manifest; JSAPI classes are pulled at runtime via `loadArcGISJSAPIModules`.
- `properties.coverLayoutBackground: true`.
- `defaultSize` 300x420 matches the Classic arrangement bbox restored by the setting.

Default config (config.json):
```json
{
  "enableDistance": true,
  "defaultDistanceUnit": "metric",
  "enableArea": true,
  "defaultAreaUnit": "metric",
  "arrangement": "CLASSIC"
}
```
Note: `config.json` does not include `disableSnapping`; the code defaults it to `false` via destructuring defaults (`disableSnapping = false`).

Config type (src/config.ts):
```ts
export interface Config {
  enableDistance: boolean
  defaultDistanceUnit: __esri.SystemOrLengthUnit
  enableArea: boolean
  defaultAreaUnit: __esri.SystemOrAreaUnit
  arrangement: MeasurementArrangement
  disableSnapping: boolean
}

export enum MeasurementArrangement {
  Classic = 'CLASSIC',
  Toolbar = 'TOOLBAR'
}
```

## Gotchas
- `disableSnapping` is not in config.json; rely on the destructuring default `= false`. If you copy this widget, keep the default or add it to config.json.
- Snapping is only wired for 2D views (`jimuMapView.view.type === '2d'` and `'snappingOptions' in curTool`). 3D DirectLine/Area widgets do not get the same snapping setup here. (Comment in source: "DistanceMeasurement2D and AreaMeasurement2D disabled snapping by default".)
- Tool DOM is not unmounted between switches; instead `container.style.visibility/height/overflow` are toggled to hide/show, and the container is `prepend`ed into the active host. Forgetting the visibility toggling would leave stale JSAPI panels visible.
- The JSAPI classes are used as `new WidgetClass({...})` where `WidgetClass` is resolved at runtime; the TS cast `as (DistanceMeasurement2D | DirectLineMeasurement3D) & (AreaMeasurement2D | AreaMeasurement3D)` is a source-level union-cast, not real runtime typing.
- Click highlight: only toggled if `originIsClickHighlight` was truthy at mount (`jimuMapView?.isClickHighlightEnabled?.()`). If the map had highlight off, this widget will not re-enable it.
- Auto-control: the widget requests/releases auto control of the map widget on tool select/deselect and resets `activeButton` when it loses control. Two measurement widgets on the same map would contend for control.
- The main tool-switch effect has a large dependency array; changes to `defaultDistanceUnit`, `defaultAreaUnit`, `disableSnapping`, `arrangement` (via `containerRef`), or `jsApiModules` all re-run it. UNVERIFIED (src/runtime/components/measure-widget.tsx): exact re-entrancy behavior when several of these change simultaneously was not runtime-tested here.
- `Widget`'s reset effect resets `activeButton` on many deps including `isDesignMode`, `enableDistance`, `enableArea`, `arrangement`, `isClosed`, `useMapWidgetIds`, `jimuMapView` - so any config or view change stops the active measurement.

## Useful snippets and functions

Lazy-load the JSAPI measurement modules + reactiveUtils
Source: src/runtime/components/measure-widget.tsx
```ts
const [jsApiModules, setJsApiModules] = React.useState<JsApiModules>(null)
React.useEffect(() => {
  setLoading(true)
  loadArcGISJSAPIModules([
    'esri/widgets/DistanceMeasurement2D',
    'esri/widgets/AreaMeasurement2D',
    'esri/widgets/DirectLineMeasurement3D',
    'esri/widgets/AreaMeasurement3D',
    'esri/core/reactiveUtils'
  ]).then((modules) => {
    const [DistanceMeasurement2D, AreaMeasurement2D, DirectLineMeasurement3D, AreaMeasurement3D, reactiveUtils] = modules
    setJsApiModules({ DistanceMeasurement2D, AreaMeasurement2D, DirectLineMeasurement3D, AreaMeasurement3D, reactiveUtils })
    setLoading(false)
  })
}, [])
```

Select 2D vs 3D class by view type and cache per map view
Source: src/runtime/components/measure-widget.tsx
```ts
let WidgetClass, unit: __esri.SystemOrLengthUnit | __esri.SystemOrAreaUnit
const { DistanceMeasurement2D, AreaMeasurement2D, DirectLineMeasurement3D, AreaMeasurement3D, reactiveUtils } = jsApiModules
const mapViewWidget = mapViewWidgetRef.current[jimuMapView.id] || (mapViewWidgetRef.current[jimuMapView.id] = {})
if (activeButton === 'measureDistance') {
  WidgetClass = jimuMapView.view.type === '2d' ? DistanceMeasurement2D : DirectLineMeasurement3D
  unit = defaultDistanceUnit
} else if (activeButton === 'measureArea') {
  WidgetClass = jimuMapView.view.type === '2d' ? AreaMeasurement2D : AreaMeasurement3D
  unit = defaultAreaUnit
} else {
  setMeasureState('disabled')
  return
}
if (!mapViewWidget[activeButton]) {
  if (WidgetClass && unit) {
    mapViewWidget[activeButton] = new WidgetClass({
      id: `${id}-${jimuMapView.id}-${activeButton}`,
      container: document.createElement('div'),
      view: jimuMapView.view,
      unit,
      visible: true
    }) as (DistanceMeasurement2D | DirectLineMeasurement3D) & (AreaMeasurement2D | AreaMeasurement3D)
  }
}
```

Watch viewModel state and configure snapping (2D)
Source: src/runtime/components/measure-widget.tsx
```ts
containerRef.current.prepend(curTool.container)
watchRef.current = reactiveUtils.watch(
  () => curTool?.viewModel?.state,
  (state) => {
    setMeasureState(state || 'disabled')
    // DistanceMeasurement2D and AreaMeasurement2D disabled snapping by default
    if (state === 'ready' && jimuMapView.view.type === '2d' && 'snappingOptions' in curTool) {
      if (disableSnapping) {
        curTool.snappingOptions = { enabled: false } as __esri.SnappingOptionsProperties
        return
      }
      const featureSources = jimuMapView.getSnappingLayers()
        .map(layer => ({enabled: true, layer}))
      const snappingOptions = {
        enabled: true,
        selfEnabled: true,
        gridEnabled: true,
        featureEnabled: true,
        featureSources
      } as __esri.SnappingOptionsProperties
      curTool.snappingOptions = snappingOptions
    }
  },
  {initial: true}
)
```

Start/clear via viewModel
Source: src/runtime/components/measure-widget.tsx and src/runtime/widget.tsx
```ts
// start when a tool becomes active and is not already measured
const curState = curTool?.viewModel?.state
setMeasureState(curState || 'disabled')
if (curState !== 'measured' && curTool) {
  curTool.viewModel.start()
}

// clear (from widget.tsx)
const handleClear = React.useCallback(() => {
  activeTool && activeTool.viewModel.clear()
}, [activeTool])
```

Change unit on the live tool
Source: src/runtime/widget.tsx
```ts
const handleChangeUnit = React.useCallback((unit: __esri.SystemOrLengthUnit | __esri.SystemOrAreaUnit) => {
  if (activeTool) {
    activeTool.unit = unit
  }
}, [activeTool])
```

Auto-control map widget on tool select/deselect
Source: src/runtime/widget.tsx
```ts
const handleSelectTool = (measureButton: MeasureButton) => {
  if (measureButton.name === activeButton) {
    setActiveButton('')
    const action = appActions.releaseAutoControlMapWidget(useMapWidgetId)
    getAppStore().dispatch(action)
  } else {
    setActiveButton(measureButton.name)
    const action = appActions.requestAutoControlMapWidget(useMapWidgetId, id)
    getAppStore().dispatch(action)
  }
}
```

Disable click-highlight while measuring
Source: src/runtime/components/measure-widget.tsx
```ts
const originIsClickHighlight = React.useMemo(() => jimuMapView?.isClickHighlightEnabled?.(), [jimuMapView])
React.useEffect(() => {
  if (originIsClickHighlight) {
    if (['ready', 'measuring'].includes(measureState)) {
      jimuMapView.disableClickHighlight()
    } else {
      jimuMapView.enableClickHighlight()
    }
  }
}, [jimuMapView, measureState, originIsClickHighlight])
```

Arrangement setting reshaping layout (builder)
Source: src/setting/setting.tsx
```ts
const onChangeArrangement = (value: MeasurementArrangement) => {
  const appConfigAction = getAppConfigAction()
  appConfigAction.editWidget({ id, config: config.set('arrangement', value) })
  const layoutInfos = searchUtils.getLayoutInfosHoldContent(appConfigAction.appConfig, LayoutItemType.Widget, id)
  layoutInfos.forEach(layoutInfo => {
    const layoutType = appConfigAction.appConfig.layouts[layoutInfo.layoutId].type
    if (layoutType !== LayoutType.FixedLayout) {
      appConfigAction.exec()
      return
    }
    if (value === MeasurementArrangement.Toolbar) {
      appConfigAction
        .editLayoutItemProperty(layoutInfo, 'setting.autoProps.width', LayoutItemSizeModes.Auto)
        .editLayoutItemProperty(layoutInfo, 'setting.autoProps.height', LayoutItemSizeModes.Auto)
        .editWidgetProperty(id, 'inControllerUx', 'offPanel')
        .exec()
    } else if (value === MeasurementArrangement.Classic) {
      appConfigAction
        .editLayoutItemProperty(layoutInfo, 'setting.autoProps.width', LayoutItemSizeModes.Custom)
        .editLayoutItemProperty(layoutInfo, 'setting.autoProps.height', LayoutItemSizeModes.Custom)
        .editLayoutItemProperty(layoutInfo, 'bbox.width', '300px')
        .editLayoutItemProperty(layoutInfo, 'bbox.height', '420px')
        .editWidgetProperty(id, 'inControllerUx', 'inPanel')
        .exec()
    }
  })
}
```

Tool button config with per-context asset URLs
Source: src/runtime/components/measure-tools.tsx
```ts
const measureButtons: MeasureButton[] = [
  {
    name: 'measureDistance',
    icon: `${context.folderUrl}dist/runtime/assets/measure-distance.svg`,
    enabled: enableDistance
  },
  {
    name: 'measureArea',
    icon: `${context.folderUrl}dist/runtime/assets/measure-area.svg`,
    enabled: enableArea
  }
]
```
