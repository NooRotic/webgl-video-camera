import React from "react";
import * as THREE from "three";
import VideoGridControls from "./VideoGridControls";
import { VideoGridProps } from "../types";

export default function VideoGrid({
  gridSize: propGridSize = 3,
  tileSpacing: propTileSpacing = 1.2,
  tileSize: propTileSize = 0.8,
  speed: propSpeed = 0,
  tiltX: propTiltX = 0,
  tiltY: propTiltY = 0,
  fullScreen = false,
  showControls,
  animationTrigger = '',
  stopAnimationTrigger = 0,
  rerenderTrigger = 0,
  centerTrigger = 0,
  offsetX = 0,
  offsetY = 0,
  selectedDeviceId = '',
  mediaStream,
  videoSrc,
  onReady,
  onError,
  onVideoElement,
}: VideoGridProps = {}) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const initializedRef = React.useRef(false);
  const speedRef = React.useRef(0); // Ref to access current speed in animation loop
  const onReadyRef = React.useRef(onReady);
  const onErrorRef = React.useRef(onError);
  const onVideoElementRef = React.useRef(onVideoElement);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onVideoElementRef.current = onVideoElement;
  const threeRef = React.useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    planes: THREE.Mesh[];
    videoTexture: THREE.VideoTexture | null;
  } | null>(null);
  
  // Local state for interactive controls
  const [gridSize, setGridSize] = React.useState(propGridSize);
  // tileSpacing and tileSize will be auto-calculated to fill viewport
  const [tileSpacing, setTileSpacing] = React.useState(propTileSpacing);
  const [tileSize, setTileSize] = React.useState(propTileSize);
  
  // Sync local state with props when they change
  React.useEffect(() => {
    setGridSize(propGridSize);
  }, [propGridSize]);
  
  React.useEffect(() => {
    setTileSpacing(propTileSpacing);
  }, [propTileSpacing]);
  
  React.useEffect(() => {
    setTileSize(propTileSize);
  }, [propTileSize]);
  
  React.useEffect(() => {
    setTiltX(propTiltX);
  }, [propTiltX]);
  
  React.useEffect(() => {
    setTiltY(propTiltY);
  }, [propTiltY]);
  
  React.useEffect(() => {
    setSpeed(propSpeed);
  }, [propSpeed]);
  // Auto-calculate tileSize and tileSpacing to fill viewport (only when in fullScreen mode)
  React.useLayoutEffect(() => {
    if (!mountRef.current || !fullScreen) return; // Only auto-calculate in fullScreen mode
    const container = mountRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    // The grid is square, so use the smaller dimension
    const minDim = Math.min(w, h);
    // N tiles, N-1 spacings
    const N = gridSize;
    // Let spacing be a fraction of tile size (e.g. 0.05)
    const spacingFrac = 0.05;
    // tileSize + spacing = step
    // N*tileSize + (N-1)*tileSize*spacingFrac = minDim
    // tileSize * (N + (N-1)*spacingFrac) = minDim
    const tileSizePx = minDim / (N + (N-1)*spacingFrac);
    const spacingPx = tileSizePx * spacingFrac;
    setTileSize(tileSizePx / minDim); // normalized for Three.js
    setTileSpacing((tileSizePx + spacingPx) / minDim); // normalized step
  }, [gridSize, fullScreen]);
  const [speed, setSpeed] = React.useState(0); // Force speed to start at 0
  const [tiltX, setTiltX] = React.useState(propTiltX);
  const [tiltY, setTiltY] = React.useState(propTiltY);
  const [isReady, setIsReady] = React.useState(false);
  const [videoTextureReady, setVideoTextureReady] = React.useState(false);
  
  // Interactive controls state
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);
  const mousePositionRef = React.useRef({ x: 0, y: 0 });

  // Interactive drag and scale handlers
  const handleMouseDown = React.useCallback((e: MouseEvent) => {
    if (!threeRef.current) return;
    
    const rect = threeRef.current.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    mousePositionRef.current = { x, y };
    
    e.preventDefault();
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!threeRef.current) return;
    
    const rect = threeRef.current.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    mousePositionRef.current = { x, y };
    
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) * 0.005;
      const deltaY = -(e.clientY - dragStart.y) * 0.005;
      
      // Update offset positions directly
      const planes = threeRef.current.planes;
      planes.forEach((plane, index) => {
        const i = Math.floor(index / gridSize);
        const j = index % gridSize;
        const baseX = (i - (gridSize - 1) / 2) * tileSpacing;
        const baseY = (j - (gridSize - 1) / 2) * tileSpacing;
        plane.position.set(baseX + offsetX + deltaX, baseY + offsetY + deltaY, 0);
      });
      
      e.preventDefault();
    }
  }, [isDragging, dragStart, gridSize, tileSpacing, offsetX, offsetY]);

  const handleMouseUp = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) * 0.005;
      const deltaY = -(e.clientY - dragStart.y) * 0.005;
      
      // Update the actual offset values
      if (typeof offsetX === 'number' && typeof offsetY === 'number') {
        // We need to notify parent component of the new offset values
        // For now, we'll update the local positions
        const newOffsetX = offsetX + deltaX;
        const newOffsetY = offsetY + deltaY;
      }
      
      setIsDragging(false);
    }
  }, [isDragging, dragStart, offsetX, offsetY]);

  const handleMouseEnter = React.useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovering(false);
    setIsDragging(false);
  }, []);

  const handleWheel = React.useCallback((e: WheelEvent) => {
    if (!threeRef.current || !isHovering) return;
    
    const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const planes = threeRef.current.planes;
    
    planes.forEach((plane) => {
      plane.scale.multiplyScalar(scaleFactor);
    });
    
    e.preventDefault();
  }, [isHovering]);

  // Add mouse event listeners
  React.useEffect(() => {
    if (!threeRef.current) return;
    
    const canvas = threeRef.current.renderer.domElement;
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseEnter, handleMouseLeave, handleWheel]);

  // Reset function to restore default values
  const handleReset = () => {
    setGridSize(3);
    setTileSpacing(1.2);
    setTileSize(0.8);
    setSpeed(0);
    setTiltX(0);
    setTiltY(0);
  };

  // Calculate camera position based on grid settings
  const getCameraZ = React.useCallback(() => {
    const fov = 70;
    const N = gridSize;
    const gridExtent = ((N - 1) * tileSpacing + tileSize) / 2;
    const fovRad = (fov * Math.PI) / 180;
    return gridExtent / Math.tan(fovRad / 2);
  }, [gridSize, tileSpacing, tileSize]);

  React.useEffect(() => {
    if (initializedRef.current) return; // Prevent re-initialization
    
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    const planes: THREE.Mesh[] = [];
    let animationId: number;

    const init = async () => {
      if (!mountRef.current) return;
      
      // Get container dimensions
      const container = mountRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0); // fully transparent
  renderer.setSize(containerWidth, containerHeight);
      mountRef.current.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      // Initialize camera with default position (will be updated by separate effect)
      const fov = 70;
      camera = new THREE.PerspectiveCamera(fov, containerWidth / containerHeight, 0.1, 1000);
      camera.position.z = 5; // Default value
      
      initializedRef.current = true;
      
      // Store THREE.js objects for later updates (video texture will be added by separate effect)
      threeRef.current = { renderer, scene, camera, planes, videoTexture: null };
      
      // Mark as ready after a short delay to prevent re-render conflicts
      setTimeout(() => setIsReady(true), 100);
      
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const currentPlanes = threeRef.current?.planes || [];
        if (speedRef.current > 0) {
          currentPlanes.forEach((plane) => {
            plane.rotation.y += speedRef.current;
          });
        }
        renderer.render(scene, camera);
      };
      animate();
    };

    init();
    const mountEl = mountRef.current;
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        if (mountEl) mountEl.innerHTML = "";
      }
      initializedRef.current = false;
    };
  }, [selectedDeviceId]); // Only re-initialize when device changes

  // Handle video device setup separately
  React.useEffect(() => {
    if (!initializedRef.current) return;

    let ownStream: MediaStream | null = null;
    let disposed = false;

    const setupVideo = async () => {
      try {
        setVideoTextureReady(false); // Reset state

        if (videoRef.current) {
          if (!videoSrc) {
            // Webcam / stream path
            let stream: MediaStream;
            if (mediaStream) {
              stream = mediaStream;
            } else {
              // Configure video constraints with device selection
              const videoConstraints: MediaTrackConstraints = {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              };

              // Add device ID if specified
              if (selectedDeviceId) {
                videoConstraints.deviceId = { exact: selectedDeviceId };
              }

              ownStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
              if (disposed) { ownStream.getTracks().forEach(t => t.stop()); return; }
              stream = ownStream;
            }
            videoRef.current.srcObject = stream;
          } else {
            // File path: clear srcObject, wait for loadeddata
            videoRef.current.srcObject = null;
            await new Promise<void>((resolve, reject) => {
              const v = videoRef.current!;
              if (v.readyState >= 2) { resolve(); return; }
              v.onloadeddata = () => resolve();
              v.onerror = () => reject(new Error('Failed to load video file'));
            });
            if (disposed) return;
          }

          // Handle video play with proper error handling
          try {
            await videoRef.current.play();
          } catch (error: unknown) {
            // Ignore AbortError as it's expected when component re-renders
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Video play error:', error);
            }
          }
          if (disposed) return;
          onVideoElementRef.current?.(videoRef.current);

          // Ensure video element is valid before creating texture
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            const videoTexture = new THREE.VideoTexture(videoRef.current);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.colorSpace = THREE.SRGBColorSpace;

            if (threeRef.current) {
              threeRef.current.videoTexture = videoTexture;
              setVideoTextureReady(true);
            }
          } else {
            // Create a fallback texture if video is not ready
            await new Promise((resolve) => {
              if (videoRef.current) {
                videoRef.current.addEventListener('loadeddata', () => {
                  if (videoRef.current && threeRef.current) {
                    const videoTexture = new THREE.VideoTexture(videoRef.current);
                    videoTexture.minFilter = THREE.LinearFilter;
                    videoTexture.magFilter = THREE.LinearFilter;
                    videoTexture.format = THREE.RGBAFormat;
                    threeRef.current.videoTexture = videoTexture;
                    setVideoTextureReady(true);
                  }
                  resolve(undefined);
                }, { once: true });
              } else {
                resolve(undefined);
              }
            });
          }
          onReadyRef.current?.();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onErrorRef.current?.(err);
        console.error('Failed to setup video:', error);
      }
    };

    setupVideo();

    return () => {
      disposed = true;
      onVideoElementRef.current?.(null);
      if (ownStream) {
        ownStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId, mediaStream, videoSrc]); // Re-setup video when source changes
  
  // Update camera position when grid size changes
  React.useEffect(() => {
    if (!threeRef.current) return;
    
    const { camera } = threeRef.current;
    camera.position.z = getCameraZ();
  }, [getCameraZ]);

  // Update grid when controls change
  React.useEffect(() => {
    if (!initializedRef.current || !threeRef.current) return;
    
    const { scene, videoTexture } = threeRef.current;
    const planes = threeRef.current.planes;
    
    
    if (!videoTexture) {
      return;
    }
    
    // Clear existing planes
    planes.forEach(plane => scene.remove(plane));
    planes.length = 0;
    
    // Create new grid
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
        
        // Calculate UV coordinates for this tile to show a segment of the video
        const uvOffsetX = i / gridSize;
        const uvOffsetY = j / gridSize;
        const uvScaleX = 1 / gridSize;
        const uvScaleY = 1 / gridSize;
        
        // Modify UV coordinates to show only this tile's portion of the video
        const uvAttribute = geometry.attributes.uv;
        for (let k = 0; k < uvAttribute.count; k++) {
          const u = uvAttribute.getX(k);
          const v = uvAttribute.getY(k);
          uvAttribute.setXY(k, uvOffsetX + u * uvScaleX, uvOffsetY + v * uvScaleY);
        }
        
        const material = new THREE.MeshBasicMaterial({ map: videoTexture, color: 0xffffff });
        const plane = new THREE.Mesh(geometry, material);
        const x = (i - (gridSize - 1) / 2) * tileSpacing;
        const y = (j - (gridSize - 1) / 2) * tileSpacing;
        plane.position.set(x, y, 0);
        plane.rotation.x = tiltX;
        plane.rotation.y = tiltY;
        planes.push(plane);
        scene.add(plane);
      }
    }
  }, [gridSize, tileSpacing, tileSize, tiltX, tiltY, videoTextureReady]);

  // Separate effect for just updating positions (no re-creation)
  React.useEffect(() => {
    if (!threeRef.current) return;
    
    const planes = threeRef.current.planes;
    
    // Update positions of existing planes without recreating them
    planes.forEach((plane, index) => {
      const i = Math.floor(index / gridSize);
      const j = index % gridSize;
      const x = (i - (gridSize - 1) / 2) * tileSpacing + offsetX;
      const y = (j - (gridSize - 1) / 2) * tileSpacing + offsetY;
      plane.position.set(x, y, 0);
    });
  }, [offsetX, offsetY, gridSize, tileSpacing]);

  // Handle animation triggers
  React.useEffect(() => {
    if (!animationTrigger || !threeRef.current) return;
    
    const planes = threeRef.current.planes;
    
    // Calculate proper grid positions based on current settings
    const getGridPosition = (i: number, j: number) => {
      const x = (i - (gridSize - 1) / 2) * tileSpacing + offsetX;
      const y = (j - (gridSize - 1) / 2) * tileSpacing + offsetY;
      return { x, y };
    };
    
    // Store original positions and rotations for each plane
    const originalStates = planes.map((plane, index) => {
      const i = Math.floor(index / gridSize);
      const j = index % gridSize;
      const gridPos = getGridPosition(i, j);
      return {
        position: { x: gridPos.x, y: gridPos.y, z: 0 },
        rotation: { x: tiltX, y: tiltY, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      };
    });
    
    // Helper function to restore a plane to its configured state
    const restoreToOriginalState = (plane: THREE.Mesh, index: number, progress: number = 1) => {
      const original = originalStates[index];
      if (progress >= 1) {
        // Snap to exact configured state
        plane.position.set(original.position.x, original.position.y, original.position.z);
        plane.rotation.set(original.rotation.x, original.rotation.y, original.rotation.z);
        plane.scale.set(original.scale.x, original.scale.y, original.scale.z);
      } else {
        // Interpolate towards configured state
        const currentPos = plane.position;
        const currentRot = plane.rotation;
        const currentScale = plane.scale;
        
        plane.position.x = currentPos.x + (original.position.x - currentPos.x) * progress;
        plane.position.y = currentPos.y + (original.position.y - currentPos.y) * progress;
        plane.position.z = currentPos.z + (original.position.z - currentPos.z) * progress;
        
        plane.rotation.x = currentRot.x + (original.rotation.x - currentRot.x) * progress;
        plane.rotation.y = currentRot.y + (original.rotation.y - currentRot.y) * progress;
        plane.rotation.z = currentRot.z + (original.rotation.z - currentRot.z) * progress;
        
        plane.scale.x = currentScale.x + (original.scale.x - currentScale.x) * progress;
        plane.scale.y = currentScale.y + (original.scale.y - currentScale.y) * progress;
        plane.scale.z = currentScale.z + (original.scale.z - currentScale.z) * progress;
      }
    };
    
    // Execute animation based on trigger
    switch (animationTrigger) {
      case 'spread_apart':
        // Animate tiles spreading apart
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const targetX = originalPos.x * 2;
          const targetY = originalPos.y * 2;
          
          // Simple animation using a setTimeout chain
          let progress = 0;
          const animate = () => {
            progress += 0.05;
            if (progress <= 1) {
              plane.position.x = originalPos.x + (targetX - originalPos.x) * progress;
              plane.position.y = originalPos.y + (targetY - originalPos.y) * progress;
              requestAnimationFrame(animate);
            } else {
              // Return to configured grid position
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.05;
                  if (returnProgress <= 1) {
                    plane.position.x = targetX + (originalPos.x - targetX) * returnProgress;
                    plane.position.y = targetY + (originalPos.y - targetY) * returnProgress;
                    requestAnimationFrame(returnAnimate);
                  }
                };
                returnAnimate();
              }, 500);
            }
          };
          animate();
        });
        break;
        
      case 'flip_tiles':
        // Animate tiles flipping
        planes.forEach((plane, index) => {
          const originalRot = originalStates[index].rotation;
          let progress = 0;
          const animate = () => {
            progress += 0.1;
            if (progress <= 1) {
              plane.rotation.y = originalRot.y + Math.PI * progress;
              requestAnimationFrame(animate);
            } else {
              // Return to configured rotation
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.1;
                  if (returnProgress <= 1) {
                    plane.rotation.y = (originalRot.y + Math.PI) + (originalRot.y - (originalRot.y + Math.PI)) * returnProgress;
                    requestAnimationFrame(returnAnimate);
                  }
                };
                returnAnimate();
              }, 200);
            }
          };
          setTimeout(animate, index * 100); // Stagger the animation
        });
        break;
        
      case 'scale_to_zero':
        // Animate tiles scaling to zero and back
        planes.forEach((plane, index) => {
          let progress = 0;
          const animate = () => {
            progress += 0.08;
            if (progress <= 1) {
              const scale = 1 - progress;
              plane.scale.set(scale, scale, scale);
              requestAnimationFrame(animate);
            } else {
              // Scale back to original
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.08;
                  if (returnProgress <= 1) {
                    const scale = returnProgress;
                    plane.scale.set(scale, scale, scale);
                    requestAnimationFrame(returnAnimate);
                  }
                };
                returnAnimate();
              }, 300);
            }
          };
          setTimeout(animate, index * 50); // Stagger the animation
        });
        break;
        
      case 'wave_motion':
        // Create a wave effect across the grid
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          let time = 0;
          
          const animate = () => {
            time += 0.1;
            if (time <= Math.PI * 4) { // 4 wave cycles
              const wave = Math.sin(time - (row + col) * 0.5) * 0.5;
              plane.position.z = wave;
              requestAnimationFrame(animate);
            } else {
              plane.position.z = originalPos.z; // Return to configured position
            }
          };
          animate();
        });
        break;
        
      case 'spiral_out':
        // Animate tiles spiraling outward from center
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const originalRot = originalStates[index].rotation;
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          const centerX = (gridSize - 1) / 2;
          const centerY = (gridSize - 1) / 2;
          const distance = Math.sqrt((col - centerX) ** 2 + (row - centerY) ** 2);
          const angle = Math.atan2(row - centerY, col - centerX);
          
          let progress = 0;
          
          const animate = () => {
            progress += 0.04;
            if (progress <= 1) {
              const spiralRadius = distance * 2 * progress;
              const spiralAngle = angle + progress * Math.PI * 4;
              plane.position.x = originalPos.x + Math.cos(spiralAngle) * spiralRadius * 0.5;
              plane.position.y = originalPos.y + Math.sin(spiralAngle) * spiralRadius * 0.5;
              plane.rotation.z = originalRot.z + progress * Math.PI * 2;
              requestAnimationFrame(animate);
            } else {
              // Return to configured position and rotation
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.06;
                  if (returnProgress <= 1) {
                    const currentX = plane.position.x;
                    const currentY = plane.position.y;
                    const currentZ = plane.rotation.z;
                    plane.position.x = currentX + (originalPos.x - currentX) * returnProgress;
                    plane.position.y = currentY + (originalPos.y - currentY) * returnProgress;
                    plane.rotation.z = currentZ + (originalRot.z - currentZ) * returnProgress;
                    requestAnimationFrame(returnAnimate);
                  }
                };
                returnAnimate();
              }, 200);
            }
          };
          setTimeout(animate, distance * 100); // Stagger based on distance from center
        });
        break;
        
      case 'cascade_fall':
        // Tiles fall down like a cascading waterfall
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const originalRot = originalStates[index].rotation;
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          let progress = 0;
          const fallDistance = 3;
          
          const animate = () => {
            progress += 0.06;
            if (progress <= 1) {
              // Accelerating fall with rotation
              const easeIn = progress * progress;
              plane.position.y = originalPos.y - fallDistance * easeIn;
              plane.rotation.x = originalRot.x + easeIn * Math.PI * 2;
              plane.rotation.z = originalRot.z + easeIn * Math.PI;
              requestAnimationFrame(animate);
            } else {
              // Bounce back to configured position
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.08;
                  if (returnProgress <= 1) {
                    const easeOut = 1 - (1 - returnProgress) ** 3; // Ease out cubic
                    plane.position.y = (originalPos.y - fallDistance) + fallDistance * easeOut;
                    plane.rotation.x = originalRot.x + (1 - easeOut) * Math.PI * 2;
                    plane.rotation.z = originalRot.z + (1 - easeOut) * Math.PI;
                    requestAnimationFrame(returnAnimate);
                  }
                };
                returnAnimate();
              }, 100);
            }
          };
          setTimeout(animate, (row + col) * 80); // Cascade delay
        });
        break;
        
      case 'bounce_scale':
        // Tiles bounce and scale rhythmically
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const originalScale = originalStates[index].scale;
          let time = 0;
          
          const animate = () => {
            time += 0.15;
            if (time <= Math.PI * 6) { // 6 bounces
              const bounce = Math.abs(Math.sin(time)) * 0.8;
              const scale = 1 + bounce * 0.5;
              plane.scale.set(scale, scale, scale);
              plane.position.y = originalPos.y + bounce * 0.3;
              requestAnimationFrame(animate);
            } else {
              // Return to configured state
              plane.scale.set(originalScale.x, originalScale.y, originalScale.z);
              plane.position.y = originalPos.y;
            }
          };
          setTimeout(animate, index * 60); // Stagger the bouncing
        });
        break;
        
      case 'rotation_chaos':
        // Random chaotic rotations on all axes
        planes.forEach((plane, index) => {
          const originalRot = originalStates[index].rotation;
          let time = 0;
          const rotationSpeeds = {
            x: (Math.random() - 0.5) * 0.3,
            y: (Math.random() - 0.5) * 0.3,
            z: (Math.random() - 0.5) * 0.3
          };
          
          const animate = () => {
            time += 0.1;
            if (time <= Math.PI * 4) { // 4 seconds of chaos
              plane.rotation.x += rotationSpeeds.x;
              plane.rotation.y += rotationSpeeds.y;
              plane.rotation.z += rotationSpeeds.z;
              requestAnimationFrame(animate);
            } else {
              // Gradually return to configured rotation
              let returnProgress = 0;
              const returnAnimate = () => {
                returnProgress += 0.05;
                if (returnProgress <= 1) {
                  plane.rotation.x = plane.rotation.x + (originalRot.x - plane.rotation.x) * 0.1;
                  plane.rotation.y = plane.rotation.y + (originalRot.y - plane.rotation.y) * 0.1;
                  plane.rotation.z = plane.rotation.z + (originalRot.z - plane.rotation.z) * 0.1;
                  requestAnimationFrame(returnAnimate);
                } else {
                  plane.rotation.set(originalRot.x, originalRot.y, originalRot.z);
                }
              };
              returnAnimate();
            }
          };
          setTimeout(animate, Math.random() * 500); // Random start delays
        });
        break;
        
      case 'orbit_center':
        // Tiles orbit around the center of the grid
        planes.forEach((plane, index) => {
          const originalRot = originalStates[index].rotation;
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          const centerX = (gridSize - 1) / 2;
          const centerY = (gridSize - 1) / 2;
          const radius = Math.sqrt((col - centerX) ** 2 + (row - centerY) ** 2);
          const initialAngle = Math.atan2(row - centerY, col - centerX);
          
          let time = 0;
          
          const animate = () => {
            time += 0.08;
            if (time <= Math.PI * 4) { // 2 full orbits
              const angle = initialAngle + time;
              const centerWorldX = 0; // Grid center in world coordinates
              const centerWorldY = 0;
              plane.position.x = centerWorldX + Math.cos(angle) * radius * tileSpacing;
              plane.position.y = centerWorldY + Math.sin(angle) * radius * tileSpacing;
              plane.rotation.z = originalRot.z + angle; // Spin while orbiting
              requestAnimationFrame(animate);
            } else {
              // Return to configured position
              let returnProgress = 0;
              const returnAnimate = () => {
                returnProgress += 0.06;
                if (returnProgress <= 1) {
                  restoreToOriginalState(plane, index, returnProgress);
                  requestAnimationFrame(returnAnimate);
                }
              };
              returnAnimate();
            }
          };
          animate();
        });
        break;
        
      case 'accordion_fold':
        // Tiles fold like an accordion horizontally and vertically
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const originalRot = originalStates[index].rotation;
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          let progress = 0;
          
          const animate = () => {
            progress += 0.05;
            if (progress <= 1) {
              // Accordion effect: compress towards center lines
              const foldFactorX = Math.sin(progress * Math.PI);
              const foldFactorY = Math.sin(progress * Math.PI);
              
              // Compress towards center of grid
              const centerCol = (gridSize - 1) / 2;
              const centerRow = (gridSize - 1) / 2;
              
              if (col < centerCol) {
                plane.position.x = originalPos.x + (centerCol - col) * tileSpacing * foldFactorX * 0.7;
              } else if (col > centerCol) {
                plane.position.x = originalPos.x - (col - centerCol) * tileSpacing * foldFactorX * 0.7;
              }
              
              if (row < centerRow) {
                plane.position.y = originalPos.y + (centerRow - row) * tileSpacing * foldFactorY * 0.7;
              } else if (row > centerRow) {
                plane.position.y = originalPos.y - (row - centerRow) * tileSpacing * foldFactorY * 0.7;
              }
              
              plane.rotation.y = originalRot.y + foldFactorX * Math.PI * 0.5;
              plane.rotation.x = foldFactorY * Math.PI * 0.5;
              requestAnimationFrame(animate);
            } else {
              // Unfold back to original position
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.06;
                  if (returnProgress <= 1) {
                    restoreToOriginalState(plane, index, returnProgress);
                    requestAnimationFrame(returnAnimate);
                  }
                };
                returnAnimate();
              }, 300);
            }
          };
          setTimeout(animate, Math.abs(col - (gridSize - 1) / 2) * 50 + Math.abs(row - (gridSize - 1) / 2) * 50);
        });
        break;
        
      case 'explode_fragments':
        // Tiles explode outward in random directions
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const originalRot = originalStates[index].rotation;
          const explosionVector = {
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4,
            z: (Math.random() - 0.5) * 2
          };
          const rotationVector = {
            x: (Math.random() - 0.5) * 0.4,
            y: (Math.random() - 0.5) * 0.4,
            z: (Math.random() - 0.5) * 0.4
          };
          
          let progress = 0;
          
          const animate = () => {
            progress += 0.04;
            if (progress <= 1) {
              // Accelerating explosion with gravity effect
              const easeOut = 1 - (1 - progress) ** 2;
              plane.position.x = originalPos.x + explosionVector.x * easeOut;
              plane.position.y = originalPos.y + explosionVector.y * easeOut - progress * progress * 0.5; // Gravity
              plane.position.z = originalPos.z + explosionVector.z * easeOut;
              
              plane.rotation.x = originalRot.x + rotationVector.x * progress * 10;
              plane.rotation.y = originalRot.y + rotationVector.y * progress * 10;
              plane.rotation.z = originalRot.z + rotationVector.z * progress * 10;
              
              // Fade out effect via scale
              const fade = 1 - progress * 0.3;
              plane.scale.set(fade, fade, fade);
              
              requestAnimationFrame(animate);
            } else {
              // Fragments return to configured state
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.08;
                  if (returnProgress <= 1) {
                    restoreToOriginalState(plane, index, returnProgress);
                    // Custom scale animation
                    const scale = 0.7 + 0.3 * returnProgress;
                    plane.scale.set(scale, scale, scale);
                    
                    requestAnimationFrame(returnAnimate);
                  } else {
                    plane.scale.set(1, 1, 1);
                  }
                };
                returnAnimate();
              }, 200);
            }
          };
          setTimeout(animate, Math.random() * 200); // Random explosion timing
        });
        break;
        
      case 'vortex_spiral':
        // Tiles get sucked into a vortex spiral
        planes.forEach((plane, index) => {
          const originalPos = originalStates[index].position;
          const originalRot = originalStates[index].rotation;
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          const centerX = (gridSize - 1) / 2;
          const centerY = (gridSize - 1) / 2;
          const initialRadius = Math.sqrt((col - centerX) ** 2 + (row - centerY) ** 2);
          const initialAngle = Math.atan2(row - centerY, col - centerX);
          
          let progress = 0;
          
          const animate = () => {
            progress += 0.06;
            if (progress <= 1) {
              // Spiral inward with increasing rotation speed
              const currentRadius = initialRadius * (1 - progress * 0.8);
              const spiralAngle = initialAngle + progress * Math.PI * 8; // Multiple rotations
              
              plane.position.x = Math.cos(spiralAngle) * currentRadius * tileSpacing;
              plane.position.y = Math.sin(spiralAngle) * currentRadius * tileSpacing;
              plane.position.z = originalPos.z - progress * 2; // Pull into vortex depth
              
              // Spin the tiles as they spiral
              plane.rotation.z = originalRot.z + progress * Math.PI * 6;
              
              // Scale down as they get closer to center
              const scale = 1 - progress * 0.4;
              plane.scale.set(scale, scale, scale);
              
              requestAnimationFrame(animate);
            } else {
              // Spiral back out
              setTimeout(() => {
                let returnProgress = 0;
                const returnAnimate = () => {
                  returnProgress += 0.08;
                  if (returnProgress <= 1) {
                    restoreToOriginalState(plane, index, returnProgress);
                    // Custom scale animation for vortex effect
                    const scale = 0.6 + 0.4 * returnProgress;
                    plane.scale.set(scale, scale, scale);
                    
                    requestAnimationFrame(returnAnimate);
                  } else {
                    restoreToOriginalState(plane, index, 1);
                  }
                };
                returnAnimate();
              }, 300);
            }
          };
          setTimeout(animate, initialRadius * 50); // Stagger based on distance from center
        });
        break;
        
      default:
    }
  }, [animationTrigger, gridSize, tileSpacing, tiltX, tiltY, offsetX, offsetY]);

  // Handle stop animation trigger
  React.useEffect(() => {
    if (!stopAnimationTrigger || !threeRef.current) return;
    
    const planes = threeRef.current.planes;
    
    // Reset all planes to their original state
    planes.forEach((plane, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const x = (col - (gridSize - 1) / 2) * tileSpacing;
      const y = (row - (gridSize - 1) / 2) * tileSpacing;
      
      plane.position.set(x, y, 0);
      plane.rotation.set(0, 0, 0);
      plane.scale.set(1, 1, 1);
    });
  }, [stopAnimationTrigger, gridSize, tileSpacing]);

  return (
    <>
      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: 'transparent', position: 'relative' }}>
        {/* WebGL Canvas */}
        <div ref={mountRef} style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, background: 'transparent' }} />
        
        {/* Hover Controls Overlay */}
        {isHovering && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              zIndex: 1000,
              pointerEvents: 'none',
              opacity: 0.9,
              transition: 'opacity 0.3s ease'
            }}
          >
            <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
              🖱️ Drag to Move
            </div>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
              🔍 Scroll to Scale
            </div>
            {isDragging && (
              <div style={{ color: '#4ade80', fontSize: '14px', fontWeight: '600' }}>
                ✋ Dragging...
              </div>
            )}
          </div>
        )}
        
        {/* Interactive Control Buttons (appear on hover) */}
        {isHovering && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '8px',
              zIndex: 1001,
              pointerEvents: 'auto'
            }}
          >
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                // Reset scale
                if (threeRef.current) {
                  threeRef.current.planes.forEach((plane) => {
                    plane.scale.set(1, 1, 1);
                  });
                }
              }}
              style={{
                background: 'rgba(59, 130, 246, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.9)'}
            >
              Reset Scale
            </button>
            
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                // Reset position
                if (threeRef.current) {
                  threeRef.current.planes.forEach((plane, index) => {
                    const i = Math.floor(index / gridSize);
                    const j = index % gridSize;
                    const x = (i - (gridSize - 1) / 2) * tileSpacing;
                    const y = (j - (gridSize - 1) / 2) * tileSpacing;
                    plane.position.set(x, y, 0);
                  });
                }
              }}
              style={{
                background: 'rgba(34, 197, 94, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.9)'}
            >
              Reset Position
            </button>
          </div>
        )}
        
        <video
          ref={videoRef}
          src={videoSrc || undefined}
          loop={!!videoSrc}
          muted
          playsInline
          style={{ position: 'absolute', top: -9999, left: -9999, width: 1, height: 1, opacity: 0 }}
        />
      </div>
      
      {/* Control Panel */}
      {isReady && (showControls ?? !fullScreen) && (
        <VideoGridControls
          gridSize={gridSize}
          tileSpacing={tileSpacing}
          tileSize={tileSize}
          speed={speed}
          tiltX={tiltX}
          tiltY={tiltY}
          onGridSizeChange={setGridSize}
          onTileSpacingChange={setTileSpacing}
          onTileSizeChange={setTileSize}
          onSpeedChange={setSpeed}
          onTiltXChange={setTiltX}
          onTiltYChange={setTiltY}
          onReset={handleReset}
        />
      )}
    </>
  );
}
