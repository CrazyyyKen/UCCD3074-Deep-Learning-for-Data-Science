import React, { useRef, useState, useEffect } from 'react';
import { Card, Form } from 'react-bootstrap';
import DefectCanvas from './DefectCanvas';
import useWebSocket from '../hooks/useWebSocket';

export default function UploadVideoMode() {
  const fileRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const { messages, sendMessage } = useWebSocket('ws://localhost:8000/ws');
  const [boxes, setBoxes]   = useState([]);

  // 1) preview the chosen video
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    videoRef.current.src = url;
  };

  // 2) push detections into state
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.results) {
      setBoxes(last.results);
    }
  }, [messages]);

  // 3) when the video plays, grab frames every 100ms
  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    let intervalId;

    const captureFrame = () => {
      if (video.paused || video.ended) return;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0,
                    canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      sendMessage({ image: dataUrl });
    };

    const onPlay = () => {
      intervalId = setInterval(captureFrame, 100);
    };
    const onPause = () => clearInterval(intervalId);
    const onEnded = () => clearInterval(intervalId);

    video.addEventListener('play',  onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      clearInterval(intervalId);
      video.removeEventListener('play',  onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [sendMessage]);

  return (
    <Card>
      <Card.Header>Upload Video</Card.Header>
      <Card.Body>
        <Form.Group controlId="formVideo">
          <Form.Label>Choose a shampoo‐bottle video</Form.Label>
          <Form.Control
            type="file"
            accept="video/*"
            onChange={handleFile}
            ref={fileRef}
          />
        </Form.Group>

        <div style={{ position:'relative', width:512, height:512, marginTop: '1rem' }}>
          <video
            ref={videoRef}
            width={512}
            height={512}
            controls
            style={{ display: 'block' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <DefectCanvas boxes={boxes} width={512} height={512} />
        </div>
      </Card.Body>
    </Card>
  );
}
