# Specs, plans, and working agreements

**Start here** before writing or executing any spec.

| Document | Purpose |
|---|---|
| [`CONVENTIONS.md`](CONVENTIONS.md) | **Binding rules** for how specs and plans are written here. Every rule cites the failure that produced it. |
| [`BACKLOG.md`](BACKLOG.md) | Prioritized deferred scope. P0 confirmed defects → P1 contract holes → P2 duplication → P3 cleanup. Nothing is "deferred to Spec N" unless Spec N exists. |
| [`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md) | Everything needing eyes on a running app, batched into one pass. Agents never validate from here, and a pending item never blocks a commit. |
| `specs/` | What and why, per unit of work. |
| `plans/` | How, task by task, one commit per task. |

## The loop

```
audit / defect catalogue  →  spec (what + why)  →  plan (how, per task)
                                                        │
                                                        ▼
                                          agent executes, commits per task
                                                        │
                                                        ▼
                                   reconcile: tick boxes, record deviations,
                                   correct the spec, queue human checks
                                                        │
                                                        ▼
                              batched human validation  →  findings feed back
```

Two rules carry most of the weight:

1. **Every spec has a plan.** The one spec written without one (2a) stalled half-implemented for
   two months with a broken build. The two with plans landed complete.
2. **Agent DoD and human DoD are separate gates.** An agent cannot drive a simulator; a plan that
   makes a dev-client walkthrough a blocking step is a plan with an unreachable gate.

## Current status

| Spec | Agent DoD | Human DoD |
|---|---|---|
| [Spec 1 — Foundations](specs/2026-06-13-spec-1-foundations.md) | ✅ 2026-06-13 | ⏳ queued (§2, §3, §4) |
| [Spec 2a — AddToCollection unify](specs/2026-06-14-spec-2a-add-to-collection-unify.md) | ✅ 2026-08-08 | ⏳ queued (§1, §2) |
| [Spec 2b — PreferencesContext → RQ](specs/2026-06-14-spec-2b-preferences-context-rq.md) | ✅ 2026-06-14 | ⏳ queued (§5) |

Spec 2a had **no plan** — it predates [`CONVENTIONS.md`](CONVENTIONS.md) §1, and is the reason
that rule exists (it stalled half-implemented for ~2 months without one). It was the last spec
permitted to run without a plan; finished as-is rather than retro-planned. While closing it, a
repo-wide grep for its own §11 rule caught a second pre-existing offender in `AddToCollection.tsx`
sharing the same ad-hoc key pattern — both are now registered in `queryKeys.ts`.

**All three specs are Agent-DoD-complete.** Nothing is blocking a batched human validation pass —
see [`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md).

## Where the priorities come from

`docs/architecture/code-quality-audit.md` ranks by size and duplication. That is **not** the
current priority order — see the banner at its top.

The active goal is resistance to unexpected bugs. The defects that actually cause those live in
`docs/architecture/aggregation.md` §6, and the five re-verified against source on 2026-08-08 sit at
P0 in [`BACKLOG.md`](BACKLOG.md). Monolith splits are scheduled **last**, deliberately: a
3,000-line file matters because it hides multiple sources of truth, not because of its length.
