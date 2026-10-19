import json
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["Real-Time Broadcast"])

class GameConnectionManager:
    def __init__(self):
        # Maps match_code -> list of active WebSockets
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, match_code: str):
        await websocket.accept()
        code = match_code.upper()
        if code not in self.active_rooms:
            self.active_rooms[code] = []
        self.active_rooms[code].append(websocket)

    def disconnect(self, websocket: WebSocket, match_code: str):
        code = match_code.upper()
        if code in self.active_rooms:
            if websocket in self.active_rooms[code]:
                self.active_rooms[code].remove(websocket)
            if not self.active_rooms[code]:
                del self.active_rooms[code]

    async def broadcast_to_room(self, match_code: str, message: dict):
        code = match_code.upper()
        if code in self.active_rooms:
            payload = json.dumps(message)
            stale_sockets = []
            for connection in self.active_rooms[code]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    stale_sockets.append(connection)
            for s in stale_sockets:
                self.disconnect(s, code)

manager = GameConnectionManager()

@router.websocket("/ws/match/{match_code}")
async def match_websocket_endpoint(websocket: WebSocket, match_code: str):
    code = match_code.upper()
    await manager.connect(websocket, code)
    try:
        # Broadcast player joined alert
        await manager.broadcast_to_room(code, {
            "event": "AGENT_CONNECTED",
            "message": "An operative has connected to the tactical channel."
        })

        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
                event_type = data.get("action") or data.get("event")

                # Forward live tactical events to squad
                if event_type in ("RADAR_PING", "HINT_DROPPED", "TARGET_ACQUIRED", "STORM_UPDATE"):
                    await manager.broadcast_to_room(code, data)
                else:
                    # Echo broadcast
                    await manager.broadcast_to_room(code, data)
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, code)
        await manager.broadcast_to_room(code, {
            "event": "AGENT_DISCONNECTED",
            "message": "Operative lost tactical radio connection."
        })
