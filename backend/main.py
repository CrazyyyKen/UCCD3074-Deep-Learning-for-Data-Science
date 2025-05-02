import json
import base64
import io
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import uvicorn

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys

import webbrowser
import threading

from model import load_faster_model, predict_faster, load_yolo8_model, predict_yolo8

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def resource_path(relative_path):
    """Get the absolute path to a resource, works for PyInstaller onefile mode"""
    if hasattr(sys, "_MEIPASS"):
        # PyInstaller extracts to a temp folder and stores path in _MEIPASS
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


# Load both models at startup
faster_model = load_faster_model(resource_path("model/fasterrcnn.pth"))
yolo_model = load_yolo8_model(resource_path("model/yolov8.pt"))
print("Loaded Faster-RCNN and YOLOv8 models.")


@app.websocket("/ws_photo_fasterrcnn")
async def websocket_photo_fasterrcnn(ws: WebSocket):
    await ws.accept()
    print("Photo client (Faster R-CNN) connected")

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
            print(
                f"[Photo (Faster R-CNN)] inference: {ms:.0f} ms — {len(results)} boxes"
            )

            # echo back the reqId so the client can match it
            await ws.send_text(json.dumps({"reqId": req_id, "results": results}))
    except WebSocketDisconnect:
        print("Photo client (Faster R-CNN) disconnected")


@app.websocket("/ws_photo_yolo")
async def websocket_photo_yolo(ws: WebSocket):
    """New photo mode (YOLOv8)."""
    await ws.accept()
    print("Photo client (YOLOv8) connected")
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
        print("Photo client (YOLOv8) disconnected")


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


# Mount React static files
app.mount("/", StaticFiles(directory=resource_path("build"), html=True), name="static")

if __name__ == "__main__":
    import webbrowser
    import threading

    def open_browser():
        time.sleep(1)
        webbrowser.open("http://localhost:8000")

    threading.Thread(target=open_browser).start()

    uvicorn.run(app, host="0.0.0.0", port=8000)
