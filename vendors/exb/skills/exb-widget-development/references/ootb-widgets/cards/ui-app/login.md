# OTB Widget: common/login

Online widget doc: https://developers.arcgis.com/experience-builder/guide/login-widget/

## Purpose

A sign-in / sign-out button widget. It renders a single button whose label and
icon reflect the current authenticated user, and (in advanced mode) opens a
dropdown with the user avatar/name, profile/settings links, custom links, a
restricted-resource credential manager, switch account, and sign out.

Two runtime behaviors are configurable:
- Simple mode (`useAdvanceLogin = false`): the button toggles sign-in / sign-out
  directly with no dropdown.
- Advanced mode (`useAdvanceLogin = true`): when signed in the button opens a
  dropdown (`LoginDropDown`) with account details and actions.

It also supports popup vs redirect login, post-login/post-logout redirect links,
four quick-style presets, and a full advanced style panel (regular/hover for the
button and the dropdown).

## Source paths inspected

All under `ArcGISExperienceBuilder/client/dist/widgets/common/login/` (gitignored
build output; `dist/` and `tests/` intentionally excluded):

- `manifest.json`
- `src/config.ts`
- `src/utils.ts`
- `src/runtime/widget.tsx`
- `src/runtime/component/login-button.tsx`
- `src/runtime/component/login-dropdown.tsx`
- `src/runtime/builder-support.tsx`
- `src/runtime/builder/quick-style.tsx`
- `src/setting/setting.tsx`
- `src/setting/components/advance-style-setting/index.tsx`
- `src/tools/quick-style.tsx`
- `src/tools/mode-switch.tsx`
- `src/tools/builder-operations.ts`

Not opened in full (referenced only): `src/runtime/style.ts`, `src/setting/style.ts`,
`src/setting/components/advance-style-setting/components/*` (common/icon/font
style setting subcomponents), `translations/*`, `assets/*`.

## Architecture overview

```
runtime/widget.tsx
  -> merges defaults (getDefaultConfig) with props.config
  -> useSelector pulls extra state (active/selected in builder, appMode,
     noPermissionResourceChangedFlag)
  -> renders <LoginButton>
       component/login-button.tsx
         -> reads session/user via utils (isSignedIn, signIn, signOut, getThumbnail)
         -> styled(Button) with per-state custom style (getStyleState)
         -> when signed in AND advanced mode: renders <LoginDropDown>
              component/login-dropdown.tsx
                -> HeaderItem (avatar + name), link items, PermissionList,
                   FooterItem (switch account / sign out)
```

Auth logic is centralized in `src/utils.ts` (SessionManager wrappers). The
runtime components are presentational and delegate all auth actions to those
helpers.

## Key imports and packages

Grouped by source file. Notable framework touch points called out.

`src/utils.ts`
- `jimu-core`: `AllWidgetProps`, `Immutable`, `AppMode`, `SessionManager`,
  `SessionType`, `LinkParam`, `getAppStore`, `urlUtils`, `ImmutableObject`,
  `utils as jimuUtils`
  - Auth is driven entirely through `SessionManager` (jimu-core). There is NO
    direct `esri/identity/IdentityManager` or `esri/portal/Portal` import in the
    inspected source; SessionManager wraps the ArcGIS JSAPI identity/session
    layer internally. (UNVERIFIED: internal SessionManager implementation not
    inspected -- `src/utils.ts`.)

`src/runtime/widget.tsx`
- `jimu-core`: `React`, `ReactRedux`, `AllWidgetProps`, `jsx`, `IMState`

`src/runtime/component/login-button.tsx`
- `jimu-core`: `React`, `jsx`, `IMThemeVariables`, `getAppStore`, `Immutable`
- `jimu-ui`: `Button`, `Icon`, `defaultMessages as jimuUiDefaultMessages`,
  `StyleState`
- `jimu-theme`: `styled`
- local: `utils` (isSignedIn/signIn/signOut/getThumbnail), `config`, `style`,
  `login-dropdown`
- `react-intl`: `IntlShape`

`src/runtime/component/login-dropdown.tsx`
- `jimu-core`: `React`, `jsx`, `SessionManager`, `SignInErrorCode`,
  `getAppStore`, `PermissionList`, `IMThemeVariables`, `AppMode`, `Immutable`
- `jimu-ui`: `Popper`, `Icon`, `defaultMessages`, `DropdownItem`, `StyleState`,
  `Paper`
- `jimu-theme`: `styled`

`src/runtime/builder/quick-style.tsx`
- `jimu-core`: `jsx`, `css`, `IMThemeVariables`, `SerializedStyles`,
  `classNames`, `polished`, `hooks`, `MobileSidePanelContentOptions`,
  `ReactRedux`, `IMState`
- `jimu-theme`: `ThemeSwitchComponent`, `useTheme`, `useTheme2`, `useUseTheme2`
- `jimu-ui`: `Button`, `Icon`, `defaultMessages`
- `jimu-layouts/layout-runtime`: `ToolSettingPanelProps`
- `jimu-for-builder`: `getAppConfigAction`

`src/setting/setting.tsx`
- `jimu-core`: `React`, `jsx`, `Immutable`, `ImmutableArray`, `IMIconResult`,
  `IMExpression`, `UseDataSource`, `expressionUtils`, `defaultMessages`,
  `IconResult`, `IMLinkParam`, `uuidv1`, `OpenTypes`, `urlUtils`, `getAppStore`,
  `LinkParam`, `ImmutableObject`
- `jimu-for-builder`: `AllWidgetSettingProps`, `builderAppSync`
- `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`,
  `LinkSelector`, `SidePopper`
- `jimu-ui/advanced/resource-selector`: `IconPicker`
- `jimu-ui`: `TextInput`, `UrlInput`, `Button`, `Select`, `Tabs`, `Tab`,
  `Switch`, `Radio`, `Label`, `CollapsablePanel`, `Checkbox`
- `jimu-icons/outlined/editor/plus-circle`, `.../close-circle`

`src/tools/quick-style.tsx`
- `jimu-core`: `extensionSpec`, `appActions`, `getAppStore`,
  `LayoutContextToolProps`, `i18n`, `BrowserSizeMode`
- `jimu-for-builder`: `appBuilderSync`, `builderAppSync`
- `jimu-icons/svg/outlined/editor/brush.svg`

`src/tools/mode-switch.tsx`
- `jimu-core`: `extensionSpec`, `appActions`, `getAppStore`,
  `LayoutContextToolProps`, `i18n`, `Immutable`
- `jimu-for-builder`: `builderAppSync`
- `jimu-icons/svg/outlined/directional/exchange.svg`

`src/tools/builder-operations.ts`
- `jimu-core`: `extensionSpec`, `IMAppConfig`
- `jimu-ui`: `defaultMessages`

## Reusable patterns found

- SessionManager auth wrappers (`src/utils.ts`): `isSignedIn()` reads
  `getMainSession()`; `signIn()` and `signOut()` centralize popup/iframe/redirect
  handling; `switchAccount()` and `getThumbnail()` round out the helpers. All
  guarded with `window.jimuConfig.isInBuilder` so nothing authenticates while
  editing.
- Thumbnail URL construction from portal + user + token
  (`getThumbnail`, `src/utils.ts`).
- Post-login / post-logout redirect via `LinkParam` + `urlUtils.getHrefFromLinkTo`
  with `openType` handling (`_self` / `_blank` / `_top`).
- CONTEXT_TOOL extensions: quick-style (opens a tool setting panel or mobile
  side panel) and mode-switch (toggles a preview of the signed-out button in the
  builder via `isLogoutMode` widget state).
- `hasBuilderSupportModule` + `builder-support.tsx` exports the QuickStyle
  component for the builder to render.
- Advanced style panel with regular/hover tabs for both the button and the
  dropdown (`advance-style-setting`), using `CollapsableResetPanel` per style
  group and per-state style computation (`getStyleState`).
- Custom link list managed in a `SidePopper` (add/edit/delete) with label+url
  validation, ids via `uuidv1`.
- BUILDER_OPERATIONS extension registers translation keys for custom link labels
  so they participate in multi-language export (`src/tools/builder-operations.ts`).

Expression text/tip/link note: `setting.tsx` defines `mergeUseDataSources` /
`mergeUseDataSourcesByDss` (using `expressionUtils.generateFieldsForUseDataSourcesByExpressionParts`
and `expressionUtils.mergeUseDataSources`) plus `getIsDataSourceUsed`, but in the
inspected build these helpers are NOT wired into any rendered control -- they
appear to be dead/template leftover code. Treat them as a reference pattern for
expression + data-source merging, not as an active feature of the login widget.
(UNVERIFIED that they are ever called -- `src/setting/setting.tsx`.)

## Builder vs runtime split

- Runtime: `src/runtime/*` (widget + login-button + login-dropdown). Reads
  session/user state and renders the button/dropdown.
- Builder support: `src/runtime/builder-support.tsx` exports `{ QuickStyle }`
  from `src/runtime/builder/quick-style.tsx`; enabled by
  `hasBuilderSupportModule: true` in the manifest.
- Setting panel: `src/setting/setting.tsx` (`hasSettingPage: true`) with the
  advanced style subtree under `src/setting/components/`.
- Context tools (`src/tools/*`) registered as `CONTEXT_TOOL` extensions:
  `quick-style` (index 2, `openWhenAdded: true`) and `mode-switch` (index 1,
  `openWhenAdded: false`). `builder-operations` is a `BUILDER_OPERATIONS`
  extension.
- The QuickStyle component (`src/runtime/builder/quick-style.tsx`) is shared: it
  is used both as the tool setting panel (desktop) and as a mobile side panel
  (`MobileSidePanelContentOptions`). It reads config from
  `state.appStateInBuilder ?? state` and writes via
  `getAppConfigAction().editWidgetConfig(...).exec()`.

## Lifecycle and cleanup

- `Setting.componentWillUnmount` (`src/setting/setting.tsx`) publishes
  `isConfiguringHover = false` via `builderAppSync.publishChangeWidgetStatePropToApp`
  so the runtime stops previewing hover state when the panel closes.
- `LoginDropDown` (`src/runtime/component/login-dropdown.tsx`) uses `useEffect`
  hooks to open/close the popper based on `useAdvanceLogin`, a `denyOpenDropdown`
  guard, and the incoming `props.open` toggle. These are pure state effects with
  no external subscriptions to tear down.
- SessionManager listener cleanup: the inspected runtime does NOT register an
  explicit SessionManager change listener; sign-in state is read on render from
  `getAppStore().getState().user` / `SessionManager.getInstance().getMainSession()`
  and re-rendered via Redux (`user` slice) rather than a manual subscription.
  There is therefore no SessionManager listener to remove in this widget.
  (UNVERIFIED: if you add a `SessionManager` change listener in a derived widget,
  remove it in `componentWillUnmount` / a `useEffect` cleanup -- not present here.)

## Manifest/config requirements

From `manifest.json`:
- `type: "widget"`, `label: "Login"`.
- `properties.hasSettingPage: true`
- `properties.defaultInControllerUx: "offPanel"`
- `properties.canCrossLayoutBoundary: true`
- `properties.useOwnBorder: true`
- `properties.coverLayoutBackground: true`
- `properties.hasBuilderSupportModule: true`
- `extensions`:
  - `quick-style` -> `CONTEXT_TOOL` -> `tools/quick-style`
  - `mode-switch` -> `CONTEXT_TOOL` -> `tools/mode-switch`
  - `builderOperations` -> `BUILDER_OPERATIONS` -> `tools/builder-operations`
- `defaultSize`: 150x50 with `autoWidth` and `autoHeight` true.
- No `dependency` on the ArcGIS JSAPI is declared -- all identity access goes
  through `jimu-core` `SessionManager`.

Config shape (`src/config.ts`) and defaults (`getDefaultConfig` in
`src/utils.ts`):
- `functionConfig.usePopupLogin` (default `true`)
- `functionConfig.quickStyleMode` (`QuickStyleMode.default`)
- `functionConfig.afterLoginLinkParam` / `afterLogoutLinkParam` (`LinkParam`)
- `functionConfig.icon` (`IconConfig` with `data: IconResult`, `position`)
- `functionConfig.customIcons` (preset icons that cannot be deleted)
- `functionConfig.loginOptions`: `useAdvanceLogin`, `logoutAllResources`,
  `username`, `userAvatar`, `userProfile`, `userSetting`,
  `resourceCredentialList`, `links: LinkInfo[]`
- `styleConfig.themeStyle.quickStyleType` (default `'default'`) and
  `styleConfig.customStyle` (regular/hover + dropdownRegular/dropdownHover, each
  an `AdvanceStyleSettings` extending `jimu-ui` `StyleSettings` with optional
  `iconProps`).

## Gotchas

- Do not authenticate in builder. Every helper in `src/utils.ts` early-returns
  when `window.jimuConfig.isInBuilder` is true; the button preview uses the
  `isLogoutMode` widget-state flag to simulate signed-out state instead.
- The dropdown only renders when signed in AND advanced mode is on
  (`{isSigned && <LoginDropDown ...>}` in `login-button.tsx`). In simple mode the
  button directly signs in/out.
- When embedded in an iframe, `signIn` forces popup regardless of the config
  (`jimuUtils.isInIFrame()` in `src/utils.ts`).
- `logoutAllResources` iterates all sessions and removes non-main, non-federated
  sessions to revoke their tokens before signing out the main session.
- Redirect URL for logout is normalized to an absolute `https://` URL when a
  relative href is produced (`signOut`, `src/utils.ts`).
- Removing the icon in settings also strips `iconProps` from both regular and
  hover custom styles (`onIconResultChange`, `setting.tsx`) to avoid orphaned
  icon style.
- `mergeUseDataSources` / expression helpers in `setting.tsx` are present but
  unused in this build (see Reusable patterns). Do not assume the login widget
  binds a data source.
- The QuickStyle component distinguishes app vs builder theme using
  `useUseTheme2()` and `window.jimuConfig.isBuilder`; copy that pattern if you
  reuse it, otherwise theme colors can render wrong inside the builder.

## Useful snippets and functions

Source: `src/utils.ts`
```ts
export function isSignedIn () {
  const mainSession = SessionManager.getInstance().getMainSession()
  return !!mainSession
}

export function signIn (usePopup: boolean = false, afterLoginLinkParam?: ImmutableObject<LinkParam>) {
  if (window.jimuConfig.isInBuilder || isSignedIn()) {
    return
  }
  const isEmbeddedInIframe = jimuUtils.isInIFrame()
  if (isEmbeddedInIframe) {
    // force popup when ExB app is embedded.
    usePopup = true
  }

  const currentUrl = window.location.href
  const queryObject = getAppStore().getState().queryObject
  const redirectUrl = afterLoginLinkParam && urlUtils.getHrefFromLinkTo(afterLoginLinkParam, queryObject)
  const openType = afterLoginLinkParam?.openType || '_self'
  const defaultFromUrl = usePopup ? null : currentUrl
  const fromUrl = openType === '_self' && redirectUrl ? redirectUrl : defaultFromUrl
  const redirectUrlInNewWindow = openType === '_blank' && redirectUrl ? redirectUrl : null
  const redirectUrlInTopWindow = openType === '_top' && redirectUrl ? redirectUrl : null
  SessionManager.getInstance().signIn({ popup: usePopup, fromUrl, redirectUrlInNewWindow, redirectUrlInTopWindow, forceLogin: true })
}
```

Source: `src/utils.ts`
```ts
export function signOut (afterLogoutLinkParam?: ImmutableObject<LinkParam>, logoutAllResources?: boolean) {
  if (window.jimuConfig.isInBuilder || !isSignedIn()) {
    return
  }

  const sessionManager = SessionManager.getInstance()

  if (logoutAllResources) {
    // remove all resource sessions (tokens will be revoked)
    sessionManager.getSessions().forEach(session => {
      const isMainSession = sessionManager.isMainSession(session)
      const sessionType = sessionManager.getSessionType(session)
      if (!isMainSession && sessionType !== SessionType.ServerSessionFederated) {
        sessionManager.removeSession(session)
      }
    })
  }

  const currentUrl = window.location.href
  const queryObject = getAppStore().getState().queryObject
  let redirectUrl = afterLogoutLinkParam && urlUtils.getHrefFromLinkTo(afterLogoutLinkParam, queryObject)
  if (redirectUrl && (redirectUrl.indexOf('https://') !== 0)) {
    redirectUrl = `https://${window.location.host}${redirectUrl}`
  }
  redirectUrl = redirectUrl || currentUrl
  // sign-out for main session
  sessionManager.signOut({ redirectUrl })
}

export function switchAccount () {
  if (window.jimuConfig.isInBuilder || !isSignedIn()) {
    return
  }
  SessionManager.getInstance().switchAccount()
}
```

Source: `src/utils.ts`
```ts
export function getThumbnail () {
  let userThumbnail
  const mainSession = SessionManager.getInstance().getMainSession()
  const user = getAppStore().getState().user
  const portalUrl = getAppStore().getState().portalUrl
  if (user && user.thumbnail) {
    userThumbnail = `${portalUrl}/sharing/rest/community/users/${user.username}/info/${user.thumbnail}?token=${mainSession?.token}`
  }
  return userThumbnail
}
```

Source: `src/runtime/component/login-button.tsx` (click handler: simple vs advanced)
```ts
const onLoginButtonClick = useCallback(() => {
  if (useAdvanceLogin) {
    isSigned && setOpen(!open)
    !isSigned && signIn(usePopupLogin, functionConfig.afterLoginLinkParam)
  } else {
    isSigned
      ? signOut(functionConfig.afterLogoutLinkParam, functionConfig?.loginOptions.logoutAllResources)
      : signIn(usePopupLogin, functionConfig.afterLoginLinkParam)
  }
}, [open, isSigned, useAdvanceLogin, usePopupLogin, functionConfig.afterLoginLinkParam, functionConfig.afterLogoutLinkParam, functionConfig?.loginOptions.logoutAllResources])
```

Source: `src/runtime/component/login-dropdown.tsx` (restricted-resource credential list)
```ts
const getPermissionListContent = () => {
  const noPermissionResourceInfoList = { ...SessionManager.getInstance().getNoPermissionResourceInfoList() }
  if (window.jimuConfig.isInBuilder && Object.entries(noPermissionResourceInfoList).length === 0) {
    // mocks a no permission resource info
    noPermissionResourceInfoList['https://sample.server.com/arcgis/rest/services/service1/FeatureServer'] = { signInErrorCode: SignInErrorCode.SignInCanceled }
  }
  const listTitle = intl.formatMessage({ id: 'restrictedResources', defaultMessage: defaultMessages.restrictedResources })
  return (Object.entries(noPermissionResourceInfoList).length > 0 && loginOptions.resourceCredentialList &&
    <div className='p-1'>
      <div className='permission-list-title text-truncate' aria-label={listTitle}>{listTitle}</div>
      <PermissionList
        noPermissionResourceChangedFlag={noPermissionResourceChangedFlag}
        noPermissionResourceInfoList={noPermissionResourceInfoList}
        disableOperation={window.jimuConfig.isInBuilder}
        theme={theme} intl={intl} allowLogout />
      <DropdownItem className='login-dropdown-item divider-item' divider tag='div' />
    </div>
  )
}
```

Source: `src/tools/mode-switch.tsx` (CONTEXT_TOOL toggling a builder preview flag)
```ts
onClick (props: LayoutContextToolProps) {
  const mode = !this.isLogoutMode()
  if (window.jimuConfig.isBuilder) {
    builderAppSync.publishChangeWidgetStatePropToApp({ widgetId: this.widgetId, propKey: 'isLogoutMode', value: mode })
  } else {
    getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'isLogoutMode', mode))
  }
}
```

Source: `src/runtime/builder/quick-style.tsx` (quick-style write-back + theme selection)
```ts
const onChange = (quickStyleMode: QuickStyleMode) => {
  const newConfig = config.setIn(['functionConfig', 'quickStyleMode'], quickStyleMode)
  getAppConfigAction().editWidgetConfig(widgetId, newConfig).exec()
}

const theme = useTheme()
const theme2 = useTheme2()
const isUseTheme2 = useUseTheme2()
const appTheme = window.jimuConfig.isBuilder !== isUseTheme2 ? theme2 : theme
const builderTheme = window.jimuConfig.isBuilder !== isUseTheme2 ? theme : theme2
```

Source: `src/tools/builder-operations.ts` (register translatable custom-link labels)
```ts
getTranslationKey (appConfig: IMAppConfig): Promise<extensionSpec.TranslationKey[]> {
  const keys: extensionSpec.TranslationKey[] = []
  const config = appConfig.widgets[this.widgetId].config as IMConfig
  const links = config?.functionConfig.loginOptions?.links || []
  links.forEach((link, index) => {
    keys.push({
      keyType: 'value',
      key: `widgets.${this.widgetId}.config.functionConfig.loginOptions.links[${index}].label`,
      label: { key: 'dataLabelForML', enLabel: message.link },
      valueType: 'text'
    })
  })
  return Promise.resolve(keys)
}
```

Source: `src/setting/setting.tsx` (expression + data-source merge helpers -- present but unused in this build)
```ts
mergeUseDataSources = (textExpression, tipExpression, linkSettingExpression, useDataSources, clearFieldsInCurrentUseDss = true) => {
  const textDss = expressionUtils.generateFieldsForUseDataSourcesByExpressionParts(textExpression && textExpression.parts, useDataSources)
  const tipDss = expressionUtils.generateFieldsForUseDataSourcesByExpressionParts(tipExpression && tipExpression.parts, useDataSources)
  const linkSettingDss = expressionUtils.generateFieldsForUseDataSourcesByExpressionParts(linkSettingExpression && linkSettingExpression.parts, useDataSources)
  return this.mergeUseDataSourcesByDss(textDss, tipDss, linkSettingDss, useDataSources, clearFieldsInCurrentUseDss)
}

mergeUseDataSourcesByDss = (textUseDss, tipUseDss, linkSettingUseDss, useDataSources, clearFieldsInCurrentUseDss = true) => {
  const useDataSourcesWithoutFields = clearFieldsInCurrentUseDss ? expressionUtils.getUseDataSourcesWithoutFields(useDataSources) : useDataSources
  let mergedUseDss = expressionUtils.mergeUseDataSources(useDataSourcesWithoutFields, textUseDss)
  mergedUseDss = expressionUtils.mergeUseDataSources(mergedUseDss, tipUseDss)
  mergedUseDss = expressionUtils.mergeUseDataSources(mergedUseDss, linkSettingUseDss)
  return mergedUseDss
}
```
