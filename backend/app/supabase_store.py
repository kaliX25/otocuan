"""Supabase REST store.

Talks to Supabase (PostgREST) with the signed-in user's own JWT and the project's
publishable key. No service key or database password is needed on the server:
Row Level Security limits every query to the user's rows, and multi-step writes
run inside the security-invoker SQL functions add_transaction() and save_deposit().
"""
from __future__ import annotations

import time
from datetime import date, datetime, timezone
from typing import Any

import httpx

from .engine import State

_user_cache: dict[str, tuple[str, float]] = {}


def verify_user(base_url: str, apikey: str, token: str) -> str:
    """Return the user id for a Supabase access token (cached for 60 s)."""
    hit = _user_cache.get(token)
    if hit and hit[1] > time.time():
        return hit[0]
    r = httpx.get(f"{base_url}/auth/v1/user", headers={"apikey": apikey, "Authorization": f"Bearer {token}"}, timeout=8)
    if r.status_code != 200:
        raise PermissionError("invalid session")
    uid = r.json()["id"]
    _user_cache[token] = (uid, time.time() + 60)
    return uid


class SupabaseRestStore:
    def __init__(self, base_url: str, apikey: str, token: str) -> None:
        self.base = base_url.rstrip("/") + "/rest/v1"
        self.h = {"apikey": apikey, "Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        self.client = httpx.Client(timeout=10, headers=self.h)

    # ------------------------------------------------------------ helpers
    def _get(self, table: str, query: str = "select=*") -> list[dict[str, Any]]:
        r = self.client.get(f"{self.base}/{table}?{query}")
        r.raise_for_status()
        return r.json()

    def _patch(self, table: str, query: str, body: dict[str, Any]) -> None:
        r = self.client.patch(f"{self.base}/{table}?{query}", json=body, headers={"Prefer": "return=minimal"})
        r.raise_for_status()

    def _post(self, table: str, body: Any, upsert: str | None = None, ret: bool = False) -> Any:
        prefer = ["return=representation" if ret else "return=minimal"]
        if upsert:
            prefer.append("resolution=merge-duplicates")
        url = f"{self.base}/{table}" + (f"?on_conflict={upsert}" if upsert else "")
        r = self.client.post(url, json=body, headers={"Prefer": ",".join(prefer)})
        r.raise_for_status()
        return r.json() if ret else None

    def _rpc(self, fn: str, body: dict[str, Any]) -> None:
        r = self.client.post(f"{self.base}/rpc/{fn}", json=body)
        r.raise_for_status()

    # ------------------------------------------------------------ read
    def load(self, uid: str) -> State:
        profile = (self._get("profiles", "select=full_name,phone,email,delete_requested_at") or [{}])[0]
        consents = {"terms": False, "marketing": False, "share_summary": False}
        consents.update({r["type"]: r["granted"] for r in self._get("consents", "select=type,granted")})
        finance = (self._get("finance_profiles", "select=net_income,essential_expense,obligations")
                   or [{"net_income": 0, "essential_expense": 0, "obligations": 0}])[0]
        budgets = {c["code"]: 0 for c in self._get("expense_categories", "select=code&order=sort_order")}
        budgets.update({r["category_code"]: r["monthly_amount"] for r in self._get("category_budgets", "select=category_code,monthly_amount")})
        goals = {r.pop("kind"): r for r in self._get("goals", "select=id,kind,vehicle,vehicle_price,dp_percent,months_cover,monthly_contribution,saved_amount")}
        txs = self._get("transactions", "select=id,type,category_code,goal_id,amount,note,via_nabung_yuk,occurred_on,created_at&order=occurred_on.desc,created_at.desc&limit=500")
        for t in txs:
            t["occurred_on"] = date.fromisoformat(t["occurred_on"])
        gami = (self._get("gamification_state", "select=latte_total,current_streak,longest_streak,last_saving_date")
                or [{"latte_total": 0, "current_streak": 0, "longest_streak": 0, "last_saving_date": None}])[0]
        if gami.get("last_saving_date"):
            gami["last_saving_date"] = date.fromisoformat(gami["last_saving_date"])
        rewards = [r["reward_code"] for r in self._get("user_rewards", "select=reward_code")]
        scenarios = self._get("repayment_scenarios", "select=*&order=created_at.desc")
        for s in scenarios:
            s["flat_rate"] = float(s["flat_rate"])
        notifications = self._get("notifications", "select=id,kind,title,body,deep_link,read_at,created_at&order=created_at.desc&limit=50")
        reminders = {r["kind"]: r["enabled"] for r in self._get("reminder_settings", "select=kind,enabled")}
        consultations = self._get("consultation_requests", "select=id,channel,slot,share_summary,reference_code,status,created_at&order=created_at.desc")
        if "down_payment" not in goals or "emergency" not in goals:   # accounts created before the trigger existed
            self._post("goals", [{"user_id": uid, "kind": "down_payment", "vehicle": "mobil", "vehicle_price": 160_000_000, "dp_percent": 25, "monthly_contribution": 1_500_000},
                                 {"user_id": uid, "kind": "emergency", "months_cover": 3, "monthly_contribution": 500_000}], upsert="user_id,kind")
            return self.load(uid)
        return State(profile=profile, consents=consents, finance=finance, budgets=budgets, goals=goals, transactions=txs,
                     gami=gami, unlocked_rewards=rewards, scenarios=scenarios, notifications=notifications,
                     reminders=reminders or {"deposit": True, "budget_review": True, "data_update": False}, consultations=consultations)

    # ------------------------------------------------------------ write
    def update_profile(self, uid, full_name, email):
        body = {k: v for k, v in {"full_name": full_name, "email": email}.items() if v is not None}
        if body:
            self._patch("profiles", f"id=eq.{uid}", body)

    def set_consents(self, uid, consents):
        self._post("consents", [{"user_id": uid, "type": k, "granted": v} for k, v in consents.items()], upsert="user_id,type")

    def update_finance(self, uid, fields):
        core = {k: v for k, v in fields.items() if k in ("net_income", "essential_expense", "obligations")}
        if core:
            self._patch("finance_profiles", f"user_id=eq.{uid}", core)
        budgets = [{"user_id": uid, "category_code": k[7:], "monthly_amount": v} for k, v in fields.items() if k.startswith("budget_")]
        if budgets:
            self._post("category_budgets", budgets, upsert="user_id,category_code")

    def add_transaction(self, uid, tx):
        self._rpc("add_transaction", {"p_type": tx["type"], "p_amount": tx["amount"], "p_category": tx.get("category_code"), "p_note": tx.get("note")})

    def update_goal(self, uid, kind, fields):
        allowed = {k: v for k, v in fields.items() if k in {"vehicle", "vehicle_price", "dp_percent", "months_cover", "monthly_contribution"}}
        if allowed:
            self._patch("goals", f"user_id=eq.{uid}&kind=eq.{kind}", allowed)

    def save_deposit(self, uid, kind, amount, tx, gami, rewards):
        body: dict[str, Any] = {"p_kind": kind, "p_amount": amount, "p_note": tx.get("note"), "p_via_nabung": bool(tx.get("via_nabung_yuk"))}
        if gami is not None:
            body.update({"p_latte_total": gami["latte_total"], "p_current_streak": gami["current_streak"],
                         "p_longest_streak": gami["longest_streak"], "p_last_saving_date": gami["last_saving_date"].isoformat(),
                         "p_rewards": rewards})
        self._rpc("save_deposit", body)

    def add_scenario(self, uid, scenario):
        return self._post("repayment_scenarios", {**scenario, "user_id": uid}, ret=True)[0]

    def delete_scenario(self, uid, scenario_id):
        r = self.client.delete(f"{self.base}/repayment_scenarios?id=eq.{scenario_id}")
        r.raise_for_status()

    def add_consultation(self, uid, req):
        row = self._post("consultation_requests", {**req, "user_id": uid}, ret=True)[0]
        self._post("readiness_snapshots", {"user_id": uid, "indicators": req.get("summary") or {}, "ready_count": (req.get("summary") or {}).get("ready_count", 0),
                                           "rules_version": "rules-1.0"})
        return row

    def add_notification(self, uid, n):
        pass  # reward notifications are written by save_deposit() in the database

    def mark_notifications_read(self, uid):
        self._patch("notifications", "read_at=is.null", {"read_at": datetime.now(timezone.utc).isoformat()})

    def set_reminder(self, uid, kind, enabled):
        self._patch("reminder_settings", f"kind=eq.{kind}", {"enabled": enabled})

    def request_delete(self, uid):
        self._patch("profiles", f"id=eq.{uid}", {"delete_requested_at": datetime.now(timezone.utc).isoformat()})
