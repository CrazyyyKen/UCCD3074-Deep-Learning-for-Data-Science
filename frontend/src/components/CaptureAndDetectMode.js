import React, { useRef, useState, useEffect } from "react";
import { Card, Form, Button, Spinner, Alert, Table } from "react-bootstrap";
import useWebSocket from "../hooks/useWebSocket";
import DefectCanvas from "./DefectCanvas";

export default function CaptureAndDetectMode() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef(null);
  const [currentReqId, setCurrentReqId] = useState(null);
  const { messages, sendMessage } = useWebSocket(
    "ws://localhost:8000/ws_capture_and_detect"
  );

  // camera list + selection
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  // snapshot + detection state
  const [snapshot, setSnapshot] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detectionDone, setDetectionDone] = useState(false);

  useEffect(() => {
    // 1) ask once for any camera permission...
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop());
        // now you can enumerate with labels:
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(devs => {
        const vids = devs.filter(d => d.kind === "videoinput");
        setCameras(vids);
        if (vids.length && !selectedCamera) {
          setSelectedCamera(vids[0].deviceId);
        }
      })
      .catch(err => console.error("Need camera permission first", err));
  }, []);
  

  // 2) start/stop camera on selection
  useEffect(() => {
    if (!selectedCamera) return;
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } },
        });
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err) {
        console.error("Could not start camera", err);
      }
    })();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [selectedCamera]);

  // 3) receive & apply detection results
  useEffect(() => {
    if (!currentReqId || messages.length === 0) return;
    const msg = messages
      .slice()
      .reverse()
      .find((m) => m.reqId === currentReqId);
    if (msg && msg.results) {
      setBoxes(msg.results);
      setLoading(false);
      setDetectionDone(true);
    }
  }, [messages, loading]);

  // 4) capture a 512×512 frame
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 512, 512);
    setSnapshot(canvas.toDataURL("image/jpeg"));
    setBoxes([]); // clear old boxes
    setLoading(false);
    setDetectionDone(false); // clear the “we’ve detected once” flag
  };

  // 5) send snapshot for detection
  const handleDetect = () => {
    if (!snapshot) return;
    const reqId = Date.now().toString();
    setCurrentReqId(reqId);
    setLoading(true);
    setDetectionDone(false);
    sendMessage({ image: snapshot, reqId });
  };

  // 6) retake → go back to live
  const handleRetake = () => {
    setSnapshot(null);
    setBoxes([]);
    setLoading(false);
    setDetectionDone(false);
    // video stays streaming under the hood, no need to re-attach
  };

  return (
    <Card>
      <Card.Header>Capture and Detect</Card.Header>
      <Card.Body>
        {/* Camera selector */}
        <Form.Group controlId="cameraSelect" className="mb-3">
          <Form.Label>Select Camera</Form.Label>
          <Form.Select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
          >
            {cameras.map((cam, i) => (
              <option key={i} value={cam.deviceId}>
                {cam.label || `Camera ${i + 1}`}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {/* Hidden resizing canvas */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Live feed or frozen snapshot */}
        <div
          style={{
            position: "relative",
            width: 512,
            height: 512,
            margin: "auto",
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            width={512}
            height={512}
            autoPlay
            muted
            style={{
              objectFit: "fill",
              display: snapshot ? "none" : "block",
            }}
          />
          {snapshot && (
            <img
              src={snapshot}
              width={512}
              height={512}
              alt="snapshot"
              style={{ display: "block" }}
            />
          )}
          <DefectCanvas boxes={boxes} width={512} height={512} />
          {loading && snapshot && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 512,
                height: 512,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <Spinner animation="border" variant="light" />
            </div>
          )}
        </div>

        {/* Capture / Detect / Retake controls */}
        <div className="text-center mt-3">
          {!snapshot ? (
            <Button onClick={handleCapture}>Capture</Button>
          ) : (
            <>
              <Button
                onClick={handleDetect}
                disabled={loading}
                className="me-2"
              >
                {loading ? "Detecting…" : "Detect"}
              </Button>
              <Button onClick={handleRetake} disabled={loading}>
                Retake
              </Button>
            </>
          )}
        </div>

        {/* Post-detection results — only when detectionDone === true */}
        {snapshot &&
          detectionDone &&
          !loading &&
          (boxes.length === 0 ? (
            <Alert variant="info" className="mt-3">
              ✅ No defects detected.
            </Alert>
          ) : (
            <Table striped bordered hover className="mt-3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Defect Type</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {boxes.map((b, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{b.label}</td>
                    <td>{`${(b.score * 100).toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ))}
      </Card.Body>
    </Card>
  );
}
