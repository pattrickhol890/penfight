import pytest
from fastapi.testclient import TestClient
from server import app, room_manager

client = TestClient(app)

def test_rest_root():
    response = client.get("/api/")
    assert response.status_code == 200
    assert response.json() == {"message": "Pen Fight API"}

def test_websocket_create_and_join_room():
    with client.websocket_connect("/ws") as ws1:
        # Player 1 creates room
        ws1.send_json({"type": "CREATE_ROOM"})
        data1 = ws1.receive_json()
        assert data1["type"] == "ROOM_CREATED"
        room_code = data1["room_code"]
        assert len(room_code) == 5
        assert data1["role"] == "p1"

        # Player 2 joins room
        with client.websocket_connect("/ws") as ws2:
            ws2.send_json({"type": "JOIN_ROOM", "room_code": room_code})
            
            # Both players should receive GAME_START
            msg_p1 = ws1.receive_json()
            msg_p2 = ws2.receive_json()

            assert msg_p1["type"] == "GAME_START"
            assert msg_p1["role"] == "p1"
            assert msg_p2["type"] == "GAME_START"
            assert msg_p2["role"] == "p2"

            # Player 1 sends aim update
            ws1.send_json({
                "type": "AIM_UPDATE",
                "aim": {"penId": "p1_pen_0", "start": {"x": 100, "y": 200}, "current": {"x": 80, "y": 180}}
            })
            aim_msg = ws2.receive_json()
            assert aim_msg["type"] == "OPPONENT_AIM"
            assert aim_msg["aim"]["penId"] == "p1_pen_0"

            # Player 1 sends flick
            ws1.send_json({
                "type": "FLICK_PEN",
                "penId": "p1_pen_0",
                "v": {"x": 10, "y": -5},
                "omega": 0.2,
                "ratio": 0.8
            })
            flick_msg = ws2.receive_json()
            assert flick_msg["type"] == "OPPONENT_FLICK"
            assert flick_msg["penId"] == "p1_pen_0"
