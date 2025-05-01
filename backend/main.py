import json
import base64
import io
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from model import load_model, predict

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow your React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None

@app.on_event("startup")
async def startup_event():
    global model
    model = load_model("model/faster_rcnn.pth")
    print("Model loaded.")

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    # track the latest request ID we've seen
    ws.state.latest_req = None

    try:
        while True:
            # 1) receive and parse
            text = await ws.receive_text()
            payload = json.loads(text)
            req_id = payload.get("reqId")

            # 2) record the newest reqId
            if req_id is not None:
                ws.state.latest_req = req_id

            # 3) drop any stale requests
            if req_id is not None and req_id != ws.state.latest_req:
                continue

            # 4) decode the image
            b64 = payload.get("image", "")
            if "," in b64:
                b64 = b64.split(",", 1)[1]      # strip data URL header
            img_bytes = base64.b64decode(b64)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

            # 5) run inference
            print(f"[{ws.state.latest_req}] Running inference…")
            t0 = time.time()
            detections = predict(model, img)
            elapsed = (time.time() - t0) * 1000
            print(f"Inference done in {elapsed:.0f} ms — {len(detections)} boxes")

            # 6) send back the results, echoing reqId
            await ws.send_text(json.dumps({
                "reqId":   ws.state.latest_req,
                "results": detections
            }))

    except WebSocketDisconnect:
        print("Client disconnected")
