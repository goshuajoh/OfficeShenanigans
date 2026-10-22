# Office Shenanigans

Games that look like work. Each one has a **boss key** that swaps it for something dull in under a second.

| Game | Looks like | Actually is | Boss key |
|---|---|---|---|
| ⭐ **Atlas Workforce** (`docs/workforce`) | An HR system (Workday-style) | **The long-haul idle game.** Staff real-time client projects (2 min to 8 h) with 25 illustrated characters who have moods, traits, friendships and backstories. Answer their inbox decisions, sign off deliveries to see a star-by-star client review, and hire through a résumé reveal. Keep a daily commitment streak, climb a weekly manager league, and raise funding rounds that open up your office floor plan. Progress continues offline, and the phone layout installs as an app | `Esc` or `` ` `` → performance calibration report |
| **Atlas Delivery Tracker** (`docs/tracker`) | A Jira-style sprint board | Idle RPG/clicker: tickets are enemies, story points are HP, promotions are levels. Has upgrades, abilities, prestige ("reorgs"), 31 achievements, offline progress and a leaderboard | `Esc` or `` ` `` → quarterly business review |
| **FY26 Budget Workbook** (`docs/workbook`) | An Excel workbook | Minesweeper: hidden cells show fake figures, mines are `#REF!`, flags are `#N/A`, best times go on an "Approvals" sheet | `Esc` → every cell shows plain numbers, timer pauses |
| **lintcheck** (`terminal/lintcheck.py`) | A CI token validator | Wordle. Same daily word for everyone in the office, plus practice mode, stats and a shareable grid | `:q` or `Ctrl+C` → a screen of passing tests |
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
- **Guidance:** Dana, your manager, walks you through the first session with highlighted steps. After that, the card at the top of Home always shows the one thing worth doing next.
- **Core loop:** pick a client offer. It shows who's recommended and the chance of a 4★+ review; tap Start. Work runs in real time, from a 2-minute Task to an 8-hour Enterprise deal. Longer work pays far more, so start a long one before a meeting. Signing off plays the client review: the stars land one by one, revenue counts up and XP bars fill.
- **Your people:** 25 characters with illustrated avatars, traits (night owl, coffee-powered, perfectionist…), moods and fatigue. Coffee chats build bonds (hearts), and hearts unlock their backstory. Overwork someone and they burn out. The floor plan shows everyone at their desk, in a meeting or at the coffee machine.
- **Inbox:** your team brings you decisions ("ship Friday or wait until Monday?"). Some are gambles you hear back on later. Others are banter to react to.
- **Stakes:** a daily commitment (Steady, Stretch or Moonshot) with a streak; a weekly league against rival managers, where the top two move up; and funding rounds from Seed to the Trillion-dollar club, each opening a new part of the office.
- **Unlocks as you climb:** hiring and the daily commitment (career level 2), the league and Sprints (3), IT equipment (4), Projects (6), Programmes (10) and Enterprise deals (15). From level 8 a Project office can sign off and restart work for you.
- **Offline:** work carries on while you're away (12 h cap). The tab title and app icon show how many things need you.
- Saves from the first version carry over: your people come with you, plus 5 referrals.
- Open with `?debug` to get a `WF` object in the console (`WF.warp(3600)` fast-forwards an hour). Handy for testing; it's off by default.

**Atlas Delivery Tracker:** `Space` logs work, `1` calls a stand-up (team ×3), `2` starts crunch mode (you ×5). Every 10th ticket is a timed incident (boss). Slack-style pings show up now and then; click them for bonuses. From sprint 15 you can accept a **reorg**, which resets your progress for permanent equity. Settings has *stealth mode* (grey icons, quiet effects) and save export/import.

**Budget Workbook:** left-click opens a cell, right-click or `F` flags it (on a phone: tap, and long-press to flag). Clicking a number whose flags are all placed opens its neighbours. Arrow keys and Enter also work, and `F2` restarts. Sheet tabs Q1/Q2/Q3 are easy/medium/hard.

**oncall:** start with `cat README.txt`. Some files are locked until you kill the process holding them.

## Customising and graphics
Everything is drawn with CSS, inline SVG and emoji. The only image files are Workforce's app icons in `docs/workforce/icons/`. To reskin the games:
- Workforce characters, clients, decisions, office upgrades, unlocks and balance live in `docs/workforce/data.js`. Avatars, client logos and the floor plan are drawn in `docs/workforce/art.js`, and the game rules are in `docs/workforce/engine.js`.
- Ticket titles, incidents, hires and achievements are plain arrays at the top of `docs/tracker/game.js`.
- Icons are emoji in the same file. Swap in `<img src="...">` tags if you want custom sprites; stealth mode greys them out either way.
- Word list: `WORDS` in `terminal/lintcheck.py`. World, enemies and shop: the dicts at the top of `terminal/oncall.py`.
