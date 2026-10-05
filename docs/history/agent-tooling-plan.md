# Agent tooling plan (temporary)

Follow-ups to make agents use codebase-memory and `ai:find` for all code search. Delete this file when done.

## Done

- Tool routing table in `.github/instructions/exb-source-authority.instructions.md`, plus a pointer in `AGENTS.md`.
- Graph project for OOTB widget source: `C-_DATA-PROJECTS-NGA-CPE-topo-cpe-git-topo-CPE-WebApps-cpe-exb-ootb-widgets` (root `ArcGISExperienceBuilder/client/dist/widgets`). codebase-memory skips any folder named `dist`, and a `.cbmignore` negation cannot override it, so this folder must be its own project.
- `ai:find` resolves a bare member name (for example `createDataSourceByUseDataSource`) to its owning class.
- `.github/prompts/trace.prompt.md` (`/trace`) runs the graph, `ai:find`, coverage check, then source read in a fixed order.

- `npm run ai:refresh` (`.scripts/ai-refresh.mjs`) re-indexes the repo, `ArcGISExperienceBuilder`, and `client/dist/widgets` graphs, then runs `npm run ai:index`. `postsetup` runs it after `npm run setup`.
- Corrected vendor ignore rules kept in the repo at `.scripts/cbmignore/exb.cbmignore`; `ai:refresh` copies them into both vendor roots. Templates, guides, and long-named jimu files are back in the vendor graph.
- Repo `.cbmignore` fixed the same way: the `.github/instructions/*.instructions.md` files and long-named skill references are back in the repo graph.
- Routing tested once: a subagent given a plain call-path question used the graph, coverage check, and `ai:find` first, grep only as a stated fallback, and ended with `Evidence:`. Not yet tested in a fresh chat.
- `tools/copilot-chat-exporter` and `tools/vsc-chat-tool` are links, which codebase-memory skips; they have their own graph projects (`C-_DEV-copilot-chat-exporter`, `C-_DEV-vsc-chat-tool`).

## Open

- `.gitignore` (uncommitted edits) ignores `.github/prompts/`, so `trace.prompt.md` will not be committed. Decide whether that is intended.
- `ArcGISExperienceBuilder/client/dist/widgets/.cbmignore` differs from the master after later master edits. The next `npm run ai:refresh` syncs it.
- `postsetup` has not been tested with a real `npm run setup`.
- Duplicate search results in the 3-root workspace (`C:\_DEV\workspaces\cpe-exb-exporter.code-workspace`) not yet checked.

## Original to-do (all done)

1. **`npm run ai:refresh` script.** Re-index all three graph projects (repo, `ArcGISExperienceBuilder`, `client/dist/widgets`) and run `npm run ai:index`. Call `codebase-memory-mcp cli index_repository` from Node with an argument array, because PowerShell 5.1 strips the quotes inside JSON arguments. Find the executable on `PATH` or through an environment variable, not a hard-coded user path.
2. **Run `ai:refresh` after `npm run setup`.** Either chain it in `package.json` or call it at the end of `.scripts/install.mjs`. Setup replaces the vendor tree, which makes all three graphs stale.
3. **Fix the vendor `.cbmignore`** (`ArcGISExperienceBuilder/.cbmignore`, needs approval because it is in the vendor tree). These patterns drop real framework code:
   - `*temp*` drops `jimu-for-builder/lib/templates`. Use a narrower pattern such as `*.temp*` or `temp/`.
   - `guid*` drops `jimu-for-builder/lib/guides`. Use `guid-*` or `guid_*`.
   - The 32-character hash pattern (`*` followed by 32 `?`) drops any name 32 or more characters long, for example `jimu-core/lib/arcade-content-resolver-component`. Replace it with a hex-only pattern or remove it.
   Then re-index the `ArcGISExperienceBuilder` project and confirm those folders are no longer listed under `not_indexed`.
4. **Keep `.cbmignore` outside the vendor tree.** `npm run setup` can wipe `ArcGISExperienceBuilder/.cbmignore`. Store the master copy in the repo (for example `.scripts/cbmignore/ArcGISExperienceBuilder.cbmignore`) and have `ai:refresh` copy it into place before indexing.
5. **Test the routing.** Ask a fresh chat a call-path question without hints and confirm it starts with the graph and `ai:find` and ends with an `Evidence:` line.
