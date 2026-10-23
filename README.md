# Office Shenanigans

Games that look like work. Each one has a **boss key** that swaps it for something dull in under a second.

| Game | Looks like | Actually is | Boss key |
|---|---|---|---|
| ⭐ **Atlas Workforce** (`docs/workforce`) | An HR system (Workday-style) | **The endless idle game.** Staff real-time client projects (most take 30 seconds to an hour) with 33 illustrated characters who have moods, traits, friendships and backstories. Hire them from blind boxes, including 8 rare Legends with special abilities, or let them go. Projects bill as they run, so the budget ticks up live; tap Hustle to make everyone work faster, answer incoming client calls, and sign off deliveries to see a star-by-star client review. Quick mini-games (daily word, Inbox Zero, Stack) pay out boosts. Raise funding rounds, ring the IPO bell, then grow the share price and market cap forever with earnings calls, milestones and acquisitions. Progress continues offline, and the phone layout installs as an app | `Esc` or `` ` `` → performance calibration report |
| **Atlas Delivery Tracker** (`docs/tracker`) | A Jira-style sprint board | Idle RPG/clicker: tickets are enemies, story points are HP, promotions are levels. Has upgrades, abilities, prestige ("reorgs"), 31 achievements, offline progress and a leaderboard | `Esc` or `` ` `` → quarterly business review |
| **FY26 Budget Workbook** (`docs/workbook`) | An Excel workbook | Minesweeper: hidden cells show fake figures, mines are `#REF!`, flags are `#N/A`, best times go on an "Approvals" sheet | `Esc` → every cell shows plain numbers, timer pauses |
| **lintcheck** (`terminal/lintcheck.py`) | A CI token validator | Wordle. Same daily word for everyone in the office (and the same as Workforce's daily word), plus practice mode, stats and a shareable grid | `:q` or `Ctrl+C` → a screen of passing tests |
| **oncall** (`terminal/oncall.py`) | An SSH session on a prod server | Text RPG: `ls`/`cd`/`cat` to explore, `ps`/`kill` to fight processes, `apt install` to buy gear, find the root password, beat the boss in `/root` | `clear` → `kubectl get pods` output |
| **Q3 Expense Reconciliation** (`excel/`) | An audit workbook | Fraud mystery: work out the shell vendor, the employee behind it and the amount taken, then enter them on the Sign-off sheet, which checks them with formulas | It *is* a spreadsheet |

No accounts, trackers or third-party scripts. The web games are plain HTML/JS in `docs/` (the folder GitHub Pages serves), and the terminal games use only the Python standard library.

## Play on your phone
Once GitHub Pages is on (see **Deploy**), open **https://goshuajoh.github.io/OfficeShenanigans/workforce/** on your phone.
- **Phone layout:** a bottom tab bar (Home · Projects · Inbox · Team · More), with dialogs that slide up from the bottom. **⧉** at the top flips to the boring report.
- **Install it:** tap **Install** on the Home tab. On iPhone use Safari → Share → **Add to Home Screen**; on Android use ⋮ → **Install app**. It runs full-screen, works offline, and can show a task count on its icon.
- **Move your progress between computer and phone:** Settings → **Play on another device** → *Copy transfer link* (or *Share…*), then open the link on the other device. Inside the installed iPhone app, paste the link into the box on the same screen instead. The iPhone home-screen app keeps its own save, separate from Safari.
- The spreadsheet Minesweeper works on phones too: tap to open, long-press (or switch on **⚑ Mark #N/A**) to flag, and tap the file name at the top to hide the game.

---

## Run locally

### Web games and shared leaderboard (Node 18+)
```bash
npm start                 # or: node server/leaderboard.js
# open http://localhost:8080
```
That one server hosts both web games plus a shared leaderboard API, so it's all you need for an office-wide ranking. Set `PORT=` to change the port. Scores are saved to `server/data/scores.json`.

**Without Node:** `cd docs && python3 -m http.server 8080` works too. Opening the HTML files directly also works. Either way, leaderboards fall back to scores stored in your own browser.

### Terminal games (Python 3.8+, no installs)
```bash
python3 terminal/lintcheck.py            # today's word
python3 terminal/lintcheck.py --random   # practice
python3 terminal/lintcheck.py --stats
python3 terminal/oncall.py               # resumes your save; --new to restart
```
Tip: alias them to something boring, e.g. `alias npm-audit='python3 ~/OfficeShenanigans/terminal/lintcheck.py'`.
Saves live in `~/.lintcheck_cache.json` and `~/.oncall_state`.

### Excel mystery
Just open `excel/Q3_Expense_Reconciliation.xlsx` in Excel, LibreOffice or Google Sheets. Start on the **Procedure** sheet.
To make a fresh data set, edit `SEED` in `excel/build_mystery.py`, then run:
```bash
pip install openpyxl
python3 excel/build_mystery.py
```
(The script contains the solution, so don't read it if you want to play.)

---

## Deploy

### Option A: GitHub Pages (free and static; leaderboards stay on each device)
The site is plain files in `docs/`, so Pages serves it directly with no build step:
1. Open **Settings → Pages** (https://github.com/goshuajoh/OfficeShenanigans/settings/pages).
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*. Pick the branch that has this code (currently `claude/relaxed-allen-baj32j`, or `main` once merged) and the **/docs** folder, then **Save**.
3. About a minute later the site is live at **https://goshuajoh.github.io/OfficeShenanigans/**. Every push to that branch redeploys it.

### Option B: One server with a shared leaderboard (Render, Railway, Fly.io or any VM)
There are no dependencies and the start command is `npm start`.
- **Render/Railway:** create a new Web Service from this repo with start command `npm start`. Attach a disk and set `DATA_FILE=/data/scores.json` so scores survive redeploys.
- **Docker:**
  ```bash
  docker build -t office-games .
  docker run -p 8080:8080 -v office-scores:/data office-games
  ```
- **Intranet box:** `PORT=80 node server/leaderboard.js`, kept alive with systemd or pm2.

### Option C: Pages frontend with a hosted leaderboard
Deploy the server (Option B), then set `leaderboardUrl` in `docs/config.js` to its URL. The server already sends CORS headers.

---

## Game notes

**Atlas Workforce** runs all day in a background tab or on your phone. Check in when you like, spend a minute, and leave.
- **Guidance:** Dana, your manager, walks you through the first two minutes. After that, the card at the top of Home always shows the one thing worth doing next. New features switch on one at a time as your career grows.
- **Core loop:** pick a client offer (it shows who's recommended and the chance of a 4★+ review) and tap Start. Quick wins take a minute, Sprints three, Projects ten, Programmes thirty and Enterprise deals an hour; some offers are quicker, and "long-haul" ones run for hours while you're in meetings. Signing off plays the client review: the stars land one by one, revenue counts up and XP bars fill.
- **Live revenue:** running projects bill their client as the work progresses, so the budget on Home counts up every second, with the live rate, today's revenue and a last-hour chart. The review on sign-off pays the rest: the better the rating, the bigger the cheque.
- **Don't want to wait?** Tap or hold **Hustle** and everyone works up to 3× faster (office construction too) while you keep at it. Clients call now and then: answer within 15 seconds for a deposit, an espresso shot, a flow state or a referral. Spend an espresso shot to halve the time left on a project (one refills every 20 minutes). Or take a break: the Breaks page has a daily word (the same word as `lintcheck`), **Inbox Zero** (30 seconds of notifications to clear, with streaks, CEO pings and phishing to avoid) and **Stack** (build Atlas HQ floor by floor; perfect drops widen the tower). They pay out referrals, espresso shots and revenue boosts, and keep your best scores.
- **Hiring:** referrals open blind boxes. You only see who you hired when the box pops open, and the glow hints at rarity. The odds run from Intern to Principal, plus **8 Legends** with special abilities: a dog who keeps everyone happy, an AI intern who never tires, a fixer who never lets a review drop below 3★, and more. One Legend is featured each week, and pity timers guarantee a Legend within 70 boxes. Duplicates promote people (+25% skill per star).
- **Letting go:** open a profile to let someone go. Senior people leave you referrals from their network, the team's mood dips and, after the IPO, investors cheer. Ex-colleagues sometimes start companies and send you VIP work.
- **Your people:** traits (night owl, coffee-powered, perfectionist…), moods, fatigue and bonds. Coffee chats build hearts, and hearts unlock backstories. The floor plan shows everyone at their desk, in a meeting or at the coffee machine.
- **Inbox:** your team brings you decisions ("ship Friday or wait until Monday?"). Some are gambles you hear back on later. Others are banter to react to.
- **Stakes:** a daily commitment with a streak, a weekly league against rival managers (top two move up), and funding rounds from Seed to the **IPO**.
- **After the IPO it never ends:** Atlas trades as ATLS, with a live share price and chart. Every day is a fiscal quarter, and your daily commitment becomes guidance: beat it and the stock pops, miss it and it drops. Market-cap milestones (Unicorn, Decacorn, Trillion-dollar club and beyond) add permanent revenue and bring more Legends. You can also buy companies, one after another, each pricier than the last. Stock splits keep the price readable.
- **Idle mode:** work carries on while you're away (12 h cap), and the welcome-back card shows what it earned. The Project office (after the Seed round, career 4) adds autopilot: it signs off and restarts work for you, but only after a delivery has waited 5 minutes, so reviews you're around for are still yours to open. Switch it on or off on Home. The tab title and app icon show how many things need you.
- Saves from earlier versions carry over: your people come with you, and new features switch on straight away.
- Open with `?debug` to get a `WF` object in the console (`WF.warp(3600)` fast-forwards an hour). Handy for testing; it's off by default.

**Atlas Delivery Tracker:** `Space` logs work, `1` calls a stand-up (team ×3), `2` starts crunch mode (you ×5). Every 10th ticket is a timed incident (boss). Slack-style pings show up now and then; click them for bonuses. From sprint 15 you can accept a **reorg**, which resets your progress for permanent equity. Settings has *stealth mode* (grey icons, quiet effects) and save export/import.

**Budget Workbook:** left-click opens a cell, right-click or `F` flags it (on a phone: tap, and long-press to flag). Clicking a number whose flags are all placed opens its neighbours. Arrow keys and Enter also work, and `F2` restarts. Sheet tabs Q1/Q2/Q3 are easy/medium/hard.

**oncall:** start with `cat README.txt`. Some files are locked until you kill the process holding them.

## Customising and graphics
Everything is drawn with CSS, inline SVG and emoji. The only image files are Workforce's app icons in `docs/workforce/icons/`. To reskin the games:
- Workforce characters (including the Legends and their abilities), clients, decisions, mini-game content, office upgrades, unlocks and balance live in `docs/workforce/data.js`. Avatars, blind boxes, client logos, the floor plan and the stock chart are drawn in `docs/workforce/art.js`, and the game rules are in `docs/workforce/engine.js`.
- Ticket titles, incidents, hires and achievements are plain arrays at the top of `docs/tracker/game.js`.
- Icons are emoji in the same file. Swap in `<img src="...">` tags if you want custom sprites; stealth mode greys them out either way.
- Word list: `WORDS` in `terminal/lintcheck.py`. World, enemies and shop: the dicts at the top of `terminal/oncall.py`.
