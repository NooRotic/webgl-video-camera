import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  WebcamCube,
  WebcamSphere,
  AnimatedVideoCube,
  VideoShaderFX,
  VideoAlphaMask,
  VideoGrid,
} from '../src';

type TabName = 'cube' | 'sphere' | 'animated' | 'shader' | 'alpha' | 'grid';

const TABS: { id: TabName; label: string; description: string }[] = [
  { id: 'cube', label: 'Webcam Cube', description: 'Rotating 3D cube with webcam texture' },
  { id: 'sphere', label: 'Webcam Sphere', description: 'Rotating sphere with webcam video mapped to surface' },
  { id: 'animated', label: 'Animated Cube', description: 'Cube with configurable rotation and debug overlay' },
  { id: 'shader', label: 'Shader FX', description: 'Webcam feed processed through GLSL grayscale shader' },
  { id: 'alpha', label: 'Alpha Mask', description: 'Webcam with alpha mask compositing (webcam fallback)' },
  { id: 'grid', label: 'Video Grid', description: 'NxN tile grid with 12 animations' },
];

const btnStyle = (active: boolean) => ({
  padding: '8px 16px',
  background: active ? '#3b82f6' : '#1a1a1a',
  color: active ? '#fff' : '#999',
  border: '1px solid',
  borderColor: active ? '#3b82f6' : '#333',
  borderRadius: 6,
  cursor: 'pointer' as const,
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  transition: 'all 0.15s ease',
});

const sliderRow = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
    <span style={{ width: 50, color: '#888' }}>{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ flex: 1, accentColor: '#3b82f6' }}
    />
    <span style={{ width: 40, textAlign: 'right', fontFamily: 'monospace', color: '#ccc' }}>{value.toFixed(step < 1 ? 2 : 0)}</span>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('cube');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [status, setStatus] = useState('Initializing...');

  // Controls
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGridControls, setShowGridControls] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Mouse drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffsetStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => {
        const videoInputs = all.filter((d) => d.kind === 'videoinput');
        setDevices(videoInputs);
        if (videoInputs.length > 0) {
          setSelectedDevice(videoInputs[0].deviceId);
          setStatus(`Found ${videoInputs.length} camera(s)`);
        } else {
          setStatus('No cameras found');
        }
      })
      .catch((err) => setStatus(`Device enumeration failed: ${err.message}`));
  }, []);

  // Reset drag offset and scale on tab change
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setScale(1);
    setShowGridControls(false);
  }, [activeTab]);

  const handleReady = useCallback(() => setStatus(`${activeTab} — ready`), [activeTab]);
  const handleError = useCallback((err: Error) => setStatus(`Error: ${err.message}`), []);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffsetStart.current = { ...dragOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragOffset({
      x: dragOffsetStart.current.x + (e.clientX - dragStart.current.x),
      y: dragOffsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Scroll to scale
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.max(0.2, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) {
      viewportRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const baseWidth = activeTab === 'grid' ? 800 : 640;
  const baseHeight = activeTab === 'grid' ? 600 : 480;

  const commonProps = {
    width: baseWidth,
    height: baseHeight,
    selectedDeviceId: selectedDevice,
    onReady: handleReady,
    onError: handleError,
  };

  const activeTabInfo = TABS.find((t) => t.id === activeTab);

  return (
    <div style={{ maxWidth: isFullscreen ? '100%' : 1100, margin: '0 auto', padding: isFullscreen ? 0 : 24 }}>
      {/* Header */}
      {!isFullscreen && (
        <header style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              @riptheai/webgl-video
              <span style={{ fontSize: 13, fontWeight: 400, color: '#666', marginLeft: 8 }}>demo</span>
            </h1>
            <span style={{ fontSize: 12, color: '#555', fontFamily: 'monospace' }}>{status}</span>
          </div>
        </header>
      )}

      {/* Controls bar */}
      {!isFullscreen && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Device selector */}
          {devices.length > 0 && (
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              style={{ background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #333', padding: '6px 10px', borderRadius: 4, fontSize: 13 }}
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Scale slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#666' }}>Scale</span>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{ width: 100, accentColor: '#3b82f6' }}
            />
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#888', width: 35 }}>{scale.toFixed(2)}</span>
          </div>

          {/* Reset position */}
          <button
            onClick={() => { setDragOffset({ x: 0, y: 0 }); setScale(1); }}
            style={{ ...btnStyle(false), padding: '4px 10px', fontSize: 12 }}
          >
            Reset
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{ ...btnStyle(false), padding: '4px 10px', fontSize: 12, marginLeft: 'auto' }}
          >
            Fullscreen
          </button>

          {/* Grid controls toggle */}
          {activeTab === 'grid' && (
            <button
              onClick={() => setShowGridControls((v) => !v)}
              style={{ ...btnStyle(showGridControls), padding: '4px 10px', fontSize: 12 }}
            >
              Grid Controls
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      {!isFullscreen && (
        <nav style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={btnStyle(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* Description */}
      {!isFullscreen && activeTabInfo && (
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>{activeTabInfo.description}</p>
      )}

      {/* Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          background: isFullscreen ? '#000' : '#111',
          borderRadius: isFullscreen ? 0 : 8,
          border: isFullscreen ? 'none' : '1px solid #222',
          minHeight: isFullscreen ? '100vh' : 500,
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {activeTab === 'cube' && <WebcamCube {...commonProps} />}
          {activeTab === 'sphere' && <WebcamSphere {...commonProps} />}
          {activeTab === 'animated' && <AnimatedVideoCube {...commonProps} showDebugInfo />}
          {activeTab === 'shader' && <VideoShaderFX {...commonProps} />}
          {activeTab === 'alpha' && <VideoAlphaMask {...commonProps} />}
          {activeTab === 'grid' && (
            <VideoGrid
              {...commonProps}
              width={baseWidth}
              height={baseHeight}
              showControls={showGridControls}
            />
          )}
        </div>

        {/* Fullscreen exit hint */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              ...btnStyle(false),
              padding: '6px 12px',
              fontSize: 12,
              opacity: 0.7,
            }}
          >
            Exit Fullscreen
          </button>
        )}
      </div>

      {/* Keyboard hints */}
      {!isFullscreen && (
        <p style={{ fontSize: 11, color: '#444', marginTop: 8, textAlign: 'center' }}>
          Scroll to zoom &middot; Click and drag to pan &middot; F11 or button for fullscreen
        </p>
      )}
    </div>
  );
}
