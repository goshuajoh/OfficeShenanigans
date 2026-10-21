# Office Shenanigans

Games that look like work. Each one has a **boss key** that swaps it for something dull in under a second.

| Game | Looks like | Actually is | Boss key |
|---|---|---|---|
| ⭐ **Atlas Workforce** (`web/workforce`) | An HR system (Workday-style) | **The long-haul idle RPG.** Collect 25 employees through gacha recruiting and promote duplicates. Your squad auto-clears projects and timed launch bosses. Has gear, timed client engagements, an R&D tree with automation, daily OKRs with streaks, 47 badges, an IPO prestige loop with board perks, offline progress and a task count in the tab title | `Esc` or `` ` `` → performance calibration report |
| **Atlas Delivery Tracker** (`web/tracker`) | A Jira-style sprint board | Idle RPG/clicker: tickets are enemies, story points are HP, promotions are levels. Has upgrades, abilities, prestige ("reorgs"), 31 achievements, offline progress and a leaderboard | `Esc` or `` ` `` → quarterly business review |
| **FY26 Budget Workbook** (`web/workbook`) | An Excel workbook | Minesweeper: hidden cells show fake figures, mines are `#REF!`, flags are `#N/A`, best times go on an "Approvals" sheet | `Esc` → every cell shows plain numbers, timer pauses |
| **lintcheck** (`terminal/lintcheck.py`) | A CI token validator | Wordle. Same daily word for everyone in the office, plus practice mode, stats and a shareable grid | `:q` or `Ctrl+C` → a screen of passing tests |
| **oncall** (`terminal/oncall.py`) | An SSH session on a prod server | Text RPG: `ls`/`cd`/`cat` to explore, `ps`/`kill` to fight processes, `apt install` to buy gear, find the root password, beat the boss in `/root` | `clear` → `kubectl get pods` output |
| **Q3 Expense Reconciliation** (`excel/`) | An audit workbook | Fraud mystery: work out the shell vendor, the employee behind it and the amount taken, then enter them on the Sign-off sheet, which checks them with formulas | It *is* a spreadsheet |

No accounts, trackers or third-party scripts. The web games are plain HTML/JS, and the terminal games use only the Python standard library.

---

## Run locally

### Web games and shared leaderboard (Node 18+)
```bash
npm start                 # or: node server/leaderboard.js
# open http://localhost:8080
```
That one server hosts both web games plus a shared leaderboard API, so it's all you need for an office-wide ranking. Set `PORT=` to change the port. Scores are saved to `server/data/scores.json`.

**Without Node:** `cd web && python3 -m http.server 8080` works too. Opening the HTML files directly also works. Either way, leaderboards fall back to scores stored in your own browser.

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

### Option A: GitHub Pages (free, static, local leaderboards only)
1. Merge to `main`.
2. In the repo, go to **Settings → Pages → Source: GitHub Actions**.
3. `.github/workflows/pages.yml` publishes `web/` to `https://<user>.github.io/<repo>/`.

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
Deploy the server (Option B), then set `leaderboardUrl` in `web/config.js` to its URL. The server already sends CORS headers.

---

## Game notes

**Atlas Workforce** is built to run all day in a background tab. Check in every 15–60 minutes, spend a minute, and leave.
- **Core loop:** your squad clears blockers automatically and earns revenue, which you spend on level-ups. Output doubles at level 10 and every 25 levels. Every 5th project ends in a timed **launch**. If the squad misses it, they farm the earlier phases and retry when they're strong enough.
- **Unlocks as you climb:** Talent pipeline (P5), IT assets (P10), Client engagements (P15), R&D (P25), daily OKRs (P30), Board & IPO (P60).
- **Recruiting:** referrals buy interviews. There are 5 rarity bands (Intern → Principal) with pity timers. Duplicates add promotion stars (×1.5 output each, up to 5★). Role passives (Engineering, Reliability, Product, Sales, Design) make squad composition matter.
- **Come-back hooks:** engagements run 5 min–8 h; R&D projects run up to 8 h; OKRs reset daily; message pings give bonuses. The tab title shows "(n) Atlas Workforce" when something needs you, which looks like an inbox count.
- **Low-effort automation:** R&D unlocks auto-levelling, auto-equip and auto-repeating engagements. Progress continues offline (8 h cap by default, upgradeable).
- **Prestige:** from project 60, an IPO resets the run for shares. Shares buy permanent perks: multipliers, keeping a share of levels, a second lab, an extra squad slot and better recruiting odds.
- Open with `?debug` to get a `WF` object in the console (`WF.warp(3600)` fast-forwards an hour). Handy for testing; it's off by default.

**Atlas Delivery Tracker:** `Space` logs work, `1` calls a stand-up (team ×3), `2` starts crunch mode (you ×5). Every 10th ticket is a timed incident (boss). Slack-style pings show up now and then; click them for bonuses. From sprint 15 you can accept a **reorg**, which resets your progress for permanent equity. Settings has *stealth mode* (grey icons, quiet effects) and save export/import.

**Budget Workbook:** left-click opens a cell, right-click or `F` flags it. Clicking a number whose flags are all placed opens its neighbours. Arrow keys and Enter also work, and `F2` restarts. Sheet tabs Q1/Q2/Q3 are easy/medium/hard.

**oncall:** start with `cat README.txt`. Some files are locked until you kill the process holding them.

## Customising and graphics
Everything is drawn with CSS, inline SVG and emoji, so there are no image files. Workforce uses initials avatars, like real HR software. To reskin the games:
- Workforce characters, gear, research, perks and unlocks live in `web/workforce/data.js`.
- Ticket titles, incidents, hires and achievements are plain arrays at the top of `web/tracker/game.js`.
- Icons are emoji in the same file. Swap in `<img src="...">` tags if you want custom sprites; stealth mode greys them out either way.
- Word list: `WORDS` in `terminal/lintcheck.py`. World, enemies and shop: the dicts at the top of `terminal/oncall.py`.
