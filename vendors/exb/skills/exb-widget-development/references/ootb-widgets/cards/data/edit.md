# OTB Widget: common/edit

Online widget doc: https://developers.arcgis.com/experience-builder/guide/edit-widget/

## Purpose

The Edit widget lets end users create, update, and delete features and their attributes in a web map / web scene. It runs in two mutually exclusive modes selected in Settings:

- Geometry / interactive editing mode (`EditModeType.Geometry`): binds to a Map widget and hosts the JSAPI `esri/widgets/Editor` (full geometry + attribute editing, snapping, split/merge, copy/paste).
- Attribute-only mode (`EditModeType.Attribute`): does not require a Map. It renders a data-source-driven form list using JSAPI `FeatureForm` / `BatchAttributeForm` against configured feature layer data sources.

This is the OOTB widget that the repo custom `src/widgets/branch-version-editor` widget is derived from (see Reusable patterns).

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/common/edit/` (gitignored; read with includeIgnoredFiles). The `dist/` build output and `tests/` were intentionally skipped.

Inspected (high value):
- [manifest.json](../../../../../../../ArcGISExperienceBuilder/client/dist/widgets/common/edit/manifest.json) - dependency, dataActions, extensions.
- `src/config.ts` - `Config` / `IMConfig`, enums, `LayersConfig`, `MapViewConfig`.
- `src/runtime/widget.tsx` - mode switch entry, versionManager, privilege gate.
- `src/runtime/components/editor-component.tsx` - Editor mode host, selection sync.
- `src/runtime/components/use-editor.ts` - Editor lifecycle HOOK.
- `src/runtime/components/use-feature-form.ts` - FeatureForm/BatchAttributeForm HOOK.
- `src/runtime/components/feature-form-component.tsx` - attribute-mode UI.
- `src/runtime/components/editor-close-warning.tsx` - unsaved-changes guard.
- `src/runtime/components/editor-copy-paste.tsx` - clipboard copy/paste.
- `src/utils/index.ts` - shared data-source/field helpers.
- `src/version-manager.ts` - config upgraders.
- `src/data-actions/edit.ts` - Edit data action.
- `src/setting/setting.tsx` - settings entry / mode switch.
- `src/setting/components/editor-map.tsx` - map/layer selection + config.
- `src/setting/components/feature-form-ds.tsx` - DataSourceComponent wrapper.
- `src/setting/components/layer-config.tsx` - per-layer config panel.
- `src/tools/redux-action-interceptor.ts` - close-intercept extension.

Inspected lightly / referenced but not fully read (given widget size): the remaining `runtime/components/*` (`feature-form-*`, `edit-list-ds`, `edit-item-ds`, `empty-placeholder`), remaining `setting/components/*` (`editor-general`, `editor-snapping`, `feature-form-setting`, `layer-config-*`, `setting/components/tree/*`), `runtime/components/utils.ts`, `setting/components/utils.ts`, `tools/app-config-operations.ts`, `tools/builder-operations.ts`, `translations/`, and `assets/`.

Skipped entirely: `dist/`, `tests/`, `config.json` (runtime schema mirror of `config.ts`).

## Architecture overview

`widget.tsx` reads `config.editMode` and renders one of two independent subtrees:

- Attribute mode -> `FeatureFormComponent` (takes `useDataSources`, no map).
- Geometry mode -> `EditorComponent` (takes `useMapWidgetIds`, hosts the JSAPI Editor).

Both share a `CommonProps` shape (`config`, `canEditFeature`). `canEditFeature` comes from an async ExB privilege check (`getPrivilege()` in `runtime/components/utils`) rather than the JSAPI `supportsUpdateByOthers` flag.

Geometry mode config (per map view):
- `Config.mapViewsConfig` keyed by `jimuMapViewId` -> `MapViewConfig` (`customizeLayers`, `customJimuLayerViewIds`, `layersConfig`).
- When `customizeLayers` is false, all supported/editable layer views are used; when true, only `customJimuLayerViewIds` are edited and layer order / field config come from `layersConfig`.

Attribute mode config:
- `Config.layersConfig` (top-level array) drives the list of editable feature-layer data sources and their per-field `groupedFields` tree.

Layer support is gated by `SUPPORTED_JIMU_LAYER_TYPES` / `supportedDsTypes` in `src/utils/index.ts` (FeatureLayer, SceneLayer, BuildingComponentSublayer, OrientedImageryLayer, SubtypeSublayer).

## Key imports and packages

jimu-core (many files):
- `React, hooks, Immutable, classNames, css` - base framework/UI utils.
- `WidgetState`, `AllWidgetProps` - `runtime/widget.tsx`.
- `DataSourceManager, DataSourceComponent, dataSourceUtils, DataSourceTypes, DataSourceStatus, JSAPILayerTypes, SupportedLayerServiceTypes` - data-source layer in `utils/index.ts`, `feature-form-component.tsx`, `feature-form-ds.tsx`.
- `AbstractDataAction, DataRecordSet, DataLevel` - `data-actions/edit.ts`.
- `getAppStore, appActions, ExtensionManager, extensionSpec, UnknownAction` - close warning + `tools/redux-action-interceptor.ts`.
- `WidgetVersionManager, WidgetUpgradeInfo` - `version-manager.ts`.

jimu-arcgis:
- `JimuMapViewComponent, JimuMapView, MapViewManager, JimuLayerView, SnappingUtils` - map binding in `editor-component.tsx`, `use-editor.ts`, `data-actions/edit.ts`, `setting/setting.tsx`.

JSAPI (`esri/*` alias):
- `esri/widgets/Editor` (default import `Editor`) - `use-editor.ts`.
- `esri/widgets/FeatureForm`, `esri/widgets/BatchAttributeForm`, `esri/Graphic`, `esri/core/Collection`, `esri/form/FormTemplate` - `use-feature-form.ts`, `feature-form-component.tsx`.
- `esri/core/reactiveUtils` (namespace `reactiveUtils`) - `editor-component.tsx`, `editor-copy-paste.tsx`.
- Copy/paste stack in `editor-copy-paste.tsx`: `arcgis-map-components` / `@arcgis/map-components` (`<arcgis-paste>`), `esri/applications/Components/clipboard` (`ClipboardItem`, `ClipboardSupportedLayer`), `esri/applications/Components/applySetUtils` (`ApplySet`, `ApplySet*EditResult`, `ApplySetSupportedLayer`), plus `esri/layers/FeatureLayer`, `esri/layers/SubtypeGroupLayer`, `esri/layers/graphics/editingSupport`.

jimu-ui / advanced:
- `Paper, WidgetPlaceholder, Loading, LoadingType, Typography, ConfirmDialog, Radio, Label, TextInput, Alert` - various.
- `jimu-ui/advanced/setting-components` (`SettingSection, SettingRow, LayerSetting`), `jimu-ui/advanced/data-source-selector` (`DataSourceSelector`), `jimu-ui/basic/list-tree` (`TreeItemsType`) - settings.
- `jimu-theme` (`useTheme`) - `editor-component.tsx`.

jimu-for-builder:
- `AllWidgetSettingProps` - `setting/setting.tsx`.

REST types:
- `@esri/arcgis-rest-feature-service` (`ILayerDefinition`) - `utils/index.ts`, `layer-config.tsx`.

Note: Calcite web components (`calcite-action`, `calcite-tooltip`, `calcite-notice`) are used directly as JSX intrinsic elements (see copy/paste and feature-form components), not imported.

## Reusable patterns found

- JimuMapView binding: `<JimuMapViewComponent onActiveViewChange={...}>` sets `jimuMapView` state; the Editor is created against `jimuMapView.view`. Settings uses `onViewsCreate` + `onActiveViewChange` to enumerate views (`setting/setting.tsx`).
- JSAPI Editor host via a custom HOOK `use-editor.ts`: creates `new Editor({ container, view })`, pushes config-derived options (`updateEditorByConfig`), computes `layerInfos` from ExB layer views (`updateEditorLayerInfos`), and wires layer `edits` events back to data sources.
- FeatureForm HOOK `use-feature-form.ts`: builds `FeatureForm` (single) or `BatchAttributeForm` (multi) into a container div, exposes `saveForm/addForm/deleteForm`, and syncs edits back to the data source via `updateDataSourceAfterEdit`.
- Selection sync (bidirectional): ExB data-source selection <-> Editor workflow/selection using `reactiveUtils.watch` on `activeWorkflow.data.candidates` and the 4.33+ `effectiveSelectionManager` `selection-change` event; guarded with `selectionFromEditor` / `selectionFromExb` refs to avoid loops (`editor-component.tsx`).
- Clipboard copy/paste (`editor-copy-paste.tsx`): uses the `<arcgis-paste>` map component, `clipboard.setData(...)`, `writeChanges(applySet)`, and requests exclusive map control via `appActions.requestAutoControlMapWidget` / `releaseAutoControlMapWidget`.
- Edit data action (`data-actions/edit.ts`): `AbstractDataAction.isSupported` verifies the record's data source is one the Edit widget can edit and that the widget lives in a controller; `onExecute` opens the widget.
- Manifest extensions: `appConfigOperations` (APP_CONFIG_OPERATIONS), `builderOperations` (BUILDER_OPERATIONS), and `reduxActionInterceptor` (REDUX_ACTION_INTERCEPTOR). The interceptor blocks close/hide actions while there are unsaved geometry-mode changes.
- Layer/field config tree: `setting/components/layer-config.tsx` + `tree/*` build the editable field tree (`LayersConfig.groupedFields` / `TreeFields`).
- Version manager (`version-manager.ts`): staged `upgrader` functions migrate old configs (e.g. adding `layerHonorMode`, flattening grouped fields).
- Repo relevance: the custom `src/widgets/branch-version-editor` widget is based on this OOTB Edit widget; prefer reusing these Editor/selection-sync patterns when extending it. (Widget relationship UNVERIFIED beyond the task brief; `src/widgets/branch-version-editor`.)

## Builder vs runtime split

- Runtime: `src/runtime/**` renders the two editing experiences and performs all JSAPI editing.
- Builder/settings: `src/setting/**` writes `IMConfig` via `onSettingChange`. `setting.tsx` handles the mode radio (and clears `layersConfig` / `mapViewsConfig` / `useDataSources` / `useMapWidgetIds` when switching modes), geometry-mode layer selection (`EditorMapSelector` + `EditorMap` + `EditorSnapping` + `EditorGeneral`), and attribute-mode data-source setup (`FeatureFormSetting` + `FeatureFormGeneral`).
- `tools/*` are ExB extension points (builder + redux) declared in the manifest, distinct from the visible builder panel.

## Lifecycle and cleanup

- Editor: `use-editor.ts` keeps `editorRef`; `destroyEditor()` calls `editor.destroy()` when not already destroyed. An unmount effect (`return () => destroyEditor()`) tears it down, and the Editor is also destroyed/recreated when `jimuMapView` changes.
- Layer `edits` handlers: each editable layer's `layer.on('edits', ...)` handle is collected and removed in the effect cleanup.
- Watches: `reactiveUtils.watch(...)` handles (candidates, formViewModel, layerInfos, clipboard version) and `selectionManager.on('selection-change', ...)` are all removed in their effect cleanups.
- FeatureForm: `use-feature-form.ts` `destroyEditForm()` guards `destroyed`; a `renderSeq` ref prevents race conditions between concurrent renders; a debounced timer (500ms) drives re-render.
- Map layer listeners in `use-editor.ts` (visible-change, layer-created/removed, `allLayers.on('after-add')`) are all removed on cleanup.

## Manifest/config requirements

- `dependency: ["jimu-arcgis"]` (required for map binding even though attribute mode does not use a map).
- `properties.coverLayoutBackground: true`, `properties.needHiddenState: true`.
- `dataActions`: registers the `edit` action (`uri: data-actions/edit`).
- `extensions`: `appConfigOperations`, `builderOperations`, `reduxActionInterceptor` (uris under `tools/`).
- Config is `IMConfig` (see `config.ts`). Key runtime switches: `editMode`, `mapViewsConfig` (geometry), `layersConfig` (attribute), snapping flags (`selfSnapping/featureSnapping/gridSnapping` + `default*Enabled` + `snapSettingMode`), `batchEditing`, `advancedEditingTools` (`splitButton`/`mergeButton`), `copyPaste`, `relatedRecords`, `liveDataEditing`, `templateFilter`, `tooltip`, `segmentLabel`.

## Gotchas

- Two-mode design: `useMapWidgetIds` is only relevant in geometry mode; `useDataSources` only in attribute mode. Switching modes wipes both plus `layersConfig`/`mapViewsConfig` (`setting.tsx handleChangeModeOk`).
- `canEditFeature` is a tri-state during load (`undefined` until the async privilege check resolves); several effects early-return on `typeof canEditFeature !== 'boolean'`.
- Selection sync must be guarded against feedback loops via `selectionFromEditor` / `selectionFromExb` refs plus a 50ms timeout reset; do not remove these guards.
- JSAPI 4.33 changed selection: the `effectiveSelectionManager` / `selection-change` path only applies to 2D + `batchEditing`; 3D and 2D single-selection use the older `candidates` / `rootFeatures` watch.
- Copy/paste only shows in 2D (`jimuMapView.view.type === '2d'`) with `advancedEditingTools && copyPaste`, and takes exclusive map control (auto-control request) while pasting; it must release control on cleanup.
- FeatureForm has a first-render `value-change` bug worked around by constructing and immediately destroying a throwaway `FeatureForm` to preload deps (`use-feature-form.ts`).
- `pWinSt` (a global error/log sink) is used throughout without an import; it is provided by the ExB runtime, not this widget.
- Edit fields hidden by default come from `getEditHiddenFields` (objectId, editor-tracking, shape area/length) and `INVISIBLE_FIELD` (`utils/index.ts`).

## Useful snippets and functions

Mode switch entry (`src/runtime/widget.tsx`):

```tsx
const EditWidget = (props: AllWidgetProps<IMConfig>) => {
  const { id, label, config, useDataSources, useMapWidgetIds, controllerWidgetId, state } = props
  const isAttributeOnly = config.editMode === EditModeType.Attribute
  const [canEditFeature, setCanEditFeature] = React.useState(undefined)
  React.useEffect(() => {
    getPrivilege().then((canEdit) => {
      setCanEditFeature(canEdit)
    }).catch(() => {
      setCanEditFeature(false)
    })
  }, [])

  const visible = controllerWidgetId ? [WidgetState.Active, WidgetState.Opened].includes(state) : state !== WidgetState.Hidden

  return isAttributeOnly
    ? <FeatureFormComponent label={label} config={config} canEditFeature={canEditFeature} useDataSources={useDataSources} />
    : <EditorComponent id={id} visible={visible} config={config} canEditFeature={canEditFeature} useMapWidgetIds={useMapWidgetIds} />
}

EditWidget.versionManager = versionManager
```

Create and configure the JSAPI Editor, with unmount cleanup (`src/runtime/components/use-editor.ts`):

```ts
import Editor from 'esri/widgets/Editor'

const editorRef = React.useRef<Editor>(null)
const [editor, setEditor] = React.useState<Editor>(null)
const destroyEditor = React.useCallback(() => {
  if (editorRef.current && !editorRef.current.destroyed) {
    editorRef.current.destroy()
  }
}, [])
React.useEffect(() => {
  return () => {
    destroyEditor()
  }
}, [destroyEditor])

React.useEffect(() => {
  if (!jimuMapView || !editContainer.current) return
  if (!editorRef.current || jimuMapView !== previousJimuMapView) {
    destroyEditor()
    const container = document.createElement('div')
    container.className = 'h-100'
    editContainer.current.appendChild(container)
    editorRef.current = new Editor({
      container,
      view: jimuMapView.view
    })
    setEditor(editorRef.current)
    updateEditorByConfig()
  } else if (config !== previousConfig) {
    updateEditorByConfig()
  }
}, [config, destroyEditor, editContainer, jimuMapView, previousJimuMapView, updateEditorByConfig])
```

Wire layer `edits` events back to the data source and remove handles on cleanup (`src/runtime/components/use-editor.ts`):

```ts
const handles: __esri.Handle[] = []
for (const layerInfo of editorLayerInfos) {
  if (!layerInfo.enabled) continue
  const editorLayer = layerInfo.layer
  if (editorLayer.type === 'subtype-sublayer') {
    const subtypeGrouplayer = editorLayer.parent
    const handle = subtypeGrouplayer?.on('edits', (event) => {
      updateDataSource(subtypeGrouplayer, event)
    })
    handles.push(handle)
  } else {
    const featureLayer = editorLayer as unknown as __esri.FeatureLayer
    const handle = featureLayer.on('edits', (event) => {
      updateDataSource(featureLayer, event)
    })
    handles.push(handle)
  }
}
editorWidget.layerInfos = editorLayerInfos
return () => {
  for (const handle of handles) {
    handle.remove()
  }
}
```

Bidirectional selection sync watch (`src/runtime/components/editor-component.tsx`):

```ts
import * as reactiveUtils from 'esri/core/reactiveUtils'

const watchCandidates = reactiveUtils.watch(
  () => (editor.viewModel?.activeWorkflow?.data as __esri.UpdateWorkflowData)?.candidates,
  (candidates, oldCandidates) => {
    // ... map candidate graphics -> data-source records and selectRecordsByIds(...)
    // guarded by selectionFromExb.current / editor.viewModel.syncing
  }
)
// cleanup: watchCandidates?.remove?.()
```

Build FeatureForm vs BatchAttributeForm from selected records (`src/runtime/components/use-feature-form.ts`):

```ts
if (features.length > 1) {
  const featureCollection = new Collection(features)
  const layer = features[0].layer as __esri.FeatureLayer | __esri.SubtypeSublayer
  const batchForm = new BatchAttributeForm({
    container,
    features: featureCollection,
    layerInfos: [{ layer, formTemplate }],
    timeZone: getTimezone(dataSource)
  })
  editForm.current = batchForm
} else if (features.length === 1) {
  const featureForm = new FeatureForm({
    container,
    feature: features[0],
    layer: activeLayer,
    formTemplate,
    timeZone: getTimezone(dataSource)
  })
  editForm.current = featureForm
}
```

Preload FeatureForm deps to dodge the first-render value-change bug (`src/runtime/components/use-feature-form.ts`):

```ts
// JSAPI bug: FeatureForm's value-change not work for the first time due to deps loading.
React.useEffect(() => {
  const featureForm = new FeatureForm()
  featureForm.destroy()
}, [])
```

Edit data action support check (`src/data-actions/edit.ts`):

```ts
export default class Edit extends AbstractDataAction {
  isSupported (dataSets: DataRecordSet[], dataLevel: DataLevel, widgetId: string): Promise<boolean> {
    // ... verify dataSource.id is in layersConfig / mapViewsConfig and widget is in a controller
    return Promise.resolve(isActionSupported && dataSource.getStatus() !== DataSourceStatus.NotReady)
  }

  onExecute (dataSets: DataRecordSet[], dataLevel: DataLevel, widgetId: string) {
    getAppStore().dispatch(appActions.openWidgets([this.widgetId]))
    return Promise.resolve(true)
  }
}
```

Redux action interceptor blocking close/hide on unsaved changes (`src/tools/redux-action-interceptor.ts`):

```ts
intercept (action: UnknownAction): UnknownAction {
  const isCloseAction = (action.type === appActions.ActionKeys.CloseWidget && action.widgetId === this.widgetId) ||
    (action.type === appActions.ActionKeys.CloseWidgets && (action.widgetIds as string[])?.includes(this.widgetId))
  // ... if geometry mode && !confirmClose && formChange -> showWarningBeforeClose(); return (swallow action)
  return action
}
```

Settings mode switch that clears bindings (`src/setting/setting.tsx`):

```tsx
const handleChangeModeOk = React.useCallback(() => {
  onSettingChange({
    id: widgetId,
    config: config.set('editMode', toBeChangeMode.current).set('layersConfig', []).set('mapViewsConfig', {}),
    useDataSources: [],
    useMapWidgetIds: []
  })
  toBeChangeMode.current = null
  setChangeModeConfirmOpen(false)
}, [config, onSettingChange, widgetId])
```

Build a default per-layer config from a data source (`src/utils/index.ts`, used by settings):

```ts
export const constructConfig = (ds: SupportedDataSource, layer: __esri.FeatureLayer | __esri.SubtypeSublayer) => {
  const layerDefinition = ds.getLayerDefinition()
  const { allowGeometryUpdates, create, update, deletable } = getDsPrivileges(layerDefinition)
  // ... filter hidden/editor-tracking fields, cap at 50, build groupedFields
  const layerConfig: LayersConfig = {
    id: ds.id,
    name: ds.getLabel(),
    useDataSource: Immutable(useDataSources),
    addRecords: create,
    deleteRecords: deletable,
    updateRecords: update,
    updateAttributes: update,
    updateGeometries: allowGeometryUpdates && update,
    showFields,
    groupedFields,
    layerHonorMode: LayerHonorModeType.Webmap
  }
  return layerConfig
}
```
