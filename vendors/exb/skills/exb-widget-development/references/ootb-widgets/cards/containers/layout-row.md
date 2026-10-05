# OTB Widget: layout/row

Online widget doc: https://developers.arcgis.com/experience-builder/guide/row-widget/

## Purpose
The Row widget is a LAYOUT-type container that arranges its child widgets in a
single horizontal row. It is one of the built-in ExB layout primitives (Row,
Column, Grid-style containers) and is described in the developer guide as "the
widget used in developer guide" (see manifest description). It renders an empty
placeholder when no children are present and delegates all real drag/drop and
sizing behavior to shared `jimu-layouts` runtime/builder components.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/layout/row/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/layout/row/config.json
- ArcGISExperienceBuilder/client/dist/widgets/layout/row/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/row/src/runtime/builder-support.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/row/src/setting/setting.tsx

Note: this dist source ships as `.tsx` (not compiled `.js`) and there is no
`config.ts`; the config default lives in `config.json`. UNVERIFIED whether a
matching authored `config.ts` exists upstream; only `config.json` is present in
the inspected dist tree.

## Architecture overview
- `widgetType: "LAYOUT"` (manifest.json) marks this as a layout container, not a
  content widget. Layout widgets host a nested ExB layout that other widgets get
  dropped into.
- The manifest declares a single layout slot:
  `layouts: [{ name: "DEFAULT", label: "Default", type: "ROW" }]`.
- Viewer vs Builder split is decided at render time inside
  src/runtime/widget.tsx using `window.jimuConfig.isInBuilder`:
  - Viewer (runtime app): `RowLayoutViewer` from `jimu-layouts/layout-runtime`.
  - Builder (authoring): `builderSupportModules.widgetModules.RowLayoutBuilder`,
    which is provided lazily via the builder-support module.
- `properties.hasBuilderSupportModule: true` (manifest.json) tells ExB to load
  src/runtime/builder-support.tsx and expose its exports on
  `props.builderSupportModules.widgetModules`.

## Key imports and packages
Grouped by file.

src/runtime/widget.tsx
- `React`, `AllWidgetProps`, `jsx`, `css` -- from `jimu-core`
- `WidgetPlaceholder` -- from `jimu-ui`
- `RowLayoutViewer` -- from `jimu-layouts/layout-runtime`
- `defaultMessages` -- from `./translations/default`
- `IconImage` -- `require('../../icon.svg')`

src/runtime/builder-support.tsx
- `RowLayoutBuilder` -- from `jimu-layouts/layout-builder`
- default export object `{ RowLayoutBuilder }` (this is the
  `builderSupportModules.widgetModules` surface referenced from widget.tsx)

src/setting/setting.tsx
- `React`, `ReactRedux`, `IMState`, `jsx`, `Immutable`, `ImmutableObject`,
  `APP_FRAME_NAME_IN_BUILDER` -- from `jimu-core`
- `AllWidgetSettingProps`, `getAppConfigAction` -- from `jimu-for-builder`
- `SettingSection`, `SettingRow` -- from `jimu-ui/advanced/setting-components`
- `RowLayoutSetting`, `utils as layoutUtils` -- from `jimu-layouts/layout-runtime`
- `DEFAULT_ROW_LAYOUT_SETTING` -- from `jimu-layouts/layout-builder`
- `LinearUnit`, `utils`, `DistanceUnits`, `styleUtils` -- from `jimu-ui`
- `Padding`, `InputUnit` -- from `jimu-ui/advanced/style-setting-components`

## Reusable patterns found
- `widgetType: LAYOUT` container skeleton: a thin widget that renders a shared
  layout component and a `WidgetPlaceholder` child, delegating behavior to
  `jimu-layouts`.
- Viewer vs Builder component swap in one place:
  ```tsx
  const LayoutComponent = !window.jimuConfig.isInBuilder
    ? RowLayoutViewer
    : builderSupportModules.widgetModules.RowLayoutBuilder
  ```
- `hasBuilderSupportModule` + builder-support.tsx pattern: builder-only code is
  isolated so the viewer bundle does not pull in `jimu-layouts/layout-builder`.
- `builderSupportModules.widgetModules.<Export>` access mirrors the default
  export shape of builder-support.tsx (`export default { RowLayoutBuilder }`).
- `WidgetPlaceholder` with `pointerEvents: 'none'` gives an empty-state hint that
  does not intercept drop events.
- Null-guard for the resolved layout component (renders a "No layout component!"
  fallback div) before use.
- Layout settings write through `getAppConfigAction().editLayoutProperty(...)`
  against layout ids (not widget config), then `.exec()`.
- Cross-reference: see
  ../patterns/container-shared-code.md for the shared layout-container pattern
  used by Row/Column/other LAYOUT widgets (the Viewer/Builder split, the
  builder-support module, and the placeholder child are common across them).

## Builder vs runtime split
- Runtime (Viewer): `RowLayoutViewer` (jimu-layouts/layout-runtime) renders the
  configured children arranged in a row. Chosen when
  `window.jimuConfig.isInBuilder` is falsy.
- Builder: `RowLayoutBuilder` (jimu-layouts/layout-builder) adds authoring
  affordances (drag/drop, resize handles). It is not imported directly by
  widget.tsx; it arrives via `builderSupportModules.widgetModules.RowLayoutBuilder`,
  which is populated because the manifest sets `hasBuilderSupportModule: true`
  and builder-support.tsx default-exports `{ RowLayoutBuilder }`.
- Settings (src/setting/setting.tsx) is builder-only UI. It edits layout-level
  properties (`space`, `style.padding`) rather than a widget config object; the
  widget's own config type is `null` (`AllWidgetProps<null>` /
  `AllWidgetSettingProps<null>`).

## Lifecycle and cleanup
- The widget itself is a `React.PureComponent` with a single `render` and no
  lifecycle hooks; there is nothing to clean up in widget.tsx.
- Setting is also a `React.PureComponent` (connected via `ReactRedux.connect`)
  with no subscriptions to tear down. It reads current layout setting from Redux
  (`state.appStateInBuilder`) through `mapStateToProps` and writes via
  `getAppConfigAction()...exec()`.
- No timers, event listeners, JSAPI watchers, or async modules are created, so
  no explicit disposal is required. UNVERIFIED: any cleanup performed internally
  by `RowLayoutViewer`/`RowLayoutBuilder` is out of scope of these files.

## Manifest/config requirements
- `type: "widget"`, `widgetType: "LAYOUT"` (manifest.json).
- `properties.hasBuilderSupportModule: true` -- required so
  `builderSupportModules.widgetModules.RowLayoutBuilder` is available at runtime.
- `layouts: [{ name: "DEFAULT", label: "Default", type: "ROW" }]` -- declares the
  single ROW layout slot the widget hosts.
- `defaultSize: { width: 800, height: 400 }`.
- Default config (config.json):
  ```json
  {
    "space": 10,
    "style": {
      "padding": { "number": [10], "unit": "px" }
    }
  }
  ```
  Note: at runtime the effective layout setting (`space`, `style.padding`) is
  stored on the layout object in app config, and setting.tsx falls back to
  `DEFAULT_ROW_LAYOUT_SETTING` (from jimu-layouts/layout-builder) when a layout
  has no `setting`.

## Gotchas
- The Builder component is NOT imported directly in widget.tsx. If you copy this
  pattern, you must keep `hasBuilderSupportModule: true` in the manifest and
  export the builder module from builder-support.tsx, or
  `builderSupportModules.widgetModules.RowLayoutBuilder` will be undefined and
  the widget renders the "No layout component!" fallback.
- Settings edit LAYOUT properties, not widget config. The widget config type is
  `null`; writing to widget config here would be wrong. Use
  `appConfigAction.editLayoutProperty(layoutId, ...)` against ids returned by
  `getLayoutIds()`.
- `getLayoutIds()` iterates size-mode layouts (one layout id per size mode), so
  changes are applied across all size modes in a single `.exec()`.
- Padding unit conversion (px <-> %) depends on the live element size fetched via
  `getSizeOfItem()`, which reaches into the builder app iframe using
  `APP_FRAME_NAME_IN_BUILDER`. If the element is not found, conversion is skipped
  (returns null rect), so percentage/pixel round-trips can be no-ops when the
  widget is not rendered.
- `WidgetPlaceholder` uses `pointerEvents: 'none'`; do not rely on it for click
  handling. It is a visual empty-state only.
- `/** @jsx jsx */` pragma plus `css` from jimu-core is required for the inline
  emotion `css` usage; do not switch to plain className-only without it.

## Useful snippets and functions

src/runtime/widget.tsx -- Viewer/Builder swap + placeholder child
```tsx
render (): React.JSX.Element {
  const { layouts, id, intl, builderSupportModules, ...otherProps } = this.props
  const LayoutComponent = !window.jimuConfig.isInBuilder
    ? RowLayoutViewer
    : builderSupportModules.widgetModules.RowLayoutBuilder

  if (LayoutComponent == null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>No layout component!</div>
    )
  }
  const layoutName = Object.keys(layouts)[0]

  return (
    <div className='widget-row-layout d-flex justify-content-center d-flex w-100' css={css`height: 100%;`}>
      <LayoutComponent layouts={layouts[layoutName]} widgetId={id} {...otherProps}>
        <WidgetPlaceholder
          icon={IconImage}
          widgetId={id}
          style={{ border: 'none', pointerEvents: 'none' }}
          name={intl.formatMessage({ id: 'tips', defaultMessage: defaultMessages.tips })}
        />
      </LayoutComponent>
    </div>
  )
}
```

src/runtime/builder-support.tsx -- entire builder-support module
```tsx
import { RowLayoutBuilder } from 'jimu-layouts/layout-builder'
export default { RowLayoutBuilder }
```

src/setting/setting.tsx -- collect layout ids across size modes
```tsx
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

src/setting/setting.tsx -- write a layout property via app config action
```tsx
handleSpaceChange = (value: LinearUnit): void => {
  const { layoutSetting } = this.props
  const appConfigAction = getAppConfigAction()
  this.getLayoutIds().forEach(layoutId => {
    const layout = appConfigAction.appConfig.layouts[layoutId]
    if (layout.setting == null) { // setup default setting
      appConfigAction.editLayoutProperty(layoutId, 'setting', layoutSetting)
    }
    appConfigAction.editLayoutProperty(layoutId, 'setting.space', value.distance)
  })
  appConfigAction.exec()
}
```

src/setting/setting.tsx -- map current layout setting from builder state
```tsx
const mapStateToProps = (state: IMState, ownProps: AllWidgetSettingProps<null>): StateToProps => {
  const { layouts } = ownProps
  let setting = DEFAULT_ROW_LAYOUT_SETTING
  if (layouts != null && state.appStateInBuilder) {
    const layoutName = Object.keys(layouts)[0]
    const sizemodeLayouts = layouts[layoutName]
    const layoutId = sizemodeLayouts[layoutUtils.getCurrentSizeMode()]
    setting = state.appStateInBuilder.appConfig.layouts[layoutId]?.setting ?? DEFAULT_ROW_LAYOUT_SETTING
  }
  return { layoutSetting: Immutable(setting) } as { layoutSetting: ImmutableObject<RowLayoutSetting> }
}
```

src/setting/setting.tsx -- reach into the builder app iframe for element size
```tsx
querySelector (selector: string): HTMLElement {
  const appFrame: HTMLIFrameElement = document.querySelector(`iframe[name="${APP_FRAME_NAME_IN_BUILDER}"]`)
  if (appFrame != null) {
    const appFrameDoc = appFrame.contentDocument || appFrame.contentWindow.document
    return appFrameDoc.querySelector(selector)
  }
  return null
}
```
