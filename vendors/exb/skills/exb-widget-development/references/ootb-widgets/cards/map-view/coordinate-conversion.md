# OTB Widget: arcgis/coordinate-conversion

Online widget doc: https://developers.arcgis.com/experience-builder/guide/coordinate-conversion-widget/

## Purpose
Converts a single input coordinate (or geocoded address, or map click) from one coordinate system/notation into multiple output systems and notation formats simultaneously. Per manifest.json: "A widget to convert input coordinates from one coordinate system to multiple systems and notation formats." Map binding is optional - when a Map widget is configured the widget uses map click/geocode; when no map is configured it still runs as a standalone coordinate converter (see `canLoadInputSettings` / `isMapConfigured`).

## Source paths inspected
- `ArcGISExperienceBuilder/client/dist/widgets/arcgis/coordinate-conversion/manifest.json`
- `.../coordinate-conversion/config.json` (default config sample)
- `.../coordinate-conversion/src/config.ts`
- `.../coordinate-conversion/src/runtime/widget.tsx`
- `.../coordinate-conversion/src/runtime/address-utils.ts`
- `.../coordinate-conversion/src/runtime/components/input-settings.tsx`
- `.../coordinate-conversion/src/runtime/components/output-formats-display.tsx`
- `.../coordinate-conversion/src/setting/setting.tsx`
- `.../coordinate-conversion/src/setting/components/address-settings.tsx`
- `.../coordinate-conversion/src/setting/components/output-settings.tsx`
- `.../coordinate-conversion/src/setting/components/coordinate-table.tsx`
- Not featured (read only / supporting UI): `src/runtime/components/add-popper.tsx`, `src/setting/components/general-settings.tsx`, `src/setting/components/input-settings.tsx`, `src/setting/components/edit-current-pattern.tsx`, `src/setting/components/output-settings-popper.tsx`, `src/*/lib/style.ts`, `translations/`
- Skipped per instruction: `dist/`, `tests/`

Note: the widget source lives under a gitignored `dist/widgets` tree; it was read with ignored files included.

## Architecture overview
Single class widget extending `BaseWidget` (runtime) plus `BaseWidgetSetting` (builder). The runtime never renders the JSAPI `CoordinateConversion` DOM widget - it instantiates only the headless `CoordinateConversionViewModel` (CVM) and renders its own jimu-ui output cards.

Runtime data flow:
1. `JimuMapViewComponent` (optional) supplies a `JimuMapView` via `onActiveViewChange`.
2. `createAPIWidget()` builds a `CoordinateConversionViewModel({ view })`; the `view` may be null (no map).
3. `reactiveUtils.watch` on `cVM.state` -> when `'ready'`, calls `cVM.pause()` to suppress reverse geocode on mouse move.
4. `reactiveUtils.watch` on `cVM.messages` -> rebuilds the `cVM.conversions` collection from `formatUtils.generateDefaultFormats(cVM.messages)` merged with configured `outputSettings` and runtime-added formats (tracked in `_outputDisplayInfos`).
5. `InputSettings` -> `CoordinateControl` (jimu-ui/advanced) produces a `Point` (`onConversionComplete`).
6. `onInputConversionComplete` sets `selectedInputLocation`, then `updateOutputConversions()` calls `cVM.updateConversions(conversions, point)`.
7. `renderOutputList` maps each `Conversion` to an `OutputFormatsDisplay` card and builds a copy-all list.

An `address` "format" is not a native CVM format - it is a custom `Format` built by `generateAddressFormat` that geocodes through `esri/rest/locator`.

## Key imports and packages
Grouped by file, with the exact import path.

jimu framework (from `src/runtime/widget.tsx`):
- `jsx, AllWidgetProps, BaseWidget, getAppStore, ImmutableArray, IMState, AppMode, UseUtility, UtilityManager, lodash, defaultMessages as jimuUIDefaultMessages` from `jimu-core`
- `Loading, LoadingType, Paper` from `jimu-ui`
- `JimuMapViewComponent, JimuMapView` from `jimu-arcgis`

JSAPI / esri modules (from `src/runtime/widget.tsx`):
- `Point` from `esri/geometry/Point`
- `Conversion` from `esri/widgets/CoordinateConversion/support/Conversion`
- `CoordinateConversionViewModel` from `esri/widgets/CoordinateConversion/CoordinateConversionViewModel`
- `formatUtils` from `esri/widgets/CoordinateConversion/support/formatUtils`
- `Format` (type) from `esri/widgets/CoordinateConversion/support/Format`
- `reactiveUtils` from `esri/core/reactiveUtils`

JSAPI geocoding (from `src/runtime/address-utils.ts`):
- `Format` from `esri/widgets/CoordinateConversion/support/Format`
- `locator` from `esri/rest/locator` (`locationToAddress`, `addressToLocations`)

jimu advanced UI (from `src/runtime/components/input-settings.tsx`):
- `CoordinateControl, CoordinateControlResult` from `jimu-ui/advanced/coordinate-control`

Setting-side (from `src/setting/setting.tsx`):
- `MapWidgetSelector, SettingSection, SettingRow` from `jimu-ui/advanced/setting-components`
- `CollapsablePanel` from `jimu-ui`
- `BaseWidgetSetting, AllWidgetSettingProps` from `jimu-for-builder`
- `loadArcGISJSAPIModules` from `jimu-arcgis` (lazy-loads CVM + Format + reactiveUtils in the builder)

Setting address geocoding UI (from `src/setting/components/address-settings.tsx`):
- `UtilitySelector` from `jimu-ui/advanced/utility-selector`
- `SupportedUtilityType` from `jimu-core` (`[SupportedUtilityType.GeoCoding]`)

## Reusable patterns found
- **Optional map binding**: `isMapConfigured()` = `useMapWidgetIds?.length === 1`. The whole widget still functions with `view: null`, so it is a good template for widgets that should degrade gracefully without a map.
- **Headless view model instead of the DOM widget**: instantiate `CoordinateConversionViewModel` and render your own UI from its `conversions`/`messages`. Never mount the JSAPI widget.
- **`reactiveUtils.watch` for async VM readiness**: watch `cVM.state` and `cVM.messages` rather than assuming they are populated synchronously; the messages watcher is where `conversions` are (re)built.
- **`cVM.pause()`** immediately after `state === 'ready'` to prevent the CVM issuing reverse-geocode requests on map pointer move.
- **Custom `Format` for geocoding**: `generateAddressFormat` returns a `Format` whose `conversionInfo.convert` (Point -> address via `locator.locationToAddress`) and `reverseConvert` (string -> Point via `locator.addressToLocations`) integrate geocoding into the same conversion pipeline as coordinate formats.
- **Geocode service resolution via UtilitySelector**: builder stores `useUtilitiesGeocodeService: ImmutableArray<UseUtility>`; runtime resolves the URL through `UtilityManager.getInstance().getUrlOfUseUtility(...)`, falling back to a legacy `geocodeServiceUrl`, then `portalSelf.helperServices.geocode[0].url`, then the Esri World GeocodeServer.
- **Configured vs runtime-added formats**: `_outputDisplayInfos[]` carries an `addedAtRuntime` flag so formats a user adds live are preserved (prepended/appended around the configured set) when the messages watcher rebuilds conversions.
- **`CoordinateControl`** (jimu-ui/advanced/coordinate-control) is the reusable input for typing/selecting a coordinate, with built-in copy/zoom and `getSupportedFormats` callback.

## Builder vs runtime split
Runtime (`src/runtime/widget.tsx`): loads the esri modules via static `import` (they are declared bundle deps through `dependency: "jimu-arcgis"` in the manifest), builds the CVM against the live view, renders input + output cards, handles copy/zoom/add/remove.

Builder (`src/setting/setting.tsx`): lazy-loads `CoordinateConversionViewModel`, `support/Format`, `core/reactiveUtils` via `loadArcGISJSAPIModules` in `componentDidMount`, spins up its own CVM only to enumerate `cVM.formats` into a sorted `supportedFormats` list (each mapped to an `OutputSettings`), and renders four `CollapsablePanel` sections: Address, Input, Output, and General (General only shown when a map widget is selected). Config writes go through `onSettingChange` with `config.setIn([...])`.

## Lifecycle and cleanup
- `constructor`: seeds state, computes default geocode URL, kicks `updateGeocodeURL()` when a utility is configured.
- `componentDidMount`: sets `_isMounted = true`; if no map configured, immediately `createAPIWidget()`.
- `onActiveViewChange`: stores `jimuMapview` then `createAPIWidget()`.
- `componentDidUpdate`: destroys the previous CVM (`this.state.outputFormatCoordVM.destroy()`) and rebuilds when `useMapWidgetIds` changes or output settings change; also re-resolves the geocode URL when the address settings change.
- `componentWillUnmount`: sets `_isMounted = false`. Note: it does NOT call `outputFormatCoordVM.destroy()` here - the CVM is only destroyed on config change in `componentDidUpdate`. The `_isMounted` guard protects the `setTimeout(..., 400)` callback inside the messages watcher from running after unmount.
- The `reactiveUtils.watch` handles created in `createAPIWidget` are not explicitly stored or removed; cleanup relies on `cVM.destroy()`.

## Manifest/config requirements
- `manifest.json`: `"dependency": "jimu-arcgis"`, `type: "widget"`, `defaultSize { width: 350, height: 400 }`, `properties.showDescription: true`. The manifest does not list explicit `esModules`/`css`; the esri modules used are pulled in via the `jimu-arcgis` dependency.
- `config.ts` shape (`Config`): `inputSettings { defaultCoordinate, format }`, `outputSettings: OutputSettings[]`, `addressSettings { minCandidateScore, maxSuggestions, useUtilitiesGeocodeService: ImmutableArray<UseUtility>, geocodeServiceUrl, displayFullAddress }`, `generalSettings { zoomScale, defaultPointSymbol }`.
- `OutputSettings`: `{ name, label, defaultPattern, currentPattern, enabled, isCustom? }`.
- Default `config.json`: `inputSettings.defaultCoordinate = "dd"`, `format = "Y°N, X°E"`, `outputSettings = []` (empty means "show all formats" at runtime), `minCandidateScore = 100`, `maxSuggestions = 6`, `zoomScale = 50000`, and a base64 `defaultPointSymbol` (esriPMS picture marker, BlueShinyPin).

## Gotchas
- **Empty `outputSettings` means "all formats"**: on first load `outputSettings` is `[]`; the messages watcher then adds the address format plus every default format except `basemap`. Configured lists only show `enabled` entries.
- **`basemap` format is always filtered out** everywhere (runtime add, configured loop, builder enumeration).
- **`address` is a synthetic format**: it is rebuilt (`generateAddressFormat`) every time the geocode URL, `minCandidateScore`, or `displayFullAddress` changes; existing conversions are patched in `updateGeocodeURL` by swapping `conversionItem.format` where `format.name === 'address'`.
- **`cVM.pause()` is required** or the CVM issues reverse geocodes on pointer move.
- **CVM rebuild is debounced by `setTimeout(..., 400)`** inside the messages watcher, guarded by `_isMounted`; do not assume conversions exist synchronously after `createAPIWidget`.
- **`addNewFormat` uses a 100 ms `setTimeout`** before `updateOutputConversions()` (referenced workaround for solutions-web-collaboration issue #1221).
- **Runtime-added formats can only be prepended or appended**, never interleaved with configured formats - the `append` flag logic in the messages watcher enforces this.
- `minCandidateScore` gates geocode results: `convert` returns `''` when `response.score < minCandidateScore`; `reverseConvert` filters candidates below it.
- The address `convert`/`reverseConvert` use `// @ts-expect-error` to satisfy the `Format` typings - the JSAPI types for custom formats are stricter than the runtime contract.
- There is a stray reference to `pWinSt.log(err.message)` in `updateOutputConversions` error handler in the shipped source; treat as vendor logging, not a public API.

## Useful snippets and functions

Source: `src/runtime/widget.tsx` - build the headless CVM, pause it, and rebuild on messages
```tsx
createAPIWidget = () => {
  if (!this.state.outputFormatCoordVM) {
    const cVM = new CoordinateConversionViewModel({
      view: this.state.jimuMapview ? this.state.jimuMapview.view : null
    })
    reactiveUtils.watch(() => cVM.state, async () => {
      await reactiveUtils.whenOnce(() => {
        if (cVM.state === 'ready') {
          // Call the pause method to avoid reverse geocode request on map mouse move
          cVM.pause()
        }
      })
    })
    reactiveUtils.watch(() => cVM.messages, () => {
      if (this._isMounted) {
        setTimeout(() => {
          if (!this._isMounted) {
            return
          }
          const allFormats = formatUtils.generateDefaultFormats(cVM.messages)
          cVM.conversions.removeAll()
          // ... rebuild conversions from _outputDisplayInfos + configured outputSettings ...
        }, 400)
      }
    })
  }
}
```

Source: `src/runtime/widget.tsx` - run all conversions for a picked location and render cards
```tsx
updateOutputConversions = () => {
  if (this.state.selectedInputLocation) {
    this.setState({ showLoading: true }, () => {
      this.state.outputFormatCoordVM
        ?.updateConversions(this.state.outputFormatCoordVM.conversions.toArray(), this.state.selectedInputLocation)
        .then(() => {
          if (this.state.outputFormatCoordVM) {
            this.renderOutputList(this.state.outputFormatCoordVM.conversions)
          }
        })
    })
  }
}
```

Source: `src/runtime/widget.tsx` - resolve the geocode service URL (UtilitySelector -> legacy URL -> portal -> Esri default)
```tsx
getDefaultGeocodeServiceURL = () => {
  let geocodeServiceURL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer'
  if (this.props.config?.addressSettings?.geocodeServiceUrl) {
    geocodeServiceURL = this.props.config.addressSettings.geocodeServiceUrl
  } else if (this.props.portalSelf?.helperServices?.geocode?.length > 0 &&
    this.props.portalSelf.helperServices.geocode[0].url) {
    geocodeServiceURL = this.props.portalSelf.helperServices.geocode[0].url
  }
  return geocodeServiceURL
}

getUrlOfUseUtility = async (useUtility: UseUtility): Promise<string> => {
  if (!useUtility) {
    return Promise.resolve('')
  }
  return UtilityManager.getInstance().getUrlOfUseUtility(useUtility)
}
```

Source: `src/runtime/address-utils.ts` - custom `Format` that geocodes both directions
```ts
export function generateAddressFormat (locatorURL: string, minCandidateScore: number, displayFullAddress: boolean): Format {
  return new Format({
    name: 'address',
    getConversionStrategy: (): 'server' | 'client' => 'server',
    conversionInfo: {
      // Point -> Position (address string)
      // @ts-expect-error
      convert: (point: __esri.Point): Promise<__esri.Position> => new Promise((resolve) => {
        locator.locationToAddress(locatorURL, { location: point }, { query: {} }).then(response => {
          let updatedAddress = response?.address ?? ''
          resolve({
            coordinate: response?.score >= minCandidateScore ? updatedAddress : '',
            location: point
          })
        }, () => resolve({ coordinate: '', location: point }))
      }),
      // string -> Point (best candidate)
      // @ts-expect-error
      reverseConvert: (string: string): Promise<__esri.AddressCandidate> => new Promise((resolve) => {
        locator.addressToLocations(locatorURL, { address: { SingleLine: string } }, { query: {} }).then(response => {
          if (response?.length > 0) {
            response = response
              .filter((item) => item.score >= minCandidateScore && item.location)
              .sort((a, b) => b.score - a.score)
            resolve(response[0])
          }
          resolve(null)
        }, () => resolve(null))
      })
    },
    coordinateSegments: [{ alias: 'L', description: 'Address', searchPattern: /.*/ }],
    defaultPattern: 'L'
  })
}
```

Source: `src/runtime/components/input-settings.tsx` - the reusable coordinate input control
```tsx
<CoordinateControl
  parentWidgetId={this.props.parentWidgetId}
  locatorURL={this.props.locatorURL}
  defaultCoordinate={this.props.config.inputSettings.defaultCoordinate}
  defaultFormat={this.props.config.inputSettings.format}
  zoomScale={this.props.config.generalSettings.zoomScale}
  defaultPointSymbol={this.props.config?.generalSettings?.defaultPointSymbol}
  minCandidateScore={this.props.config.addressSettings.minCandidateScore}
  maxSuggestions={this.props.maxSuggestions}
  displayFullAddress={this.props.displayFullAddress}
  jimuMapview={this.props.jimuMapview}
  copyAllList={this.props.copyAllList}
  showCopy={true}
  showZoom={true}
  onConversionComplete={this.onInputConversionComplete}
  processing={this.onInputProcessing}
  onClear={this.onInputClear}
  getSupportedFormats={this.getSupportedFormats}
/>
```

Source: `src/runtime/widget.tsx` - optional map binding + input/output render
```tsx
render () {
  return (
    <Paper css={getStyle(this.props.theme)} shape="none" className="jimu-widget">
      <div className="widget-coordinate-conversion">
        {this.isMapConfigured() &&
          <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds[0]} onActiveViewChange={this.onActiveViewChange} />
        }
        {this.canLoadInputSettings() &&
          <InputSettings /* ...props... */ onConversionComplete={this.onInputConversionComplete} />
        }
        <div className="mt-5">{this.state.outputList}</div>
        {this.state.showLoading && <Loading type={LoadingType.Secondary} />}
      </div>
    </Paper>
  )
}

isMapConfigured = (): boolean => this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1
canLoadInputSettings = (): boolean => !this.isMapConfigured() || !!this.state.jimuMapview
```

Source: `src/setting/setting.tsx` - builder lazy-loads esri modules and enumerates formats
```tsx
componentDidMount = () => {
  if (!this.state.apiLoaded) {
    loadArcGISJSAPIModules([
      'esri/widgets/CoordinateConversion/CoordinateConversionViewModel',
      'esri/widgets/CoordinateConversion/support/Format',
      'esri/core/reactiveUtils'
    ]).then(modules => {
      [this.CoordinateConversionViewModel, this.Format, this.reactiveUtils] = modules
      this.setState({ apiLoaded: true })
      this.createCoordinateConversionViewModel()
    })
  }
}
```

Source: `src/setting/components/address-settings.tsx` - geocoding utility selector (GeoCoding type only)
```tsx
const supportedUtilityTypes = [SupportedUtilityType.GeoCoding]

<UtilitySelector
  useUtilities={Immutable(this.props.config?.useUtilitiesGeocodeService ?? [])}
  onChange={this.onUtilityChange}
  showRemove={true}
  closePopupOnSelect
  types={supportedUtilityTypes}
/>
```
