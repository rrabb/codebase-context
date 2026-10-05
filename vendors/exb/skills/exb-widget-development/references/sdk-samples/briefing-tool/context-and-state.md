# briefing-tool - Own React Context + reducers for large shared widget state

> SDK sample: `ArcGISExperienceBuilder/sdk-resources/widgets/briefing-tool` (exbVersion **1.17.0**).
> Primary source: `src/runtime/context.tsx`. Supporting: `src/runtime/constants/types.ts`,
> `src/runtime/components/alerts/alerts.tsx`, `src/runtime/components/confirm/confirm.tsx`, `src/runtime/widget.tsx`.
> jimu/ExB signatures below verified against the gitignored `.d.ts` under `ArcGISExperienceBuilder/client/**`.
> Non-jimu APIs (JSAPI `__esri`, Calcite/Arcgis web components, `react-dom` `createPortal`) are marked **(approx)**.
> Snippets are trimmed from the real sample. Plain hyphens only.

## Problem: a widget grows to ~20 components sharing a lot of state -> prop-drilling explodes

`briefing-tool` is a multi-step wizard (a `CalciteFlow` with 8 panels: select-aoi, catalog, layer-list,
layer-edit, layer-add, layer-upload, layer-from-url, print) plus global alerts, a confirm dialog, and a
portaled layout-manager. Almost every panel needs the same handful of things: the active `mapView`, the
current `panel` (and how to change it), the selected AOI, the print config, and the ability to raise an
alert or ask the user to confirm.

Passing all of that down through props (prop-drilling) would mean threading 15+ props through every panel
and its children. The sample instead defines its **own widget-scoped React Context** plus two `useReducer`
stores, and exposes a single accessor hook. Every child imports that one hook and destructures exactly what
it needs:

```tsx
const { mapView, setPanel, confirm } = useWidgetContext();
```

This is intra-widget state management - it is NOT jimu Redux and NOT persisted. See the decision table at
the end for when to use Context vs jimu `widgetState` / `MutableStoreManager`.

## The context type (`IWidgetContext`)

`IWidgetContext` is the shape of everything the provider hands to children. Note how much one widget
accumulates: identity/config, portal auth, the map view, AOI geometry, UI navigation (panel history),
the editing layer, plus a very large `printConfig` object.

| Bucket | Type | Purpose |
| --- | --- | --- |
| `user` | `IMUser` (jimu-core) | Current signed-in user (immutable/`IM` wrapped). |
| `config` | `IMConfig` | Widget config (immutable). |
| `widgetId` | `string` | This widget's id. |
| `folderUrl` | `string` | Widget asset base URL. `context.folderUrl` per jimu `WidgetContext`. Used for web-component asset paths. |
| `portal` / `portalUrl` | `Portal \| null` / `string` | Loaded JSAPI `Portal` and its URL (auth). |
| `alerts` | `Alert[]` | Global toast list (reducer-backed). |
| `dispatchAlert` | `React.Dispatch<Alert>` | Add (no id) or remove (with id) an alert. |
| `confirm` | `(data: ConfirmDialog) => Promise<boolean>` | Promise-based confirm dialog. |
| `confirmDialog` | `ConfirmDialog \| null` | Data for the currently open confirm dialog. |
| `confirmRef` | `React.MutableRefObject<((choice: boolean) => void) \| undefined>` | Resolver the `<Confirm/>` buttons call. |
| `mapView` | `__esri.MapView \| null` | Active JSAPI map view (bridged in the provider). |
| `panel` / `previousPanel` | `Panel` | Current + previous wizard step (for back navigation). |
| `setPanel` | `(panel: Panel) => void` | Navigate the wizard. |
| `aoi` / `setAoi` | `string` | Selected area-of-interest id. |
| `aoiExtent` / `setAoiExtent` | `Extent` | AOI extent geometry (JSAPI `Extent`). |
| `editingLayer` / `setEditingLayer` | `__esri.Layer \| null` | Layer currently being edited. |
| `printConfig` | large object (30+ legend fields) | All print/legend layout state. |
| `setPrintConfig` | value OR functional updater | Partial-merge setter (see reducer 2). |

```tsx
// TYPES (constants/types.ts)
export interface Alert {
  message?: string;
  title?: string;
  type: "success" | "info" | "warning" | "error";
  persist?: boolean;
  id?: string; // assigned by alertsReducer via uniqueId()
}

export interface ConfirmDialog {
  title: string;
  message: string;
  type?: "danger" | "brand";
  confirmText?: string;
  cancelText?: string;
}

export enum Panel {
  SELECT_AOI = "select-aoi",
  CATALOG = "catalog",
  LAYER_LIST = "layer-list",
  LAYER_EDIT = "layer-edit",
  LAYER_UPLOAD = "layer-upload",
  LAYER_ADD = "layer-add",
  LAYER_FROM_URL = "layer-from-url",
  PRINT = "print",
}
```

```tsx
// context.tsx - the context type (trimmed; printConfig shown in full under reducer 2)
export type IWidgetContext = {
  user: IMUser;
  config: IMConfig;
  widgetId: string;
  folderUrl: string; // @see jimu-core WidgetContext.folderUrl
  portal: Portal | null;
  portalUrl: string;
  alerts: Alert[];
  dispatchAlert: React.Dispatch<Alert>;
  confirm: (data: ConfirmDialog) => Promise<boolean>;
  confirmDialog: ConfirmDialog | null;
  confirmRef: React.MutableRefObject<((choice: boolean) => void) | undefined>;
  mapView: __esri.MapView | null;
  panel: Panel;
  previousPanel: Panel;
  setPanel: (panel: Panel) => void;
  aoi: string;
  setAoi: (aoi: string) => void;
  aoiExtent: Extent;
  setAoiExtent: (aoiExtent: Extent) => void;
  editingLayer: __esri.Layer | null;
  setEditingLayer: (layer: __esri.Layer | null) => void;
  printConfig: { /* 30+ fields, see below */ };
  setPrintConfig: (config: IPrintConfig | ISetPrintConfig) => void;
};
```

## Provider composition (`useReducer` x2 + `useState` xN -> `value`)

`WidgetContextProvider` takes the spread widget props (`{...props}` from `widget.tsx`), builds all the
buckets with hooks, assembles a single `value` object, and renders `WidgetContext.Provider` wrapping the
children. Two reducers (alerts, printConfig) plus many `useState` calls.

```tsx
interface Props extends AllWidgetProps<IMConfig> {
  children: React.ReactNode;
}

export const WidgetContextProvider = ({
  user, config, context, children, portalUrl, useMapWidgetIds, widgetId,
}: Props) => {
  // Global alerts (reducer)
  const [alerts, dispatchAlert] = useReducer(alertsReducer, []);

  // Global confirm dialog
  const confirmRef = useRef<(choice: boolean) => void>(undefined);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  // Portal / map / UI state (useState)
  const [portal, setPortal] = useState<Portal | null>(null);
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [panel, setPanel] = useState<Panel>(Panel["SELECT_AOI"]);
  const [previousPanel, setPreviousPanel] = useState<Panel>(Panel["SELECT_AOI"]);
  const [currentPanel, setCurrentPanel] = useState<Panel>(Panel["SELECT_AOI"]);
  const [aoi, setAoi] = useState<string>("");
  const [aoiExtent, setAoiExtent] = useState<Extent | null>(null);
  const [editingLayer, setEditingLayer] = useState<__esri.Layer | null>(null);

  // Print settings (reducer + functional-updater wrapper)
  const [printConfig, dispatchPrintConfig] = useReducer(printConfigReducer, initialPrintConfig);
  const setPrintConfig = (config: IPrintConfig | ISetPrintConfig) => {
    if (typeof config === "function") {
      dispatchPrintConfig(config(printConfig));
    } else {
      dispatchPrintConfig(config);
    }
  };

  // ... confirm(), handleMapViewReady(), effects (below) ...

  // Assemble the single value object
  const value: IWidgetContext = {
    user, config, folderUrl: context?.folderUrl, portal, portalUrl, widgetId,
    alerts, dispatchAlert, confirm, confirmDialog, confirmRef,
    mapView, panel, previousPanel, setPanel,
    aoi, setAoi, aoiExtent, setAoiExtent, editingLayer, setEditingLayer,
    printConfig, setPrintConfig,
  };

  return (
    <WidgetContext.Provider value={value}>
      <>
        {useMapWidgetIds && useMapWidgetIds.length === 1 && (
          <JimuMapViewComponent
            useMapWidgetId={useMapWidgetIds[0]}
            onActiveViewChange={(jmv) => handleMapViewReady(jmv.view as __esri.MapView)}
          />
        )}
        {children}
      </>
    </WidgetContext.Provider>
  );
};
```

Key point: the **`JimuMapViewComponent` map bridge lives HERE, in the context provider, not in
`widget.tsx`**. That means the map view is wired into shared state at the same place it is stored, so every
panel reads `mapView` from context instead of receiving it as a prop.

`widget.tsx` simply spreads all widget props into the provider and drops the global overlays + panels as
children:

```tsx
// widget.tsx (trimmed)
return (
  <WidgetContextProvider {...props}>
    <Alerts />
    <Confirm />
    {layoutManagerEl && createPortal(<LayoutManager />, layoutManagerEl)}
    <CalciteFlow id="briefing-tool-flow" className="e-flow calcite-mode-light">
      <SelectAOI /><Catalog /><LayerList /><LayerEdit />
      <LayerAdd /><LayerUpload /><LayerFromUrl /><Print />
    </CalciteFlow>
  </WidgetContextProvider>
);
```

`{...props}` works because `AllWidgetProps<IMConfig>` already carries `user`, `config`, `context`,
`portalUrl`, `useMapWidgetIds`, and `id`/`widgetId` - the provider just destructures what it needs.

## The single accessor: `useWidgetContext()`

One tiny hook is the only import every child needs. Contrast with prop-drilling, where each of these values
would have to be declared and forwarded through every intermediate component.

```tsx
export const useWidgetContext = (): IWidgetContext => {
  return useContext(WidgetContext);
};
```

Usage in any panel or subcomponent:

```tsx
const { mapView, setPanel, confirm, printConfig, setPrintConfig, dispatchAlert } = useWidgetContext();
```

Note the default value is `null` (`createContext<IWidgetContext | null>(null)`) but the hook's return type
is the non-null `IWidgetContext`. The sample relies on always being rendered inside the provider; see
Gotchas for hardening this.

## Reducer 1: global alerts (add / remove-by-id)

A single reducer both adds and removes. The convention: dispatch an alert **without** an `id` to add it
(the reducer stamps a `uniqueId()`); dispatch an alert **with** an `id` to remove that one. The global
`<Alerts/>` component renders the current list as Calcite toasts and removes on close.

```tsx
import { uniqueId } from "lodash";

const alertsReducer = (alerts: Alert[], alert: Alert): Alert[] => {
  if (!alert) return [...alerts];
  if (alert.id) {
    return alerts.filter((a) => a.id !== alert.id); // remove
  } else {
    return [...alerts, { ...alert, id: uniqueId() }]; // add
  }
};
```

```tsx
// components/alerts/alerts.tsx (trimmed) - portaled toast list
const Alerts = () => {
  const { alerts, dispatchAlert } = useWidgetContext();
  return createPortal( // react-dom (approx)
    <>
      {alerts.map((alert) => (
        <CalciteAlert
          open
          key={alert.id}
          kind={alert.type === "error" ? "danger" : alert.type}
          onCalciteAlertClose={() => dispatchAlert(alert)} // has id -> removes
        >
          {alert.title && <div slot="title">{alert.title}</div>}
          <div slot="message">{alert.message}</div>
        </CalciteAlert>
      ))}
    </>,
    document.body
  );
};
```

Raise an alert from anywhere:

```tsx
const { dispatchAlert } = useWidgetContext();
dispatchAlert({ type: "success", message: "Layer added" }); // no id -> add
```

## Reducer 2: `printConfig` + functional `setPrintConfig` updater

`printConfig` is a huge object (30+ legend/layout fields). The reducer is a shallow merge:

```tsx
const printConfigReducer = (state: IPrintConfig, action: Partial<IPrintConfig>): IPrintConfig => {
  return { ...state, ...action };
};
```

```tsx
// initialPrintConfig excerpt (30+ fields; legend layout dominates)
export const initialPrintConfig: IPrintConfig = {
  aspectRatio: "4x6",
  activeItemScaleBar: "Bottom left",
  activeItemLegend: "Top left",
  scaleBarActive: true,
  compassActive: true,
  compassStyle: "compass",
  mapInsetActive: true,
  legendActive: true,
  selectedLegendItems: [],
  legendColumnCount: 1,
  legendTextSize: 10,
  legendSymbolSize: 1,
  legendConsolidateSymbols: false,
  legendHiddenSymbols: {},
  legendTitle: "",
  legendTitleBold: true,
  legendTitleFontSize: 16,
  legendMaxWidth: 0,
  legendMaxHeight: 0,
  legendLayerTextSize: {},
  legendSymbolNames: {},
  legendBorderWidth: 0,
  legendBorderColor: "#000000",
  // ... ~30 fields total ...
};
```

The setter wraps `dispatch` so callers can pass **either a value OR a `(prev) => next` function**, exactly
like React's `setState` functional form:

```tsx
type ISetPrintConfig = (config: IPrintConfig) => IPrintConfig;

const setPrintConfig = (config: IPrintConfig | ISetPrintConfig) => {
  if (typeof config === "function") {
    dispatchPrintConfig(config(printConfig)); // compute next from current
  } else {
    dispatchPrintConfig(config); // shallow-merged by the reducer
  }
};
```

**Why the functional form matters:** because the reducer shallow-merges, a plain object call only touches
the keys you pass - but if a panel needs to derive the next value from the current one (e.g. toggle a flag,
append to an array, or edit one nested legend map), the functional form gives it `prev` without a stale
closure and without clobbering the other 30 fields:

```tsx
// partial merge, other fields untouched
setPrintConfig({ legendActive: false });

// derive from current without clobbering
setPrintConfig((prev) => ({
  ...prev,
  selectedLegendItems: [...prev.selectedLegendItems, layerId],
}));
```

Caveat: the sample's `setPrintConfig` reads `printConfig` from the closure (`config(printConfig)`), not the
reducer's own `prev`. With React 18 batching this is usually fine, but a truly safe implementation would push
the branch into the reducer (dispatch the function itself). See Lift-into-repo.

## Promise-based `confirm()` dialog

Instead of a callback-based dialog, `confirm(data)` returns a `Promise<boolean>`. It stores the promise's
`resolve` in `confirmRef.current` and shows the dialog; the global `<Confirm/>` component's buttons call the
resolver, which resolves the promise and closes the dialog.

```tsx
const confirm = useCallback(
  (data: ConfirmDialog): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog(data); // opens the dialog
      confirmRef.current = (choice: boolean) => {
        resolve(choice);       // resolves the awaited promise
        setConfirmDialog(null); // closes the dialog
      };
    });
  },
  [setConfirmDialog]
);
```

```tsx
// components/confirm/confirm.tsx (trimmed) - the buttons resolve the promise
const Confirm = () => {
  const { confirmDialog, confirmRef } = useWidgetContext();

  const handleConfirm = (bool: boolean) => {
    if (!confirmRef.current) return;
    confirmRef.current(bool);
  };

  if (!confirmDialog) return null;
  const { confirmText, cancelText, title, message, type } = confirmDialog;

  return createPortal( // react-dom (approx)
    <CalciteDialog
      open modal
      heading={title || "Confirm"}
      onCalciteDialogClose={() => handleConfirm(false)}
    >
      <p>{message}</p>
      <CalciteButton slot="footer-end" onClick={() => handleConfirm(false)}>
        {cancelText || "Cancel"}
      </CalciteButton>
      <CalciteButton slot="footer-end" onClick={() => handleConfirm(true)}>
        {confirmText || "Confirm"}
      </CalciteButton>
    </CalciteDialog>,
    document.body
  );
};
```

Caller reads like synchronous code - the big win of the promise pattern:

```tsx
const { confirm } = useWidgetContext();

const onDelete = async () => {
  if (await confirm({ title: "Delete layer", message: "Are you sure?", type: "danger" })) {
    // user pressed Confirm
    deleteLayer();
  }
  // else: user cancelled or closed - nothing happens
};
```

## Map bridge inside context (`JimuMapViewComponent` + `handleMapViewReady`)

The provider renders `JimuMapViewComponent` (only when exactly one map widget is bound) and on active-view
change stores the underlying JSAPI `view` into `mapView` state, so every panel reads it from context.

Verified jimu signature (`jimu-arcgis/lib/components/jimu-map-view-component.d.ts`):
`onActiveViewChange?: (activeView: JimuMapView, previousActiveViewId: string) => void`. The sample names the
first arg `jmv` and passes `jmv.view`.

```tsx
{useMapWidgetIds && useMapWidgetIds.length === 1 && (
  <JimuMapViewComponent
    useMapWidgetId={useMapWidgetIds[0]}
    onActiveViewChange={(jmv) => handleMapViewReady(jmv.view as __esri.MapView)}
  />
)}
```

```tsx
const handleMapViewReady = (view: __esri.MapView) => {
  if (view) {
    setMapView(view);

    // Dock popups bottom-left (approx: __esri.MapView.popup.dockOptions)
    view.popup.dockOptions = { position: "bottom-left" };

    // Reserve left space for the wizard panel, responsive to window width
    const handleResize = () => {
      const paddingLeft = Math.max(340, window.innerWidth * 0.25) + 32;
      view.padding.left = paddingLeft;
    };
    window.addEventListener("resize", handleResize); // LEAK: never removed (see Gotchas)
    handleResize(); // initial call

    view.goTo(view.extent);
  }
};
```

## Portal auth

On mount (and when `portalUrl` changes) the provider creates a JSAPI `Portal` in `no-prompt` auth mode,
loads it, and stores it. `no-prompt` means it uses the app's existing session and will not pop a sign-in
dialog.

```tsx
useEffect(() => {
  (async () => {
    const portal = new Portal({ url: portalUrl, authMode: "no-prompt" }); // @arcgis/core (approx)
    await portal.load();
    setPortal(portal);
  })();
}, [portalUrl]);
```

## Gotchas

- **Resize-listener leak.** `handleMapViewReady` calls `window.addEventListener("resize", handleResize)` but
  never removes it. Each new active-view fires this again, stacking listeners that capture stale `view`
  references. Correct fix - move it into an effect keyed on `mapView` and return a cleanup:

  ```tsx
  useEffect(() => {
    if (!mapView) return;
    const handleResize = () => {
      mapView.padding.left = Math.max(340, window.innerWidth * 0.25) + 32;
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [mapView]);
  ```

- **Context `value` recreated every render.** `value` is a fresh object literal each render, so every consumer
  re-renders on any state change. For a big multi-panel widget consider `useMemo` on `value` and `useCallback`
  on the setters to cut re-renders. (The sample does neither.)

- **`Context<null>` default + non-null return.** `createContext<IWidgetContext | null>(null)` but
  `useWidgetContext()` is typed to return non-null `IWidgetContext`. If a component ever renders outside the
  provider it silently gets `null` and crashes on first destructure. Harden with a guard:

  ```tsx
  export const useWidgetContext = (): IWidgetContext => {
    const ctx = useContext(WidgetContext);
    if (!ctx) throw new Error("useWidgetContext must be used within WidgetContextProvider");
    return ctx;
  };
  ```

- **`setPrintConfig` closes over `printConfig`.** The functional branch computes `config(printConfig)` from the
  render closure rather than the reducer's `prev`. Prefer dispatching the updater into the reducer so React
  always feeds the latest state (see Lift-into-repo).

## When to reach for this vs jimu Redux / mapExtraStateProps vs MutableStoreManager

Use a **widget-scoped React Context + reducers** (this pattern) for intra-widget, ephemeral UI/session state:
wizard step, selected AOI, in-flight print config, transient alerts and confirm dialogs - state that only this
widget's own subtree cares about and that does not need to survive a reload or be read by other widgets. Use
**jimu Redux `widgetState` / `mapExtraStateProps`** when other widgets or the app must observe the state, or
when it should participate in the ExB store, and **`MutableStoreManager` / persisted widget config** when the
state must survive reloads or be saved with the app. Rule of thumb: Context = intra-widget ephemeral;
Redux/`widgetState` = cross-widget/persistent.

## Lift-into-repo

- Apply repo code-style: always semicolons, `&&` short-circuit guards for conditional calls, if-bodies on
  their own line, plain hyphens (no em/en dashes) in comments and text.
- **Fix the resize-listener leak** (effect + cleanup keyed on `mapView`, as above) before reusing.
- Consider `useMemo` on the context `value` and `useCallback` on `setPanel`/`setAoi`/`setPrintConfig`/etc. to
  avoid re-rendering every consumer on every state change.
- Push the value-or-updater branch **into** the `printConfig` reducer so it uses the reducer's `prev` instead
  of the closure, then `setPrintConfig` becomes a thin `dispatch`.
- Add the non-null guard to `useWidgetContext()`.
- This is a **1.17.0** sample. Re-validate imports/signatures against 1.20 before lifting -
  `JimuMapViewComponent.onActiveViewChange(activeView, previousActiveViewId)` and `WidgetContext.folderUrl`
  are unchanged in 1.20 `.d.ts`; Calcite/Arcgis web-component and `@arcgis/core` (`Portal`, `MapView`,
  `Extent`) APIs are not jimu-typed and must be checked against the SDK version you target.

## See also

- `../../09-demos-complex.md` - briefing-tool category card.
- `./` (this folder) - other briefing-tool deep dives (asset paths, internal web components).
