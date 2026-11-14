import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

const env = process.env.NODE_ENV ?? 'development';
const isProduction = env === 'production';

export const config = Object.freeze({
  env,
  isProduction,
  isTest: env === 'test',
  port: int(process.env.PORT, 3000),
  /** Chemin du fichier SQLite. ':memory:' est accepté (tests). */
  databasePath:
    process.env.DATABASE_PATH === ':memory:'
      ? ':memory:'
      : path.resolve(rootDir, process.env.DATABASE_PATH ?? 'data/travel-tr.sqlite'),
  /** Origines autorisées (CORS), séparées par des virgules. Vide = même origine uniquement. */
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  /** Cookies "Secure" : obligatoire en production (HTTPS). */
  cookieSecure: bool(process.env.COOKIE_SECURE, isProduction),
  sessionTtlHours: int(process.env.SESSION_TTL_HOURS, 24 * 7),
  /** Nombre de proxys de confiance devant l'API (pour l'IP réelle du client). */
  trustProxy: int(process.env.TRUST_PROXY, 0),
  /** Dossier du build Angular à servir (optionnel). */
  frontendDist: process.env.FRONTEND_DIST
    ? path.resolve(rootDir, process.env.FRONTEND_DIST)
    : path.resolve(rootDir, '../frontend/dist/travel-tr/browser'),
  rateLimitDisabled: bool(process.env.RATE_LIMIT_DISABLED, false),
});
