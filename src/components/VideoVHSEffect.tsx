import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { VideoVHSEffectProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene, waitForVideoReady } from "../core/videoTextureUtils";

const VHS_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const VHS_FRAGMENT_SHADER = `
uniform sampler2D videoTexture;
uniform float time;
uniform float intensity;
uniform float scanlineIntensity;
uniform float aberrationIntensity;
uniform float noiseIntensity;
uniform float trackingGlitch;
varying vec2 vUv;

// Pseudo-random noise
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;

  // Tracking glitch — periodic horizontal offset band
  float glitchStrength = 0.0;
  if (trackingGlitch > 0.5) {
    float glitchCycle = mod(time * 0.3, 6.0);
    if (glitchCycle < 0.4) {
      float band = smoothstep(0.0, 0.02, abs(uv.y - 0.5 + sin(time * 3.0) * 0.3));
      glitchStrength = (1.0 - band) * 0.03 * intensity;
      uv.x += glitchStrength * sin(time * 50.0);
    }
  }

  // Chromatic aberration — offset R and B channels
  float aberration = 0.003 * aberrationIntensity * intensity;
  float r = texture2D(videoTexture, vec2(uv.x + aberration, uv.y)).r;
  float g = texture2D(videoTexture, uv).g;
  float b = texture2D(videoTexture, vec2(uv.x - aberration, uv.y)).b;
  vec3 color = vec3(r, g, b);

  // VHS color bleed — slight warm shift
  color.r *= 1.05;
  color.g *= 0.97;
  color.b *= 0.9;

  // Scanlines
  float scanline = sin(vUv.y * 800.0) * 0.5 + 0.5;
  scanline = mix(1.0, scanline, 0.12 * scanlineIntensity * intensity);
  color *= scanline;

  // Vignette
  float vignette = smoothstep(0.8, 0.3, length(vUv - 0.5));
  color *= mix(1.0, vignette, 0.3 * intensity);

  // Film grain noise
  float noise = rand(vUv + fract(time)) * 0.08 * noiseIntensity * intensity;
  color += noise - 0.04 * noiseIntensity * intensity;

  // Slight brightness reduction for worn tape look
  color *= mix(1.0, 0.92, intensity);

  gl_FragColor = vec4(color, 1.0);
}`;

const VideoVHSEffect: React.FC<VideoVHSEffectProps> = ({
  width = 400,
  height = 400,
  className,
  style,
  videoSrc,
  selectedDeviceId,
  mediaStream,
  intensity = 1,
  scanlineIntensity = 1,
  aberrationIntensity = 1,
  noiseIntensity = 1,
  trackingGlitch = true,
  onReady,
  onError,
  onVideoElement,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onVideoElementRef = useRef(onVideoElement);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onVideoElementRef.current = onVideoElement;

  // Store effect params in refs so animation loop reads latest values without re-init
  const intensityRef = useRef(intensity);
  const scanlineIntensityRef = useRef(scanlineIntensity);
  const aberrationIntensityRef = useRef(aberrationIntensity);
  const noiseIntensityRef = useRef(noiseIntensity);
  const trackingGlitchRef = useRef(trackingGlitch);
  intensityRef.current = intensity;
  scanlineIntensityRef.current = scanlineIntensity;
  aberrationIntensityRef.current = aberrationIntensity;
  noiseIntensityRef.current = noiseIntensity;
  trackingGlitchRef.current = trackingGlitch;

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let ownStream: MediaStream | null = null;
    let disposed = false;
    const mountEl = mountRef.current;

    const init = async () => {
      if (!mountEl || !videoRef.current) return;

      try {
        if (!videoSrc) {
          if (mediaStream) {
            videoRef.current.srcObject = mediaStream;
          } else {
            ownStream = await createWebcamStream({ deviceId: selectedDeviceId });
            if (disposed) { ownStream.getTracks().forEach(t => t.stop()); return; }
            videoRef.current.srcObject = ownStream;
          }
        } else {
          videoRef.current.srcObject = null;
          await waitForVideoReady(videoRef.current);
          if (disposed) return;
        }
        await videoRef.current.play();
        if (disposed) return;
        onVideoElementRef.current?.(videoRef.current);

        renderer = createRenderer(mountEl, width, height);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
        camera.position.z = 2.5;

        const videoTexture = createVideoTexture(videoRef.current);

        const uniforms = {
          videoTexture: { value: videoTexture },
          time: { value: 0.0 },
          intensity: { value: intensityRef.current },
          scanlineIntensity: { value: scanlineIntensityRef.current },
          aberrationIntensity: { value: aberrationIntensityRef.current },
          noiseIntensity: { value: noiseIntensityRef.current },
          trackingGlitch: { value: trackingGlitchRef.current ? 1.0 : 0.0 },
        };

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
          uniforms,
          vertexShader: VHS_VERTEX_SHADER,
          fragmentShader: VHS_FRAGMENT_SHADER,
        });
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        const startTime = Date.now();

        const animate = () => {
          if (disposed) return;
          animationId = requestAnimationFrame(animate);

          // Update time-varying uniforms from refs
          uniforms.time.value = (Date.now() - startTime) / 1000;
          uniforms.intensity.value = intensityRef.current;
          uniforms.scanlineIntensity.value = scanlineIntensityRef.current;
          uniforms.aberrationIntensity.value = aberrationIntensityRef.current;
          uniforms.noiseIntensity.value = noiseIntensityRef.current;
          uniforms.trackingGlitch.value = trackingGlitchRef.current ? 1.0 : 0.0;

          renderer!.render(scene, camera);
        };
        animate();
        onReadyRef.current?.();
      } catch (error) {
        if (disposed) return;
        const err = error instanceof Error ? error : new Error(String(error));
        onErrorRef.current?.(err);
        console.error("VideoVHSEffect init failed:", err);
      }
    };

    init();

    return () => {
      disposed = true;
      onVideoElementRef.current?.(null);
      cleanupThreeScene(renderer, mountEl, ownStream, animationId);
    };
  }, [width, height, videoSrc, selectedDeviceId, mediaStream]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        loop={!!videoSrc}
        muted
        playsInline
        style={{ display: "none" }}
      />
    </div>
  );
};

export default VideoVHSEffect;
