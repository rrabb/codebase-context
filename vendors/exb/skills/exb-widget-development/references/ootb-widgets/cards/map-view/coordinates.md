# OTB Widget: arcgis/coordinates

Online widget doc: https://developers.arcgis.com/experience-builder/guide/coordinates-widget/

## Purpose
A Map/Scene widget that reads coordinates from a bound Map widget and displays them in one or more configurable output coordinate systems. It supports two live modes: real-time readout as the pointer moves over the map, and a click-to-locate mode that drops a pin and computes the coordinate for a single clicked point. For 3D (SceneView) it additionally reports ground/feature elevation (elev) and camera eye altitude (eye). Manifest `description`: "A widget to obtain coordinates from the map or scene." It can render MGRS, USNG, DD, DDM, DMS, and projected units, and can transform between datums via the geometry service.

## Source paths inspected
All under `ArcGISExperienceBuilder/client/dist/widgets/arcgis/coordinates/` (gitignored; read with includeIgnoredFiles). `dist/` and `tests/` intentionally ignored.
- `manifest.json`
- `config.json` (default config values)
- `src/config.ts`
- `src/runtime/widget.tsx`
- `src/runtime/components/elev-eye.tsx`
- `src/runtime/components/text-auto-fit.tsx`
- `src/runtime/style.ts` (referenced via `getStyle`; not fully quoted here)
- `src/utils/index.ts`
- `src/tools/builder-operations.ts`
- `src/setting/setting.tsx`
- `src/setting/system-config.tsx`

## Architecture overview
- Single functional runtime `Widget` in `src/runtime/widget.tsx`. It binds to one map widget via `useMapWidgetIds[0]`, listens through `JimuMapViewComponent`, and keeps all live geometry state (`currentJimuMapView`, `geoInfo`, `elevInfo`/`eyeInfo`, marker graphic) in React state + refs.
- Two visual styles selected by `config.widgetStyle` (`WidgetStyleType.classic` vs `modern`):
  - Classic: single-line `Paper` with locate button, truncated info text, copy button, and system dropdown.
  - Modern: a `Card` (CardBody + CardFooter) that uses auto-fitting text (`TextAutoFit`) and, in 3D, the `ElevEye` sub-panel.
- Coordinate math lives in `src/utils/index.ts` (unit tables, DMS/DDM formatting, WKT parsing, unit-rate conversion).
- Settings (`src/setting/setting.tsx`) manage the list of output systems; per-system detail editing is in `src/setting/system-config.tsx` inside a `SidePopper`.
- A `BUILDER_OPERATIONS` extension (`src/tools/builder-operations.ts`) exposes each system's `name` as a translatable string key.

## Key imports and packages
Grouped by source file.

`src/runtime/widget.tsx`:
- `jimu-core`: `React, classNames, type AllWidgetProps, utils, moduleLoader, lodash, ReactResizeDetector, hooks, type IMState, ReactRedux, css, getAppStore, appActions, loadArcGISJSAPIModule`
- `jimu-arcgis`: `type JimuMapView, JimuMapViewComponent`
- `jimu-ui`: `Alert, Button, Card, CardBody, CardFooter, Dropdown, DropdownButton, DropdownItem, DropdownMenu, Paper, WidgetPlaceholder, defaultMessages as jimuDefaultMessages`
- `jimu-ui/basic/copy-button`: `CopyButton`
- `jimu-icons/outlined/directional/down`: `DownOutlined`
- `jimu-icons/outlined/editor/locator`: `LocatorOutlined`
- `jimu-layouts/layout-runtime`: `LayoutItemSizeModes`
- JSAPI: `esri/Graphic` (Graphic), `esri/layers/GraphicsLayer` (GraphicsLayer), `esri/geometry/SpatialReference` (SpatialReference), `esri/symbols/PictureMarkerSymbol` (PictureMarkerSymbol), `esri/geometry/coordinateFormatter` (`* as coordinateFormatter`), `esri/geometry/support/webMercatorUtils` (`* as webMercatorUtils`), `esri/geometry/Point` (Point), `esri/rest/geometryService` (`* as geometryService`), `esri/rest/support/ProjectParameters` (ProjectParameters), `esri/core/reactiveUtils` (`* as reactiveUtils`)
- `esri/geometry/operators/projectOperator` is loaded lazily at runtime via `loadArcGISJSAPIModule('esri/geometry/operators/projectOperator')` (not a top-level import).
- `jimu-core/wkid` loaded lazily via `moduleLoader.loadModule<typeof JimuCoreWkid>('jimu-core/wkid')`
- local: `../config`, `./translations/default`, `../utils`, `./style`, `./components/text-auto-fit`, `./components/elev-eye`, `../../icon.svg`

`src/setting/setting.tsx`:
- `jimu-core`: `React, jsx, Immutable, defaultMessages as jimuCoreMessages, urlUtils, moduleLoader, hooks`
- `jimu-for-builder`: `type AllWidgetSettingProps, builderAppSync, getAppConfigAction`
- `jimu-ui`: `Button, defaultMessages as jimuMessages, Icon, Label, NumericInput, Radio, Switch, Tooltip`
- `jimu-ui/advanced/setting-components`: `MapWidgetSelector, SettingRow, SettingSection, SidePopper`
- `jimu-ui/basic/list-tree`: `List, TreeItemActionType`
- `jimu-arcgis`: `type JimuMapView, JimuMapViewComponent`
- `jimu-core/wkid` (typed lazy load), local `./system-config`, `./style`, `../config`

`src/setting/system-config.tsx`:
- `jimu-core`: `React, jsx, type IMThemeVariables, type ImmutableArray, hooks`
- `jimu-ui`: `Link, Select, Tooltip, Label, Radio, Button, NumericInput, Loading, LoadingType, Checkbox, TextInput`
- `jimu-ui/advanced/setting-components`: `SettingRow, SettingSection`
- `jimu-arcgis`: `type JimuMapView, loadArcGISJSAPIModules` (loads `esri/geometry/SpatialReference`)

## Reusable patterns found
- **Map binding via `JimuMapViewComponent`**: rendered near the end of the tree; `onActiveViewChange` sets `currentJimuMapView`, records `mapWkid` and `mapPortalId` from `view.spatialReference.wkid` / `(view.map).portalItem.id`. Settings also uses `onViewsCreate` to capture all views for multi-map support.
- **`coordinateFormatter.load()` before MGRS/USNG**: `displayUsngOrMgrs` calls `coordinateFormatter.load().then(...)` and then `coordinateFormatter.toMgrs(point, 'automatic', 5)` / `coordinateFormatter.toUsng(point, 5)`.
- **Live pointer capture**: a `useUpdateEffect` attaches `view.on('pointer-move', ...)` when `enableRealtime` is true, else attaches `view.on('click', ...)` only when locate is active. Handles are stored in `moveListener` / `clickListener` refs and removed before re-binding.
- **Basemap watch via `reactiveUtils.watch`**: watches `view.map.basemap`; on change it re-reads `basemapView.view.spatialReference.wkid`, resets cursor to default, re-checks unit/system tips, and clears the marker.
- **Multi-system output**: `config.coordinateSystem` is an `ImmutableArray<CoordinateConfig>`; a `Dropdown` lets the user switch active `selectedSystemId`. Supports geographic (DD/DDM/DMS/GRAD/MGRS/USNG) and projected units.
- **Client vs geometry-service compute**: `canShowInClient` decides whether a coordinate can be computed locally (same spatial reference, or the 4326 <-> WebMercator special case). If not, it calls `geometryService.project(utils.getGeometryService(), params)` with `ProjectParameters` (optionally with a datum `transformation`).
- **Lazy `projectOperator`**: `esri/geometry/operators/projectOperator` is loaded and `.load()`ed on demand to convert projected points to GCS for MGRS/USNG.
- **`BUILDER_OPERATIONS` extension**: `getTranslationKey` returns one `{ keyType: 'value', key: '...coordinateSystem[i].name', valueType: 'text' }` per system so system names are translatable.
- **`MapWidgetSelector`** in settings binds the widget to a map widget; the `ClickOutlined` empty-placeholder prompts the user to pick a map.
- **`SidePopper` detail panel**: per-system configuration (WKID, datum, units, elevation unit) edited in a side panel via `SystemConfig`.
- **WKID validation via `jimu-core/wkid`**: settings lazy-loads the wkid module and uses `wkidLookup`, `isValidWkid`, `isValidDatumWkid`, `getSRLabel`, `getDatumSRLabel`, `getCSUnit`, `isSameSpheroid` to validate and label spatial references.
- **Auto-fit text**: `TextAutoFit` and `ElevEye` scale text via `transform: scale(...)` computed from container vs text client sizes, driven by a `ReactResizeDetector` on the widget container.

## Builder vs runtime split
- Runtime: `src/runtime/widget.tsx` + `components/*` + `style.ts`. Consumes `IMConfig`, binds the live map view, computes and renders coordinates. Never edits config.
- Builder (settings): `src/setting/setting.tsx` writes config through `onSettingChange` / `onPropertyChange` and, for the widget style toggle, calls `getAppConfigAction().editWidgetProperty(id, 'inControllerUx', 'offPanel' | 'inPanel').exec()`. `builderAppSync.publishChangeWidgetStatePropToApp` signals a `removeLayerFlag` when a system is deleted.
- Per-system editor: `src/setting/system-config.tsx` validates WKIDs/datums (via `jimu-core/wkid`) and pushes updates via `multiOptionsChange` / `onWkidChangeSave`.
- Cross-cutting builder extension: `src/tools/builder-operations.ts` (registered in manifest under `BUILDER_OPERATIONS`) exposes translatable system-name keys.

## Lifecycle and cleanup
- Pointer/click handlers are stored in refs and removed before each re-bind inside the `hooks.useUpdateEffect` that depends on `[currentJimuMapView, locateActive, enableRealtime, selectedSystemId, coordinateSystem, coordinateDecimal, altitudeDecimal, showSeparators, displayOrder]`.
- The basemap watch is cleaned up by returning `watchBaseMap.remove()` from its effect:
  ```tsx
  const watchBaseMap = reactiveUtils.watch(() => view?.map?.basemap, () => {
    (view as any).cursor = 'default'
    if (!view?.basemapView) return
    const baseMapView = view.basemapView?.view
    mapWkid.current = baseMapView?.spatialReference?.wkid
    mapPortalId.current = (baseMapView?.map as any)?.portalItem?.id
    checkBasemapUnitsSetTips()
    checkSystemSetTips()
    resetAllGeoInfo()
    if (markerGraphic.current) {
      graphicsLayer.current?.remove(markerGraphic.current)
    }
  })
  return () => {
    watchBaseMap.remove()
  }
  ```
- Unmount cleanup effect (keyed on `currentJimuMapViewRef`) resets cursor, removes the marker and graphics layer, and removes both listeners:
  ```tsx
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentMapView = currentJimuMapViewRef.current
      if (currentMapView?.view) {
        (currentMapView.view as any).cursor = 'default'
      }
      if (markerGraphic.current) {
        graphicsLayer.current?.remove(markerGraphic.current)
      }
      if (graphicsLayer.current) {
        const map = currentMapView?.view?.map
        map?.remove(graphicsLayer.current)
      }
      if (clickListener.current) clickListener.current?.remove()
      if (moveListener.current) moveListener.current?.remove()
    }
  }, [currentJimuMapViewRef])
  ```
- On active-view switch (`onActiveViewChange`) and on losing auto-control of the map widget (`isControlMapWidget` effect), the widget resets geo info and removes the marker/layer.
- A fresh `GraphicsLayer({ listMode: 'hide' })` is created and added to the map whenever `currentJimuMapView`/`mapInfo`/`mapInfo2` change.

## Manifest/config requirements
- `manifest.json`: `type: "widget"`, `dependency: "jimu-arcgis"`, `properties.hasSettingPage: true`, `properties.defaultInControllerUx: "offPanel"`, `defaultSize { width: 242, height: 140 }`.
- Extension registration:
  ```json
  "extensions": [
    {
      "name": "builderOperations",
      "point": "BUILDER_OPERATIONS",
      "uri": "tools/builder-operations"
    }
  ]
  ```
- Config shape (`src/config.ts`): `Config { coordinateSystem: ImmutableArray<CoordinateConfig>, coordinateDecimal: number, altitudeDecimal: number, showSeparators: boolean, displayOrder: DisplayOrderType, widgetStyle: WidgetStyleType, mapInfo?, mapInfo2? }`.
  - `CoordinateConfig`: `{ id, name, wkid, crs?, displayUnit, elevationUnit?, datumWkid?, datumName?, transformForward?, datumWkid2?, datumName2?, transformForward2? }`.
  - Enums: `DisplayOrderType` (`XY`/`YX`), `WidgetStyleType` (`CLASSIC`/`MODERN`), `ElevationUnitType` (`METRIC`/`IMPERIAL`).
- Default config (`config.json`): one system `WGS_1984_Web_Mercator_Auxiliary_Sphere` (`wkid 3857`), `coordinateDecimal: 3`, `altitudeDecimal: 2`, `showSeparators: true`, `displayOrder: "XY"`, `widgetStyle: "CLASSIC"`.
- Requires a bound Map widget: without `useMapWidgetIds` the runtime renders a `WidgetPlaceholder` and settings shows the select-map hint.
- Requires a configured geometry service for non-client projections; the widget reads `utils.getGeometryService()`.

## Gotchas
- No map bound => runtime returns early with `WidgetPlaceholder`; nothing else executes.
- MGRS/USNG require `coordinateFormatter.load()` to have resolved; the widget always calls `.load()` before formatting. It also needs a GCS point, obtained via the lazily loaded `projectOperator` (`isLoaded()` / `load()` guarded).
- `canShowInClient` only returns true when the output SR label matches the map SR label, or for the explicit 4326 <-> WebMercator special case. Otherwise it round-trips through the geometry service (`geometryService.project`), which is async and shows the `computing` label meanwhile.
- Basemap unit mismatch triggers `showBasemapChangeTips` (a warning `Alert`); when set, the widget ignores the configured `displayUnit` and falls back to `getDefaultUnits(...)`.
- `getUnits()` (in utils) returns `undefined` in the no-user branch instead of the `_units` variable it computed (subtle bug in source). Callers treat falsy as non-english.
- Datum transformation is only applied when `datumWkid` (and optionally `datumWkid2` for the second map) are set; the correct one is chosen by matching `mapPortalId.current` to `mapInfo.id` / `mapInfo2.id`.
- `DEGREES_DECIMAL_MINUTES` is described in comments as a "hack" and forces `getUnitRate` to return 1.
- Clicking locate dispatches `appActions.requestAutoControlMapWidget` / `releaseAutoControlMapWidget`; if another widget takes control (`isControlMapWidget` false) the marker and info are cleared.
- The classic vs modern style toggle also rewrites `inControllerUx` (`offPanel` vs `inPanel`) through `getAppConfigAction`.
- WKID validation depends on the lazily loaded `jimu-core/wkid` module; before it loads, `wkidUtils` is null and validation/labeling is skipped.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - attach live pointer-move vs click listeners with cleanup.
```tsx
hooks.useUpdateEffect(() => {
  const view = currentJimuMapView?.view
  const viewTypeIsThree = view?.type === '3d'
  if (enableRealtime) {
    clickListener.current?.remove()
    moveListener.current?.remove()
    moveListener.current = view?.on('pointer-move', (event) => {
      const point = view.toMap({ x: event.x, y: event.y })
      const threeDPoint = { x: event?.native?.pageX, y: event?.native?.pageY }
      onMouseMove(point, viewTypeIsThree ? threeDPoint : undefined)
    })
  } else {
    clickListener.current?.remove()
    moveListener.current?.remove()
    if (locateActive) {
      clickListener.current = view?.on('click', (event) => {
        const threeDPoint = { x: event?.native?.pageX, y: event?.native?.pageY }
        onMapClick(event, viewTypeIsThree ? threeDPoint : undefined)
      })
    }
  }
}, [currentJimuMapView, locateActive, enableRealtime, selectedSystemId,
  coordinateSystem, coordinateDecimal, altitudeDecimal, showSeparators, displayOrder])
```

Source: `src/runtime/widget.tsx` - MGRS/USNG formatting after `coordinateFormatter.load()`.
```tsx
const displayUsngOrMgrs = (unit: 'MGRS' | 'USNG', normalizedPoint) => {
  coordinateFormatter.load().then(() => {
    const nlsUnit = unitToNls(unit)
    if (unit === 'MGRS') {
      const mgrs = coordinateFormatter.toMgrs(normalizedPoint, 'automatic', 5)
      setGeoInfo(`${mgrs} ${nlsUnit}`)
    } else if (unit === 'USNG') {
      const usng = coordinateFormatter.toUsng(normalizedPoint, 5)
      setGeoInfo(`${usng} ${nlsUnit}`)
    }
  })
}
```

Source: `src/runtime/widget.tsx` - project via geometry service with optional datum transformation.
```tsx
const params = new ProjectParameters({
  geometries: [point],
  transformForward: false
})
// ...outWkid / datum selection...
params.outSpatialReference = new SpatialReference({ wkid: parseInt(outWkid) })
setGeoInfo(computing)
const defUrl = utils.getGeometryService()
geometryService.project(defUrl, params).then(geometries => {
  const point = geometries[0]
  // dispatch to displayUsngOrMgrs / displayDegOrDms / displayProject
})
```

Source: `src/runtime/widget.tsx` - lazy `projectOperator` load + execute to convert to output SR.
```tsx
if (!projectOperatorRef.current) {
  projectOperatorRef.current = await loadArcGISJSAPIModule('esri/geometry/operators/projectOperator')
}
if (!projectOperatorRef.current.isLoaded()) {
  await projectOperatorRef.current.load()
}
const convertPoint = projectOperatorRef.current.execute(
  copyMapPoint,
  new SpatialReference({ wkid: getOutputWkid(selectedSystem) })
)
```

Source: `src/runtime/widget.tsx` - decide whether the coordinate can be computed on the client.
```tsx
const curSr = new SpatialReference({ wkid: curWkidNum })
const mapSr = new SpatialReference({ wkid: mapWkid.current })
const specialCase = (mapWkid.current === 4326 && curSr.isWebMercator) ||
  (curWkidNum === 4326 && mapSr.isWebMercator)
// ...compute mapLabel via jimu-core/wkid getSRLabel...
const isSameSR = curLabel && curLabel === mapLabel
if (isSameSR || specialCase) return true
return false
```

Source: `src/utils/index.ts` - decimal-degrees to DMS with i18n number formatting.
```ts
export const degToDMS = (decDeg, decDir: 'LAT' | 'LON', decimal: number, showSeparators: boolean) => {
  let d = Math.abs(decDeg)
  let deg = Math.floor(d)
  d = d - deg
  let min = Math.floor(d * 60)
  let sec = (d - min / 60) * 60 * 60
  if (sec === 60) { min++; sec = 0 }
  if (min === 60) { deg++; min = 0 }
  const fixedSec = localizeNumberBySettingInfo(sec, { places: decimal, digitSeparator: showSeparators })
  const minStr = min < 10 ? `0${min}` : min
  const secStr = sec < 10 ? `0${fixedSec}` : fixedSec
  const dir = (decDir === 'LAT') ? (decDeg < 0 ? 'S' : 'N') : (decDeg < 0 ? 'W' : 'E')
  return `${deg}°${minStr}′${secStr}″${dir}`
}
```

Source: `src/utils/index.ts` - locale-aware number formatting used everywhere.
```ts
export const localizeNumberBySettingInfo = (num: number, settingInfo) => {
  const { places, digitSeparator } = settingInfo
  if (digitSeparator) {
    return i18n.getIntl().formatNumber(num, { maximumFractionDigits: places, minimumFractionDigits: places, useGrouping: true })
  } else {
    return i18n.getIntl().formatNumber(num, { maximumFractionDigits: places, minimumFractionDigits: places, useGrouping: false })
  }
}
```

Source: `src/tools/builder-operations.ts` - expose each system name as a translatable value key.
```ts
export function getKeysInCoordinateSystem (coordinateSystem: ImmutableArray<CoordinateConfig> = Immutable([]), path: string) {
  const keys: extensionSpec.TranslationKey[] = []
  coordinateSystem.forEach((sysItem, sysIndex) => {
    const systemNum = (sysIndex + 1).toString()
    const systemPath = `${path}.coordinateSystem[${sysIndex}]`
    keys.push({
      keyType: 'value',
      key: `${systemPath}.name`,
      label: {
        key: 'coordinateSystem',
        enLabel: defaultMessages.coordinateSystem.replace('{number}', systemNum),
        values: { number: systemNum }
      },
      valueType: 'text'
    })
  })
  return keys
}
```

Source: `src/setting/setting.tsx` - map binding + per-system editor via SidePopper.
```tsx
<MapWidgetSelector
  onSelect={onMapWidgetSelected}
  useMapWidgetIds={useMapWidgetIds}
  aria-describedby={'coordinates-blank-msg'}
/>
// ...
<SidePopper
  position='right'
  title={configureCoordinateSystem}
  isOpen={showLayerPanel && !urlUtils.getAppIdPageIdFromUrl().pageId}
  toggle={onCloseLayerPanel}
  trigger={sidePopperTrigger?.current}
  backToFocusNode={popperFocusNode}
>
  <SystemConfig {...} />
</SidePopper>
```

Source: `src/setting/setting.tsx` - style toggle also updates controller UX.
```tsx
const switchWidgetType = (type: WidgetStyleType) => {
  if (type !== widgetStyle) {
    onPropertyChange('widgetStyle', type)
  }
  if (type === WidgetStyleType.classic) {
    getAppConfigAction().editWidgetProperty(props.id, 'inControllerUx', 'offPanel').exec()
  } else {
    getAppConfigAction().editWidgetProperty(props.id, 'inControllerUx', 'inPanel').exec()
  }
}
```

Source: `src/setting/system-config.tsx` - lazy-load SpatialReference and validate WKIDs via jimu-core/wkid.
```tsx
loadArcGISJSAPIModules(['esri/geometry/SpatialReference']).then(modules => {
  [spatialReferenceRef.current] = modules
  setApiLoaded(true)
})
// ...
const { wkidLookup, isValidWkid } = wkidUtils
const isValid = isValidWkid(newWkid)
const crs = wkidLookup(newWkid)
```
