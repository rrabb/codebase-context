# OTB Widget: layout/flowrow

Online widget doc: https://developers.arcgis.com/experience-builder/guide/flow-row-widget/

## Purpose
The Flow Row widget is a LAYOUT-type container widget that arranges its child widgets in a
horizontal flex row. It is the developer-guide reference implementation for a custom layout
widget (manifest description: "This is the widget used in developer guide"). It hosts a
`FLEX_ROW` layout, exposes horizontal alignment / gap / padding settings, and provides
in-canvas context tools to add and manage the widgets it contains.

## Source paths inspected
Source root (gitignored build output; read with includeIgnoredFiles):
`ArcGISExperienceBuilder/client/dist/widgets/layout/flowrow/`

- `manifest.json`
- `config.json` (deployed default config values; note: no `config.ts`/`default-config.ts` at
  widget root, those live under `src/`)
- `src/config.ts`
- `src/default-config.ts`
- `src/runtime/widget.tsx`
- `src/runtime/builder-support.tsx`
- `src/setting/setting.tsx`
- `src/tools/add-widget.tsx`
- `src/tools/manage-widgets.ts`
- `src/tools/utils.ts`

UNVERIFIED: `src/tools/add-widget-component.tsx`, `src/tools/manage-widgets-component.tsx`,
translations, and `assets/` were not read in this pass. Contents referencing them are noted
inline.

## Architecture overview
- The widget renders a single flex-row layout container. It picks the layout component at
  render time based on whether it is running in Builder or the app viewer:
  - Viewer: `FlexRowLayoutViewer` from `jimu-layouts/layout-runtime`.
  - Builder: `FlexRowLayoutBuilder` from `jimu-layouts/layout-builder`, provided lazily via the
    `builderSupportModules` prop (see `builder-support.tsx`).
- Because it is a LAYOUT widget, child widgets are stored in an ExB layout (declared `DEFAULT`
  / `FLEX_ROW` in the manifest), not in the widget config. The widget config only carries
  presentation values (space, padding, alignment).
- Two `CONTEXT_TOOL` extensions (`add-widget`, `manage-widgets`) attach to the widget's
  in-canvas toolbar in Builder to add child widgets and manage existing ones.
- Settings edits are written to both the widget config AND the underlying layout `setting` so
  the layout renderer picks them up.

## Key imports and packages
Grouped by file with the exact import source.

Runtime (`src/runtime/widget.tsx`):
- `React, AllWidgetProps, jsx, css, SerializedStyles` from `jimu-core`
- `WidgetPlaceholder` from `jimu-ui`
- `FlexRowLayoutViewer` from `jimu-layouts/layout-runtime`
- `IMFlexRowConfig` from `../config`
- `defaultMessages` from `./translations/default`
- `IconImage = require('../../icon.svg')`

Builder support (`src/runtime/builder-support.tsx`):
- `FlexRowLayoutBuilder` from `jimu-layouts/layout-builder`
- Default export is the `builderSupportModules.widgetModules` object: `{ FlexRowLayoutBuilder }`

Config (`src/config.ts`, `src/default-config.ts`):
- `ImmutableObject` from `jimu-core`
- `Immutable` from `jimu-core`

Setting (`src/setting/setting.tsx`):
- `React, jsx` from `jimu-core`
- `AllWidgetSettingProps, getAppConfigAction` from `jimu-for-builder`
- `SettingSection, SettingRow` from `jimu-ui/advanced/setting-components`
- `LinearUnit, Select, defaultMessages as jimuUIDefaultMessages` from `jimu-ui`
- `ColumnLayoutSetting, utils` from `jimu-layouts/layout-runtime`
- `Padding, InputUnit` from `jimu-ui/advanced/style-setting-components`
- `IMFlexRowConfig` from `../config`, `defaultConfig` from `../default-config`

Add-widget tool (`src/tools/add-widget.tsx`):
- `extensionSpec, getAppStore, LayoutContextToolProps, i18n, BrowserSizeMode,
  LayoutItemConstructorProps, AppMode` from `jimu-core`
- `defaultMessages` from `jimu-ui`
- `PlusOutlined` from `jimu-icons/svg/outlined/editor/plus.svg`, `PlusFilled` from
  `jimu-icons/svg/filled/editor/plus.svg`
- `AddWidgetComponent` from `./add-widget-component`
- `appBuilderSync` from `jimu-for-builder`
- `isLayoutItemAccepted, addItemToFlowRow, widgetToolbarStateChange` from `./utils`

Manage-widgets tool (`src/tools/manage-widgets.ts`):
- `extensionSpec, getAppStore, LayoutContextToolProps, i18n, BrowserSizeMode, AppMode` from
  `jimu-core`
- `defaultMessages` from `jimu-ui`
- `WidgetControllerOutlined` from `jimu-icons/svg/outlined/brand/widget-controller.svg`,
  `WidgetControllerFilled` from `jimu-icons/svg/filled/data/widget.svg`
- `ManageWidgetsComponent` from `./manage-widgets-component`
- `appBuilderSync` from `jimu-for-builder`
- `widgetToolbarStateChange` from `./utils`

Tools utils (`src/tools/utils.ts`):
- `LayoutItemType, LayoutItemConstructorProps, LayoutInfo, getAppStore, appActions,
  WidgetType, AppMode, IMState` from `jimu-core`
- `addItemToLayout` from `jimu-layouts/layout-builder`
- `builderAppSync, getAppConfigAction` from `jimu-for-builder`

## Reusable patterns found
- widgetType LAYOUT + FLEX_ROW layout: `manifest.json` sets `"widgetType": "LAYOUT"` and
  declares a single `layouts` entry `{ name: "DEFAULT", type: "FLEX_ROW" }`. This is the
  canonical shape for a horizontal-flow container widget.
- Builder/Viewer layout swap: choose `FlexRowLayoutViewer` (layout-runtime) vs
  `FlexRowLayoutBuilder` (layout-builder) at render time using
  `window.jimuConfig.isInBuilder`, and load the builder module lazily through
  `builderSupportModules.widgetModules` (manifest `properties.hasBuilderSupportModule: true`).
- Flex CSS driven by config: the container uses `display: flex` and passes layout
  `setting` (justifyContent, space/gap, padding) into the layout component; setting edits are
  mirrored onto every size-mode layout id.
- CONTEXT_TOOL extensions: `manage-widgets` and `add-widget` are registered in the manifest
  under `extensions` with `point: "CONTEXT_TOOL"` and appear on the widget toolbar in Builder.
- default-config.ts pattern: an `Immutable(...)` default that seeds config; note the deployed
  `config.json` values can differ from `default-config.ts` (see Gotchas).
- Cross-ref: see `patterns/container-shared-code.md` for the shared container/layout conventions
  (LAYOUT widgetType, builder-support module swap, CONTEXT_TOOL add/manage tools, layout-vs-config
  storage) that this widget exemplifies.

## Builder vs runtime split
- Runtime (`widget.tsx`): pure presentational container. Renders `FlexRowLayoutViewer` in the
  viewer, or the builder layout component in Builder, wrapping a `WidgetPlaceholder` shown when
  the container is empty.
- Builder support (`builder-support.tsx`): the only job is to expose `FlexRowLayoutBuilder` so
  the runtime can access it via `builderSupportModules.widgetModules.FlexRowLayoutBuilder`
  without bundling builder code into the viewer.
- Setting (`setting.tsx`): a Builder-only panel that writes both `config.*` (via
  `editWidgetProperty`) and layout `setting.*` (via `editLayoutProperty`) for each size-mode
  layout id, then calls `appConfigAction.exec()`.
- Tools (`add-widget`, `manage-widgets`): Builder-only context tools. They branch on
  `BrowserSizeMode.Small` to either open a side panel (`appBuilderSync.publishSidePanelToApp`)
  or return a popup setting component (`getSettingPanel`).

## Lifecycle and cleanup
- Runtime widget is a `React.PureComponent` with only `getStyle()` and `render()`. No
  `componentDidMount`/`componentWillUnmount`, no timers, subscriptions, or JSAPI resources, so
  there is nothing to tear down. Layout lifecycle is owned by the jimu layout components.
- Setting is also a `PureComponent` with no lifecycle hooks; all mutations flow through
  `getAppConfigAction()...exec()`.
- Tools keep transient UI state (`isOpenInSidePanel`) on the extension instance and clear it in
  the side panel `onClose` callback, then call `widgetToolbarStateChange(...)` to sync the
  toolbar toggle state.

## Manifest/config requirements
From `manifest.json`:
- `"type": "widget"`, `"widgetType": "LAYOUT"`.
- `"properties": { "hasBuilderSupportModule": true }` (required for the builder layout swap).
- `"layouts": [{ "name": "DEFAULT", "label": "Default", "type": "FLEX_ROW" }]`.
- `"defaultSize": { "width": 600, "height": 300 }`.
- `"extensions"`: two `CONTEXT_TOOL` entries:
  - `{ name: "manage-widgets", point: "CONTEXT_TOOL", uri: "tools/manage-widgets" }`
  - `{ name: "add-widget", point: "CONTEXT_TOOL", uri: "tools/add-widget" }`
- Config shape (`src/config.ts` `FlexRowConfig`): `min: number`, `space: number`,
  `style: { padding?, justifyContent?, alignItems?, overflowY? }`.
- Note the `padding` shape differs between files: `config.ts` types it as `{ number: number[]; unit: string }`,
  `default-config.ts` uses `padding: { number: [0], unit: 'px' }`, but deployed `config.json`
  uses `padding: { space: [10], unit: 'px' }`. UNVERIFIED which is authoritative at runtime;
  confirm against the `Padding` style component before relying on a field name.

## Gotchas
- Deployed `config.json` and `default-config.ts` disagree: `config.json` has
  `space: 10, justifyContent: 'flex-start'` and `padding.space: [10]`; `default-config.ts` has
  `space: 10, min: 16, justifyContent: 'center'` and `padding.number: [0]`. Do not assume the
  TS default is what ships.
- Settings must be written twice: once to widget `config.*` and once to each layout
  `setting.*` (see `getLayoutIds()` iterating all size modes). Editing only the config will not
  update the rendered layout.
- The layout is read from `layouts[layoutName]` where `layoutName = Object.keys(layouts)[0]`;
  the code assumes exactly one layout entry (the manifest `DEFAULT`).
- Builder layout component can be null (`FlexRowLayoutBuilder` not yet loaded); `widget.tsx`
  guards this and renders a "No layout component!" fallback. Preserve that guard.
- Context tools read app state through the `appStateInBuilder` fallback pattern
  (`state.appStateInBuilder ? state.appStateInBuilder : state`); using the raw store state in
  Builder can read the wrong tree.
- `addItemToFlowRow` hard-codes `widgetJson.layouts.DEFAULT[appState.browserSizeMode]`; it is
  tied to the `DEFAULT` layout name from the manifest.
- Express mode restriction: `isLayoutItemAccepted` rejects Sections and LAYOUT widgets when the
  app is in Express mode.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - Builder/viewer layout swap + empty placeholder.
```tsx
render () {
  const { layouts, id, intl, builderSupportModules } = this.props
  const LayoutComponent = !window.jimuConfig.isInBuilder
    ? FlexRowLayoutViewer
    : builderSupportModules.widgetModules.FlexRowLayoutBuilder

  if (LayoutComponent == null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        No layout component!
      </div>
    )
  }
  const layoutName = Object.keys(layouts)[0]

  return (
    <div className='widget-flex-row-layout w-100 h-100' css={this.getStyle()} style={{ overflow: 'auto' }}>
      <LayoutComponent layouts={layouts[layoutName]}>
        <WidgetPlaceholder
          icon={IconImage} widgetId={id}
          style={{ border: 'none', height: '100%', pointerEvents: 'none', position: 'absolute' }}
          name={intl.formatMessage({ id: '_widgetLabel', defaultMessage: defaultMessages._widgetLabel })}
        />
      </LayoutComponent>
    </div>
  )
}
```

Source: `src/runtime/widget.tsx` - flex CSS for the container.
```tsx
getStyle (): SerializedStyles {
  return css`
    & > div.flex-row-layout {
      height: 100%;
      overflow: hidden;
      display: flex;

      & > .trail-container {
        height: 100%;
        overflow: hidden;
      }
    }
  `
}
```

Source: `src/runtime/builder-support.tsx` - lazily exposed builder layout module.
```tsx
import { FlexRowLayoutBuilder } from 'jimu-layouts/layout-builder'
export default { FlexRowLayoutBuilder } as { FlexRowLayoutBuilder: typeof FlexRowLayoutBuilder }
```

Source: `src/default-config.ts` - Immutable default config.
```ts
export const defaultConfig: IMFlexRowConfig = Immutable({
  space: 10,
  min: 16,
  style: {
    padding: { number: [0], unit: 'px' },
    justifyContent: 'center',
    alignItems: 'stretch'
  }
})
```

Source: `src/setting/setting.tsx` - write config AND layout setting for every size mode.
```tsx
handleSpaceChange = (value: LinearUnit): void => {
  const appConfigAction = getAppConfigAction()
  appConfigAction.editWidgetProperty(this.props.id, 'config.space', value)
  this.getLayoutIds().forEach(layoutId => {
    appConfigAction.editLayoutProperty(layoutId, 'setting.space', value.distance)
  })
  appConfigAction.exec()
}

getLayoutIds (): string[] {
  const result = []
  const { layouts } = this.props
  if (layouts != null) {
    const layoutName = Object.keys(layouts)[0]
    const sizemodeLayouts = layouts[layoutName]
    Object.keys(sizemodeLayouts).forEach(sizemode => {
      result.push(sizemodeLayouts[sizemode])
    })
  }
  return result
}
```

Source: `src/tools/utils.ts` - accept rule and add-child-to-layout helper.
```ts
export const isLayoutItemAccepted = (item: LayoutItemConstructorProps): boolean => {
  const state = getAppStore().getState()
  const appState = state.appStateInBuilder ? state.appStateInBuilder : state
  const itemType = item?.itemType
  const widgetType = item?.manifest?.widgetType
  const isExpressMode = appState.appRuntimeInfo.appMode === AppMode.Express
  if (isExpressMode && (itemType === LayoutItemType.Section || widgetType === WidgetType.Layout)) {
    return false
  }
  return true
}

export const addItemToFlowRow = async (widgetId: string, item: LayoutItemConstructorProps) => {
  let appState: IMState
  if (window.jimuConfig.isBuilder) {
    appState = getAppStore().getState().appStateInBuilder
  } else {
    appState = getAppStore().getState()
  }
  const appConfig = appState.appConfig
  const widgetJson = appConfig.widgets[widgetId]
  const layoutId = widgetJson.layouts.DEFAULT[appState.browserSizeMode]
  const { layoutInfo, updatedAppConfig } = await addItemToLayout(appConfig, item, layoutId)
  const appConfigAction = getAppConfigAction(updatedAppConfig)
  if (item.manifest?.defaultSize) {
    const { width, height } = item.manifest.defaultSize
    appConfigAction.editLayoutItemProperty(layoutInfo, 'bbox', { width: `${width}px`, height: `${height}px` }, true)
  }
  appConfigAction.adjustOrderOfItem(layoutInfo, null, true).exec()
}
```

Source: `src/tools/add-widget.tsx` - CONTEXT_TOOL extension wiring (small-size side panel vs popup).
```tsx
onClick (props: LayoutContextToolProps) {
  const { widgetId } = props.layoutItem
  const state = this.getAppState()
  const browserSizeMode = state.browserSizeMode
  if (browserSizeMode === BrowserSizeMode.Small) {
    this.isOpenInSidePanel = !this.isOpenInSidePanel
    const onClose = () => {
      this.isOpenInSidePanel = false
      widgetToolbarStateChange(widgetId, ['flowrow-add-widget'])
    }
    appBuilderSync.publishSidePanelToApp({
      type: 'widget',
      uri: 'widgets/layout/flowrow/',
      widgetId,
      keepPanel: true,
      active: this.isOpenInSidePanel,
      isItemAccepted: isLayoutItemAccepted,
      onSelect: (item: LayoutItemConstructorProps) => { addItemToFlowRow(widgetId, item) },
      onClose
    })
  }
}

getSettingPanel (props: LayoutContextToolProps) {
  const state = this.getAppState()
  if (state.browserSizeMode === BrowserSizeMode.Small) {
    return null
  }
  return AddWidgetComponent
}
```
