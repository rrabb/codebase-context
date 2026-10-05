# OTB Widget: layout/sidebar

Online widget doc: https://developers.arcgis.com/experience-builder/guide/sidebar-widget/

## Purpose
The Sidebar widget is a LAYOUT-type container that splits its area into two panels: one
collapsible "sidebar" panel and one "normal" (main) panel. Users toggle the sidebar open or
closed via a controller button, a divider is optionally shown between the panels, and the panel
can be resized by dragging. It is the most complex OTB layout widget because it ships a fully
custom layout renderer (not the standard column/row layout), supports both horizontal and
vertical orientations, an overlay mode, resizable panels, and it exposes message actions so other
widgets can programmatically open or toggle it.

## Source paths inspected
All paths are under
`ArcGISExperienceBuilder/client/dist/widgets/layout/sidebar/` (gitignored build output; `src/`
here is the shipped TypeScript source, not the runtime `dist/` subfolder):

- `manifest.json`
- `config.json` (default serialized config)
- `src/config.ts` (config interfaces, enums, `defaultConfig`)
- `src/version-manager.ts`
- `src/runtime/widget.tsx`
- `src/runtime/builder-support.tsx`
- `src/layout/layout-base.tsx` (`BaseSidebarLayout` abstract class)
- `src/layout/runtime/layout.tsx` (`SidebarLayout` runtime subclass)
- `src/layout/runtime/layout-item.tsx` (`SidebarLayoutItem`)
- `src/layout/builder/layout.tsx` (`SidebarLayoutBuilder` builder subclass)
- `src/layout/toggle-button.tsx` (`SidebarController` + `findSyncedSidebar` usage)
- `src/layout/util.ts` (`findSyncedSidebar`, `collectWidgetsInSidebar`)
- `src/message-actions/toggle-sidebar.ts`
- `src/message-actions/open-sidebar.ts`
- `src/message-actions/open-sidebar-setting.tsx`
- `src/message-actions/types.ts`
- `src/tools/app-config-operations.ts`
- `src/setting/setting.tsx`

Not fully read (existence noted only): `src/setting/layout-setting.tsx`,
`src/setting/toggle-button-config.ts`, `src/layout/builder/layout-item.tsx`. Statements about
those files are marked UNVERIFIED below.

## Architecture overview
`widgetType` is `LAYOUT` (see manifest), so ExB treats this widget as a layout host. Unlike the
standard layout widgets, it declares **two FIXED layouts** named `FIRST` and `SECOND` in the
manifest, and renders them with a **custom layout component** rather than the OOTB layout engine.

The runtime `Widget` component picks the layout implementation at render time:
- Outside builder -> `SidebarLayout` (from `src/layout/runtime/layout.tsx`).
- Inside builder -> `builderSupportModules.widgetModules.SidebarLayoutBuilder` (registered via
  `hasBuilderSupportModule` + `src/runtime/builder-support.tsx`).

Both concrete classes extend the shared abstract `BaseSidebarLayout`
(`src/layout/layout-base.tsx`), which contains all rendering logic (panels, divider/split handle,
controller button, sizing math). The subclasses only implement `bindSplitHandler` (drag-to-resize
behavior), which differs between runtime and builder.

The two FIXED layouts are rendered by `SidebarLayoutItem`, which wraps `LayoutEntry` from
`jimu-layouts/layout-runtime`. `config.collapseSide` (`FIRST` or `SECOND`) determines which panel
is collapsible; the other is the "normal" panel that grows to fill remaining space.

## Key imports and packages
Grouped by concern, with the file each import appears in.

Core framework (`jimu-core`):
- `src/runtime/widget.tsx`: `React`, `AllWidgetProps`, `jsx`, `IMState`.
- `src/layout/layout-base.tsx`: `React`, `jsx`, `css`, `IMThemeVariables`, `classNames`,
  `IMSizeModeLayoutJson`, `polished`, `getAppStore`, `appActions`, `SerializedStyles`, `AppMode`.
- `src/layout/runtime/layout.tsx`: `moduleLoader`.
- `src/layout/builder/layout.tsx`: `Immutable`, `ReactRedux`, `IMState`, `AppMode`; plus
  `interact` from `jimu-core/dnd`.
- `src/message-actions/toggle-sidebar.ts`: `AbstractMessageAction`, `MessageType`, `getAppStore`,
  `appActions`, `Message`, `MessageDescription`.
- `src/message-actions/open-sidebar.ts`: `AbstractMessageAction`, `getAppStore`, `appActions`,
  `MessageType`, `AppMode`, `MessageDescription`, `Message`, `DataRecordsSelectionChangeMessage`.
- `src/tools/app-config-operations.ts`: `ImmutableObject`, `extensionSpec`, `IMAppConfig`,
  `DuplicateContext`, `dataSourceUtils`.
- `src/version-manager.ts`: `BaseVersionManager`.
- `src/config.ts`: `Immutable`, `ImmutableObject`.

Layout framework (`jimu-layouts/layout-runtime`):
- `src/layout/layout-base.tsx`: `utils`, `PageContext`, `PageContextProps`.
- `src/layout/runtime/layout.tsx`: `utils`.
- `src/layout/runtime/layout-item.tsx`: `LayoutEntry`.
- `src/layout/builder/layout.tsx`: `utils`.

UI + theme:
- `src/layout/layout-base.tsx`: `styleUtils`, `Loading` from `jimu-ui`.
- `src/config.ts`: `BorderStyle`, `NormalLineType` from `jimu-ui`.
- `src/layout/toggle-button.tsx`: `Icon`, `Button`, `BorderStyle`, `styleUtils` from `jimu-ui`;
  `ThemeSwitchComponent` from `jimu-theme`; many directional SVGs from `jimu-icons/...`.
- `src/message-actions/open-sidebar-setting.tsx`: `SettingSection`, `SettingRow`,
  `MessageActionDataSelector` from `jimu-ui/advanced/setting-components`; `Label`, `Radio` from
  `jimu-ui`; `withTheme` from `jimu-theme`.

Builder:
- `src/layout/builder/layout.tsx` and `src/layout/toggle-button.tsx`: `getAppConfigAction` /
  `jimu-for-builder`.
- `src/setting/setting.tsx`: `AllWidgetSettingProps` from `jimu-for-builder`.

Third-party (drag/resize):
- `src/layout/runtime/layout.tsx`: `InteractStatic` type from `@interactjs/core/InteractStatic`,
  loaded lazily via `moduleLoader.loadModule('jimu-core/dnd')`.

## Reusable patterns found
- **LAYOUT widget with a custom layout renderer.** `manifest.json` sets `"widgetType": "LAYOUT"`
  and declares two `FIXED` layouts (`FIRST`, `SECOND`). Instead of relying on the default engine,
  the widget renders its own `SidebarLayout` component and feeds each layout into a `LayoutEntry`.
  This is the template to follow when you need a bespoke multi-panel container.
- **Dual FIXED layouts.** `layouts.FIRST` and `layouts.SECOND` are passed straight from
  `AllWidgetProps.layouts` into the layout component as `firstLayouts` / `secondLayouts`.
- **Message actions to control the widget from other widgets.** Two actions are declared:
  `toggleSidebar` (`message-actions/toggle-sidebar`) and `openSidebar`
  (`message-actions/open-sidebar`, with `settingUri` `message-actions/open-sidebar-setting`). Both
  extend `AbstractMessageAction` and dispatch `appActions.widgetStatePropChange(widgetId,
  'collapse', ...)`. `openSidebar` additionally filters on `DataRecordsSelectionChange` and can be
  scoped to specific data sources via the setting component.
- **`version-manager.ts` config migration.** A single `1.8.0` upgrader fixes incorrect saved
  toggle-button colors/border via `newConfig.setIn(...)`. Wire it up with
  `static versionManager = versionManager` on the widget class.
- **`mapExtraStateProps` reading `widgetsState[...].collapse`.** The widget maps redux state into
  an `ExtraProps.sidebarVisible` boolean, falling back to a config-derived default. This is the
  canonical pattern for surfacing shared widget UI state into props.
- **`APP_CONFIG_OPERATIONS` extension for copy/paste integrity.** `tools/app-config-operations.ts`
  implements `afterWidgetCopied` to remap `openSidebar` action data sources when the widget is
  duplicated, using `dataSourceUtils.mapUseDataSource`.
- **Shared-code / synced-sidebar helper.** `util.findSyncedSidebar` locates the equivalent sidebar
  widget in other size modes so builder edits can stay in sync. See also
  `patterns/container-shared-code.md` for the general container shared-code pattern.

## Builder vs runtime split
- `src/runtime/widget.tsx` chooses between runtime and builder layout components based on
  `window.jimuConfig.isInBuilder`.
- `src/runtime/builder-support.tsx` exports `{ SidebarLayoutBuilder }`, made available as
  `builderSupportModules.widgetModules` because the manifest declares
  `"hasBuilderSupportModule": true`.
- `BaseSidebarLayout` (abstract) holds all shared rendering; concrete subclasses implement only
  `bindSplitHandler`:
  - Runtime (`SidebarLayout`) lazy-loads `interact` from `jimu-core/dnd` and resizes by updating
    local `deltaSize` state (transient, not persisted).
  - Builder (`SidebarLayoutBuilder`) is a `ReactRedux.connect`-ed component that also reads
    `appMode`. On drag end it **persists** the new size to config via
    `getAppConfigAction().editWidgetConfig(...).exec()`. In run mode with `!config.resizable` it
    disables resizing (`no-resize` class + `removeSplitHandler`).
- Settings entry is `src/setting/setting.tsx`, which delegates to `SidebarLayoutSetting`
  (`layout-setting.tsx`, UNVERIFIED contents) and passes `defaultConfig` when config is empty.

## Lifecycle and cleanup
From `BaseSidebarLayout` (`src/layout/layout-base.tsx`):
- `componentDidMount`: binds the split/resize handler once both layouts exist
  (`bindSplitHandler()`).
- `componentDidUpdate`: re-binds if the interactable is missing, and updates the drag axis
  (`startAxis`/`lockAxis`) when direction changes.
- `componentWillUnmount`: calls `removeSplitHandler()`, which calls `interactable.unset()` and
  nulls the reference. This is the key cleanup - the interact.js draggable must be torn down.
- The builder subclass overrides `componentDidUpdate` to add/remove the `no-resize` class and to
  call `removeSplitHandler` when resizing is disabled in run mode.
- Toggling uses `handleToggleSidebar`, which dispatches
  `appActions.widgetStatePropChange(widgetId, 'collapse', !sidebarVisible)` - state lives in the
  redux store, not component state.

## Manifest/config requirements
`manifest.json` essentials:
- `"widgetType": "LAYOUT"`.
- `"properties": { "flipIcon": true, "supportAutoSize": false, "hasBuilderSupportModule": true }`.
- `"messageActions"`: `toggleSidebar` and `openSidebar` (the latter with a `settingUri`).
- `"layouts"`: two entries, `FIRST` and `SECOND`, both `"type": "FIXED"`.
- `"extensions"`: one entry, `appConfigOperations` at point `APP_CONFIG_OPERATIONS`, uri
  `tools/app-config-operations`.
- `"defaultSize": { "width": 800, "height": 400 }`.

`config` (see `src/config.ts` `SidebarConfig` and `config.json`):
- `direction`: `HORIZONTAL` | `VERTICAL` (`SidebarType`).
- `collapseSide`: `FIRST` | `SECOND` (`CollapseSides`) - which panel collapses.
- `overlay`: boolean - overlay the collapsible panel over the normal one instead of pushing it.
- `size`: string, px or percentage (e.g. `"300px"`).
- `resizable`: boolean.
- `divider`: `{ visible, lineStyle }`.
- `toggleBtn`: `{ visible, icon, iconSource, offsetX, offsetY, position, color, border, iconSize,
  width, height, expandStyle, collapseStyle, ... }`.
- `defaultState`: number; `0` means collapsed by default (see `defaultState !== 0` checks).
- `firstPanelStyle` / `secondPanelStyle`: optional per-panel style.

## Gotchas
- `defaultState` uses `!== 0`: `defaultState` of `0` = sidebar collapsed by default, any other
  value = visible. This same expression appears in `widget.tsx` (`mapExtraStateProps`) and in
  `toggle-sidebar.ts`, so keep them consistent.
- Visibility state key is literally `'collapse'` under `state.widgetsState[widgetId]`, but the
  boolean actually represents "visible" (`sidebarVisible = ... .collapse ?? defaultCollapse`). The
  name is misleading - `collapse === true` means the sidebar is shown.
- Resize behavior diverges between runtime (transient `deltaSize`, never saved) and builder
  (persists `size` to config on drag end). Do not assume runtime resizes are saved.
- The runtime layout loads `interact` lazily through `moduleLoader.loadModule('jimu-core/dnd')`;
  the builder imports `interact` directly from `jimu-core/dnd`.
- RTL handling: horizontal resizing and controller placement flip based on
  `getAppStore().getState().appContext.isRTL` / `utils.isRTL()`. The code comments note the RTL
  logic still needs review (`// TODO need to update the logic`).
- Must clean up the interact draggable in `componentWillUnmount` (`interactable.unset()`), or the
  drag handler leaks.
- `openSidebar` action only opens (sets `collapse` to `true`); `toggleSidebar` flips it. Choose the
  right one when wiring cross-widget triggers.
- When copying the widget, the `APP_CONFIG_OPERATIONS` extension remaps `openSidebar` data sources.
  If you clone this pattern, remember data source ids in message action configs must be remapped in
  `afterWidgetCopied`.

## Useful snippets and functions

Widget picks runtime vs builder layout and maps shared collapse state.
Source: `src/runtime/widget.tsx`
```tsx
interface ExtraProps {
  sidebarVisible: boolean
}

export default class Widget extends React.PureComponent<AllWidgetProps<IMSidebarConfig> & ExtraProps> {
  static mapExtraStateProps = (state: IMState, props: AllWidgetProps<IMSidebarConfig>): ExtraProps => {
    const defaultCollapse = props.config.defaultState !== 0
    return {
      sidebarVisible: state?.widgetsState?.[props.id]?.collapse ?? defaultCollapse
    }
  }

  static versionManager = versionManager

  render (): React.JSX.Element {
    const { layouts, theme, builderSupportModules } = this.props
    const LayoutComponent = !window.jimuConfig.isInBuilder
      ? SidebarLayout
      : builderSupportModules.widgetModules.SidebarLayoutBuilder
    // ...
    return (
      <div className='widget-sidebar-layout d-flex w-100 h-100'>
        <LayoutComponent
          theme={theme}
          widgetId={this.props.id}
          direction={this.props.config.direction}
          firstLayouts={layouts.FIRST}
          secondLayouts={layouts.SECOND}
          config={this.props.config}
          sidebarVisible={this.props.sidebarVisible}
        />
      </div>
    )
  }
}
```

Toggle via redux widget state (shared by the layout and by message actions).
Source: `src/layout/layout-base.tsx`
```tsx
handleToggleSidebar (e): void {
  e.stopPropagation()
  getAppStore().dispatch(appActions.widgetStatePropChange(
    this.props.widgetId,
    'collapse',
    !this.props.sidebarVisible
  ))
}
```

Each FIXED layout is hosted through a `LayoutEntry`.
Source: `src/layout/runtime/layout-item.tsx`
```tsx
export class SidebarLayoutItem extends React.PureComponent<Props> {
  render (): React.JSX.Element {
    const { style, className, innerLayouts, itemStyle, collapsed } = this.props
    return (
      <div
        className={classNames('side', className, { 'd-flex': !collapsed, 'd-none': collapsed })}
        style={{ ...style, ...styleUtils.toCSSStyle(itemStyle), overflow: 'auto' }}
      >
        <LayoutEntry className='border-0' layouts={innerLayouts} isInWidget ignoreMinHeight />
      </div>
    )
  }
}
```

Toggle message action - flips the collapse state on the target widget.
Source: `src/message-actions/toggle-sidebar.ts`
```ts
export default class ToggleSidebarAction extends AbstractMessageAction {
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    return messageDescription.messageType === MessageType.ButtonClick
  }

  filterMessage (message: Message): boolean {
    return true
  }

  onExecute (message: Message): Promise<boolean> | boolean {
    const store = getAppStore()
    const widgetsState = store.getState().widgetsState
    const widgetJson = store.getState().appConfig.widgets[this.widgetId]
    const defaultCollapse = widgetJson.config.defaultState !== 0
    const collapse = widgetsState?.[this.widgetId]?.collapse ?? defaultCollapse
    getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'collapse', !collapse))
    return true
  }
}
```

Open message action - filters by message type / app mode and optionally by data source.
Source: `src/message-actions/open-sidebar.ts`
```ts
export default class OpenSidebarAction extends AbstractMessageAction {
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    const appMode = getAppStore().getState().appRuntimeInfo.appMode
    if (appMode === AppMode.Express) {
      return messageDescription.messageType === MessageType.ButtonClick ||
        messageDescription.messageType === MessageType.ViewChange
    } else {
      return messageDescription.messageType === MessageType.ButtonClick ||
        messageDescription.messageType === MessageType.ViewChange ||
        messageDescription.messageType === MessageType.DataRecordsSelectionChange
    }
  }

  onExecute (message: Message, actionConfig?: ActionConfig): Promise<boolean> | boolean {
    if (message.type === MessageType.DataRecordsSelectionChange) {
      const dsMsg = message as DataRecordsSelectionChangeMessage
      if (!dsMsg.records || dsMsg.records.length === 0) {
        return true
      }
      if (actionConfig?.useDataSources?.length > 0) {
        const dsId = dsMsg.records[0].dataSource.id
        const isMatchDataSource = actionConfig.useDataSources.some(useDataSource =>
          useDataSource.dataSourceId === dsId || useDataSource.mainDataSourceId === dsId
        )
        if (!isMatchDataSource) {
          return true
        }
      }
    }
    getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'collapse', true))
    return true
  }
}
```

Config migration (version 1.8.0) fixing saved toggle-button colors.
Source: `src/version-manager.ts`
```ts
class VersionManager extends BaseVersionManager {
  versions = [{
    version: '1.8.0',
    description: 'Online 10.1.',
    upgrader: (oldConfig) => {
      let newConfig = oldConfig
      newConfig = newConfig.setIn(['toggleBtn', 'color', 'normal', 'icon', 'color'], 'var(--ref-palette-neutral-1100)')
      newConfig = newConfig.setIn(['toggleBtn', 'color', 'normal', 'bg', 'color'], 'var(--ref-palette-neutral-200)')
      newConfig = newConfig.setIn(['toggleBtn', 'color', 'hover', 'bg', 'color'], 'var(--ref-palette-neutral-300)')
      newConfig = newConfig.setIn(['toggleBtn', 'border'], {
        type: 'solid', color: 'var(--ref-palette-neutral-500)', width: '1px'
      })
      return newConfig
    }
  }]
}
export const versionManager: BaseVersionManager = new VersionManager()
```

`APP_CONFIG_OPERATIONS` extension - remap action data sources after copy.
Source: `src/tools/app-config-operations.ts`
```ts
export default class AppConfigOperation implements extensionSpec.AppConfigOperationsExtension {
  id = 'sidebar-app-config-operation'
  widgetId: string

  afterWidgetCopied (sourceWidgetId, sourceAppConfig, destWidgetId, destAppConfig, contentMap?): IMAppConfig {
    let newMessageConfigs = destAppConfig.messageConfigs
    for (const [messageId, messageConfig] of Object.entries(newMessageConfigs || {})) {
      for (let i = 0; i < messageConfig.actions.length; i++) {
        const action = messageConfig.actions[i]
        if (action.actionName === 'openSidebar' && action.widgetId === destWidgetId) {
          const actionConfig = action.config as ImmutableObject<ActionConfig>
          if (actionConfig?.useDataSources) {
            const newUseDataSources = actionConfig.useDataSources.map(useDataSource =>
              dataSourceUtils.mapUseDataSource(contentMap, useDataSource).useDataSource)
            newMessageConfigs = newMessageConfigs.setIn([messageId, 'actions', i, 'config', 'useDataSources'], newUseDataSources)
          }
        }
      }
    }
    return destAppConfig.set('messageConfigs', newMessageConfigs)
  }
}
```

Builder subclass persists resize to config on drag end (contrast with transient runtime resize).
Source: `src/layout/builder/layout.tsx`
```tsx
onend: (event: Interact.DragEvent) => {
  event.stopPropagation()
  const { config } = this.props
  const delta = this.state.deltaSize
  let size
  if (utils.isPercentage(config.size)) {
    size = `${((((parseFloat(config.size) * this.domSize) / 100 + delta) * 100) / this.domSize).toFixed(4)}%`
  } else {
    size = `${(parseFloat(config.size) + delta).toFixed(0)}px`
  }
  const appConfigAction = getAppConfigAction()
  appConfigAction.editWidgetConfig(this.props.widgetId, Immutable(config).set('size', size)).exec()
  this.setState({ deltaSize: 0, isResizing: false })
}
```

Finding the equivalent sidebar in another size mode (shared-code helper).
Source: `src/layout/util.ts`
```ts
// find the sidebar that has same content and used in other size mode
export function findSyncedSidebar (appConfig: IMAppConfig, widgetId: string): string[] {
  const mainSizeMode = appConfig.mainSizeMode
  const result = []
  const widgetsInSidebar = collectWidgetsInSidebar(appConfig, widgetId)
  const otherSideBar: { [key: string]: string[] } = {}
  // ... collect sidebars in other size modes, then match by shared content ...
  return result
}
```
