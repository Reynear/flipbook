# AGENTS.md

## Purpose

Project-level instructions for coding agents working in this repository.

## Core Rules

- Never add fallbacks.
- Never preserve legacy behavior with compatibility layers.
- Prefer breaking changes when they enable better architecture, clearer APIs, and stronger long-term patterns.
- Remove outdated code paths instead of branching for backward compatibility.

## Implementation Guidance

- If an old interface conflicts with a better pattern, replace it directly.
- Keep one canonical path for each behavior.
- Avoid feature flags or dual-mode support used only to soften migration.
- When making a breaking change, update all in-repo call sites in the same change.

## Quality Bar

- Optimize for maintainability and correctness over short-term compatibility.
- Keep implementations simple, explicit, and consistent with modern patterns.
