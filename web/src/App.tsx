import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { CoPilot } from './components/CoPilot';
import { Landing } from './components/Landing';
import { api } from './lib/api';
import { auth } from './lib/auth';
import { PrefsProvider } from './lib/prefs';

/** Two pages: the landing story at "/" and the co-pilot at "/app" (the server falls back to index.html). */
export default function App() {
  const isApp = window.location.pathname.startsWith('/app');

  // The public web key powers both Maps JS and Identity Platform sign-in (both referrer-restricted).
  useEffect(() => {
    api.config().then((c) => auth.configure(c.mapsKey)).catch(() => undefined);
  }, []);

  return (
    <PrefsProvider>
      <MotionConfig reducedMotion="user">{isApp ? <CoPilot /> : <Landing />}</MotionConfig>
    </PrefsProvider>
  );
}
