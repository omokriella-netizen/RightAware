import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = path.resolve('.');
['.env', '.env.local'].forEach(file => {
  const p = path.join(ROOT, file);
  if (fs.existsSync(p)) {
    fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
});
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Handle Dev Translation Warmup Mock
  if (pathname === '/functions/v1/warmup-translation-engine') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ ok: true, warmed: true }));
    return;
  }

  // Handle Dev Indigenous Speech Synthesis
  if (pathname === '/functions/v1/synthesize-indigenous-speech') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    await new Promise(resolve => req.on('end', resolve));
    let parsed = {};
    try { parsed = JSON.parse(body); } catch (_) {}
    const { text, language, voice_id } = parsed;
    console.log(`[TTS Local Dev] Synthesizing speech: lang=${language}, voice=${voice_id || 'default'}, text=${(text || '').slice(0, 60)}...`);

    // Valid lightweight silent MP3 audio frame for local testing
    const silentMp3Base64 = "//NAxAAAAAAAAAAAAFhpbmcAAAAPAAAAAgAAABwAAAwMDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTEAAA//NAxAgAANgEZcAAA8bM3dE1kMTEwLjAAAAAAAGY2WnAAQAAAAAgAAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=";

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      audio_url: `data:audio/mp3;base64,${silentMp3Base64}`,
      cached: false,
      dev_mock: true,
      language: language,
      voice: voice_id || 'default'
    }));
    return;
  }

  // Dispatch /api/* to api directory handlers
  if (pathname.startsWith('/api/')) {
    let apiRel = pathname.replace(/^\/api\//, '');
    if (!apiRel.endsWith('.js')) apiRel += '.js';
    const apiFile = path.join(ROOT, 'api', apiRel);
    if (fs.existsSync(apiFile)) {
      try {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        await new Promise(resolve => req.on('end', resolve));
        if (body && req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
          try { req.body = JSON.parse(body); } catch (_) { req.body = {}; }
        } else {
          req.body = body;
        }

        res.status = function(code) { this.statusCode = code; return this; };
        res.json = function(data) {
          this.setHeader('Content-Type', 'application/json; charset=utf-8');
          this.end(JSON.stringify(data));
          return this;
        };

        const handler = require(apiFile);
        await handler(req, res);
        return;
      } catch (apiErr) {
        console.error('API Error:', apiErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Internal API Server Error' }));
        return;
      }
    }
  }

  if (pathname === '/') pathname = '/index.html';

  let filePath = path.join(ROOT, pathname);

  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    }
  }

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      const offlinePage = path.join(ROOT, 'offline.html');
      if (fs.existsSync(offlinePage)) {
        res.end(fs.readFileSync(offlinePage));
      } else {
        res.end('<h1>404 Not Found</h1>');
      }
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function tryListen(port) {
  server.removeAllListeners('error');
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      tryListen(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    console.log(`RightAware server active at: http://localhost:${port}/`);
    console.log(`Resources page: http://localhost:${port}/resources.html`);
  });
}

tryListen(PORT);
