import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { VideoAlphaMaskProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene } from "../core/videoTextureUtils";

const VideoAlphaMask: React.FC<VideoAlphaMaskProps> = ({
  width = 400,
  height = 400,
  className,
  style,
  videoSrc,
  alphaSrc,
  selectedDeviceId,
  mediaStream,
  onReady,
  onError,
  onVideoElement,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const alphaRef = useRef<HTMLVideoElement>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onVideoElementRef = useRef(onVideoElement);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onVideoElementRef.current = onVideoElement;

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
          // Wait for file video to load before creating texture
          await new Promise<void>((resolve, reject) => {
            const v = videoRef.current!;
            if (v.readyState >= 2) { resolve(); return; }
            v.onloadeddata = () => resolve();
            v.onerror = () => reject(new Error('Failed to load video file'));
          });
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

        if (alphaSrc && alphaRef.current) {
          const alphaTexture = createVideoTexture(alphaRef.current);
          const material = new THREE.MeshBasicMaterial({
            map: videoTexture,
            alphaMap: alphaTexture,
            transparent: true,
          });
          const plane = new THREE.Mesh(geometry, material);
          scene.add(plane);
        } else {
          const material = new THREE.MeshBasicMaterial({ map: videoTexture });
          const plane = new THREE.Mesh(geometry, material);
          scene.add(plane);
        }

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
        console.error("VideoAlphaMask init failed:", err);
      }
    };

    init();

    return () => {
      disposed = true;
      onVideoElementRef.current?.(null);
      cleanupThreeScene(renderer, mountEl, stream, animationId);
    };
  }, [width, height, videoSrc, alphaSrc, selectedDeviceId, mediaStream]);

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
      {alphaSrc && (
        <video
          ref={alphaRef}
          src={alphaSrc}
          autoPlay
          loop
          muted
          playsInline
          style={{ display: "none" }}
        />
      )}
    </div>
  );
};

export default VideoAlphaMask;
