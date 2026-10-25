"""OTO CUAN API (FastAPI).

Runs on Vercel as a Python serverless function (see /api/index.py) or locally:
    uvicorn backend.app.main:app --reload
"""
from __future__ import annotations

import os
import random
import string
import uuid
from datetime import date
from functools import lru_cache
from typing import Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import engine
from .store import MemoryStore, PostgresStore
from .supabase_store import SupabaseRestStore, verify_user

DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
REST_MODE = bool(SUPABASE_URL and SUPABASE_KEY and not DATABASE_URL)
DEMO_MODE = os.getenv("DEMO_MODE", "false" if (DATABASE_URL or REST_MODE) else "true").lower() == "true"
ALLOWED_ORIGINS = [o for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o]

app = FastAPI(title="OTO CUAN API", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"])

_memory = MemoryStore()


@lru_cache(maxsize=1)
def _pg() -> PostgresStore:
    return PostgresStore(DATABASE_URL)


# ------------------------------------------------------------------ auth
@lru_cache(maxsize=1)
def _jwks_client():
    import jwt
    return jwt.PyJWKClient(f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json")


def _verify_supabase_jwt(token: str) -> str:
    import jwt
    try:
        if SUPABASE_JWT_SECRET:
            claims = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        else:
            key = _jwks_client().get_signing_key_from_jwt(token).key
            claims = jwt.decode(token, key, algorithms=["RS256", "ES256"], audience="authenticated")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(401, "Sesi tidak valid. Silakan masuk lagi.") from exc
    return claims["sub"]


class Ctx:
    def __init__(self, uid: str, demo: bool, store=None):
        self.uid = uid
        self.demo = demo
        self.store = store or (_memory if demo else _pg())


def get_ctx(authorization: Optional[str] = Header(None), x_demo_user: Optional[str] = Header(None)) -> Ctx:
    if authorization and authorization.lower().startswith("bearer ") and not DEMO_MODE:
        token = authorization[7:]
        if REST_MODE:
            try:
                uid = verify_user(SUPABASE_URL.rstrip("/"), SUPABASE_KEY, token)
            except PermissionError as exc:
                raise HTTPException(401, "Sesi tidak valid. Silakan masuk lagi.") from exc
            return Ctx(uid, demo=False, store=SupabaseRestStore(SUPABASE_URL, SUPABASE_KEY, token))
        return Ctx(_verify_supabase_jwt(token), demo=False)
    if DEMO_MODE:
        uid = x_demo_user or "demo"
        if len(uid) > 64:
            raise HTTPException(400, "ID demo terlalu panjang.")
        return Ctx(uid, demo=True)
    raise HTTPException(401, "Masuk dulu untuk melanjutkan.")


def view(ctx: Ctx, week: int = 0) -> dict:
    return engine.full_view(ctx.store.load(ctx.uid), date.today(), week)


# ------------------------------------------------------------------ schemas
Money = Field(..., gt=0, le=10_000_000_000)


class ProfileIn(BaseModel):
    full_name: Optional[str] = Field(None, max_length=60)
    email: Optional[str] = Field(None, max_length=120)


class ConsentsIn(BaseModel):
    terms: Optional[bool] = None
    marketing: Optional[bool] = None
    share_summary: Optional[bool] = None


class FinanceIn(BaseModel):
    net_income: Optional[int] = Field(None, ge=0, le=10_000_000_000)
    essential_expense: Optional[int] = Field(None, ge=0, le=10_000_000_000)
    obligations: Optional[int] = Field(None, ge=0, le=10_000_000_000)
    budgets: Optional[dict[str, int]] = None


class TransactionIn(BaseModel):
    type: Literal["in", "out"]
    amount: int = Money
    category_code: Optional[str] = None
    note: Optional[str] = Field(None, max_length=140)


class GoalIn(BaseModel):
    vehicle: Optional[Literal["motor", "mobil"]] = None
    vehicle_price: Optional[int] = Field(None, gt=0, le=10_000_000_000)
    dp_percent: Optional[int] = Field(None, ge=5, le=90)
    months_cover: Optional[int] = Field(None, ge=1, le=24)
    monthly_contribution: Optional[int] = Field(None, ge=0, le=10_000_000_000)


class DepositIn(BaseModel):
    goal: Literal["down_payment", "emergency"]
    amount: int = Money
    via_nabung_yuk: bool = False


class ScenarioIn(BaseModel):
    tenor_months: Literal[36, 48, 60]
    stress_test: bool = False


class ConsultIn(BaseModel):
    channel: Literal["cabang", "chat", "telepon"]
    slot: Optional[str] = Field(None, max_length=40)
    share_summary: bool = False


class ReminderIn(BaseModel):
    enabled: bool


# ------------------------------------------------------------------ routes
@app.get("/api/health")
def health():
    return {"ok": True, "mode": "demo" if DEMO_MODE else ("supabase-rest" if REST_MODE else "supabase"), "params_version": engine.PARAMS_VERSION}


@app.get("/api/state")
def get_state(week: int = Query(0, ge=-52, le=0), ctx: Ctx = Depends(get_ctx)):
    return view(ctx, week)


@app.put("/api/profile")
def put_profile(body: ProfileIn, ctx: Ctx = Depends(get_ctx)):
    name = body.full_name.strip() if body.full_name else None
    ctx.store.update_profile(ctx.uid, name or None, body.email)
    return view(ctx)


@app.put("/api/consents")
def put_consents(body: ConsentsIn, ctx: Ctx = Depends(get_ctx)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if data.get("terms") is False:
        raise HTTPException(400, "Persetujuan syarat dan kebijakan wajib untuk memakai aplikasi.")
    ctx.store.set_consents(ctx.uid, data)
    return view(ctx)


@app.put("/api/finance")
def put_finance(body: FinanceIn, ctx: Ctx = Depends(get_ctx)):
    fields = {k: v for k, v in body.model_dump(exclude={"budgets"}).items() if v is not None}
    for code, amount in (body.budgets or {}).items():
        if code not in engine.CATEGORIES or amount < 0:
            raise HTTPException(400, f"Kategori {code} tidak dikenal.")
        fields[f"budget_{code}"] = amount
    ctx.store.update_finance(ctx.uid, fields)
    return view(ctx)


@app.post("/api/transactions")
def post_transaction(body: TransactionIn, ctx: Ctx = Depends(get_ctx)):
    if body.type == "out" and body.category_code not in engine.CATEGORIES:
        raise HTTPException(400, "Pilih kategori pengeluaran.")
    label = body.note or (engine.CATEGORIES[body.category_code][0] if body.type == "out" else "Pemasukan lain")
    tx = {"id": str(uuid.uuid4()), "type": body.type, "category_code": body.category_code if body.type == "out" else None,
          "goal_id": None, "amount": body.amount, "note": label, "via_nabung_yuk": False, "occurred_on": date.today(),
          "created_at": engine_now()}
    ctx.store.add_transaction(ctx.uid, tx)
    return view(ctx)


@app.put("/api/goals/{kind}")
def put_goal(kind: Literal["down_payment", "emergency"], body: GoalIn, ctx: Ctx = Depends(get_ctx)):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    ctx.store.update_goal(ctx.uid, kind, fields)
    return view(ctx)


@app.post("/api/deposits")
def post_deposit(body: DepositIn, ctx: Ctx = Depends(get_ctx)):
    state = ctx.store.load(ctx.uid)
    today = date.today()
    goal = state.goals[body.goal]
    gami, rewards = None, []
    if body.via_nabung_yuk:
        gami = engine.apply_saving(state.gami, today)
        rewards = engine.newly_unlocked(gami["latte_total"], state.unlocked_rewards)
    note = "Nabung Yuk (latte)" if body.via_nabung_yuk else ("Setor DP" if body.goal == "down_payment" else "Setor dana cadangan")
    tx = {"id": str(uuid.uuid4()), "type": "goal", "category_code": None, "goal_id": goal.get("id"), "amount": body.amount,
          "note": note, "via_nabung_yuk": body.via_nabung_yuk, "occurred_on": today, "created_at": engine_now()}
    ctx.store.save_deposit(ctx.uid, body.goal, body.amount, tx, gami, rewards)
    for code in rewards:
        title = next(r["title"] for r in engine.REWARDS if r["code"] == code)
        ctx.store.add_notification(ctx.uid, {"kind": "reward", "title": f"Hadiah terbuka: {title}",
                                             "body": "Latte kamu sudah cukup. Cek di Progress & Reward.", "deep_link": "gami_progress"})
    out = view(ctx)
    out["last_deposit"] = {"amount": body.amount, "goal": body.goal, "rewards_unlocked": rewards}
    return out


@app.post("/api/planner/simulate")
def post_simulate(body: ScenarioIn, ctx: Ctx = Depends(get_ctx)):
    return engine.simulate(ctx.store.load(ctx.uid), body.tenor_months, body.stress_test)


@app.post("/api/scenarios")
def post_scenario(body: ScenarioIn, ctx: Ctx = Depends(get_ctx)):
    state = ctx.store.load(ctx.uid)
    sim = engine.simulate(state, body.tenor_months, body.stress_test)
    g = state.goals["down_payment"]
    ctx.store.add_scenario(ctx.uid, {"vehicle_price": g["vehicle_price"], "dp_percent": g["dp_percent"],
                                     "tenor_months": body.tenor_months, "flat_rate": sim["flat_rate"],
                                     "params_version": sim["params_version"], "monthly_payment": sim["monthly_payment"],
                                     "total_payment": sim["total_payment"], "cash_left": sim["cash_left"],
                                     "stress_test": body.stress_test})
    return view(ctx)


@app.delete("/api/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str, ctx: Ctx = Depends(get_ctx)):
    ctx.store.delete_scenario(ctx.uid, scenario_id)
    return view(ctx)


@app.post("/api/consultations")
def post_consultation(body: ConsultIn, ctx: Ctx = Depends(get_ctx)):
    state = ctx.store.load(ctx.uid)
    today = date.today()
    ref = "OC-" + today.strftime("%y%m") + "-" + "".join(random.choices(string.digits, k=4))
    summary = engine.summary_for_consultation(state, today) if body.share_summary else None
    req = ctx.store.add_consultation(ctx.uid, {"channel": body.channel, "slot": body.slot if body.channel == "telepon" else None,
                                               "share_summary": body.share_summary, "summary": summary, "reference_code": ref})
    out = view(ctx)
    out["consultation"] = {k: v for k, v in req.items() if k != "summary"}
    return out


@app.post("/api/notifications/read")
def post_read(ctx: Ctx = Depends(get_ctx)):
    ctx.store.mark_notifications_read(ctx.uid)
    return view(ctx)


@app.put("/api/reminders/{kind}")
def put_reminder(kind: Literal["deposit", "budget_review", "data_update"], body: ReminderIn, ctx: Ctx = Depends(get_ctx)):
    ctx.store.set_reminder(ctx.uid, kind, body.enabled)
    return view(ctx)


@app.post("/api/export")
def post_export(ctx: Ctx = Depends(get_ctx)):
    """Return the user's own data. The app delivers it as a file the user saves."""
    state = ctx.store.load(ctx.uid)
    return {"exported_at": engine_now(), "profile": state.profile, "finance": state.finance, "budgets": state.budgets,
            "goals": state.goals, "transactions": state.transactions, "scenarios": state.scenarios,
            "consents": state.consents}


@app.post("/api/account/delete")
def post_delete(ctx: Ctx = Depends(get_ctx)):
    ctx.store.request_delete(ctx.uid)
    return {"ok": True, "message": "Akun akan dihapus dalam 14 hari."}


@app.post("/api/demo/reset")
def post_reset(ctx: Ctx = Depends(get_ctx)):
    if not ctx.demo:
        raise HTTPException(404, "Tidak tersedia.")
    _memory.reset(ctx.uid)
    return view(ctx)


def engine_now() -> str:
    from .store import now_iso
    return now_iso()
