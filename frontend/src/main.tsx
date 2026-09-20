import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 1. Bloquear gestos de zoom (pinch-to-zoom) en Safari / iOS
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// 2. Bloquear zoom multi-touch (pellizcar con 2 o más dedos)
document.addEventListener('touchmove', (e: TouchEvent) => {
  if (e.touches && e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// 3. Prevenir doble toque para zoom (double-tap to zoom)
let lastTouchEnd = 0;
document.addEventListener('touchend', (e: TouchEvent) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// 4. Bloquear zoom con rueda del mouse + tecla Ctrl (simulación app en desktop)
document.addEventListener('wheel', (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <App />
)
