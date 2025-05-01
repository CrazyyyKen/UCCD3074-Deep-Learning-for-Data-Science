import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Navbar, Nav } from "react-bootstrap";
import { useState } from "react";
import UploadPhotoMode from "./components/UploadPhotoMode";
import UploadVideoMode from "./components/UploadVideoMode";

export default function App() {
  const [mode, setMode] = useState("video");
  return (
    <>
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand>Shampoo-Defect Detector</Navbar.Brand>
        <Nav className="ms-auto" activeKey={mode} onSelect={setMode}>
          <Nav.Link eventKey="video">Upload Video</Nav.Link>
          <Nav.Link eventKey="upload">Upload Photo</Nav.Link>
        </Nav>
      </Navbar>

      <Container className="mt-4">
        {mode === "video" ? <UploadVideoMode /> : <UploadPhotoMode />}{" "}
      </Container>
    </>
  );
}
