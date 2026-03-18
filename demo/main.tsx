import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
// StrictMode disabled: double-mount causes unresolvable camera timeout
// on Windows where USB cameras have exclusive device locks.
// Library components handle cleanup correctly via disposed flag pattern.
root.render(<App />);
