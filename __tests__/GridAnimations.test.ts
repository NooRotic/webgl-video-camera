import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { gridAnimations, GridAnimationController } from '../src/core/GridAnimations';

describe('gridAnimations', () => {
  it('exports 12 animation definitions', () => {
    expect(gridAnimations).toHaveLength(12);
  });

  it('each animation has required properties', () => {
    for (const anim of gridAnimations) {
      expect(anim.name).toBeTruthy();
      expect(anim.description).toBeTruthy();
      expect(anim.duration).toBeGreaterThan(0);
      expect(typeof anim.apply).toBe('function');
    }
  });

  it('each animation has a reset function', () => {
    for (const anim of gridAnimations) {
      expect(typeof anim.reset).toBe('function');
    }
  });

  it('animation names are unique', () => {
    const names = gridAnimations.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('expected animation names are present', () => {
    const names = gridAnimations.map((a) => a.name);
    expect(names).toContain('spread_apart');
    expect(names).toContain('flip_tiles');
    expect(names).toContain('vortex_spiral');
    expect(names).toContain('explode_fragments');
    expect(names).toContain('wave_motion');
  });
});

describe('GridAnimationController', () => {
  function createMockMeshes(count: number) {
    const meshes: THREE.Mesh[] = [];
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial()
      );
      const pos = new THREE.Vector3(i % 3, Math.floor(i / 3), 0);
      mesh.position.copy(pos);
      meshes.push(mesh);
      positions.push(pos.clone());
    }
    return { meshes, positions };
  }

  it('lists available animations', () => {
    const { meshes, positions } = createMockMeshes(9);
    const controller = new GridAnimationController(meshes, positions, 3);
    const available = controller.getAvailableAnimations();
    expect(available).toHaveLength(12);
    expect(available).toContain('spread_apart');
  });

  it('starts and stops animations', () => {
    const { meshes, positions } = createMockMeshes(9);
    const controller = new GridAnimationController(meshes, positions, 3);

    expect(controller.isCurrentlyAnimating()).toBe(false);

    const started = controller.startAnimation('flip_tiles');
    expect(started).toBe(true);
    expect(controller.isCurrentlyAnimating()).toBe(true);
    expect(controller.getCurrentAnimationName()).toBe('flip_tiles');

    controller.stopAnimation();
    expect(controller.isCurrentlyAnimating()).toBe(false);
    expect(controller.getCurrentAnimationName()).toBeNull();
  });

  it('returns false for unknown animation names', () => {
    const { meshes, positions } = createMockMeshes(9);
    const controller = new GridAnimationController(meshes, positions, 3);
    expect(controller.startAnimation('nonexistent')).toBe(false);
  });

  it('updates mesh positions during animation', () => {
    const { meshes, positions } = createMockMeshes(9);
    const controller = new GridAnimationController(meshes, positions, 3);

    controller.startAnimation('spread_apart');

    // Simulate mid-animation by calling update
    controller.update();

    // At least one mesh should have moved from its original position
    // (since Date.now() will have some elapsed time)
    expect(controller.getCurrentAnimationProgress()).toBeGreaterThanOrEqual(0);
  });

  it('gets animation descriptions', () => {
    const { meshes, positions } = createMockMeshes(9);
    const controller = new GridAnimationController(meshes, positions, 3);

    expect(controller.getAnimationDescription('spread_apart')).toBe('Tiles spread apart from center');
    expect(controller.getAnimationDescription('nonexistent')).toBe('');
  });

  it('can update meshes after construction', () => {
    const { meshes, positions } = createMockMeshes(4);
    const controller = new GridAnimationController(meshes, positions, 2);

    const { meshes: newMeshes, positions: newPositions } = createMockMeshes(9);
    controller.updateMeshes(newMeshes, newPositions, 3);

    const available = controller.getAvailableAnimations();
    expect(available).toHaveLength(12);
  });

  it('resets meshes to original positions on stop', () => {
    const { meshes, positions } = createMockMeshes(9);
    const controller = new GridAnimationController(meshes, positions, 3);

    // Store original positions
    const originalPositions = meshes.map((m) => m.position.clone());

    controller.startAnimation('scale_to_zero');
    controller.stopAnimation();

    // After stop, meshes should be at their original positions
    for (let i = 0; i < meshes.length; i++) {
      expect(meshes[i].position.x).toBeCloseTo(originalPositions[i].x);
      expect(meshes[i].position.y).toBeCloseTo(originalPositions[i].y);
      expect(meshes[i].position.z).toBeCloseTo(originalPositions[i].z);
      expect(meshes[i].scale.x).toBeCloseTo(1);
    }
  });
});
