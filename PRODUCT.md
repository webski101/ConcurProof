# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

ConcurProof is for multi-agent AI engineers and hackathon judges who need to inspect whether an agent team is genuinely concurrent and whether live interaction improved a controlled result.

## Product Purpose

ConcurProof runs the same benchmark in sequential, naive-parallel, and reactive-concurrent modes. It records safe runtime evidence, scores the objective result, and makes the measured effect of live cross-agent reactions visible.

## Positioning

The product does not treat overlapping start times as proof of concurrency. It records explicit reaction edges between agent events, compares execution policies on one controlled task, and reruns a selected interaction as an experimental ablation.

## Operating Context

The MVP is a local Next.js developer tool demonstrated in a 2-3 minute flow. Its controlled workload is a fictional production incident with structured evidence, a known root cause, deterministic quality scoring, local run persistence, and revisitable run and comparison URLs.

## Capabilities and Constraints

- The three runners share one benchmark, evidence set, agent roles, model setting, and scoring system.
- Reactive Concurrent mode uses the real `@mozaik-ai/core` `AgenticEnvironment`; it may not be replaced by a custom event bus.
- Four LLM-capable agents collaborate: Evidence, Hypothesis, Critic, and Verifier.
- `ConcurProofObserver` is a passive Mozaik participant and never calls an LLM.
- Live events reach the browser through server-sent events or an equivalently simple stream.
- Metrics are calculated only from recorded intervals, events, reactions, and deterministic benchmark scoring.
- The MVP stores completed runs in local JSON files.
- API keys remain server-side. One configured provider is sufficient.
- With no compatible API key, the product may run an unmistakably labelled deterministic fixture demonstration. It must never present that run as a real Mozaik/model run.
- Failures remain visible and are never replaced by fabricated successful output.
- The result certificate is a ConcurProof benchmark result, not cryptographic certification or independent accreditation.

## Brand Commitments

The product name is ConcurProof. The user explicitly requested a dark, serious developer-tool dashboard and the headline "Prove your agents are actually concurrent."

## Evidence on Hand

The complete product, architecture, benchmark, UI, metric, persistence, and definition-of-done brief was supplied in the attached build prompt. No customer logos, testimonials, commercial claims, or external benchmark results were supplied and none should be invented.

## Product Principles

1. Prove interaction, not just overlap.
2. Compare execution policies fairly.
3. Derive every displayed number from recorded data.
4. Prefer a small authentic experiment over broad unfinished infrastructure.
5. Make limitations and run provenance obvious.

## Accessibility & Inclusion

The dashboard must remain keyboard-operable, readable at high information density, responsive on smaller screens, and respectful of reduced-motion preferences.
