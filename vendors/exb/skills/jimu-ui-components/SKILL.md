---
name: jimu-ui-components
description: "USE WHEN answering questions, explaining, choosing, implementing, debugging, or reviewing jimu-ui / Jimu UI components in ArcGIS Experience Builder (ExB), including custom or OOTB / OTB widgets and settings panels. Covers component props, imports, theme behavior, buttons, inputs, selectors, tabs, overlays, feedback, icons, and advanced settings components: SettingSection, SettingRow, MapWidgetSelector, JimuMapViewSelector, JimuLayerViewSelector, RadioGroup, StylePicker, SidePopper, DataSourceSelector, SqlExpressionBuilder. Trigger on jimu-ui, Jimu UI, ExB UI, settings components, setting-components, SettingSection, SettingRow, or a themed alternative to Calcite/Bootstrap, including read-only API questions."
license: Internal
---

# jimu-ui Component Library

`jimu-ui` is Experience Builder's themed React component library. Components respect the ExB theme
(light/dark, brand colors, spacing) automatically — **prefer jimu-ui over raw Calcite/Bootstrap/HTML
for anything that should match the app theme.** This skill is a catalog + usage guide grounded in the
installed type definitions.

**Runtime here: ExB 1.20** (React 19). Type defs: `ArcGISExperienceBuilder/client/jimu-ui/`.

## Golden rules

1. **Import basic components from the package root:** `import { Button, Select, Option } from 'jimu-ui'`.
2. **Import advanced components from a subpath:** `import { SettingSection } from 'jimu-ui/advanced/setting-components'`. Never import advanced components from `'jimu-ui'`.
3. **`React` comes from `jimu-core`**, not `'react'`.
4. **The `.d.ts` is the source of truth for props.** Each component's definition lives at `ArcGISExperienceBuilder/client/jimu-ui/lib/components/<name>/*.d.ts` (basic) or `.../jimu-ui/advanced/lib/**` (advanced), with full JSDoc, prop docs, `@default`s, and an `import` snippet. Read it before guessing a prop.
5. **Verify visually in the Storybook** (props, variants, live examples): https://developers.arcgis.com/experience-builder/storybook/ — and the API reference: https://developers.arcgis.com/experience-builder/api-reference/

Start component discovery with `npm run ai:find -- <Component> --area setting` (omit `--area` for runtime
components). It combines barrel-verified Storybook docs/stories, the exact local declaration/export, and
compiler-resolved JSX usages. Use `.ai-context/exb/docs/storybook.tsv` for additional variants and the
referenced `.d.ts` for the contract; Storybook metadata does not define props.

## Reference files (load on demand)

- **[references/component-examples.md](references/component-examples.md)** — copy-ready example usages (with the key props) for the most-used components: buttons, inputs, selection controls, tabs, overlays, feedback, containers.
- **[references/basic-components.md](references/basic-components.md)** — the `jimu-ui/basic/*` components that are NOT in the root barrel (ColorPicker, DatePicker, ItemSelector, Tree/List, QRCode, ImageCrop, CopyButton, GuideComponent, FieldSelector, SqlExpressionRuntime).
- **[references/advanced-setting-components.md](references/advanced-setting-components.md)** — the `jimu-ui/advanced/*` subpaths, and the full **setting-components** catalog used to build widget Settings panels (map/layer pickers, SQL/expression builders, style pickers, etc.).

> For the non-UI framework (managers, data sources, JimuMapView/JSAPI, theme, layouts, testing) use the **`jimu-framework-apis`** skill.

---

## Component catalog (basic — `import { X } from 'jimu-ui'`)

One-liners are from each component's JSDoc. For props + examples see the reference files or the `.d.ts`.

### Buttons & actions
| Component | What it does |
|---|---|
| `Button` | Take actions/make choices with a single tap. Props: `variant` (`contained`/`outlined`/`text`), `color`, `size` (`sm`/`default`/`lg`), `type`, `block`, `disabled`, `icon` via children. |
| `ButtonGroup` / `AdvancedButtonGroup` | Group related buttons; supports `active` selection. |
| `WidgetButton` | Controller-style button for a widget with the "inController" UX. |
| `Link` | Interactive reference to an external or internal resource (prefer over `Button asLink`). |

### Text & numeric inputs
| Component | What it does |
|---|---|
| `TextInput` | Text field for string content. `type`, `allowClear`, `prefix`/`suffix`, `checkValidityOnChange`, `onAcceptValue`, `onPressEnter`. |
| `TextArea` | Multi-line text input. |
| `NumericInput` | Numeric entry with steppers; `precision`, `min`/`max`/`step`, `showHandlers`, `onChange(value)`, `onAcceptValue`. |
| `UrlInput` | Like `TextArea` but validates the entered URL. |
| `TagInput` | Enter and manage a list of tags. |

### Selection controls
| Component | What it does |
|---|---|
| `Select` + `Option` | Choose one option from a list. `value`, `onChange(evt, value)`, `size`, `placeholder`. |
| `MultiSelect` | Select multiple options from a dropdown menu. |
| `AdvancedSelect` | Choose from a list with extras (check-all, tree, filter). |
| `Switch` | Toggle a single setting on/off. `checked`, `onChange`. |
| `Checkbox` | Select one or more items from a set. `checked`, `indeterminate`, `onChange`. |
| `Radio` | Select a single option from a set. |
| `Slider` | Select a number or a range within bounds. |
| `MultiRangeSlider` | Select multiple ranges within a bounded range. |

### Menus & navigation
| Component | What it does |
|---|---|
| `Dropdown`, `DropdownButton`, `DropdownMenu`, `DropdownItem` | Show a list of choices on a temporary popper surface. |
| `Nav`, `NavItem`, `NavLink`, `NavMenu`, `Navbar` | Navigation to internal/external pages, with optional sub-menus. |
| `Tabs`, `Tab` | Explore/switch between views. |
| `Pagination` (+ `PageItem`, `PageLink`, `PageNumber`, `PageJumper`, `PageSelect`, `NavButtonGroup`) | Presentational pagination UI. |

### Containers & layout
| Component | What it does |
|---|---|
| `Card` (+ `CardBody`, `CardHeader`, `CardFooter`) | Content card. |
| `Surface` / `Paper` | Container on an elevated / paper surface. |
| `Collapse` | Content area that collapses and expands (`isOpen`). |
| `Collapsable` (+ `CollapsablePanel`, `CollapsableToggle`, `CollapsableCheckbox`, `CollapsableRadio`) | Collapsible panel with a header control. |
| `Drawer` | Slide-in panel. |
| `Scrollable` | Scroll container with themed scrollbars. |
| `Resizable` / `Draggable` | Resize / drag an element. |
| `MobilePanel` | Mobile bottom-sheet panel. |
| `FloatingPanel` | Draggable floating container. |
| bootstrap: `Container`, `Row`, `Col`, `Form`, `Input`, `ListGroup`, `Table`, `FormGroup`, `InputGroup` | Bootstrap/reactstrap layout primitives (from `jimu-ui`). |

### Feedback & overlays
| Component | What it does |
|---|---|
| `Alert` | Short, important message that attracts attention without interrupting. |
| `AlertPopup` | Prompt message displayed in a modal. |
| `AlertPanel` / `AlertTooltip` / `AlertButton` | Warning-message variants. |
| `Loading` | Show a loading state and disable interactions. |
| `Progress` | Progress bar. |
| `Tooltip` | Informative text on hover/focus/tap. `title`, `placement`, `showArrow`, `enterDelay`. |
| `Popper` | Content adjacent to, but connected with, another element. |
| `Modal` (+ `ModalBody`, `ModalFooter`) | Modal dialog. |
| `Message` | Global notification message. |
| `Notification` (+ `NotificationProvider`, `NotificationContainer`) | Global notification system. |
| `Badge` | Small count/status marker. |

### Display & content
| Component | What it does |
|---|---|
| `Icon` | Display an SVG icon (also PNG/JPG/ICO). |
| `SVG` | Display an SVG icon only. |
| `Label` | Caption for an item in the UI (`for`, `check`, `centric`). |
| `Typography` | Themed text styles. |
| `Image` | Display an image. |
| `ImageViewer` | Display a list of images. |
| `RichTextDisplayer` / `RichDisplayer` | Render the output of the RichTextEditor. |
| `WidgetPlaceholder` | Empty-state shown before the author finishes widget settings. |
| `UserProfile` | User profile menu. |

### Transitions
`Fade`, `Grow`, `Slide`, `Collapse`, `Transition` — animation wrappers for child elements.

---

## Choosing a component

- **Matches the ExB theme automatically?** Use jimu-ui. It's the default for widget UI and Settings.
- **Need a map-adjacent control** (draw toolbar, layer list UI)? Use `jimu-ui/advanced/map` — see the advanced reference.
- **Building a Settings panel?** Use `jimu-ui/advanced/setting-components` (SettingSection/SettingRow + the pickers) — see the advanced reference.
- **Calcite** is also valid for richer panels/accordions (as some repo widgets do), but jimu-ui controls theme more consistently. Don't mix a jimu-ui and Calcite form control for the same field.

## Looking up a component's props

```
ArcGISExperienceBuilder/client/jimu-ui/lib/components/<component>/index.d.ts   # or <component>.d.ts
ArcGISExperienceBuilder/client/jimu-ui/advanced/lib/<area>/**                  # advanced components
```

Each file documents every prop with `@default` and usually an `import` example. When unsure, grep the
OOTB widgets (`ArcGISExperienceBuilder/client/dist/widgets/{arcgis,common}/**`) for a real usage.
