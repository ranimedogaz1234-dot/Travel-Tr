import { Router } from 'express';
import { isUniqueViolation } from '../db/database.js';
import { endSession, startSession, toPublicUser } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { conflict, unauthorized } from '../utils/http-error.js';
import { dummyVerify, hashPassword, verifyPassword } from '../utils/passwords.js';
import { loginSchema, registerSchema } from '../validation/schemas.js';

export function authRoutes(db) {
  const router = Router();
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const insertUser = db.prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)');
  const findById = db.prepare('SELECT * FROM users WHERE id = ?');

  router.post('/register', registerLimiter, validate(registerSchema), async (req, res) => {
    const { fullName, email, password } = req.valid.body;
    if (findByEmail.get(email)) {
      throw conflict('Un compte existe déjà avec cette adresse e-mail.');
    }
    const passwordHash = await hashPassword(password);
    let userId;
    try {
      userId = insertUser.run(fullName, email, passwordHash).lastInsertRowid;
    } catch (err) {
      // Course entre deux inscriptions simultanées : contrainte UNIQUE.
      if (isUniqueViolation(err)) {
        throw conflict('Un compte existe déjà avec cette adresse e-mail.');
      }
      throw err;
    }
    startSession(db, res, userId);
    res.status(201).json({ user: toPublicUser(findById.get(userId)) });
  });

  router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
    const { email, password } = req.valid.body;
    const user = findByEmail.get(email);
    const ok = user ? await verifyPassword(user.password_hash, password) : await dummyVerify(password);
    if (!user || !ok) {
      throw unauthorized('Adresse e-mail ou mot de passe incorrect.');
    }
    // Nouvelle session à chaque connexion (prévention de la fixation de session).
    endSession(db, req, res);
    startSession(db, res, user.id);
    res.json({ user: toPublicUser(user) });
  });

  router.post('/logout', (req, res) => {
    endSession(db, req, res);
    res.status(204).end();
  });

  /** Renvoie l'utilisateur connecté, ou null (pas d'erreur 401 pour un visiteur). */
  router.get('/me', (req, res) => {
    res.json({ user: req.user ?? null });
  });

  return router;
}
