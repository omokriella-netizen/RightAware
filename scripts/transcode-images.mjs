import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.resolve('./.edge-transcode-profile');

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

const edgeProc = spawn(EDGE_PATH, [
  '--headless=new',
  '--remote-debugging-port=9225',
  `--user-data-dir=${USER_DATA_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
]);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json/list');
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch (_) {}
    await sleep(400);
  }
  throw new Error('Could not connect to DevTools');
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
  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
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

const IMAGES_TO_TRANSCODE = [
  { src: 'assets/images/logo-rightaware.png', out: 'assets/images/logo-rightaware.webp', maxDim: 300, q: 0.85 },
  { src: 'assets/images/hero-citizens.jpg', out: 'assets/images/hero-citizens.webp', maxDim: 640, q: 0.72 },
  { src: 'assets/images/help-thinking-man.jpg', out: 'assets/images/help-thinking-man.webp', maxDim: 640, q: 0.72 },
  { src: 'assets/images/laws-scales-gavel.jpg', out: 'assets/images/laws-scales-gavel.webp', maxDim: 540, q: 0.72 },
  { src: 'assets/images/about-everyone-has-a-story.jpg', out: 'assets/images/about-everyone-has-a-story.webp', maxDim: 540, q: 0.72 },
  { src: 'assets/images/lawyers-professional-tablet.jpg', out: 'assets/images/lawyers-professional-tablet.webp', maxDim: 540, q: 0.72 },
  { src: 'assets/images/resources-lightbulb.jpg', out: 'assets/images/resources-lightbulb.webp', maxDim: 540, q: 0.72 },
  { src: 'assets/images/justice-lady.jpg', out: 'assets/images/justice-lady.webp', maxDim: 540, q: 0.72 },
  { src: 'assets/images/tenancy-keys-agreement.jpg', out: 'assets/images/tenancy-keys-agreement.webp', maxDim: 540, q: 0.75 }
];

async function main() {
  try {
    const wsUrl = await getWsUrl();
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    console.log('=== TRANSCODING 8 EXISTING IMAGES TO OPTIMIZED WEBP (<40KB) ===\n');

    for (const item of IMAGES_TO_TRANSCODE) {
      const srcUrl = `http://localhost:8080/${item.src}`;
      const originalBytes = fs.statSync(path.resolve(item.src)).size;
      let q = item.q;
      let maxDim = item.maxDim;
      let finalBuffer = null;
      let finalW = 0;
      let finalH = 0;

      for (let attempt = 0; attempt < 5; attempt++) {
        const evalCode = `(async () => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              let w = img.naturalWidth;
              let h = img.naturalHeight;
              const max = ${maxDim};
              if (w > max || h > max) {
                if (w > h) {
                  h = Math.round((h * max) / w);
                  w = max;
                } else {
                  w = Math.round((w * max) / h);
                  h = max;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              const dataUrl = canvas.toDataURL('image/webp', ${q});
              resolve({ dataUrl, w, h });
            };
            img.onerror = () => reject(new Error('Failed to load ' + ${JSON.stringify(srcUrl)}));
            img.src = ${JSON.stringify(srcUrl)};
          });
        })()`;

        const res = await client.evaluate(evalCode);
        const base64Data = res.dataUrl.replace(/^data:image\/webp;base64,/, '');
        const buf = Buffer.from(base64Data, 'base64');
        finalW = res.w;
        finalH = res.h;
        finalBuffer = buf;

        if (buf.length < 40000) {
          break;
        }
        // If > 40KB, reduce quality or dimension
        q = Math.max(0.5, q - 0.08);
        maxDim = Math.round(maxDim * 0.9);
      }

      const outPath = path.resolve(item.out);
      fs.writeFileSync(outPath, finalBuffer);
      const newBytes = finalBuffer.length;
      const reduction = (((originalBytes - newBytes) / originalBytes) * 100).toFixed(1);

      console.log(`✓ ${path.basename(item.src)} (${(originalBytes / 1024).toFixed(1)} KB) -> ${path.basename(item.out)} (${(newBytes / 1024).toFixed(1)} KB) [${finalW}x${finalH}] - saved ${reduction}%`);

      if (newBytes >= 40000) {
        throw new Error(`Asset ${item.out} exceeded 40KB budget: ${newBytes} bytes`);
      }
    }

    console.log('\nAll 8 images successfully transcoded strictly under 40KB budget!');
    client.close();
    edgeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Transcode failed:', err);
    try { edgeProc.kill(); } catch (_) {}
    process.exit(1);
  }
}

main();
