import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { VideoShaderFXProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene, waitForVideoReady } from "../core/videoTextureUtils";
import { useStableCallbacks } from "../hooks/useStableCallbacks";

const DEFAULT_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const DEFAULT_FRAGMENT_SHADER = `
uniform sampler2D videoTexture;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(videoTexture, vUv);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(vec3(gray), color.a);
}`;

const VideoShaderFX: React.FC<VideoShaderFXProps> = ({
  width = 400,
  height = 400,
  className,
  style,
  videoSrc,
  selectedDeviceId,
  mediaStream,
  vertexShader = DEFAULT_VERTEX_SHADER,
  fragmentShader = DEFAULT_FRAGMENT_SHADER,
  onReady,
  onError,
  onVideoElement,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { onReadyRef, onErrorRef, onVideoElementRef } = useStableCallbacks({ onReady, onError, onVideoElement });

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let stream: MediaStream | null = null;
    let disposed = false;
    const mountEl = mountRef.current;

    const init = async () => {
      if (!mountEl || !videoRef.current) return;

      try {
        if (!videoSrc) {
          if (mediaStream) {
            videoRef.current.srcObject = mediaStream;
          } else {
            stream = await createWebcamStream({ deviceId: selectedDeviceId });
            if (disposed) { stream.getTracks().forEach(t => t.stop()); return; }
            videoRef.current.srcObject = stream;
          }
        } else {
          // Clear any leftover srcObject (webcam) — src attribute won't load while srcObject is set
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

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
          uniforms: {
            videoTexture: { value: videoTexture },
          },
          vertexShader,
          fragmentShader,
        });
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        const animate = () => {
          if (disposed) return;
          animationId = requestAnimationFrame(animate);
          renderer!.render(scene, camera);
        };
        animate();
        onReadyRef.current?.();
      } catch (error) {
        if (disposed) return;
        const err = error instanceof Error ? error : new Error(String(error));
        onErrorRef.current?.(err);
        console.error("VideoShaderFX init failed:", err);
      }
    };

    init();

    return () => {
      disposed = true;
      onVideoElementRef.current?.(null);
      cleanupThreeScene(renderer, mountEl, stream, animationId);
    };
  }, [width, height, videoSrc, selectedDeviceId, mediaStream, vertexShader, fragmentShader]);

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

export default VideoShaderFX;
