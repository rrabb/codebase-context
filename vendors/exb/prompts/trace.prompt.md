---
name: trace
description: Trace how code works (call path, callers, data flow) across this project and the ExB framework using the graph and ai:find before any grep.
argument-hint: what to trace, e.g. "how data sources are initialized in our widgets"
agent: agent
---

# Trace: ${input:topic}

Follow these steps in order. Do not start with grep or file reads.

1. **Load tools.** Load codebase-memory with `tool_search` ("codebase-memory"). Read the Tool routing table in `.github/instructions/exb-source-authority.instructions.md` to pick graph projects.
2. **Project code.** In project `{{PROJECT_GRAPH}}`, run `search_graph` for the entry symbols, then `trace_path` (direction `both`), then `get_code_snippet` for each symbol you will cite.
3. **ExB APIs.** For each framework class the trace reaches, run `npm run ai:find -- <Owner> --members` (or a bare member name). Note the declaration, docs, and 2-3 SDK/OOTB usages.
4. **Framework and OOTB structure.** Trace into the `...-cpe-exb-ArcGISExperienceBuilder` graph (jimu `.d.ts`, `sdk-resources`) and the `...-cpe-exb-ootb-widgets` graph (`client/dist/widgets/**/src`) as needed.
5. **Coverage.** Call `check_index_coverage` once per graph project with every path you will cite. Read source for any partial, excluded, or stale range.
6. **Fallback.** Only when the steps above leave a gap: grep, then `.ai-context/exb/CLIENT-RUNTIME-MAP.md` for minified runtime behavior. State why the fallback was needed.

## Answer format

- A short call-path diagram, then the steps with file links.
- Separate the framework path from what our widgets do.
- End with `Evidence:` naming each tool used (graph projects, ai:find, coverage, grep, source read) and any fallback reason.
