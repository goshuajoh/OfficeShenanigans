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
  const price = v => '$' + v.toFixed(2);
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
    const base = p.title || (p.r === 0 ? `${D.ROLES[p.role].name} Intern` : p.r === 1 ? D.ROLE_NOUN[p.role] : `${D.RARITY[p.r].name} ${D.ROLE_NOUN[p.role]}`);
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
    if (E.PEOPLE[id].noWork) return { cls: 'busy', text: 'Being a very good boy' };
    if (E.resting(id)) return { cls: 'rest', text: `Recharging · ${fmtDur((S.staff[id].restUntil - t) / 1000)}` };
    const w = S.ws.find(x => x && x.team.includes(id));
    if (w) return { cls: 'busy', text: t >= w.end ? `Done: ${w.offer.name}` : `On ${w.offer.name}` };
    return { cls: '', text: 'Available' };
  }
  const sizeLabel = o => `${D.SIZES[o.size].name} · ${fmtDur(o.dur)}`;
  const abilityHtml = p => (p.ability ? `<div class="ability"><b>${icon('bolt')}${esc(p.ability.name)}</b><span>${esc(p.ability.desc)}</span></div>` : '');
  const pct = (v, digits = 1) => `${v >= 0 ? '▲' : '▼'} ${Math.abs(v * 100).toFixed(digits)}%`;
  const upDown = v => (v >= 0 ? 'gain' : 'loss');

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
    breaks: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5c-.6 1 .6 1.6 0 2.8M12 3.5c-.6 1 .6 1.6 0 2.8"/>',
    investors: '<path d="M4 19h16M5 15l4.5-4.5 3.5 3 6-6.5"/><path d="M15 7h4v4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    gift: '<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7h18v3H3zM12 7v13M12 7C10.5 3.5 6.5 3.5 7 6c.3 1 2.5 1 5 1M12 7c1.5-3.5 5.5-3.5 5-1-.3 1-2.5 1-5 1"/>',
    hourglass: '<path d="M7 3h10M7 21h10M8 3v3a4 4 0 0 0 1.6 3.2L12 11l2.4-1.8A4 4 0 0 0 16 6V3M8 21v-3a4 4 0 0 1 1.6-3.2L12 13l2.4 1.8A4 4 0 0 1 16 18v3"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor" stroke="none"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5L6 3h4l2 5 2-5h4l-2.5 7.5"/>',
    coins: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V5M9.5 16h5"/><circle cx="12" cy="4" r="1"/><circle cx="9.5" cy="12.5" r="1" fill="currentColor"/><circle cx="14.5" cy="12.5" r="1" fill="currentColor"/>',
    crane: '<path d="M3 21h10M6 21V4l13 3.5M6 4L4 7h4M17 7v5"/><rect x="15.5" y="12" width="3" height="3"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    tiles: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    tray: '<path d="M3.5 13.5l2.5-8h12l2.5 8v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M3.5 13.5h5l1 2h5l1-2h5"/>',
    tower: '<rect x="6.5" y="15" width="11" height="5.5" rx="1"/><rect x="7.5" y="9.5" width="9" height="5.5" rx="1"/><rect x="8.5" y="4" width="7" height="5.5" rx="1"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    star: '<path d="M12 2.8L14.9 8.7L21.4 9.6L16.7 14.2L17.8 20.6L12 17.6L6.2 20.6L7.3 14.2L2.6 9.6L9.1 8.7Z" fill="currentColor" stroke="none"/>',
    hook: '<path d="M14 3.5v9.5a4.5 4.5 0 0 1-9 0v-2l3 2.5"/><circle cx="14" cy="3" r="1"/>',
    cloud: '<path d="M7 18.5a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6-1.2A4.2 4.2 0 0 1 17.5 18.5z"/>',
    paw: '<g fill="currentColor" stroke="none"><circle cx="6.5" cy="10" r="2"/><circle cx="10.5" cy="6.5" r="2"/><circle cx="15" cy="7" r="2"/><circle cx="18" cy="11" r="2"/><path d="M8 17.5c0-3 2-5.5 4.5-5.5s4.5 2.5 4.5 5.5c0 1.6-1.6 2.5-4.5 2.5S8 19.1 8 17.5z"/></g>',
    flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.6-5 3.4-8.4 1.9 1.4 2.6 3.2 2.6 4.6.9-.7 1.6-2 1.6-3.4 2.5 2 4.4 4.3 4.4 7.2 0 3.2-2.4 5.6-6 5.6z" fill="currentColor" stroke="none"/>',
    talk: '<path d="M3.5 5h11v8H8l-4.5 3.5z"/><path d="M14.5 9h6v8.5L17 15h-6v-2"/>',
    dots: '<g fill="currentColor" stroke="none"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></g>',
    sleep: '<path d="M4 9h6l-6 7h6M14 5h6l-6 7h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const NAV = [
    ['WORK', [['home', 'Home'], ['projects', 'Projects'], ['inbox', 'Inbox']]],
    ['PEOPLE', [['team', 'Team'], ['hiring', 'Hiring', 'hiring'], ['breaks', 'Breaks', 'breaks']]],
    ['COMPANY', [['office', 'Office'], ['league', 'League', 'league'], ['investors', 'Investors', 'ipo'], ['career', 'Career']]],
    ['', [['settings', 'Settings']]],
  ];
  const LABEL = Object.fromEntries(NAV.flatMap(([, items]) => items.map(([v, l]) => [v, l])));
  const GATE = Object.fromEntries(NAV.flatMap(([, items]) => items.filter(x => x[2]).map(([v, , g]) => [v, g])));
  const TABS = ['home', 'projects', 'inbox', 'team'];
  const MORE = ['hiring', 'breaks', 'office', 'league', 'investors', 'career', 'settings'];
  const phoneQuery = window.matchMedia('(max-width: 700px)');
  const compact = () => phoneQuery.matches;
  let view = 'home';

  const gateLevel = g => (D.UNLOCKS.find(u => u.id === g) || {}).career;
  const gateText = v => (GATE[v] === 'ipo' ? 'At IPO' : `Career ${gateLevel(GATE[v])}`);
  const isLocked = v => GATE[v] && !E.unlocked(GATE[v]);
  const pendingCount = () => S.inbox.filter(m => m.choices && !m.done).length;
  function navBadge(v) {
    if (v === 'inbox') return pendingCount();
    if (v === 'projects') return E.ready().length;
    if (v === 'hiring') return Math.floor(S.referrals) + S.tickets;
    if (v === 'breaks') return E.gamesReady().length;
    return 0;
  }
  const isNew = v => GATE[v] && E.unlocked(GATE[v]) && !S.seen[v];

  function renderNav() {
    $('#nav').innerHTML = NAV.map(([sec, items]) => (sec ? `<div class="nav-section">${sec}</div>` : '<div class="nav-section">&nbsp;</div>') + items.map(([v, label]) => {
      if (isLocked(v)) return `<div class="nav locked">${icon(v)}${label}<span class="lock">${gateText(v)}</span></div>`;
      const b = navBadge(v);
      return `<button class="nav ${v === view ? 'active' : ''}" data-act="nav" data-view="${v}" data-coach="nav-${v}">${icon(v)}${label}${isNew(v) ? '<span class="new">New</span>' : b ? `<span class="count">${b > 99 ? '99+' : b}</span>` : ''}</button>`;
    }).join('')).join('');
    const inMore = !TABS.includes(view);
    const moreAlert = MORE.some(v => isNew(v)) || (E.unlocked('hiring') && (S.referrals >= 5 || S.tickets >= 1));
    $('#tabbar').innerHTML = TABS.map(v => {
      const b = navBadge(v);
      return `<button class="tab-btn ${v === view ? 'active' : ''}" data-act="nav" data-view="${v}" data-coach="tab-${v}">${icon(v)}<span>${LABEL[v]}</span>${b ? `<span class="count">${b > 99 ? '99+' : b}</span>` : ''}</button>`;
    }).join('') + `<button class="tab-btn ${inMore ? 'active' : ''}" data-act="more" data-coach="tab-more">${icon('more')}<span>More</span>${moreAlert ? '<span class="pip"></span>' : ''}</button>`;
    $('#viewTitle').textContent = LABEL[view];
    if (!$('#sheet').classList.contains('hidden')) renderSheet();
  }
  function renderSheet() {
    $('#sheetBox').innerHTML = '<div class="sheet-handle"></div>' + MORE.map(v => {
      if (isLocked(v)) return `<div class="sheet-item locked">${icon(v)}<span>${LABEL[v]}</span><span class="right">${gateText(v)}</span></div>`;
      const b = navBadge(v);
      return `<button class="sheet-item ${v === view ? 'active' : ''}" data-act="nav" data-view="${v}" data-coach="sheet-${v}">${icon(v)}<span>${LABEL[v]}</span>${isNew(v) ? '<span class="right new">New</span>' : b ? `<span class="right count">${b}</span>` : ''}</button>`;
    }).join('') + '<div class="sheet-sep"></div>'
      + (isStandalone() ? '' : `<button class="sheet-item" data-act="install">${icon('install')}<span>Install on this device</span></button>`)
      + `<button class="sheet-item" data-act="decoy">${icon('report')}<span>Report view</span><span class="right muted">hides the game</span></button>`;
  }
  // The coach is placed again once the sheet has finished sliding up.
  const openSheet = () => { renderSheet(); $('#sheet').classList.remove('hidden'); updateCoach(); setTimeout(updateCoach, 250); };
  const closeSheet = () => { $('#sheet').classList.add('hidden'); updateCoach(); };

  function go(v) {
    if (isLocked(v)) return toast(GATE[v] === 'ipo' ? 'Investors opens when Atlas goes public' : `${LABEL[v]} unlocks at career level ${gateLevel(GATE[v])}`);
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
      return `<div class="ws free"><div class="ws-ico">${icon('plus')}</div><div class="grow"><b>Free workstream</b>
        <div class="muted small">${rec ? `Suggested: ${esc(rec.name)} for ${esc(rec.client)} · ${fmtDur(rec.dur)}` : 'Nobody is free right now'}</div></div>
        ${rec ? `<button class="btn primary" data-act="start" data-offer="${rec.id}" data-coach="${rec.tut ? 'offer-tut' : 'offer-any'}">Start</button>` : ''}
        <button class="btn ghost" data-act="nav" data-view="projects">Browse</button></div>`;
    }
    const done = now() >= w.end;
    return `<div class="ws ${done ? 'done' : ''}" ${i === 0 ? 'data-coach="ws0"' : ''}>
      <span class="logo">${A.logo(w.offer.client)}</span>
      <div class="grow"><div class="ws-title"><b>${esc(w.offer.name)}</b> <span class="muted small">· ${esc(w.offer.client)}</span></div>
        <div class="ws-meta">${stack(w.team)}<span class="muted small">${sizeLabel(w.offer)}</span>${w.offer.vip ? '<span class="chip vip">VIP</span>' : ''}</div>
        ${done ? `<div class="small good">Delivered${w.billed ? ` · ${money(w.billed)} billed` : ''}. Waiting for your sign-off.</div>` : `<div class="bar"><div class="fill" data-progress="${i}" style="width:${clamp((now() - w.start) / (w.end - w.start), 0, 1) * 100}%"></div></div><div class="muted small"><span data-wseta="${i}"></span><span data-billed="${i}"></span></div>`}
      </div>
      ${done ? `<button class="btn primary glow" data-act="signoff" data-slot="${i}" data-coach="signoff">Sign off</button>`
        : E.unlocked('rush') ? `<button class="btn rush" data-act="rush" data-slot="${i}" ${S.shots < 1 ? 'disabled' : ''} title="Use an espresso shot: halves the time left">${icon('breaks')}Rush</button>` : ''}
    </div>`;
  }
  // Espresso shots: how many, and when the next one arrives.
  function shotsHtml() {
    if (!E.unlocked('rush')) return '';
    const n = Math.floor(S.shots + 1e-9);
    const cap = E.shotCap();
    const next = n < cap ? ` · next in ${fmtDur((1 - (S.shots % 1)) * D.BALANCE.shotMinutes * 60)}` : '';
    return `<span class="shots" title="Espresso shots rush a project">${icon('breaks')}${n} shot${n === 1 ? '' : 's'}<span class="muted">${next}</span></span>`;
  }
  function boostHtml() {
    const left = (S.boost.until - now()) / 1000;
    return left > 0 ? `<span class="chip boost">${icon('investors')}Revenue +${Math.round((S.boost.mult - 1) * 100)}% · ${fmtDur(left)}</span>` : '';
  }
  const wsList = () => `<div class="ws-list">${Array.from({ length: E.wsCount() }, (_, i) => wsItem(S.ws[i], i)).join('')}</div>`;
  function tickerChip(big) {
    const st = S.stock;
    if (!st) return '';
    const ch = st.price / st.open - 1;
    return `<button class="ticker ${big ? 'big' : ''}" data-act="nav" data-view="investors"><b>${st.ticker}</b> ${price(st.price)} <span class="${upDown(ch)}">${pct(ch)}</span></button>`;
  }

  // --- the live budget: every digit shows, so you can watch it count up
  const NF2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const NF0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  function cashText(n) {
    if (n < 1e6) return '$' + NF2.format(n);
    if (n < 1e15) return '$' + NF0.format(Math.floor(n));
    const tier = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3));
    return '$' + (n / Math.pow(1000, tier)).toFixed(6) + SUFFIX[tier];
  }
  const rateText = r => (r > 0 ? `▲ ${r < 10 ? '$' + r.toFixed(2) : money(r)}/s` : 'No projects billing');
  // The ring around the bolt fills as you tap and drains when you stop.
  const hustleBtn = cls => (E.unlocked('hustle') ? `<button class="hustle ${cls || ''}" data-act="hustle" aria-label="Hustle: tap or hold to make everyone work faster">
    <span class="hs-gauge"><svg class="hs-ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="hs-track" cx="20" cy="20" r="17"/><circle class="hs-prog" cx="20" cy="20" r="17" pathLength="100"/></svg>${icon('bolt')}</span>
    <span class="hs-txt"><b>Hustle</b><span class="hs-sub">Tap or hold to speed everyone up</span></span><span class="hs-x">×1.0</span></button>` : '');
  // Revenue per five minutes over the last hour, oldest first; the last bucket is the one filling now.
  function trendBuckets() {
    const b = Math.floor(now() / 300e3);
    const out = Array.from({ length: 12 }, (_, i) => ({ from: (b - 11 + i) * 300e3, v: 0 }));
    for (const [k, x] of S.stats.minRevenue) { const i = Math.floor(k / 5) - (b - 11); if (i >= 0 && i < 12) out[i].v += x; }
    return out;
  }
  const clock = t => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  function trendHtml() {
    const b = trendBuckets();
    const max = Math.max(...b.map(x => x.v), 1e-9);
    return `<div class="trend" role="img" aria-label="Revenue per five minutes, last hour">${b.map((x, i) => {
      const label = `${clock(x.from)}–${i === 11 ? 'now' : clock(x.from + 5 * 60e3)}: ${money(x.v)}`;
      return `<span class="tb ${i === 11 ? 'now' : ''}" tabindex="0" data-tip="${esc(label)}" aria-label="${esc(label)}"><i style="height:${x.v ? Math.max(4, 100 * x.v / max) : 0}%"></i></span>`;
    }).join('')}<div class="trend-tip hidden"></div></div>
      <details class="ch-table"><summary>Table</summary><table class="table"><thead><tr><th>Five minutes from</th><th class="num">Revenue</th></tr></thead><tbody>
        ${b.slice().reverse().map(x => `<tr><td>${esc(clock(x.from))}</td><td class="num">${money(x.v)}</td></tr>`).join('')}</tbody></table></details>`;
  }
  function hudCard() {
    const today = S.stats.dayRevenue[E.dayKey(now())] || 0;
    const auto = E.lvl('pmo')
      ? `<span class="toggle ${S.settings.autopilot ? 'on' : ''}" data-act="setting" data-key="autopilot"><span class="sw"></span>Autopilot${S.settings.autopilot ? ': the team keeps working while you are away' : ' is off'}</span>`
      : `<span class="muted small hud-auto">${icon('robot')}Want it to run itself? A <a data-act="nav" data-view="office">Project office</a> adds autopilot${E.zoneOpen('meeting') ? '' : ' (opens at the Seed round)'}.</span>`;
    return `<div class="card hud">
      <div class="hud-main"><div class="muted small">Budget</div><div class="hud-cash" data-cash>${cashText(S.cash)}</div>
        <div class="hud-sub small"><span class="hud-rate" data-rate>${rateText(E.rate())}</span><span>Today <b data-today>${money(today)}</b></span><span>Last hour <b data-hour>${money(E.lastHour())}</b></span></div></div>
      <div class="hud-trend"><div class="muted small">Revenue per 5 minutes</div>${trendHtml()}</div>
      ${hustleBtn('big')}
      <div class="hud-foot">${auto}</div></div>`;
  }

  function floorModel() {
    const zones = {};
    for (const [z, info] of Object.entries(D.ZONES)) zones[z] = S.funding >= info.funding ? null : `Opens at ${D.FUNDING[info.funding].name}`;
    return { lv: S.office, zones, desks: Math.min(A.DESK_COUNT, 4 + 2 * E.lvl('desks')), building: S.builds.map(b => b.id) };
  }
  let floorCache = { key: '', svg: '' };
  // big: the Office page's view, which phones scroll sideways.
  function floorHtml(big) {
    const m = floorModel();
    const key = JSON.stringify(m);
    if (key !== floorCache.key) floorCache = { key, svg: A.floor(m) };
    const labels = Object.entries(D.ZONES).map(([z, info]) => {
      const p = A.zoneSpot(z), round = S.funding < info.funding ? D.FUNDING[info.funding].name : '';
      return `<span class="fp-zone ${round ? 'locked' : ''}" style="left:${p.x}%;top:${p.y}%">${round ? icon('lock') : ''}<b>${esc(info.name)}</b>${round ? `<span title="Opens at ${esc(round)}">${esc(round)}</span>` : ''}</span>`;
    }).join('');
    return `<div class="floor-wrap ${big ? 'big' : ''}" data-key="${hashStr(key + big)}"><div class="floor" style="aspect-ratio:${A.FLOOR_W} / ${A.FLOOR_H}">
      <div class="floor-bg">${floorCache.svg}</div><div class="floor-labels">${labels}</div><div class="floor-people" data-floor></div></div></div>`;
  }
  const hashStr = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  // Where someone is in the office, the icon over their head, and whether they are typing.
  function personSpot(id, idx, desks) {
    const t = now();
    const st = S.staff[id];
    const phase = (hashStr(id) + Math.floor(t / (7 * 60e3))) % 10;
    const pending = S.inbox.some(m => m.from === id && m.choices && !m.done);
    const desk = idx < desks ? A.spot('desk', idx) : null;
    if (E.PEOPLE[id].noWork) return { p: A.spot(E.zoneOpen('lounge') && phase < 6 ? 'lounge' : 'coffee', idx), b: 'paw' };
    if (E.resting(id)) return { p: A.spot(E.zoneOpen('lounge') ? 'lounge' : 'coffee', idx), b: 'sleep' };
    const w = S.ws.find(x => x && x.team.includes(id));
    if (w) {
      if (t >= w.end) return { p: desk || A.spot('coffee', idx), b: 'check' };
      if (w.team.length > 1 && E.lvl('rooms') > 0 && phase < 3) return { p: A.spot('meeting', (S.ws.indexOf(w) % E.lvl('rooms')) * 4 + w.team.indexOf(id)), b: 'talk' };
      return { p: desk || A.spot('coffee', idx), b: pending ? 'dots' : E.hustleLevel() > 0.05 ? 'flame' : '', work: !!desk };
    }
    if (pending) return { p: desk || A.spot('coffee', idx), b: 'dots' };
    if (!desk || phase < 3) return { p: A.spot('coffee', idx), b: 'breaks' };
    return { p: desk, b: st.mood < 35 ? 'cloud' : '' };
  }
  const todOf = h => (h >= 20 || h < 6 ? 'night' : h < 8 ? 'dawn' : h >= 17 ? 'dusk' : 'day');
  function updateFloors() {
    const roots = $$('[data-floor]');
    if (!roots.length) return;
    const desks = floorModel().desks;
    const ids = E.owned();
    const hot = E.hustleLevel() > 0.05;
    const d = new Date(), h = d.getHours(), mins = d.getMinutes();
    for (const root of roots) {
      const fl = root.closest('.floor');
      fl.dataset.tod = todOf(h);
      const hh = fl.querySelector('.fp-hh'), mh = fl.querySelector('.fp-mh');
      if (hh && mh) { hh.setAttribute('transform', `rotate(${(h % 12) * 30 + mins / 2} 176 24)`); mh.setAttribute('transform', `rotate(${mins * 6} 176 24)`); }
      for (const el of [...root.children]) if (!S.staff[el.dataset.id]) el.remove();
      ids.forEach((id, idx) => {
        const { p, b, work } = personSpot(id, idx, desks);
        const pos = p.x.toFixed(2) + ',' + p.y.toFixed(2);
        let el = root.querySelector(`[data-id="${id}"]`);
        if (!el) {
          el = document.createElement('button');
          el.className = 'fp-person';
          el.dataset.act = 'profile';
          el.dataset.id = id;
          el.title = who(id).name;
          el.innerHTML = `<span class="fp-fig">${av(id)}</span><span class="fp-bubble"></span>`;
          root.appendChild(el);
        } else if (el.dataset.pos !== pos) {
          // Walk over: the move is a CSS transition, with a little hop while it lasts.
          el.classList.add('walk');
          clearTimeout(el.walkTimer);
          el.walkTimer = setTimeout(() => el.classList.remove('walk'), 1600);
        }
        el.dataset.pos = pos;
        el.style.left = p.x + '%';
        el.style.top = p.y + '%';
        el.style.zIndex = Math.round(p.y * 10);
        el.classList.toggle('work', !!work);
        el.classList.toggle('hot', !!work && hot);
        if (el.dataset.b !== b) {
          el.dataset.b = b;
          const bub = el.querySelector('.fp-bubble');
          bub.className = 'fp-bubble b-' + b;
          bub.innerHTML = b ? icon(b) : '';
        }
      });
    }
  }

  function commitChip() {
    if (!E.unlocked('commit') || !S.commit) return '';
    const c = S.commit;
    if (c.tier === null) return `<button class="commit" data-act="nav" data-view="inbox">${icon('target')}<b>Set today's ${c.ipo ? 'guidance' : 'commitment'}</b></button>`;
    const pips = Array.from({ length: Math.min(c.target, 24) }, (_, i) => `<i class="${i < c.progress ? 'on' : ''}"></i>`).join('');
    return `<div class="commit ${c.paid ? 'done' : ''}">${icon('target')}<b>${esc(E.commitName(c.tier))}</b><span class="pips">${pips}</span><span>${Math.min(c.progress, c.target)}/${c.target}${c.paid ? ' ✓' : ''}</span></div>`;
  }

  // ================================================================ views

  const VIEWS = {};

  function greeting() {
    const h = new Date().getHours();
    return `Good ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}${S.name ? ', ' + esc(S.name) : ''}`;
  }
  const NEXT_ICON = { signoff: 'check', inbox: 'inbox', quickstart: 'play', projects: 'projects', office: 'office', hiring: 'gift', home: 'hourglass', breaks: 'breaks', investors: 'investors' };
  function nextCard() {
    const step = E.nextStep();
    let btn = '';
    if (step.action === 'signoff') btn = `<button class="btn primary" data-act="signoffAll" data-coach="next">Sign off${step.count > 1 ? ` all (${step.count})` : ''}</button>`;
    else if (step.action === 'quickstart') btn = `<button class="btn primary" data-act="start" data-offer="${step.offer}" data-coach="next">Start a project</button>`;
    else if (step.action === 'inbox') btn = '<button class="btn primary" data-act="nav" data-view="inbox" data-coach="next">Open inbox</button>';
    else if (step.action === 'projects') btn = '<button class="btn primary" data-act="nav" data-view="projects" data-coach="next">Go to projects</button>';
    else if (step.action === 'office') btn = '<button class="btn primary" data-act="nav" data-view="office" data-coach="next">Open the office</button>';
    else if (step.action === 'hiring') btn = '<button class="btn primary" data-act="nav" data-view="hiring" data-coach="next">Open Hiring</button>';
    else if (step.action === 'breaks') btn = '<button class="btn primary" data-act="nav" data-view="breaks" data-coach="next">Take a break</button>';
    else if (step.action === 'investors') btn = '<button class="btn primary" data-act="nav" data-view="investors" data-coach="next">Open Investors</button>';
    else if (step.wait && step.slot >= 0 && E.unlocked('rush') && S.shots >= 1) btn = `<button class="btn rush" data-act="rush" data-slot="${step.slot}" data-coach="next">${icon('breaks')}Rush it</button>`;
    return `<div class="card next"><div class="next-ico">${icon(NEXT_ICON[step.action] || 'play')}</div><div class="grow"><div class="muted small">Next step</div><b>${esc(step.text)}</b>
      ${step.at ? `<div class="muted small" data-eta="${step.at}"></div>` : ''}</div>${btn}</div>`;
  }
  function installCard() {
    if (!compact() || isStandalone() || S.settings.installHint === false || S.tut !== -1) return '';
    return `<div class="card next install"><div class="next-ico">${icon('install')}</div><div class="grow"><b>Install Workforce on this phone</b><div class="muted small">Full-screen from your home screen, works offline.</div></div>
      <button class="btn primary" data-act="install">Install</button><button class="btn" data-act="dismissInstall">Not now</button></div>`;
  }
  function inboxPreview() {
    const items = S.inbox.filter(m => m.choices && !m.done).slice(0, 3);
    const list = items.length ? items : S.inbox.slice(0, 3);
    if (!list.length) return '<p class="muted small">Quiet for now. Your team will message you when they need you.</p>';
    return `<div class="msgs">${list.map(m => msgCard(m, true)).join('')}</div>`;
  }

  function breaksCard() {
    if (!E.unlocked('breaks')) return '';
    const ready = E.gamesReady();
    const items = Object.entries(D.GAMES).map(([k, g]) => {
      const on = ready.includes(k);
      const sub = on ? 'Ready' : k === 'word' ? 'Done for today' : `in ${fmtDur((E.gameReadyAt(k) - now()) / 1000)}`;
      return `<button class="break-btn ${on ? 'on' : ''}" data-act="game" data-g="${k}"><span class="bi">${icon(GAME_ICON[k])}</span><span><b>${esc(g.name)}</b><span class="muted small">${sub}</span></span></button>`;
    }).join('');
    return `<div class="card"><div class="card-title">Breaks <span class="muted small">· quick games that pay out boosts</span><span class="spacer"></span>${boostHtml()}</div><div class="break-row">${items}</div></div>`;
  }
  const GAME_ICON = { word: 'tiles', inbox: 'tray', stack: 'tower' };

  VIEWS.home = () => `
    <div class="page-head"><div><div class="muted small">${greeting()}</div><h1>Home</h1></div>${tickerChip()}${commitChip()}</div>
    ${S.tut === -1 ? hudCard() : ''}
    ${nextCard()}
    ${installCard()}
    <div class="home-grid">
      <div class="card home-floor"><div class="card-title">Atlas HQ <span class="muted small">· ${D.FUNDING[S.funding].name}</span><span class="spacer"></span><button class="btn sm ghost" data-act="nav" data-view="office">Upgrade</button></div>${floorHtml()}</div>
      <div class="home-side">
        <div class="card"><div class="card-title">Projects in flight<span class="spacer"></span>${shotsHtml()}<button class="btn sm ghost" data-act="nav" data-view="projects">All offers</button></div>${wsList()}</div>
        ${breaksCard()}
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
      <div class="offer-facts"><span class="chip">${icon('clock')}${fmtDur(o.dur)}</span><span class="chip">${icon('team')}${D.SIZES[o.size].staff} · ${D.SIZES[o.size].name}</span>${o.needs.map(roleChip).join('')}</div>
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
    <div class="page-head"><div><div class="muted small">${busy}/${E.wsCount()} workstreams busy${E.wsCount() < 5 ? ' · more with meeting rooms' : ''}</div><h1>Projects</h1></div>${shotsHtml()}${boostHtml()}
      <div class="actions"><button class="btn" data-act="refresh" ${cd > 0 ? 'disabled' : ''}>${cd > 0 ? `New offers in ${fmtDur(cd / 1000)}` : 'Refresh offers'}</button></div></div>
    <div class="card"><div class="card-title">In flight<span class="spacer"></span>${hustleBtn()}</div>${wsList()}</div>
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
      const target = { hiring: 'hiring', league: 'league', commit: 'inbox', gear: 'team', breaks: 'breaks' }[m.unlock];
      if (target && target !== 'inbox') cta = `<div class="choices"><button class="btn" data-act="nav" data-view="${target}">Open ${LABEL[target]}</button></div>`;
    }
    const cls = [pending ? 'pending' : '', m.read ? '' : 'unread', m.kind === 'outcome' ? (m.good ? 'outcome-good' : 'outcome-bad') : '', m.kind === 'funding' || m.kind === 'milestone' ? 'funding' : '', m.farewell ? 'farewell' : ''].join(' ');
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
    return `<button class="pcard ${p.r === 5 ? 'legend' : ''}" data-act="profile" data-id="${id}">${av(id, 'lg')}<div class="grow">
      <b>${esc(p.name)}</b><div class="muted small">${esc(jobTitle(id))}</div>
      <div class="pc-row">${band(p.r)}${st.stars ? starsHtml(st.stars) : ''}</div>
      ${p.ability ? `<div class="pc-row ability-tag">${icon('bolt')}${esc(p.ability.name)}</div>` : ''}
      <div class="pc-row"><span class="nowrap">Lvl ${st.lvl}</span><div class="bar thin"><div class="fill" style="width:${100 * st.xp / need}%"></div></div></div>
      <div class="pc-row">${A.moodFace(st.mood)}<span>${moodWord(st.mood)}</span>${heartsHtml(id)}</div>
      <div class="pc-row"><span class="status-tag ${s.cls}">${esc(s.text)}</span></div></div></button>`;
  }
  VIEWS.team = () => {
    const ids = E.owned().sort((a, b) => E.skill(b) - E.skill(a));
    return `<div class="page-head"><div><div class="muted small">${ids.length} ${ids.length === 1 ? 'person' : 'people'} · tap someone to see their profile</div><h1>Team</h1></div>
      ${E.unlocked('hiring') ? `<div class="actions"><button class="btn primary" data-act="nav" data-view="hiring">Hire${S.referrals >= 1 ? ` (${Math.floor(S.referrals)})` : ''}</button></div>` : ''}</div>
      <div class="people">${ids.map(personCard).join('')}</div>
      <p class="muted small">People level up by delivering projects. Happy, rested people with matching skills earn better reviews. Coffee chats build bonds, and bonds unlock their stories. Open someone's profile to let them go.</p>`;
  };

  VIEWS.hiring = () => {
    const w = E.rarityWeights();
    const tw = w.reduce((a, b) => a + b, 0);
    const fid = E.featured();
    const fp = E.PEOPLE[fid];
    const ws = E.weekStart(now()) + 7 * 86400e3;
    const refs = Math.floor(S.referrals);
    const pack = (kind) => {
      const pk = D.PACKS[kind];
      const can = pk.ticket ? S.tickets >= 1 : refs >= pk.cost;
      const cost = pk.ticket ? `${S.tickets} ticket${S.tickets === 1 ? '' : 's'}` : `${pk.cost} referral${pk.cost > 1 ? 's' : ''}`;
      return `<div class="pack ${kind}"><div class="pack-box">${A.box(kind)}</div><b>${esc(pk.name)}</b><span class="muted small">${esc(pk.desc)}</span>
        <button class="btn ${can ? 'primary' : ''}" data-act="pack" data-k="${kind}" ${can ? '' : 'disabled'} data-coach="pack-${kind}">Open · ${cost}</button></div>`;
    };
    const dir = D.PEOPLE.map(p => {
      const st = S.staff[p.id];
      const gone = !st && S.alumni[p.id];
      return `<div class="dir-p ${st ? '' : 'no'} ${p.r === 5 ? 'legend' : ''}"><span class="av lg">${A.avatar(p.look, { mono: !st })}</span><b>${st || gone ? esc(p.name) : '???'}</b>${band(p.r)}<span class="muted">${st ? (st.stars ? starsHtml(st.stars) : 'Lvl ' + st.lvl) : gone ? 'Alumni' : esc(D.ROLES[p.role].name)}</span></div>`;
    }).join('');
    return `<div class="page-head"><div><div class="muted small">${refs} referral${refs === 1 ? '' : 's'}${S.tickets ? ` · ${S.tickets} Headhunter ticket${S.tickets > 1 ? 's' : ''}` : ''} · you only find out who you hired when you open the box</div><h1>Hiring</h1></div></div>
      <div class="card featured"><div class="feat-art">${A.splash(fp.look, 5)}</div><div class="grow"><div class="muted small">Featured Legend · until ${new Date(ws).toLocaleDateString(undefined, { weekday: 'long' })}</div>
        <b class="fname">${esc(fp.name)}</b> <span class="muted small">${esc(fp.title)}</span>${band(5)}${abilityHtml(fp)}
        <div class="muted small">Half of all Legend hires this week are ${esc(fp.name.split(' ')[0])}.${S.staff[fid] ? ' Already on your team: another copy is a promotion.' : ''}</div></div></div>
      <div class="packs">${pack('single')}${pack('fair')}${S.tickets ? pack('legend') : ''}</div>
      <div class="grid2">
        <div class="card"><div class="card-title">How it works</div><p class="small" style="margin-top:0">Every box holds one candidate. Someone new joins the team. Someone you already have gets <b>promoted</b> instead: each promotion star is +25% skill, up to five.</p>
          <p class="muted small">Referrals come from your daily commitment, the daily word, the weekly league, five-star reviews and the odd decision. Legends also come with the IPO and big market-cap milestones.</p></div>
        <div class="card"><div class="card-title">Odds</div><table class="table"><tbody>${D.RARITY.map((r, i) => `<tr><td>${band(i)}</td><td class="num">${(100 * w[i] / tw).toFixed(1)}%</td></tr>`).join('')}</tbody></table>
          <p class="muted small">Guaranteed: Staff or better within <b>${25 - S.pity}</b> boxes, Principal or better within <b>${60 - S.pityL}</b>, a Legend within <b>${70 - S.pityX}</b>.</p></div>
      </div>
      <div class="card"><div class="card-title">Directory <span class="muted small">${E.owned().length}/${D.PEOPLE.length} on the team</span></div><div class="dir">${dir}</div></div>`;
  };

  VIEWS.breaks = () => {
    const ready = E.gamesReady();
    const ws = E.wordState();
    const card = k => {
      const g = D.GAMES[k];
      const on = ready.includes(k);
      let status;
      if (k === 'word') status = ws.done ? (ws.won ? `Solved in ${ws.guesses.length} ✓${S.games.wordStreak > 1 ? ` · ${S.games.wordStreak}-day streak` : ''}` : 'Not today. New word tomorrow.') : `${6 - ws.guesses.length} tries left`;
      else status = (on ? 'Reward ready' : `Next reward in ${fmtDur((E.gameReadyAt(k) - now()) / 1000)} · play for fun meanwhile`) + (S.games.best[k] ? ` · best ${S.games.best[k]}` : '');
      const btn = k === 'word' && ws.done ? 'See result' : on ? 'Play' : 'Practise';
      return `<div class="card game-card ${on ? 'on' : ''}"><div class="game-ico">${icon(GAME_ICON[k])}</div><div class="grow"><b>${esc(g.name)}</b><div class="small">${esc(g.desc)}</div>
        <div class="muted small">Reward: ${esc(g.reward)} · ${esc(status)}</div></div><button class="btn ${on ? 'primary' : ''}" data-act="game" data-g="${k}" data-coach="game-${k}">${btn}</button></div>`;
    };
    return `<div class="page-head"><div><div class="muted small">Wellbeing · quick brain breaks that pay out boosts</div><h1>Breaks</h1></div>${shotsHtml()}${boostHtml()}</div>
      ${card('word')}${card('inbox')}${card('stack')}
      <p class="muted small">Espresso shots rush a running project. Revenue boosts stack: a new one adds time to the current one.</p>`;
  };

  // Price chart for the Investors page: the last 24 hours, or daily closes.
  let chartRange = '24h';
  function chartPoints() {
    const st = S.stock;
    let pts = chartRange === '24h' ? st.hist.slice() : st.days.map(([dk, v]) => [dayStart(dk), v]).concat([[now(), st.price]]);
    if (chartRange === '24h' && pts[pts.length - 1][0] < now() - 1000) pts.push([now(), st.price]);
    if (pts.length < 2) pts = [[pts[0][0] - 600e3, pts[0][1]], pts[0]];
    return pts;
  }
  const dayStart = dk => { const [y, m, d] = dk.split('-').map(Number); return new Date(y, m - 1, d, 17).getTime(); };
  const timeLabel = t => (chartRange === '24h' ? new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  VIEWS.investors = () => {
    const st = S.stock;
    if (!st) return '<p class="muted">Investors opens when Atlas goes public.</p>';
    const day = st.price / st.open - 1;
    const since = st.price / st.ipoPrice - 1;
    const cap = E.marketCap();
    const next = E.capStep(st.capIdx), prevStep = st.capIdx > 0 ? E.capStep(st.capIdx - 1) : 0;
    const nextName = E.capName(st.capIdx);
    const tg = E.acqTarget();
    const pts = chartPoints();
    const c = S.commit;
    const guidance = !c ? '' : c.tier === null
      ? `<button class="btn primary" data-act="nav" data-view="inbox">Set today's guidance</button>`
      : `<div class="small">Today's guidance: <b>${esc(E.commitName(c.tier))}</b> · ${Math.min(c.progress, c.target)}/${c.target} deliveries${c.paid ? ' · <span class="good">Beat ✓</span>' : ''}</div>`;
    return `<div class="page-head"><div><div class="muted small">Atlas Inc. · public since ${new Date(st.ipoAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div><h1>Investors</h1></div></div>
      <div class="card stock-card">
        <div class="stock-head"><div><div class="muted small">${st.ticker} · share price</div><div class="hero-price">${price(st.price)}</div>
          <div class="small"><span class="${upDown(day)}">${pct(day, 2)}</span> today · <span class="${upDown(since)}">${pct(since, 0)}</span> since IPO</div></div>
          <div class="stock-facts"><div><label>Market cap</label><b>${money(cap)}</b></div><div><label>All-time high</label><b>${price(st.ath)}</b></div><div><label>IPO price</label><b>${price(st.ipoPrice)}</b></div>${st.splits ? `<div><label>Splits</label><b>${st.splits}× 10-for-1</b></div>` : ''}</div></div>
        <div class="seg" role="tablist"><button class="${chartRange === '24h' ? 'on' : ''}" data-act="range" data-r="24h">24 hours</button><button class="${chartRange === '30d' ? 'on' : ''}" data-act="range" data-r="30d">30 days</button></div>
        <div class="chart" data-chart>${A.chart(pts, { fmt: v => '$' + (v >= 100 ? v.toFixed(0) : v.toFixed(2)), label: `${st.ticker} share price` })}
          <div class="ch-x"><span>${esc(timeLabel(pts[0][0]))}</span><span>Now</span></div></div>
        <details class="ch-table"><summary>Price table</summary><table class="table"><thead><tr><th>${chartRange === '24h' ? 'Time' : 'Day'}</th><th class="num">Price</th></tr></thead><tbody>
          ${pts.filter((_, i, a) => chartRange !== '24h' || i % 6 === 0 || i === a.length - 1).slice(-12).reverse().map(p => `<tr><td>${esc(timeLabel(p[0]))}</td><td class="num">${price(p[1])}</td></tr>`).join('')}</tbody></table></details>
      </div>
      <div class="grid2">
        <div class="card"><div class="card-title">Next milestone</div><div class="small"><b>${money(next)}</b> market cap${nextName ? ` · <b>${esc(nextName)}</b>` : ''}</div>
          <div class="bar" style="margin:8px 0"><div class="fill green" style="width:${clamp(100 * (Math.log(cap) - Math.log(prevStep || cap / 2)) / (Math.log(next) - Math.log(prevStep || cap / 2)), 2, 100)}%"></div></div>
          <p class="muted small" style="margin:0">Each milestone adds 5% revenue for good. Every power of ten also brings a Legend.</p></div>
        <div class="card"><div class="card-title">Earnings</div><p class="small" style="margin-top:0">After the IPO every day is a quarter: your daily commitment is the guidance you give Wall Street. Beat it and ATLS pops; miss it and it drops.</p>${guidance}</div>
      </div>
      <div class="card acq"><span class="logo lg">${A.logo(tg.name)}</span><div class="grow"><div class="muted small">Acquisition target · ${esc(tg.sector)} · ${esc(tg.city)}</div><b>${esc(tg.name)}</b>
        <div class="small">Revenue +15% for good${st.acq ? ` · you own ${st.acq} compan${st.acq === 1 ? 'y' : 'ies'} (+${Math.round(st.synergy * 100)}%)` : ''}</div></div>
        <button class="btn ${S.cash >= tg.price ? 'primary' : ''}" data-act="acquire" ${S.cash >= tg.price ? '' : 'disabled'}>Buy · ${money(tg.price)}</button></div>
      <div class="card"><div class="card-title">News</div><ul class="feed news">${st.feed.map(f => `<li><span class="t">${ago(f.t)}</span><span class="grow">${esc(f.text)}</span>${f.pct ? `<span class="${upDown(f.pct)} nowrap">${pct(f.pct, 0)}</span>` : ''}</li>`).join('') || '<li class="muted">Quiet day on the market.</li>'}</ul></div>`;
  };

  VIEWS.office = () => {
    const builds = S.builds.map(b => {
      const o = E.OFFICE[b.id];
      return `<div class="ws"><div class="ws-ico">${icon('crane')}</div><div class="grow"><b>${esc(o.name)}</b> → level ${E.lvl(b.id) + 1}
        <div class="bar"><div class="fill" data-bprog="${b.id}" style="width:${clamp((now() - b.start) / (b.end - b.start), 0, 1) * 100}%"></div></div><div class="muted small" data-beta="${b.id}"></div></div></div>`;
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
            <span class="muted small">${zoneLocked ? '' : block && block !== 'Not enough budget' ? esc(block) : icon('clock') + fmtDur(E.buildTime(o.id))}</span></div>`}</div>`;
      }).join('');
    }).join('');
    return `<div class="page-head"><div><div class="muted small">${money(S.cash)} budget · ${E.crews()} build crew${E.crews() > 1 ? 's' : ''}</div><h1>Office</h1></div></div>
      <div class="card office-hero"><div class="card-title">Atlas HQ <span class="muted small">· ${D.FUNDING[S.funding].name} · ${E.owned().length} ${E.owned().length === 1 ? 'person' : 'people'}</span></div>${floorHtml(true)}<div class="muted small swipe-hint">Swipe sideways to look around the office.</div></div>
      ${builds ? `<div class="card"><div class="card-title">Under construction<span class="spacer"></span>${hustleBtn()}</div><div class="builds">${builds}</div></div>` : ''}
      <div class="upgrades">${upg}</div>`;
  };

  VIEWS.league = () => {
    if (!S.league) return '<p class="muted">The league starts soon.</p>';
    const rows = E.standings();
    const daysLeft = (S.league.end - now()) / 86400e3;
    const n = rows.length;
    return `<div class="page-head"><div><div class="muted small">Ends in ${daysLeft >= 1 ? Math.floor(daysLeft) + 'd ' : ''}${fmtDur(((S.league.end - now()) % 86400e3) / 1000)}</div><h1>League</h1></div></div>
      <div class="card"><div class="league-head"><div class="league-badge">${icon('league')}</div><div><div class="muted small">This week</div><b style="font-size:18px">${D.LEAGUES[S.leagueTier]} league</b>
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
      <div class="card"><div class="card-title">Company stats</div><div class="stat-grid">
        <div class="stat"><label>Lifetime revenue</label><b>${money(S.lifetime)}</b></div>
        <div class="stat"><label>Best day</label><b>${money(S.stats.bestDay)}</b></div>
        <div class="stat"><label>Billed while working</label><b>${money(S.stats.billed)}</b></div>
        <div class="stat"><label>Time saved hustling</label><b>${fmtDur(S.stats.hustled)}</b></div>
        <div class="stat"><label>Calls answered</label><b>${fmt(S.stats.calls)}</b></div>
        <div class="stat"><label>Autopilot deliveries</label><b>${fmt(S.stats.autoDelivered)}</b></div>
        <div class="stat"><label>Espresso shots used</label><b>${fmt(S.stats.rushes)}</b></div>
        <div class="stat"><label>Inbox Zero best</label><b>${fmt(S.games.best.inbox || 0)}</b></div>
        <div class="stat"><label>Stack best</label><b>${fmt(S.games.best.stack || 0)} floors</b></div>
      </div></div>
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
      <p class="small" style="margin-top:0">Projects run in real time, even with this tab closed. Check in whenever suits you: sign off deliveries, answer your team, start the next project. Waiting on something? Hold Hustle to speed everyone up, rush it with an espresso shot, or take a break: the mini-games pay out boosts.</p>
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
      if (view === 'settings' || chartActive) return false;
    }
    const y = window.scrollY;
    const oldFloor = root.querySelector('.floor-wrap');
    const oldScroll = oldFloor ? oldFloor.scrollLeft : 0;
    root.innerHTML = VIEWS[view]();
    const newFloor = root.querySelector('.floor-wrap');
    // Moving the element back resets its scroll, so that is put back too. Phones start on the open plan.
    if (oldFloor && newFloor && oldFloor.dataset.key === newFloor.dataset.key) { newFloor.replaceWith(oldFloor); oldFloor.scrollLeft = oldScroll; }
    else if (newFloor) newFloor.scrollLeft = oldScroll || (newFloor.scrollWidth - newFloor.clientWidth) / 2;
    if (!force) window.scrollTo(0, y);
    updateFloors();
    live();
    return true;
  }

  // ================================================================ live updates (every second)

  let lastReady = '', lastReadyToast = '';
  function live() {
    const t = now();
    $$('[data-eta]').forEach(el => {
      const at = +el.dataset.eta;
      el.textContent = at > t ? `${fmtDur((at - t) / 1000)} to go` : 'Done';
    });
    updateCoach();
  }
  const toGo = x => (x ? (x.end > now() ? `${fmtDur((x.end - now()) / 1000)} to go` : 'Done') : '');
  // Money, progress bars and the hustle meter move every animation frame (billing and hustle are
  // continuous); the smaller text around them is refreshed four times a second.
  let lastSlow = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden || !$('#decoy').classList.contains('hidden')) return;
    E.accrue();
    const t = now();
    const prog = x => clamp((t - x.start) / (x.end - x.start), 0, 1) * 100 + '%';
    for (const el of $$('[data-progress]')) { const w = S.ws[+el.dataset.progress]; if (w) el.style.width = prog(w); }
    for (const el of $$('[data-bprog]')) { const b = S.builds.find(x => x.id === el.dataset.bprog); if (b) el.style.width = prog(b); }
    const cash = cashText(S.cash);
    for (const el of $$('[data-cash]')) {
      el.textContent = cash;
      el.classList.toggle('long', cash.length > 12);
      el.classList.toggle('xlong', cash.length > 16);
    }
    const lvl = E.hustleLevel(t);
    for (const b of $$('button.hustle')) {
      b.querySelector('.hs-prog').style.strokeDashoffset = 100 - 100 * lvl;
      b.querySelector('.hs-x').textContent = '×' + (1 + (D.BALANCE.hustleMax - 1) * lvl).toFixed(1);
      b.classList.toggle('hot', lvl > 0.95);
    }
    if (t - lastSlow < 250) return;
    lastSlow = t;
    $('#cashChip').textContent = money(S.cash);
    for (const el of $$('[data-rate]')) el.textContent = rateText(E.rate(t));
    for (const el of $$('[data-today]')) el.textContent = money(S.stats.dayRevenue[E.dayKey(t)] || 0);
    for (const el of $$('[data-hour]')) el.textContent = money(E.lastHour(t));
    for (const el of $$('[data-wseta]')) el.textContent = toGo(S.ws[+el.dataset.wseta]);
    for (const el of $$('[data-billed]')) { const w = S.ws[+el.dataset.billed]; el.textContent = w && w.billed ? ` · ${money(w.billed)} billed` : ''; }
    for (const el of $$('[data-beta]')) el.textContent = toGo(S.builds.find(x => x.id === el.dataset.beta));
  }
  // Hustle: a tap gives one push and holding keeps pushing. Sparks fly off the gauge unless stealth mode is on.
  function hustleTap(btn) {
    if (!E.hustle() || S.settings.stealth || !btn) return;
    btn.classList.remove('tap');
    void btn.offsetWidth;
    btn.classList.add('tap');
    const g = btn.querySelector('.hs-gauge');
    for (let i = 0; i < 3; i++) {
      const sp = document.createElement('i');
      const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 20;
      sp.className = 'spark';
      sp.style.setProperty('--dx', (Math.cos(a) * r).toFixed(1) + 'px');
      sp.style.setProperty('--dy', (Math.sin(a) * r).toFixed(1) + 'px');
      g.appendChild(sp);
      setTimeout(() => sp.remove(), 600);
    }
  }
  // Hover and focus readout for the revenue trend bars.
  function trendTip(tb, show) {
    const box = tb.closest('.trend'), tip = box && box.querySelector('.trend-tip');
    if (!tip) return;
    if (!show) { tip.classList.add('hidden'); return; }
    const [when, value] = tb.dataset.tip.split(': ');
    const b = document.createElement('b'), sp = document.createElement('span');
    b.textContent = value;
    sp.textContent = when;
    tip.replaceChildren(b, sp);
    tip.classList.remove('hidden');
    tip.style.left = clamp(tb.offsetLeft + tb.offsetWidth / 2, tip.offsetWidth / 2, box.clientWidth - tip.offsetWidth / 2) + 'px';
  }

  // --- incoming calls: one rings for 15 seconds now and then while you're here
  const RING_MS = 15000;
  let ringing = 0;
  function updateCall() {
    const el = $('#call');
    if (el.dataset.state === 'done') return;
    const c = E.callReady();
    if (!c) { ringing = 0; el.classList.add('hidden'); return; }
    if (!ringing) {
      if (!$('#overlay').classList.contains('hidden') || !$('#decoy').classList.contains('hidden') || document.hidden) return;
      ringing = now();
      el.innerHTML = `<span class="call-ico" aria-hidden="true">${icon('phone')}</span><div class="grow"><b>${esc(c.from)}</b><div class="muted small">Incoming call</div><div class="call-bar"><i></i></div></div>
        <button class="btn only" data-act="declineCall" aria-label="Decline">${icon('x')}</button><button class="btn primary" data-act="answerCall">Answer</button>`;
      el.classList.remove('hidden');
      buzz([40, 80, 40]);
    } else if (now() - ringing > RING_MS) {
      E.missCall();
      ringing = 0;
      el.classList.add('hidden');
      save();
    }
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
    stopInbox();
    stopStack();
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
      out.push(`<div class="extra gold">${icon('medal')}<span><b>Career level ${r.career}</b> · ${esc(title)}</span></div>`);
    }
    if (r.commitDone) out.push(`<div class="extra gold">${icon('target')}<span><b>Daily commitment hit!</b> Rewards are in your inbox.</span></div>`);
    for (const it of r.items) {
      out.push(it.sold
        ? `<div class="extra">${A.gearIcon(it.slot, it.r)}<span>${esc(D.GEAR[it.slot].items[it.r])} sold to IT surplus</span></div>`
        : `<div class="extra">${A.gearIcon(it.slot, it.r)}<span><b>${esc(D.GEAR[it.slot].items[it.r])}</b> for ${esc(who(it.owner).first)} (+${it.pct}% skill)</span></div>`);
    }
    if (r.instant) out.push(`<div class="extra gold">${icon('bolt')}<span><b>${esc(who(r.team.find(id => E.PEOPLE[id].ability && E.PEOPLE[id].ability.id === 'warp')).first)}</b> delivered it the moment it started</span></div>`);
    if (r.refs) out.push(`<div class="extra">${icon('hiring')}<span>The client referred someone. <b>+1 referral</b></span></div>`);
    if (r.passed && r.passed.length) out.push(`<div class="extra">${icon('league')}<span>You passed <b>${r.passed.map(id => esc(who('rival:' + id).first)).join(', ')}</b> in the league</span></div>`);
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
      ${r.billed ? `<div class="muted small" style="text-align:center">On top of ${money(r.billed)} billed while the team worked</div>` : ''}
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
    const billed = results.reduce((a, r) => a + r.billed, 0);
    const avg = results.reduce((a, r) => a + r.stars, 0) / results.length;
    const ups = results.flatMap(r => r.levelups);
    const extras = results.map(extrasHtml).join('');
    openDialog(`<h3>${results.length} deliveries signed off</h3>
      <div class="money">+${money(total)}</div><div class="muted small" style="text-align:center">Average rating ${avg.toFixed(1)}★${billed ? ` · on top of ${money(billed)} billed while the team worked` : ''}</div>
      <ul class="feed" style="margin-top:12px">${results.map(r => `<li><span class="logo" style="width:22px;height:22px">${A.logo(r.offer.client)}</span><span class="grow">${esc(r.offer.client)} · ${esc(r.offer.name)}</span><span class="stars">${'★'.repeat(r.stars)}</span></li>`).join('')}</ul>
      ${ups.length ? `<div class="extras">${ups.map(u => `<div class="extra">${av(u.id, 'sm')}<span><b>${esc(who(u.id).first)}</b> reached level ${u.to}</span></div>`).join('')}</div>` : ''}
      <div class="extras">${extras}</div>
      <div class="actions"><button class="btn primary" data-act="closeDialog">Done</button></div>`);
  }

  // --- blind boxes
  let boxes = [];
  function showPack(kind, res) {
    boxes = res.map(x => Object.assign({ opened: false }, x));
    const pk = D.PACKS[kind];
    openDialog(`<h3>${esc(pk.name)}</h3><div class="muted small">${res.length > 1 ? 'Tap a box to open it, or open them all.' : 'Tap the box to open it.'}</div>
      <div class="boxes n${res.length}">${res.map((x, i) => boxHtml(kind, x, i)).join('')}</div>
      <div class="box-sum small" id="boxSum"></div>
      <div class="actions">${res.length > 1 ? '<button class="btn" data-act="openAll">Open all</button>' : ''}<button class="btn primary" data-act="closeDialog">Done</button></div>`, { cls: 'pack-dialog' });
    if (S.settings.stealth) boxes.forEach((_, i) => openBox(i, true));
  }
  function boxHtml(kind, x, i) {
    const p = E.PEOPLE[x.id];
    const line = x.kind === 'new' ? `<span class="good"><b>${x.back ? 'Welcome back!' : 'New hire!'}</b></span>` : x.kind === 'star' ? `<span>Promoted to ${'★'.repeat(x.stars)}</span>` : `<span class="muted">Signing bonus ${money(x.cash)}</span>`;
    return `<button class="bbox r${x.r}" data-act="openBox" data-i="${i}" aria-label="Open box ${i + 1}"><span class="bbox-box">${A.box(kind)}</span>
      <span class="bbox-card r${p.r}">${p.r === 5 ? '<span class="burst"></span><span class="legend-tag">LEGEND</span>' : ''}${av(x.id, 'lg')}<b>${esc(p.name)}</b>${band(p.r)}${line}${p.ability && x.kind === 'new' ? `<span class="ab">${icon('bolt')}${esc(p.ability.name)}</span>` : ''}</span></button>`;
  }
  function openBox(i, instant) {
    const b = boxes[i];
    const el = $(`.bbox[data-i="${i}"]`);
    if (!b || b.opened || !el) return;
    b.opened = true;
    if (instant) { el.classList.add('open'); boxSummary(); return; }
    // Principal and Legend boxes charge up for longer, then open into a full-screen reveal.
    const rare = b.r >= 4;
    el.classList.add(rare ? 'charge' : 'shake');
    setTimeout(() => {
      el.classList.add('open');
      if (b.r === 3) buzz([20, 40, 20]);
      boxSummary();
      if (rare && document.body.contains(el)) rareSplash(b);
    }, rare ? 1300 : b.r === 3 ? 700 : 450);
  }

  // --- the reveal for rare hires: splash art, name, ability. Several queue up behind each other.
  const splashQueue = [];
  let splashAt = 0;
  function rareSplash(x) {
    if (S.settings.stealth) return;
    splashQueue.push(x);
    if (splashQueue.length === 1) return showSplash();
    const btn = $('#splash .sp-go');
    if (btn) btn.textContent = `Next (${splashQueue.length - 1} more)`;
  }
  function showSplash() {
    const x = splashQueue[0], el = $('#splash');
    if (!x) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    const p = E.PEOPLE[x.id];
    const line = x.kind === 'new' ? (x.back ? 'Welcome back' : 'New hire') : x.kind === 'star' ? `Promoted to ${'★'.repeat(x.stars)}` : `Signing bonus ${money(x.cash)}`;
    const colors = p.r === 5 ? ['#ffe066', '#ff8787', '#da77f2', '#74c0fc', '#8ce99a'] : ['#ffd27a', '#ffb347', '#fff3c4'];
    const bits = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2 + Math.random() * 0.4, r = 120 + Math.random() * 200;
      return `<i style="--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r).toFixed(0)}px;--d:${(Math.random() * 0.3).toFixed(2)}s;--c:${pick(colors)}"></i>`;
    }).join('');
    el.className = `splash r${p.r}`;
    el.setAttribute('aria-label', `${D.RARITY[p.r].name}: ${p.name}`);
    el.innerHTML = `<div class="sp-flash"></div><div class="sp-bits" aria-hidden="true">${bits}</div>
      <div class="sp-stage"><div class="sp-card"><div class="sp-art">${A.splash(p.look, p.r)}</div>${p.r === 5 ? '<span class="sp-ribbon">Legend</span>' : ''}</div>
        <div class="sp-info"><div class="sp-kicker">${esc(D.RARITY[p.r].name)} · ${esc(line)}</div><div class="sp-name">${esc(p.name)}</div><div class="sp-title">${esc(jobTitle(x.id))}</div>
          ${p.ability ? `<div class="sp-ab">${icon('bolt')}<span><b>${esc(p.ability.name)}</b> ${esc(p.ability.desc)}</span></div>` : ''}
          <div class="sp-quote">“${esc(p.catch)}”</div></div></div>
      <button class="sp-go" data-act="splashNext">${splashQueue.length > 1 ? `Next (${splashQueue.length - 1} more)` : 'Continue'}</button>`;
    el.classList.remove('hidden');
    splashAt = now();
    buzz(p.r === 5 ? [30, 60, 30, 60, 120] : [25, 50, 60]);
    setTimeout(() => { const btn = el.querySelector('.sp-go'); if (btn) btn.focus({ preventScroll: true }); }, 50);
  }
  function boxSummary() {
    const el = $('#boxSum');
    if (!el || boxes.length < 2 || boxes.some(b => !b.opened)) return;
    const n = k => boxes.filter(k).length;
    const parts = [[n(b => b.kind === 'new'), 'new hire'], [n(b => b.kind === 'star'), 'promotion'], [n(b => b.r === 5), 'Legend']].filter(([c]) => c);
    el.textContent = parts.map(([c, w]) => `${c} ${w}${c > 1 ? 's' : ''}`).join(' · ');
  }

  // --- IPO and market-cap milestones
  function showIPO(data) {
    openDialog(`<div class="ipo"><div class="ipo-bell" id="bell">${icon('bell')}</div><div class="muted small">Opening bell</div><h3>Atlas is a public company!</h3>
      <div class="ticker big static"><b>ATLS</b> ${price(data.price)} <span class="gain">▲ 15.0%</span></div>
      <p>From today every day is a fiscal quarter. Your daily commitment becomes the guidance you give Wall Street: beat it and ATLS pops, miss it and it drops. Keep growing and the market cap climbs. Forever.</p>
      <div class="extras"><div class="extra gold">${icon('gift')}<span>A <b>Legend</b> wants to join: open the Headhunter box in Hiring</span></div><div class="extra">${icon('investors')}<span><b>Investors</b> is open: share price, milestones and companies to buy</span></div></div>
      <div class="actions"><button class="btn" data-act="ringBell">Ring the bell</button><button class="btn primary" data-act="nav" data-view="investors">See the stock</button></div></div>`, { cls: 'ipo-dialog', queue: true });
  }
  function showCap(data) {
    openDialog(`<div class="profile-head">${av('ceo', 'xl')}<div><div class="muted small">Alex Rivera · CEO</div><h3>${esc(data.name || money(data.cap) + ' company')}!</h3></div></div>
      <p>ATLS just passed a <b>${money(data.cap)}</b> market cap.</p>
      <div class="extras"><div class="extra gold">${icon('investors')}<span>Brand value: revenue <b>+5%</b> for good</span></div><div class="extra gold">${icon('gift')}<span>A headhunter found another <b>Legend</b>. Open the box in Hiring.</span></div></div>
      <div class="actions"><button class="btn primary" data-act="closeDialog">Ring it in</button></div>`, { queue: true });
  }

  // --- breaks: daily word
  let wInput = '', wReward = null;
  function showWord() {
    wInput = '';
    openDialog(`<button class="dlg-x" data-act="closeDialog" aria-label="Close">×</button><h3>Daily word</h3><div class="muted small">Six tries. Green: right spot. Yellow: in the word, wrong spot. Same word as lintcheck in the terminal.</div>
      <div class="wgrid" id="wgrid"></div><div class="wmsg small" id="wmsg"></div><div class="kbd" id="kbd"></div><div class="actions" id="wact"></div>`, { cls: 'game-dialog word' });
    drawWord();
  }
  function drawWord(revealRow = -1) {
    const ws = E.wordState(), ans = E.wordAnswer();
    const rows = [];
    for (let r = 0; r < 6; r++) {
      const g = ws.guesses[r];
      const res = g ? E.scoreGuess(g, ans) : null;
      const letters = g || (r === ws.guesses.length && !ws.done ? wInput.padEnd(5) : '     ');
      rows.push(`<div class="wrow">${[...letters].map((ch, i) => `<span class="tile ${res ? 's' + res[i] : ch.trim() ? 'typed' : ''} ${r === revealRow ? 'flip' : ''}" ${r === revealRow ? `style="animation-delay:${i * 0.13}s"` : ''}>${ch.trim().toUpperCase()}</span>`).join('')}</div>`);
    }
    $('#wgrid').innerHTML = rows.join('');
    const best = {};
    ws.guesses.forEach(g => E.scoreGuess(g, ans).forEach((v, i) => { best[g[i]] = Math.max(best[g[i]] === undefined ? -1 : best[g[i]], v); }));
    $('#kbd').innerHTML = ws.done ? '' : ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'].map(row => `<div class="krow">${[...row].map(k => (k === '+' ? '<button class="key wide" data-act="wkey" data-k="enter">Enter</button>'
      : k === '-' ? '<button class="key wide" data-act="wkey" data-k="back" aria-label="Delete">⌫</button>'
        : `<button class="key ${best[k] === undefined ? '' : 's' + best[k]}" data-act="wkey" data-k="${k}">${k.toUpperCase()}</button>`)).join('')}</div>`).join('');
    if (ws.done) {
      const r = wReward;
      $('#wmsg').innerHTML = ws.won
        ? `<b class="good">Solved in ${ws.guesses.length}!</b> ${r ? `+${r.refs} referral${r.refs > 1 ? 's' : ''} and revenue +50% for ${r.boost} minutes.` : 'Come back tomorrow for a new word.'}`
        : `The word was <b>${ans.toUpperCase()}</b>. ${r ? 'Here is a small consolation boost.' : 'New word tomorrow.'}`;
      $('#wact').innerHTML = '<button class="btn" data-act="shareWord">Copy result</button><button class="btn primary" data-act="closeDialog">Done</button>';
    }
  }
  function wordKey(k) {
    const ws = E.wordState();
    if (ws.done || !$('#wgrid')) return;
    if (k === 'enter') {
      if (wInput.length < 5) { $('#wmsg').textContent = 'Five letters, please'; return; }
      const res = E.wordGuess(wInput);
      if (res.error) { $('#wmsg').textContent = res.error; return; }
      wInput = '';
      if (res.reward) wReward = res.reward;
      save();
      drawWord(ws.guesses.length - 1);
      buzz(res.won ? [20, 40, 20, 40, 60] : 8);
      if (res.done) renderNav();
      return;
    }
    if (k === 'back') wInput = wInput.slice(0, -1);
    else if (/^[a-z]$/.test(k) && wInput.length < 5) wInput += k;
    $('#wmsg').textContent = '';
    drawWord();
  }
  function copyText(text, done) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast(done), () => toast('Copy failed. Select the text instead.'));
    else toast('Copying needs a secure (https) page');
  }

  // --- breaks: shared end screen for the arcade games
  function gameEndHtml(kind, score, res, lines) {
    const g = D.GAMES[kind];
    const best = S.games.best[kind] || 0;
    const reward = !res || res.cooldown ? '<div class="muted small">Practice round, no reward this time.</div>'
      : kind === 'inbox' ? `<div class="extra gold">${icon('breaks')}<span>${res.shots ? `<b>+${res.shots} espresso shot${res.shots > 1 ? 's' : ''}</b>` : `No shots this time: score ${g.tiers[0]} or more to earn one`}</span></div>`
        : `<div class="extra gold">${icon('investors')}<span>Revenue <b>+50% for ${res.boost} minutes</b></span></div>`;
    const next = g.tiers.find(x => score < x);
    return `<div class="game-end"><div class="big-num">${score}</div><div class="grow"><div class="small"><b>${esc(g.unit)}</b>${res && res.best ? ' · <b class="good">New best!</b>' : ` · best ${best}`}</div>
      ${lines ? `<div class="muted small">${lines}</div>` : ''}${reward}
      ${next ? `<div class="muted small">${next - score} more ${esc(next - score === 1 ? g.unit.replace(/s$/, '') : g.unit)} for the next reward tier</div>` : ''}</div>
      <button class="btn primary" data-act="game" data-g="${kind}">Play again</button></div>`;
  }
  const practiceNote = kind => {
    const wait = E.gameReadyAt(kind) - now();
    return wait > 0 ? ` Practice round: the next reward is in ${fmtDur(wait / 1000)}.` : '';
  };

  // --- breaks: Inbox Zero. Notifications pop up on a 3×3 grid; tap them before they expire.
  let iz = null;
  const IZ_MS = 30000;
  function showInbox() {
    stopInbox();
    const g = D.GAMES.inbox;
    openDialog(`<button class="dlg-x" data-act="closeDialog" aria-label="Close">×</button><h3>Inbox Zero</h3>
      <div class="muted small game-intro">Tap each notification before it expires. Unbroken streaks multiply your points. The CEO ${icon('star')} scores triple, coffee ${icon('breaks')} adds two seconds, and phishing ${icon('hook')} costs points: leave it alone.${practiceNote('inbox')}</div>
      <div class="iz-top"><div class="bar thin grow"><div class="fill" id="izBar" style="width:100%"></div></div><span>Score <b id="izScore">0</b></span><span class="iz-combo" id="izCombo"></span></div>
      <div class="iz-grid" id="izGrid">${Array.from({ length: 9 }, (_, i) => `<button class="iz-cell" data-act="iz" data-i="${i}" aria-label="Slot ${i + 1}"><span class="iz-key">${i + 1}</span></button>`).join('')}
        <div class="iz-start" id="izStart"><button class="btn primary big" data-act="izStart">Start</button><div class="muted small">Rewards at ${g.tiers.join(' / ')} points · keys 1–9 work too</div></div></div>
      <div id="izEnd"></div>`, { cls: 'game-dialog iz-game' });
  }
  function stopInbox() { if (iz) iz.over = true; iz = null; }
  function izStart() {
    stopInbox();
    iz = { score: 0, combo: 0, bestCombo: 0, cleared: 0, missed: 0, phished: 0, t0: now(), end: now() + IZ_MS, next: now() + 400, cells: Array(9).fill(null), over: false };
    $('#izStart').classList.add('hidden');
    $('#dialog').classList.add('playing');
    $('#izEnd').innerHTML = '';
    $$('.iz-cell').forEach(c => { c.querySelectorAll('.iz-item').forEach(x => x.remove()); });
    const run = iz;
    const loop = () => { if (run.over || !document.body.contains($('#izGrid'))) return; izStep(run); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  function izStep(g) {
    const t = now();
    const k = clamp((t - g.t0) / IZ_MS, 0, 1); // 0 → 1 over the round: things speed up
    $('#izBar').style.width = clamp((g.end - t) / IZ_MS, 0, 1) * 100 + '%';
    g.cells.forEach((c, i) => {
      if (!c || t < c.dies) return;
      if (!c.kind.phish && !c.kind.bonus) { g.missed++; izCombo(g, 0); izFloat(i, 'missed', 'bad'); }
      izClear(g, i, 'gone');
    });
    if (t >= g.end) return izFinish(g);
    if (t >= g.next) {
      g.next = t + 780 - 450 * k;
      const free = g.cells.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
      if (free.length) {
        const kinds = Object.values(D.PINGS);
        let roll = Math.random() * kinds.reduce((a, x) => a + x.w, 0), kind = kinds[0];
        for (const x of kinds) { roll -= x.w; if (roll <= 0) { kind = x; break; } }
        const i = pick(free);
        const life = kind.life * (1 - 0.3 * k) * 1000;
        const el = document.createElement('span');
        el.className = `iz-item ${kind.phish ? 'phish' : ''} ${kind.pts > 1 ? 'vip' : ''} ${kind.bonus ? 'bonus' : ''}`;
        el.innerHTML = `<span class="iz-ico">${icon(kind.icon)}</span><span class="iz-txt">${esc(pick(kind.lines))}</span><i class="iz-life" style="animation-duration:${life}ms"></i>`;
        $(`.iz-cell[data-i="${i}"]`).appendChild(el);
        g.cells[i] = { kind, dies: t + life, el };
      }
    }
  }
  function izCombo(g, n) {
    g.combo = n;
    g.bestCombo = Math.max(g.bestCombo, n);
    const m = izMult(n);
    const el = $('#izCombo');
    el.textContent = m > 1 ? `Streak ×${m}` : n ? `Streak ${n}` : '';
    el.classList.toggle('hot', m > 1);
  }
  const izMult = n => (n >= 20 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : 1);
  function izClear(g, i, how) {
    const el = g.cells[i].el;
    g.cells[i] = null;
    el.classList.add(how);
    setTimeout(() => el.remove(), 180);
  }
  function izFloat(i, text, cls) {
    if (S.settings.stealth) return;
    const cell = $(`.iz-cell[data-i="${i}"]`);
    if (!cell) return;
    const f = document.createElement('span');
    f.className = 'iz-float ' + (cls || '');
    f.textContent = text;
    cell.appendChild(f);
    setTimeout(() => f.remove(), 650);
  }
  function izTap(i) {
    const g = iz;
    if (!g || g.over || now() >= g.end) return;
    const c = g.cells[i];
    if (!c) return;
    const kind = c.kind;
    if (kind.phish) {
      g.phished++;
      g.score = Math.max(0, g.score + kind.pts);
      izCombo(g, 0);
      izFloat(i, `${kind.pts} phished!`, 'bad');
      buzz([30, 40, 30]);
      $('#izGrid').classList.remove('shake');
      void $('#izGrid').offsetWidth;
      $('#izGrid').classList.add('shake');
    } else if (kind.bonus) {
      g.end += kind.bonus * 1000;
      izFloat(i, `+${kind.bonus}s`, 'good');
    } else {
      izCombo(g, g.combo + 1);
      const pts = kind.pts * izMult(g.combo);
      g.score += pts;
      g.cleared++;
      izFloat(i, `+${pts}`, kind.pts > 1 ? 'gold' : '');
      buzz(5);
    }
    $('#izScore').textContent = g.score;
    izClear(g, i, 'hit');
  }
  function izFinish(g) {
    g.over = true;
    g.cells.forEach((c, i) => c && izClear(g, i, 'gone'));
    const res = E.claimGame('inbox', g.score);
    save();
    $('#izEnd').innerHTML = gameEndHtml('inbox', g.score, res, `${g.cleared} cleared · ${g.missed} missed · ${g.phished} phished · longest streak ${g.bestCombo}`);
    renderNav();
  }

  // --- breaks: Stack. Build Atlas HQ: floors slide in from alternate sides; tap to drop each one.
  // World units: the first floor is 100 × 100 and FH tall. The view is isometric.
  let stk = null;
  const FH = 24, BASE = 100, PERFECT = 4;
  function showStack() {
    stopStack();
    const g = D.GAMES.stack;
    openDialog(`<button class="dlg-x" data-act="closeDialog" aria-label="Close">×</button><h3>Stack</h3>
      <div class="muted small game-intro">Tap to drop each floor. Whatever hangs over the edge falls off, so the tower gets narrower. Three perfect drops in a row make it wider again. Rewards at ${g.tiers.join(' / ')} floors.${practiceNote('stack')}</div>
      <div class="stk-wrap" id="stkWrap"><canvas id="stkCanvas" role="img" aria-label="Stack: tap or press space to drop a floor"></canvas>
        <div class="stk-hud"><b id="stkScore">0</b><span id="stkMsg">Tap to start</span></div></div>
      <div id="stkEnd"></div>`, { cls: 'game-dialog stk-game' });
    const wrap = $('#stkWrap'), cv = $('#stkCanvas');
    const w = wrap.clientWidth, h = Math.round(Math.min(w * 1.15, window.innerHeight * 0.55));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.height = h + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sc: pixels per world unit (eased towards scT); cyK: where the camera height sits on the canvas.
    stk = { ctx, w, h, sc: w / 300, scT: w / 300, cy: 0.62, cyK: 0.62, camY: 0, floors: [{ x: 0, z: 0, w: BASE, d: BASE, hue: 190 }], cur: null, falling: [], rings: [], streak: 0, state: 'ready', last: performance.now() };
    stkSpawn(stk);
    const run = stk;
    const loop = ts => { if (run.state === 'stopped' || !document.body.contains(cv)) return; stkStep(run, ts); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  function stopStack() { if (stk) stk.state = 'stopped'; stk = null; }
  function stkSpawn(g) {
    const top = g.floors[g.floors.length - 1];
    const axis = g.floors.length % 2 ? 'x' : 'z';
    g.cur = { x: top.x, z: top.z, w: top.w, d: top.d, hue: (190 + g.floors.length * 9) % 360, axis, dir: 1 };
    g.cur[axis] = top[axis] - 130;
  }
  function stkDrop() {
    const g = stk;
    if (!g) return;
    if (g.state === 'ready') { g.state = 'play'; $('#stkMsg').textContent = ''; $('#dialog').classList.add('playing'); return; }
    if (g.state !== 'play') return;
    // Floor i (from 1) spans heights (i - 1)·FH to i·FH; the sliding floor is the next one.
    const top = g.floors[g.floors.length - 1], c = g.cur, a = c.axis, len = a === 'x' ? 'w' : 'd';
    const y = (g.floors.length - 1) * FH;
    const delta = c[a] - top[a];
    if (Math.abs(delta) <= PERFECT) {
      c[a] = top[a];
      g.streak++;
      if (g.streak >= 3 && c[len] < BASE) {
        const grow = Math.min(BASE - c[len], 6);
        c[len] += grow;
        c[a] -= grow / 2;
      }
      g.rings.push({ x: c.x, z: c.z, w: c.w, d: c.d, y: y + FH, t: performance.now() });
      stkSay(g.streak >= 3 ? `Perfect ×${g.streak}!` : 'Perfect!');
      buzz(12);
    } else {
      g.streak = 0;
      const overlap = c[len] - Math.abs(delta);
      if (overlap <= 0) {
        g.falling.push(Object.assign({ y, vy: 0 }, c));
        return stkOver(g);
      }
      const cut = Object.assign({}, c, { y, vy: 0 });
      cut[len] = Math.abs(delta);
      cut[a] = delta > 0 ? top[a] + top[len] : c[a];
      g.falling.push(cut);
      c[a] = Math.max(c[a], top[a]);
      c[len] = overlap;
      buzz(6);
    }
    g.floors.push({ x: c.x, z: c.z, w: c.w, d: c.d, hue: c.hue });
    const n = g.floors.length - 1;
    $('#stkScore').textContent = n;
    if (D.FLOORS[n]) stkSay(`Floor ${n}: ${D.FLOORS[n]}`);
    stkSpawn(g);
  }
  function stkSay(text) {
    const el = $('#stkMsg');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
  function stkOver(g) {
    g.state = 'over';
    const n = g.floors.length - 1;
    const res = E.claimGame('stack', n);
    save();
    stkSay(n ? `${n} floor${n > 1 ? 's' : ''}!` : 'Missed it');
    // Zoom out so the whole tower, foundation included, fits.
    g.scT = Math.min(g.w / 300, (g.h * 0.4) / ((n + 6) * FH / 2 + 60));
    g.cyK = 0.5;
    $('#stkEnd').innerHTML = gameEndHtml('stack', n, res, n >= 5 ? `Atlas HQ is ${n * 4} metres tall` : '');
    renderNav();
  }
  function stkStep(g, ts) {
    const dt = Math.min(0.05, (ts - g.last) / 1000);
    g.last = ts;
    const n = g.floors.length - 1;
    if (g.state === 'play') {
      const c = g.cur, top = g.floors[n];
      const speed = Math.min(330, 150 * (1 + 0.035 * n));
      c[c.axis] += c.dir * speed * dt;
      if (c[c.axis] > top[c.axis] + 130) c.dir = -1;
      if (c[c.axis] < top[c.axis] - 130) c.dir = 1;
    }
    for (const f of g.falling) { f.vy -= 900 * dt; f.y += f.vy * dt; }
    g.falling = g.falling.filter(f => f.y > g.camY - 400);
    const target = g.state === 'over' ? ((n - 6) * FH) / 2 : Math.max(0, (n + 1) * FH - 60);
    const ease = Math.min(1, dt * 4);
    g.camY += (target - g.camY) * ease;
    g.sc += (g.scT - g.sc) * ease;
    g.cy += (g.cyK - g.cy) * ease;
    stkDraw(g, ts);
  }
  // Sky goes from day to dusk to night to space as the tower grows.
  const SKY = [[0, [191, 227, 255], [234, 246, 255]], [18, [255, 196, 150], [255, 228, 196]], [32, [44, 56, 102], [86, 96, 150]], [55, [8, 10, 26], [26, 28, 56]]];
  function skyAt(n) {
    let i = 0;
    while (i < SKY.length - 2 && n >= SKY[i + 1][0]) i++;
    const [a, b] = [SKY[i], SKY[i + 1]];
    const k = clamp((n - a[0]) / (b[0] - a[0]), 0, 1);
    const mix = (p, q) => `rgb(${p.map((v, j) => Math.round(v + (q[j] - v) * k)).join(',')})`;
    return [mix(a[1], b[1]), mix(a[2], b[2])];
  }
  function stkDraw(g, ts) {
    const { ctx, w, h } = g;
    const n = g.floors.length - 1;
    const [skyTop, skyBottom] = skyAt(n);
    const night = clamp((n - 24) / 12, 0, 1);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, skyTop);
    bg.addColorStop(1, skyBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (night > 0) {
      ctx.fillStyle = `rgba(255,255,255,${night * 0.8})`;
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % w, (i * 53 + i * i * 7) % (h * 0.7), 1.5, 1.5);
    }
    // Isometric: +x runs down-right, +z down-left, y up. The foundation's centre sits at (cx, cy).
    const cx = w / 2, cy = h * g.cy, sc = g.sc, C = 0.866, S2 = 0.5;
    const P = (x, y, z) => [cx + (x - z) * C * sc, cy + ((x + z - BASE) * S2 - (y - g.camY)) * sc];
    const quad = (pts, fill) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const block = (b, y, hgt, alpha = 1, foundation = false) => {
      const { x, z } = b, bw = b.w, bd = b.d;
      ctx.globalAlpha = alpha;
      const L = foundation ? 52 : 50;
      quad([P(x, y, z + bd), P(x + bw, y, z + bd), P(x + bw, y + hgt, z + bd), P(x, y + hgt, z + bd)], foundation ? '#8b93a1' : `hsl(${b.hue},45%,${L}%)`);
      quad([P(x + bw, y, z), P(x + bw, y, z + bd), P(x + bw, y + hgt, z + bd), P(x + bw, y + hgt, z)], foundation ? '#6f7786' : `hsl(${b.hue},45%,${L - 12}%)`);
      quad([P(x, y + hgt, z), P(x + bw, y + hgt, z), P(x + bw, y + hgt, z + bd), P(x, y + hgt, z + bd)], foundation ? '#a7aebb' : `hsl(${b.hue},55%,${L + 18}%)`);
      if (!foundation && hgt >= FH) {
        // windows along both visible faces
        const glass = night > 0.5 ? 'rgba(255,230,150,.85)' : 'rgba(255,255,255,.45)';
        const y0 = y + hgt * 0.3, y1 = y + hgt * 0.72;
        for (let u = 5; u + 7 <= bw - 3; u += 12) quad([P(x + u, y0, z + bd), P(x + u + 7, y0, z + bd), P(x + u + 7, y1, z + bd), P(x + u, y1, z + bd)], glass);
        for (let u = 5; u + 7 <= bd - 3; u += 12) quad([P(x + bw, y0, z + u), P(x + bw, y0, z + u + 7), P(x + bw, y1, z + u + 7), P(x + bw, y1, z + u)], glass);
      }
      ctx.globalAlpha = 1;
    };
    const top = g.floors[n];
    // pieces falling behind the tower first, then the tower, then the ones in front
    const behind = f => f.x + f.w <= top.x + 0.01 || f.z + f.d <= top.z + 0.01;
    for (const f of g.falling) if (behind(f)) block(f, f.y, FH, clamp(1 + (f.y - g.camY + 100) / 300, 0, 1));
    block({ x: 0, z: 0, w: BASE, d: BASE }, -FH * 6, FH * 6, 1, true);
    g.floors.forEach((f, i) => {
      if (i === 0) return;
      const [, py] = P(f.x, i * FH, f.z);
      if (py > h + 200) return;
      block(f, (i - 1) * FH, FH);
    });
    for (const f of g.falling) if (!behind(f)) block(f, f.y, FH, clamp(1 + (f.y - g.camY + 100) / 300, 0, 1));
    if (g.state === 'play' || g.state === 'ready') block(g.cur, n * FH, FH);
    // perfect-drop ripples on the top face
    g.rings = g.rings.filter(r => ts - r.t < 600);
    for (const r of g.rings) {
      const k = (ts - r.t) / 600, grow = 4 + 26 * k;
      ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      [P(r.x - grow, r.y, r.z - grow), P(r.x + r.w + grow, r.y, r.z - grow), P(r.x + r.w + grow, r.y, r.z + r.d + grow), P(r.x - grow, r.y, r.z + r.d + grow)].forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.stroke();
    }
  }

  // --- price chart hover (crosshair + tooltip), also driven by the arrow keys
  let chartActive = false;
  function chartHover(plot, clientX, idx) {
    const pts = chartPoints();
    const sc = A.chartScale(pts);
    let i = idx;
    if (i === undefined) {
      const r = plot.getBoundingClientRect();
      const t = sc.x0 + clamp((clientX - r.left) / r.width, 0, 1) * (sc.x1 - sc.x0);
      i = 0;
      for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k][0] - t) < Math.abs(pts[i][0] - t)) i = k;
    }
    i = clamp(i, 0, pts.length - 1);
    plot.dataset.i = i;
    const [t, v] = pts[i];
    const x = (100 * (t - sc.x0)) / (sc.x1 - sc.x0), y = 100 - (100 * (v - sc.y0)) / (sc.y1 - sc.y0);
    const cross = plot.querySelector('.ch-cross'), dot = plot.querySelector('.ch-hdot'), tip = plot.querySelector('.ch-tip');
    cross.style.left = dot.style.left = x + '%';
    dot.style.top = y + '%';
    const b = document.createElement('b'), sp = document.createElement('span');
    b.textContent = price(v);
    sp.textContent = timeLabel(t);
    tip.replaceChildren(b, sp);
    tip.style.left = clamp(x, 14, 86) + '%';
    for (const el of [cross, dot, tip]) el.classList.remove('hidden');
  }
  function chartHide(plot) { for (const el of plot.querySelectorAll('.ch-cross,.ch-hdot,.ch-tip')) el.classList.add('hidden'); }

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
      return h >= need ? `<li>${esc(line)}</li>` : `<li class="locked">${icon('lock')}Unlocks at ${'♥'.repeat(need)}</li>`;
    }).join('');
    const msg = S.inbox.find(m => m.from === id && m.choices && !m.done);
    openDialog(`<div class="profile-head">${av(id, 'xl')}<div class="grow"><h3>${esc(p.name)}</h3><div class="muted small">${esc(jobTitle(id))}</div>
        <div class="pc-row">${band(p.r)}${st.stars ? starsHtml(st.stars) : ''}<span class="status-tag ${s.cls}">${esc(s.text)}</span></div></div></div>
      <div class="quote">“${esc(p.catch)}” · ${esc(p.bio)}</div>
      ${abilityHtml(p)}
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
      ${p.traits.length ? `<div class="traits">${p.traits.map(t => `<div class="trait"><b>${esc(D.TRAITS[t].name)}</b>${esc(D.TRAITS[t].desc)}</div>`).join('')}</div>` : ''}
      ${E.unlocked('gear') ? `<div class="card-title" style="margin:12px 0 0">Equipment</div><div class="gear-row">${gear}</div>` : ''}
      <div class="card-title" style="margin:12px 0 0">Their story</div><ul class="story">${story}</ul>
      <div class="actions"><button class="btn ghost danger letgo" data-act="letgo" data-id="${id}">Let go…</button><button class="btn" data-act="closeDialog">Close</button><button class="btn primary" data-act="chat" data-id="${id}" ${chatReady ? '' : 'disabled'}>${icon('breaks')}${chatReady ? 'Coffee chat' : `Again in ${fmtDur((st.lastChat + 4 * 3600e3 - now()) / 1000)}`}</button></div>`);
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
    // With the More sheet open, only its items can be pointed at: everything else is underneath it.
    const sheet = $('#sheet').classList.contains('hidden') ? null : $('#sheet');
    const bar = $('#tabbar').getBoundingClientRect();
    const viewTop = $('.topbar').getBoundingClientRect().bottom;
    const viewBottom = bar.height ? bar.top : window.innerHeight;
    const ring = $('#coach'), tip = $('#coachTip');
    for (const [key, text] of COACH[S.tut] || []) {
      const el = $$(`[data-coach="${key}"]`).find(x => (!sheet || sheet.contains(x)) && (x.offsetParent !== null || x.getClientRects().length));
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      tip.classList.remove('hidden');
      if ($('#view').contains(el) && (r.top < viewTop || r.bottom > viewBottom)) {
        // On this page but scrolled out of sight: point to it from the edge, rather than back to the menu.
        const up = r.top < viewTop;
        ring.classList.add('hidden');
        tip.textContent = `${up ? '↑' : '↓'} ${text}`;
        tip.classList.add('edge');
        Object.assign(tip.dataset, { act: 'coachGo', key });
        Object.assign(tip.style, { left: (window.innerWidth - tip.offsetWidth) / 2 + 'px', top: (up ? viewTop + 10 : viewBottom - tip.offsetHeight - 10) + 'px' });
        return;
      }
      tip.classList.remove('edge');
      delete tip.dataset.act;
      Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
      ring.classList.remove('hidden');
      tip.textContent = text;
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
      else if (type === 'career' && !inReveal) toast(`Career level ${data.lvl}`);
      else if (type === 'unlock') toast(`New: ${data.title}`);
      else if (type === 'built') toast(`${E.OFFICE[data.id].name} upgraded`);
      else if (type === 'achievement') toast(`Badge: ${data.name}`);
      else if (type === 'burnout') toast(`${who(data.id).first} is burnt out and taking a break`, data.id);
      else if (type === 'ipo') showIPO(data);
      else if (type === 'marketcap') {
        if (data.legend) showCap(data);
        else toast(`ATLS passed a ${money(data.cap)} market cap`);
      } else if (type === 'funding' && data.round < D.FUNDING.length - 1) {
        const r = D.FUNDING[data.round];
        const zones = Object.values(D.ZONES).filter(z => z.funding === data.round).map(z => z.name);
        openDialog(`<div class="profile-head">${av('ceo', 'xl')}<div><div class="muted small">Alex Rivera · CEO</div><h3>${esc(r.name)}!</h3></div></div>
          <p>${esc(r.line)}</p><div class="extras"><div class="extra gold">${icon('coins')}<span><b>+${money(data.injection)}</b> funding injection</span></div>
          <div class="extra gold">${icon('investors')}<span>Revenue <b>×1.5</b> for good</span></div>${zones.length ? `<div class="extra">${icon('office')}<span>New office space: <b>${esc(zones.join(', '))}</b></span></div>` : ''}</div>
          <div class="actions"><button class="btn primary" data-act="closeDialog">Let's go</button></div>`, { queue: true });
      } else if (type === 'message') {
        const m = data;
        if (view !== 'inbox' && m.kind !== 'dana' && m.kind !== 'funding' && m.kind !== 'milestone' && document.visibilityState === 'visible') toast(`${who(m.from).first}: ${m.text.length > 60 ? m.text.slice(0, 57) + '…' : m.text}`, m.from);
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
    $('#tickChip').innerHTML = tickerChip();
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
    hustle: (d, e) => { if (e && e.detail === 0) hustleTap(e.target.closest('.hustle')); }, // keyboard; taps arrive as pointerdown
    answerCall: () => {
      const r = E.answerCall();
      const el = $('#call');
      ringing = 0;
      if (!r) { el.classList.add('hidden'); return; }
      save();
      const what = { quote: `+${money(r.cash)}`, shot: '+1 espresso shot', flow: 'Flow state: everyone works 3× faster for 20 seconds', boost: 'Revenue +50% for 10 minutes', ref: '+1 referral' }[r.kind];
      el.dataset.state = 'done';
      el.innerHTML = `<span class="call-ico" aria-hidden="true">${icon('phone')}</span><div class="grow"><b>${esc(r.from)}</b><div class="small">“${esc(r.text)}”</div><div class="call-win">${esc(what)}</div></div>`;
      buzz(15);
      setTimeout(() => { el.classList.add('hidden'); delete el.dataset.state; }, 3500);
      renderNav();
    },
    declineCall: () => { E.missCall(); ringing = 0; $('#call').classList.add('hidden'); save(); },
    coachGo: d => { const el = $(`#view [data-coach="${d.key}"]`); if (el) el.scrollIntoView({ block: 'center', behavior: S.settings.stealth ? 'auto' : 'smooth' }); },
    decoy: () => { closeSheet(); toggleDecoy(); },
    closeDialog: () => closeDialog(),
    confirmOk: () => { const cb = confirmCb; confirmCb = null; closeDialog(); if (cb) cb(); },
    start: d => {
      const w = E.start(d.offer);
      if (!w) return toast('No free workstream or nobody available');
      save();
      if (w.instant) toast(`${who(w.team.find(id => E.PEOPLE[id].ability && E.PEOPLE[id].ability.id === 'warp')).first} delivered it the moment it started!`);
      else toast(`${w.offer.name} started · ${fmtDur((w.end - w.start) / 1000)}`);
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
    pack: d => {
      const res = E.openPack(d.k);
      if (!res) return toast(D.PACKS[d.k].ticket ? 'No Headhunter tickets' : 'Not enough referrals');
      save();
      showPack(d.k, res);
      renderNav();
    },
    openBox: d => openBox(+d.i),
    splashNext: () => { if (now() - splashAt < 700) return; splashQueue.shift(); showSplash(); }, // the delay stops a double tap skipping it
    openAll: () => boxes.forEach((b, i) => setTimeout(() => openBox(i), S.settings.stealth ? 0 : i * 170)),
    rush: d => {
      const r = E.rush(+d.slot);
      if (!r) return toast(S.shots < 1 ? `No espresso shots left. One arrives every ${D.BALANCE.shotMinutes} minutes.` : 'Nothing to rush');
      save();
      buzz(12);
      toast(r.done ? 'Rushed! Ready to sign off.' : 'Rushed: half the time left');
      renderNav();
      renderView(true);
    },
    letgo: d => {
      const id = d.id, p = E.PEOPLE[id];
      const block = E.letGoBlock(id);
      if (block) return toast(block);
      const refs = E.severance(id);
      const first = p.name.split(' ')[0];
      confirmDialog(`Let ${first} go?`, `<div class="profile-head">${av(id, 'lg')}<div><b>${esc(p.name)}</b><div class="muted small">${esc(jobTitle(id))}</div></div></div>
        <ul class="small"><li>${refs ? `<b>+${refs} referral${refs > 1 ? 's' : ''}</b> from ${p.noWork ? 'his' : 'their'} network` : 'No referrals: their network is still small'}</li><li>Everyone else's mood <b>−6</b></li>
        ${S.stock ? '<li>ATLS <b>+2%</b>: investors love a "restructuring"</li>' : ''}<li>Their level, promotions and equipment go with them</li></ul>
        <p class="muted small">People you let go sometimes start companies and send work your way. They might even apply again.</p>`, 'Let go', () => {
        if (!E.letGo(id)) return;
        save();
        toast(`${first} has left Atlas`, id);
        renderNav();
        renderView(true);
      });
    },
    game: d => {
      closeSheet();
      if (d.g === 'word') showWord();
      else if (d.g === 'inbox') showInbox();
      else showStack();
    },
    wkey: d => wordKey(d.k),
    shareWord: () => {
      const ws = E.wordState(), ans = E.wordAnswer();
      const grid = ws.guesses.map(g => E.scoreGuess(g, ans).map(v => ['⬜', '🟨', '🟩'][v]).join('')).join('\n');
      copyText(`Atlas daily word ${ws.day} ${ws.won ? ws.guesses.length : 'X'}/6\n${grid}`, 'Result copied');
    },
    izStart: () => izStart(),
    iz: (d, e) => { if (e && e.detail === 0) izTap(+d.i); }, // keyboard; taps arrive as pointerdown
    ringBell: () => {
      const b = $('#bell');
      if (!b) return;
      b.classList.remove('ring');
      void b.offsetWidth;
      b.classList.add('ring');
      buzz([40, 60, 40, 60, 40]);
    },
    range: d => { chartRange = d.r; renderView(true); },
    acquire: () => {
      const tg = E.acqTarget();
      confirmDialog(`Buy ${tg.name}?`, `<div class="profile-head"><span class="logo lg">${A.logo(tg.name)}</span><div><b>${esc(tg.name)}</b><div class="muted small">${esc(tg.sector)} · ${esc(tg.city)}</div></div></div>
        <p class="small">Price: <b>${money(tg.price)}</b>. Their customers become yours: <b>revenue +15% for good</b>, and the market likes a deal.</p>`, 'Buy it', () => {
        const r = E.acquire();
        if (!r || r.error) return toast('Not enough budget');
        save();
        buzz([20, 40, 20]);
        toast(`Atlas acquired ${r.name}`);
        renderNav();
        renderView(true);
      });
    },
    build: d => {
      if (!E.build(d.id)) return;
      save();
      toast(`Building ${E.OFFICE[d.id].name} · ${fmtDur((S.builds[S.builds.length - 1].end - now()) / 1000)}`);
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
      showIntro();
    }),
    intro: d => showIntro(+d.i),
    saveName: () => {
      const v = ($('#nameInput').value || '').trim().slice(0, 20);
      S.name = v;
      save();
      $('#meAvatar').innerHTML = A.avatar(myLook());
      closeDialog();
    },
  };

  const myLook = () => ({ skin: 2, hair: 'short', hc: '#3a2b20', top: '#005f73', topStyle: 'collar', bg: '#e3f1f4', mouth: 'smile' });

  // First launch: four short slides with the basics, then your name. The rest is left to find.
  const INTRO = [
    { title: 'Welcome to Atlas', text: "I'm Dana, your manager. You're taking over a small team. They do the work. You make the calls.",
      art: () => `<div class="in-team">${av('tyler', 'lg')}${av('dana', 'xl')}${av('kai', 'lg')}</div>` },
    { title: 'Win work, get reviews', text: 'Start projects for clients. They run in real time, even with this tab closed. Sign each one off to read the client review: more stars, more revenue.',
      art: () => `<div class="in-proj"><span class="logo">${A.logo('Contoso')}</span><div class="grow"><b>Website copy refresh</b><div class="muted small">Contoso · Quick win</div><div class="bar"><div class="fill"></div></div></div></div>
        <div class="in-stars">${[1, 2, 3, 4, 5].map(i => `<svg class="rstar" style="animation-delay:${1 + i * 0.15}s" viewBox="0 0 24 24">${STAR_SVG}</svg>`).join('')}<b class="in-pay">+$24</b></div>` },
    { title: 'Grow the company', text: 'Spend the budget on a better office. Hire from blind boxes: you only see who you got when you open one. Grow from a garage startup all the way to an IPO.',
      art: () => `<div class="in-office">${A.floor({ id: 'in', lv: { coffee: 3, plants: 3, desks: 2, rooms: 2, pmo: 1, lounge: 2, phones: 3 }, zones: { library: 'x', servers: 'x', games: 'x', lobby: 'x' }, desks: 8, building: [] })}</div>` },
    { title: 'Play it your way', text: 'Check in for a minute or leave it running all day. Hold Hustle to speed everyone up. And if someone walks past, press Esc (or tap ⧉) for a very boring report.',
      art: () => `<div class="in-play"><span class="hustle big in-hustle" aria-hidden="true"><span class="hs-gauge"><svg class="hs-ring" viewBox="0 0 40 40"><circle class="hs-track" cx="20" cy="20" r="17"/><circle class="hs-prog" cx="20" cy="20" r="17" pathLength="100" style="stroke-dashoffset:35"/></svg>${icon('bolt')}</span><span class="hs-txt"><b>Hustle</b></span><span class="hs-x">×2.3</span></span>
        <span class="in-key"><kbd>Esc</kbd>${icon('report')}<span class="muted small">Report view</span></span></div>` },
  ];
  function showIntro(i = 0) {
    const s = INTRO[i], last = i === INTRO.length - 1;
    openDialog(`<div class="in-art">${s.art()}</div><div class="in-step muted small">${i + 1} of ${INTRO.length}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
      ${last ? '<label class="field" style="max-width:none">What should the team call you?<input id="nameInput" maxlength="20" placeholder="Your first name" autocomplete="off"></label><p class="muted small">Everything else, and there is a lot more, opens up as you go.</p>' : ''}
      <div class="in-foot"><div class="in-dots">${INTRO.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="actions">${i ? `<button class="btn" data-act="intro" data-i="${i - 1}">Back</button>` : `<button class="btn ghost" data-act="intro" data-i="${INTRO.length - 1}">Skip</button>`}
          ${last ? '<button class="btn primary" data-act="saveName">Let\'s go</button>' : `<button class="btn primary" data-act="intro" data-i="${i + 1}">Next</button>`}</div></div>`, { cls: 'intro-dialog' });
    if (last) setTimeout(() => { const el = $('#nameInput'); if (el && !compact()) el.focus(); }, 50);
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
    $('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay' && !reveal && !$('#dialog').classList.contains('intro-dialog')) closeDialog(); });
    $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
    $('#decoy').addEventListener('dblclick', toggleDecoy);
    const onResize = () => renderView(true);
    if (phoneQuery.addEventListener) phoneQuery.addEventListener('change', onResize); else phoneQuery.addListener(onResize);
    window.addEventListener('resize', updateCoach);
    window.addEventListener('scroll', updateCoach, { passive: true });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; });
    window.addEventListener('appinstalled', () => { installEvent = null; S.settings.installHint = false; toast('Installed. Open Workforce from your home screen.'); });
    let holdTimer = 0;
    const stopHold = () => { clearInterval(holdTimer); holdTimer = 0; };
    document.addEventListener('pointerdown', e => {
      const cell = e.target.closest && e.target.closest('.iz-cell');
      if (cell && e.button <= 0) { e.preventDefault(); izTap(+cell.dataset.i); return; }
      if (e.target.id === 'stkCanvas' && e.button <= 0) { e.preventDefault(); stkDrop(); return; }
      const btn = e.target.closest && e.target.closest('.hustle');
      if (!btn || e.button > 0) return;
      hustleTap(btn);
      stopHold();
      holdTimer = setInterval(() => hustleTap(btn), 160);
    });
    for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, stopHold);
    window.addEventListener('blur', stopHold);
    document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.hustle')) e.preventDefault(); });
    document.addEventListener('pointerover', e => { const tb = e.target.closest && e.target.closest('.tb'); if (tb) trendTip(tb, true); });
    document.addEventListener('pointermove', e => {
      const plot = e.target.closest && e.target.closest('.ch-plot');
      chartActive = !!plot || !!(e.target.closest && e.target.closest('.trend'));
      if (plot) chartHover(plot, e.clientX);
    });
    document.addEventListener('pointerout', e => {
      const plot = e.target.closest && e.target.closest('.ch-plot');
      if (plot && !plot.contains(e.relatedTarget)) { chartActive = false; chartHide(plot); }
      const tb = e.target.closest && e.target.closest('.tb');
      if (tb && !tb.contains(e.relatedTarget)) trendTip(tb, false);
      const trend = e.target.closest && e.target.closest('.trend');
      if (trend && !trend.contains(e.relatedTarget)) chartActive = false;
    });
    document.addEventListener('focusin', e => {
      if (e.target.classList && e.target.classList.contains('ch-plot')) chartHover(e.target, 0, chartPoints().length - 1);
      if (e.target.classList && e.target.classList.contains('tb')) { chartActive = true; trendTip(e.target, true); }
    });
    document.addEventListener('focusout', e => {
      if (e.target.classList && e.target.classList.contains('ch-plot')) chartHide(e.target);
      if (e.target.classList && e.target.classList.contains('tb')) { chartActive = false; trendTip(e.target, false); }
    });
    document.addEventListener('keydown', e => {
      const dlg = $('#dialog');
      const open = !$('#overlay').classList.contains('hidden');
      if (open && dlg.classList.contains('word') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const k = e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'back' : /^[a-zA-Z]$/.test(e.key) ? e.key.toLowerCase() : '';
        if (k) { e.preventDefault(); wordKey(k); return; }
      }
      if (open && dlg.classList.contains('iz-game') && iz && /^[1-9]$/.test(e.key)) { e.preventDefault(); izTap(+e.key - 1); return; }
      if (open && dlg.classList.contains('stk-game') && stk && stk.state !== 'over' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); stkDrop(); return; }
      if (document.activeElement && document.activeElement.classList.contains('ch-plot') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const plot = document.activeElement;
        chartHover(plot, 0, (+plot.dataset.i || 0) + (e.key === 'ArrowLeft' ? -1 : 1));
        return;
      }
      if (e.key === 'Escape' && !$('#splash').classList.contains('hidden')) { ACTIONS.splashNext(); return; } // ` still opens the report view
      if (e.key === 'Escape' && !$('#sheet').classList.contains('hidden')) { closeSheet(); return; }
      if (e.key === 'Escape' && open) { closeDialog(); return; }
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

  let ticks = 0, wasHot = false;
  function tick() {
    E.tick();
    drainEvents();
    const readyNow = E.ready().join(',');
    if (readyNow !== lastReadyToast) {
      if (readyNow.length > lastReadyToast.length && document.visibilityState === 'visible' && view !== 'home' && view !== 'projects') toast('A project is ready for sign-off');
      lastReadyToast = readyNow;
    }
    if (readyNow !== lastReady) {
      renderNav();
      if (renderView()) lastReady = readyNow;
    }
    live();
    updateCall();
    const hot = E.hustleLevel() > 0.05;
    if (hot || wasHot) updateFloors();
    wasHot = hot;
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
    const before = { office: JSON.stringify(S.office), inbox: S.inbox.length, price: S.stock ? S.stock.price : 0, splits: S.stock ? S.stock.splits : 0, lifetime: S.lifetime };
    E.tick();
    pendingEvents.length = 0;
    lastReady = lastReadyToast = E.ready().join(',');
    bind();
    renderNav();
    renderView(true);
    updateTitle();
    setInterval(tick, 1000);
    requestAnimationFrame(frame);

    if (transfer) importCode(transfer).catch(() => toast('That transfer link looks incomplete. Try copying it again.'));
    else if (fresh || S.tut === 0 && !S.name) showIntro();
    else if (away > 10 * 60) {
      const ready = E.ready().length;
      const newMsgs = S.inbox.length - before.inbox;
      const built = JSON.stringify(S.office) !== before.office;
      const auto = S.autoSummary;
      S.autoSummary = null;
      const lines = [];
      const earned = S.lifetime - before.lifetime;
      if (earned > 0) lines.push(['coins', `<b>+${money(earned)}</b> revenue while you were away`]);
      if (auto) lines.push(['robot', `Autopilot delivered <b>${auto.count}</b> project${auto.count > 1 ? 's' : ''} (avg ${(auto.stars / auto.count).toFixed(1)}★)`]);
      if (ready) lines.push(['check', `<b>${ready}</b> deliver${ready > 1 ? 'ies' : 'y'} waiting for your sign-off`]);
      if (newMsgs > 0) lines.push(['inbox', `<b>${newMsgs}</b> new message${newMsgs > 1 ? 's' : ''}`]);
      if (built) lines.push(['crane', 'Office construction finished']);
      if (S.stock && before.price) {
        const ch = (S.stock.price * Math.pow(10, S.stock.splits - before.splits)) / before.price - 1;
        lines.push(['investors', `ATLS ${pct(ch)} while you were away (now ${price(S.stock.price)})`]);
      }
      if (S.tickets) lines.push(['gift', 'A Legend is waiting in Hiring']);
      if (lines.length) {
        openDialog(`<h3>Welcome back${S.name ? ', ' + esc(S.name) : ''}!</h3><p class="muted small">You were away ${fmtDur(away)}.</p>
          <div class="extras">${lines.map(([k, l]) => `<div class="extra">${icon(k)}<span>${l}</span></div>`).join('')}</div>
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
          s.boost.until -= ms;
          s.games.inboxAt -= ms;
          s.games.stackAt -= ms;
          s.call.at -= ms;
          s.hustle.at -= ms; s.hustle.last -= ms;
          for (const a of Object.values(s.alumni)) if (a.startup) a.startup -= ms;
          if (s.stock) { s.stock.last -= ms; s.stock.fairAt -= ms; for (const h of s.stock.hist) h[0] -= ms; }
          tick();
        },
        give: (cash = 0, refs = 0) => { E.state.cash += cash; E.state.referrals += refs; },
        get stack() { return stk; },
      };
    }
  }

  boot();
})();
