import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { safeGetSessionStorage, safeSetSessionStorage } from './utils/storage';

// Initialize Sentry (only in production)
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
    // Environment
    environment: import.meta.env.MODE,
  });
}

// Auto-reload once if a dynamically imported chunk fails to load (e.g., stale HTML cache)
window.addEventListener('error', (event: Event) => {
  const e = event as any;
  const target = e?.target as HTMLElement | undefined;
  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
    const alreadyRetried = safeGetSessionStorage('chunk-retry-done');
    if (!alreadyRetried) {
      safeSetSessionStorage('chunk-retry-done', '1');
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
