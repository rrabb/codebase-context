# jimu-ui Advanced & Setting Components

Advanced components live under `jimu-ui/advanced/<subpath>` (never import them from `'jimu-ui'`).
Type defs: `ArcGISExperienceBuilder/client/jimu-ui/advanced/lib/**`. These are the building blocks for
**widget Settings panels** and richer runtime UI.

---

## Advanced subpaths (`import { X } from 'jimu-ui/advanced/<subpath>'`)

| Subpath | Use for |
|---|---|
| `setting-components` | **Widget Settings panels** — layout + map/layer/data pickers, style pickers, etc. (see below) |
| `data-source-selector` | `DataSourceSelector` — let the author pick data source(s) in settings |
| `map` | Runtime map UI, e.g. `JimuDraw`, `JimuDrawVisibleElements`, `SnappingMode` |
| `sql-expression-builder` | `SqlExpressionBuilder` — build a `SqlExpression` (WHERE clause) against a data source |
| `expression-builder` | `ExpressionBuilder` / `ExpressionInput` — Arcade/attribute expressions |
| `style-setting-components` | Background / border / box-shadow / spacing style setting controls |
| `dynamic-style-builder` | Data-driven (dynamic) style configuration |
| `dynamic-url-editor` | Editor for dynamic URLs with placeholders |
| `rich-text-editor` | Rich text authoring (pairs with `RichTextDisplayer` from `jimu-ui`) |
| `resource-selector` | Pick images/icons/resources |
| `chart` / `chart-engine` | Chart components + rendering engine |
| `coordinate-control` | Coordinate input/display controls |
| `utility-selector` | `UtilitySelector` — pick a GP/geometry/print utility service |
| `portal-components` | Portal item pickers/browsers |
| `arcade-content-builder` | Arcade content authoring |
| `builder-components` | Misc builder-only helpers |
| `link-container` | Link authoring container |
| `site-components` | App/site-level components |

---

## setting-components catalog (`jimu-ui/advanced/setting-components`)

### Layout
| Export | What it does |
|---|---|
| `SettingSection` | A titled section in the settings panel. Props: `title`, `role`, `aria-label`. |
| `SettingRow` | A row within a section. Props: `label`, `flow` (`no-wrap` \| `wrap`), `tag`, `truncateLabel`. |
| `SettingCollapse` (`Collapse`) | Collapsible settings group. |
| `CollapsableResetPanel` / `LabelReset` | Group with a reset-to-default control. |

### Map / layer / data pickers (the core of map-widget settings)
| Export | What it does |
|---|---|
| `MapWidgetSelector` | Pick which Map widget the widget binds to. `onSelect(ids)`, `useMapWidgetIds`. |
| `JimuMapViewSelector` | Pick a specific map view. `useMapViewIds`, `onChange(ids)`. |
| `JimuLayerViewSelector` | Multi/single-select layers of a map view. `jimuMapViewId`, `isMultiSelection`, `selectedValues`, `onChange(jimuLayerViewIds)`. |
| `JimuLayerViewSelectorDropdown` | Dropdown variant of the layer selector. |
| `MultipleJimuMapConfig` | Configure multiple maps at once. |
| `LayerSetting` | Per-layer settings UI. |

> **Important:** the layer selectors deal in `jimuLayerViewId` (`${jimuMapViewId}-${jimuLayerId}`), not raw
> `layer.id`. Convert both ways (await `jmv.whenAllJimuLayerViewLoaded()` first). See the
> `exb-widget-development` skill's `widget-patterns.md` §4.

### Expressions, styles & other pickers
| Export | What it does |
|---|---|
| `RadioGroup` | Grouped radio options for a single choice. |
| `StylePicker` | Pick component styles. |
| `DirectionSelector` | Pick a direction/placement. |
| `SizeModeSelect` | Choose size mode (auto/fixed). |
| `SortSetting` (+ `SortSettingOption`) | Configure sort fields/order. |
| `SortTree` / `SortTreePopper` | Drag-sort a tree of items. |
| `SidePopper` | Slide-out side panel for nested settings (`isOpen`, `trigger`, `title`, `toggle`). |
| `TemplateSelector` / `PageTemplatePopper` / `WindowTemplatePopper` | Pick a layout template. |
| `WidgetListPopper` / `WidgetList` | Pick from a list of widgets. |
| `SearchSetting` | Configure a search/locator source. |
| `MessageActionDataSelector` | Configure the data used by a message action. |

Related pickers from their own subpaths: `DataSourceSelector` (`jimu-ui/advanced/data-source-selector`),
`SqlExpressionBuilder` (`jimu-ui/advanced/sql-expression-builder`), `UtilitySelector`
(`jimu-ui/advanced/utility-selector`).

Also in setting-components: `SizeModeSelector` (+ enum `SizeMode` = `Auto`/`Custom`), `LinkSelector`
(hyperlink target config), `SearchSetting` (`SearchDataSetting`, `SearchSuggestionSetting`,
`getDefaultGeocodeConfig`), and the dialog helpers `handelDialogInfos`, `changeCurrentPage`,
`changeCurrentDialog`.

---

## Other advanced subpaths (runtime + style) — verified inventory

### `jimu-ui/advanced/data-source-selector`
- **`DataSourceSelector`** — author picker for data sources + data views. Props: `isMultiple`/`isMultipleDataView`, `buttonLabel`, `mustUseDataSource`, `disableDataView`/`hideDataView`, `hideCreateViewButton`, `disableSelection`.
- **`FieldSelector`** — pick field(s) from feature-layer DS. Props: `useDataSources`, `types` (`JimuFieldType[]`), `selectedFields`, `hiddenFields`, `disabledFields`, `useDropdown`, `isMultiple`.
- Also: `FieldSelectorWithFullTextIndex`, `DataSourceList`, `DataSourceTree`, `MainDataAndViewSelector`, `DataViewSettingPopup`, `EditArcadeScriptPopup`; const `DEFAULT_DATA_VIEW_ID`. (`AllDataSourceTypes` is re-exported but deprecated — import from `jimu-core`.)

### `jimu-ui/advanced/style-setting-components`
CSS/style setting editors: `BorderSetting`, `BorderRadiusSetting`, `BoxShadowSetting`, `BackgroundSetting`,
`FourSides`, `FourEdges`, `UnitInput`, `FontFamilySelector`, `TextStyle`, `SizeEditor`, `LineStyleSelector`,
`AnimationSetting`, `TransitionSetting`, `MouseActionSetting`, `Padding`, `ColorContrastWarning`, plus
`ThemeBackgroundSection` / `ThemeBorderSection` / `ThemeBoxShadowSection`.

### `jimu-ui/advanced/map`
- **`JimuDraw`** (+ `JimuDrawCreationMode`, `SnappingMode`, `DrawingElevationMode3D`, `JimuDrawVisibleElements`, `useMeasurementsUnitsInfos`) — sketch/draw + measurement UI.
- **`SymbolSelector`** (+ enum `JimuSymbolType`, `SymbolList`) — pick/create point/line/polygon/text symbols.
- **`JimuMap`** (+ `MapThumb`, `JimuMapConfig`), **`MapStatesEditor`** — map preview / initial-state editing.

### `jimu-ui/advanced/resource-selector`
- **`ImageSelector`** (+ `ImageSelectorPanel`) — pick/upload images. **`IconPicker`** — pick/upload icons.

### Other
- `jimu-ui/advanced/expression-builder`: `ExpressionBuilder`, `ExpressionBuilderPopup`, `ExpressionInput`, tabs `AttributeTab`/`StatisticsTab` (enums `ExpressionBuilderType`, `ExpressionInputType`).
- `jimu-ui/advanced/sql-expression-builder`: `SqlExpressionBuilder` (+ builder popup/group popup).
- `jimu-ui/advanced/coordinate-control`: `CoordinateControl`.
- `jimu-ui/advanced/dynamic-url-editor`: `DynamicUrlEditor`, `UrlInfoSelector`.
- `jimu-ui/advanced/rich-text-editor`: Quill-based editor + `richTextEditorUtils` (pairs with `RichTextDisplayer` from `jimu-ui`).
- `jimu-ui/advanced/chart`: `Chart` (`config` = `WebChart`) — renders the `arcgis-charts-components` web component.

---

## Settings panel example (grounded in this repo's `schema-switcher`)

```tsx
import { React } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import {
  MapWidgetSelector, JimuMapViewSelector, JimuLayerViewSelector,
  SettingSection, SettingRow
} from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>): React.ReactElement {
  const { id, config, useMapWidgetIds, onSettingChange } = props
  const [jimuMapViewId, setJimuMapViewId] = React.useState('')

  return (
    <div className="widget-setting-my-widget p-2">
      <SettingSection title="Select Map widget">
        <SettingRow>
          <MapWidgetSelector
            useMapWidgetIds={useMapWidgetIds}
            onSelect={(ids) => { setJimuMapViewId(''); onSettingChange({ id, useMapWidgetIds: ids }) }}
          />
        </SettingRow>
      </SettingSection>

      {!!useMapWidgetIds?.length && (
        <SettingSection title="Select Map view">
          <SettingRow>
            <JimuMapViewSelector
              useMapViewIds={jimuMapViewId ? [jimuMapViewId] : []}
              onChange={(ids) => setJimuMapViewId(ids?.[0] ?? '')}
            />
          </SettingRow>
        </SettingSection>
      )}

      {jimuMapViewId && (
        <SettingSection title="Layers">
          <SettingRow>
            <JimuLayerViewSelector
              jimuMapViewId={jimuMapViewId}
              isMultiSelection
              selectedValues={selectedJlvIds}
              onChange={(jlvIds) => onSettingChange({ id, config: config.set('layerIds', toLayerIds(jlvIds)) })}
            />
          </SettingRow>
        </SettingSection>
      )}
    </div>
  )
}
```

**Manifest for map/layer settings:** add `"dependency": ["jimu-arcgis"]` and
`"settingDependency": "jimu-arcgis"`. Persist config with `onSettingChange({ id, config: config.set(...) })`
and the map binding with `onSettingChange({ id, useMapWidgetIds })`.

For the full settings workflow (id conversion, memoization, `whenAllJimuLayerViewLoaded`), see the
`exb-widget-development` skill.
