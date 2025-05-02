import React, { useRef, useState, useEffect } from "react";
import {
  Card,
  Form,
  Button,
  Row,
  Col,
  Spinner,
  Table,
  Alert,
} from "react-bootstrap";
import DefectCanvas from "./DefectCanvas";
import useWebSocket from "../hooks/useWebSocket";

export default function UploadPhotoModeYOLO() {
  const fileRef = useRef();
  const { messages, sendMessage } = useWebSocket(
    "ws://localhost:8000/ws_photo_yolo"
  );
  const [imageUrl, setImageUrl] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [currentReqId, setCurrentReqId] = useState(null);
  const [loading, setLoading] = useState(false);

  // preview new file & reset
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result);
      setBoxes([]);
      setCurrentReqId(null);
      setLoading(false);
    };
    reader.readAsDataURL(f);
  };

  // only send if not already loading
  const runDetect = () => {
    if (!imageUrl || loading) return;
    const reqId = Date.now().toString();
    setCurrentReqId(reqId);
    setBoxes([]);
    setLoading(true);
    sendMessage({ mode: "photo_yolo", image: imageUrl, reqId });
  };

  // apply only the matching response
  useEffect(() => {
    if (!currentReqId) return;
    const msg = messages
      .slice()
      .reverse()
      .find((m) => m.reqId === currentReqId);

    if (msg && msg.results) {
      console.log("YOLO boxes received:", msg.results);
      setBoxes(msg.results);
      setLoading(false);
    }
  }, [messages, currentReqId]);

  return (
    <Card>
      <Card.Header>Upload Photo</Card.Header>
      <Card.Body>
        <Form>
          <Form.Group controlId="formFile">
            <Form.Label>Choose a shampoo bottle photo</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleFile}
              ref={fileRef}
            />
          </Form.Group>
        </Form>

        <Row className="mt-3">
          <Col md={8} style={{ position: "relative" }}>
            {imageUrl && (
              <div style={{ position: "relative", width: 512, height: 512 }}>
                <img
                  src={imageUrl}
                  alt="preview"
                  width={512}
                  height={512}
                  style={{ display: "block" }}
                />
                <DefectCanvas boxes={boxes} width={512} height={512} />
                {loading && (
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
            )}
          </Col>
        </Row>

        <Button
          variant="success"
          className="mt-3"
          onClick={runDetect}
          disabled={!imageUrl || loading}
        >
          {loading ? "Detecting…" : "Run Detection"}
        </Button>

        {/* no-empty alert */}
        {!loading && currentReqId && boxes.length === 0 && (
          <Alert variant="info" className="mt-3">
            ✅ No defects detected.
          </Alert>
        )}

        {/* results table */}
        {boxes.length > 0 && (
          <Table striped bordered hover className="mt-4">
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
                  <td>
                    {b.score != null ? `${(b.score * 100).toFixed(1)}%` : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
