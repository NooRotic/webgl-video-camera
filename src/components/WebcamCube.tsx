import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { WebcamCubeProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene } from "../core/videoTextureUtils";

const WebcamCube: React.FC<WebcamCubeProps> = ({
  width = 400,
  height = 400,
  className,
  style,
  selectedDeviceId,
  rotationSpeed = { x: 0.01, y: 0.01 },
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

        stream = await createWebcamStream({ deviceId: selectedDeviceId });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          const videoTexture = createVideoTexture(videoRef.current);

          const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
          const material = new THREE.MeshBasicMaterial({ map: videoTexture });
          const cube = new THREE.Mesh(geometry, material);
          scene.add(cube);

          const animate = () => {
            animationId = requestAnimationFrame(animate);
            cube.rotation.x += rotationSpeed.x;
            cube.rotation.y += rotationSpeed.y;
            renderer!.render(scene, camera);
          };
          animate();
          onReady?.();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        console.error("WebcamCube init failed:", err);
      }
    };

    init();

    return () => {
      cleanupThreeScene(renderer, mountEl, stream, animationId);
    };
  }, [width, height, selectedDeviceId, rotationSpeed.x, rotationSpeed.y, onReady, onError]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
    </div>
  );
};

export default WebcamCube;
