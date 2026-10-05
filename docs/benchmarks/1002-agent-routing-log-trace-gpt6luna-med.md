# ===========================================================================================

# PROMPT:
This is a RESEARCH-ONLY task: how does the out-of-the-box List widget react when its data source becomes NotReady, and which jimu API reports it?

After answering, add a section titled "TOOL LOG" that lists as a table EVERY tool call you made, in order, numbered. For each call give: the tool name, the key arguments (query, project name, file path, or command), a one-line result summary (e.g. "3 hits", "empty", "error: ..."), and why you chose that tool at that point. Also state:

Which instruction or guidance files you read or were given (by path), and whether they told you how to route searches.
Whether you used codebase-memory tools (and which graph project names), npm run ai:find, grep, file reads, and in what order.
Any point where you fell back to another tool, and why.
Whether your answer ends with an Evidence: line.
Return the full answer plus the TOOL LOG in your final message.


# ANSWER:

## STEPS
```
I’ll verify this against the repository’s ExB source-routing guidance, then trace the out-of-the-box List widget to its data-source status handling and report the exact Jimu API it uses. I’ll keep this read-only and record each tool call for the requested log.

Read memory 
Read 
Read skill `exb-widget-development`

The routing guidance says this is an OOTB-source question, so I’m starting with the dedicated OOTB code graph, not broad text search. I’ve confirmed the local source for ExB 1.20 is the authority; next I’m pinning down the List widget’s status branch and checking its Jimu status type/API.

Read skill `codebase-memory`
Ran `list_projects` Completed with input: {
  "detail": "identity",
  "format": "tree",
  "limit": 50
}
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "semantic_query": [
    "List widget reacts when its data source status is NotReady",
    "DataSourceStatus NotReady list widget data source status"
  ],
  "semantic_limit": 30,
  "limit": 50,
  "format": "tree",
  "detail": "default"
}
Read 
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "file_pattern": "common/list/src/.*",
  "query": "NotReady DataSourceStatus data source",
  "limit": 50,
  "format": "tree",
  "detail": "default"
}
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "name_pattern": "(?i).*list.*",
  "limit": 50,
  "format": "tree",
  "detail": "default"
}
Read 

The first graph query was too broad and ranked unrelated bundled code; narrowing to `common/list` returned no symbols. I’m now switching to the guidance’s literal-search fallback on the List source for `NotReady` and status names, then I’ll verify those exact lines and the framework declaration.

Ran `search_code` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "pattern": "NotReady|DataSourceStatus|status",
  "path_filter": "common/list/src",
  "mode": "compact",
  "regex": true,
  "limit": 30,
  "match_limit": 20,
  "source_max_lines": 30,
  "format": "tree"
}
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "file_pattern": "common/list/src/runtime/components/list-widget\\.tsx",
  "name_pattern": ".*",
  "limit": 100,
  "format": "tree",
  "detail": "default"
}
The graph confirms the relevant runtime files are the List widget and its data-source component, but its symbol lookup doesn’t give source text cleanly. I’m doing the targeted literal fallback now on those files; this should distinguish whether NotReady is rendered as an empty state, an error/loading state, or handled by a separate status component.

Ran `search_code` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "pattern": "NotReady",
  "path_filter": "common/list/src",
  "mode": "full",
  "regex": false,
  "limit": 30,
  "match_limit": 30,
  "source_max_lines": 40,
  "format": "tree"
}
Read , lines 1 to 280

The source shows the user-visible behavior: the List’s empty/not-ready component checks `dsInfo.status === DataSourceStatus.NotReady`, and shows a “no data” message plus an alert only for an output data source whose generated output isn’t ready. I’m tracing where `dsInfo` comes from and checking the enum declaration so I can name the reporting API precisely, not just the comparison.

Ran `search_code` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "pattern": "useListRuntimeState|DataSourceStatus|dsInfo",
  "path_filter": "common/list/src/runtime",
  "mode": "full",
  "regex": true,
  "limit": 60,
  "match_limit": 50,
  "source_max_lines": 60,
  "format": "tree"
}
Read , lines 1 to 360
Read , lines 360 to 760
Ran `get_code_snippet` Completed with input: {
  "qualified_name": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets.common.list.src.runtime.components.data-source.data-source-component",
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "source_mode": "full",
  "max_lines": 400,
  "max_output_tokens": 25000,
  "format": "tree"
}
Read 

I’ve traced the status flow: the List registers `onDataSourceInfoChange` on Jimu’s `DataSourceComponent` and stores `IMDataSourceInfo`; separately, `onDataSourceStatusChange` tracks query status for loading/query behavior. I’m checking the installed Jimu declaration/index entry and source coverage now, which will confirm the public callback and enum names.

Ran terminal command: npm run ai:find -- DataSourceComponent --members
Ran `check_index_coverage` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "paths": [
    "common/list/src/runtime/components/data-source/data-source-component.tsx",
    "common/list/src/runtime/components/list-status-component/empty-and-not-ready-tips.tsx",
    "common/list/src/runtime/components/list-content-element.tsx"
  ],
  "diagnostics": "full",
  "format": "tree"
}
Read 
Ran terminal command: npm run ai:find -- onDataSourceInfoChange
Ran terminal command: npm run ai:find -- DataSourceStatus --members
Read , lines 1 to 100
Read 
Read , lines 100 to 170
Read , lines 1 to 75
Read , lines 1 to 150
The local `.d.ts` confirms two related callbacks: `onDataSourceInfoChange(info)` supplies `IMDataSourceInfo`, and `onDataSourceStatusChange(status)` supplies the `DataSourceStatus` enum directly. The enum documentation says `NotReady` is for widget output data sources; I’m doing one last read of the exact List render and callback blocks before summarizing the distinction.
Read , lines 70 to 105
Read 
Read , lines 175 to 326
The exact source and declaration agree: the List UI consumes `info.status`, while the explicit status-change callback updates its query-status state. One remaining instruction asks me to check current library documentation, so I’m testing whether Context7 has the relevant ExB reference; the checked-in 1.20 declarations remain the version-specific source of truth.
Read skill `context7-mcp`
Ran Resolve Context7 Library ID Completed with input: {
  "libraryName": "ArcGIS Experience Builder",
  "query": "In ArcGIS Experience Builder 1.20, how does the out-of-the-box List widget react when its data source status becomes NotReady, and which jimu-core DataSourceComponent callback and DataSourceStatus enum report that state?"
}
Ran Query Documentation Completed with input: {
  "libraryId": "/websites/developers_arcgis_experience-builder",
  "query": "For DataSourceComponent and DataSourceComponentProps, what do onDataSourceInfoChange(info) and onDataSourceStatusChange(status) report, what does DataSourceStatus.NotReady mean for widget output data sources, and what should a widget do while an output data source is NotReady?"
}
Context7 agrees with the local declarations on the meaning of `NotReady`. I’m checking the repository’s dedicated Jimu framework API guidance as well, since this question is specifically about the data-source component and callbacks; after that I’ll give the behavior and the complete call log.
Read skill `jimu-framework-apis`
```


## RESPONSE: 


**Answer**
In the ExB 1.20 List widget, `NotReady` means a widget-generated output data source is not ready to query. Jimu’s declaration says queries against it return no records; when the generating widget is ready, it changes the status to `Unloaded`.

The List’s not-ready UI checks `dsInfo?.status === DataSourceStatus.NotReady`. When true and a data source instance exists, it shows a warning alert identifying the output data source and its generating widget. If the records are empty and the List is not showing loading, it also shows the configured no-data message (or the default), with a warning icon. See the List status component.

The Jimu API is `DataSourceComponent` from `jimu-core`, with two related callbacks:

- `onDataSourceInfoChange(info)` supplies `IMDataSourceInfo`; the List stores it and reads `info.status` for the not-ready UI.
- `onDataSourceStatusChange(status)` supplies the `DataSourceStatus` enum directly. The List uses this callback to update its query-status state.

So the status value is `DataSourceStatus.NotReady`; the List’s warning specifically reads it from `IMDataSourceInfo.status`. The wiring is in the List data-source component, and the public callback signatures are in DataSourceComponentProps. The enum’s local definition and meaning are in `common-data-source-interface.d.ts`.

**TOOL LOG**
`R` below means the workspace root. Parallel batch calls and their child calls are listed separately.

| # | Tool | Key arguments | Result | Why |
|---:|---|---|---|---|
| 1 | `functions.memory` | View `/memories/repo/agent-instructions.md` | Found notes on graph routing, project names, and coverage checks | Check repository-specific working notes |
| 2 | `functions.read_file` | `exb-widget-development.instructions.md` | Read ExB source-authority and OOTB guidance | Ground the research in the installed ExB version |
| 3 | `tool_search.tool_search_tool` | Query for codebase-memory graph/search/snippet/coverage tools | Loaded graph search, snippet, schema, and status tools | Follow the repository’s graph-first search route |
| 4 | `functions.read_file` | `SKILL.md` | Read OOTB and local declaration workflow | Use version-specific widget evidence |
| 5 | `tool_search.tool_search_tool` | Query for `trace_path` and `check_index_coverage` | Loaded coverage and related graph tools | Prepare to verify candidate source paths |
| 6 | `functions.read_file` | `SKILL.md` | Read graph workflow and evidence-tier guidance | Use graph search with appropriate fallback |
| 7 | `tool_search.tool_search_tool` | Query for `list_projects` and `trace_path` | Loaded project-list and trace tools | Identify the exact indexed OOTB graph |
| 8 | `mcp_codebase-memo_list_projects` | All indexed projects | Six projects listed, including `...-cpe-exb-ootb-widgets` | Select the graph that covers OOTB widgets |
| 9 | `mcp_codebase-memo_search_graph` | OOTB project; semantic queries for List and `NotReady` | 30 results, mostly unrelated bundled code; more available | First graph search for the behavior |
| 10 | `functions.read_file` | Search result content file, lines 1-260 | Confirmed semantic results were mostly irrelevant | Inspect oversized graph output before narrowing |
| 11 | `mcp_codebase-memo_search_graph` | OOTB project; `common/list/src/.*`, query `NotReady DataSourceStatus data source` | Zero results | Try a path-scoped graph query |
| 12 | `mcp_codebase-memo_search_graph` | OOTB project; name pattern `(?i).*list.*` | 50 results from 898 matches; surfaced List-related candidates | Locate the List implementation symbols |
| 13 | `functions.read_file` | Search result content file, lines 1-220 | Found relevant List-related paths among matches | Inspect the candidate list |
| 14 | `mcp_codebase-memo_search_code` | OOTB project; `NotReady|DataSourceStatus|status`, `common/list/src` | 30 results; 448 literal matches reported | Search source literals after graph symbol search was inconclusive |
| 15 | `mcp_codebase-memo_search_graph` | OOTB project; exact guessed `list-widget.tsx` path pattern | No nodes matched | Test whether that candidate file was indexed |
| 16 | `mcp_codebase-memo_search_code` | OOTB project; literal `NotReady`, `common/list/src` | Six relevant results, including the empty/not-ready component | Find the direct status comparison |
| 17 | `functions.read_file` | Search result content file, lines 1-280 | Saw the `DataSourceStatus.NotReady` UI condition | Read the returned source excerpts |
| 18 | `mcp_codebase-memo_search_code` | OOTB project; `useListRuntimeState|DataSourceStatus|dsInfo`, `common/list/src/runtime` | 31 results with List status state and data-source component candidates | Trace where the status value is stored and used |
| 19 | `functions.read_file` | Search result content file, lines 1-360 | Found `useListRuntimeState`, reducer, and component excerpts | Inspect the first part of the large result |
| 20 | `functions.read_file` | Same result file, lines 360-760 | Found List component and status-related source excerpts | Inspect the continuation for callback wiring |
| 21 | `mcp_codebase-memo_get_code_snippet` | OOTB project; full `common/list/.../data-source-component` module | Returned the full 326-line module | Verify status callbacks and `DataSourceComponent` props |
| 22 | `functions.read_file` | Snippet content file, lines 1-360 | Confirmed `onDataSourceInfoChange`, `onDataSourceStatusChange`, and `DataSourceComponent` wiring | Inspect the complete returned source |
| 23 | `multi_tool_use.parallel` | Batch: OOTB coverage check and `ai:find` for `DataSourceComponent` | Dispatched both calls; details follow | Run independent source-coverage and API-index checks together |
| 24 | `mcp_codebase-memo_check_index_coverage` | OOTB project; three List source paths | All three had `no_recorded_issue`; graph coverage remains best-effort | Verify coverage for cited graph evidence |
| 25 | `functions.run_in_terminal` | `npm run ai:find -- DataSourceComponent --members` | Identified public `jimu-core` component and callback props | Resolve the Jimu API from the project index |
| 26 | `functions.read_file` | Terminal result content file, lines 1-260 | Confirmed `DataSourceComponentProps` members and declaration location | Inspect the large API-index result |
| 27 | `functions.run_in_terminal` | `npm run ai:find -- onDataSourceInfoChange` | Resolved callback to `DataSourceComponentProps` | Confirm the exact owning API for the info callback |
| 28 | `multi_tool_use.parallel` | Batch: `ai:find` for `DataSourceStatus` and read of component declaration | Dispatched both calls; details follow | Check enum identity while reading callback declarations |
| 29 | `functions.run_in_terminal` | `npm run ai:find -- DataSourceStatus --members` | Located public enum and `NotReady` member | Verify enum membership and declaration path |
| 30 | `functions.read_file` | `R/ArcGISExperienceBuilder/client/jimu-core/lib/data-source-component.d.ts`, lines 1-100 | Read component props and API documentation | Verify local declaration details |
| 31 | `functions.read_file` | Terminal result content file, lines 1-250 | Confirmed `NotReady` enum member and local declaration files | Inspect enum lookup output |
| 32 | `multi_tool_use.parallel` | Batch: read component props, enum, and state declarations | Dispatched three reads; details follow | Cross-check callback types, enum semantics, and info structure |
| 33 | `functions.read_file` | `R/ArcGISExperienceBuilder/client/jimu-core/lib/data-source-component.d.ts`, lines 100-170 | Confirmed callback signatures and mount/change behavior | Verify both status-reporting callbacks |
| 34 | `functions.read_file` | `R/ArcGISExperienceBuilder/client/jimu-core/lib/data-sources/interfaces/common-data-source-interface.d.ts`, lines 1-75 | Confirmed `NotReady` is for output data sources and queries return empty results | Verify the enum’s local contract |
| 35 | `functions.read_file` | `R/ArcGISExperienceBuilder/client/jimu-core/lib/types/state.d.ts`, lines 1-150 | Confirmed `DataSourceInfo.status` uses `DataSourceStatus` | Verify the info object’s status field |
| 36 | `multi_tool_use.parallel` | Batch: read List empty-state source, List callback source, and state declaration | Dispatched three reads; details follow | Confirm exact runtime behavior and wiring directly |
| 37 | `functions.read_file` | `R/ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/list-status-component/empty-and-not-ready-tips.tsx`, lines 1-55 | Confirmed alert and empty-message conditions | Verify what the user sees |
| 38 | `functions.read_file` | `R/ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/data-source/data-source-component.tsx`, lines 175-326 | Confirmed List callback implementations and component props | Verify which callback feeds each state value |
| 39 | `functions.read_file` | `R/ArcGISExperienceBuilder/client/jimu-core/lib/types/state.d.ts`, lines 70-105 | Reconfirmed `DataSourceInfo.status` type | Tie `info.status` to the enum |
| 40 | `functions.read_file` | `SKILL.md` | Read requirement to resolve and query current docs | Follow the provided API-documentation guidance |
| 41 | `tool_search.tool_search_tool` | Query for Context7 resolve and query tools | Loaded Context7 library resolution and documentation tools | Check the official documentation as instructed |
| 42 | `mcp_context7_resolve-library-id` | ArcGIS Experience Builder; full question included | Resolved `/websites/developers_arcgis_experience-builder` | Get the required Context7 library ID |
| 43 | `mcp_context7_query-docs` | Resolved ExB ID; callbacks, `NotReady`, and output data source behavior | Official docs agreed with the local declarations | Cross-check the local findings against current docs |
| 44 | `functions.read_file` | `SKILL.md` | Confirmed ExB 1.20 guidance for these callbacks and data-source APIs | Check the dedicated Jimu API guidance |

**Routing and tools:** I was given `AGENTS.md`, `exb-source-authority.instructions.md`, and `context7.md`. The source-authority guidance and `AGENTS.md` explicitly route structural searches to codebase-memory, ExB API lookups to `npm run ai:find`, and literal searching to grep/search fallbacks. The Context7 guidance requires a current documentation lookup for API questions.

I read `exb-widget-development.instructions.md`, `SKILL.md`, `SKILL.md`, `SKILL.md`, `SKILL.md`, and `/memories/repo/agent-instructions.md`. The other listed style/guidance files were not opened because this was read-only research.

I used codebase-memory tools against the `...-cpe-exb-ootb-widgets` graph only. I used `npm run ai:find` for `DataSourceComponent`, `onDataSourceInfoChange`, and `DataSourceStatus`. I used codebase-memory `search_code` as the literal-search fallback, but did not use `grep_search`. The broad semantic graph search and one guessed exact path were unhelpful, so I narrowed to the List source and read the returned OOTB code and local declarations directly. The answer ends with an `Evidence:` line.

Evidence: OOTB codebase-memory search/snippet and coverage check; `npm run ai:find`; direct List source and Jimu declaration reads; Context7 ExB documentation.

# ===========================================================================================


# PROMPT:
Now analyze token usage and tool log and give me feedback/suggestions on what i can do to reduce token usage and rely on local tools and what things i can do to the project/guidance/skills/instructions etc. to make this prompt more efficient. 


# ANSWER:

## STEPS
```
I’ll assess the prior run from its actual call sequence and outputs, separating unavoidable research from avoidable overhead. Since you’re asking how to improve the instruction/skill setup, I’ll also check the agent-customization guidance before suggesting concrete changes.
Read skill `agent-customization`
Read skill `chronicle`, lines 1 to 260
The local session store can tell us whether this was local-only and what session-level usage proxies exist, but it cannot provide exact per-call token billing on the SQLite backend. I’m checking its schema so I can distinguish measured facts from estimates rather than invent a token count.
Read skill `chronicle`, lines 260 to 352
Queried session store
Queried session store
The local store is active but doesn’t contain a searchable row for this in-progress List research turn, so it cannot supply measured token totals for it. I’m checking whether it has nearby sessions for this workspace; if not, I’ll keep the analysis scoped to the visible 44-call log and clearly label token observations as proxies.
Queried session store
There is a matching indexed workspace session after all, with two recorded turns. I’ll inspect only that session’s turn lengths and file/tool records, which can show repetition and context size but still not exact token billing on this local backend.
Queried session store
Queried session store
```
## RESPONSE: 

**What The Run Shows**
I can’t give an exact token count. The local session store is SQLite, which does not record per-event token usage. It did confirm 19 recent `GitHub Copilot Chat` sessions in this workspace and 15 distinct files recorded for the List research session, but those are activity proxies, not token metrics.

The previous answer logged 44 calls, including parallel wrappers and their child calls. The clearest avoidable cost was oversized output: one search result was about 47 KB and was read in two chunks; other returned results were about 8-15 KB. The search began with broad semantic queries, and the full tool log added substantial output because you explicitly requested every call. The four Context7 calls (tool discovery, library resolution, and documentation lookup across two tool calls, plus skill reading) were required by the supplied global guidance, even though local source and declarations answered the question.

**Highest-Value Changes**
1. **Use a narrower search path.** For this question, start with one literal `NotReady` search scoped to `common/list/src/runtime`, then read the matching List component directly. The initial broad semantic search and broad List name search added noise. Keep one `check_index_coverage` call for the final cited source paths.

2. **Keep tool output small.** Prefer compact search results with a tight path filter and a short source excerpt. Read only the matching file sections. Avoid reading the same code once from a graph snippet and again from the workspace, or rereading overlapping declaration ranges.

3. **Reduce redundant API lookups.** `npm run ai:find -- onDataSourceInfoChange` identifies its owner, `DataSourceComponentProps`. The separate broad `DataSourceComponent --members` lookup returned many usage details that weren’t needed. Then read the local callback and enum declarations together.

4. **Trim always-on guidance.** `AGENTS.md` repeats the routing rules from `exb-source-authority.instructions.md`. Keep the short route and vendor-safety rules in the always-on files, and move the detailed search workflow into the relevant skill. The widget-building instructions are useful for implementation, but most of their setup guidance is unnecessary for read-only OOTB research.

5. **Narrow the Context7 rule if local-first research is the goal.** The user-level `context7.md` currently requires an online lookup for API questions, so repo-only guidance won’t prevent those calls. Add an explicit exception there for version-specific ExB questions that are fully answered by local `.d.ts` files and OOTB source. Keep Context7 for documentation gaps, external services, or explicit requests for current online docs.

6. **Make exhaustive tool logs opt-in.** The previous request required every call, so the long table was appropriate for that audit. For routine research, ask for a concise evidence summary instead. For audits, keep arguments and results terse; parallel batches can be shown compactly while still naming their child calls.

With those changes, a similar question could likely use about 6-8 calls: one scoped source search, one or two local source/declaration reads, one or two `ai:find` lookups, and one coverage check. Exact call count depends on whether the deferred tools are already loaded.

The repository’s ExB source-authority guidance already describes the right local sources. The main opportunity is reducing repeated discovery and oversized returned content, not adding more tooling.

**Guidance Checked**
I read the agent-customization skill and chronicle skill. The local session store reports that this was a local SQLite session, so exact token billing isn’t available; I based the recommendations on the visible call log and the recorded file activity. I did not change any project files.

Evidence: prior OOTB research tool log, local session-store queries, and the agent-customization and chronicle guidance.


# ===========================================================================================