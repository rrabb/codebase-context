# OTB Widget: arcgis/oriented-imagery-viewer

Online widget doc: https://developers.arcgis.com/experience-builder/GUID-1C6BA557-A545-43AC-A903-5FB06AFF0359/

## Purpose

The Oriented Imagery Viewer widget visualizes `OrientedImageryLayer` content in a
side panel that is bound to a Map/Scene widget. It hosts the ArcGIS Maps SDK for
JavaScript `OrientedImageryViewer` UI element (action bar, image display, navigation,
overlays, measurement, digitization) driven by the currently selected oriented imagery
layer in the connected view. It supports both 2D (`MapView`) and 3D (`SceneView`)
exploration and lets the app author toggle individual viewer tools on/off in settings.

## Source paths inspected

All paths are under the gitignored built widget source (read with includeIgnoredFiles):

- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/manifest.json`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/config.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/version-manager.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/runtime/widget.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/runtime/constants.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/setting/setting.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/setting/constants.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/utils/utils.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/oriented-imagery-viewer/src/utils/style-utils.ts`

(dist `.map` files and the `tests/` folder were intentionally ignored.)

## Architecture overview

- Runtime widget (`src/runtime/widget.tsx`) is a functional React component exported as a
  memoized widget (`memo(Widget)`) with `mapExtraStateProps` and `versionManager` statics
  attached via a custom `ExbMemoWidget` type.
- It binds to a map widget through `JimuMapViewComponent` / `onActiveViewChange`, extracts
  the `MapView | SceneView`, and discovers oriented imagery layers from `view.map.allLayers`.
- A single `OrientedImageryViewer` (from `@arcgis/core/widgets/OrientedImageryViewer`) is
  created once and mounted into a per-instance DOM container id; its `view`, `layer`, and
  `disabled` props are mutated in place as state changes rather than recreating it.
- Config drives which `visibleElements` of the viewer are shown. The mapping from config
  keys to viewer visible-element flags lives in `src/runtime/constants.ts`
  (`visibleElementToConfigMap`) and is applied by `updateViewerConfigs`.
- Settings widget (`src/setting/setting.tsx`) renders a map selector plus grouped toggle
  switches defined declaratively in `src/setting/constants.ts` (`settingSectionsInfo`).
- `version-manager.ts` upgrades the legacy `viewerToolsEnabled` boolean into the newer
  granular per-tool config keys.

UNVERIFIED: the widget doc GUID above is provided by the task; not cross-checked against
source.

## Key imports and packages

Grouped by origin. Import path shown as written in source.

@arcgis/core DIRECT ESM imports (NOT the `esri/*` alias) - this widget is a clean example
of importing SDK modules directly from the `@arcgis/core` package:

- `src/runtime/widget.tsx`
  - `import * as reactiveUtils from '@arcgis/core/core/reactiveUtils'`
  - `import type Layer from '@arcgis/core/layers/Layer'`
  - `import type OrientedImageryLayer from '@arcgis/core/layers/OrientedImageryLayer'`
  - `import type MapView from '@arcgis/core/views/MapView'`
  - `import type SceneView from '@arcgis/core/views/SceneView'`
  - `import OrientedImageryViewer from '@arcgis/core/widgets/OrientedImageryViewer'` (value import - the actual class)
- `src/config.ts`
  - `import type OrientedImageryLayer from '@arcgis/core/layers/OrientedImageryLayer'`
  - `import type OrientedImageryViewer from '@arcgis/core/widgets/OrientedImageryViewer'`
- `src/utils/utils.ts`
  - `import { abortMaybe, destroyMaybe } from '@arcgis/core/core/maybe'`
- `src/setting/setting.tsx`
  - `import type GroupLayer from '@arcgis/core/layers/GroupLayer'`
  - `import type Layer from '@arcgis/core/layers/Layer'`
  - `import type OrientedImageryLayer from '@arcgis/core/layers/OrientedImageryLayer'`
  - `import type MapView from '@arcgis/core/views/MapView'`
  - `import type SceneView from '@arcgis/core/views/SceneView'`

Calcite React wrappers (heavy Calcite usage in the runtime UI):

- `src/runtime/widget.tsx`
  - `import { CalciteButton, CalciteOption, CalciteSelect, CalciteTooltip } from 'calcite-components'`

jimu-arcgis (map bridge):

- `src/runtime/widget.tsx` and `src/setting/setting.tsx`
  - `import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'`

jimu-core:

- `src/runtime/widget.tsx`
  - `import { WidgetState, type WidgetVersionManager, appActions, utils as jimuUtils, jsx, type AllWidgetProps, type IMState } from 'jimu-core'`
- `src/config.ts`
  - `import type { ImmutableObject } from 'jimu-core'`
- `src/utils/style-utils.ts`
  - `import { css, type SerializedStyles } from 'jimu-core'`
- `src/version-manager.ts`
  - `import { WidgetVersionManager } from 'jimu-core'`
- `src/setting/setting.tsx`
  - `import { React } from 'jimu-core'`

jimu-ui / jimu-for-builder (UI + settings props):

- `src/runtime/widget.tsx`
  - `import { Paper } from 'jimu-ui'`
- `src/setting/setting.tsx`
  - `import type { AllWidgetSettingProps } from 'jimu-for-builder'`
  - `import { Switch } from 'jimu-ui'`
  - `import { MapWidgetSelector, SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components'`

React:

- `src/runtime/widget.tsx`
  - `import { memo, type MemoExoticComponent, useCallback, useEffect, useMemo, useState } from 'react'`
- `src/setting/setting.tsx`
  - `import { memo, useRef, useState } from 'react'`

Note: `__esri.ReadonlyCollection<Layer>`, `__esri.Point`, and `__esri.Handle` global
namespace types are used for view collection/handle/point typing without importing them.

UNVERIFIED: `calcite-components` is the import specifier written in source; it resolves to
the ExB-provided Calcite React wrapper package. Not traced to its package definition here.

## Reusable patterns found

This widget is the cleanest in-repo OTB example of combining direct `@arcgis/core` ESM
imports with Calcite React wrapper components inside a jimu widget.

- Direct instantiation of an SDK widget class:
  `new OrientedImageryViewer({ view, disabled, container, layer })` cast to an extended
  interface (`OiViewerWithVisibleElements`) to reach `visibleElements`, `dataCaptureEnabled`,
  and `preloadMedia`.
- 2D + 3D support: `view` state is typed `MapView | SceneView` throughout, so the same code
  path serves scene (3D) and map (2D) hosts.
- Config-to-visibleElements mapping driven by a data table (`visibleElementToConfigMap`)
  instead of hardcoded conditionals.
- In-place viewer property mutation (`updateOiViewerProp`) to avoid rebuilding the SDK
  widget on view/layer/disabled changes.
- Calcite React UI: `CalciteSelect` + `CalciteOption` for layer selection, `CalciteButton` +
  `CalciteTooltip` for enable/disable toggle, wired with `onCalciteSelectChange`.
- Theming Calcite via CSS custom properties mapped to ExB `--sys-*` theme tokens
  (`getCalciteBasicTheme`) applied through emotion `css` on a `Paper`.
- Explicit SDK-object cleanup via `abortMaybe` / `destroyMaybe` (`removeLoadedOiElements`).

## Builder vs runtime split

- Builder (`src/setting/setting.tsx`):
  - Selects the connected map widget with `MapWidgetSelector`.
  - Independently opens its own `JimuMapViewComponent` to discover oriented imagery layers
    (including recursively through `GroupLayer`s) and show an error state when none exist.
  - Renders grouped `Switch` toggles from `settingSectionsInfo`; supports nested `subTools`
    (for example `dataCaptureEnabled` shown only when `imageOverlaysEnabled` is on).
  - Persists changes via `props.onSettingChange({ id, config: config.set(...) })` and map
    binding via `props.onSettingChange({ id, useMapWidgetIds })`.
- Runtime (`src/runtime/widget.tsx`):
  - Reacts to `config` by translating config keys into `oiViewer.visibleElements[...]`
    flags and the `menu` action-bar visibility.
  - Owns the live `OrientedImageryViewer` instance, layer selection dropdown, enable/disable
    toggle, and view/extent navigation.
  - Dispatches widget state props (`oiSelectedPoint`, `oiViewerImageLoaded`) via
    `appActions.widgetStatePropChange` so other widgets can react.

## Lifecycle and cleanup

- Per-instance container id: `oi-viewer-container-${props.id}-${jimuUtils.getUUID()}` created
  with `useMemo` so the SDK widget mounts into a stable DOM node.
- Layer-list watching: `reactiveUtils.watch` on the count of loaded oriented-imagery layers,
  with the handle removed in the effect cleanup:

  ```tsx
  useEffect(() => {
    if (view) {
      const oiLayerListHandle = reactiveUtils.watch(
        () => view.map?.allLayers?.filter((layer) => layer.type === 'oriented-imagery' && layer.loaded).length,
        () => {
          handleLayerListChange(view)
        }
      )

      return () => {
        oiLayerListHandle.remove()
      }
    }
  }, [view, handleLayerListChange])
  ```

- View-model watches (`selectedPoint`, `imageLoaded`) each remove their handle on cleanup:

  ```tsx
  useEffect(() => {
    if (!oiViewer) return
    const handle = oiViewer.viewModel.watch('selectedPoint', (event) => {
      const pointEvent = event as __esri.Point
      props.dispatch(appActions.widgetStatePropChange(props.id, 'oiSelectedPoint', pointEvent.toJSON()))
    })
    return () => {
      handle?.remove()
    }
  }, [oiViewer, props])
  ```

- Viewer teardown on unmount disables and clears loaded SDK graphics/tasks:

  ```tsx
  useEffect(() => {
    return () => {
      if (oiViewer) {
        updateOiViewerProp(oiViewer, 'disabled', true)
        removeLoadedOiElements(oiViewer)
      }
    }
  }, [oiViewer])
  ```

- `removeOiViewer` empties the container DOM (`container.innerHTML = ''`), nulls the viewer
  state, and calls `removeLoadedOiElements`.
- The core SDK-resource cleanup uses `abortMaybe` (for in-flight tasks) and `destroyMaybe`
  (for owned graphics/symbols) from `@arcgis/core/core/maybe`. Quoted from
  `src/utils/utils.ts`:

  ```ts
  import { abortMaybe, destroyMaybe } from '@arcgis/core/core/maybe'
  import type { OiViewerWithVisibleElements } from '../config'

  export const removeLoadedOiElements = (oiViewer: OiViewerWithVisibleElements) => {
    const viewModel = oiViewer.viewModel
    //@ts-expect-error undocumented property _updateFootprintTask
    viewModel._updateFootprintTask = abortMaybe(viewModel._updateFootprintTask)
    //@ts-expect-error undocumented property _clickTask
    viewModel._clickTask = abortMaybe(viewModel._clickTask)

    //@ts-expect-error undocumented property coverageFrustums
    viewModel.coverageFrustums?.destroy()
    //@ts-expect-error undocumented property coveragePolygons
    viewModel.coveragePolygons?.destroy()
    //@ts-expect-error undocumented property pointSources
    viewModel.pointSources?.destroy()
    //@ts-expect-error undocumented property additionalFootprints
    viewModel.additionalFootprints?.destroy()
    //@ts-expect-error undocumented property additionalCameraLocations
    viewModel.additionalCameraLocations?.destroy()

    //@ts-expect-error undocumented property bestFeatureFootprint
    viewModel.bestFeatureFootprint = destroyMaybe(viewModel.bestFeatureFootprint)
    //@ts-expect-error undocumented property bestFeatureCurrentFootprint
    viewModel.bestFeatureCurrentFootprint = destroyMaybe(viewModel.bestFeatureCurrentFootprint)
    //@ts-expect-error undocumented property _crossSymbol
    viewModel._crossSymbol = destroyMaybe(viewModel._crossSymbol)
    //@ts-expect-error undocumented property _referencePointOnGround
    viewModel._referencePointOnGround = destroyMaybe(viewModel._referencePointOnGround)
    //@ts-expect-error undocumented property _referencePointOnImage
    viewModel._referencePointOnImage = destroyMaybe(viewModel._referencePointOnImage)
    //@ts-expect-error undocumented property _overlays
    if (viewModel._overlays) {
      //@ts-expect-error undocumented property _overlays
      viewModel._overlays.graphics.removeAll()
    }
    //@ts-expect-error undocumented property resetImage()
    oiViewer.viewModel.resetImage()
    //@ts-expect-error undocumented property resetVideo()
    viewModel.resetVideo()
  }
  ```

- In the settings component, the layer-change handle is stored in a `useRef` and removed
  before re-binding on `onActiveViewChange` (`oiLayerListHandle.current.remove()`).

## Manifest/config requirements

From `manifest.json`:

- `name`: `oriented-imagery-viewer`, `type`: `widget`, `version`/`exbVersion`: `1.20.0`.
- `dependency`: `["jimu-arcgis"]` (map binding requires the jimu-arcgis dependency).
- `defaultSize`: `{ width: 380, height: 460 }`.
- `properties`: `{}` (no manifest-level properties/CDN resource declarations here; the SDK is
  consumed via `@arcgis/core` ESM imports rather than a manifest CDN declaration).

Config shape (`src/config.ts`, `Config` -> `IMConfig = ImmutableObject<Config>`), per-tool
booleans consumed by the runtime:

- `viewerToolsEnabled` (legacy; upgraded by version-manager)
- `imageEnahncementEnabled` (note the spelling in source), `imageGalleryEnabled`,
  `mapImageConversionToolEnabled`, `showPopupsActionEnabled`, `navigationToolEnabled`,
  `directionalNavigationEnabled`, `sequentialNavigationEnabled`, `measurementToolsEnabled`,
  `imageOverlaysEnabled`, `dataCaptureEnabled`, `navigateToExtentEnabled`,
  `exploreImages2DEnabled`, `exploreImages3DEnabled`, `displayImagesEnabled`,
  `currentFootprintEnabled`, `additionalFootprintsEnabled`,
  `additionalCameraLocationsEnabled`.

Version manager (`version-manager.ts`) upgrade to `1.20.0`: derives the granular footprint
config keys from the old `viewerToolsEnabled` flag and disables other action-bar elements
when `viewerToolsEnabled` was false.

## Gotchas

- The config key `imageEnahncementEnabled` is misspelled in the source (missing/reordered
  letters); it is used consistently in `config.ts`, `setting/constants.ts`, and
  `runtime/constants.ts`, so match that exact spelling.
- `removeLoadedOiElements` reaches into undocumented, underscore-prefixed viewModel
  internals (`_updateFootprintTask`, `_clickTask`, `_overlays`, `resetImage`, `resetVideo`,
  etc.) with `@ts-expect-error`. These are private SDK details and may break across
  `@arcgis/core` versions.
- The `OrientedImageryViewer` is cast to `OiViewerWithVisibleElements` to access
  `visibleElements`, `dataCaptureEnabled`, and `preloadMedia`; do not assume these are on
  the public typed surface.
- The action-bar `menu` visibility is computed: it is enabled only if at least one mapped
  visible element is enabled (`updateViewerConfigs`). Turning off every tool hides the menu.
- `navigateToExtentEnabled` treats `undefined` as enabled: the runtime navigates to the
  layer extent when `config.navigateToExtentEnabled || config.navigateToExtentEnabled === undefined`.
- Layer discovery differs between runtime and settings: runtime uses `view.map.allLayers`
  (flattened) and encodes group-child ids as `${parent.id}-${layer.id}`; settings recurses
  through `GroupLayer.layers`. Keep id derivation consistent if reusing.
- `getCalciteBasicTheme` has a stray `}` in the last CSS line
  (`var(--sys-color-primary-text)}`) - copy carefully if reusing.
- The container is cleared with `container.innerHTML = ''` on removal; the SDK widget is not
  `destroy()`-ed directly, so rely on `removeLoadedOiElements` plus disabling for cleanup.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - create the SDK viewer once into a per-instance container
and hide chrome (`title`, `closeButton`, `menu`):

```tsx
const initOiViewer = useCallback(
  (view: MapView | SceneView, layer: OrientedImageryLayer = null) => {
    const oiViewerTemp = new OrientedImageryViewer({
      view,
      disabled: false,
      container: viewerContainerId,
      layer
    }) as OiViewerWithVisibleElements

    oiViewerTemp.visibleElements.title = false
    oiViewerTemp.visibleElements.closeButton = false
    oiViewerTemp.visibleElements.menu = false
    setOiViewer(oiViewerTemp)
  },
  [viewerContainerId]
)
```

Source: `src/runtime/widget.tsx` - config-driven visibleElements toggling via the mapping
table:

```tsx
const updateViewerConfigs = (oiViewer: OiViewerWithVisibleElements, config: IMConfig) => {
  let showViewerActionBar = null
  Object.keys(visibleElementToConfigMap).forEach((visibleElement: OiViewerVisibleElement) => {
    const visibleElementEnabled = visibleElementToConfigMap[visibleElement].some(
      (configKey: IMConfigKey) => config[configKey] ?? false
    )
    oiViewer.visibleElements[visibleElement] = visibleElementEnabled
    if (!showViewerActionBar) showViewerActionBar = visibleElementEnabled
  })
  oiViewer.visibleElements.menu = showViewerActionBar ?? false
  oiViewer.dataCaptureEnabled = config.dataCaptureEnabled
  oiViewer.preloadMedia = config.directionalNavigationEnabled || config.sequentialNavigationEnabled

  return oiViewer
}
```

Source: `src/runtime/constants.ts` - the config-key to viewer-visible-element mapping table:

```ts
export const visibleElementToConfigMap = {
  searchTools: ['exploreImages2DEnabled', 'exploreImages3DEnabled', 'displayImagesEnabled'],
  overlays: [
    'currentFootprintEnabled',
    'additionalFootprintsEnabled',
    'additionalCameraLocationsEnabled',
    'mapImageConversionToolEnabled',
    'imageOverlaysEnabled'
  ],
  imageNavigationTools: [
    'directionalNavigationEnabled',
    'sequentialNavigationEnabled',
    'imageGalleryEnabled',
    'navigationToolEnabled'
  ],
  measurementTools: ['measurementToolsEnabled'],
  utilityTools: ['imageEnahncementEnabled', 'showPopupsActionEnabled'],
  // ... per-element single-key entries ...
} satisfies ConfigToVisibleElementMap
```

Source: `src/runtime/widget.tsx` - discover loaded oriented imagery layers (2D+3D), encoding
group-child ids:

```tsx
const getOiLayers = useCallback((layerList: __esri.ReadonlyCollection<Layer>) => {
  return layerList
    .filter((layer) => layer.type === 'oriented-imagery' && layer.loaded)
    .map((layer) => {
      const id = 'type' in layer.parent && layer.parent.type === 'group' ? `${layer.parent.id}-${layer.id}` : layer.id
      return {
        id: id,
        layer: layer as OrientedImageryLayer
      }
    })
    .toArray()
}, [])
```

Source: `src/runtime/widget.tsx` - Calcite React layer selector and enable/disable toggle:

```tsx
const renderLayerSelector = () => {
  return (
    <CalciteSelect
      label={nls('oiLayerSelector')}
      aria-label={nls('oiLayerSelector')}
      data-select-id='imagery-layer-selector'
      className='mb-1'
      value={selectedOiLayer?.id}
      onCalciteSelectChange={handleActiveLayerChange}
    >
      {oiLayers?.map((layer) => (
        <CalciteOption key={layer.id} value={layer.id} selected={selectedOiLayer.id === layer.id}>
          {layer.layer.title}
        </CalciteOption>
      ))}
    </CalciteSelect>
  )
}
```

Source: `src/runtime/widget.tsx` - map binding + theming through Paper with emotion css:

```tsx
return (
  <Paper css={getCalciteBasicTheme()} className='jimu-widget overflow-auto p-2' shape='none'>
    <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds?.[0]} onActiveViewChange={onActiveViewChange} />
    {renderWidgetElements()}
    {renderWidgetError()}
  </Paper>
)
```

Source: `src/utils/style-utils.ts` - map Calcite CSS custom properties to ExB theme tokens:

```ts
import { css, type SerializedStyles } from 'jimu-core'

export function getCalciteBasicTheme (): SerializedStyles {
  return css`
    --calcite-color-brand: var(--sys-color-primary-main);
    --calcite-color-brand-press: var(--sys-color-primary-dark);
    --calcite-color-brand-hover: var(--sys-color-primary-light);
    --calcite-color-text-inverse: var(--sys-color-primary-text)};
  `
}
```

Source: `src/setting/setting.tsx` - recursive group-aware oriented imagery layer collection:

```tsx
const getOiLayers = (layerList: __esri.ReadonlyCollection<Layer>) => {
  return layerList.reduce((finalList, currLayer) => {
    if (currLayer.type === 'oriented-imagery') {
      finalList.push(currLayer as OrientedImageryLayer)
    } else if (currLayer.type === 'group') {
      finalList.push(...getOiLayers((currLayer as GroupLayer).layers))
    }

    return finalList
  }, [] as OrientedImageryLayer[])
}
```

Source: `src/setting/setting.tsx` - declarative grouped toggle rendering with nested subTools:

```tsx
const renderSettings = (toolsInfo: SettingInfo[]) => {
  return (
    <>
      {toolsInfo.map((toolInfo) => {
        const toolLabel = nls(toolInfo.labelKey)
        const showSubTools = toolInfo.subTools?.length && config[toolInfo.name]
        return (
          <>
            <SettingRow role={'group'} aria-label={toolLabel} tag='label' label={toolLabel} key={toolInfo.name}>
              <Switch name={toolInfo.name} checked={config[toolInfo.name]} onChange={handleConfigToggle}></Switch>
            </SettingRow>
            {showSubTools ? renderSettings(toolInfo.subTools) : null}
          </>
        )
      })}
    </>
  )
}
```
