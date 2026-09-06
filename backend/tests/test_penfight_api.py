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


def test_auth_profile_flow(api):
    # 1. Create Profile
    demo_payload = {
        "demo_name": "Classroom Champ",
        "demo_email": f"champ_{os.urandom(4).hex()}@school.edu",
    }
    r = api.post(f"{BASE_URL}/api/auth/google", json=demo_payload)
    if r.status_code == 200:
        data = r.json()
        token = data.get("token")
        user = data.get("user")
        assert token and user
        assert user["subscription_tier"] == "free"
        assert user["subscription_status"] == "active"
        assert "gamer_tag" in user
        user_id = user["id"]

        # 2. Get Me
        headers = {"Authorization": f"Bearer {token}"}
        r_me = api.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert r_me.status_code == 200
        assert r_me.json()["id"] == user_id

        # 3. Update Profile
        upd = {"gamer_tag": "DeskLegend_77", "favorite_ink": "p2", "aim_mode": "slingshot"}
        r_upd = api.put(f"{BASE_URL}/api/auth/profile", json=upd, headers=headers)
        assert r_upd.status_code == 200
        assert r_upd.json()["gamer_tag"] == "DeskLegend_77"
        assert r_upd.json()["preferences"]["favorite_ink"] == "p2"

        # 4. Link Match Result to User
        match_payload = {
            "mode": "ai",
            "difficulty": "medium",
            "winner": "p1",
            "p1_pens_left": 2,
            "p2_pens_left": 0,
            "duration_sec": 35,
            "user_id": user_id,
        }
        r_match = api.post(f"{BASE_URL}/api/matches", json=match_payload, headers=headers)
        assert r_match.status_code == 200

        # Check updated user stats
        r_me2 = api.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert r_me2.status_code == 200
        stats = r_me2.json()["stats"]
        assert stats["games_played"] >= 1
        assert stats["wins"] >= 1

        # 5. Logout
        r_out = api.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        assert r_out.status_code == 200
        r_me3 = api.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert r_me3.status_code == 401


def test_username_validation_and_claiming(api):
    # 1. Create a new demo user
    suffix = os.urandom(3).hex()
    demo_email = f"flickmaster_{suffix}@school.edu"
    r = api.post(f"{BASE_URL}/api/auth/google", json={"demo_name": "Flick Master", "demo_email": demo_email})
    if r.status_code != 200:
        return
    data = r.json()
    token = data["token"]
    user = data["user"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify existing / auto-assigned default username from email prefix
    assert user["username"].startswith("flickmaster_")
    assert user["username_claimed"] is False

    # 2. Test Live Check Username API
    # Too short
    r_short = api.get(f"{BASE_URL}/api/auth/check-username?username=ab")
    assert r_short.status_code == 200
    assert r_short.json()["available"] is False

    # Invalid characters
    r_chars = api.get(f"{BASE_URL}/api/auth/check-username?username=test@user!")
    assert r_chars.status_code == 200
    assert r_chars.json()["available"] is False

    # Reserved username
    r_res = api.get(f"{BASE_URL}/api/auth/check-username?username=admin")
    assert r_res.status_code == 200
    assert r_res.json()["available"] is False

    # Available handle
    desired_handle = f"champ_{suffix}"
    r_avail = api.get(f"{BASE_URL}/api/auth/check-username?username={desired_handle}")
    assert r_avail.status_code == 200
    assert r_avail.json()["available"] is True

    # 3. Claim custom handle (Initial onboarding claim)
    r_claim = api.post(f"{BASE_URL}/api/auth/claim-username", json={"username": desired_handle}, headers=headers)
    assert r_claim.status_code == 200
    claimed_user = r_claim.json()["user"]
    assert claimed_user["username"] == desired_handle
    assert claimed_user["username_claimed"] is True
    assert claimed_user["username_last_changed_at"] is not None

    # Now the handle should be taken when checked by another user
    r_taken = api.get(f"{BASE_URL}/api/auth/check-username?username={desired_handle}")
    assert r_taken.status_code == 200
    assert r_taken.json()["available"] is False

    # 4. Attempt to change handle again immediately -> Must fail with 90-day cooldown error (HTTP 400)
    new_handle = f"new_{suffix}"
    r_second = api.post(f"{BASE_URL}/api/auth/claim-username", json={"username": new_handle}, headers=headers)
    assert r_second.status_code == 400
    assert "90 days" in r_second.json()["detail"]


