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
type SourceMode = 'webcam' | 'file';

const TABS: { id: TabName; label: string; description: string; supportsFile?: boolean }[] = [
  { id: 'cube', label: 'Webcam Cube', description: 'Rotating 3D cube with webcam texture' },
  { id: 'sphere', label: 'Webcam Sphere', description: 'Rotating sphere with webcam video mapped to surface' },
  { id: 'animated', label: 'Animated Cube', description: 'Cube with configurable rotation and debug overlay' },
  { id: 'shader', label: 'Shader FX', description: 'Video processed through GLSL grayscale shader', supportsFile: true },
  { id: 'alpha', label: 'Alpha Mask', description: 'Video with alpha mask compositing', supportsFile: true },
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

const smallBtnStyle = (active: boolean) => ({
  ...btnStyle(active),
  padding: '4px 10px',
  fontSize: 12,
});

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('cube');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [status, setStatus] = useState('Initializing...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null); // null = loading
  const [cameraReady, setCameraReady] = useState(false); // true = safe to mount components

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

  // Video source mode
  const [sourceMode, setSourceMode] = useState<SourceMode>('webcam');
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [alphaFileUrl, setAlphaFileUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [alphaFileName, setAlphaFileName] = useState<string>('');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const alphaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      try {
        console.log('[camera-init] Starting...');

        // Step 1: Try enumerateDevices first — if permissions are pre-approved
        // (Chrome site settings), this returns full IDs + labels without getUserMedia.
        setStatus('Detecting cameras...');
        const preliminary = await navigator.mediaDevices.enumerateDevices();
        const preliminaryCams = preliminary.filter((d) => d.kind === 'videoinput');
        console.log('[camera-init] Preliminary enumerate:', preliminaryCams.map(
          (d) => ({ id: d.deviceId.slice(0, 8), label: d.label })
        ));

        if (cancelled) return;

        const hasLabels = preliminaryCams.some((d) => d.label.length > 0);
        let videoInputs: MediaDeviceInfo[];

        if (hasLabels && preliminaryCams.length > 0) {
          // Permissions already granted — we have real IDs and labels, no need for getUserMedia
          console.log('[camera-init] Permissions pre-approved, skipping getUserMedia');
          videoInputs = preliminaryCams;
        } else if (preliminaryCams.length > 0) {
          // Devices exist but no labels — need getUserMedia for permission grant
          console.log('[camera-init] Devices found but no labels, requesting getUserMedia...');
          setStatus('Requesting camera access...');
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((t) => t.stop());
          await new Promise((r) => setTimeout(r, 500));
          if (cancelled) return;

          const all = await navigator.mediaDevices.enumerateDevices();
          videoInputs = all.filter((d) => d.kind === 'videoinput');
          console.log('[camera-init] Post-permission enumerate:', videoInputs.map(
            (d) => ({ id: d.deviceId.slice(0, 8), label: d.label })
          ));
        } else {
          // No video devices at all
          videoInputs = [];
        }

        if (cancelled) return;

        setDevices(videoInputs);
        setHasCamera(videoInputs.length > 0);

        if (videoInputs.length > 0) {
          setSelectedDevice(videoInputs[0].deviceId);
          setStatus(`Found ${videoInputs.length} camera(s)`);
          setCameraError(null);
          console.log('[camera-init] Ready with', videoInputs.length, 'camera(s)');
        } else {
          setStatus('No cameras found');
          setCameraError('No camera detected. Connect a webcam to use live video components.');
          console.log('[camera-init] No cameras found');
        }

        setCameraReady(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[camera-init] Failed:', error.name, error.message);
        setHasCamera(false);
        setCameraReady(true);

        if (error.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Allow camera permissions in your browser to use live video.');
          setStatus('Camera permission denied');
        } else if (error.name === 'NotFoundError') {
          setCameraError('No camera detected. Connect a webcam to use live video components.');
          setStatus('No cameras found');
        } else {
          setCameraError(`Camera error: ${error.message}`);
          setStatus(`Camera error: ${error.message}`);
        }
      }
    }

    initCamera();
    return () => { cancelled = true; };
  }, []);

  // Reset state on tab change
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setScale(1);
    setShowGridControls(false);

    const tabInfo = TABS.find((t) => t.id === activeTab);
    if (!tabInfo?.supportsFile) {
      setSourceMode('webcam');
    }
  }, [activeTab]);

  // Cleanup blob URLs on unmount or change
  useEffect(() => {
    return () => {
      if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);
      if (alphaFileUrl) URL.revokeObjectURL(alphaFileUrl);
    };
  }, [videoFileUrl, alphaFileUrl]);

  const handleReady = useCallback(() => {
    setStatus(`${activeTab} — ready`);
    setCameraError(null);
  }, [activeTab]);

  const handleError = useCallback((err: Error) => {
    setStatus(`Error: ${err.message}`);
    // Detect webcam-related errors and show the no-camera notice
    const msg = err.message.toLowerCase();
    if (msg.includes('video source') || msg.includes('getusermedia') || msg.includes('notallowed') || msg.includes('notfound') || msg.includes('timeout') || msg.includes('denied') || msg.includes('could not start')) {
      setCameraError(err.message);
      setHasCamera(false);
    }
  }, []);

  // File handlers
  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke previous URL
    if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);

    const url = URL.createObjectURL(file);
    setVideoFileUrl(url);
    setVideoFileName(file.name);
    setStatus(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  };

  const handleAlphaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (alphaFileUrl) URL.revokeObjectURL(alphaFileUrl);

    const url = URL.createObjectURL(file);
    setAlphaFileUrl(url);
    setAlphaFileName(file.name);
  };

  const clearVideoFile = () => {
    if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);
    setVideoFileUrl(null);
    setVideoFileName('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const clearAlphaFile = () => {
    if (alphaFileUrl) URL.revokeObjectURL(alphaFileUrl);
    setAlphaFileUrl(null);
    setAlphaFileName('');
    if (alphaInputRef.current) alphaInputRef.current.value = '';
  };

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.max(0.2, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

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
  const activeTabInfo = TABS.find((t) => t.id === activeTab);
  const tabSupportsFile = activeTabInfo?.supportsFile ?? false;

  // Determine videoSrc to pass — undefined means "use webcam"
  const effectiveVideoSrc = sourceMode === 'file' && videoFileUrl ? videoFileUrl : undefined;
  const effectiveAlphaSrc = sourceMode === 'file' && alphaFileUrl ? alphaFileUrl : undefined;

  // Does the current tab need a webcam? (not needed if using file source with a file loaded)
  const needsWebcam = !(tabSupportsFile && sourceMode === 'file' && videoFileUrl);

  const commonProps = {
    width: baseWidth,
    height: baseHeight,
    selectedDeviceId: selectedDevice,
    onReady: handleReady,
    onError: handleError,
  };

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
          {/* Device selector — only when in webcam mode */}
          {(sourceMode === 'webcam' || !tabSupportsFile) && devices.length > 0 && (
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

          {/* Reset */}
          <button
            onClick={() => { setDragOffset({ x: 0, y: 0 }); setScale(1); }}
            style={smallBtnStyle(false)}
          >
            Reset
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{ ...smallBtnStyle(false), marginLeft: 'auto' }}
          >
            Fullscreen
          </button>

          {/* Grid controls toggle */}
          {activeTab === 'grid' && (
            <button
              onClick={() => setShowGridControls((v) => !v)}
              style={smallBtnStyle(showGridControls)}
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

      {/* Source selector — only for tabs that support file input */}
      {!isFullscreen && tabSupportsFile && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 16,
          padding: 14,
          background: '#141414',
          borderRadius: 8,
          border: '1px solid #222',
        }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Source:</span>
            <button
              onClick={() => setSourceMode('webcam')}
              style={smallBtnStyle(sourceMode === 'webcam')}
            >
              Webcam
            </button>
            <button
              onClick={() => setSourceMode('file')}
              style={smallBtnStyle(sourceMode === 'file')}
            >
              Video File
            </button>
          </div>

          {/* File inputs — only visible in file mode */}
          {sourceMode === 'file' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Video file */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#666', width: 80 }}>Video:</span>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFile}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  style={smallBtnStyle(false)}
                >
                  {videoFileName || 'Choose video...'}
                </button>
                {videoFileName && (
                  <button
                    onClick={clearVideoFile}
                    style={{ ...smallBtnStyle(false), color: '#f87171', borderColor: '#7f1d1d' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Alpha mask file — only for Alpha Mask tab */}
              {activeTab === 'alpha' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#666', width: 80 }}>Alpha mask:</span>
                  <input
                    ref={alphaInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleAlphaFile}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => alphaInputRef.current?.click()}
                    style={smallBtnStyle(false)}
                  >
                    {alphaFileName || 'Choose mask...'}
                  </button>
                  {alphaFileName && (
                    <button
                      onClick={clearAlphaFile}
                      style={{ ...smallBtnStyle(false), color: '#f87171', borderColor: '#7f1d1d' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Help text */}
              {sourceMode === 'file' && !videoFileUrl && (
                <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                  Select a video file to apply the {activeTab === 'shader' ? 'shader effect' : 'alpha mask'} to.
                  Without a file, the component will fall back to webcam.
                </p>
              )}
            </div>
          )}
        </div>
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
        {/* No camera notice */}
        {needsWebcam && (hasCamera === false || cameraError) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            background: 'rgba(0,0,0,0.85)',
            borderRadius: isFullscreen ? 0 : 8,
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#1e1e1e',
              border: '2px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" strokeWidth="2" />
              </svg>
            </div>
            <p style={{ color: '#e5e5e5', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
              No Camera Connected
            </p>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px', maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
              {cameraError || 'Connect a webcam and reload the page to use live video components.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={smallBtnStyle(false)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {needsWebcam && hasCamera === null && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            background: 'rgba(0,0,0,0.7)',
            borderRadius: isFullscreen ? 0 : 8,
          }}>
            <p style={{ color: '#888', fontSize: 14 }}>Requesting camera access...</p>
          </div>
        )}

        <div
          style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* Webcam-only components: wait for camera init to complete and release device */}
          {cameraReady && !cameraError && activeTab === 'cube' && <WebcamCube {...commonProps} />}
          {cameraReady && !cameraError && activeTab === 'sphere' && <WebcamSphere {...commonProps} />}
          {cameraReady && !cameraError && activeTab === 'animated' && <AnimatedVideoCube {...commonProps} showDebugInfo />}
          {/* Shader/Alpha: file mode doesn't need camera, but still wait for init to finish */}
          {cameraReady && (activeTab === 'shader') && (!needsWebcam || !cameraError) && (
            <VideoShaderFX
              {...commonProps}
              videoSrc={effectiveVideoSrc}
            />
          )}
          {cameraReady && (activeTab === 'alpha') && (!needsWebcam || !cameraError) && (
            <VideoAlphaMask
              {...commonProps}
              videoSrc={effectiveVideoSrc}
              alphaSrc={effectiveAlphaSrc}
            />
          )}
          {cameraReady && !cameraError && activeTab === 'grid' && (
            <VideoGrid
              {...commonProps}
              width={baseWidth}
              height={baseHeight}
              showControls={showGridControls}
            />
          )}
        </div>

        {/* Fullscreen exit */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              ...smallBtnStyle(false),
              opacity: 0.7,
            }}
          >
            Exit Fullscreen
          </button>
        )}
      </div>

      {/* Footer hints */}
      {!isFullscreen && (
        <p style={{ fontSize: 11, color: '#444', marginTop: 8, textAlign: 'center' }}>
          Scroll to zoom &middot; Click and drag to pan &middot; F11 or button for fullscreen
        </p>
      )}
    </div>
  );
}
