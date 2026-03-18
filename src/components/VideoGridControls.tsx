import React from "react";
import { VideoGridControlsProps } from "../types";

const VideoGridControls: React.FC<VideoGridControlsProps> = ({
  gridSize,
  tileSpacing,
  tileSize,
  speed,
  tiltX,
  tiltY,
  onGridSizeChange,
  onTileSpacingChange,
  onTileSizeChange,
  onSpeedChange,
  onTiltXChange,
  onTiltYChange,
  onReset,
}) => {
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    marginBottom: 20,
    accentColor: '#2563eb',
    height: 4,
    borderRadius: 4,
    background: '#e5e7eb',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontSize: 15,
    color: '#222',
    fontWeight: 500,
    letterSpacing: 0.1,
  };

  return (
    <div
      style={{
        minWidth: 340,
        maxWidth: 400,
        maxHeight: '90vh',
        background: '#fff',
        borderRadius: 16,
        padding: 28,
        color: '#222',
        overflowY: 'auto',
        boxShadow: '0 6px 32px 0 rgba(0,0,0,0.12)',
        border: '1.5px solid #e5e7eb',
        zIndex: 1000,
        position: 'absolute' as const,
        top: 40,
        right: 40,
        display: 'block',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
      }}
    >
      <h3
        style={{
          margin: '0 0 18px 0',
          fontSize: 20,
          borderBottom: '1.5px solid #e5e7eb',
          paddingBottom: 10,
          color: '#1a1a1a',
          fontWeight: 600,
          display: 'block',
          letterSpacing: 0.1,
        }}
      >
        Grid Controls
      </h3>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Grid Size: <span style={{ fontWeight: 600 }}>{gridSize}</span>
        </label>
        <input
          type="range"
          min={1}
          max={8}
          value={gridSize}
          onChange={(e) => onGridSizeChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Tile Spacing: <span style={{ fontWeight: 600 }}>{tileSpacing.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={tileSpacing}
          onChange={(e) => onTileSpacingChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Tile Size: <span style={{ fontWeight: 600 }}>{tileSize.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          value={tileSize}
          onChange={(e) => onTileSizeChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Speed: <span style={{ fontWeight: 600 }}>{speed.toFixed(3)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.001}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Tilt X: <span style={{ fontWeight: 600 }}>{tiltX.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={-Math.PI / 2}
          max={Math.PI / 2}
          step={0.01}
          value={tiltX}
          onChange={(e) => onTiltXChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Tilt Y: <span style={{ fontWeight: 600 }}>{tiltY.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={-Math.PI / 2}
          max={Math.PI / 2}
          step={0.01}
          value={tiltY}
          onChange={(e) => onTiltYChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #444' }}>
        <button
          onClick={onReset}
          style={{
            width: '100%',
            padding: '14px 0',
            background: 'linear-gradient(90deg, #e0e7ef 0%, #f3f6fa 100%)',
            color: '#1a1a1a',
            border: '1.5px solid #d1d5db',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'background 0.2s, border 0.2s',
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = '#e5e7eb')
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background =
              'linear-gradient(90deg, #e0e7ef 0%, #f3f6fa 100%)')
          }
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default VideoGridControls;
