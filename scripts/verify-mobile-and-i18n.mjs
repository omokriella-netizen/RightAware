import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.resolve('./.edge-test-profile');

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

console.log('1. Launching Edge headless with CDP on port 9222...');
const edgeProc = spawn(EDGE_PATH, [
  '--headless=new',
  '--remote-debugging-port=9222',
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
      const res = await fetch('http://127.0.0.1:9222/json/list');
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
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result ? res.result.value : undefined;
  }

  async waitForSelector(selector, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.eval(`!!document.querySelector("${selector}")`);
      if (found) return true;
      await sleep(150);
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  try {
    const wsUrl = await getWsUrl();
    console.log('2. Connected to Edge via CDP:', wsUrl);
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 568,
      deviceScaleFactor: 1,
      mobile: true
    });

    console.log('\n========================================');
    console.log('VERIFYING index.html at 320px x 568px');
    console.log('========================================');
    await client.send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await client.waitForSelector('.ra-lang-select');
    await sleep(400);

    const indexMetrics = await client.eval(`({
      innerWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      headerWidth: document.querySelector('.site-header')?.getBoundingClientRect().width,
      headerInnerWidth: document.querySelector('.header-inner')?.getBoundingClientRect().width,
      langSelectWidth: document.querySelector('.ra-lang-select')?.getBoundingClientRect().width,
      langSelectMaxW: window.getComputedStyle(document.querySelector('.ra-lang-select')).maxWidth,
      options: Array.from(document.querySelectorAll('.ra-lang-select option')).map(o => ({ value: o.value, text: o.textContent })),
      heroSearchFlexDir: window.getComputedStyle(document.querySelector('.hero-search-form')).flexDirection,
      hotlineStripFlexDir: window.getComputedStyle(document.querySelector('.hero-hotline-strip')).flexDirection,
      hotlinePillsCols: window.getComputedStyle(document.querySelector('.hotline-pills')).gridTemplateColumns,
      crisisDangerCols: window.getComputedStyle(document.querySelector('.crisis-danger-toggle')).gridTemplateColumns,
      bentoCount: document.querySelectorAll('.hero-bento-grid .bento-card').length,
      bentoCardBg: window.getComputedStyle(document.querySelector('.bento-card')).backgroundColor,
      bentoCardColor: window.getComputedStyle(document.querySelector('.bento-card h3')).color,
      emergencyConsoleWidth: document.querySelector('#emergencyConsole')?.getBoundingClientRect().width,
      rotDPosition: window.getComputedStyle(document.querySelector('.rot-d')).position,
      rotDDisplay: window.getComputedStyle(document.querySelector('.rot-d')).display,
      rotDWidth: document.querySelector('.rot-d')?.getBoundingClientRect().width
    })`);

    console.log('index.html Viewport Check:');
    console.log('  window.innerWidth:', indexMetrics.innerWidth);
    console.log('  document.documentElement.scrollWidth:', indexMetrics.docScrollWidth);
    console.log('  document.body.scrollWidth:', indexMetrics.bodyScrollWidth);
    console.log('  Header inner width:', indexMetrics.headerInnerWidth, '(target <= 308px on 320px viewport)');
    console.log('  Language selector width:', indexMetrics.langSelectWidth, 'max-width:', indexMetrics.langSelectMaxW);
    console.log('  Language options:', indexMetrics.options);
    console.log('  Hero hotline strip flex-direction:', indexMetrics.hotlineStripFlexDir);
    console.log('  Hotline pills grid columns:', indexMetrics.hotlinePillsCols);
    console.log('  Hero search flex-direction:', indexMetrics.heroSearchFlexDir);
    console.log('  Crisis danger grid columns:', indexMetrics.crisisDangerCols);
    console.log('  Situation console width:', indexMetrics.emergencyConsoleWidth);
    console.log('  Bento card count:', indexMetrics.bentoCount);
    console.log('  Right of the Day position:', indexMetrics.rotDPosition, 'display:', indexMetrics.rotDDisplay);

    const indexScrollOk = indexMetrics.docScrollWidth <= indexMetrics.innerWidth;
    console.log('>> ASSERTION 1 (index.html scrollWidth <= innerWidth):', indexScrollOk ? 'PASSED' : 'FAILED');
    if (!indexScrollOk) throw new Error(`index.html overflows horizontally: scrollWidth=${indexMetrics.docScrollWidth} > innerWidth=${indexMetrics.innerWidth}`);

    const rotDInlineOk = indexMetrics.rotDPosition !== 'fixed';
    console.log('>> ASSERTION ROT-D (.rot-d is inline, not position: fixed):', rotDInlineOk ? 'PASSED' : 'FAILED');
    if (!rotDInlineOk) throw new Error(`.rot-d has position: ${indexMetrics.rotDPosition}, expected inline (not fixed)`);

    console.log('\nAsserting WebP assets exist and are < 45KB:');
    const webpAssets = [
      'assets/images/logo-rightaware.webp',
      'assets/images/hero-citizens.webp',
      'assets/images/help-thinking-man.webp',
      'assets/images/laws-scales-gavel.webp',
      'assets/images/about-everyone-has-a-story.webp',
      'assets/images/lawyers-professional-tablet.webp',
      'assets/images/resources-lightbulb.webp',
      'assets/images/justice-lady.webp'
    ];
    for (const asset of webpAssets) {
      const fullPath = path.resolve(asset);
      if (!fs.existsSync(fullPath)) throw new Error(`Missing webp asset on disk: ${asset}`);
      const bytes = fs.statSync(fullPath).size;
      if (bytes >= 45000) throw new Error(`Webp asset ${asset} is ${bytes} bytes (>= 45KB limit)`);
      console.log(`  ✓ ${asset}: ${(bytes / 1024).toFixed(1)} KB (< 45KB)`);
    }
    console.log('>> ASSERTION WEBP-BUDGET (all 8 webp images exist and < 45KB): PASSED');

    // Child Elements Viewport Bounding Rect Audit in ENGLISH (Zero-Trust Anti-Guillotine Audit)
    const childOverflowEn = await client.eval(`(() => {
      const elements = Array.from(document.querySelectorAll('.hotline-pill, .hero-crisis-card, .cards-grid .card, .bento-card'));
      const vpWidth = window.innerWidth;
      const violations = [];
      for (const el of elements) {
        const r = el.getBoundingClientRect();
        if (r.right > vpWidth + 0.5) {
          violations.push({ selector: el.className, right: r.right, vpWidth, overflow: r.right - vpWidth });
        }
      }
      return { passed: violations.length === 0, violations };
    })()`);
    console.log('Child Bounding Rect Audit (English):', childOverflowEn);
    const childOverflowEnOk = childOverflowEn.passed;
    console.log('>> ASSERTION 2A (English child bounding rects <= window.innerWidth):', childOverflowEnOk ? 'PASSED' : 'FAILED');

    // Language Dropdown Box-Model Audit for BOTH EN and Pidgin (Catch 1)
    const langSelectAudit = await client.eval(`(() => {
      const sel = document.querySelector('.site-header .ra-lang-select');
      if (!sel) return { ok: false, error: 'Selector not found' };
      const cs = window.getComputedStyle(sel);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = cs.font;

      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;
      const borderLeft = parseFloat(cs.borderLeftWidth) || 0;
      const borderRight = parseFloat(cs.borderRightWidth) || 0;

      // 1. Measure English option
      sel.value = 'en';
      const textEn = sel.options[0]?.text || '';
      const textWidthEn = ctx.measureText(textEn).width;
      const rectEn = sel.getBoundingClientRect();
      const contentBoxWidthEn = rectEn.width - padLeft - padRight - borderLeft - borderRight;

      // 2. Measure Pidgin option (Catch 1 precision check)
      sel.value = 'pcm';
      const textPcm = sel.options[1]?.text || '';
      const textWidthPcm = ctx.measureText(textPcm).width;
      const rectPcm = sel.getBoundingClientRect();
      const contentBoxWidthPcm = rectPcm.width - padLeft - padRight - borderLeft - borderRight;

      // Restore to English
      sel.value = 'en';

      return {
        appearance: cs.appearance || cs.webkitAppearance,
        hasEllipsis: cs.textOverflow === 'ellipsis',
        overflow: cs.overflow,
        textOverflow: cs.textOverflow,
        padRight,
        en: {
          text: textEn,
          textWidth: textWidthEn,
          rectWidth: rectEn.width,
          contentBoxWidth: contentBoxWidthEn,
          overflows: textWidthEn > contentBoxWidthEn + 1
        },
        pcm: {
          text: textPcm,
          textWidth: textWidthPcm,
          rectWidth: rectPcm.width,
          contentBoxWidth: contentBoxWidthPcm,
          overflows: textWidthPcm > contentBoxWidthPcm + 1
        }
      };
    })()`);
    console.log('Language Select Box-Model Audit (Catch 1 Audit):', JSON.stringify(langSelectAudit, null, 2));

    const langSelectOk =
      !langSelectAudit.en.overflows &&
      !langSelectAudit.pcm.overflows &&
      langSelectAudit.appearance === 'none' &&
      !langSelectAudit.hasEllipsis &&
      langSelectAudit.padRight >= 18;
    console.log('>> ASSERTION 2B (ra-lang-select box-model & zero text truncation for EN AND Pidgin):', langSelectOk ? 'PASSED' : 'FAILED');

    // Typography Space in H1 Check
    const rawH1 = await client.eval(`document.querySelector('.hero h1')?.textContent`);
    const h1TypographyOk = rawH1 && /rights\.\s+Defend/.test(rawH1);
    console.log('Hero H1 Raw TextContent:', JSON.stringify(rawH1));
    console.log('>> ASSERTION 3 (h1 typography whitespace between sentences):', h1TypographyOk ? 'PASSED' : 'FAILED');

    // 3-Tier IA Hierarchy Check
    const iaHierarchyOk = await client.eval(`(() => {
      const hero = document.querySelector('#get-started');
      const toolkits = document.querySelector('#toolkits');
      const popular = document.querySelector('#popular');
      const platform = document.querySelector('#platform');
      if (!hero || !toolkits || !popular || !platform) return false;
      const toolkitsAfterHero = (hero.compareDocumentPosition(toolkits) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const popularAfterToolkits = (toolkits.compareDocumentPosition(popular) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const platformAfterPopular = (popular.compareDocumentPosition(platform) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      return toolkitsAfterHero && popularAfterToolkits && platformAfterPopular;
    })()`);
    console.log('>> ASSERTION 4 (3-Tier IA Order: Hero -> Toolkits -> Popular -> Platform):', iaHierarchyOk ? 'PASSED' : 'FAILED');

    // Global Negative Jargon Ban (Catch 2 TreeWalker scan across entire document.body including footer)
    const jargonAudit = await client.eval(`(() => {
      const bannedRegex = /\\b(statute-backed|statutory|triage|protocol|protocols)\\b/i;
      const violations = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parentTag = node.parentElement?.tagName;
          if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) {
        const text = walker.currentNode.nodeValue;
        if (bannedRegex.test(text)) {
          violations.push({
            text: text.trim(),
            tag: walker.currentNode.parentElement?.tagName
          });
        }
      }
      return {
        passed: violations.length === 0,
        violations
      };
    })()`);
    console.log('Jargon Ban Audit (Catch 2 TreeWalker):', jargonAudit);
    const jargonOk = jargonAudit.passed;
    console.log('>> ASSERTION 5 (Strict zero-jargon ban in customer UI and footer):', jargonOk ? 'PASSED' : 'FAILED');

    // Plain Language Acceptance Criteria Contract Check
    const copyContract = await client.eval(`({
      lead: document.querySelector('.hero .lead')?.textContent.trim(),
      toolkitsH2: document.querySelector('#toolkits h2')?.textContent.trim(),
      popularH2: document.querySelector('#popular h2')?.textContent.trim(),
      btnText: document.querySelector('#triageBtn')?.textContent.trim(),
      radioNoText: document.querySelector('#dangerNo')?.parentElement.textContent.trim(),
      bentoCard2H3: document.querySelectorAll('.hero-bento-grid .bento-card h3')[1]?.textContent.trim()
    })`);
    console.log('Plain Language UI Contract:', copyContract);
    const copyContractOk =
      copyContract.lead.includes('backed by Nigerian law') &&
      copyContract.toolkitsH2 === 'Immediate steps and rights guidance' &&
      copyContract.popularH2 === 'Official rights and legal protections across Nigeria' &&
      copyContract.btnText === 'Show Immediate Steps & Guidance' &&
      copyContract.radioNoText === 'No, detained or money demanded' &&
      copyContract.bentoCard2H3 === 'Decoded Laws';
    console.log('>> ASSERTION 6 (Plain Language copy contract compliance):', copyContractOk ? 'PASSED' : 'FAILED');

    console.log('\n--- TESTING i18n TOGGLE on index.html: en -> pcm -> en ---');
    const enTexts = await client.eval(`({
      badge: document.querySelector('.hero .badge')?.textContent.trim(),
      h1: document.querySelector('.hero h1')?.textContent.trim().replace(/\\s+/g, ' '),
      lead: document.querySelector('.hero .lead')?.textContent.trim(),
      toolkitsH2: document.querySelector('#toolkits h2')?.textContent.trim(),
      popularH2: document.querySelector('#popular h2')?.textContent.trim(),
      bentoH2: document.querySelector('#platform h2')?.textContent.trim(),
      btn: document.querySelector('#triageBtn')?.textContent.trim(),
      urgentCta: document.querySelector('.site-header .btn-urgent')?.textContent.trim().replace(/\\s+/g, ' '),
      cards: Array.from(document.querySelectorAll('#homeRights .card')).map(c => ({
        title: c.querySelector('h3')?.textContent.trim(),
        summary: c.querySelector('p')?.textContent.trim()
      }))
    })`);
    console.log('English initial texts:');
    console.log({
      badge: enTexts.badge,
      h1: enTexts.h1,
      toolkitsH2: enTexts.toolkitsH2,
      btn: enTexts.btn,
      urgentCta: enTexts.urgentCta,
      cardsCount: enTexts.cards.length
    });

    // Switch to Pidgin
    await client.eval(`window.RA_I18N_API.setLang('pcm')`);
    await sleep(400);

    const pcmTexts = await client.eval(`({
      badge: document.querySelector('.hero .badge')?.textContent.trim(),
      h1: document.querySelector('.hero h1')?.textContent.trim().replace(/\\s+/g, ' '),
      lead: document.querySelector('.hero .lead')?.textContent.trim(),
      toolkitsH2: document.querySelector('#toolkits h2')?.textContent.trim(),
      popularH2: document.querySelector('#popular h2')?.textContent.trim(),
      bentoH2: document.querySelector('#platform h2')?.textContent.trim(),
      btn: document.querySelector('#triageBtn')?.textContent.trim(),
      urgentCta: document.querySelector('.site-header .btn-urgent')?.textContent.trim().replace(/\\s+/g, ' '),
      docLang: document.documentElement.getAttribute('lang'),
      cards: Array.from(document.querySelectorAll('#homeRights .card')).map(c => ({
        title: c.querySelector('h3')?.textContent.trim(),
        summary: c.querySelector('p')?.textContent.trim()
      }))
    })`);
    console.log('\nPidgin translated texts:');
    console.log({
      badge: pcmTexts.badge,
      h1: pcmTexts.h1,
      toolkitsH2: pcmTexts.toolkitsH2,
      btn: pcmTexts.btn,
      urgentCta: pcmTexts.urgentCta,
      cardsCount: pcmTexts.cards.length
    });

    console.log('\nChecking all 6 #homeRights cards translation to Pidgin:');
    let allCardsTranslated = true;
    for (let i = 0; i < enTexts.cards.length; i++) {
      const enCard = enTexts.cards[i];
      const pcmCard = pcmTexts.cards[i];
      const titleTranslated = pcmCard.title !== enCard.title;
      const summaryTranslated = pcmCard.summary !== enCard.summary;
      console.log(`  Card ${i + 1}:`);
      console.log(`    Title [en]:  ${enCard.title}`);
      console.log(`    Title [pcm]: ${pcmCard.title} (translated: ${titleTranslated})`);
      console.log(`    Summary [en]:  ${enCard.summary.substring(0, 50)}...`);
      console.log(`    Summary [pcm]: ${pcmCard.summary.substring(0, 50)}... (translated: ${summaryTranslated})`);
      if (!titleTranslated || !summaryTranslated) {
        allCardsTranslated = false;
      }
    }
    console.log('>> ASSERTION 7A (All 6 #homeRights cards translated in Pidgin):', allCardsTranslated ? 'PASSED' : 'FAILED');

    // Child Elements Viewport Bounding Rect Audit in PIDGIN (Anti-Guillotine Audit in Pidgin)
    const childOverflowPcm = await client.eval(`(() => {
      const elements = Array.from(document.querySelectorAll('.hotline-pill, .hero-crisis-card, .cards-grid .card, .bento-card'));
      const vpWidth = window.innerWidth;
      const violations = [];
      for (const el of elements) {
        const r = el.getBoundingClientRect();
        if (r.right > vpWidth + 0.5) {
          violations.push({ selector: el.className, right: r.right, vpWidth, overflow: r.right - vpWidth });
        }
      }
      return { passed: violations.length === 0, violations };
    })()`);
    console.log('Child Bounding Rect Audit (Pidgin):', childOverflowPcm);
    const childOverflowPcmOk = childOverflowPcm.passed;
    console.log('>> ASSERTION 7B (Pidgin child bounding rects <= window.innerWidth, zero guillotine):', childOverflowPcmOk ? 'PASSED' : 'FAILED');

    const triageBtnTranslated = pcmTexts.btn !== enTexts.btn;
    console.log('>> ASSERTION 7C (Triage action button translates to Pidgin):', triageBtnTranslated ? 'PASSED' : 'FAILED');

    // Switch back to English
    await client.eval(`window.RA_I18N_API.setLang('en')`);
    await sleep(400);

    const enRestoredTexts = await client.eval(`({
      badge: document.querySelector('.hero .badge')?.textContent.trim(),
      h1: document.querySelector('.hero h1')?.textContent.trim().replace(/\\s+/g, ' '),
      lead: document.querySelector('.hero .lead')?.textContent.trim(),
      toolkitsH2: document.querySelector('#toolkits h2')?.textContent.trim(),
      popularH2: document.querySelector('#popular h2')?.textContent.trim(),
      bentoH2: document.querySelector('#platform h2')?.textContent.trim(),
      btn: document.querySelector('#triageBtn')?.textContent.trim(),
      docLang: document.documentElement.getAttribute('lang')
    })`);

    const i18nToggleOk =
      pcmTexts.h1 !== enTexts.h1 &&
      enRestoredTexts.h1 === enTexts.h1 &&
      pcmTexts.lead !== enTexts.lead &&
      enRestoredTexts.lead === enTexts.lead &&
      pcmTexts.toolkitsH2 !== enTexts.toolkitsH2 &&
      enRestoredTexts.toolkitsH2 === enTexts.toolkitsH2 &&
      pcmTexts.popularH2 !== enTexts.popularH2 &&
      enRestoredTexts.popularH2 === enTexts.popularH2 &&
      pcmTexts.docLang === 'pcm' &&
      enRestoredTexts.docLang === 'en' &&
      allCardsTranslated &&
      triageBtnTranslated;
    console.log('>> ASSERTION 7D (i18n toggle en -> pcm -> en full cycle):', i18nToggleOk ? 'PASSED' : 'FAILED');

    console.log('\n========================================');
    console.log('VERIFYING laws.html at 320px x 568px');
    console.log('========================================');
    await client.send('Page.navigate', { url: 'http://localhost:8080/laws.html' });
    await client.waitForSelector('.ra-lang-select');
    await sleep(400);

    const lawsMetrics = await client.eval(`({
      innerWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      filterBarFlexDir: window.getComputedStyle(document.querySelector('.filter-bar')).flexDirection,
      filterBarSearchWidth: document.querySelector('#lawQ')?.getBoundingClientRect().width,
      filterBarBtnWidth: document.querySelector('#lawSearchBtn')?.getBoundingClientRect().width,
      stickyHeaderPos: window.getComputedStyle(document.querySelector('.site-header')).position
    })`);

    console.log('laws.html Viewport Check:');
    console.log('  window.innerWidth:', lawsMetrics.innerWidth);
    console.log('  document.documentElement.scrollWidth:', lawsMetrics.docScrollWidth);
    console.log('  document.body.scrollWidth:', lawsMetrics.bodyScrollWidth);
    console.log('  Filter bar flex-direction:', lawsMetrics.filterBarFlexDir);
    console.log('  Filter bar search input width:', lawsMetrics.filterBarSearchWidth);
    console.log('  Header position (sticky intact):', lawsMetrics.stickyHeaderPos);

    const lawsScrollOk = lawsMetrics.docScrollWidth <= lawsMetrics.innerWidth;
    console.log('>> ASSERTION 8 (laws.html scrollWidth <= innerWidth):', lawsScrollOk ? 'PASSED' : 'FAILED');

    // TreeWalker jargon scan on laws.html (Catch 2)
    const lawsJargonAudit = await client.eval(`(() => {
      const bannedRegex = /\\b(statute-backed|statutory|triage|protocol|protocols)\\b/i;
      const violations = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parentTag = node.parentElement?.tagName;
          if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) {
        const text = walker.currentNode.nodeValue;
        if (bannedRegex.test(text)) {
          violations.push({
            text: text.trim(),
            tag: walker.currentNode.parentElement?.tagName
          });
        }
      }
      return {
        passed: violations.length === 0,
        violations
      };
    })()`);
    console.log('laws.html Jargon Ban Audit (Catch 2 TreeWalker):', lawsJargonAudit);
    const lawsJargonOk = lawsJargonAudit.passed;
    console.log('>> ASSERTION 9 (laws.html zero-jargon ban in customer UI and footer):', lawsJargonOk ? 'PASSED' : 'FAILED');

    console.log('\n--- TESTING i18n TOGGLE on laws.html: en -> pcm -> en ---');
    const lawsEn = await client.eval(`document.querySelector('.page-hero h1')?.textContent.trim()`);
    await client.eval(`window.RA_I18N_API.setLang('pcm')`);
    await sleep(400);
    const lawsPcm = await client.eval(`document.querySelector('.page-hero h1')?.textContent.trim()`);
    await client.eval(`window.RA_I18N_API.setLang('en')`);
    await sleep(400);
    const lawsEnRestored = await client.eval(`document.querySelector('.page-hero h1')?.textContent.trim()`);

    console.log('  Laws H1 English:', lawsEn);
    console.log('  Laws H1 Pidgin:', lawsPcm);
    console.log('  Laws H1 Restored:', lawsEnRestored);
    const lawsI18nOk = lawsPcm !== lawsEn && lawsEnRestored === lawsEn;
    console.log('>> ASSERTION 10 (laws.html i18n toggle):', lawsI18nOk ? 'PASSED' : 'FAILED');

    // Bonus Check: Verify ai.html header has no title stutter
    console.log('\n========================================');
    console.log('VERIFYING ai.html Header & Clean Typography');
    console.log('========================================');
    await client.send('Page.navigate', { url: 'http://localhost:8080/ai.html' });
    await client.waitForSelector('.page-hero h1');
    await sleep(300);

    const aiH1Text = await client.eval(`document.querySelector('.page-hero h1')?.textContent.trim()`);
    console.log('  ai.html H1 textContent:', JSON.stringify(aiH1Text));
    const aiH1Clean = aiH1Text === 'Interactive Legal Assistant' && !aiH1Text.includes('AI ASSISTANT');
    console.log('>> ASSERTION 11 (ai.html zero-stutter clean H1 heading):', aiH1Clean ? 'PASSED' : 'FAILED');

    client.close();
    edgeProc.kill();

    const allPassed =
      indexScrollOk &&
      childOverflowEnOk &&
      langSelectOk &&
      h1TypographyOk &&
      iaHierarchyOk &&
      jargonOk &&
      copyContractOk &&
      allCardsTranslated &&
      childOverflowPcmOk &&
      triageBtnTranslated &&
      i18nToggleOk &&
      lawsScrollOk &&
      lawsJargonOk &&
      lawsI18nOk &&
      aiH1Clean;

    if (!allPassed) {
      console.error('\nFAIL: One or more assertions failed.');
      process.exit(1);
    }

    console.log('\n========================================');
    console.log('ALL POST-EXECUTION VERIFICATIONS PASSED!');
    console.log('========================================');
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    try { edgeProc.kill(); } catch (_) {}
    process.exit(1);
  }
}

run();
