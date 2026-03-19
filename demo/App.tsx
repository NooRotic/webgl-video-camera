import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  WebcamCube,
  WebcamSphere,
  AnimatedVideoCube,
  VideoShaderFX,
  VideoAlphaMask,
  VideoGrid,
  VideoVHSEffect,
} from '../src';

type TabName = 'cube' | 'sphere' | 'animated' | 'shader' | 'alpha' | 'grid' | 'vhs';
type SourceMode = 'webcam' | 'file';

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21" /></svg>
);
const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1" /><rect x="14" y="3" width="5" height="18" rx="1" /></svg>
);

const TABS: { id: TabName; label: string; description: string; supportsFile?: boolean }[] = [
  { id: 'cube', label: 'Webcam Cube', description: 'Rotating 3D cube with webcam texture', supportsFile: true },
  { id: 'sphere', label: 'Webcam Sphere', description: 'Rotating sphere with webcam video mapped to surface', supportsFile: true },
  { id: 'animated', label: 'Animated Cube', description: 'Cube with configurable rotation and debug overlay', supportsFile: true },
  { id: 'shader', label: 'Shader FX', description: 'Video processed through GLSL grayscale shader', supportsFile: true },
  { id: 'alpha', label: 'Alpha Mask', description: 'Video with alpha mask compositing', supportsFile: true },
  { id: 'grid', label: 'Video Grid', description: 'NxN tile grid with 12 animations', supportsFile: true },
  { id: 'vhs', label: 'VHS Effect', description: 'Retro VHS filter with scanlines, chromatic aberration, noise, and tracking glitch', supportsFile: true },
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

const dangerBtnStyle = {
  ...smallBtnStyle(false),
  color: '#f87171',
  borderColor: '#7f1d1d',
};

const panelStyle = {
  padding: 14,
  background: '#141414',
  borderRadius: 8,
  border: '1px solid #222',
  marginBottom: 16,
};

const labelStyle = { fontSize: 12, color: '#666', minWidth: 70, display: 'inline-block' as const };
const valueStyle = { fontSize: 12, fontFamily: 'monospace' as const, color: '#888', width: 45, textAlign: 'right' as const };

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Slider row helper
function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={labelStyle}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#3b82f6' }} />
      <span style={valueStyle}>{value.toFixed(3)}</span>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('cube');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [status, setStatus] = useState('Initializing...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  // Controls
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGridControls, setShowGridControls] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Rotation controls
  const [rotSpeedX, setRotSpeedX] = useState(0.01);
  const [rotSpeedY, setRotSpeedY] = useState(0.01);
  const [rotSpeedZ, setRotSpeedZ] = useState(0);
  const [sphereRotSpeed, setSphereRotSpeed] = useState(0.01);
  const [isAnimating, setIsAnimating] = useState(true);
  const [rotLocked, setRotLocked] = useState(false);
  const [cubeSize, setCubeSize] = useState(2);
  // Stored speeds for pause/resume
  const pausedSpeedsRef = useRef<{ x: number; y: number; z: number; sphere: number } | null>(null);

  // VHS controls
  const [vhsIntensity, setVhsIntensity] = useState(1);
  const [vhsScanlines, setVhsScanlines] = useState(1);
  const [vhsAberration, setVhsAberration] = useState(1);
  const [vhsNoise, setVhsNoise] = useState(1);
  const [vhsTracking, setVhsTracking] = useState(true);

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

  // Media controls (for file-based video)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);

  // Track video playback progress
  useEffect(() => {
    if (videoElement && isVideoPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        if (videoElement.duration) {
          setVideoProgress(videoElement.currentTime / videoElement.duration);
        }
      }, 250);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [videoElement, isVideoPlaying]);

  const handleVideoElement = useCallback((el: HTMLVideoElement | null) => {
    setVideoElement(el);
    if (el) {
      setIsVideoPlaying(!el.paused);
      setVideoProgress(0);
    }
  }, []);

  const toggleVideoPlay = useCallback(() => {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play();
      setIsVideoPlaying(true);
    } else {
      videoElement.pause();
      setIsVideoPlaying(false);
    }
  }, [videoElement]);

  const seekVideo = useCallback((pct: number) => {
    if (!videoElement || !videoElement.duration) return;
    videoElement.currentTime = pct * videoElement.duration;
    setVideoProgress(pct);
  }, [videoElement]);

  // Debug panel
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugEndRef = useRef<HTMLDivElement>(null);

  // Debug logger
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setDebugLogs((prev) => [...prev.slice(-200), `[${ts}] ${msg}`]);
  }, []);

  // Auto-scroll debug panel
  useEffect(() => {
    if (showDebug && debugEndRef.current) {
      debugEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugLogs, showDebug]);

  // Acquire a camera stream
  const acquireStream = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
    };
    addLog(`Acquiring stream: ${deviceId ? deviceId.slice(0, 8) : 'any'}...`);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getVideoTracks()[0];
    addLog(`Acquired: ${track.label} (${track.getSettings().deviceId?.slice(0, 8)})`);
    return stream;
  }, [addLog]);

  // Try each camera in sequence
  const acquireAnyStream = useCallback(async (deviceList: MediaDeviceInfo[]): Promise<MediaStream | null> => {
    for (const device of deviceList) {
      try {
        return await acquireStream(device.deviceId);
      } catch (err) {
        addLog(`Device "${device.label}" failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    try {
      return await acquireStream();
    } catch (err) {
      addLog(`All devices failed: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }, [acquireStream, addLog]);

  // Camera init
  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      try {
        addLog('Camera init starting...');
        setStatus('Detecting cameras...');
        const preliminary = await navigator.mediaDevices.enumerateDevices();
        const preliminaryCams = preliminary.filter((d) => d.kind === 'videoinput');
        addLog(`Found ${preliminaryCams.length} video input(s)`);

        if (cancelled) return;

        const hasLabels = preliminaryCams.some((d) => d.label.length > 0);
        let videoInputs = preliminaryCams;

        if (!hasLabels && preliminaryCams.length > 0) {
          addLog('No labels — requesting permission...');
          setStatus('Requesting camera access...');
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach((t) => t.stop());
          await new Promise((r) => setTimeout(r, 500));
          if (cancelled) return;

          const all = await navigator.mediaDevices.enumerateDevices();
          videoInputs = all.filter((d) => d.kind === 'videoinput');
        }

        if (cancelled) return;
        setDevices(videoInputs);
        setHasCamera(videoInputs.length > 0);

        if (videoInputs.length === 0) {
          setStatus('No cameras found');
          setCameraError('No camera detected. Connect a webcam to use live video components.');
          setCameraReady(true);
          addLog('No cameras found');
          return;
        }

        setStatus('Connecting to camera...');
        const stream = await acquireAnyStream(videoInputs);

        if (cancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (stream) {
          const track = stream.getVideoTracks()[0];
          const activeDeviceId = track.getSettings().deviceId || videoInputs[0].deviceId;
          setActiveStream(stream);
          setSelectedDevice(activeDeviceId);
          setStatus(`Connected: ${track.label}`);
          setCameraError(null);
          addLog(`Stream active: ${track.label}`);
        } else {
          setStatus('All cameras failed');
          setCameraError('Could not connect to any camera. Close other apps using the camera and retry.');
        }

        setCameraReady(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        addLog(`Init failed: ${error.name} ${error.message}`);
        setHasCamera(false);
        setCameraReady(true);

        if (error.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Allow camera permissions in your browser.');
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
  }, [acquireAnyStream, addLog]);

  // Reset state on tab change
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setScale(1);
    setShowGridControls(false);
    setVideoElement(null);
    setVideoProgress(0);

    const tabInfo = TABS.find((t) => t.id === activeTab);
    if (!tabInfo?.supportsFile) {
      setSourceMode('webcam');
    }
    addLog(`Tab: ${activeTab}`);
  }, [activeTab, addLog]);

  // Switch camera stream when user selects a different device
  const isInitialDevice = useRef(true);
  useEffect(() => {
    if (isInitialDevice.current) {
      isInitialDevice.current = false;
      return;
    }
    if (!selectedDevice || !cameraReady) return;

    let cancelled = false;
    async function switchDevice() {
      try {
        setStatus('Switching camera...');
        addLog(`Switching to device: ${selectedDevice.slice(0, 8)}`);
        const newStream = await acquireStream(selectedDevice);
        if (cancelled) { newStream.getTracks().forEach((t) => t.stop()); return; }

        activeStream?.getTracks().forEach((t) => t.stop());
        setActiveStream(newStream);
        const track = newStream.getVideoTracks()[0];
        setStatus(`Connected: ${track.label}`);
        setCameraError(null);
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        addLog(`Switch failed: ${error.message}`);
        setCameraError(`Failed to switch camera: ${error.message}`);
        setStatus(`Camera error: ${error.message}`);
      }
    }
    switchDevice();
    return () => { cancelled = true; };
  }, [selectedDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect camera
  const disconnectCamera = useCallback(() => {
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      setActiveStream(null);
      setStatus('Camera disconnected');
      addLog('Camera disconnected by user');
    }
  }, [activeStream, addLog]);

  // Reconnect camera
  const reconnectCamera = useCallback(async () => {
    if (devices.length === 0) return;
    try {
      setStatus('Reconnecting...');
      addLog('Reconnecting camera...');
      const stream = await acquireAnyStream(devices);
      if (stream) {
        const track = stream.getVideoTracks()[0];
        const activeDeviceId = track.getSettings().deviceId || devices[0].deviceId;
        setActiveStream(stream);
        setSelectedDevice(activeDeviceId);
        setStatus(`Connected: ${track.label}`);
        setCameraError(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      addLog(`Reconnect failed: ${error.message}`);
    }
  }, [devices, acquireAnyStream, addLog]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);
      if (alphaFileUrl) URL.revokeObjectURL(alphaFileUrl);
    };
  }, [videoFileUrl, alphaFileUrl]);

  const handleReady = useCallback(() => {
    setStatus(`${activeTab} — ready`);
    setCameraError(null);
    addLog(`${activeTab} ready`);
  }, [activeTab, addLog]);

  const handleError = useCallback((err: Error) => {
    setStatus(`Error: ${err.message}`);
    addLog(`Error: ${err.message}`);
    const msg = err.message.toLowerCase();
    if (msg.includes('video source') || msg.includes('getusermedia') || msg.includes('notallowed') || msg.includes('notfound') || msg.includes('timeout') || msg.includes('denied') || msg.includes('could not start')) {
      setCameraError(err.message);
      setHasCamera(false);
    }
  }, [addLog]);

  // File handlers
  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);
    const url = URL.createObjectURL(file);
    setVideoFileUrl(url);
    setVideoFileName(file.name);
    setStatus(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
    addLog(`Video file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  };

  const handleAlphaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (alphaFileUrl) URL.revokeObjectURL(alphaFileUrl);
    const url = URL.createObjectURL(file);
    setAlphaFileUrl(url);
    setAlphaFileName(file.name);
    addLog(`Alpha file: ${file.name}`);
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
  const effectiveVideoSrc = sourceMode === 'file' && videoFileUrl ? videoFileUrl : undefined;
  const effectiveAlphaSrc = sourceMode === 'file' && alphaFileUrl ? alphaFileUrl : undefined;
  const needsWebcam = !(tabSupportsFile && sourceMode === 'file' && videoFileUrl);

  // Rotation speed for current tab
  const cubeRotSpeed = { x: rotSpeedX, y: rotSpeedY };
  const animatedRotSpeed = { x: rotSpeedX, y: rotSpeedY, z: rotSpeedZ };

  const commonProps = {
    width: baseWidth,
    height: baseHeight,
    selectedDeviceId: selectedDevice,
    mediaStream: activeStream || undefined,
    onReady: handleReady,
    onError: handleError,
  };

  // Which tabs show rotation controls
  const showRotationControls = ['cube', 'sphere', 'animated'].includes(activeTab);

  return (
    <div style={{
      display: 'flex',
      maxWidth: isFullscreen ? '100%' : showDebug ? 1500 : 1100,
      margin: '0 auto',
      padding: isFullscreen ? 0 : 24,
      gap: 16,
    }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Device selector */}
            {(sourceMode === 'webcam' || !tabSupportsFile) && devices.length > 0 && (
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={!activeStream}
                style={{ background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #333', padding: '6px 10px', borderRadius: 4, fontSize: 13 }}
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}

            {/* Disconnect / Reconnect camera */}
            {activeStream ? (
              <button onClick={disconnectCamera} style={dangerBtnStyle}>
                Disconnect Camera
              </button>
            ) : cameraReady && devices.length > 0 ? (
              <button onClick={reconnectCamera} style={smallBtnStyle(false)}>
                Reconnect Camera
              </button>
            ) : null}

            {/* Scale slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#666' }}>Scale</span>
              <input
                type="range" min={0.2} max={3} step={0.05} value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                style={{ width: 80, accentColor: '#3b82f6' }}
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

            <div style={{ flex: 1 }} />

            {/* Debug toggle */}
            <button onClick={() => setShowDebug((v) => !v)} style={smallBtnStyle(showDebug)}>
              Debug
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} style={smallBtnStyle(false)}>
              Fullscreen
            </button>

            {/* Grid controls toggle */}
            {activeTab === 'grid' && (
              <button onClick={() => setShowGridControls((v) => !v)} style={smallBtnStyle(showGridControls)}>
                Grid Controls
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        {!isFullscreen && (
          <nav style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={btnStyle(activeTab === tab.id)}>
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {/* Description */}
        {!isFullscreen && activeTabInfo && (
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>{activeTabInfo.description}</p>
        )}

        {/* Rotation controls panel — two-column layout */}
        {!isFullscreen && showRotationControls && (
          <div style={{ ...panelStyle, display: 'flex', gap: 16 }}>
            {/* Left column: buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 80 }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 2 }}>Controls</span>
              {/* Play / Pause */}
              <button
                onClick={() => {
                  if (isAnimating) {
                    pausedSpeedsRef.current = { x: rotSpeedX, y: rotSpeedY, z: rotSpeedZ, sphere: sphereRotSpeed };
                    setRotSpeedX(0); setRotSpeedY(0); setRotSpeedZ(0);
                    setSphereRotSpeed(0);
                    setIsAnimating(false);
                  } else {
                    const saved = pausedSpeedsRef.current;
                    if (saved) {
                      setRotSpeedX(saved.x); setRotSpeedY(saved.y); setRotSpeedZ(saved.z);
                      setSphereRotSpeed(saved.sphere);
                    } else {
                      setRotSpeedX(0.01); setRotSpeedY(0.01); setRotSpeedZ(0);
                      setSphereRotSpeed(0.01);
                    }
                    pausedSpeedsRef.current = null;
                    setIsAnimating(true);
                  }
                }}
                style={{ ...smallBtnStyle(isAnimating), display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
                title={isAnimating ? 'Pause rotation' : 'Resume rotation'}
              >
                {isAnimating ? <PauseIcon /> : <PlayIcon />}
                {isAnimating ? 'Pause' : 'Play'}
              </button>
              {/* Link axes */}
              {activeTab !== 'sphere' && (
                <button
                  onClick={() => setRotLocked((v) => !v)}
                  style={{ ...smallBtnStyle(rotLocked), width: '100%' }}
                  title="Link all axes together"
                >
                  {rotLocked ? 'Linked' : 'Link'}
                </button>
              )}
              {/* Reset */}
              <button
                onClick={() => {
                  setRotSpeedX(0.01); setRotSpeedY(0.01); setRotSpeedZ(0);
                  setSphereRotSpeed(0.01); setCubeSize(2);
                  setIsAnimating(true); pausedSpeedsRef.current = null;
                }}
                style={{ ...smallBtnStyle(false), width: '100%' }}
              >
                Reset
              </button>
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: '#222', alignSelf: 'stretch' }} />

            {/* Right column: sliders */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 2 }}>Speed</span>
              {activeTab === 'sphere' ? (
                <SliderRow label="Speed Y" value={sphereRotSpeed} min={-0.1} max={0.1} step={0.001} onChange={setSphereRotSpeed} />
              ) : (
                <>
                  <SliderRow label="Speed X" value={rotSpeedX} min={-0.1} max={0.1} step={0.001}
                    onChange={(v) => { setRotSpeedX(v); if (rotLocked) { setRotSpeedY(v); setRotSpeedZ(v); } }} />
                  <SliderRow label="Speed Y" value={rotSpeedY} min={-0.1} max={0.1} step={0.001}
                    onChange={(v) => { setRotSpeedY(v); if (rotLocked) { setRotSpeedX(v); setRotSpeedZ(v); } }} />
                  {activeTab === 'animated' && (
                    <SliderRow label="Speed Z" value={rotSpeedZ} min={-0.1} max={0.1} step={0.001}
                      onChange={(v) => { setRotSpeedZ(v); if (rotLocked) { setRotSpeedX(v); setRotSpeedY(v); } }} />
                  )}
                </>
              )}
              {/* Cube size */}
              {(activeTab === 'cube' || activeTab === 'animated') && (
                <>
                  <div style={{ borderTop: '1px solid #222', margin: '4px 0' }} />
                  <SliderRow label="Cube Size" value={cubeSize} min={0.5} max={5} step={0.1} onChange={setCubeSize} />
                </>
              )}
            </div>
          </div>
        )}

        {/* VHS controls panel */}
        {!isFullscreen && activeTab === 'vhs' && (
          <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 2 }}>VHS Effect</span>
            <SliderRow label="Intensity" value={vhsIntensity} min={0} max={2} step={0.05} onChange={setVhsIntensity} />
            <SliderRow label="Scanlines" value={vhsScanlines} min={0} max={3} step={0.05} onChange={setVhsScanlines} />
            <SliderRow label="Aberration" value={vhsAberration} min={0} max={5} step={0.1} onChange={setVhsAberration} />
            <SliderRow label="Noise" value={vhsNoise} min={0} max={3} step={0.05} onChange={setVhsNoise} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={labelStyle}>Tracking</span>
              <button onClick={() => setVhsTracking((v) => !v)} style={smallBtnStyle(vhsTracking)}>
                {vhsTracking ? 'On' : 'Off'}
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setVhsIntensity(1); setVhsScanlines(1); setVhsAberration(1); setVhsNoise(1); setVhsTracking(true); }}
                style={smallBtnStyle(false)}>
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Source selector — for tabs that support file input */}
        {!isFullscreen && tabSupportsFile && (
          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sourceMode === 'file' ? 10 : 0 }}>
              <span style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Source:</span>
              <button onClick={() => setSourceMode('webcam')} style={smallBtnStyle(sourceMode === 'webcam')}>
                Webcam
              </button>
              <button onClick={() => setSourceMode('file')} style={smallBtnStyle(sourceMode === 'file')}>
                Video File
              </button>
            </div>

            {sourceMode === 'file' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Video file */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={labelStyle}>Video:</span>
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoFile} style={{ display: 'none' }} />
                  <button onClick={() => videoInputRef.current?.click()} style={smallBtnStyle(false)}>
                    {videoFileName || 'Choose video...'}
                  </button>
                  {videoFileName && (
                    <button onClick={clearVideoFile} style={dangerBtnStyle}>Clear</button>
                  )}
                </div>

                {/* Alpha mask file */}
                {activeTab === 'alpha' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={labelStyle}>Alpha mask:</span>
                    <input ref={alphaInputRef} type="file" accept="video/*" onChange={handleAlphaFile} style={{ display: 'none' }} />
                    <button onClick={() => alphaInputRef.current?.click()} style={smallBtnStyle(false)}>
                      {alphaFileName || 'Choose mask...'}
                    </button>
                    {alphaFileName && (
                      <button onClick={clearAlphaFile} style={dangerBtnStyle}>Clear</button>
                    )}
                  </div>
                )}

                {!videoFileUrl && (
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                    Select a video file to use as the source.
                    Without a file, the component will fall back to webcam.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Media controls — shown when a file video is playing */}
        {!isFullscreen && tabSupportsFile && sourceMode === 'file' && videoElement && (
          <div style={{ ...panelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Play / Pause */}
            <button
              onClick={toggleVideoPlay}
              style={{ ...smallBtnStyle(false), display: 'flex', alignItems: 'center', gap: 4 }}
              title={isVideoPlaying ? 'Pause video' : 'Play video'}
            >
              {isVideoPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Seek bar */}
            <input
              type="range" min={0} max={1} step={0.001} value={videoProgress}
              onChange={(e) => seekVideo(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#3b82f6' }}
            />

            {/* Time display */}
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', minWidth: 90, textAlign: 'right' }}>
              {videoElement.duration ? (
                `${formatTime(videoElement.currentTime)} / ${formatTime(videoElement.duration)}`
              ) : '--:--'}
            </span>
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
          {/* No camera / disconnected overlay */}
          {needsWebcam && (hasCamera === false || cameraError || (cameraReady && !activeStream)) && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, background: 'rgba(0,0,0,0.85)', borderRadius: isFullscreen ? 0 : 8,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#1e1e1e', border: '2px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" strokeWidth="2" />
                </svg>
              </div>
              <p style={{ color: '#e5e5e5', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
                {activeStream === null && cameraReady && devices.length > 0 ? 'Camera Disconnected' : 'No Camera Connected'}
              </p>
              <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px', maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
                {activeStream === null && cameraReady && devices.length > 0
                  ? 'Click "Reconnect Camera" to resume.'
                  : cameraError || 'Connect a webcam and reload the page to use live video components.'}
              </p>
              {activeStream === null && cameraReady && devices.length > 0 ? (
                <button onClick={reconnectCamera} style={smallBtnStyle(false)}>Reconnect Camera</button>
              ) : (
                <button onClick={() => window.location.reload()} style={smallBtnStyle(false)}>Retry</button>
              )}
            </div>
          )}

          {/* Loading spinner */}
          {needsWebcam && !cameraReady && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, background: 'rgba(0,0,0,0.85)', borderRadius: isFullscreen ? 0 : 8,
            }}>
              <div style={{
                width: 40, height: 40, border: '3px solid #333', borderTop: '3px solid #3b82f6',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16,
              }} />
              <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>{status}</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          <div style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}>
            {(activeStream || !needsWebcam) && activeTab === 'cube' && (
              <WebcamCube {...commonProps} rotationSpeed={cubeRotSpeed} cubeSize={cubeSize} videoSrc={effectiveVideoSrc} onVideoElement={handleVideoElement} />
            )}
            {(activeStream || !needsWebcam) && activeTab === 'sphere' && (
              <WebcamSphere {...commonProps} rotationSpeed={sphereRotSpeed} videoSrc={effectiveVideoSrc} onVideoElement={handleVideoElement} />
            )}
            {(activeStream || !needsWebcam) && activeTab === 'animated' && (
              <AnimatedVideoCube {...commonProps} rotationSpeed={animatedRotSpeed} isAnimating={isAnimating} cubeSize={cubeSize} showDebugInfo videoSrc={effectiveVideoSrc} onVideoElement={handleVideoElement} />
            )}
            {(activeStream || !needsWebcam) && activeTab === 'shader' && (
              <VideoShaderFX {...commonProps} videoSrc={effectiveVideoSrc} onVideoElement={handleVideoElement} />
            )}
            {(activeStream || !needsWebcam) && activeTab === 'alpha' && (
              <VideoAlphaMask {...commonProps} videoSrc={effectiveVideoSrc} alphaSrc={effectiveAlphaSrc} onVideoElement={handleVideoElement} />
            )}
            {(activeStream || !needsWebcam) && activeTab === 'grid' && (
              <VideoGrid {...commonProps} width={baseWidth} height={baseHeight} showControls={showGridControls} videoSrc={effectiveVideoSrc} onVideoElement={handleVideoElement} />
            )}
            {(activeStream || !needsWebcam) && activeTab === 'vhs' && (
              <VideoVHSEffect {...commonProps} videoSrc={effectiveVideoSrc} onVideoElement={handleVideoElement}
                intensity={vhsIntensity} scanlineIntensity={vhsScanlines} aberrationIntensity={vhsAberration}
                noiseIntensity={vhsNoise} trackingGlitch={vhsTracking} />
            )}
          </div>

          {/* Fullscreen exit */}
          {isFullscreen && (
            <button onClick={toggleFullscreen}
              style={{ position: 'absolute', top: 16, right: 16, ...smallBtnStyle(false), opacity: 0.7 }}>
              Exit Fullscreen
            </button>
          )}
        </div>

        {/* Footer */}
        {!isFullscreen && (
          <p style={{ fontSize: 11, color: '#444', marginTop: 8, textAlign: 'center' }}>
            Scroll to zoom &middot; Click and drag to pan &middot; F11 or button for fullscreen
          </p>
        )}
      </div>

      {/* Debug panel */}
      {showDebug && !isFullscreen && (
        <div style={{
          width: 360,
          flexShrink: 0,
          background: '#0a0a0a',
          border: '1px solid #222',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 48px)',
          position: 'sticky',
          top: 24,
        }}>
          {/* Debug header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderBottom: '1px solid #222',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e5e5' }}>Debug</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setDebugLogs([])} style={{ ...smallBtnStyle(false), fontSize: 11 }}>
                Clear
              </button>
              <button onClick={() => setShowDebug(false)} style={{ ...smallBtnStyle(false), fontSize: 11 }}>
                Close
              </button>
            </div>
          </div>

          {/* Debug info */}
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #1a1a1a', fontSize: 11, color: '#666' }}>
            <div>Tab: <span style={{ color: '#aaa' }}>{activeTab}</span></div>
            <div>Stream: <span style={{ color: activeStream ? '#4ade80' : '#f87171' }}>
              {activeStream ? `active (${activeStream.getVideoTracks()[0]?.label || 'unknown'})` : 'disconnected'}
            </span></div>
            <div>Devices: <span style={{ color: '#aaa' }}>{devices.length}</span></div>
            {showRotationControls && (
              <div>Rotation: <span style={{ color: '#aaa' }}>
                {activeTab === 'sphere'
                  ? `Y: ${sphereRotSpeed.toFixed(3)}`
                  : `X: ${rotSpeedX.toFixed(3)} Y: ${rotSpeedY.toFixed(3)}${activeTab === 'animated' ? ` Z: ${rotSpeedZ.toFixed(3)}` : ''}`
                }
              </span></div>
            )}
            {tabSupportsFile && (
              <div>Source: <span style={{ color: '#aaa' }}>
                {sourceMode === 'file' ? (videoFileName || 'no file') : 'webcam'}
              </span></div>
            )}
          </div>

          {/* Debug log */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '8px 14px',
            fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, color: '#888',
          }}>
            {debugLogs.length === 0 && (
              <span style={{ color: '#444' }}>No logs yet...</span>
            )}
            {debugLogs.map((log, i) => (
              <div key={i} style={{ color: log.includes('Error') || log.includes('failed') ? '#f87171' : log.includes('active') || log.includes('ready') ? '#4ade80' : '#888' }}>
                {log}
              </div>
            ))}
            <div ref={debugEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
