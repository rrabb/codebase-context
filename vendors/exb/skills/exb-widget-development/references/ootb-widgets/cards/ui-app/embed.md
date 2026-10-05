# OTB Widget: common/embed

Online widget doc: https://developers.arcgis.com/experience-builder/guide/embed-widget/

## Purpose

The Embed widget renders external web content inside an ExB app via an `<iframe>`. It supports two
embed modes (see `EmbedType` in `src/config.ts`):

- `EmbedType.Url` ("url"): the author enters a web address, optionally with dynamic tokens/expressions
  (data-source field values, URL parameters). At runtime a `DynamicUrlResolver` (jimu-ui) resolves the
  tokens into a concrete URL before the iframe is loaded.
- `EmbedType.Code` ("code"): the author pastes raw embed HTML (iframe/blockquote/anchor snippets from
  YouTube, Vimeo, Facebook, Instagram, Twitter, etc.). The code is sanitized with `esri.Sanitizer` and
  either mapped to a canonical embed URL (`getUrlByEmbedCode`) or loaded through the iframe `srcdoc`.

Extra runtime features: safe-domain detection (avoids sandbox for `*.arcgis.com` and the org portal
domain), auto-refresh on an interval, a blank-message fallback, optional label overlay, and optional
"honor theme font" injection into same-origin `srcdoc` iframes.

## Source paths inspected

All under `ArcGISExperienceBuilder/client/dist/widgets/common/embed/` (gitignored vendor runtime;
read with grep `includeIgnoredFiles:true`; `dist/` and `tests/` intentionally ignored):

- `manifest.json`
- `config.json`
- `src/config.ts`
- `src/runtime/widget.tsx`
- `src/runtime/style.ts`
- `src/setting/setting.tsx`
- `src/tools/app-config-operations.ts`
- `src/tools/builder-operations.ts`
- `src/utils/index.ts`

## Architecture overview

Class components (both runtime and setting extend `React.PureComponent`), not hooks.

- Runtime (`src/runtime/widget.tsx`): `Widget` holds a live `HTMLIFrameElement` ref (`this.ifr`) and
  drives it imperatively. It keeps embed state (`content`, `isLoading`, `loadErr`, `resolveErr`,
  `isEmptyUrl`, `codeLimitExceeded`, `useSrcdoc`) in local component `State`, and pulls `appMode`,
  `sectionNavInfos`, and `user` from the Redux store via `static mapExtraStateProps`.
- Setting (`src/setting/setting.tsx`): `Setting` renders the builder panel (embed type toggle,
  `DataSourceSelector`, `DynamicUrlEditor` or `TextArea`, label/blank-message/auto-refresh/honor-font
  rows). It writes to `config` and `useDataSources` via `onSettingChange`, and pushes transient runtime
  state (`codeLimitExceeded`) to the running app with `builderAppSync.publishChangeWidgetStatePropToApp`.
- Tools (`src/tools/`): two manifest-declared extensions. `AppConfigOperation`
  (`APP_CONFIG_OPERATIONS`) remaps data-source ids inside embedded expressions on widget copy and on
  data-source change. `BuilderOperations` (`BUILDER_OPERATIONS`) declares translatable config keys
  (`label`, `blankMessage`) so localized string values are picked up.
- Utils (`src/utils/index.ts`): pure helpers `getExpressionParts`, `getUrlByEmbedCode`,
  `getParamsFromEmbedCode`.

## Key imports and packages

Grouped by source module. Import lines are copied from the inspected files.

From `jimu-core` (runtime `src/runtime/widget.tsx`):

```ts
import {
  React, type AllWidgetProps, getAppStore, AppMode, urlUtils, queryString, type IMState, classNames, appActions, esri,
  LayoutParentType, ViewVisibilityContext, type ViewVisibilityContextProps, type AppConfig, type ImmutableObject,
  WIDGET_PREFIX_FOR_A11Y_SKIP, type IMUser
} from 'jimu-core'
```

- `esri` is the ArcGIS JSAPI bridge; `esri.Sanitizer` is used for HTML sanitization
  (`const Sanitizer = esri.Sanitizer`).
- `getAppStore` reads portal/user state; `appActions.widgetStatePropChange` dispatches transient
  runtime prop changes; `ViewVisibilityContext` gates iframe loading inside Section/View widgets.

From `jimu-ui` (runtime):

```ts
import { WidgetPlaceholder, DynamicUrlResolver, AlertButton, Alert, Paper } from 'jimu-ui'
```

- `DynamicUrlResolver` resolves the URL-type expression (with `useDataSources`) into a real URL at
  runtime via its `onHtmlResolved` callback.

From `jimu-core` / `jimu-for-builder` / `jimu-ui` (setting `src/setting/setting.tsx`):

```ts
import {
  React, type IMAppConfig, type IMState, jsx, type IMThemeVariables, Immutable, type UseDataSource,
  type WidgetJson, expressionUtils, css, getAppStore, esri, DataSourceTypes
} from 'jimu-core'
import { type AllWidgetSettingProps, builderAppSync, helpUtils } from 'jimu-for-builder'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import {
  TextInput, TextArea, Switch, NumericInput, defaultMessages as jimuUiMessages,
  AdvancedButtonGroup, Button, richTextUtils, Tooltip, Label
} from 'jimu-ui'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { DynamicUrlEditor } from 'jimu-ui/advanced/dynamic-url-editor'
import { WarningOutlined } from 'jimu-icons/outlined/suggested/warning'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
```

- `DataSourceSelector` (from `jimu-ui/advanced/data-source-selector`) is the builder-side data-source
  picker; note it is NOT a Map/JimuMapView selector - this widget binds to feature/scene/imagery data
  sources for expression tokens, not to a map widget.
- `DynamicUrlEditor` (from `jimu-ui/advanced/dynamic-url-editor`) is the author-side counterpart to the
  runtime `DynamicUrlResolver`.
- `builderAppSync.publishChangeWidgetStatePropToApp` pushes transient state to the runtime widget.
- `helpUtils.getWidgetHelpLink('embed')` fetches the online help URL.

From `jimu-core` / `jimu-ui` (tools `src/tools/*.ts`):

```ts
import { Immutable, expressionUtils, dataSourceUtils, type Expression, type DuplicateContext, type extensionSpec, type IMAppConfig, type IMWidgetJson } from 'jimu-core'
import { richTextUtils } from 'jimu-ui'
```

## Reusable patterns found

### iframe embedding (imperative ref)

The iframe is created once in `getIframe` with a `ref` callback storing the element on `this.ifr`, and
all content changes are applied imperatively (`this.ifr.src`, `this.ifr.srcdoc`) rather than through
React props. Sandbox is applied conditionally (see safe-domain below).

```tsx
// src/runtime/widget.tsx
getIframe = (iframeWidth, iframeHeight, iframeParams, sandbox = false) => {
  const { id, a11yLabel } = this.props
  const title = a11yLabel || this.formatMessage('embedHint')
  const sandboxProps = sandbox ? {
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-popups-to-escape-sandbox'
  } : {}
  return (
    <iframe
      id={`${WIDGET_PREFIX_FOR_A11Y_SKIP}${id}`}
      title={title}
      className={`iframe-${id} ${!iframeWidth && 'w-100'} ${!iframeHeight && 'h-100'} embed-iframe`}
      {...sandboxProps}
      allowFullScreen
      onLoad={this.iframeOnLoad}
      ref={(f) => { this.ifr = f }}
      allow="local-network-access; geolocation"
      data-testid="embedSandbox"
      {...iframeParams}
    />
  )
}
```

### Dynamic URL resolver (expression/attribute)

For `EmbedType.Url`, the resolved URL comes from `DynamicUrlResolver`, which takes the config
`expression` plus `useDataSources` and calls `onHtmlResolved(url, hasExpression)`. The widget trims the
result, stores it as `content`, and marks `resolveErr` when unresolved expressions remain.

```tsx
// src/runtime/widget.tsx (render)
{embedType === EmbedType.Url &&
  <DynamicUrlResolver
    widgetId={id}
    useDataSources={this.props.useDataSources}
    value={config.expression}
    onHtmlResolved={this.onHtmlResolved}
  />
}
```

```ts
// src/runtime/widget.tsx
onHtmlResolved = (url, hasExpression) => {
  const trimmedUrl = url.replace(/(^\s*|\s*$)/g, '')
  this.setState({
    contentLabel: trimmedUrl,
    content: trimmedUrl,
    resolveErr: hasExpression
  })
}
```

On the builder side, `DynamicUrlEditor` produces that expression, and `webAddressExpressionChange`
regenerates `useDataSources` fields from the expression parts:

```ts
// src/setting/setting.tsx (webAddressExpressionChange, abridged)
const embedExpressions = richTextUtils.getAllExpressions(expression)
const parts = getExpressionParts(embedExpressions)
let udsWithFields = expressionUtils.generateFieldsForUseDataSourcesByExpressionParts(parts, useDataSources) as any
const udsWithoutFields = expressionUtils.getUseDataSourcesWithoutFields(useDataSources)
udsWithFields = expressionUtils.mergeUseDataSources(udsWithoutFields, udsWithFields)
```

### HTML sanitization (esri.Sanitizer)

Both runtime and setting sanitize author-provided HTML with the JSAPI `Sanitizer`. The setting also
uses a second, strip-everything sanitizer for expression text.

```ts
// src/runtime/widget.tsx
const Sanitizer = esri.Sanitizer
const sanitizer = new Sanitizer()
// ...
const embedByCodeUrl = getUrlByEmbedCode(embedCode)
const mediaCodeOrSanitizedHtml = embedByCodeUrl || sanitizer.sanitize(embedCode)
```

```ts
// src/setting/setting.tsx
const sanitizer = new esri.Sanitizer()
const sanitizer2 = new esri.Sanitizer({ whiteList: {}, stripIgnoreTag: true })
```

`getUrlByEmbedCode` (utils) also strips dangerous schemes:

```ts
// src/utils/index.ts (tail of getUrlByEmbedCode)
const formatUrl = decodeURI(embedUrl).trim().toLocaleLowerCase()
if (formatUrl.startsWith('javascript:') || formatUrl.startsWith('data:') || formatUrl.startsWith('vbscript:')) embedUrl = ''
return embedUrl
```

### Safe-domain detection (sandbox opt-out)

Content from `*.arcgis.com` or the current org portal domain is treated as same-origin and loaded
WITHOUT the iframe `sandbox` attribute; everything else is sandboxed.

```ts
// src/runtime/widget.tsx
const safeDomainArray = ['.arcgis.com']

checkSafeDomain = (url: string): boolean => {
  let safeFlag = false
  if (!url) return safeFlag
  const appState = getAppStore().getState()
  const selfPortal = appState?.portalSelf
  let selfPortalDomain = selfPortal?.portalHostname
  if (selfPortalDomain?.includes('/')) selfPortalDomain = selfPortalDomain.split('/')[0]
  const safeDomain = [...safeDomainArray]
  if (selfPortalDomain) safeDomain.push(selfPortalDomain)
  let toBeCheckedDomain = ''
  if (url.includes('https://')) toBeCheckedDomain = url.substring(8).split('/')[0]
  if (toBeCheckedDomain === 'arcgis.com') return true
  for (const safeItem of safeDomain) {
    if (toBeCheckedDomain.includes(safeItem)) { safeFlag = true; break }
  }
  return safeFlag
}
```

```tsx
// src/runtime/widget.tsx (render)
let withSandbox = true
if (embedType === EmbedType.Url || (embedType === EmbedType.Code && !useSrcdoc)) {
  withSandbox = !this.checkSafeDomain(this.processUrl(content, true))
}
```

### Auto-refresh

An interval (config `autoInterval`, minutes) reloads the iframe when `autoRefresh` is on. srcdoc
iframes are reloaded by reassigning `srcdoc`; src iframes are blanked then reassigned.

```ts
// src/runtime/widget.tsx (autoRefreshHandler, first branch)
if (!this.refreshTimer && autoRefresh) {
  const autoRefreshTimer = setInterval(() => {
    if (this.ifr) {
      if (embedType === EmbedType.Code && useSrcdoc) {
        const srcDoc = this.ifr.srcdoc
        this.ifr.srcdoc = srcDoc
      } else {
        const src = this.ifr.src
        this.ifr.src = ''
        setTimeout(() => { if (this.ifr) this.ifr.src = src }, 100)
      }
    }
  }, autoInterval * 60 * 1000)
  this.refreshTimer = autoRefreshTimer
} else if (this.refreshTimer && !autoRefresh) {
  clearInterval(this.refreshTimer)
  this.refreshTimer = null
}
```

### Blank message fallback

When the URL is empty/invalid the widget shows an error mask. If `enableBlankMessage` is on, the custom
`blankMessage` is shown instead of the default "unsupported url" text.

```ts
// src/runtime/widget.tsx (checkURLFormat, empty branch)
if (!str || str === '') {
  if (!onlyCheckUrl) this.setState({ isEmptyUrl: true })
  const { enableBlankMessage, blankMessage } = this.props.config
  const urlInvalid = this.errMessages.unSupportUrl
  const usedMessage = enableBlankMessage ? (blankMessage || urlInvalid) : urlInvalid
  if (!onlyCheckUrl) this.setState({ errMessage: usedMessage })
  return false
}
```

### appConfig / builder extensions

`AppConfigOperation` remaps data-source ids embedded inside expression HTML on copy
(`afterWidgetCopied`) and on data-source change (`useDataSourceWillChange`). `BuilderOperations`
registers translatable config value keys.

```ts
// src/tools/app-config-operations.ts (useDataSourceWillChange)
useDataSourceWillChange (appConfig, dataSourceId, newDataSourceId?) {
  let newAppConfig = appConfig
  if (dataSourceId || newDataSourceId) {
    const widgetJson = appConfig.widgets[this.widgetId]
    const config: IMConfig = widgetJson?.config
    let expression = config.expression
    expression = replaceExpressionDataSource(expression, dataSourceId, newDataSourceId, this.widgetId, appConfig)
    newAppConfig = appConfig.setIn(['widgets', this.widgetId, 'config', 'expression'], expression)
  }
  return newAppConfig
}
```

## Builder vs runtime split

- Builder (`src/setting/setting.tsx`): author picks embed type (`AdvancedButtonGroup`), binds data
  sources (`DataSourceSelector`), authors the URL expression (`DynamicUrlEditor`) or pastes code
  (`TextArea`), and toggles label / blank-message / auto-refresh / honor-font. All persistent changes go
  through `onSettingChange` writing `config` and `useDataSources`. Transient runtime state
  (`codeLimitExceeded` when code exceeds `MAX_CODE_LEN = 8192`) is pushed via
  `builderAppSync.publishChangeWidgetStatePropToApp`. Code-embed is disabled for trial/developer account
  types (`disableByCode`).
- Runtime (`src/runtime/widget.tsx`): reads `config` + `useDataSources`, resolves the URL
  (`DynamicUrlResolver` for URL type; `getUrlByEmbedCode`/`srcdoc` for code type), sanitizes, checks the
  URL format and safe domain, and drives the iframe imperatively. It reads `appMode`, `sectionNavInfos`,
  and `user` from the store via `mapExtraStateProps` to trigger reloads.
- Tools run in the builder/app-config layer, not in either component render tree.

## Lifecycle and cleanup

Runtime (`src/runtime/widget.tsx`):

- `constructor`: seeds `content` from either `expression` (URL) or sanitized code, sets `useSrcdoc`.
- `componentDidMount`: if content exists, sets `isLoading`; for code type calls `loadContent()`
  immediately (URL type waits for resolver-driven update).
- `componentDidUpdate`: the main engine - reacts to embed-type change, expression/code change,
  blank-message change, app-mode change, credential (`user`) change, auto-refresh config change, section
  navigation change, and theme font change; reloads/reprocesses accordingly.
- NOTE: there is NO `componentWillUnmount` in the runtime widget. The auto-refresh interval is only
  cleared inside `autoRefreshHandler` when `autoRefresh` is turned off or the interval changes; it is not
  explicitly cleared on unmount in the inspected source. (UNVERIFIED whether the framework tears down the
  widget instance in a way that stops the timer; `src/runtime/widget.tsx`.)

Setting (`src/setting/setting.tsx`):

- `componentDidMount`: normalizes empty URL expression to `''` (for undo parity) and fetches the help
  link via `helpUtils.getWidgetHelpLink('embed')`.
- `componentDidUpdate`: keeps the uncontrolled `TextArea` value in sync with `config.embedCode` (for
  undo/redo).
- `componentWillUnmount`: clears the transient runtime flag with
  `builderAppSync.publishChangeWidgetStatePropToApp({ widgetId, propKey: 'codeLimitExceeded', value: false })`.

## Manifest/config requirements

From `manifest.json`:

- `name: "embed"`, `type: "widget"`, version/exbVersion `1.20.0`.
- `properties.hasSettingPage: true`, `coverLayoutBackground: true`, `supportAutoSize: false`,
  `handleA11yLabelInWidget: true`.
- `defaultSize`: `{ width: 400, height: 300 }`.
- Two `extensions`:
  - `appConfigOperations` -> point `APP_CONFIG_OPERATIONS`, uri `tools/app-config-operations`.
  - `builderOperations` -> point `BUILDER_OPERATIONS`, uri `tools/builder-operations`.
- No `dependencies` array is declared here even though the code uses `esri.Sanitizer`; the JSAPI is
  reached through the `jimu-core` `esri` bridge rather than a manifest dependency. (Observed in
  `manifest.json`; contrast with the repo golden-path rule to declare JSAPI deps for custom widgets.)

`config.json` ships only `{ "embedType": "url" }`. The full config shape is in `src/config.ts`
(`EmbedType`, `Config`, `IMConfig`): `embedType`, `embedCode`, `staticUrl`, `expression`,
`autoRefresh`, `autoInterval`, `enableLabel`, `label`, `enableBlankMessage`, `blankMessage`,
`honorThemeFont`. NOTE: `staticUrl` is declared in the interface but was not referenced by the inspected
runtime/setting code (UNVERIFIED usage; `src/config.ts`).

## Gotchas

- Imperative iframe control: content is set via `this.ifr.src` / `this.ifr.srcdoc`, often inside a
  `setTimeout(..., 100)` after clearing the previous attribute. Do not expect React to manage the iframe
  content declaratively.
- `useSrcdoc` decides the load path: true means "render sanitized HTML via srcdoc" (unmatched code);
  false means "load a resolved URL via src" (URL type, or code that maps to a known embed URL through
  `getUrlByEmbedCode`).
- Sandbox is intentionally dropped for arcgis.com and the org portal domain (`checkSafeDomain`). Adding
  new trusted domains means editing `safeDomainArray` in `src/runtime/widget.tsx`.
- Font injection (`honorThemeFont`) only works for same-origin `srcdoc` iframes; cross-origin
  `contentDocument` access returns null and is silently skipped (`updateIframeFont`/`removeIframeFont`).
- Code length cap is `MAX_CODE_LEN = 8192` in the setting; exceeding it sets `codeLimitExceeded` (via
  `builderAppSync`) and shows a warning `Alert`, and the widget renders the placeholder.
- Placeholder detection treats empty rich-text (`'<p><br></p>'`, `'<p></p>'`) as empty for URL type.
- Code embed is disabled for trial/developer account types (`disableByCode`), so authors on those
  accounts only get the URL path.
- `ViewVisibilityContext` gates iframe loading: inside a Section/View, the iframe defers loading until
  its view becomes current (`shouldRenderIframeInView` / `needLoadContentInView`).
- Auto-refresh timer cleanup on unmount is not present in the inspected runtime source (see Lifecycle).

## Useful snippets and functions

Source: `src/config.ts`

```ts
export enum EmbedType {
  Url = 'url',
  Code = 'code'
}

export interface Config {
  embedType: EmbedType
  embedCode: string
  staticUrl: string
  expression: string
  autoRefresh?: boolean
  autoInterval?: number
  enableLabel?: boolean
  label?: string
  enableBlankMessage?: boolean
  blankMessage?: string
  honorThemeFont?: boolean
}
```

Source: `src/runtime/widget.tsx` (pull store slices into props)

```ts
static mapExtraStateProps = (state: IMState, props: AllWidgetProps<IMConfig>): Props => {
  return {
    appMode: state?.appRuntimeInfo?.appMode,
    sectionNavInfos: state?.appRuntimeInfo?.sectionNavInfos,
    user: state?.user
  }
}
```

Source: `src/runtime/widget.tsx` (imperative load path)

```ts
loadContent = () => {
  const { config } = this.props
  const { content, useSrcdoc } = this.state
  const { embedType } = config
  if (this.ifr) {
    this.ifr.removeAttribute('srcdoc')
    this.ifr.removeAttribute('src')
    if (embedType === EmbedType.Code) {
      if (useSrcdoc) {
        this.ifr.srcdoc = content
      } else {
        setTimeout(() => { if (this.ifr) this.ifr.src = this.processUrl(content) }, 100)
      }
    } else {
      setTimeout(() => { if (this.ifr) this.ifr.src = this.processUrl(content) }, 100)
    }
  }
}
```

Source: `src/runtime/widget.tsx` (canonicalize provider URLs - Vimeo/YouTube/Facebook + org URL swap)

```ts
// Youtube watch -> embed
if (/https:\/\/www\.youtube\.com\/watch\?.*v=.*/.test(lowerUrl)) {
  const queryObj = queryString.parseUrl(url)?.query
  const id = queryObj?.v
  let youtubeEmbed = `https://www.youtube.com/embed/${id}`
  delete queryObj?.v
  // ... reappend remaining query params ...
  return youtubeEmbed
}
```

Source: `src/utils/index.ts` (map pasted embed code to a canonical URL; strips unsafe schemes)

```ts
export const getUrlByEmbedCode = (embedCode: string) => {
  let embedUrl = ''
  const regIframe = /<iframe\s+[^>]*src=['"]([^'"]+)[^>](.*)/gi
  // ... Instagram / Twitter tweet / Twitter timeline regexes ...
  if (regIframe.test(embedCode)) {
    embedCode.replace(regIframe, (match, capture) => { embedUrl = capture; return match })
  } // else if (regIns) / else if (regTweet) / else if (regTimeLine) ...
  const formatUrl = decodeURI(embedUrl).trim().toLocaleLowerCase()
  if (formatUrl.startsWith('javascript:') || formatUrl.startsWith('data:') || formatUrl.startsWith('vbscript:')) embedUrl = ''
  return embedUrl
}
```

Source: `src/utils/index.ts` (extract width/height from pasted iframe code)

```ts
export const getParamsFromEmbedCode = (embedCode: string) => {
  const regIframeWidth = /<iframe\s+[^>]*width=['"]([^'"]+)[^>](.*)/gi
  const regIframeHeight = /<iframe\s+[^>]*height=['"]([^'"]+)[^>](.*)/gi
  const widthArr = regIframeWidth.exec(embedCode)
  const heightArr = regIframeHeight.exec(embedCode)
  let width, height
  if (widthArr?.length > 1) width = widthArr[1]
  if (heightArr?.length > 1) height = heightArr[1]
  return { width, height }
}
```

Source: `src/setting/setting.tsx` (only remove `<script>`-free sanitized code; enforce max length)

```ts
embedCodeChangeRightAway = value => {
  const { config, id } = this.props
  const contentLength = value?.length
  if (contentLength > MAX_CODE_LEN) {
    this.setState({ showCodeError: true, codeErrorMessage: 'maxLimit' })
    builderAppSync.publishChangeWidgetStatePropToApp({ widgetId: id, propKey: 'codeLimitExceeded', value: true })
    return
  } else {
    builderAppSync.publishChangeWidgetStatePropToApp({ widgetId: id, propKey: 'codeLimitExceeded', value: false })
  }
  let formatCode = value
  const isCodeUnsupported = formatCode ? !getUrlByEmbedCode(formatCode) : false
  if (formatCode && isCodeUnsupported) formatCode = sanitizer.sanitize(formatCode)
  this.setState({ showCodeError: false })
  this.props.onSettingChange({ id, config: config.set('embedCode', formatCode) })
}
```

Source: `src/tools/builder-operations.ts` (declare translatable config value keys)

```ts
getTranslationKey (appConfig: IMAppConfig): Promise<extensionSpec.TranslationKey[]> {
  const config = appConfig.widgets[this.widgetId].config as IMConfig
  const { enableLabel, label, enableBlankMessage, blankMessage } = config
  const keys: extensionSpec.TranslationKey[] = []
  if (enableLabel && label) {
    keys.push({ keyType: 'value', key: `widgets.${this.widgetId}.config.label`, label: { key: 'label', enLabel: jimuUiMessage.label }, valueType: 'text' })
  }
  if (enableBlankMessage && blankMessage) {
    keys.push({ keyType: 'value', key: `widgets.${this.widgetId}.config.blankMessage`, label: { key: 'blankMessage', enLabel: defaultMessages.blankMessage }, valueType: 'text' })
  }
  return Promise.resolve(keys)
}
```
