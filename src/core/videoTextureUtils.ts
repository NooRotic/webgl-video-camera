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
  /** Number of retry attempts on AbortError (device busy). Default: 2 */
  retries?: number;
  /** Delay in ms between retries. Default: 1000 */
  retryDelay?: number;
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
 * On AbortError (device busy / timeout), retries with progressively relaxed constraints:
 *   1. Retry with same { exact: deviceId } after delay
 *   2. Fall back to { deviceId: { ideal: id } } (prefer but don't require)
 *   3. Fall back to { video: true } (let browser pick any camera)
 */
export async function createWebcamStream(options: WebcamStreamOptions = {}): Promise<MediaStream> {
  const retryDelay = options.retryDelay ?? 1500;

  function buildConstraints(deviceId?: string, useExact = true): MediaStreamConstraints {
    const videoConstraints: MediaTrackConstraints = {};

    if (deviceId && deviceId.length > 0) {
      videoConstraints.deviceId = useExact ? { exact: deviceId } : { ideal: deviceId };
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

    return {
      video: Object.keys(videoConstraints).length > 0 ? videoConstraints : true,
    };
  }

  // Build a sequence of progressively relaxed attempts
  const attempts: { label: string; constraints: MediaStreamConstraints }[] = [];

  if (options.deviceId && options.deviceId.length > 0) {
    attempts.push({
      label: `exact device ${options.deviceId.slice(0, 8)}`,
      constraints: buildConstraints(options.deviceId, true),
    });
    attempts.push({
      label: `preferred device ${options.deviceId.slice(0, 8)}`,
      constraints: buildConstraints(options.deviceId, false),
    });
  }
  // Final fallback: let browser pick any camera
  attempts.push({
    label: 'any available camera',
    constraints: buildConstraints(),
  });

  for (let i = 0; i < attempts.length; i++) {
    const { label, constraints } = attempts[i];
    try {
      console.log(`[webgl-video] Trying: ${label}`);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      console.log(`[webgl-video] Acquired: ${track.label} (${track.getSettings().deviceId?.slice(0, 8)})`);
      return stream;
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort && i < attempts.length - 1) {
        console.warn(`[webgl-video] "${label}" timed out, waiting ${retryDelay}ms before next attempt...`);
        await new Promise((r) => setTimeout(r, retryDelay));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to acquire webcam stream');
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
