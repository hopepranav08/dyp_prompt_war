import { MotionConfig } from 'motion/react';
import { CoPilot } from './components/CoPilot';
import { Landing } from './components/Landing';

/** Two pages: the landing story at "/" and the co-pilot at "/app" (the server falls back to index.html). */
export default function App() {
  const isApp = window.location.pathname.startsWith('/app');
  return <MotionConfig reducedMotion="user">{isApp ? <CoPilot /> : <Landing />}</MotionConfig>;
}
