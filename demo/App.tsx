import React, { useState, useEffect } from 'react';
import {
  WebcamCube,
  WebcamSphere,
  AnimatedVideoCube,
  VideoShaderFX,
  VideoAlphaMask,
  VideoGrid,
} from '../src';

type TabName = 'cube' | 'sphere' | 'animated' | 'shader' | 'alpha' | 'grid';

const TABS: { id: TabName; label: string }[] = [
  { id: 'cube', label: 'Webcam Cube' },
  { id: 'sphere', label: 'Webcam Sphere' },
  { id: 'animated', label: 'Animated Cube' },
  { id: 'shader', label: 'Shader FX' },
  { id: 'alpha', label: 'Alpha Mask' },
  { id: 'grid', label: 'Video Grid' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('cube');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [status, setStatus] = useState('Initializing...');

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

  const handleReady = () => setStatus(`${activeTab} — ready`);
  const handleError = (err: Error) => setStatus(`Error: ${err.message}`);

  const commonProps = {
    width: 640,
    height: 480,
    selectedDeviceId: selectedDevice,
    onReady: handleReady,
    onError: handleError,
    style: { border: '1px solid #333', borderRadius: 8 },
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          @riptheai/webgl-video
          <span style={{ fontSize: 14, fontWeight: 400, color: '#888', marginLeft: 8 }}>demo</span>
        </h1>
        <p style={{ color: '#888', marginTop: 4 }}>{status}</p>
      </header>

      {/* Device selector */}
      {devices.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8 }}>Camera:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            style={{ background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #333', padding: '4px 8px', borderRadius: 4 }}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? '#3b82f6' : '#1a1a1a',
              color: activeTab === tab.id ? '#fff' : '#888',
              border: '1px solid',
              borderColor: activeTab === tab.id ? '#3b82f6' : '#333',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Active component */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {activeTab === 'cube' && <WebcamCube {...commonProps} />}
        {activeTab === 'sphere' && <WebcamSphere {...commonProps} />}
        {activeTab === 'animated' && <AnimatedVideoCube {...commonProps} showDebugInfo />}
        {activeTab === 'shader' && <VideoShaderFX {...commonProps} />}
        {activeTab === 'alpha' && <VideoAlphaMask {...commonProps} />}
        {activeTab === 'grid' && <VideoGrid {...commonProps} width={900} height={600} showControls />}
      </div>
    </div>
  );
}
