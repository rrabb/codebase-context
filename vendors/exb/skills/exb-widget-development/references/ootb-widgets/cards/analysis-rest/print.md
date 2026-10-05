# OTB Widget: common/print

Online widget doc: https://developers.arcgis.com/experience-builder/guide/print-widget/

## Purpose

The Print widget exports the connected 2D map (a `JimuMapView`) to a printable document (PDF, PNG, JPG, and other formats) by calling an ArcGIS print/GP service (an ExB Utility of type `GPUtility`, backed by `Export Web Map Task` / `PrintingTools`). It supports organization print services and custom print services, organization layout templates and user-authored custom templates, layout options (title, author, copyright, legend, scale bar, north arrow, custom text elements), output spatial reference, DPI/quality, print extent modes, an on-map print-area preview overlay, and (for premium/report-capable services) report templates that emit output data sources.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/common/print/`

Inspected (high value):
- [manifest.json](../../../../../../ArcGISExperienceBuilder/client/dist/widgets/common/print/manifest.json) - full
- `src/config.ts` - full (types, enums, defaults)
- `src/runtime/widget.tsx` - full (entry, JimuMapView wiring, mode switch, placeholder)
- `src/runtime/component/classic/index.tsx` - full (tabbed template + result, `confirmPrint`)
- `src/runtime/component/compact/index.tsx` - head (props, popper UI, print import)
- `src/runtime/component/print-preview/index.tsx` - head (reactiveUtils watch, overlay graphic)
- `src/runtime/utils/print-service.ts` - full (the print() call)
- `src/runtime/utils/legend-util.ts` - head (dynamic legend layers)
- `src/utils/utils.ts` - key functions (esriRequest task info, session, utility state)
- `src/utils/service-util.ts` - head (portal url, session, template info fetch)
- `src/version-manager.ts` - head (config migration re-fetch of print task)
- `src/setting/setting.tsx` - full (MapWidgetSelector, mode, sections)
- `src/setting/component/template-list.tsx` - full (List/tree of templates)
- `src/setting/component/template-setting/template-setting.tsx` - head (custom template CRUD)
- `src/setting/component/app-item-selector/index.tsx` - head (portal item picker props)
- `src/runtime/component/output-datasource-list.tsx` - head (report output DS tracking)

Skipped (given size, lower value for card): `dist/**` (compiled), `tests/**`, translations, `src/constants.ts`, `src/tools/*` (app-config-operations, builder-operations - only noted via manifest), most `template-setting/*` leaf editors (`layout-*`, `report-*`, `map-only-*`, `element-overrides-*`), `scale-bar-setting.tsx`, `result*.tsx`, `unit-conversion.ts`, `print-preview/utils.ts`, `app-item-selector/utils.ts`.

## Architecture overview

- Two runtime modes selected by `config.modeType` (`ModeType.Classic` | `ModeType.Compact`), both rendered from the single [widget.tsx](../../../../../../ArcGISExperienceBuilder/client/dist/widgets/common/print/src/runtime/widget.tsx) entry.
  - Classic: inline `Paper` panel with two `Tabs` - "Print template" (template chooser + settings, `confirmPrint`) and "Results" (list of generated docs). Source: `runtime/component/classic/index.tsx`.
  - Compact: a small map-icon `Button` that opens a `Popper` panel (template `Select` + result), designed to live off-panel inside a Controller widget (`inControllerUx = 'offPanel'`). Source: `runtime/component/compact/index.tsx`.
- Print preview: `runtime/component/print-preview/index.tsx` draws an on-map overlay graphic showing the print-area/extent, watching `view.extent`/`view.scale` via `esri/core/reactiveUtils`. It feeds `previewOverlayItem` up to the widget, which is passed into the print call to compute the print `extent`.
- Print service call: all export requests funnel through `print()` in `runtime/utils/print-service.ts`, which loads `esri/rest/print` + support classes and calls `print.execute(url, PrintParameters)`.
- Template/task discovery: `src/utils/utils.ts` + `src/utils/service-util.ts` use `esri/request` (esriRequest) against the GP service to enumerate tasks, execution type (sync vs async job), supported layout/report templates, formats, and defaults. Results are cached into `config`.

## Key imports and packages

Grouped by source (import path shown per group):

jimu-core (framework primitives)
- `runtime/widget.tsx`: `React, jsx, css, AllWidgetProps, appActions, IMState, ReactRedux, ImmutableArray, hooks`
- `utils/utils.ts`: `esri, portalUrlUtils, SessionManager, Immutable, UtilityManager, DataSourceManager, DataSourceTypes, getAppStore, loadArcGISJSAPIModules`
- `utils/service-util.ts`: `UtilityManager, ServiceManager, Immutable, SessionManager`
- `runtime/utils/print-service.ts`: `UseUtility, Immutable, ImmutableArray, getAppStore, AllDataSourceTypes`
- `output-datasource-list.tsx`: `DataSourceComponent, DataSourceManager, DataSourceStatus, appConfigUtils, getAppStore`
- `app-item-selector/index.tsx`: `SessionManager, AppInfo, focusElementInKeyboardMode`

jimu-arcgis (map + JSAPI bridge)
- `runtime/widget.tsx`: `JimuMapViewComponent, JimuMapView, JimuMapViewGroup`
- `runtime/component/classic/index.tsx` and `compact/index.tsx`: `JimuMapView, MapViewManager`
- `runtime/utils/print-service.ts`: `loadArcGISJSAPIModules, JimuMapView`
- `runtime/component/print-preview/index.tsx`: `loadArcGISJSAPIModule, JimuMapView`

jimu-ui / advanced setting-components
- `runtime/widget.tsx`: `WidgetPlaceholder, Paper` (from `jimu-ui`)
- `runtime/component/classic/index.tsx`: `Loading, LoadingType, Tabs, Tab`
- `setting/setting.tsx`: `Icon, Button, Alert, CollapsablePanel` (jimu-ui) and `MapWidgetSelector, SettingSection, SettingRow` (from `jimu-ui/advanced/setting-components`)
- `setting/component/template-list.tsx`: `List, TreeItemType, TreeItemActionType` (from `jimu-ui/basic/list-tree`)

jimu-for-builder (settings only)
- `setting/setting.tsx`: `AllWidgetSettingProps, getAppConfigAction, builderAppSync`
- `template-setting/template-setting.tsx`: `SettingChangeFunction`

ArcGIS JSAPI modules loaded lazily via `loadArcGISJSAPIModules` (NOT static imports; declared implicitly through the API, not the manifest)
- `runtime/utils/print-service.ts`: `esri/rest/support/PrintParameters`, `esri/rest/support/PrintTemplate`, `esri/rest/print`, `esri/geometry/SpatialReference`, `esri/rest/support/LegendLayer`, `esri/geometry/Extent`, `esri/views/2d/viewpointUtils`
- `utils/utils.ts`: `esri/request` (esriRequest), `esri/kernel`, `esri/Graphic`, `esri/geometry/Polyline`, `esri/geometry/Polygon`, `esri/portal/PortalItem`
- `print-preview/index.tsx`: `esri/core/reactiveUtils`

@esri/arcgis-rest-request: NOT imported directly. REST-style auth calls go through `esri.restRequest.request` re-exported from `jimu-core` (`getOrganizationPrintTask` uses `esri.restRequest.request` with `SessionManager.getInstance().getMainSession()`).

## Reusable patterns found

- JimuMapView binding: `<JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onActiveViewChange={handleActiveViewChange} onViewGroupCreate={...} />`. `handleActiveViewChange` rejects null and non-`'2d'` views (Print only supports 2D map views). Source: `runtime/widget.tsx`.
- Print via print service (not client render): build `PrintTemplate` + `PrintParameters`, then `print.execute(printServiceUrl, params, { timeout: 120000, token })`. Source: `runtime/utils/print-service.ts`.
- Utility URL + auth: get the service URL with `UtilityManager.getInstance().getUrlOfUseUtility(useUtility)`; get the token via `SessionManager.getInstance().getSessionByUrl(portalUrl)` where portalUrl comes from `ServiceManager.getInstance().fetchArcGISServerInfo(url).owningSystemUrl`. Source: `utils/service-util.ts`, `utils/utils.ts`.
- UtilityManager health reporting: `reportUtilityState(utilityId, toggleRemind, err)` inspects `utilityHasSignInError` and HTTP 404/400 to flag sign-in / no-service and call `UtilityManager.getInstance().reportUtilityState(...)`. Source: `utils/utils.ts`.
- Org + custom templates: `config.printOrgTemplate` vs `config.printCustomTemplate`, selected by `PrintServiceType`/`PrintTemplateType`. `mergeTemplateSetting()` merges a template with `config.commonSetting` (per-template `overrideCommonSetting` flips precedence). Source: `utils/utils.ts`, classic `getNewTemplateWithCommonSetting`.
- Task discovery over REST: `getPrintTaskInfo(url)` and `getTemplateOrReportInfo(url, itemInfoType)` use `esriRequest(url, { query: { f: 'json' }, responseType: 'json' })`; async GP tasks poll `.../jobs/{jobId}/results/Output_JSON` (`getResultByJobId`, 3s interval, 10 attempts). Source: `utils/utils.ts`.
- Dynamic legend: `updateLegendLayers()` mirrors the JSAPI Print widget by building `LegendLayer` instances from visible layer views (the print template API does not natively support dynamic legends). Source: `runtime/utils/legend-util.ts`.
- On-map preview overlay: watch `view.extent`/`view.scale` with `reactiveUtils`, draw an overlay graphic, and derive the print `extent` from the preview box (`getExtentForPrint` uses `esri/views/2d/viewpointUtils.getExtent`). Source: `print-preview/index.tsx`, `print-service.ts`.
- Output data source list (reports): report templates can reference EXB data sources; `output-datasource-list.tsx` uses `DataSourceComponent` to track output DS creation and surface an output-DS warning. Source: `runtime/component/output-datasource-list.tsx`.
- Version manager migration: `Widget.versionManager = versionManager` (BaseVersionManager). Upgrade steps re-fetch the print task and rebuild template/report/layout config so saved apps stay valid. Source: `version-manager.ts`, wired in `runtime/widget.tsx`.

## Builder vs runtime split

- Runtime (`src/runtime/**`): reads immutable `config`, binds the map, renders classic/compact UI, computes print extent, and executes the print service call. It only reads config; it does not write app config.
- Builder/setting (`src/setting/**`): `Setting` uses `MapWidgetSelector` to bind a Map widget, picks `ModeType`, and configures the print service utility + templates + common settings + preview style. It writes via `onSettingChange` and, for layout/size changes, via `getAppConfigAction()` (e.g. `editLayoutItemProperty`, `editWidgetProperty(id, 'inControllerUx', 'offPanel'|'inPanel')`). `builderAppSync.publishChangeWidgetStatePropToApp` pushes transient `loadingPrintService` state to the running app.
- Extensions (manifest): `appConfigOperations` (`tools/app-config-operations`) and `builderOperations` (`tools/builder-operations`) hook app-config lifecycle events for the widget.

## Lifecycle and cleanup

- `useEffect` on `[config]` rebuilds `templateList`; on `[selectionIsSelf]` writes `layoutInfo` into widget state once (`isSetLayoutRef`); on `[loadingPrintService]` clears the template list while (re)loading the service.
- Timeouts: `showUtilityErrorRemindTimeoutRef` (5s auto-hide of utility error) and, in setting, `serviceErrorMessageTimeoutRef` (5s alert) are stored in refs; the error-remind timer is cleared before re-arming. (UNVERIFIED whether every timeout is cleared on unmount - not all cleanup return functions were inspected.)
- After each print, `removeTemporarilyAddedLayers(...)` removes any layers temporarily added for reports, and `resetTimeExtentOfMapView(...)` + `initHasZOfGraphicInMap(mapView, true)` restore the map's pre-print time extent and graphic Z state (in both success and error paths). Source: `runtime/utils/print-service.ts`.
- Preview overlay watchers (`reactiveUtils` handles stored in `watchExtentChangeHandleRef` / `watchScaleChangeHandleRef`) are meant to be removed when the preview area is torn down. (UNVERIFIED - cleanup body not fully read.)

## Manifest/config requirements

- `manifest.json`: `type: widget`, `properties.hasSettingPage: true`, `supportAutoSize: false`, `needHiddenState: true`, `defaultSize` 360x460. Two `extensions` (`APP_CONFIG_OPERATIONS`, `BUILDER_OPERATIONS`). No explicit map/JSAPI dependency array in the manifest - JSAPI modules are pulled at runtime via `loadArcGISJSAPIModules`.
- `config` (`IMConfig`) core fields: `modeType`, `printServiceType`, `printTemplateType`, `useUtility` (the print GP `UseUtility`), `printCustomTemplate[]`, `printOrgTemplate[]`, `commonSetting`, `formatList`, `defaultFormat`, `enablePreview`, `previewBackgroundColor`, `previewOutLine`, plus report/layout support flags (`supportCustomLayout`, `supportReport`, `supportCustomReport`) and derived `layoutChoiceList` / `reportTemplateChoiceList`. Source: `config.ts`.
- The widget requires a Map widget binding (`useMapWidgetIds`) and a configured print utility (`config.useUtility`); without either it renders a `WidgetPlaceholder`.

## Gotchas

- 2D only: non-`'2d'` (3D) map views are rejected in both runtime and setting `handleActiveViewChange`.
- Template API cannot do dynamic legends natively - the widget re-implements legend layers (`legend-util.ts`) copied from the JSAPI Print view model. Do not assume `PrintTemplate.layoutOptions.legendLayers` is populated by the service.
- Async GP services: layout/report info may be an async job; code polls `Output_JSON` up to ~30s (10 x 3s) before giving up and returning `[]`. Premium print stores export-web-map and layout-info in two different services (`getLayoutTempInfoTaskUrlOfPremiumService`), so the layout task URL is resolved separately.
- Time-aware maps: only mapView `timeExtent` is honored; layer-level time filters are a known limitation, so the code temporarily sets and then restores `mapView.timeExtent`.
- `LayoutType`/`FormatType` are effectively open strings (custom layouts allowed); the const `LAYOUT_ITEM` list is only the built-in set.
- Compact mode is intended to live inside a Controller (`inControllerUx: 'offPanel'`); switching modes in settings rewrites layout item `bbox` and the `inControllerUx` property via `getAppConfigAction`.
- REST auth uses `esri.restRequest.request` (re-exported by jimu-core) with `SessionManager` sessions, not `@esri/arcgis-rest-request` directly.

## Useful snippets and functions

Source: `src/runtime/utils/print-service.ts`
```ts
export const print = async (option: PrintOption) => {
  const { printTemplateProperties, useUtility, jimuMapView, elementOverrides, previewOverlayItem, toggleUtilityErrorRemind } = option
  const mapView = initMapViewWithTimeExtent(option.mapView, jimuMapView)
  const session = await getSessionByUtility(Immutable(useUtility))
  const previewExtent = previewOverlayItem ? await getExtentForPrint(previewOverlayItem, mapView, printTemplateProperties) : null
  return getUrlOfUseUtility(useUtility).then(printServiceUrl => {
    return loadArcGISJSAPIModules(['esri/rest/support/PrintParameters', 'esri/rest/support/PrintTemplate', 'esri/rest/print', 'esri/geometry/SpatialReference', 'esri/rest/support/LegendLayer']).then(modules => {
      const [PrintParameters, PrintTemplate, print, SpatialReference, LegendLayer] = modules
      printTemplateProperties.includeTables = true
      let template = new PrintTemplate(printTemplateProperties)
      if (printTemplateProperties?.hasLegend) {
        template = updateLegendLayers(mapView, template, printTemplateProperties?.hasLegend,
          getDynamicLegendsWithElementOverrides(printTemplateProperties?.layoutOptions?.elementOverrides), LegendLayer)
      }
      const printParameter = { view: initHasZOfGraphicInMap(mapView), template } as any
      if (printTemplateProperties.wkid !== mapView?.spatialReference?.wkid) {
        printParameter.outSpatialReference = new SpatialReference({ wkid: printTemplateProperties.wkid })
      }
      if (previewExtent) { printParameter.extent = previewExtent }
      const params = new PrintParameters(printParameter)
      const queryOption = { timeout: 120000, token: session?.token }
      return print.execute(printServiceUrl, params, queryOption).then((printResult) => {
        reportUtilityState(useUtility?.utilityId, toggleUtilityErrorRemind)
        return Promise.resolve(printResult)
      })
    })
  })
}
```

Source: `src/utils/service-util.ts` (utility -> portal -> session token)
```ts
export const getPortalUrlByUtility = async (utility: IMUseUtility): Promise<string> => {
  return getUrlOfUseUtility(utility).then(url => {
    return ServiceManager.getInstance().fetchArcGISServerInfo(url).then(serverInfo => {
      return Promise.resolve(serverInfo?.owningSystemUrl)
    })
  })
}

export const getSessionByUtility = async (utility: IMUseUtility): Promise<any> => {
  const portalUrl = await getPortalUrlByUtility(utility)
  return portalUrl ? SessionManager.getInstance().getSessionByUrl(portalUrl) : null
}
```

Source: `src/utils/utils.ts` (enumerate print task info over REST)
```ts
export function getPrintTaskInfo (taskUrl: string): Promise<PrintServiceTaskInfo> {
  const options = { query: { f: 'json' }, responseType: 'json' } as any
  return loadArcGISJSAPIModules(['esri/request']).then(modules => {
    const [esriRequest] = modules
    return esriRequest(taskUrl, options).then(res => handlePrintInfo(res?.data))
  })
}

export const getUrlOfUseUtility = async (useUtility: UseUtility) => {
  return UtilityManager.getInstance().getUrlOfUseUtility(useUtility).then((url) => Promise.resolve(url))
}
```

Source: `src/utils/utils.ts` (report utility health to UtilityManager)
```ts
export function reportUtilityState (utilityId: string, toggleUtilityRemind, err?: any) {
  const isSignInError = UtilityManager.getInstance().utilityHasSignInError(utilityId)
  let isNoService = err?.details?.httpStatus === 404
  if (err?.details?.httpStatus === 400 && err?.details?.message?.includes('Item does not exist')) { isNoService = true }
  if (isSignInError || isNoService) {
    toggleUtilityRemind && toggleUtilityRemind(true)
    UtilityManager.getInstance().reportUtilityState(utilityId, false, isSignInError)
  } else {
    toggleUtilityRemind && toggleUtilityRemind(false)
    UtilityManager.getInstance().reportUtilityState(utilityId, true)
  }
}
```

Source: `src/utils/utils.ts` (REST portal call with session auth)
```ts
export const getOrganizationPrintTask = (portalUrl: string) => {
  const request = esri.restRequest.request
  const sm = SessionManager.getInstance()
  return request(`${portalUrlUtils.getPortalRestUrl(portalUrl)}/portals/self`, {
    authentication: sm.getMainSession(),
    httpMethod: 'GET'
  }).then(portalSelf => Promise.resolve(portalSelf?.helperServices?.printTask || null))
    .catch(() => Promise.resolve(null))
}
```

Source: `src/runtime/component/classic/index.tsx` (execute a print job)
```ts
const confirmPrint = async (printTemplateProperties: IMPrintTemplateProperties) => {
  const isSupportReport = config?.supportCustomReport || config?.supportReport
  const newPrintTemplateProperties = await initTemplateProperties({
    printTemplateProperties: selectedTemplate, mapView: jimuMapView, locale,
    utility: config.useUtility, useMapWidgetIds, widgetId: id, isSupportReport
  })
  if (!newPrintTemplateProperties) { setNewPrintResultList(resultItem, PrintResultState.Error); return }
  const mapView = (isSupportReport ? MapViewManager.getInstance().getJimuMapViewById(jimuMapView.id) : null) || jimuMapView
  print({
    useUtility: config?.useUtility, mapView: mapView?.view as MapView,
    printTemplateProperties: newPrintTemplateProperties, jimuMapView, useMapWidgetIds, widgetId: id,
    isSupportReport, reportOptions: selectedTemplate?.reportOptions,
    elementOverrides: selectedTemplate?.layoutOptions?.elementOverrides,
    previewOverlayItem, toggleUtilityErrorRemind
  }).then(printResult => setNewPrintResultList(resultItem, PrintResultState.Success, printResult?.url),
          () => setNewPrintResultList(resultItem, PrintResultState.Error))
}
```

Source: `src/setting/setting.tsx` (bind Map widget + settings sections)
```tsx
<SettingSection className='map-selector-section'>
  <SettingRow flow='wrap' label={nls('selectMap')}>
    <MapWidgetSelector autoSelect onSelect={handleMapWidgetChange} aria-label={nls('selectMap')} useMapWidgetIds={useMapWidgetIds} />
  </SettingRow>
  <div className='fly-map'>
    <div><JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onActiveViewChange={handleActiveViewChange} /></div>
  </div>
</SettingSection>
```

Source: `src/runtime/widget.tsx` (2D-only active view guard)
```ts
const handleActiveViewChange = (jimuMapView: JimuMapView): void => {
  const notAddMap = !useMapWidgetIds || useMapWidgetIds?.length === 0
  if ((jimuMapView == null) && !notAddMap) { setErrorTip(nls('chooseMapTip')); setJimuMapView(null); return }
  if (!notAddMap && jimuMapView?.view?.type !== '2d') { setErrorTip(nls('chooseMapTip')); setJimuMapView(null); return }
  if (notAddMap) { setErrorTip(nls('printPlaceholder')) }
  setJimuMapView(jimuMapView)
}
```
