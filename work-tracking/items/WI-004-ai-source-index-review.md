# WI-004: Review the cpe-exb AI source index section

## At a glance

- **Goal:** Recommend what the "AI source index" section of the cpe-exb AGENTS.md should keep, clarify, or link elsewhere.
- **Progress as of 261112:** Carried over 4 findings from a sandbox pilot of the tracking kit (261110). This repo hasn't re-read the cpe-exb file.
- **Decisions made:** Roadmap item 11 part (b) was dropped on 261110. Part (c) moved to [WI-007](../dashboard.md#wi-007). See Decisions and tradeoffs.
- **Next:** Re-read the cpe-exb section, compare it with the installed routing instructions and research skill, then propose the smallest change.
- **Work in progress right now:** None. The review hasn't started.

## Original goal

Give feedback on the "AI source index" section of the cpe-exb AGENTS.md, as the dev asked in roadmap item 11, part (a).

## Done when

- [ ] The current cpe-exb section is compared with the installed routing instructions and the research skill.
- [ ] Useful project facts, repeated guidance, and conflicting or unclear lookup routes are listed.
- [ ] The smallest change is recommended, with source evidence and limits.
- [ ] The dev accepts the review. Changing cpe-exb needs separate approval.

## Current understanding

These findings come from the sandbox pilot's read of the cpe-exb working copy on 261110. That file may have changed since.

| Finding | Evidence label | Source |
| --- | --- | --- |
| Local Guidance sends code searches to the routing table. The AI source index section separately tells agents to grep `symbols.tsv` for definitions. How the two routes relate needs a clear rule. | Documented (sandbox pilot, 261110). Not re-read here | cpe-exb AGENTS.md, Local Guidance and AI source index sections |
| The widget index list names `manifests.tsv` twice. | Documented (sandbox pilot, 261110). Not re-read here | cpe-exb AGENTS.md, AI source index section |
| The section holds shared index details plus project setup and linked-skill steps. Removing the whole section could lose useful project context. | Documented (sandbox pilot, 261110). Not re-read here | cpe-exb AGENTS.md, AI source index section |
| The shared templates already cover API lookup, routing, source authority, and what to do when setup hasn't run. | Documented | [AGENTS.block.md](../../vendors/exb/agents/AGENTS.block.md), [exb-source-authority.instructions.md](../../vendors/exb/instructions/exb-source-authority.instructions.md) |

## Decisions and tradeoffs

| Decision | Why |
| --- | --- |
| 261110: Keep part (a) as a small research item instead of dropping it. | The section still has concrete review targets. |
| 261110: Drop part (b), removing the text the generated block repeats from `exb-source-authority`. | Core facts and skill routing go through AGENTS.md on purpose so other hosts get them. Repeating them in Copilot isn't enough reason to remove them. See the dashboard [Closed lookup](../dashboard.md#closed-lookup). |
| 261112: Move part (c), the untracked cpe-exb files, to [WI-007](../dashboard.md#wi-007). | It's a team setup problem, not a content review. |
| Keep cpe-exb read-only during the review. | Tracking approval doesn't approve changes to a sister project. |

## Findings and outcomes

261112: Carried over from the sandbox pilot's import and triage on 261110. No routing, setup, or lookup behavior was tested.

## References

- [Dashboard row](../dashboard.md#wi-004)
- [Import report, candidate A7](../notes/261112-1653-import/import-report.md)
- [Roadmap item 11](../../docs/roadmap.md)
