import * as THREE from 'three';

export interface RendererOptions {
  antialias?: boolean;
  alpha?: boolean;
  pixelRatio?: number;
  clearColor?: number;
  clearAlpha?: number;
}

export interface WebcamStreamOptions {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: string;
}

/**
 * Create a Three.js VideoTexture from an HTMLVideoElement with proper filtering.
 */
export function createVideoTexture(videoElement: HTMLVideoElement): THREE.VideoTexture {
  const texture = new THREE.VideoTexture(videoElement);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Request a webcam MediaStream with optional device selection and resolution constraints.
 */
export async function createWebcamStream(options: WebcamStreamOptions = {}): Promise<MediaStream> {
  const videoConstraints: MediaTrackConstraints = {};

  if (options.deviceId && options.deviceId.length > 0) {
    videoConstraints.deviceId = { exact: options.deviceId };
  }
  if (options.width) {
    videoConstraints.width = { ideal: options.width };
  }
  if (options.height) {
    videoConstraints.height = { ideal: options.height };
  }
  if (options.frameRate) {
    videoConstraints.frameRate = { ideal: options.frameRate };
  }
  if (options.facingMode) {
    videoConstraints.facingMode = options.facingMode;
  }

  return navigator.mediaDevices.getUserMedia({
    video: Object.keys(videoConstraints).length > 0 ? videoConstraints : true,
  });
}

/**
 * Create a WebGLRenderer attached to a container element.
 */
export function createRenderer(
  container: HTMLElement,
  width: number,
  height: number,
  options: RendererOptions = {}
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: options.antialias ?? true,
    alpha: options.alpha ?? true,
  });
  renderer.setPixelRatio(options.pixelRatio ?? window.devicePixelRatio);
  renderer.setSize(width, height);
  if (options.clearColor !== undefined) {
    renderer.setClearColor(options.clearColor, options.clearAlpha ?? 0);
  }
  container.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Cleanup a Three.js scene: stop animation, dispose renderer, stop webcam stream.
 */
export function cleanupThreeScene(
  renderer: THREE.WebGLRenderer | null,
  container: HTMLElement | null,
  stream?: MediaStream | null,
  animationId?: number
) {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  if (renderer) {
    renderer.dispose();
    if (container) {
      const canvas = renderer.domElement;
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    }
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}
