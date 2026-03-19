import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { AnimatedVideoCubeProps } from "../types";
import { createVideoTexture, createWebcamStream, createRenderer, cleanupThreeScene, waitForVideoReady } from "../core/videoTextureUtils";

const AnimatedVideoCube: React.FC<AnimatedVideoCubeProps> = ({
  width,
  height,
  className,
  style,
  rotationSpeed = { x: 0.005, y: 0.005, z: 0 },
  isAnimating = true,
  cubeSize = 2,
  selectedDeviceId,
  mediaStream,
  videoSrc,
  resolution = { width: 1920, height: 1080 },
  frameRate = 60,
  rotationTrigger = 0,
  resetTrigger = 0,
  manualRotation = { x: 0, y: 0, z: 0 },
  surpriseRotation = false,
  showDebugInfo = false,
  onReady,
  onError,
  onVideoElement,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  const baseRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const isRotatingRef = useRef(false);
  // Store latest prop values in refs so the animation loop doesn't need to be recreated
  const isAnimatingRef = useRef(isAnimating);
  const rotationSpeedRef = useRef(rotationSpeed);
  const manualRotationRef = useRef(manualRotation);
  const showDebugInfoRef = useRef(showDebugInfo);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onVideoElementRef = useRef(onVideoElement);

  isAnimatingRef.current = isAnimating;
  rotationSpeedRef.current = rotationSpeed;
  manualRotationRef.current = manualRotation;
  showDebugInfoRef.current = showDebugInfo;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onVideoElementRef.current = onVideoElement;

  const getSize = useCallback(() => {
    if (width && height) return { w: width, h: height };
    if (mountRef.current?.parentElement) {
      const parent = mountRef.current.parentElement;
      return { w: parent.clientWidth || window.innerWidth, h: parent.clientHeight || window.innerHeight };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }, [width, height]);

  const triggerSurpriseRotation = useCallback(() => {
    if (!cubeRef.current) return;
    isRotatingRef.current = true;

    const rotX = (Math.random() - 0.5) * Math.PI * 2;
    const rotY = (Math.random() - 0.5) * Math.PI * 2;
    const rotZ = (Math.random() - 0.5) * Math.PI * 2;

    targetRotationRef.current = {
      x: baseRotationRef.current.x + rotX,
      y: baseRotationRef.current.y + rotY,
      z: baseRotationRef.current.z + rotZ,
    };

    const duration = 1000;
    const startTime = Date.now();
    const startRotation = { ...baseRotationRef.current };

    const animateRotation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      baseRotationRef.current.x = startRotation.x + (targetRotationRef.current.x - startRotation.x) * easeProgress;
      baseRotationRef.current.y = startRotation.y + (targetRotationRef.current.y - startRotation.y) * easeProgress;
      baseRotationRef.current.z = startRotation.z + (targetRotationRef.current.z - startRotation.z) * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animateRotation);
      } else {
        isRotatingRef.current = false;
      }
    };

    animateRotation();
  }, []);

  const resetRotation = useCallback(() => {
    baseRotationRef.current = { x: 0, y: 0, z: 0 };
  }, []);

  useEffect(() => {
    const mountElement = mountRef.current;
    if (!mountElement) return;

    let disposed = false;

    const init = async () => {
      try {
        const { w, h } = getSize();

        const renderer = createRenderer(mountElement, w, h, { clearColor: 0x000000, clearAlpha: 0 });
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
        camera.position.set(0, 0, cubeSize * 1.2);
        cameraRef.current = camera;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 0, 1);
        scene.add(directionalLight);

        if (videoRef.current) {
          if (!videoSrc) {
            let stream: MediaStream;
            if (mediaStream) {
              stream = mediaStream;
            } else {
              const acquired = await createWebcamStream({
                deviceId: selectedDeviceId,
                width: resolution.width,
                height: resolution.height,
                frameRate,
                facingMode: "user",
              });
              if (disposed) { acquired.getTracks().forEach(t => t.stop()); return; }
              stream = acquired;
              streamRef.current = acquired; // only track streams we own
            }
            videoRef.current.srcObject = stream;
          } else {
            videoRef.current.srcObject = null;
            await waitForVideoReady(videoRef.current);
            if (disposed) return;
          }
          await videoRef.current.play();
          if (disposed) return;
          onVideoElementRef.current?.(videoRef.current);

          const videoTexture = createVideoTexture(videoRef.current);

          const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
          const materials = Array.from({ length: 6 }, () =>
            new THREE.MeshLambertMaterial({ map: videoTexture })
          );

          const cube = new THREE.Mesh(geometry, materials);
          cubeRef.current = cube;
          scene.add(cube);

          // Animation loop — reads from refs, never triggers React re-renders
          const animate = () => {
            if (disposed) return;
            animationIdRef.current = requestAnimationFrame(animate);

            if (!cubeRef.current) return;

            if (isAnimatingRef.current && !isRotatingRef.current) {
              baseRotationRef.current.x += rotationSpeedRef.current.x;
              baseRotationRef.current.y += rotationSpeedRef.current.y;
              baseRotationRef.current.z += rotationSpeedRef.current.z;
            }

            const mr = manualRotationRef.current;
            cubeRef.current.rotation.x = baseRotationRef.current.x + mr.x;
            cubeRef.current.rotation.y = baseRotationRef.current.y + mr.y;
            cubeRef.current.rotation.z = baseRotationRef.current.z + mr.z;

            // Update debug overlay via DOM — no React setState
            if (showDebugInfoRef.current && debugRef.current) {
              const r = cubeRef.current.rotation;
              debugRef.current.textContent =
                `X: ${r.x.toFixed(3)}  Y: ${r.y.toFixed(3)}  Z: ${r.z.toFixed(3)}  ${isAnimatingRef.current ? 'ON' : 'OFF'}`;
            }

            renderer.render(scene, camera);
          };
          animate();
          onReadyRef.current?.();
        }
      } catch (error) {
        if (disposed) return;
        const err = error instanceof Error ? error : new Error(String(error));
        onErrorRef.current?.(err);
        console.error('AnimatedVideoCube init failed:', err);
      }
    };

    init();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      const { w, h } = getSize();
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      onVideoElementRef.current?.(null);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
      cleanupThreeScene(rendererRef.current, mountElement, streamRef.current);
    };
  }, [cubeSize, selectedDeviceId, mediaStream, videoSrc, resolution.width, resolution.height, frameRate, getSize]);

  useEffect(() => {
    if (rotationTrigger > 0) triggerSurpriseRotation();
  }, [rotationTrigger, triggerSurpriseRotation]);

  useEffect(() => {
    if (resetTrigger > 0) resetRotation();
  }, [resetTrigger, resetRotation]);

  useEffect(() => {
    if (surpriseRotation) triggerSurpriseRotation();
  }, [surpriseRotation, triggerSurpriseRotation]);

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <div ref={mountRef} />
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        loop={!!videoSrc}
        muted
        playsInline
        style={{ display: 'none' }}
      />
      {showDebugInfo && (
        <div
          ref={debugRef}
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            color: 'white',
            fontSize: 12,
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.5)',
            padding: 8,
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

export default AnimatedVideoCube;
