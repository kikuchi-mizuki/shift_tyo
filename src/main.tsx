import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-reload once if a dynamically imported chunk fails to load (e.g., stale HTML cache)
window.addEventListener('error', (event: Event) => {
  const e = event as any;
  const target = e?.target as HTMLElement | undefined;
  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
    const alreadyRetried = sessionStorage.getItem('chunk-retry-done');
    if (!alreadyRetried) {
      sessionStorage.setItem('chunk-retry-done', '1');
      // bust cache
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.replace(url.toString());
    }
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
