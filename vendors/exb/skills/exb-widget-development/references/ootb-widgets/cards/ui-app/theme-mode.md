# OTB Widget: common/theme-mode

Online widget doc: https://developers.arcgis.com/experience-builder/guide/theme-mode-switcher-widget/

## Purpose
Renders a single toggle button that switches the running app between light and dark theme
mode. The active mode is stored in app runtime state (not the app config), so the switch
affects the whole app at runtime. In builder it is preview-only, and it is disabled for
classic themes and shared themes.

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/config.json (contents: `{}`)
- ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/src/setting/setting.tsx

NOTE: The task template assumed there is no setting page. That is INCORRECT for this
version of the source. A setting page (src/setting/setting.tsx) exists and exposes icon
color and icon size settings. It is documented below.

## Architecture overview
- Runtime (src/runtime/widget.tsx): a functional widget that reads the current theme, reads
  the runtime theme mode from Redux (`state.appRuntimeInfo.themeMode`), and dispatches
  `appActions.ThemeModeChanged` on click to flip between `light` and `dark`.
- Two render shapes:
  - When placed inside a controller (`controllerWidgetId` truthy) it renders a `WidgetButton`
    with no explicit size/color (the controller drives styling).
  - Otherwise it renders a `Paper`-based `Root` with a `Tooltip` + icon `Button`, applying the
    configured `iconSize` and `iconColor`.
- Icon swap is done by toggling a `d-none` class on `DayFilled` / `NightFilled` based on the
  current mode (both icons are always in the DOM, one is hidden).
- Setting (src/setting/setting.tsx): configures `iconColor` (ThemeColorPicker) and `iconSize`
  (InputUnit in pixels) written into widget config.

## Key imports and packages
Runtime (src/runtime/widget.tsx):
- `jimu-core`: `hooks`, `ReactRedux`, `type IMState`, `type AllWidgetProps`, `appActions`, `classNames`
- `jimu-ui`: `Button`, `Paper`, `Tooltip`, `hooks as uiHooks`, `defaultMessages as uiMessages`, `WidgetButton`
- `jimu-theme`: `isSharedTheme`, `styled`, `useTheme`
- `jimu-icons/filled/application/day`: `DayFilled`
- `jimu-icons/filled/application/night`: `NightFilled`
- `../config`: `type IMConfig`
- `./translations/default`: `defaultMessages`

Setting (src/setting/setting.tsx):
- `jimu-core`: `hooks`
- `jimu-for-builder`: `type AllWidgetSettingProps`
- `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`
- `jimu-ui/advanced/style-setting-components`: `InputUnit`
- `jimu-ui/basic/color-picker`: `ThemeColorPicker`
- `jimu-ui`: `DistanceUnits`, `defaultMessages as jimuUiMessages`
- `jimu-theme`: `useTheme2`
- `../config`: `type IMConfig`

Config (src/config.ts):
- `jimu-core`: `type ImmutableObject`

Note on the template hints:
- `jimu-theme` `useTheme` is used in runtime; `useTheme2` is used in the setting page.
- `jimu-core` `appActions.ThemeModeChanged` is the action dispatched on toggle.
- `jimu-icons` `DayFilled` / `NightFilled` are the two mode icons.

## Reusable patterns found
- Theme mode switch: compute `newThemeMode = themeMode === 'light' ? 'dark' : 'light'` then
  `dispatch(appActions.ThemeModeChanged(newThemeMode))`.
- `useTheme()` (runtime) to read the active theme; `theme.sys.color.mode` is the default mode
  and `theme.uri` feeds `isSharedTheme(theme.uri)`.
- `useTheme2()` (setting) to get a theme object to pass as `specificTheme` to `ThemeColorPicker`.
- Read runtime mode from Redux: `ReactRedux.useSelector((state: IMState) => state.appRuntimeInfo?.themeMode ?? defaultThemeMode)`.
- `isSharedTheme(theme.uri)` and `uiHooks.useClassicTheme()` gate whether switching is allowed
  (`notSupport = isClassicTheme || isSharedTheme(theme.uri)`).
- `defaultInControllerUx: 'inController'` in manifest properties: the widget prefers to live
  inside a controller widget, and it detects that at runtime via `controllerWidgetId`.
- Controller-aware rendering: `WidgetButton` when in a controller, otherwise a standalone
  `Button` in a `Paper` `Root`.
- Icon visibility toggle with `classNames({ 'd-none': ... })` instead of conditional mounting.

## Builder vs runtime split
- Runtime: src/runtime/widget.tsx toggles theme mode; disabled in builder
  (`window.jimuConfig.isInBuilder`) where it is preview-only.
- Builder/setting: src/setting/setting.tsx (this version HAS a setting page) sets `iconColor`
  and `iconSize` into config via `onSettingChange` + immutable `config.set(...)`.
- (Template said "no setting page" - not accurate for this source; a setting page exists.)

## Lifecycle and cleanup
- No effects, subscriptions, timers, or JSAPI modules. Nothing to clean up.
- State is derived from props (`config`), the theme (`useTheme`), and Redux
  (`appRuntimeInfo.themeMode`); the widget is purely reactive.

## Manifest/config requirements
- manifest.json: `name: theme-mode`, `label: Theme mode switcher`, `type: widget`,
  version/exbVersion `1.20.0`.
- `defaultSize`: 32x32 with `autoWidth: true`, `autoHeight: true`.
- `properties.defaultInControllerUx: 'inController'` (prefers controller placement).
- No `dependencies` declared (no ArcGIS JSAPI usage).
- config.json ships as `{}`; typed defaults come from `ThemeModeConfig` (`iconSize`,
  `iconColor`). Runtime falls back to `iconSize = 16`, `iconColor = 'currentColor'` when unset.

## Gotchas
- Toggling is a no-op when `isInBuilder || notSupport`; `handleSwitchThemeMode` returns early,
  so clicking in builder or under classic/shared themes does nothing.
- `notSupport` combines classic theme (`uiHooks.useClassicTheme()`) and shared theme
  (`isSharedTheme(theme.uri)`); both disable switching and change the tooltip label.
- Theme mode is app runtime state (`appRuntimeInfo.themeMode`), NOT persisted widget config,
  so it resets on reload to the theme's default (`theme.sys.color.mode`).
- Inside a controller, the configured `iconSize`/`iconColor` are intentionally NOT applied
  (`sizeColor = controllerWidgetId ? {} : { size: iconSize, color: iconColor }`).
- Both icons render at all times; only visibility toggles via `d-none`. Do not assume only
  one icon is mounted.
- `themeMode` selector uses optional chaining + default: `state.appRuntimeInfo?.themeMode ?? defaultThemeMode`.

## Useful snippets and functions

Source: ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/src/runtime/widget.tsx
```tsx
const theme = useTheme()
const isClassicTheme = uiHooks.useClassicTheme()
const notSupport = isClassicTheme || isSharedTheme(theme.uri)
const isInBuilder = window.jimuConfig.isInBuilder
const defaultThemeMode = theme.sys.color.mode
const themeMode = ReactRedux.useSelector((state: IMState) => state.appRuntimeInfo?.themeMode ?? defaultThemeMode)

const dispatch = ReactRedux.useDispatch()
const handleSwitchThemeMode = () => {
  if (isInBuilder || notSupport) {
    return
  }
  const newThemeMode = themeMode === 'light' ? 'dark' : 'light'
  dispatch(appActions.ThemeModeChanged(newThemeMode))
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/src/runtime/widget.tsx
```tsx
const sizeColor = controllerWidgetId ? {} : { size: iconSize, color: iconColor }
const iconNode = <>
  <DayFilled {...sizeColor} className={classNames({ 'd-none': themeMode === 'dark' })} />
  <NightFilled {...sizeColor} className={classNames({ 'd-none': themeMode === 'light' })} />
</>

return (controllerWidgetId ?
  <WidgetButton widgetId={id} label={label} onClick={handleSwitchThemeMode}>
    {iconNode}
  </WidgetButton>
  :
  <Root className='widget-theme-mode-switcher jimu-widget' transparent={true} shape='shape1'>
    <div className='theme-mode-switcher-wrapper'>
      <Tooltip title={label}>
        <Button
          icon={true}
          variant='text'
          color='inherit'
          size='default'
          aria-label={label}
          className='jimu-outline-inside'
          onClick={handleSwitchThemeMode}
        >
          {iconNode}
        </Button>
      </Tooltip>
    </div>
  </Root>
)
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/src/config.ts
```ts
import type { ImmutableObject } from 'jimu-core'

export interface ThemeModeConfig {
  iconSize: number
  iconColor: string
}

export type IMConfig = ImmutableObject<ThemeModeConfig>
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/src/setting/setting.tsx
```tsx
const theme = useTheme2()

const handleIconColorChange = (value: string) => {
  onSettingChange({
    id: props.id,
    config: config.set('iconColor', value)
  })
}

const handleIconSizeChange = (value: { distance: number; unit: DistanceUnits }) => {
  onSettingChange({
    id: props.id,
    config: config.set('iconSize', value.distance)
  })
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/common/theme-mode/manifest.json
```json
{
  "name": "theme-mode",
  "label": "Theme mode switcher",
  "type": "widget",
  "version": "1.20.0",
  "exbVersion": "1.20.0",
  "defaultSize": {
    "width": 32,
    "height": 32,
    "autoWidth": true,
    "autoHeight": true
  },
  "properties": {
    "defaultInControllerUx": "inController"
  }
}
```

UNVERIFIED: The exact runtime shape of `state.appRuntimeInfo.themeMode` values beyond the
`'light'`/`'dark'` strings used here, and the full reducer behavior of
`appActions.ThemeModeChanged`, were not inspected in framework source; they are inferred from
usage in src/runtime/widget.tsx.
