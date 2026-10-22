// Atlas Workforce engine: game state and rules, no DOM. The UI (game.js) and the balance simulation both drive it.
//
// Time is real time. Projects take minutes to hours, people's moods drift, decisions resolve later,
// and the week's league standings move whether or not the tab is open.
(function (root) {
  'use strict';

  function createEngine(D, opts = {}) {
    const B = D.BALANCE;
    const now = opts.now || (() => Date.now());
    const rand = opts.random || Math.random;
    const emit = opts.emit || (() => {});
    const PEOPLE = Object.fromEntries(D.PEOPLE.map(p => [p.id, p]));
    const OFFICE = Object.fromEntries(D.OFFICE.map(o => [o.id, o]));
    const DECISIONS = Object.fromEntries(D.DECISIONS.map(d => [d.id, d]));
    const RIVALS = Object.fromEntries(D.RIVALS.map(r => [r.id, r]));
    const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;

    const pick = a => a[Math.floor(rand() * a.length)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
    const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
    const phi = x => 0.5 * (1 + erf(x / Math.SQRT2));
    const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
    const weekStart = t => { const d = new Date(t); const back = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime(); };

    // ---------------------------------------------------------------- state

    function person(t) {
      return { lvl: 1, xp: 0, stars: 0, mood: 75, fatigue: 0, bond: 0, restUntil: 0, lastChat: 0, delivered: 0, starSum: 0, hired: t };
    }
    function fresh() {
      const t = now();
      return {
        v: 2, name: '', created: t, lastSeen: t, lastTick: t,
        cash: 0, referrals: 0, lifetime: 0,
        career: { lvl: 1, rep: 0 },
        staff: { tyler: person(t), kai: person(t) },
        items: [], nextItem: 1,
        ws: [null], offers: [], offersAt: 0, refreshAt: 0,
        office: {}, builds: [], funding: 0,
        inbox: [], msgSeq: 1, nextMsgAt: t + 4 * MIN, risks: [], recent: [], lowMoodAt: {},
        commit: null, streak: 0, lastCommitDay: '',
        league: null, leagueTier: 0,
        achievements: {}, unlocked: {}, seen: {},
        tut: 0,
        stats: { deliveries: 0, stars: 0, five: 0, hires: 0, decisions: 0, builds: 0, panics: 0, longestAway: 0, chats: 0, commits: 0, weekWins: 0, dayStars: {}, autoDelivered: 0, refSrc: {} },
        pity: 0, pityL: 0,
        settings: { stealth: false, badge: true, autopilot: true, installHint: true },
        log: [],
        autoSummary: null,
      };
    }

    let S = fresh();

    // ---------------------------------------------------------------- derived numbers

    const lvl = id => S.office[id] || 0;
    const has = (id, trait) => PEOPLE[id].traits.includes(trait);
    const owned = () => Object.keys(S.staff);
    const hearts = id => Math.min(5, Math.floor(S.staff[id].bond / 20));
    const gearPct = id => S.items.reduce((a, i) => a + (i.owner === id ? i.pct : 0), 0);
    const moodMult = m => 0.8 + 0.4 * clamp(m, 0, 100) / 100;
    const achMult = () => 1 + 0.01 * Object.keys(S.achievements).length;
    const fundingMult = () => Math.pow(1.5, S.funding);
    const cashMult = () => fundingMult() * (1 + 0.12 * lvl('phones'));
    // Clients size their asks to what one of your teams could handle (~4★ forecast). rank 0 is your
    // strongest team, rank 1 the next strongest, and so on, so there's work for everyone.
    function teamTier(size, rank = 0) {
      const n = D.SIZES[size].staff;
      const sorted = owned().sort((a, b) => skill(b) - skill(a));
      const start = Math.min(rank * n, Math.max(0, sorted.length - n));
      const ids = sorted.slice(start, start + n);
      if (ids.length < n) return 1;
      const T = ids.reduce((a, id) => a + skill(id), 0) * 1.25;
      return Math.max(1, Math.floor(1 + Math.log(T / (1.52 * B.diffBase * D.SIZES[size].diff)) / Math.log(B.diffGrowth)));
    }
    const maxTier = () => teamTier(owned().length >= 2 ? 'M' : 'S');
    const wsCount = () => 1 + lvl('rooms');
    const onProject = id => S.ws.some(w => w && w.team.includes(id));
    const resting = (id, t = now()) => S.staff[id].restUntil > t;
    const available = (t = now()) => owned().filter(id => !onProject(id) && !resting(id, t));
    const unlocked = id => !!S.unlocked[id];
    const sizeOpen = k => S.career.lvl >= D.SIZES[k].career;
    const crews = () => 1 + (S.funding >= 3 ? 1 : 0);

    function skill(id, ctx = {}) {
      const p = PEOPLE[id], st = S.staff[id];
      let s = B.rarityBase[p.r] * Math.pow(B.levelGrowth, st.lvl - 1) * Math.pow(B.starGrowth, st.stars)
        * (1 + gearPct(id) / 100) * (1 + B.heartBonus * hearts(id)) * moodMult(st.mood)
        * (1 + 0.08 * lvl('servers')) * achMult();
      if (ctx.hour !== undefined) {
        if (has(id, 'night') && (ctx.hour >= 18 || ctx.hour < 6)) s *= 1.2;
        if (has(id, 'early') && ctx.hour >= 6 && ctx.hour < 11) s *= 1.2;
      }
      if (ctx.solo && has(id, 'lone')) s *= 1.35;
      return s;
    }

    function comfort(id) {
      const coffee = 3 * lvl('coffee') * (id && has(id, 'coffee') ? 2 : 1);
      return coffee + lvl('plants') + 2 * lvl('desks') + 2 * lvl('lounge') + 2 * lvl('games');
    }
    function moodBaseline(id) {
      const st = S.staff[id];
      return clamp(50 + comfort(id) + 2 * hearts(id) - 2.5 * st.fatigue - (has(id, 'work') ? 5 : 0), 5, 100);
    }

    const difficulty = (tier, size) => B.diffBase * Math.pow(B.diffGrowth, tier - 1) * D.SIZES[size].diff;
    const cashFor = (tier, size, stars) => B.cashBase * Math.pow(B.cashGrowth, tier - 1) * D.SIZES[size].reward * B.starMult[stars - 1] * cashMult();
    const xpFor = (size, stars, tier = 1) => B.xpPerReward * D.SIZES[size].reward * B.starMult[stars - 1] * (1 + 0.1 * (tier - 1)) * (1 + 0.15 * lvl('library'));
    const repFor = (tier, size, stars) => stars * Math.pow(D.SIZES[size].reward, 0.85) * (1 + 0.12 * (tier - 1));
    // A typical Sprint payout at your current level; decisions are priced in these.
    const refCash = () => cashFor(maxTier(), 'M', 3);

    // ---------------------------------------------------------------- offers & projects

    function genOffer(o = {}) {
      const sizes = Object.keys(D.SIZES).filter(sizeOpen).filter(k => k !== 'MEGA' || o.size === 'MEGA');
      const taken = new Set(S.offers.map(x => x.size));
      const unused = sizes.filter(k => !taken.has(k));
      const size = o.size || pick(unused.length ? unused : sizes);
      const pool = D.PROJECTS.filter(p => D.SIZES[size].staff > 1 || p.needs.length === 1);
      const tmpl = o.tmpl || pick(pool);
      const vip = !!o.vip || rand() < 0.04 + 0.1 * lvl('lobby');
      const roll = rand();
      const stretch = !vip && roll < 0.2;
      const rank = Math.floor(rand() * wsCount());
      const tier = Math.max(1, teamTier(size, rank) + (stretch ? 1 : roll > 0.8 ? -1 : 0)) + (vip ? 1 : 0);
      const lengths = D.LENGTHS.filter(l => D.SIZES[size].dur * l.m <= 8 * 3600);
      let r = rand() * lengths.reduce((a, l) => a + l.w, 0), len = lengths[0];
      for (const l of lengths) { r -= l.w; if (r <= 0) { len = l; break; } }
      const m = o.dur ? 1 : len.m;
      return { id: 'o' + Math.floor(rand() * 1e9).toString(36), client: o.client || pick(D.CLIENTS), name: tmpl.name, needs: tmpl.needs.slice(), size, tier, vip, stretch, m, dur: o.dur || Math.round(D.SIZES[size].dur * m), tut: !!o.tut };
    }
    function ensureOffers() {
      const want = 3 + (S.career.lvl >= 10 ? 1 : 0);
      while (S.offers.length < want) S.offers.push(genOffer());
    }
    function refreshOffers(force) {
      const t = now();
      if (!force && t < S.refreshAt) return false;
      S.offers = S.offers.filter(o => o.vip || o.tut);
      ensureOffers();
      S.refreshAt = t + 20 * MIN;
      S.offersAt = t + 60 * MIN;
      return true;
    }

    function recommend(offer, t = now()) {
      const n = D.SIZES[offer.size].staff;
      const hour = new Date(t).getHours();
      const avail = available(t).sort((a, b) => skill(b, { hour, solo: n === 1 }) - skill(a, { hour, solo: n === 1 }));
      const team = [];
      for (const role of offer.needs) {
        const id = avail.find(x => PEOPLE[x].role === role && !team.includes(x));
        if (id && team.length < n) team.push(id);
      }
      for (const id of avail) {
        if (team.length >= n) break;
        if (!team.includes(id)) team.push(id);
      }
      return team.length === n ? team : null;
    }

    function forecast(offer, team, t = now()) {
      const hour = new Date(t).getHours();
      const solo = team.length === 1;
      const sum = team.reduce((a, id) => a + skill(id, { hour, solo }), 0);
      const covered = offer.needs.filter(r => team.some(id => PEOPLE[id].role === r)).length;
      const T = sum * (1 + 0.25 * covered);
      const Dv = difficulty(offer.tier, offer.size);
      let mean = 3 + 1.5 * Math.log2(T / Dv);
      if (team.some(id => has(id, 'perfect'))) mean += 0.3;
      if (offer.tut) mean = Math.max(mean, 4.4);
      mean = clamp(mean, 0.6, 5.4);
      return { mean, p4: 1 - phi((3.5 - mean) / 0.65), p5: 1 - phi((4.5 - mean) / 0.65), covered };
    }

    function freeSlot() {
      for (let i = 0; i < wsCount(); i++) if (!S.ws[i]) return i;
      return -1;
    }

    function start(offerId, team, at) {
      const t = at || now();
      const offer = S.offers.find(o => o.id === offerId);
      const slot = freeSlot();
      if (!offer || slot < 0) return null;
      team = team || recommend(offer, t);
      if (!team) return null;
      const f = forecast(offer, team, t);
      const speed = team.filter(id => has(id, 'speed')).length;
      const dur = offer.dur * Math.max(0.8, 1 - 0.08 * speed);
      S.ws[slot] = { offer, team, start: t, end: t + dur * 1000, mean: f.mean, p4: f.p4 };
      S.offers = S.offers.filter(o => o !== offer);
      ensureOffers();
      if (S.tut === 0) advanceTut(1);
      else if (S.tut === 4) advanceTut(-1);
      return S.ws[slot];
    }

    const ready = (t = now()) => S.ws.map((w, i) => (w && t >= w.end ? i : -1)).filter(i => i >= 0);

    function rollStars(w) {
      let stars = clamp(Math.round(w.mean + gauss() * 0.65), 1, 5);
      if (w.offer.tut) stars = Math.max(stars, 4);
      if (stars < 5 && w.team.some(id => has(id, 'lucky')) && rand() < 0.15) stars++;
      return stars;
    }

    function signOff(slot, auto) {
      const w = S.ws[slot];
      const t = now();
      if (!w || t < w.end) return null;
      const { offer, team } = w;
      const size = D.SIZES[offer.size];
      const stars = rollStars(w);
      const rain = team.filter(id => has(id, 'rain')).length;
      const lenMult = Math.pow(offer.m || 1, 0.92);
      const cash = cashFor(offer.tier, offer.size, stars) * lenMult * (1 + 0.15 * rain) * (offer.vip ? 1.5 : 1);
      earn(cash);

      const mentors = id => team.filter(x => x !== id && has(x, 'mentor')).length;
      const levelups = [];
      for (const id of team) {
        const st = S.staff[id];
        const before = st.lvl;
        gainXp(id, xpFor(offer.size, stars, offer.tier) * lenMult * (1 + 0.25 * mentors(id)));
        if (st.lvl > before) levelups.push({ id, from: before, to: st.lvl });
        st.mood = clamp(st.mood + [-6, -3, 0, 3, 6][stars - 1] - (stars <= 2 && has(id, 'perfect') ? 4 : 0), 0, 100);
        if (team.some(x => x !== id && has(x, 'social'))) st.mood = clamp(st.mood + 4, 0, 100);
        st.fatigue = Math.min(12, st.fatigue + size.fatigue * Math.sqrt(offer.m || 1) * (has(id, 'work') ? 0.5 : 1));
        if (stars >= 4) st.bond = Math.min(100, st.bond + 2);
        st.delivered++;
        st.starSum += stars;
      }
      const careerBefore = S.career.lvl;
      gainRep(repFor(offer.tier, offer.size, stars) * Math.pow(offer.m || 1, 0.85));

      const items = [];
      if (unlocked('gear')) {
        const chance = offer.size === 'MEGA' ? 1 : (stars - 2) * 0.12 * Math.pow(size.reward, 0.35);
        if (rand() < chance) items.push(addItem(rollItem(stars === 5 ? 1 : 0)));
      }
      let refs = 0;
      if (unlocked('hiring') && stars === 5 && rand() < 0.05) refs = 1;
      addRefs(refs, 'five-star');

      S.stats.deliveries++;
      S.stats.stars += stars;
      if (stars === 5) S.stats.five++;
      const dk = dayKey(t);
      S.stats.dayStars[dk] = (S.stats.dayStars[dk] || 0) + stars;
      if (auto) S.stats.autoDelivered++;

      let commitDone = false;
      if (S.commit && S.commit.tier !== null && S.commit.day === dk) {
        S.commit.progress++;
        if (!S.commit.paid && S.commit.progress >= S.commit.target) commitDone = payCommit();
      }
      const passed = leagueAdd(stars);
      S.ws[slot] = null;
      if (S.tut === 1 || S.tut === 2) advanceTut(3);
      else if (S.tut >= 0 && S.stats.deliveries >= 4) advanceTut(-1);
      const res = { offer, team, stars, cash, xp: xpFor(offer.size, stars, offer.tier) * lenMult, levelups, career: S.career.lvl > careerBefore ? S.career.lvl : 0, items, refs, commitDone, passed };
      addLog(`${offer.client} · ${offer.name}: ${'★'.repeat(stars)}`, stars >= 4 ? 'good' : stars <= 2 ? 'bad' : '');
      checkAchievements();
      return res;
    }

    function gainXp(id, x) {
      const st = S.staff[id];
      st.xp += x;
      while (st.xp >= B.xpNeed(st.lvl)) {
        st.xp -= B.xpNeed(st.lvl);
        st.lvl++;
        emit('levelup', { id, lvl: st.lvl });
      }
    }

    function gainRep(x) {
      const c = S.career;
      c.rep += x;
      while (c.rep >= B.repNeed(c.lvl)) {
        c.rep -= B.repNeed(c.lvl);
        c.lvl++;
        emit('career', { lvl: c.lvl });
        checkUnlocks();
      }
    }

    function earn(x) {
      S.cash += x;
      S.lifetime += x;
      while (S.funding + 1 < D.FUNDING.length && S.lifetime >= D.FUNDING[S.funding + 1].at) {
        S.funding++;
        const round = D.FUNDING[S.funding];
        const injection = round.at * 0.2;
        S.cash += injection;
        message({ kind: 'funding', from: 'ceo', text: round.line, round: S.funding, amount: injection });
        addLog(`🎉 ${round.name} raised`, 'good');
        emit('funding', { round: S.funding, injection });
      }
    }
    const spend = x => { S.cash = Math.max(0, S.cash - x); };
    function addRefs(n, src) {
      if (!n) return;
      S.referrals += n;
      S.stats.refSrc[src] = (S.stats.refSrc[src] || 0) + n;
    }

    // ---------------------------------------------------------------- equipment

    function rollItem(bonus = 0, slot) {
      const w = [60, 25, 10, 4, 1].map((v, i) => v * (1 + bonus * i));
      let roll = rand() * w.reduce((a, b) => a + b, 0), r = 0;
      for (; r < 4; r++) { roll -= w[r]; if (roll <= 0) break; }
      const tier = maxTier();
      return { id: S.nextItem++, slot: slot || pick(Object.keys(D.GEAR)), r, tier, pct: D.GEAR_PCT[r], owner: null };
    }
    // Hand the item to whoever gains the most from it; anything left over is sold.
    function addItem(item, preferId) {
      const order = owned().sort((a, b) => (b === preferId) - (a === preferId) || skill(b) - skill(a));
      for (const id of order) {
        const cur = S.items.find(i => i.owner === id && i.slot === item.slot);
        if (!cur || cur.pct < item.pct) {
          if (cur) { S.items = S.items.filter(i => i !== cur); earn(cur.pct * refCash() * 0.01); }
          item.owner = id;
          S.items.push(item);
          return item;
        }
      }
      earn(item.pct * refCash() * 0.01);
      item.sold = true;
      return item;
    }

    // ---------------------------------------------------------------- hiring

    function rollRarity() {
      if (S.pityL >= 79) return 4;
      const w = D.RARITY.map((r, i) => r.weight * (i >= 2 ? 1 + 0.15 * lvl('recruit') : 1));
      if (S.pity >= 24) { w[0] = 0; w[1] = 0; w[2] = 0; }
      let roll = rand() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) return i; }
      return 0;
    }
    function interview(n) {
      if (!unlocked('hiring') || S.referrals < n) return null;
      S.referrals -= n;
      const out = [];
      for (let k = 0; k < n; k++) {
        const r = rollRarity();
        S.pity = r >= 3 ? 0 : S.pity + 1;
        S.pityL = r === 4 ? 0 : S.pityL + 1;
        const p = pick(D.PEOPLE.filter(x => x.r === r));
        const st = S.staff[p.id];
        if (!st) {
          S.staff[p.id] = person(now());
          out.push({ id: p.id, kind: 'new' });
          message({ kind: 'chat', from: p.id, text: p.hello, reactions: true });
          addLog(`Hired ${p.name}`, r >= 3 ? 'good' : '');
        } else if (st.stars < 5) {
          st.stars++;
          out.push({ id: p.id, kind: 'star', stars: st.stars });
        } else {
          const v = refCash() * (1 + r);
          earn(v);
          out.push({ id: p.id, kind: 'max', cash: v });
        }
      }
      S.stats.hires += n;
      checkAchievements();
      return out;
    }

    function coffeeChat(id) {
      const st = S.staff[id];
      const t = now();
      if (!st || t - st.lastChat < 4 * HOUR) return null;
      st.lastChat = t;
      st.bond = Math.min(100, st.bond + 6 * (1 + 0.25 * lvl('games')));
      st.mood = clamp(st.mood + 8, 0, 100);
      S.stats.chats++;
      checkAchievements();
      return { hearts: hearts(id) };
    }

    // ---------------------------------------------------------------- office

    const zoneOpen = z => S.funding >= D.ZONES[z].funding;
    function buildCost(id) { const o = OFFICE[id]; return o.cost[0] * Math.pow(o.cost[1], lvl(id)); }
    function buildTime(id) { const o = OFFICE[id]; return Math.min(o.time[0] * Math.pow(o.time[1], lvl(id)), 8 * 3600); }
    function buildBlock(id) {
      const o = OFFICE[id];
      if (!zoneOpen(o.zone)) return `Opens at ${D.FUNDING[D.ZONES[o.zone].funding].name}`;
      if (lvl(id) >= o.max) return 'Fully upgraded';
      if (S.builds.some(b => b.id === id)) return 'Under construction';
      const need = o.career && o.career[lvl(id)];
      if (need && S.career.lvl < need) return `Needs career level ${need}`;
      if (S.builds.length >= crews()) return 'Builders are busy';
      if (S.cash < buildCost(id)) return 'Not enough budget';
      return '';
    }
    function build(id) {
      if (buildBlock(id)) return false;
      spend(buildCost(id));
      const t = now();
      S.builds.push({ id, start: t, end: t + buildTime(id) * 1000 });
      if (S.tut === 3) advanceTut(4);
      return true;
    }
    function processBuilds(t) {
      const done = S.builds.filter(b => t >= b.end);
      if (!done.length) return;
      S.builds = S.builds.filter(b => t < b.end);
      for (const b of done) {
        S.office[b.id] = lvl(b.id) + 1;
        S.stats.builds++;
        while (S.ws.length < wsCount()) S.ws.push(null);
        const o = OFFICE[b.id];
        const lname = o.levels ? o.levels[lvl(b.id) - 1] : `level ${lvl(b.id)}`;
        addLog(`${o.name} upgraded (${lname})`, 'good');
        emit('built', { id: b.id, lvl: lvl(b.id) });
      }
      checkAchievements();
    }

    // ---------------------------------------------------------------- messages

    function message(m) {
      m.id = S.msgSeq++;
      m.at = m.at || now();
      m.read = false;
      S.inbox.unshift(m);
      if (S.inbox.length > 80) S.inbox.length = 80;
      emit('message', m);
      return m;
    }
    const pendingDecisions = () => S.inbox.filter(m => m.choices && !m.done);
    function senderFor(tpl, t) {
      let pool = owned().filter(id => !resting(id, t));
      if (tpl.role) pool = pool.filter(id => PEOPLE[id].role === tpl.role);
      if (tpl.trait) pool = pool.filter(id => has(id, tpl.trait));
      return pool.length ? pick(pool) : null;
    }
    function randomMessage(t) {
      // Someone struggling gets priority.
      const low = owned().find(id => S.staff[id].mood < 30 && !resting(id, t) && t - (S.lowMoodAt[id] || 0) > 6 * HOUR && !pendingDecisions().some(m => m.from === id));
      if (low) {
        S.lowMoodAt[low] = t;
        return message({ kind: 'decision', from: low, tpl: 'lowmood', text: D.LOW_MOOD.text, choices: D.LOW_MOOD.choices.map(c => c.label), exp: t + 6 * HOUR, at: t });
      }
      const roll = rand();
      if (roll < 0.62) {
        const tpls = shuffle(D.DECISIONS).filter(d => !S.recent.includes(d.id));
        for (const tpl of tpls) {
          const from = senderFor(tpl, t);
          if (!from) continue;
          S.recent = [tpl.id, ...S.recent].slice(0, 10);
          return message({ kind: 'decision', from, tpl: tpl.id, text: tpl.text, choices: tpl.choices.map(c => c.label), exp: t + 3 * HOUR, at: t });
        }
      }
      if (roll < 0.86) {
        const from = pick(owned());
        const p = PEOPLE[from];
        const lines = p.banter.concat(D.BANTER[p.role]);
        return message({ kind: 'chat', from, text: pick(lines), reactions: true, at: t });
      }
      const b = pick(D.BONUSES);
      return message({ kind: 'bonus', from: b.from, text: b.text, choices: [b.label], fx: b.fx, at: t });
    }
    function scheduleMessages(t, away) {
      if (S.tut !== -1) return;
      if (away > 20 * MIN) {
        const n = Math.min(2, Math.floor(away / (30 * MIN)), 3 - pendingDecisions().length);
        for (let i = 0; i < n; i++) randomMessage(t - rand() * Math.min(away, 2 * HOUR));
        S.nextMsgAt = t + (3 + rand() * 5) * MIN;
        return;
      }
      if (t < S.nextMsgAt) return;
      S.nextMsgAt = t + (5 + rand() * 7) * MIN;
      if (pendingDecisions().length >= 3) return;
      randomMessage(t);
    }

    // What a choice costs up front (negative cash), so the UI can disable it.
    function choiceCost(m, idx) {
      const ch = choiceOf(m, idx);
      return ch && ch.fx && ch.fx.cash < 0 ? -ch.fx.cash * refCash() : 0;
    }
    function choiceOf(m, idx) {
      if (m.tpl === 'lowmood') return D.LOW_MOOD.choices[idx];
      if (m.kind === 'bonus') return { fx: m.fx, reply: '' };
      if (m.kind === 'commit') return { fx: {}, reply: '' };
      return DECISIONS[m.tpl] && DECISIONS[m.tpl].choices[idx];
    }

    function applyFx(fx, from) {
      if (!fx) return;
      const t = now();
      const team = owned();
      if (fx.cash > 0) earn(fx.cash * refCash());
      if (fx.cash < 0) spend(-fx.cash * refCash());
      if (fx.refs) addRefs(fx.refs, 'messages');
      if (fx.rep) gainRep(fx.rep * repFor(maxTier(), 'M', 3));
      const st = from && S.staff[from];
      if (st) {
        if (fx.mood) st.mood = clamp(st.mood + fx.mood, 0, 100);
        if (fx.bond) st.bond = clamp(st.bond + fx.bond * (fx.bond > 0 ? 1 + 0.25 * lvl('games') : 1), 0, 100);
        if (fx.xp) gainXp(from, fx.xp * B.xpPerReward);
        if (fx.fatigue) st.fatigue = Math.max(0, st.fatigue + fx.fatigue);
        if (fx.rest) st.restUntil = t + fx.rest * MIN;
        if (fx.gear) addItem(rollItem(1, fx.gear), from);
      }
      if (fx.teamMood) for (const id of team) S.staff[id].mood = clamp(S.staff[id].mood + fx.teamMood, 0, 100);
      if (fx.teamXp) for (const id of team) gainXp(id, fx.teamXp * B.xpPerReward);
      if (fx.meetingFan) for (const id of team) if (has(id, 'meeting')) S.staff[id].mood = clamp(S.staff[id].mood + fx.meetingFan, 0, 100);
      if (fx.boost) {
        const running = S.ws.filter(w => w && t < w.end);
        const w = running.find(x => x.team.includes(from)) || running[0];
        if (w) w.end = Math.max(t, w.end - fx.boost * (w.end - w.start));
      }
      if (fx.offer === 'vip') {
        const size = ['MEGA', 'XL', 'L', 'M', 'S'].find(k => S.career.lvl >= D.SIZES[k].career - 3) || 'M';
        S.offers.unshift(genOffer({ vip: true, size: sizeOpen(size) ? size : 'S' }));
      }
    }

    function answer(msgId, idx) {
      const m = S.inbox.find(x => x.id === msgId);
      if (!m || m.done || !m.choices) return null;
      if (m.kind === 'commit') return setCommit(idx);
      const ch = choiceOf(m, idx);
      if (!ch) return null;
      const cost = choiceCost(m, idx);
      if (cost > S.cash) return { error: 'funds' };
      applyFx(ch.fx, m.from);
      m.done = { idx, at: now(), reply: ch.reply || '' };
      m.read = true;
      if (ch.risk) S.risks.push({ msg: m.id, from: m.from, at: now() + ch.risk.delay * MIN, risk: ch.risk });
      if (m.kind === 'decision') S.stats.decisions++;
      checkAchievements();
      return { reply: ch.reply, pending: !!ch.risk };
    }
    function react(msgId, emoji) {
      const m = S.inbox.find(x => x.id === msgId);
      if (!m || m.done) return;
      m.done = { reaction: emoji, at: now() };
      m.read = true;
      if (S.staff[m.from]) S.staff[m.from].bond = Math.min(100, S.staff[m.from].bond + 2);
    }
    function processRisks(t) {
      const due = S.risks.filter(r => t >= r.at);
      if (!due.length) return;
      S.risks = S.risks.filter(r => t < r.at);
      for (const r of due) {
        const win = rand() < r.risk.p;
        const o = win ? r.risk.win : r.risk.lose;
        applyFx(o.fx, r.from);
        message({ kind: 'outcome', from: r.from, text: o.text, good: win, ref: r.msg, at: r.at });
      }
    }
    function expireMessages(t) {
      for (const m of S.inbox) {
        if (m.choices && !m.done && m.exp && t > m.exp) m.done = { expired: true, at: m.exp };
      }
    }

    // ---------------------------------------------------------------- daily commitment

    function commitTargets() { const ws = wsCount(); return [2 + ws, 3 + 2 * ws, 4 + 4 * ws]; }
    const COMMIT_NAMES = ['Steady', 'Stretch', 'Moonshot'];
    function commitReward(tier) {
      const r = refCash();
      return [{ refs: 1, cash: r }, { refs: 2, cash: 3 * r }, { refs: 4, cash: 6 * r, gear: true }][tier];
    }
    function checkDay(t) {
      const k = dayKey(t);
      if (S.commit && S.commit.day !== k) {
        const c = S.commit;
        if (c.tier !== null && !c.paid) {
          message({ kind: 'dana', from: 'dana', text: `Yesterday's commitment (${COMMIT_NAMES[c.tier]}: ${c.target} deliveries) ended at ${c.progress}. No reward this time. New day, new target.` });
          S.streak = 0;
        }
        S.commit = null;
      }
      if (!S.commit && unlocked('commit') && S.tut === -1) {
        const targets = commitTargets();
        S.commit = { day: k, tier: null, progress: 0, target: 0, targets, paid: false };
        const choices = targets.map((n, i) => `${COMMIT_NAMES[i]}: ${n} deliveries`);
        const d = new Date(t);
        const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
        message({ kind: 'commit', from: 'dana', text: "Morning! What are we committing to today? Hit it and you're rewarded. Miss it and you get nothing.", choices, exp: midnight });
      }
    }
    function setCommit(tier) {
      const c = S.commit;
      if (!c || c.tier !== null) return null;
      c.tier = tier;
      c.target = c.targets[tier];
      const m = S.inbox.find(x => x.kind === 'commit' && !x.done);
      if (m) m.done = { idx: tier, at: now(), reply: ['Sensible. Steady wins.', 'Ambitious. I like it.', 'Moonshot?! Bold. Let\'s go. 🚀'][tier] };
      if (c.progress >= c.target) payCommit();
      return { tier };
    }
    function payCommit() {
      const c = S.commit;
      c.paid = true;
      const rw = commitReward(c.tier);
      const yesterday = dayKey(now() - DAY);
      S.streak = S.lastCommitDay === yesterday ? S.streak + 1 : 1;
      S.lastCommitDay = c.day;
      const bonusRefs = Math.min(S.streak, 3) - 1;
      addRefs(rw.refs + bonusRefs, 'commitment');
      earn(rw.cash);
      if (rw.gear && unlocked('gear')) addItem(rollItem(2));
      S.stats.commits++;
      message({ kind: 'dana', from: 'dana', text: `Commitment hit: ${COMMIT_NAMES[c.tier]}! +${rw.refs + bonusRefs} referrals${bonusRefs ? ` (incl. ${S.streak}-day streak bonus)` : ''} and a budget bonus. 👏` });
      emit('commit', { tier: c.tier, streak: S.streak });
      checkAchievements();
      return true;
    }

    // ---------------------------------------------------------------- weekly league

    // Stars you earned over the last seven calendar days; new players get a gentle default.
    function weeklyExpectation() {
      const t = now();
      let total = 0;
      for (let i = 1; i <= 7; i++) total += S.stats.dayStars[dayKey(t - i * DAY)] || 0;
      const history = Object.keys(S.stats.dayStars).length;
      return Math.max(40, history >= 3 ? total : 100);
    }
    const CURVES = ['linear', 'early', 'late', 'burst', 'steady'];
    function newLeague(t) {
      const ws = weekStart(t);
      const end = ws + 7 * DAY;
      const remaining = (end - t) / (7 * DAY);
      const base = weeklyExpectation() * (1 + 0.12 * S.leagueTier) * remaining;
      const factors = shuffle([0.5, 0.7, 0.85, 1.0, 1.2]);
      const rivals = shuffle(D.RIVALS).slice(0, 5).map((r, i) => ({ id: r.id, target: Math.round(base * factors[i] * (0.9 + 0.2 * rand())), curve: pick(CURVES), seed: rand(), told: {} }));
      S.league = { week: ws, start: t, end, points: 0, rivals };
    }
    function rivalScore(r, t) {
      const L = S.league;
      const f = clamp((t - L.start) / (L.end - L.start), 0, 1);
      let g;
      if (r.curve === 'early') g = Math.pow(f, 0.6);
      else if (r.curve === 'late') g = Math.pow(f, 1.7);
      else if (r.curve === 'burst') g = Math.min(1, Math.floor(f * 9 + r.seed) / 9);
      else if (r.curve === 'steady') g = f + 0.03 * Math.sin(f * 20 + r.seed * 6);
      else g = f;
      return Math.max(0, Math.round(r.target * clamp(g, 0, 1)));
    }
    function standings(t = now()) {
      if (!S.league) return [];
      const rows = S.league.rivals.map(r => ({ id: r.id, name: RIVALS[r.id].name, dept: RIVALS[r.id].dept, points: rivalScore(r, t), you: false }));
      rows.push({ id: 'you', name: S.name || 'You', dept: 'Your team', points: S.league.points, you: true });
      return rows.sort((a, b) => b.points - a.points || (a.you ? -1 : 1));
    }
    function leagueAdd(stars) {
      if (!S.league) return [];
      const t = now();
      const before = standings(t).findIndex(r => r.you);
      S.league.points += stars;
      const rows = standings(t);
      const after = rows.findIndex(r => r.you);
      const passed = rows.slice(after + 1, before + 1).filter(r => !r.you).map(r => r.id);
      for (const id of passed) rivalSays(id, 'pass');
      return passed;
    }
    function rivalSays(id, what) {
      const r = S.league.rivals.find(x => x.id === id);
      if (!r || r.told[what]) return;
      r.told[what] = true;
      message({ kind: 'rival', from: 'rival:' + id, text: pick(D.RIVAL_LINES[RIVALS[id].style][what]) });
    }
    function checkRivalsPassing(t) {
      if (!S.league) return;
      const rows = standings(t);
      const me = rows.findIndex(r => r.you);
      for (const r of rows.slice(0, me)) {
        const rv = S.league.rivals.find(x => x.id === r.id);
        if (rv && !rv.told.passed && rivalScore(rv, t) > S.league.points && S.league.points > 0 && rv.wasBehind) rivalSays(r.id, 'passed');
      }
      for (const r of rows.slice(me + 1)) {
        const rv = S.league.rivals.find(x => x.id === r.id);
        if (rv) rv.wasBehind = true;
      }
    }
    function checkWeek(t) {
      if (!unlocked('league')) return;
      if (S.league && t < S.league.end) return;
      if (S.league) {
        const rows = standings(S.league.end);
        const pos = rows.findIndex(r => r.you);
        const reward = D.LEAGUE_REWARDS[pos] || 3;
        addRefs(reward, 'league');
        const oldTier = S.leagueTier;
        if (pos <= 1 && S.leagueTier < D.LEAGUES.length - 1) S.leagueTier++;
        else if (pos === rows.length - 1 && S.leagueTier > 0) S.leagueTier--;
        if (pos === 0) S.stats.weekWins++;
        const move = S.leagueTier > oldTier ? ` Promoted to ${D.LEAGUES[S.leagueTier]}! 🎉` : S.leagueTier < oldTier ? ` Dropped to ${D.LEAGUES[S.leagueTier]}. We'll bounce back.` : '';
        message({ kind: 'dana', from: 'dana', text: `Week's done: you finished #${pos + 1} of ${rows.length} in ${D.LEAGUES[oldTier]} with ${S.league.points}★.${move} +${reward} referrals.` });
        const winner = rows[0];
        if (!winner.you) message({ kind: 'rival', from: 'rival:' + winner.id, text: pick(D.RIVAL_LINES[RIVALS[winner.id].style].win) });
        else if (rows[1]) message({ kind: 'rival', from: 'rival:' + rows[1].id, text: pick(D.RIVAL_LINES[RIVALS[rows[1].id].style].lose) });
        emit('league', { pos, tier: S.leagueTier });
      }
      newLeague(t);
      checkAchievements();
    }

    // ---------------------------------------------------------------- onboarding & unlocks

    const TUT = [
      "Hi, I'm Dana, your manager. Welcome to Atlas! You're leading a tiny team for now: Tyler and Kai. A client is waiting: open Projects and staff the Contoso job.",
      'Nice. That one takes under a minute. Projects run in real time, even when this tab is closed. Your team will message you if they need you.',
      "Done! Sign it off to see what the client thinks. Every delivery gets a review: more stars mean more revenue, XP and referrals.",
      "Great review! Revenue lands in your budget. Let's spend some: build a coffee bar in the Office. Happy people do better work.",
      "Coffee's on the way. ☕ Last thing: keep your projects busy. Start another one, then go do your actual job. I'll ping you when something needs you.",
    ];
    function advanceTut(step) {
      S.tut = step;
      // Keep only the current tutorial tip in the inbox.
      S.inbox = S.inbox.filter(m => m.tut === undefined);
      if (step >= 0 && TUT[step]) message({ kind: 'dana', from: 'dana', text: TUT[step], tut: step });
      if (step === -1) {
        message({ kind: 'dana', from: 'dana', text: "That's the basics! From here on it runs itself. Check in whenever you like: sign off deliveries, answer your team and grow the office. Have fun. 🙂" });
        S.nextMsgAt = now() + 2 * MIN;
        checkUnlocks();
      }
      emit('tut', { step });
    }
    function checkUnlocks() {
      for (const u of D.UNLOCKS) {
        if (S.unlocked[u.id] || S.career.lvl < u.career) continue;
        if (S.tut !== -1 && u.career > 1) continue;
        S.unlocked[u.id] = true;
        if (u.id === 'hiring') addRefs(3, 'unlock');
        message({ kind: 'dana', from: 'dana', text: u.text, unlock: u.id });
        emit('unlock', u);
        if (u.id === 'commit') checkDay(now());
        if (u.id === 'league') checkWeek(now());
      }
    }

    // ---------------------------------------------------------------- achievements

    const ACH = [];
    const ach = (id, name, desc, test) => ACH.push({ id, name, desc, test });
    [1, 10, 50, 250, 1000].forEach(n => ach('del' + n, n === 1 ? 'First Delivery' : `${n} Deliveries`, `Deliver ${n} project${n > 1 ? 's' : ''}`, s => s.stats.deliveries >= n));
    [1, 25, 100].forEach(n => ach('five' + n, n === 1 ? 'Client Delighted' : `${n} Five-Star Reviews`, `Earn ${n} five-star review${n > 1 ? 's' : ''}`, s => s.stats.five >= n));
    [5, 15, 25].forEach(n => ach('team' + n, n === 25 ? 'Full Org Chart' : `Team of ${n}`, n === 25 ? 'Hire every character' : `Have ${n} people`, s => Object.keys(s.staff).length >= n));
    ach('principal', 'Principal Hire', 'Hire a Principal', s => Object.keys(s.staff).some(id => PEOPLE[id].r === 4));
    ach('star5', 'Fully Promoted', 'Promote someone to 5★', s => Object.values(s.staff).some(x => x.stars >= 5));
    ach('bond', 'Inner Circle', 'Reach five hearts with someone', s => Object.values(s.staff).some(x => x.bond >= 100));
    [10, 50, 200].forEach(n => ach('dec' + n, `${n} Decisions`, `Answer ${n} decisions`, s => s.stats.decisions >= n));
    [5, 25].forEach(n => ach('build' + n, n === 5 ? 'Interior Designer' : 'Architect', `Complete ${n} office upgrades`, s => s.stats.builds >= n));
    D.FUNDING.slice(1, 6).forEach((f, i) => ach('fund' + (i + 1), f.name, `Reach ${f.name}`, s => s.funding >= i + 1));
    [2, 3, 5].forEach(n => ach('league' + n, D.LEAGUES[n], `Reach the ${D.LEAGUES[n]} league`, s => s.leagueTier >= n));
    ach('weekwin', 'Manager of the Week', 'Finish a week in first place', s => s.stats.weekWins >= 1);
    ach('commit1', 'Said and Done', 'Hit a daily commitment', s => s.stats.commits >= 1);
    ach('streak7', 'Reliable', 'Hit your commitment 7 days in a row', s => s.streak >= 7);
    [5, 10, 20, 30].forEach(n => ach('career' + n, `Career Level ${n}`, `Reach career level ${n}`, s => s.career.lvl >= n));
    ach('panic', 'Nothing to See Here', 'Use the report view', s => s.stats.panics >= 1);
    ach('away8', 'Out of Office', 'Come back after 8 hours away', s => s.stats.longestAway >= 8 * 3600);

    function checkAchievements() {
      for (const a of ACH) {
        if (!S.achievements[a.id] && a.test(S)) {
          S.achievements[a.id] = now();
          emit('achievement', a);
        }
      }
    }

    // ---------------------------------------------------------------- time

    function updatePeople(dt, t) {
      const k = 1 - Math.exp(-dt / (2 * 3600));
      for (const id of owned()) {
        const st = S.staff[id];
        const busy = onProject(id);
        const rest = st.restUntil > t;
        st.fatigue = Math.max(0, st.fatigue - (dt / 1800) * (1 + 0.5 * lvl('lounge')) * (rest ? 3 : busy ? 0.4 : 1));
        const base = rest ? Math.max(moodBaseline(id), 70) : moodBaseline(id);
        st.mood = clamp(st.mood + (base - st.mood) * (rest ? Math.min(1, k * 3) : k), 0, 100);
        if (st.mood < 12 && !rest && !busy) {
          st.restUntil = t + 45 * MIN;
          message({ kind: 'chat', from: id, text: "I'm completely burnt out. Taking the rest of the afternoon. Sorry. 😓" });
          addLog(`${PEOPLE[id].name} is recharging`, 'bad');
          emit('burnout', { id });
        }
      }
    }

    // Autopilot signs off what's finished and restarts the longest project the team can land well.
    // It never chains more than the offline window, and it leaves tired people to recover.
    function autopilot(t) {
      if (!lvl('pmo') || !S.settings.autopilot) return;
      const floor = t - B.offlineCapH * HOUR;
      let guard = 0, total = null;
      for (let loop = true; loop && guard < 200; guard++) {
        loop = false;
        for (let i = 0; i < S.ws.length; i++) {
          const w = S.ws[i];
          if (!w || t < w.end) continue;
          const end = w.end;
          const res = signOff(i, true);
          if (!res) continue;
          total = total || { count: 0, stars: 0, cash: 0, levelups: 0 };
          total.count++; total.stars += res.stars; total.cash += res.cash; total.levelups += res.levelups.length;
          const at = Math.max(end, floor);
          const choice = S.offers
            .map(o => ({ o, team: recommend(o, at) }))
            .filter(x => x.team && forecast(x.o, x.team, at).mean >= 3.5)
            .sort((a, b) => b.o.dur - a.o.dur)[0];
          if (choice) { start(choice.o.id, choice.team, Math.min(at, t)); loop = at < t; }
        }
      }
      if (total) {
        const prev = S.autoSummary || { count: 0, stars: 0, cash: 0, levelups: 0 };
        S.autoSummary = { count: prev.count + total.count, stars: prev.stars + total.stars, cash: prev.cash + total.cash, levelups: prev.levelups + total.levelups };
      }
    }

    function tick() {
      const t = now();
      const dt = Math.max(0, (t - S.lastTick) / 1000);
      const away = t - S.lastSeen;
      if (away > 60e3) S.stats.longestAway = Math.max(S.stats.longestAway, away / 1000);
      S.lastTick = t;
      S.lastSeen = t;
      const capped = Math.min(dt, B.offlineCapH * 3600);
      updatePeople(capped, t);
      processBuilds(t);
      processRisks(t);
      expireMessages(t);
      autopilot(t);
      if (t > S.offersAt) refreshOffers(true);
      ensureOffers();
      checkDay(t);
      checkWeek(t);
      checkRivalsPassing(t);
      scheduleMessages(t, away);
      if (S.tut === 1 && ready(t).length) advanceTut(2);
    }

    // ---------------------------------------------------------------- guidance

    function nextStep(t = now()) {
      const r = ready(t);
      if (S.tut >= 0) {
        const steps = [
          { text: 'Staff the Contoso project', action: 'projects' },
          { text: 'Project in progress…', action: 'home', wait: true },
          { text: 'Sign off your first delivery', action: 'signoff' },
          { text: 'Build a coffee bar', action: 'office' },
          { text: 'Start another project', action: 'projects' },
        ];
        return steps[S.tut];
      }
      if (r.length) return { text: `${r.length} deliver${r.length > 1 ? 'ies' : 'y'} ready for sign-off`, action: 'signoff', count: r.length };
      if (S.commit && S.commit.tier === null) return { text: "Set today's commitment", action: 'inbox' };
      const pend = pendingDecisions().filter(m => m.kind === 'decision');
      if (pend.length) {
        const who = PEOPLE[pend[0].from];
        return { text: `${who ? who.name.split(' ')[0] : 'Someone'} needs a decision`, action: 'inbox', count: pend.length };
      }
      const slot = freeSlot();
      if (slot >= 0) {
        const o = S.offers.find(x => recommend(x, t));
        if (o) return { text: 'A workstream is free', action: 'quickstart', offer: o.id };
      }
      if (unlocked('hiring') && S.referrals >= 1) return { text: `Interview candidates (${S.referrals} referral${S.referrals > 1 ? 's' : ''})`, action: 'hiring' };
      const affordable = D.OFFICE.find(o => !buildBlock(o.id));
      if (affordable) return { text: `Upgrade the office: ${affordable.name}`, action: 'office' };
      const next = S.ws.filter(Boolean).sort((a, b) => a.end - b.end)[0];
      return { text: next ? 'All good. Next delivery soon.' : 'All caught up.', action: 'home', wait: true, at: next && next.end };
    }

    function actionCount(t = now()) {
      let n = ready(t).length + pendingDecisions().length;
      if (freeSlot() >= 0 && S.offers.some(o => recommend(o, t))) n++;
      return n;
    }

    function addLog(text, kind = '') {
      S.log.unshift({ t: now(), text, kind });
      if (S.log.length > 40) S.log.length = 40;
    }

    // ---------------------------------------------------------------- save / load

    function load(saved) {
      if (!saved) { S = fresh(); boot(); return S; }
      if (saved.v === 2) {
        const base = fresh();
        S = Object.assign(base, saved);
        S.stats = Object.assign(fresh().stats, saved.stats || {});
        S.settings = Object.assign(fresh().settings, saved.settings || {});
        for (const id of Object.keys(S.staff)) S.staff[id] = Object.assign(person(now()), S.staff[id]);
        while (S.ws.length < wsCount()) S.ws.push(null);
        return S;
      }
      // Version 1 save: keep the people (and their promotions) and the name; everything else starts over.
      S = fresh();
      S.name = saved.name || '';
      for (const [id, st] of Object.entries(saved.staff || {})) {
        if (!PEOPLE[id]) continue;
        S.staff[id] = Object.assign(person(now()), { stars: st.stars || 0, lvl: Math.min(8, 1 + Math.floor((st.lvl || 1) / 20)) });
      }
      S.referrals = (saved.referrals || 0) + 5;
      S.settings = Object.assign(S.settings, { stealth: !!(saved.settings && saved.settings.stealth) });
      boot();
      message({ kind: 'dana', from: 'dana', text: "Heads-up: we reorganised how the company works. Your whole team came with you (promotions included), plus 5 referrals as a thank-you." });
      return S;
    }
    function boot() {
      S.offers = [genOffer({ size: 'S', tut: true, client: 'Contoso', tmpl: { name: 'Website copy refresh', needs: ['eng'] }, dur: 45 })];
      ensureOffers();
      advanceTut(0);
    }

    return {
      get state() { return S; },
      fresh: () => { S = fresh(); boot(); return S; },
      load, tick, start, signOff, recommend, forecast, ready, freeSlot, refreshOffers, interview, coffeeChat,
      answer, react, choiceCost, choiceOf, build, buildCost, buildTime, buildBlock, setCommit, standings, nextStep, actionCount,
      skill, hearts, moodBaseline, gearPct, difficulty, cashFor, xpFor, refCash, maxTier, wsCount, onProject, resting, available,
      unlocked, sizeOpen, zoneOpen, crews, owned, has, lvl, cashMult, fundingMult, commitTargets, commitReward, weeklyExpectation,
      ACH, PEOPLE, OFFICE, COMMIT_NAMES, xpNeed: B.xpNeed, repNeed: B.repNeed, addLog,
      panic: () => { S.stats.panics++; checkAchievements(); },
      dayKey, weekStart,
    };
  }

  root.WF_ENGINE = { create: createEngine };
})(typeof window !== 'undefined' ? window : globalThis);
