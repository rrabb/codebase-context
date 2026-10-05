# Roadmap and decisions

Working notes for codebase-context: open work, decisions with their reasons, and options we compared. Newest decisions first.

## To do

| # | Item | Notes |
| --- | --- | --- |
| 1 | Remove the install backup in cpe-exb | `cpe-exb/.codebase-context/backup/2026-10-05T20-52-37-288Z/` holds the skills and instructions replaced by the first `install --force`. Delete once the linked skills are confirmed in the chat customizations view. The folder is ignored by `.codebase-context/.gitignore`. |
| 2 | Publish pre-built index bundles as GitHub Release assets | Add `pack` (zip `.ai-context/<vendor>` plus a version file, for example `exb-1.20.0-index.zip`) and `install --prebuilt <zip or URL>`. See "Packaging pre-built knowledge" below. |
| 3 | Purge private details from git history | The repo is public. Commit `dfe1690` removed the chat transcripts and benchmark logs (now in ignored `docs/temp/`) and redacted names, portal, and item IDs, but earlier commits still contain them. Backlog (agreed, repo stays public): squash history to one clean commit and force-push. |
| 4 | ~~Vendor folder from config everywhere~~ (done) | `src/lib/vendor.mjs` reads `vendors[].root` from `.codebase-context/config.json` (default `ArcGISExperienceBuilder`). All indexers use it; outputs are unchanged apart from timestamps. Only `tests/golden-queries.mjs` still has fixed paths (item 5). |
| 5 | Expected test results per vendor version | `tests/golden-queries.mjs` and `ai-index-coverage.test.mjs` expect ExB 1.20.0 paths, lines, and counts. Move them to `vendors/exb/tests/<version>/` and pick by the installed version. |
| 6 | Trim the always-on instruction | `exb-source-authority` renders to about 11 KB and loads on every request. Move the recipe notes, Project structure, and External docs details into `exb-source-research`; keep the routing table, rules, recipes table, ExB summary, and source authority list (target 6-7 KB). |
| 7 | Index-history notes | Move the index history from cpe-exb repo memory (`/memories/repo/exb-runtime-patterns.md`) into `docs/`. |
| 8 | MCP server (consider) | Expose `find`, facts, and guide-text search as MCP tools, so skills stop depending on a project's `npm run ai:find` script. See "Should ai:find live in a skill?" below. |
| 9 | Phase 2 (deferred) | Move ExB folder paths, file patterns, and ignore rules out of the indexers into vendor settings. Do it when a second vendor arrives, so the settings are designed from two real cases. |

## Decisions

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
| MCP server exposing `find`, facts, and guide search (to do #6) | No shell or npm script needed; works in any project; agents call it like codebase-memory | New server to build and run; another tool to load |
