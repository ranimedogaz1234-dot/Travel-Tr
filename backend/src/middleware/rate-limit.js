import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { config } from '../config.js';

const disabled = config.rateLimitDisabled && !config.isProduction;

function limiter({ windowMinutes, limit, message, keyGenerator }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => disabled,
    keyGenerator,
    handler: (_req, res) => res.status(429).json({ error: message }),
  });
}

/** Limite globale de l'API. */
export const apiLimiter = limiter({
  windowMinutes: 15,
  limit: 600,
  message: 'Trop de requêtes. Merci de patienter quelques minutes.',
});

/** Anti force brute : 10 tentatives de connexion / 15 min par couple IP + e-mail. */
export const loginLimiter = limiter({
  windowMinutes: 15,
  limit: 10,
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? '').toLowerCase()}`,
});

// En test, les inscriptions/messages sont nombreux : seule la limite de connexion reste stricte.
const relaxed = (n) => (config.isTest ? 1000 : n);

export const registerLimiter = limiter({
  windowMinutes: 60,
  limit: relaxed(10),
  message: 'Trop de créations de compte depuis cette adresse. Réessayez plus tard.',
});

export const contactLimiter = limiter({
  windowMinutes: 60,
  limit: relaxed(5),
  message: 'Vous avez envoyé trop de messages. Réessayez dans une heure.',
});

export const sensitiveLimiter = limiter({
  windowMinutes: 15,
  limit: 10,
  message: 'Trop de tentatives. Réessayez dans 15 minutes.',
});
