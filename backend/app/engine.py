"""Pure domain logic for OTO CUAN.

Every function here takes plain data and returns plain data, so the same rules
run in the API, in tests and (mirrored in mobile/src/engine.ts) in the app's
offline demo mode. Figures are estimates from user input, never a credit decision.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from math import ceil
from typing import Any

PARAMS_VERSION = "demo-2026-10"
RULES_VERSION = "rules-1.0"
FLAT_RATE_ANNUAL = 0.06          # illustrative only, not an official OTO Finance rate
STRESS_INCOME_DROP = 0.10
GOAL_THRESHOLD = 0.50
LATTE_CYCLE = 10
TENORS = (36, 48, 60)
MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
DAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

CATEGORIES = {
    "makan": ("Makan & nongkrong", "#FF7702"),
    "rumah": ("Kos & rumah", "#0088A3"),
    "transport": ("Transportasi", "#5FB8CB"),
    "tagihan": ("Tagihan", "#FCC025"),
    "belanja": ("Belanja", "#8E6CC8"),
    "lain": ("Lainnya", "#A9B8BE"),
}
REWARDS = [
    {"code": "voucher_kopi", "title": "Voucher kopi", "latte_required": 10},
    {"code": "cashback_saldo", "title": "Cashback saldo", "latte_required": 20},
    {"code": "tote_bag", "title": "Exclusive tote bag", "latte_required": 30},
]


# ---------------------------------------------------------------- helpers
def month_label(base: date, months_ahead: int) -> str:
    if months_ahead <= 0:
        return "Tercapai"
    idx = base.month - 1 + months_ahead
    return f"{MONTHS_ID[idx % 12]} {base.year + idx // 12}"


def months_to_reach(shortfall: int, monthly: int) -> int:
    if shortfall <= 0:
        return 0
    if monthly <= 0:
        return 999
    return ceil(shortfall / monthly)


# ---------------------------------------------------------------- state
@dataclass
class State:
    profile: dict[str, Any]
    consents: dict[str, bool]
    finance: dict[str, int]                     # net_income, essential_expense, obligations
    budgets: dict[str, int]                     # category_code -> monthly amount
    goals: dict[str, dict[str, Any]]            # 'down_payment' / 'emergency'
    transactions: list[dict[str, Any]] = field(default_factory=list)
    gami: dict[str, Any] = field(default_factory=dict)
    unlocked_rewards: list[str] = field(default_factory=list)
    scenarios: list[dict[str, Any]] = field(default_factory=list)
    notifications: list[dict[str, Any]] = field(default_factory=list)
    reminders: dict[str, bool] = field(default_factory=dict)
    consultations: list[dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------------- finance
def expense_total(state: State) -> int:
    return sum(state.budgets.values())


def cash_left(state: State) -> int:
    f = state.finance
    return f["net_income"] - expense_total(state) - f["obligations"]


def planned_saving(state: State) -> int:
    return sum(g.get("monthly_contribution", 0) for g in state.goals.values())


def safe_to_spend(state: State) -> int:
    return cash_left(state) - planned_saving(state)


def dp_target(goal: dict[str, Any]) -> int:
    return round(goal["vehicle_price"] * goal["dp_percent"] / 100)


def emergency_target(state: State) -> int:
    return state.finance["essential_expense"] * state.goals["emergency"]["months_cover"]


def goal_view(state: State, kind: str, today: date) -> dict[str, Any]:
    g = state.goals[kind]
    target = dp_target(g) if kind == "down_payment" else emergency_target(state)
    saved = g["saved_amount"]
    pct = min(100, round(saved / target * 100)) if target else 0
    months = months_to_reach(target - saved, g["monthly_contribution"])
    return {"kind": kind, "target": target, "saved": saved, "percent": pct,
            "shortfall": max(0, target - saved), "months_left": months,
            "eta": month_label(today, months), "monthly_contribution": g["monthly_contribution"]}


# ---------------------------------------------------------------- planner
def simulate(state: State, tenor: int, stress: bool) -> dict[str, Any]:
    g = state.goals["down_payment"]
    principal = g["vehicle_price"] - dp_target(g)
    monthly = principal * (1 + FLAT_RATE_ANNUAL * tenor / 12) / tenor
    drop = round(state.finance["net_income"] * STRESS_INCOME_DROP) if stress else 0
    left = cash_left(state) - monthly - drop
    level = "menekan" if left < 0 else ("ketat" if left < 500_000 else "longgar")
    return {"tenor_months": tenor, "principal": principal, "monthly_payment": round(monthly),
            "total_payment": round(monthly * tenor), "cash_left": round(left), "stress_test": stress,
            "stress_drop": drop, "level": level, "flat_rate": FLAT_RATE_ANNUAL,
            "params_version": PARAMS_VERSION}


# ---------------------------------------------------------------- gamification
def streak_alive(gami: dict[str, Any], today: date) -> bool:
    last = gami.get("last_saving_date")
    return bool(last) and (today - last).days <= 1


def current_streak(gami: dict[str, Any], today: date) -> int:
    return gami.get("current_streak", 0) if streak_alive(gami, today) else 0


def apply_saving(gami: dict[str, Any], today: date) -> dict[str, Any]:
    """Update latte and daily streak after a Nabung Yuk deposit."""
    g = dict(gami)
    last = g.get("last_saving_date")
    if last == today:
        streak = g.get("current_streak", 0) or 1
    elif last and (today - last).days == 1:
        streak = g.get("current_streak", 0) + 1
    else:
        streak = 1
    g["current_streak"] = streak
    g["longest_streak"] = max(g.get("longest_streak", 0), streak)
    g["last_saving_date"] = today
    g["latte_total"] = g.get("latte_total", 0) + 1
    return g


def newly_unlocked(latte_total: int, unlocked: list[str]) -> list[str]:
    return [r["code"] for r in REWARDS if latte_total >= r["latte_required"] and r["code"] not in unlocked]


def latte_in_cycle(latte_total: int) -> int:
    if latte_total == 0:
        return 0
    rem = latte_total % LATTE_CYCLE
    return LATTE_CYCLE if rem == 0 else rem


def saving_days(transactions: list[dict[str, Any]]) -> set[date]:
    return {t["occurred_on"] for t in transactions if t["type"] == "goal" and t.get("via_nabung_yuk")}


def week_calendar(state: State, today: date, week_offset: int = 0) -> dict[str, Any]:
    days = saving_days(state.transactions)
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    out = []
    for i in range(7):
        d = monday + timedelta(days=i)
        status = "saved" if d in days else ("future" if d > today else ("today" if d == today else "missed"))
        out.append({"date": d.isoformat(), "day": DAYS_ID[i], "num": d.day, "status": status})
    return {"label": f"{['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][monday.month - 1]} {monday.year}",
            "week_offset": week_offset, "days": out}


def gamification_view(state: State, today: date, week_offset: int = 0) -> dict[str, Any]:
    gami = state.gami
    total = gami.get("latte_total", 0)
    cycle = latte_in_cycle(total)
    nxt = next((r for r in REWARDS if r["code"] not in state.unlocked_rewards), None)
    return {
        "streak": current_streak(gami, today), "longest_streak": gami.get("longest_streak", 0),
        "broken": bool(gami.get("last_saving_date")) and not streak_alive(gami, today),
        "saved_today": gami.get("last_saving_date") == today,
        "latte_total": total, "latte_cycle": cycle, "latte_percent": cycle * 10,
        "next_reward": ({**nxt, "progress": min(total, nxt["latte_required"])} if nxt else None),
        "rewards": [{**r, "unlocked": r["code"] in state.unlocked_rewards} for r in REWARDS],
        "calendar": week_calendar(state, today, week_offset),
    }


# ---------------------------------------------------------------- readiness
def readiness(state: State, today: date) -> dict[str, Any]:
    dp = goal_view(state, "down_payment", today)
    ef = goal_view(state, "emergency", today)
    left = cash_left(state)
    good_scenario = any(s["cash_left"] >= 0 for s in state.scenarios)
    data_ok = state.finance["net_income"] > 0
    ind = [
        {"key": "data", "label": "Kelengkapan data", "good": data_ok,
         "value": "Semua bagian terisi" if data_ok else "Pendapatan belum diisi",
         "rule": "Pendapatan, pengeluaran, dan kewajiban sudah diisi."},
        {"key": "cashflow", "label": "Arus kas bulanan", "good": left > 0,
         "value": f"Sisa kas Rp{left:,}".replace(",", "."),
         "rule": "Pendapatan dikurangi pengeluaran dan kewajiban hasilnya positif."},
        {"key": "scenario", "label": "Simulasi cicilan", "good": good_scenario,
         "value": f"{len(state.scenarios)} skenario tersimpan",
         "rule": "Ada skenario tersimpan dengan sisa kas positif setelah cicilan."},
        {"key": "dp", "label": "Progres DP", "good": dp["percent"] >= GOAL_THRESHOLD * 100,
         "value": f"{dp['percent']}% dari target",
         "rule": "DP sudah mencapai minimal 50% dari target."},
        {"key": "emergency", "label": "Dana cadangan", "good": ef["percent"] >= GOAL_THRESHOLD * 100,
         "value": f"{ef['percent']}% dari target",
         "rule": "Dana cadangan mencapai minimal 50% dari target."},
    ]
    count = sum(1 for i in ind if i["good"])
    title = "Siap untuk konsultasi" if count == 5 else ("Sedang membangun kesiapan" if count >= 3 else "Baru mulai")
    return {"indicators": ind, "ready_count": count, "title": title, "rules_version": RULES_VERSION,
            "disclaimer": "Profil ini bukan skor kredit dan bukan jaminan persetujuan."}


def summary_for_consultation(state: State, today: date) -> dict[str, Any]:
    """The only data shared with OTO Finance, and only with explicit consent."""
    r = readiness(state, today)
    return {"cash_left": cash_left(state), "dp": goal_view(state, "down_payment", today),
            "emergency": goal_view(state, "emergency", today),
            "best_scenario": max(state.scenarios, key=lambda s: s["cash_left"], default=None),
            "ready_count": r["ready_count"], "rules_version": RULES_VERSION}


# ---------------------------------------------------------------- full view
def full_view(state: State, today: date, week_offset: int = 0) -> dict[str, Any]:
    exp = expense_total(state)
    cats = [{"code": c, "label": CATEGORIES[c][0], "color": CATEGORIES[c][1], "amount": a,
             "share": round(a / exp * 100) if exp else 0} for c, a in state.budgets.items() if a > 0]
    payday_days = 7
    safe = safe_to_spend(state)
    return {
        "today": today.isoformat(),
        "profile": state.profile, "consents": state.consents, "reminders": state.reminders,
        "finance": {**state.finance, "expense_total": exp, "cash_left": cash_left(state),
                    "planned_saving": planned_saving(state), "safe_to_spend": safe,
                    "safe_per_day": max(0, safe) // payday_days, "days_to_payday": payday_days,
                    "categories": cats},
        "goals": {"down_payment": {**state.goals["down_payment"], **goal_view(state, "down_payment", today)},
                  "emergency": {**state.goals["emergency"], **goal_view(state, "emergency", today)}},
        "transactions": sorted(state.transactions, key=lambda t: (t["occurred_on"], t.get("created_at", "")), reverse=True),
        "gamification": gamification_view(state, today, week_offset),
        "planner": {"tenors": [simulate(state, t, False) for t in TENORS],
                    "flat_rate": FLAT_RATE_ANNUAL, "params_version": PARAMS_VERSION},
        "scenarios": state.scenarios,
        "readiness": readiness(state, today),
        "notifications": state.notifications,
        "consultations": state.consultations,
    }
