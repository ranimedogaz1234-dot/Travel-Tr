/**
 * Initialise la base de données avec le catalogue de démonstration.
 *   npm run seed            -> crée la base si nécessaire
 *   npm run seed -- --reset -> supprime la base existante puis la recrée
 */
import fs from 'node:fs';
import { config } from '../config.js';
import { openDatabase } from './database.js';

if (process.argv.includes('--reset') && config.databasePath !== ':memory:') {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(config.databasePath + suffix, { force: true });
  }
  console.log('Base de données supprimée.');
}

const db = openDatabase(config.databasePath);
const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
console.log(
  `Base prête (${config.databasePath}) : ${count('destinations')} destinations, ${count('trips')} départs, ${count('users')} utilisateurs.`,
);
db.close();
