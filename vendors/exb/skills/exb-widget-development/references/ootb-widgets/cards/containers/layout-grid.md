# OTB Widget: layout/grid

Online widget doc: https://developers.arcgis.com/experience-builder/guide/grid-widget/

## Purpose
The Grid widget is a LAYOUT-type container widget. It hosts a two-dimensional grid
layout into which other widgets can be placed. In the app runtime it renders the
grid via a viewer component; in the builder it renders an editable grid via a
builder component and exposes grid layout settings in the setting panel. The
manifest description ("This is the widget used in developer guide") indicates it
is the canonical layout-widget sample shipped with Experience Builder.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/layout/grid/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/layout/grid/config.json
- ArcGISExperienceBuilder/client/dist/widgets/layout/grid/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/grid/src/runtime/builder-support.tsx
- ArcGISExperienceBuilder/client/dist/widgets/layout/grid/src/setting/setting.tsx

(The `dist/` build output subfolder and any tests were ignored per instructions.)

## Architecture overview
This widget is intentionally thin. It does not implement its own layout logic;
instead it delegates entirely to the shared jimu-layouts grid components:

- Runtime picks between two layout components at render time based on whether it
  is running inside the builder:
  - App runtime -> `GridLayoutViewer` (from `jimu-layouts/layout-runtime`)
  - Builder -> `builderSupportModules.widgetModules.GridLayoutBuilder`
- The builder-support module exposes `GridLayoutBuilder` (from
  `jimu-layouts/layout-builder`) so it can be loaded only in the builder bundle.
- The setting panel delegates to `GridLayoutSetting` (from
  `jimu-layouts/layout-builder`).

The widget reads its single layout by name (`Object.keys(layouts)[0]`) and passes
that layout object down to whichever component is active.

## Key imports and packages
Runtime widget (src/runtime/widget.tsx):
- `React, AllWidgetProps, jsx, css, SerializedStyles` from `jimu-core`
- `GridLayoutViewer` from `jimu-layouts/layout-runtime`

Builder support (src/runtime/builder-support.tsx):
- `GridLayoutBuilder` from `jimu-layouts/layout-builder`

Setting (src/setting/setting.tsx):
- `React, jsx` from `jimu-core`
- `AllWidgetSettingProps` (type) from `jimu-for-builder`
- `GridLayoutSetting` from `jimu-layouts/layout-builder`

Notes:
- `jimu-layouts/layout-runtime` provides the runtime-only viewer; keeping the
  viewer separate from the builder keeps the runtime bundle small.
- `jimu-layouts/layout-builder` provides builder-only pieces (`GridLayoutBuilder`,
  `GridLayoutSetting`); these are pulled in through `builderSupportModules` /
  the setting bundle, not the runtime bundle.
- `builderSupportModules` is provided on `AllWidgetProps` because the manifest
  declares `hasBuilderSupportModule: true`.

## Reusable patterns found
- widgetType LAYOUT: `manifest.json` sets `"widgetType": "LAYOUT"` and declares a
  single `GRID` layout under `layouts` (name `DEFAULT`). This is what marks the
  widget as a container that can host other widgets.
- Grid viewer/builder split: `GridLayoutViewer` for runtime, `GridLayoutBuilder`
  for builder, `GridLayoutSetting` for the setting panel; all imported from the
  shared `jimu-layouts` packages rather than reimplemented.
- `supportAutoSize: false`: the manifest disables auto-size, which is typical for
  container/layout widgets whose size is driven by their parent layout.
- Runtime environment switch via `window.jimuConfig.isInBuilder` to select the
  correct layout component.
- Single-layout lookup pattern: `const layoutName = Object.keys(layouts)[0]` then
  index `layouts[layoutName]`.
- Cross-ref: see patterns/container-shared-code.md for the shared
  viewer/builder/setting delegation pattern used across container widgets.

## Builder vs runtime split
- Runtime bundle: imports only `GridLayoutViewer` from
  `jimu-layouts/layout-runtime`. When `window.jimuConfig.isInBuilder` is false it
  renders `GridLayoutViewer`.
- Builder bundle: `builder-support.tsx` default-exports
  `{ GridLayoutBuilder }`, which arrives at runtime as
  `props.builderSupportModules.widgetModules.GridLayoutBuilder`. When in builder
  the widget renders that builder component instead of the viewer.
- Setting bundle: `setting.tsx` renders `GridLayoutSetting`, passing the layout,
  `appTheme={this.props.theme2}`, and a `formatMessage` callback.
- The manifest ties this together with `hasBuilderSupportModule: true`.

## Lifecycle and cleanup
- Both the runtime widget and the setting are `React.PureComponent` classes with
  no `componentDidMount` / `componentWillUnmount`, no timers, subscriptions, or
  manual resource handling. There is nothing to clean up in this widget itself.
- All lifecycle/interaction concerns live inside the shared jimu-layouts
  components (`GridLayoutViewer`, `GridLayoutBuilder`, `GridLayoutSetting`).

## Manifest/config requirements
From manifest.json:
- `"type": "widget"` and `"widgetType": "LAYOUT"`.
- `"properties": { "supportAutoSize": false, "hasBuilderSupportModule": true }`.
- `"layouts": [{ "name": "DEFAULT", "label": "Default", "type": "GRID" }]`.
- `"defaultSize": { "width": 400, "height": 400 }`.
- `version` / `exbVersion`: `1.20.0`.

config.json is present but empty (`{}`): this widget carries no custom config
schema; layout state is stored in app layout structures, not in widget config.

## Gotchas
- The layout is looked up by the FIRST key of `props.layouts`
  (`Object.keys(layouts)[0]`), not by the manifest layout name string. This
  assumes exactly one layout is present.
- `builderSupportModules.widgetModules.GridLayoutBuilder` can be null while the
  builder module is still loading; the runtime guards this with a "No layout
  component!" fallback. Do not assume it is always defined.
- Because `supportAutoSize` is false, do not rely on the widget resizing itself
  to fit content; sizing comes from the parent layout / `defaultSize`.
- The runtime uses `window.jimuConfig.isInBuilder`, not a prop, to decide viewer
  vs builder. UNVERIFIED (definition of `window.jimuConfig` not inspected in this
  task) - see jimu-core typings for the exact shape.
- `theme2` is passed to `GridLayoutSetting` (the app theme), distinct from the
  widget's own `theme`. UNVERIFIED which theme version other setting APIs expect;
  confirm against jimu-for-builder / jimu-theme typings before reuse.

## Useful snippets and functions

Runtime component selection and single-layout render
(ArcGISExperienceBuilder/client/dist/widgets/layout/grid/src/runtime/widget.tsx):
```tsx
render (): React.JSX.Element {
  const { layouts, builderSupportModules } = this.props
  const LayoutComponent = !window.jimuConfig.isInBuilder
    ? GridLayoutViewer
    : builderSupportModules.widgetModules.GridLayoutBuilder

  if (LayoutComponent == null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        No layout component!
      </div>
    )
  }
  const layoutName = Object.keys(layouts)[0]

  return (
    <div className='widget-grid-layout w-100 h-100' css={this.getStyle()}>
      <LayoutComponent layouts={layouts[layoutName]}>
      </LayoutComponent>
    </div>
  )
}
```

Runtime overflow style
(ArcGISExperienceBuilder/client/dist/widgets/layout/grid/src/runtime/widget.tsx):
```tsx
getStyle (): SerializedStyles {
  return css`
    overflow: hidden;
  `
}
```

Builder-support module export
(ArcGISExperienceBuilder/client/dist/widgets/layout/grid/src/runtime/builder-support.tsx):
```tsx
import { GridLayoutBuilder } from 'jimu-layouts/layout-builder'
export default { GridLayoutBuilder }
```

Setting panel delegating to GridLayoutSetting
(ArcGISExperienceBuilder/client/dist/widgets/layout/grid/src/setting/setting.tsx):
```tsx
render (): React.JSX.Element {
  const layoutName = Object.keys(this.props.layouts)[0]

  const layouts = this.props.layouts[layoutName]

  return <GridLayoutSetting layouts={layouts} appTheme={this.props.theme2} formatMessage={this.formatMessage} />
}
```

Manifest layout/property declaration
(ArcGISExperienceBuilder/client/dist/widgets/layout/grid/manifest.json):
```json
"widgetType": "LAYOUT",
"properties": {
  "supportAutoSize": false,
  "hasBuilderSupportModule": true
},
"layouts": [
  {
    "name": "DEFAULT",
    "label": "Default",
    "type": "GRID"
  }
]
```
