import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react';

// Builds the nested tree hierarchy
const transformToTree = (data) => {
  if (data.children) return data; 
  if (!data.nodes || !data.connections) return data;
  
  const nodesById = {};
  data.nodes.forEach(n => {
    nodesById[n.id] = { ...n, id: n.id, name: n.label || n.title || n.id, children: [] };
  });

  const rootNodes = [];
  const childIds = new Set();
  
  data.connections.forEach(conn => {
    const sourceId = typeof conn.source === 'object' ? conn.source.id : conn.source;
    const targetId = typeof conn.target === 'object' ? conn.target.id : conn.target;
    
    if (nodesById[sourceId] && nodesById[targetId]) {
      nodesById[sourceId].children.push(nodesById[targetId]);
      childIds.add(targetId);
    }
  });

  data.nodes.forEach(n => {
    if (!childIds.has(n.id)) {
      rootNodes.push(nodesById[n.id]);
    }
  });

  if (rootNodes.length === 1) return rootNodes[0];
  
  // If disconnected graph, find the node with the most descendants to be the root, or just group them
  if (rootNodes.length > 0) {
    // Attempt to find the true root (e.g. node with the word "Evolution" or most children)
    let bestRoot = rootNodes[0];
    let maxChildren = -1;
    rootNodes.forEach(rn => {
      if (rn.children.length > maxChildren) {
        maxChildren = rn.children.length;
        bestRoot = rn;
      }
    });
    // If the best root has significantly more children, make it the main root and attach orphans
    if (maxChildren > 0) {
      rootNodes.forEach(rn => {
        if (rn.id !== bestRoot.id) {
          bestRoot.children.push(rn);
        }
      });
      return bestRoot;
    }
    return { id: 'root', name: 'Spatial Mindmap', children: rootNodes };
  }

  if (rootNodes.length === 0 && Object.keys(nodesById).length > 0) return Object.values(nodesById)[0];
  return { id: 'root', name: 'Spatial Mindmap', children: [] };
};

// Extremely simple tree layout algorithm (horizontal layout)
const layoutTree = (rootNode, collapsedIds, startX = 0, startY = 0) => {
  const nodeWidth = 260;
  const nodeHeight = 44;
  const levelXSpacing = 320;
  const siblingYSpacing = 60;

  const nodes = [];
  const links = [];
  let currentY = startY;

  const traverse = (node, depth, yPos = null) => {
    const isLeaf = !node.children || node.children.length === 0 || collapsedIds.has(node.id);
    const x = startX + (depth * levelXSpacing);
    
    let childrenYStart = currentY;
    let childrenYEnd = currentY;

    if (!isLeaf) {
      const childNodes = [];
      node.children.forEach((child, i) => {
        const childLayout = traverse(child, depth + 1);
        childNodes.push(childLayout);
        if (i === 0) childrenYStart = childLayout.y;
        childrenYEnd = childLayout.y;
      });
      const y = yPos !== null ? yPos : (childrenYStart + childrenYEnd) / 2;
      
      const currentNode = { ...node, x, y, width: nodeWidth, height: nodeHeight, _childrenCount: node.children.length };
      nodes.push(currentNode);

      childNodes.forEach(childLayout => {
        links.push({
          source: currentNode,
          target: childLayout
        });
      });

      return currentNode;
    } else {
      const y = yPos !== null ? yPos : currentY;
      currentY += siblingYSpacing;
      const currentNode = { ...node, x, y, width: nodeWidth, height: nodeHeight, _childrenCount: node.children ? node.children.length : 0 };
      nodes.push(currentNode);
      return currentNode;
    }
  };

  traverse(rootNode, 0);
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  });

  return { nodes, links, bounds: { minX, minY, maxX, maxY } };
};

const CollapsibleTree = ({ treeData }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [collapsedIds, setCollapsedIds] = useState(new Set());

  const hierarchicalData = useMemo(() => transformToTree(treeData), [treeData]);
  const layout = useMemo(() => layoutTree(hierarchicalData, collapsedIds), [hierarchicalData, collapsedIds]);

  useEffect(() => {
    if (!containerRef.current || !layout.bounds || layout.nodes.length === 0) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const mapWidth = layout.bounds.maxX - layout.bounds.minX + 300;
    const mapHeight = layout.bounds.maxY - layout.bounds.minY + 100;
    
    const scaleX = width / mapWidth;
    const scaleY = height / mapHeight;
    const scale = Math.min(scaleX, scaleY, 1) * 0.8;

    const centerX = layout.bounds.minX + (layout.bounds.maxX - layout.bounds.minX) / 2;
    const centerY = layout.bounds.minY + (layout.bounds.maxY - layout.bounds.minY) / 2;

    setTransform({
      x: (width / 2) - (centerX * scale),
      y: (height / 2) - (centerY * scale),
      scale
    });
  }, [layout.bounds.minX, layout.bounds.maxX, layout.bounds.minY, layout.bounds.maxY, layout.nodes.length]);

  const handleMouseDown = (e) => {
    if (e.target.tagName !== 'svg' && e.target.tagName !== 'g') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTransform({ ...transform, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({ ...prev, scale: Math.max(0.1, Math.min(prev.scale * scaleChange, 3)) }));
  };

  const toggleCollapse = (nodeId) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const drawPath = (source, target) => {
    const startX = source.x + source.width + 12; // Start exactly at the collapse button
    const startY = source.y + source.height / 2;
    const endX = target.x; 
    const endY = target.y + target.height / 2;
    const controlPointX = startX + (endX - startX) / 2;
    return `M ${startX} ${startY} C ${controlPointX} ${startY}, ${controlPointX} ${endY}, ${endX} ${endY}`;
  };

  if (!treeData) return null;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '600px',
        background: '#1a1b1e', // Exact dark background match
        overflow: 'hidden',
        borderRadius: '16px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          
          {layout.links.map((link, i) => (
            <path
              key={`link-${i}`}
              d={drawPath(link.source, link.target)}
              fill="none"
              stroke="#818cf8" // Soft purple connecting lines
              strokeWidth="2.5"
              opacity="0.8"
            />
          ))}

          {layout.nodes.map((node, i) => {
            const hasChildren = node._childrenCount > 0;
            const isCollapsed = collapsedIds.has(node.id);

            return (
              <g key={`node-${i}`} transform={`translate(${node.x}, ${node.y})`}>
                <rect
                  width={node.width}
                  height={node.height}
                  rx="8"
                  fill="#474f5d" // Node background match
                  stroke="none"
                />
                <text
                  x="16"
                  y={node.height / 2}
                  textAnchor="start"
                  dominantBaseline="central"
                  fill="#f3f4f6" // Very light gray text
                  fontSize="15px"
                  fontWeight="500"
                  fontFamily="var(--font-main)"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.name && node.name.length > 32 ? node.name.substring(0, 32) + '...' : node.name}
                </text>
                
                {hasChildren && (
                  <g 
                    transform={`translate(${node.width + 12}, ${node.height / 2})`} 
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                  >
                    <circle cx="0" cy="0" r="12" fill="#474f5d" />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fill="#f3f4f6" fontSize="14px" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                      {isCollapsed ? '>' : '<'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom Controls Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        right: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        background: '#1f2937',
        padding: '0.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <button className="btn-icon" onClick={() => setTransform(p => ({ ...p, scale: p.scale * 1.2 }))} style={{ background: 'transparent', color: '#fff', border: 'none' }}><ZoomIn size={18} /></button>
        <button className="btn-icon" onClick={() => setTransform(p => ({ ...p, scale: p.scale / 1.2 }))} style={{ background: 'transparent', color: '#fff', border: 'none' }}><ZoomOut size={18} /></button>
        <button className="btn-icon" onClick={() => {
          const { width, height } = containerRef.current.getBoundingClientRect();
          const mapWidth = layout.bounds.maxX - layout.bounds.minX + 300;
          const mapHeight = layout.bounds.maxY - layout.bounds.minY + 100;
          const scale = Math.min(width / mapWidth, height / mapHeight, 1) * 0.8;
          const centerX = layout.bounds.minX + (layout.bounds.maxX - layout.bounds.minX) / 2;
          const centerY = layout.bounds.minY + (layout.bounds.maxY - layout.bounds.minY) / 2;
          setTransform({ x: (width / 2) - (centerX * scale), y: (height / 2) - (centerY * scale), scale });
        }} style={{ background: 'transparent', color: '#fff', border: 'none' }}><Maximize size={18} /></button>
      </div>
    </div>
  );
};

export default CollapsibleTree;
