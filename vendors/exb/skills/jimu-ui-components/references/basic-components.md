# jimu-ui/basic Components (ExB 1.20)

Author- and runtime-facing components that are **not** in the `jimu-ui` root barrel — each has its own
`jimu-ui/basic/<name>` entrypoint. These are commonly needed but easy to miss. Type defs:
`ArcGISExperienceBuilder/client/jimu-ui/basic/`.

| Component | Import | Purpose | Key props / exports |
|---|---|---|---|
| `ColorPicker`, `ThemeColorPicker` | `jimu-ui/basic/color-picker` | Color chooser (swatch + popper); theme-variable-bound variant | `color`, `title`, `placement`, `showArrow`, `onChange(color)`. Building blocks: `Sketch`, `ColorSwatch`, `EditableInput`, `convertToClassicColorVariable` |
| `CopyButton` | `jimu-ui/basic/copy-button` | Button that copies `text` to clipboard | extends `ButtonProps`: `text`, `onCopy(text, result)`, `disabled` |
| `DatePicker` | `jimu-ui/basic/date-picker` | Date/time picker w/ Esri formats + "virtual dates" (Today, etc.) | `selectedDate` (Date \| VirtualDateType), `dateFormat`, `minDate`/`maxDate`, `showTimeInput`, `supportVirtualDateList`, `virtualDateList`, `onChange(value, label)`. Also `TimeInput` |
| `GuideComponent`, `GuideRenderer` | `jimu-ui/basic/guide` | In-app onboarding walkthrough engine | `steps`, `stepIndex`, `run`, `conditionalStepIndexes`, `onStepChange`, `onActionTriggered` (component is `GuideComponent`, not `Guide`) |
| `ImageCrop` | `jimu-ui/basic/imagecrop` | Modal image cropper (zoom/aspect/shape), renders via portal | `image`, `imageFormat`, `cropParam`, `cropType`, `onConfirmCrop`, `onCancelCrop`, `widgetId`; types `CropParam`, `CropType` |
| `ItemSelector` (+ `ItemList`, `ItemDetail`) | `jimu-ui/basic/item-selector` | AGOL/Portal item browser (My Content, Groups, Org, Living Atlas) | `mode`, `portalUrl`, `itemType`, `itemTypeCategory`, `selectedItems`, `isMultiple`, `onSelect`, `onRemove`. Enums `ItemCategory`, `ItemTypes`, `ItemTypeCategory`, `ItemSelectorMode` |
| `Tree`, `List`, `TreeItem`, `treeUtils` | `jimu-ui/basic/list-tree` | Hierarchical tree + flat list with DnD, checkboxes, custom render hooks | `Tree`: `rootItemJson`, `treeStyle`, `collapseStyle`, `handleAction`, `renderOverrideItem*` hooks. `List`: `itemsJson`. Types `TreeItemType`, `TreeStyle`, `TreeActionType` |
| `QRCode` | `jimu-ui/basic/qr-code` | Downloadable QR from a URL string | `value`, `size`, `bgColor`, `fgColor`, `imageSettings` (embedded logo), `hideDownloadBtn`, `downloadFileName` |
| `FieldSelector` (+ runtime utils) | `jimu-ui/basic/runtime-components` | Runtime re-export of the field picker + DS/search runtime helpers | exports `FieldSelector`; helpers `getNewDataSourceConfig`, `getOutputDsJson` |
| `SqlExpressionRuntime` | `jimu-ui/basic/sql-expression-runtime` | Runtime SQL-expression renderer/evaluator ("ask for value" filters) | `expression` (IMSqlExpression), `dataSource`, `widgetId`, `queryScope`, `onChange`. Utils `isSqlExpressionValid`, `getJimuFieldNamesBySqlExpression` |

## Examples

```tsx
import { ColorPicker } from 'jimu-ui/basic/color-picker'
<ColorPicker color={color} onChange={setColor} showArrow placement="bottom" />

import { ItemSelector, ItemTypes, ItemSelectorMode } from 'jimu-ui/basic/item-selector'
<ItemSelector mode={ItemSelectorMode.Content} itemType={ItemTypes.WebMap} isMultiple={false}
  selectedItems={items} onSelect={setItems} />

import { Tree, treeUtils } from 'jimu-ui/basic/list-tree'
<Tree rootItemJson={rootJson} handleAction={(action, refItem) => { /* MOVE/REMOVE/… */ }} />

import { QRCode } from 'jimu-ui/basic/qr-code'
<QRCode value={appUrl} size={160} imageSettings={{ src: logo, width: 32, height: 32, excavate: true }} />

import { DatePicker } from 'jimu-ui/basic/date-picker'
<DatePicker selectedDate={date} showTimeInput onChange={(v, label) => setDate(v)} />
```

## Notable / novel (likely unfamiliar to an older model)

- **`ItemSelector`** — full portal item browser with category/folder/group filters (settings-side item pickers).
- **`Tree`/`List`** (`list-tree`) — DnD hierarchical tree with `renderOverrideItem*` customization hooks + `treeUtils`.
- **`GuideComponent`/`GuideRenderer`** — built-in onboarding walkthrough system (steps + conditional steps).
- **`DatePicker` virtual dates** (`supportVirtualDateList` / `virtualDateList`) — relative dates like "Today".
- **`QRCode`** with embedded-logo `imageSettings`; **`ImageCrop`** modal cropper; **`CopyButton`**.
- **`FieldSelector`** is re-exported here (`runtime-components`) for runtime use, in addition to `jimu-ui/advanced/data-source-selector`.
- **`SqlExpressionRuntime`** renders the runtime "ask for values" UI for a saved SQL expression.
