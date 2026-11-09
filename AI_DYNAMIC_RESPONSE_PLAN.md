# RightAware AI: Dynamic Response & Token Optimization Architecture

**Author:** Staff Backend & System Architect  
**Status:** Implemented & Verified with Policy Enforcement  
**Target Subsystems:** `api/ai/chat.js`, `js/ai-renderer.js`, `ai.html`, `content/`  
**Compliance Target:** `.agents/rules/state-invariants.md`, `scripts/check-state-boundary.mjs`, `01_ANTI_SLOP_CONSTITUTION.md`

---

## 1. Intent Classification Architecture & Analogy Policy

To prevent condescending or unhelpful analogies during real-life incidents and serious crimes, the architecture enforces a strict boundary between **statutory explanation requests** and **real-world incident navigation**:

```
                                  [ Citizen Input ]
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │  Intent Classifier &  │
                              │   Heuristic Router    │
                              └───────────┬───────────┘
                                          │
         ┌───────────────────┬────────────┴───────────────┬─────────────────────────┐
         ▼                   ▼                            ▼                         ▼
  [ 1. GREETING ]     [ 2. PLATFORM ]             [ 3. EXPLAIN LAW ]       [ 4. PRACTICAL GUIDANCE ]
  • Server-local      • Platform mission & tools  • Explicit request to     • Real-life dispute, crime,
  • Zero LLM tokens   • Free public access          explain a law/right       checkpoint, or lockout
  • Sub-5ms latency   • Navigational links        • ANALOGIES & EXAMPLES    • STRICT BAN ON ANALOGIES
  • Quota synced      • Direct & structured         PERMITTED HERE ONLY     • STEP-BY-STEP GUIDELINES
```

### 1.1 Intent Archetypes Specification

| Mode / Intent | Input Type | Analogy / Example Policy | Target Output Tokens | Output Contract |
| :--- | :--- | :--- | :---: | :--- |
| **`INTENT_GREETING_CASUAL`** | Pure greetings (`"Hi"`, `"How far"`, `"Good morning"`) | **None** | **0 tokens** (Local Fast-Path) | Rotating polite greeting + 3 navigation links (`rights.html`, `laws.html`, `help.html`). Sub-5ms, zero LLM tokens, guest quota synced. |
| **`INTENT_PLATFORM_INQUIRY`** | Platform inquiries (`"What is RightAware?"`, `"Is it free?"`, `"Are you a lawyer?"`) | **None** | **150 – 270 tokens** | Direct breakdown of RightAware tools, 28 rights topics, laws library, emergency console, non-law-firm status, and directory links. |
| **`INTENT_EXPLAIN_LAW`** | Explicit requests to explain/demystify the law (`"Explain Section 35 with an example"`, `"Break down Electoral Act"`) | **YES (Authorized & Required)** | **280 – 400 tokens** | **4-Part Pedagogical Breakdown:**<br>1. *Plain Meaning*<br>2. *Everyday Nigerian Analogy* (market receipt, referee)<br>3. *Illustrative Example*<br>4. *Statutory Citation* |
| **`INTENT_PRACTICAL_GUIDANCE`** | Practical disputes, landlord conflicts, checkpoint searches, arrests, and serious crimes (Queries 6, 7, 8) | **STRICTLY PROHIBITED (No analogies, no metaphors)** | **300 – 480 tokens** | **Direct Step-by-Step Navigation Guidelines:**<br>1. *Direct Legal Assessment* (Lawful vs Unlawful)<br>2. *Step 1: Immediate Safety & De-escalation*<br>3. *Step 2: Evidence & Documentation*<br>4. *Step 3: Statutory Protections & Rights*<br>5. *Step 4: Actionable Next Steps & Helplines* |

---

## 2. 8-Scenario Policy Verification Benchmark

Executed via [`scripts/test-8-queries.mjs`](file:///c:/Users/PC/Desktop/OneDrive/Documents/rightaware-refactor/scripts/test-8-queries.mjs):

| # | Scenario & Query | Classified Intent | Analogy / Example Policy | Input Tok | Output Tok | Total Tok |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **1** | `"Hi"` | `Fast-Path (Server Local)` | **NO (None)** | 0 | 0 | **0** |
| **2** | `"How far"` | `Fast-Path (Server Local)` | **NO (None)** | 0 | 0 | **0** |
| **3** | `"What is RightAware and is it free to use?"` | `INTENT_PLATFORM_INQUIRY` | **NO (None)** | 431 | 270 | **701** |
| **4** | `"Are you a lawyer, and can RightAware represent me in court?"` | `INTENT_PLATFORM_INQUIRY` | **NO (None)** | 435 | 207 | **642** |
| **5** | `"Explain Section 35 of the Nigerian Constitution with an example"` | `INTENT_EXPLAIN_LAW` | **YES (Authorized: Analogy & Example)** | 436 | 328 | **764** |
| **6** | `"My landlord locked my gate and threatened to remove my roof because I owe 1 month rent. Is this legal?"` | `INTENT_PRACTICAL_GUIDANCE` | **NO (Strict Ban on Analogies; Step-by-step Guidelines)** | 446 | 453 | **899** |
| **7** | `"Can a police officer or EFCC search my phone at a checkpoint without a warrant?"` | `INTENT_PRACTICAL_GUIDANCE` | **NO (Strict Ban on Analogies; Step-by-step Guidelines)** | 440 | 452 | **892** |
| **8** | `"Help! The police just arrested my brother and locked him in a cell, they are demanding 50k bail before releasing him"` | `INTENT_PRACTICAL_GUIDANCE` | **NO (Strict Ban on Analogies; Step-by-step Guidelines)** | 449 | 478 | **927** |

---

## 3. Dynamic Waiting Loading Background & Skeleton UI

Implemented in [`ai.html`](file:///c:/Users/PC/Desktop/OneDrive/Documents/rightaware-refactor/ai.html) and [`styles.css`](file:///c:/Users/PC/Desktop/OneDrive/Documents/rightaware-refactor/styles.css):
- **Context-Adaptive Phase Text:** Switches status messages dynamically based on user inquiry (Police/ACJA vs Tenancy vs Platform vs General Constitution).
- **Ambient Shimmer Beam (`raShimmerBeam`):** Light beam animation travelling across the container background.
- **Pulsing Skeleton Shimmer Bars (`raSkeletonPulse`):** 3-tier pulsing skeleton lines (92%, 75%, 45%) simulating the incoming structured response.
- **Zero-Slop Design:** Free of decorative emojis, adhering to Müller-Brockmann hairline borders (`1.5px solid #86efac`) and soft institutional tints.
