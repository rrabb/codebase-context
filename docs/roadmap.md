# Roadmap and decisions

Working notes for codebase-context: open work, decisions with their reasons, and options we compared. Newest decisions first.

## To do

| # | Item | Notes |
| --- | --- | --- |
| 1 | Remove the install backup in cpe-exb | `cpe-exb/.codebase-context/backup/2026-10-05T20-52-37-288Z/` holds the skills and instructions replaced by the first `install --force`. Delete once the linked skills are confirmed in the chat customizations view. The folder is ignored by `.codebase-context/.gitignore`. |
| 2 | Pre-built bundles implemented; public upload pending | `pack` and `install --prebuilt <zip or HTTPS URL>` support exact version checks, hashes, path rebasing, and staged replacement. Real 1.20 bundle tested. User chose to keep assets local pending Esri redistribution review. See `docs/prebuilt-indexes.md`. |
| 3 | Purge private details from git history | The repo is public. Commit `dfe1690` removed the chat transcripts and benchmark logs (now in ignored `docs/temp/`) and redacted names, portal, and item IDs, but earlier commits still contain them. Backlog (agreed, repo stays public): squash history to one clean commit and force-push. |
| 4 | ~~Vendor folder from config everywhere~~ (done) | Indexers read `vendors[].root`; tests now resolve versioned path placeholders too. |
| 5 | ~~Expected test results per vendor version~~ (done) | Reviewed 1.20 identities, paths/lines, rankings, and coverage floors in `vendors/exb/tests/1.20.0/expectations.json`. Unknown versions fail explicitly. |
| 6 | ~~Trim the always-on instruction~~ (done, then corrected) | Detailed notes moved to the research skill. Review on 2026-10-05 found the trim dropped basic facts and mistake-prevention rules; restored them (portal stand-in, "runs inside ExB", deferred-tool rule, grep limits, JSAPI `.d.ts` location, examples) and added a "setup has not run" rule. Installed size 8.6 KB; budget raised to 10 KB because correctness comes first. |
| 7 | Index-history notes | Move the index history from cpe-exb repo memory (`/memories/repo/exb-runtime-patterns.md`) into `docs/`. |
| 8 | MCP server (deferred) | Not implemented. Proposed read-only stdio tools over a shared cached query engine; CLI remains fallback. Design, costs, and measured CLI baseline: `docs/mcp-design.md`. |
| 9 | Phase 2 (deferred) | Move ExB folder paths, file patterns, and ignore rules out of the indexers into vendor settings. Do it when a second vendor arrives, so the settings are designed from two real cases. |
| 10 | Fix bugs in commit `9998589` (awaiting OK) | `install --prebuilt --force` also force-replaces hand-edited instructions and skills (give the bundle its own flag); blank lines between `if` and body plus mixed line endings in `bundles.mjs`, `test-expectations.mjs`, `pack.mjs`; style misses in `install.mjs`; `lstatSync` on local bundle path; require `--sha256` for URL downloads. |
| 11 | Core ExB block in AGENTS.md (greenlit) | `install` renders one core template (basic ExB facts, skill table, routing summary) into a marked, generated section of the project's AGENTS.md, and adds a `CLAUDE.md` containing `@AGENTS.md`. No machine-specific values in the block (graph names stay in the gitignored instructions file). Move cpe-exb AGENTS.md "AI source index" section (4.6 KB) into this repo's docs. Avoid repeating the block's text in `exb-source-authority`. |
| 12 | Benchmark the instruction versions (greenlit) | Compare 261002, 261005, and the fixed version: rerun the routing benchmark prompts (`cpe-exb/docs/1002-agent-routing-log-trace-*`) and a fixed set of basic ExB questions (client/server, jimu, app config, layouts, widget config) graded by the user. Each version needs fresh chat sessions. |
| 13 | Team setup after clone (decided; work open) | Project setup runs `install` after every clone. Open work: setup must get codebase-context itself (today it is a junction to one developer's working copy) with a pinned version; keep generated instructions and skills gitignored; `verify` in setup must fail loudly when guidance is missing. |
| 14 | Vendor path rewriting in bundles (proposal) | Today only our generated text contains the folder name, but a blanket text replace can also hit Esri text or unrelated strings. Proposal: rewrite only known path fields listed in `bundle.json`, or store vendor-relative paths in the index. |
| 15 | Copilot cloud agent and code review (open) | They read committed files only (AGENTS.md, `.github/instructions`, `.github/skills`) and have no ExB install unless `copilot-setup-steps.yml` runs project setup. The ExB download uses `downloads.arcgis.com/.../secured/`, which may need Esri credentials. Confirm whether the team uses these agents. |

## Decisions

| 2026-10-05 | Correct ExB answers and tool use come before token savings | User goal; trims must not drop basic facts or mistake-prevention rules |
| 2026-10-05 | Guidance must work for the user's team, other ExB projects, VS Code Copilot and its subagents, Claude Code / Codex, and the Copilot cloud agent | Hosts read different files, so the core facts go into AGENTS.md (item 11) |
| 2026-10-05 | Every ExB-based project's setup downloads and installs ExB, then runs `install` | ExB widgets cannot run without ExB; generated files contain machine-specific values and are not committed |
| 2026-10-05 | `init` and setup checks in `verify` added; `install` refuses to overwrite a generated file edited by hand (hash in `.codebase-context/installed.json`) unless `--force` | Hand edits to generated files were silently lost on the next install |
| 2026-10-05 | Chat transcripts and benchmark logs stay out of git (`docs/temp/`, ignored) | The repo is public; they contain internal paths, user names, and URLs |
| 2026-10-05 | Skill edits made in a project land in this repo (skills are junctions); `verify` warns about uncommitted changes here | One copy of each skill; fixes reach every project. Cost: edits are easy to forget to commit, and a half-finished edit affects every linked project at once. |
| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-05 | Skills are linked (junction) into projects; instructions and prompts are rendered copies with a "generated" header | VS Code finds skills through junctions (tested). Instructions contain project values (graph names), so they must be rendered per project. |
| 2026-10-05 | Install backups go to `.codebase-context/backup/<time>/`, ignored by `.codebase-context/.gitignore` | Safety copy of hand-made files; never project content |
| 2026-10-05 | Keep cpe-exb examples and all OOTB and SDK cards in the ExB skills | Missing example files only cost a lookup; `exb-source-research` notes that they come from cpe-exb |
| 2026-10-05 | Phase 2 deferred | Requirements will change; one vendor is not enough to design general settings |
| 2026-10-05 | Tests may require an ExB install | The tests check real indexes |
| 2026-10-05 | Distribution: link to the working copy while the tool is under development | Instant feedback; one user. Revisit before a second project depends on the tool. |
| 2026-10-05 | Name `codebase-context`, not `codebase-memory` | `codebase-memory` is already the graph tool (MCP server, skill, agents) |

## Distribution options (how a project gets the tool)

| Option | How a project uses it | Pros | Cons |
| --- | --- | --- | --- |
| Link to working copy (current) | `tools/codebase-context` junction plus the project's shim script | Changes apply at once; good during development | No version pinning; manual setup per machine; junctions are Windows-only |
| npm package from GitHub tag | `npm i -D github:rrabb/codebase-context#v0.2.0`, then `npx codebase-context ...` | Pinned; one install command; any OS; no link | Project `package.json` gains a dependency, so teammates need repo access; each change needs a tag. npm replaces `node_modules` on install, so skills must be copied, not linked. |
| git submodule | Project tracks the tool at a commit | Pinned and cloned with the project | Submodule friction; tracked in the project |
| Global install or `npm link` | `codebase-context` on PATH | No project footprint | Version not tied to the project |

## Packaging pre-built knowledge

What can be shipped ready-made, so users get the knowledge without running generators:

| Deliverable | Ship pre-built? | Notes |
| --- | --- | --- |
| Skills, instruction templates, prompts | Already in the repo (`vendors/<id>/`) | `install` only links and renders them; no generator runs |
| Vendor indexes (`.ai-context/exb`, about 74 MB for ExB 1.20) | Yes, one bundle per vendor version | No machine paths inside; they depend only on the vendor version and the vendor folder name |
| codebase-memory graphs | No | Per machine; run `refresh --graph-only` |
| Project facts | No | Per project and cheap to build |

Ways to ship the vendor index bundle:

| Approach | Pros | Cons |
| --- | --- | --- |
| GitHub Release asset per vendor version (recommended) | Keeps git small; one download per version; versioned and linkable; works with `install --prebuilt <url>` | Needs a `pack` step and an upload per version; private repo needs a token to download |
| Commit indexes to git | Simplest; clone and go | About 74 MB per version, rewritten on every regeneration; bloats history fast |
| Git LFS | Large files outside normal history | LFS quota and setup on every machine; still churns per regeneration |
| npm package containing the data | Same install path as the tool | Large package; npm registry or GitHub Packages auth; one package per vendor version |
| Shared drive or cloud bucket | No GitHub limits | Outside version control; access setup per team |
| Regenerate locally (today) | Always matches the local install | Needs the full vendor install, Node, and minutes of indexing |

## Should ai:find live in a skill?

Skills refer to `npm run ai:find`, which only works if the project defines that script (cpe-exb does, through `.scripts/codebase-context.mjs`).

| Option | Pros | Cons |
| --- | --- | --- |
| Keep `find` in the engine; skills cite one command (current) | One implementation; skills stay text | Each project must define the `ai:find` script; `verify` should check it |
| Copy a `find` script into a skill's `scripts/` folder | Self-contained skill | `find` needs the engine, its package, and the indexes, so the copy duplicates the engine; several skills use it, so it would be duplicated or one skill would depend on another |
| MCP server exposing `find`, facts, and guide search (deferred item 8) | No shell or npm script needed; works in any project; agents call it like codebase-memory | New server to build and run; another tool to load |
