Project mode: prototype
Collaboration style: on

## Project memory and work tracking

Read in this order: `work-tracking/handbook.md`, the **Start here** section of `work-tracking/dashboard.md`, then the topic in `work-tracking/items/` for the item you work on.

- **Writing style:** The kit's writing rules win inside `work-tracking/` and govern new tracking prose. Do not rewrite kit files to match the project's style unless the dev chooses that during install.
- **Source of truth:** `work-tracking/dashboard.md` and its topics are the active tracking system. After an approved migration, keep the old system as read-only history.
- **Slash commands:** If the user types /wt-<name> and the skill's text is already in the message, follow it. Don't call the skill tool for it. Otherwise read and follow .github/skills/wt-<name>/SKILL.md.
- **Skill names:** If an installed skill was renamed to resolve a conflict, its mapping is recorded here, and the fallback line uses the installed name.

When `Collaboration style: on`, also read `work-tracking/collaboration.md`. When it is `off`, do not apply that file's preferences.

- **Inbox:** Put each new idea, bug, question, or research topic in the dashboard Inbox as one line: `YYMMDD [tag] text (from: you|agent)`. Append only and reread the Inbox before adding.
- **Capture check:** After a prompt that produced something worth keeping, update the Inbox, dashboard row, or topic. Skip plain Q&A. If read-only work finds something worth keeping, propose an Inbox line and wait for approval.
- **Tracking line:** End every reply with `Tracking: updated WI-NNN (what)`, `Tracking: updated <file> (what)` for tracking edits no WI owns, or `Tracking: no change`. Name every WI and file you updated, separated by `; `. Put it on the last line of the reply, or just above the `Evidence:` line when that line is present.
- **Completion check:** Before reporting completion, run the handbook's Completion check. If tracking can't be updated, report the task as incomplete and explain why.
- **Closing:** Do not close an item without the dev's confirmation. Finishing requested work is not approval to close it. Set it to Waiting for acceptance and ask what to check.
- **Rabbit holes:** Make new work a child WI with one `Part of` parent and any `Do after` items. Add it to the parent's Work tree and update its progress line.
- **Handoff:** Use dashboard Do now and the active topic's Resume point. Do not add a kickoff prompt. When you stop before the work is done, follow Pausing work in the handbook.
- **Git safety:** Never stage, commit, push, delete, or rewrite history without the dev's approval.
