import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { VideoAlphaMaskProps } from "../types";
import { createVideoTexture, createRenderer, cleanupThreeScene } from "../core/videoTextureUtils";

const VideoAlphaMask: React.FC<VideoAlphaMaskProps> = ({
  width = 400,
  height = 400,
  className,
  style,
  videoSrc = "/sample.mp4",
  alphaSrc = "/alpha-mask.mp4",
  onReady,
  onError,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const alphaRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    const mountEl = mountRef.current;

    const init = () => {
      if (!mountEl || !videoRef.current || !alphaRef.current) return;

      try {
        renderer = createRenderer(mountEl, width, height);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
        camera.position.z = 2.5;

        const videoTexture = createVideoTexture(videoRef.current);
        const alphaTexture = createVideoTexture(alphaRef.current);

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({
          map: videoTexture,
          alphaMap: alphaTexture,
          transparent: true,
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
        console.error("VideoAlphaMask init failed:", err);
      }
    };

    init();

    return () => {
      cleanupThreeScene(renderer, mountEl, null, animationId);
    };
  }, [width, height, videoSrc, alphaSrc, onReady, onError]);

  return (
    <div className={className} style={style}>
      <div ref={mountRef} />
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{ display: "none" }}
      />
      <video
        ref={alphaRef}
        src={alphaSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{ display: "none" }}
      />
    </div>
  );
};

export default VideoAlphaMask;
