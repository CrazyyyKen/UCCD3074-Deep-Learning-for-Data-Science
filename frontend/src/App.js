import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Navbar, Nav } from "react-bootstrap";
import { useState } from "react";
import UploadVideoMode from "./components/UploadVideoMode";
import UploadPhotoModeYOLO from "./components/UploadPhotoModeYOLO";
import UploadPhotoModeFasterRCNN from "./components/UploadPhotoModeFasterRCNN";

export default function App() {
  const [mode, setMode] = useState("video");
  return (
    <>
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand>Shampoo Bottle Defect Detection System</Navbar.Brand>
        <Nav className="ms-auto" activeKey={mode} onSelect={setMode}>
          <Nav.Link eventKey="video">Upload Video</Nav.Link>
          <Nav.Link eventKey="photo_fasterrcnn">Upload Photo (Faster R-CNN)</Nav.Link>
          <Nav.Link eventKey="photo_yolo">Upload Photo (YOLOv8)</Nav.Link>
        </Nav>
      </Navbar>

      <Container className="mt-4">
        {mode === "video" && <UploadVideoMode />}
        {mode === "photo_fasterrcnn" && <UploadPhotoModeFasterRCNN />}
        {mode === "photo_yolo" && <UploadPhotoModeYOLO />}
      </Container>
    </>
  );
}
