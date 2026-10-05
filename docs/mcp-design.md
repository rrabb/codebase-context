# Deferred MCP Server

## Recommendation

Keep item 8 deferred. When needed by another project or agent host, add a local read-only stdio server around shared query functions. Keep the CLI working. Do not introduce hosted infrastructure, automatic downloads, index builds, or vendor mutations in the first server.

## Implementation

| Step | Work |
| --- | --- |
| Shared query module | Separate `ai-find.mjs` argument parsing/printing from index loading, ranking, usage lookup, and evidence construction. Pass project context explicitly instead of a process-wide root so projects cannot leak data into one another |
| Local transport | Official MCP TypeScript SDK, pinned stable release at implementation time; `serve --project <root>` over stdio. Protocol only on stdout; diagnostics on stderr |
| Small tool set | `find_api`, `get_facts`, `search_guide`, `index_status`. Include ExB/Jimu/widgets/framework/layouts/settings/UI/OOTB keywords in tool descriptions. No arbitrary shell, write, network, or file-path tools |
| Inputs | Validated query, vendor ID, member/scope filters, limit/cursor. Fixed configured project root; callers cannot select arbitrary folders |
| Results | Compact text plus structured results: vendor/version, declarations/imports, source path/line, visibility, skill links, coverage gaps, escalation, total/truncation/cursor. Scoped usage pagination must retain full totals; no misleading completeness claims |
| Caching | Load catalog/docs/summary once; lazy-load relevant usage packages. Cache by resolved project path, vendor version, and index generation. Bound memory; avoid storing all usage rows for every project |
| Reload | Check metadata/ledger generation and changed files, invalidate affected caches; atomic generation changes must not produce mixed old/new results. Return a stale/missing-index error with the CLI recovery command |
| Routing | Installed instruction: prefer available MCP lookup tools, otherwise use CLI; structural questions still use codebase-memory. MCP complements, not replaces, architecture/UI/widget skills and source verification |
| Tests | Same versioned expectations against CLI and MCP outputs; malformed inputs, concurrent requests, pagination, reload, wrong version, missing indexes, project isolation, startup/shutdown |

Read-only annotations help clients present tools but do not enforce access control. Enforce restrictions in server code. Treat indexed source/docs as untrusted data and never execute their instructions. Begin with one configured project per process; add multi-project support only when needed.

## Tradeoffs

| Aspect | Benefits | Costs / risks |
| --- | --- | --- |
| Agent workflow | No shell quoting or per-project npm script requirement; explicit validated tool contract | Another MCP registration/process; host tool discovery can still miss it |
| Repeated queries | Reuses parsed tables and search indexes; avoids spawning Node on every call | Persistent memory; cache invalidation and concurrency require care |
| First request | One server startup per session | Handshake plus cold loading can equal or exceed a CLI call |
| Context | Compact responses/pagination can reduce prompt size | Verbose tool schemas/results can add tokens; MCP alone does not make responses smaller |
| Reliability | Clear missing/stale/version errors, shared behavior tests | New transport/version dependencies and lifecycle failures |
| Privacy | Local stdio, no hosted index or credentials needed | Returned evidence still reaches the assistant like CLI output; project isolation must be explicit |
| Maintenance | One shared lookup engine for both interfaces | Refactoring and parity tests are required; a subprocess wrapper alone gives little caching benefit |

## Performance Baseline

Measured 2026-10-05 on the current Windows/Node 24 machine: three independent `ai-find.mjs DataSourceManager --brief --json` calls took 797, 824, and 830 ms, each returning 46,368 bytes. Measurements included process startup, parsing, ranking, and output capture, not LLM/tool-host overhead. `--brief` currently affects text output, not JSON size.

Source: `src/ai-find.mjs` `main()` loads ten catalog/documentation/summary tables per CLI invocation and then loads relevant usage data. A persistent server could reuse those tables; this is an expected benefit, not a measured speedup. Loading all tables eagerly would increase idle memory, so cache usage packages lazily with a bounded policy.

Before deciding: benchmark cold startup, warm p50/p95 lookup latency, process RSS, response bytes/tokens, concurrent queries, reload latency, and complete agent tasks against the CLI. Keep the CLI baseline as a fallback. The small stdio protocol cost is unlikely to dominate disk parsing, but that too should be measured.

## Documentation Basis

Current official SDK docs support stdio transport, input/output validation, structured results, and read-only annotations. Package entry points differ between SDK release lines; verify and pin a stable version when implementing rather than copying a prerelease example.

Sources: https://github.com/modelcontextprotocol/typescript-sdk and its `docs/servers/tools.md`, `docs/get-started/first-server.md`, and `docs/troubleshooting.md`, retrieved with Context7 on 2026-10-05. This document is a proposal; no server or performance improvement is implemented.