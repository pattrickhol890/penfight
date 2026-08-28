import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://virtual-duel-pen.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("message") == "Pen Fight API"


def test_stats_shape(api):
    r = api.get(f"{BASE_URL}/api/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ("total_games", "player_wins", "ai_wins", "local_games"):
        assert k in d
        assert isinstance(d[k], int)


def test_list_matches(api):
    r = api.get(f"{BASE_URL}/api/matches")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_match_ai_and_persist(api):
    # baseline
    s0 = api.get(f"{BASE_URL}/api/stats").json()
    payload = {
        "mode": "ai",
        "difficulty": "medium",
        "winner": "p1",
        "p1_pens_left": 3,
        "p2_pens_left": 0,
        "duration_sec": 42,
    }
    r = api.post(f"{BASE_URL}/api/matches", json=payload)
    assert r.status_code == 200, r.text
    m = r.json()
    assert m["mode"] == "ai"
    assert m["winner"] == "p1"
    assert m["difficulty"] == "medium"
    assert "id" in m and isinstance(m["id"], str)
    assert "created_at" in m

    # verify listed
    lst = api.get(f"{BASE_URL}/api/matches").json()
    assert any(x["id"] == m["id"] for x in lst)

    # stats increased
    s1 = api.get(f"{BASE_URL}/api/stats").json()
    assert s1["total_games"] == s0["total_games"] + 1
    assert s1["player_wins"] == s0["player_wins"] + 1


def test_create_match_local(api):
    s0 = api.get(f"{BASE_URL}/api/stats").json()
    payload = {
        "mode": "local",
        "winner": "p2",
        "p1_pens_left": 0,
        "p2_pens_left": 2,
        "duration_sec": 30,
    }
    r = api.post(f"{BASE_URL}/api/matches", json=payload)
    assert r.status_code == 200
    s1 = api.get(f"{BASE_URL}/api/stats").json()
    assert s1["local_games"] == s0["local_games"] + 1


def test_create_match_validation(api):
    r = api.post(f"{BASE_URL}/api/matches", json={"mode": "ai"})
    assert r.status_code == 422
