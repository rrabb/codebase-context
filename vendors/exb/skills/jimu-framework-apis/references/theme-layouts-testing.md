# jimu-theme, jimu-layouts & jimu-for-test Reference (ExB 1.20)

## 1. jimu-theme — theming & styling

Exports (barrel `jimu-theme`): `useTheme`, `useTheme2`, `useMultiThemeValue`, `ThemeProvider`, `styled`,
`createStyled`, `withTheme`/`withTheme2`, `ThemeSwitchComponent`, `createTheme`, `createColorScheme`,
emotion helpers (`Global`, `CacheProvider`, `createEmotionCache`), color utils (`getThemeColorValue`,
`isCSSVariable`, `colorNameToHex`).

```ts
useTheme(useDefaultTheme?: boolean): IMThemeVariables   // the theme hook
useTheme2(): IMThemeVariables                            // the "other iframe" theme (builder↔app) — usually ignore
```

### Theme token model — read `theme.sys.*`

```ts
interface Theme {
  breakpoints; ref: ThemeReference;   // raw tonal ramps (100–1300) — palette SOURCE, not for direct styling
  sys: ThemeSystem;                   // <-- widgets consume THIS
}
interface ThemeSystem {
  color: ColorScheme; spacing: Spacing; shadow; shape; typography; transitions; focus
}
```

- `theme.sys.color`: semantic roles — `primary/secondary/error/warning/info/success` (each `.main`/`.text`/…),
  `surface` (`background`, `backgroundText`, `paper`, `paperText`, `overlay`, `header`, `footer`…),
  action groups (`ActionSelected`, `ActionDisabled`, `ActionLink`), `divider`. Mode is `'light' | 'dark'`.
- `theme.sys.spacing` is **callable AND indexable**: `spacing()`, `spacing(1, 2)`, `spacing(t, r, b, l)`, or `spacing[4]`.
- `theme.sys.typography`: variants `h1..h6 | title1..3 | inputField | body | label1..3` (each `{ fontFamily?, fontSize?, fontWeight?, lineHeight? }`). `theme.sys.shape.shape1/…` for radii.

### `styled` (emotion, theme-aware)

```tsx
import { styled } from 'jimu-theme'
const StyledButton = styled('button')(({ theme }) => ({
  backgroundColor: theme.sys.color.primary.main,
  color: theme.sys.color.primary.text,
  borderRadius: theme.sys.shape.shape1,
  padding: theme.sys.spacing(1, 2)
}))
```

### `useTheme` / emotion `css`

```tsx
import { css } from 'jimu-core'
import { useTheme } from 'jimu-theme'
const C = () => { const theme = useTheme(); return <div css={css({ background: theme.sys.color.surface.paper })} /> }
```

Class widgets receive `props.theme` (an `IMThemeVariables`). CSS-var form (`var(--sys-color-…)`) is emitted
by the global theme; the type-safe path is the `theme.sys.*` object. `withTheme(Component, multiTheme?)`
injects `theme` (and `theme2` when `multiTheme`).

## 2. jimu-layouts — layout system

Two entrypoints: `jimu-layouts/layout-runtime` (viewers) and `jimu-layouts/layout-builder` (editor).

- Runtime exports: `LayoutEntry`, `PageRenderer`, `WidgetRenderer`, `SectionRenderer`, `LayoutItem`,
  per-type viewers (`FixedLayoutViewer`, `ColumnLayoutViewer`, `RowLayoutViewer`, `GridLayoutViewer`,
  `AccordionLayoutViewer`, `FlexRowLayoutViewer`), contexts (`PageContext`, `LayoutContext`), `utils`.
- Builder exports: matching `*Builder`, `*LayoutItemSetting`, layout `*Service`s, DnD helpers (`withRnd`,
  `DropArea`, `ResizeHandlers`), `addItemToLayout`, `getRootLayoutId`.

The **enums live in `jimu-core`** (`import { LayoutType, LayoutItemType } from 'jimu-core'`):

```ts
enum LayoutType { FixedLayout='FIXED', FlowLayout='FLOW', GridLayout='GRID',
  ColumnLayout='COLUMN', RowLayout='ROW', AccordionLayout='ACCORDION', FlexRowLayout='FLEX_ROW' }  // 7 members, NO CONTROLLER
enum LayoutItemType { Unkown='UNKNOWN', Widget='WIDGET', Section='SECTION', ScreenGroup='SCREEN_GROUP' }
```

`jimu-layouts/lib/types` also defines `LayoutItemSizeModes { Auto='AUTO', Stretch='STRETCH', Custom='CUSTOM' }`,
`COLS_IN_ONE_ROW = 12`, and per-layout setting interfaces. A widget's placement arrives as
`layoutId`/`layoutItemId` props; runtime helpers (`getCurrentSizeMode()`, `getCurrentPageRootLayoutId()`)
come from `utils`.

## 3. jimu-for-test — widget testing (jest + RTL)

Exports (`jimu-for-test`): `widgetRender`, `widgetSettingRender`, `wrapWidget`, `wrapWidgetSetting`,
`mockTheme` (default of `theme-mock`), `initGlobal`, `initStore`, `getInitState`, `getDefaultAppConfig`,
`waitForMilliseconds`, `setTheme`, plus wrapper components and `mockData`/`mockJSAPIMap`.

```ts
widgetRender(needsStoreInit?, theme?, locale?, messages?, theme2?): (ui, options?) => RenderResult
widgetSettingRender(needsStoreInit?, theme?, locale?, messages?, theme2?): …
wrapWidget(WidgetClass, props?): WrappedWidget          // props = Partial widget injected props (config, etc.)
wrapWidgetSetting(WidgetSettingClass, props?): …
waitForMilliseconds(ms?, value?): Promise<unknown>
```

`RenderResult` augments RTL with **`getBySelector` / `queryBySelector` / `findBySelector`** (raw CSS-selector
queries — handy for ExB's `widget-<name>` classes).

```tsx
import { React } from 'jimu-core'
import { widgetRender, wrapWidget, mockTheme, initGlobal, waitForMilliseconds } from 'jimu-for-test'
import Widget from '../src/runtime/widget'

initGlobal()
const render = widgetRender(true, mockTheme)              // needsStoreInit=true + mock theme
const Wrapped = wrapWidget(Widget, { config: { text: 'Hello' } as any })

describe('Widget', () => {
  it('renders config text', async () => {
    const { getByText, queryBySelector } = render(<Wrapped widgetId="w1" />)
    await waitForMilliseconds(0)
    expect(getByText('Hello')).toBeInTheDocument()
    expect(queryBySelector('.widget-simple')).toBeTruthy()
  })
})
```
(Run from `ArcGISExperienceBuilder/client`: `npm test`.)

## Novel / traps

- **Dual theme (`theme` + `theme2`)** is threaded through nearly every theme + test API — `theme2` is the *other* iframe (app-in-builder); most consumers ignore it but it's a trailing arg everywhere.
- **`sys` vs `ref`**: style from `theme.sys.*` (semantic); `theme.ref.*` is raw tonal ramps (neutral runs to `1300`), backed by Google material-color-utilities.
- **`spacing` is callable and indexable** (`spacing(1,2)` and `spacing[4]`), MUI-style.
- **`LayoutType` has 7 members incl. `FLEX_ROW`, no `CONTROLLER`** — the controller is a separate `controller-panel/` module, not a layout type. The enum lives in `jimu-core`.
- **`*BySelector` RTL queries** are ExB-specific; layout viewers are Redux-connected so widget tests need `needsStoreInit`/`initStore`.
