import { createApp } from './app.js';
import { config } from './config.js';
import { openDatabase, purgeExpiredSessions } from './db/database.js';

const db = openDatabase(config.databasePath);
const app = createApp({ db });

purgeExpiredSessions(db);
setInterval(() => purgeExpiredSessions(db), 60 * 60 * 1000).unref();

const server = app.listen(config.port, () => {
  console.log(`API Travel TR démarrée sur http://localhost:${config.port} (${config.env})`);
  if (config.isProduction && config.trustProxy === 0) {
    // Derrière un hébergeur (Render, Nginx…), sans TRUST_PROXY toutes les requêtes semblent
    // venir du proxy : tous les visiteurs partagent alors les mêmes limites de débit.
    console.warn('[config] TRUST_PROXY=0 en production : réglez-le si l’API est derrière un proxy inverse.');
  }
  if (config.isProduction && !config.cookieSecure) {
    console.warn('[config] COOKIE_SECURE=false en production : les cookies de session peuvent transiter sans HTTPS.');
  }
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
