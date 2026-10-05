

**🧭 Overview**
We started by tracing **how Experience Builder widgets initialize data sources**, then improved the tooling behind that research: API lookup, graph coverage, refresh automation, ignore rules, and linked-project search. No widget runtime code was changed.

**🟦 High-Level Summary**
| Work | What We Did | Why |
|---|---|---|
| Data-source trace | Followed project widgets into ExB framework behavior. | Separate instance creation, readiness, and record loading. |
| Research workflow | Added explicit graph-first routing, API lookup rules, coverage checks, and `/trace`. | The initial investigation bypassed tools already required by the repository. |
| API lookup | Made bare member names resolve to their owning class. | Exact methods were losing to loosely related fuzzy matches. |
| Graph coverage | Added a separate OOTB widget graph and narrowed ignore patterns. | `dist` skipping and broad filename patterns hid relevant source. |
| Refresh automation | Added `ai:refresh` and a `postsetup` hook. | Keep graphs current and restore vendor ignore rules after setup. |
| Linked tools | Moved duplicate-link exclusions into the multi-root workspace. | Allow single-folder searches while avoiding duplicate multi-root results. |

**🔎 Details**
- **Initialization:** `widget.tsx:132` obtains the Map widget’s configured data source and renders `DataSourceComponent`. `base-layer.ts:99` explicitly calls `createDataSourceByUseDataSource()`.
- **Framework behavior:** The traced sequence was instance construction → `ready()` → `fetchSchema()` → Created/CreateError. Creation and record loading are separate; `query` controls loading through `DataSourceComponent`.
- **Search boundaries:** codebase-memory 0.11.0 skipped descendant `dist` folders despite ignore negation. Indexing `widgets` as its own root recovered readable OOTB source. Minified Jimu runtime remains a narrow, explicitly identified fallback.
- **Ignore corrections:** Narrowed `*temp*`, `guid*`, and arbitrary 32-character matching. Kept hex-only hash matching and restored readable hyphenated UUID wildcards at your request; `?` still matches non-hex characters.
- **Automation:** Refresh locates the MCP executable, copies the vendor ignore master, indexes three graphs, then runs the fast `ai:index`. It does not automatically run every richer documentation or usage-index generator.

**📍 Context**
| Location | Purpose |
|---|---|
| `cpe-exb` | Main workspace, Windows / PowerShell 5.1 / Node 24. |
| `ArcGISExperienceBuilder` | Local ExB vendor tree; application source stayed read-only. |
| `exb` | Generated API, usage, documentation, and OOTB search indexes. |
| `%LOCALAPPDATA%\Programs\codebase-memory-mcp\` | MCP executable installation, version 0.11.0. |
| `%USERPROFILE%\.cache\codebase-memory-mcp\` | Graph `.db` files, configuration, and `logs/`. |
| Graph project names | Main project ID ends in `cpe-exb`; companion IDs append `-ArcGISExperienceBuilder` and `-ootb-widgets`. |
| `%APPDATA%\Code\User\` | VS Code user configuration, including MCP registration. |
| `%APPDATA%\Code\User\workspaceStorage\b8c3b60285059d1bebc8bb51538d83f5\` | Single-folder chat storage; transcripts, debug logs, and tool resources are under `GitHub.copilot-chat/`. |
| `workspaces` | Multi-root workspace configuration; its storage ID is `01dab9e4d1d066f75d77b5ba8dc99d7d`. |
| `copilot-chat-exporter` / `vsc-chat-tool` | Real tool projects, linked under `tools`; each has its own graph. |
| `%TEMP%` | Vendor ignore backup and temporary indexing probes; probes were removed. |

**📝 Files Changed**
Counts are **net recorded edits**, reconstructed from the session rather than the entire dirty Git worktree. Exceptions are marked.

| File | + / − | Change |
|---|---:|---|
| `exb-source-authority.instructions.md` | +23 / −2 | Mandatory routing, OOTB graph, member lookup, evidence requirements. |
| `AGENTS.md` | +3 / −1* | Routing pointer and refresh instructions. |
| `ai-find.mjs` | +18 / −1 | Exact member-to-owner resolution and matched-member output. |
| `trace.prompt.md` | +23 / −0 | New `/trace` workflow. |
| `ai-refresh.mjs` | +86 / −0 | New refresh orchestration. |
| `package.json` | +2 / −0 | `ai:refresh` and `postsetup`. |
| `exb.cbmignore` | +94 / −0* | New vendor ignore master; currently 102 lines after additional edits. |
| `.cbmignore` | +22 / −13 | Narrower exclusions and Playwright output exclusion. |
| `.cbmignore` | +26 / −20† | Deployed rules compared with the saved pre-change backup. |
| `.cbmignore` | 94 lines‡ | Deployed OOTB rules; prior-file baseline not established. |
| `settings.json` | +4 / −7 | Removed exporter link exclusions from folder settings. |
| `cpe-exb-exporter.code-workspace` | +13 / −0 | Added both tools’ link exclusions for multi-root use. |
| `agent-tooling-plan.md` | +32 / −0 | Decisions, completed work, and remaining caveats. |

*These files also received edits outside the recorded replacements. †Includes the current combined changes. ‡No reliable session-only `+ / −` available. Generated indexes, graph databases, and repository memory also changed; their line counts are not included.

**🛠️ Important Commands**
Commands below are shown without historical output-filtering wrappers.

| Command | Purpose |
|---|---|
| `npm run ai:find -- DataSourceManager --members --usages 2` | Inspect the owning API, members, and local usage evidence. |
| `npm run ai:find --silent -- createDataSourceByUseDataSource --usages 1` | Verify bare-method lookup resolves to `DataSourceManager`. |
| `npm run ai:test` | Run the existing AI-index tests: 30 passed. |
| `node --check .scripts/ai-find.mjs` / `node --check .scripts/ai-refresh.mjs` | Check edited script syntax. |
| `npm run ai:refresh` | Refresh three graphs and the fast ExB index. |
| `npm run ai:refresh --silent -- --no-graph` | Verify index-only execution after fixing the npm invocation warning. |
| `codebase-memory-mcp.exe config list` | Check available configuration for a built-in exclusion override. |
| `Copy-Item` / PowerShell filename and link scans | Back up and deploy ignore files, test matching, and inspect tool links. |

**✅ Verification And Caveats**
Historical checks passed for API lookup, 30 tests, script syntax, refresh execution, and edited settings diagnostics. A routing subagent used the expected tools; ordinary searches found linked tool source in the single-folder workspace.
**🟨 Not fully verified:** actual multi-root deduplication and a complete setup run exercising `postsetup`. The `/trace` prompt remains ignored by Git, and graph coverage still has partial-file limitations.
**🟧 Current check:** the master and vendor-root ignore files match at 102 lines, but the OOTB copy remains at 94. The next refresh will copy the master again; no files were changed while preparing this summary.

Evidence: session transcript, recorded edit reconstruction, source reads, Git, backup comparison, and filesystem checks; historical graph/API/test results were not rerun.






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
I’ll pull together the session changes and verify the current files and recorded edits so the summary can include useful paths, line counts, and commands. I’ll distinguish completed work from checks we didn’t finish.

Read 

Read skill `chronicle`, lines 1 to 180

Read skill `export-chat`

Read memory 

Compacted conversationThe session covered three main areas: the data-source trace, the code-research tools, and linked-folder search settings. I’m checking the edit history for line counts, since the current Git diff also contains changes from outside this session.

Ran terminal command: const fs=require("fs"); const p="C:/Users/reim5052/AppData/Roaming/Code/User/workspaceStorage/b8c3b60285059d1bebc8bb51538d83f5/GitHub.copilot-chat/transcripts/79a7ef82-379d-4986-9d8f-2c00a78a039d.jsonl"; const lines=fs.readFileSync(p,"utf8").trim().split(/\r?\n/); console.log("Records:",lines.length); for (const raw of lines.slice(0,3)) {const item=JSON.parse(raw); console.log(JSON.stringify(item,(key,value)=>key==="content"?{type:typeof value,keys:Object.keys(value||{}).slice(0,10)}:value).slice(0,1800));}
Completed with input: const fs=require("fs"); const p="C:/Users/reim5052/AppData/Roaming/Code/User/workspaceStorage/b8c3b60285059d1bebc8bb51538d83f5/GitHub.copilot-chat/transcripts/79a7ef82-379d-4986-9d8f-2c00a78a039d.jsonl"; const lines=fs.readFileSync(p,"utf8").trim().split(/\r?\n/); console.log("Records:",lines.length); for (const raw of lines.slice(0,3)) {const item=JSON.parse(raw); console.log(JSON.stringify(item,(key,value)=>key==="content"?{type:typeof value,keys:Object.keys(value||{}).slice(0,10)}:value).slice(0,1800));}
Tool execution failed with exit code 1

Ran terminal command: git diff HEAD --numstat -- .scripts/ai-find.mjs .scripts/ai-refresh.mjs .scripts/cbmignore/exb.cbmignore .cbmignore package.json AGENTS.md .github/instructions/exb-source-authority.instructions.md .github/prompts/trace.prompt.md .vscode/settings.json docs/temp/agent-tooling-plan.md

Ran terminal command: git status --short --untracked-files=all -- .scripts/ai-find.mjs .scripts/ai-refresh.mjs .scripts/cbmignore/exb.cbmignore .cbmignore package.json AGENTS.md .github/instructions/exb-source-authority.instructions.md .github/prompts/trace.prompt.md .vscode/settings.json docs/temp/agent-tooling-plan.md

Most of the tooling files are untracked or ignored, so Git cannot provide a reliable session-only diff. I’ll use the recorded edit calls where possible and label any counts that can’t be recovered exactly.

Ran terminal command: @'
const fs = require('fs');
const path = 'C:/Users/reim5052/AppData/Roaming/Code/User/workspaceStorage/b8c3b60285059d1bebc8bb51538d83f5/GitHub.copilot-chat/transcripts/79a7ef82-379d-4986-9d8f-2c00a78a039d.jsonl';
const entries = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
console.log('Records:', entries.length);
for (const entry of entries.slice(0, 3)) {
  console.log(JSON.stringify(entry, (key, value) => key === 'content' ? { type: typeof value, keys: Object.keys(value || {}).slice(0, 10) } : value).slice(0, 2400));
}
console.log('Top-level keys:', [...new Set(entries.flatMap(entry => Object.keys(entry)))]);
'@ | node

Read 

Read 

The recorded changes match the main outcomes in the handoff. I’m now separating authored edits from generated indexes and copied ignore files, and confirming which validation results belong in the summary.

Ran terminal command: @'
const fs = require('fs');
const path = 'C:/Users/reim5052/AppData/Roaming/Code/User/workspaceStorage/b8c3b60285059d1bebc8bb51538d83f5/GitHub.copilot-chat/transcripts/79a7ef82-379d-4986-9d8f-2c00a78a039d.jsonl';
const entries = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const calls = entries.flatMap((entry, index) => (entry.data?.toolRequests || []).map(call => ({...call, record: index + 1})));
for (const call of calls.filter(call => /replace|create_file|apply_patch/.test(call.name))) {
  const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
  console.log(JSON.stringify({record:call.record, id:call.toolCallId, name:call.name, args}, (key,value) => /^(oldString|newString|content|input)$/.test(key) && typeof value === 'string' ? {lines: value.split('\n').length, start: value.slice(0,180)} : value));
}
const result = entries.find(entry => /tool/.test(entry.type));
console.log('Result structure:', JSON.stringify(result).slice(0,1600));
'@ | node

The transcript includes the before-and-after replacement text, which should give us better counts than Git alone. I’ll use those records to avoid attributing pre-existing work to this session.

Read 

I can reconstruct the retained edits without treating whole untracked files as newly written here. I’m also checking the vendor ignore-file backup so those copied changes can have meaningful line counts.

Ran terminal command: @'
const fs = require('fs');
const path = require('path');
const transcript = 'C:/Users/reim5052/AppData/Roaming/Code/User/workspaceStorage/b8c3b60285059d1bebc8bb51538d83f5/GitHub.copilot-chat/transcripts/79a7ef82-379d-4986-9d8f-2c00a78a039d.jsonl';
const entries = fs.readFileSync(transcript, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const calls = entries.slice(0, 600).flatMap(entry => entry.data?.toolRequests || []);
const normalize = value => value.replace(/\r\n/g, '\n');
const lines = value => value === '' ? [] : normalize(value).replace(/\n$/, '').split('\n');
function countDiff(before, after) {
  const oldLines = lines(before), newLines = lines(after);
  let previous = new Uint32Array(newLines.length + 1);
  for (const oldLine of oldLines) {
    const current = new Uint32Array(newLines.length + 1);
    for (let column = 1; column <= newLines.length; column++) current[column] = oldLine === newLines[column - 1] ? previous[column - 1] + 1 : Math.max(previous[column], current[column - 1]);
    previous = current;
  }
  const common = previous[newLines.length];
  return { added: newLines.length - common, deleted: oldLines.length - common };
}
const edits = new Map();
for (const call of calls) {
  if (!/^(multi_replace_string_in_file|replace_string_in_file|create_file)$/.test(call.name)) continue;
  const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
  for (const edit of args.replacements || [args]) {
    if (!edit.filePath) continue;
    const key = edit.filePath.toLowerCase();
    if (!edits.has(key)) edits.set(key, {filePath:edit.filePath, edits:[]});
    edits.get(key).edits.push({...edit, tool:call.name});
  }
}
for (const group of edits.values()) {
  const current = normalize(fs.readFileSync(group.filePath, 'utf8'));
  let baseline = current, problem = null;
  for (const edit of [...group.edits].reverse()) {
    if (edit.tool === 'create_file') {
      if (baseline !== normalize(edit.content)) problem = 'Current file includes edits not captured by recorded replacements';
      baseline = '';
    } else {
      const before = normalize(edit.oldString), after = normalize(edit.newString);
      if (baseline.split(after).length !== 2) {problem = 'Cannot reverse replacement uniquely'; break;}
      baseline = baseline.replace(after, before);
    }
  }
  console.log(JSON.stringify({file:group.filePath, ...(!problem ? countDiff(baseline,current) : {}), lines:lines(current).length, problem}));
}
const backup = path.join(process.env.TEMP, 'exb.cbmignore.bak');
const vendor = path.resolve('ArcGISExperienceBuilder/.cbmignore');
console.log('Vendor backup:', backup, fs.existsSync(backup) ? JSON.stringify(countDiff(fs.readFileSync(backup,'utf8'),fs.readFileSync(vendor,'utf8'))) : 'not found');
console.log('Historical commands:');
for (const call of calls.filter(call => call.name === 'run_in_terminal')) {
  const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
  if (/ai:test|ai:refresh|node --check|Copy-Item|cbmignore|config list/.test(args.command || '')) console.log(JSON.stringify({command:args.command, explanation:args.explanation}));
}
'@ | node

The line-count reconstruction is complete. I’ll present the results as net recorded edits, with separate notes for generated output and the multi-root search behavior that remains untested.

Read 

Most file counts are exact. Two need caveats because they were also edited outside the recorded replacements: the agent guide and the vendor ignore master. I’m making one final check of the cache paths and deployed copies before writing the summary.

Ran terminal command: @'
const fs = require('fs');
const crypto = require('crypto');
const transcript = 'C:/Users/reim5052/AppData/Roaming/Code/User/workspaceStorage/b8c3b60285059d1bebc8bb51538d83f5/GitHub.copilot-chat/transcripts/79a7ef82-379d-4986-9d8f-2c00a78a039d.jsonl';
const entries = fs.readFileSync(transcript,'utf8').trim().split(/\r?\n/).map(JSON.parse);
for (const entry of entries.slice(0,600)) for (const call of entry.data?.toolRequests || []) {
  if (!/replace_string_in_file|create_file/.test(call.name)) continue;
  const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
  for (const edit of args.replacements || [args]) {
    if (/AGENTS\.md$/i.test(edit.filePath || '')) console.log(JSON.stringify({file:edit.filePath, before:edit.oldString, after:edit.newString}));
    if (call.name === 'create_file' && /exb\.cbmignore$/.test(edit.filePath || '')) console.log('Master originally created lines:', edit.content.replace(/\n$/,'').split('\n').length);
  }
}
for (const file of ['.scripts/cbmignore/exb.cbmignore','ArcGISExperienceBuilder/.cbmignore','ArcGISExperienceBuilder/client/dist/widgets/.cbmignore']) {
  const text = fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
  console.log(JSON.stringify({file,lines:text.replace(/\n$/,'').split('\n').length,sha256:crypto.createHash('sha256').update(text).digest('hex')}));
}
'@ | node

Read 
```
</details>