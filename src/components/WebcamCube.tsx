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
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let stream: MediaStream | null = null;
    let disposed = false;
    const mountEl = mountRef.current;

    const init = async () => {
      if (!mountEl) return;

      try {
        stream = await createWebcamStream({ deviceId: selectedDeviceId });
        if (disposed) { stream.getTracks().forEach(t => t.stop()); return; }

        renderer = createRenderer(mountEl, width, height);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
        camera.position.z = 3;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (disposed) return;

          const videoTexture = createVideoTexture(videoRef.current);

          const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
          const material = new THREE.MeshBasicMaterial({ map: videoTexture });
          const cube = new THREE.Mesh(geometry, material);
          scene.add(cube);

          const animate = () => {
            if (disposed) return;
            animationId = requestAnimationFrame(animate);
            cube.rotation.x += rotationSpeed.x;
            cube.rotation.y += rotationSpeed.y;
            renderer!.render(scene, camera);
          };
          animate();
          onReadyRef.current?.();
        }
      } catch (error) {
        if (disposed) return;
        const err = error instanceof Error ? error : new Error(String(error));
        onErrorRef.current?.(err);
        console.error("WebcamCube init failed:", err);
      }
    };

    init();

    return () => {
      disposed = true;
      cleanupThreeScene(renderer, mountEl, stream, animationId);
    };
  }, [width, height, selectedDeviceId, rotationSpeed.x, rotationSpeed.y]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
    </div>
  );
};

export default WebcamCube;
