// Atlas "Delivery Tracker" — an idle RPG disguised as a sprint board.
// Tickets are enemies, story points are HP, budget is gold, promotions are levels.
(() => {
  'use strict';

  const SAVE_KEY = 'atlas_tracker_state_v1';
  const GAME_ID = 'tracker';
  const TICK_MS = 100;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- Content ----------
  const HIRES = [
    { id: 'intern', icon: '🧑‍🎓', name: 'Intern', desc: 'Eager. Mostly fixes typos.', cost: 15, dps: 0.5 },
    { id: 'contractor', icon: '🧑‍💻', name: 'Contractor', desc: 'Bills by the hour. Ships by the week.', cost: 100, dps: 4 },
    { id: 'offshore', icon: '🌏', name: 'Offshore team', desc: 'Closes tickets while you sleep.', cost: 1100, dps: 30 },
    { id: 'senior', icon: '🧔', name: 'Senior developer', desc: 'Has opinions about tabs.', cost: 12000, dps: 220 },
    { id: 'agent', icon: '🤖', name: 'AI coding agent', desc: 'Writes the code and the tests for it.', cost: 130000, dps: 1600 },
    { id: 'consult', icon: '💼', name: 'Consulting firm', desc: 'Delivers a 90-slide deck and somehow the feature.', cost: 1.4e6, dps: 12000 },
    { id: 'startup', icon: '🚀', name: 'Acqui-hired startup', desc: 'An entire team, plus their foosball table.', cost: 2e7, dps: 100000 },
    { id: 'offsite', icon: '🏝️', name: 'Offsite retreat', desc: 'Alignment at scale.', cost: 3.3e8, dps: 900000 },
  ];
  const GEAR = [
    { id: 'keyboard', icon: '⌨️', name: 'Mechanical keyboard', desc: 'Clacky. Your neighbours hate it.', cost: 50, click: 1 },
    { id: 'monitor', icon: '🖥️', name: 'Second monitor', desc: 'One for Slack, one for work.', cost: 500, click: 6 },
    { id: 'desk', icon: '🧍', name: 'Standing desk', desc: 'You stand at it twice a year.', cost: 5000, click: 40 },
    { id: 'headphones', icon: '🎧', name: 'Noise-cancelling headphones', desc: 'The universal "do not disturb".', cost: 60000, click: 300 },
    { id: 'copilot', icon: '✨', name: 'Autocomplete licence', desc: 'Tab, tab, tab, ship.', cost: 8e5, click: 2500 },
    { id: 'espresso', icon: '☕', name: 'Espresso machine', desc: 'Commercial grade. Industrial output.', cost: 1.2e7, click: 22000 },
  ];
  const POLICIES = [
    { id: 'openplan', icon: '🪑', name: 'Open floor plan', desc: 'Focus-hit chance 5% → 15%.', cost: 7500 },
    { id: 'vim', icon: '📝', name: 'Vim keybindings', desc: 'Each action also delivers 5% of team velocity.', cost: 10000 },
    { id: 'pto', icon: '🌴', name: 'Unlimited PTO', desc: 'Offline progress cap 8h → 24h.', cost: 20000 },
    { id: 'tests', icon: '🧪', name: 'Automated tests', desc: 'Incident SLA timers +15 seconds.', cost: 30000 },
    { id: 'agile', icon: '🔁', name: 'Agile certification', desc: 'Team velocity ×2.', cost: 50000 },
    { id: 'rto', icon: '🏢', name: 'Return-to-office mandate', desc: 'Your output ×3.', cost: 2e5 },
    { id: 'okrs', icon: '🎯', name: 'Quarterly OKRs', desc: 'Budget from tickets ×2.', cost: 1e6 },
    { id: 'k8s', icon: '☸️', name: 'Kubernetes migration', desc: 'Team velocity ×3. Nobody knows how it works.', cost: 5e6 },
    { id: 'ai', icon: '🧠', name: 'AI-first strategy', desc: 'All output ×2. Press release included.', cost: 2.5e8 },
  ];
  const TITLES = [
    [1, 'Intern'], [3, 'Associate Engineer'], [6, 'Engineer I'], [10, 'Engineer II'], [15, 'Senior Engineer'],
    [21, 'Staff Engineer'], [28, 'Senior Staff Engineer'], [36, 'Principal Engineer'], [45, 'Distinguished Engineer'],
    [55, 'Director of Engineering'], [65, 'VP of Engineering'], [80, 'CTO'], [100, 'Board Member'], [130, 'Chair Emeritus'],
  ];
  const VERBS = ['Fix', 'Refactor', 'Migrate', 'Investigate', 'Update', 'Deprecate', 'Document', 'Optimise', 'Rewrite', 'Add tests for', 'Localise', 'Audit', 'Remove', 'Unblock'];
  const THINGS = ['login flow on Safari', 'legacy billing cron', 'dark-mode toggle', 'CSV export', 'Q3 metrics dashboard', 'flaky integration test',
    'SSO redirect loop', 'TPS report generator', 'onboarding checklist', 'password reset email', 'search autocomplete', 'admin permissions page',
    'PDF invoice footer', 'timezone handling', 'feature flag cleanup', 'mobile nav overflow', 'webhook retries', 'cookie banner', 'audit log retention',
    'the button the VP mentioned', 'pagination on /users', 'the 2014 jQuery plugin', 'rate limiter', 'printer driver integration', 'Excel macro bridge'];
  const INCIDENTS = ['SEV-1: Checkout returns 500', 'SEV-1: Someone deployed on Friday', 'SEV-2: Database CPU at 100%', 'SEV-1: DNS. It was DNS.',
    'SEV-2: Certificate expired', 'SEV-1: Prod config committed to main', 'SEV-2: Queue backlog 3 million', 'SEV-1: The CEO cannot log in',
    'SEV-2: Memory leak in the leak detector', 'SEV-1: Region us-east-1 is having a day'];
  const PINGS = [
    ['@manager', 'quick sync? 👀'], ['@hr-bot', 'Reminder: complete your annual training'], ['@ceo', 'Great work this quarter, team!'],
    ['@product', 'tiny change request, 5 mins max'], ['@it-helpdesk', 'Your ticket has been resolved'], ['@finance', 'Expense report approved ✅'],
    ['@design', 'can you take a look at this figma?'], ['@skip-level', 'got a sec for a coffee chat?'],
  ];

  const ACHIEVEMENTS = [
    { id: 'first', icon: '✅', name: 'Hello, World', desc: 'Close your first ticket', test: s => s.closed >= 1 },
    { id: 't100', icon: '📦', name: 'Ticket Machine', desc: 'Close 100 tickets', test: s => s.closed >= 100 },
    { id: 't1k', icon: '🏭', name: 'Throughput', desc: 'Close 1,000 tickets', test: s => s.closed >= 1000 },
    { id: 't10k', icon: '🌋', name: 'Backlog Slayer', desc: 'Close 10,000 tickets', test: s => s.closed >= 10000 },
    { id: 'c1k', icon: '🖱️', name: 'Carpal Tunnel', desc: 'Log work 1,000 times', test: s => s.clicks >= 1000 },
    { id: 'c10k', icon: '🦾', name: 'Ergonomic Hazard', desc: 'Log work 10,000 times', test: s => s.clicks >= 10000 },
    { id: 'boss1', icon: '🚨', name: 'Incident Commander', desc: 'Resolve your first incident', test: s => s.bosses >= 1 },
    { id: 'bossfail', icon: '📄', name: 'Postmortem Pending', desc: 'Miss an incident SLA', test: s => s.bossFails >= 1 },
    { id: 's10', icon: '🏃', name: 'Velocity', desc: 'Reach sprint 10', test: s => s.maxSprint >= 10 },
    { id: 's25', icon: '🏎️', name: 'Hypergrowth', desc: 'Reach sprint 25', test: s => s.maxSprint >= 25 },
    { id: 's50', icon: '🛰️', name: 'Escape Velocity', desc: 'Reach sprint 50', test: s => s.maxSprint >= 50 },
    { id: 's100', icon: '🌌', name: 'Roadmap Complete', desc: 'Reach sprint 100', test: s => s.maxSprint >= 100 },
    { id: 'l10', icon: '📈', name: 'Meets Expectations', desc: 'Reach level 10', test: s => s.level >= 10 },
    { id: 'l25', icon: '🌟', name: 'Exceeds Expectations', desc: 'Reach level 25', test: s => s.level >= 25 },
    { id: 'l50', icon: '👑', name: 'Redefines Expectations', desc: 'Reach level 50', test: s => s.level >= 50 },
    { id: 'hire', icon: '🤝', name: 'Delegator', desc: 'Make your first hire', test: s => totalHires(s) >= 1 },
    { id: 'hire100', icon: '🏢', name: 'Empire Builder', desc: 'Have 100 people in your org', test: s => totalHires(s) >= 100 },
    { id: 'orgchart', icon: '🗂️', name: 'Org Chart', desc: 'Hire at least one of every role', test: s => HIRES.every(h => (s.hires[h.id] || 0) > 0) },
    { id: 'm1', icon: '💰', name: 'Budget Holder', desc: 'Earn $1M lifetime budget', test: s => s.lifetimeBudget >= 1e6 },
    { id: 'b1', icon: '🏦', name: 'Cost Centre', desc: 'Earn $1B lifetime budget', test: s => s.lifetimeBudget >= 1e9 },
    { id: 'policy', icon: '📜', name: 'Bureaucrat', desc: 'Enact every policy', test: s => POLICIES.every(p => s.policies[p.id]) },
    { id: 'reorg', icon: '🔀', name: 'Restructured', desc: 'Accept a reorg', test: s => s.reorgs >= 1 },
    { id: 'reorg5', icon: '♻️', name: 'Serial Reorganiser', desc: 'Accept 5 reorgs', test: s => s.reorgs >= 5 },
    { id: 'ping1', icon: '💬', name: 'Responsive', desc: 'Answer a message', test: s => s.pings >= 1 },
    { id: 'ping25', icon: '📱', name: 'Always Online', desc: 'Answer 25 messages', test: s => s.pings >= 25 },
    { id: 'standup', icon: '🗣️', name: 'Meeting Enthusiast', desc: 'Call 25 stand-ups', test: s => s.standups >= 25 },
    { id: 'crit', icon: '🎯', name: 'Flow State', desc: 'Land 250 focus hits', test: s => s.crits >= 250 },
    { id: 'panic', icon: '🙈', name: 'Nothing to See Here', desc: 'Use the report view', test: s => s.panics >= 1 },
    { id: 'offline', icon: '🏖️', name: 'Out of Office', desc: 'Earn progress while away for 1 hour', test: s => s.longestAway >= 3600 },
    { id: 'night', icon: '🌙', name: 'After Hours', desc: 'Play between midnight and 5am', test: () => new Date().getHours() < 5 },
    { id: 'friday', icon: '🍻', name: 'Friday Deploy', desc: 'Resolve an incident on Friday after 4pm', test: s => s.fridayIncident },
  ];

  // ---------- State ----------
  const fresh = () => ({
    v: 1, name: '', level: 1, xp: 0, budget: 0, runBudget: 0, lifetimeBudget: 0, lifetimeSP: 0,
    sprint: 1, ticketIndex: 1, maxSprint: 1, maxSprintRun: 1, ticket: null,
    hires: {}, gear: {}, policies: {}, achievements: {}, equity: 0, reorgs: 0,
    closed: 0, clicks: 0, bosses: 0, bossFails: 0, crits: 0, pings: 0, standups: 0, panics: 0, longestAway: 0, fridayIncident: false,
    standupUntil: 0, standupReady: 0, crunchUntil: 0, crunchReady: 0, kudosUntil: 0,
    stealth: false, titleTicker: false, lastSeen: Date.now(), created: Date.now(),
  });

  let S = load();
  let buyQty = 1;
  let nextPingAt = Date.now() + rand(45, 120) * 1000;
  let pingReward = null;
  let pingTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch { /* corrupted or blocked storage */ }
    return fresh();
  }
  function save() {
    S.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* storage blocked */ }
  }

  // ---------- Helpers ----------
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function totalHires(s) { return Object.values(s.hires).reduce((a, b) => a + b, 0); }
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (!Number.isFinite(n)) return '∞';
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIX.length) return n.toExponential(2);
    const v = n / Math.pow(1000, tier);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + SUFFIX[tier];
  }
  const money = n => '$' + fmt(n);
  function titleFor(level) {
    let t = TITLES[0][1];
    for (const [l, name] of TITLES) if (level >= l) t = name;
    return t;
  }
  const xpNeeded = l => Math.floor(30 * Math.pow(l, 1.55));
  const now = () => Date.now();

  // ---------- Formulas ----------
  function globalMult() {
    const badges = Object.keys(S.achievements).length;
    let m = (1 + 0.02 * (S.level - 1)) * (1 + 0.1 * S.equity) * (1 + 0.01 * badges);
    if (S.policies.ai) m *= 2;
    return m;
  }
  function hireDps(h) {
    const n = S.hires[h.id] || 0;
    // Every 25 of a role doubles that role's output.
    return n * h.dps * Math.pow(2, Math.floor(n / 25));
  }
  function dps() {
    let d = HIRES.reduce((a, h) => a + hireDps(h), 0);
    if (S.policies.agile) d *= 2;
    if (S.policies.k8s) d *= 3;
    d *= globalMult();
    if (now() < S.standupUntil) d *= 3;
    return d;
  }
  function clickPower() {
    let c = 1 + GEAR.reduce((a, g) => a + (S.gear[g.id] || 0) * g.click, 0);
    if (S.policies.rto) c *= 3;
    c *= globalMult();
    if (S.policies.vim) c += dps() * 0.05;
    if (now() < S.crunchUntil) c *= 5;
    if (now() < S.kudosUntil) c *= 7;
    return c;
  }
  const critChance = () => (S.policies.openplan ? 0.15 : 0.05);
  const bossSeconds = () => (S.policies.tests ? 45 : 30);
  const offlineCapHours = () => (S.policies.pto ? 24 : 8);
  function ticketHp(sprint, index) {
    const base = 10 * Math.pow(1.17, sprint - 1) * (1 + 0.12 * (index - 1));
    return Math.ceil(index === 10 ? base * 6 : base);
  }
  function ticketBudget(t) {
    let b = t.maxHp * 0.4 * (t.boss ? 3 : 1);
    if (S.policies.okrs) b *= 2;
    return b;
  }
  const ticketXp = t => Math.ceil((4 + S.sprint * 2) * (t.boss ? 5 : 1));
  const equityOnReorg = () => Math.floor(Math.sqrt(S.runBudget / 2000));
  const canReorg = () => S.maxSprintRun >= 15 && equityOnReorg() > 0;

  function bulkCost(base, rate, owned, qty) {
    return base * Math.pow(rate, owned) * (Math.pow(rate, qty) - 1) / (rate - 1);
  }
  function maxAffordable(base, rate, owned) {
    const n = Math.floor(Math.log(S.budget * (rate - 1) / (base * Math.pow(rate, owned)) + 1) / Math.log(rate));
    return Math.max(0, n);
  }

  // ---------- Tickets ----------
  function newTicket() {
    const boss = S.ticketIndex === 10;
    const hp = ticketHp(S.sprint, S.ticketIndex);
    const type = boss ? 'incident' : pick(['story', 'bug', 'task', 'bug', 'story']);
    S.ticket = {
      key: (boss ? 'INC-' : 'ATL-') + (1000 + S.closed + Math.floor(Math.random() * 50)),
      title: boss ? pick(INCIDENTS) : `${pick(VERBS)} ${pick(THINGS)}`,
      type, boss, hp, maxHp: hp,
      priority: boss ? 'Highest' : pick(['Low', 'Medium', 'Medium', 'High']),
      deadline: boss ? now() + bossSeconds() * 1000 : 0,
    };
  }

  function damage(amount, x, y, crit) {
    const t = S.ticket;
    const dealt = Math.min(amount, t.hp);
    t.hp -= amount;
    S.lifetimeSP += dealt;
    if (x !== undefined) floater(amount, x, y, crit);
    if (t.hp <= 0) closeTicket();
  }

  function closeTicket() {
    const t = S.ticket;
    const b = ticketBudget(t);
    const xp = ticketXp(t);
    S.budget += b; S.runBudget += b; S.lifetimeBudget += b;
    S.closed++;
    gainXp(xp);
    if (t.boss) {
      S.bosses++;
      const d = new Date();
      if (d.getDay() === 5 && d.getHours() >= 16) S.fridayIncident = true;
      log(`Resolved <b>${t.key}</b> · sprint ${S.sprint} complete · +${money(b)}`, 'good');
      S.sprint++;
      S.ticketIndex = 1;
      S.maxSprint = Math.max(S.maxSprint, S.sprint);
      S.maxSprintRun = Math.max(S.maxSprintRun, S.sprint);
    } else {
      if (S.ticketIndex === 1 || Math.random() < 0.25) log(`Closed <b>${t.key}</b> · +${xp} XP · +${money(b)}`);
      S.ticketIndex++;
    }
    newTicket();
    checkAchievements();
  }

  function gainXp(x) {
    S.xp += x;
    const before = titleFor(S.level);
    while (S.xp >= xpNeeded(S.level)) {
      S.xp -= xpNeeded(S.level);
      S.level++;
    }
    const after = titleFor(S.level);
    if (after !== before) {
      toast(`🎉 Promoted to ${after}!`);
      log(`Promotion: <b>${after}</b>`, 'good');
    }
  }

  // ---------- Actions ----------
  function logWork(ev) {
    S.clicks++;
    const crit = Math.random() < critChance();
    if (crit) S.crits++;
    const amount = clickPower() * (crit ? 5 : 1);
    const card = $('#ticketCard');
    const r = card.getBoundingClientRect();
    let x, y;
    if (ev && ev.clientX) { x = ev.clientX - r.left; y = ev.clientY - r.top - 20; }
    else { x = r.width / 2 + rand(-60, 60); y = r.height - 90; }
    damage(amount, x, y, crit);
    card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit');
  }

  function useStandup() {
    if (now() < S.standupReady) return;
    S.standupUntil = now() + 15000;
    S.standupReady = now() + 90000;
    S.standups++;
    log('Stand-up called. Team velocity ×3 for 15s');
    checkAchievements();
  }
  function useCrunch() {
    if (now() < S.crunchReady) return;
    S.crunchUntil = now() + 10000;
    S.crunchReady = now() + 120000;
    log('Crunch mode engaged. Output ×5 for 10s');
  }

  function buy(kind, item) {
    const list = kind === 'hire' ? S.hires : S.gear;
    const rate = kind === 'hire' ? 1.15 : 1.2;
    const owned = list[item.id] || 0;
    let qty = buyQty === 'max' ? maxAffordable(item.cost, rate, owned) : buyQty;
    if (qty < 1) return;
    const cost = bulkCost(item.cost, rate, owned, qty);
    if (cost > S.budget) return;
    S.budget -= cost;
    list[item.id] = owned + qty;
    if (owned === 0) log(`Approved: <b>${item.name}</b>`);
    checkAchievements();
    renderShop();
  }
  function buyPolicy(p) {
    if (S.policies[p.id] || S.budget < p.cost) return;
    S.budget -= p.cost;
    S.policies[p.id] = true;
    log(`Policy enacted: <b>${p.name}</b>`, 'good');
    checkAchievements();
    renderShop();
  }

  function reorg() {
    if (!canReorg()) return;
    const gain = equityOnReorg();
    modal('Accept reorg?',
      `<p>Your org will be restructured. You keep your badges and lifetime stats, but budget, headcount, equipment, policies, level and sprint reset.</p>
       <p>You will receive <b>${gain}</b> equity shares (+${gain * 10}% output, permanently).</p>`,
      () => {
        const keep = {
          name: S.name, equity: S.equity + gain, reorgs: S.reorgs + 1, achievements: S.achievements,
          closed: S.closed, clicks: S.clicks, bosses: S.bosses, bossFails: S.bossFails, crits: S.crits, pings: S.pings,
          standups: S.standups, panics: S.panics, longestAway: S.longestAway, fridayIncident: S.fridayIncident,
          lifetimeBudget: S.lifetimeBudget, lifetimeSP: S.lifetimeSP, maxSprint: S.maxSprint,
          stealth: S.stealth, titleTicker: S.titleTicker, created: S.created,
        };
        S = Object.assign(fresh(), keep);
        newTicket();
        checkAchievements();
        log(`Reorg complete. +${gain} equity`, 'good');
        buildShop(); renderShop(); save();
      }, true);
  }

  // ---------- Slack pings (golden cookie) ----------
  function maybePing() {
    if (now() < nextPingAt || pingReward || !$('#decoy').classList.contains('hidden')) return;
    const [from, msg] = pick(PINGS);
    $('#pingFrom').textContent = from;
    $('#pingMsg').textContent = msg;
    $('#ping').classList.remove('hidden');
    pingReward = pick(['bonus', 'bonus', 'kudos', 'xp']);
    pingTimer = setTimeout(() => { hidePing(); }, 9000);
  }
  function hidePing() {
    $('#ping').classList.add('hidden');
    pingReward = null;
    clearTimeout(pingTimer);
    nextPingAt = now() + rand(60, 180) * 1000;
  }
  function answerPing() {
    const r = pingReward;
    if (!r) return;
    hidePing();
    S.pings++;
    if (r === 'bonus') {
      const b = Math.max(dps() * 0.4 * 90, clickPower() * 0.4 * 60, 25);
      S.budget += b; S.runBudget += b; S.lifetimeBudget += b;
      toast(`Spot bonus! +${money(b)}`);
    } else if (r === 'kudos') {
      S.kudosUntil = now() + 15000;
      toast('Public kudos! Your output ×7 for 15s');
    } else {
      const x = Math.ceil(xpNeeded(S.level) * 0.3);
      gainXp(x);
      toast(`Shout-out in #general! +${fmt(x)} XP`);
    }
    checkAchievements();
  }

  // ---------- Offline progress ----------
  function applyOffline() {
    const away = Math.min((now() - S.lastSeen) / 1000, offlineCapHours() * 3600);
    if (away < 60 || !S.ticket) return;
    S.longestAway = Math.max(S.longestAway, away);
    const sp = dps() * away * 0.5; // offline efficiency 50%
    if (sp <= 0) return;
    const tickets = Math.floor(sp / ticketHp(S.sprint, 5));
    const b = sp * 0.4 * (S.policies.okrs ? 2 : 1);
    S.budget += b; S.runBudget += b; S.lifetimeBudget += b; S.lifetimeSP += sp;
    S.closed += tickets;
    const xp = Math.min(tickets * (4 + S.sprint * 2), xpNeeded(S.level) * 3);
    gainXp(xp);
    if (S.ticket.boss) S.ticket.deadline = now() + bossSeconds() * 1000;
    const hrs = away >= 3600 ? `${(away / 3600).toFixed(1)} hours` : `${Math.round(away / 60)} minutes`;
    modal('While you were in meetings…',
      `<p>You were away for <b>${hrs}</b>. Your team kept shipping:</p>
       <ul><li><b>${fmt(tickets)}</b> tickets closed</li><li><b>${money(b)}</b> budget earned</li><li><b>${fmt(xp)}</b> XP</li></ul>`);
  }

  // ---------- Achievements ----------
  function checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (!S.achievements[a.id] && a.test(S)) {
        S.achievements[a.id] = now();
        toast(`Compliance badge earned: ${a.name}`);
        log(`Badge earned: <b>${a.name}</b>`, 'good');
        renderAchievements();
      }
    }
  }

  // ---------- UI ----------
  function log(html, cls = '') {
    const li = document.createElement('li');
    if (cls) li.className = cls;
    const d = new Date();
    li.innerHTML = `<span class="t">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span><span>${html}</span>`;
    const feed = $('#feed');
    feed.prepend(li);
    while (feed.children.length > 40) feed.lastChild.remove();
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  let modalCb = null;
  function modal(title, body, onOk, withCancel) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body + (withCancel ? '<p class="muted small">Click outside to cancel.</p>' : '');
    modalCb = onOk || null;
    $('#modal').classList.remove('hidden');
  }

  function floater(amount, x, y, crit) {
    const el = document.createElement('div');
    el.className = 'floater' + (crit ? ' crit' : '');
    el.textContent = (crit ? 'Focus! ' : '') + '-' + fmt(amount) + ' SP';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    $('#floaters').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function shopItem(item, onClick) {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<span class="ic">${item.icon}</span><div class="grow"><div class="nm">${item.name}</div><div class="ds">${item.desc}</div></div><div class="cost"><b></b><span></span></div><div class="qty"></div>`;
    el.addEventListener('click', onClick);
    return el;
  }

  const shopEls = { hire: {}, gear: {}, policy: {} };
  function buildShop() {
    for (const [kind, list, root] of [['hire', HIRES, '#hireList'], ['gear', GEAR, '#gearList'], ['policy', POLICIES, '#policyList']]) {
      const container = $(root);
      container.innerHTML = '';
      for (const item of list) {
        const el = shopItem(item, () => (kind === 'policy' ? buyPolicy(item) : buy(kind, item)));
        shopEls[kind][item.id] = el;
        container.appendChild(el);
      }
    }
  }
  function renderShop() {
    for (const [kind, list, rate, owned] of [['hire', HIRES, 1.15, S.hires], ['gear', GEAR, 1.2, S.gear]]) {
      for (const item of list) {
        const el = shopEls[kind][item.id];
        const n = owned[item.id] || 0;
        let qty = buyQty === 'max' ? Math.max(1, maxAffordable(item.cost, rate, n)) : buyQty;
        const cost = bulkCost(item.cost, rate, n, qty);
        el.classList.toggle('locked', cost > S.budget);
        el.querySelector('.cost b').textContent = money(cost);
        el.querySelector('.cost span').textContent = kind === 'hire'
          ? `+${fmt(item.dps * globalMult() * qty)} SP/s${qty > 1 ? ` (×${qty})` : ''}`
          : `+${fmt(item.click * globalMult() * qty)} SP${qty > 1 ? ` (×${qty})` : ''}`;
        el.querySelector('.qty').textContent = n || '';
      }
    }
    for (const p of POLICIES) {
      const el = shopEls.policy[p.id];
      const owned = !!S.policies[p.id];
      el.classList.toggle('owned', owned);
      el.classList.toggle('locked', !owned && p.cost > S.budget);
      el.querySelector('.cost b').textContent = owned ? 'Enacted' : money(p.cost);
      el.querySelector('.qty').textContent = owned ? '✓' : '';
    }
  }

  function renderAchievements() {
    const root = $('#achList');
    root.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const have = S.achievements[a.id];
      const el = document.createElement('div');
      el.className = 'badge' + (have ? '' : ' no');
      el.innerHTML = `<span class="ic">${a.icon}</span><b>${a.name}</b><span class="muted">${a.desc}</span>`;
      root.appendChild(el);
    }
    $('#achCount').textContent = `${Object.keys(S.achievements).length}/${ACHIEVEMENTS.length}`;
  }

  function cooldownLabel(base, until, ready) {
    const t = now();
    if (t < until) return `${base} · ${Math.ceil((until - t) / 1000)}s`;
    if (t < ready) return `${base} (${Math.ceil((ready - t) / 1000)}s)`;
    return base;
  }

  function render() {
    const t = S.ticket;
    const card = $('#ticketCard');
    card.classList.toggle('boss', t.boss);
    const typeEl = $('#tType');
    typeEl.className = 'type ' + t.type;
    typeEl.textContent = t.type[0].toUpperCase() + t.type.slice(1);
    $('#tKey').textContent = t.key;
    $('#tTitle').textContent = t.title;
    $('#tPriority').textContent = t.priority;
    $('#tAssignee').textContent = S.name || 'You';
    $('#tHp').textContent = `${fmt(Math.max(0, t.hp))} / ${fmt(t.maxHp)}`;
    $('#tBar').style.width = (100 * Math.max(0, t.hp) / t.maxHp) + '%';
    const dl = $('#tDeadline');
    dl.classList.toggle('hidden', !t.boss);
    if (t.boss) dl.textContent = `SLA ${Math.max(0, Math.ceil((t.deadline - now()) / 1000))}s`;

    $('#sprintPill').textContent = `Sprint ${S.sprint} · ${S.ticketIndex}/10`;
    $('#kClick').textContent = fmt(clickPower());
    $('#kDps').textContent = fmt(dps());
    $('#kBudget').textContent = money(S.budget);
    $('#kEquity').textContent = fmt(S.equity);

    const initial = (S.name || '?').trim()[0]?.toUpperCase() || '?';
    $('#avatar').textContent = initial;
    $('#avatarBig').textContent = initial;
    $('#pName').textContent = S.name || 'New hire';
    $('#pTitle').textContent = `${titleFor(S.level)} · Level ${S.level}`;
    $('#xpBar').style.width = (100 * S.xp / xpNeeded(S.level)) + '%';
    $('#xpText').textContent = `Performance review: ${fmt(S.xp)} / ${fmt(xpNeeded(S.level))} XP`;

    const reorgBtn = $('#reorgBtn');
    reorgBtn.classList.toggle('hidden', !canReorg());
    if (canReorg()) reorgBtn.textContent = `Accept reorg (+${equityOnReorg()} equity)`;

    const sb = $('#standupBtn'), cb = $('#crunchBtn');
    sb.textContent = cooldownLabel('Call stand-up', S.standupUntil, S.standupReady);
    cb.textContent = cooldownLabel('Crunch mode', S.crunchUntil, S.crunchReady);
    sb.disabled = now() < S.standupReady;
    cb.disabled = now() < S.crunchReady;
    sb.classList.toggle('active-buff', now() < S.standupUntil);
    cb.classList.toggle('active-buff', now() < S.crunchUntil);

    document.body.classList.toggle('stealth', S.stealth);
    document.title = S.titleTicker
      ? `(${S.sprint}.${S.ticketIndex}) Atlas · Q4 Delivery Tracker`
      : 'Atlas · Q4 Delivery Tracker';
  }

  // ---------- Leaderboard ----------
  async function refreshLeaderboard() {
    const { source, rows } = await window.Leaderboard.top(GAME_ID, 'desc', 25);
    $('#lbSource').textContent = source === 'server' ? '· live' : '· this browser only';
    $('#lbBody').innerHTML = rows.map((r, i) =>
      `<tr class="${r.name === S.name ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${fmt(r.score)} SP</td><td class="muted">${esc(r.meta || '')}</td></tr>`
    ).join('') || '<tr><td colspan="4" class="muted">No submissions yet.</td></tr>';
  }
  async function submitScore() {
    if (!S.name) {
      switchTab('settings');
      $('#setName').focus();
      toast('Set a display name first');
      return;
    }
    const where = await window.Leaderboard.submit(GAME_ID, S.name, Math.floor(S.lifetimeSP), `L${S.level} ${titleFor(S.level)}`, 'desc');
    toast(where === 'server' ? 'Numbers submitted to org rankings' : 'Saved locally (no ranking server reachable)');
    refreshLeaderboard();
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Panic / decoy ----------
  function toggleDecoy() {
    const d = $('#decoy');
    const showing = d.classList.toggle('hidden') === false;
    if (showing) {
      S.panics++;
      hidePing();
      document.title = 'QBR — Q4 FY26 · Atlas Reports';
      checkAchievements();
    }
  }

  function switchTab(name) {
    $$('.nav').forEach(n => n.classList.toggle('active', n.dataset.tab === name));
    $$('.tab').forEach(t => t.classList.toggle('hidden', t.id !== 'tab-' + name));
    if (name === 'leaderboard') refreshLeaderboard();
  }

  // ---------- Wiring ----------
  function bind() {
    $('#workBtn').addEventListener('click', logWork);
    $('#standupBtn').addEventListener('click', useStandup);
    $('#crunchBtn').addEventListener('click', useCrunch);
    $('#reorgBtn').addEventListener('click', reorg);
    $('#ping').addEventListener('click', answerPing);
    $('#decoyBtn').addEventListener('click', toggleDecoy);
    $('#decoy').addEventListener('dblclick', toggleDecoy);
    $('#modalOk').addEventListener('click', () => {
      $('#modal').classList.add('hidden');
      const cb = modalCb; modalCb = null;
      if (cb) cb();
    });
    $('#modal').addEventListener('click', e => {
      if (e.target.id === 'modal') { $('#modal').classList.add('hidden'); modalCb = null; }
    });
    $$('.nav').forEach(n => n.addEventListener('click', () => switchTab(n.dataset.tab)));
    $$('#buyQty button').forEach(b => b.addEventListener('click', () => {
      $$('#buyQty button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      buyQty = b.dataset.q === 'max' ? 'max' : Number(b.dataset.q);
      renderShop();
    }));
    $('#lbSubmit').addEventListener('click', submitScore);
    $('#lbRefresh').addEventListener('click', refreshLeaderboard);

    const nameIn = $('#setName');
    nameIn.value = S.name;
    nameIn.addEventListener('input', () => { S.name = nameIn.value.trim().slice(0, 20); });
    const st = $('#setStealth');
    st.checked = S.stealth;
    st.addEventListener('change', () => { S.stealth = st.checked; });
    const tt = $('#setTitle');
    tt.checked = S.titleTicker;
    tt.addEventListener('change', () => { S.titleTicker = tt.checked; });

    $('#exportBtn').addEventListener('click', () => {
      const box = $('#saveBox');
      box.classList.remove('hidden');
      box.value = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      box.select();
      toast('Save copied into the box below');
    });
    $('#importBtn').addEventListener('click', () => {
      const box = $('#saveBox');
      if (box.classList.contains('hidden') || !box.value.trim()) {
        box.classList.remove('hidden'); box.value = ''; box.focus();
        return;
      }
      try {
        S = Object.assign(fresh(), JSON.parse(decodeURIComponent(escape(atob(box.value.trim())))));
        if (!S.ticket) newTicket();
        buildShop(); renderShop(); renderAchievements(); save();
        toast('Save imported');
      } catch { toast('That save looks corrupted'); }
    });
    $('#resetBtn').addEventListener('click', () => {
      modal('Hard reset?', '<p>This deletes everything, including badges and equity.</p>', () => {
        S = fresh(); newTicket(); buildShop(); renderShop(); renderAchievements(); save();
        $('#setName').value = '';
      }, true);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' || e.key === '`') { e.preventDefault(); toggleDecoy(); return; }
      if (!$('#decoy').classList.contains('hidden')) return;
      const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
      if (typing) return;
      if (document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if ((e.code === 'Space' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); logWork(); }
      if (e.key === '1') useStandup();
      if (e.key === '2') useCrunch();
    });
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }

  // ---------- Loop ----------
  let last = now();
  let shopTick = 0;
  function tick() {
    const t = now();
    const dt = Math.min((t - last) / 1000, 5); // background tabs get throttled; cap the catch-up
    last = t;
    const d = dps() * dt;
    if (d > 0) damage(d);
    if (S.ticket.boss && t > S.ticket.deadline) {
      S.bossFails++;
      log(`Missed SLA on <b>${S.ticket.key}</b>. Sprint rolled back.`, 'bad');
      S.ticketIndex = 1;
      newTicket();
      checkAchievements();
    }
    maybePing();
    render();
    if (++shopTick % 5 === 0) renderShop();
    if (shopTick % 50 === 0) save();
    if (shopTick % 100 === 0) checkAchievements();
  }

  // ---------- Boot ----------
  if (!S.ticket) newTicket();
  buildShop();
  bind();
  renderShop();
  renderAchievements();
  log('Welcome back. Your board is ready.');
  applyOffline();
  render();
  setInterval(tick, TICK_MS);
})();
