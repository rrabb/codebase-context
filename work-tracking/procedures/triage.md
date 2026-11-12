# Triage the Inbox

Review Inbox entries with the dev. Don't make decisions or edit tracking on the dev's behalf.

## Review

1. Read the tracking handbook, dashboard Start here section, Inbox, and any linked topics.
2. If the handbook's `Priority rules:` status line says `not confirmed`, show the rules and ask the dev to accept them or change them. The dev may type replacements or ask for a proposal inferred from the project. Follow the handbook's answer-interpretation rule and get approval of the final wording. On approval, re-read the handbook, record the approved rules, and set the status line to `Priority rules: confirmed <YYMMDD>`, using the local date. If the dev does not confirm, leave the rules and status unchanged and label proposed priorities as unconfirmed. If the status line does not say `not confirmed`, skip this question.
3. Re-read the Inbox immediately before proposing changes.
4. For each line, recommend one action:
   - Make a WI row, with a topic when needed.
   - Drop it, with a reason in the Closed lookup.
   - Keep it in the Inbox.
   - Answer the question and record the answer with the relevant item.
5. Flag `[question]` entries that block the next step for the dashboard's Do now section.
6. If the Inbox has more than about 15 lines, mention that once.
7. Show all recommendations in one table. Give each Inbox line a temporary ID, such as `C1`, and keep that ID for the rest of the run. Include the line, its source, proposed tag, duplicate if found, recommendation, and reason. Count the lines in this review as M.
8. Ask one question with three choices before editing:
   - **Accept all:** approve every recommendation in the table.
   - **Accept with overrides:** approve the table except for the stated changes, for example `C15 Drop, C21 WI`. Follow the handbook's answer-interpretation rule before applying overrides. Clarify ambiguous IDs or actions before editing.
   - **Go one at a time:** review the same table in ID order, asking for approval or changes to one recommendation at a time.

   Don't ask a separate question for each line unless the dev chooses one-at-a-time mode.
9. In one-at-a-time mode, ask about each line with three choices:
   - **Approve:** accept this line's recommendation.
   - **Change:** state a different action for this line.
   - **Approve the rest as recommended (<ids>):** accept the table's recommendation for this line and every unanswered line, then end the questions. Put the covered IDs in the choice label, and list them again before editing.

   After every answer show: `Answered N of M. Next: <id>. Say 'pause' to stop; <id> and any other unanswered lines stay in the Inbox.` Count only lines with a clear approved action as answered, including an approved Keep. Use `Next: none` when all lines are answered. If the dev says `pause`, stop asking; leave unanswered lines in the Inbox.

If a triage turn ends with unanswered lines, make this the last line of the reply body, directly above the `Tracking:` line: `Triage incomplete: N lines left (<ids>)`. List the unanswered IDs, not lines explicitly approved to Keep. Preserve the handbook's Tracking/Evidence footer order.

## Apply approved triage

1. Re-read the dashboard, handbook, and any affected topic.
2. Apply only the dev's approved actions. Record where each Inbox line went before removing it. Unanswered lines and lines approved to Keep stay in the Inbox; never delete them.
3. For a new WI, use a unique ID and follow the topic and dashboard formats in the handbook. Keep the row attached to its area table, with no blank line between table rows.
4. For a dropped item, record its reason in the Closed lookup.
5. For an answered question, record the answer with the item it concerns.
6. Refresh Do now and the dashboard Updated date if a row's status or next action changed.
7. Run the handbook's Completion check and list the entries changed.
