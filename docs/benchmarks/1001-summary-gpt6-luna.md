

# 🧭 Session Summary

## 🔷 Overview

We traced Experience Builder data-source initialization, then improved how this repository’s code-search tools find project and Esri source. We also reviewed symlink search behavior and corrected `.cbmignore` patterns that were excluding useful source and guidance files.

## 🟩 High-Level Summary

- **Data sources:** Confirmed the framework path from a `UseDataSource` reference through `DataSourceComponent` and `DataSourceManager`; identified the project’s `wdvlos` and branch-version-editor variations.
- **Search routing:** Added mandatory routing guidance for codebase-memory and `ai:find`, plus a `/trace` prompt.
- **Graph coverage:** Worked around codebase-memory’s built-in exclusion of folders named `dist` by indexing `client/dist/widgets` as its own graph project.
- **Search indexes:** Added `ai:refresh` to update all three graphs and the `.ai-context` index, and configured it to run after `npm run setup`.
- **Ignore rules:** Narrowed broad temporary, GUID, and hash patterns. UUID patterns use readable `?` wildcards; hash patterns remain hex-specific.
- **Multi-root workspace:** Evaluated duplicate search results from tool-folder junctions/symlinks. No `settings.json` changes were made.

## 🟨 Details and Reasoning

### Data-source initialization

The general framework flow is:

```text
App config / widget UseDataSource
  -> DataSourceComponent mounts
  -> DataSourceManager.createDataSourceByUseDataSource(...)
  -> resolve main source, data view, or root + child source
  -> create concrete source, call ready(), fetch schema
  -> report creation and status
  -> query records only when DataSourceComponent receives a query prop
```

In this project, `wdvlos` reads the map widget’s first configured data-source reference and passes it to `DataSourceComponent`, but provides no query. The branch-version-editor mostly looks up existing sources; its base-layer path explicitly creates a source from its configured reference.

### Graphs and routing

- Codebase-memory skipped `client/dist/**` due to a built-in `dist` rule. A `.cbmignore` negation did not override it.
- Indexing `client/dist/widgets` as a separate project worked and made readable OOTB widget source traceable.
- The bare `ai:find` query for `createDataSourceByUseDataSource` originally returned fuzzy matches. The tool now resolves an exact bare member name to its owner, `DataSourceManager`, and prints a `matched member:` line.
- The tool-routing instructions now say when to use the project graph, framework graph, OOTB graph, `ai:find`, and grep fallback.

### Ignore patterns

The old `*temp*`, `guid*`, and 32-character wildcard patterns were too broad. They excluded useful guidance and long-named source files. The revised rules:
- Match `temp` as a distinct name, not inside `templates`.
- Match only `GUID-` / `guid-` prefixes, not `guides`.
- Use `?` for the fixed UUID layout and hex-only classes for continuous hashes.

The multi-root workspace is `cpe-exb-exporter.code-workspace`. Its tool folders point to `copilot-chat-exporter` and `vsc-chat-tool`. Excluding the links in the project settings avoids duplicates in that workspace, but also hides them when opening only this repo. We discussed moving those exclusions to workspace-level settings; **no settings were changed**.

## 🟪 Context and Locations

- **Repo root:** `cpe-exb`
- **Esri / Experience Builder source:** `<repo>\ArcGISExperienceBuilder`
- **OOTB graph root:** `<repo>\ArcGISExperienceBuilder\client\dist\widgets`
- **Generated AI index:** `<repo>\.ai-context\exb`
- **MCP configuration:** `%APPDATA%\Code\User\mcp.json`
- **MCP executable:** `%LOCALAPPDATA%\Programs\codebase-memory-mcp\codebase-memory-mcp.exe`
- **MCP logs:** `%USERPROFILE%\.cache\codebase-memory-mcp\logs\`
- **Temporary ignore backup:** `%TEMP%\exb.cbmignore.bak`
- **Scratch probe folders/projects:** created under `%TEMP%` for tests, then removed.

Latest recorded graph sizes after refresh: repo **6,472 nodes**, framework **18,864 nodes**, OOTB widgets **73,315 nodes**. The smaller OOTB count reflects the revised exclusions.

## 🗂️ Files Changed

`+` means added content or a new file; `~` means revised content. Counts are for this session’s changes where identifiable, not total Git diffs. The worktree already contained many unrelated or user changes.

- [+21 lines, revised routing steps] `exb-source-authority.instructions.md:11`: mandatory tool-routing table, project identities, coverage and fallback rules.
- [+1 routing pointer, ~1 regeneration note] `AGENTS.md:7`: points to the routing table and documents `ai:refresh`.
- [+2 scripts] `package.json:13`: adds `postsetup` and `ai:refresh`. Other package changes were already present.
- [New, 86 lines] `ai-refresh.mjs`: indexes three graphs, copies vendor ignore rules, then runs `ai:index`.
- [New, 102 lines] `exb.cbmignore`: tracked master ignore file copied to vendor graph roots by refresh.
- [New, 82 lines] `.cbmignore`: corrected repo-level search exclusions and excludes Playwright snapshots.
- [New, 430-line file with a small member-lookup addition] `ai-find.mjs:345`: resolves bare member names to owning classes.
- [New, 23 lines] `trace.prompt.md`: fixed-order graph, `ai:find`, coverage, then source workflow. It is ignored by the current `.gitignore`, so it may not be committed.
- [New, 32 lines] `agent-tooling-plan.md`: records completed work and remaining decisions.
- **Vendor copies:** `.cbmignore` and `.cbmignore` were synchronized from the master. The vendor tree is ignored by Git.
- **Not changed:** `settings.json`.

## 🖥️ Important Commands

- `npm run ai:find -- createDataSourceByUseDataSource --usages 3`  
  Tested bare-member lookup before its fix; it returned fuzzy misses.
- `npm run ai:find -- DataSourceManager --members --usages 2`  
  Confirmed owner lookup and API evidence.
- `npm run ai:find -- createDataSourceByUseDataSource --usages 1`  
  Verified the fix resolves to `DataSourceManager`.
- `npm run ai:test`  
  Passed: **30 tests, 0 failures**.
- `node --check .scripts/ai-refresh.mjs`  
  Passed the script syntax check.
- `npm run ai:refresh`  
  Re-indexed all three graphs and ran `npm run ai:index`.
- `npm run ai:refresh --silent -- --no-graph`  
  Verified the AI-index-only path.
- `Get-Content ArcGISExperienceBuilder/.cbmignore` and PowerShell pattern scans  
  Checked broad ignore matches and compared them against real vendor filenames.
- Scratch codebase-memory indexes  
  Verified UUID/hash exclusions, `?` UUID patterns, and the `dist` workaround; scratch projects and folders were removed.
- `git status --short`, `git diff --numstat`, `git diff`  
  Audited current changes and separated this work from the broader dirty worktree.

<br/>
<br/>
<br/>
<hr/>
<br/>
<br/>
<br/>

## Agent Reasoning & work

<details>
<summary>Agent reasoning & work</summary>

```
I’ll summarize the whole thread, and first check the current diffs so the file list reflects what’s actually changed now, not just what we edited earlier. I’ll separate repo changes from generated graph/index state and note that `settings.json` was discussed but not modified.

Ran terminal command: git status --short; git diff --numstat; git diff --cached --numstat

Ran terminal command: git diff -- .cbmignore .scripts/cbmignore/exb.cbmignore .github/instructions/exb-source-authority.instructions.md AGENTS.md package.json .scripts/ai-find.mjs; git diff --cached -- .cbmignore .scripts/cbmignore/exb.cbmignore .github/instructions/exb-source-authority.instructions.md AGENTS.md package.json .scripts/ai-find.mjs

Ran terminal command: Get-Content docs/temp/agent-tooling-plan.md; "--- refresh script head ---"; Get-Content .scripts/ai-refresh.mjs -TotalCount 140; "--- trace prompt ---"; Get-Content .github/prompts/trace.prompt.md

Ran terminal command: git status --short -- .github/instructions/exb-source-authority.instructions.md AGENTS.md .cbmignore .scripts/ai-find.mjs .scripts/ai-refresh.mjs .scripts/cbmignore/exb.cbmignore .github/prompts/trace.prompt.md docs/temp/agent-tooling-plan.md package.json .vscode/settings.json; git diff -- .vscode/settings.json; git diff --numstat -- .scripts/ai-find.mjs .scripts/ai-refresh.mjs .scripts/cbmignore/exb.cbmignore .github/prompts/trace.prompt.md docs/temp/agent-tooling-plan.md .cbmignore .github/instructions/exb-source-authority.instructions.md AGENTS.md

The current diff is a busy worktree, so I’m isolating the files touched for this tooling thread from other existing changes. I’ll give line counts for additions/replacements where I can verify them, and label pre-existing or ignored files rather than attributing their entire contents to this work.

Ran terminal command: $files = @('.github/instructions/exb-source-authority.instructions.md','AGENTS.md','.scripts/ai-find.mjs','.scripts/ai-refresh.mjs','.scripts/cbmignore/exb.cbmignore','.cbmignore','.github/prompts/trace.prompt.md','docs/temp/agent-tooling-plan.md'); foreach ($f in $files) { if (Test-Path $f) { $n=(Get-Content $f).Count; "${f}`t$n lines" } }; "--- relevant locations ---"; Select-String -Path .github/instructions/exb-source-authority.instructions.md -Pattern 'Tool routing|client/dist/widgets|Minified runtime|Evidence:' | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }; Select-String -Path package.json -Pattern 'postsetup|ai:refresh' | ForEach-Object { "package.json:$($_.LineNumber): $($_.Line.Trim())" }; Select-String -Path AGENTS.md -Pattern 'Tool routing|ai:refresh' | ForEach-Object { "AGENTS.md:$($_.LineNumber): $($_.Line.Trim())" }; Select-String -Path .scripts/ai-find.mjs -Pattern 'bare member|matchedMembers|matched member' | ForEach-Object { ".scripts/ai-find.mjs:$($_.LineNumber): $($_.Line.Trim())" }

Ran terminal command: Select-String -Path .cbmignore,.scripts/cbmignore/exb.cbmignore -Pattern '^# Temp|^temp/|^# Hyphenated UUID|^\*\?{8}|^# 32-character|^\.playwright-mcp|^# 3\. NAMES|^guid-' | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }; "--- package diff lines for this work ---"; git diff -- package.json | Select-String -Pattern '^\+.*(postsetup|ai:refresh)|^\-.*(postsetup|ai:refresh)'
```
</details>
<br/>
<br/>