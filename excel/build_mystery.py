#!/usr/bin/env python3
"""Generate Q3_Expense_Reconciliation.xlsx — a fraud mystery hidden in a dull finance workbook.

    pip install openpyxl
    python3 build_mystery.py            # writes Q3_Expense_Reconciliation.xlsx next to this script

The player works out (1) the shell vendor, (2) the employee behind it, (3) how much was taken,
and types the answers into the Sign-off sheet, which checks them with obfuscated formulas.
Change SEED to get a different (but equally solvable) data set; the story clues stay the same.

SPOILERS below — the solution is defined in this file.
"""
import datetime as dt
import os
import random

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

SEED = 2026
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Q3_Expense_Reconciliation.xlsx")
rng = random.Random(SEED)

# ---------------------------------------------------------------- the solution
SHELL_VENDOR = ("V-1187", "Northbridge Strategic Advisory LLC", "Unit 12, 88 Harlow Street, Leeds LS6 2QA")
CULPRIT = ("E-1027", "Gavin", "Reyes", "Finance", "AP Specialist")
DECOY = ("E-1013", "Dana", "Whitfield", "Sales", "Account Executive")
SHARED_LAST4 = "4471"
VENDOR_CREATED = dt.datetime(2026, 6, 30, 23, 14, 52)
SHELL_AMOUNTS = [4875.00, 4920.50, 4790.25, 4985.00, 4650.75, 4899.99, 4712.40, 4960.00, 4833.60, 4995.00]
SHELL_TOTAL = round(sum(SHELL_AMOUNTS), 2)

FIRST = ["Aisha", "Ben", "Carla", "Dev", "Elena", "Femi", "Grace", "Hiro", "Isla", "Jonas", "Kemi", "Liam", "Maya", "Noah",
         "Olga", "Priya", "Quinn", "Rosa", "Sam", "Tariq", "Uma", "Victor", "Wen", "Ximena", "Yusuf", "Zoe", "Arjun", "Bea",
         "Cole", "Dina", "Eli", "Fay", "Gus", "Hana", "Ivan", "Jade", "Kofi", "Lena"]
LAST = ["Okafor", "Chen", "Duarte", "Patel", "Weiss", "Novak", "Moreau", "Silva", "Kowalski", "Tanaka", "Byrne", "Haddad",
        "Lindqvist", "Mensah", "Romero", "Schmidt", "Abara", "Fischer", "Ivanova", "Kaur", "Larsen", "Nakamura", "Osei",
        "Quint", "Rossi", "Sato", "Torres", "Varga", "Walsh", "Yilmaz", "Zielinski", "Brandt", "Costa", "Diaz", "Engel",
        "Frost", "Gallo", "Holm"]
DEPTS = {
    "Finance": ["Controller", "Financial Analyst", "AP Specialist", "Payroll Lead"],
    "Engineering": ["Software Engineer", "Engineering Manager", "SRE", "QA Engineer"],
    "Sales": ["Account Executive", "Sales Manager", "SDR"],
    "Marketing": ["Marketing Manager", "Content Lead", "Designer"],
    "Operations": ["Ops Manager", "Office Manager", "Procurement Lead"],
    "Facilities": ["Facilities Technician", "Facilities Manager"],
    "People": ["HR Partner", "Recruiter"],
}
WINGS = {"Finance": "HQ-3F Finance", "Engineering": "HQ-2F Eng", "Sales": "HQ-1F Sales", "Marketing": "HQ-1F Sales",
         "Operations": "HQ-G Ops", "Facilities": "HQ-B1 Plant", "People": "HQ-G Ops"}

LEGIT_VENDORS = [
    ("Contoso Office Supply", "14 Mill Lane, Bradford BD1 4AA", "Office supplies"),
    ("Fabrikam Cloud Hosting", "1 Data Park, Slough SL1 4XX", "Software & hosting"),
    ("Northbridge Logistics Ltd", "Unit 4, Northbridge Ind. Est., Wakefield WF2 7AB", "Shipping"),
    ("Tailspin Travel", "200 Kings Road, London SW3 5UE", "Travel"),
    ("Woodgrove Catering", "9 Market St, Leeds LS1 6DT", "Meals & entertainment"),
    ("Litware Licensing", "Suite 300, 50 Canal Rd, Manchester M1 3AB", "Software & hosting"),
    ("Adatum Facilities Services", "Plot 7, Ring Rd, Leeds LS12 6HR", "Facilities"),
    ("Proseware Training", "33 College Green, Bristol BS1 5TB", "Training"),
    ("Wide World Couriers", "Hangar 2, Leeds Bradford Airport LS19 7TU", "Shipping"),
    ("Fourth Coffee Roasters", "3 Arches Yard, Leeds LS11 5RB", "Meals & entertainment"),
    ("Coho Print & Design", "18 Dock St, Hull HU1 3DL", "Marketing"),
    ("Margie's Travel", "71 Station Rd, York YO24 1AB", "Travel"),
    ("Alpine Ski House Events", "2 Alpine Way, Harrogate HG1 2RT", "Events"),
    ("Blue Yonder Airlines", "Terminal 1, Manchester Airport M90 1QX", "Travel"),
    ("Trey Research Partners", "Level 9, 1 Park Row, Leeds LS1 5AB", "Consulting"),
    ("Lucerne Publishing", "12 Bridge St, Cambridge CB2 1UF", "Marketing"),
    ("Humongous Insurance", "1 Insurance Sq, Norwich NR1 3NG", "Insurance"),
    ("Graphic Design Institute", "45 Albion St, Leeds LS1 6HX", "Marketing"),
    ("Southridge Video", "8 Studio Way, Salford M50 2EQ", "Marketing"),
    ("City Power & Light", "Energy House, Leeds LS2 8JS", "Utilities"),
    ("Relecloud Analytics", "Floor 4, 10 Wellington Pl, Leeds LS1 4AP", "Consulting"),
    ("VanArsdel Furniture", "Unit 9, Thorp Arch Est., Wetherby LS23 7BJ", "Facilities"),
]

# ---------------------------------------------------------------- styles
HEAD_FILL = PatternFill("solid", fgColor="1F4E78")
HEAD_FONT = Font(bold=True, color="FFFFFF")
TITLE_FONT = Font(bold=True, size=14, color="1F4E78")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")
THIN = Side(style="thin", color="BFBFBF")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MONEY = '#,##0.00;[Red]-#,##0.00'


def header(ws, row, titles, widths=None):
    for i, t in enumerate(titles, 1):
        c = ws.cell(row=row, column=i, value=t)
        c.fill, c.font, c.alignment = HEAD_FILL, HEAD_FONT, Alignment(horizontal="center", vertical="center")
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def text_checksum(s):
    """Mirror of the Excel formula: sum(code(char_i) * i) over UPPER(answer) with dashes removed."""
    s = s.upper().replace("-", "").strip()
    return sum(ord(ch) * (i + 1) for i, ch in enumerate(s))


def text_check_formula(cell, target):
    inner = f'UPPER(SUBSTITUTE(TRIM({cell}),"-",""))'
    rows = f'ROW(INDIRECT("1:"&LEN({inner})))'
    return (f'=IF(LEN({inner})=0,"",IF(SUMPRODUCT(CODE(MID({inner},{rows},1))*{rows})={text_checksum(target)},'
            f'"✔ Reconciled","✖ Variance"))')


def amount_check_formula(cell, amount):
    key = (round(amount * 100) * 7) % 100003
    return f'=IF({cell}="","",IF(MOD(ROUND({cell}*100,0)*7,100003)={key},"✔ Reconciled","✖ Variance"))'


def build():
    wb = Workbook()

    # ------------------------------------------------ employees
    employees = []
    used_names = set()
    for i in range(40):
        eid = f"E-{1001 + i}"
        if eid == CULPRIT[0]:
            employees.append(dict(id=eid, first=CULPRIT[1], last=CULPRIT[2], dept=CULPRIT[3], title=CULPRIT[4]))
            continue
        if eid == DECOY[0]:
            employees.append(dict(id=eid, first=DECOY[1], last=DECOY[2], dept=DECOY[3], title=DECOY[4]))
            continue
        while True:
            f, l = rng.choice(FIRST), rng.choice(LAST)
            if (f, l) not in used_names:
                used_names.add((f, l))
                break
        dept = rng.choice(list(DEPTS))
        employees.append(dict(id=eid, first=f, last=l, dept=dept, title=rng.choice(DEPTS[dept])))
    for e in employees:
        e["badge"] = f"B-{rng.randint(20000, 89999)}"
        e["last4"] = SHARED_LAST4 if e["id"] in (CULPRIT[0], DECOY[0]) else f"{rng.randint(0, 9999):04d}"
        while e["last4"] == SHARED_LAST4 and e["id"] not in (CULPRIT[0], DECOY[0]):
            e["last4"] = f"{rng.randint(0, 9999):04d}"
        e["start"] = dt.date(rng.randint(2015, 2025), rng.randint(1, 12), rng.randint(1, 28))
    # Managers: first person seen in each department manages the rest.
    first_in = {}
    for e in employees:
        first_in.setdefault(e["dept"], e["id"])
        e["manager"] = "E-1000" if first_in[e["dept"]] == e["id"] else first_in[e["dept"]]
    by_id = {e["id"]: e for e in employees}
    finance = [e for e in employees if e["dept"] == "Finance"]
    approvers = [e["id"] for e in employees if e["title"] in ("Controller", "Engineering Manager", "Sales Manager", "Ops Manager", "Marketing Manager", "Facilities Manager")] or [employees[0]["id"]]
    vp = "E-1000"

    # ------------------------------------------------ vendors
    vendors = []
    for i, (name, addr, cat) in enumerate(LEGIT_VENDORS):
        vid = f"V-{1100 + i * 4 + rng.randint(0, 3)}"
        created = dt.datetime(rng.randint(2016, 2025), rng.randint(1, 12), rng.randint(1, 28), rng.randint(9, 17), rng.randint(0, 59), rng.randint(0, 59))
        vendors.append(dict(id=vid, name=name, addr=addr, cat=cat, last4=f"{rng.randint(0, 9999):04d}", created=created,
                            by=rng.choice(finance)["id"] if rng.random() < 0.8 else "SYSTEM-IMPORT", terms=rng.choice(["Net 30", "Net 30", "Net 45", "Net 60"])))
    vendors.append(dict(id=SHELL_VENDOR[0], name=SHELL_VENDOR[1], addr=SHELL_VENDOR[2], cat="Consulting", last4=SHARED_LAST4,
                        created=VENDOR_CREATED, by="SYSTEM-IMPORT", terms="Net 7"))
    vendors.sort(key=lambda v: v["id"])
    legit = [v for v in vendors if v["id"] != SHELL_VENDOR[0]]

    # ------------------------------------------------ ledger
    rows = []
    q3_days = [dt.date(2026, 7, 1) + dt.timedelta(days=d) for d in range(92)]
    weekdays = [d for d in q3_days if d.weekday() < 5]
    po_counter = 88000
    for _ in range(230):
        v = rng.choice(legit)
        emp = rng.choice(employees)
        r = rng.random()
        amount = round(rng.uniform(12, 450), 2) if r < 0.55 else round(rng.uniform(450, 3200), 2) if r < 0.9 else round(rng.uniform(5200, 18000), 2)
        approver = vp if amount >= 5000 else rng.choice([a for a in approvers if a != emp["id"]] or approvers)
        po = ""
        if amount > 1000:
            po_counter += rng.randint(1, 9)
            po = f"PO-{po_counter}"
        rows.append([rng.choice(weekdays), emp["id"], emp["dept"], v["id"], v["cat"], amount, po, approver,
                     rng.choice(["", "", "Q3 renewal", "Team offsite", "Client meeting", "Monthly invoice", "Replacement", "Annual licence", "Ad hoc"])])
    # Two honest near-threshold payments, so "just under $5k" alone isn't the answer.
    for amt in (4950.00, 4880.00):
        emp = rng.choice(employees)
        po_counter += 3
        rows.append([rng.choice(weekdays), emp["id"], emp["dept"], legit[0]["id"], legit[0]["cat"], amt, f"PO-{po_counter}", rng.choice(approvers), "Bulk furniture order"])
    # The fraud: split under the VP threshold, no PO, submitted under various people's names.
    submitters = [e for e in employees if e["dept"] in ("Operations", "Finance", "Marketing") and e["id"] != CULPRIT[0]]
    shell_days = sorted(rng.sample(weekdays, len(SHELL_AMOUNTS)))
    for day, amt in zip(shell_days, SHELL_AMOUNTS):
        emp = rng.choice(submitters)
        rows.append([day, emp["id"], emp["dept"], SHELL_VENDOR[0], "Consulting", amt, "", rng.choice([a for a in approvers if a != emp["id"]] or approvers),
                     rng.choice(["Strategic advisory", "Advisory retainer", "Phase 2 advisory", "Workshop facilitation"])])
    rows.sort(key=lambda r: r[0])

    # ------------------------------------------------ badge log (late June / early July)
    badge = []
    log_days = [dt.date(2026, 6, 24) + dt.timedelta(days=d) for d in range(14)]
    for day in log_days:
        if day.weekday() >= 5:
            continue
        for e in rng.sample(employees, 26):
            if e["id"] == DECOY[0] and dt.date(2026, 6, 26) <= day <= dt.date(2026, 7, 3):
                continue  # Dana was on PTO — absent from the log.
            tin = dt.datetime.combine(day, dt.time(rng.randint(7, 10), rng.randint(0, 59)))
            tout = tin + dt.timedelta(hours=rng.randint(7, 9), minutes=rng.randint(0, 59))
            badge.append([e["badge"], day, tin.time(), tout.time(), WINGS[e["dept"]]])
    # Late-night entries on the night the vendor was created.
    night = dt.date(2026, 6, 30)
    badge.append([by_id[CULPRIT[0]]["badge"], night, dt.time(22, 51), dt.time(23, 38), "HQ-3F Finance"])
    fac = [e for e in employees if e["dept"] == "Facilities"] or employees[:2]
    for e in fac[:2]:
        badge.append([e["badge"], night, dt.time(21, 5), dt.time(22, 40), "HQ-B1 Plant"])
    eng = [e for e in employees if e["dept"] == "Engineering"][:1]
    for e in eng:
        badge.append([e["badge"], night, dt.time(19, 2), dt.time(23, 55), "HQ-2F Eng"])
    badge.sort(key=lambda b: (b[1], b[2]))

    # ================================================ sheets
    ws = wb.active
    ws.title = "Procedure"
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 110
    ws["B2"] = "Q3 FY26 Expense Reconciliation"
    ws["B2"].font = TITLE_FONT
    lines = [
        ("Status", "OPEN — unexplained variance flagged by external audit. Sign-off required before quarter close."),
        ("", ""),
        ("Background", "Audit flagged that Q3 'Consulting' spend is materially above forecast. Somebody has been paying a vendor that"),
        ("", "should not exist. Identify the vendor, the employee responsible, and the total amount paid out in Q3."),
        ("", ""),
        ("Policy AP-4.2", "Any single payment of $5,000.00 or more requires VP approval (approver E-1000)."),
        ("Policy AP-4.3", "Every payment over $1,000.00 must reference a purchase order (PO #)."),
        ("Policy AP-7.1", "Vendor bank details may not match any employee's payroll account."),
        ("IT notice 19", "Vendor master records can only be created from the on-premises finance terminal (HQ-3F Finance)."),
        ("", "Remote/VPN access to the vendor master is disabled. Batch loads appear as 'SYSTEM-IMPORT'."),
        ("", ""),
        ("Sheets", "Ledger — Q3 payments.  Vendors — vendor master.  Employees — HR extract.  Badge_Log — door access, late Jun/early Jul."),
        ("", "Sign-off — enter your findings; the status column checks them."),
        ("", ""),
        ("Tips", "Filters are on every header row. SUMIF, COUNTIF, XLOOKUP/VLOOKUP and sorting are your friends."),
        ("", "Stuck? Auditors leave notes on hidden sheets. (Right-click a sheet tab → Unhide.)"),
    ]
    for i, (k, v) in enumerate(lines, 4):
        ws.cell(row=i, column=1, value=k).font = Font(bold=True)
        ws.cell(row=i, column=2, value=v)
    ws.column_dimensions["A"].width = 16

    # Ledger
    ws = wb.create_sheet("Ledger")
    header(ws, 1, ["Txn ID", "Date", "Submitted by", "Dept", "Vendor ID", "Category", "Amount", "PO #", "Approved by", "Memo"],
           [10, 12, 13, 13, 11, 22, 13, 11, 12, 24])
    for i, r in enumerate(rows, 2):
        ws.cell(row=i, column=1, value=f"TX-{30000 + (i - 1) * 7}")
        for j, val in enumerate(r, 2):
            c = ws.cell(row=i, column=j, value=val)
            if j == 2:
                c.number_format = "yyyy-mm-dd"
            if j == 7:
                c.number_format = MONEY
    total_row = len(rows) + 3
    ws.cell(row=total_row, column=6, value="Q3 total").font = Font(bold=True)
    ws.cell(row=total_row, column=7, value=f"=SUM(G2:G{len(rows) + 1})").number_format = MONEY
    ws.auto_filter.ref = f"A1:J{len(rows) + 1}"

    # Vendors
    ws = wb.create_sheet("Vendors")
    header(ws, 1, ["Vendor ID", "Vendor name", "Registered address", "Category", "Bank acct (last 4)", "Payment terms", "Created", "Created by"],
           [11, 34, 46, 22, 17, 14, 19, 15])
    for i, v in enumerate(vendors, 2):
        vals = [v["id"], v["name"], v["addr"], v["cat"], v["last4"], v["terms"], v["created"], v["by"]]
        for j, val in enumerate(vals, 1):
            c = ws.cell(row=i, column=j, value=val)
            if j == 7:
                c.number_format = "yyyy-mm-dd hh:mm:ss"
            if j == 5:
                c.number_format = "@"
    ws.auto_filter.ref = f"A1:H{len(vendors) + 1}"

    # Employees
    ws = wb.create_sheet("Employees")
    header(ws, 1, ["Employee ID", "First name", "Last name", "Department", "Title", "Manager ID", "Start date", "Badge ID", "Payroll acct (last 4)"],
           [12, 12, 13, 13, 22, 12, 12, 11, 19])
    for i, e in enumerate(employees, 2):
        vals = [e["id"], e["first"], e["last"], e["dept"], e["title"], e["manager"], e["start"], e["badge"], e["last4"]]
        for j, val in enumerate(vals, 1):
            c = ws.cell(row=i, column=j, value=val)
            if j == 7:
                c.number_format = "yyyy-mm-dd"
            if j == 9:
                c.number_format = "@"
    ws.auto_filter.ref = f"A1:I{len(employees) + 1}"

    # Badge log
    ws = wb.create_sheet("Badge_Log")
    header(ws, 1, ["Badge ID", "Date", "Time in", "Time out", "Door"], [11, 12, 10, 10, 18])
    for i, b in enumerate(badge, 2):
        for j, val in enumerate(b, 1):
            c = ws.cell(row=i, column=j, value=val)
            if j == 2:
                c.number_format = "yyyy-mm-dd"
            if j in (3, 4):
                c.number_format = "hh:mm"
    ws.auto_filter.ref = f"A1:E{len(badge) + 1}"

    # Sign-off
    ws = wb.create_sheet("Sign-off")
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 38
    ws.column_dimensions["C"].width = 26
    ws.column_dimensions["D"].width = 18
    ws["B2"] = "Reconciliation sign-off"
    ws["B2"].font = TITLE_FONT
    ws["B3"] = "Enter findings in the yellow cells. Status updates automatically."
    ws["B3"].font = Font(italic=True, color="7F7F7F")
    for j, t in enumerate(["Finding", "Your answer", "Status"], 2):
        c = ws.cell(row=5, column=j, value=t)
        c.fill, c.font = HEAD_FILL, HEAD_FONT
    prompts = [
        ("Shell vendor (Vendor ID, e.g. V-1234)", text_check_formula("C6", SHELL_VENDOR[0])),
        ("Responsible employee (Employee ID)", text_check_formula("C7", CULPRIT[0])),
        ("Total paid to shell vendor in Q3 ($)", amount_check_formula("C8", SHELL_TOTAL)),
    ]
    for i, (label, formula) in enumerate(prompts, 6):
        ws.cell(row=i, column=2, value=label).border = BOX
        inp = ws.cell(row=i, column=3)
        inp.fill, inp.border = INPUT_FILL, BOX
        st = ws.cell(row=i, column=4, value=formula)
        st.border = BOX
        st.font = Font(bold=True)
    ws["C8"].number_format = MONEY
    ws["B10"] = "Overall"
    ws["B10"].font = Font(bold=True)
    ws["C10"] = ('=IF(COUNTIF(D6:D8,"✔*")=3,"CASE CLOSED — variance explained. Nice work, auditor.",'
                 'IF(COUNTIF(D6:D8,"✖*")>0,"Something doesn\'t reconcile yet.","Awaiting findings…"))')
    ws["C10"].font = Font(bold=True, color="1F4E78")
    dv = DataValidation(type="decimal", operator="greaterThan", formula1="0", allow_blank=True)
    ws.add_data_validation(dv)
    dv.add("C8")
    wb.move_sheet("Sign-off", offset=-4)

    # Hidden hints
    ws = wb.create_sheet("_audit_notes")
    ws.sheet_state = "hidden"
    ws.column_dimensions["A"].width = 10
    ws.column_dimensions["B"].width = 120
    hints = [
        ("Hint 1", "Filter the Ledger for payments over $1,000 with no PO #. Which vendor keeps coming up — and how close to $5,000 are they?"),
        ("Hint 2", "Look that vendor up in Vendors. When and how was it created? Compare its bank last-4 against the Employees sheet."),
        ("Hint 3", "Two employees share that last-4. IT notice 19 says vendors are created on-site. Who badged into HQ-3F Finance that night?"),
        ("Hint 4", "Total = SUMIF(Ledger!E:E, <vendor id>, Ledger!G:G)."),
    ]
    for i, (k, v) in enumerate(hints, 2):
        ws.cell(row=i, column=1, value=k).font = Font(bold=True)
        ws.cell(row=i, column=2, value=v)

    wb.active = 0
    wb.save(OUT)
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"wrote {path}")
    print("(answers are in this script's SOLUTION constants — don't peek)")
