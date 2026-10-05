# OTB Widget: layout/column

Online widget doc: https://developers.arcgis.com/experience-builder/guide/column-widget/

## Purpose
The Column widget is a LAYOUT-type container that arranges child widgets in a single
vertical stack. It hosts a jimu COLUMN layout, renders a `WidgetPlaceholder` when empty,
and exposes a builder-only "Add widget" context tool plus a Setting panel that controls
vertical alignment, gap (space between items), and padding. It is the developer-guide
reference implementation of a layout container.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/default-config.ts
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/runtime/builder-support.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/tools/add-widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/tools/add-widget-component.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/tools/utils.ts

Note: the folder is under a gitignored `dist/` tree; it was read with includeIgnoredFiles.
The nested `dist/` (compiled `.js`) and `translations/*.js` files were ignored per task
scope; only `src/**` TypeScript/TSX and `manifest.json` were inspected.

## Architecture overview
- `widgetType: "LAYOUT"` with a single declared layout named `DEFAULT` of `type: "COLUMN"`
  (see manifest `layouts`). The widget itself does not lay out children by hand; it delegates
  to a jimu layout component.
- Runtime selects between two layout components:
  - `ColumnLayoutViewer` (from `jimu-layouts/layout-runtime`) when NOT in the builder.
  - `builderSupportModules.widgetModules.ColumnLayoutBuilder` when in the builder.
- The builder-support module (`builder-support.tsx`) re-exports `ColumnLayoutBuilder`; the
  manifest opts in with `"properties": { "hasBuilderSupportModule": true }`.
- A CONTEXT_TOOL extension (`add-widget`) provides the builder toolbar button to insert
  widgets into the column.
- The Setting panel edits both the widget `config` and the underlying layout `setting`
  (justifyContent, space, padding) so runtime and builder stay in sync.

## Key imports and packages
Grouped by source file.

runtime/widget.tsx:
- `React, AllWidgetProps, jsx, css, SerializedStyles` from `jimu-core`
- `WidgetPlaceholder` from `jimu-ui`
- `ColumnLayoutViewer` from `jimu-layouts/layout-runtime`
- `IMFlexboxConfig` (type) from `../config`
- `defaultMessages` from `./translations/default`
- `../../icon.svg` via `require` (placeholder icon)

runtime/builder-support.tsx:
- `ColumnLayoutBuilder` from `jimu-layouts/layout-builder`

config.ts:
- `ImmutableObject` (type) from `jimu-core`

default-config.ts:
- `Immutable` from `jimu-core`
- `IMFlexboxConfig` (type) from `./config`

setting/setting.tsx:
- `React, jsx` from `jimu-core`
- `AllWidgetSettingProps, getAppConfigAction` from `jimu-for-builder`
- `SettingSection, SettingRow` from `jimu-ui/advanced/setting-components`
- `LinearUnit (type), Select, defaultMessages as jimuUIDefaultMessages` from `jimu-ui`
- `ColumnLayoutSetting (type), utils` from `jimu-layouts/layout-runtime`
- `Padding, InputUnit` from `jimu-ui/advanced/style-setting-components`
- `IMFlexboxConfig` (type) from `../config`
- `defaultConfig` from `../default-config`
- `defaultMessages` from `./translations/default`

tools/add-widget.tsx:
- `extensionSpec, getAppStore, LayoutContextToolProps, i18n, BrowserSizeMode, LayoutItemConstructorProps` from `jimu-core`
- `defaultMessages` from `jimu-ui`
- `PlusOutlined` from `jimu-icons/svg/outlined/editor/plus.svg`
- `PlusFilled` from `jimu-icons/svg/filled/editor/plus.svg`
- `AddWidgetComponent` from `./add-widget-component`
- `appBuilderSync` from `jimu-for-builder`
- `isLayoutItemAccepted, addItemToColumn, widgetToolbarStateChange` from `./utils`

tools/add-widget-component.tsx:
- `React, css, jsx, LayoutItemConstructorProps` from `jimu-core`
- `WidgetList` from `jimu-ui/advanced/setting-components`
- `ToolSettingPanelProps` (type) from `jimu-layouts/layout-runtime`
- `isLayoutItemAccepted, addItemToColumn` from `./utils`

tools/utils.ts:
- `LayoutItemType, LayoutItemConstructorProps, getAppStore, appActions, WidgetType, AppMode, IMState` from `jimu-core`
- `addItemToLayout` from `jimu-layouts/layout-builder`
- `builderAppSync, getAppConfigAction` from `jimu-for-builder`
- `LayoutItemSizeModes` from `jimu-layouts/layout-runtime`

## Reusable patterns found
- LAYOUT widget with a single COLUMN layout: the manifest declares `widgetType: "LAYOUT"`
  and a `layouts` entry `{ name: "DEFAULT", type: "COLUMN" }`. The widget reads
  `this.props.layouts` and passes the first layout to the layout component.
- Viewer/Builder swap via `window.jimuConfig.isInBuilder`: pick `ColumnLayoutViewer`
  (runtime) vs `ColumnLayoutBuilder` (builder from `builderSupportModules`). This is the
  core container-shared-code pattern; see
  ../patterns/container-shared-code.md.
- `builder-support.tsx` + `hasBuilderSupportModule: true`: exposes the builder-only layout
  component to the runtime bundle through `props.builderSupportModules.widgetModules`.
- default-config.ts as an `Immutable(...)` seed for `IMFlexboxConfig`.
- CONTEXT_TOOL extension (`add-widget`) registered in the manifest `extensions` at point
  `CONTEXT_TOOL` with `uri: tools/add-widget`, implementing
  `extensionSpec.ContextToolExtension` (getIcon/getTitle/visible/checked/onClick/getSettingPanel).
- Responsive add-widget behavior: on `BrowserSizeMode.Small` the tool opens a side panel via
  `appBuilderSync.publishSidePanelToApp`; otherwise it returns an inline `AddWidgetComponent`
  panel that renders a `WidgetList`.
- Dual write on settings change: edit the widget `config.*` AND each layout's `setting.*`
  through `getAppConfigAction()` so viewer and builder render identically.

## Builder vs runtime split
- Runtime (`runtime/widget.tsx`): renders `ColumnLayoutViewer` and the empty-state
  `WidgetPlaceholder`. No builder-only imports are pulled into the runtime path.
- Builder support (`runtime/builder-support.tsx`): supplies `ColumnLayoutBuilder`, loaded
  only in the builder and reached via `props.builderSupportModules.widgetModules`.
- Settings (`setting/setting.tsx`): builder-only; imports `jimu-for-builder`
  (`getAppConfigAction`) and setting-components. Mutates layout + widget config.
- Tools (`tools/*`): builder-only context tool. `add-widget.tsx` is the extension class;
  `add-widget-component.tsx` is the inline panel; `utils.ts` holds shared insert logic
  (`addItemToLayout` from `jimu-layouts/layout-builder`).
- The insert utils branch on `window.jimuConfig.isBuilder` to read app state either from
  `getAppStore().getState().appStateInBuilder` or the plain runtime store state.

## Lifecycle and cleanup
- `Widget` is a `React.PureComponent` (`runtime/widget.tsx`); no `componentDidMount`,
  timers, subscriptions, or teardown. All layout/rendering is delegated to the jimu layout
  component, so there is nothing to dispose.
- `Setting` and `AddWidget` also hold no long-lived resources. The only stateful bit is the
  `AddWidget.isOpenInSidePanel` boolean, toggled in `onClick`; its side panel provides an
  `onClose` callback that resets the flag and calls `widgetToolbarStateChange`.
- Config edits are committed synchronously via `appConfigAction.exec()`; there is no async
  cleanup to manage other than the `await addItemToLayout(...)` in `addItemToColumn`.

## Manifest/config requirements
From manifest.json:
- `type: "widget"`, `widgetType: "LAYOUT"`.
- `properties.hasBuilderSupportModule: true` (required for the viewer/builder swap).
- `layouts: [{ name: "DEFAULT", label: "Default", type: "COLUMN" }]`.
- `extensions: [{ name: "add-widget", point: "CONTEXT_TOOL", uri: "tools/add-widget" }]`.
- `defaultSize: { width: 300, height: 600 }`.

Config shape (config.ts, `FlexboxConfig` / `IMFlexboxConfig`):
- `min: number`
- `space: number`
- `style: { padding?: { number: number[]; unit: string }, justifyContent?: string, alignItems?: string, overflowY?: boolean }`

Default (default-config.ts): `space: 10`, `min: 16`,
`style.padding: { number: [0], unit: 'px' }`, `justifyContent: 'center'`,
`alignItems: 'stretch'`.

## Gotchas
- Config type is named `FlexboxConfig`/`IMFlexboxConfig` (shared flexbox shape), not a
  "column"-specific type; the row widget reuses the same config shape.
- Settings must write BOTH `config.*` (via `editWidgetProperty`) and every layout id's
  `setting.*` (via `editLayoutProperty`). Writing only one leaves builder and viewer out of
  sync. `getLayoutIds()` iterates all size-mode layout ids under the single layout name.
- `getLayoutSetting()` reads the CURRENT size mode via `utils.getCurrentSizeMode()`, so the
  Setting panel reflects the active breakpoint only.
- Runtime guards against a missing layout component and renders a plain "No layout
  component!" div; if `hasBuilderSupportModule` were false, `ColumnLayoutBuilder` would be
  undefined in the builder.
- `isLayoutItemAccepted` rejects Section items and nested LAYOUT widgets in Express mode
  (`AppMode.Express`), so Add-widget filtering is mode-dependent.
- Small-screen (`BrowserSizeMode.Small`) add-widget uses a side panel, not the inline
  `getSettingPanel` (which returns null in that mode) - do not assume the inline panel is
  always used.
- The `/** @jsx jsx */` pragma plus `jsx`/`css` from `jimu-core` (emotion) is required at
  the top of files that use the `css` prop.

## Useful snippets and functions

Source: ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/runtime/widget.tsx
```tsx
render (): React.JSX.Element {
  const { layouts, id, intl, builderSupportModules } = this.props
  const LayoutComponent = !window.jimuConfig.isInBuilder
    ? ColumnLayoutViewer
    : builderSupportModules.widgetModules.ColumnLayoutBuilder

  if (LayoutComponent == null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        No layout component!
      </div>
    )
  }
  const layoutName = Object.keys(layouts)[0]

  return (
    <div className='widget-column-layout w-100 h-100' css={this.getStyle()} style={{ overflow: 'auto' }}>
      <LayoutComponent layouts={layouts[layoutName]}>
        <WidgetPlaceholder
          icon={IconImage} widgetId={id}
          style={{ border: 'none', height: '100%', pointerEvents: 'none', position: 'absolute' }}
          name={intl.formatMessage({ id: 'tips', defaultMessage: defaultMessages.tips })}
        />
      </LayoutComponent>
    </div>
  )
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/runtime/builder-support.tsx
```tsx
import { ColumnLayoutBuilder } from 'jimu-layouts/layout-builder'
export default { ColumnLayoutBuilder } as { ColumnLayoutBuilder: typeof ColumnLayoutBuilder }
```

Source: ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/default-config.ts
```ts
export const defaultConfig: IMFlexboxConfig = Immutable({
  space: 10,
  min: 16,
  style: {
    padding: { number: [0], unit: 'px' },
    justifyContent: 'center',
    alignItems: 'stretch'
  }
})
```

Source: ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/setting/setting.tsx
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

Source: ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/tools/add-widget.tsx
```tsx
export default class AddWidget implements extensionSpec.ContextToolExtension {
  index = 4
  id = 'column-add-widget'
  name = 'column-add-widget'
  widgetId: string
  isOpenInSidePanel: boolean

  getGroupId () { return 'column-tools' }

  getIcon () {
    return window.jimuConfig.isBuilder ? PlusFilled : PlusOutlined
  }

  getSettingPanel (props: LayoutContextToolProps) {
    const state = this.getAppState()
    if (state.browserSizeMode === BrowserSizeMode.Small) {
      return null
    }
    return AddWidgetComponent
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/tools/utils.ts
```ts
export const addItemToColumn = async (widgetId: string, item: LayoutItemConstructorProps) => {
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
  // ... apply item.manifest.defaultSize to bbox/setting ...
  appConfigAction.adjustOrderOfItem(layoutInfo, null, true).exec()
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/layout/column/src/tools/add-widget-component.tsx
```tsx
export const AddWidgetComponent = (props: ToolSettingPanelProps) => {
  const { widgetId } = props
  const handleItemSelect = React.useCallback((item: LayoutItemConstructorProps) => {
    addItemToColumn(widgetId, item)
  }, [widgetId])

  return <div css={styles}>
    <WidgetList isAccepted={isLayoutItemAccepted} onSelect={handleItemSelect} />
  </div>
}
```

UNVERIFIED: exact prop typings of `ColumnLayoutViewer` / `ColumnLayoutBuilder`, the full
`ColumnLayoutSetting` shape, and `WidgetList` props are defined in
`jimu-layouts/layout-runtime`, `jimu-layouts/layout-builder`, and
`jimu-ui/advanced/setting-components` respectively; those framework declarations were not
opened for this note.
