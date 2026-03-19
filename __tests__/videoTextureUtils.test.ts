import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createVideoTexture,
  cleanupThreeScene,
  waitForVideoReady,
} from '../src/core/videoTextureUtils';

describe('createVideoTexture', () => {
  it('returns a VideoTexture with correct filtering', () => {
    const video = document.createElement('video');
    const texture = createVideoTexture(video);

    expect(texture).toBeInstanceOf(THREE.VideoTexture);
    expect(texture.minFilter).toBe(THREE.LinearFilter);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('uses the provided video element as source', () => {
    const video = document.createElement('video');
    const texture = createVideoTexture(video);

    expect(texture.image).toBe(video);
  });
});

describe('waitForVideoReady', () => {
  it('resolves immediately if video readyState >= 2', async () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 3 });
    await expect(waitForVideoReady(video)).resolves.toBeUndefined();
  });

  it('resolves when loadeddata fires', async () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 0 });
    const promise = waitForVideoReady(video);
    video.dispatchEvent(new Event('loadeddata'));
    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when error fires', async () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 0 });
    const promise = waitForVideoReady(video);
    video.dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow('Failed to load video file');
  });

  it('cleans up the other listener on resolve', async () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 0 });
    const removeSpy = vi.spyOn(video, 'removeEventListener');
    const promise = waitForVideoReady(video);
    video.dispatchEvent(new Event('loadeddata'));
    await promise;
    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
    removeSpy.mockRestore();
  });
});

// createRenderer needs a real WebGL context which jsdom can't provide.
// We test the logic indirectly: the function is a thin wrapper around THREE.WebGLRenderer
// with setPixelRatio + setSize + appendChild + optional setClearColor.
// The integration is verified via the demo app and the component smoke tests.
// Here we focus on testing what we CAN test without WebGL: cleanupThreeScene.

describe('cleanupThreeScene', () => {
  it('disposes renderer and removes canvas from container', () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const mockRenderer = {
      dispose: vi.fn(),
      domElement: canvas,
    } as unknown as THREE.WebGLRenderer;

    expect(container.children.length).toBe(1);
    cleanupThreeScene(mockRenderer, container);
    expect(mockRenderer.dispose).toHaveBeenCalled();
    expect(container.children.length).toBe(0);
  });

  it('does not throw if canvas is not in container', () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    // canvas NOT appended to container

    const mockRenderer = {
      dispose: vi.fn(),
      domElement: canvas,
    } as unknown as THREE.WebGLRenderer;

    expect(() => cleanupThreeScene(mockRenderer, container)).not.toThrow();
    expect(mockRenderer.dispose).toHaveBeenCalled();
  });

  it('stops all media stream tracks', () => {
    const stopFn = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: stopFn }, { stop: stopFn }],
    } as unknown as MediaStream;

    cleanupThreeScene(null, null, mockStream);

    expect(stopFn).toHaveBeenCalledTimes(2);
  });

  it('cancels animation frame', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    cleanupThreeScene(null, null, null, 42);
    expect(cancelSpy).toHaveBeenCalledWith(42);
    cancelSpy.mockRestore();
  });

  it('handles all null args gracefully', () => {
    expect(() => cleanupThreeScene(null, null)).not.toThrow();
  });
});
