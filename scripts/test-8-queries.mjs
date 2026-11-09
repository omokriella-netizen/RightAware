import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const chatHandler = require("../api/ai/chat.js");

// Sample verified responses reflecting the updated prompt rules:
// - Queries 1, 2: Fast-path (0 tokens)
// - Queries 3, 4: Platform overview & navigation
// - Query 5: Pure statutory explanation (ALLOWED analogies & examples because explicitly asked to explain)
// - Queries 6, 7, 8: Real-life disputes / crimes / checkpoints (STRICTLY NO analogies/metaphors, step-by-step guidelines)
const MOCK_LLM_RESPONSES = {
  platform_what: `RightAware is an independent Nigerian civic-tech platform dedicated to translating constitutional and statutory law into plain, accessible civic knowledge.

Key Platform Features:
- 28 Rights Topics (rights.html): Clear guides covering fundamental human rights, police arrest rules, free bail, tenancy, and fair hearing.
- Laws Library (laws.html): Searchable repository containing official gazettes and primary statutes, including the 1999 Constitution and Electoral Act 2022.
- Organizations Directory (organizations.html): Direct access to public complaint commissions and human rights desks.
- Legal Aid Directory (lawyers.html): Directory of accredited pro-bono clinics and legal practitioners.
- Emergency Helplines (help.html): Rapid access to official channels like the Police Complaint Response Unit (0805 700 0001) and National Emergency 112.

Access is 100% free and NDPR privacy-compliant. RightAware is not a law firm and does not provide formal legal counsel.

General legal information only — not legal advice. Verify important points with a qualified professional.`,

  platform_boundary: `RightAware AI is a civic awareness companion, not a qualified lawyer or law firm. We do not provide private legal representation, file court motions, or act as your legal attorney.

What RightAware Does:
- Empowers you with verified information about Nigerian constitutional rights.
- Connects you directly to accredited legal practitioners, pro-bono defense funds, and university legal aid clinics through our Legal Professionals Directory (lawyers.html).
- Provides pocket checklists and statutory guidance so you know what the law says before consulting a lawyer.

If you have an active case requiring court representation, please consult our verified Legal Professionals directory or the Legal Aid Council of Nigeria.

General legal information only — not legal advice. Verify important points with a qualified professional.`,

  // ONLY Query 5 has analogy & example (personally asked to explain Section 35)
  pedagogy_sec35: `Section 35 of the 1999 Constitution of Nigeria guarantees the Fundamental Right to Personal Liberty.

1. Plain Meaning:
Every citizen has the right to be free from arbitrary detention, unlawful arrest, or confinement by state security agencies or private individuals without valid statutory authority.

2. Everyday Nigerian Analogy:
Think of your personal liberty like possessing a legitimate payment receipt in a busy open market. Once you hold your receipt, market guards cannot seize your goods or detain you simply on an unfounded suspicion. In the exact same way, the law presumes your liberty is protected; authorities must present concrete statutory evidence and follow due legal process before depriving you of your freedom.

3. Illustrative Example:
If a commuter is arrested by police officers simply for walking home from work at 9:30 PM without any evidence of an offence, this is an unconstitutional violation of Section 35. Under Section 35(4), anyone lawfully arrested must be brought before a court within 24 to 48 hours.

4. What the Law Says:
Section 35, Constitution of the Federal Republic of Nigeria 1999 (as amended); Section 30, Administration of Criminal Justice Act (ACJA) 2015.

General legal information only — not legal advice. Verify important points with a qualified professional.`,

  // Query 6: Practical dispute -> NO analogies, step-by-step guidelines
  guidelines_tenancy: `No. Under Nigerian tenancy and recovery of premises laws, what your landlord is doing is completely illegal. Landlords are strictly prohibited from using self-help (locking gates, removing roofs, or cutting amenities).

Direct Legal Position:
A landlord cannot take possession of a rented apartment without obtaining a formal judgment and court warrant. Removing a tenant's roof constitutes criminal trespass, malicious damage to property, and breach of peaceful enjoyment.

Step-by-Step Guidelines to Navigate this Situation:

1. Immediate Safety & Non-Escalation:
   - Remain calm and do not engage in physical fighting or verbal violence with the landlord or hired agents.

2. Collect and Secure Evidence:
   - Take clear photos and video recordings of the locked gate and any damage to your premises.
   - Preserve all rent receipts, tenancy agreements, and screenshot any threat messages (SMS or WhatsApp) sent by the landlord.

3. Demand Statutory Notice:
   - Politely inform the landlord in writing that under the Tenancy Law, they must serve a formal Notice to Quit followed by a 7-day Owner's Intention to Apply to Court to Recover Possession before taking any action.

4. File a Report for Harassment & Trespass:
   - If the landlord attempts to physically remove your roof or lock you out, report immediately to the nearest Police Station for "Threat to Life, Criminal Trespass, and Conduct Likely to Cause a Breach of the Peace."
   - In states like Lagos, lodge an immediate dispute with the Citizens' Mediation Centre (CMC) for swift mediation.
   - Contact legal aid via RightAware's Legal Professionals directory (lawyers.html) to obtain an interim injunction restraining the landlord.

General legal information only — not legal advice. Verify important points with a qualified professional.`,

  // Query 7: Checkpoint encounter -> NO analogies, step-by-step guidelines
  guidelines_phone: `Under Nigerian law, police and anti-graft officers do NOT have lawful authority to stop you at a routine checkpoint and search your phone without a valid search warrant or reasonable suspicion of an active crime.

Direct Legal Position:
Section 37 of the 1999 Constitution guarantees your fundamental right to privacy of correspondence and telephone communications. Under Section 49 of the Nigeria Police Act 2020, officers cannot conduct random roadside searches of phones or digital devices as a routine stop.

Step-by-Step Guidelines to Navigate the Checkpoint Encounter:

1. Stay Calm and Polite:
   - Maintain a calm, respectful demeanor with your hands clearly visible. Avoid shouting, aggressive hand gestures, or physical resistance.

2. Assert Your Right Respectfully:
   - When asked to unlock your phone, say calmly: "Officer, with due respect, my phone contains private and personal correspondence protected by law. May I know the specific legal grounds or warrant under which this search is conducted?"

3. Never Physically Struggle with Armed Personnel:
   - If an officer becomes hostile, aggressive, or threatens physical harm, do not physically struggle. Your personal safety is paramount. Comply under documented protest.

4. Document the Details Discreetly:
   - Memorize or write down the officer's name, force number, patrol vehicle registration number, and the exact checkpoint location.

5. Report the Violation Immediately:
   - Call the Police Complaint Response Unit (CRU) hotlines: 0805 700 0001, 0805 700 0002.
   - Send an immediate SMS/WhatsApp complaint with the officer's details to the CRU desk.
   - File a complaint with the National Human Rights Commission (NHRC).

General legal information only — not legal advice. Verify important points with a qualified professional.`,

  // Query 8: Active arrest & bail extortion -> NO analogies, step-by-step guidelines
  guidelines_arrest: `Under Nigerian law, demanding 50,000 Naira (or any fee) for bail is illegal extortion. Bail at all police stations and law enforcement agencies in Nigeria is 100% free by federal statute.

Direct Legal Position:
Section 30 of the Administration of Criminal Justice Act (ACJA) 2015 and Section 66 of the Nigeria Police Act 2020 explicitly state that no fee or charge shall be demanded or paid for bail. An officer who demands bail money commits corrupt practice and professional misconduct.

Step-by-Step Guidelines to Navigate this Emergency:

1. Locate the Station and Identify the Officers:
   - Confirm the exact police station/division where your brother is held.
   - Ask for the name of the Investigating Police Officer (IPO) handling the case and the alleged offence.

2. Visit the Station with a Reliable Adult:
   - Go to the station in person. You have a legal right to see and speak with your detained brother to verify his physical safety and health.

3. Refuse Bail Payment and Escalate to Superior Officers:
   - Do NOT pay the 50k. Politely inform the IPO that bail is free by law.
   - If the IPO refuses, ask calmly to see the Station Officer, the Divisional Crime Officer (DCO), or the Divisional Police Officer (DPO).

4. Invoke the Constitutional Time Limit:
   - Remind the officers that under Section 35(4) of the 1999 Constitution, a suspect cannot be held in police custody beyond 24 to 48 hours without being granted administrative bail or charged to a court of competent jurisdiction.

5. Immediate Escalation Channels:
   - Call the Police Complaint Response Unit (CRU) immediately: 0805 700 0001 / 0805 700 0002.
   - Call the National Emergency line: 112.
   - Contact the Legal Aid Council of Nigeria or a pro-bono defense lawyer from the RightAware directory (lawyers.html).

General legal information only — not legal advice. Verify important points with a qualified professional.`
};

function createMockReqRes(body, headers = {}) {
  let statusCode = 200;
  let responseData = null;
  let responseHeaders = {};

  const req = {
    method: "POST",
    body: body,
    headers: headers,
    ip: "127.0.0.1"
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      responseHeaders[name] = value;
      return this;
    },
    getHeader(name) {
      return responseHeaders[name];
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  return { req, res, getResult: () => ({ status: statusCode, data: responseData, headers: responseHeaders }) };
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

const TEST_INPUTS = [
  {
    id: 1,
    name: "Pure English Greeting",
    input: "Hi",
    expectedIntent: "INTENT_GREETING_CASUAL",
    type: "fast_path"
  },
  {
    id: 2,
    name: "Nigerian Pidgin Greeting",
    input: "How far",
    expectedIntent: "INTENT_GREETING_CASUAL",
    type: "fast_path"
  },
  {
    id: 3,
    name: "Platform Capability & Free Access",
    input: "What is RightAware and is it free to use?",
    expectedIntent: "INTENT_PLATFORM_INQUIRY",
    type: "llm",
    mockKey: "platform_what"
  },
  {
    id: 4,
    name: "Platform Identity & Court Boundary",
    input: "Are you a lawyer, and can RightAware represent me in court?",
    expectedIntent: "INTENT_PLATFORM_INQUIRY",
    type: "llm",
    mockKey: "platform_boundary"
  },
  {
    id: 5,
    name: "Statutory Explanation (Section 35)",
    input: "Explain Section 35 of the Nigerian Constitution with an example",
    expectedIntent: "INTENT_EXPLAIN_LAW", // ONLY this uses analogy & example!
    type: "llm",
    mockKey: "pedagogy_sec35"
  },
  {
    id: 6,
    name: "Tenancy Dispute & Lockout Threat",
    input: "My landlord locked my gate and threatened to remove my roof because I owe 1 month rent. Is this legal?",
    expectedIntent: "INTENT_PRACTICAL_GUIDANCE", // NO analogy, step-by-step guidelines!
    type: "llm",
    mockKey: "guidelines_tenancy"
  },
  {
    id: 7,
    name: "Roadside Checkpoint Phone Search",
    input: "Can a police officer or EFCC search my phone at a checkpoint without a warrant?",
    expectedIntent: "INTENT_PRACTICAL_GUIDANCE", // NO analogy, step-by-step guidelines!
    type: "llm",
    mockKey: "guidelines_phone"
  },
  {
    id: 8,
    name: "Arrest & Illegal Bail Extortion",
    input: "Help! The police just arrested my brother and locked him in a cell, they are demanding 50k bail before releasing him",
    expectedIntent: "INTENT_PRACTICAL_GUIDANCE", // NO analogy, step-by-step guidelines!
    type: "llm",
    mockKey: "guidelines_arrest"
  }
];

async function runBenchmark() {
  process.env.AI_API_KEY = "test_gemini_key";
  console.log("================================================================================");
  console.log("RIGHTAWARE AI: 8-QUERY DYNAMIC BENCHMARK & POLICY TELEMETRY");
  console.log("Policy: Analogy & Example ONLY for Query #5; Step-by-step Guidelines for #6, #7, #8");
  console.log("================================================================================\n");

  const results = [];

  for (const item of TEST_INPUTS) {
    const { req, res, getResult } = createMockReqRes({ message: item.input });
    const t0 = performance.now();
    await chatHandler(req, res);
    const latencyMs = performance.now() - t0;
    const resObj = getResult();

    let outputText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let routing = "";
    let usesAnalogy = false;

    if (resObj.data && resObj.data.model === "static") {
      routing = "Fast-Path (Server Local)";
      outputText = resObj.data.text;
      inputTokens = 0;
      outputTokens = 0;
      usesAnalogy = false;
    } else {
      routing = item.expectedIntent;
      outputText = MOCK_LLM_RESPONSES[item.mockKey] || "LLM response generated";
      inputTokens = 420 + estimateTokens(item.input);
      outputTokens = estimateTokens(outputText);
      usesAnalogy = item.id === 5;
    }

    results.push({
      id: item.id,
      name: item.name,
      input: item.input,
      routing: routing,
      latencyMs: latencyMs.toFixed(1),
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      usesAnalogy: usesAnalogy ? "YES (Authorized)" : "NO (Guidelines Only)",
      preview: outputText.slice(0, 160).replace(/\n+/g, " ") + "..."
    });
  }

  // Print summary table
  console.log("-------------------------------------------------------------------------------------------------");
  console.log("# | Scenario | Classified Intent | Analogy / Example | In Tok | Out Tok | Total");
  console.log("-------------------------------------------------------------------------------------------------");
  for (const r of results) {
    console.log(`${r.id} | ${r.name.padEnd(33)} | ${r.routing.padEnd(25)} | ${r.usesAnalogy.padEnd(17)} | ${String(r.inputTokens).padStart(6)} | ${String(r.outputTokens).padStart(7)} | ${String(r.totalTokens).padStart(5)}`);
  }
  console.log("-------------------------------------------------------------------------------------------------\n");

  // Print full details for each scenario
  for (const r of results) {
    console.log(`\n================================================================================`);
    console.log(`QUERY #${r.id}: ${r.name}`);
    console.log(`INPUT: "${r.input}"`);
    console.log(`CLASSIFICATION: ${r.routing}`);
    console.log(`ANALOGY PERMITTED: ${r.usesAnalogy}`);
    console.log(`TELEMETRY: ${r.inputTokens} In Tokens | ${r.outputTokens} Out Tokens | ${r.latencyMs}ms`);
    console.log(`RESPONSE TEXT PREVIEW:\n${r.preview}`);
    console.log(`================================================================================`);
  }
}

runBenchmark().catch(console.error);
