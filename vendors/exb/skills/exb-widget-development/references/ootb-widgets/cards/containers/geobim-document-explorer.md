# OTB Widget: geobim/document-explorer

Online widget doc: https://developers.arcgis.com/experience-builder/guide/document-explorer-widget/

## Purpose
Displays project documents and folders from Autodesk Construction Cloud (ACC) as an
expandable tree inside Experience Builder. It links a bound Map widget's selected BIM
project feature to the document repository, lets the user search/filter documents, zoom
to a document's related map feature, and (optionally) push a selected document to a linked
Document Viewer / model viewer widget. Requires an Autodesk license and Autodesk Platform
Services (APS) sign-in.

## Source paths inspected
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/manifest.json`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/config.json`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/config.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/runtime/widget.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/runtime/providers/documents-provider.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/runtime/hooks/use-document-explorer.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/runtime/hooks/use-tree-document.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/runtime/hooks/use-tree-node.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/extensions/geobim-store.ts`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/setting/setting.tsx`
- `ArcGISExperienceBuilder/client/dist/widgets/geobim/document-explorer/src/runtime/components/document-explorer.tsx` (partial, for context)

Note: this is transpiled `dist/` source (gitignored). The `dist/` build output and `tests/`
directories under this widget were intentionally not inspected.

## Architecture overview
Layered provider + hooks + tree-component design; almost all real logic lives in the
shared code module `widgets/shared-code/geobim`, not in this widget:

```
widget.tsx (AllWidgetProps<IMConfig>)
  -> WidgetPlaceholder when no map widget bound
  -> GeoBIMProvider(mapWidgetId, widgetId)        [shared-code/geobim]
       -> DocumentsProvider(modelViewerWidgetId)  [local provider]
            -> DocumentExplorer (i18nMessage, theme)  [local component]
                 uses useDocumentExplorer()           [local hook]
                 renders TreeRoot / TreeNode
                   each TreeNode uses useTreeNode(...) [local hook, lazy children]
                   each document row uses useTreeDocument() [local hook, selection]
```

- `GeoBIMProvider` (shared) establishes the GeoBIM/map/APS context for the widget.
- `DocumentsProvider` (local) holds widget-local selection state and bridges to the
  linked model viewer widget through the Redux store.
- `useDocumentExplorer` composes the document tree root, search, filtering, folder
  selection, and error state.
- `useTreeNode` lazily loads a node's children only after first expansion (avoids
  loading the whole repository tree at once).
- `useTreeDocument` exposes document selection to individual tree rows.
- A REDUX_STORE extension (`GeoBIM Store`) provides shared cross-widget state.

## Key imports and packages
Grouped by source; file path noted per group.

`widget.tsx`:
- `React`, `type AllWidgetProps` from `jimu-core`
- `Paper`, `WidgetPlaceholder` from `jimu-ui`
- `defaultSharedMessages`, `GeoBIMProvider`, `useSharedMessages` from `widgets/shared-code/geobim` (SHARED CODE)
- `type IMConfig` from `../config`
- `DocumentExplorer` from `./components/document-explorer` (local)
- `DocumentsProvider` from `./providers/documents-provider` (local)

`config.ts`:
- `type ImmutableObject` from `jimu-core`
- `type DOCUMENT_VIEWER_WIDGET_ID_CONFIG_KEY` from `widgets/shared-code/geobim` (SHARED CODE; config key comes from shared code)

`documents-provider.tsx`:
- `type Dispatch` from `redux`
- `React`, `ReactRedux` from `jimu-core` (uses `ReactRedux.useDispatch`)
- from `widgets/shared-code/geobim` (SHARED CODE): `type ActionTypes`, `type IDocument`,
  `type IGeoBIMDocument`, `setModelViewerLinkedDocument`, `useDocuments`, `useMap`

`use-document-explorer.tsx`:
- `React` from `jimu-core`
- from `widgets/shared-code/geobim` (SHARED CODE): `GeoBimFeatureServiceError`,
  `type IRepositoryItem`, `type NodeRepositoryItem`, `useDocuments`, `useGeoBIM`,
  `getFeatureAttribute`, `type IDocument`, `useJobs`, `type SelectedFolders`
- `DocumentsContext`, `type DocumentsContextType` from `../providers/documents-provider` (local)

`use-tree-document.tsx`:
- `React` from `jimu-core`
- `DocumentsContext`, `type DocumentsContextType` from `../providers/documents-provider` (local)
- `type IDocument` from `widgets/shared-code/geobim` (SHARED CODE)

`use-tree-node.tsx`:
- `React` from `jimu-core`
- from `widgets/shared-code/geobim` (SHARED CODE): `type DocumentRepositoryItem`,
  `isDocumentRepositoryItem`, `isNodeRepositoryItem`, `type NodeRepositoryItem`,
  `repositoryItemHasChildren`, `useDocuments`, `type SelectedFolders`

`extensions/geobim-store.ts`:
- `GeoBIMStoreExtension` from `widgets/shared-code/geobim` (SHARED CODE; re-exported as the widget's REDUX_STORE extension)

`setting.tsx`:
- `React` from `jimu-core`
- `type AllWidgetSettingProps` from `jimu-for-builder`
- `SettingSection`, `SettingRow`, `MapWidgetSelector` from `jimu-ui/advanced/setting-components`
- from `widgets/shared-code/geobim` (SHARED CODE): `defaultSharedMessages`,
  `DocumentViewerWidgetList`, `FeatureServiceErrors`, `useSharedMessages`

`document-explorer.tsx` (component, for context):
- `React`, `type IMThemeVariables`, `lodash` from `jimu-core`
- `SearchOutlined`, `FilterCustomOutlined`, `SelectZoomToOutlined` from `jimu-icons/outlined/*`
- `Alert`, `Button`, `Loading`, `Surface`, `TextInput`, `Typography` from `jimu-ui`
- from `widgets/shared-code/geobim` (SHARED CODE): `geoBIMWidgetContainerStyle`, `useGeoBIM`,
  `ApsLogIn`, `UserTypeNotPermissible`, `GeoBimFeatureServiceError`, `widgetHeaderStyle`

## Reusable patterns found
- GeoBIMProvider + DocumentsProvider nesting: the widget wraps its content in
  `GeoBIMProvider` (shared) then a local `DocumentsProvider`, so map/APS state is shared
  and only widget-local selection state is kept locally.
- Custom tree hooks: `useDocumentExplorer` (tree root + search + filter + folders + errors),
  `useTreeDocument` (per-row document selection), `useTreeNode` (per-node lazy child load).
  This is a clean example of splitting a stateful tree into per-node hooks.
- `useSharedMessages` i18n pattern: builds `defaultLocaleMessages` by spreading
  `defaultSharedMessages.default` first then local `defaultMessages` (local wins), then calls
  `translateMessage(id, defaultLocaleMessages, values)`. Same pattern in runtime and setting.
- `useMapWidgetIds` gating: runtime treats `useMapWidgetIds?.[0]` as `currentMapWidgetId`;
  when absent it renders `WidgetPlaceholder` instead of the tree.
- geobim-store REDUX extension: `manifest.json` registers a `REDUX_STORE` extension
  (`extensions/geobim-store`) that re-exports `GeoBIMStoreExtension` from shared code, giving
  the widget shared cross-widget Redux state.
- Cross-widget linkage via store: `setModelViewerLinkedDocument(modelViewerWidgetId, document,
  null, dispatch)` dispatches into the store so a linked Document Viewer / model viewer widget
  receives the selected document (loose coupling by widget id, not by direct reference).
- Autodesk ACC integration: `useDocuments`/`useJobs` (shared) expose repository items,
  children, search, and selected-folder filtering backed by Autodesk Construction Cloud.
- requireLicense Autodesk: `manifest.json` sets `"requireLicense": "Autodesk"`; the widget is
  gated behind an Autodesk license and APS sign-in (`ApsLogIn`, `apsAuthenticated`,
  `userHasPermission`).
- Lazy loading guard: `useTreeNode` only loads children after `expandedOnce` is set, with a
  comment "Do not load children until first expanded otherwise the whole tree will load at once".
- Cross-ref: see `patterns/container-shared-code.md` for the shared-code container pattern
  used across the GeoBIM widget family.

## Builder vs runtime split
- Runtime entry: `src/runtime/widget.tsx` -> providers -> `components/document-explorer.tsx`
  and the tree components; local hooks under `src/runtime/hooks`.
- Builder/settings entry: `src/setting/setting.tsx` renders one `SettingSection` with:
  - `MapWidgetSelector` (`autoSelect`), persisted via `onSettingChange({ id, useMapWidgetIds })`.
  - `FeatureServiceErrors` (shared) surfacing GeoBIM feature-service warnings in the builder.
  - `DocumentViewerWidgetList` (shared) to choose the linked model/document viewer widget.
- Config shape is defined in `src/config.ts`; the config key
  (`DOCUMENT_VIEWER_WIDGET_ID_CONFIG_KEY`) is imported from shared code, and `config.json`
  ships the default `{ "modelViewerWidgetId": "" }`.

## Lifecycle and cleanup
- All async effects use an `unloading` / `stale` boolean flag captured in the effect and set
  to `true` in the cleanup function to avoid `setState` after unmount:
  - `documents-provider.tsx` `processSelectedDocument`
  - `use-document-explorer.tsx` `updateSelectedFolders` (`stale`), `updateRoot` (`unloading`),
    `searchDocuments` (`unloading`)
  - `use-tree-node.tsx` `initNodeChildren` (`unloading`)
- `DocumentsProvider` derives `geoBIMDocument` from the selected document via an async effect,
  and clears it when selection is null.
- Search text is debounced in the component (`SEARCH_DEBOUNCE_TIME_MS = 700`,
  via `lodash`), then fed into `setDocumentSearchText`.
- Context values and callbacks are memoized (`useMemo` + `useCallback`) in every provider/hook
  to keep referential stability for children.

## Manifest/config requirements
From `manifest.json`:
- `"name": "document-explorer"`, `"label": "Document Explorer"`, `"type": "widget"`
- `"version": "1.20.0"`, `"exbVersion": "1.20.0"`
- `"dependency": "jimu-arcgis"`
- `"requireLicense": "Autodesk"`
- `"properties": { "showDescription": true }`
- `"extensions": [{ "name": "GeoBIM Store", "point": "REDUX_STORE", "uri": "extensions/geobim-store" }]`
- `"defaultSize": { "width": 450, "height": 350 }`
- No `publishMessages` / `messageActions` declared (empty arrays).

Config (`config.ts` / `config.json`):
- Interface `Config` keyed by `DOCUMENT_VIEWER_WIDGET_ID_CONFIG_KEY` (imported from shared code),
  effectively `modelViewerWidgetId: string`.
- Default `config.json`: `{ "modelViewerWidgetId": "" }`.
- Map binding is stored by the framework in `useMapWidgetIds` (not in `config`).

## Gotchas
- The widget renders nothing but a `WidgetPlaceholder` until a Map widget is bound; a map is
  required, not optional (`appConfigured = currentMapWidgetId`).
- Requires an Autodesk license (`requireLicense: "Autodesk"`) and APS authentication plus user
  permission; without them the tree is replaced by sign-in / permission-denied UI.
- Almost every meaningful type/function is imported from `widgets/shared-code/geobim`; do not
  expect the logic to live in this widget folder. Editing behavior usually means editing the
  shared code module.
- `MapWidgetSelector` returns an array, but only one map id is honored (comment in `setting.tsx`).
  Settings will NOT persist unless `onSettingChange` includes `id` (documented in-code as a
  non-obvious requirement).
- `useTreeNode` intentionally does not load children until first expansion; changing this to
  eager loading would load the entire repository tree at once.
- Hooks throw if used outside `DocumentsProvider` ("Must call useDocumentExplorer inside of
  DocumentsProvider" / "Must call useTree inside of DocumentsProvider").
- `selectedRootItem` only supports single feature selection (`selectedFeatures.length !== 1`
  returns null), and uses a `projectId` attribute with a TODO to replace with an explicit BIM
  project check (Issue #5269 in-code).
- The config key is re-exported from shared code, so `IMConfig` field names are effectively
  owned by shared code, not this widget.

## Useful snippets and functions
Real snippets copied from the inspected source.

Source: `src/runtime/widget.tsx` (map gating + provider nesting)
```tsx
const currentMapWidgetId = useMapWidgetIds?.[0]
const appConfigured = currentMapWidgetId

return (
  <Paper shape="none" className="jimu-widget widget-document-explorer">
    {!appConfigured && (
      <WidgetPlaceholder
        icon={documentExplorerIcon}
        name={i18nMessage('widgetTitle')}
      />
    )}
    {appConfigured && (
      <>
        <GeoBIMProvider mapWidgetId={currentMapWidgetId} widgetId={widgetId}>
          <DocumentsProvider modelViewerWidgetId={modelViewerWidgetId}>
            <DocumentExplorer i18nMessage={i18nMessage} theme={theme} />
          </DocumentsProvider>
        </GeoBIMProvider>
      </>
    )}
  </Paper>
)
```

Source: `src/runtime/widget.tsx` (shared-messages i18n helper, mirrored in setting.tsx)
```tsx
const i18nMessage = useCallback(
  (
    id:
      | keyof typeof defaultMessages
      | keyof typeof defaultSharedMessages.default,
    values?: { [key: string]: string },
  ): string => {
    // NOTE: defaultMessages is last to ensure it takes priority over defaultSharedMessages
    const defaultLocaleMessages = {
      ...defaultSharedMessages.default,
      ...defaultMessages,
    }
    return translateMessage(id, defaultLocaleMessages, values)
  },
  [translateMessage],
)
```

Source: `src/runtime/providers/documents-provider.tsx` (dispatch selection to a linked viewer widget)
```tsx
const dispatch = useDispatch<Dispatch<ActionTypes>>()

const selectDocument = useCallback(
  (document: IDocument): void => {
    if (document.url === selectedDocument?.url) {
      // do nothing if already selected
      return
    }
    setSelectedDocument(document)
    if (modelViewerWidgetId != null && modelViewerWidgetId !== '') {
      setModelViewerLinkedDocument(
        modelViewerWidgetId,
        document,
        null,
        dispatch,
      )
    }
  },
  [selectedDocument, modelViewerWidgetId, dispatch],
)
```

Source: `src/runtime/providers/documents-provider.tsx` (zoom selected document to its map feature)
```tsx
const zoomToDocumentInMap = useCallback(async (): Promise<void> => {
  const objectId = geoBIMDocument?.objectId
  if (objectId == null) return

  const documentsLayer = await getDocumentsLayer()
  const layerId = documentsLayer?.layerId
  const portalItemId = documentsLayer?.portalItemId
  if (layerId == null || portalItemId == null) return

  await zoomToFeature(objectId, layerId, portalItemId)
}, [geoBIMDocument, getDocumentsLayer, zoomToFeature])
```

Source: `src/runtime/hooks/use-tree-node.tsx` (lazy child loading guard with unmount safety)
```tsx
useEffect(
  function initNodeChildren () {
    let unloading = false

    const loadNodeChildren = async (): Promise<void> => {
      /* NOTE: Do not load children until first expanded
             otherwise the whole tree will load at once! */
      if (!expandedOnce || nodeChildrenFullyLoaded || !useDocumentsReady) {
        setLoading(false)
        return
      }

      setLoading(true)

      const children = await getChildren(nodeItem)
      if (unloading) return
      // ... split children into nodes and documents ...
    }
    void loadNodeChildren()

    return () => {
      unloading = true
    }
  },
  [expandedOnce, getChildren, nodeChildrenAlreadyLoaded, nodeChildrenFullyLoaded, nodeItem, useDocumentsReady, nodeDocumentChildrenRequiresSeparateLoading],
)
```

Source: `src/runtime/hooks/use-document-explorer.tsx` (context guard + single-selection root item)
```tsx
const documentsContext = useContext<DocumentsContextType | undefined>(
  DocumentsContext,
)
if (documentsContext === undefined) {
  throw new Error('Must call useDocumentExplorer inside of DocumentsProvider')
}

const selectedRootItem = useMemo((): NodeRepositoryItem | null => {
  if (selectedFeatures.length !== 1 || rootItems === null) {
    // only support single selection for now
    return null
  }
  const selectedFeature = selectedFeatures[0]
  const rootItemId = getFeatureAttribute(
    selectedFeature.feature,
    PROJECT_ID_ATTRIBUTE,
  ) as string
  for (const item of rootItems) {
    if (item.id === rootItemId) {
      return item as NodeRepositoryItem
    }
  }
  return null
}, [rootItems, selectedFeatures])
```

Source: `src/extensions/geobim-store.ts` (REDUX_STORE extension re-export)
```ts
import { GeoBIMStoreExtension } from 'widgets/shared-code/geobim'

export default GeoBIMStoreExtension
```

Source: `src/setting/setting.tsx` (map selector + shared GeoBIM setting components)
```tsx
const onMapWidgetSelected = (newUseMapWidgetIds: string[]): void => {
  // NOTE: It's not documented, but settings will NOT be saved without supplying the ID!
  onSettingChange({ id, useMapWidgetIds: newUseMapWidgetIds })
}

return (
  <div className="widget-setting-document-explorer">
    <SettingSection title={i18nMessage('settingsLabel')}>
      <SettingRow>{i18nMessage('selectMapSetting')}</SettingRow>
      <SettingRow>
        <MapWidgetSelector
          autoSelect={true}
          onSelect={onMapWidgetSelected}
          useMapWidgetIds={useMapWidgetIds}
        />
      </SettingRow>
      <SettingRow>
        <FeatureServiceErrors
          useMapWidgetIds={useMapWidgetIds}
          theme={theme}
          errorType="warning"
          noFeatureServiceErrorText={i18nMessage('geobim_noFeatureServiceSettingsWarning')}
          multipleFeatureServicesErrorText={i18nMessage('geobim_multipleFeatureServicesSettingsWarning')}
          infoMessageText={i18nMessage('geobim_featureServicesSettingsTip')}
        />
      </SettingRow>
      <SettingRow>{i18nMessage('selectModelViewer')}</SettingRow>
      <SettingRow>
        <DocumentViewerWidgetList
          noWidgetsText={i18nMessage('geobimNoneSetting')}
          widgetId={id}
        />
      </SettingRow>
    </SettingSection>
  </div>
)
```

UNVERIFIED: The internal behavior of `widgets/shared-code/geobim` exports (`GeoBIMProvider`,
`useDocuments`, `useJobs`, `useGeoBIM`, `useMap`, `setModelViewerLinkedDocument`,
`GeoBIMStoreExtension`, `DocumentViewerWidgetList`, `FeatureServiceErrors`, repository item
type guards, `getFeatureAttribute`) was not inspected here; only their usage in this widget was
verified. See the shared code module and `patterns/container-shared-code.md` for details.
