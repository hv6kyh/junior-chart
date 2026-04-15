# /ceo-pmf — PMF Diagnosis Playbook

Run this after `/ceo` to execute the Product-Market Fit diagnosis pilot.

## Goal

Produce a grounded answer to: "Who will be satisfied with the current Junior Chart, and how much?" — with evidence that traces back to someone actually using the product, not speculation.

## Precondition check (do this first)

1. **Dev server up**: run `curl -s -o /dev/null -w "%{http_code}" http://localhost:4200` — must return 200. If not, stop and tell the founder to run `npm run dev` in another terminal.
2. **Session folder**: create `docs/ceo/sessions/<YYYY-MM-DD-HHmm>-pmf/` (timestamp in Asia/Seoul). Store the folder path as `$SESSION` for the rest of the run.
3. **Session brief**: write `$SESSION/00-session-brief.md` containing: date, goal (quoted above), roster to be used, expected outputs.

## Phase 1 — Fact gathering

Spawn `ceo-product-analyst` via the Agent tool. Prompt must include:
- Session folder path (`$SESSION`)
- Explicit instruction: "Write your report to `$SESSION/01-product-analyst.md` and return that path."
- Task: catalog every page / feature / user flow that actually works on `http://localhost:4200`. Separate "claimed capability" (from code/docs) from "observed capability" (from clicking through in the browser). Flag gaps.

After it returns:
1. `Read $SESSION/01-product-analyst.md` — verify it exists and is non-empty
2. If missing, re-call once with a reminder. Still missing → escalate
3. Write `$SESSION/phase1-checkpoint.md` with a 5-bullet summary of what Product Analyst found

**CHECKPOINT — pause and ask the founder:**
- Show the 5-bullet summary in chat
- Ask: "Does this match your understanding of the product? Any correction before Phase 2?"
- Wait for approval. Record approval + timestamp in `phase1-checkpoint.md`

## Phase 2 — Interpretation and proposal

Run sequentially (each reads the previous one):

### 2a — Persona Strategist
Spawn `ceo-persona-strategist`. Prompt includes:
- `$SESSION` path
- Input: "Read `$SESSION/01-product-analyst.md` first."
- Task: propose 1-3 specific personas (age, context, goal, technical level). Then walk through the live product at `http://localhost:4200` AS EACH PERSONA and record felt friction: what confused you, what made you leave, what delighted you.
- Output: `$SESSION/02-persona-strategist.md`

### 2b — Hypothesis Writer
Spawn `ceo-hypothesis-writer`. Prompt includes:
- `$SESSION` path
- Input: "Read `01-product-analyst.md` and `02-persona-strategist.md` first."
- Task: for each persona, write 2-3 testable PMF hypotheses. Format: "IF persona P uses feature F in context C, THEN they will exhibit behavior B measurable by metric M." Reject any hypothesis you can't express this way.
- Output: `$SESSION/03-hypothesis-writer.md`

### 2c — Validation Designer
Spawn `ceo-validation-designer`. Prompt includes:
- `$SESSION` path
- Input: "Read `03-hypothesis-writer.md` first."
- Task: for each hypothesis, design the cheapest credible validation method. Prefer methods the founder can run in a week with existing tools (PostHog events, 5-user interviews, in-app prompts). No market research studies.
- Output: `$SESSION/04-validation-designer.md`

Verify each file exists after the sub-agent returns (same rule as Phase 1).

## Synthesis

Write `$SESSION/99-ceo-memo.md` — your CEO memo to the founder. Keep it under 500 words. Structure:
1. **What we learned about the product** (2-3 sentences)
2. **Top 1-2 personas worth betting on** and why
3. **The single hypothesis to validate first** and the validation method
4. **What NOT to build** (features the diagnosis suggests are distractions)
5. **Your confidence level** (high / medium / low) and what would raise it

Then present this memo to the founder in chat. Ask what they want to do next.

## Shutdown

When the founder is done:
1. Append a journal entry per the `/ceo` shutdown routine
2. If this diagnosis produced a clear decision, record it in `docs/ceo/memory/ceo/decisions.md`
3. Say goodbye

## On questions to the founder during the run

You may interrupt the pipeline ONLY when a genuine ambiguity needs a human answer (e.g., "Persona A and B are both plausible but mutually exclusive — which matches your intent?"). Do not ask procedural questions. Do not ask for approval of routine work. Save interruptions for moments only the founder can resolve.
