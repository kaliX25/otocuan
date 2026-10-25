from datetime import date, timedelta

from fastapi.testclient import TestClient

from backend.app import engine
from backend.app.main import app

client = TestClient(app)
H = {"X-Demo-User": "test-user"}


def setup_function():
    client.post("/api/demo/reset", headers=H)


def test_health_and_state():
    assert client.get("/api/health").json()["ok"] is True
    s = client.get("/api/state", headers=H).json()
    assert s["finance"]["cash_left"] == 3_400_000
    assert s["finance"]["safe_to_spend"] == 1_400_000
    assert s["goals"]["down_payment"]["percent"] == 30
    assert s["gamification"]["streak"] == 7
    assert s["gamification"]["latte_cycle"] == 7


def test_nabung_yuk_deposit_updates_streak_latte_and_goal():
    r = client.post("/api/deposits", headers=H, json={"goal": "down_payment", "amount": 100_000, "via_nabung_yuk": True}).json()
    assert r["gamification"]["streak"] == 8
    assert r["gamification"]["latte_cycle"] == 8
    assert r["gamification"]["saved_today"] is True
    assert r["goals"]["down_payment"]["saved"] == 12_100_000
    today = [d for d in r["gamification"]["calendar"]["days"] if d["date"] == date.today().isoformat()][0]
    assert today["status"] == "saved"
    # second deposit the same day keeps the streak but adds a latte
    r = client.post("/api/deposits", headers=H, json={"goal": "down_payment", "amount": 50_000, "via_nabung_yuk": True}).json()
    assert r["gamification"]["streak"] == 8 and r["gamification"]["latte_cycle"] == 9


def test_reward_unlocks_at_ten_lattes():
    for _ in range(3):
        r = client.post("/api/deposits", headers=H, json={"goal": "down_payment", "amount": 50_000, "via_nabung_yuk": True}).json()
    assert r["last_deposit"]["rewards_unlocked"] == ["voucher_kopi"]
    assert r["gamification"]["latte_cycle"] == 10
    assert r["notifications"][0]["title"].startswith("Hadiah terbuka")


def test_streak_rules():
    t = date(2026, 10, 25)
    g = engine.apply_saving({"latte_total": 0, "current_streak": 5, "last_saving_date": t - timedelta(days=3)}, t)
    assert g["current_streak"] == 1
    assert engine.current_streak({"current_streak": 4, "last_saving_date": t - timedelta(days=2)}, t) == 0


def test_transaction_and_scenario_and_readiness():
    r = client.post("/api/transactions", headers=H, json={"type": "out", "amount": 150_000, "category_code": "makan"}).json()
    assert r["finance"]["safe_to_spend"] == 1_250_000
    before = r["readiness"]["ready_count"]
    r = client.post("/api/scenarios", headers=H, json={"tenor_months": 60, "stress_test": False}).json()
    assert r["scenarios"][0]["monthly_payment"] == 2_600_000
    assert r["readiness"]["ready_count"] == before + 1


def test_validation_and_consultation():
    assert client.post("/api/transactions", headers=H, json={"type": "out", "amount": 0, "category_code": "makan"}).status_code == 422
    assert client.put("/api/consents", headers=H, json={"terms": False}).status_code == 400
    r = client.post("/api/consultations", headers=H, json={"channel": "telepon", "slot": "Besok 10.00", "share_summary": True}).json()
    assert r["consultation"]["reference_code"].startswith("OC-")
    assert "summary" not in r["consultation"]
