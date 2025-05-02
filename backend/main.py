import json
import base64
import io
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from model import load_faster_model, predict_faster, load_yolo8_model, predict_yolo8

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load both models at startup
faster_model = load_faster_model("model/fasterrcnn.pth")
yolo_model = load_yolo8_model("model/yolov8.pt")
print("Loaded Faster-RCNN (photo) and YOLOv8 (video) models.")


@app.websocket("/ws_photo_fasterrcnn")
async def websocket_photo_fasterrcnn(ws: WebSocket):
    await ws.accept()
    print("Photo client connected")

    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            req_id = payload.get("reqId")

            # decode the image
            b64 = payload["image"].split(",", 1)[-1]
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")

            # inference + timing
            t0 = time.time()
            results = predict_faster(faster_model, img)
            ms = (time.time() - t0) * 1000
            print(f"[Photo (Faster R-CNN)] inference: {ms:.0f} ms — {len(results)} boxes")

            # echo back the reqId so the client can match it
            await ws.send_text(json.dumps({"reqId": req_id, "results": results}))
    except WebSocketDisconnect:
        print("Photo client disconnected")


@app.websocket("/ws_photo_yolo")
async def websocket_photo_yolo(ws: WebSocket):
    """New photo mode (YOLOv8)."""
    await ws.accept()
    print("YOLO client connected")
    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            req_id = payload.get("reqId")

            b64 = payload["image"].split(",", 1)[-1]
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")

            t0 = time.time()
            results = predict_yolo8(yolo_model, img)
            ms = (time.time() - t0) * 1000
            print(f"[Photo (YOLO) ] inference: {ms:.0f} ms — {len(results)} boxes")

            await ws.send_text(json.dumps({"reqId": req_id, "results": results}))
    except WebSocketDisconnect:
        print("YOLO photo client disconnected")


@app.websocket("/ws_video")
async def websocket_video(ws: WebSocket):
    """Video mode: use YOLOv8 per frame and log inference time."""
    await ws.accept()
    print("Video client connected")
    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            # decode base64 image
            b64 = payload["image"].split(",", 1)[-1]
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")

            # inference + timing
            t0 = time.time()
            results = predict_yolo8(yolo_model, img)
            ms = (time.time() - t0) * 1000
            print(f"[Video] inference: {ms:.0f} ms — {len(results)} boxes")

            await ws.send_text(json.dumps({"results": results}))

    except WebSocketDisconnect:
        print("Video client disconnected")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
