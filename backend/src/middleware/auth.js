import { config } from '../config.js';
import { unauthorized } from '../utils/http-error.js';
import { randomToken, sha256 } from '../utils/tokens.js';

export const SESSION_COOKIE = 'tr_session';

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure,
  path: '/',
});

/** Crée une session en base et dépose le cookie HttpOnly. */
export function startSession(db, res, userId) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600 * 1000);
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    userId,
    expiresAt.toISOString(),
  );
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export function endSession(db, req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE id = ?').run(sha256(token));
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

/** Charge l'utilisateur connecté (s'il existe) dans req.user. */
export function loadUser(db) {
  const findSession = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.created_at, s.id AS session_id
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?`);

  return (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const row = findSession.get(sha256(token), new Date().toISOString());
      if (row) {
        req.sessionId = row.session_id;
        req.user = toPublicUser(row);
      } else {
        res.clearCookie(SESSION_COOKIE, cookieOptions());
      }
    }
    next();
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized('Veuillez vous connecter pour continuer.'));
  next();
}

export function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? null,
    createdAt: row.created_at,
  };
}
