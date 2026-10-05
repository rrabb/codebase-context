Test ExB routing rules

# USER QUESTION:
now let's load it in a fresh chat or subagent and see which paths and sequences are being used. give it a arcgis experience builder jimu framework related question is that difficult to answer by using model offline knowledge. 


I'm planning to run a subagent with a genuinely hard question without revealing the routing rules, just asking it to report every tool call in order — noting that whether it auto-loads instructions is itself a useful finding. I'm now drafting a suitably difficult question to pose.

Settling on asking how the OOTB List widget reacts to its data source becoming NotReady and which exact jimu API/enum/file reports that state, since this is hard to answer without real research. I'll instruct the subagent to do research only, not edit anything, and report its full ordered tool sequence, arguments, whether it loaded instruction files, and whether it ended with an Evidence line — running it with the default agent rather than Explore so it has the same tool access.




## SubAgent: 
ArcGIS Experience Builder 1.20 custom-widget repo). This is a RESEARCH-ONLY task: do not create, edit, or delete any files. Follow whatever repository instructions and guidance apply to you. Question to answer: "In ExB 1.20, how does the out-of-the-box List widget (common/list) react when its data source becomes NotReady (for example, when a required filter or parent data source is not ready)? Which jimu API reports that state, what are the exact enum/method names involved, and where in the List widget source is it handled? Give exact file paths and line numbers."

After answering, add a section titled "TOOL LOG" that lists EVERY tool call you made, in order, numbered. For each call give: the tool name, the key arguments (query, project name, file path, or command), a one-line result summary (e.g. "3 hits", "empty", "error: ..."), and why you chose that tool at that point. Also state:
  * Which instruction or guidance files you read or were given (by path), and whether they told you how to route searches.
  * Whether you used codebase-memory tools (and which graph project names), `npm run ai:find`, grep, file reads, and in what order.
  * Any point where you fell back to another tool, and why.
  * Whether your answer ends with an `Evidence:` line.

Return the full answer plus the TOOL LOG in your final message.

## SubAgent STEPS:
```
Read memory agent-instructions.md
Read memory exb-runtime-patterns.md 
Read memory context7.md 
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "query": "NotReady list common/list data source status",
  "limit": 20
}
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ArcGISExperienceBuilder",
  "query": "DataSourceStatus NotReady",
  "limit": 20
}
Ran `check_index_coverage` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "paths": [
    "client/dist/widgets/common/list/src/runtime/components/list-status-component/empty-and-not-ready-tips.tsx",
    "client/dist/widgets/common/list/src/runtime/components/data-source/data-source-component.tsx",
    "client/dist/widgets/common/list/src/runtime/components/list-widget.tsx",
    "client/dist/widgets/common/list/src/runtime/components/list/list-card-viewer.tsx"
  ], "diagnostics": "full",   "format": "tree"
}
Ran `get_architecture` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb",
  "aspects": [
    "file_tree"
  ],
  "path": ".ai-context/exb",
  "format": "tree"
}
Ran `trace_path` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "function_name": "EmptyAndNotReadyTipsElement",
  "direction": "both",
  "depth": 2,
  "limit": 50,
  "mode": "calls",
  "format": "tree"
}
Ran `get_code_snippet` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "qualified_name": "common.list.src.runtime.components.list-status-component.empty-and-not-ready-tips.EmptyAndNotReadyTipsElement",
  "source_mode": "full",
  "include_neighbors": true,
  "format": "tree"
}
Ran `get_code_snippet` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ArcGISExperienceBuilder",
  "qualified_name": "DataSourceStatus",
  "source_mode": "full",
  "include_neighbors": true,
  "format": "tree"
}
Read 
Read 
Read 
Read skill `exb-widget-development`
Read skill `jimu-framework-apis`
Read skill `guidance-best-practices`, lines 1 to 150
Read skill `guidance-testing`
Read skill `guidance-deployment`
Read skill `guidance-documentation`
Ran terminal command: npm run ai:find -- DataSourceStatus --members --usages 10
Ran Resolve Context7 Library ID Completed with input: {
  "libraryName": "ArcGIS Experience Builder",
  "query": "In ArcGIS Experience Builder 1.20, how do DataSourceStatus.NotReady, data source info, and DataSourceComponent report output data readiness? Need exact API names."
}
Ran `search_graph` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "query": "DataSourceStatus.NotReady",
  "file_pattern": "common/list/src/**",
  "limit": 40
}
Ran `get_file_outline` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "file_path": "client/dist/widgets/common/list/src/runtime/components/data-source/data-source-component.tsx",
  "limit": 100
}
Read skill `jimu-framework-apis`: 
Ran Query Documentation 
Completed with input: {
  "libraryId": "/websites/developers_arcgis_experience-builder",
  "query": "In ArcGIS Experience Builder 1.20, how do DataSourceStatus.NotReady and IMDataSourceInfo.status report output data readiness, and how can DataSourceComponent expose changes through its callback props? Need the exact enum members and callback names."
}
Read 
Read 
Read , lines 1 to 260
Read , lines 1 to 260
Ran terminal command: npm run ai:find -- DataSourceComponent --members --usages 10
Read , lines 240 to 326
Searched for regex `onDataSourceInfoChange|onDataSourceStatusChange|outputDataIsNotGenerated|EmptyAndNotReadyTipsElement|<DataSourceComponent` (`**/ArcGISExperienceBuilder/client/dist/widgets/common/list/src/**`), 17 results
Read , lines 1 to 130
Read , lines 470 to 570
Read , lines 1 to 180
Read , lines 20 to 70
Ran terminal command: npm run ai:find -- IMDataSourceInfo --members --usages 10
Ran `search_graph` 
Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "query": "getDsRecords",
  "file_pattern": "common/list/src/**",
  "limit": 10
}
Ran `get_code_snippet` 
Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "qualified_name": "common.list.src.runtime.components.data-source.data-source-component.onDataSourceInfoChange",
  "source_mode": "full",
  "include_neighbors": true,
  "format": "tree"
}
Tool execution failed
Read , lines 820 to 922
Read , lines 180 to 260
Ran `get_code_snippet` 
Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "qualified_name": "common.list.src.runtime.utils.list-service.getDsRecords",
  "source_mode": "full",
  "include_neighbors": true,
  "format": "tree"
}
Searched for regex `NotReady = 'NOT_READY'|onDataSourceInfoChange\?|onDataSourceStatusChange\?|onQueryRequired\?|interface IMDataSourceInfo` (`**/ArcGISExperienceBuilder/client/jimu-core/lib/**`), 9 results
Read , lines 180 to 326
Read 
Ran terminal command: npm run ai:find -- dataSourceStatusChanged --members
Ran `check_index_coverage` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets",
  "paths": [
    "client/dist/widgets/common/list/src/runtime/components/list-content-element.tsx",
    "client/dist/widgets/common/list/src/runtime/utils/list-service.tsx"
  ],
  "diagnostics": "full",
  "format": "tree"
}
Ran `check_index_coverage` Completed with input: {
  "project": "C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ArcGISExperienceBuilder",
  "paths": [
    "client/jimu-core/lib/data-source-component.d.ts",
    "client/jimu-core/lib/data-sources/interfaces/common-data-source-interface.ts",
    "client/jimu-core/lib/types/state.d.ts"
  ],
  "diagnostics": "full",
  "format": "tree"
}
Read , lines 75 to 110
Read , lines 160 to 178
Read , lines 225 to 242
Read , lines 625 to 638
Searched for regex `status: DataSourceStatus|export type IMDataSourceInfo` (`**/ArcGISExperienceBuilder/client/jimu-core/lib/types/state.d.ts`), 4 results
Searched for regex `const onQueryRequired|SET_PAGE.*value: 1|onQueryRequired=\{onQueryRequired\}` (`**/ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/data-source/data-source-component.tsx`), 6 results
Read , lines 1 to 120
Read 
Searched for regex `DataSourceStatus\.NotReady|onDataSourceInfoChange=|onDataSourceStatusChange=` (`**/ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/**`), 7 results
```

## SubAgent RESPONSE: 

ExB 1.20 reports this through `jimu-core`’s `DataSourceComponent`. Its `onDataSourceInfoChange(info, preInfo)` callback supplies `IMDataSourceInfo`; the state is `info.status`, typed as `DataSourceStatus`. The companion callback is `onDataSourceStatusChange(status, preStatus)`. The enum member is `DataSourceStatus.NotReady`, with value `'NOT_READY'`; its documentation describes it as the not-ready state for a widget output data source. See `common-data-source-interface.ts`, `state.d.ts`, and `data-source-component.d.ts`.

In the List widget, `DataCountComponent` wires both callbacks to `DataSourceComponent`. The info handler stores the info with `SET_DS_INFO` and refreshes records; the status handler stores the query status with `SET_QUERY_STATUS`. The List’s actual `NotReady` check is in `EmptyAndNotReadyTipsElement`: `dsInfo?.status === DataSourceStatus.NotReady && dataSource`. See `data-source-component.tsx`, `data-source-component.tsx`, `data-source-component.tsx`, and `empty-and-not-ready-tips.tsx`.

When `NotReady` is detected, the component shows the configured no-data message when there are no records and no loading state, and renders a warning identifying the output data source and its producing widget. `ListContentElement` mounts this status component at `list-content-element.tsx`. The warning text is assembled at `empty-and-not-ready-tips.tsx`.

There is a separate `onQueryRequired(queryRequiredInfo, preQueryRequiredInfo)` callback. List’s handler only resets the page to 1 when needed; it does not detect `NotReady`. The callback and handler are at `data-source-component.d.ts` and `data-source-component.tsx`. The producer-side status action is `dataSourceStatusChanged(dataSourceId, status)`, with action type `DataSourceStatusChanged`; it is distinct from the callbacks List uses to observe the status. See `app-actions.d.ts`.

### TOOL LOG
The source-authority instructions and `AGENTS.md` were provided in the conversation. They route code research through codebase-memory first, `npm run ai:find` for ExB APIs, and `grep` as a fallback, and require an Evidence: line. I also read the repo map and relevant skills. The code-style and documentation-style instruction files were listed in context but not read because this was research-only.

Codebase-memory was used with these graph projects: `C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets`, `C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ArcGISExperienceBuilder`, and `C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb`. npm run ai:find was used after graph research for API names; source reads followed, then grep was used to pin exact lines. Context7 was also used for supplemental API documentation. There was no tool_search tool available in this session, so the directly available codebase-memory tools were called as provided.

1. functions.memory with view, path /memories/. Result: listed memory files. Why: check existing memory before consulting repo notes.
2. functions.memory with view, path /memories/repo/agent-instructions.md. Result: repo-specific routing and indexing notes. Why: check stored repo guidance.
3. functions.memory with view, path /memories/repo/exb-runtime-patterns.md. Result: ExB API and vendor-search notes. Why: check relevant prior findings.
4. functions.read_file, context7 rule file C:\Users\reim5052\.claude\rules\context7.md, lines 1-100. Result: requires current library/API documentation lookup. Why: follow the provided global research rule.
5. functions.mcp_codebase-memo_search_graph, query NotReady list common/list data source status, OOTB widgets project. Result: 20 List-related symbols, including the not-ready component. Why: start code research with the mandated graph search.
6. multi_tool_use.parallel, dispatched calls 7-9. Result: grouped independent graph, coverage, and architecture lookups. Why: gather related evidence concurrently.
7. functions.mcp_codebase-memo_search_graph, query DataSourceStatus NotReady, ArcGISExperienceBuilder project. Result: found the DataSourceStatus enum in .ts and .d.ts. Why: identify the framework status declaration.
8. functions.mcp_codebase-memo_check_index_coverage, four List source paths, OOTB widgets project. Result: all no_recorded_issue; caveat says this is best-effort. Why: check graph coverage for candidate source paths.
9. functions.mcp_codebase-memo_get_architecture, path .ai-context/exb, repo project. Result: zero scoped nodes. Why: attempted graph view of the API index directory; this was not useful, so I read its router file directly.
10. multi_tool_use.parallel, dispatched calls 11-14. Result: grouped trace, source snippets, and repository-map read. Why: follow graph candidates and consult the local source router.
11. functions.mcp_codebase-memo_trace_path, EmptyAndNotReadyTipsElement, both directions, depth 2. Result: four callees and no graph-recorded callers. Why: check the status component’s graph relationships.
12. functions.mcp_codebase-memo_get_code_snippet, exact List not-ready component symbol. Result: source lines 14-49, including the NotReady condition and warning. Why: inspect the graph-identified implementation.
13. functions.mcp_codebase-memo_get_code_snippet, DataSourceStatus, ArcGISExperienceBuilder project. Result: enum source lines 25-63 and its NotReady documentation. Why: inspect the framework declaration.
14. functions.read_file, .ai-context/exb/REPOSITORY-MAP.md, lines 1-160. Result: confirmed ExB 1.20.0, authoritative vendor paths, and npm run ai:find workflow. Why: follow the repository’s API/source lookup instructions.
15. multi_tool_use.parallel, dispatched calls 16-23. Result: read relevant ExB instructions and skills. Why: load the project’s applicable framework and source-authority guidance.
16. functions.read_file, .github/instructions/exb-widget-development.instructions.md, lines 1-180. Result: documented local source authority and API lookup workflow. Why: apply ExB-specific guidance.
17. functions.read_file, .github/instructions/esri-skills-always-on.instructions.md, lines 1-120. Result: listed relevant guidance skills. Why: follow repository skill routing.
18. functions.read_file, .github/skills/exb-widget-development/SKILL.md, lines 1-200. Result: confirmed OOTB widget source and .d.ts are authoritative. Why: follow the ExB skill.
19. functions.read_file, .github/skills/jimu-framework-apis/SKILL.md, lines 1-200. Result: documented DataSourceComponent callbacks and API pitfalls. Why: use the relevant Jimu API guidance.
20. functions.read_file, .github/skills/guidance-best-practices/SKILL.md, lines 1-150. Result: read general coding guidance. Why: comply with AGENTS.md; no code changes were made.
21. functions.read_file, .github/skills/guidance-testing/SKILL.md, lines 1-150. Result: read testing guidance. Why: comply with AGENTS.md; no tests were needed for research.
22. functions.read_file, .github/skills/guidance-deployment/SKILL.md, lines 1-150. Result: read deployment guidance. Why: comply with AGENTS.md; deployment was not in scope.
23. functions.read_file, .github/skills/guidance-documentation/SKILL.md, lines 1-150. Result: read documentation guidance. Why: comply with AGENTS.md; no documentation files were changed.
24. multi_tool_use.parallel, dispatched calls 25-29. Result: API-index lookup, graph search, and data-source reference read. Why: verify exact API names and distinguish status reporting from query-required notifications.
25. functions.mcp_context7_resolve-library-id, ArcGIS Experience Builder and NotReady query. Result: selected /websites/developers_arcgis_experience-builder. Why: resolve the documentation library before querying it.
26. functions.run_in_terminal, npm run ai:find -- DataSourceStatus --members --usages 10. Result: large result saved to a chat resource file. Why: look up the verified enum, docs, and usages.
27. functions.mcp_codebase-memo_search_graph, query DataSourceStatus.NotReady, List source filter. Result: empty. Why: try an exact status reference search; followed with source/API lookup because graph search found no match.
28. functions.mcp_codebase-memo_get_file_outline, List data-source-component.tsx. Result: zero outline entries. Why: try to locate its declarations through the graph; followed with direct source reads.
29. functions.read_file, .github/skills/jimu-framework-apis/references/data-sources.md, lines 1-180. Result: summarized DataSource, status enum, and DataSourceComponent callbacks. Why: consult the focused data-source reference.
30. multi_tool_use.parallel, dispatched calls 31-35. Result: retrieved API output and read List source files and Context7 docs. Why: cross-check API contract against OOTB behavior.
31. functions.read_file, saved ai:find DataSourceStatus result. Result: identified jimu-core::DataSourceStatus, its declaration, and usage evidence. Why: inspect the full terminal result.
32. functions.mcp_context7_query-docs, selected ExB library, status and callback question. Result: docs described NotReady and DataSourceComponent callbacks. Why: supplement local declarations with current API docs.
33. functions.read_file, List data-source-component.tsx, lines 1-260. Result: found the info callback storing SET_DS_INFO and refreshing records. Why: verify the List’s handler.
34. functions.read_file, List empty-and-not-ready-tips.tsx, lines 1-100. Result: found the NotReady predicate and warning rendering. Why: read the exact response component.
35. functions.read_file, List list-widget.tsx, lines 1-260. Result: confirmed the List runtime component context; no direct NotReady branch there. Why: check whether the main widget handles status directly.
36. multi_tool_use.parallel, dispatched calls 37-43. Result: callback declarations, List render path, enum declaration, API search, and targeted grep. Why: trace how the info/status callbacks reach the UI.
37. functions.read_file, saved ai:find DataSourceComponent result. Result: confirmed the component and callback prop identities. Why: inspect the full API lookup output.
38. functions.read_file, List list-content-element.tsx, lines 1-130. Result: confirmed imports of EmptyAndNotReadyTipsElement and DataSourceComponent. Why: inspect the List composition.
39. functions.read_file, List list-content-element.tsx, lines 470-570. Result: read surrounding render code. Why: locate the relevant status component render section.
40. functions.read_file, jimu-core/lib/data-source-component.d.ts, lines 1-180. Result: callback signatures and documentation for DataSourceComponentProps. Why: verify exact method names and callback types.
41. functions.read_file, common-data-source-interface.ts, lines 20-70. Result: enum declaration with NotReady = 'NOT_READY'. Why: verify the exact enum member/value.
42. functions.run_in_terminal, npm run ai:find -- DataSourceComponent --members --usages 10. Result: large result saved to a chat resource file. Why: verify public declaration and callback members.
43. functions.grep_search, List source regex for callback and not-ready component names. Result: 17 hits in four files, with exact List line numbers. Why: pin locations for citations after graph/source inspection.
44. multi_tool_use.parallel, dispatched calls 45-50. Result: retrieved IMDataSourceInfo lookup and checked record/render flow. Why: confirm the info type and how empty records are surfaced.
45. functions.read_file, saved ai:find IMDataSourceInfo result. Result: identified the type and its DataSourceInfo interface. Why: inspect the full API search output.
46. functions.read_file, List list-content-element.tsx, lines 820-930. Result: confirmed EmptyAndNotReadyTipsElement mount and DataSourceComponent render. Why: read the exact UI integration point.
47. functions.read_file, jimu-core/lib/types/state.d.ts, lines 180-260. Result: this range did not contain the desired type declaration. Why: initial narrow read attempt; later reads targeted the correct lines.
48. functions.run_in_terminal, npm run ai:find -- IMDataSourceInfo --members --usages 10. Result: large result saved to a chat resource file. Why: verify the info type and its status property.
49. functions.mcp_codebase-memo_search_graph, query getDsRecords, List source. Result: found getDsRecords in list-service.tsx. Why: check the empty-record retrieval path.
50. functions.mcp_codebase-memo_get_code_snippet, attempted an onDataSourceInfoChange qualified name. Result: symbol not found because the exact qualified name did not match. Why: tried graph source retrieval; followed with direct file reads and grep.
51. multi_tool_use.parallel, dispatched calls 52-57. Result: inspected records logic, coverage, framework declarations, and List callback source. Why: complete the behavior trace and verify cited paths.
52. functions.read_file, saved ai:find IMDataSourceInfo result. Result: showed DataSourceInfo.status and IMDataSourceInfo locations. Why: retrieve the large terminal output.
53. functions.mcp_codebase-memo_get_code_snippet, exact getDsRecords symbol. Result: source lines 174-207, with no NotReady-specific branch. Why: establish whether List’s record helper detects the status.
54. functions.mcp_codebase-memo_check_index_coverage, List content and list-service paths using diagnostics=summary. Result: invalid diagnostics value. Why: attempted coverage check; retried with the supported value full.
55. functions.mcp_codebase-memo_check_index_coverage, Jimu declarations using diagnostics=summary. Result: invalid diagnostics value. Why: same invalid-value attempt; retried with full.
56. functions.grep_search, Jimu core declarations for enum, callbacks, and info type. Result: nine hits, including callback signature lines and enum line. Why: pin exact API declaration lines.
57. functions.read_file, List data-source-component.tsx, lines 180-335. Result: confirmed SET_DS_INFO, SET_QUERY_STATUS, onQueryRequired, and JSX wiring. Why: inspect all relevant List handlers together.
58. multi_tool_use.parallel, dispatched calls 59-65. Result: repeated coverage with valid diagnostics and read exact state/action declarations. Why: verify final citations and producer-side action naming.
59. functions.mcp_codebase-memo_check_index_coverage, List content and list-service paths with diagnostics=full. Result: both no_recorded_issue, with best-effort caveat. Why: retry the failed List coverage check.
60. functions.mcp_codebase-memo_check_index_coverage, Jimu declarations with diagnostics=full. Result: data-source declaration marked partial; state and enum had no recorded issue. Why: retry coverage and identify partial ranges to read directly.
61. functions.read_file, jimu-core/lib/types/state.d.ts, lines 75-110. Result: confirmed DataSourceInfo.status: DataSourceStatus. Why: read the exact declaration range.
62. functions.read_file, state.d.ts, lines 160-178. Result: confirmed IMDataSourceInfo = ImmutableObject<DataSourceInfo>. Why: read the exact alias.
63. functions.read_file, jimu-core/lib/app-actions.d.ts, lines 225-242. Result: confirmed DataSourceStatusChangeAction and its action type. Why: verify the producer-side action kind.
64. functions.read_file, app-actions.d.ts, lines 625-638. Result: confirmed dataSourceStatusChanged(dataSourceId, status). Why: verify the action factory name.
65. functions.run_in_terminal, npm run ai:find -- dataSourceStatusChanged --members. Result: large result saved to a chat resource file. Why: cross-check the action identity in the API index.
66. multi_tool_use.parallel, dispatched calls 67-69. Result: retrieved the action search output and pinned final state/query-handler lines. Why: final citation pass.
67. functions.read_file, saved ai:find dataSourceStatusChanged result. Result: confirmed action declaration at line 630 and action type. Why: inspect terminal output.
68. functions.grep_search, state.d.ts for status: DataSourceStatus and IMDataSourceInfo. Result: four hits at lines 85-87 and 171. Why: verify exact line numbers.
69. functions.grep_search, List component for onQueryRequired and page reset. Result: six hits, including handler lines 273-275 and callback wiring at 319. Why: verify that this separate callback only resets pagination.

No files were created, edited, or deleted, and no tests were run. The answer ends with an Evidence: line.

Evidence: codebase-memory graph search, trace, snippets, and coverage; npm run ai:find; grep; direct local source and declaration reads; Context7 documentation. The architecture lookup and one graph snippet lookup were unhelpful, so I fell back to direct reads. Two coverage calls were retried with diagnostics=full after summary was rejected.


## Agent Reasoning: 

### Analyzed routing efficiency and ordering conflicts:
The routing looks right: graph lookup first, then coverage, ai:find, and grep last for line pinning, with evidence lines present. But I notice some inefficiency — reading four guidance skills (deployment, testing, documentation, best-practices) for a research task because AGENTS.md treats them as always-on, which seems wasteful. I also used Context7 since its rule says to apply it for any library reference.

There's a mild ordering conflict: the routing table says graph first, but the workflow spec says REPOSITORY-MAP first, and REPOSITORY-MAP wasn't done until later. I also called get_architecture on a path that probably isn't graphed, which was wasted effort. More notably, get_file_outline returned zero entries for data-source-component.tsx even though coverage reported no issues elsewhere — that could be an indexing gap worth flagging. The empty result for searching "DataSourceStatus.NotReady" makes sense since the graph likely doesn't index member-access references. I'm also noting the check_index_coverage schema question around valid diagnostics values, and that the subagent had no tool_search available.

With 69 calls total, this is a heavy process — each ai:find call saved large output to a file and triggered an extra read, so I should suggest a brief/limited-output flag to cut down on redundant reads. Before finalizing, I want to spot-check the key answer by grepping the specific line in empty-and-not-ready-tips.tsx.

### Noted gaps and planned concise report with recommendations:
I notice the earlier answer missed data-count.tsx and record-load-status-a11y.tsx, which zero out counts when not ready — that's a real gap since the grep was narrowed too much to callback names. I should write up a concise report with recommendations, starting with flagging that AGENTS.md's "always-on" guidance skills forced the agent to read four irrelevant skills during research.

I also want to note a few other issues: the context7 global rule pulling in external docs even when local sources answer the question, conflicting with source-authority ranking (I could add an override line there); ai:find's output being consistently oversized, suggesting a --brief flag; the graph's inability to find member-access references or enum reads, meaning a final literal grep sweep is needed for "where is X used" questions; and an invalid diagnostic value in check_index_coverage worth noting. I'll present these as suggested fixes and ask which ones to apply, keeping the report concise since the user just wanted a test summary.

# ANSWER:

The routing worked. The subagent used the graph first, then `ai:find`, then read source, used grep only at the end to get exact line numbers, and finished with an `Evidence:` line. Its answer was correct but incomplete, and the run took 69 tool calls.

**Test question:** how does the out-of-the-box List widget react when its data source becomes NotReady, and which jimu API reports it? Models can't reliably answer this without local source.

**Sequence it used:**
1. It checked memory, then `search_graph` on the OOTB graph (call 5), then the vendor graph for the `DataSourceStatus` enum.
2. It ran `check_index_coverage` on file paths, as the rule now says.
3. It ran `trace_path` and `get_code_snippet` on `EmptyAndNotReadyTipsElement`.
4. Only then did it read `REPOSITORY-MAP.md` (call 14).
5. It ran `npm run ai:find` for `DataSourceStatus`, `DataSourceComponent`, `IMDataSourceInfo` and `dataSourceStatusChanged`.
6. It read the List source and the `.d.ts` files directly.
7. It used grep last, to pin exact lines.

**Problems found:**

| # | Problem | Cause |
| --- | --- | --- |
| 1 | **The answer missed two places that handle NotReady.** `data-count.tsx:32` and `record-load-status-a11y.tsx:22` both set counts to 0 when the status is NotReady. | The graph search for `DataSourceStatus.NotReady` came back empty, because the graph doesn't record enum member reads. `get_file_outline` also returned 0 entries for `data-source-component.tsx`. The final grep only looked for callback names. |
| 2 | It read four unrelated skills (deployment, testing, docs, best-practices) for a research-only question. | `AGENTS.md` says to treat them as always-on. |
| 3 | It queried Context7 even though the local sources already answered the question. | The user-level Context7 rule ("use even when you think you know") overrides the source-authority ranking, which puts official docs at rank 6. |
| 4 | Every `ai:find` result was over 20KB, so each one cost an extra file read (4 extra calls). | The default output is too large. |
| 5 | `check_index_coverage` with `diagnostics=summary` was rejected, and `get_architecture` on `exb` returned nothing. | It guessed a parameter value, and pointed the graph at a folder that isn't graphed. |

The subagent had no `tool_search` tool and called the codebase-memory tools directly. That's fine, but the "load with `tool_search` first" rule doesn't apply to subagents.

**Suggested fixes:**
- **For #1:** add a rule that "where is X used or handled" questions must end with a literal grep for the symbol across the scoped folder, because the graph misses enum and property reads.
- **For #2:** in `AGENTS.md`, say the guidance skills apply only when editing code, not for research.
- **For #3:** add one line saying that for ExB/Jimu questions, local sources come first and Context7 is only for when they fail.
- **For #4:** add a compact output mode to `ai:find` (or make it the default) so results stay under 20KB.
- **For #5:** add to repo memory that `.ai-context` isn't graphed and which `diagnostics` values are valid.

Which of these should I apply?

Evidence: test run in a separate subagent (default agent, research-only), grep to check the List widget gaps.