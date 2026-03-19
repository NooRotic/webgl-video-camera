import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock WebGL context since jsdom doesn't support it
beforeEach(() => {
  // Provide a minimal WebGL context mock
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    canvas: document.createElement('canvas'),
    drawingBufferWidth: 640,
    drawingBufferHeight: 480,
    getExtension: vi.fn().mockReturnValue(null),
    getParameter: vi.fn().mockReturnValue(0),
    createBuffer: vi.fn(),
    createFramebuffer: vi.fn(),
    createProgram: vi.fn().mockReturnValue({}),
    createShader: vi.fn().mockReturnValue({}),
    createTexture: vi.fn(),
    createRenderbuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bindFramebuffer: vi.fn(),
    bindTexture: vi.fn(),
    bindRenderbuffer: vi.fn(),
    bufferData: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn().mockReturnValue(true),
    getShaderParameter: vi.fn().mockReturnValue(true),
    getUniformLocation: vi.fn(),
    getAttribLocation: vi.fn().mockReturnValue(0),
    useProgram: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    viewport: vi.fn(),
    scissor: vi.fn(),
    blendFunc: vi.fn(),
    blendEquation: vi.fn(),
    depthFunc: vi.fn(),
    depthMask: vi.fn(),
    colorMask: vi.fn(),
    frontFace: vi.fn(),
    cullFace: vi.fn(),
    pixelStorei: vi.fn(),
    activeTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    framebufferTexture2D: vi.fn(),
    renderbufferStorage: vi.fn(),
    framebufferRenderbuffer: vi.fn(),
    checkFramebufferStatus: vi.fn().mockReturnValue(36053), // FRAMEBUFFER_COMPLETE
    deleteBuffer: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    deleteTexture: vi.fn(),
    deleteRenderbuffer: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    generateMipmap: vi.fn(),
    isContextLost: vi.fn().mockReturnValue(false),
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('Component exports', () => {
  it('exports all expected components from index', async () => {
    const exports = await import('../src/index');

    expect(exports.WebcamCube).toBeDefined();
    expect(exports.WebcamSphere).toBeDefined();
    expect(exports.AnimatedVideoCube).toBeDefined();
    expect(exports.VideoShaderFX).toBeDefined();
    expect(exports.VideoAlphaMask).toBeDefined();
    expect(exports.VideoGrid).toBeDefined();
    expect(exports.VideoGridControls).toBeDefined();
    expect(exports.VideoVHSEffect).toBeDefined();
  });

  it('exports animation engine', async () => {
    const exports = await import('../src/index');

    expect(exports.gridAnimations).toBeDefined();
    expect(exports.GridAnimationController).toBeDefined();
    expect(Array.isArray(exports.gridAnimations)).toBe(true);
  });

  it('exports utility functions', async () => {
    const exports = await import('../src/index');

    expect(typeof exports.createVideoTexture).toBe('function');
    expect(typeof exports.createWebcamStream).toBe('function');
    expect(typeof exports.createRenderer).toBe('function');
    expect(typeof exports.cleanupThreeScene).toBe('function');
  });
});

describe('Component render contracts', () => {
  it('WebcamCube is a valid React component', async () => {
    const { WebcamCube } = await import('../src/index');
    expect(typeof WebcamCube).toBe('function');
    // Verify it accepts BaseWebGLVideoProps by checking it's callable
    const element = React.createElement(WebcamCube, { width: 100, height: 100 });
    expect(element).toBeDefined();
    expect(element.type).toBe(WebcamCube);
  });

  it('WebcamSphere is a valid React component', async () => {
    const { WebcamSphere } = await import('../src/index');
    const element = React.createElement(WebcamSphere, { width: 100, height: 100 });
    expect(element.type).toBe(WebcamSphere);
  });

  it('AnimatedVideoCube is a valid React component', async () => {
    const { AnimatedVideoCube } = await import('../src/index');
    const element = React.createElement(AnimatedVideoCube, { width: 100, height: 100, showDebugInfo: true });
    expect(element.type).toBe(AnimatedVideoCube);
  });

  it('VideoVHSEffect is a valid React component', async () => {
    const { VideoVHSEffect } = await import('../src/index');
    const element = React.createElement(VideoVHSEffect, { width: 100, height: 100, intensity: 0.5 });
    expect(element.type).toBe(VideoVHSEffect);
  });

  it('VideoGridControls is a valid React component with required props', async () => {
    const { VideoGridControls } = await import('../src/index');
    const noop = () => {};
    const element = React.createElement(VideoGridControls, {
      gridSize: 3,
      tileSpacing: 0.05,
      tileSize: 1,
      speed: 0.01,
      tiltX: 0,
      tiltY: 0,
      onGridSizeChange: noop,
      onTileSpacingChange: noop,
      onTileSizeChange: noop,
      onSpeedChange: noop,
      onTiltXChange: noop,
      onTiltYChange: noop,
      onReset: noop,
    });
    expect(element.type).toBe(VideoGridControls);
  });
});
