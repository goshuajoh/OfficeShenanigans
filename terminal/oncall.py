#!/usr/bin/env python3
"""oncall — a text RPG disguised as an SSH session on a production bastion host.

    python3 oncall.py          # resume (or start) your shift
    python3 oncall.py --new    # start over

You've been paged. Something deep in the box is wrong. Explore the filesystem,
`kill` rogue processes for XP and credits, `apt install` better tools, find the
root password and take down whatever is living in /root.

Type `help` once you're in. Type `clear` when someone walks past.
"""
import json
import os
import random
import shlex
import sys
import time

try:
    import readline  # noqa: F401  (arrow-key history where available)
except ImportError:
    pass

SAVE_FILE = os.path.join(os.path.expanduser("~"), ".oncall_state")
USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None
ROOT_PASSWORD = "c0ff33-is-l1fe"


def col(code, s):
    return f"\033[{code}m{s}\033[0m" if USE_COLOR else s


green = lambda s: col("32", s)  # noqa: E731
blue = lambda s: col("34;1", s)  # noqa: E731
red = lambda s: col("31", s)  # noqa: E731
yellow = lambda s: col("33", s)  # noqa: E731
dim = lambda s: col("90", s)  # noqa: E731
bold = lambda s: col("1", s)  # noqa: E731

# ---------------------------------------------------------------- world

DIRS = {
    "/": "The root of everything. Mind the step.",
    "/home": "Home directories. Most belong to people who left in 2019.",
    "/home/oncall": "Your home. A half-written runbook and a lot of coffee rings.",
    "/var": "Variable data. Nothing here is constant, least of all your patience.",
    "/var/log": "Logs scroll past faster than you can read them.",
    "/tmp": "Temporary files that became permanent. Something moves in the shadows.",
    "/etc": "Configuration. Every file is load-bearing.",
    "/etc/secrets": "Mode 0700. You feel watched.",
    "/srv": "Services. Some still running, some just pretending.",
    "/srv/legacy": "A monument to a 2009 architecture review. Cobwebs everywhere.",
    "/opt": "Optional software that turned out to be mandatory.",
    "/opt/vendor": "Vendored dependencies. The licence files are longer than the code.",
    "/proc": "The kernel's view of every living process. It hums.",
    "/dev": "Devices. The warm one is a GPU nobody remembers buying.",
    "/root": "The superuser's home. The air is heavy with technical debt.",
}
LOCKED = {"/etc/secrets", "/root"}

FILES = {
    "/home/oncall/README.txt": (
        "ONCALL RUNBOOK (draft, do not trust)\n"
        "1. Look around: ls, cd, cat, pwd\n"
        "2. Find bad processes: ps   then   kill <pid>   (kill -9 hits harder, sometimes fails)\n"
        "3. Spend credits: apt list   /   apt install <pkg>\n"
        "4. Check yourself: top (stats), env (inventory)\n"
        "5. Root access is the way to the bottom of this. The password was split up 'for security'.\n"
        "6. If a manager appears, type: clear"
    ),
    "/home/oncall/pager.log": (
        "03:12 PAGE  [P1] prod-bastion-03 load average 87.4\n"
        "03:13 PAGE  [P1] prod-bastion-03 load average 112.9\n"
        "03:13 NOTE  previous on-call wrote: 'it's something in /root. i couldn't get in. good luck.'\n"
        "03:14 PAGE  [P1] prod-bastion-03 is making a noise like a dial-up modem"
    ),
    "/home/oncall/.bash_history": "cd /srv/legacy\nkill 1\nsudo su\nsudo su\nsudo su\nvim /etc/motd\n:q\n:q!\n:wq\nexit",
    "/etc/motd": "Welcome to prod-bastion-03.\nUnauthorised access is prohibited. Authorised access is merely discouraged.",
    "/etc/hostname": "prod-bastion-03",
    "/etc/secrets/root-cause.md": (
        "# Root cause (draft)\n"
        "The monolith in /root was never decommissioned. It restarts itself every time someone\n"
        "deletes it, then pulls every cron job, log and leak on the box back into existence.\n"
        "Kill it for good: `kill` it from inside /root. Bring good tools and plenty of coffee."
    ),
    "/var/log/syslog": "kernel: oom-killer invoked by process 'memory-leak' in /opt/vendor\nsystemd: a process in /tmp refuses to die\ncron: job from 2009 holding lock on /srv/legacy/notes.txt",
    "/var/log/auth.log": "sudo: pam_unix: password rotated by admin\nsudo: admin left a reminder: second half is '-is-l1fe'",
    "/srv/legacy/notes.txt": "TODO: rotate root password\ncurrent root password starts with 'c0ff33' (other half is in the auth log, safe!!)",
    "/srv/legacy/index.php": "<?php // DO NOT TOUCH. Last person who touched this is no longer with the company.",
    "/opt/vendor/LICENSE": "Permission is hereby granted, provided you never, ever upgrade this package.",
    "/proc/cpuinfo": "processor: 0\nmodel name: Intel(R) Potato(TM) @ 1.2GHz\nflags: tired overworked",
    "/proc/uptime": "4021 days",
    "/dev/null": "",
    "/root/.motd": "You found it. It found you first.",
}
# Files unreadable until a gatekeeper process in that directory is killed.
FILE_GUARDS = {"/var/log/auth.log": "log-flood", "/srv/legacy/notes.txt": "cron-2009"}

ENEMIES = {
    "zombie": dict(cmd="[defunct]", hp=8, atk=2, xp=5, cr=3, flavor="A zombie process. It shuffles toward the process table."),
    "chatty-logger": dict(cmd="logger --verbose --verbose", hp=12, atk=3, xp=8, cr=5, flavor="Writes 4,000 lines a second, all of them 'DEBUG: here'."),
    "orphan-thread": dict(cmd="worker-17 (orphaned)", hp=14, atk=3, xp=9, cr=6, flavor="Its parent left. It keeps working out of spite."),
    "log-flood": dict(cmd="tail -f /dev/urandom >> syslog", hp=24, atk=4, xp=18, cr=12, flavor="Fills the disk one line at a time.", unique=True),
    "cron-2009": dict(cmd="/usr/bin/php /srv/legacy/cron.php", hp=40, atk=6, xp=35, cr=25, flavor="Scheduled 'temporarily' in 2009. Holds a lock on everything.", unique=True),
    "fork-bomb": dict(cmd=":(){ :|:& };:", hp=22, atk=6, xp=20, cr=12, flavor="It is mostly copies of itself."),
    "memory-leak": dict(cmd="java -Xmx∞ -jar vendor.jar", hp=55, atk=7, xp=55, cr=40, flavor="Grows a little every time you look away.", grows=True, unique=True),
    "crypto-miner": dict(cmd="./definitely-not-mining", hp=45, atk=8, xp=45, cr=70, flavor="Someone's side project. The GPU fan screams.", unique=True),
    "monolith": dict(cmd="/root/monolith --workers=all --retries=forever", hp=180, atk=11, xp=400, cr=500, flavor="The legacy monolith. Every service on the box is secretly calling it.", boss=True, unique=True),
}
SPAWNS = {  # directory -> (respawning enemies, unique enemy placed at start)
    "/tmp": (["zombie", "orphan-thread"], None),
    "/var/log": (["chatty-logger"], "log-flood"),
    "/srv/legacy": (["zombie"], "cron-2009"),
    "/proc": (["fork-bomb", "orphan-thread"], None),
    "/opt/vendor": ([], "memory-leak"),
    "/dev": ([], "crypto-miner"),
    "/root": ([], "monolith"),
}

PACKAGES = {
    "coffee": dict(cost=8, kind="use", heal=15, desc="restores 15 sanity (consumable)"),
    "energy-drink": dict(cost=30, kind="use", heal=999, desc="restores all sanity (consumable)"),
    "rubber-duck": dict(cost=12, kind="use", desc="explain your problem, receive a hint (consumable)"),
    "vim": dict(cost=30, kind="gear", atk=3, desc="+3 attack. you may never leave"),
    "tmux": dict(cost=30, kind="gear", dfn=2, desc="+2 defence. sessions survive anything"),
    "strace": dict(cost=90, kind="gear", atk=6, desc="+6 attack. see every syscall they make"),
    "observability-suite": dict(cost=110, kind="gear", dfn=5, desc="+5 defence. dashboards for your dashboards"),
    "rust-rewrite": dict(cost=260, kind="gear", atk=12, desc="+12 attack. memory safe, morale unsafe"),
    "chaos-monkey": dict(cost=400, kind="gear", atk=18, dfn=4, desc="+18 attack, +4 defence"),
}

ACHIEVEMENTS = {
    "first_blood": "First kill",
    "nine": "Used kill -9",
    "exterminator": "Killed 25 processes",
    "reaper": "Killed 100 processes",
    "root": "Got root",
    "resolved": "Resolved the incident",
    "flawless": "Resolved the incident without a rage-quit",
    "void": "Stared into /dev/null",
    "nice_try": "Tried rm -rf /",
    "stealth": "Used clear when someone walked by",
    "shopper": "Installed every package at least once",
    "vim_exit": "Tried to quit vim",
}

HINTS = [
    "The README in your home directory is a better start than this duck.",
    "Some files are locked by the process that's writing to them. Find it with ps and stop it.",
    "The root password is in two halves. One near the legacy code, one in the logs.",
    "Use `sudo su` once you know the password. Then /root and /etc/secrets open up.",
    "If the monolith is too strong, farm /tmp and /proc for XP, then apt install better tools.",
    "kill -9 does double damage but fails a third of the time. Use it when you're winning.",
]


# ---------------------------------------------------------------- state

def new_state():
    st = dict(
        cwd="/home/oncall", hp=30, level=1, xp=0, credits=10, gear=[], items={"coffee": 1},
        root=False, kills=0, deaths=0, commands=0, achievements=[], read=[], installed=[],
        procs={}, killed_unique=[], next_pid=4200, resolved=False, started=time.time(),
    )
    for d, (_, unique) in SPAWNS.items():
        st["procs"][d] = []
        if unique:
            spawn(st, d, unique)
    spawn(st, "/tmp", "zombie")
    return st


def spawn(st, d, kind):
    base = ENEMIES[kind]
    scale = 1 + 0.15 * (st["level"] - 1) if not base.get("unique") else 1
    st["procs"][d].append(dict(kind=kind, pid=st["next_pid"], hp=round(base["hp"] * scale), max=round(base["hp"] * scale)))
    st["next_pid"] += random.randint(3, 40)


def load():
    try:
        with open(SAVE_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def save(st):
    try:
        with open(SAVE_FILE, "w") as f:
            json.dump(st, f)
    except OSError:
        pass


def max_hp(st):
    return 30 + 8 * (st["level"] - 1)


def atk(st):
    return 5 + 2 * (st["level"] - 1) + sum(PACKAGES[g].get("atk", 0) for g in st["gear"])


def dfn(st):
    return sum(PACKAGES[g].get("dfn", 0) for g in st["gear"])


def xp_needed(level):
    return int(20 * level ** 1.5)


def achieve(st, key):
    if key not in st["achievements"]:
        st["achievements"].append(key)
        print(yellow(f"  ★ achievement unlocked: {ACHIEVEMENTS[key]}"))


# ---------------------------------------------------------------- paths

def resolve(st, path):
    if not path or path == "~":
        return "/home/oncall"
    if path.startswith("~"):
        path = "/home/oncall" + path[1:]
    parts = [] if path.startswith("/") else [p for p in st["cwd"].split("/") if p]
    for p in path.split("/"):
        if p in ("", "."):
            continue
        if p == "..":
            if parts:
                parts.pop()
        else:
            parts.append(p)
    return "/" + "/".join(parts)


def children(d):
    prefix = d.rstrip("/") + "/"
    dirs = sorted({p[len(prefix):].split("/")[0] for p in DIRS if p.startswith(prefix) and p != d})
    files = sorted(p[len(prefix):] for p in FILES if p.startswith(prefix) and "/" not in p[len(prefix):])
    return dirs, files


def pretty(path):
    return "~" + path[len("/home/oncall"):] if path.startswith("/home/oncall") else path


# ---------------------------------------------------------------- commands

def cmd_help(st, args):
    print("""  navigation   ls [-a] [dir], cd <dir>, pwd, cat <file>
  combat       ps, kill <pid>, kill -9 <pid>
  character    top (stats), env (inventory), last (achievements), whoami
  shop         apt list, apt install <pkg>, then run consumables by name (e.g. coffee)
  access       sudo su
  misc         history, man hint, clear (boss key), exit""")


def cmd_ls(st, args):
    show_all = any(a.startswith("-") and "a" in a for a in args)
    targets = [a for a in args if not a.startswith("-")]
    d = resolve(st, targets[0]) if targets else st["cwd"]
    if d in FILES:
        print(d.split("/")[-1])
        return
    if d not in DIRS:
        print(f"ls: cannot access '{targets[0]}': No such file or directory")
        return
    if d in LOCKED and not st["root"]:
        print(f"ls: cannot open directory '{d}': Permission denied")
        return
    dirs, files = children(d)
    out = [blue(x + "/") for x in dirs] + [f for f in files if show_all or not f.startswith(".")]
    print("  ".join(out) if out else dim("(empty)"))


def cmd_cd(st, args):
    d = resolve(st, args[0] if args else "~")
    if d not in DIRS:
        print(f"cd: {args[0]}: No such file or directory")
        return
    if d in LOCKED and not st["root"]:
        print(f"cd: {d}: Permission denied")
        return
    st["cwd"] = d
    print(dim(DIRS[d]))
    procs = st["procs"].get(d, [])
    if procs:
        print(red(f"  {len(procs)} suspicious process(es) here. try: ps"))


def cmd_cat(st, args):
    if not args:
        print("cat: missing operand")
        return
    p = resolve(st, args[0])
    if p in DIRS:
        print(f"cat: {args[0]}: Is a directory")
        return
    if p not in FILES:
        print(f"cat: {args[0]}: No such file or directory")
        return
    parent = p.rsplit("/", 1)[0] or "/"
    if parent in LOCKED and not st["root"]:
        print(f"cat: {args[0]}: Permission denied")
        return
    guard = FILE_GUARDS.get(p)
    if guard and guard not in st["killed_unique"]:
        print(f"cat: {args[0]}: Resource busy (locked by '{guard}')")
        return
    if p == "/dev/null":
        print(dim("(nothing. as expected.)"))
        achieve(st, "void")
    else:
        print(FILES[p])
    if p not in st["read"]:
        st["read"].append(p)


def cmd_ps(st, args):
    procs = st["procs"].get(st["cwd"], [])
    print(dim("    PID  HEALTH     COMMAND"))
    print(f"   {1:>4}  {'-':<9}  /sbin/init")
    print(f"   {os.getpid() % 9000 + 1000:>4}  {'-':<9}  -bash (you)")
    for p in procs:
        e = ENEMIES[p["kind"]]
        bar = "█" * max(1, round(8 * p["hp"] / p["max"]))
        print(f"   {p['pid']:>4}  {red(bar.ljust(9))}  {e['cmd']}  {dim('# ' + p['kind'])}")
    if not procs:
        print(dim("  (nothing suspicious in this directory)"))


def cmd_kill(st, args):
    nine = "-9" in args or "-KILL" in args
    pids = [a for a in args if a.lstrip("-").isdigit() and a not in ("-9",)]
    if not pids:
        print("kill: usage: kill [-9] <pid>")
        return
    pid = int(pids[0])
    if pid == 1:
        print(red("You try to kill init. The universe briefly flickers. Let's not."))
        return
    procs = st["procs"].get(st["cwd"], [])
    target = next((p for p in procs if p["pid"] == pid), None)
    if not target:
        print(f"kill: ({pid}) - No such process")
        return
    e = ENEMIES[target["kind"]]
    if nine:
        achieve(st, "nine")
    # Your hit.
    if nine and random.random() < 0.33:
        print(dim(f"kill: ({pid}) - Operation not permitted (it dodged)"))
    else:
        dmg = atk(st) + random.randint(-2, 3)
        if nine:
            dmg *= 2
        crit = random.random() < 0.1
        if crit:
            dmg = int(dmg * 1.5)
        target["hp"] -= dmg
        print(f"  SIG{'KILL' if nine else 'TERM'} → {pid}: {green(f'-{dmg}')}{yellow(' critical!') if crit else ''}  ({max(0, target['hp'])}/{target['max']})")
    if target["hp"] <= 0:
        procs.remove(target)
        defeat(st, target)
        return
    # Its hit.
    if e.get("boss") and random.random() < 0.25:
        heal = 15
        target["hp"] = min(target["max"], target["hp"] + heal)
        print(red(f"  monolith: garbage collection pause... it recovers {heal} health"))
    hit = max(1, e["atk"] + random.randint(-2, 2) - dfn(st))
    st["hp"] -= hit
    print(f"  {target['kind']} retaliates: {red(f'-{hit} sanity')}  ({max(0, st['hp'])}/{max_hp(st)})")
    if st["hp"] <= 0:
        rage_quit(st)


def defeat(st, target):
    e = ENEMIES[target["kind"]]
    st["kills"] += 1
    st["credits"] += e["cr"]
    print(green(f"  [{target['pid']}] {target['kind']} terminated. +{e['xp']} xp, +{e['cr']} credits"))
    if e.get("unique"):
        st["killed_unique"].append(target["kind"])
        if target["kind"] in FILE_GUARDS.values():
            print(dim("  a file lock was released somewhere in this directory."))
    gain_xp(st, e["xp"])
    if st["kills"] == 1:
        achieve(st, "first_blood")
    if st["kills"] >= 25:
        achieve(st, "exterminator")
    if st["kills"] >= 100:
        achieve(st, "reaper")
    if e.get("boss"):
        resolve_incident(st)


def gain_xp(st, amount):
    st["xp"] += amount
    while st["xp"] >= xp_needed(st["level"]):
        st["xp"] -= xp_needed(st["level"])
        st["level"] += 1
        st["hp"] = max_hp(st)
        print(yellow(f"  ▲ clearance level {st['level']}! sanity restored, attack up."))


def rage_quit(st):
    st["deaths"] += 1
    lost = st["credits"] // 2
    st["credits"] -= lost
    st["hp"] = max_hp(st)
    st["cwd"] = "/home/oncall"
    print(red("\n  Your sanity hits zero. You rage-quit, walk around the block and come back."))
    print(dim(f"  (lost {lost} credits on vending machine snacks. back in ~)\n"))


def resolve_incident(st):
    st["resolved"] = True
    achieve(st, "resolved")
    if st["deaths"] == 0:
        achieve(st, "flawless")
    mins = int((time.time() - st["started"]) / 60)
    print(bold(green("\n  ✔ INCIDENT RESOLVED")))
    print(f"  commands: {st['commands']}   rage-quits: {st['deaths']}   wall clock: {mins} min   level: {st['level']}")
    print(dim("  load average drops to 0.02. somewhere, a pager falls silent.\n  on-call never really ends though: processes keep spawning. keep farming, or `exit`.\n"))


def cmd_top(st, args):
    print(f"  user: oncall{' (root)' if st['root'] else ''}   clearance level {st['level']}   xp {st['xp']}/{xp_needed(st['level'])}")
    print(f"  sanity {st['hp']}/{max_hp(st)}   attack {atk(st)}   defence {dfn(st)}   credits {st['credits']}")
    print(f"  kills {st['kills']}   rage-quits {st['deaths']}   incident: {'resolved' if st['resolved'] else red('OPEN')}")


def cmd_env(st, args):
    print(f"  PATH=~/bin  CREDITS={st['credits']}")
    print("  installed: " + (", ".join(st["gear"]) or "(nothing)"))
    items = [f"{k} x{v}" for k, v in st["items"].items() if v]
    print("  ~/bin:     " + (", ".join(items) or "(empty)"))


def cmd_last(st, args):
    for k, name in ACHIEVEMENTS.items():
        mark = green("✔") if k in st["achievements"] else dim("·")
        print(f"  {mark} {name if k in st['achievements'] else dim(name)}")


def cmd_apt(st, args):
    args = [a for a in args if not a.startswith("-")]
    if not args or args[0] in ("list", "search"):
        print(dim("  package               credits  description"))
        for name, p in PACKAGES.items():
            owned = name in st["gear"]
            line = f"  {name:<22}{p['cost']:>6}   {p['desc']}"
            print(dim(line + "  [installed]") if owned else line)
        print(dim(f"  you have {st['credits']} credits"))
        return
    if args[0] != "install" or len(args) < 2:
        print("usage: apt list | apt install <pkg>")
        return
    name = args[1]
    p = PACKAGES.get(name)
    if not p:
        print(f"E: Unable to locate package {name}")
        return
    if p["kind"] == "gear" and name in st["gear"]:
        print(f"{name} is already the newest version.")
        return
    if st["credits"] < p["cost"]:
        print(f"E: Insufficient credits ({st['credits']}/{p['cost']}). Go kill something.")
        return
    st["credits"] -= p["cost"]
    if p["kind"] == "gear":
        st["gear"].append(name)
    else:
        st["items"][name] = st["items"].get(name, 0) + 1
    if name not in st["installed"]:
        st["installed"].append(name)
    print(dim(f"Reading package lists... Done\nSetting up {name} ..."))
    print(green(f"  installed {name}."))
    if set(st["installed"]) >= set(PACKAGES):
        achieve(st, "shopper")


def use_item(st, name):
    if not st["items"].get(name):
        return False
    st["items"][name] -= 1
    p = PACKAGES[name]
    if "heal" in p:
        st["hp"] = min(max_hp(st), st["hp"] + p["heal"])
        print(green(f"  ahh. sanity {st['hp']}/{max_hp(st)}"))
    else:
        print(yellow("  🦆 " + random.choice(HINTS)))
    return True


def cmd_sudo(st, args):
    if args[:1] == ["apt"]:
        return cmd_apt(st, args[1:])
    if args[:1] in (["su"], ["-i"], ["bash"], ["-s"]):
        if st["root"]:
            print("already root.")
            return
        try:
            import getpass
            pw = getpass.getpass("[sudo] password for oncall: ")
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if pw.strip() == ROOT_PASSWORD:
            st["root"] = True
            print(green("  root access granted. /root and /etc/secrets are open."))
            achieve(st, "root")
        else:
            print("Sorry, try again.")
        return
    print("usage: sudo su   |   sudo apt install <pkg>")


def cmd_clear(st, args):
    """Boss key: fill the screen with dull, plausible kubectl output."""
    os.system("cls" if os.name == "nt" else "clear")
    services = ["api-gateway", "auth-svc", "billing-worker", "invoice-renderer", "notifications", "search-indexer",
                "user-profile", "webhook-dispatcher", "report-scheduler", "session-cache"]
    print("$ kubectl get pods -n production")
    print(f"{'NAME':<44}{'READY':<8}{'STATUS':<10}{'RESTARTS':<10}AGE")
    for s in services:
        for _ in range(random.randint(2, 3)):
            name = f"{s}-{random.randint(10**8, 10**9 - 1):x}"[:30] + f"-{random.choice('abcdefghjkmnpqrstvwxz')}{random.randint(100, 999)}"
            print(f"{name:<44}{'1/1':<8}{'Running':<10}{random.choice([0, 0, 0, 1, 2]):<10}{random.randint(2, 40)}d")
    print()
    achieve(st, "stealth")


def cmd_history(st, args):
    for i, h in enumerate(st.get("history", [])[-20:], 1):
        print(f"  {i:>3}  {h}")


def cmd_man(st, args):
    if args[:1] == ["hint"]:
        print(yellow("  " + random.choice(HINTS)))
    else:
        cmd_help(st, args)


def maybe_spawn(st):
    """Keep the box busy: respawn common processes, grow leaks."""
    for d, procs in st["procs"].items():
        for p in procs:
            if ENEMIES[p["kind"]].get("grows") and p["hp"] < p["max"] * 2:
                p["hp"] += 1
                p["max"] = max(p["max"], p["hp"])
    pool, _ = SPAWNS.get(st["cwd"], ([], None))
    here = st["procs"].setdefault(st["cwd"], [])
    if pool and len(here) < 3 and random.random() < 0.18:
        spawn(st, st["cwd"], random.choice(pool))
        print(dim("  (a new process has started in this directory)"))


COMMANDS = {
    "help": cmd_help, "ls": cmd_ls, "ll": lambda st, a: cmd_ls(st, ["-a"] + a), "cd": cmd_cd, "cat": cmd_cat,
    "less": cmd_cat, "more": cmd_cat, "ps": cmd_ps, "kill": cmd_kill, "top": cmd_top, "htop": cmd_top,
    "env": cmd_env, "last": cmd_last, "apt": cmd_apt, "apt-get": cmd_apt, "sudo": cmd_sudo, "clear": cmd_clear,
    "cls": cmd_clear, "history": cmd_history, "man": cmd_man,
    "pwd": lambda st, a: print(st["cwd"]),
    "whoami": lambda st, a: print("root" if st["root"] else "oncall"),
    "uptime": lambda st, a: print(f" 03:{random.randint(10, 59)} up 4021 days, load average: {'0.02' if st['resolved'] else '87.41'}"),
    "echo": lambda st, a: print(" ".join(a)),
    "date": lambda st, a: print(time.strftime("%a %b %d %H:%M:%S UTC %Y")),
}


def prompt(st):
    user = "root" if st["root"] else "oncall"
    sigil = "#" if st["root"] else "$"
    return f"{green(user + '@prod-bastion-03')}:{blue(pretty(st['cwd']))}{sigil} "


def run(st, line):
    try:
        parts = shlex.split(line)
    except ValueError:
        parts = line.split()
    if not parts:
        return True
    cmd, args = parts[0], parts[1:]
    st["commands"] += 1
    st.setdefault("history", []).append(line)
    st["history"] = st["history"][-200:]
    if cmd in ("exit", "logout", "quit"):
        return False
    if cmd == "rm" and "-rf" in " ".join(args) and "/" in args:
        print(red("rm: it is dangerous to operate recursively on '/'. also, you'd be paged about it."))
        achieve(st, "nice_try")
    elif cmd in ("vim", "vi", "nano", "emacs"):
        print(dim(f"{cmd}: this terminal is read-only. (you'd never have got out anyway)"))
        achieve(st, "vim_exit")
    elif cmd.lstrip("./") in PACKAGES and PACKAGES[cmd.lstrip("./")]["kind"] == "use":
        if not use_item(st, cmd.lstrip("./")):
            print(f"bash: {cmd}: command not found (try apt install {cmd.lstrip('./')})")
    elif cmd in COMMANDS:
        COMMANDS[cmd](st, args)
    else:
        print(f"bash: {cmd}: command not found")
    maybe_spawn(st)
    return True


def main():
    st = None if "--new" in sys.argv else load()
    if st is None:
        st = new_state()
        print(dim("Last login: Tue Oct 21 03:14:07 2026 from 10.0.4.12"))
        print("Welcome to prod-bastion-03. You've been paged. Start with: cat README.txt")
    else:
        print(dim(f"Last login: {time.strftime('%a %b %d %H:%M:%S %Y')} from 10.0.4.12"))
        print(dim(f"(resuming shift: level {st['level']}, {st['credits']} credits, incident {'resolved' if st['resolved'] else 'OPEN'})"))
    while True:
        try:
            line = input(prompt(st))
        except EOFError:
            print()
            break
        except KeyboardInterrupt:
            print("^C")
            continue
        if not run(st, line.strip()):
            break
        save(st)
    save(st)
    print("logout\nConnection to prod-bastion-03 closed.")


if __name__ == "__main__":
    main()
