import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Navbar, Nav } from "react-bootstrap";
import { useState } from "react";
import CaptureAndDetectMode from "./components/CaptureAndDetectMode";
import UploadPhotoMode from "./components/UploadPhotoMode";

export default function App() {
  const [mode, setMode] = useState("capture_and_detect");
  return (
    <>
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand>Shampoo Bottle Defect Detection System</Navbar.Brand>
        <Nav className="ms-auto" activeKey={mode} onSelect={setMode}>
          <Nav.Link eventKey="capture_and_detect">Capture And Detect</Nav.Link>
          <Nav.Link eventKey="upload_photo">Upload Photo</Nav.Link>
        </Nav>
      </Navbar>

      <Container className="mt-4">
        {mode === "capture_and_detect" && <CaptureAndDetectMode />}
        {mode === "upload_photo" && <UploadPhotoMode />}
      </Container>
    </>
  );
}
