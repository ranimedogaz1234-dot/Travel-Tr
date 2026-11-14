import { createApp } from './app.js';
import { config } from './config.js';
import { openDatabase, purgeExpiredSessions } from './db/database.js';

const db = openDatabase(config.databasePath);
const app = createApp({ db });

purgeExpiredSessions(db);
setInterval(() => purgeExpiredSessions(db), 60 * 60 * 1000).unref();

const server = app.listen(config.port, () => {
  console.log(`API Travel TR démarrée sur http://localhost:${config.port} (${config.env})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
