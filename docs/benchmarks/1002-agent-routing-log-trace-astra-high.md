# ===========================================================================================

# PROMPT:
how does the out-of-the-box List widget react when its data source becomes NotReady, and which jimu API reports it?

# ANSWER:

## STEPS
```
I’ll trace the List widget’s `NotReady` handling and check the local Jimu declarations for the API that reports it.

Read skill `codebase-memory`
Read skill `context7-mcp`
Read skill `exb-widget-development`
Read skill `jimu-framework-apis`
Read memory 

The local guidance identifies two status callbacks on `DataSourceComponent`. I’ll check which one List uses and what it changes when `NotReady` arrives.

Ran `index_status` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets"
}
Ran Resolve Context7 Library ID Completed with input: {
  "libraryName": "ArcGIS Experience Builder",
  "query": "How does the out-of-the-box List widget react when its data source becomes DataSourceStatus.NotReady, and which jimu-core DataSourceComponent API reports this status?"
}
Read 
Read skill `guidance-best-practices`, lines 1 to 120
Read skill `guidance-testing`
Read skill `guidance-deployment`, lines 1 to 110
Read skill `guidance-documentation`, lines 1 to 110

The installed source is ExB 1.20. I’ll locate List’s handler in the OOTB graph and cross-check the callback contract.

Ran terminal command: npm run ai:find -- onDataSourceStatusChange
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "file_pattern": "common/list/src/.*",
  "name_pattern": ".*([Dd]ata[Ss]ource|[Dd]ata[Ss]tatus|[Nn]ot[Rr]eady).*",
  "limit": 25
}
Ran Query Documentation Completed with input: {
  "libraryId": "/websites/developers_arcgis_experience-builder",
  "query": "How does DataSourceComponent report DataSourceStatus.NotReady through onDataSourceStatusChange or onDataSourceInfoChange, and what does NotReady mean for widget output data sources?"
}

`NotReady` means the source is not ready to supply data, rather than that a load failed. The scoped graph lookup returned no matches, so I’ll locate List’s explicit `NotReady` checks in source and trace from there.

Ran terminal command: npm run ai:find -- DataSourceStatus --members
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "name_pattern": ".*onDataSourceInfoChange.*",
  "limit": 10,
  "max_output_tokens": 1600
}
Searched for regex `NotReady|onDataSourceStatusChange|onDataSourceInfoChange` (`**/ArcGISExperienceBuilder/client/dist/widgets/common/list/src/**`), 15 results
Read 
List explicitly sets total and selected counts to zero for `NotReady`, and has a separate “output data not generated” display. I’ll check the handler and rendering path to see how those pieces fit together.
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "qn_pattern": ".*common\\.list\\.src\\.runtime.*",
  "name_pattern": ".*(DataSource|EmptyAndNotReady|DataCount|ListContentElement).*",
  "limit": 20,
  "max_output_tokens": 2500
}
Read , lines 1 to 95
Read 
Read 

List uses `onDataSourceStatusChange` to update its query status and `onDataSourceInfoChange` to refresh its data information and records. Its UI then shows the configured no-data message plus an output-not-generated warning; I’ll verify the remaining source details.

Ran `check_index_coverage` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "paths": [
    "common/list/src/runtime/components/data-source/data-source-component.tsx",
    "common/list/src/runtime/components/data-source/data-count.tsx",
    "common/list/src/runtime/components/list-status-component/empty-and-not-ready-tips.tsx"
  ]
}
Ran `trace_path` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "function_name": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets.common.list.src.runtime.components.data-source.data-source-component.DataCountComponent",
  "direction": "outbound",
  "depth": 1,
  "limit": 70,
  "max_output_tokens": 4000
}
Ran `get_code_snippet` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "qualified_name": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets.common.list.src.runtime.components.data-source.data-count.DataCountComponent"
}
No matches found.
Read , lines 1 to 108
```

## RESPONSE: 

In the installed **ExB 1.20**, List treats `NotReady` as **output data not yet available**, not a loading error:

- Shows the configured `noDataMessage` (or default “No data”) when empty and not loading, plus a warning tooltip identifying the output data source and producing widget. `empty-and-not-ready-tips.tsx:29`
- Reports **0 total and 0 selected**. `data-count.tsx:32`
- Jimu clears the source’s records and cache when it returns to `NotReady`; this is framework behavior, not List-specific cleanup. `common-data-source-interface.d.ts:15`

**The reporting API is `DataSourceComponent.onDataSourceStatusChange` from `jimu-core`:**

```ts
(status: DataSourceStatus, preStatus?: DataSourceStatus) => void
```

It fires on mount and status changes. List stores that value as its `queryStatus`. It also uses `onDataSourceInfoChange(info)`, whose `info.status` drives the warning and counts. `data-source-component.tsx:251` · `data-source-component.d.ts:125`

Evidence: graph trace and coverage check, `ai:find`, local source/declarations, Context7; targeted grep after the initial scoped graph lookup missed.



# ===========================================================================================

#PROMPT: 

For the previous prompt and response, i'm trying to understand what tools and reasons were used so i can optimize token usage by using local tools/mcp, can u create section titled "TOOL LOG" in a table that lists EVERY tool call you made, in order, numbered. For each call give: the tool name, the key arguments (query, project name, file path, or command), a one-line result summary (e.g. "3 hits", "empty", "error: ..."), and why you chose that tool at that point. 
Also state:
- Which instruction or guidance files you read or were given (by path), and whether they told you how to route searches.
- Whether you used codebase-memory tools (and which graph project names), `npm run ai:find`, grep, file reads, and in what order.
- Any point where you fell back to another tool, and why.
- Whether your answer ends with an `Evidence:` line.

Then analyze token usage and tool log and give me feedback/suggestions on what i can do to reduce token usage and rely on local tools. 

#ANSWER:

## STEPS 
```
I’ll reconstruct the calls from the previous turn, including the parallel-call wrappers, then identify where the workflow spent unnecessary tokens. Exact token counts aren’t shown in this transcript, so I’ll distinguish observed output size from estimates.


Read skill `chronicle`, lines 1 to 240

I counted 31 individual tool calls plus 6 parallel wrappers. The main excess was broad guidance and memory loading before the targeted lookup, followed by an empty graph query, a broader query that missed List on its first page, and an API lookup that returned unrelated fuzzy matches.
```

## RESPONSE: 

**TOOL LOG**

**37 calls: 31 individual calls + 6 parallel wrappers.** Order below follows the transcript; parallel children did not necessarily finish in that order. This audits the previous answer only.

Aliases: `CBM` = `mcp_codebase-memo_*`; `C7` = `mcp_context7_*`; `L` = `runtime`; `J` = `lib`.
Graph project `P` = `C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets`.

| # | Tool | Key Arguments | Result | Why Used |
|---|---|---|---|---|
| 1 | `multi_tool_use.parallel` | Calls 2-6 | Five results | Load applicable guidance together. |
| 2 | `read_file` | `%USERPROFILE%/.copilot/skills/codebase-memory/SKILL.md`, 1-230 | Graph workflow and coverage rules | Required structural-search skill. |
| 3 | `read_file` | `SKILL.md`, 1-220 | Extensive ExB guidance | Triggered by an ExB widget question. |
| 4 | `read_file` | `SKILL.md`, 1-220 | Framework guidance and callback names | Triggered by the Jimu data-source API question. |
| 5 | `memory` | `view /memories/repo/exb-runtime-patterns.md` | Very large memory file; much unrelated history | Consult prior repository experience. |
| 6 | `read_file` | `%USERPROFILE%/.agents/skills/context7-mcp/SKILL.md`, 1-180 | Resolve-then-query workflow | Required library-documentation skill. |
| 7 | `tool_search` | `codebase-memory search_graph get_code_snippet trace_path check_index_coverage` | Five definitions; search/trace themselves absent | Discover deferred graph tools. |
| 8 | `tool_search` | `context7 resolve-library-id query-docs` | Five definitions, unexpectedly including graph search | Discover documentation tools. |
| 9 | `multi_tool_use.parallel` | Calls 10-16 | Seven results | Check indexes and load remaining guidance. |
| 10 | `CBM.index_status` | Project `P` | Ready; indexed October 1; 73,315 nodes | Required freshness/readiness check. |
| 11 | `C7.resolve-library-id` | ArcGIS Experience Builder; question about List/NotReady | Five candidate libraries | Required documentation resolution. |
| 12 | `read_file` | `REPOSITORY-MAP.md`, 1-160 | Source/index router; ExB 1.20 | Repository requires this starting map. |
| 13 | `read_file` | `SKILL.md`, 1-120 | General coding guidance | Repository calls this always-on. |
| 14 | `read_file` | `SKILL.md`, 1-120 | General testing guidance | Same always-on requirement. |
| 15 | `read_file` | `SKILL.md`, 1-110 | General deployment guidance | Same always-on requirement. |
| 16 | `read_file` | `SKILL.md`, 1-110 | General documentation guidance | Same always-on requirement. |
| 17 | `multi_tool_use.parallel` | Calls 18-20 | Three results | Locate List and verify the status API. |
| 18 | `CBM.search_graph` | `P`; file filter `common/list/src/.*`; data-source/status/NotReady name regex; limit 25 | **0 hits** | Attempt narrowly scoped handler lookup. |
| 19 | `run_in_terminal` | `npm run ai:find -- onDataSourceStatusChange` | Public callback owner/declaration; another internal match | Mandatory local API lookup. |
| 20 | `C7.query-docs` | `/websites/developers_arcgis_experience-builder`; NotReady and callbacks | Status semantics and callback documentation | Satisfy current-documentation requirement. |
| 21 | `multi_tool_use.parallel` | Calls 22-25 | Four results | Recover from the graph miss and verify declarations. |
| 22 | `grep_search` | `NotReady\|onDataSourceStatusChange\|onDataSourceInfoChange`; List source subtree; ignored files included | **15 matches in 6 files** | Find literal checks and exact owning files. |
| 23 | `read_file` | `data-source-component.d.ts:1`, 1-250 | Callback signatures and contract | Verify API against installed declarations. |
| 24 | `CBM.search_graph` | `P`; name `.*onDataSourceInfoChange.*`; limit 10 | 10 of 12 results; first page lacked List | Try a broader symbol lookup after the scoped miss. |
| 25 | `run_in_terminal` | `npm run ai:find -- DataSourceStatus --members` | Enum locator plus unrelated fuzzy matches; **10 KB saved output** | Verify NotReady semantics locally. |
| 26 | `multi_tool_use.parallel` | Calls 27-30 | Four results | Resolve List owners and read deciding code. |
| 27 | `CBM.search_graph` | `P`; qualified-name prefix `.*common\.list\.src\.runtime.*`; component-name regex | **5 hits** | Find parent components instead of nested callbacks. |
| 28 | `read_file` | `data-source-component.tsx:1`, 1-340 | Full component, including both callbacks | Establish status/state/record behavior. |
| 29 | `read_file` | `empty-and-not-ready-tips.tsx:1`, 1-90 | Empty message and warning conditions | Verify visible response. |
| 30 | `read_file` | Call 25’s saved `content.txt`, 1-95 | Enum declaration locator and noisy matches | Recover terminal output moved to a resource file. |
| 31 | `tool_search` | `codebase-memory trace_path inbound outbound function call relationships` | Five definitions | Load still-missing trace tool. |
| 32 | `multi_tool_use.parallel` | Calls 33-37 | Five results | Complete coverage, trace, and count verification. |
| 33 | `CBM.check_index_coverage` | `P`; List data-source component, data-count, empty/not-ready tips | Three paths: no recorded issue; metadata matched | Required graph evidence check. |
| 34 | `CBM.trace_path` | `P`; List data-source `DataCountComponent`; outbound; depth 1 | **24 callees** | Confirm local relationships; added little beyond source. |
| 35 | `CBM.get_code_snippet` | `P`; List data-count `DataCountComponent` | Lines 10-51; explicit zero-count handling | Verify total/selected display behavior. |
| 36 | `read_file` | `common-data-source-interface.d.ts:1`, 1-108 | Enum documents record/cache clearing | Confirm framework responsibility. |
| 37 | `grep_search` | `outputDataIsNotGenerated:\|noData:`; `J/translations/default.*`; ignored files included | **Empty** | Attempt to confirm literal translated wording. |

**Instructions**
**Given in full:** `AGENTS.md`, `exb-source-authority.instructions.md`, and `%USERPROFILE%/.claude/rules/context7.md`. All influenced routing: graph for structure, `ai:find` for Jimu APIs, grep for literals/fallback, and mandatory Context7 for library questions.
**Read:** calls 2-4, 6, and 12 explicitly taught search routing; calls 13-16 were general guidance, not search routers. Call 5 was historical memory, not an instruction file.
**Listed but not read:** `code-style.instructions.md`, `documentation-style.instructions.md`, `esri-skills-always-on.instructions.md`, `exb-widget-development.instructions.md`. Only their catalog metadata was supplied.

**Routing And Fallbacks**
Actual order: guidance/memory → graph readiness → graph search + `ai:find` + Context7 → grep + declarations → broader graph + second `ai:find` → targeted graph + source → coverage/trace/snippet/declaration. **Only graph project `P` was queried.**
Fallbacks: #18’s empty graph result prompted #22’s grep; #27’s qualified-name search recovered the parent components. #25’s output overflow required #30’s resource read. #37 returned empty and was not pursued. **Yes, the previous answer ended with an `Evidence:` line.**

**Token Findings**
Exact input/output, cached-token, and billing totals are unavailable in the visible log. Observable counts: **14 file reads, 1 memory read, 3 tool-discovery calls, 7 graph calls, 2 `ai:find` calls, 2 greps, and 2 Context7 calls**. Local execution does not mean zero model tokens: returned text still enters context. Parallelism reduces waiting, not the amount of returned text.
1. **Trim the memory first.** #5 returned extensive unrelated Editor and exporter history. Split topic notes and load only a small router plus the relevant data-source note. This was an obvious large avoidable output.
2. **Exempt read-only Q&A from coding guidance.** #13-16 contributed no necessary evidence. Narrow the always-on rules in `AGENTS.md` to implementation/review tasks, and shorten the ExB/Jimu skills to routers with optional references.
3. **Make local authority sufficient.** Blanket Context7 rules forced #11/#20 despite authoritative installed source. Amend those rules to use Context7 when local evidence is missing or the question explicitly asks about newer releases.
4. **Use one targeted lookup, then source.** #22 immediately found the relevant files. Permit scoped literal search first for a named widget and enum value; reserve graph traces for actual relationship questions. Avoid global retries like #24 and unnecessary traces like #34.
5. **Reduce returned payloads.** Read callback ranges rather than #28’s whole component; request/filter exact `ai:find` matches so #25 does not emit unrelated fuzzy results. Keep coverage checks, but stop once behavior and API declarations are established.

The previous workflow was overbuilt for this question. The main improvement is **less mandatory context and smaller local results**, not adding more tools. No repository files were changed; this audit used the visible transcript and one additional Chronicle guidance read, excluded from the previous-turn log.


# ===========================================================================================


# ===========================================================================================