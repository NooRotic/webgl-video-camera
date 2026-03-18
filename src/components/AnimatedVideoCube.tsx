import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { AnimatedVideoCubeProps } from "../types";
import { createVideoTexture, createWebcamStream, cleanupThreeScene } from "../core/videoTextureUtils";

const AnimatedVideoCube: React.FC<AnimatedVideoCubeProps> = ({
  width,
  height,
  className,
  style,
  rotationSpeed = { x: 0.005, y: 0.005, z: 0 },
  isAnimating = true,
  cubeSize = 2,
  selectedDeviceId,
  resolution = { width: 1920, height: 1080 },
  frameRate = 60,
  rotationTrigger = 0,
  resetTrigger = 0,
  manualRotation = { x: 0, y: 0, z: 0 },
  surpriseRotation = false,
  showDebugInfo = false,
  onReady,
  onError,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [currentRotation, setCurrentRotation] = useState({ x: 0, y: 0, z: 0 });
  const baseRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const isRotatingRef = useRef(false);

  const getSize = useCallback(() => {
    if (width && height) return { w: width, h: height };
    if (mountRef.current?.parentElement) {
      const parent = mountRef.current.parentElement;
      return { w: parent.clientWidth || window.innerWidth, h: parent.clientHeight || window.innerHeight };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }, [width, height]);

  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !cubeRef.current) return;

    if (isAnimating && !isRotatingRef.current) {
      baseRotationRef.current.x += rotationSpeed.x;
      baseRotationRef.current.y += rotationSpeed.y;
      baseRotationRef.current.z += rotationSpeed.z;
    }

    cubeRef.current.rotation.x = baseRotationRef.current.x + manualRotation.x;
    cubeRef.current.rotation.y = baseRotationRef.current.y + manualRotation.y;
    cubeRef.current.rotation.z = baseRotationRef.current.z + manualRotation.z;

    setCurrentRotation({
      x: cubeRef.current.rotation.x,
      y: cubeRef.current.rotation.y,
      z: cubeRef.current.rotation.z,
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationIdRef.current = requestAnimationFrame(animate);
  }, [isAnimating, rotationSpeed, manualRotation]);

  const stopAnimation = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  };

  const triggerSurpriseRotation = () => {
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
  };

  const resetRotation = () => {
    baseRotationRef.current = { x: 0, y: 0, z: 0 };
  };

  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;
    const { w, h } = getSize();
    cameraRef.current.aspect = w / h;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(w, h);
  }, [getSize]);

  useEffect(() => {
    const mountElement = mountRef.current;

    const init = async () => {
      if (!mountElement) return;

      try {
        const { w, h } = getSize();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w, h);
        renderer.setClearColor(0x000000, 0);
        mountElement.appendChild(renderer.domElement);
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

        const stream = await createWebcamStream({
          deviceId: selectedDeviceId,
          width: resolution.width,
          height: resolution.height,
          frameRate,
          facingMode: "user",
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const videoTexture = createVideoTexture(videoRef.current);

          const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
          const materials = Array.from({ length: 6 }, () =>
            new THREE.MeshLambertMaterial({ map: videoTexture })
          );

          const cube = new THREE.Mesh(geometry, materials);
          cubeRef.current = cube;
          scene.add(cube);

          animate();
          onReady?.();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        console.error('AnimatedVideoCube init failed:', err);
      }
    };

    init();
    window.addEventListener('resize', handleResize);

    return () => {
      stopAnimation();
      window.removeEventListener('resize', handleResize);
      cleanupThreeScene(rendererRef.current, mountElement, streamRef.current);
    };
  }, [cubeSize, selectedDeviceId, resolution, frameRate, animate, getSize, handleResize, onReady, onError]);

  useEffect(() => {
    if (rotationTrigger > 0) triggerSurpriseRotation();
  }, [rotationTrigger]);

  useEffect(() => {
    if (resetTrigger > 0) resetRotation();
  }, [resetTrigger]);

  useEffect(() => {
    if (surpriseRotation) triggerSurpriseRotation();
  }, [surpriseRotation]);

  return (
    <div className={className} style={style}>
      <div
        ref={mountRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
      />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
      />
      {showDebugInfo && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          color: 'white',
          fontSize: 12,
          background: 'rgba(0,0,0,0.5)',
          padding: 8,
          borderRadius: 4,
        }}>
          <div>Rotation X: {currentRotation.x.toFixed(3)}</div>
          <div>Rotation Y: {currentRotation.y.toFixed(3)}</div>
          <div>Rotation Z: {currentRotation.z.toFixed(3)}</div>
          <div>Animation: {isAnimating ? 'ON' : 'OFF'}</div>
        </div>
      )}
    </div>
  );
};

export default AnimatedVideoCube;
