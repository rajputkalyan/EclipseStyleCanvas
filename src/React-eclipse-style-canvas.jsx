import { useState, useRef, useEffect } from 'react';

const shapes = [
  'Rectangle', 'Ellipse', 'Diamond', 'Parallelogram',
  'Arrow', 'Cylinder', 'Cloud', 'Stickman',
  'Document', 'Database', 'Decision', 'InputOutput'
];

export default function App() {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [canvasItems, setCanvasItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const isResizing = useRef(false);
  const canvasRef = useRef(null);
  const dragItem = useRef(null);
  const resizeItem = useRef(null);
  const selectedItem = useRef(null);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth > 150 && newWidth < 500) setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleDragStart = (e, data, type) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ data, type }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    try {
      const { data, type } = JSON.parse(raw);
      if (type === 'shape') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCanvasItems([...canvasItems, { id: Date.now(), type: data, x, y, width: 80, height: 50 }]);
      }
    } catch (err) {
      console.error('Invalid drag data');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleShapeMouseDown = (e, id) => {
    e.stopPropagation();
    selectedItem.current = id;
    const rect = e.target.getBoundingClientRect();
    dragItem.current = {
      id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
    document.addEventListener('mousemove', handleCanvasMouseMove);
    document.addEventListener('mouseup', handleCanvasMouseUp);
  };

  const handleCanvasMouseMove = (e) => {
    if (!dragItem.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragItem.current.offsetX;
    const y = e.clientY - rect.top - dragItem.current.offsetY;
    setCanvasItems((prev) =>
      prev.map((item) =>
        item.id === dragItem.current.id ? { ...item, x, y } : item
      )
    );
  };

  const handleCanvasMouseUp = () => {
    dragItem.current = null;
    document.removeEventListener('mousemove', handleCanvasMouseMove);
    document.removeEventListener('mouseup', handleCanvasMouseUp);
  };

  const handleResizeStart = (e, id) => {
    e.stopPropagation();
    resizeItem.current = { id, startX: e.clientX, startY: e.clientY };
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e) => {
    if (!resizeItem.current) return;
    const { id, startX, startY } = resizeItem.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setCanvasItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              width: Math.max(20, item.width + dx),
              height: Math.max(20, item.height + dy)
            }
          : item
      )
    );
    resizeItem.current.startX = e.clientX;
    resizeItem.current.startY = e.clientY;
  };

  const stopResize = () => {
    resizeItem.current = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedItem.current != null) {
        const id = selectedItem.current;
        setCanvasItems((prev) => prev.filter((item) => item.id !== id));
        setConnections((prev) => prev.filter((conn) => conn.from !== id && conn.to !== id));
        selectedItem.current = null;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getConnectorPoint = (item, side) => {
    switch (side) {
      case 'right':
        return { x: item.x + item.width, y: item.y + item.height / 2 };
      case 'left':
        return { x: item.x, y: item.y + item.height / 2 };
      default:
        return { x: item.x + item.width, y: item.y + item.height / 2 };
    }
  };

  const renderConnections = () => {
    return connections.map((conn, index) => {
      const from = canvasItems.find((item) => item.id === conn.from);
      const to = canvasItems.find((item) => item.id === conn.to);
      if (!from || !to) return null;
      const p1 = getConnectorPoint(from, 'right');
      const p2 = getConnectorPoint(to, 'left');
      const midX = (p1.x + p2.x) / 2;
      return (
        <path
          key={index}
          d={`M${p1.x},${p1.y} L${midX},${p1.y} L${midX},${p2.y} L${p2.x},${p2.y}`}
          stroke="white"
          fill="none"
          markerEnd="url(#arrow)"
        />
      );
    });
  };

  const handleConnectorClick = (e, fromId) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== fromId) {
        setConnections([...connections, { from: connectingFrom, to: fromId }]);
        setConnectingFrom(null);
      }
    } else {
      setConnectingFrom(fromId);
    }
  };

  const renderShape = (item) => {
    const commonStyle = {
      position: 'absolute',
      top: item.y,
      left: item.x,
      width: item.width,
      height: item.height
    };
    const shapeClass = {
      Rectangle: 'bg-transparent border-2 border-white',
      Ellipse: 'bg-transparent border-2 border-white rounded-full',
      Diamond: 'bg-transparent border-2 border-white rotate-45',
      Parallelogram: 'bg-transparent border-2 border-white skew-x-12',
      Arrow: 'w-0 h-0 border-t-8 border-b-8 border-l-16 border-t-transparent border-b-transparent border-l-white',
      Cylinder: 'bg-transparent border-2 border-white rounded-full',
      Cloud: 'text-white text-xs px-2 py-1 border-2 border-white rounded-full',
      Stickman: 'text-white text-xs',
      Document: 'bg-transparent border-2 border-white',
      Database: 'bg-transparent border-2 border-white rounded-full',
      Decision: 'bg-transparent border-2 border-white rotate-45',
      InputOutput: 'bg-transparent border-2 border-white skew-x-6'
    };

    return (
      <div
        key={item.id}
        onMouseDown={(e) => handleShapeMouseDown(e, item.id)}
        style={commonStyle}
        className={`cursor-move ${shapeClass[item.type] || 'text-white'}`}
      >
        {['Cloud', 'Stickman'].includes(item.type) ? item.type : ''}
        <div
          onMouseDown={(e) => handleResizeStart(e, item.id)}
          className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
        ></div>
        <div
          onClick={(e) => handleConnectorClick(e, item.id)}
          className="absolute right-0 top-1/2 w-2 h-2 bg-yellow-400 rounded-full cursor-pointer"
          style={{ transform: 'translateY(-50%)' }}
        ></div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
      <div
        className="p-4 overflow-y-auto border-r border-gray-700"
        style={{ width: sidebarWidth }}
      >
        <h2 className="text-lg font-semibold mb-4">General</h2>
        <h2 className="text-lg font-semibold mb-2">Shapes</h2>
        <ul className="space-y-1">
          {shapes.map((shape) => (
            <li
              key={shape}
              draggable
              onDragStart={(e) => handleDragStart(e, shape, 'shape')}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-move"
            >
              {shape}
            </li>
          ))}
        </ul>
      </div>

      <div
        onMouseDown={handleMouseDown}
        className="w-1 cursor-col-resize bg-gray-600 hover:bg-gray-500"
      ></div>

      <div
        ref={canvasRef}
        className="flex-1 relative bg-[#1E1E1E]"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <svg className="absolute w-full h-full pointer-events-none">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="white" />
            </marker>
          </defs>
          {renderConnections()}
        </svg>
        {canvasItems.map(renderShape)}
      </div>
    </div>
  );
}
