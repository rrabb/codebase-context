# Import work

Scan approved sources for work that is not already tracked. Keep source files unchanged. Ask which sources to scan at the start of every run.

## Before the scan

1. Read the project's `AGENTS.md`, the tracking handbook, dashboard, and any relevant topic.
2. Ask which of these sources to scan. The dev may choose any subset:
   - Markdown task and backlog files.
   - Work logs.
   - `TODO` and `FIXME` code comments, grouped by source file.
   - TODO/FIXME markers quoted inside Markdown documents as `[research]` candidates.
   - The `Unreleased` section of `CHANGELOG`.
   - GitHub issues and pull requests.
   - Past chat sessions. Search by repository name and remote URL as well as folder path, since a moved or copied repository has a different path.
   - Git history.
3. Propose folders to exclude, and let the dev add or remove folders:
   - Vendored and third-party code, such as `vendor/`, `third_party/`, `node_modules/`, and Git submodules.
   - Generated output, such as `dist/`, `build/`, `out/`, and coverage reports.
   - Anything `.gitignore` covers. In a Git repository, scan only the files listed by `git ls-files --cached --others --exclude-standard`.

   If an earlier import report lists exclusions, offer that list as the default.
4. Confirm access to each selected source. Mark inaccessible sources as unavailable. Don't silently replace them with another source.
5. Ask before accessing private or remote sources when the harness needs extra access.
6. Read previous reports under `work-tracking/notes/*-import/`. Skip candidates already marked `Filed` or `Rejected`; candidates marked `Left for later` may be reconsidered.
7. Find each open-work list in the selected sources: a To do table, a checklist, or a backlog section. Read only enough to find them, and show them in one table with the path and heading. Each list's open items are reported as candidates and filed when approved. For each list, ask what happens to its source section afterward:
   - **Retire** (default): freeze only that section through the migration proposal below.
   - **Keep as reference**: leave the source file unedited, for example a public README. The list is not frozen and may drift from the dashboard.

   Record each choice in the report.

## Scan and report

1. Read selected sources without modifying them.
2. Find candidate work. Skip excluded folders and sections frozen by an earlier import. Exclude items already tracked or clearly completed, unless the dev asks otherwise.
3. Create `work-tracking/notes/<YYMMDD-HHmm>-import/` and save `import-report.md` there. Keep the report and candidate history in this folder.
   Do not quote secrets, credentials, or personal data in the report.
4. For each candidate, include:
   - A short title and description.
   - The source and a precise location, such as a path and line, issue URL, chat date, or commit.
   - Evidence label: Documented, Inferred from source, Observed here, From past chat, or Unknown.
   - Proposed tag: `[idea]`, `[research]`, `[build]`, or `[question]`.
   - Origin: `project` or `third-party`. Content from vendored or upstream code, such as a TODO quoted from upstream code, is `third-party`. Recommend `Drop` for it.
   - Possible duplicate, or `None found`.
   - Decision state: `Pending`, `Filed`, `Rejected`, or `Left for later`.
   - Destination for filed items, or a reason for rejected items.
5. List sources that were unavailable or only partly scanned, and the excluded folders. State any evidence limits.
6. List each open-work list and its choice. For each list kept as reference, say that it is not frozen and may drift.
7. Show the report to the dev before it is first committed. Give the report path and summarize the candidates. Ask the dev to mark each candidate `Keep`, `Drop`, `Left for later`, or `Edit`, and choose `WI row` or `Inbox` for each kept item. For proposed WI rows, show a table with Status, Priority, Who, Size, and Do after. Use the handbook's priority rules; if its `Priority rules:` status does not record `confirmed <YYMMDD>`, say that the rules are unconfirmed when asking for approval. Ask the dev to approve or change the proposed fields. Save all candidate states in the report, including filed, rejected, and left-for-later candidates.

Do not add candidates to tracking until the dev returns the marked report or otherwise approves each item and destination.

## File approved items

1. Re-read the marked report and confirm each kept item has a destination. Record every outcome in the report: `Filed`, `Rejected` with reason, or `Left for later`.
2. Re-read the destination dashboard and topic before editing. Keep other edits.
3. Add each approved item to the dev's chosen WI row or Inbox. Use the tracking handbook's rules for IDs, tags, priorities, and links.
4. Leave every source file untouched. Keep the report in `work-tracking/notes/<YYMMDD-HHmm>-import/`.
5. Update the dashboard's Import status block with sources reviewed, filed/rejected/left counts, and a link to the report. Name any list kept as reference and say that it is not frozen and may drift.
6. Run the handbook's Completion check and report the sources scanned, unavailable sources, approved items filed, and report path. If any list is marked Retire, or the import came from an existing tracking system, present the migration proposal below in the import's final report. Apply it only after the dev gives separate approval.

## Migrate an existing tracking system (proposal)

After an import from an existing tracking system, or when any open-work list is marked Retire, present these proposed changes in the import's final report. Apply them only after the dev gives separate explicit approval, even if the dev already chose Retire or approved filing candidates:

1. For a dedicated tracker file, add a banner to the top of the file: `Frozen <YYMMDD>. Tracking moved to work-tracking/dashboard.md. Import status: <link>`.
2. For a retired section in a file that has other content, add the same banner directly under that section's heading. Freeze only that section. Other sections, such as decisions, stay live.
3. In each banner, link the dashboard with a path relative to the edited file.
4. Repoint `AGENTS.md` and `README.md` links that point to a frozen tracker or retired section so they point to the new dashboard. Leave links to a file whose other sections stay live.
5. Keep the old log, frozen sections, and their history in place. Do not edit lists kept as reference. The kit becomes the sole active tracking system.
6. Show each proposed document edit as before, after, and why. Include every approved changed file in the final report.
