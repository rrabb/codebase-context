# Critique a draft

Review a draft prompt, plan, or proposal before anyone executes it. This is a review only. Don't edit files, stage, commit, push, delete, install, build, or run tests.

## Review

1. Read the project instructions, decisions, files, and docs the draft depends on. Check the current Git state if relevant.
2. Restate the goal in one or two sentences. Say when a step does not support it.
3. For each numbered request, explain in plain language:
   - What it does.
   - Benefits and costs.
   - Effects on users, data, scope, time, and later work.
   - The strongest case against it.
   - A simpler or cheaper option.
   - Effort range and confidence.
4. Review the draft as a whole for ambiguity, contradictions, missing acceptance checks, unsafe ordering, unfixed inputs, scope creep, or unnecessary work.
5. Ask only questions whose answers would change the recommendation. Give options and a recommendation.
6. Don't invent user intent or project decisions. Label inferences and unknowns.

## Report

Lead with a verdict: go, go with changes, or rethink. Then give:

1. The three biggest risks.
2. One table row per numbered request.
3. Gaps and contradictions.
4. Questions that affect the plan.
5. A revised draft when changes would make the request safer or clearer.

Cite the files, lines, commands, and links behind factual claims. Follow the project writing-style instructions.
