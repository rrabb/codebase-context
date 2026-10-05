# OTB Widget: common/controller

Online widget doc: https://developers.arcgis.com/experience-builder/guide/widget-controller-widget/

## Purpose
The Controller widget is a special "widget of widgets": it hosts other widgets as cards
(avatar buttons) and controls their open/close/toggle lifecycle. Instead of laying widgets
out inline on a page, authors drop widgets into the controller and the controller renders a
compact bar of buttons (with optional labels, tooltips, indicators) that launch each hosted
widget in an off-panel, floating, fixed, mobile, or multiple-panel launcher. It also ships
two message actions (Open widget, Toggle widget) so any Button click or data selection
elsewhere in the app can drive widgets that live inside the controller.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/common/consts.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/runtime/runtime/runtime.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/runtime/runtime/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/message-actions/open-widgets-action.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/message-actions/toggle-widgets-action.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/message-actions/open-widgets-action-setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/tools/previous.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/tools/next.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/tools/manage-widgets.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/tools/add-widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/tools/app-config-operations.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/setting/setting-advanced.tsx

Note: this widget's source tree under `.../dist/widgets/common/controller/` is gitignored
(vendor/runtime copy). Paths and snippets below are read from that ACTUAL source, not the
online docs.

## Architecture overview
The controller is registered as a special widget type via the manifest property
`isWidgetController: true` (see Manifest section). That flag, plus `hasEmbeddedLayout: true`
and the declared `controller` layout, tells the ExB framework this widget owns an embedded
layout into which other widgets are placed. UNVERIFIED (framework-internal, not in this
folder): the exact host-side handling of `isWidgetController` lives in jimu-core /
jimu-layouts and is not part of the controller widget source.

Runtime composition (top down):
- `widget.tsx` (`ControllerWidget`) is the ExB widget entry. It reads config, decides
  auto-size / visibility, wires resize + drag handlers, publishes a `VisibleContext`, and
  chooses between the Builder module (in builder) and the `Runtime` component (at runtime).
- `runtime/runtime/runtime.tsx` (`Runtime`) resolves the hosted widgets from the embedded
  `controller` layout via `useControlledWidgets`, computes which are currently open, renders
  each hosted widget as a `WidgetAvatarCard`, and renders one of two overflow presentations
  (`ScrollList` with arrows, or `PopupList`). It also renders `WidgetsLauncher`, which is
  responsible for actually mounting the opened hosted widget in the correct launcher variant
  (off-panel / floating / fixed / mobile / multiple).
- `runtime/runtime/utils.ts` (`toggleWidget`) dispatches the Redux `appActions` that open /
  close hosted widgets (this is the lifecycle core).

Controller layout: the manifest declares a single FIXED layout named `controller`
(`BASE_LAYOUT_NAME = 'controller'` in common/consts.ts). Hosted widget ids are read out of
that layout at both runtime (`useControlledWidgets` in runtime.tsx) and settings time
(`useControlledWidgets` in setting.tsx via `searchUtils.findLayoutId`).

## Key imports and packages
Grouped by concern, with the file each import appears in.

jimu-core (framework primitives)
- `React, css, AllWidgetProps, IMState, AppMode, ReactRedux, hooks, WidgetState`
  - runtime/widget.tsx
- `React, appActions, getAppStore, hooks` - runtime/runtime/runtime.tsx
- `appActions, getAppStore` - runtime/runtime/utils.ts
- `AbstractMessageAction, Message, MessageDescription, getAppStore, appActions,
   ImmutableObject, RuntimeInfos, MessageType, DataRecordsSelectionChangeMessage,
   SceneLayerDataSource, FeatureLayerDataSource, BuildingComponentSubLayerDataSource, AppMode`
  - message-actions/open-widgets-action.ts
- `AbstractMessageAction, Message, MessageDescription, getAppStore, appActions,
   ImmutableObject, RuntimeInfos, MessageType` - message-actions/toggle-widgets-action.ts
- `extensionSpec, React, getAppStore, LayoutContextToolProps, i18n` - tools/previous.tsx,
   tools/next.tsx (context-tool extensions)
- `extensionSpec, getAppStore, LayoutContextToolProps, i18n, BrowserSizeMode` -
   tools/manage-widgets.ts
- `AppMode, BrowserSizeMode, getAppStore, lodash, extensionSpec, IMAppConfig, ImmutableArray,
   IMIconResult, LayoutInfo, DuplicateContext, dataSourceUtils` - tools/app-config-operations.ts
   (implements `extensionSpec.AppConfigOperationsExtension`)
- `React, IMState, Immutable, ImmutableArray, ReactRedux, IMThemeButtonStylesByState, hooks,
   BrowserSizeMode` - setting/setting.tsx
- `ImmutableObject, hooks, classNames` - setting/setting-advanced.tsx
- config type imports: `ImmutableObject, Size, UseDataSource, ThemeBoxStyles` - src/config.ts

jimu-ui (UI + theming helpers)
- `BoxShadowStyle, styleUtils` - runtime/widget.tsx
- `defaultMessages` - tools/previous.tsx, tools/next.tsx, tools/manage-widgets.ts,
   tools/add-widget.tsx
- `Switch, Radio, Select, Label, MultiSelect, DistanceUnits, CollapsablePanel,
   CollapsableToggle, MultiSelectItem, defaultMessages` - setting/setting.tsx
- `Tabs, Tab, BoxShadowStyle, defaultMessages` - setting/setting-advanced.tsx
- config type imports: `ButtonProps, BoxShadowStyle` - src/config.ts

jimu-ui advanced / basic setting components
- `SettingSection, SettingRow, DirectionSelector` - setting/setting.tsx
- `MessageActionDataSelector, SettingSection, SettingRow` - message-actions/open-widgets-action-setting.tsx
- `InputUnit` (jimu-ui/advanced/style-setting-components) - setting/setting.tsx
- `CollapsableResetPanel, SettingRow` + `BoxShadowSetting`
   (jimu-ui/advanced/style-setting-components) + `ThemeColorPicker`
   (jimu-ui/basic/color-picker) - setting/setting-advanced.tsx

jimu-for-builder (builder-only mutation APIs)
- `AllWidgetSettingProps, getAppConfigAction, AppConfigAction, builderAppSync` - setting/setting.tsx
- `getAppConfigAction` - tools/app-config-operations.ts
- `appBuilderSync` - tools/manage-widgets.ts, tools/add-widget.tsx

jimu-layouts/layout-runtime (embedded layout helpers)
- `defaultMessages as jimuLayoutMessages, searchUtils` - setting/setting.tsx
  (`searchUtils.findLayoutId` resolves the controller layout id per size mode)

jimu-theme
- `useTheme2` - setting/setting-advanced.tsx

jimu-icons (SVG assets)
- directional right/left (outlined + filled) - tools/previous.tsx, tools/next.tsx
- `widget-controller` / `widget` / editor `plus` (outlined + filled) - tools/manage-widgets.ts,
   tools/add-widget.tsx

Notable framework types used for lifecycle: `WidgetState` and `AppMode` (jimu-core) gate
visibility and builder vs run behavior; `AbstractMessageAction` (jimu-core) is the base class
for both message actions; `RuntimeInfos` / `widgetsRuntimeInfo` is the store slice used to
find which hosted widgets are currently open.

## Reusable patterns found

### isWidgetController widget type
`manifest.json` sets `"properties": { "isWidgetController": true, "hasEmbeddedLayout": true, ...}`
and declares a `controller` FIXED layout. This is the golden-path way to build a widget that
hosts and orchestrates other widgets. Companion flags used here: `defaultInControllerUx:
"offPanel"`, `canCrossLayoutBoundary: true`, `needHiddenState: true`, `useDragHandler: true`,
`supportAutoSize: true`, `hasBuilderSupportModule: true`.

### Message actions to control other widgets' lifecycle
Two `AbstractMessageAction` subclasses let external triggers drive hosted widgets:
- `open-widgets-action.ts` (`openWidget`): opens configured `widgetIds`. Supports
  `ButtonClick` and `DataRecordsSelectionChange`; in Express mode only `ButtonClick`. For
  selection messages it can filter on the trigger data source(s). Honors the controller's
  `onlyOpenOne` behavior by closing currently-open hosted widgets first.
- `toggle-widgets-action.ts` (`toggleWidget`): opens if closed / closes if open. In single
  mode it closes all open hosted widgets then opens the target unless the target was already
  open; in multi mode it toggles the whole set.
Both resolve the controller config from `state.appConfig.widgets[controllerId].config` and
use `state.widgetsRuntimeInfo` filtered by `controllerWidgetId === controllerId` to know
which widgets are open. Lifecycle mutation is via `appActions.openWidgets` /
`appActions.closeWidgets`.

### WidgetState / open detection
Open/close state is derived from the store, not local state. `runtime.tsx` uses
`useControlledWidgets` + `isWidgetOpening(widgets[widgetId])` to compute `openingWidgets`;
message actions filter `widgetsRuntimeInfo` by `controllerWidgetId` and `isWidgetOpening`.
`widget.tsx` uses `WidgetState.Opened` / `WidgetState.Hidden` to decide controller visibility
(nested controllers are visible only when `WidgetState.Opened`).

### VisibleContext
`widget.tsx` exports `export const VisibleContext = React.createContext<boolean>(true)` and
wraps the runtime/builder subtree in `<VisibleContext.Provider value={controllerVisible}>`.
This lets hosted-card sub-components know whether the controller (and thus their button) is
currently visible without prop drilling.

### Avatar / card config
Each hosted widget renders as a `WidgetAvatarCard` configured from `config.appearance.card`
(`AvatarCardConfig` in config.ts): `showLabel`, `showIndicator`, `showTooltip`, `labelGrowth`,
`avatar` (size/type/shape/iconSize/buttonSize), and a per-state `variant`
(`ControllerButtonStylesByState` with default/hover/active). Advanced styling is compiled to
emotion `css` in `widget.tsx` (`getAdvancedStyle` + `useAdvancedStyle`).

### Overflow arrows vs popup window
`config.behavior.overflownStyle` (`OverflownStyle.Arrows | POPUP_WINDOW`) selects the
presentation in `runtime.tsx`: `ScrollList` (scroll with previous/next arrow context tools)
or `PopupList` (a "more" popup). The arrow context tools (`tools/previous.tsx`,
`tools/next.tsx`) are only `visible()` when `overflownStyle !== PopupWindow` and the runtime
has flagged `hideArrow === false`.

### Controller layout base
`BASE_LAYOUT_NAME = 'controller'` (common/consts.ts) is the single embedded layout name used
everywhere hosted widgets are read (runtime `useControlledWidgets`, setting
`useControlledWidgets`, `manage-widgets` disabled check, `app-config-operations` structure
walk). Reuse this constant instead of hardcoding the string.

## Builder vs runtime split
- `widget.tsx` branches on `isInBuilder && appMode !== AppMode.Run`. When in builder it renders
  `builderSupportModules.widgetModules.Builder`; otherwise it renders the `Runtime` component.
  Both receive the same `id/version/config/autoSize` props and share the `VisibleContext`.
- Builder-only mutation lives in `jimu-for-builder` usage:
  - `setting/setting.tsx` uses `AllWidgetSettingProps`, `getAppConfigAction`, `AppConfigAction`,
    `builderAppSync`, and `onSettingChange` to persist config.
  - Context tools (`tools/*`) are `extensionSpec.ContextToolExtension` shown on the widget in
    builder: `previous` / `next` (scroll), `manage-widgets` (reorder/remove hosted widgets),
    `add-widget` (add a hosted widget). They read app state via `getAppStore()` and
    `state.appStateInBuilder ? state.appStateInBuilder : state`, and drive builder side panels
    via `appBuilderSync.publishSidePanelToApp(...)` in small (mobile) size mode.
- `tools/app-config-operations.ts` implements `extensionSpec.AppConfigOperationsExtension`
  (registered at manifest extension point `APP_CONFIG_OPERATIONS`) to fix up config when the
  controller is copied (`afterWidgetCopied` remaps `openStarts`, message-action `widgetIds`,
  `useDataSources`, and copies `controllerPanels`) or removed (`widgetWillRemove` cleans up
  `controllerPanels`), and to normalize the controller structure in `appConfigWillChange`.

## Lifecycle and cleanup
- Open/close of hosted widgets is dispatched through Redux, never local state:
  `appActions.openWidget` / `closeWidget` / `openWidgets` / `closeWidgets` (see
  runtime/utils.ts `toggleWidget` and both message actions).
- `widget.tsx` registers resize and drag handlers in effects and forces a re-render by bumping
  a `version` counter: `onInitResizeHandler?.(null, null, () => setVersion(v => v + 1))` and the
  same for `onInitDragHandler`. `hooks.useUpdateEffect` bumps `version` when `onlyOpenOne`,
  `displayType`, or `appMode` change so the launcher re-lays out.
- Copy lifecycle: `app-config-operations.ts#afterWidgetCopied` deep-remaps references so a
  duplicated controller keeps working (widget ids via `contentMap`, data sources via
  `dataSourceUtils.mapUseDataSource`).
- Remove lifecycle: `app-config-operations.ts#widgetWillRemove` removes the widget's entry from
  `appConfig.controllerPanels` so no orphan panel config remains.
- No manual DOM/event listeners are added at runtime that require teardown here; the DOM
  queries in runtime/utils.ts (`getWidgetCardNode`, etc.) are one-shot lookups, not listeners.

## Manifest/config requirements
manifest.json (key fields):
- `"type": "widget"`, and `"properties.isWidgetController": true` (the defining flag).
- `"properties.hasEmbeddedLayout": true` + `"layouts": [{ "name": "controller", "type": "FIXED" }]`
  to declare the embedded host layout.
- Other properties observed: `hasSettingPage`, `supportAutoSize`, `useDragHandler`,
  `canCrossLayoutBoundary`, `needHiddenState`, `defaultInControllerUx: "offPanel"`,
  `hasBuilderSupportModule`.
- `messageActions`: `openWidget` (uri `message-actions/open-widgets-action`, settingUri
  `.../open-widgets-action-setting`) and `toggleWidget` (uri `.../toggle-widgets-action`,
  settingUri `.../toggle-widgets-action-setting`).
- `extensions`: four `CONTEXT_TOOL` entries (`previous`, `next`, `manage-widgets`,
  `add-widget`) and one `APP_CONFIG_OPERATIONS` entry (`appConfigOperations` ->
  `tools/app-config-operations`).
- `defaultSize`: `{ height: 54, width: 200, autoWidth: true, autoHeight: true }`.

config.ts (`Config` shape):
- `behavior`: `onlyOpenOne`, `openStarts: string[]`, `arrangement: 'floating' | 'fixed'`,
  `displayType: DisplayType (STACK | SIDEBYSIDE)`, `vertical`, `size: SizeMap`,
  `alignment: ControllerAlignment (center|start|end)`, `overflownStyle: OverflownStyle
  (ARROWS | POPUP_WINDOW)`.
- `appearance`: `space: number`, `advanced: boolean`, `card: AvatarCardConfig`.
- Message action config `ActionConfig`: `{ widgetIds: string[]; useDataSources?: UseDataSource[] }`.

## Gotchas
- `isWidgetController` is a manifest property, not something the widget code implements; the
  hosting behavior is provided by the framework. Do not expect the "control other widgets"
  glue to be visible in this folder beyond reading/writing the `controller` layout and
  dispatching `appActions`.
- Always resolve the hosted-widget list from the `controller` layout (`BASE_LAYOUT_NAME`) via
  the framework helpers (`searchUtils.findLayoutId`, `useControlledWidgets`), never assume a
  static id list. Size mode matters: the layout id differs per `browserSizeMode`.
- Context tools and app-config operations read state defensively with
  `state.appStateInBuilder ? state.appStateInBuilder : state` because in builder the live app
  state lives under `appStateInBuilder`. Copy this pattern in any controller-aware extension.
- `onlyOpenOne` (single mode) changes both message actions' behavior: they proactively close
  currently-open hosted widgets before opening the target. If you add new open logic, respect
  this flag or you will leave multiple panels open in single mode.
- The active-state background of avatar buttons had to be re-added for backward compatibility
  after a 2024R03 Button change (see `useAdvancedStyle`'s `defaultActiveStyle`). Do not strip
  that fallback.
- Nested controllers: when a controller lives inside another controller (`controllerWidgetId`
  present) it is forced to `autoWidth`/`autoHeight` and is only visible when
  `state === WidgetState.Opened`.

## Useful snippets and functions

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/manifest.json
```json
"type": "widget",
"properties": {
  "hasSettingPage": true,
  "hasEmbeddedLayout": true,
  "isWidgetController": true,
  "supportAutoSize": true,
  "useDragHandler": true,
  "canCrossLayoutBoundary": true,
  "needHiddenState": true,
  "defaultInControllerUx": "offPanel",
  "hasBuilderSupportModule": true
},
"layouts": [
  { "name": "controller", "label": "Controller layout", "type": "FIXED" }
]
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/common/consts.ts
```ts
// Widgets layout name in controller
export const BASE_LAYOUT_NAME = 'controller'
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/runtime/widget.tsx
```tsx
export const VisibleContext = React.createContext<boolean>(true)

const ControllerWidget = (props: ControllerWidgetProps) => {
  const { builderSupportModules, id, config, onInitResizeHandler, onInitDragHandler,
    autoWidth: propAutoWidth, autoHeight: propAutoHeight, controllerWidgetId, state } = props
  // If a controller is in another controller, it's off panel and auto sized by default.
  const autoWidth = !!controllerWidgetId || propAutoWidth
  const autoHeight = !!controllerWidgetId || propAutoHeight
  const controllerVisible = controllerWidgetId
    ? state === WidgetState.Opened
    : state !== WidgetState.Hidden

  const isBuilder = isInBuilder && appMode !== AppMode.Run
  const Builder = isBuilder && builderSupportModules.widgetModules.Builder
  return (
    <div className='widget-controller jimu-widget rw-controller' css={[style, advancedStyle]}>
      <div className='controller-container'>
        <VisibleContext.Provider value={controllerVisible}>
          {!isBuilder && <Runtime id={id} version={version} config={config} autoSize={autoSize} />}
          {isBuilder && Builder && <Builder id={id} version={version} config={config} autoSize={autoSize} />}
        </VisibleContext.Provider>
      </div>
    </div>
  )
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/runtime/runtime/utils.ts
```ts
export const toggleWidget = (controllerId: string, widgetId: string, openingWidgets: string[],
  keepOneOpened: boolean, isSelect: boolean = false) => {
  if (keepOneOpened) {
    getAppStore().dispatch(appActions.closeWidgets(openingWidgets))
    if (!openingWidgets.includes(widgetId)) {
      getAppStore().dispatch(appActions.openWidget(widgetId))
      isSelect && selectWidget(widgetId, controllerId)
    }
  } else {
    if (!openingWidgets.includes(widgetId)) {
      getAppStore().dispatch(appActions.openWidget(widgetId))
      isSelect && selectWidget(widgetId, controllerId)
    } else {
      getAppStore().dispatch(appActions.closeWidget(widgetId))
    }
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/runtime/runtime/runtime.tsx
```tsx
// Get all the widgets contained in the controller
const widgets = useControlledWidgets(id, BASE_LAYOUT_NAME)
const widgetIds = Object.keys(widgets)
const openingWidgets = widgetIds.filter((widgetId) => isWidgetOpening(widgets[widgetId]))

const handleOpenWidget = React.useCallback((evt: React.MouseEvent<HTMLButtonElement>) => {
  const widgetId = evt.currentTarget.dataset?.widgetid
  if (!widgetId) return
  const keepOneOpened = mobile ? true : onlyOpenOne
  if (!openingWidgets.includes(widgetId)) {
    evt.stopPropagation()
  }
  toggleWidget(id, widgetId, openingWidgets, keepOneOpened, true)
}, [mobile, onlyOpenOne, openingWidgets, id])
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/message-actions/toggle-widgets-action.ts
```ts
export default class ToggleWidgetsAction extends AbstractMessageAction {
  private readonly supportedMessageTypes = [MessageType.ButtonClick]

  filterMessageDescription (messageDescription: MessageDescription): boolean {
    return this.supportedMessageTypes.includes(messageDescription.messageType)
  }

  onExecute (message: Message, actionConfig?: IMActionConfig): Promise<boolean> | boolean {
    const widgetIds = actionConfig?.widgetIds.asMutable()
    const controllerId = this.widgetId
    const state = getAppStore().getState()
    const widgetConfig = state.appConfig.widgets[controllerId].config as IMConfig
    const isSingle = widgetConfig?.behavior?.onlyOpenOne
    const widgetsRuntimeInfo = state.widgetsRuntimeInfo ?? {} as ImmutableObject<RuntimeInfos>
    const openingWidgets = Object.keys(widgetsRuntimeInfo).filter(widgetId => {
      const runtimeInfo = widgetsRuntimeInfo[widgetId]
      return runtimeInfo.controllerWidgetId === controllerId && isWidgetOpening(runtimeInfo)
    })
    if (isSingle) {
      getAppStore().dispatch(appActions.closeWidgets(openingWidgets))
      if (!openingWidgets.includes(widgetIds[0])) {
        getAppStore().dispatch(appActions.openWidgets(widgetIds))
      }
    } else {
      const allOpen = widgetIds.every(id => openingWidgets.includes(id))
      if (allOpen) {
        getAppStore().dispatch(appActions.closeWidgets(widgetIds))
      } else {
        getAppStore().dispatch(appActions.openWidgets(widgetIds))
      }
    }
    return Promise.resolve(true)
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/message-actions/open-widgets-action.ts
```ts
export default class OpenWidgetsAction extends AbstractMessageAction {
  private readonly supportedMessageTypes = [MessageType.ButtonClick, MessageType.DataRecordsSelectionChange]
  private readonly supportedMessageTypesInExpressMode = [MessageType.ButtonClick]

  filterMessageDescription (messageDescription: MessageDescription): boolean {
    const appMode = getAppStore().getState().appRuntimeInfo.appMode
    if (appMode === AppMode.Express) {
      return this.supportedMessageTypesInExpressMode.includes(messageDescription.messageType)
    } else {
      return this.supportedMessageTypes.includes(messageDescription.messageType)
    }
  }
  // onExecute: resolves controller config, honors onlyOpenOne by closing open widgets first,
  // then getAppStore().dispatch(appActions.openWidgets(widgetIds))
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/tools/next.tsx
```tsx
export default class Next implements extensionSpec.ContextToolExtension {
  index = 2
  id = 'controller-roll-list-next'
  scroll: (previous: boolean) => void

  visible (props: LayoutContextToolProps) {
    const state = this.getAppState()
    const widgetId = props.layoutItem.widgetId
    const overflownStyle = state.appConfig.widgets[widgetId]?.config?.behavior?.overflownStyle
    const hideArrow = state.widgetsState[widgetId]?.hideArrow ?? true
    return !hideArrow && overflownStyle !== OverflownStyle.PopupWindow
  }
  onClick (props: LayoutContextToolProps) {
    this.scroll && this.scroll(false)
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/setting/setting.tsx
```tsx
export const useControlledWidgets = (id: string, layoutName: string): ControlledWidgets => {
  const layout = ReactRedux.useSelector((state: IMState) => {
    state = state.appStateInBuilder
    const layouts = state.appConfig.widgets?.[id]?.layouts?.[layoutName]
    const browserSizeMode = state.browserSizeMode
    const mainSizeMode = state.appConfig.mainSizeMode
    const layoutId = searchUtils.findLayoutId(layouts, browserSizeMode, mainSizeMode)
    return state.appConfig.layouts?.[layoutId]
  })
  const controlledWidgets = getWidgetIdsFromLayout(layout)
  const widgets = ReactRedux.useSelector((state: IMState) => state.appStateInBuilder.appConfig.widgets)
  return Immutable(controlledWidgets || []).map((widgetId) => ({
    label: widgets[widgetId]?.label,
    value: widgetId
  }))
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/controller/src/tools/app-config-operations.ts
```ts
export default class AppConfigOperation implements extensionSpec.AppConfigOperationsExtension {
  id = 'controller-app-config-operation'
  widgetId: string

  // Cleanup before the controller is removed: drop its controllerPanels entry.
  widgetWillRemove (appConfig: IMAppConfig): IMAppConfig {
    if (appConfig.controllerPanels?.[this.widgetId]) {
      return appConfig.set('controllerPanels', appConfig.controllerPanels.without(this.widgetId))
    }
    return appConfig
  }
}
```
