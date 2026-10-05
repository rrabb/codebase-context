# SDK Samples - Layouts

Source-grounded reference cards for the two layout-type widgets under `ArcGISExperienceBuilder/sdk-resources/widgets/layout-widgets/` (read-only vendor teaching samples, exbVersion 1.20.0). Each card is extracted from the ACTUAL `src` (not the README). A LAYOUT widget declares `"widgetType": "LAYOUT"` in its manifest and receives a `layouts` prop (a map of `{ layoutName: IMSizeModeLayoutJson }`); it renders a Layout component that hosts OTHER widgets/sections dropped into its canvas. The widget always splits its rendering path: at runtime it uses a runtime Layout, in Builder it swaps to `builderSupportModules.widgetModules.LayoutBuilder` (loaded from `src/runtime/builder-support.tsx`) so drag/drop and selection are only wired in the authoring environment. The core contrast: `dock` authors a CUSTOM `Layout`/`LayoutBuilder` pair from scratch (its own floating panels, minimize, docking, drop handling), whereas `widget-with-layout` REUSES the stock `LayoutEntry` (runtime) + `LayoutBuilder` (builder) from `jimu-layouts` and only wraps them with its own chrome.

Signatures below were verified against `ArcGISExperienceBuilder/client/jimu-layouts/**/*.d.ts` (gitignored) for 1.20.0. Anything not fully checkable is marked `(signature approx)`.

---

### dock · Verified vs 1.20: yes
Teaches how to author a fully CUSTOM Layout (floating, minimizable, dockable panels) with its own runtime Layout and a builder Layout that implements `DropHandlers` for drag/drop authoring.

- **Source:** `dock/manifest.json`; `dock/src/runtime/widget.tsx`; `dock/src/runtime/builder-support.tsx`; layout subtree `dock/src/runtime/layout/runtime/{layout,layout-item,panel-item}.tsx`, `dock/src/runtime/layout/builder/{layout,layout-item,panel-item}.tsx`, `dock/src/runtime/layout/common/{panel,item-title}.tsx`. No `config.json`, no setting page.
- **Manifest reqs:** exact JSON -
  ```json
  {
    "widgetType": "LAYOUT",
    "properties": { "hasSettingPage": false, "supportAutoSize": false },
    "layouts": [ { "name": "DEFAULT", "label": "Default", "type": "FIXED" } ],
    "defaultSize": { "width": 400, "height": 400 }
  }
  ```
  (`type: "FIXED"` -> child items carry absolute `bbox` left/top/width/height, which the custom drop handler writes.)
- **Config shape:** none (no `config.json` / `config.ts`).
- **Key APIs (exact):**
  - `interface LayoutProps { layouts: IMSizeModeLayoutJson; isInWidget?: boolean; isRepeat?: boolean; isPageItem?: boolean; children?: React.ReactNode; ... }`
  - `interface StateToLayoutProps { mainSizeMode: BrowserSizeMode; browserSizeMode: BrowserSizeMode; layout: IMLayoutJson }`
  - `const mapStateToLayoutProps: (state: IMState, ownProps: LayoutProps) => StateToLayoutProps` (imported as `utils.mapStateToLayoutProps`)
  - `interface DropHandlers { handleDragEnter?; handleDragOver?; handleDragLeave?; handleDrop?(draggingItem: LayoutItemConstructorProps, containerRect: DOMRect, itemRect): void; onPaste? }`
  - `class CanvasPane { constructor(element: HTMLCanvasElement, theme?: IMThemeVariables); setSize(w,h,ratio?); setColor(color: string); drawRect(rect: Partial<DOMRect>); clear() }`
  - `function addItemToLayout(appConfig: IMAppConfig, item: LayoutItemConstructorProps, targetLayoutId: string): Promise<{ layoutInfo: LayoutInfo; updatedAppConfig: IMAppConfig }>`
  - `DropArea` component with props `{ layouts, highlightDragover?, onDragEnter, onDragOver, onDragLeave, onDrop, onToggleDragoverEffect, isRepeat? }` (from `jimu-layouts/layout-builder`)
- **Runtime side:** `widget.tsx` picks the runtime `Layout` (its OWN `./layout/runtime/layout`, NOT jimu-layouts) unless in Builder, passes `layouts[layoutName]` + `isInWidget`, and drops a `WidgetPlaceholder` as `children`.
  ```tsx
  import Layout from './layout/runtime/layout'
  // ...
  const LayoutComponent = !window.jimuConfig.isInBuilder
    ? Layout
    : builderSupportModules.widgetModules.LayoutBuilder
  const layoutName = Object.keys(layouts)[0]
  return (
    <div className='widget-dock-layout d-flex w-100 h-100'>
      <LayoutComponent layouts={layouts[layoutName]} isInWidget style={{ overflow: 'auto', minHeight: 'none' }}>
        <WidgetPlaceholder icon={IconImage} widgetId={id} message='dock layout' />
      </LayoutComponent>
    </div>
  )
  ```
  The runtime Layout (a connected `React.PureComponent<LayoutProps & StateToLayoutProps, State>`) maps `Object.keys(layout.content)` to a `PanelLayoutItem` each, filtering out `layoutItem.setting?.docked`, and tracks `activeItemId` / `minimizedList` in local state:
  ```tsx
  createItem (layoutItemId: string): JSX.Element {
    const { layout } = this.props
    const layoutItem = layout.content[layoutItemId]
    if (!layoutItem) return null
    return (
      <PanelLayoutItem
        key={`${layout.id}_${layoutItemId}`}
        isActive={layoutItemId === this.state.activeItemId}
        isMinimized={this.state.minimizedList.includes(layoutItemId)}
        layoutId={layout.id} layoutItemId={layoutItemId}
        onClick={this.handleItemClick} onMinimized={this.handleMinimize}
      />
    )
  }
  // ...
  export default ReactRedux.connect<StateToLayoutProps, unknown, LayoutProps>(utils.mapStateToLayoutProps)(Layout as any)
  ```
  Each `PanelLayoutItem` reads its `bbox` via `ReactRedux.useSelector(state => state.appConfig.layouts[layoutId].content[layoutItemId].bbox)` and renders `<Panel><DockLayoutItem/></Panel>`; `DockLayoutItem` branches on `LayoutItemType.Widget` vs `.Section` and delegates to `WidgetRenderer` / `SectionRenderer`.
- **Builder side (builder-support.tsx):** the file only re-exports the custom builder Layout:
  ```tsx
  import LayoutBuilder from './layout/builder/layout'
  export default { LayoutBuilder }
  ```
  The builder `Layout` extends the same base but `implements DropHandlers`, sets up a `CanvasPane` in `componentDidMount`, and renders a `DropArea` overlay plus a `<canvas>` guide. On drop it either repositions a docked item or calls `addItemToLayout` then persists the new bbox and selects it:
  ```tsx
  addWidgetToLayout = async (draggingItem, containerRect, itemRect) => {
    const { layout } = this.props
    const result = await addItemToLayout(getAppConfigAction().appConfig, draggingItem, layout.id)
    const { layoutInfo, updatedAppConfig } = result
    getAppConfigAction(updatedAppConfig)
      .editLayoutItemProperty(layoutInfo, 'bbox', { left: itemRect.left - containerRect.left, top: itemRect.top - containerRect.top, width: itemRect.width, height: itemRect.height })
      .exec()
    getAppStore().dispatch(appActions.selectionChanged(layoutInfo))
  }
  ```
  `handleItemClick` also dispatches `appActions.selectionChanged({ layoutId, layoutItemId })` so clicking a panel selects it in Builder (the runtime version omits this).
- **Lifecycle/timing:** `widget.tsx` chooses runtime vs builder Layout on every render via `window.jimuConfig.isInBuilder`; the builder module is resolved lazily through `builderSupportModules.widgetModules.LayoutBuilder`. Both Layouts derive `content` from `Object.keys(layout.content)` (filtered by `!docked`) and key items as `` `${layout.id}_${layoutItemId}` ``. Panel active/minimized state lives in the Layout's local React state (not appConfig), so it resets on remount. `CanvasPane` is constructed only after the canvas ref exists (`componentDidMount`).
- **Cleanup/teardown:** none needed. `CanvasPane` holds only a canvas ref and is cleared via `clear()`; no watches/subscriptions are registered. Drag handlers are bound through the stock `DropArea`, which manages its own listeners.
- **Critical gotchas:**
  - `dock` imports its OWN runtime Layout from `./layout/runtime/layout` and its OWN builder Layout from `./layout/builder/layout` - it does NOT use jimu-layouts' `LayoutEntry`.
  - `builder-support.tsx` must default-export `{ LayoutBuilder }`; the widget reads it as `builderSupportModules.widgetModules.LayoutBuilder`.
  - Both Layouts are `ReactRedux.connect(...)(Layout as any)` using `utils.mapStateToLayoutProps` so `this.props.layout` (an `IMLayoutJson`) is injected from the store.
  - `PanelLayoutItem` is created per content id; keys combine `layout.id` + id to stay stable across reorders.
  - `handleDragOver`/`handleDrop` early-return when `draggingItem.layoutInfo?.layoutId === this.props.layout.id` to distinguish reposition-within vs add-new.
  - The `FIXED` layout type is what makes per-item absolute `bbox` meaningful; the drop handler writes `left/top/width/height` back through `getAppConfigAction().editLayoutItemProperty`.
- **Lift-into-repo:** copy the whole `layout/` subtree (runtime + builder + common) alongside `widget.tsx` and `builder-support.tsx`; only a widget with `"widgetType": "LAYOUT"` receives the `layouts` prop. When adapting to repo code-style, keep `&&` short-circuit guards and always-semicolons, put `if` bodies on their own line, and rename CSS classes to `widget-<name>`. You rarely need a fully custom Layout - prefer `widget-with-layout` unless you need bespoke chrome (floating/minimize/dock).
- **See also:** the `widget-with-layout` card below (stock `LayoutEntry` reuse), and the `jimu-framework-apis` skill (layouts section: `LayoutType`, `JimuLayoutViewComponent`, `getAppConfigAction`).

---

### widget-with-layout · Verified vs 1.20: yes
Teaches the common case: a functional widget that embeds a drop area by REUSING the stock `LayoutEntry` (runtime) and `LayoutBuilder` (builder) from jimu-layouts, wrapped with its own header.

- **Source:** `widget-with-layout/manifest.json`; `widget-with-layout/src/runtime/widget.tsx`; `widget-with-layout/src/runtime/builder-support.tsx`. No layout subtree, no `config.json`, no setting page.
- **Manifest reqs:** exact JSON -
  ```json
  {
    "widgetType": "LAYOUT",
    "properties": { "hasSettingPage": false, "supportAutoSize": false },
    "layouts": [ { "name": "DEFAULT", "label": "Default", "type": "FIXED" } ],
    "defaultSize": { "width": 400, "height": 400 }
  }
  ```
- **Config shape:** none (no `config.json` / `config.ts`).
- **Key APIs (exact):**
  - `LayoutEntry` (runtime) - `class LayoutEntry extends React.PureComponent<LayoutProps & StateToLayoutProps>`, exported connected from `jimu-layouts/layout-runtime`; accepts `{ layouts, className, style, isInWidget?, children?, ... }`.
  - `LayoutBuilder` - connected class exported from `jimu-layouts/layout-builder` (the stock builder Layout that provides drag/drop authoring); accepts the same `LayoutProps` surface. (props: signature approx - re-exported connected component.)
  - `interface LayoutProps { layouts: IMSizeModeLayoutJson; className?: string; style?: any; isInWidget?: boolean; children?: React.ReactNode; ... }`
  - `AllWidgetProps<unknown>` provides `layouts`, `id`, and `builderSupportModules`.
- **Runtime side:** identical selection pattern to `dock`, but the runtime component is the STOCK `LayoutEntry`; the widget adds its own header row above the layout area:
  ```tsx
  import { LayoutEntry } from 'jimu-layouts/layout-runtime'
  import { WidgetPlaceholder } from 'jimu-ui'
  // ...
  const LayoutComponent = !window.jimuConfig.isInBuilder
    ? LayoutEntry
    : builderSupportModules.widgetModules.LayoutBuilder
  const layoutName = Object.keys(layouts)[0]
  return (
    <div className='widget-custom-layout d-flex flex-column w-100 h-100'>
      <div className='p-2' css={css`/* header band */`}>
        This is the function of your widget ... Below is a layout area, where you can add any widgets.
      </div>
      <LayoutComponent className='flex-grow-1' layouts={layouts[layoutName]} isInWidget
        style={{ overflow: 'auto', minHeight: 'none' }}>
        <WidgetPlaceholder icon={IconImage} widgetId={id} message='widget-with-layout' />
      </LayoutComponent>
    </div>
  )
  ```
- **Builder side (builder-support.tsx):** re-export the STOCK `LayoutBuilder` straight from jimu-layouts - no custom Layout, no `DropHandlers`, no `CanvasPane`:
  ```tsx
  import { LayoutBuilder } from 'jimu-layouts/layout-builder'
  export default { LayoutBuilder }
  ```
- **Lifecycle/timing:** same runtime-vs-builder swap via `window.jimuConfig.isInBuilder` and `builderSupportModules.widgetModules.LayoutBuilder`. All item keying, selection, drag/drop, guide rendering, and `layout.content` iteration are handled INSIDE the stock `LayoutEntry` / `LayoutBuilder` (`LayoutEntry` internally chooses the concrete layout renderer by `layout.type`, e.g. Fixed/Column/Grid). The widget only owns its wrapper chrome.
- **Cleanup/teardown:** none needed. No refs, watches, or subscriptions; the stock components manage their own lifecycle.
- **Critical gotchas:**
  - `widget-with-layout` re-exports `LayoutBuilder` FROM `jimu-layouts/layout-builder` (contrast: `dock` re-exports its own `./layout/builder/layout`).
  - Runtime side imports `LayoutEntry` from `jimu-layouts/layout-runtime`; do NOT import the builder pieces at runtime (they pull authoring-only deps).
  - `isInWidget` MUST be passed so the layout knows it is embedded inside a widget (affects boundary/drop behavior) rather than a page-level layout.
  - Still requires `"widgetType": "LAYOUT"` + a `layouts` entry in the manifest; without it the widget receives no `layouts` prop and `Object.keys(layouts)[0]` throws.
  - `LayoutEntry` handles empty-layout / choose-layout-type states internally (the builder variant has a `ChooseLayoutType` mode); you do not render placeholders for content items yourself, only the single `WidgetPlaceholder` child.
- **Lift-into-repo:** this is the recommended starting point for a repo widget that needs an embedded drop zone - copy `widget.tsx` + `builder-support.tsx`, keep the two-file runtime/builder split, and layer your feature UI in the header/wrapper. Follow repo code-style (`&&` guards, semicolons, `if` bodies on their own line, `widget-<name>` CSS classes, plain hyphens in comments). No custom layout code to maintain.
- **See also:** the `dock` card above (custom Layout with `DropHandlers`/`CanvasPane`), and the `jimu-framework-apis` skill (layouts section).
