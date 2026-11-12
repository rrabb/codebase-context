# Import report 261112-1653

First import with `/wt-import`. Scanned at commit `eb1e344`. No source file was edited. Line numbers refer to that commit.

✅ **Filed 261112.** The dev approved every recommendation and added C7-C12. See [Outcomes](#outcomes).

## Summary

| Group | Candidates | Outcome |
| --- | --- | --- |
| A. Roadmap To do, open items | 12 | 11 WI rows, 1 Inbox |
| B. `ai-index.md` §9 ideas | 10 | 2 WI rows, 8 Inbox |
| C. New, found in this scan or added by the dev | 12 | 7 WI rows, 3 Inbox, 1 Rejected, 1 Left for later |
| D. TODOs quoted from upstream code | 2 | 2 Rejected |
| **Total** | **36** | **20 WI rows, 12 Inbox, 3 Rejected, 1 Left for later** |

Another 24 findings were screened out because they were already done, covered, merged into a candidate, or belong to the cpe-exb app. See [Screened out](#screened-out).

## Sources

| Source | Scope | Result |
| --- | --- | --- |
| Markdown backlog files | Tracked Markdown, plus all of `docs/` including the ignored `docs/temp/` (dev request) | 3 lists to retire, 2 kept as reference |
| TODO/FIXME comments | `src/`, `tests/`, `bin/`, tracked Markdown | 0 in code. 2 in skill cards, both quoting upstream Esri code |
| Git history | All 19 commits, subjects and bodies | No open work beyond the roadmap |
| GitHub issues and pull requests | `rrabb/codebase-context` | 0 open issues, 0 pull requests |
| Past chats, VS Code | 49 sessions in 6 related workspaces, keyword-filtered to 12 | Read by 2 subagents |
| Past chats, exported | 3 transcripts in `docs/temp/history/` | Read by 1 subagent with `docs/temp/notes.md` |
| Copilot CLI session store | Searched by repository name, remote URL, and path | 0 related sessions |
| CHANGELOG | None exists | Unavailable |

Excluded folders: `node_modules/` and `temp-tool-output/`. The vendor install and generated indexes are not in this repository. `docs/temp/` was scanned on request even though Git ignores it.

### Evidence limits

- Chats were filtered by keyword. Chats about other projects in the same workspaces were skipped.
- Each chat request kept at most 25 assistant work-marker lines. Each transcript kept at most 400 marker lines. Extracts were clipped.
- Subagents on a lighter model read the chats. Every candidate they marked done or unclear was checked against the repository. The results are in [Screened out](#screened-out).
- Chat content is paraphrased. Chats are cited by date only.
- A1 lives in the cpe-exb repository, which was not checked.

## Open-work lists

| List | Location | Choice | Note |
| --- | --- | --- | --- |
| Roadmap To do | [roadmap.md](../../../docs/roadmap.md) `## To do` | Retire | Decisions and option tables stay live |
| ai-index Add / enhance | [ai-index.md](../../../docs/ai-index.md) §9 `### ✨ Add / enhance` | Retire | Shipped and Known limitations stay live |
| ai-index Simplify | [ai-index.md](../../../docs/ai-index.md) §9 `### 🧹 Simplify / candidate removals` | Retire | Same as above |
| README Status | [README.md](../../../README.md) `## Status` | Keep as reference | Not frozen and may drift from the dashboard |
| `docs/temp/` lists | Benchmark summaries 1001 "Still open" and 1002 "Noted gaps"; two routing plans "Deferred" and "Open questions"; `agent-tooling-plan.md` "Open"; plan sections in `notes.md` | Keep as reference | Ignored by Git. Not frozen and may drift |

## Candidates

Decision states: `Pending`, `Filed`, `Rejected`, `Left for later`. The dev approved all recommendations on 261112.

### A. Roadmap To do (Retire)

| # | Candidate | Source | Evidence | Tag | Origin | Possible duplicate | Recommended | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Remove the install backup in cpe-exb | roadmap.md L9, item 1 | Documented | [build] | project | None found | WI row, Project Upkeep | Filed: WI-011 |
| A2 | Publish pre-built bundles after the redistribution review | roadmap.md L10, item 2; README L43; prebuilt-indexes.md L30 | Documented | [build] | project | C2 (licensing). Chat 261005: still pending | WI row, Indexing, waits for C2 | Filed: WI-005 |
| A3 | Purge private details from Git history | roadmap.md L11, item 3 | Documented | [build] | project | Chat 261002: keep as backlog, repo stays public | WI row, Project Upkeep | Filed: WI-006 |
| A4 | Move the index history notes from cpe-exb repo memory into `docs/` | roadmap.md L15, item 7 | Documented | [build] | project | Sandbox triage on 261110 kept it in the Inbox | Inbox | Filed: Inbox |
| A5 | MCP server | roadmap.md L16, item 8; mcp-design.md | Documented | [research] | project | README L43. mcp-design.md notes that `--brief` does not shrink JSON output | WI row 💤, General | Filed: WI-014 |
| A6 | Phase 2: move ExB paths and patterns into vendor settings | roadmap.md L17, item 9 | Documented | [build] | project | README L43 | WI row 💤, Data Sources/Vendors | Filed: WI-013 |
| A7 | AGENTS.md ExB block, open parts (a) feedback on cpe-exb "AI source index", (b) drop text the block repeats from `exb-source-authority`, (c) cpe-exb files untracked | roadmap.md L19, item 11 | Documented | [question] | project | Chat 261007 | WI row, Benchmarks/Routing | Filed: WI-004 |
| A8 | Benchmark the instruction versions | roadmap.md L20, item 12 | Documented | [research] | project | Merges a hard offline question set (chat 261002) and a fresh-chat routing test (`agent-tooling-plan.md` "Open"). `vendors/exb/benchmarks/` does not exist yet (Observed here) | WI row, Benchmarks/Routing | Filed: WI-003 |
| A9 | Team setup after clone, with a pinned tool version | roadmap.md L21, item 13 | Documented | [build] | project | Chat 261005. Related to A12 | WI row, Project Upkeep | Filed: WI-007 |
| A10 | Copilot cloud agent and code review support | roadmap.md L23, item 15 | Documented | [research] | project | None found | WI row 💤, General | Filed: WI-015 |
| A11 | Support ExB folders not named `ArcGISExperienceBuilder` | roadmap.md L24, item 16 | Documented | [build] | project | Chat 261007 (install path model) | WI row, Data Sources/Vendors | Filed: WI-012 |
| A12 | More setup settings in `config.json` | roadmap.md L25, item 17 | Documented | [build] | project | A9 (pinned version) | WI row, Project Upkeep | Filed: WI-008 |

### B. ai-index.md §9 ideas (Retire)

| # | Candidate | Source | Evidence | Tag | Origin | Possible duplicate | Recommended | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | True semantic search with embeddings | ai-index.md L751 | Documented | [research] | project | Chat 260819. Deferred until the model-download or network tradeoff is approved | WI row 💤, Indexing | Filed: WI-016 |
| B2 | Regenerate indexes in CI | ai-index.md L756; limitation L787 | Documented | [build] | project | Merges index drift safeguards (chat 260818). A CI runner needs an ExB install (see A10) | WI row, Indexing | Filed: WI-010 |
| B3 | `ai:find` falls back from `api/symbols.tsv` to regex `symbols.tsv` | ai-index.md L757 | Documented | [idea] | project | None found | Inbox | Filed: Inbox |
| B4 | Tune the `mentions.tsv` rarity cutoff | ai-index.md L758 | Documented | [research] | project | None found | Inbox | Filed: Inbox |
| B5 | Index summarized doc page bodies | ai-index.md L759 | Documented | [idea] | project | Merges API docs ingestion (transcript). `src/knowledge/docs-to-text.mjs` may already cover guide pages (Inferred from source, not run) | Inbox | Filed: Inbox |
| B6 | Shard `ai:index:usages` by package | ai-index.md L760 | Documented | [idea] | project | None found | Inbox | Filed: Inbox |
| B7 | Grow the `api/` known-good regression list | ai-index.md L761 | Documented | [build] | project | Merges golden-query growth (chat 260818). The 1.20 `expectations.json` may already cover it. Sandbox triage on 261110 kept it in the Inbox | Inbox | Filed: Inbox |
| B8 | Slim legacy `symbols.tsv` | ai-index.md L766 | Documented | [idea] | project | B3 | Inbox | Filed: Inbox |
| B9 | Reconsider `tree.*.txt` | ai-index.md L767 | Documented | [idea] | project | None found | Inbox | Filed: Inbox |
| B10 | Document or align `api-usage-fast/` and canonical dedup keys | ai-index.md L768 | Documented | [build] | project | None found | Inbox | Filed: Inbox |

### C. New

| # | Candidate | Source | Evidence | Tag | Origin | Possible duplicate | Recommended | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | Fix stale limitations and old paths in `ai-index.md`. L783 says `ai:find` has no fuzzy matching, but L743 says Fuse.js shipped. L788 says there is no test suite, but §10 (L798) describes 30 tests. L70, L658, and L723 name `.scripts/`, `docs/Build-Deployments.md`, and `code-style.instructions.md`, which are not in this repo | ai-index.md, lines listed | Observed here | [build] | project | None found | WI row, Project Upkeep | Filed: WI-002 |
| C2 | Licensing review of Esri-derived content already in this public repo, and a license choice for the tool's own code. Skill cards quote upstream code (for example `layout-sidebar.md:196`). All 5 ExB skills declare `license: Internal`. No LICENSE file. `package.json` has no license field | Observed here; a `docs/temp/` routing plan flagged that vendor-derived content needs a license check; roadmap decision 2026-10-05 kept all cards | Observed here, Documented | [question] | project | A2 covers bundles only | WI row, General | Filed: WI-001 |
| C3 | Write an ExB version-upgrade procedure: indexes, facts, test expectations, skill cards | Chat 261004 asked for a repeatable, version-independent regeneration process. prebuilt-indexes.md L38 covers test expectations only | From past chat, Documented | [build] | project | B2, A6 | WI row, Data Sources/Vendors | Filed: WI-009 |
| C4 | Automated private-data scan in `pack` | Chat 261005 asked for systematic redaction of generated output. prebuilt-indexes.md L32 lists a manual inspection step | From past chat, Documented | [idea] | project | A2 | Inbox | Filed: Inbox |
| C5 | SCIP "find all usages" graph | `docs/temp/notes.md` L147 "Plan B - Tier 3"; a transcript | Inferred from source: no `scip` in `src/` or `package.json`; the ts-morph usage index (`api-usage/`) serves this need | [research] | project | Superseded by the usage index | Drop, closed lookup | Rejected: superseded by the usage index |
| C6 | Split a large `.mjs` script into modules and move it to TypeScript | `docs/temp/my notes prompts 2610xx.md` (draft prompts that don't name the script) | Unknown | [question] | Unknown | None found. Largest script here is `src/build-ai-index.mjs`, 984 lines (Observed here) | Left for later, until the dev says whether it is about this repo | Left for later |
| C7 | Adaptive `ai:find` output. `--brief` is opt-in, and `--json` ignores it (about 46 KB in one test). Make output compact when confident matches exist, keep detail when evidence is thin, and cap `--json` size. Add `--brief` where guidance leaves it out | `src/ai-find.mjs` L261, L512. Guidance without `--brief`: exb-source-authority L33, trace.prompt.md L14, exb-source-research SKILL.md L18, AGENTS.block.md L28, jimu-framework-apis SKILL.md L18. exb-source-authority L55-56 use it | Observed here | [build] | project | A5 (mcp-design.md notes the JSON size) | WI row, Benchmarks/Routing | Filed: WI-017 |
| C8 | Enforce local-first routing with an agent hook or MCP, but only if WI-003 shows agents still skip local tools | Dev question 261112. Routing guidance has a static text test (`tests/agent-guidance.test.mjs` L12) and no behavior check | Observed here | [research] | project | A5, A8 | Inbox | Filed: Inbox |
| C9 | The Context7 ExB exception names only the cpe-exb repository. Make it apply to any project with `.codebase-context/config.json`, and add a README note for teammates | User-level Context7 rule and `context7-mcp` skill, outside this repo | Observed here | [build] | project | None found | Inbox | Filed: Inbox |
| C10 | Sandbox routing test bed: a fresh project and chat with only this tool's guidance, and no user-level rules or memory | Dev request 261112. `agent-tooling-plan.md` "Open" listed a fresh-chat routing test | Documented | [build] | project | A8, where it was merged before | WI row, Benchmarks/Routing | Filed: WI-018 |
| C11 | Routing test prompt set by type, with edge cases and hard prompts that only local source answers. Each prompt gets an answer key with file:line | Dev request 261112. Chat 261002 asked for hard offline questions. roadmap.md L20 and L33 put the question set under `vendors/exb/benchmarks/` | Documented, From past chat | [build] | project | A8, where it was merged before | WI row, Benchmarks/Routing | Filed: WI-019 |
| C12 | Decide whether to ship or store indexes for the latest few ExB versions | Dev request 261112. roadmap.md L59 "Packaging pre-built knowledge" lists the options. About 74 MB per version (L66, L75) | Documented | [question] | project | A2 covers public bundles | WI row, Indexing | Filed: WI-020 |

C7-C9 came from a routing review the dev asked for after the first report. The dev added C10-C12 on 261112.
### D. TODOs quoted from upstream code

| # | Candidate | Source | Evidence | Tag | Origin | Possible duplicate | Recommended | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Esri layout sidebar RTL logic needs review | `vendors/exb/skills/exb-widget-development/references/ootb-widgets/cards/containers/layout-sidebar.md:196` | Observed here | [research] | third-party | None found | Drop: upstream code | Rejected: upstream Esri code |
| D2 | Esri GeoBIM `projectId` check to be replaced | `.../cards/containers/geobim-document-explorer.md:197` | Observed here | [research] | third-party | None found | Drop: upstream code | Rejected: upstream Esri code |

## WI rows (filed)

Priority rules: confirmed 261112. The dev confirmed Who, Size, and Do after on 261112.

| ID | Title | Candidate | Area | Status | Priority | Type | Who | Size | Do after |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WI-001 | Review licensing of Esri-derived content and pick a code license | C2 | General | 🔜 Next | High | [question] | dev | M | - |
| WI-002 | Fix stale limitations and old paths in ai-index.md | C1 | Project Upkeep | 🔜 Next | Medium, quick win | [build] | agent | S | - |
| WI-003 | Benchmark the instruction versions | A8 | Benchmarks/Routing | 📋 Backlog | Medium | [research] | both | L | WI-018, WI-019 |
| WI-004 | Review the cpe-exb AI source index section (part a). Part (b) dropped 261110. Part (c) moved to WI-007 on 261112 | A7 | Benchmarks/Routing | 📋 Backlog | Medium | [research] | agent | S | - |
| WI-005 | Publish pre-built bundles | A2 | Indexing | ⏳ Waiting: waits for the redistribution review | Medium | [build] | both | M | WI-001 |
| WI-006 | Purge private details from Git history | A3 | Project Upkeep | 📋 Backlog | Medium | [build] | both | M | - |
| WI-007 | Team setup after clone | A9 | Project Upkeep | 📋 Backlog | Medium | [build] | both | L | - |
| WI-008 | More setup settings in config.json | A12 | Project Upkeep | 📋 Backlog | Medium | [build] | agent | M | - |
| WI-009 | ExB version-upgrade procedure | C3 | Data Sources/Vendors | 📋 Backlog | Medium | [build] | both | M | - |
| WI-010 | Regenerate indexes in CI | B2 | Indexing | 📋 Backlog | Medium | [build] | agent | M | - |
| WI-011 | Remove the install backup in cpe-exb | A1 | Project Upkeep | 📋 Backlog | Low | [build] | dev | S | - |
| WI-012 | Support other ExB folder names | A11 | Data Sources/Vendors | 📋 Backlog | Low | [build] | agent | M | - |
| WI-013 | Phase 2 vendor settings | A6 | Data Sources/Vendors | 💤 Deferred until a second vendor arrives | Medium | [build] | agent | L | - |
| WI-014 | MCP server | A5 | General | 💤 Deferred until another project or agent host needs it | Low | [research] | both | L | - |
| WI-015 | Copilot cloud agent and code review support | A10 | General | 💤 Deferred until the team needs it | Low | [research] | both | M | WI-007 |
| WI-016 | Semantic search with embeddings | B1 | Indexing | 💤 Deferred until the dev approves a model download or network dependency | Low | [research] | both | L | - |
| WI-017 | Adaptive `ai:find` output size | C7 | Benchmarks/Routing | 📋 Backlog | Medium | [build] | agent | M | - |
| WI-018 | Sandbox routing test bed | C10 | Benchmarks/Routing | 📋 Backlog | Medium | [build] | both | M | - |
| WI-019 | Routing test prompt set | C11 | Benchmarks/Routing | 📋 Backlog | Medium | [build] | both | M | - |
| WI-020 | Decide whether to ship or store indexes for the latest few ExB versions | C12 | Indexing | 📋 Backlog | Medium | [question] | dev | S | - |

## Inbox lines (filed)

```text
261112 [question] Should the index history notes in cpe-exb repo memory move into docs/ (roadmap item 7)? Commit dfe1690 deleted docs/history/ from this public repo (from: agent)
261112 [idea] ai:find falls back from api/symbols.tsv to regex symbols.tsv for non-exported names (from: agent)
261112 [research] Review the 12-file rarity cutoff in mentions.tsv (from: agent)
261112 [idea] Index summarized doc page bodies; check what docs-to-text already covers (from: agent)
261112 [idea] Shard ai:index:usages by package with worker threads (from: agent)
261112 [build] Grow the api/ known-good regression list; check the 1.20 expectations.json first (from: agent)
261112 [idea] Slim legacy symbols.tsv to non-exported names (from: agent)
261112 [idea] Reconsider tree.*.txt if ai:find and REPOSITORY-MAP cover browsing (from: agent)
261112 [build] Document or align the api-usage-fast and canonical dedup keys (from: agent)
261112 [idea] Add an automated private-data scan to pack (from: agent)
261112 [research] Enforce local-first routing with an agent hook or MCP only if WI-003 shows agents still skip local tools (from: agent)
261112 [build] Make the Context7 ExB exception apply to any project with .codebase-context/config.json, not just cpe-exb; add a README note for teammates (from: agent)
```

## Screened out

Not candidates. Listed so the dev can override.

| Found in | Finding | Why screened out | Evidence |
| --- | --- | --- | --- |
| Chat 260818 | Report thin evidence, then fall back to runtime bundles | Shipped | ai-index.md §10, thin/unknown tier |
| Transcript | Repository map | Shipped | exb-source-authority.instructions.md L38 |
| Chat 261005 | Move the knowledge extractor into its own tool | Shipped | This repository, commit `087445d` |
| Chat 261004 | ExB architecture guidance | Shipped | `vendors/exb/skills/experience-builder-architecture/` |
| Chat 261002 | Package pre-generated knowledge | Shipped locally; public upload is A2 | prebuilt-indexes.md |
| Chat 261001 | One refresh command for indexes and graphs | Shipped | `src/ai-refresh.mjs` |
| Chat 261001 | Fixed-order research prompt | Shipped | `vendors/exb/prompts/trace.prompt.md` |
| Chat 261001 | Graph the readable OOTB widget source | Shipped | `src/ai-refresh.mjs` L28 |
| 1001 summary | Vendor ignore file out of sync | Resolved: refresh copies it each run | `src/ai-refresh.mjs` L55 |
| 1001 summary | Instructions disagree on bare member names | Resolved | exb-source-authority L33; exb-source-research SKILL.md L18 |
| 1002 trace | End usage questions with a scoped grep | Shipped | exb-source-authority L56; exb-source-research SKILL.md L36 |
| 1002 trace | Local sources before Context7 | Shipped | exb-source-authority L92 |
| 1002 trace | Smaller `ai:find` output | Shipped `--brief` for text. JSON size is now C7 | `src/ai-find.mjs` L24, L311 |
| Routing plan | `WidgetVersionManager` missing from widget rules | Resolved | exb-widget-development.instructions.md L50 |
| Chat 261005 | Skill descriptions trigger on ExB terms | Covered by a test | `tests/agent-guidance.test.mjs` L12 |
| Transcript | Audit excluded files | Covered by a coverage test | ai-index.md §10 |
| Transcript | Tune import-index storage | Appears shipped (low confidence) | Transcript only |
| Chat 261007 | Require an explicit vendor base path | Decided 2026-10-07: no rewriting. Wishlist part is A11 | roadmap.md Decisions |
| Chat 260818 | Index drift safeguards | Merged into B2 | - |
| Chat 260818 | More golden-query tests | Merged into B7 | - |
| Transcript | API docs ingestion | Merged into B5 | - |
| Chat 261002 | Hard offline benchmark questions | Merged into A8. Now its own item, C11 | - |
| `agent-tooling-plan.md` | Fresh-chat routing test | Merged into A8. Now its own item, C10 | - |
| Chats 261002-261005, routing plans, 1001 summary, `agent-tooling-plan.md` | cpe-exb app work: map-notes refactor, build guard, memory cleanup, widget type errors and casts, lint config, export page Calcite version, `postsetup` test, multi-root search duplicates, app prompts ignored by Git, app build-config findings | Belongs to the cpe-exb app, not this tool | - |

## Outcomes

Filed 261112 to the [dashboard](../../dashboard.md).

| Outcome | Count | Candidates |
| --- | --- | --- |
| Filed: WI row | 20 | A1-A3, A5-A12, B1, B2, C1-C3, C7, C10-C12 |
| Filed: Inbox | 12 | A4, B3-B10, C4, C8, C9 |
| Rejected | 3 | C5: superseded by the usage index. D1, D2: upstream Esri code. Both are in the dashboard Closed lookup |
| Left for later | 1 | C6: reconsider when the dev says which script the draft prompt means |

- WI-003 changed after review: it now waits for WI-018 and WI-019. The dev approved this on 261112.
- The dev approved the migration proposal on 261112. A "Frozen 261112" banner now sits under each of the 3 retired headings. The lists below the banners are unchanged.
- The lists kept as reference aren't frozen and may drift from the dashboard.

### Reconciled with the sandbox pilot

A sandbox pilot of the tracking kit imported this repo on 261110 (scanned at `908823a`, 25 candidates). Each of its candidates maps to a candidate here. On 261112 the dev approved carrying over these changes:

| # | Change | Why |
| --- | --- | --- |
| R1 | Dropped roadmap item 11 part (b) and added it to the Closed lookup | The dev dropped it on 261110 in the pilot |
| R2 | WI-004 now covers part (a) only: [research], agent, S. Part (c) moved into WI-007 | Same split as the pilot. Part (c) is a team setup problem |
| R3 | New topic `items/WI-004-ai-source-index-review.md` with the pilot's 4 findings | The pilot read the cpe-exb file on 261110. Not re-read here |
| R4 | Fixed the WI-014 trigger to "until another project or agent host needs it" | mcp-design.md L5. The earlier trigger here was wrong |
| R5 | WI-006 now says to rehearse first and that a squash removes cited commit hashes | From the pilot's C03 |
| R6 | The A4 Inbox line is now a [question] | Commit `dfe1690` deleted 5 `docs/history/` files (Observed here) |
| R7 | WI-010 now says this repo doesn't commit indexes and has no `.github/workflows/` | ai-index.md L756 (L758 after the banner) was written for cpe-exb |
| R8 | WI-002 now also lists L67, L105, L260, L289 | L260 and L289 from the pilot's C25. L67 and L105 found here. No `setup` script in `package.json` |
| R9 | WI-016 now mentions MiniSearch for the TF-IDF layer | ai-index.md L753 (L755 after the banner) |
