# OTB Widget: common/card

Online widget doc: https://developers.arcgis.com/experience-builder/guide/card-widget/

## Purpose

The Card widget is a container widget that hosts an embedded layout (a "template" of
nested widgets) and renders it as a styled card. It supports two visual states,
`DEFAULT` (regular) and `HOVER`, each backed by its own embedded layout, plus per-state
background/border/shadow styling, an optional whole-card link, and a transition
animation used when flipping between the regular and hover faces. It is one of the ExB
"embedded layout host" widgets: it does not render data itself, it renders whatever
widgets the author drops into its DEFAULT and HOVER layouts.

## Source paths inspected

All under `ArcGISExperienceBuilder/client/dist/widgets/common/card/` (gitignored; read with includeIgnoredFiles). The `dist/` and `tests/` folders were ignored per instructions.

- `manifest.json`
- `config.json`
- `src/config.ts`
- `src/version-manager.ts` (listed only, not deep-read)
- `src/runtime/widget.tsx`
- `src/runtime/builder-support.tsx`
- `src/runtime/components/card-base.tsx`
- `src/runtime/components/card-viewer.tsx`
- `src/runtime/components/card-editor.tsx`
- `src/runtime/components/card-content.tsx`
- `src/runtime/components/my-dropdown.tsx` (referenced from builder-support and card-editor; not deep-read)
- `src/tools/app-config-operations.ts`
- `src/setting/setting.tsx`
- `src/setting/template/card-style0.json` .. `card-style10.json` (template style presets; listed)
- `src/setting/components/tips-popper.tsx` (listed only)

UNVERIFIED: The task template referenced a `card-layout-setting` component under the
widget's own source. In the ACTUAL source, `CardLayoutSetting` is NOT a local file; it
is imported from `jimu-ui/advanced/setting-components`
(`src/setting/setting.tsx` line 46). See "Card layout switching" below.

## Architecture overview

The card is an **embedded layout host** (`manifest.json` -> `properties.hasEmbeddedLayout: true`).
It declares two FIXED layouts in its manifest, `DEFAULT` and `HOVER`
(`manifest.json` -> `layouts`), which correspond to `Status.Default` and `Status.Hover`
in `src/config.ts`.

The root `Widget` (`src/runtime/widget.tsx`) branches at render time between two
completely different subtrees:

- **Builder / design mode** -> `CardEditor` (`src/runtime/components/card-editor.tsx`).
  Used only when `window.jimuConfig.isInBuilder && appMode === AppMode.Design`. It draws
  both the regular and hover embedded layouts stacked absolutely, renders a floating
  "state" tool popper (Default / Hover / link controls), and mutates the app config
  through `jimu-for-builder` actions.
- **Runtime / consumer mode** -> `CardViewer` (`src/runtime/components/card-viewer.tsx`),
  which wraps `CardContent` (`src/runtime/components/card-content.tsx`). This is what end
  users see. It renders the DEFAULT layout, optionally the HOVER layout, wires the hover
  animation via `framer-motion`, and wraps everything in a `LinkContainer` when a link is
  configured.

Both `CardEditor` and `CardViewer` extend a shared base `Card`
(`src/runtime/components/card-base.tsx`) that centralizes the emotion `getStyle()` and
background-transparency helpers.

The actual nested widgets are rendered by ExB's layout engine via `LayoutEntry` /
`LayoutRuntimeEntry` (from `jimu-layouts/layout-runtime`) - the card only chooses which
layout id to hand to it per state.

## Key imports and packages

Grouped by source file.

`src/runtime/widget.tsx`:
- from `jimu-core`: `React`, `IMState`, `classNames`, `css`, `jsx`, `AllWidgetProps`,
  `IMThemeVariables`, `SerializedStyles`, `AppMode`, `BrowserSizeMode`, `appActions`,
  `IMAppConfig`, `getAppStore`, `ReactResizeDetector`, `defaultMessages as jimuUIMessages`,
  `lodash`, `IMUrlParameters`, `utils`
- from `jimu-ui`: `WidgetPlaceholder`, `Paper`
- from `jimu-layouts/layout-runtime`: `LayoutEntry`, `searchUtils`, `LayoutItemSizeModes`
- local: `../config` (`IMConfig`, `Status`, `ElementSize`), `./components/card-editor`,
  `./components/card-viewer`, `./translations/default`

`src/runtime/components/card-content.tsx`:
- from `jimu-core`: `jsx`, `React`, `css`, `AppMode`, `classNames`, `BrowserSizeMode`,
  `getTransition`, `motion`, `LinkType`, `TransitionType`, `TransitionDirection`, and types
  `ImmutableObject`, `UrlParameters`, `IMLinkParam`, `IMThemeVariables`
- from `jimu-ui`: `styleUtils`
- from `jimu-layouts/layout-runtime`: `LayoutEntry as LayoutRuntimeEntry`
- from `jimu-ui/advanced/link-container`: `LinkContainer`
- local: `../../config`, `../utils/utils` (`initBackgroundStyle`, `getBorderRadius`)

`src/runtime/components/card-editor.tsx`:
- from `jimu-core`: `React`, `jsx`, `css`, `IMThemeVariables`, `AppMode`, `LayoutInfo`,
  `LayoutItemType`, `appActions`, `Immutable`, `ImmutableArray`, `ReactRedux`, `IMState`,
  `motion`, `getTransition`, `IMWidgetJson`
- from `jimu-ui`: `styleUtils`
- from `jimu-layouts/layout-runtime`: `searchUtils`
- from `jimu-for-builder`: `AppConfigAction` (type)
- from `jimu-icons/outlined/editor/sync-on` and `.../sync-off`: `SyncOnOutlined`, `SyncOffOutlined`
- local: `../../config`, `./my-dropdown`, `./card-base`, `../utils/utils`

`src/runtime/builder-support.tsx`:
- from `jimu-core`: `LayoutInfo`, `getAppStore`, `React`, `BrowserSizeMode`
- from `jimu-core/dnd`: `interact`
- from `jimu-ui`: `ButtonGroup`, `Button`, `Popper`
- from `jimu-layouts/layout-runtime`: `searchUtils`
- from `jimu-for-builder`: `getAppConfigAction`, `ContentServiceWrapper`,
  `LayoutServiceProvider`, `widgetService`
- from `jimu-layouts/layout-builder`: `GLOBAL_DRAGGING_CLASS_NAME`,
  `GLOBAL_RESIZING_CLASS_NAME`, `GLOBAL_H5_DRAGGING_CLASS_NAME`
- from `jimu-theme`: `withBuilderTheme`
- local: `./components/my-dropdown`

`src/tools/app-config-operations.ts`:
- from `jimu-core`: types `extensionSpec`, `IMAppConfig`, `DuplicateContext`
- from `jimu-ui`: `utils` (uses `utils.mapLinkParam`)
- local: `../config`

`src/setting/setting.tsx`:
- from `jimu-core`: `React`, `classNames`, `IMState`, `IMAppConfig`, `IMThemeVariables`,
  `SerializedStyles`, `css`, `jsx`, `AppMode`, `BrowserSizeMode`, `appConfigUtils`,
  `getAppStore`, `polished`, `AnimationSetting`, `LayoutInfo`, `Immutable`, `LayoutType`,
  `Size`, `appActions`, `getNextAnimationId`, `lodash`,
  `defaultMessages as jimuCoreDefaultMessages`, `focusElementInKeyboardMode`, `IMLinkParam`
- from `jimu-for-builder`: `AllWidgetSettingProps`, `getAppConfigAction`, `builderAppSync`,
  `templateUtils`, `widgetService`, `AppConfigAction`
- from `jimu-layouts/layout-runtime`: `searchUtils`, `defaultMessages as jimuLayoutsDefaultMessages`
- from `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`,
  `LinkSelector`, `SwitchCardLayoutOption` (type), `setLayoutAuto`, `CardLayoutSetting`
- from `jimu-ui/advanced/style-setting-components`: `BackgroundSetting`, `BorderSetting`,
  `BoxShadowSetting`, `BorderRadiusSetting`, `TransitionSetting`, `BorderSide` (type)
- from `jimu-ui`: `Switch`, `Icon`, `Button`, `defaultMessages as jimuUIDefaultMessages`,
  `Tooltip`, `CollapsablePanel`, `BorderStyle`
- from `jimu-for-builder/templates`: `Template` (type)
- from `jimu-icons/outlined/suggested/info`: `InfoOutlined`
- from `jimu-theme`: `colorUtils`, `getTheme2`

Note on the specific packages the template called out:
- `jimu-layouts/layout-runtime` provides `LayoutEntry`, `searchUtils`, and
  `LayoutItemSizeModes` (used for the embedded layout + auto-size detection).
- `ReactResizeDetector` comes from `jimu-core` (re-exported), used on the widget root.
- `appActions` + `getAppStore` come from `jimu-core` and are used for widget-state
  dispatch and reading `appConfig`.

## Reusable patterns found

### Embedded layout via LayoutEntry
The card never lays out children itself. It stores per-state embedded layouts and hands a
layout id to the layout engine:
- Runtime: `CardContent` calls `LayoutRuntimeEntry` (`<LayoutEntry layouts={layouts} />`),
  or the builder-provided `LayoutEntry` when `isInBuilder && appMode === AppMode.Express`.
- Design: `CardEditor.renderCardEditor` renders `<LayoutEntry ... isRepeat isInWidget />`
  for both the regular and hover layouts.

The layout objects come from `props.layouts[Status.Default]` and
`props.layouts[Status.Hover]` (`Status` enum in `src/config.ts`).

### DEFAULT + HOVER layouts (two-state faces)
Manifest declares two FIXED layouts (`DEFAULT`, `HOVER`). The widget keeps a
`builderStatus` (which face the author is editing) in Redux widget state and a
`config.HOVER.enable` flag. When hover is disabled, only the DEFAULT face is rendered.

### Responsive sizing with ReactResizeDetector
`src/runtime/widget.tsx` wraps the card body with:
```tsx
<ReactResizeDetector targetRef={this.widgetConRef} handleWidth handleHeight onResize={this.debounceOnResize} />
```
`onResize` is a `lodash.debounce(..., 200)`; its only job is to temporarily hide the
card's floating builder tool (`hideCardTool`) so it does not float in a stale position
while resizing, then restore it after 500 ms (`updateCardToolPosition`). The widget also
tracks its parent layout element size and writes it into widget state
(`setListParentSizeInWidgetState`, using `utils.findViewportSize` and
`appActions.widgetStatePropChange(id, 'parentSize', ...)`).

### Card-layout switching (Auto vs Custom)
`CardLayout` enum in `src/config.ts` is `AUTO = 'Auto'` and `CUSTOM = 'Custom'`.
- When `cardLayout === CardLayout.AUTO`, the hover face reuses the regular layout
  (`hoverLayout = regularLayout`) instead of a separate `layouts[Status.Hover]`. See
  `card-content.tsx` `getCardContent` and `card-editor.tsx` `renderCardEditor`.
- The switching UI is `CardLayoutSetting` imported from
  `jimu-ui/advanced/setting-components` (NOT a local component), rendered inside the hover
  section of `setting.tsx` only when `appMode === AppMode.Design`.
- `setLayoutAuto` (also from `jimu-ui/advanced/setting-components`) is invoked via a
  `SwitchCardLayoutOption` object to force the layout back to Auto (for example when
  toggling hover on/off): see `setting.tsx` `setLayoutAuto` method.

### mapExtraStateProps (Redux -> props)
`Widget.mapExtraStateProps` (`src/runtime/widget.tsx`) is a rich example: it derives
`selectionIsSelf`, `selectionIsInSelf` (via `builderSupportModules.widgetModules.selectionInCard`),
`selectionStatus` (matching the selected layout id to DEFAULT/HOVER via
`searchUtils.findLayoutId`), `builderStatus`, RTL, auto width/height flags (from
`layoutSetting.autoProps` compared to `LayoutItemSizeModes.Auto`), and the widget's
builder bbox position.

### builder-support module (design-only code isolation)
`src/runtime/builder-support.tsx` exports a `widgetModules` object bundling builder-only
dependencies (`interact`, `searchUtils`, `getAppConfigAction`, `ContentServiceWrapper`,
`LayoutServiceProvider`, `widgetService`, dragging/resizing CSS class names, and
`withBuilderTheme`-wrapped `Popper`/`Button`/dropdown). Enabled by
`manifest.json` -> `properties.hasBuilderSupportModule: true`, it is injected as
`props.builderSupportModules` so the runtime bundle stays free of builder-only imports.
It also exposes selection helpers `selectionIsSelf` and `selectionInCard`.

### Whole-card link + link remap on copy
Runtime wraps content in `LinkContainer` (`jimu-ui/advanced/link-container`) using
`config.linkParam`. The `appConfigOperations` extension
(`src/tools/app-config-operations.ts`) implements `afterWidgetCopied` to remap the
link (`utils.mapLinkParam`) so duplicated cards keep valid internal links.

## Builder vs runtime split

- Root branch: `Widget.cardRender()` picks `CardEditor` when
  `window.jimuConfig.isInBuilder && appMode === AppMode.Design`, otherwise `CardViewer`.
- `LayoutEntry` source also branches: in builder, `this.state.LayoutEntry` is taken from
  `props.builderSupportModules.LayoutEntry`; at runtime it is the static
  `LayoutEntry` from `jimu-layouts/layout-runtime` (constructor in `widget.tsx`).
- `editWidgetConfig` is a no-op unless `window.jimuConfig.isInBuilder`; it uses
  `builderSupportModules.jimuForBuilderLib.getAppConfigAction()`.
- `CardEditor` is connected with `ReactRedux.connect` and, when not in builder / in Run
  mode, short-circuits to `{ selection: undefined }`.
- Settings panel (`setting.tsx`) has two top-level modes driven by
  `config.isItemStyleConfirm`: the **template picker** (`renderTemplate`, choose one of
  the 11 `card-styleN.json` presets) versus the **card settings** (`renderCardSetting`).
  Confirm/reset are `handleItemStyleConfirmClick` / `handleResetItemStyleClick`.
- Applying a template style is done in the builder via
  `widgetService.updateWidgetByTemplate(...)` then `_onItemStyleChange`, which sets
  `itemStyle`, clears `isItemStyleConfirm`, and marks `isInitialed`.

## Lifecycle and cleanup

- `Widget.componentDidUpdate` synchronizes design state: it aligns `builderStatus` to the
  current `selectionStatus`, resets to `Status.Default` when leaving Design mode, pushes
  selection/layout info into widget state, and repositions the floating tool when the
  widget moves (`top`/`left` change).
- `updateCardToolPosition` uses a `setTimeout` stored on `this.updateCardToolTimeout` and
  clears the prior timeout before scheduling a new one (basic self-cleanup). Note: it is
  cleared/reset inside the method but there is no `componentWillUnmount` clearing it in
  `widget.tsx` (UNVERIFIED whether a leftover timer can fire after unmount).
- `debounceOnResize` is created once with `lodash.debounce(..., 200)` in the constructor.
- `CardViewer` / `CardEditor` regenerate animation ids (`getNextAnimationId`) when
  `transitionInfo.previewId` changes, to replay the transition preview in settings.
- `CardContent` uses `useEffect` keyed on `transitionInfo.previewId` to trigger the
  preview animation state machine (`default` -> `ready` -> `go` -> `default`).

## Manifest/config requirements

`manifest.json` key fields:
- `name: "card"`, `type: "widget"`, `version`/`exbVersion` `1.20.0`
- `defaultSize`: `{ width: 300, height: 405 }`
- `properties`:
  - `hasEmbeddedLayout: true` - hosts nested layouts
  - `canCrossLayoutBoundary: true`
  - `coverLayoutBackground: true`
  - `supportAutoSize: false`
  - `useDragHandler: true`
  - `useOwnBorder: true`
  - `hasBuilderSupportModule: true` - enables `builder-support.tsx`
  - `flipIcon: false`
- `layouts`: two entries, `DEFAULT` and `HOVER`, both `type: "FIXED"`
- `extensions`: one `appConfigOperations` extension at point
  `APP_CONFIG_OPERATIONS`, uri `tools/app-config-operations`

`src/config.ts` `Config` shape (stored as `IMConfig`):
- `builderStatus: Status` - which face is being edited (`DEFAULT` / `HOVER`)
- `itemStyle?: ItemStyle` - one of `STYLE0`..`STYLE10`; absent -> widget shows placeholder
- `style?: { id }`
- `linkParam?: IMLinkParam` - whole-card link
- `isItemStyleConfirm?: boolean` - settings mode gate (picker vs settings)
- `isInitialed?: boolean`
- `isOpenAdvabceSetting?: boolean` (spelling as-is in source)
- `REGULAR: IMCardConfig` and `HOVER: IMCardConfig` - each `{ backgroundStyle, enable }`
- `direction?: Direction`
- `transitionInfo?: TransitionInfo` - `{ transition, oneByOneEffect, previewId }`
- `cardLayout?: CardLayout` - `AUTO` or `CUSTOM`

Note: enums here are `Status.Default = 'DEFAULT'`, `Status.Hover = 'HOVER'`; config keys
for the two card states are the string constants `REGULAR` and `HOVER` in the `Config`
interface, but code frequently indexes with `Status.Default`/`Status.Hover`
(`'DEFAULT'`/`'HOVER'`). UNVERIFIED: reconcile `REGULAR` (config interface) vs
`Status.Default` (`'DEFAULT'`) indexing used in `card-viewer`/`card-content`/`card-editor`;
in the ACTUAL runtime code `cardConfigs[Status.Default]` is used, implying the effective
key is `'DEFAULT'` rather than `'REGULAR'`.

## Gotchas

- **CardLayoutSetting is external.** Despite the widget owning DEFAULT/HOVER layouts, the
  layout-switch UI (`CardLayoutSetting`) and `setLayoutAuto` come from
  `jimu-ui/advanced/setting-components`, not a local `card-layout-setting` file. Do not
  look for it under the widget source.
- **Two render trees, easy to edit the wrong one.** Behavior in the running app lives in
  `card-viewer.tsx` + `card-content.tsx`; behavior in the builder canvas lives in
  `card-editor.tsx`. A change must often be mirrored in both.
- **Auto layout reuse.** When `cardLayout === CardLayout.AUTO`, the hover face silently
  reuses the regular layout id. Editing "hover layout" content in Auto mode edits the
  regular layout.
- **Builder-only imports must stay in builder-support.** Anything from
  `jimu-for-builder` / `jimu-layouts/layout-builder` should be reached through
  `props.builderSupportModules`, not imported directly into the runtime bundle
  (except type-only imports like `AppConfigAction`).
- **`config.itemStyle` absence -> placeholder.** `widget.tsx render()` returns a
  `WidgetPlaceholder` when `itemStyle` is unset, so a freshly added card renders nothing
  until a template style is chosen and confirmed.
- **Transition defaults.** `card-content.tsx` forces a `Fade` transition with duration 0
  when none is configured, otherwise hover state switching would not animate. Setting
  duration wrong (0 vs `DEFAULT_DURATION` 0.5) is handled in `getDefaultTransition`.
- **Config typo.** `isOpenAdvabceSetting` (misspelled) is the real config key; match it
  exactly.
- **Timer not cleared on unmount.** `updateCardToolTimeout` (`widget.tsx`) is managed
  inside `updateCardToolPosition` but there is no unmount clear; avoid assuming it is torn
  down. (UNVERIFIED impact.)

## Useful snippets and functions

Source: `src/runtime/widget.tsx` (branch between editor and viewer):
```tsx
cardRender = () => {
  const props = this.getCardProps()
  const { appMode } = this.props
  const isEditor = window.jimuConfig.isInBuilder && appMode === AppMode.Design
  const Card = isEditor ? CardEditor : CardViewer
  return <Card {...props} />
}
```

Source: `src/runtime/widget.tsx` (choose LayoutEntry source at construction):
```tsx
if (window.jimuConfig.isInBuilder) {
  stateObj.LayoutEntry = this.props.builderSupportModules.LayoutEntry
} else {
  stateObj.LayoutEntry = LayoutEntry
}
```

Source: `src/runtime/widget.tsx` (resize detector + debounce):
```tsx
this.debounceOnResize = lodash.debounce(
  ({ width, height }) => { this.onResize(width, height) },
  200
)
// ...
<ReactResizeDetector
  targetRef={this.widgetConRef}
  handleWidth
  handleHeight
  onResize={this.debounceOnResize}
/>
```

Source: `src/runtime/widget.tsx` (write parent layout size into widget state):
```tsx
setListParentSizeInWidgetState = () => {
  const { browserSizeMode, id, parentSize, layoutId } = this.props
  const appConfig = getAppStore().getState().appConfig
  const viewportSize = utils.findViewportSize(appConfig, browserSizeMode)
  const selector = `div.layout[data-layoutid=${layoutId}]`
  const parentElement = document.querySelector(selector)
  const newParentSize = {
    width: parentElement?.clientWidth || viewportSize.width,
    height: parentElement?.clientHeight || viewportSize.height
  }
  if (!parentSize || parentSize.height !== newParentSize.height || parentSize.width !== newParentSize.width) {
    this.props.dispatch(appActions.widgetStatePropChange(id, 'parentSize', newParentSize))
  }
}
```

Source: `src/runtime/components/card-content.tsx` (pick builder vs runtime LayoutEntry):
```tsx
const renderLayoutEntry = React.useCallback((layouts) => {
  const useBuilderLayoutEntry = isInBuilder && appMode === AppMode.Express
  if (useBuilderLayoutEntry) {
    return (<LayoutEntry layouts={layouts} isInWidget />)
  } else {
    return (<LayoutRuntimeEntry layouts={layouts} />)
  }
}, [isInBuilder, appMode, LayoutEntry])
```

Source: `src/runtime/components/card-content.tsx` (Auto layout reuses regular layout for hover):
```tsx
if (isHoverEnable) {
  hoverLayout = cardLayout === CardLayout.AUTO ? regularLayout : layouts[Status.Hover]
  hoverBgStyle = getBackgroundStyle(Status.Hover)
  hoverBorderRadius = getBorderRadius(Status.Hover)
}
```

Source: `src/runtime/components/card-content.tsx` (whole-card link wrapper):
```tsx
<LinkContainer
  linkParam={linkParam}
  appMode={appMode}
  queryObject={queryObject}
>
  {/* ...motion faces... */}
</LinkContainer>
```

Source: `src/runtime/builder-support.tsx` (builder-only module bundle):
```tsx
const widgetModules = {
  ButtonGroup, interact, searchUtils, getAppConfigAction,
  ContentServiceWrapper, LayoutServiceProvider, widgetService,
  GLOBAL_DRAGGING_CLASS_NAME, GLOBAL_RESIZING_CLASS_NAME, GLOBAL_H5_DRAGGING_CLASS_NAME,
  withBuilderTheme,
  BuilderDropDown: withBuilderTheme((props: MyDropdownProps) => {
    return <MyDropDown {...props} withBuilderTheme={withBuilderTheme} />
  }),
  BuilderPopper: withBuilderTheme(Popper),
  BuilderButton: withBuilderTheme(Button),
  // selection helpers ...
}
```

Source: `src/runtime/builder-support.tsx` (is a selection inside this card):
```tsx
selectionInCard: (layoutInfo, id, appConfig, useCurrentSizeMode = true) => {
  if (!layoutInfo || !layoutInfo.layoutItemId || !layoutInfo.layoutId) return false
  const layoutItems = searchUtils.getRelatedLayoutItemsInWidgetByLayoutInfo(
    appConfig, layoutInfo, id, getAppStore().getState().browserSizeMode
  )
  return layoutItems.length > 0 && !!layoutItems?.[0]
}
```

Source: `src/tools/app-config-operations.ts` (remap card link when duplicated):
```ts
afterWidgetCopied (sourceWidgetId, sourceAppConfig, destWidgetId, destAppConfig, contentMap?) {
  let newAppConfig = destAppConfig
  const widgetConfig = newAppConfig.widgets[destWidgetId].config as IMConfig
  if (!contentMap || !widgetConfig?.linkParam) return destAppConfig
  const sourceWidgetJson = sourceAppConfig?.widgets?.[sourceWidgetId]
  const { linkParam, isChanged } = utils.mapLinkParam(contentMap, widgetConfig?.linkParam, sourceWidgetJson)
  if (isChanged && linkParam) {
    newAppConfig = newAppConfig.setIn(['widgets', destWidgetId, 'config', 'linkParam'], linkParam)
  }
  return newAppConfig
}
```

Source: `src/setting/setting.tsx` (settings top-level mode: template picker vs card settings):
```tsx
{!config.isItemStyleConfirm
  ? (this.renderTemplate())
  : (<Fragment>{this.renderCardSetting()}</Fragment>)}
```

Source: `src/setting/setting.tsx` (force Auto layout via jimu-ui setLayoutAuto):
```tsx
setLayoutAuto = (newConfig: IMConfig, status = Status.Hover) => {
  const { layouts, appConfig, id } = this.props
  const option: SwitchCardLayoutOption = {
    layout: CardLayout.AUTO,
    config: newConfig,
    widgetId: id,
    appConfig: appConfig,
    status: Status.Hover,
    isCardWidget: true,
    layouts: layouts?.asMutable({ deep: true }),
    mainSizeMode: appConfig.mainSizeMode
  }
  setLayoutAuto(option)
}
```

Source: `src/setting/setting.tsx` (CardLayoutSetting is from jimu-ui, rendered in hover section):
```tsx
{appMode === AppMode.Design && <CardLayoutSetting
  id={id}
  onSettingChange={onSettingChange}
  cardLayout={config.cardLayout}
  status={Status.Hover}
  browserSizeMode={browserSizeMode}
  mainSizeMode={appConfig.mainSizeMode}
  layouts={layouts}
  config={config}
  appConfig={appConfig}
  isCardWidget
/>}
```

Source: `src/setting/setting.tsx` (apply a template style in the builder):
```tsx
widgetService.updateWidgetByTemplate(
  appConfig, styleTemp, id, styleTemp.widgetId, allBrowserSizeMode, {}
).then((newAppConfig) => {
  this._onItemStyleChange(newAppConfig, style)
})
```
