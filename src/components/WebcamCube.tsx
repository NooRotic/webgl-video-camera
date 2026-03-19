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
  mediaStream,
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
    let ownStream: MediaStream | null = null; // only set if WE acquired it
    let disposed = false;
    const mountEl = mountRef.current;

    const init = async () => {
      if (!mountEl) return;

      try {
        let stream: MediaStream;
        if (mediaStream) {
          // Use pre-acquired stream — don't call getUserMedia
          stream = mediaStream;
        } else {
          // Acquire our own stream
          ownStream = await createWebcamStream({ deviceId: selectedDeviceId });
          if (disposed) { ownStream.getTracks().forEach(t => t.stop()); return; }
          stream = ownStream;
        }

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
      // Only stop stream if we acquired it — don't kill a shared stream
      cleanupThreeScene(renderer, mountEl, ownStream, animationId);
    };
  }, [width, height, selectedDeviceId, mediaStream, rotationSpeed.x, rotationSpeed.y]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
    </div>
  );
};

export default WebcamCube;
