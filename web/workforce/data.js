// Atlas Workforce — game content. Tweak freely; game.js reads everything from here.
window.WF_DATA = (() => {
  const RARITY = [
    { key: 'L1', name: 'Intern', base: 1, weight: 45 },
    { key: 'L2', name: 'Associate', base: 2.5, weight: 30 },
    { key: 'L3', name: 'Senior', base: 6, weight: 17 },
    { key: 'L4', name: 'Staff', base: 15, weight: 6.5 },
    { key: 'L5', name: 'Principal', base: 40, weight: 1.5 },
  ];

  // mult: share of base output. passive[r]: strength by rarity (scaled by stars in game.js).
  const ROLES = {
    eng: { name: 'Engineering', mult: 1.0, passive: [2, 3, 5, 7, 10], passiveText: v => `+${v}% focus-hit chance (3× team output)` },
    sre: { name: 'Reliability', mult: 0.7, passive: [8, 14, 22, 34, 50], passiveText: v => `+${v}% damage to launches, +${Math.round(v / 8)}s launch timer` },
    pm: { name: 'Product', mult: 0.45, passive: [4, 7, 11, 16, 24], passiveText: v => `+${v}% team output` },
    sales: { name: 'Sales', mult: 0.45, passive: [8, 14, 22, 34, 50], passiveText: v => `+${v}% revenue` },
    design: { name: 'Design', mult: 0.55, passive: [10, 18, 28, 40, 60], passiveText: v => `+${v}% asset finds, better asset quality` },
  };

  const PEOPLE = [
    { id: 'tyler', name: 'Tyler Brooks', role: 'eng', r: 0, bio: 'Pushes straight to main.' },
    { id: 'mia', name: 'Mia Hart', role: 'design', r: 0, bio: 'Has 400 Figma tabs open.' },
    { id: 'kai', name: 'Kai Lopez', role: 'sales', r: 0, bio: 'Will cold-call anyone. Anyone.' },
    { id: 'jess', name: 'Jess Park', role: 'sre', r: 0, bio: 'Turns it off and on again.' },
    { id: 'owen', name: 'Owen Price', role: 'pm', r: 0, bio: 'Brings donuts to stand-up.' },
    { id: 'priya', name: 'Priya Nair', role: 'eng', r: 1, bio: 'Writes tests first. Mostly.' },
    { id: 'ana', name: 'Ana Ruiz', role: 'design', r: 1, bio: 'Can centre a div on the first try.' },
    { id: 'leo', name: 'Leo Brandt', role: 'sales', r: 1, bio: 'Remembers every client\'s dog.' },
    { id: 'sam', name: 'Sam Okoro', role: 'sre', r: 1, bio: 'Reads the logs so you don\'t have to.' },
    { id: 'hugo', name: 'Hugo Lind', role: 'pm', r: 1, bio: 'Turns meetings into decisions.' },
    { id: 'rosa', name: 'Rosa Vega', role: 'eng', r: 2, bio: 'Reviews your PR in four minutes.' },
    { id: 'ines', name: 'Ines Costa', role: 'design', r: 2, bio: 'Pixel perfect, every time.' },
    { id: 'oscar', name: 'Oscar Pike', role: 'sales', r: 2, bio: 'Closes on the first call.' },
    { id: 'ken', name: 'Ken Mori', role: 'sre', r: 2, bio: 'Has never been paged twice for the same thing.' },
    { id: 'fatima', name: 'Fatima Haddad', role: 'pm', r: 2, bio: 'Ships on the date she said.' },
    { id: 'margo', name: 'Margo Chen', role: 'eng', r: 3, bio: 'Draws boxes that become systems.' },
    { id: 'yuki', name: 'Yuki Sato', role: 'design', r: 3, bio: 'Her prototypes demo better than prod.' },
    { id: 'rex', name: 'Rex Hollander', role: 'sales', r: 3, bio: 'Once sold the company to itself.' },
    { id: 'viktor', name: 'Viktor Kral', role: 'sre', r: 3, bio: 'The pager whisperer.' },
    { id: 'nadia', name: 'Nadia Osei', role: 'pm', r: 3, bio: 'Can say no to a VP and get thanked.' },
    { id: 'dev', name: 'Dev Malhotra', role: 'eng', r: 4, bio: 'The fabled 10× engineer. Exists.' },
    { id: 'aurora', name: 'Aurora', role: 'design', r: 4, bio: 'A design system that designs itself.' },
    { id: 'max', name: 'Max Sterling', role: 'sales', r: 4, bio: 'Has the CEO\'s personal number.' },
    { id: 'grace', name: 'Grace Liang', role: 'sre', r: 4, bio: 'Five nines. Personally.' },
    { id: 'founder', name: 'The Founder', role: 'pm', r: 4, bio: 'Still has the key to the garage.' },
  ];

  const BLOCKERS = ['Scope creep', 'Flaky test', 'Merge conflict', 'Vague requirement', 'Legacy code', 'Unread email backlog',
    'Missing documentation', 'Dependency hell', 'Meeting overload', 'Context switching', 'Expired credentials', 'Unclear ownership',
    'Design by committee', 'Late feedback', 'Broken build', 'Config drift', 'Timezone bug', 'Stakeholder escalation',
    'Budget freeze', 'Reply-all storm', 'Approval bottleneck', 'Shadow IT', 'Data quality issue', 'Spreadsheet of truth'];
  const BOSSES = ['Launch day', 'Compliance audit', 'Board demo', 'Black Friday traffic', 'Data-centre migration', 'Annual planning',
    'Security pen-test', 'Investor due diligence', 'Year-end close', 'Rebrand rollout', 'Re-platforming', 'Customer escalation summit'];
  const CLIENTS = ['Contoso', 'Fabrikam', 'Northwind', 'Tailspin', 'Woodgrove', 'Litware', 'Adatum', 'Proseware', 'Wide World',
    'Coho', 'Alpine', 'Lucerne', 'Relecloud', 'VanArsdel', 'Trey', 'Margie\'s', 'Humongous', 'Blue Yonder'];
  const PROJECTS = ['CRM migration', 'mobile app', 'data platform', 'billing revamp', 'intranet refresh', 'ERP rollout', 'AI pilot',
    'checkout rebuild', 'cloud migration', 'analytics suite', 'partner portal', 'support chatbot', 'payroll integration', 'website relaunch'];

  const GEAR = {
    laptop: { name: 'Laptop', short: 'LP', items: ['Refurbished laptop', 'Standard-issue laptop', 'Developer workstation', 'Maxed-out workstation', 'R&D prototype rig'] },
    chair: { name: 'Chair', short: 'CH', items: ['Folding chair', 'Office chair', 'Ergonomic chair', 'Executive chair', 'Zero-gravity chair'] },
    headset: { name: 'Headset', short: 'HS', items: ['Tangled earbuds', 'Office headset', 'Noise-cancelling headset', 'Studio monitors', 'Neural focus band'] },
    mug: { name: 'Mug', short: 'MG', items: ['Paper cup', 'Branded mug', 'Insulated tumbler', 'Barista setup', 'Bottomless mug'] },
  };
  const GEAR_PCT = [8, 15, 25, 40, 65];

  const ENGAGEMENTS = [
    { name: 'Discovery workshop', role: 'pm' }, { name: 'Integration project', role: 'eng' }, { name: 'Security review', role: 'sre' },
    { name: 'Sales roadshow', role: 'sales' }, { name: 'Customer onsite', role: 'sales' }, { name: 'Proof of concept', role: 'eng' },
    { name: 'Brand refresh', role: 'design' }, { name: 'Architecture review', role: 'eng' }, { name: 'Rescue project', role: 'sre' },
    { name: 'Trade-show booth', role: 'design' }, { name: 'Roadmap offsite', role: 'pm' }, { name: 'Usability study', role: 'design' },
  ];
  // [seconds, staff needed]
  const DURATIONS = [[300, 1], [900, 1], [1800, 1], [3600, 2], [7200, 2], [14400, 3], [28800, 3]];

  const RESEARCH = [
    { id: 'autolevel', name: 'Process automation', desc: 'Automatically levels up your squad with spare revenue.', max: 1, cost: () => 4, time: () => 300 },
    { id: 'autoequip', name: 'IT self-service', desc: 'Automatically equips the best assets.', max: 1, cost: () => 6, time: () => 900 },
    { id: 'devprod', name: 'Developer productivity', desc: '+25% team output per level.', max: 40, cost: l => Math.ceil(3 * Math.pow(1.32, l)), time: l => Math.min(240 * Math.pow(1.45, l), 28800) },
    { id: 'revops', name: 'Revenue operations', desc: '+25% revenue per level.', max: 40, cost: l => Math.ceil(3 * Math.pow(1.32, l)), time: l => Math.min(240 * Math.pow(1.45, l), 28800) },
    { id: 'remote', name: 'Remote work policy', desc: '+2h offline accrual cap (base 8h).', max: 8, cost: l => 5 + l * 5, time: l => 900 * (l + 1) },
    { id: 'slots', name: 'Partner programme', desc: '+1 engagement slot.', max: 2, cost: l => [15, 60][l], time: l => [3600, 14400][l] },
    { id: 'repeat', name: 'Account management', desc: 'Finished engagements are collected and re-staffed automatically.', max: 1, cost: () => 25, time: () => 7200 },
    { id: 'squad', name: 'Headcount approval', desc: '+1 squad slot.', max: 1, cost: () => 40, time: () => 10800 },
    { id: 'loot', name: 'Asset procurement', desc: '+25% asset drop chance per level.', max: 4, cost: l => 8 * (l + 1), time: l => 1800 * (l + 1) },
    { id: 'incident', name: 'Incident response', desc: '+5s launch timer per level.', max: 4, cost: l => 10 * (l + 1), time: l => 2400 * (l + 1) },
    { id: 'brand', name: 'Employer brand', desc: 'Better recruiting odds (Senior and above) per level.', max: 5, cost: l => 12 * (l + 1), time: l => 3600 * (l + 1) },
    { id: 'training', name: 'Leadership training', desc: 'Engagement rewards +20% per level.', max: 10, cost: l => Math.ceil(6 * Math.pow(1.4, l)), time: l => Math.min(1800 * Math.pow(1.4, l), 28800) },
  ];

  const PERKS = [
    { id: 'investor', name: 'Investor confidence', desc: 'Team output ×1.6 per level.', max: 999, cost: l => Math.ceil(2 * Math.pow(1.6, l)) },
    { id: 'guidance', name: 'Revenue guidance', desc: 'Revenue ×1.6 per level.', max: 999, cost: l => Math.ceil(2 * Math.pow(1.6, l)) },
    { id: 'retention', name: 'Retention bonus', desc: 'Employees keep 10% of their levels per level through an IPO.', max: 5, cost: l => 5 * (l + 1) },
    { id: 'headhunter', name: 'Headhunter network', desc: '+1 referral from every first-time launch clear.', max: 3, cost: l => 4 * (l + 1) },
    { id: 'parachute', name: 'Golden parachute', desc: 'Offline efficiency +10% per level (base 50%).', max: 5, cost: l => 3 * (l + 1) },
    { id: 'lab2', name: 'Second R&D lab', desc: 'Run two research projects at once.', max: 1, cost: () => 15 },
    { id: 'seat', name: 'Board seat', desc: '+1 squad slot.', max: 1, cost: () => 25 },
    { id: 'lucky', name: 'Talent brand', desc: 'Principal odds ×1.5 per level.', max: 3, cost: l => 10 * (l + 1) },
  ];

  // Feature unlocks by highest project reached.
  const UNLOCKS = { recruit: 5, assets: 10, pizza: 10, engage: 15, rnd: 25, okr: 30, board: 60 };

  const PINGS = [['@manager', 'quick sync? 👀'], ['@hr-bot', 'Reminder: complete your annual training'], ['@ceo', 'Great work this quarter, team!'],
    ['@product', 'tiny change request, 5 mins max'], ['@it-helpdesk', 'Your ticket has been resolved'], ['@finance', 'Expense report approved ✅'],
    ['@design', 'can you take a look at this figma?'], ['@skip-level', 'got a sec for a coffee chat?'], ['@recruiting', 'referral bonus update 🎉'],
    ['@legal', 'please review before EOD'], ['@facilities', 'free pizza on 3F!']];

  return { RARITY, ROLES, PEOPLE, BLOCKERS, BOSSES, CLIENTS, PROJECTS, GEAR, GEAR_PCT, ENGAGEMENTS, DURATIONS, RESEARCH, PERKS, UNLOCKS, PINGS };
})();
