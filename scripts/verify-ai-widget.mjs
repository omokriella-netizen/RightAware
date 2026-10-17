import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.resolve('./.edge-widget-test-profile');

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

console.log('=== STARTING FLOATING AI WIDGET VERIFICATION ===');
console.log('1. Launching Edge headless with CDP on port 9224...');
const edgeProc = spawn(EDGE_PATH, [
  '--headless=new',
  '--remote-debugging-port=9224',
  `--user-data-dir=${USER_DATA_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
]);

edgeProc.on('error', (err) => {
  console.error('Failed to spawn Edge:', err);
  process.exit(1);
});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json/list');
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch (_) {}
    await sleep(400);
  }
  throw new Error('Could not connect to Edge DevTools page target');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = false) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to CDP at:', wsUrl);
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('CSS.enable');
    await client.send('Runtime.enable');

    // 1. Mobile viewport 320x568
    console.log('\n[TEST 1] Setting viewport to 320px x 568px (Mobile iPhone SE)');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 568,
      deviceScaleFactor: 2,
      mobile: true
    });

    console.log('Navigating to http://localhost:8080/index.html ...');
    await client.send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const loc = await client.evaluate('window.location.href');
    console.log('Current Edge URL:', loc);

    const fabEval = await client.evaluate(`(() => {
      const fab = document.getElementById("raAiFab");
      if (!fab) return { error: "FAB not found" };
      const rect = fab.getBoundingClientRect();
      const style = window.getComputedStyle(fab);
      return {
        visible: rect.width > 0 && rect.height > 0,
        text: fab.textContent.replace(/\\s+/g, ' ').trim(),
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
        style: {
          display: style.display,
          width: style.width,
          height: style.height,
          position: style.position,
          visibility: style.visibility,
          opacity: style.opacity
        },
        parent: fab.parentElement ? fab.parentElement.tagName : null,
        overflowsWindow: rect.right > 320 || rect.bottom > 568,
        zIndex: style.zIndex
      };
    })()`);

    try {
      const doc = await client.send('DOM.getDocument', { depth: -1 });
      const nodeRes = await client.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#raAiFab' });
      if (nodeRes && nodeRes.nodeId) {
        const matched = await client.send('CSS.getMatchedStylesForNode', { nodeId: nodeRes.nodeId });
        console.log('Matched CSS rules for #raAiFab:');
        matched.matchedCSSRules.forEach(r => {
          const decls = r.rule.style.cssProperties.filter(p => p.name === 'display');
          if (decls.length) {
            console.log(`- Selector: "${r.rule.selectorList.text}", display: "${decls[0].value}" (from ${r.rule.origin})`);
          }
        });
      }
    } catch (cssErr) {
      console.log('Could not inspect matched CSS rules:', cssErr.message);
    }

    console.log('FAB Verification:', JSON.stringify(fabEval, null, 2));
    if (!fabEval.visible) throw new Error('FAB is not visible');
    if (fabEval.overflowsWindow) throw new Error('FAB overflows 320px screen boundary!');
    if (!fabEval.text.includes('Ask AI')) throw new Error('FAB missing "Ask AI" label');

    // 2. Open drawer on mobile
    console.log('\n[TEST 2] Tapping FAB to open drawer on mobile <= 600px');
    const drawerOpen = await client.evaluate(`(async () => {
      const fab = document.getElementById("raAiFab");
      fab.click();
      await new Promise(r => setTimeout(r, 400));
      const drawer = document.getElementById("raAiDrawer");
      const rect = drawer.getBoundingClientRect();
      const style = window.getComputedStyle(drawer);
      return {
        isOpen: drawer.classList.contains("open"),
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
        style: {
          width: style.width,
          maxWidth: style.maxWidth,
          transform: style.transform,
          left: style.left,
          right: style.right,
          top: style.top
        },
        innerWidth: window.innerWidth,
        hasEmergencyLink: !!document.getElementById("raAiEmergencyLink"),
        hasFullPageLink: !!document.getElementById("raAiFullViewLink")
      };
    })()`, true);

    console.log('Drawer Open Verification:', JSON.stringify(drawerOpen, null, 2));
    if (!drawerOpen.isOpen) throw new Error('Drawer failed to open');
    if (Math.round(drawerOpen.rect.width) !== 320) throw new Error(`Drawer width is ${drawerOpen.rect.width}, expected 320 on mobile`);
    if (!drawerOpen.hasEmergencyLink) throw new Error('Emergency link missing in drawer');

    // 3. Question 1
    console.log('\n[TEST 3] Sending Question 1 via quick prompt chip');
    const q1Res = await client.evaluate(`(async () => {
      const chip = document.querySelector(".ra-ai-chip");
      chip.click();
      await new Promise(r => setTimeout(r, 600));
      const msgs = Array.from(document.querySelectorAll("#raAiMessages .ra-ai-msg")).map(m => m.textContent.trim());
      const status = document.getElementById("raAiDrawerStatus").textContent.trim();
      const count = window.RA_CHAT_STATE.getGuestPromptCount();
      return { msgsCount: msgs.length, lastMsgSnippet: msgs[msgs.length - 1].slice(0, 120), status, count };
    })()`, true);

    console.log('Question 1 Verification:', JSON.stringify(q1Res, null, 2));
    if (q1Res.count !== 1) throw new Error('Guest prompt count should be 1');
    if (!q1Res.status.includes('1/3')) throw new Error('Status should show 1/3 Free');

    // 4. Questions 2 & 3 and Preview Limit Gate
    console.log('\n[TEST 4] Reaching Free Limit (3/3) & Verifying Gate + Context Transit');
    const limitRes = await client.evaluate(`(async () => {
      const input = document.getElementById("raAiInput");
      const form = document.getElementById("raAiForm");

      // Q2
      input.value = "My landlord locked my apartment.";
      form.dispatchEvent(new Event("submit"));
      await new Promise(r => setTimeout(r, 600));

      // Q3
      input.value = "Unpaid salary steps";
      form.dispatchEvent(new Event("submit"));
      await new Promise(r => setTimeout(r, 600));

      const count = window.RA_CHAT_STATE.getGuestPromptCount();
      const limitCard = document.getElementById("raAiLimitCard");
      const inputDisabled = input.disabled;

      // Click limit sign in
      const signInBtn = document.getElementById("raAiLimitSignIn");
      if (signInBtn) signInBtn.click();

      const rawTransit = sessionStorage.getItem("ra_pending_chat");

      return {
        count,
        hasLimitCard: !!limitCard,
        inputDisabled,
        transitSaved: !!rawTransit,
        transitCount: rawTransit ? JSON.parse(rawTransit).length : 0
      };
    })()`, true);

    console.log('Limit Gate Verification:', JSON.stringify(limitRes, null, 2));
    if (limitRes.count !== 3) throw new Error('Expected guest count 3');
    if (!limitRes.hasLimitCard) throw new Error('Limit card not shown');
    if (!limitRes.inputDisabled) throw new Error('Input should be disabled after limit');
    if (!limitRes.transitSaved) throw new Error('Transit conversation not saved in sessionStorage');

    // 5. Navigate to ai.html and verify thread hydration
    console.log('\n[TEST 5] Hydrating thread on ai.html?resume=1');
    await client.send('Page.navigate', { url: 'http://localhost:8080/ai.html?resume=1' });
    await sleep(1500);

    const aiRes = await client.evaluate(`(() => {
      const box = document.getElementById("chatBox");
      const msgs = Array.from(box.querySelectorAll(".msg")).map(m => m.textContent.trim());
      const transitRemaining = sessionStorage.getItem("ra_pending_chat");
      return {
        totalMsgs: msgs.length,
        hasRestoredNotice: msgs.some(m => m.includes("Restored your conversation from the home page")),
        hasLandlordQuery: msgs.some(m => m.includes("landlord locked")),
        transitCleared: transitRemaining === null
      };
    })()`);

    console.log('ai.html Hydration Verification:', JSON.stringify(aiRes, null, 2));
    if (!aiRes.hasRestoredNotice) throw new Error('ai.html did not restore thread');
    if (!aiRes.transitCleared) throw new Error('Transit envelope was not cleared (Single Ownership violation)');

    console.log('\n=============================================');
    console.log('>>> ALL VERIFICATION ASSERTIONS PASSED! <<<');
    console.log('=============================================');

    client.close();
    edgeProc.kill();
    process.exit(0);

  } catch (err) {
    console.error('\nTEST FAILED:', err);
    edgeProc.kill();
    process.exit(1);
  }
}

run();
