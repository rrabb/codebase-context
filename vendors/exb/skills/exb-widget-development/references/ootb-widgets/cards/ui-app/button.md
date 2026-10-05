# OTB Widget: common/button

Online widget doc: https://developers.arcgis.com/experience-builder/guide/button-widget/

## Purpose

The Button widget renders a single interactive UI element (text, icon, or a
composition of both) that can:

- Trigger a link action (web address, view/edit data record, message action, etc.) via `LinkParam`/`Link`.
- Publish a `BUTTON_CLICK` framework message that other widgets can react to (message action wiring).
- Show a tooltip, an optional leading/trailing icon, and either a theme "quick style" or a fully custom (regular + hover) style.
- Bind its text, tooltip, and URL to data via Arcade/attribute expressions when a data source is enabled.
- Apply conditional (dynamic) styles driven by data, for both regular and hover states.

It is `supportRepeat: true`, so it is commonly used as a repeated element inside List/other repeated containers, which is why it carries repeated-data-source and dynamic-style-preview logic.

## Source paths inspected

Source root (gitignored; read with includeIgnoredFiles): `ArcGISExperienceBuilder/client/dist/widgets/common/button/`

- [manifest.json](../../../../../../ArcGISExperienceBuilder/client/dist/widgets/common/button/manifest.json)
- `config.json` (default config)
- `src/config.ts` (config typings)
- `src/runtime/widget.tsx`
- `src/runtime/builder-support.tsx`
- `src/tools/quick-style.tsx`
- `src/tools/app-config-operations.ts`
- `src/tools/builder-operations.ts`
- `src/setting/setting.tsx`
- `src/setting/components/advance-collapse.tsx`

Ignored per instructions: `dist/` and `tests/`.

## Architecture overview

Three cooperating layers plus registered extensions:

1. Runtime (`src/runtime/widget.tsx`) - a class `Widget extends React.PureComponent<AllWidgetProps<IMConfig> & ExtraProps, State>`. It builds a `Link` element (`getLinkComponent`), resolves expressions through hidden `ExpressionResolverComponent` instances, resolves conditional styles through `DynamicStyleResolverComponent`, and publishes `ButtonClickMessage` on click. `mapExtraStateProps` pulls builder-selection, app mode, RTL, browser size, and dynamic-style preview state from the redux store.
2. Builder support (`src/runtime/builder-support.tsx` + `src/tools/*`) - quick-style context tool, app-config operations (data-source change cleanup, copy remapping), and builder operations (translation key extraction).
3. Settings (`src/setting/setting.tsx`) - data source selector, link selector, tooltip/text/icon/position rows, and an advanced custom-style section (regular/hover tabs) gated by `AdvanceCollapse`.

The config is split into `functionConfig` (behavior: text/tooltip/icon/link/expressions) and `styleConfig` (theme quick style vs custom regular/hover styles, including dynamic style configs).

## Key imports and packages

Grouped by source file, with the notable ones called out.

Runtime `src/runtime/widget.tsx`:

- from `jimu-core`: `React`, `LinkType`, `AllWidgetProps`, `ExpressionPartType`, `ExpressionResolverErrorCode`, `LinkResult`, `IMExpression`, `jsx`, `ExpressionResolverComponent`, `Immutable`, `IMState`, `AppMode`, `css`, `IMIconProps`, `SerializedStyles`, `getAppStore`, `IMUrlParameters`, `BrowserSizeMode`, `MessageManager`, `ButtonClickMessage`, `LinkTarget`, `DynamicStyleResolverComponent`, `IMDynamicStyle`, `ImmutableObject`, `DynamicStyle`, `RepeatedDataSource`, `DynamicStyleState`, `appActions`, `DynamicStyleWidgetPreviewRepeatedRecordInfo`.
- from `jimu-ui`: `styleUtils`, `Link`, `LinkProps`, `Icon`, `DistanceUnits`, `defaultMessages as jimuUiDefaultMessages`, `Popper`, `ShiftOptions`, `FlipOptions`.
- from `jimu-theme`: `getThemeModule`, `mapping` (used as `mapping.whetherIsNewTheme(...)`).
- local: `../config` (`IMConfig`, `IconPosition`, `IMWidgetState`, `AdvanceStyleSettings`, `IconConfig`), `./style` (`getPoperStyle`, `getStyle`), `../version-manager` (`versionManager`).

Config `src/config.ts`:

- from `jimu-core` (types): `ImmutableObject`, `Expression`, `ThemeButtonType`, `IconProps`, `IconResult`, `LinkParam`, `DynamicStyleConfig`.
- from `jimu-ui` (types): `StyleSettings`.

Setting `src/setting/setting.tsx`:

- from `jimu-core`: `React`, `jsx`, `Immutable`, `ImmutableArray`, `ExpressionPartType`, `IMIconResult`, `IMExpression`, `UseDataSource`, `expressionUtils`, `defaultMessages as jimuCoreMessages`, `LinkType`, `Expression`, `IconResult`, `IMLinkParam`, `css`, `DataSourceTypes`, `dynamicStyleUtils`.
- from `jimu-for-builder`: `AllWidgetSettingProps`, `builderAppSync`.
- from `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`, `LinkSelector`.
- from `jimu-ui/advanced/resource-selector`: `IconPicker`.
- from `jimu-ui`: `TextInput`, `Select`, `Tabs`, `Tab`, `defaultMessages`.
- from `jimu-ui/advanced/data-source-selector`: `DataSourceSelector`.
- from `jimu-ui/advanced/expression-builder`: `ExpressionInput`, `ExpressionInputType`.
- local: `../config`, `./style`, `./components/advance-style-setting`, `./components/advance-collapse`.

Tools:

- `app-config-operations.ts` from `jimu-core`: `dataSourceUtils`, `DuplicateContext`, `dynamicStyleUtils`, `expressionUtils`, `extensionSpec`, `IMAppConfig`, `Immutable`; from `jimu-ui`: `utils` (`utils.mapLinkParam`).
- `builder-operations.ts` from `jimu-core`: `configTranslationUtils`, `Expression`, `extensionSpec`, `IMAppConfig`.
- `quick-style.tsx` from `jimu-core`: `extensionSpec`, `appActions`, `getAppStore`, `LayoutContextToolProps`, `i18n`, `BrowserSizeMode`; from `jimu-for-builder`: `appBuilderSync`, `builderAppSync`; icon from `jimu-icons/svg/outlined/editor/brush.svg`.

## Reusable patterns found

- Publishing a framework message on click. `onClick` sets `e.exbEventType = 'linkClick'` then
  `MessageManager.getInstance().publishMessage(new ButtonClickMessage(this.props.id))`. The widget declares `"publishMessages": ["BUTTON_CLICK"]` in the manifest so other widgets can subscribe via message actions.
- `LinkParam` -> `Link` mapping. `getLinkComponent` reads `config.functionConfig.linkParam`, maps `openType` to `target`, and builds a `LinkResult { linkType, value }`. For `LinkType.WebAddress` the value comes from resolved state (`this.state.url`); other link types use `linkParam.value` plus `this.props.queryObject`.
- Dual hidden-resolver render for expressions. Three `ExpressionResolverComponent` instances (text, tooltip, url) render inside a `display: none` wrapper and push results into state via `onChange` handlers, with `onLoading`/`onLoaded` toggling a per-expression loading flag that disables the button.
- Dynamic (conditional) style resolution. Two `DynamicStyleResolverComponent` instances (regular + hover) read `config.styleConfig.customStyle.<state>.dynamicStyleConfig` and update `regularDynamicStyles`/`hoverDynamicStyles` state, which are then merged into the computed style via `getMixinStyleSettings` and `styleUtils.mixinBorderWithDynamicStyle` / `mixinBorderRadiusWithDynamicStyle`.
- `mapExtraStateProps` bridging redux to props. Static `mapExtraStateProps(state, ownProps)` computes builder selection (`active`), `appMode`, `queryObject`, `isRTL`, `browserSizeMode`, widget `uri`, `dynamicStyleState`, and `isDynamicActive` from the store.
- Quick-style vs custom style. `getWhetherUseQuickStyle` checks `styleConfig.themeStyle.quickStyleType`; when custom is enabled it computes `regular`/`hover` CSS via `styleUtils.toCSSStyle` and passes `customStyle={{ style, hoverStyle }}` to `Link`.
- New-theme detection. `mapping.whetherIsNewTheme(getThemeModule(theme?.uri))` gates classic-vs-new link text-decoration handling.
- App-config operation extensions for lifecycle correctness: `useDataSourceWillChange` remaps or strips expressions and dynamic styles when the bound data source changes; `afterWidgetCopied` remaps `linkParam` (`utils.mapLinkParam`), text/tooltip expressions (`expressionUtils.mapExpression`), and dynamic style configs when a page is copied.
- Builder-operations translation extraction: `getTranslationKey` emits translation keys for tooltip/text and their expressions so authored strings are localizable.

## Builder vs runtime split

- Runtime-only: `widget.tsx` (rendering, message publish, expression/dynamic-style resolution).
- Builder/settings-only: `setting.tsx`, `advance-collapse.tsx`, `advance-style-setting/`, and the three registered extensions in `src/tools/` (quick-style context tool, app-config operations, builder operations). `manifest.json` sets `"hasBuilderSupportModule": true` and registers the extensions under `extensions[]` with points `CONTEXT_TOOL`, `APP_CONFIG_OPERATIONS`, `BUILDER_OPERATIONS`.
- Cross-boundary sync: the quick-style tool uses `builderAppSync` / `appBuilderSync` to open a side panel on small screens; `setting.tsx` uses `builderAppSync.publishChangeWidgetStatePropToApp` to toggle the runtime `isConfiguringHover` widget state so the builder preview can display the hover style.

## Lifecycle and cleanup

Runtime (`widget.tsx`):

- `constructor` seeds `State` from config (text/tooltip/url and, when data is enabled, the text/tip/url expressions).
- `componentDidUpdate` re-syncs state when `config` or `useDataSourcesEnabled` changes; when `isDynamicActive` turns on for a repeated instance it dispatches `appActions.changeDynamicStylePreviewRepeatedRecordInfo(...)` so the List updates the preview record index.
- No `componentWillUnmount` in the runtime; the hidden resolver components manage their own subscriptions.

Setting (`setting.tsx`):

- `componentDidUpdate` re-syncs local `currentTextInput`/`currentTipInput` when not using a data source.
- `componentWillUnmount` calls `builderAppSync.publishChangeWidgetStatePropToApp({ widgetId, propKey: 'isConfiguringHover', value: false })` to clear the preview-hover flag when leaving the panel.

## Manifest/config requirements

From `manifest.json`:

- `"hasSettingPage": true`, `"supportRepeat": true`, `"canCrossLayoutBoundary": true`, `"coverLayoutBackground": true`, `"useOwnBorder": true`, `"hasBuilderSupportModule": true`.
- `"defaultSize": { "width": 220, "height": 50 }`.
- `"publishMessages": ["BUTTON_CLICK"]` - required for the click-message action wiring.
- `extensions[]` registers three modules: `quick-style` (`CONTEXT_TOOL`, uri `tools/quick-style`), `appConfigOperations` (`APP_CONFIG_OPERATIONS`, uri `tools/app-config-operations`), `builderOperations` (`BUILDER_OPERATIONS`, uri `tools/builder-operations`).

Default `config.json`:

```json
{
  "functionConfig": {},
  "styleConfig": {
    "themeStyle": {
      "quickStyleType": "default"
    }
  }
}
```

Config shape (`src/config.ts`): `Config { functionConfig: FunctionConfig; styleConfig?: StyleConfig }`. `FunctionConfig` holds `toolTip`, `text`, `icon` (`IconConfig { data, position }`), `customIcons`, `textExpression`, `toolTipExpression`, `linkParam`. `StyleConfig` holds `useCustom`, `themeStyle { quickStyleType }`, and `customStyle { regular, hover }` where each state is an `AdvanceStyleSettings` (extends `StyleSettings`) with `iconProps`, `enableDynamicStyle`, `dynamicStyleConfig`.

## Gotchas

- `functionConfig.text` uses `typeof ... === 'string'` checks throughout because an empty string is a valid, meaningful value distinct from "unset" (which falls back to the localized `variableButton` default).
- Enabling custom style is a toggle that mutates config structure: `toggleUseCustom` sets `styleConfig.useCustom` and, when turning on, seeds empty `customStyle.regular` / `customStyle.hover`; when turning off it removes `customStyle` entirely and resets dynamic styles.
- Switching data-source usage rewrites config: `onToggleUseDataEnabled` moves between literal `text`/`toolTip` and `textExpression`/`toolTipExpression`, and for `LinkType.WebAddress` swaps `linkParam.value` and `linkParam.expression`. Do not assume both literal and expression fields coexist.
- Link value source depends on link type: only `LinkType.WebAddress` reads the resolved `state.url`; other link types read `linkParam.value` and must pass `queryObject`.
- Repeated + dynamic style: `isWidgetDynamicActive` returns false when the preview record index does not match the repeated record index, preventing the wrong repeated instance from showing the conditional-style preview `Popper`.
- Classic vs new theme link styling requires different `textDecoration` handling (`!important` overrides vs `textDecorationLine`/`textDecorationStyle`); guard with `mapping.whetherIsNewTheme`.
- The button root `div` handles both `onClick` and keyboard (`Enter`/space via `onKeyUp`) - both paths route through `onClick` which publishes the message.
- The quick-style context tool renders in a side panel only when `browserSizeMode === BrowserSizeMode.Small`; otherwise it returns the setting panel component.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` (click publishes BUTTON_CLICK via MessageManager)

```tsx
onClick = e => {
  e.exbEventType = 'linkClick'
  MessageManager.getInstance().publishMessage(
    new ButtonClickMessage(this.props.id)
  )
}
```

Source: `src/runtime/widget.tsx` (mapExtraStateProps bridging redux -> props)

```tsx
static mapExtraStateProps = (state: IMState, ownProps: AllWidgetProps<IMConfig>): ExtraProps => {
  let selected = false
  const selection = state.appRuntimeInfo.selection
  if (selection && state.appConfig.layouts[selection.layoutId]) {
    const layoutItem = state.appConfig.layouts[selection.layoutId].content[selection.layoutItemId]
    selected = layoutItem && layoutItem.widgetId === ownProps.id
  }
  const isInBuilder = state.appContext.isInBuilder
  const active = isInBuilder && selected
  const isDynamicActive = typeof state.dynamicStyleState?.previewConditionInfo?.[ownProps.id]?.conditionId === 'number'
  return {
    active,
    appMode: state.appRuntimeInfo.appMode,
    queryObject: state.queryObject,
    isRTL: state.appContext.isRTL,
    browserSizeMode: state.browserSizeMode,
    uri: state.appConfig.widgets[ownProps.id]?.uri,
    dynamicStyleState: state.dynamicStyleState,
    isDynamicActive,
  }
}
```

Source: `src/runtime/widget.tsx` (LinkParam -> LinkResult mapping)

```tsx
let queryObject
let target: LinkTarget
let linkTo: LinkResult
if (linkParam && linkParam.linkType) {
  target = linkParam.openType
  linkTo = {
    linkType: linkParam.linkType
  } as LinkResult

  if (linkParam.linkType === LinkType.WebAddress) {
    linkTo.value = this.state.url
  } else {
    linkTo.value = linkParam.value
    queryObject = this.props.queryObject
  }
}
```

Source: `src/runtime/widget.tsx` (dual render: hidden ExpressionResolverComponent + DynamicStyleResolverComponent)

```tsx
{
  isDataSourceUsed &&
  <div>
    <ExpressionResolverComponent useDataSources={this.props.useDataSources} expression={this.state.textExpression}
      onChange={this.onTextExpResolveChange} widgetId={this.props.id}
      onLoading={() => { this.onArcadeLoadingChange('text') }}
      onLoaded={() => { this.onArcadeLoadingChange('text', false) }}
    />
    {/* tooltip and url resolvers follow the same pattern */}
  </div>
}
<DynamicStyleResolverComponent
  widgetId={this.props.widgetId}
  useDataSources={this.props.useDataSources}
  dynamicStyleConfig={this.props.config?.styleConfig?.customStyle?.regular?.dynamicStyleConfig}
  onChange={this.onRegularDynamicStyleChange}
/>
<DynamicStyleResolverComponent
  widgetId={this.props.widgetId}
  useDataSources={this.props.useDataSources}
  dynamicStyleConfig={this.props.config?.styleConfig?.customStyle?.hover?.dynamicStyleConfig}
  onChange={this.onHoverDynamicStyleChange}
/>
```

Source: `src/runtime/widget.tsx` (mixing dynamic style into border/borderRadius)

```tsx
getMixinStyleSettings = (dynamicStyleConfig: ImmutableObject<DynamicStyle>, advanceStyle: ImmutableObject<AdvanceStyleSettings>): AdvanceStyleSettings => {
  const advanceStyleWithoutIcon: AdvanceStyleSettings = advanceStyle?.without('iconProps').without('dynamicStyleConfig').without('enableDynamicStyle').asMutable({ deep: true }) || {}
  const dynamicStyle = dynamicStyleConfig?.without('icon').asMutable({ deep: true })

  if (dynamicStyle?.border) {
    dynamicStyle.border = styleUtils.mixinBorderWithDynamicStyle(dynamicStyle?.border, advanceStyleWithoutIcon)
    Object.assign(dynamicStyle, dynamicStyle.border)
    const borderProps = ['border', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom']
    borderProps.forEach(prop => delete advanceStyleWithoutIcon[prop])
  }
  if (dynamicStyle?.borderRadius) {
    dynamicStyle.borderRadius = styleUtils.mixinBorderRadiusWithDynamicStyle(dynamicStyle?.borderRadius, advanceStyleWithoutIcon.borderRadius)
    delete advanceStyleWithoutIcon.borderRadius
  }
  let mixinStyleSettings: AdvanceStyleSettings = null
  if (dynamicStyle) {
    mixinStyleSettings = Immutable(advanceStyleWithoutIcon).merge(Immutable(dynamicStyle), { deep: true }).asMutable({ deep: true })
  }
  return mixinStyleSettings
}
```

Source: `src/tools/app-config-operations.ts` (remap linkParam + expressions after a page copy)

```ts
afterWidgetCopied (
  sourceWidgetId: string,
  sourceAppConfig: IMAppConfig,
  destWidgetId: string,
  destAppConfig: IMAppConfig,
  contentMap?: DuplicateContext
): IMAppConfig {
  if (!contentMap) { // no need to change widget linkage if it is not performed during a page copying
    return destAppConfig
  }
  let newAppConfig = destAppConfig
  const widgetJson = sourceAppConfig.widgets[sourceWidgetId]
  const config: IMConfig = widgetJson?.config
  const originlinkParam = config.functionConfig.linkParam
  const { linkParam, isChanged } = utils.mapLinkParam(contentMap, originlinkParam, widgetJson)
  if (isChanged) {
    newAppConfig = newAppConfig.setIn(['widgets', destWidgetId, 'config', 'functionConfig', 'linkParam'], linkParam)
  }
  // text / tooltip expressions and dynamic style configs are remapped similarly
  return newAppConfig
}
```

Source: `src/tools/quick-style.tsx` (context tool that opens a side panel on small screens)

```tsx
onClick (props: LayoutContextToolProps) {
  const widgetId = props.layoutItem.widgetId
  const state = this.getAppState()
  const browserSizeMode = state.browserSizeMode
  if (browserSizeMode === BrowserSizeMode.Small) {
    this.isOpenInSidePanel = !this.isOpenInSidePanel
    const onClose = () => {
      this.isOpenInSidePanel = false
      this.widgetToolbarStateChange(widgetId)
    }
    appBuilderSync.publishSidePanelToApp({
      type: 'buttonQuickStyle',
      widgetId,
      uri: 'widgets/common/button/',
      onClose,
      active: this.isOpenInSidePanel
    })
  }
}
```

Source: `src/setting/components/advance-collapse.tsx` (Switch-gated Collapse wrapper)

```tsx
render () {
  return (
    <div className='w-100'>
      <Label className='collapse-label title3 hint-default mb-2 d-flex justify-content-between align-items-center'>
        {this.props.title}
        <Switch name='open-collapse' onChange={this.props.toggle} checked={this.props.isOpen} />
      </Label>
      <Collapse isOpen={this.props.isOpen}>
        {
          this.props.isOpen && this.props.children
        }
      </Collapse>
    </div>
  )
}
```

Source: `src/setting/setting.tsx` (toggle custom style on/off and reset dynamic style)

```tsx
toggleUseCustom = () => {
  let config = this.props.config
  let dynamicStyleUseDataSources
  config = config.setIn(['styleConfig', 'useCustom'], !config.getIn(['styleConfig', 'useCustom']))
  if (config.getIn(['styleConfig', 'useCustom'])) {
    config = config.setIn(['styleConfig', 'customStyle', 'hover'], {})
    config = config.setIn(['styleConfig', 'customStyle', 'regular'], {})
  } else {
    config = config.set('styleConfig', config.styleConfig.without('customStyle'))
  }
  ({ config, dynamicStyleUseDataSources } = this.resetDynamicStyle(config))
  this.props.onSettingChange({
    id: this.props.id,
    config,
    useDataSources: this.mergeUseDataSources(this.getTextExpression(), this.getTipExpression(), this.getLinkSettingExpression(), dynamicStyleUseDataSources, this.props.useDataSources) as unknown as UseDataSource[]
  })
}
```

UNVERIFIED: The advanced-style editor internals under `src/setting/components/advance-style-setting/` and the quick-style builder component under `src/runtime/builder/quick-style` were not opened in detail; the `AdvanceStyleSetting` and `QuickStyle` behavior descriptions above are inferred from their usage sites in `setting.tsx` and `tools/quick-style.tsx`.
