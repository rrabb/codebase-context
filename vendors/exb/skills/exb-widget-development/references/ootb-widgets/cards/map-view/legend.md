# OTB Widget: arcgis/legend

Online widget doc: https://developers.arcgis.com/experience-builder/guide/legend-widget/

## Purpose
Renders a map legend for a connected Map widget. It wraps the ArcGIS Maps SDK `esri/widgets/Legend` and re-parents it into the ExB widget DOM, then layers ExB config on top: classic vs card style, base-map legend visibility, legend display mode (visible / within-extent / show-all), per-map-view layer customization (which layers show, and whether runtime-added layers show), and custom font/background styling driven by the ExB theme.

## Source paths inspected
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/manifest.json`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/config.json` (empty `{}` - no default config baked in)
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/src/config.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/src/runtime/widget.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/src/runtime/lib/style.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/src/setting/setting.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/src/setting/components/group-radios.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/legend/src/setting/lib/style.ts` (read: setting-side emotion styles; not quoted below)
- `src/version-manager.ts` referenced but not inspected in depth (UNVERIFIED contents)
- Skipped: `dist/**` (compiled output), `tests/arcgis-legend.apitest.tsx`, all `translations/*.js`

## Architecture overview
Class component `Widget extends React.PureComponent<WidgetProps, WidgetState>` (runtime/widget.tsx). It does NOT render the SDK legend inline; instead it:
1. Renders a hidden `JimuMapViewComponent` to obtain the active `JimuMapView`.
2. On active-view change, lazily loads `esri/widgets/Legend`, creates a `new Legend({ view, container })`, and appends `container` into `legendContainerRef`.
3. Applies ExB config through `configLegend()` / `calculateStyle()` and, when per-layer customization is enabled, filters `legend.activeLayerInfos` via a `reactiveUtils.on(..., 'change', ...)` subscription.
4. Re-runs `createLegend` on every `componentDidUpdate` so config edits in the builder take effect live.

State: `{ loadStatus: LoadStatus, activeJmv: JimuMapView }`. Refs: `legendWrapperRef`, `legendContainerRef`, `mapContainerRef`.

Settings component `Setting extends React.PureComponent` (setting/setting.tsx) wires `MapWidgetSelector`, `LayerSetting` (per-map-view layer customization), legend-mode radios, options switches (base map, card style, card layout), and an advanced font/background color section.

## Key imports and packages

runtime/widget.tsx:
- `jimu-core`: `React, jsx, type AllWidgetProps, ReactResizeDetector, ExBAddedJSAPIProperties, SupportedJSAPILayerTypes`
- `jimu-arcgis`: `loadArcGISJSAPIModules, JimuMapViewComponent, type JimuMapView, type JimuLayerView`
- `jimu-ui`: `WidgetPlaceholder, FillType, Paper`
- local: `ELegendMode, type IMConfig, type Style` from `../config`; `getStyle` from `./lib/style`; `defaultMessages`; `legendIcon` from `../../icon.svg`; `versionManager` from `../version-manager`
- JSAPI direct import: `import * as reactiveUtils from 'esri/core/reactiveUtils'` (uses the `esri/*` webpack alias; NOT lazy-loaded)
- Lazy JSAPI module: `esri/widgets/Legend` via `loadArcGISJSAPIModules(['esri/widgets/Legend'])`

runtime/lib/style.ts:
- `jimu-core`: `type IMThemeVariables, css, type SerializedStyles`
- `jimu-ui`: `styleUtils`
- local: `type Style` from `../../config`

setting/setting.tsx:
- `jimu-core`: `React, Immutable, type ImmutableObject, type DataSourceJson, type IMState, FormattedMessage, jsx, getAppStore, type UseDataSource, DataSourceTypes, SupportedJSAPILayerTypes`
- `jimu-ui`: `Switch, type BackgroundStyle, FillType, defaultMessages as jimuDefaultMessage, Label, Alert`
- `jimu-ui/advanced/setting-components`: `MapWidgetSelector, SettingSection, SettingRow, getAllItemsInMapView, LayerSetting`
- `jimu-ui/basic/color-picker`: `ThemeColorPicker`
- `jimu-for-builder`: `type AllWidgetSettingProps`
- `jimu-arcgis`: `type JimuLayerView, MapViewManager`
- `require('jimu-ui/lib/icons/uppercase.svg')` for the font-picker icon

setting/components/group-radios.tsx:
- `jimu-core`: `React, css, hooks, jsx`
- `jimu-ui`: `Label, Radio`
- `jimu-layouts/layout-runtime`: `defaultMessages as jimuLayoutMessages`

## Reusable patterns found

### JimuMapViewComponent to get the active view (hidden host)
The Map-view bridge is rendered inside a hidden `div` (display:none) purely to receive the callback; the legend itself lives in a separate container.

runtime/widget.tsx (render):
```tsx
const dataSourceContent = <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]} onActiveViewChange={this.onActiveViewChange} />
// ...
<div ref={this.legendContainerRef} style={{ height: '100%' }} />
<div style={{ position: 'absolute', display: 'none' }}>
  {dataSourceContent}
</div>
```

### reactiveUtils layer-watching (the cleanest example in this widget)
When per-map-view customization is enabled, the widget watches the SDK legend's `activeLayerInfos` collection for `'change'` and removes the layer infos that should not display. It maps SDK layers back to ExB layer-view ids via `jimuMapView.getJimuLayerViewIdByAPILayer`.

runtime/widget.tsx (`customizeLegends`):
```tsx
customizeLegends = () => {
  if (this.props.config.customizeLayerOptions?.[this.state.activeJmv?.id]?.isEnabled) {
    reactiveUtils.on(() => this.legend.activeLayerInfos, 'change', (event) => {
      if (!this.state.activeJmv) {
        return
      }
      const showRuntimeAddedLayer = this.props.config.customizeLayerOptions[this.state.activeJmv?.id]?.showRuntimeAddedLayers
      const showSet = new Set(this.props.config.customizeLayerOptions?.[this.state.activeJmv?.id]?.showJimuLayerViewIds)
      for (const item of this.legend.activeLayerInfos) {
        const layer = item.layer
        const isRuntimeAdded = layer[ExBAddedJSAPIProperties.EXB_LAYER_FROM_RUNTIME]
        if (isRuntimeAdded) {
          !showRuntimeAddedLayer && this.legend.activeLayerInfos.remove(item)
        } else {
          const jlvId = this.state.activeJmv.getJimuLayerViewIdByAPILayer(layer)
          const childInfos = this.getAllChildActiveInfos(item)
          if (!showSet.has(jlvId)) {
            this.legend.activeLayerInfos.remove(item)
          }
          for (const childInfo of childInfos) {
            const childJlvId = this.state.activeJmv.getJimuLayerViewIdByAPILayer(childInfo.layer)
            if (!showSet.has(childJlvId)) {
              childInfo.parent.children.remove(childInfo)
            }
          }
        }
      }
    })
  }
}
```
Note: this uses `reactiveUtils.on` (event-style) rather than `reactiveUtils.watch`. The returned handle is NOT captured or removed here (see Gotchas).

### JimuLayerView usage
`JimuLayerView` is used both at runtime (`getParentJimuLayerView`, `type`, `layer`, `subtypeCode`) and in settings.

runtime/widget.tsx (`handleLayerWithSublayer`):
```tsx
handleLayerWithSublayer (jimuLayerView: JimuLayerView, showSet: Set<string>, sublayersMap: Map<__esri.Layer, string[]>) {
  const supportedTypes: string[] = [SupportedJSAPILayerTypes.MapImageLayer, SupportedJSAPILayerTypes.SubtypeGroupLayer, SupportedJSAPILayerTypes.WMSLayer]
  const parentJlv = jimuLayerView.getParentJimuLayerView()
  if (!supportedTypes.includes(parentJlv.type)) {
    return
  }
  // Only construct layerInfo when all the parents are selected
  if (!this.isParentVisible(jimuLayerView.layer, showSet)) {
    return
  }
  const sublayerId = jimuLayerView.type === SupportedJSAPILayerTypes.SubtypeSublayer ? (jimuLayerView.layer as __esri.SubtypeSublayer).subtypeCode : jimuLayerView.layer.id
  // ...
}
```

### Legend style options (classic vs card, responsive layout)
runtime/widget.tsx (`calculateStyle`):
```tsx
calculateStyle = () => {
  let style
  const currentWidth = this.currentWidth || 100000// window.innerWidth;
  if (this.legend) {
    if (this.props.config.cardStyle) {
      let layout
      if (!this.props.config.cardLayout || this.props.config.cardLayout === 'auto') {
        if (currentWidth <= 600) {
          layout = 'stack'
        } else {
          layout = 'side-by-side'
        }
      } else {
        layout = this.props.config.cardLayout
      }
      style = {
        type: 'card' as const,
        layout: layout
      }
    } else {
      style = 'classic'
    }
  } else {
    style = 'classic'
  }
  return style
}
```

### Legend mode mapping (config enum -> SDK properties)
runtime/widget.tsx (`configLegend`):
```tsx
configLegend = () => {
  if (this.legend) {
    const basemapLegendVisible = this.props.config.showBaseMap
    this.legend.style = this.calculateStyle()
    this.legend.basemapLegendVisible = basemapLegendVisible
    const legendMode = this.props.config.legendMode

    if (legendMode === ELegendMode.ShowAll) {
      this.legend.respectLayerVisibility = false
    } else if (legendMode === ELegendMode.ShowWithinExtent) {
      this.legend.hideLayersNotInCurrentView = true
    }
  }
}
```

## Builder vs runtime split
- Runtime (`src/runtime/widget.tsx`): consumes `this.props.config` (IMConfig), creates/destroys the SDK `Legend`, applies style/mode, filters `activeLayerInfos`. Reads `window.jimuConfig.isInBuilder` to force `configLegend()` on each render while inside the builder so live edits are reflected.
- Settings (`src/setting/setting.tsx`): writes config via `this.props.onSettingChange`. Manages map-widget binding (`MapWidgetSelector` -> `useMapWidgetIds`), per-map-view layer customization (`LayerSetting` -> `config.customizeLayerOptions[jmvId]`), legend mode (`GroupRadios` -> `config.legendMode`), option switches (`showBaseMap`, `cardStyle`, `cardLayout`), and advanced font/background (`ThemeColorPicker` -> `config.style`). Uses `mapExtraStateProps` to pull `state.appStateInBuilder.appConfig.dataSources`. Supported data source types: `DataSourceTypes.WebMap`, `DataSourceTypes.WebScene`.
- Shared: `src/config.ts` (`Config` / `IMConfig`, `ELegendMode`, `Style`, `CustomizeLayerOption`) and separate `lib/style.ts` files on each side (theme-driven emotion CSS).

## Lifecycle and cleanup
- `createLegend` awaits `view.when()`, then destroys the previous legend before building a new one:
  ```tsx
  createLegend = async (view: __esri.MapView | __esri.SceneView) => {
    if (!this.Legend) {
      [this.Legend] = await loadArcGISJSAPIModules(['esri/widgets/Legend'])
    }
    const container = document && document.createElement('div')
    this.legendContainerRef.current && this.legendContainerRef.current.appendChild(container)
    await view.when()
    // Destroy the old legend before create the new one
    this.destroyLegend()
    const legendOption: __esri.LegendProperties = {
        view: view,
        container: container,
    }
    this.legend = new this.Legend(legendOption)
    this.customizeLegends()
    this.configLegend()
  }
  ```
- `destroyLegend` guards against double-destroy:
  ```tsx
  destroyLegend = () => {
    this.legend && !this.legend.destroyed && this.legend.destroy()
  }
  ```
- `componentDidUpdate` rebuilds the legend whenever there is an active view (so config changes propagate):
  ```tsx
  componentDidUpdate (prevProps, prevState, snapshot?): void {
    // Refresh legend widget when the config changes
    if (this.state.activeJmv) {
      this.createLegend(this.state.activeJmv.view)
    }
  }
  ```
- View-change handling in `onActiveViewChange`: when a view exists it (re)creates the legend and sets state; when the view is null it destroys the legend:
  ```tsx
  onActiveViewChange = async (jimuMapView: JimuMapView) => {
    if (jimuMapView && jimuMapView.view) {
      await this.createLegend(jimuMapView.view)
      this.setState({ loadStatus: LoadStatus.Fulfilled, activeJmv: jimuMapView })
    } else {
      this.destroyLegend()
    }
  }
  ```
- The `render()` also calls `this.destroyLegend()` when no map widget is bound.
- reactiveUtils handle removal: There is NO stored handle and NO `componentWillUnmount` in this widget. The `reactiveUtils.on(...)` subscription in `customizeLegends` is never explicitly `.remove()`-ed; cleanup relies on the underlying `Legend`/`activeLayerInfos` being destroyed by `destroyLegend()`. Quoting the only subscription site (there is no matching `handle.remove()`):
  ```tsx
  // runtime/widget.tsx, customizeLegends()
  reactiveUtils.on(() => this.legend.activeLayerInfos, 'change', (event) => { /* ... */ })
  ```
  (UNVERIFIED whether a leak occurs across rapid config edits, since `customizeLegends` is re-invoked from `createLegend` on every update while the old legend is destroyed first - file: `src/runtime/widget.tsx`.)
- `destroyView` exists but is not referenced anywhere else in this file (UNVERIFIED / appears unused - `src/runtime/widget.tsx`):
  ```tsx
  destroyView () {
    this.mapView && !this.mapView.destroyed && this.mapView.destroy()
    this.sceneView && !this.sceneView.destroyed && this.sceneView.destroy()
  }
  ```

## Manifest/config requirements
- `manifest.json`: `"name": "legend"`, `"type": "widget"`, `"version": "1.20.0"`, `"exbVersion": "1.20.0"`, `"dependency": "jimu-arcgis"` (single string, not array), `"defaultSize": { "width": 400, "height": 400 }`, `"properties": { "coverLayoutBackground": true, "flipIcon": true }`. No `"messageActions"` / `"publishMessages"` entries (both empty arrays).
- `config.json` is empty (`{}`); defaults are applied in code (settings constructor defaults `cardLayout=auto`, `cardStyle=false`, `legendMode=show-visible`; runtime falls back to `'classic'` style).
- Config shape (`src/config.ts`):
  ```ts
  export enum ELegendMode {
    ShowVisible = 'show-visible',
    ShowWithinExtent = 'show-within-extent',
    ShowAll = 'show-all'
  }
  export interface Config {
    showBaseMap?: boolean
    cardStyle?: boolean
    cardLayout?: 'auto' | 'side-by-side' | 'stack'
    legendMode?: ELegendMode
    respectLayerDefinitionExp?: boolean
    style: Style
    customizeLayerOptions?: { [jimuMapViewId: string]: CustomizeLayerOption }
  }
  export interface CustomizeLayerOption {
    isEnabled: boolean
    showRuntimeAddedLayers?: boolean
    showJimuLayerViewIds?: string[]
  }
  ```
- Because it imports `esri/widgets/Legend`, `esri/core/reactiveUtils`, and uses `jimu-arcgis`, the `"dependency": "jimu-arcgis"` manifest entry is required for the JSAPI to be available.

## Gotchas
- The SDK Legend is NOT rendered by React JSX; it is created imperatively into a manually created `div` appended to `legendContainerRef`. Do not expect a `<Legend>`-style element in the tree.
- `componentDidUpdate` unconditionally calls `createLegend` whenever `activeJmv` is set. `createLegend` fully destroys and rebuilds the SDK legend on every prop/state change - functional but heavy; avoid copying this pattern for high-frequency updates.
- `customizeLayerOptions` is keyed by `JimuMapView.id` (`useMapWidgetIds[0]-dataSourceId`), not by widget id. The settings `onListItemBodyClick` builds it as `` `${this.props.useMapWidgetIds?.[0]}-${dataSourceId}` ``.
- `ELegendMode` has three values but the settings `GroupRadios` only exposes `['showVisible', 'showWithinExtent']` (two) - `ShowAll` (`respectLayerVisibility = false`) is handled at runtime but not surfaced as a radio in this build (UNVERIFIED intent - `src/setting/setting.tsx`).
- Config option `respectLayerDefinitionExp` exists in the `Config` interface but its settings switch and constructor auto-set are commented out - effectively dead in this build (`src/setting/setting.tsx`).
- Runtime-added layers are detected via `layer[ExBAddedJSAPIProperties.EXB_LAYER_FROM_RUNTIME]`, not via a public API.
- Responsive card layout is width-driven: `<= 600` px forces `'stack'`, otherwise `'side-by-side'`, and only when `cardLayout === 'auto'` does `onResize` live-update `legend.style`.
- `reactiveUtils.on` (not `watch`) is used and its handle is discarded (see Lifecycle/cleanup).
- The settings component blocks customization with a warning `Alert` when the connected Map widget effectively has a single view and no data source (`isMapWidgetEmpty`).

## Useful snippets and functions

### Lazy-load the SDK Legend module
Source: `src/runtime/widget.tsx`
```tsx
if (!this.Legend) {
  [this.Legend] = await loadArcGISJSAPIModules(['esri/widgets/Legend'])
}
```

### Create the SDK legend into an ExB-managed container
Source: `src/runtime/widget.tsx`
```tsx
const container = document && document.createElement('div')
this.legendContainerRef.current && this.legendContainerRef.current.appendChild(container)
await view.when()
this.destroyLegend()
const legendOption: __esri.LegendProperties = { view: view, container: container }
this.legend = new this.Legend(legendOption)
```

### Responsive re-style on resize (ReactResizeDetector)
Source: `src/runtime/widget.tsx`
```tsx
onResize = ({ width, height }) => {
  this.currentWidth = width
  if (this.legend && this.props.config.cardLayout === 'auto') {
    const style = this.calculateStyle()
    this.legend.style = style
  }
}
// render:
<ReactResizeDetector targetRef={this.legendWrapperRef} handleHeight handleWidth onResize={this.onResize} />
```

### WidgetPlaceholder when no map widget is bound
Source: `src/runtime/widget.tsx`
```tsx
const useMapWidget = this.props.useMapWidgetIds && this.props.useMapWidgetIds[0]
if (!useMapWidget) {
  this.destroyLegend()
  content = (
    <div className='widget-legend'>
      <WidgetPlaceholder icon={legendIcon} autoFlip name={this.props.intl.formatMessage({ id: '_widgetLabel', defaultMessage: defaultMessages._widgetLabel })} widgetId={this.props.id} />
    </div>
  )
}
```

### Theme-driven emotion style for the legend host
Source: `src/runtime/lib/style.ts`
```ts
export function getStyle (theme: IMThemeVariables, style: Style): SerializedStyles {
  const fillStyleCss = styleUtils.toCSSStyle({ background: style.background }) as any
  delete fillStyleCss.backgroundColor
  const fontColor = style.fontColor || theme.sys.color.surface.paperText
  const root = style.background?.color || 'transparent'
  const cardRoot = theme.sys.color.surface.paper
  return css`
    ${style.background?.color ? 'background: transparent;' : '' }
    overflow: auto;
    .widget-legend {
      /* ... esri-legend and esri-legend--card overrides ... */
    }
  `
}
```

### Recurse SDK ActiveLayerInfo children
Source: `src/runtime/widget.tsx`
```tsx
getAllChildActiveInfos = (activeInfo: __esri.ActiveLayerInfo, result: __esri.ActiveLayerInfo[] = []) => {
  if (activeInfo.children) {
    for (const childInfo of activeInfo.children) {
      result.push(childInfo)
      this.getAllChildActiveInfos(childInfo, result)
    }
  }
  return result
}
```

### Settings: bind map + per-layer customization (LayerSetting)
Source: `src/setting/setting.tsx`
```tsx
<MapWidgetSelector onSelect={this.onMapWidgetSelected} useMapWidgetIds={this.props.useMapWidgetIds} />
// ...
<LayerSetting
  mapWidgetId={this.props.useMapWidgetIds?.[0]}
  onMapItemClick={this.onListItemBodyClick}
  mapViewId={this.state.activeCustomizeJmvId}
  isCustomizeEnabled={this.getActiveCustomizeStatus()}
  isShowRuntimeAddedLayerEnabled={this.getShowRuntimeAddedLayerStatus()}
  showTable={false}
  onToggleCustomize={this.onCustomizeLayerChange}
  onShowRuntimeAddedLayersChange={this.onShowRuntimeAddedLayersChange}
  onSelectedLayerIdChange={this.onLayerIdChange}
  selectedValues={this.getSelectedValues()}
  hideLayers={this.hideLayers}
/>
```

### Settings: writing customization config
Source: `src/setting/setting.tsx`
```tsx
onCustomizeLayerChange = (enable: boolean, jlvIds: string[]) => {
  this.props.onSettingChange({
    id: this.props.id,
    config: this.props.config.setIn(['customizeLayerOptions', this.state.activeCustomizeJmvId], {
      isEnabled: enable,
      hiddenJimuLayerViewIds: [],
      showJimuLayerViewIds: enable ? [...jlvIds] : [],
      showRuntimeAddedLayers: enable ? true : undefined
    })
  })
}
```

### Reusable radio-group settings control
Source: `src/setting/components/group-radios.tsx`
```tsx
const GroupRadios = (props: GroupRadiosProps) => {
  const { itemsIds, itemsOptions, value, onChange, name } = props
  const radiosContent = itemsIds.map((radioItemProps, index) => {
    const itemProps: RadioItemProps = {
      itemId: itemsIds[index],
      checked: value === itemsOptions[index],
      onRadioChange: () => { onChange(itemsOptions[index]) },
      name: name
    }
    return <RadioItem key={index} {...itemProps} ></RadioItem>
  })
  return (
    <div className="card-layout-content pl-2" role="radiogroup" css={groupRadioStyles} aria-label={name}>
      {radiosContent}
    </div>
  )
}
```
