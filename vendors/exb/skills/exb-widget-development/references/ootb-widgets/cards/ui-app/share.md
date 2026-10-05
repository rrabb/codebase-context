# OTB Widget: common/share

Online widget doc: https://developers.arcgis.com/experience-builder/guide/share-widget/

## Purpose

The Share widget lets an end user share the current running Experience by URL. It renders either a
popup share button or an inline row of share buttons and exposes a set of "items": copy/share link
(with optional short link + URL param stripping), QR code, embed iframe code, email, and social
targets (Facebook, Twitter, Pinterest, LinkedIn). The URL being shared is derived from the current
`window.location.href`, optionally shortened via the ArcGIS `arcg.is` bitly proxy, and optionally
tagged with the portal `org` url-key.

## Source paths inspected

- [manifest.json](ArcGISExperienceBuilder/client/dist/widgets/common/share/manifest.json)
- [config.json](ArcGISExperienceBuilder/client/dist/widgets/common/share/config.json) (default config)
- [src/config.ts](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/config.ts)
- [src/version-manager.ts](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/version-manager.ts)
- [src/tools/builder-operations.ts](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/tools/builder-operations.ts)
- [src/common/default-icon-utils.ts](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/common/default-icon-utils.ts)
- Runtime:
  - [src/runtime/widget.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/widget.tsx)
  - [src/runtime/components/short-link.ts](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/short-link.ts)
  - [src/runtime/components/items-list.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items-list.tsx)
  - [src/runtime/components/content-header.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/content-header.tsx) (not fully read; UNVERIFIED)
  - [src/runtime/components/items/base-item.ts](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/base-item.ts)
  - [src/runtime/components/items/email.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/email.tsx)
  - [src/runtime/components/items/qr-code.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/qr-code.tsx)
  - [src/runtime/components/items/sharelink.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/sharelink.tsx)
  - [src/runtime/components/items/embed.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/embed.tsx)
  - [src/runtime/components/items/facebook.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/facebook.tsx)
  - [src/runtime/components/items/twitter.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/twitter.tsx)
  - [src/runtime/components/items/pinterest.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/pinterest.tsx)
  - [src/runtime/components/items/linkedin.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/linkedin.tsx)
  - [src/runtime/components/items/utils.ts](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/utils.ts)
  - [src/runtime/components/items/subcomps/item-btn.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/runtime/components/items/subcomps/item-btn.tsx)
- Setting:
  - [src/setting/setting.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/setting/setting.tsx)
  - [src/setting/components/arrangement-selector/index.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/setting/components/arrangement-selector/index.tsx)
  - [src/setting/components/icon-selector.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/setting/components/icon-selector.tsx)
  - [src/setting/components/items-selector.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/setting/components/items-selector.tsx)
  - [src/setting/components/email-content.tsx](ArcGISExperienceBuilder/client/dist/widgets/common/share/src/setting/components/email-content.tsx)

Note: source root is gitignored (`dist/`); files were read with includeIgnoredFiles. `dist/` and
`tests/` folders under the widget were ignored per task instructions.

## Architecture overview

Two UI modes, driven by `config.uiMode` (`UiMode.Popup` | `UiMode.Inline`):

- Popup mode: renders a single share `Button` (with configurable icon + tooltip). Clicking opens a
  `Popper` that tiles the "main content": a `ShareLink` block plus an `ItemsList` grid of buttons.
  Detail items (QR code, share link, embed) expand in-place and tile the popup.
- Inline mode: renders an `ItemsList` directly (horizontal or vertical row of buttons with optional
  labels).

The runtime widget is a class component (`React.PureComponent`) that owns all URL state and passes
it down to stateless-ish item components. Each share "item" (email, qr, embed, sharelink, social)
extends an abstract `BaseItem` class and renders either a button (`ShownMode.Btn`) or its detail
content (`ShownMode.Content`). `ItemBtn` is a shared button sub-component that computes styling from
config (size/color/radius/label).

There is a special "in controller" behavior: when the parent is a Controller widget and
`inControllerUx === 'offPanel'`, popup content is tiled directly instead of behind a button.

## Key imports and packages

Grouped by source file:

- widget.tsx (`from 'jimu-core'`): `React`, `IMState`, `jsx`, `IMAppConfig`, `IMAppInfo`,
  `AllWidgetProps`, `BrowserSizeMode`, `appActions`, `AppMode`, `getAppStore`, `urlUtils`,
  `focusElementInKeyboardMode`, `IntlShape`.
- widget.tsx (`from 'jimu-ui'`): `AutoPlacementOptions`, `Button`, `Icon`, `Paper`, `Popper`,
  `ShiftOptions`, `defaultMessages`.
- widget.tsx (local): `../config` (`IMConfig`, `UiMode`, `ItemsName`, `ErrorInfo`), `./style`
  (`getStyle`, `getPopupStyle`), `../common/default-icon-utils` (`getDefaultIconConfig`),
  `../version-manager` (`versionManager`), item components, `* as ShortLinkUtil`.
- short-link.ts (`from 'jimu-core'`): `urlUtils`.
- base-item.ts (`from 'jimu-core'`): `React`, `css`, `focusElementInKeyboardMode`,
  `IMThemeVariables`, `IntlShape`.
- qr-code.tsx: `jsx`, `css`, `SerializedStyles` (`jimu-core`); `FOCUSABLE_CONTAINER_CLASS`,
  `defaultMessages` (`jimu-ui`); `QRCode as JimuQRCode` from `jimu-ui/basic/qr-code`.
- sharelink.tsx: `TextInput`, `Checkbox`, `Loading`, `LoadingType`, `Label`,
  `FOCUSABLE_CONTAINER_CLASS`, `defaultMessages` (`jimu-ui`); `CopyButton` from
  `jimu-ui/basic/copy-button`.
- embed.tsx: `Label`, `NumericInput`, `TextArea`, `Select`, `FOCUSABLE_CONTAINER_CLASS` (`jimu-ui`);
  `CopyButton` from `jimu-ui/basic/copy-button`.
- default-icon-utils.ts (`from 'jimu-core'`): `Immutable`, `IMThemeVariables`.
- version-manager.ts (`from 'jimu-core'`): `BaseVersionManager`.
- builder-operations.ts (`from 'jimu-core'`): `extensionSpec`, `IMAppConfig`.
- setting.tsx (`from 'jimu-for-builder'`): `AllWidgetSettingProps`, `getAppConfigAction`.
- setting.tsx (`from 'jimu-ui/advanced/setting-components'`): `SettingSection`, `SettingRow`,
  `DirectionSelector`, `SidePopper`.
- setting.tsx (`from 'jimu-ui'`): `Switch`, `TextInput`, `Select`, `defaultMessages`.
- setting.tsx: `ThemeColorPicker` from `jimu-ui/basic/color-picker`.
- icon-selector.tsx: `IconPicker` from `jimu-ui/advanced/resource-selector`; `useTheme` from
  `jimu-theme`; `IconResult`, `IMIconResult`, `useIntl` from `jimu-core`.
- items-selector.tsx: `List`, `CommandType`, `CommandActionDataType`, `ListItemsType`,
  `TreeItemActionType` from `jimu-ui/basic/list-tree`; `Edit` svg from
  `jimu-icons/svg/outlined/editor/edit.svg`.
- arrangement-selector: `Button`, `Icon`, `Label`, `Tooltip` (`jimu-ui`); `SettingSection`,
  `SettingRow` (`jimu-ui/advanced/setting-components`); `useTheme` (`jimu-theme`).

## Reusable patterns found

- Social sharing items: each social target is a tiny `BaseItem` subclass whose `onClick` builds a
  provider share URL from `sharedUrl` + app title, then `openInNewTab(url)`. See facebook/twitter/
  pinterest/linkedin snippets below. App title is suffixed with `getMsgBy()` = `' by ArcGIS
  Experience Builder'`.
- QR-code generation: delegated to `jimu-ui/basic/qr-code`'s `QRCode` component
  (`value={sharedUrl} level='L' size={156} downloadFileName='Exb_QRCode'`), with an `onError`
  fallback that shows an error tip. No custom QR algorithm.
- URL shortening: `ShortLinkUtil.fetchShortLink(href)` hits `https://arcg.is/prod/shorten` (bitly
  proxy) with `longUrl` + `f=json` params. Rejects with `ErrorInfo.UrlIsTooLong` when the hash
  reports `maximum allowed`, or when a fetch failure coincides with `href.length > 1980`. The
  widget caches short vs long URL and re-fetches on app URL change.
- Email templates: `email.tsx` builds a `mailto:?subject=...&body=...` href on a hidden `<a>` and
  programmatically clicks it. Body is either a localized default (subject + app name + url + two
  message lines) or a customized template with `{appName}` / `{appURL}` placeholders and `\n`
  newlines URL-encoded to `%0D%0A`. Customization is configured in `config.emailContent`.
- Portal URL from appState: `attachOrgUrlKey(href)` reads
  `getAppStore().getState()?.portalSelf?.urlKey` and, if present, appends `?org=<urlKey>` via
  `urlUtils.updateQueryStringParameter`.
- URL-param stripping for sharing: `sliceUrlForSharing(isIncludeUrlParams)` and helpers in
  items/utils.ts remove `/page/{}/`, `?views={}`, `#{}` while keeping `draft`, `org`, `id` query
  params; `getUrlWithoutLastSplash` strips a trailing slash before `?`/end.
- Arrangement/icon config (builder): `ArrangementSelector` is a two-card picker (popup vs inline)
  built from `SettingSection`/`SettingRow` + `Button`/`Icon`/`Tooltip`. `IconSelector` uses
  `IconPicker` from `jimu-ui/advanced/resource-selector` with 9 bundled custom share icons
  (`customIcons`) and `getDefaultIconConfig` for the default.
- Items reorder/enable config: `ItemsSelector` uses the `List` tree from `jimu-ui/basic/list-tree`
  with `isMultiSelection`, `dndEnabled` to check/uncheck and drag-reorder items; the email item gets
  an extra edit `CommandType` that opens the email-content `SidePopper`.
- version-manager: `VersionManager extends BaseVersionManager` migrates config across releases
  (1.10 reorderable item list from a `string[]` -> `Item[]`; 1.12 adds `inline.design.labelColor`).
  Registered on the widget as `static versionManager = versionManager`.

## Builder vs runtime split

- Runtime (`src/runtime/**`): reads `config`, computes the shared URL, and renders share UI. Pulls
  extra redux state via `static mapExtraStateProps` (`appConfig`, `appInfo`, `browserSizeMode`,
  `isLiveViewMode` from `AppMode.Run`).
- Setting (`src/setting/**`): functional `Setting` component using `AllWidgetSettingProps<IMConfig>`.
  Writes config via `props.onSettingChange({ id, config })` on Immutable config (`.set` / `.setIn`).
  Switching UI mode also calls `getAppConfigAction().editWidgetProperty(props.id, 'inControllerUx',
  'offPanel').exec()`.
- Builder extension (`src/tools/builder-operations.ts`): a `BuilderOperationsExtension` that exposes
  translatable strings (`emailContent.content`, `popup.tooltip`) via `getTranslationKey` so the app
  translation tooling can localize per-instance config. Wired through `manifest.extensions`.

## Lifecycle and cleanup

- `componentDidMount`: dispatches `appActions.widgetStatePropChange(id, 'layoutInfo', { layoutId,
  layoutItemId })`, then calls `updateUrls(...)` to prime the shared/short URL early (so first open
  is fast).
- `componentDidUpdate`: re-fetches URLs when the app URL changes; resets popup state when `uiMode`
  changes; toggles controller/off-panel styles; closes the popper when live-view mode or config
  changes; runs a set of a11y focus handlers.
- `ShareLink.componentWillUnmount`: calls `this.props.handleError('clear')` to clear error state.
- QR/embed/sharelink recompute derived output in `componentDidUpdate` when `sharedUrl` (or size)
  changes.
- No timers, subscriptions, or JSAPI resources are created, so there is no map/watch handle cleanup;
  the only outbound side effects are `fetch` (short link) and `window.open` (social/new tab).

## Manifest/config requirements

- `manifest.json`: `"type": "widget"`, `properties.hasSettingPage: true`,
  `properties.defaultInControllerUx: "offPanel"`, `defaultSize` autoWidth/autoHeight true, and one
  `extensions` entry: `{ name: 'builderOperations', point: 'BUILDER_OPERATIONS', uri:
  'tools/builder-operations' }`.
- No `dependency` on the ArcGIS JS API is declared (widget does not load `esri/*` modules); it only
  uses jimu packages and a plain `fetch`.
- `config.json` default seeds `uiMode: 'POPUP'`, a `popup` block (icon, ordered `items` with
  `enable`, tooltip) and an `inline` block (ordered `items` + `design` object: direction,
  hideLabel, btnRad, btnColor, iconColor, size, labelColor).
- `ShareConfig` (config.ts) is the typed shape; `IMConfig = ImmutableObject<ShareConfig>`. Items are
  `{ id: ItemsName, enable: boolean }`. `emailContent?` is `{ isCustomize?, content? }`.

## Gotchas

- Short-link endpoint is a hard-coded external service (`https://arcg.is/prod/shorten`,
  `URL_MAX_LENGTH = 1980`). It requires network access and can fail (`ErrorInfo.NetworkFailed` /
  `UrlIsTooLong`); the UI falls back to the long URL and disables the short-link checkbox on error.
- Do NOT double-encode the bitly URL: the comment in short-link.ts explicitly warns not to
  `encodeURIComponent` the `BITLY_URL` + param again.
- `pWinSt.log` / `pWinSt.error` appear throughout as a global logger (e.g. short-link.ts,
  items-selector.tsx). It is not imported in these files - assume it is a global provided by the ExB
  runtime. UNVERIFIED where it is defined.
- Pinterest media image path is hard-coded to `/assets/exb-logo.png` on `window.location.origin`;
  broken if that asset is not deployed.
- `ItemBtn` intentionally forces radius to `Rad50` via `fixRadForBeta2()` regardless of config, and
  remaps the `sharelink` label id to `'link'` to fix i18n (see comment `#5391`). Button radius
  config is effectively overridden.
- Twitter/LinkedIn share URLs still use `twitter.com/intent/tweet` and `@ArcGISOnline`; these are
  legacy provider endpoints baked into source.
- Popup `sharedUrl` is stored in TextInput and is editable (`onChange` writes back via
  `onShortUrlChange`); it is not strictly read-only.
- In-controller off-panel mode changes rendering significantly (`isPopupInController`,
  `isControllerOffPanelStyle`); test both standalone and inside a Controller.

## Useful snippets and functions

Source: src/runtime/components/short-link.ts

```ts
export async function fetchShortLink (href: string): Promise<any> {
  const BITLY_URL = 'https://arcg.is/prod/shorten'
  const URL_MAX_LENGTH = 1980
  const promise = new Promise((resolve, reject) => {
    let uri = href
    uri = urlUtils.updateQueryStringParameter(BITLY_URL, 'longUrl', uri) // DO NOT encode BITLY_URL+param
    uri = urlUtils.updateQueryStringParameter(uri, 'f', 'json')
    fetch(uri).then(async response => await response.json())
      .then(json => {
        const shortLink = json.data.url
        if (shortLink === '' && (json.data.hash.includes('maximum allowed'))) {
          reject({ href, reason: ErrorInfo.UrlIsTooLong })
        } else {
          resolve(shortLink)
        }
      })
      .catch(error => {
        let reason = ErrorInfo.NetworkFailed
        if (error.message === 'Failed to fetch' && href.length > URL_MAX_LENGTH) {
          reason = ErrorInfo.UrlIsTooLong
        }
        reject({ href, reason })
      })
  })
  return promise
}
```

Source: src/runtime/widget.tsx (attach portal org url-key from appState)

```ts
attachOrgUrlKey = (href: string): string => {
  let url = href
  const appState = getAppStore().getState()
  const urlKey = appState?.portalSelf?.urlKey
  if (urlKey) {
    url = urlUtils.updateQueryStringParameter(url, 'org', urlKey)
  }
  return url
}
```

Source: src/runtime/widget.tsx (fetch short vs long URL, cache + loading)

```ts
updateUrls = (options?: { enableShortUrl?: boolean, urlExcludedUrlParams?: string }): void => {
  const excludedUrlParamsFlag = !!(options?.urlExcludedUrlParams)
  const { enableShortUrl = true, urlExcludedUrlParams = this.getCurrentAppUrl() } = options ?? {}
  const longUrl = excludedUrlParamsFlag ? urlExcludedUrlParams : this.getCurrentAppUrl()
  const href = this.attachOrgUrlKey(longUrl)
  this._cached.currentUrl = this.getCurrentAppUrl()
  this._cached.shortUrl = ''
  this._cached.enableShortUrl = enableShortUrl
  if (enableShortUrl) {
    this.setState({ isFetchingShortLink: true })
    ShortLinkUtil.fetchShortLink(href).then((shortUrl) => {
      this.onShortUrlChange(shortUrl)
      this.setState({ isFetchingShortLink: false, errorInfo: null })
    }, (failedInfo) => {
      if (failedInfo.reason === ErrorInfo.UrlIsTooLong) {
        this.setState({ errorInfo: ErrorInfo.UrlIsTooLong })
      }
      this.onShownUrlChange(href)
      this.setState({ isFetchingShortLink: false })
    })
  } else {
    this.onShownUrlChange(href)
  }
}
```

Source: src/runtime/components/items/email.tsx (mailto body, default vs customized template)

```ts
getBody = () => {
  const urlEncodedNewLine = '%0D%0A'
  const urlEncodedDoubleNewLine = '%0D%0A%0D%0A'
  const appTitle = this.props.getAppTitle()
  const emailContent = this.props.config?.emailContent
  const encodedAppTitle = encodeURIComponent(appTitle)
  if (emailContent?.isCustomize) {
    const body = emailContent.content
      .replace(/\n/g, urlEncodedNewLine)
      .replace(/{appName}/g, encodedAppTitle)
      .replace(/{appURL}/g, encodeURIComponent(this.props.sharedUrl))
    return body
  } else {
    let body = encodeURIComponent(this.shareEmailTxt1) + urlEncodedDoubleNewLine + encodedAppTitle
    body += urlEncodedNewLine + encodeURIComponent(this.props.sharedUrl)
    body += urlEncodedDoubleNewLine + encodeURIComponent(this.shareEmailTxt2)
    body += urlEncodedDoubleNewLine + encodeURIComponent(this.shareEmailTxt3)
    return body
  }
}
```

Source: src/runtime/components/items/base-item.ts (open share target in new tab, keyboard focus)

```ts
openInNewTab (url: string): void {
  const win = window.open(url, '_blank')
  focusElementInKeyboardMode(win, true)
}
getMsgBy (): string {
  return ' by ArcGIS Experience Builder'
}
```

Source: src/runtime/components/items/facebook.tsx (build provider share URL)

```ts
onClick = (ref) => {
  this.props.onItemClick(ItemsName.Facebook, ref, ExpandType.BtnRedirect)
  const appTitle = this.getAppTitle() + this.getMsgBy()
  const url = 'https://www.facebook.com/sharer/sharer.php?' +
    'u=' + encodeURIComponent(this.props.sharedUrl) +
    '&t=' + encodeURIComponent(appTitle)
  this.openInNewTab(url)
}
```

Source: src/runtime/components/items/qr-code.tsx (delegate to jimu-ui QR code component)

```tsx
import { QRCode as JimuQRCode } from 'jimu-ui/basic/qr-code'
// ...
<JimuQRCode value={this.props.sharedUrl} level='L' size={156} downloadFileName='Exb_QRCode'
  onError={(error, errorInfo) => { this.setState({ isError: true }) }}/>
```

Source: src/runtime/components/items/embed.tsx (build iframe embed code)

```ts
_setEmbedCode = () => {
  const iframeTagStart = '<iframe'
  const iframeTagEnd = '></iframe>'
  const widthAttr = ' width="' + this.state.w + '"'
  const heightAttr = ' height="' + this.state.h + '"'
  const iframeProps = ' frameborder="0" allowfullscreen'
  const srcAttr = ' src="' + this.props.sharedUrl + '"'
  let text = this.state.text
  if (!text) {
    text = iframeTagStart + widthAttr + heightAttr + iframeProps + srcAttr + iframeTagEnd
  } else {
    text = replaceAttr(text, 'width', this.state.w)
    text = replaceAttr(text, 'height', this.state.h)
    text = replaceAttr(text, 'src', this.props.sharedUrl)
  }
  this.setState({ text: text })
}
```

Source: src/runtime/components/items/utils.ts (strip page/view/hash params, keep allowlist)

```ts
export function sliceUrlForSharing (isIncludeUrlParams: boolean): string {
  let res = window.location.href
  if (!isIncludeUrlParams) {
    let query = _keepUrlParams((window.location.search?.substring(1)), ['draft', 'org', 'id'])
    if (query) { query = '?' + query }
    let hash = _keepUrlParams((window.location.hash?.substring(1)), [])
    if (hash) { hash = '#' + hash }
    let partOne = _removeHashOrSearchFromUrl(res)
    partOne = _removePageInfoFromUrl(partOne) // remove: /page/${page}/
    res = partOne + query + hash
  }
  return res
}
export function getUrlWithoutLastSplash (url: string): string {
  return url.replace(/\/(?=\?|$)/, '')
}
```

Source: src/common/default-icon-utils.ts (default share icon as IMIconResult)

```ts
const shareIconImage = require('../assets/icons/share-icon-1.svg')
export const getDefaultIconConfig = (theme: IMThemeVariables) => {
  return Immutable({
    svg: shareIconImage,
    properties: {
      color: theme.ref.palette.neutral[700],
      size: IconSize.Small,
      inlineSvg: true
    }
  })
}
```

Source: src/version-manager.ts (config migration registration)

```ts
class VersionManager extends BaseVersionManager {
  versions = [{
    version: '1.10.0',
    description: 'allow users to reorder the media list, #6473',
    upgrader: (oldConfig) => { /* string[] -> Item[] for popup & inline */ return oldConfig }
  }, {
    version: '1.12.0',
    description: 'allow to change font color of the labels ,#13105',
    upgrader: (oldConfig) => oldConfig.setIn(['inline', 'design', 'labelColor'], 'var(--ref-palette-neutral-1200)')
  }]
}
export const versionManager: BaseVersionManager = new VersionManager()
```

Source: src/setting/setting.tsx (write config + toggle controller UX on mode change)

```ts
const onUIModeChanged = (uiMode: UiMode) => {
  props.onSettingChange({ id: props.id, config: props.config.set('uiMode', uiMode) })
  getAppConfigAction().editWidgetProperty(props.id, 'inControllerUx', 'offPanel').exec()
}
```

Source: src/setting/components/icon-selector.tsx (custom icon set via IconPicker)

```tsx
<IconPicker
  configurableOption='all' groups='none' hideRemove aria-label={iconTip}
  icon={icon as IconResult}
  customIcons={shareWidgetIcons}
  previewOptions={{ size: false, color: true }}
  onChange={props.onIconChange}
  setButtonUseColor={false}
/>
```

Source: src/tools/builder-operations.ts (expose per-instance translatable strings)

```ts
export default class BuilderOperations implements extensionSpec.BuilderOperationsExtension {
  id = 'button-builder-operation'
  widgetId: string
  getTranslationKey (appConfig: IMAppConfig): Promise<extensionSpec.TranslationKey[]> {
    const widgetConfig = appConfig.widgets[this.widgetId].config
    const keys: extensionSpec.TranslationKey[] = []
    if (widgetConfig.emailContent?.content) {
      keys.push({ keyType: 'value', key: `widgets.${this.widgetId}.config.emailContent.content`,
        label: { key: 'emailContent', enLabel: messages.emailContent }, valueType: 'textarea' })
    }
    if (widgetConfig.popup?.tooltip) {
      keys.push({ keyType: 'value', key: `widgets.${this.widgetId}.config.popup.tooltip`,
        label: { key: 'tooltip', enLabel: messages.tooltip }, valueType: 'text' })
    }
    return Promise.resolve(keys)
  }
}
```
