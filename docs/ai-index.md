<a id="top"></a>

# 🧠 AI Index Guide - How We Made 275 MB of Vendor Code AI-Searchable

> [!IMPORTANT]
> **New here? Read this first.** This repo builds custom [ArcGIS Experience Builder](https://developers.arcgis.com/experience-builder/) (ExB) widgets on top of a huge, read-only Esri/jimu framework. That framework is **not in any AI's training data** and is **too big for VS Code's semantic index**. This guide explains the tooling we built so an AI assistant (GitHub Copilot) can find and cite the right vendor code when it helps you write widgets.

This document is written for someone who has **never seen this project**. It goes from a 30-second summary down to per-file detail. Every section starts with the **question it answers** (blue callout) and ends with a link back to the [master index](#index).

---

## ⏱️ The 30-Second Version

- The authoritative framework source lives under `ArcGISExperienceBuilder/` (~275 MB, gitignored, read-only).
- AI cannot see it: it is not trained on it, and the semantic `#codebase` index skips gitignored folders.
- So we **pre-scan that source into small, grep-friendly `.tsv` indexes** under `.ai-context/exb/`.
- We built the indexes with **two approaches**: a fast **regex** scanner and an accurate **ts-morph** (TypeScript compiler) scanner.
- We wired the AI to use them through **skills** (`.github/skills/`), **instructions** (`.github/instructions/`), a query tool (`npm run ai:find`), and router docs.
- **You mostly do not touch any of this.** You prompt Copilot normally; the skills and instructions steer it to the indexes automatically.

```text
ArcGISExperienceBuilder/   ← 275 MB read-only Esri source (the haystack)
        │  scanned by
        ▼
src/build-ai-*.mjs    ← our scanners (regex + ts-morph)
        │  emit
        ▼
.ai-context/exb/*.tsv      ← tiny grep-friendly indexes (the map)
        │  surfaced to AI by
        ▼
.github/skills + .github/instructions + `npm run ai:find`
        │  used by
        ▼
GitHub Copilot             ← writes grounded, cited widget code
```

[🔝 Jump to the master index ▾](#index)

---

<a id="index"></a>

## 📑 Master Index

> [!NOTE]
> ❓ **"What exists, and where do I look for X?"** This is the home base. Every detailed section links back here.

### 🧩 Artifact map at a glance

| # | Artifact | Kind | What it is | One-line "when to use" |
|---|---|---|---|---|
| 1 | [The problem](#problem) | Concept | Why any of this exists | Read once to understand the "why" |
| 2 | [Two approaches: regex vs ts-morph](#approaches) | Concept | The two scanning strategies + tradeoffs | Deciding which index to trust |
| 3 | [`npm run ai:find`](#aifind) | Tool | One-command API/usage lookup | **Start here** for any jimu/ExB API question |
| 4 | [`src/build-ai-*.mjs`](#scripts) | Scripts | The index generators | Regenerating indexes after a version bump |
| 5 | [`.ai-context/exb/` folders](#aicontext) | Indexes | The generated `.tsv`/`.md` data | Grepping for a symbol, usage, or doc |
| 6 | [Router docs + the formal usage-index spec](#routers) | Docs | Human/AI navigation maps + [§6.1 the written contract](#usage-spec) | Finding which index to grep; defending a coverage claim |
| 7 | [Skills (`.github/skills/`)](#skills) | AI config | Domain playbooks Copilot loads on demand | Automatic; steers AI for ExB tasks |
| 8 | [Instructions (`.github/instructions/`)](#instructions) | AI config | Always-on rules | Automatic; sets guardrails + code style |
| 9 | [Future improvements](#future) | Roadmap | What to add/clean up next | Planning maintenance |
| 10 | [Test Harness](#test-harness) | Test Harness | Run after version or script upgrades to Tes coverage/usage ratio and sample prompts | 
| 11 | [dist-widgets vs dist-widgets-ts](#dist-widgets) | Folders dist-widgets vs dist-widgets-ts | Why keep both? |

### 🗂️ Folder structure of everything AI-related

```text
cpe-exb/
├── readme-ai-index.md              ← YOU ARE HERE (the guide)
│
├── .scripts/                       ← index generators (Node ESM)
│   ├── build-ai-index.mjs          ← [regex] fast scanner  → symbols/dist-widgets/mentions + router docs
│   ├── build-ai-index-ts.mjs       ← [ts-morph] rich scanner → dist-widgets-ts + api/ catalog
│   ├── build-ai-api-catalog.mjs    ← [ts-morph] shared module (canonical API catalog builder)
│   ├── build-ai-doc-index.mjs      ← doc/Storybook navigation scanner → docs/
│   ├── build-ai-usage-index.mjs    ← [ts-morph] usage-graph scanner → api-usage/ + reports/
│   └── ai-find.mjs                 ← the `npm run ai:find` query tool
│
├── .ai-context/exb/                ← ALL generated indexes (grep these, do not read whole)
│   ├── REPOSITORY-MAP.md           ← router: regions + which index to grep
│   ├── README.md                   ← how-to-use for the fast indexes
│   ├── CLIENT-RUNTIME-MAP.md       ← last-resort minified-bundle fallback map
│   ├── symbols.tsv                 ← [regex] framework symbol → file:line
│   ├── reexports.tsv               ← [regex] barrel re-export resolver
│   ├── mentions.tsv                ← [regex] API names named in comments/strings
│   ├── tree.<area>.txt             ← [regex] per-area file listings
│   ├── dist-widgets/               ← [regex] deep index of OOTB widget source
│   ├── dist-widgets-ts/            ← [ts-morph] type-accurate variant of dist-widgets
│   ├── api/                        ← [ts-morph] canonical API catalog (the source of truth)
│   ├── docs/                       ← local doc/API-reference/Storybook navigation
│   ├── api-usage/                  ← [ts-morph] compiler-resolved usage evidence
│   ├── api-usage-fast/             ← lower-confidence import-scoped fallback usages
│   ├── reports/                    ← unresolved candidates (honesty ledger)
│   ├── files.tsv                   ← audit ledger of every file seen
│   └── coverage.tsv                ← coverage ledger (parsed vs skipped)
│
├── .github/skills/                 ← domain playbooks Copilot loads on demand
│   ├── exb-widget-development/     ← build/debug widgets (+ references/)
│   ├── jimu-framework-apis/        ← managers, data sources, map bridge, theme (+ references/)
│   └── jimu-ui-components/         ← jimu-ui component catalog (+ references/)
│
├── .github/instructions/           ← always-on rules (auto-applied by path)
│   ├── exb-source-authority.instructions.md      ← source-of-truth + search workflow
│   ├── exb-widget-development.instructions.md     ← widget golden-path (src/**)
│   ├── esri-skills-always-on.instructions.md      ← keep guidance skills active
│   └── code-style.instructions.md                 ← JS/TS style for authored code
│
└── docs/exb/
    └── EXB-API-USAGE-INDEX-SPEC.md ← formal schema/contract for the usage index
```

---

<a id="problem"></a>

## 1. 🎯 The Problem We Solved

> [!NOTE]
> ❓ **"Why build custom indexes at all - can't the AI just read the code?"**

**No, and here is why.** Three walls stack up:

1. 🧱 **Not in training data.** ExB 1.20 + jimu is niche, versioned Esri code. A model's memory of "how jimu works" is stale or invented. APIs change between releases, so recalled signatures are frequently wrong.
2. 🧱 **Not semantically indexed.** VS Code Copilot's `#codebase` (semantic) search **ignores gitignored folders**, and `ArcGISExperienceBuilder/` is gitignored. So the one tool that would normally find "relevant code by meaning" is blind here.
3. 🧱 **Too big to brute-force.** ~275 MB across hundreds of thousands of files. Grepping the whole tree times out; reading files blindly burns the context window without finding the right precedent.

**The consequence without tooling:** the AI guesses APIs, hallucinates method names, and cannot cite a real example. That is the exact failure mode our source-authority instructions forbid.

**Our fix:** pre-digest the vendor source into **tiny, one-fact-per-line `.tsv` files** the AI can grep in milliseconds, plus **router docs** that tell it which file to grep, plus **skills/instructions** that make it do this automatically. We turn "search 275 MB" into "grep a 200 KB table, then open one file at the exact line."

[🔝 Back to index ▾](#index)

---

<a id="approaches"></a>

## 2. 🧭 Two Approaches: Regex vs ts-morph

> [!NOTE]
> ❓ **"You built the index twice - a regex way and a ts-morph way. Why, and which one do I trust?"**

We deliberately run **two scanners** over the same source. They are complementary, not redundant. Think of it as **fast-and-approximate** versus **slow-and-exact**.

### 🅰️ Approach 1 - Regex scanning (built first)

Plain text pattern-matching over source lines (`src/build-ai-index.mjs`). It finds `export class Foo`, `import { x } from '...'`, `<Component `, etc., with regular expressions.

> [!TIP]
> ✅ **Pros:** Extremely fast (~1s, always fresh). No compiler, no memory pressure. Sees **non-exported** and comment/string content. Great for "where is this name?" and "which widgets render this tag?"
>
> ⚠️ **Cons:** Best-effort. It reads text, not types. It cannot resolve `props: Props` into the real prop shape, cannot follow a re-export to its true origin, and can mis-capture in edge cases (regex literals, template strings). Treat its output as **leads, not gospel**.

### 🅱️ Approach 2 - ts-morph scanning (built second)

Uses [ts-morph](https://ts-morph.com/) to load the code through the **real TypeScript compiler** and its type checker (`src/build-ai-index-ts.mjs` + `build-ai-api-catalog.mjs`). It resolves actual types, real component props, resolved return types, and true import targets.

> [!TIP]
> ✅ **Pros:** Accurate. `props` resolves to `ToolSettingPanelProps`; a field resolves to `ImmutableObject<RowLayoutSetting>`; imports resolve to the real `.d.ts`. This is the **canonical** API truth (`api/`).
>
> ⚠️ **Cons:** Slow (~65s) and memory-hungry (~1.4 GB peak, needs `--max-old-space-size`). Opt-in, so it can be stale if you forget to regenerate.

### ⚖️ When to use which

| You want... | Use | Index |
|---|---|---|
| Fast "where is `Foo` defined?" | Regex | [`symbols.tsv`](.ai-context/exb/symbols.tsv) |
| Which widgets render `<SettingSection>`? | Regex | [`dist-widgets/jsx-usage.tsv`](.ai-context/exb/dist-widgets/jsx-usage.tsv) |
| The **real** props/type of a component | ts-morph | [`dist-widgets-ts/components-props.tsv`](.ai-context/exb/dist-widgets-ts/components-props.tsv) |
| Canonical, verified public API identity | ts-morph | [`api/symbols.tsv`](.ai-context/exb/api/symbols.tsv) + [`api/exports.tsv`](.ai-context/exb/api/exports.tsv) |
| Real usage examples with resolved types | ts-morph | [`api-usage/<package>.tsv`](.ai-context/exb/api-usage/) |
| Everything at once, ranked | Both (merged) | **`npm run ai:find`** |

> [!IMPORTANT]
> 🧭 **Rule of thumb:** start every lookup with **`npm run ai:find`** (it merges both). Drop to raw `.tsv` grep only when you need something the tool did not surface.

[🔝 Back to index ▾](#index)

---

<a id="aifind"></a>

## 3. 🔎 `npm run ai:find` - The Front Door

> [!NOTE]
> ❓ **"I have a jimu/ExB API question. What is the single fastest thing to run?"**

`ai:find` (`src/ai-find.mjs`) is the combined lookup. It ranks and merges: public docs/Storybook, verified declarations/exports, members, representative compiler-resolved usages, and - when evidence is thin - an **escalation** pointing at comments/strings and the minified runtime bundle.

### 💻 Usage

```powershell
npm run ai:find -- <term> [--members] [--usages N] [--source KIND] [--area AREA] [--all] [--semantic] [--brief] [--in SCOPE] [--json]
```

| Flag | What it does |
| --- | --- |
| `--brief` | Confident matches only, one line per fact; other candidates on one line. Text output only. |
| `--in <scope>` | Every usage of the target inside a widget (`common/list`), group (`common`), or folder path, with no sampling. Add `--brief` for one line per file. |

Example: `npm run ai:find -- DataSourceStatus.NotReady --in common/list --brief` lists the 3 List files and their line numbers. JSX attributes such as `onDataSourceInfoChange={...}` count as usages of the Props member. Confirm scoped results with a literal search, because the index covers parsed source only.

### 🗣️ Prompt example (what you type to Copilot)

> "How do I use `DataSourceManager` to get a data source in a widget? Show a real example."

Copilot (guided by the skills) will run:

```powershell
npm run ai:find -- DataSourceManager --members
```

### 📤 Response example (abridged real shape)

```text
jimu-core::DataSourceManager  [class; public-documented; matched]
  exports: jimu-core::DataSourceManager (canonical)
  docs: https://developers.arcgis.com/experience-builder/api-reference/jimu-core/DataSourceManager/  ...
  declaration: ArcGISExperienceBuilder/client/jimu-core/lib/.../data-source-manager.d.ts:NN  class
  members: getInstance, createDataSource, getDataSource, ...
  usages: behavioral=42 bindings=110 files=63 owners=31
  ootb-widget/runtime: .../widgets/common/list/src/runtime/widget.tsx:NN  instance-call  owner=common/list
```

When a symbol is **thin** (declared but no meaning attached), `ai:find` prints an escalation block:

```text
! Thin local evidence. This symbol has a declaration but little meaning attached. Escalate:
  1) Named in readable source comments/strings (open these - the wrapper is often nearby):
       .../widgets/common/text/src/runtime/widget.tsx:197  [comment common/text]
  2) Trace the runtime bundle (see .ai-context/exb/CLIENT-RUNTIME-MAP.md):
       ArcGISExperienceBuilder/client/dist/jimu-core/index.js
```

### ⚙️ How it works (workflow)

- Parses CLI flags (`--members`, `--usages N`, `--source`, `--area`, `--json`) and joins remaining args into the query string.
- Loads 9 index files in parallel: `api/symbols.tsv`, `api/declarations.tsv`, `api/exports.tsv`, `api-usage/summary.tsv`, `docs/api-reference.tsv`, `docs/storybook.tsv`, `docs/routes.tsv`, `docs/packages.tsv`, `mentions.tsv`.
- Scores every top-level `api/symbols.tsv` row by text match (exact/prefix/contains/all-terms) plus a **visibility bonus** (public-documented ranks above internal-tagged ranks above not-exported), then keeps the top 12.
- Falls back to scoring **member** rows (methods/props) if no top-level symbol scored above its own visibility floor.
- Pulls every child member of the matched symbols and reads their compiler-resolved usage rows from `api-usage/<package>.tsv`.
- Picks a **diverse** usage sample per symbol - up to 2 sdk-sample + 4 ootb-widget + 2 framework-test + 2 framework-internal rows, then fills any remaining slots - so the printed examples aren't all from one widget.
- Cross-references `docs/api-reference.tsv` and `docs/storybook.tsv` for that exact `api_id` (docs summary, canonical URL, Storybook docs/story entries).
- Also searches `docs/packages.tsv` and `docs/routes.tsv` for capability-level matches not tied to one symbol ("related documentation").
- Decides if evidence is **thin** (no docs, no storybook, zero behavioral usages). If thin: looks up the query in `mentions.tsv`, maps the top symbol's package to one runtime bundle (`runtimeBundleFor`), flags whether it is an app-action, and builds an **escalation** block.
- Prints either human-readable text (with the escalation banner) or the full JSON payload (`--json`), including the `escalation` object for tooling.

### 🕐 When to use

- **Always first**, for any jimu/ExB/Calcite API or capability question.
- Add `--members` for a class/manager's methods; `--usages 10` for more examples; `--json` for machine parsing.

[🔝 Back to index ▾](#index)

---

<a id="scripts"></a>

## 4. 🛠️ The Scripts (`src/build-ai-*.mjs`)

> [!NOTE]
> ❓ **"Where does all this generated data come from, and how do I rebuild it after `npm run setup` bumps the ExB version?"**

Five scripts (plus one shared module). Each owns a slice of `.ai-context/exb/`. All are Node ESM, run via npm scripts.

### 📜 Script catalog

| npm script | File | Approach | Emits | Speed |
|---|---|---|---|---|
| `ai:index` | `build-ai-index.mjs` | Regex | `symbols.tsv`, `reexports.tsv`, `mentions.tsv`, `tree.*.txt`, `dist-widgets/`, `REPOSITORY-MAP.md`, `README.md`, `CLIENT-RUNTIME-MAP.md` | ~seconds |
| `ai:index:docs` | `build-ai-doc-index.mjs` | HTML/JSON parse | `docs/*.tsv` | ~seconds |
| `ai:index:rich` | `build-ai-index-ts.mjs` | ts-morph | `dist-widgets-ts/`, `api/` | ~65s |
| `ai:index:usages` | `build-ai-usage-index.mjs` | ts-morph | `api-usage/`, `api-usage-fast/`, `reports/`, `files.tsv`, `coverage.tsv` | ~minutes |
| `ai:find` | `ai-find.mjs` | Reader | (queries the above) | instant |
| _(module)_ | `build-ai-api-catalog.mjs` | ts-morph | shared by `rich` + `usages` (builds `api/`) | n/a |

### 🔁 Regeneration order (after a version bump)

```powershell
npm run ai:index          # 1. fast source indexes + router docs (also the base symbols)
npm run ai:index:docs     # 2. local documentation / Storybook navigation
npm run ai:index:rich     # 3. ts-morph: dist-widgets-ts + canonical api/  (needs api/ before usages)
npm run ai:index:usages   # 4. ts-morph: usage graph + coverage (depends on api/)
```

> [!WARNING]
> ⚠️ **Order matters for the ts-morph pair.** `ai:index:usages` reads the `api/` catalog produced by `ai:index:rich`. Run `rich` before `usages`. The fast `ai:index` intentionally **preserves** the independently generated subtrees (`api`, `api-usage`, `docs`, `dist-widgets-ts`, `reports`, `files.tsv`, `coverage.tsv`) so scripts do not clobber each other.

### 🕐 When to use

- After `npm run setup -- <ver>` changes the installed ExB version (indexes are version-specific).
- After you notice an index looks stale versus the vendor source.
- You do **not** rerun these for normal widget work; the committed indexes are enough day to day.

### 🔬 Per-script workflow (what each one actually does, step by step)

<details open>
<summary><b>🔵 <code>build-ai-index.mjs</code> - <code>npm run ai:index</code> (regex, fast)</summary>

1. Ensures `.ai-context/exb/` exists, then deletes everything in it **except** the `PRESERVED_OUTPUTS` set (`api`, `api-usage`, `api-usage-fast`, `dist-widgets-ts`, `docs`, `reports`, `files.tsv`, `coverage.tsv`) so it never clobbers the ts-morph outputs.
2. Walks each entry in `AREAS` (`jimu-arcgis`, `jimu-core`, `jimu-data-source`, `jimu-for-builder`, `jimu-for-test`, `jimu-icons`, `jimu-layouts`, `jimu-theme`, `jimu-ui`, `client-types`, `sdk-resources`, `dist-widgets`), skipping `node_modules`/`chunks`/`.git` and every localization path/extension.
3. For **`symbols: true`** areas: scans each parseable file line-by-line with regex for `export class/interface/type/enum/function/const/...` declarations and `export * from` / `export { } from` barrels → accumulates into `symbols.tsv` / `reexports.tsv`.
4. For the **`detailed: true`** area (`dist-widgets`): does a deeper per-line scan (brace-depth tracking) to also capture components (+ guessed props), hooks, classes, methods (+ params), interface/class fields, imports (aggregated per module), and JSX/tag usage - all tagged with `group`/`widget` columns.
5. Builds two **reverse indexes** from that same widget pass: `module-usage.tsv` (who imports a module) and `jsx-usage.tsv` (who renders a component/tag) - so "find me an example" is a single grep.
6. Reads every `manifest.json` under `dist/widgets` and digests identity, dependencies, publish/message/data actions, layouts, properties, and extensions into `manifests.tsv`.
7. Builds `mentions.tsv`: re-scans comments and string literals of the same readable source for any collected symbol name (≥5 chars), keeping only names that appear in ≤12 files (rarity filter to drop generic words like `Config`/`Props`).
8. Writes `tree.<area>.txt` per-area file listings, then generates the three router docs (`REPOSITORY-MAP.md`, `README.md`, `CLIENT-RUNTIME-MAP.md`) and `dist-widgets/README.md` from templates baked into the script.
9. Prints per-area file/symbol counts and the mention/row totals to the console.
</details>

<details>
<summary><b>🟡 <code>build-ai-doc-index.mjs</code> - <code>npm run ai:index:docs</code> (local docs/Storybook navigation)</summary>

1. Confirms every required input exists under `ArcGISExperienceBuilder/exb-api-ref-docs/` (`flisting.htm`, `experience-builder.xrefs.json`, `api-reference/index.html`, `storybook/index.json`, `storybook/project.json`) and `version.json`.
2. Parses ExB/docs/Storybook version strings and **throws if they don't all match** - a hard guard against indexing a docs export for the wrong ExB version.
3. Extracts every `<a href>` in `flisting.htm` into a route list, classifies each route's category (`api-reference`/`sample-code`/`guide`) and kind (`container`/`topic`/`symbol`/`sample`/`asset-subtree`).
4. For each route, opens the matching local HTML (when present) to pull a title, summary paragraph, and canonical `og:url`/`version` meta tag → `routes.tsv`.
5. Parses the API reference index table into the 6 documented jimu packages → `packages.tsv`.
6. For every `api-reference` **symbol** route, parses member anchors (`<h2-4 id=...>`) and captures a summary → `api-reference.tsv`.
7. Walks `sdk-resources/widgets/**` for `manifest.json` files, then matches each `sample-code` doc route to its real local sample folder (exact / ambiguous / docs-only / sdk-only) → `sample-code-map.tsv`.
8. Parses Storybook's `index.json` entries and **verifies** each component is actually exported from its candidate barrel file (`barrelExportsName`, following re-exports) before accepting it → `storybook.tsv`; anything that fails verification goes to `storybook-unresolved.tsv` instead of being silently dropped.
9. Runs sanity assertions on expected row counts (49 sample-code / 161 guide / 345 api-reference routes, 6 packages, known symbols/components present) - fails loudly if the vendor docs export changed shape.
</details>

<details>
<summary><b>🟣 <code>build-ai-api-catalog.mjs</code> - shared module (not run directly; imported by the two scripts below)</summary>

1. Defines the glob patterns for the 8 `jimu-*` packages + `client/types` ambient declarations (`apiCatalogGlobs`), and filters a ts-morph project's files down to eligible package source (`eligibleApiSourceFiles`; drops tests/i18n/icons/chunks).
2. For each package **entrypoint** (its public barrel `.d.ts`), walks `getExportedDeclarations()` to learn, for every export name, which declaration(s) it resolves to - this is how a barrel re-export gets linked back to its real implementation.
3. Registers every top-level declaration under a **canonical `api_id`** (e.g. `jimu-core::WidgetManager`), preferring the export path that Storybook/docs already reference; unexported declarations get a deterministic fallback id.
4. Classifies each symbol's `kind` (class/interface/function/hook/react-component/enum/type/variable) and `visibility` (`public-documented` → `public-storybook` → `public-declared-undocumented` → `internal-tagged` → `not-exported` → `implementation-private`) using JSDoc `@deprecated`/`@internal` tags plus the docs/Storybook id sets.
5. Walks class/interface/enum **members** and registers each as a child `api_id` (`Parent#method` for instance, `Parent.member` for static/enum) with its own accessibility and visibility.
6. Resolves declaration **relations** (`extends`/`implements`/`type-alias-target`/`member-type`) between registered symbols, deduplicated by (from, kind, to, location).
7. Backfills any doc-only or Storybook-only symbol that has no matching declaration, so the catalog still carries a row for it (`match_status = docs-only` / `storybook-only`).
8. Runs a **regression guard**: asserts 5 known-good API ids (`WidgetManager.getInstance`, `DataSourceManager#getDataSource`, `JimuMapViewComponent`, `JimuLayerViewSelectorDropdown`, `SettingSection`) are present, or throws.
9. Writes `symbols.tsv`, `declarations.tsv`, `exports.tsv`, `relations.tsv`, and a `METADATA.tsv` version/status stamp into `api/`.
</details>

<details>
<summary><b>🟣 <code>build-ai-index-ts.mjs</code> - <code>npm run ai:index:rich</code> (ts-morph, type-accurate)</summary>

1. Loads the client `tsconfig.json` once into a single ts-morph `Project` (pays the ~15s compiler warmup **once**, not per widget group - the earlier per-group pilot was abandoned for this reason).
2. Adds the shared API-catalog source files plus every `.ts`/`.tsx` file under `dist/widgets/<group>` for the requested group (or all groups if none given), excluding locale paths.
3. Extracts, per file, functions/variable statements/classes/interfaces/type aliases/enums using the **real checker** - not text regex.
4. Classifies **components** by resolved return type (`JSX.Element`/`ReactElement`/...) or `use*` naming for hooks, across all authoring forms (plain function, arrow const, `forwardRef`, `memo`, class `Component<Props>`).
5. For every detected component, resolves its **actual props type** and expands each property into `components-props.tsv` (name, optional flag, resolved type, JSDoc) - impossible with regex.
6. Resolves class/interface **field** types and method/function **signatures** through the checker, so generics resolve to their real instantiation (e.g. `ImmutableObject<RowLayoutSetting>` instead of the as-written alias).
7. Resolves every **import's target file** (`resolvedTarget`) by following the module specifier through the compiler's module resolution, including deep relative paths.
8. Writes `dist-widgets-ts/{symbols,components,components-props,hooks,functions,classes,methods,fields,imports,reexports}.tsv` + a generated `README.md`.
9. Calls `buildCanonicalApiCatalog(...)` to (re)build `api/` from the same warmed-up project, then prints file/symbol/component/prop counts and elapsed time/heap usage.
</details>

<details>
<summary><b>🟣 <code>build-ai-usage-index.mjs</code> - <code>npm run ai:index:usages</code> (ts-morph, usage graph)</summary>

1. Reads `api/symbols.tsv`, `api/declarations.tsv`, `api/exports.tsv` - **fails immediately** if any are missing/empty (this is why `ai:index:rich` must run first).
2. Builds three lookup maps: declaration-locator → `api_id`, `(module, export name)` → `api_id`, `(parent api_id, member name)` → `api_id`.
3. Loads a ts-morph project over `dist/widgets/**`, `sdk-resources/**`, and `jimu-*/**` source (excluding `jimu-icons`, tests, locale files, binaries, and already-superseded compiled `.js` where a `.ts`/`.tsx` twin exists).
4. Per file, resolves each `import { X } from 'jimu-*'` to a catalog `api_id` via the export map (`importContext`), recording anything that doesn't resolve as an **unresolved candidate** instead of silently dropping it.
5. Walks every identifier in the file, resolves its **symbol** back to a cataloged declaration (follows aliases/re-exports), then classifies the **syntactic role** of that reference: `import`/`export`/`jsx-component`/`jsx-prop`/`constructor-call`/`static-call`/`instance-call`/`hook-call`/`function-call`/`property-read`/`property-write`/`type-reference`/`extension`/`implementation`/`enum-member`/`decorator`/`bare-reference`.
6. For property accesses, also resolves the **receiver's** type/`api_id` (e.g. "this `.getDataSource` call is on a `DataSourceManager`") and records the JSX host component for prop usages.
7. Runs a second, cheaper **import-scoped-only** pass (no full-file symbol resolution) as a lower-confidence fallback signal, written to a **separate** `api-usage-fast/` tree so it never inflates the canonical counts.
8. Writes per-package usage tables under `api-usage/` (auto-chunked at 10 MB) + `summary.tsv` aggregates, and unresolved candidates to `reports/unresolved-usages.tsv` / `reports/unresolved-summary.tsv`.
9. Independently walks the filesystem a second time (not just the ts-morph project) to build a **file-level audit ledger** - every file seen, its hash, and whether it was parsed or excluded-and-why → `files.tsv`, aggregated per source root into `coverage.tsv`.
10. Throws if the canonical usage pass produced **zero rows** (sanity guard against a silent regression).
</details>

[🔝 Back to index ▾](#index)

---

<a id="aicontext"></a>

## 5. 📚 The `.ai-context/exb/` Folders (Deep Dive)

> [!NOTE]
> ❓ **"What is every folder under `.ai-context/exb/` for, why do we need it, and is any of it redundant?"**

This is the payload - the generated map of the vendor haystack. Everything here is **grep-first**: one fact per line, meant to be searched, never read whole. Below, each entry explains **what**, **why we need it**, and **redundancy/future** notes. Full column-by-column schemas for every `.tsv` file are in **[§5.9 TSV Schema Reference](#schema-reference)** near the end of this section. The formal usage-index contract (ownership, exclusions, completeness rules) lives in [`docs/exb/EXB-API-USAGE-INDEX-SPEC.md`](docs/exb/EXB-API-USAGE-INDEX-SPEC.md).

### 📁 5.1 - Top-level fast-index files (regex)

<details open>
<summary><b>🔵 <a href=".ai-context/exb/symbols.tsv"><code>symbols.tsv</code></a> - framework symbol → file:line</b></summary>

- **What:** `name  kind  area  path  line` for every top-level export/declaration across `jimu-*` + `sdk-resources`.
- **Why:** the fastest "where is `JimuMapView` defined?" lookup, including non-exported names.
- **Schema:** `name` (symbol identifier) · `kind` (`class`/`interface`/`type`/`enum`/`function`/`const`/`let`/`var`/`namespace`) · `area` (one of the 11 top-level areas) · `path` (repo-relative) · `line` (1-based).
- **File:** [`.ai-context/exb/symbols.tsv`](.ai-context/exb/symbols.tsv)
- **Redundant?** Overlaps `api/symbols.tsv` (which is authoritative). Kept because it is instant, always fresh, and covers non-exported names the canonical catalog scopes out. Candidate to slim once `api/` fully proven.
</details>

<details>
<summary><b>🔵 <a href=".ai-context/exb/reexports.tsv"><code>reexports.tsv</code></a> - barrel resolver</b></summary>

- **What:** resolves `export * / { }` barrels to their target module.
- **Why:** jimu uses deep barrels; this tells you where a re-exported name actually lives.
- **Schema:** `area` · `path` · `line` · `kind` (`star` or `named`) · `exported` (name, or `*` for a star re-export) · `from` (module specifier).
- **File:** [`.ai-context/exb/reexports.tsv`](.ai-context/exb/reexports.tsv)
- **Redundant?** No. ts-morph resolves this internally, but this is the fast text-level answer.
</details>

<details>
<summary><b>🔵 <a href=".ai-context/exb/mentions.tsv"><code>mentions.tsv</code></a> - API names in comments/strings</b></summary>

- **What:** `name  kind  area  group  widget  path  line` for framework API names that appear in **comments and string literals** of readable source (rare-mention filtered to skip generic names).
- **Why:** the usage graph only sees code references. Undocumented internals are often **named in a comment beside the public wrapper that dispatches them** - that is exactly how the `widgetMutableStatePropChange` behavior was decoded. This index fills that gap.
- **Schema:** `name` · `kind` (`comment` or `string`) · `area` · `group`/`widget` (empty outside `dist-widgets`) · `path` · `line`.
- **File:** [`.ai-context/exb/mentions.tsv`](.ai-context/exb/mentions.tsv)
- **Redundant?** No. Unique signal source; nothing else captures prose.
</details>

<details>
<summary><b>🔵 <code>tree.&lt;area&gt;.txt</code> - per-area file listings</b></summary>

- **What:** repo-relative file lists per area, e.g. [`tree.jimu-core.txt`](.ai-context/exb/tree.jimu-core.txt), [`tree.sdk-resources.txt`](.ai-context/exb/tree.sdk-resources.txt), [`tree.dist-widgets.txt`](.ai-context/exb/tree.dist-widgets.txt) (one per area).
- **Why:** browse an area's shape without a directory walk.
- **Redundant?** Mild. Convenience for humans/AI; low cost to keep.
</details>

### 📁 5.2 - `dist-widgets/` (regex deep index of OOTB widgets)

> The single most valuable grounding set: readable `.ts/.tsx` from every out-of-the-box Esri widget, indexed by capability. Every row carries `group`/`widget` columns so you can scope a grep to one widget. Full write-up: [`dist-widgets/README.md`](.ai-context/exb/dist-widgets/README.md) (generated).

<details open>
<summary><b>🟢 Files in <code>dist-widgets/</code></b></summary>

| File | Columns | What it answers |
|---|---|---|
| [`catalog.tsv`](.ai-context/exb/dist-widgets/catalog.tsv) | `group  widget  label  exbVersion  dependencies  components  hooks  classes  symbols` | Per-widget overview (label, deps, code counts) |
| [`components.tsv`](.ai-context/exb/dist-widgets/components.tsv) | `name  form  exported  props  group  widget  path  line` | React components + guessed props type (`form` = function\|arrow\|memo\|forwardRef\|fc\|class) |
| [`hooks.tsv`](.ai-context/exb/dist-widgets/hooks.tsv) | `name  exported  group  widget  path  line` | Custom hooks |
| [`functions.tsv`](.ai-context/exb/dist-widgets/functions.tsv) | `name  exported  params  group  widget  path  line` | Functions + param lists |
| [`classes.tsv`](.ai-context/exb/dist-widgets/classes.tsv) | `name  extends  implements  exported  group  widget  path  line` | Classes |
| [`methods.tsv`](.ai-context/exb/dist-widgets/methods.tsv) | `class  method  modifiers  params  group  widget  path  line` | Method signatures (+params) |
| [`fields.tsv`](.ai-context/exb/dist-widgets/fields.tsv) | `owner  field  optional  type  group  widget  path  line` | Interface/class member fields |
| [`symbols.tsv`](.ai-context/exb/dist-widgets/symbols.tsv) | `name  kind  exported  group  widget  path  line` | All top-level symbols (incl. non-exported) |
| [`imports.tsv`](.ai-context/exb/dist-widgets/imports.tsv) | `module  names  kind  group  widget  path` | Per-file imports (`kind`: default\|named\|namespace\|side-effect, `type-` prefix = `import type`) |
| [`module-usage.tsv`](.ai-context/exb/dist-widgets/module-usage.tsv) | `module  files  widgets  widget_names` | **Which widgets import a module** (= find examples) |
| [`jsx-usage.tsv`](.ai-context/exb/dist-widgets/jsx-usage.tsv) | `tag  files  widgets  widget_names` | **Which widgets render a component/tag** (= find examples) |
| [`manifests.tsv`](.ai-context/exb/dist-widgets/manifests.tsv) | `group  widget  name  label  version  exbVersion  dependency  publishMessages  messageActions  dataActions  layouts  properties  extensions  path` | Per-widget manifest digest |
| [`reexports.tsv`](.ai-context/exb/dist-widgets/reexports.tsv) | `exported  kind  from  group  widget  path  line` | Widget-local re-exports |

- **Why we need it:** our golden rule is "find the OOTB widget that already does this and read its source." These tables make that a one-grep operation.
- **Redundant?** Superseded in accuracy by `dist-widgets-ts/`, but kept as the fast, always-fresh default (~1s, no ts-morph needed).
</details>

### 📁 5.3 - `dist-widgets-ts/` (ts-morph, type-accurate)

<details>
<summary><b>🟣 Type-accurate variant of <code>dist-widgets/</code></b></summary>

- **What:** same idea as `dist-widgets/`, but built with the real checker, so type-bearing columns hold **resolved** types, plus a new `components-props.tsv` (per-prop name/type/optional/jsdoc) and each import's `resolvedTarget` file.

| File | Columns (extra vs regex variant in **bold**) |
|---|---|
| [`symbols.tsv`](.ai-context/exb/dist-widgets-ts/symbols.tsv) | `name  kind  exported  type  group  widget  path  line` |
| [`components.tsv`](.ai-context/exb/dist-widgets-ts/components.tsv) | `name  form  exported  props  jsdoc  group  widget  path  line` (props = **resolved** type) |
| [`components-props.tsv`](.ai-context/exb/dist-widgets-ts/components-props.tsv) | **new:** `component  prop  optional  type  jsdoc  group  widget  path  line` |
| [`hooks.tsv`](.ai-context/exb/dist-widgets-ts/hooks.tsv) / [`functions.tsv`](.ai-context/exb/dist-widgets-ts/functions.tsv) | `name  exported  params  returns  group  widget  path  line` (**resolved** return type) |
| [`classes.tsv`](.ai-context/exb/dist-widgets-ts/classes.tsv) | `name  extends  implements  exported  group  widget  path  line` |
| [`methods.tsv`](.ai-context/exb/dist-widgets-ts/methods.tsv) | `class  method  modifiers  params  returns  group  widget  path  line` |
| [`fields.tsv`](.ai-context/exb/dist-widgets-ts/fields.tsv) | `owner  field  optional  type  jsdoc  group  widget  path  line` (**resolved** type, e.g. `ImmutableObject<T>`) |
| [`imports.tsv`](.ai-context/exb/dist-widgets-ts/imports.tsv) | `module  names  kind  group  widget  path  resolvedTarget` (**new** last column = real target file) |
| [`reexports.tsv`](.ai-context/exb/dist-widgets-ts/reexports.tsv) | `exported  kind  from  group  widget  path  line` |

- **Why:** the killer feature - real component prop shapes (`layoutSetting: ImmutableObject<RowLayoutSetting>`) that regex can only guess.
- **Redundant with `dist-widgets/`?** Intentional parallel, now at file parity (`dist-widgets-ts/` also emits `catalog.tsv`, `manifests.tsv`, `module-usage.tsv`, and `jsx-usage.tsv`). `dist-widgets/` = fast, dependency-free default; `dist-widgets-ts/` = accurate opt-in. Both are kept: the regex variant stays the always-fresh fallback and diff cross-check, so neither is retired.
</details>

### 📁 5.4 - `api/` (ts-morph canonical API catalog)

<details open>
<summary><b>🟣 The source of truth for public jimu API</b></summary>

| File | Columns | What it is |
|---|---|---|
| [`symbols.tsv`](.ai-context/exb/api/symbols.tsv) | `api_id  package  module_path  name  kind  parent_api_id  member_name  static  optional  accessibility  visibility  match_status  deprecated  deprecation_message` | Stable API/member identities, kinds, parents, visibility, match status |
| [`declarations.tsv`](.ai-context/exb/api/declarations.tsv) | `api_id  overload_index  merge_index  path  start_line  start_column  end_line  end_column  containing_symbol  declaration_kind` | Exact declaration locators (path:line, overload-aware) |
| [`exports.tsv`](.ai-context/exb/api/exports.tsv) | `api_id  export_module  export_name  export_kind  canonical  source_path  source_line` | Verified import surfaces (which barrel exports it, canonical flag) |
| [`relations.tsv`](.ai-context/exb/api/relations.tsv) | `from_api_id  relation_kind  to_api_id  path  line  resolved` | Resolved declaration relationships (`extends`/`implements`/`type-alias-target`/`member-type`) |
| [`METADATA.tsv`](.ai-context/exb/api/METADATA.tsv) | `key  value` | Schema/version stamps (exb_version, generated_at, status, command) |

- **Why we need it:** gives every API a **stable identity** (e.g. `jimu-core::WidgetManager#getWidgetClass`) that the docs index and usage index both key on. This is what makes "docs + declaration + usages" join together in `ai:find`.
- **Redundant?** No - this is the backbone. `symbols.tsv` (top-level regex) is the only overlap, and that one stays for speed + non-exported coverage.
</details>

### 📁 5.5 - `docs/` (documentation navigation)

<details>
<summary><b>🟡 Local doc / API-reference / Storybook routing</b></summary>

| File | Columns | What it is |
|---|---|---|
| [`routes.tsv`](.ai-context/exb/docs/routes.tsv) | `route  category  route_kind  package  slug  title  xref_id  doc_version  local_path  canonical_url  exists` | Local guide/API/sample routes |
| [`api-reference.tsv`](.ai-context/exb/docs/api-reference.tsv) | `api_id  package  symbol  member  kind  doc_version  local_path  canonical_url  anchor  summary` | API reference pages + member anchors |
| [`packages.tsv`](.ai-context/exb/docs/packages.tsv) | `package  purpose  key_symbols  doc_version  local_path  canonical_url` | The 6 documented jimu packages + purpose |
| [`storybook.tsv`](.ai-context/exb/docs/storybook.tsv) | `api_id  component  entrypoint  title_path  story_id  story_name  story_type  tags  story_source_path  component_path  doc_version  local_url  canonical_url` | Barrel-verified Storybook component entries (props/variants) |
| [`storybook-unresolved.tsv`](.ai-context/exb/docs/storybook-unresolved.tsv) | `component  candidate_entrypoint  title_path  story_id  reason` | Storybook components not exported from the candidate barrel (honesty) |
| [`sample-code-map.tsv`](.ai-context/exb/docs/sample-code-map.tsv) | `route  sample_slug  category  local_doc_path  sdk_source_path  sdk_manifest_version  match_status` | Maps doc sample routes ↔ local `sdk-resources` widgets |

- **Why we need it:** links an API to its **public intent and examples** (official docs + Storybook), and to runnable SDK samples, without leaving the workspace.
- **Redundant?** No. It indexes navigation metadata only (not page bodies), so it stays small.
</details>

### 📁 5.6 - `api-usage/` + `api-usage-fast/` + `reports/`

<details>
<summary><b>🟣 Usage evidence (who really calls this API) + honesty ledger</b></summary>

- **[`api-usage/<package>.tsv`](.ai-context/exb/api-usage/)** (same schema as [`api-usage-fast/<package>.tsv`](.ai-context/exb/api-usage-fast/)) - **compiler-resolved** static references to cataloged APIs (import, call, jsx, extends, ...), split per package (auto-chunked at 10 MB, e.g. [`jimu-core.tsv`](.ai-context/exb/api-usage/jimu-core-01.tsv)), with [`summary.tsv`](.ai-context/exb/api-usage/summary.tsv) aggregating counts. This is the trustworthy "real examples" layer.

| File | Columns |
|---|---|
| `<package>.tsv` (both folders) | `api_id  name  usage_kind  source_root  source_kind  owner  framework_area  path  start_line  start_column  end_line  end_column  containing_symbol  receiver_api_id  receiver_type  receiver_type_truncated  component_api_id  imported_as  module_path  resolved_overload_index` |
| [`summary.tsv`](.ai-context/exb/api-usage/summary.tsv) (both folders) | `api_id  behavioral_usages  binding_usages  files  owners  sdk_usages  ootb_usages  test_usages  top_owners` |

- `usage_kind` is one of: `import` / `export` · `jsx-component` / `jsx-prop` · `constructor-call` / `static-call` / `instance-call` / `hook-call` / `function-call` · `property-read` / `property-write` · `type-reference` · `extension` / `implementation` · `enum-member` · `decorator` · `bare-reference`.
- `source_kind` (= `owner` grouping) is one of `sdk-sample`, `ootb-widget`, `framework-internal`, `framework-test`.
- **[`api-usage-fast/`](.ai-context/exb/api-usage-fast/)** - a **lower-confidence**, import-scoped fallback (no full identifier-resolution pass). Deliberately kept **separate and never merged** into canonical totals, so a weak signal never inflates a strong claim.
- **[`reports/unresolved-*.tsv`](.ai-context/exb/reports/)** - candidates the resolver could **not** confidently match (dynamic access, unresolved literals). Review these **before** claiming source-wide coverage.

| File | Columns |
|---|---|
| [`reports/unresolved-usages.tsv`](.ai-context/exb/reports/unresolved-usages.tsv) | `candidate_module  candidate_name  syntax_kind  reason  source_root  owner  path  line  column` |
| [`reports/unresolved-summary.tsv`](.ai-context/exb/reports/unresolved-summary.tsv) | `reason  candidate_module  candidate_name  occurrences` |

- **Why we need it:** lets the AI cite "used 42 times across 31 widgets, here are 4" instead of guessing. The split + reports encode intellectual honesty about coverage. See the full contract in **[§6.1 below](#usage-spec)**.
- **Redundant?** No. `fast` and `reports` exist precisely to keep the canonical set clean and auditable.
</details>

### 📁 5.7 - `files.tsv` + `coverage.tsv` (audit ledgers)

<details>
<summary><b>⚪ Proof of what was and was not scanned</b></summary>

- **[`files.tsv`](.ai-context/exb/files.tsv)** - every file seen: path, size, lines, sha256, parsed/excluded + reason. Columns: `path  area  kind  bytes  lines  sha256  excluded  exclusion_reason  parsed`.
- **[`coverage.tsv`](.ai-context/exb/coverage.tsv)** - parsed vs skipped counts per source root. Columns: `source_root  owner  files_seen  files_parsed  files_skipped  symbols  usages  status  errors`.
- **Why we need it:** so any completeness claim ("we searched all of jimu-core") is backed by a ledger, not a vibe. Directly supports the instruction rule *"do not claim to have searched the whole vendor repo unless an index demonstrates coverage."*
- **Note:** these two are only produced by `npm run ai:index:usages` - if you've only ever run the fast `ai:index`, they won't exist yet.
- **Redundant?** No, but only consulted when making coverage claims.
</details>

### 📁 5.8 - Router docs (`REPOSITORY-MAP.md`, `README.md`, `CLIENT-RUNTIME-MAP.md`)

See the dedicated [router docs section](#routers) - these are the human/AI entry points into everything above. Direct links: [`REPOSITORY-MAP.md`](.ai-context/exb/REPOSITORY-MAP.md) · [`README.md`](.ai-context/exb/README.md) · [`CLIENT-RUNTIME-MAP.md`](.ai-context/exb/CLIENT-RUNTIME-MAP.md) · [`dist-widgets/README.md`](.ai-context/exb/dist-widgets/README.md).

<a id="schema-reference"></a>

### 📐 5.9 - TSV Schema Reference (quick lookup)

> [!TIP]
> 📋 All schemas above, collected in one place for quick scanning. Every file is **tab-separated**, header row first, one fact per line.

| Folder | File | Columns |
|---|---|---|
| *(root)* | [`symbols.tsv`](.ai-context/exb/symbols.tsv) | `name kind area path line` |
| *(root)* | [`reexports.tsv`](.ai-context/exb/reexports.tsv) | `area path line kind exported from` |
| *(root)* | [`mentions.tsv`](.ai-context/exb/mentions.tsv) | `name kind area group widget path line` |
| `dist-widgets/` | [`catalog.tsv`](.ai-context/exb/dist-widgets/catalog.tsv) | `group widget label exbVersion dependencies components hooks classes symbols` |
| `dist-widgets/` | [`components.tsv`](.ai-context/exb/dist-widgets/components.tsv) | `name form exported props group widget path line` |
| `dist-widgets/` | [`hooks.tsv`](.ai-context/exb/dist-widgets/hooks.tsv) / [`functions.tsv`](.ai-context/exb/dist-widgets/functions.tsv) | `name exported params group widget path line` (functions add none extra) |
| `dist-widgets/` | [`classes.tsv`](.ai-context/exb/dist-widgets/classes.tsv) | `name extends implements exported group widget path line` |
| `dist-widgets/` | [`methods.tsv`](.ai-context/exb/dist-widgets/methods.tsv) | `class method modifiers params group widget path line` |
| `dist-widgets/` | [`fields.tsv`](.ai-context/exb/dist-widgets/fields.tsv) | `owner field optional type group widget path line` |
| `dist-widgets/` | [`symbols.tsv`](.ai-context/exb/dist-widgets/symbols.tsv) | `name kind exported group widget path line` |
| `dist-widgets/` | [`imports.tsv`](.ai-context/exb/dist-widgets/imports.tsv) | `module names kind group widget path` |
| `dist-widgets/` | [`module-usage.tsv`](.ai-context/exb/dist-widgets/module-usage.tsv) | `module files widgets widget_names` |
| `dist-widgets/` | [`jsx-usage.tsv`](.ai-context/exb/dist-widgets/jsx-usage.tsv) | `tag files widgets widget_names` |
| `dist-widgets/` | [`manifests.tsv`](.ai-context/exb/dist-widgets/manifests.tsv) | `group widget name label version exbVersion dependency publishMessages messageActions dataActions layouts properties extensions path` |
| `dist-widgets/` | [`reexports.tsv`](.ai-context/exb/dist-widgets/reexports.tsv) | `exported kind from group widget path line` |
| `dist-widgets-ts/` | [`symbols.tsv`](.ai-context/exb/dist-widgets-ts/symbols.tsv) | `name kind exported type group widget path line` |
| `dist-widgets-ts/` | [`components.tsv`](.ai-context/exb/dist-widgets-ts/components.tsv) | `name form exported props jsdoc group widget path line` |
| `dist-widgets-ts/` | [`components-props.tsv`](.ai-context/exb/dist-widgets-ts/components-props.tsv) | `component prop optional type jsdoc group widget path line` |
| `dist-widgets-ts/` | [`hooks.tsv`](.ai-context/exb/dist-widgets-ts/hooks.tsv) / [`functions.tsv`](.ai-context/exb/dist-widgets-ts/functions.tsv) | `name exported params returns group widget path line` |
| `dist-widgets-ts/` | [`classes.tsv`](.ai-context/exb/dist-widgets-ts/classes.tsv) | `name extends implements exported group widget path line` |
| `dist-widgets-ts/` | [`methods.tsv`](.ai-context/exb/dist-widgets-ts/methods.tsv) | `class method modifiers params returns group widget path line` |
| `dist-widgets-ts/` | [`fields.tsv`](.ai-context/exb/dist-widgets-ts/fields.tsv) | `owner field optional type jsdoc group widget path line` |
| `dist-widgets-ts/` | [`imports.tsv`](.ai-context/exb/dist-widgets-ts/imports.tsv) | `module names kind group widget path resolvedTarget` |
| `dist-widgets-ts/` | [`reexports.tsv`](.ai-context/exb/dist-widgets-ts/reexports.tsv) | `exported kind from group widget path line` |
| `api/` | [`symbols.tsv`](.ai-context/exb/api/symbols.tsv) | `api_id package module_path name kind parent_api_id member_name static optional accessibility visibility match_status deprecated deprecation_message` |
| `api/` | [`declarations.tsv`](.ai-context/exb/api/declarations.tsv) | `api_id overload_index merge_index path start_line start_column end_line end_column containing_symbol declaration_kind` |
| `api/` | [`exports.tsv`](.ai-context/exb/api/exports.tsv) | `api_id export_module export_name export_kind canonical source_path source_line` |
| `api/` | [`relations.tsv`](.ai-context/exb/api/relations.tsv) | `from_api_id relation_kind to_api_id path line resolved` |
| `api/` | [`METADATA.tsv`](.ai-context/exb/api/METADATA.tsv) | `key value` |
| `docs/` | [`routes.tsv`](.ai-context/exb/docs/routes.tsv) | `route category route_kind package slug title xref_id doc_version local_path canonical_url exists` |
| `docs/` | [`api-reference.tsv`](.ai-context/exb/docs/api-reference.tsv) | `api_id package symbol member kind doc_version local_path canonical_url anchor summary` |
| `docs/` | [`packages.tsv`](.ai-context/exb/docs/packages.tsv) | `package purpose key_symbols doc_version local_path canonical_url` |
| `docs/` | [`storybook.tsv`](.ai-context/exb/docs/storybook.tsv) | `api_id component entrypoint title_path story_id story_name story_type tags story_source_path component_path doc_version local_url canonical_url` |
| `docs/` | [`storybook-unresolved.tsv`](.ai-context/exb/docs/storybook-unresolved.tsv) | `component candidate_entrypoint title_path story_id reason` |
| `docs/` | [`sample-code-map.tsv`](.ai-context/exb/docs/sample-code-map.tsv) | `route sample_slug category local_doc_path sdk_source_path sdk_manifest_version match_status` |
| [`api-usage/`](.ai-context/exb/api-usage/), [`api-usage-fast/`](.ai-context/exb/api-usage-fast/) | `<package>.tsv` | `api_id name usage_kind source_root source_kind owner framework_area path start_line start_column end_line end_column containing_symbol receiver_api_id receiver_type receiver_type_truncated component_api_id imported_as module_path resolved_overload_index` |
| `api-usage/`, `api-usage-fast/` | `summary.tsv` | `api_id behavioral_usages binding_usages files owners sdk_usages ootb_usages test_usages top_owners` |
| [`reports/`](.ai-context/exb/reports/) | [`unresolved-usages.tsv`](.ai-context/exb/reports/unresolved-usages.tsv) | `candidate_module candidate_name syntax_kind reason source_root owner path line column` |
| `reports/` | [`unresolved-summary.tsv`](.ai-context/exb/reports/unresolved-summary.tsv) | `reason candidate_module candidate_name occurrences` |
| *(root)* | [`files.tsv`](.ai-context/exb/files.tsv) | `path area kind bytes lines sha256 excluded exclusion_reason parsed` |
| *(root)* | [`coverage.tsv`](.ai-context/exb/coverage.tsv) | `source_root owner files_seen files_parsed files_skipped symbols usages status errors` |

[🔝 Back to index ▾](#index)

---

<a id="routers"></a>

## 6. 🗺️ Router Docs - The Entry Points

> [!NOTE]
> ❓ **"Given a question, which index do I actually grep? And what do I do when even the readable source does not explain the behavior?"**

Three generated Markdown files answer exactly that. They are **generated** (do not hand-edit; regenerate with `npm run ai:index`).

### 🧭 [`REPOSITORY-MAP.md`](.ai-context/exb/REPOSITORY-MAP.md) - the master router

- Regions of the vendor source, which index to grep for each, framework version metadata, and the **default lookup strategy** (capability → `ai:find` → docs/api → usages → open file → verify against `.d.ts`).
- **Start here** when you do not know where to look.

### 📖 [`README.md`](.ai-context/exb/README.md) - the fast-index how-to

- Explains each fast index file and the recommended grep for each ("find a symbol → `symbols.tsv`", "resolve a barrel → `reexports.tsv`", etc.).

### 🧨 [`CLIENT-RUNTIME-MAP.md`](.ai-context/exb/CLIENT-RUNTIME-MAP.md) - the last resort

- When declarations + readable OOTB source do **not** explain a behavior, this maps each package to **exactly one minified runtime bundle** to inspect, plus the **stable-anchor technique** (search exported names, enum members, and string literals - not mangled ids).
- **Critical guardrail:** treat findings as generated-runtime, version-specific evidence - never as a supported precedent. Do not broad-search `chunks/` or all bundles.

### 📄 Also see

- [`dist-widgets/README.md`](.ai-context/exb/dist-widgets/README.md) - the recipes for the OOTB widget deep index (§5.2).

### 🗣️ Prompt example

> "The `.d.ts` for `MutableStoreManager` does not explain how `widgetMutableStatePropChange` actually updates state. Trace it."

The AI follows `CLIENT-RUNTIME-MAP.md` to `dist/jimu-core/index.js`, greps the `ActionKeys` string constant + stable enum member, and reports the reducer behavior - without you pointing at a file.

<a id="usage-spec"></a>

### 📜 6.1 - [`docs/exb/EXB-API-USAGE-INDEX-SPEC.md`](docs/exb/EXB-API-USAGE-INDEX-SPEC.md) - the formal contract

> [!NOTE]
> ❓ **"What exactly does the `api/` + `api-usage/` pipeline promise, and what does it explicitly refuse to claim?"**

This is the **written specification** the ts-morph indexers (`build-ai-api-catalog.mjs`, `build-ai-usage-index.mjs`) are built to satisfy - the design contract behind §5.4/§5.6, not generated output itself (hand-maintained, not regenerated). Read it when you need to defend or challenge a completeness claim about the API/usage indexes. Key points:

- **Purpose:** locate authoritative ExB evidence quickly - it explicitly does **not** duplicate vendor implementations, replace the TypeScript language service, or claim runtime-complete usage coverage.
- **Evidence order** (highest first): local `.d.ts` + verified barrels → local SDK samples → readable OOTB widget source → local Jimu implementation source → local docs/guide/Storybook metadata → original source/HTML as last resort. This is the same ranking the [source-authority instructions](.github/instructions/exb-source-authority.instructions.md) enforce for the AI.
- **Stable identities:** defines the exact `api_id` grammar used throughout `api/` and `api-usage/` - top-level (`jimu-core::WidgetManager`), instance member (`#getWidgetClass`), static/enum member (`.getInstance`), and the deterministic fallback id for unexported declarations (`jimu-core@lib/foo::helper`).
- **Output ownership:** states which npm script owns which output subtree, so no two generators fight over the same files (mirrored in our [regeneration order](#scripts) table).
- **Usage scope + exclusions:** precisely defines what counts as eligible code (OOTB `dist/widgets`, `sdk-resources`, in-scope `jimu-*`) and what never contributes evidence (icons, chunks, binaries, source maps, localization, `src/**` project code).
- **Completeness contract (the most important part):** "the usage graph covers statically resolvable references to cataloged declarations in eligible, successfully parsed code files... **never describe it as all runtime usages**." This is the exact honesty rule behind the `api-usage-fast/` split and the `reports/unresolved-*.tsv` files in §5.6.

### 📚 Beyond this guide - other repo docs worth knowing

This guide is scoped to the AI-indexing tooling. For the rest of the project:

| Doc | What it's for |
|---|---|
| [`README.md`](README.md) (repo root) | Human onboarding: prerequisites, setup, dev tips, linting, git sparse-checkout help. |
| [`AGENTS.md`](AGENTS.md) (repo root) | The **other** always-read file for AI agents - environment/commands, build pipeline, widget conventions, and it links to this guide's underlying `.ai-context/exb` index too. |
| [`Build-Deployments.md`](docs/Build-Deployments.md) | The build/export/deploy pipeline (`.scripts/export.mjs`, `updateConfigs.mjs`) - unrelated to AI indexing, but referenced by `AGENTS.md`. |

[🔝 Back to index ▾](#index)

---

<a id="skills"></a>

## 7. 🎓 Skills (`.github/skills/`)

> [!NOTE]
> ❓ **"How does the AI know to use any of this without me telling it every time?"**

Skills are **domain playbooks** Copilot loads **on demand** when your task matches their description. They point the AI at the right indexes, encode version-accurate facts, and carry `references/` files with copy-ready patterns. We authored three ExB skills.

### 🧠 The three ExB skills we built

<details open>
<summary><b>🏗️ <a href=".github/skills/exb-widget-development/SKILL.md"><code>exb-widget-development</code></a> - build/extend/debug widgets</b></summary>

- **Triggers on:** creating/editing a widget (runtime/settings/config/manifest), jimu framework use, `JimuMapView`, `widget.tsx`, `setting.tsx`, `IMConfig`, `__esri`, etc.
- **Gives the AI:** the widget anatomy, build workflow, golden-path rules, the "ground in OOTB source first" rule, runtime instrumentation techniques, and `references/` (OOTB index, SDK sample index, widget patterns, JSAPI integration, editor/calcite flow).
- **Prompt example:** *"Create a widget that draws a graphic where the user clicks the map."*
- **File:** [`.github/skills/exb-widget-development/SKILL.md`](.github/skills/exb-widget-development/SKILL.md)
</details>

<details>
<summary><b>⚙️ <a href=".github/skills/jimu-framework-apis/SKILL.md"><code>jimu-framework-apis</code></a> - the non-UI framework</b></summary>

- **Triggers on:** managers (`DataSourceManager`, `WidgetManager`, ...), the Redux store, data sources, `JimuMapView`/JSAPI bridge, theme, layouts, testing.
- **Gives the AI:** manager singleton patterns, high-value **traps** (APIs that changed between versions), the `window._*` runtime globals, and `references/` (managers, data-sources, maps, theme/layouts/testing).
- **Prompt example:** *"How do I query records from a feature layer data source and react to selection?"*
- **File:** [`.github/skills/jimu-framework-apis/SKILL.md`](.github/skills/jimu-framework-apis/SKILL.md)
</details>

<details>
<summary><b>🎨 <a href=".github/skills/jimu-ui-components/SKILL.md"><code>jimu-ui-components</code></a> - the UI library</b></summary>

- **Triggers on:** picking/using a jimu-ui component (`Button`, `Select`, `SettingSection`, ...) or building a Settings panel.
- **Gives the AI:** the component catalog, import rules (basic from root, advanced from subpath), and `references/` (component examples, basic components, advanced setting-components).
- **Prompt example:** *"Add a Settings panel with a map picker and a numeric input."*
- **File:** [`.github/skills/jimu-ui-components/SKILL.md`](.github/skills/jimu-ui-components/SKILL.md)
</details>

> [!TIP]
> 💡 Skills are **automatic**. You prompt normally; VS Code matches your task to a skill's description and loads its `SKILL.md`. You do not invoke them by name (though you can mention one to nudge).

[🔝 Back to index ▾](#index)

---

<a id="instructions"></a>

## 8. 📏 Instructions (`.github/instructions/`)

> [!NOTE]
> ❓ **"What are the always-on rules that shape every answer, versus the on-demand skills?"**

Instructions are **rules auto-applied by file path** (via each file's `applyTo` glob). Unlike skills (loaded on demand), matching instructions are **always active**. We authored four.

| File | applyTo | What it enforces |
|---|---|---|
| [`exb-source-authority.instructions.md`](.github/instructions/exb-source-authority.instructions.md) | `**` | Source-of-truth ranking, the search workflow, vendor-safety (never edit `ArcGISExperienceBuilder/`), and the `⚠️ NOT VERIFIED` honesty marker. **The most important one.** |
| [`exb-widget-development.instructions.md`](.github/instructions/exb-widget-development.instructions.md) | `src/**` | Widget golden-path: framework versions, import rules, config immutability, map binding, settings persistence, lifecycle. |
| [`esri-skills-always-on.instructions.md`](.github/instructions/esri-skills-always-on.instructions.md) | `**` | Keeps the guidance + ArcGIS skills active for Esri-stack work. |
| [`code-style.instructions.md`](.github/instructions/code-style.instructions.md) | `src/**`, `.scripts/**` | JS/TS style: short-circuit guards, semicolons, if-body-on-next-line, **plain hyphens (no em/en dashes)**, minimal type assertions. |

> [!TIP]
> 💡 **Skills vs instructions in one line:** *instructions are guardrails that are always on; skills are playbooks loaded when relevant.* Together they make the AI reach for the indexes without being asked.

[🔝 Back to index ▾](#index)

---

<a id="future"></a>

## 9. 🔮 Future Improvements

> [!NOTE]
> ❓ **"What would make this better, and what could we simplify or remove later?"**

### ✅ Shipped

- ✅ **Freshness check - `npm run ai:verify`.** Compares `api/METADATA.tsv` `exb_version` against `ArcGISExperienceBuilder/version.json`, checks required indexes exist, and enforces an API-to-usage coverage floor. Exits non-zero on drift (for CI / pre-regeneration).
- ✅ **Cross-link `ai:find` output to skills + online docs.** Each result prints `see skill: <name>` and member-level deep-links (`canonical_url#anchor`).
- ✅ **Fuzzy/typo-tolerant scoring in `ai:find` - powered by [Fuse.js](https://github.com/krisk/Fuse) Token Search.** Replaced the hand-rolled bounded-Levenshtein tier with a real `Fuse` index (`useTokenSearch: true`) over the full canonical symbol set, plus a small deterministic abbreviation map for cases too far apart for edit distance alone (`DataSrcManager` → `DataSourceManager`, `WidgetMgr` → `WidgetManager`). Each result carries `matchConfidence`/`confidentMatch` so a loose fuzzy neighbor's real usage evidence can never silently suppress the thin-evidence escalation for the literal target - only confident (near-exact) matches gate escalation. `fuse.js` is a small (~7 kB), zero-dependency devDependency.
- ✅ **`--all` exhaustive listing.** `ai:find <term> --all` lists every substring match past the ranked top-12 cap (handles "find all *SourceManager*").
- ✅ **Semantic layer over doc summaries - `ai:find <phrase> --semantic`.** A curated concept map plus zero-dependency TF-IDF over `docs/api-reference.tsv` summaries and `packages.tsv` purposes. True vector embeddings remain deferred.
- ✅ **Surface `coverage.tsv` health in `ai:find`.** Each result carries a package parse ratio; a caveat prints when it is low.
- ✅ **Golden-query + coverage tests - `npm run ai:test`.** Node built-in test runner over literal/semantic/conceptual/fuzzy/`--all` query fixtures plus index integrity, join, ratio, dist-widgets-ts parity, and match-confidence-gating checks.

### ✨ Add / enhance

- 🧬 **True semantic/conceptual search (researched, not yet implemented).** Our current `--semantic` is a hand-rolled concept map + TF-IDF over doc summaries only - it does not improve `ai:find`'s core symbol scoring. Researched replacements on GitHub:
Since documenting this research, Fuse.js Token Search was adopted for lexical fuzzy/typo/abbreviation scoring (see Shipped, above). What remains genuinely deferred is true *conceptual* search via embeddings - it cannot map "loading spinner" to `Loading`/`Progress` without our hand-maintained concept map. Real embeddings (e.g. `@xenova/transformers` running locally, or a hosted API) would enable that, but need a real dependency/architecture decision: a local model download (100s of MB) or network egress, either of which changes the offline/zero-dependency guarantees of `.scripts/`. Deliberately deferred until that tradeoff is explicitly approved. Other libraries researched but not adopted:
  - **[MiniSearch](https://github.com/lucaong/minisearch)** (6.1k★, zero deps, ~29 kB) - real BM25 ranking, prefix search, `fuzzy: 0.2` edit-distance tolerance; could replace our TF-IDF layer in `lib/semantic.mjs`.
  - **[FlexSearch](https://github.com/nextapps-de/flexsearch)** (13.8k★, zero deps) - fastest of the four, but its "fuzzy" is phonetic/charset-based (Soundex-like), a weaker fit for identifier-style queries than edit-distance/BM25.
  - **[Orama](https://github.com/oramasearch/orama)** (10.5k★, ~2 kB core) - adds real vector/hybrid search, but true semantic (embedding) search needs `@orama/plugin-embeddings` (`@tensorflow/tfjs-node`, 100s of MB) or a hosted API - a real dependency/architecture change.
- 🤖 **Regenerate in CI.** Rebuild all indexes on every `npm run setup` version bump in a pipeline so committed indexes never drift from the installed vendor version.
- 🧵 **Merge fast + canonical symbol lookup.** Have `ai:find` transparently fall back from `api/symbols.tsv` to the regex `symbols.tsv` for non-exported names, so callers never pick the wrong table.
- 🔠 **Tune the `mentions.tsv` rarity threshold.** Current cutoff is 12 files; review signal-to-noise and adjust.
- 🗃️ **Index page bodies (carefully).** `docs/` currently indexes navigation only. A summarized body index could improve doc answers, at a size cost.
- ⚙️ **Parallelize/chunk `ai:index:usages`.** It is the slowest step (minutes) and single-threaded; worker-thread sharding by package could cut wall time meaningfully as `dist/widgets` grows.
- 🏷️ **Expand the `api/` regression guard.** Only 5 "known-good" API ids are asserted after a catalog rebuild; growing this list (one per package, one per visibility class) would catch more silent extraction regressions.

### 🧹 Simplify / candidate removals

- 🧷 **Keep both `dist-widgets/` and `dist-widgets-ts/` (decided).** The ts variant is now at file parity (it also emits `catalog.tsv`, `manifests.tsv`, `module-usage.tsv`, and `jsx-usage.tsv`, the last from real JSX elements). They are still not interchangeable: the regex variant is the ~1s, dependency-free, always-fresh default and the ts-morph fallback/diff cross-check, so neither is retired.
- 📑 **Slim legacy `symbols.tsv`** to just non-exported names once `api/symbols.tsv` covers the exported surface everywhere `ai:find` reads.
- 🌳 **Reconsider `tree.*.txt`** if directory browsing moves fully into `ai:find`/`REPOSITORY-MAP.md`.
- 🧹 **Reconcile `api-usage-fast/` dedup keys with canonical.** The fast pass's dedup key (`api_id`+path+position+usage_kind+module) is looser than the canonical resolver's identifier-level pass; document (or align) the difference so "fast disagrees with canonical" isn't mistaken for a bug.

### ⚠️ Known limitations (deep review)

> [!WARNING]
> These are structural properties of the current design, not bugs to silently work around - the AI (and you) should factor them into how much to trust a given answer.

**Coverage & completeness**
- The usage graph covers **statically resolvable** references only; dynamic property access, computed imports, and anything requiring runtime reflection land in `reports/unresolved-*.tsv`, never in totals. See the [formal completeness contract](#usage-spec).
- `coverage.tsv`/`files.tsv` are only produced by `ai:index:usages` - if you've only run the fast `ai:index`, there is **no audit ledger** to check parse completeness against.
- Full rebuilds only: none of the five scripts do incremental/delta indexing. A one-line vendor change means the whole owned subtree is regenerated (cheap for the regex pass, ~65s-minutes for the ts-morph passes).

**Accuracy & drift**
- Regex indexes (`dist-widgets/`, top-level `symbols.tsv`/`reexports.tsv`/`mentions.tsv`) are best-effort text matching - they can mis-capture inside regex literals or template strings, and guessed props (`propsOf` heuristics) are leads, not gospel. Always confirm a critical signature against the `.d.ts` or the ts-morph `api/`/`dist-widgets-ts/` catalog.
- Minified runtime bundles (`CLIENT-RUNTIME-MAP.md` fallback) ship **no source maps**; findings are version-specific and must be re-verified after any ExB upgrade - there is no automated check that flags a stale runtime-bundle finding.
- `ai:find`'s text scoring (`scoreText`) has no fuzzy matching - a typo'd or oddly-cased query can silently return weaker matches instead of the intended symbol, with no "did you mean" hint.
- `build-ai-doc-index.mjs` **hard-fails** if Esri's exported docs don't match expected route counts (49/161/345) or if ExB/docs/Storybook versions disagree. This is a deliberate drift-detector, but it also means the doc index cannot partially regenerate after an unexpected upstream docs export change until the assertions are updated.

**Process & tooling gaps**
- No CI wiring yet: regeneration is manual (`npm run ai:index*`), so committed indexes can silently drift from the installed `ArcGISExperienceBuilder/` version if a version bump isn't followed by a rebuild.
- No automated test suite for the indexer scripts themselves - correctness currently rests on in-script sanity assertions (row-count guards, known-good API-id guards) plus manual spot-checks, not repeatable unit tests.
- `ai:index:rich` (~65s, ~1.4 GB peak) and `ai:index:usages` (minutes) are memory/time heavy enough that they are easy to skip during a quick iteration - meaning `dist-widgets-ts/`, `api/`, and `api-usage/` can become the most stale trees in practice.
- `sample-code-map.tsv` can report `ambiguous` when multiple `sdk-resources` samples share a slug; those rows need a human/AI second look rather than blind trust.

[🔝 Back to index ▾](#index)

---

<a id="test-harness"></a>

## 10. Test Harness (`npm run ai:test`)

> 
> A zero-dependency suite using Node's built-in test runner, grounded against the committed indexes. (30 tests ~24s)



  - `golden-queries.mjs` - the query corpus, split by prompt style
  - `ai-find-queries.test.mjs` - behavioral tests that run the real `ai:find --json` CLI
  - `ai-index-coverage.test.mjs` - index integrity and coverage-honesty tests
  - `helpers.mjs` - shared TSV/CLI helpers

It directly covers 4 prompt classes plus retrieval-feature checks:

| Tier | Prompt style | What it asserts |
|---|---|---|
| Literal | `DataSourceManager`, `WidgetManager`, `SettingSection`, `JimuMapViewComponent`, `DataSourceManager#getDataSource` | Exact canonical `api_id` is the top result, not thin, has a locator |
| Semantic | `loading`, `setting` | The right component appears within top-K (capability word, not type name) |
| Conceptual | `feature layer` | Enough ranked results plus related documentation surface |
| Thin/unknown | `widgetMutableStatePropChange`, `zzznotarealapi123` | Escalation path fires instead of a confident guess |
| Fuzzy/abbreviation | `SettingSecton`, `DataSrcManager`, `WidgetMgr` | Typos and abbreviations still resolve to the exact canonical symbol |

Additional retrieval-feature tests: `--all` returns every substring match past the ranked top-12 cap; results carry `skill` and `coverageHealth` fields; `--semantic` adds a documentation tier without changing default output; a loose Fuse.js fuzzy neighbor's real usage evidence cannot suppress escalation for a confident, evidence-free literal target (`matchConfidence`/`confidentMatch` gating).

Coverage-quality tests (the "is our map trustworthy" gate): catalog version matches `version.json`; 5 known-good identities present; exports/declarations/usage-summary all join to a real symbol (the join that powers `ai:find`); `files_parsed + files_skipped == files_seen`; every ledger file has a hash and none are wrongly excluded; unresolved stays under 5% of resolved (currently ~1.7%); a healthy fraction of public APIs have at least one behavioral usage (currently ~31.5%, floor 25%); `dist-widgets-ts/` is at file parity with `dist-widgets/` for the reverse indexes.

Terminal command: `npm run ai:test`
Result: All 30 tests pass in ~24s.

[🔝 Back to index ▾](#index)

---

<a id="dist-widgets"></a>

## 11. 🆚 dist-widgets vs dist-widgets-ts - Why Keep Both?

> [!NOTE]
> ❓ **"Now that `dist-widgets-ts/` emits the same reverse-index files as `dist-widgets/` (§5.3, Phase E parity), can we just delete the regex variant?"**

### Short answer

Technically yes, since they're on par the `dist-widgets-ts/` folder carries the same *files*. But file parity is not property parity. The two generators differ in cost, dependencies, and failure modes, and those differences are the whole reason the regex variant exists. Recommendation: **keep `dist-widgets/`** even at parity.

### Why they are not actually equivalent

| Dimension | `dist-widgets/` (regex) | `dist-widgets-ts/` (ts-morph) |
|---|---|---|
| Build time | ~1s | ~65s |
| Memory | trivial | ~1.4 GB, needs `--max-old-space-size` |
| Dependency | none | `ts-morph` |
| Runs in | `npm run ai:index` (base, default) | `npm run ai:index:rich` (opt-in) |
| Freshness | regenerated every fast index run | only when someone runs the heavy build |
| Robustness | always emits; text never "fails to compile" | depends on the checker resolving the vendor tree; a version bump or monorepo-only build can partially misresolve |
| Sees non-typecheckable files | yes | may skip/misresolve |
| Type accuracy | guessed | resolved (its real advantage) |

### Benefits of keeping `dist-widgets/`

- **Fast, always-fresh default.** The base `ai:index` produces widget data in ~1s with no dependency. Delete it and every widget-capability lookup now requires the 65s/1.4 GB rich build to have been run recently. Staleness risk goes up, not down.
- **Dependency-free fallback.** If a future ExB bump breaks ts-morph resolution (the Esri dist is built in a monorepo and does not always compile standalone), regex still yields usable leads. You never end up with zero widget evidence.
- **A regression cross-check.** The ts folder's own README frames it as "diff against the regex variant before switching over." The regex output is the ground-truth diff target that catches silent ts-morph extraction regressions. Removing it removes that check.

### Cost of keeping it

- Two folders the agent must route between (mitigated today by the router rule "prefer `dist-widgets-ts/` when present, else `dist-widgets/`").
- Duplicated, potentially divergent data (mitigated by Phase E's shared `widget-catalog.mjs` helpers, so the reverse indexes cannot drift).

### The three real options

- **A. Parity + keep both (Phase E, shipped).** Max redundancy, both folders complete. Cost: the dual maintenance.
- **B. Keep regex as the complete fast default; slim ts to only what regex cannot do** (resolved types + `components-props.tsv`). Least duplication, keeps the fast path, but the agent must know ts is partial.
- **C. ts-only, delete regex.** Only safe if the rich build is wired into CI so it is always regenerated, and you accept the dependency and the loss of a fallback and the diff check. Not recommended.

**Decision: Option A.** Both folders stay, and Phase E keeps them from diverging by sharing `src/lib/widget-catalog.mjs` between the two generators.

[🔝 Back to index ▾](#index)

---

## 🧾 Glossary (for the completely new reader)

| Term | Meaning |
|---|---|
| **ExB** | ArcGIS Experience Builder - Esri's web app builder we extend with custom widgets |
| **jimu** | The framework libraries inside ExB (`jimu-core`, `jimu-ui`, `jimu-arcgis`, ...) |
| **JSAPI** | ArcGIS Maps SDK for JavaScript (`@arcgis/core`, `__esri`) |
| **OOTB** | Out-of-the-box - the Esri-authored widgets we read for precedent |
| **SDK resources** | Minimal, single-concept Esri sample widgets |
| **`.d.ts`** | TypeScript declaration file - the API type contract |
| **ts-morph** | A library that drives the real TypeScript compiler for accurate analysis |
| **grep-first** | Data laid out one fact per line so you search it, never read it whole |

[🔝 Back to index ▾](#index)
