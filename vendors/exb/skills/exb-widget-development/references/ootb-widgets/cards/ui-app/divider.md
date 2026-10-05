# OTB Widget: common/divider

Online widget doc: https://developers.arcgis.com/experience-builder/guide/divider-widget/

## Purpose
The Divider widget renders a purely decorative separator line (horizontal or vertical) with
optional start/end point decorations. It is a "pure-style" widget: it holds no data source, no
map binding, and no user interaction. All output is CSS produced from a small config object,
driven by theme mode (light/dark) and a set of pre-baked template styles. It also ships a
"Quick style" context tool that lets a builder user pick from 20 pre-designed looks.

## Source paths inspected
Source root (gitignored): `ArcGISExperienceBuilder/client/dist/widgets/common/divider/`
- `manifest.json`
- `src/config.ts`
- `src/runtime/widget.tsx`
- `src/runtime/builder-support.tsx`
- `src/runtime/utils/util.ts`
- `src/runtime/components/quick-style.tsx` (partial - top of file)
- `src/common/template-style.ts` (partial - `getStrokeStyle`, `getDividerLineStyle`)
- `src/utils/util.ts` (top-level utils: default sizes/colors)
- `src/setting/setting.tsx`
- `src/setting/components/range-input.tsx`
- `src/setting/components/point-select.tsx` (referenced only, not fully read - UNVERIFIED)
- `src/setting/components/line-select.tsx` (referenced only, not fully read - UNVERIFIED)
- `src/tools/quick-style.tsx`
(Ignored: `dist/` compiled bundles and `tests/` per instructions.)

## Architecture overview
- Runtime (`src/runtime/widget.tsx`): a `React.PureComponent` extending `AllWidgetProps<IMConfig>`.
  It reads `config` (direction, stroke, start/end points), computes emotion CSS via helper
  functions, and renders three nested divs: an outer `jimu-widget` container, a line element,
  and an optional pair of point spans.
- Style helpers (`src/runtime/utils/util.ts` + `src/common/template-style.ts`): pure functions
  that turn config + theme into emotion `css` blocks. `template-style.ts` holds the big
  library of line/point style variants keyed by `Style0..Style10` / `Point0..Point8`.
- Builder support (`src/runtime/builder-support.tsx`): tiny module exposing `appBuilderSync`
  and the `QuickStyle` component so the builder can apply quick styles.
- Setting (`src/setting/setting.tsx`): a `React.PureComponent<AllWidgetSettingProps<IMConfig>>`
  panel with direction, color, stroke style/size, and start/end point controls.
- Quick-style context tool (`src/tools/quick-style.tsx`): an `extensionSpec.ContextToolExtension`
  registered in the manifest under `extensions` at point `CONTEXT_TOOL`.

## Key imports and packages
This is a MINIMAL widget - it imports only from `jimu-core`, jimu UI/theme/builder helpers,
and its own local files. There is no `jimu-arcgis`, no `@arcgis/core`, no data source usage.

Runtime widget (`src/runtime/widget.tsx`):
- `jimu-core`: `React`, `IMState`, `classNames`, `css`, `jsx`, `AllWidgetProps`, `AppMode`,
  `Immutable`, `BrowserSizeMode`
- local `../config`: `IMConfig`, `Direction`, `PointStyle`
- local `./utils/util`: `getNewDividerLineStyle`, `getDividerLinePositionStyle`, `getNewPointStyle`

Runtime style util (`src/runtime/utils/util.ts`):
- local `../../common/template-style`: `getStrokeStyle`, `getPointStyle`, `getDividerLineStyle`
- local `../../config`: `Direction`, `PointStyle`, `Config`
- `jimu-core`: `IMThemeVariables`
- local `../../utils/util`: `getAllDefaultStrokeColors`
- `jimu-theme`: `getThemeModule`, `mapping`

Template styles (`src/common/template-style.ts`):
- `jimu-core`: `css`
- local `../config`: `Direction`

Builder support (`src/runtime/builder-support.tsx`):
- `jimu-for-builder`: `appBuilderSync`
- local `./components/quick-style`: `QuickStyle`

Setting (`src/setting/setting.tsx`):
- `jimu-core`: `React`, `classNames`, `IMThemeVariables`, `css`, `jsx`, `polished`
- `jimu-for-builder`: `AllWidgetSettingProps`, `getAppConfigAction`
- `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`, `DirectionSelector`
- `jimu-ui/advanced/style-setting-components`: `InputUnit`
- `jimu-ui/basic/color-picker`: `ThemeColorPicker`
- `jimu-ui`: `defaultMessages` (as `jimuUIDefaultMessages`), `DistanceUnits`, `LinearUnit`
- local `../config`, `./translations/default`, and the three setting components

Quick-style tool (`src/tools/quick-style.tsx`):
- `jimu-core`: `extensionSpec`, `appActions`, `getAppStore`, `LayoutContextToolProps`, `i18n`,
  `BrowserSizeMode`
- `jimu-for-builder`: `appBuilderSync`, `builderAppSync`
- `jimu-ui`: `defaultMessages`
- local `../runtime/components/quick-style`: `QuickStyle as QuickStyleComponent`

## Reusable patterns found

### Pure-style widget pattern
The whole widget is stateless output: `render()` derives emotion CSS from `config` + `theme`
via pure helpers, then renders static divs. No lifecycle work, no async, no refs beyond
capturing `domNode`. Good template for badges, separators, frames, decorative overlays.

### `mapExtraStateProps` for selection/builder-state only
The widget does not read app state for data - it reads it only to know whether it is the
currently selected widget inside the builder (to drive `active`) and to grab `browserSizeMode`,
`appMode`, `hasEverMount`, and its own `uri`. This is the canonical "I need a bit of runtime
context but no data source" pattern. See snippet below.

### Template styles by theme mode
Default colors and sizes are pre-baked per theme mode. `getAllDefaultStrokeColors('light'|'dark')`
returns a color-per-template map, and `getStrokeColor` picks the default for the active template
only when the user has not set an explicit color. New-vs-old theme detection is done via
`getThemeModule(theme?.uri)` + `mapping.whetherIsNewTheme(...)`.

### Quick-style extension (context tool)
A one-click styling extension is contributed via the manifest `extensions` array (point
`CONTEXT_TOOL`, uri `tools/quick-style`). The tool class implements
`extensionSpec.ContextToolExtension` and, on small screens, opens a side panel via
`appBuilderSync.publishSidePanelToApp(...)`; otherwise it returns the `QuickStyle` React
component from `getSettingPanel`.

### lockChildren
`manifest.json` sets `properties.lockChildren: true` so the widget cannot host/rearrange child
widgets in the layout - appropriate for a leaf decorative widget. It also sets
`canCrossLayoutBoundary: true` and `hasBuilderSupportModule: true`.

## Builder vs runtime split
- Runtime rendering lives in `src/runtime/widget.tsx` and its pure style helpers.
- `hasBuilderSupportModule: true` activates `src/runtime/builder-support.tsx`, which only
  re-exports `appBuilderSync` and the `QuickStyle` component (used when applying quick styles).
- The Setting panel (`src/setting/setting.tsx`) writes config through
  `this.props.onSettingChange(...)` and, for direction changes, calls
  `getAppConfigAction().exchangeWidthAndHeight().exec()` so the widget footprint swaps W/H when
  flipping between Horizontal and Vertical.
- The runtime `editWidgetConfig` guard shows the runtime can only edit config while in the
  builder: it early-returns unless `window.jimuConfig.isInBuilder`, then uses
  `this.props.builderSupportModules.jimuForBuilderLib.getAppConfigAction()`.
- Any change in the Setting resets `themeStyle.quickStyleType` back to `None` (a manual edit
  clears the "applied quick style" marker). See `onSettingChange`.

## Lifecycle and cleanup
- The widget component itself does no timers, subscriptions, or async loads - nothing to clean up.
- The only cleanup in the widget code is in the Setting's `RangeInput`
  (`src/setting/components/range-input.tsx`): it debounces `onChange` with `setTimeout` and
  clears it in `componentWillUnmount` via `clearTimeout(this.updateConfigTimeout)`. It also
  syncs external `value` prop into local state in `componentDidUpdate`.

## Manifest/config requirements
- `manifest.json`:
  - `type: "widget"`, `defaultSize: { width: 300, height: 50 }`
  - `properties.lockChildren: true`, `properties.canCrossLayoutBoundary: true`,
    `properties.hasBuilderSupportModule: true`
  - `extensions: [{ name: "quick-style", point: "CONTEXT_TOOL", uri: "tools/quick-style" }]`
- `config.ts` shape (`Config`, exported as `IMConfig = ImmutableObject<Config>`):
  `style?`, `direction?` (`Direction`), `pointEnd?`/`pointStart?` (`Point`), `strokeStyle?`
  (`StrokeStyle`: `type: LineStyle`, `color: string`, `size: string`), `themeStyle?`
  (`{ quickStyleType: QuickStyleType }`), `template?` (`DividerTemplate`).
- Enums live in `config.ts`: `Direction`, `LineStyle` (Style0..Style10),
  `PointStyle` (None, Point0..Point8), `QuickStyleType` (None, Default, Style1..Style19),
  `Status`.

## Gotchas
- `strokeStyle.size` is a string with a `px` suffix (e.g. `"3px"`); helpers strip it with
  `size.split('px')[0]`. Do not pass a bare number.
- Stroke size input rejects `< 1` and no-op changes (`onStrokeSizeChange` early-returns).
- Point size is stored as a ratio-derived number (3..5, "times the line width"), NOT a pixel
  value. `RangeInput` converts the displayed 0-100% into `value * (MAX_RATIO - MIN_RATIO) + MIN_RATIO`.
- Color defaults are template- and theme-mode-specific; an empty `strokeStyle.color` means
  "use the template default for the current light/dark mode", not "no color".
- Several line styles (Style4/Style5) are commented out in `template-style.ts` - the enum still
  lists them, but they fall back to defaults.
- Editing any setting silently clears `themeStyle.quickStyleType` to `None`.
- The quick-style tool behaves differently on `BrowserSizeMode.Small` (side panel) vs larger
  (settings panel component) - keep both paths in mind when extending.
- The runtime uses the `/** @jsx jsx */` pragma with emotion; `css` and `jsx` must both be
  imported from `jimu-core` or the `css` prop will not compile.

## Useful snippets and functions

Source: `src/runtime/widget.tsx`
```tsx
static mapExtraStateProps = (
  state: IMState,
  props: AllWidgetProps<IMConfig>
): Props => {
  let selected = false
  const selection = state.appRuntimeInfo.selection
  if (selection && state.appConfig.layouts[selection.layoutId]) {
    const layoutItem =
      state.appConfig.layouts[selection.layoutId].content[
        selection.layoutItemId
      ]
    selected = layoutItem && layoutItem.widgetId === props.id
  }
  const isInBuilder = state.appContext.isInBuilder
  const active = isInBuilder && selected

  const widgetState = state.widgetsState[props.id] || Immutable({})
  return {
    appMode: selection ? state?.appRuntimeInfo?.appMode : null,
    browserSizeMode: state?.browserSizeMode,
    active,
    hasEverMount: widgetState.hasEverMount,
    uri: state.appConfig.widgets?.[props.id]?.uri
  }
}
```

Source: `src/runtime/widget.tsx`
```tsx
editWidgetConfig = newConfig => {
  if (!window.jimuConfig.isInBuilder) return

  const appConfigAction = this.props.builderSupportModules.jimuForBuilderLib.getAppConfigAction()
  appConfigAction.editWidgetConfig(this.props.id, newConfig).exec()
}
```

Source: `src/runtime/utils/util.ts`
```ts
export function getStrokeColor (config: Config, theme: IMThemeVariables): string {
  const themeModule = getThemeModule(theme?.uri)
  const isNewTheme = mapping.whetherIsNewTheme(themeModule)
  const { strokeStyle } = config
  const allDefaultStrokeColors = getAllDefaultStrokeColors(theme.sys.color.mode)
  const defaultColor = isNewTheme ? allDefaultStrokeColors.Default : ''
  const defaultStrokeColors = config?.template ? allDefaultStrokeColors[config.template] : defaultColor
  return strokeStyle?.color || defaultStrokeColors
}
```

Source: `src/common/template-style.ts`
```ts
export function getStrokeStyle (
  size,
  color,
  direction = Direction.Horizontal,
  isSetting = false
) {
  const isHorizontal = direction === Direction.Horizontal
  const horizontalLineCss = {} as any
  const verticalLineCss = {} as any
  color = color || 'transparent'

  horizontalLineCss.Style0 = css`
    & {
      border-bottom: ${size} solid ${color};
    }
  `
  // ... Style1 dashed, Style2 dotted, Style3 gradient, Style6..Style10, plus vertical variants
}
```

Source: `src/setting/setting.tsx`
```tsx
onSettingChange = (key: string | string[], value: any) => {
  let config = this.props.config
  if (Array.isArray(key)) {
    config = config.setIn(key, value)
  } else {
    config = config.set(key, value)
  }
  if (config.themeStyle.quickStyleType !== QuickStyleType.None) {
    config = config.setIn(
      ['themeStyle', 'quickStyleType'],
      QuickStyleType.None
    )
  }
  this.props.onSettingChange({
    id: this.props.id,
    config
  })
}
```

Source: `src/setting/setting.tsx`
```tsx
onDirectionChange = (vertical?: boolean) => {
  const newDirection = vertical ? Direction.Vertical : Direction.Horizontal
  const { direction } = this.props.config
  if (newDirection === direction) {
    return false
  }
  this.onSettingChange('direction', newDirection)
  getAppConfigAction()
    .exchangeWidthAndHeight()
    .exec()
}
```

Source: `src/setting/components/range-input.tsx`
```tsx
componentWillUnmount () {
  clearTimeout(this.updateConfigTimeout)
}

onChange = (e) => {
  const val = e.target.value
  if (!this.checkNumber(val) || val === this.preRangeValue) return false
  if (Number(val) < 0 || Number(val) > 100) return false
  const value = val / 100
  const pointSize = value * (MAX_RATIO - MIN_RATIO) + MIN_RATIO
  const rangeValue = this.getRangeValue(pointSize)
  this.setState({ value: pointSize, rangeValue })
  this.preRangeValue = val
  clearTimeout(this.updateConfigTimeout)
  this.updateConfigTimeout = setTimeout(() => {
    this?.props?.onChange(pointSize)
  }, 100)
}
```

Source: `src/tools/quick-style.tsx`
```tsx
export default class QuickStyle implements extensionSpec.ContextToolExtension {
  index = 2
  id = 'button-quick-style'
  openWhenAdded = true

  onClick (props: LayoutContextToolProps) {
    const widgetId = props.layoutItem.widgetId
    const browserSizeMode = this.getAppState().browserSizeMode
    if (browserSizeMode === BrowserSizeMode.Small) {
      this.isOpenInSidePanel = !this.isOpenInSidePanel
      appBuilderSync.publishSidePanelToApp({
        type: 'dividerQuickStyle',
        widgetId,
        uri: 'widgets/common/divider/',
        onClose: () => { this.isOpenInSidePanel = false; this.widgetToolbarStateChange(widgetId) },
        active: this.isOpenInSidePanel
      })
    }
  }

  getSettingPanel (props: LayoutContextToolProps) {
    if (this.getAppState().browserSizeMode === BrowserSizeMode.Small) return null
    return QuickStyleComponent as any
  }
}
```

Source: `src/utils/util.ts`
```ts
export function getAllDefaultStrokeColors (themeMode: 'light' | 'dark') {
  const AllDefaultStrokeColors = {
    dark: { Default: '#C6C6C6', Style1: '#FF8A7B', /* ... */ },
    light: { Default: '#303030', Style1: '#B4271F', /* ... */ }
  }
  return themeMode === 'dark' ? AllDefaultStrokeColors.dark : AllDefaultStrokeColors.light
}
```
