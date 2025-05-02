import React, { useRef, useState, useEffect } from "react";
import { Card, Form } from "react-bootstrap";
import useWebSocket from "../hooks/useWebSocket";
import DefectCanvas from "./DefectCanvas";

export default function UploadVideoMode() {
  const fileRef = useRef();
  const videoRef = useRef();
  const captureRef = useRef();
  const { messages, sendMessage } = useWebSocket(
    "ws://localhost:8000/ws_video"
  );
  const [boxes, setBoxes] = useState([]);

  // Update overlay whenever new WS message arrives
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.results) {
      setBoxes(last.results);
    }
  }, [messages]);

  // Start/stop the frame‐capture loop
  const [running, setRunning] = useState(false);
  useEffect(() => {
    let id;
    if (running) {
      id = setInterval(() => {
        const video = videoRef.current;
        const canvas = captureRef.current;
        if (!video || video.paused || video.ended) return;
        // draw the video into a 512×512 canvas
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, 512, 512);
        // send as JPEG
        const dataUrl = canvas.toDataURL("image/jpeg");
        sendMessage({ image: dataUrl });
      }, 200); // ~5 fps
    }
    return () => clearInterval(id);
  }, [running, sendMessage]);

  // On video file select: preview, autoplay, start sending
  const handleFile = (e) => {
    const f = fileRef.current.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    videoRef.current.src = url;
    videoRef.current.muted = true;
    videoRef.current.play();
    setRunning(true);
  };

  return (
    <Card>
      <Card.Header>Upload Video (YOLO)</Card.Header>
      <Card.Body>
        <Form.Group controlId="formVideo">
          <Form.Label>Choose a shampoo‐bottle video</Form.Label>
          <Form.Control
            type="file"
            accept="video/*"
            ref={fileRef}
            onChange={handleFile}
          />
        </Form.Group>

        <div
          style={{
            position: "relative",
            width: 512,
            height: 512,
            marginTop: "1rem",
          }}
        >
          <video
            ref={videoRef}
            width={512}
            height={512}
            autoPlay
            muted
            controls
            style={{ objectFit: "fill" }} // force 512×512 playback
          />
          <canvas ref={captureRef} style={{ display: "none" }} />
          <DefectCanvas boxes={boxes} width={512} height={512} />
        </div>
      </Card.Body>
    </Card>
  );
}
