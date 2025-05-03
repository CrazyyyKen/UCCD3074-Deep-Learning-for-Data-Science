import json
import base64
import io
import time
import os
import sys
import webbrowser
import threading

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from PIL import Image
import uvicorn

from model import load_model, predict  # <-- only Faster-RCNN

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def resource_path(relative_path):
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


# load Faster-RCNN once
model = load_model(resource_path("model/fasterrcnn.pth"))
print("✅ Loaded Faster-RCNN model.")


@app.websocket("/ws_upload_photo")
async def websocket_upload_photo(ws: WebSocket):
    await ws.accept()
    print("Upload photo client connected")
    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            req_id = payload.get("reqId")

            b64 = payload["image"].split(",", 1)[-1]
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")

            t0 = time.time()
            results = predict(model, img)
            ms = (time.time() - t0) * 1000
            print(f"[Photo] inference: {ms:.0f} ms — {len(results)} boxes")

            await ws.send_text(json.dumps({"reqId": req_id, "results": results}))
    except WebSocketDisconnect:
        print("Upload photo client disconnected")


@app.websocket("/ws_capture_and_detect")
async def websocket_capture_and_detect(ws: WebSocket):
    await ws.accept()
    print("Capture and detect client connected")
    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            req_id = payload.get("reqId")

            b64 = payload["image"].split(",", 1)[-1]
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")

            t0 = time.time()
            results = predict(model, img)
            ms = (time.time() - t0) * 1000
            print(f"[Capture] inference: {ms:.0f} ms — {len(results)} boxes")

            await ws.send_text(json.dumps({"reqId": req_id, "results": results}))
    except WebSocketDisconnect:
        print("Capture and detect client disconnected")


# serve React build
app.mount("/", StaticFiles(directory=resource_path("build"), html=True), name="static")

if __name__ == "__main__":

    def open_browser():
        time.sleep(1)
        webbrowser.open("http://localhost:8000")

    threading.Thread(target=open_browser).start()

    uvicorn.run(app, host="0.0.0.0", port=8000)
