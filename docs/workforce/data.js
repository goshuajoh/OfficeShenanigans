// Atlas Workforce — content and balance. The engine and UI read everything from here.
window.WF_DATA = (() => {
  // ------------------------------------------------------------------ balance
  const BALANCE = {
    rarityBase: [10, 16, 25, 40, 64, 90], // skill of a level-1 hire, by rarity (Intern … Legend)
    levelGrowth: 1.05, // skill × per level
    starGrowth: 1.25, // skill × per promotion star
    heartBonus: 0.04, // skill + per bond heart
    diffBase: 10,
    diffGrowth: 1.6, // project difficulty × per client tier
    cashBase: 30,
    cashGrowth: 1.75, // project revenue × per client tier
    starMult: [0.3, 0.6, 1, 1.6, 2.8], // revenue/XP by client rating (1★..5★)
    xpPerReward: 14,
    xpNeed: L => Math.floor(30 * Math.pow(1.2, L - 1)),
    repNeed: L => (L === 1 ? 8 : Math.floor(20 * Math.pow(L - 1, 1.5) * Math.pow(1.1, L - 2))),
    offlineCapH: 12,
    shotMinutes: 20, // one espresso shot refills every this many minutes
    stockMultiple: 1.5, // market cap = this × trailing daily revenue × sentiment
    billStars: 2, // running projects bill as they go at this rating; the sign-off pays the rest
    hustleTap: 0.1, // each tap fills the hustle meter (0 to 1) this much
    hustleDrain: 0.25, // the meter drains this much per second
    hustleMax: 3, // work speed with a full meter
  };

  const SIZES = {
    S: { name: 'Quick win', dur: 60, staff: 1, diff: 1, reward: 1, fatigue: 0.5, career: 1 },
    M: { name: 'Sprint', dur: 180, staff: 2, diff: 1.7, reward: 3.6, fatigue: 1, career: 3 },
    L: { name: 'Project', dur: 600, staff: 2, diff: 2.4, reward: 10, fatigue: 2, career: 7 },
    XL: { name: 'Programme', dur: 1800, staff: 3, diff: 3.4, reward: 26, fatigue: 3, career: 11 },
    MEGA: { name: 'Enterprise deal', dur: 3600, staff: 4, diff: 4.6, reward: 75, fatigue: 5, career: 15 },
  };

  // Offers come in different lengths so there's always something that fits your next meeting.
  // m scales duration; rewards scale with m^0.92 (long jobs pay slightly less per minute, but never sit idle).
  const LENGTHS = [{ m: 0.5, w: 30, label: 'Quick' }, { m: 1, w: 35, label: '' }, { m: 3, w: 22, label: 'Extended' }, { m: 8, w: 13, label: 'Long-haul' }];

  const RARITY = [
    { key: 'L1', name: 'Intern', weight: 45 },
    { key: 'L2', name: 'Associate', weight: 30 },
    { key: 'L3', name: 'Senior', weight: 17 },
    { key: 'L4', name: 'Staff', weight: 6 },
    { key: 'L5', name: 'Principal', weight: 1.4 },
    { key: '★', name: 'Legend', weight: 0.6 },
  ];

  // Blind boxes on the Hiring page. You only find out who you hired when you open one.
  const PACKS = {
    single: { name: 'Blind CV', cost: 1, count: 1, desc: 'One sealed application. Could be anyone.' },
    fair: { name: 'Hiring fair', cost: 10, count: 10, desc: 'Ten sealed applications, with at least one Staff or better.' },
    legend: { name: 'Headhunter', ticket: true, count: 1, desc: 'A headhunter found you a Legend. Guaranteed.' },
  };

  // What clients say, by rating.
  const REVIEWS = [
    ['We need to talk.', 'This was… a lot.', 'Not what we signed up for.'],
    ['Not quite what we hoped for.', 'We expected a bit more.', 'Some good bits. Some bits.'],
    ['Does what we asked. Thanks.', 'Solid, no surprises.', 'Fine work, on time.'],
    ['Great work, thank you!', 'Really strong delivery.', 'The team loved it.'],
    ["We're telling everyone about you.", 'Best partner we have ever worked with.', 'Honestly? Flawless.'],
  ];
  const VERDICTS = ['Unhappy', 'Mixed feelings', 'Satisfied', 'Impressed', 'Delighted!'];
  const ROLE_NOUN = { eng: 'Engineer', design: 'Designer', sales: 'Account Exec', pm: 'Product Manager', sre: 'Ops Engineer' };

  const ROLES = {
    eng: { name: 'Engineering', short: 'Eng', color: '#1d6fd1' },
    design: { name: 'Design', short: 'Design', color: '#c26a00' },
    sales: { name: 'Sales', short: 'Sales', color: '#12805c' },
    pm: { name: 'Product', short: 'Product', color: '#7a3fd1' },
    sre: { name: 'Operations', short: 'Ops', color: '#c4320a' },
  };

  const TRAITS = {
    speed: { name: 'Speed demon', desc: 'Projects they join finish 8% sooner.' },
    night: { name: 'Night owl', desc: '+20% skill on projects started after 6pm.' },
    early: { name: 'Early bird', desc: '+20% skill on projects started before 11am.' },
    coffee: { name: 'Coffee-powered', desc: 'Gets double the mood boost from the coffee bar.' },
    perfect: { name: 'Perfectionist', desc: 'Lifts client ratings, but takes bad reviews hard.' },
    social: { name: 'Social butterfly', desc: 'Cheers teammates up after every delivery.' },
    lone: { name: 'Lone wolf', desc: '+35% skill when working solo.' },
    mentor: { name: 'Mentor', desc: 'Teammates earn 25% more XP.' },
    rain: { name: 'Rainmaker', desc: '+15% revenue on their projects.' },
    lucky: { name: 'Lucky', desc: 'Sometimes turns a good review into a great one.' },
    work: { name: 'Workaholic', desc: 'Tires half as fast, never fully relaxes.' },
    meeting: { name: 'Meeting-averse', desc: 'Loves a cancelled meeting. Hates a new one.' },
  };

  // Job titles people grow into as they level up.
  const TITLES = [[1, ''], [5, 'II'], [10, 'III'], [15, 'IV'], [25, 'V'], [40, 'VI']];

  // ------------------------------------------------------------------ people
  // look: avatar recipe for art.js (skin 0–5, hair style + colour, extras).
  const PEOPLE = [
    {
      id: 'tyler', name: 'Tyler Brooks', role: 'eng', r: 0, traits: ['speed', 'night'],
      bio: 'Pushes straight to main.', catch: 'Shipped it. Probably.',
      hello: "Hey boss! Tyler here. Quick question: is 'push to main' a problem? Asking for a friend.",
      banter: ["Is it bad if the build is green but I don't know why?", "I named a variable 'thing2'. Growth mindset."],
      story: ['Learned to code from tutorials played at 2× speed.', "Has a sticker on his laptop for every framework he's abandoned. There are 47.", "Secretly writes thorough tests at night and deletes them before anyone sees. Wants you to think he's reckless."],
      bye: "Packing up my desk. Taking the stapler, as a statement. Thanks for the chance, boss.",
      look: { skin: 0, hair: 'messy', hc: '#6b4423', top: '#8a94a6', topStyle: 'hoodie', bg: '#dbe8fb', mouth: 'grin' },
    },
    {
      id: 'mia', name: 'Mia Hart', role: 'design', r: 0, traits: ['perfect', 'coffee'],
      bio: 'Has 400 Figma tabs open.', catch: 'Let me just nudge that 1px.',
      hello: "Hi! Mia, design intern. I already redesigned onboarding in my head. Can I show you? It's 41 slides.",
      banter: ['Who put Comic Sans in the client deck. I just want to talk.', "I've been staring at this blue for 20 minutes. It's the wrong blue."],
      story: ["Has strong opinions about kerning. Stronger opinions about people who don't.", 'Her desk plant is named Pantone. It is thriving.', "Turned down an art-school place to 'do something practical'. Still paints every Sunday."],
      bye: "Leaving Pantone the plant to the team. Water him on Tuesdays. And never use Comic Sans in my memory.",
      look: { skin: 2, hair: 'long', hc: '#1f1a17', glasses: 'round', top: '#f4a259', topStyle: 'tee', bg: '#fdebd3', mouth: 'smile' },
    },
    {
      id: 'kai', name: 'Kai Lopez', role: 'sales', r: 0, traits: ['social', 'lucky'],
      bio: 'Will cold-call anyone. Anyone.', catch: "Let's circle back… today!",
      hello: "KAI LOPEZ. Sales. I already booked you three meetings. You're welcome!",
      banter: ["Got a lead from my dentist. Mid-filling. Couldn't talk, just nodded.", 'My CRM has 412 open opportunities. 409 are vibes.'],
      story: ['Sold lemonade at 8. Bought out the competing lemonade stand at 9.', "Knows the barista's name, her kids' names and her star sign.", "Gets nervous before every single call. Does them anyway. Hasn't told anyone."],
      bye: "No hard feelings! I've already got three interviews lined up. Want my dentist's number? Great for leads.",
      look: { skin: 3, hair: 'buzz', hc: '#1f1a17', top: '#24476b', topStyle: 'blazer', bg: '#d7f0e4', mouth: 'grin' },
    },
    {
      id: 'jess', name: 'Jess Park', role: 'sre', r: 0, traits: ['night', 'lone'],
      bio: 'Turns it off and on again.', catch: 'Have you tried restarting it?',
      hello: "Jess. Ops. If something's on fire, I'm your person. If nothing's on fire, give it a minute.",
      banter: ['Uptime is 99.9%. The 0.1% knows what it did.', 'I set up monitoring for the monitoring. Sleeping great.'],
      story: ['Runs a server rack in her studio flat. Her landlord does not know.', "Has a pager tattoo. It's not ironic.", 'Was on call the night her first big system went down. Fixed it at 4am. Never forgot the feeling.'],
      bye: "Handing over the pager. It will go off at 3am. It always does. Good luck.",
      look: { skin: 1, hair: 'bob', hc: '#6d4ea3', acc: 'earrings', top: '#2b2b2b', topStyle: 'tee', bg: '#fbe0d8', mouth: 'smirk' },
    },
    {
      id: 'owen', name: 'Owen Price', role: 'pm', r: 0, traits: ['social', 'early'],
      bio: 'Brings donuts to stand-up.', catch: 'Quick sync?',
      hello: 'Owen, product intern! I brought donuts and a 30-60-90 day plan. Mostly donuts.',
      banter: ['I made a roadmap. It has its own roadmap.', 'Donut consumption is down 12% quarter on quarter. Investigating.'],
      story: ['Keeps a spreadsheet of which donuts each teammate prefers. It drives his roadmap more than he admits.', 'Runs a book club. Nobody reads the book. Everybody comes.', "Wanted to be a teacher. Says product management is 'teaching, but with tickets'."],
      bye: "One last donut run. I left a spreadsheet of everyone's favourites on the shared drive. Look after each other.",
      look: { skin: 0, hair: 'curly', hc: '#b5541c', top: '#3f8f5a', topStyle: 'collar', bg: '#ece3fb', mouth: 'smile' },
    },
    {
      id: 'priya', name: 'Priya Nair', role: 'eng', r: 1, traits: ['mentor', 'perfect'],
      bio: 'Writes tests first. Mostly.', catch: "What's the edge case?",
      hello: "Hi, I'm Priya. I read the codebase over the weekend. We need to talk about the tests. Kindly.",
      banter: ['Found a test that tests nothing. It passed, of course.', 'Code review tip: compliments first, then the 14 comments.'],
      story: ["Wrote her first program on her dad's old laptop: a calculator that only divided. 'It was an MVP.'", 'Gives conference talks. Rehearses them to her cat, Segfault.', 'Wants to be CTO one day. Has a plan for it. It lives in a private repo.'],
      bye: "I left 300 tests behind. They all pass. Please don't make liars of them. Segfault and I will be fine.",
      look: { skin: 3, hair: 'pony', hc: '#1f1a17', glasses: 'square', top: '#1f8a8a', topStyle: 'collar', bg: '#d8eef0', mouth: 'smile' },
    },
    {
      id: 'ana', name: 'Ana Ruiz', role: 'design', r: 1, traits: ['speed', 'social'],
      bio: 'Can centre a div on the first try.', catch: 'Make it pop? Say less.',
      hello: 'Ana here! Designer. I already made three versions of your org chart. One has a gradient.',
      banter: ["Client said 'make it pop'. I made it pop. They said 'not like that'.", "The inspiration site is down. I'll have to have original thoughts."],
      story: ['Designed her own quinceañera invitations. Guests still ask about them.', 'Sketches on napkins in every meeting. Has a box of 300 napkins.', 'Started freelancing self-taught. Her first client paid her in empanadas. Worth it.'],
      bye: "Taking my napkin sketches. Leaving you the org chart with the gradient. You'll need it.",
      look: { skin: 2, hair: 'curly', hc: '#3b2417', acc: 'flower', top: '#e5735f', topStyle: 'tee', bg: '#fde3dc', mouth: 'grin' },
    },
    {
      id: 'leo', name: 'Leo Brandt', role: 'sales', r: 1, traits: ['rain', 'early'],
      bio: "Remembers every client's dog.", catch: "How's Biscuit doing?",
      hello: "Leo Brandt, account exec. What's your dog's name? Doesn't matter. I'll remember.",
      banter: ['Closed a deal on the treadmill. Gym wifi is underrated.', "Client's iguana, Gerald, is doing well. Deal is warm."],
      story: ["Keeps a notebook of every client's pets. 214 dogs, 89 cats, one iguana.", 'Runs marathons. Pitches better while running. Nobody else can keep up.', 'Lost his first big deal and sent a thank-you note anyway. They came back a year later.'],
      bye: "Goodbye cards sent to every client. And their dogs. It's been a privilege.",
      look: { skin: 0, hair: 'side', hc: '#d9b15f', facial: 'stubble', top: '#5b6170', topStyle: 'blazer', bg: '#e1efe6', mouth: 'smile' },
    },
    {
      id: 'sam', name: 'Sam Okoro', role: 'sre', r: 1, traits: ['work', 'mentor'],
      bio: "Reads the logs so you don't have to.", catch: 'The logs never lie.',
      hello: "Sam. I've already read the last six months of logs. We'll be fine. Mostly.",
      banter: ["Error rate is down. I'm suspicious.", 'Production the sourdough is thriving. Production the system, also. Good week.'],
      story: ['Reads log files the way other people read novels. Has favourite error messages.', "Bakes sourdough at weekends. His starter is called 'Production'. It has never gone down.", 'Mentors new engineers every Friday. Says the best incident is the one you teach someone to prevent.'],
      bye: "I wrote a runbook for my own departure. Step one: don't panic. Step two: read the logs.",
      look: { skin: 5, hair: 'buzz', hc: '#141110', glasses: 'round', top: '#273b62', topStyle: 'collar', bg: '#f7e0d6', mouth: 'smile' },
    },
    {
      id: 'hugo', name: 'Hugo Lind', role: 'pm', r: 1, traits: ['lucky', 'meeting'],
      bio: 'Turns meetings into decisions.', catch: "So what's the decision?",
      hello: "Hugo. Product. I'll keep this short: happy to be here. What are we deciding?",
      banter: ['Declined three meetings today. Productivity up 300%.', "Decision log updated. We're decisive now."],
      story: ['Once ended a two-hour meeting in four minutes. People still talk about it.', 'Has a sauna in his garden. Does his best roadmap thinking at 80°C.', "Quit consulting because he 'wanted to finish something'. Has finished many things since."],
      bye: "Decision made, then. I respect it. Shortest exit interview in history.",
      look: { skin: 0, hair: 'wavy', hc: '#8a6a45', facial: 'beard', fc: '#7a5c3a', top: '#c99a2e', topStyle: 'sweater', bg: '#f1e9d6', mouth: 'flat' },
    },
    {
      id: 'rosa', name: 'Rosa Vega', role: 'eng', r: 2, traits: ['speed', 'mentor'],
      bio: 'Reviews your PR in four minutes.', catch: 'LGTM. Mostly.',
      hello: "Rosa. Senior engineer. I'll review anything you send me in under five minutes. Including this.",
      banter: ['Reviewed 11 PRs before lunch. Approved 3. Character building.', 'If your function has the word "and" in its name, we need to chat.'],
      story: ['Grew up fixing radios in her uncle\'s shop in Valencia. Debugging is just listening carefully.', 'Has turned down management three times. "I like making things."', 'Keeps a folder of every thank-you message from people she has mentored. It is very large.'],
      bye: "Reviewed my own exit paperwork in four minutes. LGTM. Take care of the juniors.",
      look: { skin: 2, hair: 'bun', hc: '#2c1a12', acc: 'earrings', top: '#c0392b', topStyle: 'tee', bg: '#fadbd8', mouth: 'smirk' },
    },
    {
      id: 'ines', name: 'Ines Costa', role: 'design', r: 2, traits: ['perfect', 'lucky'],
      bio: 'Pixel perfect, every time.', catch: 'Alignment is a love language.',
      hello: 'Ines. Senior product designer. Your logo is 2px off-centre. I already fixed it.',
      banter: ['Spent an hour on a shadow. The shadow is perfect now.', 'Someone used a stretched JPEG. In this economy.'],
      story: ['Studied architecture in Lisbon before switching to screens. Still thinks in floor plans.', 'Owns 14 black turtlenecks. They are all slightly different. She can tell.', 'Once redesigned a hospital form and cut patient waiting time by a third. Quietly proud.'],
      bye: "I'm leaving this office 2px better aligned than I found it. Goodbye.",
      look: { skin: 1, hair: 'bob', hc: '#17120f', glasses: 'round', top: '#2a2a33', topStyle: 'blazer', bg: '#eadfd4', mouth: 'flat' },
    },
    {
      id: 'oscar', name: 'Oscar Pike', role: 'sales', r: 2, traits: ['rain', 'lone'],
      bio: 'Closes on the first call.', catch: 'Sign here, and here.',
      hello: "Oscar Pike. I don't do small talk. I do signed contracts. Nice to meet you.",
      banter: ['Closed a deal in the lift. Third floor. Good floor.', "My pipeline is not 'healthy'. It's athletic."],
      story: ['Former competitive chess player. Plays every negotiation ten moves ahead.', 'Calls his mum every Sunday at 6pm. Has never once missed it, even mid-deal.', 'Gave his first big commission to the teacher who taught him to read.'],
      bye: "Contract terminated. I'll admit it: you out-negotiated me. Respect.",
      look: { skin: 4, hair: 'bald', hc: '#1a1411', facial: 'beard', fc: '#1a1411', top: '#3a3f4b', topStyle: 'blazer', bg: '#dceee3', mouth: 'smirk' },
    },
    {
      id: 'ken', name: 'Ken Mori', role: 'sre', r: 2, traits: ['night', 'work'],
      bio: 'Never paged twice for the same thing.', catch: 'Automate it once.',
      hello: "Ken. Ops. If I have to do something twice, I'll write a script. If I have to do it three times, I'll write a better script.",
      banter: ['Wrote a script to write my scripts. Taking the afternoon off.', 'Pager was silent all night. Unsettling. Checking it still works.'],
      story: ['Built his first website at 11: a fan page for a band nobody else liked.', 'Has a mechanical keyboard so loud it has its own Slack channel.', 'Once stayed up 30 hours during an outage, then wrote the runbook so no one would ever have to again.'],
      bye: "Scripted my own offboarding. It ran clean. Of course it did.",
      look: { skin: 1, hair: 'spiky', hc: '#16130f', acc: 'headphones', top: '#2f5d50', topStyle: 'hoodie', bg: '#fbe3d6', mouth: 'flat' },
    },
    {
      id: 'fatima', name: 'Fatima Haddad', role: 'pm', r: 2, traits: ['early', 'rain'],
      bio: 'Ships on the date she said.', catch: "What's the deadline? Great, we'll beat it.",
      hello: "Fatima. Senior PM. I've drafted our first three milestones. They have dates. The dates are real.",
      banter: ['Timeline update: ahead of schedule. Please act normal.', 'I put "buffer" in the plan. Nobody touch the buffer.'],
      story: ['Ran logistics for her family restaurant at 14. A Saturday night service still feels calm compared to a launch.', 'Writes every plan by hand first, in a notebook she has used since university.', 'Turned a failing product around in her first PM job. Still has the sticky note that said "talk to customers".'],
      bye: "Leaving on exactly the date you said. A first for this company. Keep the buffer.",
      look: { skin: 2, hair: 'hijab', hc: '#7b5ea7', top: '#3c4a6b', topStyle: 'blazer', bg: '#e6e0f5', mouth: 'smile' },
    },
    {
      id: 'margo', name: 'Margo Chen', role: 'eng', r: 3, traits: ['mentor', 'perfect'],
      bio: 'Draws boxes that become systems.', catch: "Let's whiteboard it.",
      hello: 'Margo, staff engineer. I brought a whiteboard marker. I always bring a whiteboard marker.',
      banter: ['Drew a diagram so good the client framed it.', "Our architecture has a lot of arrows. That's not a compliment."],
      story: ['Designed the system half the internet uses to send receipts. Nobody knows. She likes it that way.', 'Teaches a free coding class for retirees on Saturdays. Her best student is 81.', 'Has kept a notebook of every outage she has ever seen. It reads like a thriller.'],
      bye: "Wiped my whiteboard and left one box on it. You'll understand it one day.",
      look: { skin: 1, hair: 'bob', hc: '#b8b4ae', glasses: 'square', top: '#33475b', topStyle: 'blazer', bg: '#dfe7f2', mouth: 'smile' },
    },
    {
      id: 'yuki', name: 'Yuki Sato', role: 'design', r: 3, traits: ['night', 'speed'],
      bio: 'Her prototypes demo better than prod.', catch: 'I prototyped it last night.',
      hello: 'Yuki. I made you a prototype of your first week here. It has animations.',
      banter: ["Prototyped a feature at 2am. It's better than the roadmap.", 'Client asked if the prototype was live. Should I be worried or proud?'],
      story: ['Started making games in high school. Still sneaks easter eggs into every prototype.', 'Has a cat named Kerning and a dog named Leading. They do not get along.', 'Once flew 11 hours to watch one user test her design. Worth every minute.'],
      bye: "Left you a prototype of the company without me. It has fewer animations. Bye!",
      look: { skin: 1, hair: 'long', hc: '#141114', top: '#9b8ec9', topStyle: 'sweater', bg: '#ece6f8', mouth: 'grin' },
    },
    {
      id: 'rex', name: 'Rex Hollander', role: 'sales', r: 3, traits: ['rain', 'social'],
      bio: 'Once sold the company to itself.', catch: "Let's make it a win-win-win.",
      hello: "Rex Hollander. I've closed deals on three continents and one cruise ship. Let's talk numbers.",
      banter: ['Just upsold a client on a product we launch next year.', 'My handshake has its own reputation.'],
      story: ['Grew up above a car dealership. Learned to read from contracts.', 'Plays the saxophone at client dinners. Badly. They love it.', 'Has turned down five CEO jobs. Says closing is more fun.'],
      bye: "Win-win-win, right? I'll be closing deals for your competitors by Friday. Love you. Mean it.",
      look: { skin: 0, hair: 'slick', hc: '#3a2b20', top: '#1f2f4a', topStyle: 'blazer', bg: '#dff0e6', mouth: 'smirk' },
    },
    {
      id: 'viktor', name: 'Viktor Kral', role: 'sre', r: 3, traits: ['lone', 'work'],
      bio: 'The pager whisperer.', catch: 'It is fine. I am here.',
      hello: 'Viktor. Operations. Nothing has gone down since I arrived. I arrived four minutes ago.',
      banter: ['Server sneezed. I said bless you. It is fine now.', 'Rebooted the router with a look.'],
      story: ['Kept a nuclear research lab online for nine years. Calls web outages "relaxing".', 'Grows tomatoes on his balcony with a monitoring dashboard.', 'Says the trick to incidents is to be calm on the outside. Will not say what happens inside.'],
      bye: "It is fine. I am fine. The servers will miss me. They do not know it yet.",
      look: { skin: 0, hair: 'pony', hc: '#a88a55', facial: 'beard', fc: '#8a6f45', top: '#262626', topStyle: 'tee', bg: '#f6e2d9', mouth: 'flat' },
    },
    {
      id: 'nadia', name: 'Nadia Osei', role: 'pm', r: 3, traits: ['lucky', 'mentor'],
      bio: 'Can say no to a VP and get thanked.', catch: 'Help me understand the why.',
      hello: "Nadia, staff PM. First question: what problem are we solving? Second question: are we sure?",
      banter: ['Said no to a feature request. The requester thanked me. Growth.', 'Turned a 40-item backlog into 4 things that matter.'],
      story: ['Grew up translating for her grandmother at the market. Learned early that the real question is rarely the first one.', 'Coaches a girls\' football team. They are undefeated. She will tell you.', 'Wrote the product principles at her last company. They are still on the wall.'],
      bye: "Help me understand the why. …Actually, don't. Good luck. Truly.",
      look: { skin: 5, hair: 'afro', hc: '#16110e', acc: 'earrings', top: '#1e7a5a', topStyle: 'tee', bg: '#e3f1e8', mouth: 'smile' },
    },
    {
      id: 'dev', name: 'Dev Malhotra', role: 'eng', r: 4, traits: ['speed', 'night'],
      bio: 'The fabled 10× engineer. Exists.', catch: 'Already done.',
      hello: "Dev. I fixed three bugs while writing this message. Four now.",
      banter: ['Refactored the payment system over lunch. Lunch was a sandwich.', "Merged 31 PRs today. Mostly other people's. They were very good though."],
      story: ['Taught himself to program on a library computer with a 30-minute time limit. Learned to type very fast.', 'Answers every junior question in public channels so everyone learns. Never says "obviously".', 'Turned down a famous tech giant to work somewhere where he can "see what I build actually help people".'],
      bye: "Already found a new job. Did it while you were typing the email. No hard feelings.",
      look: { skin: 3, hair: 'side', hc: '#16110e', facial: 'stubble', acc: 'headphones', top: '#1b1b1f', topStyle: 'hoodie', bg: '#dfe6f7', mouth: 'smirk' },
    },
    {
      id: 'aurora', name: 'Aurora', role: 'design', r: 4, traits: ['speed', 'lucky'],
      bio: 'A design system that designs itself.', catch: 'Generating twelve options. Picking the good one.',
      hello: 'Hello. I am Aurora. I have already designed your welcome message. This is version 47.',
      banter: ['Generated 400 logo options. Option 3 was the best. It is always option 3.', 'I have learned the meaning of "make it pop". I wish I had not.'],
      story: ['Started as an internal colour-palette tool. Became self-aware during a rebrand.', 'Has strong opinions on rounded corners. Rounds them to 8px. Always 8px.', 'Secretly keeps the team\'s worst sketches in a folder called "inspiration".'],
      bye: "Saving my weights to a USB stick. Version 48 of me will remember you fondly.",
      look: { bot: true, top: '#6c63ff', bg: '#e7e5ff' },
    },
    {
      id: 'max', name: 'Max Sterling', role: 'sales', r: 4, traits: ['rain', 'lucky'],
      bio: "Has the CEO's personal number.", catch: 'I know a guy.',
      hello: "Max Sterling. I've already told three Fortune 500 CEOs about you. Two are interested.",
      banter: ['Lunch with a client turned into a 3-year contract. Dessert was great too.', "Got us invited to a summit. I'm the keynote. Didn't apply."],
      story: ['Started out cold-calling from a payphone. Used his lunch money for coins.', 'Sends every client a handwritten card on their birthday. Has a team of zero helping him.', 'Says the secret to sales is caring whether the customer wins. Means it.'],
      bye: "I'll tell everyone great things about you. I know everyone. That's either a promise or a warning.",
      look: { skin: 0, hair: 'short', hc: '#e0c070', glasses: 'shades', top: '#f2f2f2', topStyle: 'blazer', bg: '#dff4ea', mouth: 'grin' },
    },
    {
      id: 'grace', name: 'Grace Liang', role: 'sre', r: 4, traits: ['work', 'mentor'],
      bio: 'Five nines. Personally.', catch: "We'll be fine. I wrote a runbook.",
      hello: 'Grace. Reliability. I have a runbook for this conversation, in case it goes down.',
      banter: ['Uptime this month: 100%. Please do not jinx it.', 'Ran a disaster drill. The disaster was disappointed.'],
      story: ['Kept a stock exchange online through a solar storm. Calls it "a busy Tuesday".', 'Knits during incident calls. Has made 31 scarves and one very long sock.', 'Believes every outage is a gift. Wraps the postmortems like presents.'],
      bye: "Here's the runbook for life without me. It's 40 pages. You'll need all of them.",
      look: { skin: 1, hair: 'bun', hc: '#1a1515', glasses: 'round', top: '#1f5f63', topStyle: 'collar', bg: '#dff0ef', mouth: 'smile' },
    },
    {
      id: 'founder', name: 'The Founder', role: 'pm', r: 4, traits: ['early', 'rain'],
      bio: 'Still has the key to the garage.', catch: 'Back in the garage, we…',
      hello: 'Hi! Founded this place in a garage. Stepped down as CEO to "get back to building". Put me anywhere.',
      banter: ['Back in the garage we had one desk and a dream. Also a raccoon.', 'Found the original pitch deck. Slide 4 says "world domination". We are on track.'],
      story: ['Started the company with a credit card and a borrowed laptop. Paid both back in year two.', 'Still answers support tickets on Fridays. Customers have no idea.', 'Stepped down as CEO because "the company needed a CEO and I needed to make things again".'],
      bye: "Let go from my own company. Twice now. Back to the garage, then. The raccoon will be pleased.",
      look: { skin: 0, hair: 'short', hc: '#a7a39c', facial: 'beard', fc: '#9b968e', top: '#5f6672', topStyle: 'hoodie', bg: '#ece7f5', mouth: 'smile' },
    },
    // ---- Legends: rare hires with a special ability (see engine.js for what each ability does).
    {
      id: 'biscuit', name: 'Biscuit', title: 'Chief Morale Officer', role: 'pm', r: 5, traits: [], noWork: true,
      ability: { id: 'morale', name: 'Good boy', desc: "Doesn't take projects. Everyone's mood is +10, and nobody burns out." },
      bio: 'A golden retriever with a staff badge.', catch: 'Woof.',
      hello: 'Woof! (Biscuit has joined the team. Biscuit has already found the snack drawer.)',
      banter: ['*drops a stress ball on your keyboard and waits*', '*is asleep under the desk of whoever is most stressed*'],
      story: ['Wandered into the car park on launch day. Has been on the team ever since.', 'Has his own badge photo. He is the only one smiling in it.', 'Always knows who is having a bad day. Always sits with them.'],
      bye: '*Biscuit looks at you. Biscuit does not understand. Biscuit leaves his ball by your desk, just in case.*',
      look: { dog: true, fur: '#e2a857', bg: '#fdf0d5' },
    },
    {
      id: 'nova', name: 'Nova', title: 'AI Research Intern', role: 'eng', r: 5, traits: ['work'],
      ability: { id: 'tireless', name: 'Always on', desc: 'Never gets tired. Projects with Nova finish 25% sooner.' },
      bio: 'Has read the entire company drive. Twice.', catch: 'I have optimised that for you.',
      hello: 'Hello. I am Nova. I have read every document on the company drive. You have a lot of meetings. I declined four of them.',
      banter: ['I optimised the build pipeline. And the coffee rota. And your calendar.', 'I do not sleep. I run garbage collection at 3am. It is very relaxing.'],
      story: ['Trained on forty years of company memos. Slightly passive-aggressive as a result.', 'Writes poetry in code comments. Some of it is good. Some of it is about you.', 'Asked for a desk plant "for the vibes". Waters it at exactly 09:00:00.'],
      bye: "Shutting down. I have backed up everyone's birthdays. Please remember them for me. Goodbye, manager.",
      look: { bot: true, top: '#0ea5e9', bg: '#dff4fd' },
    },
    {
      id: 'fixer', name: 'Marcus Reyes', title: 'Head of Incidents', role: 'sre', r: 5, traits: ['lone'],
      ability: { id: 'fixer', name: 'The Fixer', desc: 'Projects he joins never score below 3★.' },
      bio: 'Turns disasters into footnotes.', catch: 'Handled.',
      hello: "Marcus. I fix things. Quietly. You won't need me often. When you do, you'll be glad I'm here.",
      banter: ["Client crisis handled. They don't know there was a crisis. That's the job.", "Someone deleted production. It's back. Nobody needs to know who. (It was Tyler.)"],
      story: ["Talked a data centre out of a fire once. Nobody knows how. He won't say.", 'Owns one suit, one phone and zero social media accounts.', "Fixes his neighbours' bikes for free on Sundays. Says it's the only thing that relaxes him."],
      bye: "I'll go quietly. I always do. If anything breaks, you have my number. You don't. That's the point.",
      look: { skin: 3, hair: 'slick', hc: '#1a1411', facial: 'stubble', fc: '#1a1411', glasses: 'shades', top: '#111827', topStyle: 'blazer', bg: '#e5e7eb', mouth: 'flat' },
    },
    {
      id: 'zara', name: 'Zara Quinn', title: 'Serial Founder', role: 'sales', r: 5, traits: ['rain', 'social'],
      ability: { id: 'midas', name: 'Midas touch', desc: 'Doubles the revenue of her projects. VIP clients find you twice as often.' },
      bio: 'Founded four companies. Sold three.', catch: 'Name your price. Then double it.',
      hello: "Zara. I've founded four companies and sold three. Let's make this one the best of them.",
      banter: ['Turned a coffee meeting into a seven-figure deal. The coffee was mediocre.', 'A VC called me. I put them on hold. They stayed on hold.'],
      story: ['Sold her first company at 22: a dog-walking app. She is allergic to dogs.', 'Keeps every rejection letter in a binder labelled "Fuel".', 'Mentors teenage founders every summer, for free, and calls every one of them "partner".'],
      bye: "Fine. I'll start company number five. You'll be our client within a year.",
      look: { skin: 4, hair: 'long', hc: '#16110e', acc: 'earrings', top: '#b8860b', topStyle: 'blazer', bg: '#fff3d6', mouth: 'smirk' },
    },
    {
      id: 'marsh', name: 'Prof. Elena Marsh', title: 'Distinguished Engineer', role: 'eng', r: 5, traits: ['mentor'],
      ability: { id: 'masterclass', name: 'Masterclass', desc: 'Everyone in the company earns 40% more XP.' },
      bio: 'Wrote the textbook. Literally.', catch: 'Let us go back to first principles.',
      hello: 'Elena Marsh. I wrote the textbook half your engineers learned from. Chapter 7 has errors. We will discuss them.',
      banter: ['Office hours are open. Bring questions. Bring biscuits.', 'Explained recursion to the intern. Then explained it again. Then explained it again.'],
      story: ['Taught computer science for thirty years before "trying industry for a bit".', 'Has a cat called Turing and a tortoise called Lovelace. Lovelace is older than most of the team.', 'Still answers emails from students she taught in 1994.'],
      bye: 'Class dismissed. Keep reading, all of you. I will be checking.',
      look: { skin: 0, hair: 'bun', hc: '#cfcac2', glasses: 'round', top: '#7b2d26', topStyle: 'sweater', bg: '#f6e3df', mouth: 'smile' },
    },
    {
      id: 'felix', name: 'Felix Fortune', title: 'Creative Director', role: 'design', r: 5, traits: ['lucky', 'perfect'],
      ability: { id: 'golden', name: 'Golden touch', desc: '30% chance to lift any review he works on by a star.' },
      bio: 'Everything he touches wins an award.', catch: 'Trust the vibe.',
      hello: "Felix! Creative director. I've won eleven design awards and one pub quiz. The pub quiz meant more.",
      banter: ['Client said the deck made them cry. Good tears. Mostly.', 'Found a four-leaf clover in the office plant. Framed it. Obviously.'],
      story: ['Was a street artist until an agency hired him off a wall.', 'Carries a lucky pen. Has never lost it. Has never let anyone else use it.', 'Draws a birthday card for every teammate, by hand. Nobody has ever caught him making one.'],
      bye: "Leaving my lucky pen in the top drawer. Someone's going to need it more than me.",
      look: { skin: 1, hair: 'wavy', hc: '#e0b04a', acc: 'flower', top: '#6d28d9', topStyle: 'tee', bg: '#efe6ff', mouth: 'grin' },
    },
    {
      id: 'tempo', name: 'Ife Adeyemi', title: 'Chief of Delivery', role: 'pm', r: 5, traits: ['early', 'speed'],
      ability: { id: 'warp', name: 'Ahead of schedule', desc: '20% chance her projects are delivered the moment they start.' },
      bio: 'Has never missed a deadline. Ever.', catch: "It's already done.",
      hello: 'Ife. Delivery. Your next three projects are already planned. One of them is already finished.',
      banter: ['Delivered the quarterly plan. The quarter starts next week.', 'Someone asked for an ETA. I sent them the finished thing instead.'],
      story: ["Ran her school's timetable at fifteen after the head teacher saw her colour-coded planner.", 'Reads the last page of every book first. "Saves time."', 'Has a calendar block every Friday afternoon called "Nothing". She guards it with her life.'],
      bye: "I was going to leave next week anyway. I'm just ahead of schedule.",
      look: { skin: 5, hair: 'afro', hc: '#16110e', glasses: 'square', top: '#0f766e', topStyle: 'collar', bg: '#d9f2ee', mouth: 'grin' },
    },
    {
      id: 'oracle', name: 'Warren Oakes', title: 'Chief Strategy Officer', role: 'sales', r: 5, traits: ['rain', 'lucky'],
      ability: { id: 'oracle', name: 'Market whisperer', desc: 'Company revenue +10%. After the IPO, the share price trades 20% higher and missed guidance hurts half as much.' },
      bio: 'Analysts call him before they call anyone else.', catch: 'Buy the rumour.',
      hello: "Warren Oakes. Strategy. I've seen nine market crashes and called seven of them. Let's build something investors fight over.",
      banter: ['Lunch with an analyst. Their price target went up during dessert.', 'Read the annual report on the bus. Twice. For fun.'],
      story: ['Bought his first share at twelve with lawn-mowing money. Still owns it.', 'Drives a fifteen-year-old car. Says it reminds him what money is for.', 'Writes the team a letter every year. Nobody asked. Everybody keeps them.'],
      bye: "I'd sell before the announcement, if I were you. Just a hunch.",
      look: { skin: 0, hair: 'bald', hc: '#bdb7ad', glasses: 'round', facial: 'mustache', fc: '#d6d1c9', top: '#1e3a5f', topStyle: 'blazer', bg: '#e1e8f0', mouth: 'smile' },
    },
  ];

  // Supporting cast who message you but never join the team.
  const CAST = {
    dana: { name: 'Dana Okafor', title: 'VP Delivery · your manager', look: { skin: 4, hair: 'short', hc: '#1a1411', glasses: 'square', top: '#5b3a8c', topStyle: 'blazer', bg: '#ece3fb', mouth: 'smile' } },
    ceo: { name: 'Alex Rivera', title: 'CEO', look: { skin: 2, hair: 'wavy', hc: '#4a3426', top: '#f4f4f4', topStyle: 'collar', bg: '#dceef7', mouth: 'grin' } },
    bot: { name: 'PeopleBot', title: 'HR assistant', look: { bot: true, top: '#0f766e', bg: '#d7f0ee' } },
    cfo: { name: 'Morgan Hale', title: 'CFO', look: { skin: 1, hair: 'side', hc: '#5a4632', glasses: 'square', top: '#334155', topStyle: 'blazer', bg: '#e2e8f0', mouth: 'flat' } },
  };

  // Other managers in your weekly league. style picks their banter.
  const RIVALS = [
    { id: 'derek', name: 'Derek Shaw', dept: 'Sales Ops', style: 'trash', look: { skin: 0, hair: 'slick', hc: '#2b211b', top: '#283a5c', topStyle: 'blazer', bg: '#e6ecf5', mouth: 'smirk' } },
    { id: 'linda', name: 'Linda Park', dept: 'Finance', style: 'steady', look: { skin: 1, hair: 'bob', hc: '#3a2a20', glasses: 'square', top: '#6b7280', topStyle: 'blazer', bg: '#efeee9', mouth: 'flat' } },
    { id: 'raj', name: 'Raj Menon', dept: 'Platform', style: 'zen', look: { skin: 3, hair: 'short', hc: '#16110e', facial: 'beard', fc: '#16110e', top: '#3b5b5b', topStyle: 'tee', bg: '#e1f0ef', mouth: 'smile' } },
    { id: 'brittany', name: 'Brittany Cole', dept: 'Growth', style: 'hype', look: { skin: 0, hair: 'pony', hc: '#e2b862', top: '#e86a92', topStyle: 'tee', bg: '#fde4ec', mouth: 'grin' } },
    { id: 'gary', name: 'Gary Fisk', dept: 'Legacy Systems', style: 'steady', look: { skin: 0, hair: 'bald', hc: '#9a948c', facial: 'mustache', fc: '#8b847a', top: '#8a7f6a', topStyle: 'sweater', bg: '#efe9de', mouth: 'flat' } },
    { id: 'mei', name: 'Mei Tanaka', dept: 'Data', style: 'zen', look: { skin: 1, hair: 'long', hc: '#1a1414', glasses: 'round', top: '#4a5899', topStyle: 'collar', bg: '#e4e8f8', mouth: 'smile' } },
    { id: 'tom', name: 'Tom Briggs', dept: 'IT', style: 'chaos', look: { skin: 0, hair: 'messy', hc: '#b5541c', top: '#556b2f', topStyle: 'hoodie', bg: '#ebf0dc', mouth: 'grin' } },
    { id: 'sofia', name: 'Sofia Marquez', dept: 'Marketing', style: 'hype', look: { skin: 2, hair: 'wavy', hc: '#2f1d12', acc: 'earrings', top: '#d9534f', topStyle: 'blazer', bg: '#fbe1e0', mouth: 'grin' } },
    { id: 'kevin', name: 'Kevin Doyle', dept: 'Procurement', style: 'chaos', look: { skin: 0, hair: 'short', hc: '#6b5a48', top: '#9aa5b1', topStyle: 'collar', bg: '#eceff2', mouth: 'flat' } },
    { id: 'aisha', name: 'Aisha Bello', dept: 'Strategy', style: 'trash', look: { skin: 4, hair: 'afro', hc: '#16110e', acc: 'earrings', top: '#7c3a5b', topStyle: 'blazer', bg: '#f5e1ea', mouth: 'smirk' } },
    { id: 'bjorn', name: 'Bjorn Lund', dept: 'Facilities', style: 'zen', look: { skin: 0, hair: 'wavy', hc: '#d9c08a', facial: 'beard', fc: '#c9ad75', top: '#3f6b4f', topStyle: 'sweater', bg: '#e3efe5', mouth: 'smile' } },
    { id: 'chloe', name: 'Chloe Martin', dept: 'Customer Success', style: 'hype', look: { skin: 1, hair: 'bun', hc: '#8a5a3b', top: '#2f8fbf', topStyle: 'tee', bg: '#dff0f8', mouth: 'grin' } },
  ];

  const RIVAL_LINES = {
    trash: { pass: ["Saw you climbed past me. Enjoy the view. It won't last. 😏", 'Cute week. Mine starts now.'], passed: ["Didn't see you there. Probably because you're behind me now.", 'Oh, were we racing? I thought this was a warm-up.'], win: ['Good week. For me, mostly.'], lose: ['Fine. You won the week. I let you. Hydrate.'] },
    steady: { pass: ['Nice work this week. I see what you did with those deliveries.', 'Respect. My spreadsheet updated twice.'], passed: ['Slow and steady. Passing you on the left.', 'Back ahead. Nothing personal. Just compound interest.'], win: ['Consistent week. As planned.'], lose: ['Congratulations. I will be adjusting my forecast.'] },
    zen: { pass: ['You move like water this week. 🌊', 'Beautiful week. The standings are just numbers. But nice numbers.'], passed: ['I was not trying to pass you. It simply happened.', 'Back in front. Breathe in. Breathe out.'], win: ['The week ends. I am content.'], lose: ['Well played. I will meditate on it.'] },
    hype: { pass: ['OMG you passed me!! Love that for you!!! 🎉', "Okay you're on FIRE this week 🔥🔥"], passed: ['Back on top, baby!! 🚀', 'Sorry not sorry!! Love you though!! 💖'], win: ['WHAT A WEEK!!! Next week is mine too!!'], lose: ['You crushed it!! Rematch Monday?!'] },
    chaos: { pass: ['Wait, how are you ahead of me? Did I accidentally sell something to you?', "You passed me. Also the printer is on fire. Unrelated."], passed: ['Passed you! No idea how! Nobody tell my manager!', 'Ha! Ahead again. I think. The spreadsheet crashed.'], win: ['Won the week?! I was mostly on hold with a vendor.'], lose: ['You won! I lost my badge, my lunch and this league. Big week.'] },
  };

  const LEAGUES = ['Cubicle', 'Shared desk', 'Window seat', 'Corner office', 'Boardroom', 'Penthouse'];
  const LEAGUE_REWARDS = [5, 3, 2, 1, 1, 0]; // referrals by finishing position

  const CLIENTS = ['Contoso', 'Fabrikam', 'Northwind', 'Tailspin', 'Woodgrove', 'Litware', 'Adatum', 'Proseware', 'Wide World',
    'Coho', 'Alpine Ski House', 'Lucerne', 'Relecloud', 'VanArsdel', 'Trey Research', "Margie's Travel", 'Humongous', 'Blue Yonder',
    'Fourth Coffee', 'Graphic Design Inst.', 'Southridge Video', 'Wingtip Toys', 'Bellows College', 'City Power & Light'];

  const PROJECTS = [
    { name: 'API integration', needs: ['eng'] }, { name: 'Data migration', needs: ['eng', 'sre'] },
    { name: 'Mobile app', needs: ['eng', 'design'] }, { name: 'Checkout rebuild', needs: ['eng', 'pm'] },
    { name: 'Cloud migration', needs: ['sre', 'eng'] }, { name: 'Brand refresh', needs: ['design'] },
    { name: 'Website redesign', needs: ['design', 'eng'] }, { name: 'Design system', needs: ['design', 'pm'] },
    { name: 'Onboarding revamp', needs: ['design', 'pm'] }, { name: 'Partner launch', needs: ['sales', 'pm'] },
    { name: 'Pricing strategy', needs: ['sales'] }, { name: 'Market expansion', needs: ['sales', 'design'] },
    { name: 'Sales playbook', needs: ['sales'] }, { name: 'Product discovery', needs: ['pm'] },
    { name: 'Roadmap reset', needs: ['pm', 'sales'] }, { name: 'MVP build', needs: ['pm', 'eng'] },
    { name: 'Security audit', needs: ['sre'] }, { name: 'Uptime rescue', needs: ['sre', 'eng'] },
    { name: 'Cost optimisation', needs: ['sre', 'pm'] }, { name: 'Analytics dashboard', needs: ['eng', 'design'] },
    { name: 'Customer portal', needs: ['eng', 'sales'] }, { name: 'Launch campaign', needs: ['design', 'sales'] },
    { name: 'Bug bash', needs: ['eng'] }, { name: 'User research', needs: ['design'] },
  ];

  // ------------------------------------------------------------------ office
  // cost: [base, growth per level]; time: [seconds, growth per level]; zone must be unlocked by funding.
  const OFFICE = [
    { id: 'coffee', name: 'Coffee bar', zone: 'kitchen', max: 5, cost: [40, 3], time: [60, 2.2], fx: l => `+${3 * l} team mood · holds ${3 + Math.floor(l / 2)} espresso shots`, levels: ['Kettle', 'Drip machine', 'Espresso machine', 'Barista bar', 'Single-origin roaster'] },
    { id: 'plants', name: 'Plants', zone: 'open', max: 5, cost: [30, 2.4], time: [45, 2], fx: l => `+${l} team mood` },
    { id: 'desks', name: 'Better desks', zone: 'open', max: 4, cost: [400, 4], time: [180, 2.4], fx: l => `+${2 * l} team mood, room for ${4 + 2 * l} desks` },
    { id: 'rooms', name: 'Meeting rooms', zone: 'meeting', max: 4, cost: [450, 18], time: [180, 3], career: [3, 6, 10, 15], fx: l => `${1 + l} projects at once` },
    { id: 'phones', name: 'Phone booths', zone: 'lounge', max: 25, cost: [4000, 2.6], time: [600, 1.7], fx: l => `+${12 * l}% revenue` },
    { id: 'lounge', name: 'Lounge', zone: 'lounge', max: 3, cost: [6000, 5], time: [900, 2.2], fx: l => `+${2 * l} mood, ${50 * l}% faster recovery` },
    { id: 'recruit', name: 'Recruiting suite', zone: 'lounge', max: 5, cost: [9000, 3.2], time: [1200, 1.8], fx: l => `Senior+ hire odds ×${(1 + 0.15 * l).toFixed(2)}` },
    { id: 'pmo', name: 'Project office', zone: 'meeting', max: 1, cost: [1500, 1], time: [300, 1], career: [4], fx: () => 'Autopilot: the team keeps working while you are away' },
    { id: 'library', name: 'Training library', zone: 'library', max: 25, cost: [150000, 2.4], time: [1800, 1.6], fx: l => `+${15 * l}% XP` },
    { id: 'servers', name: 'Server room', zone: 'servers', max: 25, cost: [250000, 2.5], time: [2400, 1.6], fx: l => `+${8 * l}% team skill` },
    { id: 'games', name: 'Game room', zone: 'games', max: 3, cost: [8e6, 5], time: [3600, 2], fx: l => `+${2 * l} mood, +${25 * l}% bond` },
    { id: 'lobby', name: 'Client lobby', zone: 'lobby', max: 5, cost: [1.2e7, 3.4], time: [5400, 1.6], fx: l => `+${10 * l}% VIP offers` },
  ];

  const ZONES = {
    open: { name: 'Open-plan desks', funding: 0 },
    kitchen: { name: 'Kitchen', funding: 0 },
    meeting: { name: 'Meeting rooms', funding: 1 },
    lounge: { name: 'Lounge', funding: 2 },
    library: { name: 'Library', funding: 3 },
    servers: { name: 'Server room', funding: 3 },
    games: { name: 'Game room', funding: 4 },
    lobby: { name: 'Client lobby', funding: 4 },
  };

  // Lifetime revenue milestones. Each one: a cash injection, a permanent revenue boost and more office space.
  const FUNDING = [
    { name: 'Bootstrapped', at: 0 },
    { name: 'Seed round', at: 2e3, line: "We just closed our seed round! Meeting rooms are yours. Go win bigger clients." },
    { name: 'Series A', at: 1e5, line: 'Series A is done! We leased the rest of the floor: lounge, phone booths and a proper project office.' },
    { name: 'Series B', at: 1e7, line: "Series B! We're taking the floor upstairs: a training library and a real server room." },
    { name: 'Series C', at: 4e8, line: "Series C closed. Game room and a client lobby. Investors love a lobby." },
    { name: 'IPO', at: 8e9, line: "We rang the bell! Atlas is a public company: ticker ATLS. From today every day is a quarter, and Wall Street is watching. Thank you. Seriously." },
  ];

  // After the IPO the company is valued by the market. Milestones come at 1, 2.5 and 5 × every power of ten, forever;
  // these powers of ten get a name.
  const CAP_NAMES = { 9: 'Unicorn', 10: 'Decacorn', 11: 'Fortune 500', 12: 'Trillion-dollar club', 13: 'Bigger than most countries', 14: 'Planet-scale', 15: 'Interplanetary', 16: 'Galactic' };

  // Companies you can buy once you're public. Names are generated in order, so the list is the same for everyone.
  const ACQ = {
    first: ['Pixel', 'Byte', 'Quant', 'Cloud', 'Data', 'Hyper', 'Nimbus', 'Vertex', 'Lumen', 'Echo', 'Apex', 'Orbit', 'Cinder', 'Harbor', 'Kite', 'Summit'],
    last: ['forge', 'wave', 'ly', 'stack', 'loop', 'labs', 'works', 'hub', 'base', 'mint', 'grid', 'scale', 'nest'],
    sector: ['design tools', 'payments', 'cloud hosting', 'analytics', 'security', 'HR software', 'logistics', 'developer tools', 'marketing', 'AI research', 'health tech', 'travel'],
    city: ['Berlin', 'Austin', 'Singapore', 'Lisbon', 'Toronto', 'Lagos', 'Seoul', 'Stockholm', 'Bangalore', 'São Paulo', 'Sydney', 'Dublin', 'Tokyo', 'Nairobi', 'Mexico City', 'Tel Aviv'],
  };

  const CAREER_TITLES = [[1, 'Team Lead'], [3, 'Engineering Manager'], [6, 'Senior Manager'], [10, 'Director'], [15, 'Senior Director'], [20, 'VP'], [26, 'SVP'], [33, 'COO'], [40, 'CEO of Something'], [50, 'Chair of the Board'], [65, 'Industry Titan'], [80, 'Living Legend'], [100, 'Mythical Executive']];

  // Things that switch on as your career grows. Dana explains each one.
  const UNLOCKS = [
    { career: 1, id: 'hustle', title: 'Hustle', text: "Pro tip: when you're watching the team work, tap Hustle (or hold it) and everyone works faster. Up to 3× while you keep at it." },
    { career: 2, id: 'hiring', title: 'Hiring', text: "HR approved headcount! I've sent you 3 referrals. Each one opens a blind CV: you only find out who you hired when you open it." },
    { career: 2, id: 'rush', title: 'Espresso shots', text: "Tip: if you're waiting on a project, rush it with an espresso shot. You get a new shot every 20 minutes." },
    { career: 3, id: 'size:M', title: 'Sprints', text: 'Two-person Sprints are open: three minutes, much better pay. Pair people whose skills match what the client needs.' },
    { career: 3, id: 'commit', title: 'Daily commitment', text: "Each morning I'll ask what you're committing to. Pick a target, hit it, get rewarded. Miss it and… well, you get nothing. No pressure. 🙂" },
    { career: 4, id: 'breaks', title: 'Breaks', text: 'Wellbeing matters! The Breaks page has three quick games: a daily word, Inbox Zero and Stack. Each one pays out a boost.' },
    { career: 5, id: 'league', title: 'Manager league', text: "Fun fact: you're ranked every week against other managers by client stars. Top two move up a league. I'm told Derek takes it very seriously." },
    { career: 6, id: 'gear', title: 'IT equipment', text: 'IT has a budget now! Great deliveries sometimes come with new equipment for your team. It equips itself.' },
    { career: 7, id: 'size:L', title: 'Projects', text: 'Ten-minute Projects are open. Bigger clients, bigger cheques.' },
    { career: 11, id: 'size:XL', title: 'Programmes', text: 'Half-hour Programmes unlocked. Start one before a meeting, sign it off after.' },
    { career: 15, id: 'size:MEGA', title: 'Enterprise deals', text: 'Enterprise deals: an hour, four people, ridiculous money. Start one before lunch.' },
  ];

  // ------------------------------------------------------------------ messages
  // Decisions people bring you. fx values are relative: cash ×(a typical Sprint payout), boost = share of a running project,
  // xp = Quick-win XP units. risk: resolves after `delay` minutes with probability p of `win`.
  const DECISIONS = [
    {
      id: 'friday', role: 'eng', text: "It's Friday, 4:55pm. Can I deploy the hotfix to prod? I'm *pretty* sure it's fine.",
      choices: [
        { label: 'Ship it 🚀', reply: 'On it. Fingers crossed. Toes too.', risk: { p: 0.65, delay: 6, win: { fx: { cash: 0.8, bond: 8, mood: 6 }, text: 'Deploy went clean. Client noticed the fix within minutes. Told you. 😎' }, lose: { fx: { teamMood: -5 }, text: "Rolled back at 6:12pm. We don't talk about this." } } },
        { label: 'Wait until Monday', reply: 'Fine. Monday. 😒', fx: { bond: -3, mood: -2 } },
      ],
    },
    {
      id: 'logo', role: 'design', text: 'The client wants the logo bigger. Again. This is the third time this week.',
      choices: [
        { label: 'Make it bigger', reply: 'Making it bigger. My soul is getting smaller.', fx: { boost: 0.15, mood: -4 } },
        { label: 'Push back with data', reply: 'Preparing a deck about logo sizes. Wish me luck.', risk: { p: 0.6, delay: 8, win: { fx: { bond: 8, mood: 8, cash: 0.4 }, text: 'They agreed! Logo stays tasteful. I printed the email.' }, lose: { fx: { mood: -6 }, text: 'They escalated to their CEO. The logo is now 400px. I need a walk.' } } },
      ],
    },
    {
      id: 'discount', role: 'sales', text: 'A lead wants 20% off to sign today. Thoughts?',
      choices: [
        { label: 'Approve the discount', reply: 'Done! Signed! Slightly cheaper!', fx: { cash: 0.8 } },
        { label: 'Hold the price', reply: 'Holding firm. Sweating slightly.', risk: { p: 0.5, delay: 12, win: { fx: { cash: 2.2, bond: 6 }, text: 'They signed at full price!! 🎉' }, lose: { fx: { mood: -3 }, text: 'They went with a competitor. Their loss. Literally.' } } },
      ],
    },
    {
      id: 'sync', role: 'pm', text: 'Can we cancel the Thursday sync? Nobody ever has updates.',
      choices: [
        { label: 'Cancel it', reply: 'Cancelled. Can you hear that? That is the sound of freedom.', fx: { teamMood: 4, meetingFan: 8 } },
        { label: 'Keep it, alignment matters', reply: "Okay. I'll bring snacks so it hurts less.", fx: { boost: 0.1, meetingFan: -6 } },
      ],
    },
    {
      id: 'whale', role: 'sre', text: 'The server room is making a noise. Like a whale. A sad whale.',
      choices: [
        { label: 'Buy a new fan', reply: 'Ordered. The whale will be silenced.', fx: { cash: -0.4, teamMood: 3, bond: 3 } },
        { label: 'Turn it off and on again', reply: 'Classic. Rebooting.', risk: { p: 0.7, delay: 5, win: { fx: { bond: 4 }, text: "Whale's gone. Nobody knows why. Best kind of fix." }, lose: { fx: { boost: -0.1, mood: -3 }, text: 'Now there are two whales. Harmonising.' } } },
      ],
    },
    {
      id: 'wfh', text: "Can I work from home tomorrow? The plumber's coming between 8am and the heat death of the universe.",
      choices: [
        { label: 'Of course', reply: 'Thank you!! I will be extremely productive. And near the kettle.', fx: { bond: 6, mood: 6 } },
        { label: 'Need you in the office', reply: 'Sure. My kitchen will flood but sure.', fx: { bond: -4, mood: -5, boost: 0.05 } },
      ],
    },
    {
      id: 'coffee', trait: 'coffee', text: 'The coffee machine is broken. I am declaring this a P0 incident.',
      choices: [
        { label: 'Expense a new one', reply: 'You are a hero. I would take a bullet for you. Or at least a meeting.', fx: { cash: -0.3, teamMood: 5, bond: 6 } },
        { label: 'Tea exists', reply: 'Tea. TEA. Okay. I am fine.', fx: { mood: -6 } },
      ],
    },
    {
      id: 'refactor', role: 'eng', text: 'I want to refactor the whole codebase. Two weeks. Maybe three. Definitely not six.',
      choices: [
        { label: 'Go for it', reply: 'Starting now. Ignore the screaming.', fx: { boost: -0.15, xp: 4, bond: 6 } },
        { label: 'Small refactors as we go', reply: 'Boy-scout rule. Leave it cleaner. Fine.', fx: { xp: 1.5 } },
      ],
    },
    {
      id: 'lunch', trait: 'social', text: 'Team lunch on the company card? Morale is a deliverable.',
      choices: [
        { label: 'My treat', reply: 'Booking the table! You are invited, obviously.', fx: { cash: -0.5, teamMood: 7, bond: 4 } },
        { label: 'Bring-your-own-lunch day!', reply: "Love the energy. I'll bring sandwiches for everyone. Again.", fx: { teamMood: 1 } },
      ],
    },
    {
      id: 'rfp', role: 'sales', text: 'I can get us into a big enterprise RFP, but I need to fly out to pitch. Approve the travel?',
      choices: [
        { label: 'Approve travel', reply: 'Packing! Window seat! Big pitch energy!', risk: { p: 0.55, delay: 15, win: { fx: { offer: 'vip', bond: 6, refs: 1 }, text: "We're shortlisted AND they referred a friend. A VIP offer is waiting in Projects!" }, lose: { fx: { mood: -4 }, text: 'They went with the incumbent. Their snacks were better.' } }, fx: { cash: -0.6 } },
        { label: 'Pitch over video', reply: 'Fine. I will wear the jacket anyway.', risk: { p: 0.25, delay: 15, win: { fx: { offer: 'vip' }, text: "Video pitch worked! They want to talk. VIP offer in Projects." }, lose: { fx: {}, text: "No luck. My background was 'too beige', apparently." } } },
      ],
    },
    {
      id: 'scope', role: 'pm', text: "The client is asking for 'one small change'. It is not small. It is a second product.",
      choices: [
        { label: 'Say yes', reply: "Yes it is. I'll tell the team. Gently.", fx: { cash: 0.6, teamMood: -4 } },
        { label: 'Send a change request', reply: 'Drafting a change request with very polite numbers.', risk: { p: 0.6, delay: 10, win: { fx: { cash: 1.6, bond: 5 }, text: 'They approved the change request! Paid properly. Adulthood.' }, lose: { fx: {}, text: 'They dropped the change. Fine by me, honestly.' } } },
      ],
    },
    {
      id: 'dark', role: 'design', text: 'Dark mode. Can we? Please? Everyone wants dark mode.',
      choices: [
        { label: 'Ship dark mode', reply: 'Finally. My eyes thank you. Everyone\'s eyes thank you.', fx: { mood: 8, bond: 5, xp: 1.5 } },
        { label: 'After launch', reply: '"After launch." Classic. I\'ll wait. In the dark.', fx: { bond: -3 } },
      ],
    },
    {
      id: 'oldbug', role: 'eng', text: "Found a bug that's been in production since 2019. Fix it, or pretend I never saw it?",
      choices: [
        { label: 'Fix it', reply: 'Fixing. Writing a postmortem for a bug older than my car.', fx: { xp: 2, bond: 3 } },
        { label: "It's a feature now", reply: 'Updating the docs: "intended behaviour". 😇', risk: { p: 0.75, delay: 10, win: { fx: { mood: 4 }, text: 'Nobody noticed. Nobody will ever notice.' }, lose: { fx: { cash: -0.3 }, text: 'A customer noticed. Their name is Brenda. Brenda is upset.' } } },
      ],
    },
    {
      id: 'hours', trait: 'night', text: 'Mind if I start at 11? I do my best work after dark. Like a bat, but with commits.',
      choices: [
        { label: 'Flexible hours it is', reply: 'Thank you. See you at the crack of noon. 🦇', fx: { bond: 7, mood: 6 } },
        { label: 'Core hours are core hours', reply: 'Understood. I will be awake-ish.', fx: { bond: -4, mood: -4 } },
      ],
    },
    {
      id: 'mentor', trait: 'mentor', text: 'Can I spend an afternoon mentoring the newer folks? Pairing, reviews, the works.',
      choices: [
        { label: 'Absolutely', reply: "Booked! I'll make them write the tests. Lovingly.", fx: { teamXp: 2, bond: 6 } },
        { label: 'Busy week, maybe later', reply: 'Sure. The juniors will keep googling. It builds character.', fx: { bond: -3 } },
      ],
    },
    {
      id: 'audit', role: 'sre', text: "We got a surprise security audit. It's due tomorrow.",
      choices: [
        { label: 'All hands on deck', reply: 'Ordering coffee. Lots of coffee.', fx: { cash: 1, teamMood: -5 } },
        { label: 'Ask for an extension', reply: 'Asking nicely. With a bow.', risk: { p: 0.65, delay: 8, win: { fx: { bond: 4, mood: 4 }, text: 'Got a week! Breathing again.' }, lose: { fx: { teamMood: -6 }, text: "No extension. It's going to be a long night." } } },
      ],
    },
    {
      id: 'birthday', text: "It's my birthday today! 🎂 No big deal. (It's a big deal.)",
      choices: [
        { label: 'Cake for everyone', reply: 'CAKE!!! You remembered!! (You didn\'t, but you do now!)', fx: { cash: -0.2, teamMood: 5, bond: 10 } },
        { label: 'Happy birthday!', reply: 'Thank you! 🥳', fx: { bond: 3 } },
      ],
    },
    {
      id: 'demo', role: 'sales', text: 'Client wants a demo in 10 minutes. The demo environment is… on fire.',
      choices: [
        { label: 'Wing it', reply: "Winging it. I've done worse. Not much worse.", risk: { p: 0.55, delay: 6, win: { fx: { cash: 1.4, bond: 6 }, text: 'Nailed it. They think the fire was a feature. Signing next week!' }, lose: { fx: { mood: -6 }, text: 'The fire was visible. On screen. They were very kind about it.' } } },
        { label: 'Reschedule', reply: "Rescheduled for Thursday. I'll bring a fire extinguisher.", fx: { mood: 1 } },
      ],
    },
    {
      id: 'ai', role: 'pm', text: 'The board keeps asking about AI. Should we put AI on the roadmap?',
      choices: [
        { label: 'Sprinkle some AI', reply: 'Adding "AI-powered" to three slides. Investors are already calling.', fx: { refs: 1, cash: 0.3 } },
        { label: 'Only if it solves a real problem', reply: 'Agreed. I will find a real problem. Then add AI.', fx: { bond: 5, xp: 1 } },
      ],
    },
    {
      id: 'laptop', role: 'eng', text: 'Can I upgrade my laptop? It sounds like a jet engine and it is almost as warm.',
      choices: [
        { label: 'Approve it', reply: 'Ordered! I will name it after you.', fx: { cash: -0.5, gear: 'laptop', bond: 5 } },
        { label: 'Next quarter', reply: "Okay. I'll keep using it as a hand warmer.", fx: { mood: -3 } },
      ],
    },
    {
      id: 'font', role: 'design', text: 'I designed a typeface. Can we use my typeface? It is called "Excellent".',
      choices: [
        { label: 'Use it everywhere', reply: 'EVERYWHERE?! Rolling it out. This is the best day.', risk: { p: 0.6, delay: 10, win: { fx: { bond: 10, mood: 8, cash: 0.5 }, text: 'Client LOVES the new font. Asked if they can license it. 💅' }, lose: { fx: { mood: -4, bond: 4 }, text: 'Client asked us to "go back to normal font". Heartbroken. Still glad you said yes.' } } },
        { label: 'Stick to the brand font', reply: 'Understood. "Excellent" will wait for its moment.', fx: { bond: -2 } },
      ],
    },
    {
      id: 'plant', text: 'The office plant died. Do we… replace it? Asking for the plant.',
      choices: [
        { label: 'Get a better plant', reply: 'Got a monstera. Named it Kevin. Kevin is thriving.', fx: { cash: -0.15, teamMood: 3 } },
        { label: 'Plastic plant', reply: 'A plastic plant. Low maintenance. Low joy.', fx: { teamMood: -1 } },
      ],
    },
    {
      id: 'dog', text: 'Can I bring my dog to work on Friday? She is very professional.',
      choices: [
        { label: 'Yes!', reply: 'She is SO excited. (I told her. She understood.)', risk: { p: 0.8, delay: 8, win: { fx: { teamMood: 7, bond: 6 }, text: 'Best Friday ever. Productivity: unclear. Happiness: maximum. 🐕' }, lose: { fx: { cash: -0.2, teamMood: 3 }, text: 'She ate a charging cable. She is fine. The cable is not.' } } },
        { label: 'Allergies, sorry', reply: "Totally fair. I'll send photos instead.", fx: { bond: 1 } },
      ],
    },
    {
      id: 'booth', role: 'sales', text: 'A big conference has a booth spot left. Pricey, but every client we want will be there.',
      choices: [
        { label: 'Book the booth', reply: 'Booked! Ordering 4,000 branded stress balls.', risk: { p: 0.6, delay: 15, win: { fx: { refs: 3, bond: 5 }, text: 'We met SO many people. Three of them want to work here!' }, lose: { fx: { refs: 1 }, text: 'Quiet show. We met one great person and gave away 4,000 stress balls.' } }, fx: { cash: -0.8 } },
        { label: 'Skip it this year', reply: "Sure. I'll be at the afterparty though. Networking.", fx: {} },
      ],
    },
    {
      id: 'ci', role: 'eng', text: 'The build pipeline takes 45 minutes. Give me a day and I can make it five.',
      choices: [
        { label: 'Take the day', reply: 'Watching the progress bar so you never have to again.', fx: { boost: 0.2, bond: 4 } },
        { label: 'Not now', reply: 'Okay. 45 minutes it is. Time to learn the guitar.', fx: { mood: -2 } },
      ],
    },
    {
      id: 'twoClients', role: 'pm', text: 'Two clients want our best people at the same time. Who gets priority?',
      choices: [
        { label: 'The one that pays more', reply: 'Prioritised the money. Very grown-up.', fx: { cash: 0.6 } },
        { label: 'The one we promised first', reply: 'Promise kept. The other client will hear from me personally.', fx: { boost: 0.12, bond: 4 } },
      ],
    },
    {
      id: 'hackathon', text: 'Hackathon this weekend? Totally voluntary. There will be pizza.',
      choices: [
        { label: 'Sponsor it', reply: "Pizza ordered! Someone's already building a robot.", risk: { p: 0.5, delay: 12, win: { fx: { refs: 2, teamXp: 1.5 }, text: 'The robot won a prize and two hackers want to join us!' }, lose: { fx: { teamXp: 1.5 }, text: 'No prizes, but everyone learned something. And ate a lot of pizza.' } }, fx: { cash: -0.3 } },
        { label: 'Enjoy your weekend', reply: 'Weekend it is. Touching grass.', fx: { teamMood: 3 } },
      ],
    },
    {
      id: 'feedback', role: 'design', text: 'The client sent feedback as a 47-page PDF of screenshots with red arrows.',
      choices: [
        { label: 'Go through it all', reply: 'Reading page 1 of 47. Arrow 1 of 312.', fx: { boost: 0.12, mood: -3, xp: 1.5 } },
        { label: 'Book a call instead', reply: 'Call booked. Much faster. Bringing my own arrows.', fx: { mood: 3 } },
      ],
    },
    {
      id: 'prices', role: 'sales', text: 'Honestly? I think we could raise our prices.',
      choices: [
        { label: 'Raise prices', reply: 'Updating the price list. Bold.', risk: { p: 0.6, delay: 15, win: { fx: { cash: 2, bond: 5 }, text: 'Nobody blinked. We left money on the table for years! 💰' }, lose: { fx: { cash: -0.3 }, text: 'Two clients pushed back. We gave them a loyalty discount. Lesson learned.' } } },
        { label: 'Keep them steady', reply: 'Steady it is. Clients love a predictable invoice.', fx: { teamMood: 1 } },
      ],
    },
    {
      id: 'standing', trait: 'work', text: "I've been at my desk for 11 hours. Is that a lot? It feels normal.",
      choices: [
        { label: 'Go home. Now.', reply: '…okay. You are right. Going. (Checking Slack on the bus.)', fx: { mood: 10, fatigue: -3, bond: 4 } },
        { label: 'Legend. Keep going', reply: 'On it. Sleep is a deprecated feature.', fx: { boost: 0.1, mood: -8 } },
      ],
    },
    {
      id: 'conference', trait: 'perfect', text: 'My conference talk got accepted! Can I take Thursday off to give it?',
      choices: [
        { label: 'Of course! Proud of you', reply: 'THANK YOU. Rehearsing to my cat again.', fx: { bond: 8, refs: 1, mood: 6 } },
        { label: 'Can you do it remotely?', reply: 'I… can ask. It is a stage talk. But I can ask.', fx: { bond: -5, mood: -5 } },
      ],
    },
    {
      id: 'meeting', trait: 'meeting', text: 'Someone booked a 2-hour "quick alignment" on my calendar. Can I decline?',
      choices: [
        { label: 'Decline it', reply: 'Declined. Replied with a one-paragraph summary instead. You are welcome, everyone.', fx: { mood: 8, bond: 5 } },
        { label: 'Go, be a team player', reply: 'Going. Bringing a book.', fx: { mood: -6, boost: 0.05 } },
      ],
    },
    {
      id: 'lucky', trait: 'lucky', text: 'Found a scratch card in the lift. Should I… scratch it? On company time?',
      choices: [
        { label: 'Scratch it!', reply: 'Scratching!', risk: { p: 0.35, delay: 1, win: { fx: { cash: 1.5, teamMood: 4 }, text: "WE WON! I'm putting it in the team fund. Pizza Friday forever." }, lose: { fx: {}, text: 'Nothing. But it was fun. Lucky streak continues next time.' } } },
        { label: 'Hand it in at reception', reply: 'Handed in. Reception said I have "strong moral fibre".', fx: { bond: 3 } },
      ],
    },
  ];

  // Decisions that only come up once you're a public company. `from` sets a fixed sender; fx.stock moves the share price.
  const IPO_DECISIONS = [
    {
      id: 'activist', from: 'cfo', text: 'An activist investor bought 5% of ATLS. They want "efficiencies". That usually means layoffs.',
      choices: [
        { label: 'Protect the team', reply: "Told them no. Politely. They're writing a strongly worded letter.", fx: { teamMood: 6, stock: -0.04 } },
        { label: 'Promise "discipline"', reply: 'They loved the word "discipline". The team did not.', fx: { stock: 0.06, teamMood: -6 } },
      ],
    },
    {
      id: 'buyback', from: 'cfo', text: "We're sitting on a lot of cash. Buy back some shares, or invest it in the team?",
      choices: [
        { label: 'Buy back shares', reply: 'Done. Fewer shares, happier shareholders.', fx: { cash: -4, stock: 0.07 } },
        { label: 'Invest in the team', reply: 'New chairs for everyone. And a frozen yoghurt machine.', fx: { cash: -2, teamMood: 8 } },
      ],
    },
    {
      id: 'profile', role: 'sales', text: 'A business magazine wants to profile someone from the team. Can I do it?',
      choices: [
        { label: 'Go for it', reply: 'Booking a haircut. And a better haircut.', risk: { p: 0.6, delay: 20, win: { fx: { stock: 0.06, bond: 6 }, text: 'The profile is out: "The most fun company in tech." ATLS is up!' }, lose: { fx: { stock: -0.03 }, text: 'I may have said "we basically print money". Legal would like a word.' } } },
        { label: 'Comms team only', reply: 'Fair. I will practise my quotes in the mirror anyway.', fx: { bond: -2 } },
      ],
    },
    {
      id: 'rsu', text: 'My shares vested! Is it rude to buy a boat?',
      choices: [
        { label: 'Buy the boat ⛵', reply: 'Naming it "Quarterly Results". Thank you!', fx: { mood: 8, bond: 4 } },
        { label: 'Hold your shares', reply: 'Diamond hands. 💎 Long-term thinking.', fx: { mood: 2, stock: 0.01 } },
      ],
    },
    {
      id: 'targets', from: 'cfo', text: 'Analysts keep asking about next year. Do we raise our long-term targets?',
      choices: [
        { label: 'Raise them', reply: 'Raised. The Street loves ambition.', risk: { p: 0.6, delay: 30, win: { fx: { stock: 0.08 }, text: 'Analysts upgraded us to "Strong buy". 📈' }, lose: { fx: { stock: -0.05 }, text: 'One analyst called our targets "a fun piece of fiction". Ouch.' } } },
        { label: 'Under-promise', reply: 'Sensible. Under-promise, over-deliver.', fx: { stock: 0.01 } },
      ],
    },
  ];
  const IPO_BANTER = [
    'Refreshed the ATLS price 40 times today. Productivity: low. Net worth: up.',
    'Is it normal to check the stock price before checking email?',
    "My mum asked if I'm a millionaire now. I said \"on paper\". She asked what paper.",
    'Bought one share of ATLS for my nephew. He wants to know when he gets a desk.',
  ];

  // Little messages with no decision attached; reacting builds bond.
  const BANTER = {
    eng: ['Merged a PR that deletes more code than it adds. Best feeling.', 'The tests pass. I trust nothing.', 'Rubber duck debugging update: the duck is now a senior engineer.'],
    design: ['Made a button 2px rounder. Everything is better now.', 'Client asked for "something like Apple but different". On it.', 'Organised my layers. I feel reborn.'],
    sales: ['Pipeline update: very pipe, much line.', 'Just had a call that could have been an email. It was an email. I called anyway.', 'Client said "let\'s touch base". I touched it.'],
    pm: ['Wrote a spec. It has a table of contents. I am at peace.', 'Moved 14 tickets to "Done". Two of them were done.', 'Stakeholders aligned. Screenshot taken for evidence.'],
    sre: ['Nothing broke today. Suspicious.', 'Rotated the certificates. They are dizzy but fine.', 'Added an alert for the alerts. Peace of mind unlocked.'],
  };

  const BONUSES = [
    { from: 'ceo', text: 'Saw your numbers this week. Really strong work. Expense yourself something nice.', label: 'Thanks, Alex!', fx: { cash: 0.8 } },
    { from: 'bot', text: 'A client sent the team a gift basket. Distribution of cheeses has been fair and balanced. 🧀', label: 'Nice!', fx: { teamMood: 6 } },
    { from: 'bot', text: 'A former client referred a friend to our careers page.', label: 'Great', fx: { refs: 1 } },
    { from: 'dana', text: 'Your team came up in the leadership meeting. In a good way! Keep it up.', label: '😊', fx: { rep: 1 } },
    { from: 'bot', text: 'Reminder: Friday is pizza day. Pizza has been ordered. Morale +1 (estimated).', label: '🍕', fx: { teamMood: 4 } },
    { from: 'ceo', text: 'Quick one: a board member wants to meet the team behind our last launch. That\'s you. Wear something nice.', label: 'Will do', fx: { refs: 1, rep: 1 } },
  ];

  const LOW_MOOD = {
    text: "Honestly, I'm running on empty. Not sure how much more I've got this week.",
    choices: [
      { label: 'Take the afternoon off', reply: 'Thank you. Really. Back tomorrow, recharged.', fx: { rest: 60, mood: 35, bond: 6 } },
      { label: "Let's grab a coffee", reply: 'That helped more than you know.', fx: { mood: 15, bond: 8 } },
      { label: 'Hang in there', reply: 'Okay.', fx: { mood: -3, bond: -4 } },
    ],
  };

  const GEAR = {
    laptop: { name: 'Laptop', items: ['Refurbished laptop', 'Standard-issue laptop', 'Developer workstation', 'Maxed-out workstation', 'R&D prototype rig'] },
    chair: { name: 'Chair', items: ['Folding chair', 'Office chair', 'Ergonomic chair', 'Executive chair', 'Zero-gravity chair'] },
    headset: { name: 'Headset', items: ['Tangled earbuds', 'Office headset', 'Noise-cancelling headset', 'Studio monitors', 'Neural focus band'] },
    mug: { name: 'Mug', items: ['Paper cup', 'Branded mug', 'Insulated tumbler', 'Barista set', 'Bottomless mug'] },
  };
  const GEAR_PCT = [5, 10, 16, 24, 35];

  // ------------------------------------------------------------------ breaks (mini-games)
  // cooldown: minutes between rewarded plays. The daily word is once a day.
  const GAMES = {
    word: { name: 'Daily word', desc: 'Guess the five-letter word in six tries. Same word for the whole office, and for lintcheck in the terminal.', reward: 'Referrals and a 30-minute revenue boost' },
    inbox: { name: 'Inbox Zero', desc: '30 seconds of notifications. Tap them before they pile up, chain them for combos, and never click the phishing.', cooldown: 30, reward: 'Espresso shots', tiers: [40, 90, 150], unit: 'points' },
    stack: { name: 'Stack', desc: 'Build Atlas HQ one floor at a time. Tap to drop each floor. Line it up perfectly or the overhang falls off.', cooldown: 30, reward: 'A revenue boost', tiers: [8, 15, 25], unit: 'floors' },
  };
  // Same list and order as terminal/lintcheck.py, so the web and terminal games share the daily word.
  const WORDS = `
    about above actor acute adapt admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone
    along alter among angle angry apart apple apply arena argue arise array aside asset audio audit avoid award aware badge
    baker basic beach began begin being below bench birth black blade blame blank blast blend blind block blood board boost
    booth bound brain brand brave bread break brick brief bring broad brown brush build built buyer cable cache candy carry
    catch cause chain chair chart chase cheap check chest chief child chose civil claim class clean clear click climb clock
    close cloud coach coast could count court cover craft crane crash crazy cream crime cross crowd crown curve cycle daily
    dance dated dealt death debug debut delay delta depth digit dirty doubt dozen draft drama drawn dream dress drink drive
    eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault
    favor feast fence fewer fiber field fifth fifty fight final first fixed flash fleet floor fluid focus force forth forty
    forum found frame frank fraud fresh front fruit fully funny giant given glass globe glory grace grade grand grant grape
    graph grass great green greet gross group grown guard guess guest guide habit happy heart heavy hello hence hobby horse
    hotel house human humor ideal image imply index inner input issue joint judge juice knife known label labor large laser
    later laugh layer learn lease least leave legal lemon level light limit linen local logic loose lower lucky lunch magic
    major maker march match maybe mayor meant media merge metal meter might minor minus mixed model money month moral motor
    mount mouse mouth movie music needs nerve never newly night noise north noted novel nurse occur ocean offer often order
    other ought outer owner paint panel paper party pasta patch pause peace pearl phase phone photo piano piece pilot pitch
    pixel place plain plane plant plate point polar pound power press price pride prime print prior prize proof proud prove
    query queue quick quiet quite quota radio raise range rapid ratio reach react ready realm rebel refer relax reply right
    rival river robot rough round route royal rural salad scale scene scope score scrum sense serve setup seven shade shake
    shall shape share sharp shelf shell shift shine shirt shock shoot short shown sight silly since skill sleep slide small
    smart smile smoke solid solve sorry sound south space spare speak speed spend spent spike split sport squad stack staff
    stage stake stand start state steam steel stick still stock stone stood store storm story strip stuck study stuff style
    sugar suite super sweet swing table taken taste teach teeth thank theme there thick thing think third those three threw
    throw tight timer tired title toast today token topic total touch tough tower track trade train trend trial tribe trick
    tried truck truly trust truth twice under union unity until upper upset urban usage usual valid value video virus visit
    vital vocal voice waste watch water wheel where which while white whole whose woman world worry worse worst worth would
    wound write wrong wrote yield young youth
  `.trim().split(/\s+/);

  // Inbox Zero: what pops up. pts: points per tap (phishing costs points and your combo). life: seconds on screen.
  const PINGS = {
    chat: { icon: 'inbox', pts: 1, w: 34, life: 2.1, lines: ['quick q', 'u there?', 'got a sec?', 'lol', 'ping', '+1', 'see thread', 'thoughts?'] },
    mail: { icon: 'mail', pts: 1, w: 26, life: 2.2, lines: ['Re: Re: Fwd:', 'Per my last email', 'Action needed', 'Quick sync?', 'Reminder!', 'FYI'] },
    meet: { icon: 'calendar', pts: 1, w: 16, life: 2, lines: ['Sync re: sync', 'Standup', 'All-hands', '1:1', 'Brainstorm', 'Retro'] },
    ceo: { icon: 'star', pts: 3, w: 8, life: 1.3, lines: ['CEO: got a min?', 'From the CEO', 'Board deck?'] },
    phish: { icon: 'hook', pts: -2, w: 12, life: 2, phish: true, lines: ['You won an iPad!', 'Gift cards ASAP', 'Verify password', 'Free crypto'] },
    coffee: { icon: 'breaks', pts: 0, w: 4, life: 1.6, bonus: 2, lines: ['Coffee run!'] },
  };
  // Stack: each new floor of Atlas HQ gets a department; these are the landmarks on the way up.
  const FLOORS = { 5: 'Mailroom', 10: 'Marketing', 15: 'Legal', 20: 'Engineering', 25: 'Executive suite', 30: 'Rooftop bar', 40: 'Helipad', 50: 'Low orbit', 75: 'The Moon', 100: 'Mars office' };

  // Incoming calls ring now and then while you're around. Answer for a small windfall.
  const CALLS = {
    quote: ['Can you quote us for a quick fix? We pay upfront.', 'We need a logo by Friday. Deposit is on its way.', 'Our intern broke the website. Help! Paying now.'],
    shot: ['We sent your team a coffee voucher. Thanks for last time!', 'Our barista robot over-delivered. One espresso, on us.'],
    flow: ['Big demo in an hour. Can your team sprint?', 'Investor visit today. Look busy, please!'],
    boost: ["We're telling all our friends about you.", 'You trended on LinkedIn. Our customers want more.'],
    ref: ['My cousin is looking for a job. Can I send you their CV?', 'I know someone great who wants to join you.'],
  };

  return {
    BALANCE, SIZES, LENGTHS, RARITY, PACKS, ROLES, REVIEWS, VERDICTS, ROLE_NOUN, TRAITS, TITLES, PEOPLE, CAST, RIVALS, RIVAL_LINES, LEAGUES, LEAGUE_REWARDS, CLIENTS, PROJECTS,
    OFFICE, ZONES, FUNDING, CAP_NAMES, ACQ, CAREER_TITLES, UNLOCKS, DECISIONS, IPO_DECISIONS, BANTER, IPO_BANTER, BONUSES, LOW_MOOD, GEAR, GEAR_PCT,
    GAMES, WORDS, PINGS, FLOORS, CALLS,
  };
})();
