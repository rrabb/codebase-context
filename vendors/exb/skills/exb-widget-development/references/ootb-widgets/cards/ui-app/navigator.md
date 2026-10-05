# OTB Widget: common/navigator

Online widget doc: https://developers.arcgis.com/experience-builder/guide/view-navigation-widget/

Note: the widget id is `navigator` but its user facing label is "Views Navigation" (manifest `label`). This is the widget that drives section/view navigation (tabs, dots, slider, arrow buttons).

## Purpose
The navigator (Views Navigation) widget renders a navigation control for the views of an ExB Section. Users switch between the views of the section the widget is associated with. It supports several visual variants (tabs, symbol/dot, slider, arrow button group), publishes navigation messages so other widgets/actions can react, and drives view changes through the app store `sectionNavInfos` runtime state and browser history. In builder it also manages the section/view relationship (auto vs custom view lists, add view, quick style, manage views).

## Source paths inspected
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/manifest.json
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/config.json (compiled default config)
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/config.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/version-manager.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/runtime/widget.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/runtime/utils.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/runtime/components/view-navigation.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/runtime/components/placeholder.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/runtime/builder-support.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/setting/setting.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/tools/quick-style.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/tools/add-view.tsx
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/tools/app-config-operations.ts
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/tools/manage-views.tsx (UNVERIFIED beyond directory listing + reference from builder-support; not read in full)
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/setting/slider-style-setting.tsx (UNVERIFIED; imported by setting.tsx, not read in full)
- ArcGISExperienceBuilder/client/dist/widgets/common/navigator/src/setting/utils.ts (UNVERIFIED; imported by setting.tsx, not read in full)

## Architecture overview
- The widget is thin: `src/runtime/widget.tsx` wires store state and callbacks, then delegates all rendering to the presentational `ViewNavigation` component in `src/runtime/components/view-navigation.tsx`.
- Config is split into two blocks: `data` (which section + which views + auto/custom view type) and `display` (visual type, style, standard props, advanced variant styles). See `src/config.ts`.
- Runtime state comes from the Redux store:
  - `state.appConfig.sections[section].views` - the authoritative ordered list of view ids.
  - `state.appRuntimeInfo.sectionNavInfos[section]` - the live `SectionNavInfo` (currentViewId, previousViewId, progress, useProgress, visibleViews).
- A large set of custom hooks in `src/runtime/utils.ts` encapsulate: reading views, building nav links, switching views, updating progress, listening for section/view changes in builder, and syncing view label/icon in Express mode.
- `ViewNavigation` is a composite over jimu-ui primitives: `Navigation` (nav/tabs), `Slider`, `NavButtonGroup` + `PageNumber`. It picks one based on `display.type`.
- Builder support: `manifest.json` declares `hasBuilderSupportModule`, and `src/runtime/builder-support.tsx` exports `NavQuickStyle` and `ManageViews` builder modules. Context tools (quick-style, manage-views, add-view) and an `APP_CONFIG_OPERATIONS` extension are declared as manifest extensions.

## Key imports and packages
Grouped by source module. Import paths shown as written in source.

jimu-core (src/runtime/widget.tsx):
- `React`, `jsx`, `ReactRedux`, `hooks`, `Immutable`
- `AllWidgetProps`, `IMState`, `ImmutableArray`, `SectionNavInfo` (types)
- `ViewChangeMessage`, `ButtonClickMessage`, `MessageManager` - message publishing

jimu-core (src/runtime/utils.ts):
- `React`, `ReactRedux`, `hooks`, `Immutable`, `lodash`, `css`, `polished`, `i18n`
- `IMState`, `ImmutableArray`, `ImmutableObject`, `IMAppConfig` (types)
- `appActions`, `getAppStore` - store dispatch/read
- `SectionNavInfo`, `LinkType`, `LayoutItemType`, `AppMode`, `BrowserSizeMode` (enums/types)
- `getIndexFromProgress` - progress -> view index math
- `jimuHistory` - `jimuHistory.changeViewBySectionNavInfo(...)`
- theme types: `ThemeSliderVariant`, `ThemeButtonStylesByState`, `ThemeNavType`, `ThemeNavButtonGroupVariant`

jimu-ui (src/runtime/utils.ts, view-navigation.tsx):
- `NavigationItem`, `NavigationVariant`, `NavIconButtonGroupVariant`, `IconPosition`, `IconButtonStyles`, `IconButtonStylesByState`
- `utils` (`utils.toIconResult`), `TextAlignValue`, `defaultMessages`
- Components (view-navigation.tsx): `Navigation`, `Slider`, `NavButtonGroup`, `PageNumber`, plus prop types `NavButtonGroupProps`, `NavigationProps`, `SliderProps`, `PageNumberProps`, `PaginationProps`

jimu-ui (src/runtime/components/placeholder.tsx):
- `WidgetPlaceholder`, `WidgetPlaceholderProps`
- `require('jimu-ui/lib/icons/navigator.svg')`

jimu-layouts:
- `jimu-layouts/layout-runtime` -> `searchUtils` (src/runtime/utils.ts), `LayoutItemSizeModes` (src/utils.ts)
- `jimu-layouts/layout-builder` -> `addItemToLayout` (src/tools/add-view.tsx)

jimu-theme:
- `getBoxStyles` (src/runtime/utils.ts)
- `getThemeModule`, `mapping` (view-navigation.tsx)
- `useTheme2` (src/setting/setting.tsx)

jimu-for-builder:
- `AppConfigAction` type (src/runtime/utils.ts, src/utils.ts)
- `getAppConfigAction`, `builderAppSync`, `appBuilderSync`, `placeholderService`, `AllWidgetSettingProps`, `builderAppSync` (setting + tools)

jimu-icons:
- outlined/directional left/right, outlined/brand widget-section-view, outlined/brand widget-place-holder, outlined/editor plus, filled/editor plus, etc.

## Reusable patterns found
1. Publish VIEW_CHANGE and BUTTON_CLICK (manifest `publishMessages`). On a real view change the widget publishes `ViewChangeMessage`; when the user re-clicks the already-active tab it publishes `ButtonClickMessage` instead. See `publishViewChangeMessage` / `publishTabClickMessage` in `src/runtime/widget.tsx`.
2. Section/view navigation through store + history. Switching a view dispatches `appActions.sectionNavInfoChanged(section, navInfo)` and calls `jimuHistory.changeViewBySectionNavInfo(section, navInfo)` so navigation is reflected in URL/history. See `useSwitchView` and `useUpdateProgress`.
3. MANY custom `useNavigation*`/`useHandle*` hooks in `src/runtime/utils.ts` keep the widget component small:
   - `useWidgetStyle(vertical)` - container css.
   - `useContainerSections(id)` - sections in same layout container as the widget (via `searchUtils.getContentsInTheSameContainer`).
   - `useSectionViewsChange(section, cb)` - builder-only: fire when the section's views change.
   - `useContainerSectionChange(id, cb)` - builder-only: fire when the widget's container sections change.
   - `useSwitchView(section)` - returns a fn to move previous/next (step 1) or by progress (step 0-1).
   - `useUpdateProgress(section)` - returns a fn to set a new progress value.
   - `useNavigationViews(section, configViews, type)` - resolve view ids from auto (section) vs custom (config) and keep them ordered.
   - `useNavigationLinks(views, display)` - build `NavigationItem[]` with label/icon/value (`pageId,viewId`).
   - `useHandleSectionsChange(id, getAppConfigAction)` - keep `config.data.section` valid.
   - `useHandleViewsChange(id, getAppConfigAction)` - keep custom `config.data.views` in sync with actual views.
   - `useHandleViewsLayoutChangeInExpressMode(section, getAppConfigAction)` - Express mode: auto-sync each view's icon/label from the widget dropped into it.
   - `useAdvanceStyle`, `useContainerPaddingStyle` - emotion style generators for variants.
4. Nav variants driven by `display.type` + `display.navStyle`:
   - `type === 'nav'` with navStyle `default` | `underline` | `pills` (tabs) or symbol style (dot icons).
   - `type === 'slider'` (progress slider).
   - `type === 'navButtonGroup'` (previous/next arrow buttons with optional PageNumber), navStyle `default` (outlined) or `tertiary` (text).
   - Style helpers `isInTabStyle` / `isInSymbolStyle` (src/utils.ts) distinguish these.
5. Progress tracking. `SectionNavInfo.progress` + `useProgress` drive slider position and enable/disable of prev/next. `getNavButtonGroupInfo` and `getProgressNavInfo`/`getIndexFromProgress` convert between progress (0-1) and view index.
6. Quick-style templates. `useNavTemplates(widgetId)` returns a curated list of `display` presets (tab default/underline/pills, symbol, slider, arrow1/2/3) used by the quick-style context tool.
7. jimu-for-builder view management. `getAppConfigAction().editWidgetProperty / editViewProperty / editLayoutItemSize / editLayoutItemProperty(...).exec()` are used to update section, views, view icon/label, and widget auto-size. `setWidgetSize` (src/utils.ts) adjusts layout item size/auto props per style.
8. APP_CONFIG_OPERATIONS extension (`src/tools/app-config-operations.ts`) remaps `data.section` and `data.views` when the widget or its page is duplicated (`afterWidgetCopied`), and cleans up view label/icon when a widget is removed in Express mode (`anyWidgetWillRemove`).

## Builder vs runtime split
- Runtime rendering: `src/runtime/widget.tsx` + `src/runtime/components/*`.
- Builder-only behavior is gated by `getAppStore().getState().appContext.isInBuilder` (see `useSectionViewsChange`, `useContainerSectionChange`) so section/view syncing only runs inside the builder, not in the published app.
- `manifest.json` `properties.hasBuilderSupportModule: true` + `src/runtime/builder-support.tsx` expose `NavQuickStyle` and `ManageViews` builder modules; they are consumed at runtime through `props.builderSupportModules?.jimuForBuilderLib?.getAppConfigAction`.
- Context tools (`CONTEXT_TOOL` extensions): quick-style, manage-views, add-view. Each reads app state via `state.appStateInBuilder ?? state` and dispatches through `builderAppSync` (in builder) or `appActions` (in app). `add-view` is only `visible` when the view type is Auto and app is in Express mode.
- Settings panel: `src/setting/setting.tsx` uses `jimu-for-builder` (`getAppConfigAction`, `builderAppSync`, `AllWidgetSettingProps`) and `jimu-ui/advanced/setting-components` (`SettingSection`, `SettingRow`, `DirectionSelector`).

## Lifecycle and cleanup
- No class component; the widget is a function component. State comes from the store; there is no widget-local mutable state besides `nodeRef`.
- The slider change handler is throttled with `lodash.throttle(..., 100)` inside a `useEffect`; the effect returns a cleanup that calls `handleSliderChangeRef.current.cancel()` to cancel pending throttled calls on unmount/`onChange` change (view-navigation.tsx).
- `useHandleViewsLayoutChangeInExpressMode` runs an effect that calls `getAppConfigAction()...exec()` only when `viewsNeedUpdate.length` is non-zero, avoiding redundant app config writes.
- Message publishing is guarded: `ViewChangeMessage` is skipped when the target view equals the previous view; `ButtonClickMessage` is published only when re-clicking the active tab.
- `MessageManager.getInstance().publishMessage(...)` is used directly (no explicit unsubscribe needed since the widget only publishes, does not subscribe).

## Manifest/config requirements
From `manifest.json`:
- `publishMessages`: `["VIEW_CHANGE", "BUTTON_CLICK"]` - declare these if a custom widget wants to publish the same.
- `properties`: `hasSettingPage: true`, `coverLayoutBackground: true`, `hasBuilderSupportModule: true`.
- `defaultSize`: `{ height: 60, width: 380, autoHeight: true, autoWidth: true }`.
- `extensions`:
  - `quick-style` (CONTEXT_TOOL, uri `tools/quick-style`)
  - `manage-views` (CONTEXT_TOOL, uri `tools/manage-views`)
  - `add-view` (CONTEXT_TOOL, uri `tools/add-view`)
  - `appConfigOperations` (APP_CONFIG_OPERATIONS, uri `tools/app-config-operations`)

Config shape (`src/config.ts`):
```ts
export enum ViewType { Auto = 'AUTO', Custom = 'CUSTOM' }
export interface ViewNavigationData { section: string; type: ViewType; views?: string[] }
export interface Config { data: IMViewNavigationData; display: IMViewNavigationDisplay }
```
Default runtime config (`config.json`):
```json
{
  "data": { "type": "AUTO", "section": "", "views": [] },
  "display": {
    "advanced": false, "vertical": false, "type": "nav", "navStyle": "default",
    "standard": { "scrollable": true, "textAlign": "center", "gap": "0px", "showText": true, "showIcon": false, "iconPosition": "start" }
  }
}
```
Note: `version-manager.ts` `DEFAULT_CONFIG` uses an older display shape (`navType`, `alignment`, `showText`, ...) which is upgraded by the version manager to the current `type`/`navStyle`/`standard` shape - do not copy the old shape.

## Gotchas
- Two config layers exist: the compiled `config.json` (current shape) vs `DEFAULT_CONFIG` in `version-manager.ts` (pre-upgrade shape). Read `config.ts` + `config.json` for the real runtime shape, not `DEFAULT_CONFIG`.
- `data.type` values are the string enum `'AUTO'`/`'CUSTOM'` (`ViewType`), not booleans. In Auto mode the widget follows the section's views; in Custom mode it uses `data.views`.
- The widget's active view is derived from `sectionNavInfos[section].currentViewId` and falls back to `state.appConfig.sections[section].views[0]`. If the section has no views, the placeholder renders (`widgetPlaceholderWithNoView` vs `widgetPlaceholder`).
- `NavigationItem.value` is encoded as `` `${pageId},${view}` ``; use `getViewId(item)` (splits on `,` and takes index 1) to recover the view id. Do not assume `value` is just the view id.
- Symbol style intentionally omits icons on the link data (`isInSymbolStyle(display) ? undefined : icon`) because the symbol/dot style provides its own icon rendering.
- Builder sync hooks (`useSectionViewsChange`, `useContainerSectionChange`) early-return unless `appContext.isInBuilder`; they will not run in the published app. Do not rely on them at runtime.
- `useContainerSections` deliberately depends on `sections` and `layouts` (not the whole `appConfig`) to limit re-renders; it re-reads the full store inside `useMemo`. Preserve that dependency choice if adapting.
- `useSwitchView` rounds `step` up (`Math.ceil`) when the section has no transition or a `None` transition, effectively forcing step-by-step navigation without a transition animation.
- Slider values are scaled by `MAGNIFICATION = 100` in `view-navigation.tsx` and divided back down before `onChange('slider', value)`; keep the scaling consistent.
- Express mode has extra behavior: `add-view` context tool only shows in Express + Auto, and `useHandleViewsLayoutChangeInExpressMode` rewrites view icon/label from the contained widget. This is Express-specific and can surprise you if copied into a non-Express widget.

## Useful snippets and functions

Source: src/runtime/widget.tsx - publish VIEW_CHANGE vs BUTTON_CLICK
```tsx
const publishViewChangeMessage = (viewId: string, preViewId: string) => {
  if (viewId === preViewId) {
    return
  }
  const dataSourcesChangeMessage = new ViewChangeMessage(id, viewId, preViewId)
  MessageManager.getInstance().publishMessage(dataSourcesChangeMessage)
}

const publishTabClickMessage = (newViewId: string, preViewId: string) => {
  if (newViewId === preViewId) {
    const buttonClickMessage = new ButtonClickMessage(id)
    MessageManager.getInstance().publishMessage(buttonClickMessage)
  }
}
```

Source: src/runtime/widget.tsx - unified change handler that maps UI type to a navigation action
```tsx
const handleChange = hooks.useEventCallback((type: ViewNavigationType, value: boolean | number | string) => {
  let navInfo: SectionNavInfo
  if (type === 'navButtonGroup') {
    navInfo = switchView(value as boolean, step)
  } else if (type === 'slider') {
    navInfo = updateProgress(value as number)
  }

  const preViewId = currentViewId
  // if no navInfo, the type is "nav"
  const viewId = navInfo ? navInfo.currentViewId : value as string
  publishViewChangeMessage(viewId, preViewId)
  if (type === 'nav') {
    publishTabClickMessage(viewId, preViewId)
  }
})
```

Source: src/runtime/utils.ts - switch view and reflect it into store + history
```ts
export const useSwitchView = (section: string) => {
  const dispatch = useDispatch()
  return useCallback((previous: boolean, step: number) => {
    const state = getAppStore()?.getState()
    const views = state.appConfig.sections?.[section]?.views
    const sectionNavInfo = state?.appRuntimeInfo?.sectionNavInfos?.[section]
    const currentViewId = sectionNavInfo?.currentViewId || views[0]
    const visibleViews = sectionNavInfo?.visibleViews || views
    const progress = sectionNavInfo?.progress ?? 0

    let nextNavInfo: SectionNavInfo = null

    if (!state.appConfig?.sections?.[section]?.transition || state.appConfig?.sections?.[section]?.transition?.type === 'None') {
      step = Math.ceil(step)
    }
    if (step === 1) {
      nextNavInfo = getNextNavInfo(previous, currentViewId, views, visibleViews)
    } else {
      const nextProgress = previous ? Math.max(addFloatNumber(progress, -(step / (views.length - 1))), 0) : Math.min(addFloatNumber(progress, step / (views.length - 1)), 1)
      nextNavInfo = getProgressNavInfo(nextProgress, views, visibleViews)
    }
    dispatch(appActions.sectionNavInfoChanged(section, nextNavInfo))
    jimuHistory.changeViewBySectionNavInfo(section, nextNavInfo)
    return nextNavInfo
  }, [dispatch, section])
}
```

Source: src/runtime/utils.ts - build NavigationItem[] from view ids
```ts
export const useNavigationLinks = (views: ImmutableArray<string>, display: IMViewNavigationDisplay): ImmutableArray<NavigationItem> => {
  const viewJsons = useSelector((state: IMState) => state.appConfig.views)
  const pageId = useCurrentPageId()

  return React.useMemo(() => {
    return views?.map((view: string) => {
      const label = viewJsons?.[view]?.label
      const icon = viewJsons?.[view]?.icon || utils.toIconResult(widgetSectionViewOutlinedIcon, '', 16)
      return {
        name: label,
        linkType: LinkType.View,
        value: `${pageId},${view}`,
        // symbol style do not need icon
        icon: isInSymbolStyle(display) ? undefined : icon,
        navLinkAriaControls: `${viewJsons?.[view]?.parent}_${view}`
      } as NavigationItem
    }) ?? Immutable([])
  }, [display, pageId, viewJsons, views])
}
```

Source: src/runtime/utils.ts - resolve views for auto vs custom
```ts
export const useNavigationViews = (section: string, configViews: ImmutableArray<string>, type: ViewType): ImmutableArray<string> => {
  const views = useSelector((state: IMState) => {
    if (state?.appStateInBuilder) {
      return state?.appStateInBuilder?.appConfig?.sections?.[section]?.views
    }
    return state?.appConfig?.sections?.[section]?.views
  })
  return React.useMemo(() => {
    const _Views = ((type === ViewType.Custom ? configViews : views) || Immutable([])).asMutable()
    _Views.sort((a, b) => {
      return views?.indexOf(a) - views?.indexOf(b)
    })
    return Immutable(_Views)
  }, [configViews, views, type])
}
```

Source: src/runtime/utils.ts - keep config.data.section valid when container sections change (builder)
```ts
export const useHandleSectionsChange = (id: string, getAppConfigAction: (appConfig?: IMAppConfig) => AppConfigAction) => {
  return useCallback((sections: string[]) => {
    const config = getAppStore().getState().appConfig.widgets[id].config
    const section = config?.data?.section
    if (!sections?.includes(section)) {
      if (!section && !sections?.[0]) return
      getAppConfigAction().editWidgetProperty(id, 'config', config.setIn(['data', 'section'], sections?.[0])).exec(false)
    }
  }, [getAppConfigAction, id])
}
```

Source: src/utils.ts - style discriminators
```ts
export const isInTabStyle = (display: Partial<ViewNavigationDisplay> | IMViewNavigationDisplay) => {
  return display?.type === 'nav' && !display?.standard?.alternateIcon && !display?.standard?.activedIcon
}

export const isInSymbolStyle = (display: Partial<ViewNavigationDisplay> | IMViewNavigationDisplay) => {
  return !!(display?.type === 'nav' && display?.standard?.alternateIcon && display?.standard?.activedIcon)
}
```

Source: src/runtime/components/view-navigation.tsx - throttled slider handler with cleanup
```tsx
const handleSliderChangeRef = React.useRef<any>(() => 0)

React.useEffect(() => {
  handleSliderChangeRef.current = lodash.throttle((evt) => {
    let value = +evt.target.value
    value = Number((value / MAGNIFICATION).toFixed(2))
    onChange?.('slider', value)
  }, 100)

  return () => {
    handleSliderChangeRef.current.cancel()
  }
}, [onChange])
```

Source: src/runtime/components/view-navigation.tsx - variant selection by type
```tsx
{type === 'nav' && <Navigation /* ...tab/symbol props... */ />}
{type === 'slider' && <Slider className="h-100" value={progress * MAGNIFICATION} hideThumb={hideThumb} onChange={handleSliderChange} formatter={sliderFormatter} />}
{type === 'navButtonGroup' &&
  <NavButtonGroup
    variant={navStyle === 'tertiary' ? 'text' : 'outlined'}
    previousText={previousText} previousIcon={previousIcon}
    nextText={nextText} nextIcon={nextIcon}
    vertical={vertical} disablePrevious={disablePrevious} disableNext={disableNext}
    onChange={handleArrowChange}>
    {showPageNumber && <PageNumber current={current} totalPage={totalPage} css={css`color: ${paginationFontColor}`} />}
  </NavButtonGroup>}
```

Source: src/tools/app-config-operations.ts - remap section/views on duplicate
```ts
afterWidgetCopied (sourceWidgetId, sourceAppConfig, destWidgetId, destAppConfig, contentMap?) {
  if (!contentMap) { return destAppConfig }
  const config: IMConfig = sourceAppConfig.widgets[sourceWidgetId]?.config
  const currentSectionId = contentMap?.[config?.data?.section] || config?.data?.section
  const sourceWidgetSectionView = sourceAppConfig?.sections?.[config?.data?.section]?.views
  const currentWidgetSectionView = destAppConfig?.sections?.[currentSectionId]?.views
  const displayViews = []
  sourceWidgetSectionView?.forEach((view, index) => {
    if (config?.data?.views?.includes(view) && currentWidgetSectionView?.[index]) {
      displayViews.push(currentWidgetSectionView[index])
    }
  })
  return destAppConfig
    .setIn(['widgets', destWidgetId, 'config', 'data', 'section'], currentSectionId)
    .setIn(['widgets', destWidgetId, 'config', 'data', 'views'], displayViews)
}
```
