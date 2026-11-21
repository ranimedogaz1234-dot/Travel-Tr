import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { loadUser } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { authRoutes } from './routes/auth.routes.js';
import { contactRoutes } from './routes/contact.routes.js';
import { destinationRoutes } from './routes/destinations.routes.js';
import { reservationRoutes } from './routes/reservations.routes.js';
import { userRoutes } from './routes/users.routes.js';

const FORWARDING_HEADERS = ['x-forwarded-for', 'x-real-ip', 'true-client-ip', 'cf-connecting-ip', 'forwarded'];

export function createApp({
  db,
  frontendDist = config.frontendDist,
  trustProxy = config.trustProxy,
  proxyDiagnostics = config.proxyDiagnostics,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          // Angular injecte les styles des composants dans des balises <style>.
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          ...(config.isProduction ? {} : { 'upgrade-insecure-requests': null }),
        },
      },
      strictTransportSecurity: config.isProduction,
    }),
  );

  // CORS uniquement pour les origines explicitement autorisées (par défaut : même origine).
  if (config.corsOrigins.length > 0) {
    app.use('/api', cors({ origin: config.corsOrigins, credentials: true }));
  }

  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  const api = express.Router();

  // Sonde de santé (hébergeur, supervision) : déclarée avant la limite de débit et
  // la protection CSRF pour que les vérifications fréquentes ne soient jamais bloquées.
  // Elle interroge la base afin de signaler une API incapable de servir les données.
  const ping = db.prepare('SELECT 1 AS ok');
  api.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      ping.get();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'indisponible' });
    }
  });

  // Diagnostic temporaire (PROXY_DIAGNOSTICS=true) : montre la chaîne de proxys réellement
  // reçue et l'adresse utilisée comme clé de limite de débit. Il ne renvoie que des
  // informations sur la requête de l'appelant lui-même.
  if (proxyDiagnostics) {
    api.get('/health/proxy', (req, res) => {
      res.set('Cache-Control', 'no-store');
      const headers = Object.fromEntries(FORWARDING_HEADERS.map((h) => [h, req.get(h) ?? null]));
      res.json({ trustProxy, clientIp: req.ip, socketAddress: req.socket.remoteAddress ?? null, headers });
    });
  }

  api.use(apiLimiter);
  api.use(csrfProtection);
  api.use(loadUser(db));
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  api.use('/auth', authRoutes(db));
  api.use('/users', userRoutes(db));
  api.use('/destinations', destinationRoutes(db));
  api.use('/reservations', reservationRoutes(db));
  api.use('/contact', contactRoutes(db));
  api.use(notFoundHandler);

  app.use('/api', api);

  // En production, l'API sert aussi l'application Angular compilée (même origine).
  const indexHtml = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
    // Repli SPA : toute URL inconnue renvoie index.html (rafraîchissement / lien direct).
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || !req.accepts('html')) return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
