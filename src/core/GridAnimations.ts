import * as THREE from 'three';

export interface GridAnimation {
  name: string;
  description: string;
  duration: number;
  apply: (mesh: THREE.Mesh, progress: number, originalPosition: THREE.Vector3, gridIndex: { row: number, col: number }, totalTiles: number) => void;
  reset?: (mesh: THREE.Mesh, originalPosition: THREE.Vector3) => void;
}

// Utility functions
const easeInOut = (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number): number => t * t * t;
const bounce = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const gridAnimations: GridAnimation[] = [
  {
    name: 'spread_apart',
    description: 'Tiles spread apart from center',
    duration: 2000,
    apply: (mesh, progress, originalPosition, _gridIndex, _totalTiles) => {
      const easedProgress = easeInOut(progress);
      const spreadDistance = 3;
      
      // Calculate spread direction from center
      const centerOffset = new THREE.Vector3(
        originalPosition.x * spreadDistance * easedProgress,
        originalPosition.y * spreadDistance * easedProgress,
        originalPosition.z
      );
      
      mesh.position.copy(originalPosition).add(centerOffset);
    },
    reset: (mesh, originalPosition) => {
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'flip_tiles',
    description: 'Tiles flip along X axis',
    duration: 1500,
    apply: (mesh, progress, originalPosition, _gridIndex, _totalTiles) => {
      const easedProgress = easeOut(progress);
      mesh.rotation.x = Math.PI * 2 * easedProgress;
      mesh.position.copy(originalPosition);
    },
    reset: (mesh, originalPosition) => {
      mesh.rotation.x = 0;
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'scale_to_zero',
    description: 'Tiles scale down to zero',
    duration: 1000,
    apply: (mesh, progress, originalPosition, _gridIndex, _totalTiles) => {
      const easedProgress = easeIn(progress);
      const scale = 1 - easedProgress;
      mesh.scale.setScalar(Math.max(0.01, scale));
      mesh.position.copy(originalPosition);
    },
    reset: (mesh, originalPosition) => {
      mesh.scale.setScalar(1);
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'wave_motion',
    description: 'Tiles move in a wave pattern',
    duration: 3000,
    apply: (mesh, progress, originalPosition, gridIndex, _totalTiles) => {
      const waveFrequency = 2;
      const waveAmplitude = 1;
      const phaseOffset = (gridIndex.row + gridIndex.col) * 0.5;
      
      const wave = Math.sin(progress * Math.PI * waveFrequency + phaseOffset) * waveAmplitude;
      mesh.position.copy(originalPosition);
      mesh.position.z += wave;
    },
    reset: (mesh, originalPosition) => {
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'spiral_out',
    description: 'Tiles spiral outward from center',
    duration: 2500,
    apply: (mesh, progress, originalPosition, _gridIndex, _totalTiles) => {
      const easedProgress = easeOut(progress);
      const angle = easedProgress * Math.PI * 4; // 2 full rotations
      const distance = easedProgress * 5;
      
      const spiralX = Math.cos(angle) * distance;
      const spiralY = Math.sin(angle) * distance;
      
      mesh.position.set(
        originalPosition.x + spiralX,
        originalPosition.y + spiralY,
        originalPosition.z
      );
    },
    reset: (mesh, originalPosition) => {
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'cascade_fall',
    description: 'Tiles fall down in cascade',
    duration: 2000,
    apply: (mesh, progress, originalPosition, gridIndex, _totalTiles) => {
      const delay = (gridIndex.row + gridIndex.col) * 0.1;
      const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
      const easedProgress = easeIn(adjustedProgress);
      
      const fallDistance = -10;
      mesh.position.copy(originalPosition);
      mesh.position.y += fallDistance * easedProgress;
      
      // Add rotation during fall
      mesh.rotation.z = easedProgress * Math.PI * 2;
    },
    reset: (mesh, originalPosition) => {
      mesh.position.copy(originalPosition);
      mesh.rotation.z = 0;
    }
  },

  {
    name: 'bounce_scale',
    description: 'Tiles bounce with scaling effect',
    duration: 2000,
    apply: (mesh, progress, originalPosition, _gridIndex, _totalTiles) => {
      const bounceProgress = bounce(progress);
      const scale = 0.5 + bounceProgress * 0.8; // Scale between 0.5 and 1.3
      
      mesh.scale.setScalar(scale);
      mesh.position.copy(originalPosition);
      mesh.position.z += bounceProgress * 0.5; // Slight Z movement
    },
    reset: (mesh, originalPosition) => {
      mesh.scale.setScalar(1);
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'rotation_chaos',
    description: 'Random rotation on all axes',
    duration: 3000,
    apply: (mesh, progress, originalPosition, gridIndex, _totalTiles) => {
      const easedProgress = easeInOut(progress);
      
      // Use grid index as seed for consistent randomness
      const seedX = (gridIndex.row * 12.9898 + gridIndex.col * 78.233) % 1;
      const seedY = (gridIndex.row * 93.9898 + gridIndex.col * 45.233) % 1;
      const seedZ = (gridIndex.row * 67.9898 + gridIndex.col * 23.233) % 1;
      
      mesh.rotation.x = seedX * Math.PI * 4 * easedProgress;
      mesh.rotation.y = seedY * Math.PI * 4 * easedProgress;
      mesh.rotation.z = seedZ * Math.PI * 4 * easedProgress;
      mesh.position.copy(originalPosition);
    },
    reset: (mesh, originalPosition) => {
      mesh.rotation.set(0, 0, 0);
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'orbit_center',
    description: 'Tiles orbit around the center',
    duration: 4000,
    apply: (mesh, progress, originalPosition, _gridIndex, _totalTiles) => {
      const angle = progress * Math.PI * 2;
      const radius = Math.sqrt(originalPosition.x * originalPosition.x + originalPosition.y * originalPosition.y);
      const currentAngle = Math.atan2(originalPosition.y, originalPosition.x);
      
      const newX = Math.cos(currentAngle + angle) * radius;
      const newY = Math.sin(currentAngle + angle) * radius;
      
      mesh.position.set(newX, newY, originalPosition.z);
    },
    reset: (mesh, originalPosition) => {
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'accordion_fold',
    description: 'Tiles fold like an accordion',
    duration: 2000,
    apply: (mesh, progress, originalPosition, gridIndex, _totalTiles) => {
      const easedProgress = easeInOut(progress);
      const foldAmount = Math.sin(easedProgress * Math.PI);
      
      mesh.position.copy(originalPosition);
      mesh.rotation.y = (gridIndex.col % 2 === 0 ? 1 : -1) * foldAmount * Math.PI * 0.5;
      mesh.position.x += (gridIndex.col % 2 === 0 ? -1 : 1) * foldAmount * 0.5;
    },
    reset: (mesh, originalPosition) => {
      mesh.rotation.y = 0;
      mesh.position.copy(originalPosition);
    }
  },

  {
    name: 'explode_fragments',
    description: 'Tiles explode outward like fragments',
    duration: 1500,
    apply: (mesh, progress, originalPosition, gridIndex, _totalTiles) => {
      const easedProgress = easeOut(progress);
      
      // Random direction for each tile
      const seedX = (gridIndex.row * 12.9898 + gridIndex.col * 78.233) % 1;
      const seedY = (gridIndex.row * 93.9898 + gridIndex.col * 45.233) % 1;
      const seedZ = (gridIndex.row * 67.9898 + gridIndex.col * 23.233) % 1;
      
      const directionX = (seedX - 0.5) * 2;
      const directionY = (seedY - 0.5) * 2;
      const directionZ = (seedZ - 0.5) * 2;
      
      const explosionForce = 8;
      
      mesh.position.set(
        originalPosition.x + directionX * explosionForce * easedProgress,
        originalPosition.y + directionY * explosionForce * easedProgress,
        originalPosition.z + directionZ * explosionForce * easedProgress
      );
      
      // Add rotation during explosion
      mesh.rotation.x = directionX * Math.PI * 2 * easedProgress;
      mesh.rotation.y = directionY * Math.PI * 2 * easedProgress;
      mesh.rotation.z = directionZ * Math.PI * 2 * easedProgress;
      
      // Scale down during explosion
      const scale = 1 - easedProgress * 0.5;
      mesh.scale.setScalar(scale);
    },
    reset: (mesh, originalPosition) => {
      mesh.position.copy(originalPosition);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.setScalar(1);
    }
  },

  {
    name: 'vortex_spiral',
    description: 'Tiles get sucked into a vortex',
    duration: 3000,
    apply: (mesh, progress, originalPosition, _gridIndex, _totalTiles) => {
      const easedProgress = easeIn(progress);
      const distance = Math.sqrt(originalPosition.x * originalPosition.x + originalPosition.y * originalPosition.y);
      const angle = Math.atan2(originalPosition.y, originalPosition.x);
      
      const spiralTightness = 3;
      const newRadius = distance * (1 - easedProgress);
      const newAngle = angle + easedProgress * spiralTightness * Math.PI * 2;
      
      mesh.position.set(
        Math.cos(newAngle) * newRadius,
        Math.sin(newAngle) * newRadius,
        originalPosition.z - easedProgress * 3
      );
      
      mesh.rotation.z = easedProgress * Math.PI * 4;
      const scale = 1 - easedProgress * 0.8;
      mesh.scale.setScalar(Math.max(0.1, scale));
    },
    reset: (mesh, originalPosition) => {
      mesh.position.copy(originalPosition);
      mesh.rotation.z = 0;
      mesh.scale.setScalar(1);
    }
  }
];

export class GridAnimationController {
  private currentAnimation: GridAnimation | null = null;
  private animationStartTime: number = 0;
  private isAnimating: boolean = false;
  private meshes: THREE.Mesh[] = [];
  private originalPositions: THREE.Vector3[] = [];
  private gridInfo: { rows: number; cols: number } = { rows: 0, cols: 0 };

  constructor(meshes: THREE.Mesh[], originalPositions: THREE.Vector3[], gridSize: number) {
    this.meshes = meshes;
    this.originalPositions = originalPositions;
    this.gridInfo = { rows: gridSize, cols: gridSize };
  }

  updateMeshes(meshes: THREE.Mesh[], originalPositions: THREE.Vector3[], gridSize: number) {
    this.meshes = meshes;
    this.originalPositions = originalPositions;
    this.gridInfo = { rows: gridSize, cols: gridSize };
  }

  startAnimation(animationName: string): boolean {
    const animation = gridAnimations.find(anim => anim.name === animationName);
    if (!animation) {
      console.warn(`Animation "${animationName}" not found`);
      return false;
    }

    this.currentAnimation = animation;
    this.animationStartTime = Date.now();
    this.isAnimating = true;
    return true;
  }

  stopAnimation() {
    if (this.currentAnimation && this.currentAnimation.reset) {
      this.meshes.forEach((mesh, index) => {
        if (this.originalPositions[index] && this.currentAnimation?.reset) {
          this.currentAnimation.reset(mesh, this.originalPositions[index]);
        }
      });
    }
    this.isAnimating = false;
    this.currentAnimation = null;
  }

  update() {
    if (!this.isAnimating || !this.currentAnimation) return;

    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / this.currentAnimation.duration, 1);

    this.meshes.forEach((mesh, index) => {
      if (this.originalPositions[index] && this.currentAnimation) {
        const row = Math.floor(index / this.gridInfo.cols);
        const col = index % this.gridInfo.cols;
        
        this.currentAnimation.apply(
          mesh, 
          progress, 
          this.originalPositions[index], 
          { row, col }, 
          this.meshes.length
        );
      }
    });

    // Animation finished
    if (progress >= 1) {
      this.isAnimating = false;
      this.currentAnimation = null;
    }
  }

  getAvailableAnimations(): string[] {
    return gridAnimations.map(anim => anim.name);
  }

  getAnimationDescription(name: string): string {
    const animation = gridAnimations.find(anim => anim.name === name);
    return animation ? animation.description : '';
  }

  isCurrentlyAnimating(): boolean {
    return this.isAnimating;
  }

  getCurrentAnimationName(): string | null {
    return this.currentAnimation ? this.currentAnimation.name : null;
  }

  getCurrentAnimationProgress(): number {
    if (!this.isAnimating || !this.currentAnimation) return 0;
    const elapsed = Date.now() - this.animationStartTime;
    return Math.min(elapsed / this.currentAnimation.duration, 1);
  }
}
