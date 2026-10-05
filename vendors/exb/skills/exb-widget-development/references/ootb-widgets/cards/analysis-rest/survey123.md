# OTB Widget: survey123

Online widget doc: https://developers.arcgis.com/experience-builder/guide/survey-widget/

## Purpose
Embeds an ArcGIS Survey123 web form inside an ExB widget so users can submit,
edit, or view survey records without leaving the app. The widget loads the
Survey123 web form JS API, renders the form in an in-widget iframe container,
and can optionally link a feature data source so map selections prefill or open
existing survey records (new / edit / view modes).

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/survey123/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/survey123/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/survey123/src/service/survey123.service.ts
- ArcGISExperienceBuilder/client/dist/widgets/survey123/src/setting/setting.tsx

Note: the `dist/` and `tests/` sibling folders under the widget root were
intentionally not inspected (per task scope). The source root is gitignored, so
these files are only reachable via ignored-file reads.

## Architecture overview
(webform iframe integration)

The runtime widget does not build the iframe markup itself. Instead it:

1. Resolves the Survey123 host URL (from portal `config.js` /
   `portals/self/settings`, or a default of `https://survey123.arcgis.com`).
2. Dynamically loads the Survey123 web form JS API module
   (`.../api/jsapi/3.24/`) via `moduleLoader.loadModule`.
3. Creates an empty container `<div>` in `render()` and hands its DOM id to
   `new this.API.Survey123WebForm(options)`, which injects the actual iframe.
4. Communicates with the embedded form both through the JS API instance
   (`webform.setQuestionValue(...)`, form lifecycle callbacks) and through raw
   `window` `message` events posted by the iframe.

When a feature data source is linked, a `DataSourceComponent` drives
selection-change handling. Depending on the configured `mode`:
- `new` + `activeLinkData`: selected feature attributes/geometry are mapped to
  survey questions (`fieldQuestionMapping`) and pushed into the live form.
- `edit` / `view`: the selected feature's globalId (or objectId fallback) is
  passed to the form as `globalId` and the form is recreated in that mode.

## Key imports and packages
(grouped; file path per import)

Runtime widget - ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
- from `jimu-core`: `React`, `DataSourceManager`, `SessionManager`,
  `DataSourceStatus`, `Immutable`, `getAppStore`, `IMUrlParameters`, `IMState`,
  `portalUrlUtils`, `AllWidgetProps`, `jsx`, `moduleLoader`, `semver`,
  `DataSourceComponent`, `AllDataSourceTypes`
- from `jimu-ui`: `WidgetPlaceholder`
- from `../config`: `IMConfig`
- from `../service/survey123.service`: `survey123Service`
- from `jimu-icons/svg/outlined/brand/widget-survey.svg`: `WidgetIcon`
- esri JSAPI:
  - `esri/geometry/Extent` (type `Extent`)
  - `esri/rest/query` (`* as query`, uses `query.executeQueryJSON`)
  - `esri/rest/support/Query` (`Query`)
  - `esri/geometry/SpatialReference` (`SpatialReference`)
- Note: `jimu-arcgis` imports (`ArcGISDataSourceTypes`, `JimuMapView`) exist only
  as commented-out code in this file; the manifest still declares
  `dependency: jimu-arcgis`.

Service - ArcGISExperienceBuilder/client/dist/widgets/survey123/src/service/survey123.service.ts
- from `jimu-core`: `getAppStore`, `SessionManager`, `portalUrlUtils`, `esri`,
  `DataSourceManager`
- from `@esri/arcgis-rest-request`: `HTTPMethods` (type only)

Setting - ArcGISExperienceBuilder/client/dist/widgets/survey123/src/setting/setting.tsx
- from `jimu-core`: `React`, `Immutable`, `DataSourceManager`, `jsx`,
  `SessionManager`, `css`, `moduleLoader`, `portalUrlUtils`, `DataSourceTypes`,
  `getAppStore`, `ClauseValuePair`, `semver`, `UseDataSource`, `dateUtils`
- from `jimu-for-builder`: `AllWidgetSettingProps`, `builderAppSync`
- from `jimu-for-builder/service`: `appServices`
- from `jimu-ui/advanced/setting-components`: `SettingSection`, `SettingRow`
- from `jimu-ui`: `Button`, `TextInput`, `TextArea`, `Select`, `Radio`,
  `Switch`, `Label`, `Modal`, `AlertPopup`, `TagInput`, `AdvancedSelect`
- from `jimu-ui/advanced/data-source-selector`: `DataSourceSelector`
- from `jimu-icons/outlined/editor/close`: `CloseOutlined`
- from `jimu-icons/outlined/application/link-horizontal`: `LinkHorizontalOutlined`
- from `jimu-icons/outlined/editor/trash`: `TrashOutlined`

## Reusable patterns found

- webform iframe container: `render()` produces a bare
  `<div className="embed-container" ref=... id={this.domId}>` and the Survey123
  JS API fills it. The DOM id is randomized per instance via `updateDomId()`.
- survey123Service: a shared singleton-style service module
  (`survey123Service`) centralizing host-URL resolution, JS API URL building,
  survey search/create REST calls, webform URL building, and data-source
  refresh after submit.
- DataSourceManager: used both in runtime (`getUsedDataSource`, layer
  definition / schema lookups, unique-id field resolution) and in the service
  (`getDataSourcesAsArray()` to find survey-related data sources and refresh
  them with `afterAddRecord(null)`).
- SessionManager: `getMainSession()` supplies the `clientId` and `token` passed
  into the web form options and into webform URL params (avoids a second login).
- feature action ShowVertexFeatureAction: declared in the manifest
  (`featureActions[].uri = "ShowVertexFeatureAction"`). The action class file is
  not present under `src/` in this inspected copy (UNVERIFIED - likely compiled
  only in `dist/`, which was out of scope).
- URL parameters: `getWebformUrl()` assembles query params (`portalUrl`,
  `embed`, `hide`, `field:<name>` defaults, `open`, `token`, `autoRefresh=3`).
  The widget also reads runtime URL params through `state.queryObject`
  (mapped in `mapExtraStateProps`) and `survey123Service.setQueryObject(...)`,
  supporting `survey123`, `env`, and `jsapi` overrides.
- prefill / edit / view modes: driven by `config.mode` (`new` | `edit` |
  `view`) plus `config.activeLinkData` and `config.fieldQuestionMapping`.

## Builder vs runtime split

- Setting (`setting.tsx`) is a large builder-only surface: it authenticates via
  `SessionManager`, loads the Survey123 client API through `moduleLoader`, lets
  the author search their own / shared surveys, create a new survey, pick the
  survey item, choose mode, link a data source with `DataSourceSelector`, and
  map fields to survey questions (`AdvancedSelect`, `TagInput`). It writes all
  of this into `IMConfig`.
- Runtime (`widget.tsx`) only consumes the resulting config: it never presents
  survey-picking UI, it just resolves the host, loads the JS API, builds the
  webform options/URL from `config`, and renders the embedded form.
- Shared logic lives in `survey123.service.ts`, imported by both sides, so host
  resolution and REST calls are not duplicated.

## Lifecycle and cleanup
(iframe message listener cleanup)

- `constructor` calls `getClientId()` and `listenSurvey123WebformEvent()`.
- `listenSurvey123WebformEvent()` registers a `window` `message` listener
  (`window.addEventListener('message', eventHandler, false)`), used to observe
  form events such as `survey123:onFormLoaded` and `survey123:onSubmitted`.
- `componentDidMount` sets the query object on the service and calls
  `prepare()` (host resolution + JS API load).
- GOTCHA: there is no `componentWillUnmount` and no `removeEventListener` in
  this widget - the global `message` listener is added but never removed, and
  the closure retains `this`. If you clone this pattern, add a
  `componentWillUnmount` that stores the handler and calls
  `window.removeEventListener('message', handler)`.
- Form re-creation: `createWebForm(options)` clears the container
  (`innerHTML = ''`, `this.webform = null`) before constructing a new
  `Survey123WebForm`, so stale iframes are replaced rather than stacked.
- `checkWebformOptionChanged()` gates recreation so benign config changes
  (e.g. default values only) do not force a full reload.

## Manifest/config requirements

Manifest (`manifest.json`):
- `type: "widget"`, `dependency: "jimu-arcgis"`,
  `settingDependency: "jimu-arcgis"`, `exbVersion: "1.20.0"`.
- `featureActions`: one action `{ name: "ShowVertex", uri: "ShowVertexFeatureAction" }`.
- `properties`: `coverLayoutBackground: true`, `supportAutoSize: false`.
- `defaultSize`: `300 x 400`.

Config (`config.ts` `Config` interface) - notable fields:
- `surveyItemId: string`, `portalUrl: string`
- `defaultValue: { [key: string]: any }`
- `open: string` (webform open mode: `web` | `menu` | `native`)
- `hides?: string[]`, `embeds?: string[]` (webform hide/embed url params)
- `mode?: string` (`new` | `edit` | `view`)
- `selectionChangeBehavior?: string` (e.g. `preserve`)
- `activeLinkData: boolean`, `selectedSurvey: any`
- `selectedSurveyQuestionFields?: string[]`, `fieldQuestionMapping: any[]`
- `useDataSources?: any`, `triggerEventType: string`
- `dsType?: string`, `timestamp?: number`
- `IMConfig = ImmutableObject<Config>`

## Gotchas

- No listener cleanup (see Lifecycle) - the `message` handler leaks on unmount.
- The widget relies on an external, versioned JS API URL
  (`/api/jsapi/3.24/`). The version is hardcoded in the service and can be
  overridden only via the `jsapi` URL param. Upstream API changes can break the
  embed.
- Host resolution has multiple fallbacks (portal `self/settings`, portal
  `config.js` injected as a `<script>` tag, then a default host). The
  `config.js` path mutates and restores the document `dir` attribute to work
  around an RTL side effect - do not remove that restore logic.
- Geometry handling: for non-WGS84, non-WebMercator selected features the
  widget re-queries the feature service (`query.executeQueryJSON`) requesting
  `outSpatialReference wkid 4326`. Missing outFields also trigger a re-query.
- `selectionChangeBehavior === 'preserve'` uses timed flags
  (`_isClearSelectionFreezing`, `setTimeout(... 1700/1800)`) to avoid spurious
  reloads because a re-select fires as a clear+select pair. This is timing
  fragile.
- `clientId` falls back to the literal `'survey123hub'` when no session/app
  clientId is available.
- `isDebugMode` is computed from a self-comparison
  (`'production' !== 'production'`) that always evaluates false - it is dead
  toggling left in the shipped source.
- The manifest declares `jimu-arcgis` as a dependency, but the runtime widget's
  `jimu-arcgis` imports are commented out; map integration is achieved purely
  through data sources, not a direct `JimuMapView`.

## Useful snippets and functions
(REAL snippets only; source path above each)

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
```tsx
// Redux -> props: expose runtime URL params to the widget
static mapExtraStateProps = (state: IMState): ExtraProps => {
  return {
    queryObject: state.queryObject
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
```tsx
// Resolve host, then dynamically load the Survey123 web form JS API module
prepare = () => {
  const portalUrl = this.props.config.portalUrl || this.props.portalUrl || 'https://www.arcgis.com'
  const isPortal = !(portalUrlUtils.isAGOLDomain(portalUrl))
  return Promise.resolve(true)
    .then(() => {
      if (isPortal) {
        return survey123Service.getSurveyHostUrlFromPortal(portalUrl)
      }
      return true
    })
    .then(() => {
      return this.loadSurveyAPI()
    })
}

loadSurveyAPI = () => {
  const apiUrl = survey123Service.getSurvey123HostAPIUrl()
  if (!this.API.Survey123WebForm) {
    return moduleLoader.loadModule(apiUrl)
      .then((data) => {
        if (data && data.Survey123WebForm) {
          this.API = data
        } else {
          this.API.Survey123WebForm = data
        }
        return this.API.Survey123WebForm
      })
  } else {
    return Promise.resolve(this.API.Survey123WebForm)
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
```tsx
// Listen to iframe postMessage events from the embedded web form.
// NOTE: no matching removeEventListener exists in this widget.
listenSurvey123WebformEvent () {
  const eventHandler = (evt: any) => {
    if (evt && evt.data) {
      let payload
      try {
        if (typeof evt.data === 'string') {
          payload = JSON.parse(evt.data)
        } else if (evt.data && evt.data.payload) {
          if (typeof evt.data.payload === 'string') {
            payload = JSON.parse(evt.data.payload)
          } else {
            payload = evt.data.payload
          }
        } else {
          payload = evt.data
        }
      } catch (err) {
        pWinSt.error(err)
      }
      const event = payload.event
      const data = payload.data

      if (event === 'survey123:onFormLoaded') {
        if (event === 'survey123:onFormLoaded' && payload.contentHeight) {
          // set iframe height (currently disabled)
        }
      }

      if (event === 'survey123:onSubmitted') {
        pWinSt.log('survey123:onSubmitted!', data)
      }
    }
  }

  if (window.addEventListener) {
    window.addEventListener('message', eventHandler, false)
  } else {
    (window as any).attachEvent('onmessage', eventHandler)
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
```tsx
// Create / recreate the web form: clear the container first, then construct
createWebForm (options) {
  const formNode = document.querySelector('#' + this.domId)
  if (formNode) {
    document.querySelector('#' + this.domId).innerHTML = '' // clear the webform and reload
    this.webform = null
  }

  this.webappStatus = 'loading'
  this.webform = new this.API.Survey123WebForm(options)
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
```tsx
// Push mapped values into the live form, or rebuild it after the thank-you screen
sendValueFromMapToSurvey (dataParams) {
  if (this.webappStatus === 'loading') {
    // skip
  } else if (this.webappStatus === 'normal') {
    if (!this.webform) {
      return
    }
    if (dataParams) {
      // call survey jsapi to change value on-fly
      this.webform.setQuestionValue(dataParams)
    }
  } else if (this.webappStatus === 'thankyouScreen') {
    const options = this.buildWebFormConfig({
      setQuestionValue: dataParams
    })
    this.createWebForm(options)
  }
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/runtime/widget.tsx
```tsx
// render(): placeholder when no survey; otherwise the empty iframe container,
// plus renderDS() which returns either a DataSourceComponent or <div/>
render () {
  survey123Service.setQueryObject(this.props.queryObject)
  const webformUrl = this.getWebformUrl()
  let result

  if (!webformUrl) {
    result = <div className="survey123__noSurvey">
      <WidgetPlaceholder
        icon={WidgetIcon}
        name={this.props.intl.formatMessage({ id: '_widgetLabel', defaultMessage: defaultMessages._widgetLabel })}
        widgetId={this.props.id}/>
    </div>
  } else {
    if (!this.domId) {
      this.updateDomId()
    }
    result = <div className="survey123__webform">
                <div className="embed-container" ref={(f) => { this.iframeContainer = f } } id={this.domId}></div>
              </div>
    this.updateIframeTitle()
  }

  return <div css={getStyle(this.props.theme)} className="survey123">
    {
      result
    }
    {
      this.renderDS()
    }
  </div>
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/service/survey123.service.ts
```ts
// Build the Survey123 web form share URL with query params
public getSurvey123WebformUrl (surveyItemId: string, options?: {
  queryParams?: string[]
}): string {
  options = Object.assign({
    queryParams: []
  }, options || {})

  const isDebug: boolean = false

  let url = `${this.getSurvey123HostUrl()}/share/${surveyItemId}`

  if (isDebug) {
    url = `https://nanzhang.arcgis.com:8443/webclient/?appid=${surveyItemId}`
  }

  if (options.queryParams.length > 0) {
    url += `${(isDebug) ? '&' : '?'}${options.queryParams.join('&')}`
  }

  return url
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/service/survey123.service.ts
```ts
// After a submit, refresh any data sources tied to the survey's feature service
public updateRelatedDataSources (surveyItemId: string, mode: string) {
  const dataSourceList = DataSourceManager.getInstance().getDataSourcesAsArray()
  if (!dataSourceList.length) {
    return
  }

  return Promise.resolve(true)
    .then(() => {
      return this.getSurveyFeatureServices(surveyItemId)
    })
    .then((services: any[]) => {
      dataSourceList.filter((dataSource: any) => {
        const itemId = dataSource.itemId
        const url = dataSource.url || ''
        const isSurveyRelatedDataSouce = services.find((serviceInfo) => {
          if (serviceInfo.itemId === itemId || url.startsWith(serviceInfo.url)) {
            return true
          }
          return false
        })

        if (isSurveyRelatedDataSouce) {
          dataSource.afterAddRecord(null)
        }
        return isSurveyRelatedDataSouce
      })
    })
}
```

Source: ArcGISExperienceBuilder/client/dist/widgets/survey123/src/setting/setting.tsx
```tsx
// Setting imports show the builder toolkit used for survey picking + data linking
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { Button, TextInput, TextArea, Select, Radio, Switch, Label, Modal, AlertPopup, TagInput, AdvancedSelect } from 'jimu-ui'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
```
