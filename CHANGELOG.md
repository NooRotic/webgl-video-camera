# Changelog

All notable changes to `@riptheai/webgl-video` will be documented in this file.

## [0.1.0] - 2026-03-19

Initial public release.

### Components
- **WebcamCube** — rotating 3D cube with webcam/video texture on all 6 faces
- **WebcamSphere** — rotating sphere with video mapped to the surface
- **AnimatedVideoCube** — cube with configurable rotation speed, surprise rotation animation, manual rotation, and debug overlay
- **VideoShaderFX** — video feed processed through custom GLSL vertex/fragment shaders (grayscale default)
- **VideoAlphaMask** — video composited with a separate alpha mask video for transparency effects
- **VideoVHSEffect** — retro VHS filter with GLSL scanlines, chromatic aberration, film grain noise, color bleed, vignette, and periodic tracking glitch
- **VideoGrid** — NxN tile grid with 12 built-in animations (spread, flip, vortex, explode, wave, scale, cascade, carousel, matrix, bounce, spiral, domino)
- **VideoGridControls** — standalone React control panel for VideoGrid parameters

### Features
- All components support both **webcam** (`mediaStream` prop) and **video file** (`videoSrc` prop) input
- `onVideoElement` callback exposes the internal `<video>` element for external playback control (play/pause/seek)
- Shared webcam stream architecture — acquire once, pass to multiple components via `mediaStream` prop
- `createWebcamStream` utility with progressive fallback (exact device → preferred → any camera) and retry on `AbortError`
- `waitForVideoReady` utility with proper `addEventListener` cleanup (no event listener leaks)
- `createVideoTexture`, `createRenderer`, `cleanupThreeScene` utilities for Three.js lifecycle management
- `GridAnimationController` for programmatic animation control (`@riptheai/webgl-video/animations`)
- Ref-based animation parameters — slider changes update at 60fps without WebGL scene re-initialization
- Vite-powered demo app with 7 tabbed components, rotation controls, VHS effect sliders, media controls, debug panel

### Build
- Dual ESM + CJS output with TypeScript declarations via tsup
- Peer dependencies: `react >=18`, `react-dom >=18`, `three >=0.150`
- 31 unit tests across 3 suites (vitest + jsdom)
