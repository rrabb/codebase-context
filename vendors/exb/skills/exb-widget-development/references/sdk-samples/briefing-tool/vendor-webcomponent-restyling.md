# briefing-tool - Restyling vendor / OTB web components (MutationObserver + shadow-DOM piercing)

> Source: ExB SDK sample `briefing-tool` (exbVersion **1.17.0**).
> Primary file: `ArcGISExperienceBuilder/sdk-resources/widgets/briefing-tool/src/runtime/components/layer-edit/layer-edit.tsx`
> CSS: `.../layer-edit/layer-edit.css`
>
> The web components below (`arcgis-smart-mapping`, `arcgis-map-config-label`,
> `arcgis-map-config-symbol-styler`, `arcgis-smart-mapping-panels-gallery`, and their
> Calcite popovers) are **Esri OTB / vendor Stencil + Calcite components**. They are NOT
> jimu. Their internal DOM structure, part names, and class names are **undocumented and
> version-fragile**. Everything here is based on *observed* selectors for the versions the
> sample shipped with, not on any published vendor contract. Do not treat the selectors as
> stable APIs.

---

## When to use this pattern

Use this when **all** of these are true:

- You render a vendor / OTB web component you do NOT control (an Esri map-config or
  smart-mapping component, or any third-party Calcite-based custom element).
- You must change its look and feel - hide its header/footer, resize a popover, remove
  double scrollbars - and the component gives you **no prop / attribute / config** to do it.
- The parts you need to touch live inside **open shadow roots** (or in popovers that the
  component appends to `document.body` outside your React subtree), so ordinary
  light-DOM CSS and `className` cannot reach them.

If the vendor exposes a prop, a `config` object, or a `::part()` you can target from CSS,
prefer that (see [CSS vs JS](#css-vs-js-what-layer-editcss-restyles-vs-what-needs-shadow-piercing)).
Reach for MutationObserver + shadow piercing **only** for the parts nothing else can reach.

---

## The general recipe (tool-agnostic)

1. **Render** the vendor component in JSX and keep a `ref` to it (`useRef`).
2. **Wait for it** to finish building its internal DOM. The vendor renders asynchronously
   (Stencil hydration + an internal `calcite-flow`), so the nodes you want do not exist on
   the first tick. Wait via one of: the vendor's own load event (`arcgisLoaded`), a
   short `setTimeout`, a **retry/poll** loop, or a `MutationObserver`.
3. **Query + pierce** open shadow roots hop by hop: `el.shadowRoot?.querySelector(...)`,
   repeating for each nested custom element. Guard every hop with `?.`.
4. **Hide / adjust** the header, footer, or popover panel by setting inline styles on the
   pierced element (`el.style.display = "none"`, `el.style.maxHeight = ...`), or by setting
   a CSS custom property on the host (`el.style.setProperty("--x", "...")`).
5. **Re-apply on re-render**: the vendor re-renders on interaction and can re-append
   popovers to `body`. Use a **persisted** `MutationObserver` (stored in a ref) that watches
   for the popover node to reappear and restyles it again.
6. **Clean up**: on unmount / editor toggle, `disconnect()` every observer, `removeEventListener`
   every listener (using the *same* element + handler reference you added them with), clear
   `setTimeout`s, and `remove()` the vendor elements you own.

---

## Setup: refs, ids, and the `$dqs` helper

```tsx
// Shorthand for document.querySelector / querySelectorAll, bound once per render.
const $dqs = document.querySelector.bind(document);
const $dqsAll = document.querySelectorAll.bind(document);

// One ref per vendor element so we can talk to the *instance* React rendered,
// not whatever a global selector happens to find.
const agsMapConfigLabel = useRef<ArcgisMapConfigLabel>(null);
const agsSmartMapping = useRef<ArcgisSmartMapping>(null);
const agsSymbolPicker = useRef<ArcgisMapConfigSymbolPicker>(null);
const agsSymbolStyler = useRef<ArcgisMapConfigSymbolStyler>(null);

// Persist the MutationObserver across renders so we do not create a new one each time.
const mutObsRef = useRef<MutationObserver | null>(null);

// Stable, widget-scoped ids so global selectors ("#..._agssm") do not collide with
// other widget instances on the same page.
const agssmId = useMemo(() => widgetId + "_agssm", [widgetId]);
const agsmclId = useMemo(() => widgetId + "_agsmcl", [widgetId]);
```

Note the two ways the code reaches the smart-mapping host: the `agsSmartMapping` **ref**
(preferred) and a global fallback `$dqs("#" + agssmId) || $dqs("arcgis-smart-mapping")`.
The `#id` lookup is scoped; the bare tag lookup is a last resort because it grabs the first
match anywhere in `document`.

There is **no `requestAnimationFrame`** in this file. All timing is done with the vendor's
`arcgisLoaded` event plus `setTimeout` (single-shot and polling). Do not assume rAF.

---

## Worked example: symbol styler popover (`adjustSMPopover`)

When the user clicks "edit symbols" inside `arcgis-smart-mapping`, the vendor opens a
Calcite popover (`arcgis-smart-mapping-styler-popover`). It opens with the wrong height and
double scrollbars. `adjustSMPopover` waits for it (poll: every 400 ms, up to 10 tries = 4 s
max) then pierces four shadow hops to fix sizing.

```tsx
/**
 * Listen to when user clicks on edit symbols and then wait for popup to open and then
 * adjust UI styling. Wait 400ms and try 10x for a max wait of 4s.
 */
const adjustSMPopover = (() => {
  let attempts = 0;
  const delay = 400;
  // Closure persists the attempt count across retries.
  const fn = () => {
    const el1 = $dqs("arcgis-smart-mapping-styler-popover");

    const el2 = el1?.shadowRoot?.querySelector(
      "calcite-popover.smart-mapping-styler-popover.styler-popover > calcite-panel"
    ) as HTMLElement;
    // step 1: set height of the calcite-panel
    el2 && (el2.style.height = "500px");

    // not ready yet -> retry until we hit el1 AND el2 or run out of attempts
    if (!el1 || !el2) {
      if (attempts < 10) {
        attempts++;
        setTimeout(fn, delay);
      }
      return;
    }
    attempts = 0; // reset for next use

    // step 2: set a CSS var on the vendor host to avoid double scrollbars
    el1.style.setProperty("--symbol-scroller-max-height", "100%");

    // step 3: cap the symbol styler height
    const el3 = el2.querySelector("arcgis-map-config-symbol-styler") as HTMLElement;
    el3 && (el3.style.maxHeight = "445px");

    // step 4: cap the inner scroller (may be redundant after step 2)
    const el4 = el3?.shadowRoot?.querySelector(
      "calcite-flow > calcite-flow-item.symbol-selection-panel > arcgis-map-config-symbol-picker div.scroller.marker-selection.sc-arcgis-map-config-symbol-picker"
    ) as HTMLElement;
    el4 && (el4.style.maxHeight = "100%");
    // ...
  };
  return fn;
})();
```

### Hop-by-hop

| Hop | From | Cross a shadow root? | To | Why |
| --- | --- | --- | --- | --- |
| el1 | `document` | no (light DOM / body) | `arcgis-smart-mapping-styler-popover` (host) | vendor appends the popover host near body; grab the host first |
| el2 | `el1.shadowRoot` | **yes** | `calcite-popover.smart-mapping-styler-popover.styler-popover > calcite-panel` | the panel that owns the popover height lives inside the host's shadow root |
| host var | `el1` (host) | no (styles the host) | `--symbol-scroller-max-height` | vendor exposes a CSS custom property that its internals consume - cheapest fix, no deeper piercing |
| el3 | `el2` (light child of panel) | no | `arcgis-map-config-symbol-styler` | this nested custom element sets the styler height |
| el4 | `el3.shadowRoot` | **yes** | `calcite-flow > calcite-flow-item.symbol-selection-panel > arcgis-map-config-symbol-picker div.scroller...` | the actual scroll container, two more custom elements deep |

Why each `shadowRoot?.querySelector` hop is required: these are **open** shadow roots.
`document.querySelector` and CSS selectors stop at a shadow boundary; they cannot descend
into `el.shadowRoot`. So each time the target is inside another custom element's shadow
root you must explicitly step through `.shadowRoot` before querying again. Every hop is
guarded (`el1?.shadowRoot?.querySelector`, `el3?.shadowRoot?.querySelector`, and
`el && (el.style... )`) because any hop can be `null` while the vendor is still hydrating or
if a future version renames a class.

---

## Worked example: label config style popover (`adjustLabelConfigStylePopover` + persisted mutObs)

The label editor's "style" popover (`ARCGIS-MAP-CONFIG-LABEL-CONTENT-STYLE`) is appended
directly to `document.body`, outside the React subtree, whenever the user opens it - and it
comes and goes repeatedly. A single `setTimeout` cannot catch it reliably, so this uses a
`MutationObserver` **persisted in `mutObsRef`** that watches `body` for the node being added.

```tsx
/**
 * Watch for the 'label styler' popover web component added directly to body and adjust height.
 */
const adjustLabelConfigStylePopover = () => {
  if (!mutObsRef.current) {
    mutObsRef.current = new MutationObserver((mutationRecords) => {
      // find the newly-added popover node by tag name
      function findPO(tagNm: string): HTMLElement | null {
        for (const mr of mutationRecords) {
          if (mr.type === "childList" && mr?.addedNodes?.length > 0) {
            const po = Array.from(mr.addedNodes).find(
              (n: HTMLElement) => n?.tagName?.toUpperCase() === tagNm
            );
            if (po && po instanceof HTMLElement) {
              return po as HTMLElement;
            }
          }
        }
        return null;
      }
      const popover = findPO("ARCGIS-MAP-CONFIG-LABEL-CONTENT-STYLE");
      if (popover) {
        // wait until it has finished adding to DOM, then pierce its shadow root
        setTimeout(() => {
          const pnl = popover.shadowRoot?.querySelector(
            "calcite-popover calcite-panel.panel"
          ) as HTMLElement;
          pnl.style.maxHeight = "calc( 100vh - 200px )";
        }, 400);
      }
    });
  }
  // observe only direct children of body (subtree:false is enough - the popover is a
  // direct child of body), and only childList mutations.
  mutObsRef.current.observe(document.body, {
    childList: true,
    subtree: false,
    attributes: false,
  });
};
```

Key points:

- `mutObsRef` **persists across renders** - the observer is created once (guarded by
  `if (!mutObsRef.current)`) and re-`observe()`d when the label editor opens. It is
  `disconnect()`ed when the editor closes and on unmount.
- The observer only detects the node's *insertion*. The actual restyle waits a further
  `setTimeout(..., 400)` because the vendor keeps building the popover's shadow content
  after the host node is attached.
- `subtree: false` keeps the observer cheap - the popover lands as a **direct** child of
  `body`, so there is no need to watch the whole tree.

---

## Hiding chrome: `hideHeader` / `hideFooter`

The smart-mapping gallery (`arcgis-smart-mapping-panels-gallery`) renders a Calcite panel
with a header and footer the widget does not want. There is no prop to hide them, so both
functions pierce **three** shadow roots to reach the `<header>` / `<footer>` and set
`display: none`.

```tsx
const hideHeader = function (elOrId: HTMLElement | string) {
  if (!elOrId) return;
  const agssm =
    elOrId instanceof HTMLElement ? elOrId : document.getElementById(elOrId);
  const elsmpg = agssm?.querySelector("arcgis-smart-mapping-panels-gallery");
  if (elsmpg) {
    elsmpg.selected = true; // force the gallery to render its selected flow-item first
    const el = elsmpg.shadowRoot
      ?.querySelector("calcite-flow-item.flow-item")
      ?.shadowRoot?.querySelector("calcite-panel")
      ?.shadowRoot?.querySelector("header.header") as HTMLElement;
    el && (el.style.display = "none");
  }
};

const hideFooter = function (elOrId: HTMLElement | string) {
  if (!elOrId) return;
  const agssm =
    elOrId instanceof HTMLElement ? elOrId : document.getElementById(elOrId);
  const elsmpg = agssm?.querySelector("arcgis-smart-mapping-panels-gallery");
  if (elsmpg) {
    const el = elsmpg.shadowRoot
      ?.querySelector("calcite-flow-item.flow-item")
      ?.shadowRoot?.querySelector("calcite-panel")
      ?.shadowRoot?.querySelector("footer.footer") as HTMLElement;
    el && (el.style.display = "none");
  }
};
```

Both accept **either** an `HTMLElement` or an element id (so callers can pass the vendor's
`arcgisLoaded` event target *or* the widget-scoped `agssmId`). The chained
`?.shadowRoot?.querySelector(...)?.shadowRoot?.querySelector(...)` is the whole pattern:
gallery shadow -> `calcite-flow-item` shadow -> `calcite-panel` shadow -> the `header`/`footer`.
`elsmpg.selected = true` in `hideHeader` nudges the gallery to actually render the selected
flow-item so the header exists to be hidden.

---

## Event wiring + lifecycle: `handleSmartMappingClick` and effect cleanup

The styler popover only opens *after* a user click inside smart-mapping, so the widget
listens for clicks on the host and (re)runs `adjustSMPopover` each time.

```tsx
// Defined with useCallback so the reference is STABLE - required so the exact same
// function identity is passed to both addEventListener and removeEventListener.
const handleSmartMappingClick = useCallback(() => {
  adjustSMPopover();
}, []);

useEffect(() => {
  let timeoutId: number;
  // Keep the element we bound to, so cleanup removes the listener from the SAME node.
  let asm: HTMLElement | null = null;

  if (isShowSymbolEditor) {
    timeoutId = window.setTimeout(() => {
      hideHeader(agssmId);
      hideFooter(agssmId);

      asm = $dqs("#" + agssmId) || $dqs("arcgis-smart-mapping");
      asm && asm.addEventListener("click", handleSmartMappingClick);
    }, 500); // give smart-mapping time to hydrate before we touch/bind it
  } else {
    // editor hidden: remove the listener immediately
    asm = $dqs("#" + agssmId) || $dqs("arcgis-smart-mapping");
    asm && asm.removeEventListener("click", handleSmartMappingClick);
  }

  if (isShowLabelEditor) {
    adjustLabelConfigStylePopover();
  } else {
    mutObsRef.current?.disconnect();
  }

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // Prefer the stored node; fall back to a fresh lookup if the effect never bound.
    const targetAsm = asm || $dqs("#" + agssmId) || $dqs("arcgis-smart-mapping");
    targetAsm?.removeEventListener("click", handleSmartMappingClick);
    mutObsRef.current?.disconnect();
  };
}, [isShowLabelEditor, isShowSymbolEditor, agssmId, handleSmartMappingClick]);
```

Lifecycle notes:

- **Dependency array** `[isShowLabelEditor, isShowSymbolEditor, agssmId, handleSmartMappingClick]`:
  the effect re-runs whenever either editor toggles, the scoped id changes, or the handler
  identity changes (it will not, thanks to `useCallback`, but listing it satisfies the deps
  lint and keeps add/remove balanced).
- **Stable handler reference** is the crux: `removeEventListener` only works if you pass the
  *same* function you added. `useCallback([])` guarantees that.
- **Same-node add/remove**: `asm` is captured so the cleanup removes the listener from the
  exact element it was added to, not a possibly different `querySelector` result.
- **`setTimeout(500)` gate**: smart-mapping is not hydrated the instant `isShowSymbolEditor`
  flips true, so binding/hiding is delayed ~500 ms; the timeout id is cleared in cleanup.

The mount effect also does teardown of the elements the widget owns:

```tsx
return () => {
  mutObsRef.current?.disconnect();

  if (agsMapConfigLabel.current) {
    agsMapConfigLabel.current.remove();
    agsMapConfigLabel.current = null;
  }
  if (agsSmartMapping.current) {
    agsSmartMapping.current.remove();
    agsSmartMapping.current = null;
  }
  const asm = $dqs("#" + agssmId) || $dqs("arcgis-smart-mapping");
  asm && asm.removeEventListener("click", handleSmartMappingClick);
};
```

---

## Timing tactics used (summary)

The vendor renders its own internal `calcite-flow` asynchronously, so nothing you want
exists synchronously. The sample uses four complementary tactics - **no rAF**:

- **Vendor load event**: `agsSM.addEventListener("arcgisLoaded", ...)` -> then
  `hideHeader(e.target)` / `hideFooter(e.target)`. The most reliable signal when it exists.
- **Single-shot `setTimeout`**: `setTimeout(500)` before hiding chrome / binding the click
  listener; `setTimeout(400)` before restyling a just-inserted popover.
- **Poll / retry**: `adjustSMPopover` retries every 400 ms up to 10 times (4 s ceiling)
  until both the popover host and its inner panel exist.
- **`MutationObserver`**: for body-appended popovers that appear/disappear repeatedly.
- **The `selected = true` trick**: `arcgis-smart-mapping-panels-gallery.selected = true`
  (and once via `setTimeout(..., 1500)` as an explicit "workaround for a bug") forces the
  gallery to actually render its selected flow-item, so the header/footer/panel nodes exist
  to be pierced.

---

## CSS vs JS: what `layer-edit.css` restyles vs what needs shadow piercing

Prefer CSS. `layer-edit.css` reaches everything it can from **light DOM** by targeting the
custom-element tags directly (a host element is still a normal element in light DOM, even
though its *internals* are shadowed):

```css
/* light-DOM: style the host element and its light-DOM children - no piercing needed */
.e-layer-edit calcite-combobox {
  --calcite-combobox-input-height: 2rem;
  --calcite-internal-combobox-spacing-unit-l: 1rem;
}

.e-layer-edit-labels arcgis-map-config-label {
  margin-block-start: -51px;
}

.e-layer-edit-symbology arcgis-smart-mapping-panels-gallery {
  block-size: 100%;
}
```

CSS custom properties (`--calcite-*`, `--symbol-scroller-max-height`) also cross shadow
boundaries because custom properties inherit through shadow DOM - so setting a var on the
host (in CSS or via `el.style.setProperty`) restyles the internals **without** piercing.

Shadow piercing in JS is used **only** where neither of those works: hiding the gallery's
inner `<header>`/`<footer>`, and resizing Calcite panels that live several shadow roots deep
inside a popover the vendor appends to `body`. Rule of thumb:

1. Try a **prop / `config`** on the vendor component.
2. Try **light-DOM CSS** on the host tag + a **CSS custom property**.
3. Try **`::part()`** if the vendor exposes parts.
4. Only then **pierce open shadow roots in JS**.

---

## Gotchas

- **Open vs closed shadow DOM**: this all works *only* because the vendor uses **open**
  shadow roots (`el.shadowRoot` is non-null). If a component uses a closed root,
  `el.shadowRoot` is `null` and none of this is possible - you must fall back to props/CSS
  vars or file a request with the vendor.
- **Selectors are vendor-internal and version-fragile**: every class (`.flow-item`,
  `.styler-popover`, `.symbol-selection-panel`, `header.header`, `footer.footer`) and tag is
  an undocumented implementation detail. A vendor bump can rename or restructure any of
  them. **Guard every hop with `?.`** and null-check before touching `.style`.
- **Re-render churn**: the vendor re-renders on interaction and re-appends popovers. A
  one-time fix will not stick - use the persisted observer + the click listener to re-apply.
- **Timing races**: nodes do not exist synchronously. Never assume the first query
  succeeds; wait via event -> timeout -> poll -> observer as shown.
- **Disconnect / remove on cleanup**: leaking a `MutationObserver` on `body` or a stray
  click listener will fire against stale closures and can mutate DOM after unmount. Always
  `disconnect()` and `removeEventListener` (same node + same handler ref).
- **Same-node, same-handler**: `removeEventListener` silently no-ops if the function
  identity or the element differs from the `addEventListener` call.

---

## Wizard-within-a-vendor-flow

`arcgis-smart-mapping` renders its **own** internal `calcite-flow` (the
`arcgis-smart-mapping-panels-gallery`). The widget is effectively driving a wizard **inside
the vendor's flow** - it pushes the gallery to a `selected` flow-item, hides that item's
chrome, and reacts to the vendor's `arcgisBeforeBack` / `arcgisClose` events to sync its own
React state (`setIsShowSymbolEditor(false)`), calling `stopImmediatePropagation()` /
`preventDefault()` to keep the vendor from also acting. When you nest your UX inside a
vendor flow like this, treat the vendor's navigation events as the source of truth and mirror
them into your state.

See the wizard flow pattern in
[wizard-flow.md](./wizard-flow.md) for the general "wizard as a stack of calcite-flow-items"
approach.

---

## Cross-reference: same technique in this repo's `branch-version-editor`

This exact technique - **MutationObserver + shadow / calcite-flow piercing to restyle an
OTB component you cannot configure** - is already used in production in this repo. The
`branch-version-editor` widget's `use-editor-chrome.ts` (`patchChrome` + a `MutationObserver`)
relabels and hides buttons in the **OTB Editor widget's `calcite-flow`**. See
[../../editor-calcite-flow.md](../../editor-calcite-flow.md) and repo memory
(`/memories/repo/exb-runtime-patterns.md`).

Compare / contrast:

| | briefing-tool `layer-edit` | branch-version-editor `use-editor-chrome` |
| --- | --- | --- |
| Target | smart-mapping styler **popover** + gallery header/footer | OTB **Editor** widget's `calcite-flow` buttons |
| Goal | resize popover, hide header/footer, kill double scrollbars | **relabel** / hide flow buttons |
| Wait signal | vendor `arcgisLoaded` + `setTimeout` poll | `MutationObserver` on the flow |
| Depth | several nested **shadow roots** (open) | mostly `calcite-flow` items (light DOM) + shadow where needed |
| Re-apply | persisted `mutObsRef` + click listener | persisted `MutationObserver` re-runs `patchChrome` |

Same shape, different targets: one resizes a deep shadow popover, the other relabels flow
buttons. Both persist an observer and both must clean it up.

---

## Lift-into-repo checklist

If you adopt this pattern in this repo, apply repo conventions and hardening:

- **Guard EVERY shadow hop** with `?.` and a `typeof` / `instanceof` / null check before
  touching `.style`. Selectors are undocumented and version-fragile - assume any hop can be
  `null`.
- **Prefer `::part()` / light-DOM CSS / CSS custom properties first**; pierce open shadow
  roots in JS only for what nothing else can reach.
- **Always `disconnect()` observers and `removeEventListener` on cleanup**, using the same
  node + same (stable, `useCallback`) handler reference; clear every `setTimeout`.
- **Gate debug logs** behind `isDebug()` (as the sample does: `isDebug() && console.debug(...)`)
  rather than leaving bare `console.debug` calls.
- **Scope global selectors** with a widget-scoped id (`widgetId + "_agssm"`) so multiple
  widget instances on one page do not collide.
- **Do not claim exact vendor signatures** in comments - these are Stencil / Calcite
  internals. Describe observed selectors and behavior only.
- Follow repo code style: always semicolons, `&&` guard calls, `if` bodies on their own
  line, and plain hyphens (never em/en dashes) in comments and text.
