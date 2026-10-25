"""Persistence for OTO CUAN.

PostgresStore talks to Supabase Postgres. MemoryStore keeps per-user demo data in
process memory so the API works end to end before Supabase is connected.
Both expose the same methods; business rules live in engine.py and services.py.
"""
from __future__ import annotations

import copy
import json
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Protocol

from .engine import State


class Store(Protocol):
    def load(self, uid: str) -> State: ...
    def update_profile(self, uid: str, full_name: str | None, email: str | None) -> None: ...
    def set_consents(self, uid: str, consents: dict[str, bool]) -> None: ...
    def update_finance(self, uid: str, fields: dict[str, int]) -> None: ...
    def add_transaction(self, uid: str, tx: dict[str, Any]) -> None: ...
    def update_goal(self, uid: str, kind: str, fields: dict[str, Any]) -> None: ...
    def save_deposit(self, uid: str, kind: str, amount: int, tx: dict[str, Any], gami: dict[str, Any] | None, rewards: list[str]) -> None: ...
    def add_scenario(self, uid: str, scenario: dict[str, Any]) -> dict[str, Any]: ...
    def delete_scenario(self, uid: str, scenario_id: str) -> None: ...
    def add_consultation(self, uid: str, req: dict[str, Any]) -> dict[str, Any]: ...
    def add_notification(self, uid: str, n: dict[str, Any]) -> None: ...
    def mark_notifications_read(self, uid: str) -> None: ...
    def set_reminder(self, uid: str, kind: str, enabled: bool) -> None: ...
    def request_delete(self, uid: str) -> None: ...


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ====================================================================== demo
def demo_state(today: date) -> State:
    """Persona from the team's in-depth interview (Steven, 25, Tangerang). Example data."""
    dp_id, ef_id = str(uuid.uuid4()), str(uuid.uuid4())
    txs: list[dict[str, Any]] = [
        {"id": str(uuid.uuid4()), "type": "in", "category_code": None, "goal_id": None, "amount": 9_500_000,
         "note": "Gaji bulan ini", "via_nabung_yuk": False, "occurred_on": today.replace(day=1)},
        {"id": str(uuid.uuid4()), "type": "out", "category_code": "tagihan", "goal_id": None, "amount": 350_000,
         "note": "Listrik dan internet", "via_nabung_yuk": False, "occurred_on": today.replace(day=min(5, today.day))},
        {"id": str(uuid.uuid4()), "type": "goal", "category_code": None, "goal_id": dp_id, "amount": 1_500_000,
         "note": "Setor DP Mobil", "via_nabung_yuk": False, "occurred_on": today.replace(day=1)},
        {"id": str(uuid.uuid4()), "type": "out", "category_code": "makan", "goal_id": None, "amount": 85_000,
         "note": "Kopi sore bareng tim", "via_nabung_yuk": False, "occurred_on": today - timedelta(days=1)},
        {"id": str(uuid.uuid4()), "type": "out", "category_code": "transport", "goal_id": None, "amount": 32_000,
         "note": "Ojek online ke kantor", "via_nabung_yuk": False, "occurred_on": today - timedelta(days=1)},
    ]
    for back in range(1, 8):   # seven days of Nabung Yuk before today -> streak 7, latte 7
        txs.append({"id": str(uuid.uuid4()), "type": "goal", "category_code": None, "goal_id": dp_id, "amount": 50_000,
                    "note": "Nabung Yuk (latte)", "via_nabung_yuk": True, "occurred_on": today - timedelta(days=back)})
    for t in txs:
        t["created_at"] = now_iso()
    return State(
        profile={"full_name": "Steven", "phone": "+62 812 3456 7890", "email": "steven@email.com"},
        consents={"terms": True, "marketing": False, "share_summary": False},
        finance={"net_income": 9_500_000, "essential_expense": 4_000_000, "obligations": 800_000},
        budgets={"makan": 1_900_000, "rumah": 1_600_000, "transport": 900_000, "tagihan": 500_000, "belanja": 0, "lain": 400_000},
        goals={
            "down_payment": {"id": dp_id, "vehicle": "mobil", "vehicle_price": 160_000_000, "dp_percent": 25,
                             "monthly_contribution": 1_500_000, "saved_amount": 12_000_000},
            "emergency": {"id": ef_id, "months_cover": 3, "monthly_contribution": 500_000, "saved_amount": 4_200_000},
        },
        transactions=txs,
        gami={"latte_total": 7, "current_streak": 7, "longest_streak": 7, "last_saving_date": today - timedelta(days=1)},
        unlocked_rewards=[],
        scenarios=[],
        notifications=[
            {"id": str(uuid.uuid4()), "kind": "deposit", "title": "Waktunya Nabung Yuk", "body": "Isi latte hari ini supaya streak 7 hari tetap menyala.", "deep_link": "gami", "read_at": None, "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "kind": "insight", "title": "Pengeluaran nongkrong naik", "body": "Naik 18% dari bulan lalu. Cek kategorimu.", "deep_link": "txlist:makan", "read_at": None, "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "kind": "data", "title": "Perbarui data keuangan", "body": "Perbarui setelah gajian berikutnya.", "deep_link": "setup", "read_at": None, "created_at": now_iso()},
        ],
        reminders={"deposit": True, "budget_review": True, "data_update": False},
        consultations=[],
    )


class MemoryStore:
    def __init__(self) -> None:
        self._db: dict[str, State] = {}

    def _s(self, uid: str) -> State:
        if uid not in self._db:
            self._db[uid] = demo_state(date.today())
        return self._db[uid]

    def load(self, uid: str) -> State:
        return copy.deepcopy(self._s(uid))

    def reset(self, uid: str) -> None:
        self._db.pop(uid, None)

    def update_profile(self, uid, full_name, email):
        s = self._s(uid)
        if full_name is not None:
            s.profile["full_name"] = full_name
        if email is not None:
            s.profile["email"] = email

    def set_consents(self, uid, consents):
        self._s(uid).consents.update(consents)

    def update_finance(self, uid, fields):
        s = self._s(uid)
        for k, v in fields.items():
            if k in s.finance:
                s.finance[k] = v
            elif k.startswith("budget_"):
                s.budgets[k[7:]] = v

    def add_transaction(self, uid, tx):
        s = self._s(uid)
        s.transactions.append(tx)
        if tx["type"] == "out":
            s.budgets[tx["category_code"]] = s.budgets.get(tx["category_code"], 0) + tx["amount"]
        elif tx["type"] == "in":
            s.finance["net_income"] += tx["amount"]

    def update_goal(self, uid, kind, fields):
        self._s(uid).goals[kind].update(fields)

    def save_deposit(self, uid, kind, amount, tx, gami, rewards):
        s = self._s(uid)
        s.goals[kind]["saved_amount"] += amount
        s.transactions.append(tx)
        if gami is not None:
            s.gami = gami
        s.unlocked_rewards.extend(rewards)

    def add_scenario(self, uid, scenario):
        sc = {**scenario, "id": str(uuid.uuid4()), "created_at": now_iso()}
        self._s(uid).scenarios.insert(0, sc)
        return sc

    def delete_scenario(self, uid, scenario_id):
        s = self._s(uid)
        s.scenarios = [x for x in s.scenarios if x["id"] != scenario_id]

    def add_consultation(self, uid, req):
        r = {**req, "id": str(uuid.uuid4()), "status": "submitted", "created_at": now_iso()}
        self._s(uid).consultations.insert(0, r)
        return r

    def add_notification(self, uid, n):
        self._s(uid).notifications.insert(0, {**n, "id": str(uuid.uuid4()), "read_at": None, "created_at": now_iso()})

    def mark_notifications_read(self, uid):
        for n in self._s(uid).notifications:
            n["read_at"] = n["read_at"] or now_iso()

    def set_reminder(self, uid, kind, enabled):
        self._s(uid).reminders[kind] = enabled

    def request_delete(self, uid):
        self._s(uid).profile["delete_requested_at"] = now_iso()


# ====================================================================== postgres
class PostgresStore:
    """Supabase Postgres implementation. Uses the service connection string on the server;
    every query is scoped by the authenticated user's id taken from the verified JWT."""

    def __init__(self, dsn: str) -> None:
        import psycopg  # imported lazily so demo mode needs no driver
        from psycopg.rows import dict_row
        self._psycopg = psycopg
        self._dict_row = dict_row
        self._dsn = dsn

    def _conn(self):
        return self._psycopg.connect(self._dsn, row_factory=self._dict_row, autocommit=False, prepare_threshold=None)

    def _ensure_user(self, cur, uid: str) -> None:
        cur.execute("insert into profiles (id) values (%s) on conflict (id) do nothing", (uid,))
        cur.execute("insert into finance_profiles (user_id) values (%s) on conflict do nothing", (uid,))
        cur.execute("insert into gamification_state (user_id) values (%s) on conflict do nothing", (uid,))
        cur.execute("""insert into goals (user_id, kind, vehicle, vehicle_price, dp_percent, monthly_contribution)
                       values (%s, 'down_payment', 'mobil', 160000000, 25, 1500000) on conflict (user_id, kind) do nothing""", (uid,))
        cur.execute("""insert into goals (user_id, kind, months_cover, monthly_contribution)
                       values (%s, 'emergency', 3, 500000) on conflict (user_id, kind) do nothing""", (uid,))
        for kind, enabled, sched in (("deposit", True, "Setiap tanggal 1, pukul 19.00"),
                                     ("budget_review", True, "Setiap Minggu malam"),
                                     ("data_update", False, "Setelah gajian")):
            cur.execute("insert into reminder_settings (user_id, kind, enabled, schedule) values (%s,%s,%s,%s) on conflict do nothing",
                        (uid, kind, enabled, sched))

    def load(self, uid: str) -> State:
        with self._conn() as conn, conn.cursor() as cur:
            self._ensure_user(cur, uid)
            cur.execute("select full_name, phone, email, delete_requested_at from profiles where id=%s", (uid,))
            profile = dict(cur.fetchone())
            cur.execute("select type::text, granted from consents where user_id=%s", (uid,))
            consents = {"terms": False, "marketing": False, "share_summary": False}
            consents.update({r["type"]: r["granted"] for r in cur.fetchall()})
            cur.execute("select net_income, essential_expense, obligations from finance_profiles where user_id=%s", (uid,))
            finance = dict(cur.fetchone())
            cur.execute("select code from expense_categories order by sort_order")
            budgets = {r["code"]: 0 for r in cur.fetchall()}
            cur.execute("select category_code, monthly_amount from category_budgets where user_id=%s", (uid,))
            budgets.update({r["category_code"]: r["monthly_amount"] for r in cur.fetchall()})
            cur.execute("select id::text, kind::text, vehicle::text, vehicle_price, dp_percent, months_cover, monthly_contribution, saved_amount from goals where user_id=%s", (uid,))
            goals = {r.pop("kind"): r for r in cur.fetchall()}
            cur.execute("""select id::text, type::text, category_code, goal_id::text, amount, note, via_nabung_yuk,
                                  occurred_on, created_at::text from transactions where user_id=%s order by occurred_on desc limit 500""", (uid,))
            txs = [dict(r) for r in cur.fetchall()]
            cur.execute("select latte_total, current_streak, longest_streak, last_saving_date from gamification_state where user_id=%s", (uid,))
            gami = dict(cur.fetchone())
            cur.execute("select reward_code from user_rewards where user_id=%s", (uid,))
            rewards = [r["reward_code"] for r in cur.fetchall()]
            cur.execute("""select id::text, vehicle_price, dp_percent, tenor_months, flat_rate::float, params_version, monthly_payment,
                                  total_payment, cash_left, stress_test, created_at::text from repayment_scenarios where user_id=%s order by created_at desc""", (uid,))
            scenarios = [dict(r) for r in cur.fetchall()]
            cur.execute("select id::text, kind, title, body, deep_link, read_at::text, created_at::text from notifications where user_id=%s order by created_at desc limit 50", (uid,))
            notifications = [dict(r) for r in cur.fetchall()]
            cur.execute("select kind::text, enabled from reminder_settings where user_id=%s", (uid,))
            reminders = {r["kind"]: r["enabled"] for r in cur.fetchall()}
            cur.execute("select id::text, channel::text, slot, share_summary, reference_code, status::text, created_at::text from consultation_requests where user_id=%s order by created_at desc", (uid,))
            consultations = [dict(r) for r in cur.fetchall()]
            conn.commit()
        return State(profile=profile, consents=consents, finance=finance, budgets=budgets, goals=goals,
                     transactions=txs, gami=gami, unlocked_rewards=rewards, scenarios=scenarios,
                     notifications=notifications, reminders=reminders, consultations=consultations)

    def _exec(self, sql: str, params: tuple) -> None:
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()

    def update_profile(self, uid, full_name, email):
        self._exec("update profiles set full_name=coalesce(%s, full_name), email=coalesce(%s, email), updated_at=now() where id=%s",
                   (full_name, email, uid))

    def set_consents(self, uid, consents):
        with self._conn() as conn, conn.cursor() as cur:
            for k, v in consents.items():
                cur.execute("""insert into consents (user_id, type, granted) values (%s, %s, %s)
                               on conflict (user_id, type) do update set granted=excluded.granted, granted_at=now()""", (uid, k, v))
            conn.commit()

    def update_finance(self, uid, fields):
        with self._conn() as conn, conn.cursor() as cur:
            for k in ("net_income", "essential_expense", "obligations"):
                if k in fields:
                    cur.execute(f"update finance_profiles set {k}=%s, updated_at=now() where user_id=%s", (fields[k], uid))
            for k, v in fields.items():
                if k.startswith("budget_"):
                    cur.execute("""insert into category_budgets (user_id, category_code, monthly_amount) values (%s,%s,%s)
                                   on conflict (user_id, category_code) do update set monthly_amount=excluded.monthly_amount""", (uid, k[7:], v))
            conn.commit()

    def add_transaction(self, uid, tx):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("""insert into transactions (user_id, type, category_code, amount, note, occurred_on)
                           values (%s, %s, %s, %s, %s, %s)""", (uid, tx["type"], tx.get("category_code"), tx["amount"], tx.get("note"), tx["occurred_on"]))
            if tx["type"] == "out":
                cur.execute("""insert into category_budgets (user_id, category_code, monthly_amount) values (%s,%s,%s)
                               on conflict (user_id, category_code) do update set monthly_amount = category_budgets.monthly_amount + excluded.monthly_amount""",
                            (uid, tx["category_code"], tx["amount"]))
            elif tx["type"] == "in":
                cur.execute("update finance_profiles set net_income = net_income + %s where user_id=%s", (tx["amount"], uid))
            conn.commit()

    def update_goal(self, uid, kind, fields):
        allowed = {"vehicle", "vehicle_price", "dp_percent", "months_cover", "monthly_contribution"}
        sets = [(k, v) for k, v in fields.items() if k in allowed]
        if not sets:
            return
        sql = "update goals set " + ", ".join(f"{k}=%s" for k, _ in sets) + ", updated_at=now() where user_id=%s and kind=%s"
        self._exec(sql, tuple(v for _, v in sets) + (uid, kind))

    def save_deposit(self, uid, kind, amount, tx, gami, rewards):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("update goals set saved_amount = saved_amount + %s, updated_at=now() where user_id=%s and kind=%s returning id",
                        (amount, uid, kind))
            goal_id = cur.fetchone()["id"]
            cur.execute("""insert into transactions (user_id, type, goal_id, amount, note, via_nabung_yuk, occurred_on)
                           values (%s, 'goal', %s, %s, %s, %s, %s)""", (uid, goal_id, amount, tx.get("note"), tx["via_nabung_yuk"], tx["occurred_on"]))
            if gami is not None:
                cur.execute("""update gamification_state set latte_total=%s, current_streak=%s, longest_streak=%s,
                               last_saving_date=%s, updated_at=now() where user_id=%s""",
                            (gami["latte_total"], gami["current_streak"], gami["longest_streak"], gami["last_saving_date"], uid))
            for code in rewards:
                cur.execute("insert into user_rewards (user_id, reward_code) values (%s,%s) on conflict do nothing", (uid, code))
            conn.commit()

    def add_scenario(self, uid, scenario):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("""insert into repayment_scenarios (user_id, vehicle_price, dp_percent, tenor_months, flat_rate, params_version,
                           monthly_payment, total_payment, cash_left, stress_test)
                           values (%(uid)s, %(vehicle_price)s, %(dp_percent)s, %(tenor_months)s, %(flat_rate)s, %(params_version)s,
                           %(monthly_payment)s, %(total_payment)s, %(cash_left)s, %(stress_test)s) returning id::text, created_at::text""",
                        {**scenario, "uid": uid})
            row = cur.fetchone()
            conn.commit()
        return {**scenario, **row}

    def delete_scenario(self, uid, scenario_id):
        self._exec("delete from repayment_scenarios where id=%s and user_id=%s", (scenario_id, uid))

    def add_consultation(self, uid, req):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("""insert into consultation_requests (user_id, channel, slot, share_summary, summary, reference_code)
                           values (%s,%s,%s,%s,%s,%s) returning id::text, status::text, created_at::text""",
                        (uid, req["channel"], req.get("slot"), req["share_summary"],
                         json.dumps(req.get("summary"), default=str) if req.get("summary") else None, req["reference_code"]))
            row = cur.fetchone()
            conn.commit()
        return {**req, **row}

    def add_notification(self, uid, n):
        self._exec("insert into notifications (user_id, kind, title, body, deep_link) values (%s,%s,%s,%s,%s)",
                   (uid, n["kind"], n["title"], n["body"], n.get("deep_link")))

    def mark_notifications_read(self, uid):
        self._exec("update notifications set read_at = now() where user_id=%s and read_at is null", (uid,))

    def set_reminder(self, uid, kind, enabled):
        self._exec("update reminder_settings set enabled=%s where user_id=%s and kind=%s", (enabled, uid, kind))

    def request_delete(self, uid):
        self._exec("update profiles set delete_requested_at = now() where id=%s", (uid,))
