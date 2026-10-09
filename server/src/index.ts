import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { VertexGemini } from './lib/gemini.js';
import { GoogleMapsClient } from './lib/maps.js';
import { FirestoreReportStore, MemoryReportStore } from './services/reportStore.js';

const config = loadConfig();
const here = path.dirname(fileURLToPath(import.meta.url));

const app = createApp(
  {
    ai: new VertexGemini(config.GOOGLE_CLOUD_PROJECT, config.GOOGLE_CLOUD_LOCATION, config.GEMINI_MODEL),
    maps: new GoogleMapsClient(config.MAPS_SERVER_KEY),
    reports: config.REPORT_STORE === 'firestore' ? new FirestoreReportStore(config.GOOGLE_CLOUD_PROJECT) : new MemoryReportStore(),
    browserMapsKey: config.VITE_MAPS_BROWSER_KEY,
    now: () => new Date(),
  },
  path.resolve(here, '../../web/dist'),
);

app.listen(config.PORT, () => {
  console.log(JSON.stringify({ severity: 'INFO', message: `Sahayatri listening on :${config.PORT}` }));
});
