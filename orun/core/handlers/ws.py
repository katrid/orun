import json
from collections import defaultdict

from starlette.applications import Starlette
from starlette.endpoints import WebSocketEndpoint, WebSocket
from starlette.routing import WebSocketRoute, Mount

from .asgi import ASGIHandler

rooms: dict = defaultdict(set)


class WebSocketHandler(WebSocketEndpoint):
    encoding = "text"

    async def on_connect(self, websocket: WebSocket):
        await websocket.accept()
        # TODO consume user_id from session or token
        user_id = websocket.query_params.get("user_id")
        websocket.scope["user_id"] = user_id
        # auto register to default room
        rooms[f"user:{user_id}"].add(websocket)

    async def on_receive(self, websocket, data):
        msg = json.loads(data)
        msg_type = msg.get("type")
        if msg_type == "join":
            room = msg.get("room")
            rooms[room].add(websocket)
            await websocket.send_text(json.dumps({"type": "join", "room": room, "status": "ok"}))
        elif msg_type == "message":
            pass
        elif msg_type == "leave":
            room = msg.get("room")
            rooms[room].discard(websocket)
            await websocket.send_text(json.dumps({"type": "leave", "room": room, "status": "ok"}))

    async def on_disconnect(self, websocket, close_code):
        for room in rooms:
            rooms[room].discard(websocket)


def send_to_room(room: str, message: str):
    for websocket in rooms[room]:
        import asyncio
        asyncio.create_task(websocket.send_text(message))


asgi_handler = Starlette(
    routes=[
        WebSocketRoute('/ws', WebSocketHandler),
        Mount('/', app=ASGIHandler()),
    ]
)
