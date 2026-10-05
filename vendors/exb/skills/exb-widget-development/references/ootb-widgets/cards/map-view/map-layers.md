# OTB Widget: arcgis/map-layers

Online widget doc: https://developers.arcgis.com/experience-builder/guide/map-layers-widget/

## Purpose
Renders an interactive layer list (the "Map Layers" / LayerList widget from the developer guide) for a connected Map widget or a WebMap/WebScene data source. It wraps the JSAPI `LayerList` and `TableList` widgets and augments each layer item with in-place actions (go to, show/hide labels, enable/disable popup, transparency, visibility range, information, change symbol for runtime layers, remove runtime layer) plus consumer data actions via `DataActionList`. It also supports a header with layer search and batch visibility options, drag reorder, legend, tables, and builder-time layer customization (white-list of which layers show per map view).

## Source paths inspected
SOURCE ROOT (gitignored dist copy of the SDK widget):
`ArcGISExperienceBuilder/client/dist/widgets/arcgis/map-layers/`
- `manifest.json`
- `config.json` (default config: `{ "useMapWidget": true }`)
- `src/config.ts` (Config / CustomizeLayerOption / IMConfig)
- `src/version-manager.ts`
- `src/runtime/widget.tsx`
- `src/runtime/actions/action.ts` (base Action class)
- `src/runtime/actions/index.ts` (getLayerListActions)
- `src/runtime/actions/constants.ts` (ACTION_INDEXES enum)
- `src/runtime/actions/goto.ts`
- `src/runtime/actions/label.ts`
- `src/runtime/actions/popup.ts`
- `src/runtime/actions/transparency.tsx`
- `src/runtime/actions/visibility-range.tsx`
- `src/runtime/actions/information.ts`
- `src/runtime/actions/change-symbol.tsx`
- `src/runtime/actions/remove.tsx`
- `src/runtime/actions/option-action.ts`
- `src/runtime/components/map-layers-action-list.tsx`
- `src/runtime/components/map-layers-header.tsx`
- `src/runtime/components/transparency-slider.tsx`
- `src/runtime/components/visibility-range-slider.tsx`
- `src/runtime/components/change-symbol-popper.tsx`
- `src/runtime/lib/style.ts` (referenced, not fully read)
- `src/setting/setting.tsx`
- `src/tools/app-config-operations.ts`
NOT inspected in depth (exist but skimmed / skipped): `dist/`, `tests/`, `src/runtime/lib/style.ts` internals, `src/setting/components/`, `src/setting/lib/`, translations. Anything below marked UNVERIFIED is an inference.

## Architecture overview
- Class component `Widget` (`React.PureComponent`) in `src/runtime/widget.tsx`. It does NOT render React children for the layer list; instead it creates a native JSAPI `LayerList` / `TableList` into plain DOM containers held by refs (`layerListContainerRef`, `tableListContainerRef`).
- Two source modes, driven by `config.useMapWidget`:
  - Map widget mode: uses `JimuMapViewComponent` + `onActiveViewChange` to get a `JimuMapView`, then builds `LayerList` on `jimuMapView.view`.
  - Data source mode: uses `DataSourceComponent` with a WebMap/WebScene `MapDataSource`, creates its own hidden `MapView`/`SceneView` (into an off-screen `mapContainerRef`) and builds the `LayerList` on that view.
- Per-layer actions are modeled as `Action` subclasses (one file each under `actions/`). `getLayerListActions(widget)` instantiates and sorts them by `group` (see `ACTION_INDEXES`).
- JSAPI `LayerList.listItemCreatedFunction` (`defineLayerListActionsGenerator`) attaches native action sections to each `ListItem` based on which `Action.isValid(listItem)` returns true, always keeping a fake "option" (ellipsis) action that opens a custom Popper.
- The custom option Popper hosts `MapLayersActionList`, which renders the widget's own actions as `DropdownItem`s AND a `DataActionList` (consumer data actions) for the layer's data source.
- Some actions render their own floating UI popper (`transparency`, `visibility-range`, `change-symbol`) stored in `state.nativeActionPopper`.

## Key imports and packages
From `jimu-core` (`widget.tsx`): `AppMode`, `React`, `jsx`, `AllWidgetProps`, `DataSourceComponent`, `MutableStoreManager`, `isKeyboardMode`, `focusElementInKeyboardMode`, `MapDataSource`, `DataSourceTypes`, `IMState`, `ExBAddedJSAPIProperties`, `semver`, `getAppStore`, `appActions`, `ImmutableObject`, `ResourceSessions`.
From `jimu-arcgis` (`widget.tsx`): `loadArcGISJSAPIModules`, `JimuMapViewComponent`, `JimuMapView`, `MapViewManager`, `JimuLayerView`.
From `jimu-ui` (`widget.tsx`): `WidgetPlaceholder`, `Popper`, `defaultMessages`, `Loading`, `getFocusableElements`, `LoadingType`, `Paper`.
From `jimu-icons` (`widget.tsx`): `TableOutlined` (`jimu-icons/outlined/data/table`).

Actions:
- `actions/goto.ts`: `zoomToUtils` from `jimu-arcgis` (`zoomToUtils.zoomTo(view, layer, { padding })`).
- `actions/popup.ts`: `MutableStoreManager`, `SupportedJSAPILayerTypes` from `jimu-core`.
- `actions/change-symbol.tsx`: `ExBAddedJSAPIProperties`, `SupportedJSAPILayerTypes` from `jimu-core`; `JimuSymbolType` from `jimu-ui/advanced/map`; `ChangeSymbolOutlined` icon.
- `actions/remove.tsx`: `ExBAddedJSAPIProperties`, `CONSTANTS` from `jimu-core`; `TrashOutlined` icon.
- `actions/information.ts`: `portalUrlUtils` from `jimu-core`.
- `actions/transparency.tsx`, `visibility-range.tsx`: `TransparencyOutlined` / `RangeOutlined` icons; render slider components.

Components:
- `components/map-layers-action-list.tsx`: `DataActionList`, `DropdownItem` from `jimu-ui`; `styled` from `jimu-theme`; `JimuMapView` from `jimu-arcgis`.
- `components/visibility-range-slider.tsx`: `import * as reactiveUtils from 'esri/core/reactiveUtils'` (direct JSAPI alias import), `FloatingPanel` from `jimu-ui`, `useTheme` from `jimu-theme`, uses `__esri.ScaleRangeSlider`.
- `components/transparency-slider.tsx`: `FloatingPanel`, `Slider` from `jimu-ui`; `utils`, `polished`, `getAppStore` from `jimu-core`.
- `components/change-symbol-popper.tsx`: `FloatingPanel`, `Label`, `Radio` from `jimu-ui`; `JimuSymbolType`, `SymbolList` from `jimu-ui/advanced/map`; `ExBAddedJSAPIProperties` from `jimu-core`.
- `components/map-layers-header.tsx`: `MapViewManager` from `jimu-arcgis`; `Button`, `Dropdown`, `DropdownButton`, `DropdownItem`, `DropdownMenu`, `TextInput` from `jimu-ui`; `SearchOutlined`, `SelectOptionOutlined` icons; `hooks.useTranslation`, `lodash.throttle`.

Setting (`setting/setting.tsx`): `MapWidgetSelector`, `SettingSection`, `SettingRow`, `LayerSetting`, `getAllItemsInMapView` from `jimu-ui/advanced/setting-components`; `DataSourceSelector` from `jimu-ui/advanced/data-source-selector`; `Switch`, `Radio`, `Label`, `Alert`, `Checkbox` from `jimu-ui`; `AllWidgetSettingProps` from `jimu-for-builder`; `JimuMapViewComponent`, `MapViewManager` from `jimu-arcgis`.

JSAPI modules loaded lazily via `loadArcGISJSAPIModules([...])`: `esri/views/MapView`, `esri/views/SceneView`, `esri/widgets/LayerList`, `esri/widgets/TableList`, `esri/widgets/ScaleRangeSlider`.

## Reusable patterns found
- JimuMapView acquisition (map widget mode): `JimuMapViewComponent` `onActiveViewChange` gives the active `JimuMapView`; the widget awaits `jimuMapView.whenJimuMapViewLoaded()` before building the list (`syncRenderer`). It stores `this.viewFromMapWidget = jimuMapView.view` and `this.jmvFromMap = jimuMapView` for actions to use.
- Runtime-added layer detection: uses `layer[ExBAddedJSAPIProperties.EXB_LAYER_FROM_RUNTIME]` to decide which layers are user-added (drives Remove and change-symbol validity, and layer customization filtering).
- In-place layer actions bound to a JSAPI `ListItem`, each implementing `isValid(listItem, isTableList)` + `execute(listItem)`:
  - transparency: sets `listItem.layer.opacity = 1 - value` via a `Slider` in a `FloatingPanel`.
  - visibility-range: builds `__esri.ScaleRangeSlider` on `widget.jmvFromMap.view` + `listItem.layer`, and uses `reactiveUtils.watch` to copy `minScale`/`maxScale` back onto the layer.
  - change-symbol: for runtime feature-ish layers only; toggles predefined vs custom renderer, storing the original renderer on `layer[ExBAddedJSAPIProperties.EXB_PREDEFINED_RENDERER]` and applying a `{ type: 'simple', symbol }` renderer.
  - popup: toggles `layer.popupEnabled` and calls `jmv.enableLayerPopup(layer, true)` / `jmv.disableLayerPopup(layer)`; tracks state in `MutableStoreManager` under `[widgetId, 'popup', layer.id]` so it can be restored when the config option is turned off.
  - label: toggles `listItem.layer.labelsVisible` (only when `layer.labelingInfo` exists).
  - information: opens portal item page (`portalUrlUtils.getStandardPortalUrl(...) + '/home/item.html?id=...'`) or the raw layer URL in a new tab.
  - remove: removes runtime layers from the map (`map.remove(layer)`), with a special path for the marker layer via `jmv.removeMarkerLayer()`.
  - goto: `zoomToUtils.zoomTo(view, layer, { padding })`.
- DataActionList integration: `MapLayersActionList` resolves the layer's feature data source (`mapDataSource.getDataSourceByLayer(layer)` in DS mode, or `jimuLayerView.getOrCreateLayerDataSource()` / `jimuMapView.getMapDataSource().createDataSourceByLayer(layer)` in map mode) and passes `dataSets` to `<DataActionList>`; `canConsumeDataAction: true` in the manifest enables consuming actions.
- Tree layer list: native JSAPI `LayerList` provides the nested/group tree; `config.expandAllLayers` walks `operationalItems` recursively (`toggleExpand`).
- Layer search + batch visibility: `MapLayersHeader` filters via a `listItemFilterFunction`-style predicate (opens matched item's parents) and offers batch show/hide.
- "Fake" ellipsis option action: a native JSAPI action (`option-action`) is always attached; clicking it opens the widget's own `Popper` with `MapLayersActionList` rather than a native panel, so custom React UI + data actions can be shown.

## Builder vs runtime split
- Runtime (`src/runtime/`): renders the layer/table list, actions, and popovers; consumes `config` toggles.
- Setting (`src/setting/setting.tsx`): choose source mode (map widget vs data source) via `MapWidgetSelector` / `DataSourceSelector`; toggle per-feature options with `Switch` rows: `goto`, `label` (showOrHideLabels), `popup`, `opacity` (transparency), `visibilityRange`, `information`, `changeSymbolForRuntimeLayers`; plus `useTickBoxes`, `enableLegend` (+ `showAllLegend`), and others (reorder, search, batch, tables, expandAll per config). Also configures per-map-view layer customization (`customizeLayerOptions`) using `LayerSetting` + `getAllItemsInMapView` (white-list `showJimuLayerViewIds`).
- App config operation (`src/tools/app-config-operations.ts`): `AppConfigOperationsExtension.afterWidgetCopied` remaps `customizeLayerOptions` jimuMapViewIds and jimuLayerViewIds when a page is copied, using `mapViewUtils.getCopiedJimuMapViewId` / `getCopiedJimuLayerViewId`. Registered in manifest under `extensions` (`APP_CONFIG_OPERATIONS`, `tools/app-config-operations`).
- Version upgrade (`src/version-manager.ts`): one migration at `1.12.0` that removes `selectedJimuLayerIds` and disables old app data-action.

## Lifecycle and cleanup
- `constructor`: builds action list (`getLayerListActions(this)`), creates all refs, `renderPromise = Promise.resolve()`.
- `componentDidMount`: `bindClickHandler()` wires a raw `onclick` on the list containers to detect clicks on the native ellipsis (option) action and open the custom Popper.
- `componentDidUpdate`: heavy logic. Guards re-render with `needToPreventRefreshList`; closes poppers when `enableDataAction` or `config` changes; re-renders table list when `showTables` changes; re-renders the layer list (debounced via `setTimeout(..., 150)`) when the bound map/data source id matches; calls `restoreLayerPopupField()` when the popup option is turned off.
- List creation: `createLayerList` / `createTableList` create a fresh DOM container, call `destroyLayerList()` / `destroyTableList()` first, then `new LayerList(...)` / `new TableList(...)`; both attach `on('trigger-action', ...)`.
- Data-source mode view: `createWebMapView` / `createSceneView` reuse existing `MapView`/`SceneView` if present (swap `.map`), else create into `mapContainerRef`; `destroyView()` destroys them.
- JimuLayerView listener: `addJimuLayerViewCreatedListener(this._addJlvCreatedListener)` re-renders when a runtime layer is added; removed and re-added on `onActiveViewChange` to avoid duplicate callbacks.
- Popup restore: `restoreLayerPopupField()` reads `MutableStoreManager` `[widgetId, 'popup']`, resets each `layer.popupEnabled` to its `initialValue`, then clears the stored value.
- No explicit `componentWillUnmount` was present in the read range (UNVERIFIED whether destroy is also called on unmount - `destroyLayerList()` is called in `render` when there is no map/data source).

## Manifest/config requirements
From `manifest.json`:
- `"dependency": "jimu-arcgis"` (required for JSAPI + JimuMapView).
- `"properties": { "canConsumeDataAction": true, "coverLayoutBackground": true }`.
- `"defaultSize": { "width": 400, "height": 400 }`.
- `extensions`: one `APP_CONFIG_OPERATIONS` extension (`tools/app-config-operations`).
- `excludeDataActions`: `arcgis-map.*`, `exportSelected`, `elevation-profile.*`, `table.viewInTable`, `relatedData`, `directions.*`.
- No `publishMessages` / `messageActions`.

`config.json` default: `{ "useMapWidget": true }`.

`Config` interface (`src/config.ts`) toggles: `goto`, `label`, `opacity`, `information`, `setVisibility`, `useMapWidget`, `enableLegend`, `useTickBoxes`, `showAllLegend`, `reorderLayers`, `searchLayers`, `expandAllLayers`, `showTables`, `popup`, `visibilityRange`, `layerBatchOptions`, `changeSymbolForRuntimeLayers`, `symbolOption` (`'predefined' | 'custom'`), and `customizeLayerOptions` (per-jimuMapViewId `CustomizeLayerOption` with `isEnabled`, `showRuntimeAddedLayers?`, `hiddenJimuLayerViewIds?`, `showJimuLayerViewIds?`).

## Gotchas
- The layer list is a native JSAPI widget mounted into raw DOM, not React children. State-driven React re-render is aggressively suppressed (`needToPreventRefreshList`) and list refresh is debounced with `setTimeout(..., 150)`; editing the list flow by "just re-rendering React" will not work as expected.
- The ellipsis "option" action is detected by a raw `onclick` handler on the container that inspects `nodeName === 'CALCITE-ACTION'` and the element's `title` (localized "Options") or `data-action-id === 'option-action'`. This is brittle to Calcite/JSAPI DOM changes.
- Two distinct popper mechanisms coexist: `state.actionListDOM` in a `jimu-ui` `Popper` (option menu + data actions) and `state.nativeActionPopper` (transparency / visibility-range / change-symbol `FloatingPanel`s). Both are cleared on config/data-action changes.
- `visibility-range-slider.tsx` imports the JSAPI module directly (`import * as reactiveUtils from 'esri/core/reactiveUtils'`) rather than via `loadArcGISJSAPIModules`; other modules are loaded lazily. `ScaleRangeSlider` itself is loaded lazily in the action's `isValid`.
- change-symbol only applies to runtime-added layers (`EXB_LAYER_FROM_RUNTIME`) of point/polyline/polygon geometry, plus map-image sublayers that support dynamic layers; the original renderer is cached on `EXB_PREDEFINED_RENDERER` and must be restored when switching back to predefined.
- popup action mutates `layer.popupEnabled` directly and tracks initial values in `MutableStoreManager`; if the config `popup` toggle is turned off, `restoreLayerPopupField()` reverts them - do not assume popup state is purely config-driven.
- Layer customization changed semantics across versions: pre-1.18 apps used `hiddenJimuLayerViewIds` (black-list); newer apps use `showJimuLayerViewIds` (white-list). `upgradeOldSublayerConfig` migrates special sublayers (WMS/WMTS/KML/Catalog/KnowledgeGraph/LinkChart) into the white-list.
- WMTS sublayers are force-shown (`listItem.hidden = false`) even under customization.
- Table list only appears when `config.showTables` is true and uses a separate `TableList` instance and container.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - acquire JimuMapView + gate rendering on load
```tsx
async syncRenderer (preRenderPromise) {
  this.jimuMapView = MapViewManager.getInstance().getJimuMapViewById(this.state.jimuMapViewId)
  // The datasource mode does not have a jimuMapView
  if (this.jimuMapView) {
    await this.jimuMapView.whenJimuMapViewLoaded()
  }
  await preRenderPromise
  this.renderPromise = this.renderLayerList()
}
```

Source: `src/runtime/widget.tsx` - build a native LayerList into a DOM container with per-item actions
```tsx
async createLayerList (view: __esri.MapView | __esri.SceneView) {
  this.setState({ listLoadStatus: LoadStatus.Pending })
  if (!this.LayerList) {
    const modules = await loadArcGISJSAPIModules(['esri/widgets/LayerList'])
    this.LayerList = modules[0]
  }
  const container = document && document.createElement('div')
  container.className = 'jimu-widget'
  this.layerListContainerRef.current.appendChild(container)
  this.destroyLayerList()

  let option: __esri.LayerListProperties = {
    view: view,
    listItemCreatedFunction: this.defineLayerListActionsGenerator(false),
    container: container
  }
  if (this.props.config.useMapWidget) {
    option = {
      ...option,
      dragEnabled: this.props.config?.reorderLayers ?? false,
      visibilityAppearance: this.props.config?.useTickBoxes ? 'checkbox' : 'default',
    }
  }
  const layerList = new this.LayerList(option)
  layerList.on('trigger-action', (event) => { this.onLayerListActionsTriggered(event) })
  layerList.when(() => {
    if (this.props.config.expandAllLayers) {
      this.toggleExpand(layerList.operationalItems, true)
    }
  })
  this.layerListRef.current = layerList
}
```

Source: `src/runtime/widget.tsx` - lazy JSAPI module getter/setter helper
```tsx
async getModule (moduleName: string, getter: any, setter: any) {
  const currentValue = getter()
  if (currentValue) {
    return currentValue
  }
  const module = await loadArcGISJSAPIModules([moduleName])
  setter(module[0])
  return module[0]
}
```

Source: `src/runtime/actions/action.ts` - base Action contract every layer action implements
```ts
export default class Action {
  id: string = 'id'
  title: string = 'title'
  className: string = 'esri-icon'
  group: number = 0
  widget: Widget = null
  icon?: React.JSX.Element = null

  useMapWidget (): boolean {
    return this.widget.props.config.useMapWidget
  }

  isValid = (layerItem: __esri.ListItem, isTableList: boolean = false): boolean => false
  execute = (layerItem: __esri.ListItem): void | React.JSX.Element => {}
}
```

Source: `src/runtime/actions/goto.ts` - zoom to a layer using zoomToUtils
```ts
execute = (layerItem): void => {
  if (this.widget.viewFromMapWidget) {
    zoomToUtils.zoomTo(this.widget.viewFromMapWidget, layerItem.layer, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 }
    })
  }
}
```

Source: `src/runtime/actions/transparency.tsx` + `components/transparency-slider.tsx` - set layer opacity from a slider
```tsx
// action
execute = (layerItem) => {
  const element = <TransparencySlider widget={this.widget} listItem={layerItem} />
  this.widget.setState({ nativeActionPopper: element })
}

// slider onChange
onChange={(event) => {
  const transparency = Number.parseFloat(event.target.value)
  listItem.layer.opacity = 1 - transparency
}}
```

Source: `src/runtime/components/visibility-range-slider.tsx` - ScaleRangeSlider + reactiveUtils.watch write-back
```tsx
const scaleRangeSlider = new SliderClass({
  view: widget.jmvFromMap.view,
  layer: listItem.layer as __esri.Layer,
  region: scaleRegion,
  container: sliderRef.current
})
reactiveUtils.watch(() => [scaleRangeSlider.minScale, scaleRangeSlider.maxScale], function ([minScale, maxScale]) {
  (listItem.layer as any).minScale = minScale
  ;(listItem.layer as any).maxScale = maxScale
})
```

Source: `src/runtime/actions/popup.ts` - toggle popup + track state in MutableStoreManager
```ts
const prevStatus = mutableStore.getStateValue([widgetId, 'popup', layer.id])
const newStatus = prevStatus || {}
if (prevStatus?.initialValue === undefined) {
  newStatus.initialValue = layer.popupEnabled
  newStatus.layer = layer
}
if (this.title === this.disableTitle) {
  layer.popupEnabled = false
  jmv.disableLayerPopup(layer)
  newStatus.popupEnabled = false
} else {
  layer.popupEnabled = true
  jmv.enableLayerPopup(layer, true)
  newStatus.popupEnabled = true
}
mutableStore.updateStateValue(widgetId, `popup.${layer.id}`, newStatus)
```

Source: `src/runtime/components/change-symbol-popper.tsx` - swap layer renderer, caching the original
```tsx
const onSymbolChange = useCallback((symbol) => {
  if (!listItem.layer[ExBAddedJSAPIProperties.EXB_PREDEFINED_RENDERER]) {
    listItem.layer[ExBAddedJSAPIProperties.EXB_PREDEFINED_RENDERER] = listItem.layer.renderer
  }
  setHasPredefinedRenderer(true)
  listItem.layer.renderer = { type: 'simple', symbol: symbol }
}, [listItem.layer])
```

Source: `src/runtime/components/map-layers-action-list.tsx` - resolve a layer's data source and feed DataActionList
```tsx
let featureDS = null
if (mapDataSource) {
  featureDS = mapDataSource.getDataSourceByLayer(listItem.layer)
} else if (jimuMapView) {
  const jimuLayerView = jimuMapView?.getJimuLayerViewByAPILayer(listItem.layer)
  featureDS = jimuLayerView
    ? await jimuLayerView.getOrCreateLayerDataSource()
    : await jimuMapView.getMapDataSource().createDataSourceByLayer(listItem.layer)
}
const dataSets = featureDS ? [{ dataSource: featureDS, records: [], name: featureDS?.getLabel() }] : []
// ...
<DataActionList widgetId={widgetId} dataSets={dataSets} hideGroupTitle
  shouldHideEmptyList={shouldHideEmptyList} onActionListItemClick={onActionListItemClick}
  actionPanelRefDOM={optionBtnRef.current} whenListLoaded={() => { setIsLoading(false) }} />
```

Source: `src/runtime/components/map-layers-header.tsx` - layer search filter that opens matched parents
```tsx
const onFilterListItem = (searchContent) => (item) => {
  if (!item || !searchContent) {
    return true
  }
  const matched = item.layer.title.toLowerCase().includes(searchContent.toLowerCase())
  let currItem = item
  if (matched) {
    while (currItem) {
      currItem.open = true
      currItem = currItem.parent
    }
  }
  return matched
}
```

Source: `src/runtime/widget.tsx` - recursively expand all list items
```tsx
toggleExpand = (operationalItems: __esri.Collection<__esri.ListItem>, expand: boolean) => {
  for (const item of operationalItems) {
    item.open = expand
    if (item.children) {
      this.toggleExpand(item.children, expand)
    }
  }
}
```

Source: `src/setting/setting.tsx` - reusable Switch-per-option setting row
```tsx
getSwitchOption (optionKeys, stringKey?) {
  return (
    <SettingRow tag='label' label={this.getFormattedMessage(stringKey || optionKeys)}>
      <Switch
        className="can-x-switch"
        checked={(this.props.config && this.props.config[optionKeys]) || false}
        data-key={optionKeys}
        onChange={(evt) => { this.onOptionsChanged(evt.target.checked, optionKeys) }}
      />
    </SettingRow>
  )
}
```

Source: `src/tools/app-config-operations.ts` - remap customization ids after page copy
```ts
const newJmvId = mapViewUtils.getCopiedJimuMapViewId(contentMap, jmvId)
const newShowJlvIds = customizeLayerOption.showJimuLayerViewIds?.map(jlvId =>
  mapViewUtils.getCopiedJimuLayerViewId(contentMap, jlvId)
).asMutable()
newCustomizeLayerOptions[newJmvId] = {
  isEnabled: customizeLayerOption.isEnabled,
  showJimuLayerViewIds: newShowJlvIds,
  hiddenJimuLayerViewIds: newHiddenJlvIds
}
```
