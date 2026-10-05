# SDK Samples - Map / View Binding

Source-grounded reference cards for the minimal, single-concept map/view-binding widgets that ship under `ArcGISExperienceBuilder/sdk-resources/widgets/` (read-only vendor teaching samples, exbVersion 1.20.0). Each card is extracted from the ACTUAL `src` (not the README). For production patterns cross-check the repo widgets `src/widgets/grid-overlay` and `src/widgets/map-notes`, and the `arcgis-jsapi-integration.md` reference. Per repo memory, prefer `JimuMapViewComponent` + `onActiveViewChange` for consuming an existing map widget's view.

Signatures below were verified against `ArcGISExperienceBuilder/client/jimu-arcgis/lib/**/*.d.ts` and `jimu-core/lib/data-source-component.d.ts` for 1.20.0. Anything not fully checkable is marked `(signature approx)`.

---

### map-view · Verified vs 1.20: yes
Teaches how a widget that OWNS the map (`canCreateMapView`) builds a `MapView` from a WebMap data source and registers it as a `JimuMapView` - the inverse of consuming one.

- **Source:** `map-view/src/runtime/widget.tsx`, `map-view/src/setting/setting.tsx`, `map-view/manifest.json`, `map-view/config.json` (empty).
- **Manifest reqs:** `"dependency": "jimu-arcgis"`; `"properties": { "canCreateMapView": true }` (marks this as a map-provider widget); `exbVersion 1.20.0`. No `config.ts`.
- **Config shape:** none (config.json is `{}`). Uses `props.useDataSources[0]` (a WebMap DS), not `useMapWidgetIds`.
- **Key APIs (exact):**
  - `MapViewManager.getInstance(): MapViewManager`
  - `MapViewManager.getJimuMapViewById(id: string): JimuMapView`
  - `MapViewManager.createJimuMapView(options: JimuMapViewConstructorOptions): Promise<JimuMapView>`
  - `JimuMapViewConstructorOptions = { mapWidgetId: string; dataSourceId: string; view: __esri.MapView | __esri.SceneView; isActive?: boolean; isEnablePopup?: boolean; mapViewManager: MapViewManager }`
  - `DataSourceComponent` prop `onDataSourceCreated?: (ds: DataSource) => void`
- **Runtime side (widget.tsx):** Render a `DataSourceComponent` over the WebMap DS; in `onDataSourceCreated` build a native `MapView` into a `ref` div, then hand it to the manager.
  ```tsx
  onDsCreated = (webmapDs: WebMapDataSource) => {
    if (!webmapDs) return;
    if (!this.mvManager.getJimuMapViewById(this.props.id)) {
      const options: __esri.MapViewProperties = {
        map: webmapDs.map,
        container: this.mapContainer.current
      };
      // ... optional: seed options.extent from the URL query object
      this.mvManager.createJimuMapView({
        mapWidgetId: this.props.id,
        view: new MapView(options),
        dataSourceId: webmapDs.id,
        isActive: true,
        mapViewManager: this.mvManager
      }).then(jimuMapView => {
        if (!this.extentWatch) {
          this.extentWatch = jimuMapView.view.watch('extent', (extent: __esri.Extent) => {
            jimuHistory.changeQueryObject({ [this.props.id]: `extent=${JSON.stringify(extent.toJSON())}` });
          });
        }
      });
    }
  }
  ```
- **Lifecycle/timing:** The view exists only AFTER `onDataSourceCreated` fires and the returned promise resolves. Guard with `getJimuMapViewById(this.props.id)` so the view is created once (React may re-render/re-fire). The extent watch is attached inside the `.then()` (view guaranteed live).
- **Cleanup/teardown:** This sample does NOT `.remove()` the `extentWatch` (no `componentWillUnmount`) - a latent leak, mitigated only because the widget also owns the view. When lifting, remove the watch on unmount.
- **Critical gotchas:** `mapViewManager` is a REQUIRED field on `JimuMapViewConstructorOptions` ("Pass MapViewManager in to avoid circular dependency"). This widget is a map PROVIDER (`canCreateMapView`), so it reads `useDataSources`, not `useMapWidgetIds`; the settings `DataSourceSelector` is typed to `DataSourceTypes.WebMap`. The URL-param extent is parsed via `new Extent(JSON.parse(extentStr))` in a try/catch.
- **Lift-into-repo:** Only needed when building a custom map container; for the common case (consume an existing Map widget) use `JimuMapViewComponent` instead (repo memory). Add a `componentWillUnmount` (or `useEffect` cleanup) that calls `extentWatch.remove()`. Apply repo code-style: semicolons + `cond && fn();` guards.
- **See also:** `showextent` (the consumer counterpart), `js-api-widget`; repo `src/widgets/grid-overlay`; `arcgis-jsapi-integration.md`.

---

### showextent · Verified vs 1.20: yes
Teaches the canonical CONSUMER path: bind to an existing Map widget via `JimuMapViewComponent` + `onActiveViewChange`, then watch `view.extent`.

- **Source:** `showextent/src/runtime/widget.tsx`, `showextent/src/setting/setting.tsx`, `showextent/manifest.json`, `showextent/config.json` (empty).
- **Manifest reqs:** `"dependency": "jimu-arcgis"`; `properties: {}`; no `canCreateMapView`; `exbVersion 1.20.0`.
- **Config shape:** none. Uses `props.useMapWidgetIds` (set by the settings `MapWidgetSelector`).
- **Key APIs (exact):**
  - `JimuMapViewComponent` prop `useMapWidgetId: string` (SINGULAR)
  - `JimuMapViewComponent` prop `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void`
  - `JimuMapView.view: __esri.MapView | __esri.SceneView`
  - `__esri.View.watch('extent', cb): __esri.WatchHandle`
  - `MapWidgetSelector` (from `jimu-ui/advanced/setting-components`) prop `onSelect(useMapWidgetIds: string[])`
- **Runtime side (widget.tsx):**
  ```tsx
  isConfigured = () => this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1;

  onActiveViewChange = (jimuMapView: JimuMapView) => {
    if (!this.extentWatch) {
      this.extentWatch = jimuMapView.view.watch('extent', extent => {
        this.setState({ extent });
      });
    }
  }
  // render:
  <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]} onActiveViewChange={this.onActiveViewChange} />
  ```
- **Lifecycle/timing:** `onActiveViewChange` fires when the map widget's active view changes (initial load, switch-map tool, or DS change). `activeView` can be null - the sample only guards `!this.extentWatch` (attach-once); in real code also guard `if (!jimuMapView) return;`.
- **Cleanup/teardown:** CORRECT reference: `componentWillUnmount()` calls `this.extentWatch.remove(); this.extentWatch = null;`. This is the model the leaky `get-map-coordinates-function` should have followed.
- **Critical gotchas:** Prop is `useMapWidgetId` (singular string) but the widget receives `useMapWidgetIds` (array) - pass `useMapWidgetIds?.[0]`. `isConfigured()` guards render before any view exists. `view.watch(...)` returns a `WatchHandle` you must keep to remove later.
- **Lift-into-repo:** This IS the golden path per repo memory. Convert to a functional widget with `useEffect` returning `() => handle.remove()`. Note repo caveat: settings `useMapWidgetIds` can differ from internal JimuMapView ids (e.g. `widget_1` vs `widget_1-dataSource_1`) - the component handles the mapping, but manual `MapViewManager` lookups may need prefix matching.
- **See also:** `get-map-coordinates-class`, `view-layers-toggle`, `add-layers`; repo `src/widgets/grid-overlay` (stationary/extent watch), `src/widgets/map-notes`.

---

### get-map-coordinates-class · Verified vs 1.20: yes
Class-component variant: watch `extent` AND `pointer-move` to display live lat/lon, scale, and zoom; converts screen coords to map coords with `view.toMap()`.

- **Source:** `get-map-coordinates-class/src/runtime/widget.tsx`, `.../src/config.ts`, `.../src/setting/setting.tsx`, `manifest.json`.
- **Manifest reqs:** `exbVersion 1.20.0`; `properties: {}`. NOTE: manifest has NO `dependency` field even though the code imports `jimu-arcgis` + `esri/geometry/Point` - see gotcha. Add `"dependency": "jimu-arcgis"` when lifting.
- **Config shape:**
  ```ts
  export interface Config { showScale: boolean; showZoom: boolean }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `JimuMapViewComponent` prop `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void`
  - `JimuMapView.view.watch('extent', cb): __esri.WatchHandle`
  - `__esri.View.on('pointer-move', cb): IHandle` (signature approx - event name from JSAPI View events)
  - `view.toMap(screenPoint: { x: number; y: number }): __esri.Point` (signature approx - JSAPI MapView)
  - `view.center`, `view.scale`, `view.zoom` (JSAPI MapView props)
- **Runtime side (widget.tsx):**
  ```tsx
  activeViewChangeHandler = (jmv: JimuMapView) => {
    if (jmv) {
      jmv.view.watch('extent', evt => {
        this.setState({
          latitude: jmv.view.center.latitude.toFixed(3),
          longitude: jmv.view.center.longitude.toFixed(3),
          scale: Math.round(jmv.view.scale),
          zoom: jmv.view.zoom,
          mapViewReady: true
        });
      });
      jmv.view.on('pointer-move', evt => {
        const point: Point = jmv.view.toMap({ x: evt.x, y: evt.y });
        this.setState({ latitude: point.latitude.toFixed(3), longitude: point.longitude.toFixed(3), /* ... */ mapViewReady: true });
      });
    }
  }
  ```
- **Lifecycle/timing:** `extent` watch fires on pan/zoom (uses `view.center`); `pointer-move` fires continuously as the mouse moves over the view (uses `view.toMap` on the pointer's screen x/y). `mapViewReady` gates the display until the first event lands. Render guards on `hasOwnProperty('useMapWidgetIds')` + `length === 1`.
- **Cleanup/teardown:** This class variant ALSO never removes the two handles (no `componentWillUnmount`) - so both variants leak, but the function variant leaks worse (re-registers on every render, see below). When lifting, capture both handles and remove them on unmount.
- **Critical gotchas:** `view.toMap({x, y})` converts SCREEN coords -> geographic `Point` (needed because `pointer-move` gives screen pixels). `sections.reduce(...)` joins JSX with `' | '` because you cannot `Array.join` React elements. `Math.round(x * 1) / 1` is a no-op in the sample (kept faithfully). Manifest missing `dependency` is a bug to fix on lift.
- **Lift-into-repo:** Add `"dependency": "jimu-arcgis"` to manifest. Store handles and remove on unmount. Prefer functional style with a single `useEffect` keyed on the jimuMapView so handlers register once. `pointer-move` at high frequency + `setState` per event can be chatty - consider throttling.
- **See also:** `get-map-coordinates-function` (the direct contrast below), `showextent`; repo `src/widgets/grid-overlay`.

---

### get-map-coordinates-function · Verified vs 1.20: check
Function-component twin of `get-map-coordinates-class` - identical behavior via `useState`, but it demonstrates the WRONG teardown story (see the leak call-out).

- **Source:** `get-map-coordinates-function/src/runtime/widget.tsx`, `.../src/config.ts` (same `Config`), `.../src/setting/setting.tsx`, `manifest.json`.
- **Manifest reqs:** `exbVersion 1.20.0`; `properties: {}`; NO `dependency` field (same omission as the class variant). Add `"dependency": "jimu-arcgis"` on lift.
- **Config shape:** `interface Config { showScale: boolean; showZoom: boolean }` (identical to the class variant).
- **Key APIs (exact):** same set as `get-map-coordinates-class`:
  - `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void`
  - `jmv.view.watch('extent', cb): __esri.WatchHandle`
  - `jmv.view.on('pointer-move', cb): IHandle` (signature approx)
  - `jmv.view.toMap({ x, y }): __esri.Point` (signature approx)
- **Runtime side (widget.tsx):**
  ```tsx
  export default function (props: AllWidgetProps<IMConfig>) {
    const [latitude, setLatitude] = useState<string>('');
    // ... longitude, zoom, scale, mapViewReady
    const activeViewChangeHandler = (jmv: JimuMapView) => {
      if (jmv) {
        jmv.view.watch('extent', evt => { setLatitude(jmv.view.center.latitude.toFixed(3)); /* ... */ setMapViewReady(true); });
        jmv.view.on('pointer-move', evt => {
          const point: Point = jmv.view.toMap({ x: evt.x, y: evt.y });
          setLatitude(point.latitude.toFixed(3)); /* ... */
        });
      }
    };
    return <div className="widget-get-map-coordinates jimu-widget m-2">
      {props.hasOwnProperty('useMapWidgetIds') && props.useMapWidgetIds?.length === 1 &&
        <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds?.[0]} onActiveViewChange={activeViewChangeHandler} />}
      <p>{mapViewReady ? allSections : defaultMessages.latLonWillBeHere}</p>
    </div>;
  }
  ```
- **Lifecycle/timing:** Same event story as the class variant. But note: `activeViewChangeHandler` is a plain in-body function recreated every render, and it registers `watch` + `on` with NO handle capture and NO effect.
- **Cleanup/teardown:** LEAK - this variant registers `view.watch('extent')` and `view.on('pointer-move')` but never stores or removes the handles, and does it OUTSIDE any `useEffect`, so every `onActiveViewChange` (and any re-fire) stacks new listeners that outlive unmount. CONTRAST: `showextent` (`componentWillUnmount` -> `handle.remove()`) and the class variant (which at least attaches once via `!this.extentWatch`) both do better. This is the sample's teaching anti-pattern.
- **Critical gotchas:** Do NOT copy the listener registration as-is. In a function component, event/watch registration belongs in a `useEffect` that returns a cleanup removing the handles. Same missing-`dependency` manifest bug + `view.toMap` screen->geo conversion as the class variant.
- **Lift-into-repo:** REQUIRED fix - wrap registration in `useEffect`:
  ```tsx
  useEffect(() => {
    if (!jimuMapView) return;
    const h1 = jimuMapView.view.watch('extent', onExtent);
    const h2 = jimuMapView.view.on('pointer-move', onPointerMove);
    return () => { h1.remove(); h2.remove(); };
  }, [jimuMapView]);
  ```
  Store the `JimuMapView` from `onActiveViewChange` in state, drive the effect off it, and add `"dependency": "jimu-arcgis"`. Apply repo semicolons + short-circuit guards.
- **See also:** `get-map-coordinates-class` (same behavior, attach-once), `showextent` (correct removal); repo `src/widgets/grid-overlay`.

---

### js-api-widget · Verified vs 1.20: yes
Teaches embedding an ArcGIS Maps SDK web component (`arcgis-legend`) bound to the consumed `view`, with proper element `.destroy()` teardown before re-create.

- **Source:** `js-api-widget/src/runtime/widget.tsx`, `manifest.json`, `config.json` (empty).
- **Manifest reqs:** `"dependency": "jimu-arcgis"`; `properties: {}`; `exbVersion 1.20.0`. Code does `import 'arcgis-map-components'` (registers the `<arcgis-*>` custom elements).
- **Config shape:** none (`config.json` = `{}`).
- **Key APIs (exact):**
  - `JimuMapViewComponent` prop `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void`
  - `HTMLArcgisLegendElement.view` (map component property; set to `activeView.view`) (signature approx - from `arcgis-map-components`)
  - `HTMLArcgisLegendElement.destroy(): void` (signature approx)
  - `document.createElement('arcgis-legend')` + `container.append(el)` (DOM)
- **Runtime side (widget.tsx):**
  ```tsx
  const [activeView, setActiveView] = useState(null);
  const legendRef = useRef<HTMLArcgisLegendElement>(null);
  useEffect(() => {
    if (legendRef.current) {                 // destroy stale element first
      legendRef.current.destroy();
      if (containerRef.current?.contains(legendRef.current)) containerRef.current.removeChild(legendRef.current);
      legendRef.current = null;
    }
    if (!containerRef.current || !activeView) return;
    const legend = document.createElement('arcgis-legend');
    legend.view = activeView.view;           // bind the JSAPI view
    containerRef.current.append(legend);
    legendRef.current = legend;
  }, [activeView]);
  // render: <JimuMapViewComponent useMapWidgetId={useMapWidgetIds?.[0]} onActiveViewChange={(view) => setActiveView(view)} />
  ```
- **Lifecycle/timing:** The `useEffect` runs whenever `activeView` changes; the legend is (re)created only once a non-null `activeView` exists. The effect front-loads a destroy of any prior element so a view swap does not leave a dead legend bound to the old view.
- **Cleanup/teardown:** Web-component teardown via `.destroy()` + `removeChild()`, executed at the TOP of the effect on the next run. GAP: there is no effect-return cleanup, so the final legend is not destroyed on unmount - add `return () => legendRef.current?.destroy();` when lifting.
- **Critical gotchas:** Must `import 'arcgis-map-components'` for the custom element to upgrade. Set `.view` as a PROPERTY (not an attribute) - matches the React 19 property-binding pattern (repo memory: `use-web-components-19` supersedes ref-based binding). Always `.destroy()` the old element before creating a new one to avoid stale bindings/leaks.
- **Lift-into-repo:** Prefer the React 19 JSX property-binding form (`<arcgis-legend view={activeView?.view} />`) over manual `createElement` where possible; otherwise add an effect-return that destroys on unmount. Ensure `arcgis-map-components` is available in the build. Repo code-style: semicolons + `cond && fn();`.
- **See also:** `showextent`; repo web-component patterns; `arcgis-jsapi-integration.md`, and the `use-web-components-19` sdk sample.

---

### view-layers-toggle · Verified vs 1.20: yes
Teaches add/remove of a `FeatureLayer` on the consumed `view.map` from a config-driven dropdown - remove the OLD layer before adding a new one.

- **Source:** `view-layers-toggle/src/runtime/widget.tsx`, `.../src/config.ts`, `.../src/setting/setting.tsx`, `manifest.json`.
- **Manifest reqs:** `"dependency": ["jimu-arcgis"]` (ARRAY form here); `properties: {}`; `exbVersion 1.20.0`. Static import `FeatureLayer from 'esri/layers/FeatureLayer'`.
- **Config shape:**
  ```ts
  export interface Config { layerUrls: string[] }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void`
  - `JimuMapView.view.map` -> `__esri.Map` with `.add(layer)` / `.remove(layer)` (JSAPI)
  - `new FeatureLayer({ url })` (JSAPI, static `esri/*` import)
- **Runtime side (widget.tsx):**
  ```tsx
  selectChangeHandler = (evt) => {
    if (this.state.jimuMapView) {
      if (this.state.featureLayerOnMap) {                 // remove old first
        this.state.jimuMapView.view.map.remove(this.state.featureLayerOnMap);
        this.setState({ featureLayerOnMap: undefined });
      }
      if (evt.target.value && evt.target.value !== '') {
        const featureLayer = new FeatureLayer({ url: evt.target.value });
        this.state.jimuMapView.view.map.add(featureLayer);
        this.setState({ featureLayerOnMap: featureLayer });
      }
    } else {
      console.error('You probably need to choose you map in the settings panel.');
    }
  }
  // <JimuMapViewComponent ... onActiveViewChange={(jmv) => this.setState({ jimuMapView: jmv })} />
  ```
- **Lifecycle/timing:** The `JimuMapView` is stashed in state from `onActiveViewChange`; layers are only mutated on the dropdown `onChange`, so `view.map` is guaranteed present (guarded by `if (this.state.jimuMapView)`).
- **Cleanup/teardown:** Removes the previously-added layer via `view.map.remove(...)` before adding the next. It does NOT `.destroy()` the removed `FeatureLayer` (fine for swap; add `.destroy()` if you never reuse it) and does not remove the last layer on unmount - add that when lifting.
- **Critical gotchas:** MUST remove the old layer before adding a new one or you stack duplicates. Uses a native `<select>` (not jimu-ui `Select`) and a static `esri/*` import (works because manifest declares `jimu-arcgis`). Dropdown options come straight from `config.layerUrls`.
- **Lift-into-repo:** Track added layers and remove/`destroy()` them on unmount. Prefer jimu-ui `Select`/`Option` over native `<select>` for themed UI (repo memory). Manage layers via `JimuMapView` helpers when you need JimuLayerViews. Repo code-style: semicolons + `cond && fn();`.
- **See also:** `add-layers` (adds via lazy-loaded modules + zoom-to-extent), `showextent`; repo `src/widgets/map-notes` (live layer resolution), `arcgis-jsapi-integration.md`.

---

### add-layers · Verified vs 1.20: yes
Teaches LAZY-loading JSAPI modules with `loadArcGISJSAPIModules`, adding a `FeatureLayer` from user-entered URL, then optionally zooming to its extent via `layerview-create`.

- **Source:** `add-layers/src/runtime/widget.tsx`, `.../src/config.ts`, `.../src/setting/setting.tsx`, `manifest.json`.
- **Manifest reqs:** `exbVersion 1.20.0`; `properties: {}`. NOTE: manifest has NO `dependency` field, yet the code imports `jimu-arcgis` (`loadArcGISJSAPIModules`, `JimuMapViewComponent`). Add `"dependency": "jimu-arcgis"` on lift.
- **Config shape:**
  ```ts
  export interface Config { zoomToLayer: boolean }
  export type IMConfig = ImmutableObject<Config>
  ```
- **Key APIs (exact):**
  - `loadArcGISJSAPIModules(modules: string[]): Promise<any[]>` (returns modules as a tuple in the SAME order requested)
  - `onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void`
  - `JimuMapView.view.map.add(layer)` and `view.extent = results.extent` (JSAPI)
  - `layer.on('layerview-create', cb)` (JSAPI FeatureLayer event) (signature approx)
  - `layer.queryExtent(query): Promise<{ extent: __esri.Extent, count: number }>` (signature approx)
- **Runtime side (widget.tsx):**
  ```tsx
  loadArcGISJSAPIModules(['esri/layers/FeatureLayer', 'esri/geometry/SpatialReference']).then((modules) => {
    [this.FeatureLayer, this.SpatialReference] = modules;   // tuple in import order
    const layer = new this.FeatureLayer({ url: this.state.featureServiceUrlInput });
    this.state.jimuMapView.view.map.add(layer);
    layer.on('layerview-create', (event) => {
      if (this.props.config.hasOwnProperty('zoomToLayer') && this.props.config.zoomToLayer) {
        const query = layer.createQuery();
        query.where = '1=1';
        query.outSpatialReference = new this.SpatialReference({ wkid: 102100 });
        layer.queryExtent(query).then((results) => { this.state.jimuMapView.view.extent = results.extent; });
      }
      this.setState({ featureServiceUrlInput: '' });
    });
  });
  ```
- **Lifecycle/timing:** Modules load only when the user clicks "Add Layer" (lazy). The extent zoom waits for the layer's `layerview-create` event (the layer view must exist before its extent is meaningful). `formSubmit` guards `!this.state.jimuMapView` (map must be configured) and empty input first.
- **Cleanup/teardown:** None - added layers are never removed/`destroyed` and the `layerview-create` handle is not stored. When lifting, track layers + handles and clean up on unmount.
- **Critical gotchas:** `loadArcGISJSAPIModules([...])` resolves to an array whose elements are the modules IN THE ORDER REQUESTED - destructure carefully (`[FeatureLayer, SpatialReference]`). `wkid: 102100` (Web Mercator) is hard-coded for `outSpatialReference`. Manifest missing `dependency` is a bug. Uses `evt.preventDefault()` on the native form submit.
- **Lift-into-repo:** Add `"dependency": "jimu-arcgis"`. Prefer a static `import FeatureLayer from 'esri/layers/FeatureLayer'` (like `view-layers-toggle`) unless you genuinely need deferred loading; `loadArcGISJSAPIModules` is the right tool only for conditional/heavy modules. Track added layers for teardown. Use `JimuMapView`/`zoomToUtils` helpers for zoom-to where available. Repo code-style: semicolons + short-circuit.
- **See also:** `view-layers-toggle` (static-import layer add), `map-view`, `showextent`; repo `src/widgets/map-notes`, `arcgis-jsapi-integration.md`.
