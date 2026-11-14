process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');
const { openDatabase } = await import('../src/db/database.js');

/** Crée une application isolée (base en mémoire) sans frontend. */
export function createTestApp() {
  const db = openDatabase(':memory:');
  const app = createApp({ db, frontendDist: '/nonexistent' });
  return { app, db };
}

/** Client HTTP qui conserve les cookies et envoie le jeton CSRF comme Angular. */
export async function createClient(app) {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/me');
  const cookie = res.headers['set-cookie'].find((c) => c.startsWith('XSRF-TOKEN='));
  const xsrf = cookie.split(';')[0].split('=')[1];
  const withToken = (req) => req.set('X-XSRF-TOKEN', xsrf);
  return {
    agent,
    xsrf,
    get: (url) => agent.get(url),
    post: (url, body) => withToken(agent.post(url)).send(body),
    put: (url, body) => withToken(agent.put(url)).send(body),
    patch: (url, body) => withToken(agent.patch(url)).send(body),
  };
}

let counter = 0;
export async function registerUser(client, overrides = {}) {
  counter += 1;
  const body = {
    fullName: 'Utilisateur Test',
    email: `test${counter}-${Date.now()}@exemple.fr`,
    password: 'MotDePasse123',
    confirmPassword: 'MotDePasse123',
    ...overrides,
  };
  const res = await client.post('/api/auth/register', body);
  return { res, body };
}

export { request };
