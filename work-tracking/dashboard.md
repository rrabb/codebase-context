# Work dashboard

Updated 261112. Read the [handbook](handbook.md) before changing tracking.

🔜 Next · 🔨 Active · 📋 Backlog · ⏳ Waiting · 💤 Deferred · ✅ Done · ❌ Dropped · ↪️ Superseded

## Start here

**Do now:**

1. [question] [WI-001](#wi-001) - Read the Esri terms for the ExB source and decide what derived content this public repo may hold. Then pick a license for the tool's own code.
2. [build] [WI-002](#wi-002) - Fix the stale lines in `docs/ai-index.md` listed on the row.

**Decisions you owe:** [WI-001](#wi-001): what Esri-derived content the public repo may hold, and which code license to use.

**Inbox:** See [Inbox](#inbox).

**In flight:** Nothing active.

**Import status:** Run 261112. Sources reviewed: tracked Markdown and all of `docs/` (including the ignored `docs/temp/`), TODO and FIXME comments, Git history, GitHub issues and pull requests, past VS Code chats, exported chat transcripts, and the Copilot CLI session store. No CHANGELOG exists. Candidates: 32 filed (20 WI rows, 12 Inbox), 3 rejected, 1 left. Report: [import report 261112-1653](notes/261112-1653-import/import-report.md). Retired and frozen 261112: roadmap `## To do` and the two `ai-index.md` §9 idea lists. README `## Status` and the `docs/temp/` lists are kept as reference. They aren't frozen and may drift from this dashboard.

## Overview

### General

| Item | What it is | Status | Type | Who | Size | Do after | Links |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="wi-001"></a>**WI-001** Review licensing of Esri-derived content and pick a code license | Skill cards quote upstream Esri code, and all 5 ExB skills say `license: Internal`. There's no LICENSE file and no `package.json` license field. Next: [question] Read the Esri terms for the ExB source and decide what derived content this public repo may hold. Then pick a license for the tool's own code. | 🔜 Next · High | [question] | dev | M | - | [Import C2](notes/261112-1653-import/import-report.md) |
| <a name="wi-014"></a>**WI-014** MCP server | Read-only stdio tools over a shared cached query engine. The CLI stays as the fallback. | 💤 Deferred until another project or agent host needs it · Low | [research] | both | L | - | [Import A5](notes/261112-1653-import/import-report.md), [mcp-design.md](../docs/mcp-design.md) |
| <a name="wi-015"></a>**WI-015** Copilot cloud agent and code review support | Both read committed files only. They have no ExB install unless `copilot-setup-steps.yml` runs project setup. | 💤 Deferred until the team needs it · Low | [research] | both | M | WI-007 | [Import A10](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |

### Benchmarks/Routing

| Item | What it is | Status | Type | Who | Size | Do after | Links |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="wi-003"></a>**WI-003** Benchmark the instruction versions | Compare the 261002, 261005, and current guidance in fresh chats on gpt6 luna and Claude Sonnet 5.5. The only results so far are the 261002 baseline. `vendors/exb/benchmarks/` doesn't exist yet. | 📋 Backlog · Medium | [research] | both | L | WI-018, WI-019 | [Import A8](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |
| <a name="wi-004"></a>**WI-004** Review the cpe-exb AI source index section | Roadmap item 11, part (a): you asked for feedback on the "AI source index" section of the cpe-exb AGENTS.md. A sandbox pilot found concrete review targets on 261110. Part (b) was dropped, and part (c) moved to WI-007. | 📋 Backlog · Medium | [research] | agent | S | - | [Topic](items/WI-004-ai-source-index-review.md), [Import A7](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |
| <a name="wi-017"></a>**WI-017** Adaptive `ai:find` output size | `--brief` is opt-in, and `--json` ignores it (about 46 KB in one test). Make output compact when confident matches exist, keep detail when evidence is thin, and cap `--json` size. Add `--brief` where the guidance leaves it out. The report lists 5 spots. | 📋 Backlog · Medium | [build] | agent | M | - | [Import C7](notes/261112-1653-import/import-report.md), [ai-find.mjs](../src/ai-find.mjs) |
| <a name="wi-018"></a>**WI-018** Sandbox routing test bed | A fresh project and chat with only this tool's installed guidance, and no user-level rules or memory. Tests then show what the repo's guidance does alone. Record the setup so runs repeat. | 📋 Backlog · Medium | [build] | both | M | - | [Import C10](notes/261112-1653-import/import-report.md) |
| <a name="wi-019"></a>**WI-019** Routing test prompt set | Prompts by routing type: literal, semantic, conceptual, member usage, OOTB behavior, thin or unknown, and mixed ExB and JSAPI. Include edge cases and hard prompts that only local source answers. Check each hard prompt by running it first with local tools off. Each prompt gets an answer key with file:line. Goes under `vendors/exb/benchmarks/`, with no private details. | 📋 Backlog · Medium | [build] | both | M | - | [Import C11](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |

### Tests

| Item | What it is | Status | Type | Who | Size | Do after | Links |
| --- | --- | --- | --- | --- | --- | --- | --- |

### Data Sources/Vendors

| Item | What it is | Status | Type | Who | Size | Do after | Links |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="wi-009"></a>**WI-009** ExB version-upgrade procedure | A repeatable steps list to regenerate indexes, facts, test expectations, and skill cards for a new ExB release. `docs/prebuilt-indexes.md` covers test expectations only. | 📋 Backlog · Medium | [build] | both | M | - | [Import C3](notes/261112-1653-import/import-report.md) |
| <a name="wi-012"></a>**WI-012** Support other ExB folder names | Support an ExB folder not named `ArcGISExperienceBuilder`. The roadmap compares two options: rewrite paths only at the start of a path, or store paths relative to the vendor folder. | 📋 Backlog · Low | [build] | agent | M | - | [Import A11](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |
| <a name="wi-013"></a>**WI-013** Phase 2 vendor settings | Move ExB folder paths, file patterns, and ignore rules out of the indexers into vendor settings. Design them from two real vendors. | 💤 Deferred until a second vendor arrives · Medium | [build] | agent | L | - | [Import A6](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |

### Indexing

| Item | What it is | Status | Type | Who | Size | Do after | Links |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="wi-005"></a>**WI-005** Publish pre-built bundles | `pack` and `install --prebuilt` work and were tested with a real 1.20 bundle. The bundles stay local until the redistribution review is done. | ⏳ Waiting: waits for the redistribution review in WI-001 · Medium | [build] | both | M | WI-001 | [Import A2](notes/261112-1653-import/import-report.md), [prebuilt-indexes.md](../docs/prebuilt-indexes.md) |
| <a name="wi-010"></a>**WI-010** Regenerate indexes in CI | The source idea was written for cpe-exb, which commits its indexes. This repo doesn't commit indexes, so here CI could run tests or build bundles. No `.github/workflows/` exists yet, and a runner needs an ExB install, like WI-015. | 📋 Backlog · Medium | [build] | agent | M | - | [Import B2](notes/261112-1653-import/import-report.md), [ai-index.md](../docs/ai-index.md) |
| <a name="wi-020"></a>**WI-020** Decide whether to ship or store indexes for the latest few ExB versions | About 74 MB per version. The roadmap section "Packaging pre-built knowledge" compares the options. Public shipping depends on WI-001. Private storage doesn't. | 📋 Backlog · Medium | [question] | dev | S | - | [Import C12](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |
| <a name="wi-016"></a>**WI-016** Semantic search with embeddings | Search by meaning with an embedding model. Fuse.js already handles typo-tolerant name search. MiniSearch (BM25 ranking) could replace the TF-IDF layer without embeddings. | 💤 Deferred until the dev approves a model download or network dependency · Low | [research] | both | L | - | [Import B1](notes/261112-1653-import/import-report.md), [ai-index.md](../docs/ai-index.md) |

### Project Upkeep

| Item | What it is | Status | Type | Who | Size | Do after | Links |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="wi-002"></a>**WI-002** Fix stale limitations and old paths in ai-index.md | L787 says `ai:find` has no fuzzy matching, but L743 says Fuse.js shipped. L792 says there's no test suite, but §10 describes 30 tests. L70, L658, and L723 name `.scripts/`, `docs/Build-Deployments.md`, and `code-style.instructions.md`, which aren't in this repo. L105 names `code-style.instructions.md` too, and the folder tree from L67 shows the cpe-exb layout. L260 and L289 say `npm run setup`, a cpe-exb command. Next: [build] Fix those lines and check the other Known limitations. | 🔜 Next · Medium, quick win | [build] | agent | S | - | [Import C1](notes/261112-1653-import/import-report.md), [ai-index.md](../docs/ai-index.md) |
| <a name="wi-006"></a>**WI-006** Purge private details from Git history | A cleanup commit redacted names, portal, and item IDs, but earlier commits still hold them. The agreed plan is to squash history to one clean commit and force-push, after a rehearsal. The repo stays public. Risk: a squash removes the commit hashes that docs cite as evidence. Unknown: whether GitHub keeps old commits reachable after a force-push. | 📋 Backlog · Medium | [build] | both | M | - | [Import A3](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |
| <a name="wi-007"></a>**WI-007** Team setup after clone | Setup runs `install` after every clone. Still open: <br>• setup must fetch codebase-context itself at a pinned version, because today it's a link to one developer's copy <br>• generated guidance stays gitignored <br>• `verify` must fail loudly when guidance is missing <br>• the generated AGENTS.md block reaches the cpe-exb team only after cpe-exb commits its AGENTS.md and `.codebase-context/` (roadmap item 11, part c) | 📋 Backlog · Medium | [build] | both | L | - | [Import A9, A7](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |
| <a name="wi-008"></a>**WI-008** More setup settings in config.json | Move setup and install choices into `.codebase-context/config.json`. Candidates: pinned version or tag (WI-007), skill install mode, whether generated instructions are gitignored, and which generators `refresh` runs. | 📋 Backlog · Medium | [build] | agent | M | - | [Import A12](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |
| <a name="wi-011"></a>**WI-011** Remove the install backup in cpe-exb | Delete the `.codebase-context/backup/` folder in cpe-exb once the linked skills show in the chat customizations view. Not checked: whether the folder still exists. | 📋 Backlog · Low | [build] | dev | S | - | [Import A1](notes/261112-1653-import/import-report.md), [roadmap.md](../docs/roadmap.md) |

## Inbox

Format: `YYMMDD [tag] text (from: you|agent)`. Append only. Reread before adding.

- 261112 [question] Should the index history notes in cpe-exb repo memory move into docs/ (roadmap item 7)? Commit dfe1690 deleted docs/history/ from this public repo (from: agent)
- 261112 [idea] ai:find falls back from api/symbols.tsv to regex symbols.tsv for non-exported names (from: agent)
- 261112 [research] Review the 12-file rarity cutoff in mentions.tsv (from: agent)
- 261112 [idea] Index summarized doc page bodies; check what docs-to-text already covers (from: agent)
- 261112 [idea] Shard ai:index:usages by package with worker threads (from: agent)
- 261112 [build] Grow the api/ known-good regression list; check the 1.20 expectations.json first (from: agent)
- 261112 [idea] Slim legacy symbols.tsv to non-exported names (from: agent)
- 261112 [idea] Reconsider tree.*.txt if ai:find and REPOSITORY-MAP cover browsing (from: agent)
- 261112 [build] Document or align the api-usage-fast and canonical dedup keys (from: agent)
- 261112 [idea] Add an automated private-data scan to pack (from: agent)
- 261112 [research] Enforce local-first routing with an agent hook or MCP only if WI-003 shows agents still skip local tools (from: agent)
- 261112 [build] Make the Context7 ExB exception apply to any project with .codebase-context/config.json, not just cpe-exb; add a README note for teammates (from: agent)

## Closed lookup

Done items keep their ✅ row above. Record dropped and rejected ideas so nobody proposes them again.

| Idea | Why it was dropped | See |
| --- | --- | --- |
| SCIP "find all usages" graph | Superseded. The ts-morph usage index (`api-usage/`) already answers usage questions. Rejected 261112 | [Import C5](notes/261112-1653-import/import-report.md) |
| TODOs quoted from upstream Esri code in skill cards (`layout-sidebar.md:196`, `geobim-document-explorer.md:197`) | Third-party code. Esri owns these TODOs, not this project. Rejected 261112 | [Import D1, D2](notes/261112-1653-import/import-report.md) |
| Remove the text the generated AGENTS.md block repeats from `exb-source-authority` (roadmap item 11, part b) | Dropped by the dev on 261110 in a sandbox pilot. Core facts and skill routing go through AGENTS.md on purpose so other hosts get them. Repeating them in Copilot isn't enough reason to remove them. Host loading wasn't tested. Revisit only for a specific trim with evidence that every host still gets the facts | [WI-004](#wi-004), [roadmap.md Decisions](../docs/roadmap.md#decisions) |
