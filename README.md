# @riptheai/webgl-video

Three.js WebGL video texture components for React — webcam cubes, spheres, shader effects, video grids, and tile animations.

## Install

```bash
npm install @riptheai/webgl-video three react react-dom
```

## Components

| Component | Description |
|---|---|
| `WebcamCube` | Rotating 3D cube with webcam texture on each face |
| `WebcamSphere` | Rotating sphere with webcam video mapped to the surface |
| `AnimatedVideoCube` | Cube with configurable rotation, manual control, and debug overlay |
| `VideoShaderFX` | Webcam feed processed through custom GLSL vertex/fragment shaders |
| `VideoAlphaMask` | Webcam composited with a separate alpha mask video |
| `VideoGrid` | NxN tile grid with 12 built-in animations and adjustable spacing/tilt |
| `VideoGridControls` | Standalone control panel for VideoGrid parameters |

## Quick Start

```tsx
import { WebcamCube } from '@riptheai/webgl-video';

function App() {
  return (
    <WebcamCube
      width={640}
      height={480}
      rotationSpeed={{ x: 0.01, y: 0.01 }}
      onReady={() => console.log('WebGL ready')}
      onError={(err) => console.error(err)}
    />
  );
}
```

### Next.js (App Router)

Components use WebGL and `navigator.mediaDevices`, so they must be client-rendered:

```tsx
import dynamic from 'next/dynamic';

const WebcamCube = dynamic(
  () => import('@riptheai/webgl-video').then((m) => m.WebcamCube),
  { ssr: false }
);
```

## Base Props

All components extend `BaseWebGLVideoProps`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | varies | Canvas width in pixels |
| `height` | `number` | varies | Canvas height in pixels |
| `className` | `string` | — | CSS class on outer container |
| `style` | `CSSProperties` | — | Inline styles on outer container |
| `selectedDeviceId` | `string` | — | Specific webcam device ID |
| `videoSrc` | `string` | — | Video file URL (file-based components) |
| `onReady` | `() => void` | — | Fires when WebGL scene is initialized |
| `onError` | `(error: Error) => void` | — | Fires on init failure |

## Grid Animations

The `VideoGrid` component ships with 12 built-in tile animations accessible via the `animationTrigger` prop:

`spread_apart` · `flip_tiles` · `vortex_spiral` · `explode_fragments` · `wave_motion` · `scale_to_zero` · `cascade_fall` · `rotate_carousel` · `matrix_rain` · `bounce_physics` · `spiral_galaxy` · `domino_effect`

For programmatic control, import the animation engine directly:

```ts
import { GridAnimationController } from '@riptheai/webgl-video/animations';
```

## Utilities

```ts
import {
  createVideoTexture,   // VideoTexture with correct filtering + color space
  createWebcamStream,   // getUserMedia with device/resolution options
  createRenderer,       // WebGLRenderer attached to a container
  cleanupThreeScene,    // Dispose renderer, stop stream, cancel RAF
} from '@riptheai/webgl-video';
```

## Development

```bash
git clone https://github.com/riptheai/webgl-video.git
cd webgl-video
npm install
npm run dev          # Vite dev server on http://localhost:3333
npm run test         # Run unit tests
npm run build        # Build ESM + CJS + TypeScript declarations
```

## License

MIT
