// Atlas Workforce — a long-haul idle RPG disguised as an HR system.
//
// Your squad auto-clears "projects" (stages of 10 blockers; every 5th ends in a timed launch boss).
// Revenue levels people up; referrals recruit new ones (duplicates promote); engagements, R&D and
// daily OKRs run on real-time timers; an IPO resets the run for shares that buy permanent perks.
(() => {
  'use strict';

  const D = window.WF_DATA;
  const SAVE_KEY = 'atlas_workforce_v1';
  const GAME_ID = 'workforce';
  const WAVES = 10;
  const SPAWN_DELAY = 0.4;
  const MAX_ITEMS = 60;
  const LEVEL_GROWTH = 1.075;
  const LEVEL_BASE = 4;
  const PEOPLE = Object.fromEntries(D.PEOPLE.map(p => [p.id, p]));
  const RESEARCH = Object.fromEntries(D.RESEARCH.map(r => [r.id, r]));
  const PERKS = Object.fromEntries(D.PERKS.map(p => [p.id, p]));

  const $ = s => document.querySelector(s);
  const now = () => Date.now();
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];
  function fmt(n) {
    if (!Number.isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIX.length) return n.toExponential(2);
    const v = n / Math.pow(1000, tier);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + SUFFIX[tier];
  }
  const money = n => '$' + fmt(n);
  function fmtDur(sec) {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm' + (sec % 60 && sec < 600 ? ' ' + (sec % 60) + 's' : '');
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  }

  // ================================================================ state

  function fresh() {
    return {
      v: 1, name: '', created: now(), lastSeen: now(),
      cash: 0, referrals: 0, patents: 0, shares: 0,
      stage: 1, wave: 1, maxStage: 1, maxStageRun: 1, bossClearedRun: 0, farming: false, autoAdvance: true, blocker: null,
      staff: { tyler: { lvl: 1, stars: 0 }, kai: { lvl: 1, stars: 0 } },
      squad: ['tyler', 'kai'],
      items: [], nextItem: 1,
      missions: [], offers: [], offersAt: 0,
      research: {}, lab: [],
      perks: {}, ipos: 0,
      okr: { day: '', list: [], counts: {}, bonus: false }, streak: 0, streakDay: '',
      achievements: {}, unlocked: {}, seen: {},
      stats: {
        blockers: 0, bosses: 0, levels: 0, recruits: 0, engagements: 0, assists: 0, allhands: 0, gear: 0,
        research: 0, panics: 0, pings: 0, longestAway: 0, revenue: 0, okrDays: 0, pizza: 0,
      },
      pity: 0, pityL: 0, lastPull: [],
      allHandsUntil: 0, allHandsReady: 0, pizzaUntil: 0, pizzaReady: 0,
      settings: { stealth: false, badge: true, autoLevel: true, autoEquip: true, autoRepeat: true },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return hydrate(JSON.parse(raw));
    } catch { /* corrupted or blocked storage */ }
    return fresh();
  }
  function hydrate(saved) {
    const base = fresh();
    const out = Object.assign(base, saved);
    out.stats = Object.assign(fresh().stats, saved.stats || {});
    out.settings = Object.assign(fresh().settings, saved.settings || {});
    out.okr = Object.assign(fresh().okr, saved.okr || {});
    return out;
  }
  function save() {
    S.lastSeen = now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* storage blocked */ }
  }

  let S = load();
  let C = {}; // derived numbers, recomputed every tick
  const feed = [];

  // ================================================================ formulas

  const RES = id => S.research[id] || 0;
  const PERK = id => S.perks[id] || 0;
  const isUnlocked = f => S.maxStage >= D.UNLOCKS[f];
  const hpAt = s => 8 * Math.pow(1.14, s - 1);
  const cashAt = s => Math.pow(1.115, s - 1);
  const isBossWave = (stage, wave) => stage % 5 === 0 && wave === WAVES;
  const owned = () => Object.keys(S.staff);
  const onMission = id => S.missions.some(m => m && m.staff.includes(id));
  const labSlots = () => 1 + PERK('lab2');
  const missionSlots = () => 2 + RES('slots');
  const offlineCapH = () => 8 + 2 * RES('remote');

  function squadSlots() {
    let n = 2;
    if (S.maxStage >= 3) n++;
    if (S.maxStage >= 12) n++;
    if (S.maxStage >= 30) n++;
    return n + RES('squad') + PERK('seat');
  }
  function gearPct(id) {
    let p = 0;
    for (const i of S.items) if (i.owner === id) p += i.pct;
    return p;
  }
  function rawOutput(id, lvl) {
    const p = PEOPLE[id], st = S.staff[id];
    const L = lvl === undefined ? st.lvl : lvl;
    return D.RARITY[p.r].base * D.ROLES[p.role].mult * 4 * L * Math.pow(2, Math.floor(L / 25)) * (L >= 10 ? 2 : 1)
      * Math.pow(1.5, st.stars) * (1 + gearPct(id) / 100);
  }
  const passiveOf = id => D.ROLES[PEOPLE[id].role].passive[PEOPLE[id].r] * (1 + 0.2 * S.staff[id].stars);
  function levelCost(id, n = 1) {
    const L = S.staff[id].lvl, g = LEVEL_GROWTH;
    return LEVEL_BASE * (1 + 0.25 * PEOPLE[id].r) * Math.pow(g, L - 1) * (Math.pow(g, n) - 1) / (g - 1);
  }
  function maxLevels(id) {
    const L = S.staff[id].lvl, g = LEVEL_GROWTH;
    const first = LEVEL_BASE * (1 + 0.25 * PEOPLE[id].r) * Math.pow(g, L - 1);
    return Math.max(0, Math.floor(Math.log(S.cash * (g - 1) / first + 1) / Math.log(g)));
  }

  function compute() {
    const t = now();
    const pas = { eng: 0, sre: 0, pm: 0, sales: 0, design: 0 };
    let team = 0;
    for (const id of S.squad) {
      pas[PEOPLE[id].role] += passiveOf(id);
      team += rawOutput(id);
    }
    const gm = (1 + 0.02 * Object.keys(S.achievements).length) * (1 + 0.25 * RES('devprod')) * Math.pow(1.6, PERK('investor'));
    const crit = 1 + 2 * Math.min(pas.eng, 100) / 100;
    const dpsBase = team * (1 + pas.pm / 100) * crit * gm;
    const dps = dpsBase * (t < S.allHandsUntil ? 2 : 1);
    const cashBase = (1 + pas.sales / 100) * (1 + 0.25 * RES('revops')) * Math.pow(1.6, PERK('guidance'));
    const kps = 1 / (hpAt(S.stage) / Math.max(dpsBase, 1e-9) + SPAWN_DELAY);
    C = {
      pas, gm, dps, dpsBase, cashBase,
      cashMult: cashBase * (t < S.pizzaUntil ? 3 : 1),
      bossMult: 1 + pas.sre / 100,
      bossTime: 30 + 5 * RES('incident') + Math.round(pas.sre / 8),
      drop: 0.03 * (1 + pas.design / 100) * (1 + 0.25 * RES('loot')),
      luck: pas.design,
      kps,
      income: kps * cashAt(S.stage) * cashBase,
    };
  }
  const memberOutput = id => rawOutput(id) * (1 + C.pas.pm / 100) * (1 + 2 * Math.min(C.pas.eng, 100) / 100) * C.gm;

  // ================================================================ battle

  const projectName = s => `${D.CLIENTS[(s * 7) % D.CLIENTS.length]} ${D.PROJECTS[(s * 3) % D.PROJECTS.length]}`;

  function spawn() {
    const boss = isBossWave(S.stage, S.wave);
    const hp = hpAt(S.stage) * (boss ? 10 : 1);
    compute();
    S.blocker = {
      name: boss ? D.BOSSES[(S.stage / 5 - 1) % D.BOSSES.length] : pick(D.BLOCKERS),
      hp, max: hp, boss,
      deadline: boss ? now() + C.bossTime * 1000 : 0,
      spawnAt: now() + SPAWN_DELAY * 1000,
    };
  }

  function damage(amount) {
    const b = S.blocker;
    if (now() < b.spawnAt) return;
    b.hp -= amount * (b.boss ? C.bossMult : 1);
    if (b.hp <= 0) kill();
  }

  function canBeatBoss() {
    return C.dpsBase * C.bossMult * C.bossTime * 0.85 >= hpAt(S.stage) * 10;
  }

  function kill() {
    const b = S.blocker;
    earn(cashAt(S.stage) * (b.boss ? 10 : 1) * C.cashMult);
    bump('blockers');
    if (isUnlocked('assets') && (b.boss || Math.random() < C.drop)) addItem(rollItem(b.boss));

    if (b.boss) {
      bump('bosses');
      S.farming = false;
      if (S.stage > S.bossClearedRun) {
        S.bossClearedRun = S.stage;
        const refs = isUnlocked('recruit') ? 1 + PERK('headhunter') : 0;
        const pats = isUnlocked('rnd') ? 1 : 0;
        S.referrals += refs;
        S.patents += pats;
        log(`<b>${esc(b.name)}</b> shipped · project ${S.stage} complete${refs ? ` · +${refs} referral${refs > 1 ? 's' : ''}` : ''}${pats ? ' · +1 patent' : ''}`, 'good');
      }
    }

    if (S.wave < WAVES) {
      S.wave++;
      if (S.farming && isBossWave(S.stage, S.wave)) {
        if (S.autoAdvance && canBeatBoss()) {
          S.farming = false;
          log(`Squad looks ready. Re-attempting <b>${esc(D.BOSSES[(S.stage / 5 - 1) % D.BOSSES.length])}</b>`);
        } else {
          S.wave = 1;
        }
      }
    } else {
      S.wave = 1;
      if (S.autoAdvance) S.stage++;
      S.maxStageRun = Math.max(S.maxStageRun, S.stage);
      if (S.stage > S.maxStage) {
        S.maxStage = S.stage;
        checkUnlocks();
      }
    }
    spawn();
  }

  function failBoss() {
    log(`Missed the deadline on <b>${esc(S.blocker.name)}</b>. Squad is regrouping on project ${S.stage}.`, 'bad');
    S.farming = true;
    S.wave = 1;
    spawn();
  }

  function attemptLaunch() {
    if (!S.farming) return;
    S.farming = false;
    S.wave = WAVES;
    spawn();
  }

  function earn(x) {
    S.cash += x;
    S.stats.revenue += x;
    S.okr.counts.revenue = (S.okr.counts.revenue || 0) + x;
  }
  function bump(stat, n = 1) {
    S.stats[stat] = (S.stats[stat] || 0) + n;
    S.okr.counts[stat] = (S.okr.counts[stat] || 0) + n;
  }

  // ================================================================ team

  function levelUp(id, n) {
    if (!S.staff[id]) return;
    if (n === 'max') n = maxLevels(id);
    if (n < 1) return;
    const cost = levelCost(id, n);
    if (cost > S.cash) return;
    S.cash -= cost;
    S.staff[id].lvl += n;
    bump('levels', n);
  }

  // Greedy: always buy the level with the best output gain per dollar.
  function levelSquadGreedy(maxSteps = 400) {
    let bought = 0;
    for (let k = 0; k < maxSteps; k++) {
      let best = null, bestV = 0;
      for (const id of S.squad) {
        const c = levelCost(id);
        if (c > S.cash) continue;
        const L = S.staff[id].lvl;
        const v = (rawOutput(id, L + 1) - rawOutput(id, L)) / c;
        if (v > bestV) { bestV = v; best = id; }
      }
      if (!best) break;
      S.cash -= levelCost(best);
      S.staff[best].lvl++;
      bought++;
    }
    if (bought) bump('levels', bought);
    return bought;
  }

  function bestSquad() {
    const avail = owned().filter(id => !onMission(id)).sort((a, b) => rawOutput(b) - rawOutput(a));
    S.squad = avail.slice(0, squadSlots());
  }

  function toggleSquad(id) {
    if (S.squad.includes(id)) {
      if (S.squad.length <= 1) return toast('Your squad needs at least one person');
      S.squad = S.squad.filter(x => x !== id);
    } else {
      if (onMission(id)) return toast(`${PEOPLE[id].name} is out on an engagement`);
      if (S.squad.length >= squadSlots()) return toast('Squad is full. Remove someone first.');
      S.squad.push(id);
    }
  }

  // ================================================================ recruiting

  function rollRarity() {
    if (S.pityL >= 79) return 4;
    const brand = RES('brand'), lucky = PERK('lucky');
    const w = D.RARITY.map((r, i) => r.weight * (i >= 2 ? 1 + 0.15 * brand : 1) * (i === 4 ? Math.pow(1.5, lucky) : 1));
    if (S.pity >= 24) { w[0] = 0; w[1] = 0; w[2] = 0; }
    let roll = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) {
      roll -= w[i];
      if (roll <= 0) return i;
    }
    return 0;
  }

  function recruit(n) {
    if (S.referrals < n) return toast('Not enough referrals');
    S.referrals -= n;
    const results = [];
    for (let k = 0; k < n; k++) {
      const r = rollRarity();
      S.pity = r >= 3 ? 0 : S.pity + 1;
      S.pityL = r === 4 ? 0 : S.pityL + 1;
      const p = pick(D.PEOPLE.filter(x => x.r === r));
      const st = S.staff[p.id];
      if (!st) {
        S.staff[p.id] = { lvl: 1, stars: 0 };
        if (S.squad.length < squadSlots()) S.squad.push(p.id);
        results.push({ id: p.id, kind: 'new' });
        log(`Hired <b>${esc(p.name)}</b> · ${D.RARITY[r].name} ${D.ROLES[p.role].name}`, r >= 3 ? 'good' : '');
      } else if (st.stars < 5) {
        st.stars++;
        results.push({ id: p.id, kind: 'star' });
      } else {
        S.patents += 1 + r;
        results.push({ id: p.id, kind: 'max' });
      }
    }
    S.lastPull = results;
    bump('recruits', n);
    if (results.some(x => PEOPLE[x.id].r === 4 && x.kind === 'new')) toast('🌟 A Principal accepted your offer!');
    checkAchievements();
  }

  // ================================================================ assets

  function rollItem(boss) {
    const luck = C.luck + (boss ? 60 : 0);
    const w = [60, 25, 10, 4, 1].map((v, i) => v * (1 + luck * i / 100));
    let roll = Math.random() * w.reduce((a, b) => a + b, 0), r = 0;
    for (; r < 4; r++) { roll -= w[r]; if (roll <= 0) break; }
    const slot = pick(Object.keys(D.GEAR));
    return { id: S.nextItem++, slot, r, lvl: S.stage, pct: Math.round(D.GEAR_PCT[r] * (1 + S.stage / 25)), owner: null };
  }
  const itemName = i => D.GEAR[i.slot].items[i.r];
  const itemValue = i => cashAt(i.lvl) * 4 * (i.r + 1);

  function addItem(item, quiet) {
    S.items.push(item);
    bump('gear');
    if (!quiet && item.r >= 2) log(`Asset found: <b>${esc(itemName(item))}</b> (+${item.pct}%)`, item.r >= 3 ? 'good' : '');
    if (S.items.length > MAX_ITEMS) {
      const spare = S.items.filter(i => !i.owner).sort((a, b) => a.pct - b.pct)[0];
      if (spare) recycle(spare.id, true);
    }
    if (RES('autoequip') && S.settings.autoEquip) equipBest();
  }

  function recycle(itemId, quiet) {
    const i = S.items.find(x => x.id === itemId);
    if (!i || i.owner) return;
    S.items = S.items.filter(x => x !== i);
    const v = itemValue(i) * C.cashBase;
    earn(v);
    if (!quiet) toast(`Recycled for ${money(v)}`);
  }

  function recycleAll() {
    const spare = S.items.filter(i => !i.owner);
    if (!spare.length) return toast('No unassigned assets');
    let v = 0;
    for (const i of spare) v += itemValue(i) * C.cashBase;
    S.items = S.items.filter(i => i.owner);
    earn(v);
    toast(`Recycled ${spare.length} assets for ${money(v)}`);
  }

  // Best items go to the strongest people: squad first, then the bench.
  function equipBest() {
    const base = id => rawOutput(id) / (1 + gearPct(id) / 100);
    const order = [
      ...S.squad.slice().sort((a, b) => base(b) - base(a)),
      ...owned().filter(id => !S.squad.includes(id)).sort((a, b) => base(b) - base(a)),
    ];
    for (const slot of Object.keys(D.GEAR)) {
      const items = S.items.filter(i => i.slot === slot).sort((a, b) => b.pct - a.pct);
      items.forEach((it, k) => { it.owner = order[k] || null; });
    }
  }

  // ================================================================ engagements

  function genOffer() {
    const t = pick(D.ENGAGEMENTS);
    const [dur, n] = pick(D.DURATIONS);
    const avg = S.squad.reduce((a, id) => a + rawOutput(id), 0) / Math.max(1, S.squad.length);
    return {
      id: Math.random().toString(36).slice(2, 9),
      name: `${t.name} · ${pick(D.CLIENTS)}`,
      role: t.role, dur, n,
      req: avg * 0.3 * n,
      cash: C.income * dur * 0.35,
      patents: dur / 900,
      referrals: dur / 3600 * 0.6,
      gear: Math.min(0.9, 0.2 + dur / 14400),
    };
  }
  function ensureOffers() {
    while (S.offers.length < 4) S.offers.push(genOffer());
  }
  function bench() {
    return owned().filter(id => !S.squad.includes(id) && !onMission(id)).sort((a, b) => rawOutput(b) - rawOutput(a));
  }
  function freeMissionSlot() {
    for (let i = 0; i < missionSlots(); i++) if (!S.missions[i]) return i;
    return -1;
  }

  function startMission(offer, staffIds, slot, startAt = now()) {
    const power = staffIds.reduce((a, id) => a + rawOutput(id), 0);
    const roleMatch = staffIds.some(id => PEOPLE[id].role === offer.role);
    const factor = clamp(power / Math.max(offer.req, 1e-9), 0.25, 1.5) * (roleMatch ? 1.25 : 1) * (1 + 0.2 * RES('training'));
    S.missions[slot] = { offer, staff: staffIds, start: startAt, end: startAt + offer.dur * 1000, factor };
  }

  function startOffer(offerId) {
    const offer = S.offers.find(o => o.id === offerId);
    if (!offer) return;
    const slot = freeMissionSlot();
    if (slot < 0) return toast('All engagement slots are busy');
    const avail = bench();
    if (avail.length < offer.n) return toast(`Needs ${offer.n} people on the bench (not in your squad)`);
    // Prefer someone with the matching role, then the strongest.
    const match = avail.find(id => PEOPLE[id].role === offer.role);
    const staff = match ? [match, ...avail.filter(id => id !== match)].slice(0, offer.n) : avail.slice(0, offer.n);
    startMission(offer, staff, slot);
    S.offers = S.offers.filter(o => o !== offer);
    ensureOffers();
    log(`Engagement started: <b>${esc(offer.name)}</b> (${fmtDur(offer.dur)})`);
  }

  function collectMission(slot, auto) {
    const m = S.missions[slot];
    if (!m || now() < m.end) return null;
    const f = m.factor;
    const cash = m.offer.cash * f;
    const roll = x => Math.floor(x) + (Math.random() < x % 1 ? 1 : 0);
    const pats = roll(m.offer.patents * f);
    const refs = roll(m.offer.referrals * f);
    earn(cash);
    S.patents += pats;
    S.referrals += refs;
    let item = null;
    if (isUnlocked('assets') && Math.random() < m.offer.gear) {
      item = rollItem(m.offer.dur >= 7200);
      addItem(item, true);
    }
    bump('engagements');
    S.missions[slot] = null;
    const summary = `${money(cash)}${pats ? ` · ${pats} patent${pats > 1 ? 's' : ''}` : ''}${refs ? ` · ${refs} referral${refs > 1 ? 's' : ''}` : ''}${item ? ` · ${itemName(item)}` : ''}`;
    if (!auto) {
      toast(`Engagement complete: ${summary}`);
      log(`Collected <b>${esc(m.offer.name)}</b>: ${summary}`, 'good');
    }
    return { m, summary };
  }

  function processMissions() {
    const auto = RES('repeat') && S.settings.autoRepeat;
    for (let slot = 0; slot < S.missions.length; slot++) {
      let guard = 0;
      while (auto && S.missions[slot] && now() >= S.missions[slot].end && guard++ < 200) {
        const prevEnd = S.missions[slot].end;
        const res = collectMission(slot, true);
        const prev = res.m;
        if (guard === 1) log(`Auto-collected <b>${esc(prev.offer.name)}</b>: ${res.summary}`, 'good');
        // Re-staff the same people on a fresh offer of the same length.
        const offer = genOffer();
        offer.dur = prev.offer.dur; offer.n = prev.offer.n; offer.name = prev.offer.name; offer.role = prev.offer.role;
        offer.cash = C.income * offer.dur * 0.35; offer.patents = offer.dur / 900; offer.referrals = offer.dur / 3600 * 0.6;
        offer.gear = Math.min(0.9, 0.2 + offer.dur / 14400);
        const staffOk = prev.staff.every(id => S.staff[id] && !S.squad.includes(id) && !onMission(id));
        if (!staffOk) break;
        // Catch-up is limited to the offline accrual window, like everything else.
        startMission(offer, prev.staff, slot, Math.max(Math.min(prevEnd, now()), now() - offlineCapH() * 3600 * 1000));
      }
    }
  }

  // ================================================================ R&D

  function startResearch(id) {
    const def = RESEARCH[id];
    const lvl = RES(id);
    if (lvl >= def.max) return;
    if (S.lab.some(l => l.id === id)) return toast('Already in progress');
    if (S.lab.length >= labSlots()) return toast('The lab is busy');
    const cost = def.cost(lvl);
    if (S.patents < cost) return toast('Not enough patents');
    S.patents -= cost;
    const dur = def.time(lvl);
    S.lab.push({ id, start: now(), end: now() + dur * 1000 });
    bump('research');
    log(`Research started: <b>${esc(def.name)}</b> (${fmtDur(dur)})`);
  }
  function processLab() {
    const done = S.lab.filter(l => now() >= l.end);
    if (!done.length) return;
    S.lab = S.lab.filter(l => now() < l.end);
    for (const l of done) {
      S.research[l.id] = RES(l.id) + 1;
      toast(`Research complete: ${RESEARCH[l.id].name}`);
      log(`Research complete: <b>${esc(RESEARCH[l.id].name)}</b> → level ${S.research[l.id]}`, 'good');
      if (l.id === 'autoequip') equipBest();
      if (l.id === 'squad') bestSquad();
    }
    checkAchievements();
  }

  // ================================================================ OKRs

  const OKR_POOL = [
    { id: 'blockers', text: n => `Clear ${fmt(n)} blockers`, target: () => 300 },
    { id: 'levels', text: n => `Approve ${n} level-ups`, target: () => 75 },
    { id: 'assists', text: n => `Assist your squad ${n} times`, target: () => 150 },
    { id: 'allhands', text: n => `Run ${n} all-hands meetings`, target: () => 3 },
    { id: 'revenue', text: n => `Book ${money(n)} in revenue`, target: () => Math.max(1000, C.income * 2400) },
    { id: 'pings', text: n => `Reply to ${n} messages`, target: () => 3 },
    { id: 'recruits', text: n => `Recruit ${n} candidates`, target: () => 3, req: 'recruit' },
    { id: 'gear', text: n => `Find ${n} assets`, target: () => 8, req: 'assets' },
    { id: 'engagements', text: n => `Complete ${n} engagements`, target: () => 3, req: 'engage' },
    { id: 'research', text: n => `Start ${n} research projects`, target: () => 2, req: 'rnd' },
    { id: 'pizza', text: n => `Order pizza ${n} times`, target: () => 2, req: 'pizza' },
  ];
  const OKR_BY_ID = Object.fromEntries(OKR_POOL.map(o => [o.id, o]));

  function ensureOkrs() {
    if (!isUnlocked('okr')) return;
    const today = dayKey();
    if (S.okr.day === today) return;
    const pool = OKR_POOL.filter(o => !o.req || isUnlocked(o.req)).sort(() => Math.random() - 0.5).slice(0, 3);
    S.okr = { day: today, list: pool.map(o => ({ id: o.id, target: Math.ceil(o.target()), claimed: false })), counts: {}, bonus: false };
  }
  const okrProgress = o => Math.min(o.target, S.okr.counts[o.id] || 0);
  const okrClaimable = () => S.okr.list.filter(o => !o.claimed && okrProgress(o) >= o.target).length;

  function claimOkr(i) {
    const o = S.okr.list[i];
    if (!o || o.claimed || okrProgress(o) < o.target) return;
    o.claimed = true;
    S.referrals += 3;
    if (isUnlocked('rnd')) S.patents += 3;
    toast(`OKR achieved: +3 referrals${isUnlocked('rnd') ? ', +3 patents' : ''}`);
    if (!S.okr.bonus && S.okr.list.every(x => x.claimed)) {
      S.okr.bonus = true;
      const y = new Date(); y.setDate(y.getDate() - 1);
      S.streak = S.streakDay === dayKey(y) ? S.streak + 1 : 1;
      S.streakDay = dayKey();
      S.stats.okrDays++;
      const bonus = 5 + Math.min(S.streak, 7);
      S.referrals += bonus;
      toast(`All OKRs met! +${bonus} referrals (streak ${S.streak} day${S.streak > 1 ? 's' : ''})`);
      log(`Quarter… er, day crushed. <b>${S.streak}-day streak</b>`, 'good');
    }
    checkAchievements();
  }

  // ================================================================ achievements & unlocks

  const ACH = [];
  const ach = (id, name, desc, test) => ACH.push({ id, name, desc, test });
  [10, 25, 50, 75, 100, 150, 200, 300, 500].forEach(n => ach('stage' + n, `Project ${n}`, `Reach project ${n}`, s => s.maxStage >= n));
  [1, 10, 50, 200].forEach(n => ach('boss' + n, n === 1 ? 'Shipped It' : `${n} Launches`, `Ship ${n} launch${n > 1 ? 'es' : ''}`, s => s.stats.bosses >= n));
  [1e3, 1e4, 1e5].forEach(n => ach('blk' + n, `${fmt(n)} Blockers`, `Clear ${fmt(n)} blockers`, s => s.stats.blockers >= n));
  [10, 50, 150].forEach(n => ach('rec' + n, `${n} Interviews`, `Recruit ${n} candidates`, s => s.stats.recruits >= n));
  [10, 15, 20, 25].forEach(n => ach('own' + n, n === 25 ? 'Full Org Chart' : `Team of ${n}`, n === 25 ? 'Hire every character' : `Have ${n} different people`, s => Object.keys(s.staff).length >= n));
  ach('principal', 'Principal Hire', 'Hire a Principal', s => Object.keys(s.staff).some(id => PEOPLE[id].r === 4));
  ach('star5', 'Fully Promoted', 'Promote someone to 5★', s => Object.values(s.staff).some(x => x.stars >= 5));
  [100, 250, 500, 1000].forEach(n => ach('lvl' + n, `Level ${n}`, `Get someone to level ${n}`, s => Object.values(s.staff).some(x => x.lvl >= n)));
  [1, 25, 100, 500].forEach(n => ach('eng' + n, n === 1 ? 'Billable' : `${n} Engagements`, `Complete ${n} engagement${n > 1 ? 's' : ''}`, s => s.stats.engagements >= n));
  [10, 50, 150].forEach(n => ach('res' + n, `${n} Research Levels`, `Complete ${n} research levels`, s => Object.values(s.research).reduce((a, b) => a + b, 0) >= n));
  [1, 5, 15].forEach(n => ach('ipo' + n, n === 1 ? 'Ring the Bell' : `${n} IPOs`, `Take the company public ${n === 1 ? '' : n + ' times'}`.trim(), s => s.ipos >= n));
  ach('okr1', 'Objectives Met', 'Complete all daily OKRs', s => s.stats.okrDays >= 1);
  ach('streak7', 'Consistent Performer', 'Reach a 7-day OKR streak', s => s.streak >= 7);
  ach('legend', 'R&D Prototype', 'Equip a top-tier asset', s => s.items.some(i => i.r === 4 && i.owner));
  ach('panic', 'Nothing to See Here', 'Use the report view', s => s.stats.panics >= 1);
  ach('away8', 'Out of Office', 'Be away for 8 hours', s => s.stats.longestAway >= 8 * 3600);
  ach('assist1k', 'Hands-on Manager', 'Assist 1,000 times', s => s.stats.assists >= 1000);
  ach('ping25', 'Always Online', 'Reply to 25 messages', s => s.stats.pings >= 25);
  ach('rich', 'Unicorn', 'Earn $1T lifetime revenue', s => s.stats.revenue >= 1e12);

  function checkAchievements() {
    for (const a of ACH) {
      if (!S.achievements[a.id] && a.test(S)) {
        S.achievements[a.id] = now();
        S.referrals += 2;
        toast(`🏅 Badge earned: ${a.name} (+2 referrals)`);
        log(`Badge earned: <b>${esc(a.name)}</b>`, 'good');
      }
    }
  }

  const UNLOCK_TEXT = {
    recruit: ['Talent pipeline', 'Spend referrals to recruit. Here are 5 to start.'],
    assets: ['IT assets', 'Blockers now drop equipment that boosts whoever uses it.'],
    pizza: ['Pizza Friday', 'Triple revenue for a minute. Find it on the Overview.'],
    engage: ['Client engagements', 'Send people from your bench on timed jobs for patents, referrals and cash.'],
    rnd: ['R&D', 'Spend patents on permanent upgrades and automation. Here are 5 patents.'],
    okr: ['Daily OKRs', 'Three goals a day. Hit them all to build a streak.'],
    board: ['Board & IPO', 'Take the company public: reset your run for shares that buy permanent perks.'],
  };
  function checkUnlocks(quiet) {
    for (const f of Object.keys(D.UNLOCKS)) {
      if (!S.unlocked[f] && isUnlocked(f)) {
        S.unlocked[f] = true;
        if (f === 'recruit') S.referrals += 5;
        if (f === 'rnd') S.patents += 5;
        if (f === 'engage') { compute(); ensureOffers(); }
        if (f === 'okr') { compute(); ensureOkrs(); }
        if (!quiet) {
          const [name, text] = UNLOCK_TEXT[f];
          toast(`Unlocked: ${name}. ${text}`);
          log(`New: <b>${name}</b>. ${text}`, 'good');
        }
      }
    }
    checkAchievements();
  }

  // ================================================================ IPO

  const sharesOnIpo = () => S.maxStageRun >= D.UNLOCKS.board ? Math.floor(Math.pow((S.maxStageRun - 50) / 5, 1.7)) : 0;

  function ipo() {
    const gain = sharesOnIpo();
    if (gain < 1) return;
    modal('Take the company public?',
      `<p>You'll receive <b>${gain} shares</b> to spend on permanent board perks.</p>
       <p><b>Resets:</b> revenue, project progress and employee levels${PERK('retention') ? ` (you keep ${PERK('retention') * 10}%)` : ''}.<br>
       <b>Keeps:</b> people and promotions, assets, research, perks, badges, referrals and patents.</p>`,
      () => {
        S.shares += gain;
        S.ipos++;
        const keep = 0.1 * PERK('retention');
        for (const st of Object.values(S.staff)) st.lvl = Math.max(1, Math.floor(st.lvl * keep));
        Object.assign(S, { cash: 0, stage: 1, wave: 1, maxStageRun: 1, bossClearedRun: 0, farming: false });
        spawn();
        log(`🔔 IPO #${S.ipos} complete: <b>+${gain} shares</b>`, 'good');
        checkAchievements();
        save();
        go('board');
      }, true);
  }

  function buyPerk(id) {
    const def = PERKS[id], lvl = PERK(id);
    if (lvl >= def.max) return;
    const cost = def.cost(lvl);
    if (S.shares < cost) return toast('Not enough shares');
    S.shares -= cost;
    S.perks[id] = lvl + 1;
    if (id === 'seat') bestSquad();
    toast(`${def.name} → level ${lvl + 1}`);
  }

  // ================================================================ buffs & pings

  function assist(ev) {
    const amount = Math.max(1, C.dpsBase * 0.08);
    damage(amount);
    bump('assists');
    const card = $('#pjCard');
    if (card && !S.settings.stealth) {
      const r = card.getBoundingClientRect();
      const x = ev && ev.clientX ? ev.clientX - r.left : r.width / 2 + rand(-60, 60);
      const y = ev && ev.clientY ? ev.clientY - r.top - 24 : r.height - 70;
      const el = document.createElement('div');
      el.className = 'floater';
      el.textContent = '-' + fmt(amount);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      $('#floaters').appendChild(el);
      setTimeout(() => el.remove(), 900);
    }
  }
  function allHands() {
    if (now() < S.allHandsReady) return;
    S.allHandsUntil = now() + 30000;
    S.allHandsReady = now() + 300000;
    bump('allhands');
    log('All-hands called: team output ×2 for 30s');
  }
  function pizza() {
    if (!isUnlocked('pizza') || now() < S.pizzaReady) return;
    S.pizzaUntil = now() + 60000;
    S.pizzaReady = now() + 900000;
    bump('pizza');
    log('🍕 Pizza Friday: revenue ×3 for 60s');
  }

  let pingAt = now() + rand(60, 150) * 1000, pingReward = null, pingTimer = null;
  function maybePing() {
    if (now() < pingAt || pingReward || !$('#decoy').classList.contains('hidden')) return;
    const [from, msg] = pick(D.PINGS);
    $('#pingFrom').textContent = from;
    $('#pingMsg').textContent = msg;
    $('#ping').classList.remove('hidden');
    const opts = ['cash', 'cash', 'allhands'];
    if (isUnlocked('recruit')) opts.push('referral');
    if (isUnlocked('rnd')) opts.push('patents');
    pingReward = pick(opts);
    pingTimer = setTimeout(hidePing, 10000);
  }
  function hidePing() {
    $('#ping').classList.add('hidden');
    pingReward = null;
    clearTimeout(pingTimer);
    pingAt = now() + rand(120, 300) * 1000;
  }
  function answerPing() {
    const r = pingReward;
    if (!r) return;
    hidePing();
    bump('pings');
    if (r === 'cash') {
      const v = Math.max(C.income * 120, 20);
      earn(v);
      toast(`Spot bonus: +${money(v)}`);
    } else if (r === 'allhands') {
      S.allHandsUntil = now() + 30000;
      toast('Shout-out from the CEO: team output ×2 for 30s');
    } else if (r === 'referral') {
      S.referrals += 1;
      toast('Someone wants to work here: +1 referral');
    } else {
      S.patents += 2;
      toast('Legal filed your idea: +2 patents');
    }
    checkAchievements();
  }

  // ================================================================ offline

  function offlineGain(sec, show) {
    const cap = offlineCapH() * 3600;
    const t = Math.min(sec, cap);
    S.stats.longestAway = Math.max(S.stats.longestAway, sec);
    compute();
    const eff = 0.5 + 0.1 * PERK('parachute');
    const kills = Math.floor(C.kps * t * eff);
    let cash = 0, drops = 0;
    if (kills > 0) {
      cash = kills * cashAt(S.stage) * C.cashBase;
      earn(cash);
      bump('blockers', kills);
      if (isUnlocked('assets')) {
        drops = Math.min(12, Math.floor(kills * C.drop));
        for (let i = 0; i < drops; i++) addItem(rollItem(false), true);
      }
    }
    if (S.blocker && S.blocker.boss) S.blocker.deadline = now() + C.bossTime * 1000;
    const before = S.stats.engagements;
    processMissions();
    processLab();
    const autoMissions = S.stats.engagements - before;
    if (RES('autolevel') && S.settings.autoLevel) levelSquadGreedy(2000);
    checkAchievements();
    if (show && (kills > 0 || autoMissions)) {
      modal('While you were in meetings…',
        `<p>You were away for <b>${fmtDur(sec)}</b>${sec > cap ? ` (accrual capped at ${offlineCapH()}h)` : ''}. Your squad kept working:</p>
         <ul><li><b>${fmt(kills)}</b> blockers cleared</li><li><b>${money(cash)}</b> revenue</li>
         ${drops ? `<li><b>${drops}</b> assets found</li>` : ''}${autoMissions ? `<li><b>${autoMissions}</b> engagements auto-completed</li>` : ''}</ul>
         <p class="muted small">Offline efficiency ${Math.round(eff * 100)}%.</p>`);
    }
  }

  // ================================================================ UI: chrome

  const toastQueue = [];
  function toast(msg) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    toastQueue.push(el);
    while (toastQueue.length > 3) toastQueue.shift().remove();
    setTimeout(() => { el.remove(); const i = toastQueue.indexOf(el); if (i >= 0) toastQueue.splice(i, 1); }, 2500 + msg.length * 40);
  }

  let modalCb = null;
  function modal(title, body, onOk, cancel) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body;
    $('#modalCancel').classList.toggle('hidden', !cancel);
    modalCb = onOk || null;
    $('#modal').classList.remove('hidden');
  }
  function closeModal(ok) {
    $('#modal').classList.add('hidden');
    const cb = modalCb;
    modalCb = null;
    if (ok && cb) cb();
    renderView(true);
  }

  function log(html, cls = '') {
    const d = new Date();
    feed.unshift({ t: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, html, cls });
    if (feed.length > 60) feed.pop();
    const el = $('#feed');
    if (el) el.innerHTML = feedHtml();
  }
  const feedHtml = () => feed.map(f => `<li class="${f.cls}"><span class="t">${f.t}</span><span>${f.html}</span></li>`).join('');

  const initials = name => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || name.slice(0, 2).toUpperCase();
  const avatar = (id, locked) => `<span class="avatar ${locked ? 'locked' : PEOPLE[id].role}">${initials(PEOPLE[id].name)}</span>`;
  const band = r => `<span class="lvl r${r}">${D.RARITY[r].key} ${D.RARITY[r].name}</span>`;
  const starsHtml = n => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;

  function actionable() {
    const out = [];
    if (isUnlocked('engage')) {
      const ready = S.missions.filter(m => m && now() >= m.end).length;
      if (ready) out.push({ text: `${ready} engagement${ready > 1 ? 's' : ''} ready to collect`, view: 'engage', count: true });
      const free = Array.from({ length: missionSlots() }, (_, i) => !S.missions[i]).filter(Boolean).length;
      if (free && bench().length && S.offers.some(o => o.n <= bench().length)) out.push({ text: `${free} engagement slot${free > 1 ? 's' : ''} free`, view: 'engage', count: true });
    }
    if (isUnlocked('rnd') && S.lab.length < labSlots() && D.RESEARCH.some(r => RES(r.id) < r.max && r.cost(RES(r.id)) <= S.patents && !S.lab.some(l => l.id === r.id))) {
      out.push({ text: 'R&D lab is idle', view: 'rnd', count: true });
    }
    if (isUnlocked('okr') && okrClaimable()) out.push({ text: `${okrClaimable()} OKR${okrClaimable() > 1 ? 's' : ''} ready to claim`, view: 'okr', count: true });
    if (isUnlocked('recruit') && S.referrals >= 1) out.push({ text: `${S.referrals} referral${S.referrals > 1 ? 's' : ''} to spend`, view: 'recruit', count: S.referrals >= 10 });
    if (isUnlocked('board') && sharesOnIpo() >= Math.max(1, S.shares + Object.keys(S.perks).length)) out.push({ text: `IPO available: +${sharesOnIpo()} shares`, view: 'board', count: true });
    const perk = D.PERKS.find(p => PERK(p.id) < p.max && p.cost(PERK(p.id)) <= S.shares);
    if (perk) out.push({ text: 'Unspent shares: buy a board perk', view: 'board', count: true });
    if (!(RES('autolevel') && S.settings.autoLevel) && S.squad.some(id => levelCost(id) <= S.cash)) out.push({ text: 'Level-ups affordable', view: 'team', count: false });
    if (S.farming) out.push({ text: `Launch on project ${S.stage} is blocked. Strengthen your squad.`, view: 'team', count: false });
    return out;
  }

  // ================================================================ UI: navigation

  const NAV = [
    ['WORKSPACE', [['overview', 'Overview'], ['team', 'Team'], ['recruit', 'Talent pipeline', 'recruit'], ['assets', 'IT assets', 'assets']]],
    ['OPERATIONS', [['engage', 'Client engagements', 'engage'], ['rnd', 'R&D', 'rnd'], ['okr', 'OKRs & badges']]],
    ['COMPANY', [['board', 'Board & IPO', 'board'], ['rank', 'Rankings'], ['settings', 'Settings']]],
  ];
  let view = 'overview';

  function navBadge(v) {
    if (v === 'engage') return S.missions.filter(m => m && now() >= m.end).length;
    if (v === 'okr') return isUnlocked('okr') ? okrClaimable() : 0;
    if (v === 'recruit') return S.referrals;
    if (v === 'rnd') return S.lab.filter(l => now() >= l.end).length;
    return 0;
  }
  function renderNav() {
    $('#nav').innerHTML = NAV.map(([sec, items]) => `<div class="nav-section">${sec}</div>` + items.map(([v, label, gate]) => {
      if (gate && !isUnlocked(gate)) return `<div class="nav locked">${label}<span class="muted small" style="margin-left:auto">P${D.UNLOCKS[gate]}</span></div>`;
      const isNew = gate && !S.seen[v];
      const b = navBadge(v);
      return `<button class="nav ${v === view ? 'active' : ''}" data-act="nav" data-view="${v}">${label}${isNew ? '<span class="new">New</span>' : b ? `<span class="count badge">${b > 99 ? '99+' : b}</span>` : ''}</button>`;
    }).join('')).join('');
  }

  function go(v) {
    view = v;
    S.seen[v] = true;
    document.body.classList.remove('nav-open');
    renderNav();
    renderView(true);
    window.scrollTo(0, 0);
  }

  // ================================================================ UI: views

  const VIEWS = {};

  VIEWS.overview = () => `
    <div class="page-head"><div><div class="muted small">${greeting()}</div><h1>Overview</h1></div></div>
    <div class="grid2">
      <div class="card project" id="pjCard">
        <div class="muted small" id="pjClient"></div>
        <h2 id="pjTitle"></h2>
        <div class="phase" id="pjPhase">${'<span></span>'.repeat(WAVES)}</div>
        <div class="blocker"><span class="tag" id="blTag"></span><b id="blName"></b><span class="grow"></span><span class="bad small" id="blTimer"></span></div>
        <div class="bar"><div class="fill" id="blBar"></div></div>
        <div class="muted small" id="blHp" style="margin-top:4px"></div>
        <div class="proj-actions">
          <button class="btn primary" data-act="assist" title="Space">Assist</button>
          <button class="btn" data-act="allhands" id="btnAllhands" title="Key 1">All-hands</button>
          <button class="btn ${isUnlocked('pizza') ? '' : 'hidden'}" data-act="pizza" id="btnPizza" title="Key 2">Pizza Friday</button>
          <button class="btn hidden" data-act="attempt" id="btnAttempt">Attempt launch</button>
          <span class="toggle" data-act="autoAdvance" id="tgAuto"><span class="sw"></span>Auto-advance</span>
        </div>
        <div id="floaters"></div>
      </div>
      <div class="card upnext"><div class="card-title">Up next</div><ul id="upNext"></ul></div>
    </div>
    <div class="kpis">
      <div class="kpi"><label>Team output</label><b id="kDps"></b><span>per second</span></div>
      <div class="kpi"><label>Revenue</label><b id="kCash"></b><span id="kIncome"></span></div>
      <div class="kpi"><label>Referrals</label><b id="kRef"></b><span>for recruiting</span></div>
      <div class="kpi"><label>Patents</label><b id="kPat"></b><span>for R&amp;D</span></div>
      <div class="kpi"><label>Highest project</label><b id="kMax"></b><span id="kShares"></span></div>
    </div>
    <div class="grid2">
      <div class="card"><div class="card-title">Squad <span class="muted small" id="sqCount"></span>
        <span class="actions"><button class="btn sm" data-act="levelSquad">Level all</button><button class="btn sm" data-act="bestSquad">Best squad</button></span></div>
        <div class="table-wrap" id="squadMini"></div></div>
      <div class="card"><div class="card-title">Activity</div><ul class="feed" id="feed">${feedHtml()}</ul></div>
    </div>`;

  function greeting() {
    const h = new Date().getHours();
    return `Good ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}${S.name ? ', ' + esc(S.name) : ''}`;
  }

  function updateOverview() {
    const b = S.blocker;
    if (!$('#pjCard')) return;
    $('#pjCard').classList.toggle('boss', b.boss);
    $('#pjClient').textContent = `Project ${S.stage} · Phase ${S.wave}/${WAVES}`;
    $('#pjTitle').textContent = projectName(S.stage);
    const spans = $('#pjPhase').children;
    for (let i = 0; i < WAVES; i++) {
      spans[i].className = (i + 1 < S.wave ? 'done' : i + 1 === S.wave ? 'cur' : '') + (isBossWave(S.stage, i + 1) ? ' boss' : '');
    }
    const tag = $('#blTag');
    tag.className = 'tag' + (b.boss ? ' boss' : S.farming ? ' farm' : '');
    tag.textContent = b.boss ? 'LAUNCH' : S.farming ? 'Regrouping' : 'Blocker';
    $('#blName').textContent = b.name;
    $('#blBar').style.width = (100 * Math.max(0, b.hp) / b.max) + '%';
    $('#blHp').textContent = `${fmt(Math.max(0, b.hp))} / ${fmt(b.max)} effort remaining`;
    $('#blTimer').textContent = b.boss ? `Deadline ${Math.max(0, Math.ceil((b.deadline - now()) / 1000))}s` : '';
    const t = now();
    const ah = $('#btnAllhands');
    ah.disabled = t < S.allHandsReady;
    ah.classList.toggle('on', t < S.allHandsUntil);
    ah.textContent = t < S.allHandsUntil ? `All-hands · ${Math.ceil((S.allHandsUntil - t) / 1000)}s` : t < S.allHandsReady ? `All-hands (${fmtDur((S.allHandsReady - t) / 1000)})` : 'All-hands';
    const pz = $('#btnPizza');
    pz.disabled = t < S.pizzaReady;
    pz.classList.toggle('on', t < S.pizzaUntil);
    pz.textContent = t < S.pizzaUntil ? `Pizza · ${Math.ceil((S.pizzaUntil - t) / 1000)}s` : t < S.pizzaReady ? `Pizza Friday (${fmtDur((S.pizzaReady - t) / 1000)})` : 'Pizza Friday';
    $('#btnAttempt').classList.toggle('hidden', !S.farming);
    $('#tgAuto').classList.toggle('on', S.autoAdvance);
    $('#kDps').textContent = fmt(C.dps);
    $('#kCash').textContent = money(S.cash);
    $('#kIncome').textContent = `+${money(C.income * (t < S.pizzaUntil ? 3 : 1))}/s`;
    $('#kRef').textContent = fmt(S.referrals);
    $('#kPat').textContent = fmt(S.patents);
    $('#kMax').textContent = S.maxStage;
    $('#kShares').textContent = S.ipos ? `${S.ipos} IPO${S.ipos > 1 ? 's' : ''} · ${fmt(S.shares)} shares` : 'all time';
  }

  function updateOverviewSlow() {
    if (!$('#squadMini')) return;
    $('#sqCount').textContent = `${S.squad.length}/${squadSlots()}`;
    const total = S.squad.reduce((a, id) => a + memberOutput(id), 0) || 1;
    $('#squadMini').innerHTML = `<table class="table"><thead><tr><th>Employee</th><th class="num">Lvl</th><th class="num">Output/s</th><th></th></tr></thead><tbody>` +
      S.squad.map(id => {
        const out = memberOutput(id), c = levelCost(id);
        return `<tr><td><div class="person">${avatar(id)}<div><div class="nm">${esc(PEOPLE[id].name)}</div><div class="bio">${band(PEOPLE[id].r)} ${D.ROLES[PEOPLE[id].role].name}</div></div></div></td>
          <td class="num">${S.staff[id].lvl}</td><td class="num">${fmt(out)}<div class="bar thin"><div class="fill" style="width:${100 * out / total}%"></div></div></td>
          <td class="num"><button class="btn sm" data-act="level" data-id="${id}" data-n="1" ${c > S.cash ? 'disabled' : ''}>+1 · ${money(c)}</button></td></tr>`;
      }).join('') + '</tbody></table>';
    const acts = actionable();
    $('#upNext').innerHTML = acts.length
      ? acts.map(a => `<li><span class="dotc ${a.count ? '' : 'ok'}"></span><a data-act="nav" data-view="${a.view}">${esc(a.text)}</a></li>`).join('')
      : '<li class="muted">You\'re all caught up. Your squad has it handled.</li>';
  }

  VIEWS.team = () => {
    const ids = owned().sort((a, b) => (S.squad.includes(b) - S.squad.includes(a)) || rawOutput(b) - rawOutput(a));
    return `
    <div class="page-head"><div><div class="muted small">${ids.length} people · squad ${S.squad.length}/${squadSlots()}</div><h1>Team</h1></div>
      <div class="actions"><button class="btn" data-act="bestSquad">Best squad</button>${isUnlocked('assets') ? '<button class="btn" data-act="equipBest">Equip best assets</button>' : ''}<button class="btn primary" data-act="levelSquad">Level squad (best value)</button></div></div>
    <div class="card"><div class="table-wrap"><table class="table">
      <thead><tr><th>Employee</th><th>Level band</th><th>Promotion</th><th class="num">Lvl</th><th class="num">Output/s</th><th>Passive (in squad)</th>${isUnlocked('assets') ? '<th>Assets</th>' : ''}<th>Status</th><th class="num">Level up</th><th></th></tr></thead>
      <tbody>${ids.map(teamRow).join('')}</tbody></table></div>
      <p class="muted small">Output doubles at level 10 and every 25 levels. Duplicate recruits promote people (+1★ = ×1.5 output and stronger passives).</p></div>`;
  };
  function teamRow(id) {
    const p = PEOPLE[id], st = S.staff[id];
    const inSquad = S.squad.includes(id), away = onMission(id);
    const c1 = levelCost(id), c10 = levelCost(id, 10), mx = maxLevels(id);
    const gear = Object.keys(D.GEAR).map(slot => {
      const it = S.items.find(i => i.owner === id && i.slot === slot);
      return it ? `<span class="r${it.r}" title="${esc(itemName(it))} +${it.pct}%">${D.GEAR[slot].short}</span>` : `<span class="muted" title="No ${D.GEAR[slot].name.toLowerCase()}">–</span>`;
    }).join('');
    return `<tr class="${inSquad ? '' : 'dim'}">
      <td><div class="person">${avatar(id)}<div><div class="nm">${esc(p.name)}</div><div class="bio">${esc(p.bio)}</div></div></div></td>
      <td>${band(p.r)}<div class="bio muted small">${D.ROLES[p.role].name}</div></td>
      <td>${starsHtml(st.stars)}</td>
      <td class="num">${st.lvl}</td>
      <td class="num">${fmt(memberOutput(id))}</td>
      <td class="small muted">${D.ROLES[p.role].passiveText(Math.round(passiveOf(id)))}</td>
      ${isUnlocked('assets') ? `<td><div class="gearpips">${gear}</div></td>` : ''}
      <td><span class="status ${away ? 'away' : inSquad ? 'squad' : 'bench'}">${away ? 'On engagement' : inSquad ? 'Squad' : 'Bench'}</span></td>
      <td class="num"><div class="btns">
        <button class="btn sm" data-act="level" data-id="${id}" data-n="1" ${c1 > S.cash ? 'disabled' : ''}>+1<span class="sub">${money(c1)}</span></button>
        <button class="btn sm" data-act="level" data-id="${id}" data-n="10" ${c10 > S.cash ? 'disabled' : ''}>+10<span class="sub">${money(c10)}</span></button>
        <button class="btn sm" data-act="level" data-id="${id}" data-n="max" ${mx < 1 ? 'disabled' : ''}>Max<span class="sub">+${mx}</span></button></div></td>
      <td><button class="btn sm" data-act="squad" data-id="${id}" ${away ? 'disabled' : ''}>${inSquad ? 'Bench' : 'To squad'}</button></td></tr>`;
  }

  VIEWS.recruit = () => {
    const w = D.RARITY.map((r, i) => r.weight * (i >= 2 ? 1 + 0.15 * RES('brand') : 1) * (i === 4 ? Math.pow(1.5, PERK('lucky')) : 1));
    const tw = w.reduce((a, b) => a + b, 0);
    const pull = S.lastPull.length ? `<div class="pull-results">${S.lastPull.map(x => {
      const p = PEOPLE[x.id];
      return `<div class="p r${p.r} ${p.r >= 3 ? 'hi' : ''}">${avatar(x.id)}<div><b>${esc(p.name)}</b><div>${x.kind === 'new' ? 'New hire!' : x.kind === 'star' ? `Promoted to ${S.staff[x.id].stars}★` : 'Max promotion: converted to patents'}</div></div></div>`;
    }).join('')}</div>` : '<p class="muted">No candidates yet. Spend referrals to see who applies.</p>';
    const dir = D.RARITY.map((r, ri) => D.PEOPLE.filter(p => p.r === ri).map(p => {
      const st = S.staff[p.id];
      return `<div class="p ${st ? '' : 'no'}">${avatar(p.id, !st)}<div><b>${esc(p.name)}</b><div>${band(ri)}</div><div class="muted">${st ? starsHtml(st.stars) + ' · Lvl ' + st.lvl : 'Not yet hired'}</div></div></div>`;
    }).join('')).join('');
    return `
    <div class="page-head"><div><div class="muted small">${fmt(S.referrals)} referral${S.referrals === 1 ? '' : 's'} available</div><h1>Talent pipeline</h1></div>
      <div class="actions"><button class="btn" data-act="recruit" data-n="1" ${S.referrals < 1 ? 'disabled' : ''}>Interview 1<span class="sub">1 referral</span></button>
      <button class="btn primary" data-act="recruit" data-n="10" ${S.referrals < 10 ? 'disabled' : ''}>Interview 10<span class="sub">10 referrals</span></button></div></div>
    <div class="grid2">
      <div class="card"><div class="card-title">Latest candidates</div>${pull}</div>
      <div class="card"><div class="card-title">Hiring odds</div>
        <table class="table"><tbody>${D.RARITY.map((r, i) => `<tr><td>${band(i)}</td><td class="num">${(100 * w[i] / tw).toFixed(1)}%</td></tr>`).join('')}</tbody></table>
        <p class="muted small">Staff or better guaranteed within <b>${25 - S.pity}</b> interviews. Principal guaranteed within <b>${80 - S.pityL}</b>.<br>
        Referrals come from first-time launches, badges, OKRs, engagements and the occasional message.</p></div>
    </div>
    <div class="card"><div class="card-title">Directory <span class="muted small">${owned().length}/${D.PEOPLE.length} hired</span></div><div class="dir">${dir}</div></div>`;
  };

  VIEWS.assets = () => {
    const spare = S.items.filter(i => !i.owner).sort((a, b) => b.pct - a.pct);
    const rows = S.squad.map(id => `<tr><td><div class="person">${avatar(id)}<div class="nm">${esc(PEOPLE[id].name)}</div></div></td>${Object.keys(D.GEAR).map(slot => {
      const it = S.items.find(i => i.owner === id && i.slot === slot);
      return `<td>${it ? `<span class="r${it.r}">${esc(itemName(it))}</span><div class="muted small">+${it.pct}%</div>` : '<span class="muted">—</span>'}</td>`;
    }).join('')}<td class="num">+${gearPct(id)}%</td></tr>`).join('');
    return `
    <div class="page-head"><div><div class="muted small">${S.items.length}/${MAX_ITEMS} assets · drop chance ${(C.drop * 100).toFixed(1)}% per blocker, guaranteed from launches</div><h1>IT assets</h1></div>
      <div class="actions">${RES('autoequip') ? `<span class="toggle ${S.settings.autoEquip ? 'on' : ''}" data-act="setting" data-key="autoEquip"><span class="sw"></span>Auto-equip</span>` : ''}
      <button class="btn" data-act="recycleAll">Recycle unassigned</button><button class="btn primary" data-act="equipBest">Equip best</button></div></div>
    <div class="card"><div class="card-title">Squad equipment</div><div class="table-wrap"><table class="table">
      <thead><tr><th>Employee</th>${Object.values(D.GEAR).map(g => `<th>${g.name}</th>`).join('')}<th class="num">Bonus</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="card"><div class="card-title">Unassigned <span class="muted small">${spare.length}</span></div>
      ${spare.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Asset</th><th>Type</th><th>Grade</th><th class="num">Bonus</th><th class="num">Found on</th><th></th></tr></thead><tbody>${spare.map(i => `
        <tr><td class="r${i.r}">${esc(itemName(i))}</td><td>${D.GEAR[i.slot].name}</td><td>${band(i.r)}</td><td class="num">+${i.pct}%</td><td class="num">P${i.lvl}</td>
        <td class="num"><button class="btn sm" data-act="recycle" data-item="${i.id}">Recycle · ${money(itemValue(i) * C.cashBase)}</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">Nothing unassigned. Assets drop while your squad works.</p>'}
      <p class="muted small">Assets add a percentage to the person using them. Higher projects drop stronger assets.</p></div>`;
  };

  VIEWS.engage = () => {
    const slots = Array.from({ length: missionSlots() }, (_, i) => S.missions[i] || null);
    const free = freeMissionSlot() >= 0, benchN = bench().length;
    const slotHtml = slots.map((m, i) => {
      if (!m) return `<div class="li"><div class="grow"><b>Slot ${i + 1}</b><div class="meta">Free. Pick an offer below.</div></div></div>`;
      const done = now() >= m.end;
      const pct = clamp((now() - m.start) / (m.end - m.start), 0, 1) * 100;
      return `<div class="li ${done ? 'done' : ''}"><div class="grow"><b>${esc(m.offer.name)}</b>
        <div class="meta">${m.staff.map(id => esc(PEOPLE[id].name)).join(', ')} · rating ${Math.round(m.factor * 100)}%</div>
        <div class="bar thin"><div class="fill ${done ? 'green' : ''}" style="width:${pct}%"></div></div></div>
        ${done ? `<button class="btn primary" data-act="collect" data-slot="${i}">Collect</button>` : `<span class="muted small nowrap">${fmtDur((m.end - now()) / 1000)} left</span>`}</div>`;
    }).join('');
    const offers = S.offers.map(o => `<div class="li"><div class="grow"><b>${esc(o.name)}</b>
      <div class="meta">${fmtDur(o.dur)} · ${o.n} ${o.n > 1 ? 'people' : 'person'} · prefers ${D.ROLES[o.role].name}</div>
      <div class="meta">≈ ${money(o.cash)} · ~${o.patents < 10 ? o.patents.toFixed(1) : Math.round(o.patents)} patents${o.referrals >= 0.3 ? ` · ~${o.referrals.toFixed(1)} referrals` : ''} · ${Math.round(o.gear * 100)}% asset</div></div>
      <button class="btn" data-act="startOffer" data-offer="${o.id}" ${!free || benchN < o.n ? 'disabled' : ''}>Staff &amp; start</button></div>`).join('');
    const cd = S.offersAt - now();
    return `
    <div class="page-head"><div><div class="muted small">${benchN} on the bench · staff come from people not in your squad</div><h1>Client engagements</h1></div>
      <div class="actions">${RES('repeat') ? `<span class="toggle ${S.settings.autoRepeat ? 'on' : ''}" data-act="setting" data-key="autoRepeat"><span class="sw"></span>Auto-repeat</span>` : ''}
      <button class="btn" data-act="refreshOffers" ${cd > 0 ? 'disabled' : ''}>${cd > 0 ? `New offers in ${fmtDur(cd / 1000)}` : 'Refresh offers'}</button></div></div>
    <div class="card"><div class="card-title">Active</div><div class="list">${slotHtml}</div></div>
    <div class="card"><div class="card-title">Offers</div><div class="list">${offers}</div>
      <p class="muted small">Rewards scale with the staff's output versus what the client expects (shown as rating), +25% if someone has the preferred role.${benchN ? '' : ' <b>Your bench is empty</b>: recruit more people or take someone out of the squad.'}</p></div>`;
  };

  VIEWS.rnd = () => {
    const lab = S.lab.map(l => {
      const pct = clamp((now() - l.start) / (l.end - l.start), 0, 1) * 100;
      return `<div class="li"><div class="grow"><b>${esc(RESEARCH[l.id].name)}</b> → level ${RES(l.id) + 1}<div class="bar thin"><div class="fill" style="width:${pct}%"></div></div></div><span class="muted small nowrap">${fmtDur((l.end - now()) / 1000)} left</span></div>`;
    }).join('') || '<div class="li"><div class="grow muted">The lab is idle.</div></div>';
    const items = D.RESEARCH.map(r => {
      const lvl = RES(r.id), maxed = lvl >= r.max, busy = S.lab.some(l => l.id === r.id);
      const cost = maxed ? 0 : r.cost(lvl);
      return `<div class="li ${maxed ? 'done' : ''}"><div class="grow"><b>${esc(r.name)}</b> <span class="muted small">${r.max > 1 ? `level ${lvl}/${r.max}` : maxed ? 'done' : ''}</span>
        <div class="meta">${esc(r.desc)}</div></div>
        ${maxed ? '<span class="good small">✓ Complete</span>' : `<button class="btn" data-act="research" data-id="${r.id}" ${busy || S.patents < cost || S.lab.length >= labSlots() ? 'disabled' : ''}>${busy ? 'In progress' : `Start · ${cost} patents`}<span class="sub">${fmtDur(r.time(lvl))}</span></button>`}</div>`;
    }).join('');
    return `
    <div class="page-head"><div><div class="muted small">${fmt(S.patents)} patents · ${S.lab.length}/${labSlots()} lab${labSlots() > 1 ? 's' : ''} busy</div><h1>R&amp;D</h1></div></div>
    <div class="card"><div class="card-title">In the lab</div><div class="list">${lab}</div></div>
    <div class="card"><div class="card-title">Programmes</div><div class="list">${items}</div>
    <p class="muted small">Research is permanent. It survives IPOs and keeps running while you're away.</p></div>`;
  };

  VIEWS.okr = () => {
    const okrs = isUnlocked('okr') ? S.okr.list.map((o, i) => {
      const def = OKR_BY_ID[o.id], p = okrProgress(o);
      return `<div class="li ${o.claimed ? 'done' : ''}"><div class="grow"><b>${esc(def.text(o.target))}</b>
        <div class="bar thin"><div class="fill ${p >= o.target ? 'green' : ''}" style="width:${100 * p / o.target}%"></div></div>
        <div class="meta">${fmt(p)} / ${fmt(o.target)}</div></div>
        ${o.claimed ? '<span class="good small">✓ Claimed</span>' : `<button class="btn ${p >= o.target ? 'primary' : ''}" data-act="claimOkr" data-i="${i}" ${p < o.target ? 'disabled' : ''}>Claim</button>`}</div>`;
    }).join('') : `<div class="li locked"><div class="grow">Daily OKRs unlock at project ${D.UNLOCKS.okr}.</div></div>`;
    const badges = ACH.map(a => `<div class="badgec ${S.achievements[a.id] ? 'yes' : 'no'}"><b>${esc(a.name)}</b><span class="muted">${esc(a.desc)}</span></div>`).join('');
    return `
    <div class="page-head"><div><div class="muted small">${isUnlocked('okr') ? `Resets at midnight · streak ${S.streak} day${S.streak === 1 ? '' : 's'}` : ''}</div><h1>OKRs &amp; badges</h1></div></div>
    <div class="card"><div class="card-title">Today's OKRs</div><div class="list">${okrs}</div>
      <p class="muted small">Each OKR: +3 referrals (and +3 patents once R&amp;D is open). All three: a streak bonus of 5–12 referrals.</p></div>
    <div class="card"><div class="card-title">Badges <span class="muted small">${Object.keys(S.achievements).length}/${ACH.length} · each +2% team output</span></div><div class="badges">${badges}</div></div>`;
  };

  VIEWS.board = () => {
    const gain = sharesOnIpo();
    const perks = D.PERKS.map(p => {
      const lvl = PERK(p.id), maxed = lvl >= p.max, cost = maxed ? 0 : p.cost(lvl);
      return `<div class="li ${maxed ? 'done' : ''}"><div class="grow"><b>${esc(p.name)}</b> <span class="muted small">${p.max > 1 && p.max < 999 ? `${lvl}/${p.max}` : p.max === 999 ? `level ${lvl}` : maxed ? 'owned' : ''}</span><div class="meta">${esc(p.desc)}</div></div>
        ${maxed ? '<span class="good small">✓</span>' : `<button class="btn" data-act="perk" data-id="${p.id}" ${S.shares < cost ? 'disabled' : ''}>${cost} share${cost > 1 ? 's' : ''}</button>`}</div>`;
    }).join('');
    return `
    <div class="page-head"><div><div class="muted small">${fmt(S.shares)} shares · ${S.ipos} IPO${S.ipos === 1 ? '' : 's'} so far</div><h1>Board &amp; IPO</h1></div></div>
    <div class="grid2">
      <div class="card"><div class="card-title">Initial public offering</div>
        <p>Highest project this run: <b>${S.maxStageRun}</b>. Going public now would raise <b>${gain} share${gain === 1 ? '' : 's'}</b>.</p>
        <p class="muted small">Shares = ((highest project − 50) ÷ 5)<sup>1.7</sup>, from project ${D.UNLOCKS.board}. You restart at project 1 with your people, promotions, assets and research.</p>
        <button class="btn primary" data-act="ipo" ${gain < 1 ? 'disabled' : ''}>Ring the bell</button></div>
      <div class="card"><div class="card-title">Board perks</div><div class="list">${perks}</div></div>
    </div>`;
  };

  VIEWS.rank = () => `
    <div class="page-head"><div><div class="muted small" id="lbSource"></div><h1>Rankings</h1></div>
      <div class="actions"><button class="btn" data-act="lbRefresh">Refresh</button><button class="btn primary" data-act="lbSubmit">Submit my numbers</button></div></div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Name</th><th class="num">Highest project</th><th>Details</th></tr></thead><tbody id="lbBody"><tr><td colspan="4" class="muted">Loading…</td></tr></tbody></table></div></div>`;

  VIEWS.settings = () => `
    <div class="page-head"><div><h1>Settings</h1></div></div>
    <div class="card">
      <label class="field">Display name<input id="setName" maxlength="20" value="${esc(S.name)}" placeholder="Your name"></label>
      <div class="row"><span class="toggle ${S.settings.stealth ? 'on' : ''}" data-act="setting" data-key="stealth"><span class="sw"></span>Stealth mode (no colours, animations or floating numbers)</span></div>
      <div class="row"><span class="toggle ${S.settings.badge ? 'on' : ''}" data-act="setting" data-key="badge"><span class="sw"></span>Show a task count in the browser tab, e.g. "(2) Atlas Workforce"</span></div>
      ${RES('autolevel') ? `<div class="row"><span class="toggle ${S.settings.autoLevel ? 'on' : ''}" data-act="setting" data-key="autoLevel"><span class="sw"></span>Auto-level squad (Process automation)</span></div>` : ''}
      <div class="row"><button class="btn" data-act="export">Export save</button><button class="btn" data-act="import">Import save</button><button class="btn danger" data-act="reset">Hard reset</button></div>
      <textarea id="saveBox" class="hidden" rows="4" placeholder="Paste a save here, then press Import again"></textarea>
      <p class="muted small">Progress saves in this browser every few seconds. Keys: <b>Space</b> assist · <b>1</b> all-hands · <b>2</b> pizza · <b>Esc</b> or <b>\`</b> report view.</p>
    </div>`;

  let pointerDown = false;
  function renderView(force) {
    const root = $('#view');
    if (!force && (pointerDown || (document.activeElement && root.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName)))) return;
    if (!force && (view === 'rank' || view === 'settings')) return;
    if (view === 'overview' && !force && $('#pjCard')) { updateOverviewSlow(); return; }
    const y = window.scrollY;
    root.innerHTML = VIEWS[view]();
    if (view === 'overview') { updateOverview(); updateOverviewSlow(); }
    if (view === 'rank' && force) refreshLeaderboard();
    if (!force) window.scrollTo(0, y);
  }

  async function refreshLeaderboard() {
    const { source, rows } = await window.Leaderboard.top(GAME_ID, 'desc', 30);
    const src = $('#lbSource');
    if (!src) return;
    src.textContent = source === 'server' ? 'Live org-wide rankings' : 'Showing this browser only (no ranking server reachable)';
    $('#lbBody').innerHTML = rows.map((r, i) => `<tr class="${r.name === S.name ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td class="num">${fmt(r.score)}</td><td class="muted">${esc(r.meta || '')}</td></tr>`).join('')
      || '<tr><td colspan="4" class="muted">No submissions yet.</td></tr>';
  }
  async function submitScore() {
    if (!S.name) { go('settings'); toast('Set a display name first'); return; }
    const where = await window.Leaderboard.submit(GAME_ID, S.name, S.maxStage, `${owned().length} hired · ${S.ipos} IPO${S.ipos === 1 ? '' : 's'}`, 'desc');
    toast(where === 'server' ? 'Submitted to org rankings' : 'Saved locally (no ranking server reachable)');
    refreshLeaderboard();
  }

  // ================================================================ actions

  const ACTIONS = {
    nav: d => go(d.view),
    toggleNav: () => document.body.classList.toggle('nav-open'),
    decoy: () => toggleDecoy(),
    ping: () => answerPing(),
    assist: (d, ev) => assist(ev),
    allhands: () => allHands(),
    pizza: () => pizza(),
    attempt: () => attemptLaunch(),
    autoAdvance: () => { S.autoAdvance = !S.autoAdvance; if (S.autoAdvance && S.farming && canBeatBoss()) attemptLaunch(); },
    level: d => { levelUp(d.id, d.n === 'max' ? 'max' : Number(d.n)); renderView(true); },
    levelSquad: () => { const n = levelSquadGreedy(); toast(n ? `Approved ${n} level-ups` : 'Nothing affordable yet'); renderView(true); },
    bestSquad: () => { bestSquad(); if (RES('autoequip') && S.settings.autoEquip) equipBest(); renderView(true); },
    squad: d => { toggleSquad(d.id); renderView(true); },
    recruit: d => { recruit(Number(d.n)); renderView(true); },
    equipBest: () => { equipBest(); toast('Assets reassigned'); renderView(true); },
    recycle: d => { recycle(Number(d.item)); renderView(true); },
    recycleAll: () => { recycleAll(); renderView(true); },
    startOffer: d => { startOffer(d.offer); renderView(true); },
    collect: d => { collectMission(Number(d.slot)); checkAchievements(); renderView(true); },
    refreshOffers: () => { if (now() < S.offersAt) return; compute(); S.offers = []; ensureOffers(); S.offersAt = now() + 30 * 60000; renderView(true); },
    research: d => { startResearch(d.id); renderView(true); },
    claimOkr: d => { claimOkr(Number(d.i)); renderView(true); },
    ipo: () => ipo(),
    perk: d => { buyPerk(d.id); renderView(true); },
    lbRefresh: () => refreshLeaderboard(),
    lbSubmit: () => submitScore(),
    setting: d => { S.settings[d.key] = !S.settings[d.key]; if (d.key === 'autoEquip' && S.settings.autoEquip) equipBest(); applySettings(); renderView(true); },
    export: () => {
      const box = $('#saveBox');
      box.classList.remove('hidden');
      box.value = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      box.select();
      toast('Save copied into the box below');
    },
    import: () => {
      const box = $('#saveBox');
      if (box.classList.contains('hidden') || !box.value.trim()) { box.classList.remove('hidden'); box.value = ''; box.focus(); return; }
      try {
        S = hydrate(JSON.parse(decodeURIComponent(escape(atob(box.value.trim())))));
        if (!S.blocker) spawn();
        save();
        toast('Save imported');
        go('overview');
      } catch { toast('That save looks corrupted'); }
    },
    reset: () => modal('Hard reset?', '<p>This deletes everything: people, research, badges and shares.</p>', () => {
      S = fresh(); spawn(); save(); go('overview');
    }, true),
  };

  function applySettings() {
    document.body.classList.toggle('stealth', S.settings.stealth);
  }

  function toggleDecoy() {
    const d = $('#decoy');
    const show = d.classList.contains('hidden');
    d.classList.toggle('hidden', !show);
    if (show) {
      bump('panics');
      hidePing();
      document.title = 'Performance Calibration · Atlas Workforce';
      checkAchievements();
    } else updateTitle();
  }

  function updateTitle() {
    if (!$('#decoy').classList.contains('hidden')) return;
    const n = actionable().filter(a => a.count).length;
    $('#bellCount').textContent = n;
    $('#bellCount').classList.toggle('hidden', !n);
    document.title = (S.settings.badge && n ? `(${n}) ` : '') + 'Atlas Workforce';
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
      if (e.target.id === 'setName') { S.name = e.target.value.trim().slice(0, 20); $('#meAvatar').textContent = initials(S.name || '?'); }
    });
    $('#modalOk').addEventListener('click', () => closeModal(true));
    $('#modalCancel').addEventListener('click', () => closeModal(false));
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(false); });
    $('#decoy').addEventListener('dblclick', toggleDecoy);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' || e.key === '`') {
        if (!$('#modal').classList.contains('hidden') && e.key === 'Escape') { closeModal(false); return; }
        e.preventDefault(); toggleDecoy(); return;
      }
      if (!$('#decoy').classList.contains('hidden')) return;
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'Enter' && !$('#modal').classList.contains('hidden')) { closeModal(true); return; }
      if (document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); assist(); }
      if (e.key === '1') allHands();
      if (e.key === '2') pizza();
    });
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }

  // ================================================================ loop

  let last = now(), ticks = 0;
  function tick() {
    const t = now();
    const dt = (t - last) / 1000;
    last = t;
    if (dt > 10) {
      // Background tabs get throttled hard; treat long gaps like time away.
      offlineGain(dt, dt > 600);
    } else {
      compute();
      damage(C.dps * dt);
      if (S.blocker.boss && t > S.blocker.deadline && S.blocker.hp > 0) failBoss();
    }
    maybePing();
    if (view === 'overview') updateOverview();
    if (++ticks % 10 === 0) {
      processMissions();
      processLab();
      ensureOkrs();
      if (RES('autolevel') && S.settings.autoLevel) levelSquadGreedy(100);
      if (isUnlocked('engage')) ensureOffers();
      checkAchievements();
      if (!pointerDown) renderNav();
      renderView(false);
      updateTitle();
    }
    if (ticks % 50 === 0) save();
  }

  // ================================================================ boot

  function boot() {
    applySettings();
    $('#meAvatar').textContent = initials(S.name || '?');
    compute();
    if (!S.blocker) spawn();
    checkUnlocks(true);
    if (isUnlocked('engage')) ensureOffers();
    ensureOkrs();
    bind();
    const away = (now() - S.lastSeen) / 1000;
    if (away > 60) offlineGain(away, true);
    else if (S.stats.blockers === 0) {
      modal('Welcome to Atlas Workforce',
        `<p>You manage a small squad. They clear blockers on client projects by themselves, earning revenue.</p>
         <ul><li>Spend revenue on <b>level-ups</b> (Team, or the +1 buttons on the Overview).</li>
         <li>Every 5th project ends in a timed <b>launch</b>. If you miss it, the squad regroups and tries again when it's ready.</li>
         <li>More of the company unlocks as you go. Check back now and then.</li></ul>
         <p class="muted small">Press <b>Esc</b> any time for a very boring report.</p>`);
    }
    log('Signed in. Your squad is on it.');
    renderNav();
    renderView(true);
    updateTitle();
    setInterval(tick, 100);
    if (/[?&]debug/.test(location.search)) {
      window.WF = {
        state: () => S,
        warp: sec => { S.lastSeen -= sec * 1000; for (const m of S.missions) if (m) { m.start -= sec * 1000; m.end -= sec * 1000; } for (const l of S.lab) { l.start -= sec * 1000; l.end -= sec * 1000; } offlineGain(sec, false); },
        give: (cash = 0, refs = 0, pats = 0, shares = 0) => { S.cash += cash; S.referrals += refs; S.patents += pats; S.shares += shares; },
        stage: n => { S.stage = n; S.maxStage = Math.max(S.maxStage, n); S.maxStageRun = Math.max(S.maxStageRun, n); S.wave = 1; spawn(); checkUnlocks(true); },
      };
    }
  }

  boot();
})();
