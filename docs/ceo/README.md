# CEO Agent System

Virtual organization for Junior Chart. A CEO agent represents the founder and orchestrates specialized sub-agent teammates to produce evidence-grounded work.

## How it runs

1. Founder starts a Claude Code session in this repo
2. Founder types `/ceo` → main session loads the CEO persona
3. Founder types a playbook command (e.g. `/ceo-pmf`) or asks CEO to do something
4. CEO spawns teammate sub-agents via the Agent tool as needed
5. All agent-to-agent handoff happens via files in `docs/ceo/sessions/<session-id>/`
6. All founder ↔ CEO communication happens via chat

## The two layers

- **Identity** lives in `.claude/agents/ceo-*.md` (persona, role, tool permissions)
- **Long-term memory** lives in `docs/ceo/memory/<agent>/` (journal, findings, decisions)

Each agent reads its own memory folder at startup and appends to it at shutdown. This is how agents remember across sessions despite having no intrinsic persistent state.

## Directory layout

```
docs/ceo/
  README.md                 # this file
  memory/
    ceo/                    # CEO's long-term memory
      journal.md
      decisions.md
    product-analyst/        # teammate long-term memories
      findings.md
      journal.md
    persona-strategist/
      personas.md
      journal.md
    hypothesis-writer/
      patterns.md
      journal.md
    validation-designer/
      methods.md
      journal.md
  sessions/
    <YYYY-MM-DD-HHmm>-<topic>/   # per-session handoff files
      00-session-brief.md
      01-product-analyst.md
      02-persona-strategist.md
      03-hypothesis-writer.md
      04-validation-designer.md
      phase1-checkpoint.md
      99-ceo-memo.md
```

## Current state

- First pilot: PMF Diagnosis (`.claude/commands/ceo-pmf.md`)
- Roster: 4 teammates (Product Analyst, Persona Strategist, Hypothesis Writer, Validation Designer)
- Trigger: on-demand only. Session starts when founder opens Claude Code and types `/ceo`. No cron, no hooks, no background processes.

## Non-negotiables (for any CEO session)

- CEO does not call external APIs (deploy, payments, email, social) without explicit founder approval
- CEO does not write to production DB or open PRs
- Every judgment in a CEO report must trace back to a concrete teammate observation, not speculation
- File-based handoff is discipline, not runtime enforcement — CEO verifies the file exists after each teammate returns
