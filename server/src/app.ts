import { existsSync } from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError } from 'zod';
import type { Deps } from './deps.js';
import { AiError } from './lib/gemini.js';
import { MapsError } from './lib/maps.js';
import { compareRouter } from './routes/compare.js';
import { exploreRouter } from './routes/explore.js';
import { pulseRouter } from './routes/pulse.js';
import { reportRouter } from './routes/report.js';
import { routeRouter } from './routes/route.js';

const GOOGLE = ['https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com', 'https://*.ggpht.com', 'https://*.googleusercontent.com'];

export function createApp(deps: Deps, staticDir?: string) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Cloud Run sits behind one Google front end

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Allowlist from Google's official Maps JS CSP guide (Maps JS needs eval + blob workers).
          scriptSrc: ["'self'", "'unsafe-eval'", 'blob:', ...GOOGLE],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', ...GOOGLE],
          connectSrc: ["'self'", 'data:', 'blob:', ...GOOGLE],
          workerSrc: ["'self'", 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          frameSrc: ["'self'", 'https://*.google.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  const api = express.Router();
  // Cloud Run reserves /healthz, so the health check lives under /api.
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use(rateLimit({ windowMs: 60_000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests, slow down for a minute.' } }));
  api.use(express.json({ limit: '12mb' }));
  api.use(exploreRouter(deps), routeRouter(deps), reportRouter(deps), compareRouter(deps), pulseRouter(deps));
  api.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use('/api', api);

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { maxAge: '1h', index: false }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', details: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`) });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Upload too large (max ~5 MB per file)' });
    return;
  }
  if (err instanceof AiError || err instanceof MapsError) {
    console.error(JSON.stringify({ severity: 'WARNING', message: err.message }));
    res.status(502).json({ error: 'An upstream Google service is busy. Please try again in a moment.' });
    return;
  }
  console.error(JSON.stringify({ severity: 'ERROR', message: err instanceof Error ? err.message : String(err) }));
  res.status(500).json({ error: 'Something went wrong on our side.' });
};
