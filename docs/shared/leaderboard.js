// Tiny leaderboard client shared by the web games.
// Talks to server/leaderboard.js when available, otherwise keeps scores in localStorage.
(function () {
  'use strict';

  const cfg = window.OFFICE_CONFIG || {};
  const base = cfg.leaderboardUrl === undefined ? '' : cfg.leaderboardUrl;
  const LOCAL_KEY = 'office_lb_local_v1';

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch { return {}; }
  }
  function writeLocal(all) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
  }

  function sortRows(rows, order) {
    return rows.sort((a, b) => (order === 'asc' ? a.score - b.score : b.score - a.score));
  }

  function saveLocal(game, entry, order) {
    const all = readLocal();
    const rows = all[game] || [];
    const existing = rows.find(r => r.name === entry.name);
    const better = (a, b) => (order === 'asc' ? a < b : a > b);
    if (!existing) rows.push(entry);
    else if (better(entry.score, existing.score)) Object.assign(existing, entry);
    all[game] = sortRows(rows, order).slice(0, 50);
    writeLocal(all);
  }

  async function request(path, opts) {
    if (base === null) throw new Error('server disabled');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(base + path, { ...opts, signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  window.Leaderboard = {
    // order: 'desc' (higher is better) or 'asc' (lower is better, e.g. times)
    async top(game, order = 'desc', limit = 20) {
      try {
        const data = await request(`/api/scores?game=${encodeURIComponent(game)}&order=${order}&limit=${limit}`);
        return { source: 'server', rows: data.rows };
      } catch {
        const rows = sortRows((readLocal()[game] || []).slice(), order).slice(0, limit);
        return { source: 'local', rows };
      }
    },

    async submit(game, name, score, meta = '', order = 'desc') {
      const entry = { name: String(name).slice(0, 20), score, meta: String(meta).slice(0, 40), ts: Date.now() };
      saveLocal(game, entry, order);
      try {
        await request('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game, ...entry, order }),
        });
        return 'server';
      } catch {
        return 'local';
      }
    },
  };
})();
