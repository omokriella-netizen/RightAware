# Project Engineering Guide

## Project Context
Node.js and Express backend with strict distributed state boundaries.

## Required Invariants
- The AI agent MUST silently load and obey `.agents/rules/state-invariants.md` when modifying stateful logic.
- Code MUST pass `scripts/check-state-boundary.mjs` before any commit.

## Required Workflow
1. Do not guess the architecture. Read the system design document when provided.
2. Implement changes.
3. Run the boundary check script to verify compliance.
