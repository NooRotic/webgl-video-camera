import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { WebcamSphereProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene } from "../core/videoTextureUtils";

const WebcamSphere: React.FC<WebcamSphereProps> = ({
  width = 400,
  height = 400,
  className,
  style,
  selectedDeviceId = '',
  rotationSpeed = 0.01,
  segments = 32,
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
      if (!mountEl) return;

      try {
        renderer = createRenderer(mountEl, width, height);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
        camera.position.z = 3;

        stream = await createWebcamStream({
          deviceId: selectedDeviceId || undefined,
          width: 1920,
          height: 1080,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          const videoTexture = createVideoTexture(videoRef.current);

          const geometry = new THREE.SphereGeometry(1.2, segments, segments);
          const material = new THREE.MeshBasicMaterial({ map: videoTexture });
          const sphere = new THREE.Mesh(geometry, material);
          scene.add(sphere);

          const animate = () => {
            animationId = requestAnimationFrame(animate);
            sphere.rotation.y += rotationSpeed;
            renderer!.render(scene, camera);
          };
          animate();
          onReady?.();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        console.error("WebcamSphere init failed:", err);
      }
    };

    init();

    return () => {
      cleanupThreeScene(renderer, mountEl, stream, animationId);
    };
  }, [width, height, selectedDeviceId, rotationSpeed, segments, onReady, onError]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
    </div>
  );
};

export default WebcamSphere;
