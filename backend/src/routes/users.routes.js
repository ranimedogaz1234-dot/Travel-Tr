import { Router } from 'express';
import { requireAuth, toPublicUser } from '../middleware/auth.js';
import { sensitiveLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { badRequest, conflict } from '../utils/http-error.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { changePasswordSchema, updateProfileSchema } from '../validation/schemas.js';

/** Routes du compte : chaque opération porte uniquement sur l'utilisateur connecté. */
export function userRoutes(db) {
  const router = Router();
  router.use(requireAuth);

  const findById = db.prepare('SELECT * FROM users WHERE id = ?');
  const emailTaken = db.prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?');
  const updateProfile = db.prepare(`
    UPDATE users SET full_name = ?, email = ?, phone = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?`);
  const updatePassword = db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`);
  const deleteOtherSessions = db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?');

  router.get('/me', (req, res) => {
    res.json({ user: req.user });
  });

  router.put('/me', validate(updateProfileSchema), (req, res) => {
    const { fullName, email, phone } = req.valid.body;
    if (emailTaken.get(email, req.user.id)) {
      throw conflict('Cette adresse e-mail est déjà utilisée par un autre compte.');
    }
    updateProfile.run(fullName, email, phone ?? null, req.user.id);
    res.json({ user: toPublicUser(findById.get(req.user.id)) });
  });

  router.put('/me/password', sensitiveLimiter, validate(changePasswordSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.valid.body;
    const user = findById.get(req.user.id);
    if (!(await verifyPassword(user.password_hash, currentPassword))) {
      throw badRequest('Le mot de passe actuel est incorrect.', {
        currentPassword: 'Le mot de passe actuel est incorrect.',
      });
    }
    updatePassword.run(await hashPassword(newPassword), user.id);
    // Déconnecte les autres appareils.
    deleteOtherSessions.run(user.id, req.sessionId);
    res.json({ message: 'Votre mot de passe a été modifié.' });
  });

  return router;
}
