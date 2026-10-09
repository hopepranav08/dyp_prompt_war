import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { IdentityPlatformVerifier } from './lib/auth.js';
import { VertexGemini } from './lib/gemini.js';
import { GoogleMapsClient } from './lib/maps.js';
import { FirestoreReportStore, MemoryReportStore } from './services/reportStore.js';

const config = loadConfig();
const here = path.dirname(fileURLToPath(import.meta.url));
const log = (severity: string, message: string) => console.log(JSON.stringify({ severity, message }));

const app = createApp(
  {
    ai: new VertexGemini(config.GOOGLE_CLOUD_PROJECT, config.GOOGLE_CLOUD_LOCATION, config.GEMINI_MODEL),
    maps: new GoogleMapsClient(config.MAPS_SERVER_KEY),
    reports: config.REPORT_STORE === 'firestore' ? new FirestoreReportStore(config.GOOGLE_CLOUD_PROJECT) : new MemoryReportStore(),
    auth: new IdentityPlatformVerifier(config.GOOGLE_CLOUD_PROJECT),
    browserMapsKey: config.VITE_MAPS_BROWSER_KEY,
    now: () => new Date(),
  },
  path.resolve(here, '../../web/dist'),
  { log: config.NODE_ENV !== 'test', projectId: config.GOOGLE_CLOUD_PROJECT },
);

const server = app.listen(config.PORT, () => {
  log('INFO', `Sahayatri listening on :${config.PORT}`);
  void app.warm(); // pre-fetch the landmark gallery so the first visitor doesn't wait
});

// Cloud Run sends SIGTERM before stopping an instance: finish in-flight requests, then exit.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    log('INFO', `${signal} received, draining connections`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8_000).unref();
  });
}
