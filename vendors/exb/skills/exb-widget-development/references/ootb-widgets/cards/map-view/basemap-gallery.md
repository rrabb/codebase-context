# OTB Widget: arcgis/basemap-gallery

Online widget doc: https://developers.arcgis.com/experience-builder/guide/basemap-gallery-widget/

## Purpose

A map-bound widget that presents a gallery of basemaps the end user can switch between. It wraps the ArcGIS Maps SDK `arcgis-basemap-gallery` web component and feeds it a curated list of basemaps. The list is either:
- the organization/portal basemap group (`BasemapsType.Organization`, the default), or
- a custom set (`BasemapsType.Custom`) assembled in the builder from portal group items and/or ad-hoc service URLs.

It also injects the map's original basemap into the gallery when it is not otherwise present, filters out 3D basemaps for 2D map views, and keeps the gallery in sync as custom basemaps are added, removed, reordered, or edited.

## Source paths inspected

Root: `ArcGISExperienceBuilder/client/dist/widgets/arcgis/basemap-gallery/` (gitignored; inspected via includeIgnoredFiles, `dist/` compiled output and `tests/` ignored).

- `manifest.json`
- `config.json` (empty `{}`)
- `src/config.ts`
- `src/utils.ts`
- `src/runtime/widget.tsx`
- `src/runtime/basemap-utils.ts`
- `src/runtime/utils.ts`
- `src/tools/app-config-operations.ts`
- `src/tools/builder-operations.ts`
- `src/setting/setting.tsx`
- `src/setting/utils.ts`
- `src/setting/components/add-by-url.tsx`
- `src/setting/components/import-basemaps.tsx`
- `src/setting/components/custom-basemap-list.tsx`
- `src/setting/components/indicator-3d.tsx`
- (referenced, not deep-read) `src/setting/components/button-with-side-popper.tsx`, `src/setting/components/placeholder.tsx`

## Architecture overview

Runtime (`src/runtime/widget.tsx`):
- Functional widget. Reads `useMapWidgetIds`, `config`, `theme` from props. If no map widget is bound it renders a `WidgetPlaceholder`; otherwise it renders a `Paper` containing a container `div` plus a `JimuMapViewComponent` (headless map-view bridge).
- `useFullConfig(config)` fills defaults (`basemapsType: Organization`, `customBasemaps: []`).
- On active-view change (`onActiveViewChange`) it either creates a fresh `arcgis-basemap-gallery` element, reuses a cached one, or re-points the existing one to the new `MapView`/`SceneView`.
- The gallery element is created imperatively via `document.createElement('arcgis-basemap-gallery')`, appended into a ref'd container `div`, and given `.view`, `.source` (a `LocalBasemapsSource`), and `autoDestroyDisabled = true`.
- A standalone `BasemapGalleryViewModel` instance (`bgViewModel`) is used only for `basemapEquals(...)` comparisons (basemaps are not compared by reference).
- Custom-basemap array diffing is handled by `useCustomBasemapsChange` (in `basemap-utils.ts`), which dispatches to `onCustomBasemapAdd` / `onCustomBasemapRemove` / `onCustomBasemapSortOrUpdate`.

Builder (`src/setting/setting.tsx` + components):
- `MapWidgetSelector` binds the map; a two-option `Radio` group picks `Organization` vs `Custom`.
- In `Custom` mode, `ImportBasemaps` (portal group picker via side popper) and `AddBasemapsByUrl` (service-URL form via side popper) add entries; `CustomBasemapList` shows the draggable/editable/removable list.

Extensions (`src/tools/`):
- `appConfigOperations` (`AppConfigOperationsExtension`) -> cleanup on widget removal.
- `builderOperations` (`BuilderOperationsExtension`) -> exposes URL-basemap titles for multi-language translation.

## Key imports and packages

Runtime widget - `src/runtime/widget.tsx`:
- `jimu-core`: `React, hooks, jsx, classNames, css, Immutable/ImmutableArray/ImmutableObject types, appConfigUtils`
- `jimu-arcgis`: `JimuMapView (type), JimuMapViewComponent, MapViewManager, basemapUtils`
- `jimu-ui`: `Loading, LoadingType, Paper, WidgetPlaceholder`
- `esri/widgets/BasemapGallery/BasemapGalleryViewModel` (direct `esri/*` alias import)
- `esri/widgets/BasemapGallery/support/LocalBasemapsSource` (direct `esri/*` alias import)

Runtime helpers - `src/runtime/basemap-utils.ts`:
- `jimu-core`: `React, AllWidgetProps, hooks, MutableStoreManager, ReactRedux, IMState, UseDataSource, Immutable, ImmutableArray, getAppStore, ImmutableObject, IMThemeVariables`
- `jimu-arcgis`: `basemapUtils, JimuMapView (type)`
- `esri/Basemap`, `esri/layers/VectorTileLayer`, `esri/layers/Layer` (direct static `esri/*` alias imports)

Shared factory - `src/utils.ts`:
- `jimu-core`: `React, Immutable, ImmutableObject, appConfigUtils`
- `jimu-arcgis`: `basemapUtils`
- Uses `basemapUtils.loadBasemap`, `Basemap`, `Layer.fromArcGISServerUrl`, `VectorTileLayer` (classes passed in as args).

Setting - `src/setting/setting.tsx`:
- `jimu-core`: `React, jsx, classNames, css, defaultMessages (jimuCore), hooks, SessionManager, Immutable, ImmutableObject type`
- `jimu-for-builder`: `AllWidgetSettingProps`
- `jimu-ui`: `Radio, Label, defaultMessages (jimuUI)`
- `jimu-ui/advanced/setting-components`: `MapWidgetSelector, SettingRow, SettingSection`

Setting - `src/setting/utils.ts`:
- `jimu-core`: `loadArcGISJSAPIModules, uuidv1`
- Dynamically loads `esri/Basemap`, `esri/layers/VectorTileLayer`, `esri/layers/Layer`.

Setting - `src/setting/components/import-basemaps.tsx`:
- `jimu-core`: `React, css, getAppStore, hooks, jsx, loadArcGISJSAPIModules, ReactRedux, IMState, SessionManager, defaultMessages`
- `jimu-arcgis`: `basemapUtils`
- `jimu-ui`: `TextInput, Loading, LoadingType, Card, AdvancedSelect, Dropdown*` etc.
- `jimu-ui/advanced/setting-components`: `SettingRow, SettingSection`
- Dynamically loads `esri/portal/Portal`, `esri/request`.

Setting - `src/setting/components/add-by-url.tsx`:
- `jimu-core`: `React, css, hooks, jsx, uuidv1, urlUtils, lodash, ServiceManager, classNames, focusElementInKeyboardMode, appConfigUtils`
- `jimu-ui`: `Button, Checkbox, ImageParam, Label, Loading, TextArea, TextInput, Tooltip`
- `jimu-ui/advanced/resource-selector`: `ImageSelector`
- `jimu-icons/*` for glyphs.

Setting - `src/setting/components/indicator-3d.tsx`:
- `jimu-arcgis`: `basemapUtils` (`isBasemap3D`), plus `getLoadedBasemap` from `../utils`.

Tools - `src/tools/*`:
- `jimu-core`: `MutableStoreManager, extensionSpec (type), IMAppConfig (type)`

## Reusable patterns found

- `JimuMapViewComponent` (headless): bound with `useMapWidgetId={useMapWidgetIds[0]}` and `onActiveViewChange`. This is the canonical way to react to the active `JimuMapView` without rendering a visible map. Source: `src/runtime/widget.tsx`.
- `basemapUtils.loadBasemap(basemap)`: awaited to ensure a `Basemap` is fully loaded before it goes into the gallery source. Source: `src/utils.ts` (`getBasemap`).
- `basemapUtils.getOrgBasemaps()`: fetches the organization basemap items (cached; see caching note). Source: `src/runtime/basemap-utils.ts`.
- `basemapUtils.isBasemap3D(basemap)`: used both to filter 3D basemaps out of 2D map views and to drive the `Indicator3d` badge in the setting list. Sources: `src/runtime/widget.tsx`, `src/setting/components/indicator-3d.tsx`.
- `basemapUtils.getBasemapGroup(portal, portalSelf, BasemapGroupType.EsriDefault | EsriDefault3d | <org default>)`: resolves portal basemap groups in the import UI. Source: `src/setting/components/import-basemaps.tsx`.
- Custom basemap import via REST: URL basemaps are built with `Layer.fromArcGISServerUrl({ url, properties })` for `MapServer`/`ImageServer`/`VectorTileServer`, else `new VectorTileLayer({ url })` for style/json URLs; URL reachability is validated with `ServiceManager.getInstance().fetchServiceInfo(url)`. Sources: `src/utils.ts`, `src/setting/components/add-by-url.tsx`.
- `appConfigOperations` + `builderOperations` extension pair declared in `manifest.json` -> imperative cleanup and ML translation-key exposure without touching the runtime component.
- Org/original basemap sync + caching via `MutableStoreManager` (see Lifecycle).
- `LocalBasemapsSource` wrapping: `new LocalBasemapsSource({ basemaps })` feeds the web component a controlled, ordered list. Source: `src/runtime/widget.tsx`.
- Immutable config-merge helper `useFullConfig(config)` centralizes defaults for both runtime and setting. Source: `src/utils.ts`.

## Builder vs runtime split

Runtime (`src/runtime/`):
- Renders and drives the live `arcgis-basemap-gallery`, reacts to `basemapsType`/`themeMode`/active-view/custom-basemap changes, and manages original-basemap restoration and caching.

Builder (`src/setting/`):
- Only edits config: `useMapWidgetIds`, `basemapsType`, and `customBasemaps[]`. It never renders the gallery itself.
- `onPropertyChange` prunes config: selecting `Organization`, or an empty custom list, calls `propConfig.without(name)` so defaults are re-derived rather than persisted.
- `ImportBasemaps` and `AddBasemapsByUrl` build `BasemapInfo` entries; `CustomBasemapList` reorders/edits/removes them.

Shared (`src/config.ts`, `src/utils.ts`): types (`BasemapsType`, `BasemapFromUrl`, `BasemapInfo`, `Config`, `IMConfig`), the `getBasemap` factory, `isBasemapFromUrl` guard, and `useFullConfig` are imported by both sides.

## Lifecycle and cleanup

- Creation is imperative: `createBasemapGallery` builds the element, sets `autoDestroyDisabled = true`, and appends/replaces it inside the container `div` (`widgetContainerParent`). Source: `src/runtime/widget.tsx`.
- Caching across re-mounts (drag into/out of Map or layout widgets) uses `MutableStoreManager` keyed by widget id, in `useCache` (`src/runtime/basemap-utils.ts`):
  - `cachedOrgBasemaps` (org basemaps are expensive to fetch),
  - `cachedOriginalBasemaps` (`Map<viewId, Basemap>` so the map's starting basemap can be restored),
  - `cachedArcgisBasemapGalleryElement` (avoid recreating the gallery element).
  A cleanup effect stores originals + element into the mutable store on unmount, but only if the widget json still exists (i.e. moved, not deleted).
- Original-basemap bookkeeping: originals are recorded per view; when the map changes (`map1 -> map2`) or is set to none, the previous view's basemap is reset from `originalBasemaps`. Stale originals are pruned when the bound map's data sources change (deferred via `setTimeout`).
- Deletion cleanup lives in the extension, not the component - `AppConfigOperation.widgetWillRemove` calls `arcgisBasemapGalleryElement.destroy()` and nulls all three cached mutable-state values. Source: `src/tools/app-config-operations.ts`.

## Manifest/config requirements

From `manifest.json`:
- `"type": "widget"`, `"dependency": "jimu-arcgis"` (required for map-view + `basemapUtils`).
- `"defaultSize": { "width": 320, "height": 400 }`.
- `"properties": { "coverLayoutBackground": true }`.
- Two registered extensions:
  - `appConfigOperations` at point `APP_CONFIG_OPERATIONS`, uri `tools/app-config-operations`.
  - `builderOperations` at point `BUILDER_OPERATIONS`, uri `tools/builder-operations`.
- `version` / `exbVersion`: `1.20.0`; author "Esri R&D Center Beijing".

Config shape (`src/config.ts`):
```ts
export enum BasemapsType { Organization = 'ORGANIZATION', Custom = 'CUSTOM' }

export interface BasemapFromUrl {
  id: string
  title: string
  thumbnail?: ImageParam
  layerUrls: string[]
  disablePopup?: boolean
}

export type BasemapInfo = basemapUtils.BasemapItem | BasemapFromUrl

export interface Config {
  customBasemaps?: BasemapInfo[]
  basemapsType?: BasemapsType
}
export type IMConfig = ImmutableObject<Config>
```
`config.json` ships empty (`{}`); defaults come from `useFullConfig`.

## Gotchas

- The widget is useless without a bound map widget: with no `useMapWidgetIds` it renders only a `WidgetPlaceholder`.
- Basemaps must be compared with `bgViewModel.basemapEquals(...)`, not `===` / by reference. All add/remove/reorder/active-basemap logic depends on this.
- 3D basemaps are filtered out when the active view is not `type === '3d'`; a custom basemap that is 3D silently will not appear on a 2D map (`onCustomBasemapAdd` returns early; removal handles `index < 0`).
- Express-mode template switching race: promises resolve after a `MapView` may already be destroyed. Runtime guards with `if (!mapView?.map) return` / `if (!currentJimuMapView?.view) return` in several async paths. Copy these guards when writing similar map-view async code.
- The gallery element is created with `autoDestroyDisabled = true`; the widget is responsible for destroying it (done in `widgetWillRemove`). Forgetting the extension-level `destroy()` would leak the SDK component.
- Caching lives in `MutableStoreManager` (not React state / not Redux config). The unmount effect deliberately skips writing cache back when the widget json is gone, because `widgetWillRemove` already cleared it - re-adding would resurrect stale state.
- There are two same-named `getLoadedBasemap` helpers: runtime `src/runtime/basemap-utils.ts` (takes `theme`, supplies a default SVG thumbnail, uses statically imported esri classes) vs setting `src/setting/utils.ts` (no theme, loads esri classes dynamically via `loadArcGISJSAPIModules`). Do not conflate them.
- In `src/setting/utils.ts` the dynamic module array is `['esri/Basemap', 'esri/layers/VectorTileLayer', 'esri/layers/Layer']` but destructured as `[Basemap, Layer, VectorTileLayer]`, so the local names for `Layer` and `VectorTileLayer` are swapped relative to their module paths. `getBasemap(basemapInfo, Basemap, Layer, VectorTileLayer)` is then called with those swapped locals. UNVERIFIED whether this is intentional/harmless; noted from literal source in `src/setting/utils.ts`.
- URL basemaps: only `https` absolute URLs pass `urlUtils.checkAbsoluteUrl(url, ['https'])`; reachability is confirmed with `ServiceManager.fetchServiceInfo(url)`. `ImageServer` URLs get `popupEnabled` wired to `!disablePopup`. Source: `src/setting/components/add-by-url.tsx`, `src/utils.ts`.
- `disablePopup` only affects `ImageServer`-backed base layers (`urlIsImageServer` = endsWith `'ImageServer'`). Other layer types ignore it. Source: `src/runtime/widget.tsx` `onCustomBasemapSortOrUpdate`, `src/utils.ts`.
- Reorder detection uses `findDraggedItemPosition` (a diff algorithm, see snippet). When the original basemap occupies gallery index 0 (custom count < gallery count), `from`/`to` are offset by +1. Source: `src/runtime/widget.tsx`, `src/runtime/utils.ts`.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - imperatively create the SDK gallery web component and feed it a `LocalBasemapsSource`:
```tsx
const getBasemapsSource = (basemaps: __esri.Basemap[]) => {
  return new LocalBasemapsSource({ basemaps })
}

const createBasemapGallery = async (mapView: __esri.MapView | __esri.SceneView) => {
  setLoading(true)
  const basemaps = await getBasemapsForGallerySource(mapView)
  // in express mode template selector, the map may have been destroyed already
  if (!mapView?.map) {
    return
  }
  const originalBasemap = mapView.map.basemap
  const originalBasemapIncluded = !!basemaps.find((item) => bgViewModel.basemapEquals(originalBasemap, item))

  const abg = document.createElement('arcgis-basemap-gallery')
  abg.classList.add('jimu-outline-inside')
  abg.view = mapView
  abg.source = getBasemapsSource((originalBasemapIncluded || !originalBasemap) ? basemaps : [originalBasemap, ...basemaps])
  abg.autoDestroyDisabled = true

  updateBasemapGalleryElement(abg)
  if (widgetContainerParent.current.childElementCount === 0) {
    widgetContainerParent.current.appendChild(abg)
  } else {
    widgetContainerParent.current.replaceChildren(abg)
  }
  setLoading(false)
}
```

Source: `src/runtime/widget.tsx` - 3D filter + org-vs-custom source selection:
```tsx
const getBasemapsForGallerySource = async (targetMapView: __esri.MapView | __esri.SceneView) => {
  let basemaps: __esri.Basemap[] = []
  basemapTypeUsedWhenGetSource.current = basemapsType
  themeModeWhenGetSource.current = themeMode

  if (basemapsType === BasemapsType.Organization) {
    basemaps = await getOrgBasemaps()
  } else {
    basemaps = await getLoadedBasemapList(customBasemaps.asMutable({ deep: true }), theme)
  }
  if (!isMapView3D(targetMapView)) {
    return basemaps.filter((basemap) => !basemapUtils.isBasemap3D(basemap))
  }
  return basemaps
}
```

Source: `src/runtime/widget.tsx` - headless map-view binding + placeholder:
```tsx
if (!useMapWidgetIds?.length) {
  return <WidgetPlaceholder icon={BaseMapGalleryIcon} name={translate('_widgetLabel')} />
} else {
  return (
    <Paper className='jimu-widget widget-basemap-gallery' variant='flat' css={style} shape='none'>
      <div ref={updateWidgetContainerParent} role='listbox' aria-label={translate('_widgetLabel')}
        className={classNames('gallery-container-parent', 'h-100', { 'd-none': loading })}></div>
      {loading && <Loading type={LoadingType.Secondary} />}
      <JimuMapViewComponent
        useMapWidgetId={useMapWidgetIds[0]}
        onActiveViewChange={onActiveViewChange}
      />
    </Paper>
  )
}
```

Source: `src/utils.ts` - basemap factory (portal-item vs URL) using `basemapUtils.loadBasemap`:
```ts
export const getBasemap = async (
  basemapInfo: BasemapInfo,
  Basemap: typeof __esri.Basemap,
  Layer: typeof __esri.Layer,
  VectorTileLayer: typeof __esri.VectorTileLayer
) => {
  let basemap: __esri.Basemap
  if (!isBasemapFromUrl(basemapInfo)) {
    basemap = new Basemap({ portalItem: { id: basemapInfo.id } })
  } else {
    const layers = await Promise.all(basemapInfo.layerUrls.map((url) => {
      if (url.endsWith('MapServer') || url.endsWith('ImageServer') || url.endsWith('VectorTileServer')) {
        const params: __esri.LayerFromArcGISServerUrlParams = { url }
        if (urlIsImageServer(url)) {
          params.properties = { popupEnabled: !basemapInfo.disablePopup }
        }
        return Layer.fromArcGISServerUrl(params).catch((error) => {
          pWinSt.error('create layer for basemap error', error)
        }) as Promise<BasemapFromUrlLayerType>
      }
      // for json url and basemap style url
      return Promise.resolve(new VectorTileLayer({ url }))
    }))
    basemap = new Basemap({
      id: basemapInfo.id,
      title: basemapInfo.title,
      thumbnailUrl: appConfigUtils.processResourceUrl(basemapInfo.thumbnail?.url),
      baseLayers: layers.filter((ly): ly is BasemapFromUrlLayerType => !!ly)
    })
  }
  return basemapUtils.loadBasemap(basemap)
}
```

Source: `src/runtime/basemap-utils.ts` - array-diff hook that classifies add / remove / sort-or-update:
```ts
export const useCustomBasemapsChange = (customBasemaps, basemapGalleryElement, onAdd, onRemove, onSortOrUpdate) => {
  const prevCustomBasemaps = hooks.usePrevious(customBasemaps)
  hooks.useUpdateEffect(() => {
    if (!basemapGalleryElement?.source?.basemaps) {
      return
    }
    let updateFn
    if (customBasemaps.length > prevCustomBasemaps.length) {
      updateFn = onAdd
    } else if (customBasemaps.length < prevCustomBasemaps.length) {
      updateFn = onRemove
    } else {
      updateFn = onSortOrUpdate
    }
    updateFn(prevCustomBasemaps, customBasemaps)
  }, [customBasemaps])
}
```

Source: `src/runtime/basemap-utils.ts` - `MutableStoreManager`-backed caching of org basemaps, originals, and the gallery element:
```ts
const getOrgBasemaps = async () => {
  if (cachedOrgBasemaps) {
    return [...cachedOrgBasemaps]
  }
  const orgBasemapItems = await basemapUtils.getOrgBasemaps()
  setCachedOrgBasemaps(orgBasemapItems)
  return orgBasemapItems
}
// setCachedOrgBasemaps -> MutableStoreManager.getInstance().updateStateValue(id, 'cachedOrgBasemaps', value)
```

Source: `src/tools/app-config-operations.ts` - removal cleanup (destroy element + clear mutable state):
```ts
widgetWillRemove (appConfig: IMAppConfig): IMAppConfig {
  const arcgisBasemapGalleryElement = MutableStoreManager.getInstance().readStateValue(this.widgetId, 'cachedArcgisBasemapGalleryElement')
  if (arcgisBasemapGalleryElement) {
    arcgisBasemapGalleryElement.destroy()
  }
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'cachedOrgBasemaps', null)
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'cachedOriginalBasemaps', null)
  MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'cachedArcgisBasemapGalleryElement', null)
  return appConfig
}
```

Source: `src/tools/builder-operations.ts` - expose URL-basemap titles as translation keys (multi-language support):
```ts
getTranslationKey (appConfig: IMAppConfig): Promise<extensionSpec.TranslationKey[]> {
  const customBasemaps = (appConfig.widgets[this.widgetId].config as IMConfig).customBasemaps
  const keys: extensionSpec.TranslationKey[] = []
  const config = appConfig.widgets[this.widgetId].config as IMConfig
  if (customBasemaps?.length > 0) {
    customBasemaps.forEach((basemapInfo, index) => {
      if (isBasemapFromUrl(basemapInfo)) {
        keys.push({
          keyType: 'value',
          key: `widgets.${this.widgetId}.config.customBasemaps[${index}].title`,
          label: { key: 'label', enLabel: defaultMessages.basemapLabelForML },
          nav: config.customBasemaps[index].title,
          valueType: 'text'
        })
      }
    })
  }
  return Promise.resolve(keys)
}
```

Source: `src/setting/components/add-by-url.tsx` - validate a service URL (https + reachability via `ServiceManager`):
```tsx
const checkUrl = (url: string) => {
  const urlCheckRes = urlUtils.checkAbsoluteUrl(url, ['https'])
  if (urlCheckRes !== 'valid') {
    return { valid: false, msg: translate(urlCheckRes === 'invalidUrlError' ? 'invalidUrlMessage' : 'httpsUrlMessage') }
  }
  const { valid, msg } = checkBasemapUrl(url)
  return { valid, msg }
}

const onAcceptUrl = async (url: string, index: number) => {
  if (!url) {
    return { valid: true, msg: '' }
  }
  let { valid, msg } = layerUrls[index]
  if (valid) {
    try {
      // check if url is accessible
      await ServiceManager.getInstance().fetchServiceInfo(url)
    } catch (error) {
      valid = false
      msg = translate('basemapUrlInvalid')
    }
  }
  // ...set finished state...
  return { valid, msg }
}
```

Source: `src/setting/components/import-basemaps.tsx` - resolve portal basemap groups (Esri default 2D/3D, org default, user groups):
```tsx
const initGroups = async (portal: __esri.Portal) => {
  const esriDefaultGroupInfo = await basemapUtils.getBasemapGroup(portal, portalSelf, basemapUtils.BasemapGroupType.EsriDefault)
  const esriDefault3DGroupInfo = await basemapUtils.getBasemapGroup(portal, portalSelf, basemapUtils.BasemapGroupType.EsriDefault3d)
  const orgDefaultGroupInfo = await basemapUtils.getBasemapGroup(portal, portalSelf)
  // ...builds group list incl. user?.groups...
}
```

Source: `src/setting/components/indicator-3d.tsx` - flag 3D basemaps in the setting list:
```tsx
React.useEffect(() => {
  getLoadedBasemap(basemapInfo).then((basemap) => {
    setIs3D(basemapUtils.isBasemap3D(basemap))
  })
}, [basemapInfo])
```

Source: `src/runtime/utils.ts` - single-item drag reorder detection (used to translate custom-basemap array reorders into gallery `splice`):
```ts
export const findDraggedItemPosition = <T>(prev: T[], current: T[]) => {
  if (prev.length !== current.length || prev.length < 2 || current.length < 2) {
    return null
  }
  const prevChangedPart = prev.map((item, index) => ({ item, index })).filter((info, index) => info.item !== current[index])
  if (prevChangedPart.length < 2) {
    return null // no sort changes
  }
  const currentChangedPart = current.map((item, index) => ({ item, index }))
    .slice(prevChangedPart[0].index, prevChangedPart[prevChangedPart.length - 1].index + 1)
  for (let i = 0; i < prevChangedPart.length; i++) {
    const info = prevChangedPart[i]
    const itemIndexInCurrentChangedPart = currentChangedPart.findIndex((c) => c.item === info.item)
    const prevWithout = [...prevChangedPart]; prevWithout.splice(i, 1)
    const currentWithout = [...currentChangedPart]; currentWithout.splice(itemIndexInCurrentChangedPart, 1)
    if (prevWithout.every((p, k) => p.item === currentWithout[k].item)) {
      return { from: info.index, to: currentChangedPart[itemIndexInCurrentChangedPart].index }
    }
  }
}
```
