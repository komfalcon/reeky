import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import './Mindmap.css';

export default function ZoomableMindmapViewer({ data }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('.mindmap-node-element')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor) => {
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.3), 3));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const calculatePath = (x1, y1, x2, y2) => {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  };

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];

  return (
    <div className="mindmap-stage-outer">
      <div className="canvas-hud">
        <button onClick={() => handleZoom(1.25)} title="Zoom In"><ZoomIn size={16} /></button>
        <button onClick={() => handleZoom(0.8)} title="Zoom Out"><ZoomOut size={16} /></button>
        <button onClick={handleReset} title="Reset Scale"><Maximize size={16} /></button>
      </div>
      <div
        ref={containerRef}
        className="mindmap-svg-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg className="mindmap-svg-canvas" width="100%" height="100%">
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <g className="edges-layer">
              {edges.map((edge, i) => {
                const sourceId = edge.source ?? edge.from;
                const targetId = edge.target ?? edge.to;
                const sourceNode = nodes.find(n => n.id === sourceId);
                const targetNode = nodes.find(n => n.id === targetId);
                if (!sourceNode || !targetNode) return null;
                return (
                  <path
                    key={edge.id ?? `edge-${i}`}
                    d={calculatePath(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y)}
                    className="mindmap-edge-path"
                  />
                );
              })}
            </g>
            <g className="nodes-layer">
              {nodes.map((node) => {
                const nodeWidth = 140;
                const nodeHeight = 50;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x - nodeWidth / 2}, ${node.y - nodeHeight / 2})`}
                    className={`mindmap-node-element node-level-${node.level || 1}`}
                  >
                    <rect
                      width={nodeWidth}
                      height={nodeHeight}
                      rx={10}
                      className="node-rect"
                    />
                    <text
                      x={nodeWidth / 2}
                      y={nodeHeight / 2 + 5}
                      textAnchor="middle"
                      className="node-label"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
