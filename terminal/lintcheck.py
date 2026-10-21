#!/usr/bin/env python3
"""lintcheck — Wordle disguised as a CI "deployment token" validator.

    python3 lintcheck.py            # daily token (same word for everyone today)
    python3 lintcheck.py --random   # practice with a random token
    python3 lintcheck.py --stats    # show your history
    python3 lintcheck.py --plain    # no colours (for nosy screen-sharing)
    python3 lintcheck.py --strict   # only accept words from the built-in list

Type :q (or press Ctrl+C) at the prompt to bail out behind a wall of passing tests.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import random
import sys
import time

WORDS = """
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
""".split()
WORD_SET = set(WORDS)
MAX_TRIES = 6
STATE_FILE = os.path.join(os.path.expanduser("~"), ".lintcheck_cache.json")

USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None
GREEN, YELLOW, DIM, BOLD, RESET = "\033[32m", "\033[33m", "\033[90m", "\033[1m", "\033[0m"


def c(code, text):
    return f"{code}{text}{RESET}" if USE_COLOR else text


def score(guess, answer):
    """Return per-letter results: 2 = right spot, 1 = elsewhere, 0 = absent (handles repeats)."""
    res = [0] * 5
    remaining = {}
    for i, (g, a) in enumerate(zip(guess, answer)):
        if g == a:
            res[i] = 2
        else:
            remaining[a] = remaining.get(a, 0) + 1
    for i, g in enumerate(guess):
        if res[i] == 0 and remaining.get(g, 0):
            res[i] = 1
            remaining[g] -= 1
    return res


def render_row(n, guess, res):
    letters = []
    for ch, r in zip(guess.upper(), res):
        if not USE_COLOR:
            letters.append(ch + "+?."[2 - r])
        else:
            letters.append(c(GREEN if r == 2 else YELLOW if r == 1 else DIM, ch))
    ok, warn = res.count(2), res.count(1)
    status = c(GREEN, "PASS") if ok == 5 else c(YELLOW, "WARN") if ok or warn else c(DIM, "FAIL")
    return f"  [{n}/{MAX_TRIES}] {' '.join(letters)}   {status}  ok={ok} warn={warn}"


def render_keys(known):
    out = []
    for ch in "abcdefghijklmnopqrstuvwxyz":
        r = known.get(ch)
        if r is None:
            out.append(ch)
        elif USE_COLOR:
            out.append(c(GREEN if r == 2 else YELLOW if r == 1 else DIM, ch))
        else:
            out.append(ch.upper() if r else "_")
    return "  coverage: " + "".join(out)


def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"played": 0, "wins": 0, "streak": 0, "best_streak": 0, "dist": [0] * MAX_TRIES, "daily": {}}


def save_state(st):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(st, f)
    except OSError:
        pass


def boss_screen():
    """Print a convincing wall of passing tests and exit."""
    suites = ["auth", "billing", "invoices", "users", "search", "webhooks", "exports", "permissions", "sessions", "reports"]
    print()
    for s in suites:
        n = random.randint(8, 40)
        print(f" {c(GREEN, 'PASS')}  src/{s}/{s}.service.test.ts ({random.uniform(0.4, 3.2):.2f} s)")
        time.sleep(0.03)
    total = random.randint(300, 600)
    print(f"\nTest Suites: {c(GREEN, f'{len(suites)} passed')}, {len(suites)} total")
    print(f"Tests:       {c(GREEN, f'{total} passed')}, {total} total")
    print("Snapshots:   0 total")
    print(f"Time:        {random.uniform(9, 25):.3f} s")
    print("Ran all test suites.")
    sys.exit(0)


def show_stats(st):
    played = st["played"]
    rate = round(100 * st["wins"] / played) if played else 0
    print(f"cache: {played} builds, {rate}% passed, streak {st['streak']} (best {st['best_streak']})")
    peak = max(st["dist"]) or 1
    for i, n in enumerate(st["dist"], 1):
        print(f"  attempt {i}: {'#' * max(1 if n else 0, round(20 * n / peak)):<20} {n}")


def main():
    ap = argparse.ArgumentParser(description="Validate the deployment token for this build.")
    ap.add_argument("--random", action="store_true", help="practice token instead of today's")
    ap.add_argument("--stats", action="store_true", help="show cache statistics")
    ap.add_argument("--plain", action="store_true", help="disable colours")
    ap.add_argument("--strict", action="store_true", help="reject tokens not in the dictionary")
    args = ap.parse_args()
    global USE_COLOR
    if args.plain:
        USE_COLOR = False

    st = load_state()
    if args.stats:
        show_stats(st)
        return

    today = dt.date.today().isoformat()
    if args.random:
        answer, build = random.choice(WORDS), f"local-{random.randint(1000, 9999)}"
    else:
        idx = int(hashlib.sha256(f"office-shenanigans-{today}".encode()).hexdigest(), 16) % len(WORDS)
        answer, build = WORDS[idx], today.replace("-", "")
        if today in st["daily"]:
            print(f"> token for build #{build} already validated ({st['daily'][today]}). Try --random or come back tomorrow.")
            return

    print(c(DIM, "> ci-runner@4.2.1 validate"))
    print(c(DIM, "> node scripts/validate-token.js --ci --attempts=6"))
    print()
    print(f"Resolving 5-char deployment token for build #{build}")
    if USE_COLOR:
        print(c(DIM, "  legend: green=ok (right position)  yellow=warn (wrong position)  grey=fail"))
    else:
        print("  legend: X+ ok (right position)  X? warn (wrong position)  X. fail;  coverage: X=seen, _=absent")
    print()

    known, rows = {}, []
    tries = 0
    while tries < MAX_TRIES:
        try:
            guess = input(c(DIM, "token> ")).strip().lower()
        except (EOFError, KeyboardInterrupt):
            boss_screen()
        if guess in (":q", "q", "quit", "exit"):
            boss_screen()
        if len(guess) != 5 or not guess.isalpha():
            print(c(DIM, "  error: token must be exactly 5 letters"))
            continue
        if args.strict and guess not in WORD_SET:
            print(c(DIM, "  error: token not found in registry"))
            continue
        tries += 1
        res = score(guess, answer)
        rows.append(res)
        for ch, r in zip(guess, res):
            known[ch] = max(known.get(ch, -1), r)
        print(render_row(tries, guess, res))
        print(render_keys(known))
        if guess == answer:
            break

    won = rows and rows[-1] == [2] * 5
    print()
    st["played"] += 1
    if won:
        st["wins"] += 1
        st["streak"] += 1
        st["best_streak"] = max(st["best_streak"], st["streak"])
        st["dist"][tries - 1] += 1
        print(c(GREEN, f"✔ token verified in {tries} attempt(s). build #{build} passed."))
    else:
        st["streak"] = 0
        print(c(YELLOW, f"✖ token mismatch. expected '{answer}'. build #{build} failed."))
    if not args.random:
        st["daily"][today] = f"{tries}/6" if won else "X/6"
    save_state(st)

    # Shareable summary for the team channel.
    grid = "\n".join("".join("🟩" if r == 2 else "🟨" if r == 1 else "⬛" for r in row) for row in rows)
    label = f"{tries}/6" if won else "X/6"
    print(f"\nshare:\nlintcheck {'#' + build if not args.random else 'practice'} {label}\n{grid}")


if __name__ == "__main__":
    main()
