---
description: >
  Apply only when creating, inspecting, or modifying files responsible for 
  authoritative state ownership, sequence advancement, or state transitions.
---

# State Invariants

## 1. Single Ownership
Every mutable state field has one authoritative owner. Do not introduce secondary writers.

## 2. Boundary Enforcement
Only the designated state store is permitted to import the authoritative state client.

## 3. Concurrency
State transitions must be synchronously locked in local memory before network consumption to prevent socket exhaustion and race conditions.
