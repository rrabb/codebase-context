# OTB `Editor` runtime + `calcite-flow` anatomy (for customization)

How the ArcGIS Maps SDK `Editor` widget behaves at runtime and how its `calcite-flow` UI is
structured, so you can relabel/hide/rearrange the out-of-the-box (OTB) UI and inject your own. Captured
live from `experience/5` (branch-version-editor) via Playwright + `window.__bveEditor`; correlate with
`src/widgets/branch-version-editor/src/runtime/components/use-editor-chrome.ts` (which already does this).

> Everything below the public API is version-fragile: `.esri-editor__*` class names and the flow-item
> child layout are NOT a contract. Prefer the public API and Calcite-native slots; guard DOM patches
> (`typeof fn === 'function'`, null-checks) and re-apply via a `MutationObserver`.
>
> **Related pattern:** for restyling *vendor* web components you cannot configure (e.g. `arcgis-smart-mapping` / `arcgis-map-config-*` popovers) by piercing nested open shadow roots, see [sdk-samples/briefing-tool/vendor-webcomponent-restyling.md](sdk-samples/briefing-tool/vendor-webcomponent-restyling.md) - the same MutationObserver-driven technique applied to a different vendor component.

## Getting a handle

- In widget code you already hold `editor` (from `useEditor`). For DevTools/Playwright, the widget
  exposes `window.__bveEditor` while editing (gated by `isDebug()`; cleared on unmount).
- Live introspection: `page.evaluate(() => window.__bveEditor.viewModel.state)`, or inject
  `src/libs/debug-introspect.ts` (`instrumentMethods`, `describeSignature`) into the page.

## Runtime state (the variables to watch)

Observed values (live) - full enums in `Editor/types.d.ts` / `Workflow.d.ts`:

- `editor.viewModel.state`: `'ready'` at the template picker, `'creating-features'` while drawing /
  reviewing the pending list; other values: `awaiting-feature-creation-info`, `awaiting-feature-to-create`,
  `editing-existing-feature`, `viewing-selection-list`, `disabled`. Also `viewModel.canCreate` / `canUpdate`.
- `editor.activeWorkflow` (class `esri.widgets.Editor.CreateFeaturesWorkflow` | `UpdateWorkflow`):
  - **Non-null AT the template picker already** (`type:'create-features', started:true, createFeatureState:'create-new',
    numPendingFeatures:0, hasPreviousStep:false, hasNextStep:true`). (Correction to earlier notes that
    said the picker had no active workflow.)
  - `.type` `'create-features'|'update'`, `.stepId`, `.started`, `.hasPreviousStep`, `.hasNextStep`.
  - `(wf as CreateFeaturesWorkflow).createFeatureState` `'create-new'|'update-pending'`, `.numPendingFeatures`
    (increments as you draw), `.data.creationInfo.layer.title` + `.template.name` (the layer/template being
    created - `template.label` is usually undefined, use `.name`), `.data._pendingEdits`.

## Workflow sequence (the create-features back-stack)

`calcite-flow` is a back-stack; the DOM order of `calcite-flow-item`s is base -> top and `back()` / the OTB
header back-arrow pops the top item. The create-features sequence (verified live, order corrected):

1. **Template picker** - base flow-item (heading "Editor"), `viewModel.state:'ready'`, holds
   `.esri-editor__feature-templates-container`. Pick a template.
2. **Create / list panel** - pushed above the picker (heading = the patched "Create <Layer> / <Template>
   features"), `state:'creating-features'`. Hosts BOTH the Sketch draw tools
   (`.esri-editor__sketch-container`) and the "Unsaved features" list, with the footer **`Save (N)`**
   button. This is where you draw and where you finalize.
3. **Draw** a feature -> the Editor pushes the **attribute-form** flow-item ABOVE this panel: the
   `.esri-feature-form` (`createFeatureState:'update-pending'`), footer **`Create`** (solid). Fill fields.
4. **Header back-arrow** (`activeWorkflow.back()`) pops the form -> returns to the create/list panel,
   where the new feature now appears under "Unsaved features". Repeat draw -> form -> back to add more.
5. **`Save (N)`** on the list panel commits all pending (`activeWorkflow.save()`).

Net order: **picker -> draw -> attribute-form -> back -> pending-list -> Save**. The attribute-form sits
ABOVE the list in the stack (reached by drawing, left via the back-arrow) - it is NOT a sibling of the
list. Live stack confirmation (mid-session, 3 pending): `[0] template-picker "Editor"` ->
`[1] pending-list "Create Buildingfloor / Apartments features" [selected]` (form popped).

## Public API (the levers)

`editor.activeWorkflow` methods (all public, no underscore): `start`, `next`, `previous`, `back`, `go`,
`enter`, `exit`, `reset`, `cancel`, `commit`, **`save`**, `cancelFeature`, `updatePendingFeature`.

- **`save()` is the create-features finalize** (validate -> `commit()` -> `viewModel._applyEdits` ->
  reset/restart). It is real and callable but NOT in the `.d.ts` - guard with `typeof wf.save === 'function'`.
  Plain `commit()` alone does NOT apply edits.
- `back()`/`previous()` pop the flow (the OTB back arrow); `cancel()` aborts the workflow.

`editor` (Editor) workflow entry points: `startCreateFeaturesWorkflowAtFeatureTypeSelection`,
`startCreateFeaturesWorkflowAtFeatureCreation(creationInfo)`, `startCreateFeaturesWorkflowAtFeatureEdit`,
`startUpdateFeaturesWorkflow`, `startUpdateWorkflowAtFeatureSelection` / `AtFeatureEdit` /
`AtMultipleFeatureSelection` / `WithActiveSelection`, `startMergeFeaturesWorkflow`,
`startSplitFeatureWorkflow`, plus `cancelWorkflow`, `deleteFeatures`, `activateSelectionTool`.

Watch reactively (same alias OTB uses): `import * as reactiveUtils from 'esri/core/reactiveUtils'` then
`reactiveUtils.watch(() => [editor.viewModel.state, editor.activeWorkflow?.stepId, wf?.numPendingFeatures], cb, { initial: true })`.

## `calcite-flow` DOM anatomy

The OTB Editor renders a `calcite-flow` back-stack of `calcite-flow-item`s (the top `[selected]` one is
shown; `back()` pops). Per `calcite-flow-item` (live capture at the create-features / pending-list step):

```
calcite-flow-item [heading="Create <Layer> / <Template> features"] [selected]  (heading is a PROPERTY)
  div.esri-editor__panel-toolbar            {default slot}
  div.esri-editor__sketch-container         {default slot}  -- the Sketch draw toolbar (select/polygon/rect/circle/undo/redo)
  div.esri-editor__panel-content            {default slot}
    div.esri-editor__panel-content__section
      calcite-accordion  -> Settings (snapping: calcite-block > calcite-switch, calcite-list of layer calcite-checkbox)
    div.esri-editor__panel-content__section  -- picker only: h5.esri-widget__heading + div.esri-editor__feature-templates-container
    ...                                       -- creating: h5 "Unsaved features" + treegrid rows (Zoom to / Discard per feature)
  div.esri-editor__actions                  {slot="footer"}  -- holds the native "Save (N)" calcite-button
```

Picker-step flow-item is the same shape but its footer is `div.esri-editor__help-message {slot="footer"}`
(no Save button there), and its content section holds `div.esri-editor__feature-templates-container`
(`div.esri-item-list__group > h5.esri-item-list__group__header` per layer, then `calcite-list` of templates;
each template `img` has `aria-label="Preview for <TemplateName>"`).

Attribute-form step (editing one pending feature; `createFeatureState:'update-pending'`) - the selected
flow-item's content is a `.esri-feature-form` (fields render as Calcite controls, e.g. `calcite-input-number`
for HEIGHT, `calcite-combobox` for TYPE, labeled by field alias), preceded by a
`calcite-action-bar.esri-editor__update-action-bar`; its `slot="footer"` `.esri-editor__actions` holds a
single **`Create`** (solid) button - NOT `Save (N)`. So the OTB footer text differs by sub-step (`Create`
on the single-feature form vs `Save (N)` on the pending-list); the RELIABLE distinguisher is panel content
(`.esri-feature-form` present = form step), which is what our widget uses to hide its custom Save bar there.

Key facts:
- The **heading** is the `calcite-flow-item.heading` PROPERTY (rendered as an `<h4>`); ExB also duplicates a
  title in an inner `h5.esri-widget__heading`. To relabel, set the property AND patch the h5 (our
  `patchChrome` does both).
- The **footer** is a child with `slot="footer"` (`.esri-editor__actions` or `.esri-editor__help-message`).
- Content is default-slotted `.esri-editor__*` divs.

## Customization recipes

1. **Relabel heading / buttons** - no public API for label text. Set `flowItem.heading` + patch the inner
   `h5.esri-widget__heading` / footer `calcite-button` text via a `MutationObserver` + rAF, disconnecting
   during your own writes to avoid loops (see `use-editor-chrome.ts` `patchChrome`).
2. **Hide OTB sections** - `editor.visibleElements` (JSAPI 5.0) TOGGLES sections only (no relabel):
   `createFeaturesSection`, `editFeaturesSection`, `flow` (set false to host the Editor inside your OWN
   `calcite-flow`), `sketch`, `settingsMenu`, `snappingControls`, `tooltipsToggle`, `labelsToggle`,
   `zoomToButton`, `undoRedoButtons`, `splitButton`, `mergeButton`. For finer hiding, scoped CSS on
   `.esri-editor__*` (fragile).
3. **Add / replace footer buttons** - append to the `[slot="footer"]` container, or add your own element
   with `slot="footer"` to the `calcite-flow-item`. Our widget instead renders a separate `.bve-editor-chrome`
   bar OUTSIDE the flow (Save/Back proxying the native ones) and hides the OTB button by content
   (`btn.closest('calcite-flow-item').querySelector('.esri-feature-form')` distinguishes the attribute-form
   panel from the pending-list panel - both share the SAME "Save (N)" button text).
4. **Inject your own panel/UI cleanly** - prefer Calcite-native `calcite-flow-item` slots over hacking the
   `.esri-editor__*` DOM: `content-top`, `content-bottom`, `header-actions-start`, `header-actions-end`,
   `header-menu-actions`, `footer-actions`, `alerts`. **VERIFIED LIVE:** appending a `calcite-notice`
   with `slot="content-top"` and a `calcite-action` with `slot="header-actions-end"` to the selected
   `calcite-flow-item` rendered both correctly in the OTB Editor header/content, without touching any
   `.esri-editor__*` node. (Use a valid Calcite icon name for the installed version - a bad `icon` 404s
   but the element still renders.) Appending a node with one of these `slot`s survives OTB re-renders
   better than injecting into `.esri-editor__panel-content`.
5. **Drive the sequence programmatically** - use the workflow API (`next`/`previous`/`back`/`save`/`cancel`/
   `updatePendingFeature`) or the `editor.start*Workflow*` entry points instead of clicking OTB buttons;
   fall back to clicking the native footer `calcite-button` only when no public method exists.
6. **Fully custom shell** - set `visibleElements.flow = false` and render the Editor inside your own
   `calcite-flow`/`calcite-panel`, then build your chrome around `viewModel.state` + `activeWorkflow`.

## Skipping the attribute form after a draw (no built-in toggle)

There is NO Editor config to suppress the post-sketch attribute form. It is a sub-state, not a step:
`createFeatureState` flips `create-new` -> `update-pending` inside the `creating-features` step, and
`VisibleElements` only toggles whole sections (createFeaturesSection, sketch, snappingControls, ...), not
this. But it is achievable via the DOCUMENTED `sketch-create` event (since JSAPI 5.0):

```ts
const h = editor.on('sketch-create', (evt) => {
  if (evt.detail?.state !== 'complete' || !config.skipAttributeFormOnCreate) return;
  const wf = editor.activeWorkflow as __esri.CreateFeaturesWorkflow;
  // pop the form the Editor is about to show, returning to the draw/list state
  requestAnimationFrame(() => { if (wf?.hasPreviousStep) void wf.previous(); });
});
// on cleanup: h.remove();
```

Notes:
- The drawn feature is ALREADY pending (`numPendingFeatures` increments on draw), so skipping the form only
  skips attribute editing - the feature keeps its template defaults and can still be edited later from the
  pending list.
- Trigger only off `sketch-create` (a real draw). Clicking an existing pending feature also enters
  `update-pending`, so do NOT key the skip off `createFeatureState` alone.
- `sketch-create` / `previous()` / `cancel()` are documented (unlike `save()`); still verify the exact
  landing state (ready-to-draw vs pending-list) live before shipping, and guard against re-entrancy.
- Expose as a widget config (e.g. `skipAttributeFormOnCreate`, default false to preserve OTB behavior).

## Small screens (ExB mobile layout) - why the attribute form "disappears"

On a small form factor, the OTB Editor is NOT responsible for hiding the attribute form - the JSAPI docs
say it always shows the form after a sketch, and the Editor widget has no responsive/breakpoint code.
The suppression is **ExB's mobile layout**: below the app's small-screen breakpoint (~1042px app width in
`experience/5`), ExB moves the Section's widgets into a bottom tab bar + a collapsible bottom sheet and
makes the map fullscreen. Verified live: at phone width `window.__bveEditor` becomes `undefined`, the
`.esri-editor` DOM is gone, and the widget REMOUNTS (dropping the editing session + pending edits). So
after drawing on the fullscreen map, the attribute-form flow-item is created inside the collapsed/unmounted
panel and never surfaced.

Implication for making it configurable: there is no JSAPI toggle. Because the widget unmounts in mobile,
any `showAttributeFormOnSmallScreens` logic must live in the widget's mount path (e.g. a `useEffect` +
`matchMedia`/`ResizeObserver` on the edit container) and either auto-expand the ExB mobile bottom sheet when
the Editor reaches the form step, or deliberately keep the user on the pending-list.

## Re-capture live (Playwright)

Open `experience/<id>` (see the browser workflow note in the SKILL), zoom past the edit scale, Start
Editing, then:

```js
// runtime state
page.evaluate(() => { const e = window.__bveEditor, w = e.activeWorkflow;
  return { vmState: e.viewModel.state, type: w?.type, stepId: w?.stepId,
    createFeatureState: w?.createFeatureState, pending: w?.numPendingFeatures,
    layer: w?.data?.creationInfo?.layer?.title, tpl: w?.data?.creationInfo?.template?.name }; });
// flow-item slot map
page.evaluate(() => [...document.querySelectorAll('calcite-flow-item')].map(fi =>
  ({ heading: fi.heading, selected: fi.hasAttribute('selected'),
     children: [...fi.children].map(c => ({ tag: c.tagName, slot: c.getAttribute('slot'), cls: c.className })) })));
```
