import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { seedCatalog } from './seed-data.js';

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

/**
 * Ouvre (ou crée) la base SQLite, applique le schéma et insère le catalogue
 * de démonstration si la base est vide.
 */
export function openDatabase(databasePath) {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new DatabaseSync(databasePath);
  if (databasePath !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM destinations').get();
  if (count === 0) seedCatalog(db);

  return db;
}

/**
 * Exécute fn dans une transaction SQLite (BEGIN IMMEDIATE : verrou d'écriture
 * pris dès le début, ce qui évite les conflits entre réservations simultanées).
 * Toute exception annule la transaction puis est relancée.
 */
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw err;
  }
}

/** Vrai si l'erreur provient d'une contrainte UNIQUE. */
export const isUniqueViolation = (err) => /UNIQUE constraint failed/i.test(String(err?.message));

/** Supprime les sessions expirées. */
export function purgeExpiredSessions(db) {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
}
