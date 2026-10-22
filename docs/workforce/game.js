// Atlas Workforce UI. The rules live in engine.js; this file draws them and turns taps into engine calls.
(() => {
  'use strict';

  const D = window.WF_DATA;
  const A = window.WF_ART;
  const SAVE_KEY = 'atlas_workforce_v2';
  const OLD_KEY = 'atlas_workforce_v1';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const now = () => Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (!Number.isFinite(n)) return '∞';
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.round(n).toString();
    const tier = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3));
    const v = n / Math.pow(1000, tier);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v)) + SUFFIX[tier];
  }
  const money = n => '$' + fmt(n);
  function fmtDur(sec) {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.ceil(sec / 60) + ' min';
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  function ago(t) {
    const s = (now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  // ================================================================ engine & save

  const pendingEvents = [];
  const E = window.WF_ENGINE.create(D, { emit: (type, data) => pendingEvents.push({ type, data }) });
  let S = null;

  function loadSave() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_KEY); } catch { /* storage blocked */ }
    try { S = E.load(raw ? JSON.parse(raw) : null); } catch { S = E.fresh(); }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(E.state)); } catch { /* storage blocked */ }
  }

  // ================================================================ people

  function who(id) {
    if (E.PEOPLE[id]) {
      const p = E.PEOPLE[id];
      return { name: p.name, first: p.name.split(' ')[0], title: S.staff[id] ? jobTitle(id) : D.RARITY[p.r].name, look: p.look, role: p.role };
    }
    if (D.CAST[id]) return { name: D.CAST[id].name, first: D.CAST[id].name.split(' ')[0], title: D.CAST[id].title, look: D.CAST[id].look };
    if (id && id.startsWith('rival:')) {
      const r = D.RIVALS.find(x => x.id === id.slice(6));
      if (r) return { name: r.name, first: r.name.split(' ')[0], title: `Manager · ${r.dept}`, look: r.look };
    }
    return { name: 'Atlas', first: 'Atlas', title: '', look: D.CAST.bot.look };
  }
  function jobTitle(id) {
    const p = E.PEOPLE[id], st = S.staff[id];
    let suffix = '';
    for (const [l, t] of D.TITLES) if (st && st.lvl >= l) suffix = t;
    const base = p.r === 0 ? `${D.ROLES[p.role].name} Intern` : p.r === 1 ? D.ROLE_NOUN[p.role] : `${D.RARITY[p.r].name} ${D.ROLE_NOUN[p.role]}`;
    return suffix ? `${base} ${suffix}` : base;
  }
  const av = (id, cls = '') => `<span class="av ${cls}">${A.avatar(who(id).look)}</span>`;
  const stack = (ids, cls = 'xs') => `<span class="stack">${ids.map(id => av(id, cls)).join('')}</span>`;
  const band = r => `<span class="band r${r}">${D.RARITY[r].key} ${D.RARITY[r].name}</span>`;
  const starsHtml = n => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
  const heartsHtml = id => { const h = E.hearts(id); return `<span class="hearts">${'♥'.repeat(h)}<span class="off">${'♥'.repeat(5 - h)}</span></span>`; };
  const roleChip = r => `<span class="chip role" style="color:${D.ROLES[r].color}">${A.roleIcon(r)}${D.ROLES[r].short}</span>`;
  const moodWord = m => (m >= 80 ? 'Thriving' : m >= 60 ? 'Happy' : m >= 40 ? 'Okay' : m >= 25 ? 'Stressed' : 'Burnt out');
  function statusOf(id) {
    const t = now();
    if (E.resting(id)) return { cls: 'rest', text: `Recharging · ${fmtDur((S.staff[id].restUntil - t) / 1000)}` };
    const w = S.ws.find(x => x && x.team.includes(id));
    if (w) return { cls: 'busy', text: t >= w.end ? `Done: ${w.offer.name}` : `On ${w.offer.name}` };
    return { cls: '', text: 'Available' };
  }
  const sizeLabel = o => `${D.SIZES[o.size].name} · ${fmtDur(o.dur)}`;

  // ================================================================ navigation

  const ICON = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    projects: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
    inbox: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.6.3 4.4 2 5 4.9"/>',
    hiring: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M19 7.5v6M16 10.5h6"/>',
    office: '<path d="M4 21V5l8-2v18M12 8h8v13M2 21h20M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2"/>',
    league: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
    career: '<path d="M4 20h16M7 17v-5M12 17V8M17 17V5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    report: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    install: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/>',
  };
  const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const NAV = [
    ['WORK', [['home', 'Home'], ['projects', 'Projects'], ['inbox', 'Inbox']]],
    ['PEOPLE', [['team', 'Team'], ['hiring', 'Hiring', 'hiring']]],
    ['COMPANY', [['office', 'Office'], ['league', 'League', 'league'], ['career', 'Career']]],
    ['', [['settings', 'Settings']]],
  ];
  const LABEL = Object.fromEntries(NAV.flatMap(([, items]) => items.map(([v, l]) => [v, l])));
  const GATE = Object.fromEntries(NAV.flatMap(([, items]) => items.filter(x => x[2]).map(([v, , g]) => [v, g])));
  const TABS = ['home', 'projects', 'inbox', 'team'];
  const MORE = ['hiring', 'office', 'league', 'career', 'settings'];
  const phoneQuery = window.matchMedia('(max-width: 700px)');
  const compact = () => phoneQuery.matches;
  let view = 'home';

  const gateLevel = g => (D.UNLOCKS.find(u => u.id === g) || {}).career;
  const isLocked = v => GATE[v] && !E.unlocked(GATE[v]);
  const pendingCount = () => S.inbox.filter(m => m.choices && !m.done).length;
  function navBadge(v) {
    if (v === 'inbox') return pendingCount();
    if (v === 'projects') return E.ready().length;
    if (v === 'hiring') return S.referrals >= 1 ? S.referrals : 0;
    return 0;
  }
  const isNew = v => GATE[v] && E.unlocked(GATE[v]) && !S.seen[v];

  function renderNav() {
    $('#nav').innerHTML = NAV.map(([sec, items]) => (sec ? `<div class="nav-section">${sec}</div>` : '<div class="nav-section">&nbsp;</div>') + items.map(([v, label]) => {
      if (isLocked(v)) return `<div class="nav locked">${icon(v)}${label}<span class="lock">Career ${gateLevel(GATE[v])}</span></div>`;
      const b = navBadge(v);
      return `<button class="nav ${v === view ? 'active' : ''}" data-act="nav" data-view="${v}" data-coach="nav-${v}">${icon(v)}${label}${isNew(v) ? '<span class="new">New</span>' : b ? `<span class="count">${b > 99 ? '99+' : b}</span>` : ''}</button>`;
    }).join('')).join('');
    const inMore = !TABS.includes(view);
    const moreAlert = MORE.some(v => isNew(v)) || (E.unlocked('hiring') && S.referrals >= 5);
    $('#tabbar').innerHTML = TABS.map(v => {
      const b = navBadge(v);
      return `<button class="tab-btn ${v === view ? 'active' : ''}" data-act="nav" data-view="${v}" data-coach="tab-${v}">${icon(v)}<span>${LABEL[v]}</span>${b ? `<span class="count">${b > 99 ? '99+' : b}</span>` : ''}</button>`;
    }).join('') + `<button class="tab-btn ${inMore ? 'active' : ''}" data-act="more" data-coach="tab-more">${icon('more')}<span>More</span>${moreAlert ? '<span class="pip"></span>' : ''}</button>`;
    $('#viewTitle').textContent = LABEL[view];
    if (!$('#sheet').classList.contains('hidden')) renderSheet();
  }
  function renderSheet() {
    $('#sheetBox').innerHTML = '<div class="sheet-handle"></div>' + MORE.map(v => {
      if (isLocked(v)) return `<div class="sheet-item locked">${icon(v)}<span>${LABEL[v]}</span><span class="right">Career ${gateLevel(GATE[v])}</span></div>`;
      const b = navBadge(v);
      return `<button class="sheet-item ${v === view ? 'active' : ''}" data-act="nav" data-view="${v}" data-coach="sheet-${v}">${icon(v)}<span>${LABEL[v]}</span>${isNew(v) ? '<span class="right new">New</span>' : b ? `<span class="right count">${b}</span>` : ''}</button>`;
    }).join('') + '<div class="sheet-sep"></div>'
      + (isStandalone() ? '' : `<button class="sheet-item" data-act="install">${icon('install')}<span>Install on this device</span></button>`)
      + `<button class="sheet-item" data-act="decoy">${icon('report')}<span>Report view</span><span class="right muted">hides the game</span></button>`;
  }
  const openSheet = () => { renderSheet(); $('#sheet').classList.remove('hidden'); updateCoach(); };
  const closeSheet = () => $('#sheet').classList.add('hidden');

  function go(v) {
    if (isLocked(v)) return toast(`${LABEL[v]} unlocks at career level ${gateLevel(GATE[v])}`);
    view = v;
    S.seen[v] = true;
    closeSheet();
    if (!$('#overlay').classList.contains('hidden')) closeDialog();
    if (v === 'settings') refreshPacked();
    renderNav();
    renderView(true);
    window.scrollTo(0, 0);
  }

  // ================================================================ shared pieces

  function bestOffer() {
    let best = null, bestV = -1;
    for (const o of S.offers) {
      const team = E.recommend(o);
      if (!team) continue;
      const f = E.forecast(o, team);
      const v = f.p4 * 2 + (o.tut ? 10 : 0) + estimate(o, f) / Math.max(1, o.dur) * 0.0001;
      if (v > bestV) { bestV = v; best = o; }
    }
    return best;
  }
  const estimate = (o, f) => E.cashFor(o.tier, o.size, clamp(Math.round(f.mean), 1, 5)) * Math.pow(o.m || 1, 0.92) * (o.vip ? 1.5 : 1);

  function wsItem(w, i) {
    if (!w) {
      const rec = bestOffer();
      return `<div class="ws free"><div class="ws-ico">+</div><div class="grow"><b>Free workstream</b>
        <div class="muted small">${rec ? `Suggested: ${esc(rec.name)} for ${esc(rec.client)} · ${fmtDur(rec.dur)}` : 'Nobody is free right now'}</div></div>
        ${rec ? `<button class="btn primary" data-act="start" data-offer="${rec.id}" data-coach="${rec.tut ? 'offer-tut' : 'offer-any'}">Start</button>` : ''}
        <button class="btn ghost" data-act="nav" data-view="projects">Browse</button></div>`;
    }
    const done = now() >= w.end;
    return `<div class="ws ${done ? 'done' : ''}" ${i === 0 ? 'data-coach="ws0"' : ''}>
      <span class="logo">${A.logo(w.offer.client)}</span>
      <div class="grow"><div class="ws-title"><b>${esc(w.offer.name)}</b> <span class="muted small">· ${esc(w.offer.client)}</span></div>
        <div class="ws-meta">${stack(w.team)}<span class="muted small">${sizeLabel(w.offer)}</span>${w.offer.vip ? '<span class="chip vip">VIP</span>' : ''}</div>
        ${done ? '<div class="small good">Delivered. Waiting for your sign-off.</div>' : `<div class="bar"><div class="fill" data-progress="${i}" style="width:${clamp((now() - w.start) / (w.end - w.start), 0, 1) * 100}%"></div></div><div class="muted small" data-eta="${w.end}"></div>`}
      </div>
      ${done ? `<button class="btn primary glow" data-act="signoff" data-slot="${i}" data-coach="signoff">Sign off</button>` : ''}
    </div>`;
  }
  const wsList = () => `<div class="ws-list">${Array.from({ length: E.wsCount() }, (_, i) => wsItem(S.ws[i], i)).join('')}</div>`;

  function floorModel() {
    const zones = {};
    for (const [z, info] of Object.entries(D.ZONES)) zones[z] = S.funding >= info.funding ? null : `Opens at ${D.FUNDING[info.funding].name}`;
    return { lv: S.office, funding: S.funding, zones, desks: Math.min(A.DESK_COUNT, 4 + 2 * E.lvl('desks')) };
  }
  let floorCache = { key: '', svg: '' };
  function floorHtml() {
    const m = floorModel();
    const key = JSON.stringify(m);
    if (key !== floorCache.key) floorCache = { key, svg: A.floor(m) };
    return `<div class="floor" data-key="${hashStr(key)}"><div class="floor-bg">${floorCache.svg}</div><div class="floor-people" data-floor></div></div>`;
  }
  const hashStr = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function personSpot(id, idx, desks) {
    const t = now();
    const st = S.staff[id];
    const phase = (hashStr(id) + Math.floor(t / (7 * 60e3))) % 10;
    const pending = S.inbox.some(m => m.from === id && m.choices && !m.done);
    const desk = idx < desks ? A.spot('desk', idx) : null;
    if (E.resting(id)) return { p: A.spot(E.zoneOpen('lounge') ? 'lounge' : 'coffee', idx), b: '💤' };
    const w = S.ws.find(x => x && x.team.includes(id));
    if (w) {
      if (t >= w.end) return { p: desk || A.spot('coffee', idx), b: '✅' };
      if (w.team.length > 1 && E.lvl('rooms') > 0 && phase < 3) return { p: A.spot('meeting', (S.ws.indexOf(w) % E.lvl('rooms')) * 4 + w.team.indexOf(id)), b: '🗣️' };
      return { p: desk || A.spot('coffee', idx), b: pending ? '💬' : '💻' };
    }
    if (pending) return { p: desk || A.spot('coffee', idx), b: '💬' };
    if (!desk || phase < 3) return { p: A.spot('coffee', idx), b: '☕' };
    return { p: desk, b: st.mood < 35 ? '☁️' : '' };
  }
  function updateFloors() {
    const roots = $$('[data-floor]');
    if (!roots.length) return;
    const desks = floorModel().desks;
    const ids = E.owned();
    for (const root of roots) {
      for (const el of [...root.children]) if (!S.staff[el.dataset.id]) el.remove();
      ids.forEach((id, idx) => {
        let el = root.querySelector(`[data-id="${id}"]`);
        if (!el) {
          el = document.createElement('button');
          el.className = 'fp-person';
          el.dataset.act = 'profile';
          el.dataset.id = id;
          el.title = who(id).name;
          el.innerHTML = `${av(id)}<span class="fp-bubble"></span>`;
          root.appendChild(el);
        }
        const { p, b } = personSpot(id, idx, desks);
        el.style.left = p.x + '%';
        el.style.top = p.y + '%';
        el.querySelector('.fp-bubble').textContent = b;
      });
    }
  }

  function commitChip() {
    if (!E.unlocked('commit') || !S.commit) return '';
    const c = S.commit;
    if (c.tier === null) return `<button class="commit" data-act="nav" data-view="inbox">🎯 <b>Set today's commitment</b></button>`;
    const pips = Array.from({ length: Math.min(c.target, 24) }, (_, i) => `<i class="${i < c.progress ? 'on' : ''}"></i>`).join('');
    return `<div class="commit ${c.paid ? 'done' : ''}">🎯 <b>${E.COMMIT_NAMES[c.tier]}</b><span class="pips">${pips}</span><span>${Math.min(c.progress, c.target)}/${c.target}${c.paid ? ' ✓' : ''}</span></div>`;
  }

  // ================================================================ views

  const VIEWS = {};

  function greeting() {
    const h = new Date().getHours();
    return `Good ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}${S.name ? ', ' + esc(S.name) : ''}`;
  }
  const NEXT_ICON = { signoff: '✅', inbox: '💬', quickstart: '▶️', projects: '📁', office: '🏢', hiring: '🤝', home: '⏳' };
  function nextCard() {
    const step = E.nextStep();
    let btn = '';
    if (step.action === 'signoff') btn = `<button class="btn primary" data-act="signoffAll" data-coach="next">Sign off${step.count > 1 ? ` all (${step.count})` : ''}</button>`;
    else if (step.action === 'quickstart') btn = `<button class="btn primary" data-act="start" data-offer="${step.offer}" data-coach="next">Start a project</button>`;
    else if (step.action === 'inbox') btn = '<button class="btn primary" data-act="nav" data-view="inbox" data-coach="next">Open inbox</button>';
    else if (step.action === 'projects') btn = '<button class="btn primary" data-act="nav" data-view="projects" data-coach="next">Go to projects</button>';
    else if (step.action === 'office') btn = '<button class="btn primary" data-act="nav" data-view="office" data-coach="next">Open the office</button>';
    else if (step.action === 'hiring') btn = '<button class="btn primary" data-act="nav" data-view="hiring" data-coach="next">Interview</button>';
    return `<div class="card next"><div class="next-ico">${NEXT_ICON[step.action] || '•'}</div><div class="grow"><div class="muted small">Next step</div><b>${esc(step.text)}</b>
      ${step.at ? `<div class="muted small" data-eta="${step.at}"></div>` : ''}</div>${btn}</div>`;
  }
  function installCard() {
    if (!compact() || isStandalone() || S.settings.installHint === false || S.tut !== -1) return '';
    return `<div class="card next install"><div class="next-ico">📲</div><div class="grow"><b>Install Workforce on this phone</b><div class="muted small">Full-screen from your home screen, works offline.</div></div>
      <button class="btn primary" data-act="install">Install</button><button class="btn" data-act="dismissInstall">Not now</button></div>`;
  }
  function inboxPreview() {
    const items = S.inbox.filter(m => m.choices && !m.done).slice(0, 3);
    const list = items.length ? items : S.inbox.slice(0, 3);
    if (!list.length) return '<p class="muted small">Quiet for now. Your team will message you when they need you.</p>';
    return `<div class="msgs">${list.map(m => msgCard(m, true)).join('')}</div>`;
  }

  VIEWS.home = () => `
    <div class="page-head"><div><div class="muted small">${greeting()}</div><h1>Home</h1></div>${commitChip()}</div>
    ${nextCard()}
    ${installCard()}
    <div class="home-grid">
      <div class="card home-floor"><div class="card-title">Floor plan <span class="muted small">· ${D.FUNDING[S.funding].name}</span><span class="spacer"></span><button class="btn sm ghost" data-act="nav" data-view="office">Office</button></div>${floorHtml()}</div>
      <div class="home-side">
        <div class="card"><div class="card-title">Projects in flight<span class="spacer"></span><button class="btn sm ghost" data-act="nav" data-view="projects">All offers</button></div>${wsList()}</div>
        <div class="card"><div class="card-title">Inbox ${pendingCount() ? `<span class="count">${pendingCount()}</span>` : ''}<span class="spacer"></span><button class="btn sm ghost" data-act="nav" data-view="inbox">Open</button></div>${inboxPreview()}</div>
      </div>
    </div>
    <div class="card"><div class="card-title">Recent</div><ul class="feed">${S.log.slice(0, 6).map(l => `<li class="${l.kind}"><span class="t">${ago(l.t)}</span><span>${esc(l.text)}</span></li>`).join('') || '<li class="muted">Nothing yet.</li>'}</ul></div>`;

  function offerCard(o) {
    const team = E.recommend(o);
    const f = team && E.forecast(o, team);
    const free = E.freeSlot() >= 0;
    const coach = o.tut ? 'offer-tut' : 'offer-any';
    return `<div class="offer ${o.vip ? 'vip' : ''} ${o.tut ? 'tut' : ''}">
      <div class="offer-top"><span class="logo">${A.logo(o.client)}</span><div class="grow"><b>${esc(o.name)}</b><div class="muted small">${esc(o.client)}</div></div>
        ${o.vip ? '<span class="chip vip">VIP · pays 1.5×</span>' : o.stretch ? '<span class="chip stretch">Stretch</span>' : ''}</div>
      <div class="offer-facts"><span class="chip">⏱ ${fmtDur(o.dur)}</span><span class="chip">👥 ${D.SIZES[o.size].staff} · ${D.SIZES[o.size].name}</span>${o.needs.map(roleChip).join('')}</div>
      ${team ? `<div class="forecast"><div class="fc-bar"><div style="width:${Math.round(f.p4 * 100)}%"></div></div><span>${Math.round(f.p4 * 100)}% chance of 4★+</span></div>
        <div class="offer-foot">${stack(team, 'sm')}<span class="est">≈ ${money(estimate(o, f))}</span>
          <button class="btn primary" data-act="start" data-offer="${o.id}" data-coach="${coach}" ${free ? '' : 'disabled'}>${free ? 'Start' : 'No free slot'}</button></div>`
        : `<div class="muted small">Needs ${D.SIZES[o.size].staff} available ${D.SIZES[o.size].staff > 1 ? 'people' : 'person'}.</div>`}
    </div>`;
  }
  VIEWS.projects = () => {
    const busy = S.ws.filter(Boolean).length;
    const cd = S.refreshAt - now();
    return `
    <div class="page-head"><div><div class="muted small">${busy}/${E.wsCount()} workstreams busy${E.wsCount() < 5 ? ' · more with meeting rooms' : ''}</div><h1>Projects</h1></div>
      <div class="actions"><button class="btn" data-act="refresh" ${cd > 0 ? 'disabled' : ''}>${cd > 0 ? `New offers in ${fmtDur(cd / 1000)}` : 'Refresh offers'}</button></div></div>
    <div class="card"><div class="card-title">In flight</div>${wsList()}</div>
    <div class="card"><div class="card-title">Offers <span class="muted small">· sized to your team</span></div><div class="offers">${S.offers.map(offerCard).join('')}</div>
      <p class="muted small">Forecasts use your best available people. Matching the roles a client needs helps a lot. Longer jobs pay a little less per minute but keep working while you're in meetings.</p></div>`;
  };

  function msgCard(m, mini) {
    const w = who(m.from);
    const pending = m.choices && !m.done;
    let body = '';
    if (pending) {
      body = `<div class="choices">${m.choices.map((label, i) => {
        const cost = E.choiceCost(m, i);
        let sub = cost ? ` · ${money(cost)}` : '';
        if (m.kind === 'commit') { const r = E.commitReward(i); sub = ` · +${r.refs} referral${r.refs > 1 ? 's' : ''}`; }
        return `<button class="btn ${i === 0 ? 'primary' : ''}" data-act="answer" data-msg="${m.id}" data-i="${i}" ${cost > S.cash ? 'disabled' : ''}>${esc(label)}${sub ? `<span class="sub">${esc(sub.slice(3))}</span>` : ''}</button>`;
      }).join('')}</div>`;
    } else if (m.done && m.choices) {
      if (m.done.expired) body = '<div class="reply muted small">No reply.</div>';
      else body = `<div class="reply"><div class="you">You: ${esc(m.choices[m.done.idx] || '')}</div>${m.done.reply && !mini ? `<div class="them">${esc(m.done.reply)}</div>` : ''}</div>`;
    }
    if (m.reactions && !m.done) body = `<div class="reacts">${['👍', '😂', '❤️'].map(e => `<button class="btn sm" data-act="react" data-msg="${m.id}" data-e="${e}">${e}</button>`).join('')}</div>`;
    else if (m.reactions && m.done && !mini) body = `<div class="reply muted small">You reacted ${m.done.reaction}</div>`;
    let cta = '';
    if (m.unlock && !mini) {
      const target = { hiring: 'hiring', league: 'league', commit: 'inbox', gear: 'team' }[m.unlock];
      if (target && target !== 'inbox') cta = `<div class="choices"><button class="btn" data-act="nav" data-view="${target}">Open ${LABEL[target]}</button></div>`;
    }
    const cls = [pending ? 'pending' : '', m.read ? '' : 'unread', m.kind === 'outcome' ? (m.good ? 'outcome-good' : 'outcome-bad') : '', m.kind === 'funding' ? 'funding' : ''].join(' ');
    const extra = m.kind === 'funding' ? `<div class="small good" style="margin-top:6px">+${money(m.amount)} funding · revenue ×1.5 for good · new office space</div>` : '';
    return `<div class="msg ${cls}">${av(m.from, 'sm')}<div class="grow"><div class="msg-head"><span class="msg-name">${esc(w.name)}</span><span class="muted small">${esc(w.title)} · ${ago(m.at)}</span></div>
      <div class="msg-text">${esc(m.text)}</div>${extra}${body}${cta}</div></div>`;
  }
  VIEWS.inbox = () => {
    const pend = S.inbox.filter(m => m.choices && !m.done);
    const rest = S.inbox.filter(m => !(m.choices && !m.done)).slice(0, 40);
    setTimeout(() => { for (const m of S.inbox) m.read = true; }, 1500);
    return `<div class="page-head"><div><div class="muted small">${pend.length ? `${pend.length} waiting for you` : 'All answered'} · decisions expire after a few hours</div><h1>Inbox</h1></div></div>
      <div class="msgs">${pend.map(m => msgCard(m)).join('')}${rest.map(m => msgCard(m)).join('') || '<p class="muted">Nothing here yet.</p>'}</div>`;
  };

  function personCard(id) {
    const st = S.staff[id], p = E.PEOPLE[id];
    const s = statusOf(id);
    const need = E.xpNeed(st.lvl);
    return `<button class="pcard" data-act="profile" data-id="${id}">${av(id, 'lg')}<div class="grow">
      <b>${esc(p.name)}</b><div class="muted small">${esc(jobTitle(id))}</div>
      <div class="pc-row">${band(p.r)}${st.stars ? starsHtml(st.stars) : ''}</div>
      <div class="pc-row"><span class="nowrap">Lvl ${st.lvl}</span><div class="bar thin"><div class="fill" style="width:${100 * st.xp / need}%"></div></div></div>
      <div class="pc-row">${A.moodFace(st.mood)}<span>${moodWord(st.mood)}</span>${heartsHtml(id)}</div>
      <div class="pc-row"><span class="status-tag ${s.cls}">${esc(s.text)}</span></div></div></button>`;
  }
  VIEWS.team = () => {
    const ids = E.owned().sort((a, b) => E.skill(b) - E.skill(a));
    return `<div class="page-head"><div><div class="muted small">${ids.length} ${ids.length === 1 ? 'person' : 'people'} · tap someone to see their profile</div><h1>Team</h1></div>
      ${E.unlocked('hiring') ? `<div class="actions"><button class="btn primary" data-act="nav" data-view="hiring">Hire${S.referrals ? ` (${S.referrals} referral${S.referrals > 1 ? 's' : ''})` : ''}</button></div>` : ''}</div>
      <div class="people">${ids.map(personCard).join('')}</div>
      <p class="muted small">People level up by delivering projects. Happy, rested people with matching skills earn better reviews. Coffee chats build bonds, and bonds unlock their stories.</p>`;
  };

  VIEWS.hiring = () => {
    const w = D.RARITY.map((r, i) => r.weight * (i >= 2 ? 1 + 0.15 * E.lvl('recruit') : 1));
    const tw = w.reduce((a, b) => a + b, 0);
    const dir = D.PEOPLE.map(p => {
      const st = S.staff[p.id];
      return `<div class="dir-p ${st ? '' : 'no'}"><span class="av lg">${A.avatar(p.look, { mono: !st })}</span><b>${st ? esc(p.name) : '???'}</b>${band(p.r)}<span class="muted">${st ? (st.stars ? starsHtml(st.stars) : 'Lvl ' + st.lvl) : esc(D.ROLES[p.role].name)}</span></div>`;
    }).join('');
    return `<div class="page-head"><div><div class="muted small">${S.referrals} referral${S.referrals === 1 ? '' : 's'} · each one is an interview</div><h1>Hiring</h1></div>
      <div class="actions"><button class="btn" data-act="interview" data-n="1" ${S.referrals < 1 ? 'disabled' : ''}>Interview 1</button>
      <button class="btn primary" data-act="interview" data-n="5" ${S.referrals < 5 ? 'disabled' : ''}>Interview 5</button></div></div>
      <div class="grid2">
        <div class="card"><div class="card-title">How hiring works</div><p class="small" style="margin-top:0">Every interview brings in a candidate. New faces join the team. Someone you already have gets <b>promoted</b> instead: each promotion star is +25% skill.</p>
          <p class="muted small">Referrals come from your daily commitment, the weekly league, five-star reviews and the occasional decision.</p></div>
        <div class="card"><div class="card-title">Odds</div><table class="table"><tbody>${D.RARITY.map((r, i) => `<tr><td>${band(i)}</td><td class="num">${(100 * w[i] / tw).toFixed(1)}%</td></tr>`).join('')}</tbody></table>
          <p class="muted small">Staff or better guaranteed within <b>${25 - S.pity}</b> interviews; Principal within <b>${80 - S.pityL}</b>.</p></div>
      </div>
      <div class="card"><div class="card-title">Directory <span class="muted small">${E.owned().length}/${D.PEOPLE.length} hired</span></div><div class="dir">${dir}</div></div>`;
  };

  VIEWS.office = () => {
    const builds = S.builds.map(b => {
      const o = E.OFFICE[b.id];
      return `<div class="ws"><div class="ws-ico">🏗️</div><div class="grow"><b>${esc(o.name)}</b> → level ${E.lvl(b.id) + 1}
        <div class="bar"><div class="fill" style="width:${clamp((now() - b.start) / (b.end - b.start), 0, 1) * 100}%"></div></div><div class="muted small" data-eta="${b.end}"></div></div></div>`;
    }).join('');
    const zones = Object.entries(D.ZONES);
    const upg = zones.map(([zid, z]) => {
      const items = D.OFFICE.filter(o => o.zone === zid);
      return items.map(o => {
        const l = E.lvl(o.id);
        const block = E.buildBlock(o.id);
        const maxed = l >= o.max;
        const zoneLocked = !E.zoneOpen(zid);
        const lname = o.levels && l ? o.levels[l - 1] : l ? `Level ${l}` : 'Not built';
        const dots = o.max <= 10 ? `<div class="dots">${Array.from({ length: o.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>` : `<div class="muted small">Level ${l}/${o.max}</div>`;
        return `<div class="upg ${maxed ? 'maxed' : ''} ${zoneLocked ? 'locked' : ''}"><div class="card-title" style="margin:0">${esc(o.name)}<span class="spacer"></span><span class="muted small">${esc(z.name)}</span></div>
          ${dots}<div class="small">${esc(lname)}${l ? ` · ${esc(o.fx(l))}` : ''}</div>
          ${maxed ? '<div class="small good">✓ Fully upgraded</div>' : `<div class="muted small">Next: ${esc(o.fx(l + 1))}</div>
          <div class="row" style="margin:0"><button class="btn ${block ? '' : 'primary'}" data-act="build" data-id="${o.id}" ${block ? 'disabled' : ''} data-coach="build-${o.id}">${zoneLocked ? esc(block) : `Build · ${money(E.buildCost(o.id))}`}</button>
            <span class="muted small">${zoneLocked ? '' : block && block !== 'Not enough budget' ? esc(block) : '⏱ ' + fmtDur(E.buildTime(o.id))}</span></div>`}</div>`;
      }).join('');
    }).join('');
    return `<div class="page-head"><div><div class="muted small">${money(S.cash)} budget · ${E.crews()} build crew${E.crews() > 1 ? 's' : ''}</div><h1>Office</h1></div></div>
      <div class="card">${floorHtml()}</div>
      ${builds ? `<div class="card"><div class="card-title">Under construction</div><div class="builds">${builds}</div></div>` : ''}
      <div class="upgrades">${upg}</div>`;
  };

  VIEWS.league = () => {
    if (!S.league) return '<p class="muted">The league starts soon.</p>';
    const rows = E.standings();
    const daysLeft = (S.league.end - now()) / 86400e3;
    const n = rows.length;
    return `<div class="page-head"><div><div class="muted small">Ends in ${daysLeft >= 1 ? Math.floor(daysLeft) + 'd ' : ''}${fmtDur(((S.league.end - now()) % 86400e3) / 1000)}</div><h1>League</h1></div></div>
      <div class="card"><div class="league-head"><div class="league-badge">🏆</div><div><div class="muted small">This week</div><b style="font-size:18px">${D.LEAGUES[S.leagueTier]} league</b>
        <div class="muted small">Earn client stars to climb. Top 2 move up, last place moves down.</div></div></div></div>
      <div class="card"><div class="table-wrap"><table class="table rank"><thead><tr><th>#</th><th>Manager</th><th class="num">Stars</th><th>Team</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr class="${r.you ? 'me' : ''} ${i < 2 && S.leagueTier < D.LEAGUES.length - 1 ? 'up' : ''} ${i === n - 1 && S.leagueTier > 0 ? 'down' : ''}">
          <td>${i + 1}</td><td><span class="nowrap">${r.you ? `<span class="av sm" style="margin-right:8px">${A.avatar(myLook())}</span>` : av('rival:' + r.id, 'sm').replace('class="av sm"', 'class="av sm" style="margin-right:8px"')}${esc(r.name)}</span></td>
          <td class="num">${r.points}★</td><td class="muted">${esc(r.dept)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted small">Finishing rewards: ${D.LEAGUE_REWARDS.slice(0, 4).map((x, i) => `#${i + 1} ${x}`).join(' · ')} referrals.</p></div>`;
  };

  VIEWS.career = () => {
    const c = S.career;
    const need = E.repNeed(c.lvl);
    let title = D.CAREER_TITLES[0][1];
    for (const [l, t] of D.CAREER_TITLES) if (c.lvl >= l) title = t;
    const next = D.FUNDING[S.funding + 1];
    const rounds = D.FUNDING.slice(1).map((f, i) => {
      const k = i + 1;
      const state = S.funding >= k ? 'done' : S.funding + 1 === k ? 'next' : '';
      return `<div class="round ${state}"><span class="dotc">${S.funding >= k ? '✓' : ''}</span><b>${esc(f.name)}</b><span class="muted small">${money(f.at)} lifetime revenue</span></div>`;
    }).join('');
    const ach = E.ACH.map(a => `<div class="badgec ${S.achievements[a.id] ? 'yes' : 'no'}"><b>${esc(a.name)}</b><span class="muted">${esc(a.desc)}</span></div>`).join('');
    return `<div class="page-head"><div><div class="muted small">Career level ${c.lvl}</div><h1>Career</h1></div></div>
      <div class="grid2">
        <div class="card"><div class="card-title">${esc(title)}</div><div class="bar"><div class="fill gold" style="width:${100 * c.rep / need}%"></div></div>
          <div class="muted small" style="margin-top:6px">${fmt(c.rep)} / ${fmt(need)} reputation to level ${c.lvl + 1}. Reputation comes from every delivery; bigger, better-rated projects give more.</div>
          <div class="stat-grid"><div class="stat"><label>Deliveries</label><b>${fmt(S.stats.deliveries)}</b></div><div class="stat"><label>Average rating</label><b>${S.stats.deliveries ? (S.stats.stars / S.stats.deliveries).toFixed(2) : '–'}★</b></div><div class="stat"><label>Five-star reviews</label><b>${fmt(S.stats.five)}</b></div></div></div>
        <div class="card"><div class="card-title">Company</div>
          ${next ? `<div class="small">Next: <b>${esc(next.name)}</b> at ${money(next.at)} lifetime revenue</div><div class="bar" style="margin:8px 0"><div class="fill green" style="width:${clamp(100 * S.lifetime / next.at, 0, 100)}%"></div></div>` : '<div class="small good">Every milestone reached. Legendary.</div>'}
          <div class="rounds">${rounds}</div><p class="muted small">Each round adds a funding injection, revenue ×1.5 for good, and opens more office space.</p></div>
      </div>
      <div class="card"><div class="card-title">Badges <span class="muted small">${Object.keys(S.achievements).length}/${E.ACH.length} · each +1% team skill</span></div><div class="badges">${ach}</div></div>`;
  };

  VIEWS.settings = () => `
    <div class="page-head"><div><h1>Settings</h1></div></div>
    <div class="card">
      <label class="field">Your name<input id="setName" maxlength="20" value="${esc(S.name)}" placeholder="Your name" autocomplete="off"></label>
      <div class="row"><span class="toggle ${S.settings.stealth ? 'on' : ''}" data-act="setting" data-key="stealth"><span class="sw"></span>Stealth mode (no animations or colour flourishes)</span></div>
      <div class="row"><span class="toggle ${S.settings.badge ? 'on' : ''}" data-act="setting" data-key="badge"><span class="sw"></span>Show a task count in the tab title and on the app icon</span></div>
      ${E.lvl('pmo') ? `<div class="row"><span class="toggle ${S.settings.autopilot ? 'on' : ''}" data-act="setting" data-key="autopilot"><span class="sw"></span>Autopilot: sign off and restart projects for me</span></div>` : ''}
    </div>
    <div class="card"><div class="card-title">Play on another device</div>
      <p class="small" style="margin-top:0">Send yourself a link that carries this save, then open it on your phone or computer to carry on from here. Whichever device opens it takes over this progress.</p>
      <div class="row"><button class="btn primary" data-act="transferCopy">Copy transfer link</button>
        ${navigator.share ? '<button class="btn" data-act="transferShare">Share…</button>' : ''}
        ${isStandalone() ? '' : '<button class="btn" data-act="install">Install as an app</button>'}</div>
      <textarea id="transferBox" class="hidden" rows="3" readonly></textarea>
      <label class="field" style="max-width:none">Got a link from your other device? Paste it here:<textarea id="importBox" rows="2" placeholder="https://…#transfer=…" autocomplete="off"></textarea></label>
      <div class="row" style="margin-top:0"><button class="btn" data-act="transferImport">Import progress</button></div>
    </div>
    <div class="card"><div class="card-title">Help</div>
      <p class="small" style="margin-top:0">Projects run in real time, even with this tab closed. Check in whenever suits you: sign off deliveries, answer your team, start the next project.</p>
      <p class="muted small">${compact() ? 'Tap ⧉ at the top' : 'Press <b>Esc</b> or <b>`</b>'} for a very boring report.</p>
      <div class="row"><button class="btn danger" data-act="reset">Reset everything</button></div>
    </div>`;

  let pointerDown = false;
  // Returns false when it held off (mid-tap, dialog open, or typing) so callers can try again next tick.
  function renderView(force) {
    const root = $('#view');
    if (!force) {
      if (pointerDown || !$('#overlay').classList.contains('hidden')) return false;
      if (document.activeElement && root.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return false;
      if (view === 'settings') return false;
    }
    const y = window.scrollY;
    const oldFloor = root.querySelector('.floor');
    root.innerHTML = VIEWS[view]();
    const newFloor = root.querySelector('.floor');
    if (oldFloor && newFloor && oldFloor.dataset.key === newFloor.dataset.key) newFloor.replaceWith(oldFloor);
    if (!force) window.scrollTo(0, y);
    updateFloors();
    live();
    return true;
  }

  // ================================================================ live updates (every second)

  let lastReady = '', lastReadyToast = '';
  function live() {
    const t = now();
    $$('[data-progress]').forEach(el => {
      const w = S.ws[+el.dataset.progress];
      if (w) el.style.width = clamp((t - w.start) / (w.end - w.start), 0, 1) * 100 + '%';
    });
    $$('[data-eta]').forEach(el => {
      const at = +el.dataset.eta;
      el.textContent = at > t ? `${fmtDur((at - t) / 1000)} to go` : 'Done';
    });
    updateCoach();
  }

  // ================================================================ dialogs & reveals

  const dialogQueue = [];
  function openDialog(html, opts = {}) {
    if (!$('#overlay').classList.contains('hidden') && opts.queue) { dialogQueue.push([html, opts]); return; }
    $('#dialog').innerHTML = html;
    $('#dialog').className = 'dialog ' + (opts.cls || '');
    $('#overlay').classList.remove('hidden');
    hideCoach();
    toastList.splice(0).forEach(el => el.remove());
  }
  function closeDialog() {
    $('#overlay').classList.add('hidden');
    reveal = null;
    if (dialogQueue.length) { const [h, o] = dialogQueue.shift(); openDialog(h, o); return; }
    renderNav();
    renderView(true);
    toastLater.splice(0).slice(-2).forEach(t => toast(...t));
  }
  function confirmDialog(title, body, okLabel, onOk) {
    confirmCb = onOk;
    openDialog(`<h3>${esc(title)}</h3>${body}<div class="actions"><button class="btn" data-act="closeDialog">Cancel</button><button class="btn primary" data-act="confirmOk">${esc(okLabel)}</button></div>`);
  }
  let confirmCb = null;

  let toastList = [], toastLater = [];
  function toast(msg, avId) {
    if (!$('#overlay').classList.contains('hidden')) {
      if (!toastLater.some(t => t[0] === msg)) toastLater.push([msg, avId]);
      return;
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (avId ? av(avId) : '') + `<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    toastList.push(el);
    while (toastList.length > (compact() ? 2 : 3)) toastList.shift().remove();
    setTimeout(() => { el.remove(); toastList = toastList.filter(x => x !== el); }, 2600 + msg.length * 35);
  }
  const buzz = p => { if (!S.settings.stealth && navigator.vibrate) try { navigator.vibrate(p); } catch { /* unsupported */ } };

  // --- client review reveal
  let reveal = null;
  const STAR_SVG = '<path d="M12 2.8L14.9 8.7L21.4 9.6L16.7 14.2L17.8 20.6L12 17.6L6.2 20.6L7.3 14.2L2.6 9.6L9.1 8.7Z"/>';
  function signOffSlots(slots) {
    const results = [];
    for (const i of slots) { const r = E.signOff(i); if (r) results.push(r); }
    if (!results.length) return;
    save();
    if (results.length > 4) showSummary(results);
    else showReview(results, 0);
  }
  function extrasHtml(r) {
    const out = [];
    if (r.career) {
      let title = '';
      for (const [l, t] of D.CAREER_TITLES) if (r.career >= l) title = t;
      out.push(`<div class="extra gold">🎖️<span><b>Career level ${r.career}</b> · ${esc(title)}</span></div>`);
    }
    if (r.commitDone) out.push('<div class="extra gold">🎯<span><b>Daily commitment hit!</b> Rewards are in your inbox.</span></div>');
    for (const it of r.items) {
      out.push(it.sold
        ? `<div class="extra">${A.gearIcon(it.slot, it.r)}<span>${esc(D.GEAR[it.slot].items[it.r])} sold to IT surplus</span></div>`
        : `<div class="extra">${A.gearIcon(it.slot, it.r)}<span><b>${esc(D.GEAR[it.slot].items[it.r])}</b> for ${esc(who(it.owner).first)} (+${it.pct}% skill)</span></div>`);
    }
    if (r.refs) out.push('<div class="extra">🤝<span>The client referred someone. <b>+1 referral</b></span></div>');
    if (r.passed && r.passed.length) out.push(`<div class="extra">🏆<span>You passed <b>${r.passed.map(id => esc(who('rival:' + id).first)).join(', ')}</b> in the league</span></div>`);
    return out.join('');
  }
  function showReview(results, idx) {
    const r = results[idx];
    const left = results.length - idx - 1;
    const quote = pick(D.REVIEWS[r.stars - 1]);
    reveal = { results, idx };
    openDialog(`
      <div class="review-head"><span class="logo">${A.logo(r.offer.client)}</span><div class="grow"><div class="muted small">Client review${results.length > 1 ? ` · ${idx + 1} of ${results.length}` : ''}</div><b>${esc(r.offer.client)}</b> · ${esc(r.offer.name)}</div></div>
      <div class="rstars">${[1, 2, 3, 4, 5].map(i => `<svg class="rstar" data-star="${i}" viewBox="0 0 24 24">${STAR_SVG}</svg>`).join('')}</div>
      <div class="verdict ${r.stars === 5 ? 'v5' : ''}" id="verdict">&nbsp;</div>
      <div class="muted small" style="text-align:center;min-height:16px" id="quote"></div>
      <div class="money" id="money">$0</div>
      <div class="xp-list">${r.team.map(id => {
        const st = S.staff[id], up = r.levelups.find(l => l.id === id);
        return `<div class="xp-row">${av(id, 'sm')}<span class="nowrap" style="width:84px;overflow:hidden;text-overflow:ellipsis">${esc(who(id).first)}</span>
          <div class="bar"><div class="fill" data-to="${100 * st.xp / E.xpNeed(st.lvl)}%" style="width:${up ? 0 : Math.max(0, 100 * (st.xp - r.xp) / E.xpNeed(st.lvl))}%"></div></div>
          ${up ? `<span class="lvlup">LEVEL ${up.to}</span>` : `<span class="muted small nowrap">+${fmt(r.xp)} XP</span>`}</div>`;
      }).join('')}</div>
      <div class="extras">${extrasHtml(r)}</div>
      <div class="actions">${left ? `<button class="btn" data-act="revealAll">Sign off all</button><button class="btn primary" data-act="revealNext">Next review (${left})</button>` : '<button class="btn primary" data-act="closeDialog">Done</button>'}</div>`, { cls: 'review' });
    const stealth = S.settings.stealth;
    const step = stealth ? 0 : 230;
    $$('.rstar').forEach((el, i) => { if (i < r.stars) setTimeout(() => el.classList.add('on'), step * (i + 1)); });
    setTimeout(() => {
      const verdict = $('#verdict'), q = $('#quote');
      if (!verdict || !q) return; // closed before the animation finished
      verdict.textContent = D.VERDICTS[r.stars - 1];
      q.textContent = `“${quote}”`;
      buzz(r.stars === 5 ? [18, 50, 18] : 12);
    }, step * (r.stars + 1));
    countUp($('#money'), r.cash, stealth ? 0 : 900);
    setTimeout(() => $$('.xp-row .fill').forEach(f => { f.style.width = f.dataset.to; }), stealth ? 0 : 350);
  }
  function countUp(el, to, ms) {
    if (!ms) { el.textContent = '+' + money(to); return; }
    const t0 = performance.now();
    const stepFn = t => {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = '+' + money(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && document.body.contains(el)) requestAnimationFrame(stepFn);
    };
    requestAnimationFrame(stepFn);
  }
  function showSummary(results) {
    const total = results.reduce((a, r) => a + r.cash, 0);
    const avg = results.reduce((a, r) => a + r.stars, 0) / results.length;
    const ups = results.flatMap(r => r.levelups);
    const extras = results.map(extrasHtml).join('');
    openDialog(`<h3>${results.length} deliveries signed off</h3>
      <div class="money">+${money(total)}</div><div class="muted small" style="text-align:center">Average rating ${avg.toFixed(1)}★</div>
      <ul class="feed" style="margin-top:12px">${results.map(r => `<li><span class="logo" style="width:22px;height:22px">${A.logo(r.offer.client)}</span><span class="grow">${esc(r.offer.client)} · ${esc(r.offer.name)}</span><span class="stars">${'★'.repeat(r.stars)}</span></li>`).join('')}</ul>
      ${ups.length ? `<div class="extras">${ups.map(u => `<div class="extra">${av(u.id, 'sm')}<span><b>${esc(who(u.id).first)}</b> reached level ${u.to}</span></div>`).join('')}</div>` : ''}
      <div class="extras">${extras}</div>
      <div class="actions"><button class="btn primary" data-act="closeDialog">Done</button></div>`);
  }

  // --- hiring reveal
  let hires = [];
  function showHires(res) {
    hires = res;
    openDialog(`<h3>Interview results</h3><div class="muted small">Tap a résumé to open it.</div>
      <div class="resumes">${res.map((x, i) => {
        const p = E.PEOPLE[x.id];
        const line = x.kind === 'new' ? '<span class="good"><b>New hire!</b></span>' : x.kind === 'star' ? `<span>Promoted to ${'★'.repeat(x.stars)}</span>` : `<span class="muted">Signing bonus ${money(x.cash)}</span>`;
        return `<button class="resume" data-act="flip" data-i="${i}"><div class="resume-inner"><div class="resume-face front"><b>Résumé</b><span class="muted">Candidate ${i + 1}</span></div>
          <div class="resume-face back r${p.r}">${av(x.id)}<b>${esc(p.name)}</b>${band(p.r)}${line}</div></div></button>`;
      }).join('')}</div>
      <div class="actions"><button class="btn" data-act="flipAll">Open all</button><button class="btn primary" data-act="closeDialog">Done</button></div>`);
    if (S.settings.stealth) $$('.resume').forEach(el => el.classList.add('flipped'));
  }
  function flip(i) {
    const el = $(`.resume[data-i="${i}"]`);
    if (!el || el.classList.contains('flipped')) return;
    el.classList.add('flipped');
    const p = E.PEOPLE[hires[i].id];
    if (p.r >= 3) buzz([20, 40, 20, 40, 30]);
  }

  // --- profile
  function showProfile(id, chat) {
    const p = E.PEOPLE[id], st = S.staff[id];
    if (!p || !st) return;
    const h = E.hearts(id);
    const s = statusOf(id);
    const chatReady = now() - st.lastChat >= 4 * 3600e3;
    const gear = Object.keys(D.GEAR).map(slot => {
      const it = S.items.find(i => i.owner === id && i.slot === slot);
      return `<div class="gear">${A.gearIcon(slot, it ? it.r : 0)}<span>${it ? `${esc(D.GEAR[slot].items[it.r])} <span class="muted">+${it.pct}%</span>` : `<span class="muted">No ${D.GEAR[slot].name.toLowerCase()}</span>`}</span></div>`;
    }).join('');
    const story = p.story.map((line, i) => {
      const need = [1, 3, 5][i];
      return h >= need ? `<li>${esc(line)}</li>` : `<li class="locked">🔒 Unlocks at ${'♥'.repeat(need)}</li>`;
    }).join('');
    const msg = S.inbox.find(m => m.from === id && m.choices && !m.done);
    openDialog(`<div class="profile-head">${av(id, 'xl')}<div class="grow"><h3>${esc(p.name)}</h3><div class="muted small">${esc(jobTitle(id))}</div>
        <div class="pc-row">${band(p.r)}${st.stars ? starsHtml(st.stars) : ''}<span class="status-tag ${s.cls}">${esc(s.text)}</span></div></div></div>
      <div class="quote">“${esc(p.catch)}” · ${esc(p.bio)}</div>
      ${chat ? `<div class="said">${av(id)}<span>“${esc(chat.said)}”${chat.heartUp ? ' <b class="hearts">♥ Bond up</b>' : ''}</span></div>` : ''}
      ${msg ? `<div class="row"><button class="btn primary" data-act="nav" data-view="inbox">${esc(p.name.split(' ')[0])} has a message for you</button></div>` : ''}
      <div class="stat-grid">
        <div class="stat"><label>Level</label><b>${st.lvl}</b><div class="bar thin"><div class="fill" style="width:${100 * st.xp / E.xpNeed(st.lvl)}%"></div></div></div>
        <div class="stat"><label>Skill</label><b>${fmt(E.skill(id))}</b></div>
        <div class="stat"><label>Mood</label><b>${moodWord(st.mood)}</b><div class="bar thin"><div class="fill ${st.mood >= 60 ? 'green' : 'gold'}" style="width:${st.mood}%"></div></div></div>
        <div class="stat"><label>Bond</label>${heartsHtml(id)}</div>
        <div class="stat"><label>Delivered</label><b>${st.delivered}</b></div>
        <div class="stat"><label>Avg rating</label><b>${st.delivered ? (st.starSum / st.delivered).toFixed(1) + '★' : '–'}</b></div>
      </div>
      <div class="traits">${p.traits.map(t => `<div class="trait"><b>${esc(D.TRAITS[t].name)}</b>${esc(D.TRAITS[t].desc)}</div>`).join('')}</div>
      ${E.unlocked('gear') ? `<div class="card-title" style="margin:12px 0 0">Equipment</div><div class="gear-row">${gear}</div>` : ''}
      <div class="card-title" style="margin:12px 0 0">Their story</div><ul class="story">${story}</ul>
      <div class="actions"><button class="btn" data-act="closeDialog">Close</button><button class="btn primary" data-act="chat" data-id="${id}" ${chatReady ? '' : 'disabled'}>${chatReady ? '☕ Coffee chat' : `☕ Again in ${fmtDur((st.lastChat + 4 * 3600e3 - now()) / 1000)}`}</button></div>`);
  }

  // ================================================================ coach marks (first session)

  const COACH = {
    0: [['offer-tut', 'Start your first project'], ['next', 'Start here'], ['tab-projects', 'Projects'], ['nav-projects', 'Projects']],
    1: [['ws0', 'Running in real time…']],
    2: [['signoff', 'Sign it off'], ['next', 'Sign it off']],
    3: [['build-coffee', 'Build a coffee bar'], ['next', 'Open the office'], ['nav-office', 'Office'], ['tab-more', 'Office is in here'], ['sheet-office', 'Office']],
    4: [['offer-any', 'Start another'], ['next', 'Start another']],
  };
  function hideCoach() { $('#coach').classList.add('hidden'); $('#coachTip').classList.add('hidden'); }
  function updateCoach() {
    if (S.tut < 0 || !$('#overlay').classList.contains('hidden')) return hideCoach();
    for (const [key, text] of COACH[S.tut] || []) {
      const el = $$(`[data-coach="${key}"]`).find(x => x.offsetParent !== null || x.getClientRects().length);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
      const ring = $('#coach'), tip = $('#coachTip');
      Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
      ring.classList.remove('hidden');
      tip.textContent = text;
      tip.classList.remove('hidden');
      const above = r.top > 60;
      Object.assign(tip.style, { left: clamp(r.left, 8, window.innerWidth - tip.offsetWidth - 8) + 'px', top: (above ? r.top - 36 : r.bottom + 10) + 'px' });
      return;
    }
    hideCoach();
  }

  // ================================================================ engine events → UI

  function drainEvents() {
    const inReveal = !!reveal;
    while (pendingEvents.length) {
      const { type, data } = pendingEvents.shift();
      if (type === 'levelup' && !inReveal) toast(`${who(data.id).first} reached level ${data.lvl}`, data.id);
      else if (type === 'career' && !inReveal) toast(`🎖️ Career level ${data.lvl}`);
      else if (type === 'unlock') toast(`New: ${data.title}`);
      else if (type === 'built') toast(`🏗️ ${E.OFFICE[data.id].name} upgraded`);
      else if (type === 'achievement') toast(`🏅 Badge: ${data.name}`);
      else if (type === 'burnout') toast(`${who(data.id).first} is burnt out and taking a break`, data.id);
      else if (type === 'funding') {
        const r = D.FUNDING[data.round];
        const zones = Object.values(D.ZONES).filter(z => z.funding === data.round).map(z => z.name);
        openDialog(`<div class="profile-head">${av('ceo', 'xl')}<div><div class="muted small">Alex Rivera · CEO</div><h3>🎉 ${esc(r.name)}!</h3></div></div>
          <p>${esc(r.line)}</p><div class="extras"><div class="extra gold">💰<span><b>+${money(data.injection)}</b> funding injection</span></div>
          <div class="extra gold">📈<span>Revenue <b>×1.5</b> for good</span></div>${zones.length ? `<div class="extra">🏢<span>New office space: <b>${esc(zones.join(', '))}</b></span></div>` : ''}</div>
          <div class="actions"><button class="btn primary" data-act="closeDialog">Let's go</button></div>`, { queue: true });
      } else if (type === 'message') {
        const m = data;
        if (view !== 'inbox' && m.kind !== 'dana' && m.kind !== 'funding' && document.visibilityState === 'visible') toast(`${who(m.from).first}: ${m.text.length > 60 ? m.text.slice(0, 57) + '…' : m.text}`, m.from);
      }
    }
  }

  // ================================================================ install, badge, transfer

  let installEvent = null, lastBadge = -1, packed = '';
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function promptInstall() {
    if (installEvent) {
      installEvent.prompt();
      installEvent.userChoice.then(c => { if (c.outcome === 'accepted') S.settings.installHint = false; }).catch(() => {}).then(() => { installEvent = null; renderView(true); });
      return;
    }
    openDialog(`<h3>Install Atlas Workforce</h3>${isIOS()
      ? `<ol><li>Open this page in <b>Safari</b>.</li><li>Tap <b>Share</b> (the square with an arrow).</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
         <p class="muted small">It opens full-screen and works offline. On iPhone the home-screen app keeps its own save: use Settings → Play on another device to bring this one along.</p>`
      : `<ol><li>Open the browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li></ol><p class="muted small">It opens full-screen, works offline and shares this browser's save.</p>`}
      <div class="actions"><button class="btn primary" data-act="closeDialog">Got it</button></div>`);
  }
  function setAppBadge(n) {
    if (!('setAppBadge' in navigator) || n === lastBadge) return;
    lastBadge = n;
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }
  function updateTitle() {
    if (!$('#decoy').classList.contains('hidden')) return;
    const n = E.actionCount();
    $('#bellCount').textContent = n;
    $('#bellCount').classList.toggle('hidden', !n);
    document.title = (S.settings.badge && n ? `(${n}) ` : '') + 'Atlas Workforce';
    setAppBadge(S.settings.badge ? n : 0);
  }

  function toB64url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64url(str) {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }
  async function packSave() {
    const data = Object.assign({}, E.state, { offers: [], log: [], lastSeen: now(), lastTick: now() });
    let bytes = new TextEncoder().encode(JSON.stringify(data)), tag = 'j';
    if (window.CompressionStream) {
      try {
        bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
        tag = 'z';
      } catch { /* plain JSON still works, just longer */ }
    }
    return tag + toB64url(bytes);
  }
  async function unpackSave(code) {
    const bytes = fromB64url(code.slice(1));
    const json = code[0] === 'z'
      ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
      : new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || !data.staff) throw new Error('not a save');
    return data;
  }
  async function refreshPacked() { try { packed = await packSave(); } catch { packed = ''; } }
  const transferUrl = code => `${location.origin}${location.pathname}#transfer=${code}`;
  async function importCode(text) {
    const t = String(text || '').trim();
    const code = t.includes('#transfer=') ? t.split('#transfer=')[1].trim() : t;
    if (!/^[jz][A-Za-z0-9_-]{20,}$/.test(code)) throw new Error('not a transfer code');
    const data = await unpackSave(code);
    const career = data.career ? data.career.lvl : '?';
    confirmDialog('Continue on this device?',
      `<p>This link carries progress from another device: <b>career level ${esc(career)}</b> with ${Object.keys(data.staff).length} people.</p>
       <p>This device is at career level ${S.career.lvl} with ${E.owned().length} people. <b>Importing replaces it.</b></p>`, 'Import', () => {
        S = E.load(data);
        E.tick();
        save();
        $('#meAvatar').innerHTML = A.avatar(myLook());
        applySettings();
        toast('Progress imported. Your team is back at work.');
        go('home');
      });
  }

  // ================================================================ actions

  const ACTIONS = {
    nav: d => go(d.view),
    more: () => ($('#sheet').classList.contains('hidden') ? openSheet() : closeSheet()),
    decoy: () => { closeSheet(); toggleDecoy(); },
    closeDialog: () => closeDialog(),
    confirmOk: () => { const cb = confirmCb; confirmCb = null; closeDialog(); if (cb) cb(); },
    start: d => {
      const w = E.start(d.offer);
      if (!w) return toast('No free workstream or nobody available');
      save();
      toast(`${w.offer.name} started · ${fmtDur(w.offer.dur)}`);
      renderNav();
      renderView(true);
    },
    signoff: d => signOffSlots([+d.slot]),
    signoffAll: () => signOffSlots(E.ready()),
    revealNext: () => { if (reveal) showReview(reveal.results, reveal.idx + 1); },
    revealAll: () => { if (reveal) { const rest = reveal.results.slice(reveal.idx + 1); reveal = null; if (rest.length === 1) showReview(rest, 0); else showSummary(rest); } },
    refresh: () => { if (E.refreshOffers()) { save(); renderView(true); } },
    answer: d => {
      const res = E.answer(+d.msg, +d.i);
      if (res && res.error === 'funds') return toast('Not enough budget');
      save();
      if (res && res.pending) toast('Decision made. You will hear back soon.');
      renderNav();
      renderView(true);
    },
    react: d => { E.react(+d.msg, d.e); save(); renderView(true); },
    profile: d => showProfile(d.id),
    chat: d => {
      const before = E.hearts(d.id);
      const res = E.coffeeChat(d.id);
      if (!res) return;
      save();
      const p = E.PEOPLE[d.id];
      showProfile(d.id, { said: pick([p.catch, ...p.banter]), heartUp: res.hearts > before });
      buzz(15);
    },
    interview: d => {
      const res = E.interview(+d.n);
      if (!res) return;
      save();
      showHires(res);
    },
    flip: d => flip(+d.i),
    flipAll: () => hires.forEach((_, i) => setTimeout(() => flip(i), S.settings.stealth ? 0 : i * 260)),
    build: d => {
      if (!E.build(d.id)) return;
      save();
      toast(`🏗️ Building ${E.OFFICE[d.id].name} · ${fmtDur((S.builds[S.builds.length - 1].end - now()) / 1000)}`);
      renderView(true);
    },
    setting: d => { S.settings[d.key] = !S.settings[d.key]; applySettings(); save(); renderView(true); },
    install: () => { closeSheet(); promptInstall(); },
    dismissInstall: () => { S.settings.installHint = false; save(); renderView(true); },
    transferCopy: () => {
      if (!packed) { refreshPacked(); return toast('Preparing your link… tap again in a second'); }
      const url = transferUrl(packed);
      const showBox = () => { const box = $('#transferBox'); box.classList.remove('hidden'); box.value = url; box.focus(); box.select(); toast('Copy the link from the box below'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(() => toast('Transfer link copied. Open it on your other device.'), showBox);
      else showBox();
    },
    transferShare: () => {
      if (!packed) { refreshPacked(); return toast('Preparing your link… tap again in a second'); }
      navigator.share({ title: 'Atlas Workforce', text: 'Continue in Atlas Workforce', url: transferUrl(packed) }).catch(() => {});
    },
    transferImport: () => importCode($('#importBox').value).catch(() => toast("That doesn't look like a complete transfer link")),
    reset: () => confirmDialog('Reset everything?', '<p>This deletes your team, office, badges and career on this device.</p>', 'Reset', () => {
      S = E.fresh();
      save();
      go('home');
      askName();
    }),
    saveName: () => {
      const v = ($('#nameInput').value || '').trim().slice(0, 20);
      S.name = v;
      save();
      $('#meAvatar').innerHTML = A.avatar(myLook());
      closeDialog();
    },
  };

  const myLook = () => ({ skin: 2, hair: 'short', hc: '#3a2b20', top: '#005f73', topStyle: 'collar', bg: '#e3f1f4', mouth: 'smile' });

  function askName() {
    openDialog(`<div class="profile-head">${av('dana', 'xl')}<div><div class="muted small">Dana Okafor · VP Delivery</div><h3>Welcome to Atlas!</h3></div></div>
      <p>I'm Dana, your manager. You're taking over a small team. They do the work; you make the calls. It runs in real time, so check in whenever suits you.</p>
      <label class="field" style="max-width:none">What should the team call you?<input id="nameInput" maxlength="20" placeholder="Your first name" autocomplete="off"></label>
      <div class="actions"><button class="btn primary" data-act="saveName">Let's go</button></div>`);
    setTimeout(() => { const i = $('#nameInput'); if (i && !compact()) i.focus(); }, 50);
  }

  function applySettings() { document.body.classList.toggle('stealth', !!S.settings.stealth); }

  function toggleDecoy() {
    const d = $('#decoy');
    const show = d.classList.contains('hidden');
    d.classList.toggle('hidden', !show);
    if (show) { E.panic(); document.title = 'Performance Calibration · Atlas Workforce'; hideCoach(); } else updateTitle();
  }

  function bind() {
    document.addEventListener('pointerdown', () => { pointerDown = true; });
    document.addEventListener('pointerup', () => setTimeout(() => { pointerDown = false; }, 60));
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const fn = ACTIONS[el.dataset.act];
      if (fn) fn(el.dataset, e);
    });
    document.addEventListener('input', e => {
      if (e.target.id === 'setName') { S.name = e.target.value.trim().slice(0, 20); save(); }
    });
    $('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay' && !reveal) closeDialog(); });
    $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
    $('#decoy').addEventListener('dblclick', toggleDecoy);
    const onResize = () => renderView(true);
    if (phoneQuery.addEventListener) phoneQuery.addEventListener('change', onResize); else phoneQuery.addListener(onResize);
    window.addEventListener('resize', updateCoach);
    window.addEventListener('scroll', updateCoach, { passive: true });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; });
    window.addEventListener('appinstalled', () => { installEvent = null; S.settings.installHint = false; toast('Installed. Open Workforce from your home screen.'); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#sheet').classList.contains('hidden')) { closeSheet(); return; }
      if (e.key === 'Escape' && !$('#overlay').classList.contains('hidden')) { closeDialog(); return; }
      if ((e.key === 'Escape' || e.key === '`') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); toggleDecoy(); return; }
      if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'nameInput') ACTIONS.saveName();
    });
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) save();
      else { E.tick(); drainEvents(); renderNav(); renderView(true); }
    });
  }

  // ================================================================ loop & boot

  let ticks = 0;
  function tick() {
    E.tick();
    drainEvents();
    const readyNow = E.ready().join(',');
    if (readyNow !== lastReadyToast) {
      if (readyNow.length > lastReadyToast.length && document.visibilityState === 'visible' && view !== 'home' && view !== 'projects') toast('✅ A project is ready for sign-off');
      lastReadyToast = readyNow;
    }
    if (readyNow !== lastReady) {
      renderNav();
      if (renderView()) lastReady = readyNow;
    }
    live();
    if (++ticks % 5 === 0) {
      updateFloors();
      renderNav();
      if (view !== 'inbox' || ticks % 15 === 0) renderView();
      updateTitle();
    }
    if (ticks % 10 === 0) save();
    if (ticks % 30 === 0 && view === 'settings') refreshPacked();
  }

  function boot() {
    let fresh = true;
    try { fresh = !(localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_KEY)); } catch { /* storage blocked */ }
    loadSave();
    applySettings();
    $('#meAvatar').innerHTML = A.avatar(myLook());
    const transfer = location.hash.startsWith('#transfer=') ? location.hash : null;
    if (transfer) history.replaceState(null, '', location.pathname + location.search);

    // Catch up on time away and summarise it.
    const away = (now() - S.lastSeen) / 1000;
    const before = { office: JSON.stringify(S.office), inbox: S.inbox.length };
    E.tick();
    pendingEvents.length = 0;
    lastReady = lastReadyToast = E.ready().join(',');
    bind();
    renderNav();
    renderView(true);
    updateTitle();
    setInterval(tick, 1000);

    if (transfer) importCode(transfer).catch(() => toast('That transfer link looks incomplete. Try copying it again.'));
    else if (fresh || S.tut === 0 && !S.name) askName();
    else if (away > 10 * 60) {
      const ready = E.ready().length;
      const newMsgs = S.inbox.length - before.inbox;
      const built = JSON.stringify(S.office) !== before.office;
      const auto = S.autoSummary;
      S.autoSummary = null;
      const lines = [];
      if (auto) lines.push(`🤖 Autopilot delivered <b>${auto.count}</b> project${auto.count > 1 ? 's' : ''} (avg ${(auto.stars / auto.count).toFixed(1)}★, +${money(auto.cash)})`);
      if (ready) lines.push(`✅ <b>${ready}</b> deliver${ready > 1 ? 'ies' : 'y'} waiting for your sign-off`);
      if (newMsgs > 0) lines.push(`💬 <b>${newMsgs}</b> new message${newMsgs > 1 ? 's' : ''}`);
      if (built) lines.push('🏗️ Office construction finished');
      if (lines.length) {
        openDialog(`<h3>Welcome back${S.name ? ', ' + esc(S.name) : ''}!</h3><p class="muted small">You were away ${fmtDur(away)}.</p>
          <div class="extras">${lines.map(l => `<div class="extra"><span>${l}</span></div>`).join('')}</div>
          <div class="actions">${ready ? '<button class="btn" data-act="closeDialog">Later</button><button class="btn primary" data-act="signoffAll">Sign off now</button>' : '<button class="btn primary" data-act="closeDialog">Okay</button>'}</div>`);
      }
    }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (/[?&]debug/.test(location.search)) {
      window.WF = {
        E, get S() { return E.state; },
        warp: sec => {
          const s = E.state, ms = sec * 1000;
          s.lastSeen -= ms; s.lastTick -= ms;
          for (const w of s.ws) if (w) { w.start -= ms; w.end -= ms; }
          for (const b of s.builds) { b.start -= ms; b.end -= ms; }
          for (const r of s.risks) r.at -= ms;
          s.nextMsgAt -= ms;
          if (s.league) { s.league.start -= ms; s.league.end -= ms; }
          tick();
        },
        give: (cash = 0, refs = 0) => { E.state.cash += cash; E.state.referrals += refs; },
      };
    }
  }

  boot();
})();
