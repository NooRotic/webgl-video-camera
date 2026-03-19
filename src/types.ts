import React from 'react';

export interface BaseWebGLVideoProps {
  /** Width of the WebGL canvas in pixels. Defaults vary by component. */
  width?: number;
  /** Height of the WebGL canvas in pixels. Defaults vary by component. */
  height?: number;
  /** CSS class name applied to the outer container */
  className?: string;
  /** Inline styles applied to the outer container */
  style?: React.CSSProperties;
  /** MediaDeviceInfo.deviceId for selecting a specific webcam */
  selectedDeviceId?: string;
  /** Pre-acquired MediaStream — if provided, component skips getUserMedia entirely */
  mediaStream?: MediaStream;
  /** URL or path to a video file (for file-based video components) */
  videoSrc?: string;
  /** Called when the WebGL scene is initialized and ready */
  onReady?: () => void;
  /** Called when an error occurs (webcam access denied, WebGL not supported, etc.) */
  onError?: (error: Error) => void;
}

export interface WebcamCubeProps extends BaseWebGLVideoProps {
  /** Rotation speed per frame for each axis */
  rotationSpeed?: { x: number; y: number };
  /** Size of the cube geometry. Defaults to 1.5. */
  cubeSize?: number;
}

export interface WebcamSphereProps extends BaseWebGLVideoProps {
  /** Rotation speed per frame on Y axis */
  rotationSpeed?: number;
  /** Number of sphere geometry segments */
  segments?: number;
}

export interface VideoShaderFXProps extends BaseWebGLVideoProps {
  /** Custom vertex shader GLSL code */
  vertexShader?: string;
  /** Custom fragment shader GLSL code */
  fragmentShader?: string;
}

export interface VideoAlphaMaskProps extends BaseWebGLVideoProps {
  /** URL or path to the alpha mask video */
  alphaSrc?: string;
}

export interface VideoGridProps extends BaseWebGLVideoProps {
  gridSize?: number;
  tileSpacing?: number;
  tileSize?: number;
  speed?: number;
  tiltX?: number;
  tiltY?: number;
  fullScreen?: boolean;
  /** Show the built-in controls panel. Defaults to true when not fullScreen. */
  showControls?: boolean;
  animationTrigger?: string;
  stopAnimationTrigger?: number;
  rerenderTrigger?: number;
  centerTrigger?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface VideoGridControlsProps {
  gridSize: number;
  tileSpacing: number;
  tileSize: number;
  speed: number;
  tiltX: number;
  tiltY: number;
  onGridSizeChange: (value: number) => void;
  onTileSpacingChange: (value: number) => void;
  onTileSizeChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onTiltXChange: (value: number) => void;
  onTiltYChange: (value: number) => void;
  onReset: () => void;
}

export interface AnimatedVideoCubeProps extends BaseWebGLVideoProps {
  rotationSpeed?: { x: number; y: number; z: number };
  isAnimating?: boolean;
  cubeSize?: number;
  resolution?: { width: number; height: number };
  frameRate?: number;
  rotationTrigger?: number;
  resetTrigger?: number;
  manualRotation?: { x: number; y: number; z: number };
  surpriseRotation?: boolean;
  /** Show debug rotation info overlay */
  showDebugInfo?: boolean;
}
