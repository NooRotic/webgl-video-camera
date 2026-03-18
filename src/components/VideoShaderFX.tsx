import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { VideoShaderFXProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene } from "../core/videoTextureUtils";

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
  vertexShader = DEFAULT_VERTEX_SHADER,
  fragmentShader = DEFAULT_FRAGMENT_SHADER,
  onReady,
  onError,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let stream: MediaStream | null = null;
    const mountEl = mountRef.current;

    const init = async () => {
      if (!mountEl || !videoRef.current) return;

      try {
        // If no videoSrc, use webcam
        if (!videoSrc) {
          stream = await createWebcamStream({ deviceId: selectedDeviceId });
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

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
          animationId = requestAnimationFrame(animate);
          renderer!.render(scene, camera);
        };
        animate();
        onReady?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        console.error("VideoShaderFX init failed:", err);
      }
    };

    init();

    return () => {
      cleanupThreeScene(renderer, mountEl, stream, animationId);
    };
  }, [width, height, videoSrc, selectedDeviceId, vertexShader, fragmentShader, onReady, onError]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        autoPlay
        loop={!!videoSrc}
        muted
        playsInline
        style={{ display: "none" }}
      />
    </div>
  );
};

export default VideoShaderFX;
