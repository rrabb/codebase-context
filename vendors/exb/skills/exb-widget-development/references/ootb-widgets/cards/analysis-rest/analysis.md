# OTB Widget: arcgis/analysis

Online widget doc: https://developers.arcgis.com/experience-builder/guide/analysis-widget/

> Analysis is a LARGE widget (~50 source files). This card leads with an architecture
> summary and the key classes/APIs, then focuses on the highest-value files. A full
> inspected-vs-skipped list is in "Source paths inspected". Items not directly read are
> marked UNVERIFIED with the file that would confirm them.

## Purpose

Runs ArcGIS spatial analysis tools from an Experience Builder app. An app author configures
a list of one or more tools; at runtime the widget renders each tool's parameter UI, submits
a geoprocessing (GP) job against the portal, tracks job status, records a job history, and can
add result layers to the bound Map widget. It supports three tool kinds:

- Standard analysis tools (the built-in spatial analysis / feature-analysis tools).
- Custom web tools (a GP service / notebook web tool referenced by a utility or URL).
- Raster function (RFx) tools (raster-analysis / raster-function editor tools).

The heavy lifting (parameter forms, validation, job orchestration, credit estimation) lives in
Esri's INTERNAL analysis component libraries; this widget is largely a jimu/React host and
bridge around those web components.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/analysis/` (gitignored build output).

Fully or substantially read:
- `manifest.json`
- `config.json` (default config is `{ "toolList": [] }`)
- `src/config.ts` (all config + history + tool types)
- `src/runtime/widget.tsx` (entire file, ~1100 lines)
- `src/runtime/analysis-tool/index.tsx` (tool dispatcher)
- `src/runtime/analysis-tool/config.ts` (`ToolProps`)
- `src/runtime/analysis-tool/tool-list.tsx`
- `src/runtime/analysis-tool/standard-tool.tsx`
- `src/runtime/analysis-tool/custom-tool.tsx` (entire file)
- `src/runtime/analysis-tool/rfx-tool.tsx`
- `src/utils/job.ts` (execute / job polling)
- `src/utils/history.ts` (partial: map history + local storage)
- `src/utils/events.ts`
- `src/utils/shared-utils.ts` (partial: asset paths + string loaders)
- `src/data-actions/set-as-analysis-input.tsx`
- `src/tools/app-config-operations.ts`
- `src/tools/builder-operations.ts`
- `src/setting/setting.tsx` (partial: top + tool add/remove + map/portal wiring)
- `src/setting/tool-setting/standard-tool-config.tsx` (partial)
- `src/version-manager.ts`

Inspected only at directory / import level (skipped deep read given size):
- `src/runtime/history/**` (history-detail, history-list, history-messages, history-parameters,
  history-result-for-custom-tool, history-result-for-standard-tool, utils)
- `src/runtime/analysis-tool/utils.ts`, `error.tsx`
- `src/runtime/components/**`, `src/runtime/utils.ts`
- `src/utils/util.ts`, `strings.ts`, `strings-manager.ts`, `tools.json`, `util.ts`
- `src/setting/tool-selector/**` (6 files: custom/rfx/standard selectors + search + button + ui)
- `src/setting/tool-setting/**` (custom-tool-config, custom-tool-input-config,
  custom-tool-output-config, custom-tool-option-config, custom-tool-name-edit, layer-input-type-config,
  custom-tool-config-collapsable-panel, collapse-header)
- `src/setting/components/**`, `src/setting/utils.ts`
- `src/data-actions/select-parameter-popper.tsx` (only its exported helpers seen via import)

Fully skipped: `dist/`, `chunks/`, `tests/`, `translations/`, `assets/`.

## Architecture overview

Three tool types, one dispatcher. `analysis-tool/index.tsx` picks the renderer by
`toolInfo.type` (`ToolType.Standard | RasterFunction | Custom`):

```
Widget (runtime/widget.tsx)
  Tabs
    Tab "tools"
      ToolList        -> pick a tool (if >1 configured)
      AnalysisTool    -> StandardTool | RFxTool | CustomTool
    Tab "history"
      HistoryList     -> HistoryDetail
  JimuMapViewComponent (binds Map widget)
```

- Each tool renderer creates an Esri INTERNAL custom element imperatively via
  `document.createElement('analysis-tool-app-container' | 'analysis-tool' | 'analysis-rfx-app-container')`,
  sets props on it (portal, mapView, mapLayers, jobParams, ...), and appends it with
  `ref.replaceChildren(container)`. It is NOT a JSX component; it is a stencil/calcite web component.
- GP engine: jobs run through `esri/rest/geoprocessor` (`submitJob` for async,
  `execute` for synchronous). See `src/utils/job.ts::executeJob`.
- Job lifecycle is event-driven. The tool components emit DOM CustomEvents
  (`analysisCoreJobSubmited`, `analysisCoreJobStatus`, `analysisCoreResultDataComplete`); the
  widget root listens on its own container element (`widgetContainer`) so a job keeps updating
  history even after the tool panel is closed.
- Job history: kept in React state (`historyListFromTools`), persisted to localStorage at
  runtime, AND can be imported from a job history resource stored in the bound web map's portal
  item (`analysis/history/file1.json`). See `src/utils/history.ts`.
- Results become jimu DataSources via `createDsByResults` (runtime/utils) and are optionally
  added to the map with `addLayerToMapByDs`.

## Key imports and packages

Grouped by origin. File path shown per group; internal Esri analysis stack is emphasized.

INTERNAL Esri analysis component libraries (the core of this widget):
- `@arcgis/analysis-ui-schema` - types: `AnalysisToolData`, `AnalysisToolInfo`, `AnalysisEngine`,
  `AnalysisType`, `AnalysisToolParam*`, `GPFeatureRecordSetLayer`, `FeatureCollection`.
  (`src/config.ts`, `src/runtime/analysis-tool/config.ts`, `custom-tool.tsx`, `job.ts`)
- `@arcgis/analysis-shared-utils` - job + param helpers: `getJobParams`, `calculateParameterValues`,
  `getResultParams`, `getUIOnlyParams`, `buildProcessInfoReport`, `updateItemProperties`,
  `sanitizeTokensFromJobParams`, `AnalysisJobStatus`, `isWarningCreditMessage`, `throwError`,
  `ErrorKeywords`, `loadSavedResource`, `parseSerializedHistoryItem`.
  (`widget.tsx`, `custom-tool.tsx`, `standard-tool.tsx`, `job.ts`, `history.ts`)
- `@arcgis/analysis-tool-app` - type `AnalysisToolAppContainerCustomEvent`; provides the
  `analysis-tool-app-container` element + loader + CSS. (`widget.tsx`, `standard-tool.tsx`)
- `@arcgis/analysis-components` - `AnalysisToolDataChangeEventDetail`, `showHelp`; provides the
  `analysis-tool` element + loader + CSS. (`widget.tsx`, `custom-tool.tsx`)
- `@arcgis/analysis-core` - imported dynamically for `cancelJob`, `ClientJobIdPrefix`,
  `generateUniqueId`, `ExecuteProps`. (`widget.tsx`, `job.ts`)
- `@arcgis/map-config-components`, `@arcgis/common-components`, `@arcgis/app-components`,
  `@arcgis/arcgis-raster-function-editor` - loaded (define custom elements) in `widget.tsx`
  `useEffect` so nested calcite/ArcGIS elements (sketch editor, data browser, RFx editor) work.

ArcGIS Maps SDK for JavaScript (via jimu-arcgis loaders, NOT direct static import):
- `loadArcGISJSAPIModules` / `loadArcGISJSAPIModule` (jimu-arcgis / jimu-core) load:
  `esri/portal/Portal`, `esri/portal/PortalUser`, `esri/rest/geoprocessor`,
  `esri/rest/support/JobInfo`, `esri/rest/support/ParameterValue`, `esri/request`,
  `esri/geometry/support/jsonUtils`. (`widget.tsx`, `custom-tool.tsx`, `job.ts`)
- Types imported as `@arcgis/core/*` and `__esri.*` only (type-only). (`config.ts`, `job.ts`)

jimu framework:
- `jimu-core`: `React`, `jsx`, `AllWidgetProps`, `Immutable`/`ImmutableObject`, `hooks`,
  `lodash`, `uuidv1`, `SessionManager`, `DataSourceManager`, `MutableStoreManager`,
  `getAppStore`, `ReactRedux`, `IMState`, `dataSourceUtils`, `UtilityManager`, `esri` (Sanitizer),
  `requestUtils`, `portalUrlUtils`, `BaseVersionManager`, `AbstractDataAction`, `DataLevel`.
- `jimu-arcgis`: `JimuMapView`, `JimuMapViewComponent`, `featureUtils`, `loadArcGISJSAPIModules`.
- `jimu-ui`: `Tabs/Tab`, `Alert`, `AlertPopup`, `Loading`, `Paper`; advanced setting-components
  `SettingSection`, `SettingRow`, `MapWidgetSelector`, `SidePopper`, `CollapsablePanel`.
- `jimu-for-builder`: `AllWidgetSettingProps` (`setting.tsx`).
- `jimu-theme`: `Global` (runtime global calcite theming). (`widget.tsx`)

calcite: `calcite-components` (`CalcitePanel`, `CalciteAction`, `CalciteButton`, `CalciteNotice`)
used directly in `custom-tool.tsx`.

## Reusable patterns found

- JimuMapView binding: `<JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onActiveViewChange={setCurrentJimuMapView} />`, then `jimuMapView.view.map` fed to the analysis components as `mapView` / `mapLayers`.
- Geoprocessing jobs via `esri/rest/geoprocessor`: `submitJob` (async) polled with
  `jobInfo.waitForJobCompletion` + `fetchResultData`; `execute` (sync) with a client-generated
  fake `jobId` (`ClientJobIdPrefix + generateUniqueId()`).
- Event bus over DOM CustomEvents on the widget's own container so long-running jobs survive the
  tool panel closing (`AnalysisCoreEvents` in `src/utils/events.ts`).
- Three tool types selected by config + a single dispatcher component.
- Job history stored two ways: localStorage per widget (`getHistoryListStorageKey`) and inside the
  bound web map portal item resource (`analysis/history/file1.json` via `loadSavedResource`).
- DataSourceManager: result GP layers converted to jimu DataSources (`createDsByResults`) and
  destroyed on history removal (`destroyDataSources`).
- `set-as-analysis-input` data action (`AbstractDataAction`) lets other widgets push a selection /
  feature layer into an analysis tool parameter (uses `featureUtils.convertDataRecordSetToFeatureSet`).
- MutableStoreManager to receive cross-widget input: the data action writes `toolId` + `input`
  into the widget's mutable state, read back as `mutableStateProps`.
- Internal analysis component libraries loaded imperatively and themed via CSS custom properties
  bridging calcite tokens to jimu `--sys-color-*` tokens.

## Builder vs runtime split

Builder (`src/setting/**` + `src/tools/**`):
- `setting.tsx` (`AllWidgetSettingProps<IMConfig>`) manages `config.toolList`, the bound Map widget
  (`MapWidgetSelector` / `onSettingChange({ id, useMapWidgetIds })`), and portal (loads a `Portal`
  from `portalUrl` + `portalSelf`). Tool selectors (`tool-selector/**`) add Standard, RFx, and
  Custom tools; per-tool config poppers (`tool-setting/**`) edit input/output/options.
- Custom tools track a jimu utility: adding one pushes into `useUtilities`; removing the last user
  removes it. Selecting a map auto-enables "add result layers to map automatically".
- `tools/app-config-operations.ts` (`APP_CONFIG_OPERATIONS`): `utilityWillRemove` prunes custom
  tools whose utility was deleted.
- `tools/builder-operations.ts` (`BUILDER_OPERATIONS`): `getTranslationKey` exposes custom tool
  display names + parameter display names for app localization.

Runtime (`src/runtime/**`):
- `widget.tsx` hosts tabs, tool dispatch, history, job event listeners, portal sign-in, and
  result->DataSource/add-to-map orchestration.

## Lifecycle and cleanup

- On mount `widget.tsx` `Promise.allSettled([...import loaders]).then(defineCustomElements(...))`
  registers all needed internal component sets, and injects the BA data-browser `<link>`/`<script>`
  into `<head>` (guarded so they are added once).
- In Builder only, a capturing `document` click handler is added to force-remove the analysis sketch
  tool; the effect returns a cleanup that removes it.
- `@arcgis/analysis-core` is imported into a ref (`analysisCoreRef`) for later `cancelJob`.
- Job event listeners are attached once `widgetContainer` is set; job state flows through
  `setJobStartInfo` / `setJobStatusChangeInfo` into `handleJobStart` / `handleJobStatusChange`.
- Removing a history item calls `destroyDataSources([dsMap], widgetId)`; canceling a running job
  calls `analysisCoreRef.current.cancelJob(...)` and re-polls `checkJobStatus` until complete.
- Custom tool: recreates its `analysis-tool` element when `toolId` changes (defaults are only read
  in `componentWillLoad`); removes the help popover if the help link option is turned off.

## Manifest/config requirements

- `manifest.json`: `"type": "widget"`, `"dependency": "jimu-arcgis"`, `"settingDependency": "jimu-arcgis"`.
- `properties`: `coverLayoutBackground: true`, `canConsumeDataAction: true`,
  `notShareDynamicModules: true`, `supportAutoSize: false`.
- `dataActions`: publishes `setAsAnalysisInput` (uri `data-actions/set-as-analysis-input`).
- `excludeDataActions`: blocks many other widgets' actions (setFilter, map show/popup/marker,
  directions.*, elevation-profile.*, table.viewInTable, relatedData, ...).
- `extensions`: `appConfigOperations` (APP_CONFIG_OPERATIONS -> `tools/app-config-operations`) and
  `builderOperations` (BUILDER_OPERATIONS -> `tools/builder-operations`).
- Default `config.json`: `{ "toolList": [] }`. Config shape in `src/config.ts` (`Config`,
  `ToolConfig`, `StandardToolConfig`, `CustomToolConfig`, `ToolType`).
- `Widget.versionManager = versionManager` migrates config (adds `analysisEngine`, renames
  SummarizeRasterWithin -> ZonalStatistics, CreateViewshed -> GeodesicViewshed).

## Gotchas

- The tool UIs are Esri INTERNAL stencil/calcite web components created with `document.createElement`,
  not JSX. Props are assigned imperatively and kept in sync via `useUpdateObjectByStateEffect`.
- A no-tool widget renders a placeholder; if exactly one tool is configured it opens directly
  (portal must init first because the container fetches tool JSON from portal).
- Sync vs async GP jobs are handled very differently in `job.ts` (sync uses a client fake `jobId`
  prefixed by `ClientJobIdPrefix`; results are delayed via `setTimeout` to ensure the history item
  exists first).
- Tokens must be stripped from stored job params (`sanitizeTokensFromJobParams`) before writing history.
- Custom tools depend on jimu utilities; anonymous access uses a "fake" `PortalUser` +
  `helperServices = {}` so `analysis-layer-input` does not error (`updatePortal(false)`).
- Result HTML/error text is sanitized with `esri.Sanitizer` before `dangerouslySetInnerHTML`.
- Adding/removing/renaming files or editing `manifest.json` requires restarting the client dev server.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` (define all internal component sets on mount)
```tsx
Promise.allSettled([
  import('@arcgis/map-config-components/dist/loader'),
  import('@arcgis/common-components/dist/loader'),
  import('@arcgis/app-components/dist/loader'),
  import('@arcgis/arcgis-raster-function-editor/dist/loader'),
  import('@arcgis/analysis-components/dist/loader'),
  import('@arcgis/analysis-tool-app/dist/loader')
]).then((resArr) => {
  const [ /* ...defineCustomElements fns... */ ] = resArr.map((res) => res.status === 'fulfilled' ? res.value?.defineCustomElements : () => {})
  // call each defineCustomElements(window, { resourcesUrl })
})
```

Source: `src/runtime/widget.tsx` (bind the Map widget)
```tsx
<JimuMapViewComponent
  useMapWidgetId={useMapWidgetIds?.[0]}
  onActiveViewChange={setCurrentJimuMapView}
/>
```

Source: `src/runtime/widget.tsx` (job event listeners survive tool close)
```tsx
useEffect(() => {
  if (widgetContainer) {
    widgetContainer.addEventListener(AnalysisCoreEvents.JobSubmited, (e) => {
      const { toolId, submissionData, jobInfo } = e.detail
      setJobStartInfo({ toolId, jobInfo, submissionData })
    })
    widgetContainer.addEventListener(AnalysisCoreEvents.JobStatus, (e) => {
      setJobStatusChangeInfo({ jobInfo: e.detail.jobInfo })
    })
    widgetContainer.addEventListener(AnalysisCoreEvents.ResultDataComplete, (e) => {
      const { jobInfo, results } = e.detail
      if (jobInfo.jobId.includes(analysisCoreRef.current.ClientJobIdPrefix)) {
        setTimeout(() => { setJobStatusChangeInfo({ jobInfo, results }) })
      } else {
        setJobStatusChangeInfo({ jobInfo, results })
      }
    })
  }
}, [widgetContainer])
```

Source: `src/utils/events.ts` (DOM CustomEvent bus)
```ts
export enum AnalysisCoreEvents {
  ResultDataComplete = 'analysisCoreResultDataComplete',
  JobStatus = 'analysisCoreJobStatus',
  JobSubmited = 'analysisCoreJobSubmited'
}

export function notifyJobStatus (htmlContainer: HTMLElement, data?: AnalysisGPJobStatus): void {
  htmlContainer.dispatchEvent(new window.CustomEvent(AnalysisCoreEvents.JobStatus, generateEventInit(data)))
}
```

Source: `src/runtime/analysis-tool/standard-tool.tsx` (create + configure the internal tool element)
```tsx
const container = document.createElement('analysis-tool-app-container')
container.style.height = '100%'
container.analysisEngine = analysisEngine
container.showHeader = true
container.usePanel = true
container.panelClosable = false
container.appContainer = appContainer
container.jobParams = realJobParams
container.portal = portal as any
container.toolName = toolName
container.mapView = jimuMapView?.view as __esri.MapView
container.mapLayers = analysisMapLayers
container.addEventListener('analysisToolAppLoaded', () => { setAnalysisToolAppLoaded(true) })
ref.replaceChildren(container)
setAnalysisToolContainer(container)
```

Source: `src/utils/job.ts` (submit async GP job / execute sync GP job)
```ts
if (toolJson.executionType === 'esriExecutionTypeSynchronous') {
  const jobId = await generateClientJobId() // ClientJobIdPrefix + generateUniqueId()
  const res = await geoprocessor.execute(toolUrl, jobParamsPayload, gpOptions)
  // notifyJobStatus(...) then notifyResultData(...)
  return
}
// async
jobInfo = await geoprocessor.submitJob(toolUrl, jobParamsPayload, gpOptions)
const { results } = await waitForJobCompletionAndGetResults(jobInfo, toolUrl, (j) => notifyJobStatus(containerElement, { jobInfo: j }), gpMessages, resultParams, resultMapServerName, resultParamsNotInMapService)
```

Source: `src/utils/history.ts` (load job history from the web map portal item resource)
```ts
export const HISTORY_FILE_NAME = 'file1.json'
export const HISTORY_STORAGE_KEY = 'analysis/history'

const loadedResources = await loadSavedResource<AnalysisHistory>(
  `${HISTORY_STORAGE_KEY}/${HISTORY_FILE_NAME}`,
  ((jimuMapView?.view?.map as unknown) as WebMap)?.portalItem
)
```

Source: `src/data-actions/set-as-analysis-input.tsx` (push another widget's data into a tool)
```tsx
export default class SetAsInputOfAnalysis extends AbstractDataAction {
  supportProviderWidget = true
  async isSupported (dataSets: DataRecordSet[], dataLevel: DataLevel): Promise<boolean> {
    const dataSet = dataSets[0]
    if (isAnalysisSupportedImagery(dataSet.dataSource)) return true
    if (dataLevel === DataLevel.DataSource) return isFeatureLayer(dataSet.dataSource)
    const featureSet = await featureUtils.convertDataRecordSetToFeatureSet(dataSet)
    return !!featureSet.features.length
  }
  onExecute (dataSets, dataLevel) {
    return Promise.resolve(<SelectParameterPopper widgetId={this.widgetId} dataSet={dataSets[0]} dataLevel={dataLevel} intl={this.intl} /* ... */ />)
  }
}
```

Source: `src/tools/app-config-operations.ts` (prune custom tools when their utility is removed)
```ts
export default class AppConfigOperation implements extensionSpec.AppConfigOperationsExtension {
  id = 'analysis-app-config-operation'
  widgetId: string
  utilityWillRemove (appConfig: IMAppConfig, removedUtilityId: string): IMAppConfig {
    // filter toolList: drop Custom tools whose utility id + url match the removed utility
  }
}
```

Source: `src/version-manager.ts` (config migrations)
```ts
class VersionManager extends BaseVersionManager {
  versions = [
    { version: '1.14.0', description: 'Add analysisEngine in toolConfig', upgrader: (oldConfig) => { /* default AnalysisEngine.Standard */ } },
    { version: '1.16.0', description: 'Change name for SummarizeRasterWithin and CreateViewshed tools', upgrader: (oldConfig) => { /* rename */ } }
  ]
}
```
