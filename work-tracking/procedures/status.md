# Work status

Give a read-only status update and a prioritized list of next items. Don't edit tracking files, stage, commit, push, delete, build, or start any item.

## Gather

1. Read project instructions, the dashboard, relevant topics, and any project TODO or backlog files.
2. Check Git status, branch, recent commits, and unpushed commits when available.
3. Classify uncommitted files as the dev's, the agent's, another session's, generated, or unexplained. Don't guess when ownership is unclear.
4. Find the latest validation result and the commit it covered. Don't imply checks ran on a later commit.
5. Report disagreements between tracking and the worktree instead of choosing one.

## Report

Lead with a short summary of the project's state and the single most useful next step.

Include:

| Section | Contents |
| --- | --- |
| Status | Areas marked done, in progress, waiting on the dev, blocked, or not started, with evidence |
| Waiting on the dev | Decisions or approvals owed, options, and a recommendation |
| Next items | Ordered work with plain-language reason, priority, effort and confidence, dependencies, quick wins, and risks |
| Risks and open questions | Stale facts, conflicts, unverified claims, and fragile steps |

Use the project's priority rules. Give each estimate as a range with confidence. Flag low-value work and possible rabbit holes. Cite files, lines, commands, commits, and URLs. Label inferences and unknowns.
