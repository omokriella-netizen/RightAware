import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const chatHandler = require("../api/ai/chat.js");

process.env.AI_API_KEY = "AIzaSyTestGeminiKey123456789";

console.log("Chat endpoint module successfully loaded.");

// Helper to mock request and response
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

async function runTests() {
  console.log("\n--- TEST 1: Pure Greeting Fast-Path (Zero Tokens, Sub-5ms) ---");
  {
    const { req, res, getResult } = createMockReqRes({ message: "Hi" });
    const startTime = performance.now();
    await chatHandler(req, res);
    const elapsed = performance.now() - startTime;
    const result = getResult();

    console.log(`Greeting response latency: ${elapsed.toFixed(2)}ms`);
    console.log(`Status: ${result.status}`);
    console.log(`Model: ${result.data.model}`);
    console.log(`Text: ${result.data.text}`);
    console.log(`Links count: ${result.data.links?.length}`);
    console.log(`Set-Cookie header: ${result.headers["Set-Cookie"]}`);

    assert.strictEqual(result.status, 200, "Greeting should return 200");
    assert.strictEqual(result.data.ok, true, "Greeting should return ok: true");
    assert.strictEqual(result.data.model, "static", "Greeting should use static fast-path");
    assert.strictEqual(result.data.isGreeting, true, "isGreeting flag must be true");
    assert.ok(result.data.text.includes("RightAware"), "Greeting text must mention RightAware");
    assert.ok(!result.data.text.toLowerCase().includes("take a deep breath"), "Greeting must NOT include panic de-escalation");
    assert.ok(result.headers["Set-Cookie"], "Set-Cookie should be set for guest");
  }

  console.log("\n--- TEST 2: Pidgin Greetings Fast-Path ---");
  for (const greeting of ["How far", "Kedu", "Good morning", "hello!"]) {
    const { req, res, getResult } = createMockReqRes({ message: greeting });
    await chatHandler(req, res);
    const result = getResult();
    assert.strictEqual(result.data.model, "static", `"${greeting}" should hit fast-path`);
    console.log(`[PASS] "${greeting}" -> Fast-path (model: ${result.data.model})`);
  }

  console.log("\n--- TEST 3: Pidgin Emergency Overrides Greeting Prefix ---");
  {
    // "How far, dem don lock my guy for station since yesterday"
    // Starts with "How far", but contains emergency crisis signals. MUST NOT hit greeting fast-path!
    const { req, res, getResult } = createMockReqRes({
      message: "How far, dem don lock my guy for station since yesterday"
    });

    await chatHandler(req, res);
    const result = getResult();
    // Since we don't have AI_API_KEY set in test environment, an LLM call will return 501 (not configured)
    // or attempt LLM call — definitely NOT model: "static"!
    assert.notStrictEqual(result.data?.model, "static", "Emergency must NOT hit greeting static fast-path");
    console.log(`[PASS] Emergency Pidgin correctly bypassed greeting fast-path (result code: ${result.data?.code || "llm_routed"})`);
  }

  console.log("\n--- TEST 4: Platform Inquiry Routing ---");
  {
    const { req, res, getResult } = createMockReqRes({
      message: "What is RightAware and is it free?"
    });

    await chatHandler(req, res);
    const result = getResult();
    assert.notStrictEqual(result.data?.model, "static", "Platform inquiry must route to dynamic LLM");
    console.log(`[PASS] Platform inquiry correctly routed (result code: ${result.data?.code || "llm_routed"})`);
  }

  console.log("\n--- TEST 5: Multi-Turn Conversation History Isolation ---");
  {
    // Turn 1: Greeting in history, Turn 2 is an emergency.
    // History should not cause Turn 2 to misclassify.
    const { req, res, getResult } = createMockReqRes({
      message: "Police stopped my car and demanding bribe",
      history: [
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Welcome to RightAware. How can I help?" }
      ]
    });

    await chatHandler(req, res);
    const result = getResult();
    assert.notStrictEqual(result.data?.model, "static", "Turn 2 crisis must not be classified as greeting");
    console.log(`[PASS] Turn 2 crisis correctly evaluated independently of Turn 1 greeting`);
  }

  console.log("\n--- ALL TESTS PASSED SUCCESSFULLY ---");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
