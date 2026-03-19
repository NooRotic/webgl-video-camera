import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { WebcamSphereProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene } from "../core/videoTextureUtils";

const WebcamSphere: React.FC<WebcamSphereProps> = ({
  width = 400,
  height = 400,
  className,
  style,
  selectedDeviceId,
  mediaStream,
  rotationSpeed = 0.01,
  segments = 32,
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
    let ownStream: MediaStream | null = null;
    let disposed = false;
    const mountEl = mountRef.current;

    const init = async () => {
      if (!mountEl) return;

      try {
        let stream: MediaStream;
        if (mediaStream) {
          stream = mediaStream;
        } else {
          ownStream = await createWebcamStream({
            deviceId: selectedDeviceId,
            width: 1920,
            height: 1080,
          });
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

          const geometry = new THREE.SphereGeometry(1.2, segments, segments);
          const material = new THREE.MeshBasicMaterial({ map: videoTexture });
          const sphere = new THREE.Mesh(geometry, material);
          scene.add(sphere);

          const animate = () => {
            if (disposed) return;
            animationId = requestAnimationFrame(animate);
            sphere.rotation.y += rotationSpeed;
            renderer!.render(scene, camera);
          };
          animate();
          onReadyRef.current?.();
        }
      } catch (error) {
        if (disposed) return;
        const err = error instanceof Error ? error : new Error(String(error));
        onErrorRef.current?.(err);
        console.error("WebcamSphere init failed:", err);
      }
    };

    init();

    return () => {
      disposed = true;
      cleanupThreeScene(renderer, mountEl, ownStream, animationId);
    };
  }, [width, height, selectedDeviceId, mediaStream, rotationSpeed, segments]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
    </div>
  );
};

export default WebcamSphere;
