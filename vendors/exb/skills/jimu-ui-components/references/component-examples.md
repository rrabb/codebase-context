# jimu-ui Component Examples

Copy-ready usages grounded in the installed type defs (ExB 1.20). All imports are from `'jimu-ui'`
unless noted. `React` comes from `jimu-core`.

```tsx
import { React } from 'jimu-core'
```

---

## Buttons & links

```tsx
import { Button, ButtonGroup, Link } from 'jimu-ui'

// variant + color + size (preferred over `type`)
<Button variant="contained" color="primary" size="default" onClick={handleClick}>Save</Button>
<Button variant="outlined" color="default">Cancel</Button>
<Button variant="text" color="danger" disabled>Delete</Button>
<Button block>Full width</Button>

// icon button (Icon as child)
<Button icon aria-label="Close"><CloseIcon /></Button>

<ButtonGroup>
  <Button active>Day</Button>
  <Button>Week</Button>
</ButtonGroup>

<Link to="https://example.com" target="_blank">Open docs</Link>
```

`Button` props: `variant` (`contained` | `outlined` | `text`), `color` (theme brand color | `default` | `inherit`),
`size` (`sm` | `default` | `lg`), `type` (`default`/`primary`/…, legacy), `block`, `disabled`, `htmlType`.

---

## Text & numeric inputs

```tsx
import { TextInput, TextArea, NumericInput, UrlInput, TagInput } from 'jimu-ui'

// controlled text; onAcceptValue fires on blur / Enter (good for committing to config)
<TextInput
  value={name}
  placeholder="Layer name"
  allowClear
  prefix={<SearchIcon />}
  onChange={(e) => setName(e.target.value)}
  onAcceptValue={(v) => commit(v)}
/>

<TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />

// numeric with precision + steppers; onChange gives a number, onAcceptValue commits
<NumericInput value={opacity} min={0} max={1} step={0.1} precision={2}
  showHandlers onChange={(v) => setOpacity(v)} onAcceptValue={(v) => commit(v)} />

<UrlInput value={url} onChange={(res) => setUrl(res.value)} />

<TagInput values={tags} onChange={setTags} />
```

---

## Selection controls

```tsx
import { Select, Option, MultiSelect, AdvancedSelect, Switch, Checkbox, Radio, Slider } from 'jimu-ui'

// Select: onChange gives (evt, value)
<Select value={schema} onChange={(e, value) => setSchema(value as string)} placeholder="Choose…" size="sm">
  <Option value="tds">TDS Flat</Option>
  <Option value="mgcp">MGCP</Option>
</Select>

// MultiSelect: values + onClickItem
<MultiSelect
  values={selected}
  items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
  onClickItem={(evt, item, values) => setSelected(values)}
/>

// Switch / Checkbox / Radio: checked + onChange(event, checked). Wrap with <Label> for a caption.
<Switch checked={enabled} onChange={(e, checked) => setEnabled(checked)} />
<Checkbox checked={onlyVisible} onChange={(e, checked) => setOnlyVisible(checked)} />
<Radio name="mode" checked={mode === 'a'} onChange={() => setMode('a')} />

<Slider value={year} min={2000} max={2026} step={1} onChange={(e) => setYear(+e.target.value)} />
```

Use `<Label>` for accessible captions:

```tsx
import { Label, Checkbox } from 'jimu-ui'
<Label check centric><Checkbox checked={v} onChange={(e, c) => setV(c)} /> Show labels</Label>
```

---

## Menus & tabs

```tsx
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from 'jimu-ui'

<Dropdown>
  <DropdownButton>Actions</DropdownButton>
  <DropdownMenu>
    <DropdownItem onClick={onExport}>Export</DropdownItem>
    <DropdownItem divider />
    <DropdownItem onClick={onClear}>Clear</DropdownItem>
  </DropdownMenu>
</Dropdown>
```

```tsx
import { Tabs, Tab } from 'jimu-ui'

// value = selected Tab id; onChange gives the id. Children must be <Tab>.
<Tabs value={active} onChange={setActive} type="underline" fill>
  <Tab id="general" title="General">…</Tab>
  <Tab id="style" title="Style">…</Tab>
</Tabs>
```

```tsx
import { Pagination } from 'jimu-ui'
<Pagination totalPage={totalPages} current={page} onChangePage={setPage} />
```

---

## Containers & layout

```tsx
import { Card, CardHeader, CardBody, CardFooter, Surface, Collapse } from 'jimu-ui'

<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter><Button>OK</Button></CardFooter>
</Card>

<Surface elevation={2}>Elevated content</Surface>

// Collapse: controlled by isOpen
<Button onClick={() => setOpen(!open)}>Toggle</Button>
<Collapse isOpen={open}>Collapsible content</Collapse>
```

Bootstrap grid primitives are re-exported from `jimu-ui`:

```tsx
import { Row, Col } from 'jimu-ui'
<Row><Col xs={6}>left</Col><Col xs={6}>right</Col></Row>
```

---

## Feedback & overlays

```tsx
import { Alert, Loading, LoadingType, Tooltip } from 'jimu-ui'

// Alert: type + text (or children); closable + onClose; withIcon; banner
<Alert type="warning" text="No editable layers found." withIcon closable open={showAlert} onClose={() => setShowAlert(false)} />

// Loading overlay (covers its positioned parent and disables interaction)
<div style={{ position: 'relative' }}>
  {busy && <Loading type={LoadingType.Donut} />}
  {content}
</div>

// Tooltip: title + a single focusable child
<Tooltip title="Zoom to selection" placement="top" showArrow>
  <Button icon aria-label="Zoom"><ZoomIcon /></Button>
</Tooltip>
```

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'jimu-ui'

<Modal isOpen={open} toggle={() => setOpen(false)} centered>
  <ModalHeader toggle={() => setOpen(false)}>Confirm</ModalHeader>
  <ModalBody>Discard changes?</ModalBody>
  <ModalFooter>
    <Button color="danger" onClick={onDiscard}>Discard</Button>
    <Button onClick={() => setOpen(false)}>Cancel</Button>
  </ModalFooter>
</Modal>
```

---

## Display & content

```tsx
import { Icon, Label, Typography, WidgetPlaceholder } from 'jimu-ui'
// jimu-icons are imported individually and passed to Icon or rendered directly:
import DownIcon from 'jimu-icons/outlined/directional/down'

<Icon icon={DownIcon} size={16} />
<Typography variant="body1">Body text</Typography>
<Label>Field name</Label>

// Empty state before the widget is configured (bind a map, pick a data source, etc.)
<WidgetPlaceholder icon={WidgetIcon} widgetId={props.id} message="Select a map" />
```

---

## Notes

- **`onChange` shapes differ by component:** `TextInput`/`TextArea` give a DOM event (`e.target.value`);
  `Select` gives `(evt, value)`; `Switch`/`Checkbox`/`Radio` give `(event, checked)`; `NumericInput`
  gives the parsed `number`. Check the `.d.ts` when unsure.
- **Commit-on-accept:** `TextInput`/`NumericInput` expose `onAcceptValue` (fires on blur / Enter) — ideal
  for writing to widget config so you don't dispatch on every keystroke.
- For the exact, current prop list of any component, open its definition under
  `ArcGISExperienceBuilder/client/jimu-ui/lib/components/<name>/` — every prop has JSDoc + `@default`.
