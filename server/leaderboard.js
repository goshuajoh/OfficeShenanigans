#!/usr/bin/env node
// Zero-dependency server: serves ../web and a shared leaderboard API.
//
//   GET  /api/scores?game=tracker&order=desc&limit=20
//   POST /api/scores  {game, name, score, meta?, order?}
//
// Scores persist to DATA_FILE (default: server/data/scores.json).
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const WEB_ROOT = path.resolve(__dirname, '..', 'web');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'scores.json');
const MAX_PER_GAME = 200;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

let scores = {};
try { scores = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { scores = {}; }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFile(DATA_FILE, JSON.stringify(scores), err => err && console.error('save failed', err));
  }, 500);
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const sortRows = (rows, order) => rows.sort((a, b) => (order === 'asc' ? a.score - b.score : b.score - a.score));
const clean = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim();

function handleApi(req, res, url) {
  if (req.method === 'GET') {
    const game = url.searchParams.get('game') || '';
    const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
    const rows = sortRows((scores[game] || []).slice(), order).slice(0, limit);
    return send(res, 200, { game, rows });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 2000) req.destroy();
  });
  req.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch { return send(res, 400, { error: 'bad json' }); }
    const game = clean(data.game);
    const name = clean(data.name).slice(0, 20);
    const meta = clean(data.meta).slice(0, 40);
    const score = Number(data.score);
    const order = data.order === 'asc' ? 'asc' : 'desc';
    if (!/^[a-z0-9-]{1,40}$/.test(game) || !name || !Number.isFinite(score)) {
      return send(res, 400, { error: 'invalid entry' });
    }
    const rows = scores[game] || (scores[game] = []);
    const existing = rows.find(r => r.name.toLowerCase() === name.toLowerCase());
    const better = order === 'asc' ? score < (existing && existing.score) : score > (existing && existing.score);
    if (!existing) rows.push({ name, score, meta, ts: Date.now() });
    else if (better) Object.assign(existing, { score, meta, ts: Date.now() });
    scores[game] = sortRows(rows, order).slice(0, MAX_PER_GAME);
    persist();
    send(res, 200, { ok: true });
  });
}

function handleStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(WEB_ROOT, '.' + rel);
  if (!file.startsWith(WEB_ROOT + path.sep)) return send(res, 403, 'forbidden', 'text/plain');
  fs.stat(file, (err, stat) => {
    if (!err && stat.isDirectory()) {
      res.writeHead(301, { Location: url.pathname + '/' });
      return res.end();
    }
    if (err) return send(res, 404, 'not found', 'text/plain');
    fs.readFile(file, (e, buf) => {
      if (e) return send(res, 500, 'error', 'text/plain');
      send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream');
    });
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (url.pathname === '/api/scores') return handleApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed', 'text/plain');
  handleStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`Office games running at http://localhost:${PORT}/`);
});
