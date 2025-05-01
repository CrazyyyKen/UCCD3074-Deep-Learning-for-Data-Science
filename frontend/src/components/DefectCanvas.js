import React from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';

// simple color palette for different track IDs
const COLORS = [
  'red','blue','green','magenta','cyan',
  'orange','lime','yellow','pink','white'
];

export default function DefectCanvas({ boxes, width, height }) {
  return (
    <Stage width={width} height={height}
           style={{ position: 'absolute', top: 0, left: 0 }}>
      <Layer>
        {boxes.map((b, i) => {
          // pick a color by track_id (or default red)
          const col = b.track_id != null
            ? COLORS[b.track_id % COLORS.length]
            : 'red';
          const text = b.track_id != null
            ? `${b.label} #${b.track_id}`
            : `${b.label} ${(b.score*100).toFixed(1)}%`;

          return (
            <React.Fragment key={i}>
              <Rect
                x={b.x1} y={b.y1}
                width={b.x2 - b.x1}
                height={b.y2 - b.y1}
                stroke={col}
                strokeWidth={2}
              />
              <Text
                x={b.x1}
                y={b.y1 - 18}
                text={text}
                fontSize={14}
                fill={col}
              />
            </React.Fragment>
          );
        })}
      </Layer>
    </Stage>
  );
}
