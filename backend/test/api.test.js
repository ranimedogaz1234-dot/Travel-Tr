import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { createClient, createTestApp, registerUser, request } from './helpers.js';

const { app, db } = createTestApp();

describe('Sécurité générale', () => {
  it('pose des en-têtes de sécurité (CSP, nosniff) et masque X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-security-policy'], /default-src 'self'/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('refuse une requête modifiante sans jeton CSRF', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.fr', password: 'x' });
    assert.equal(res.status, 403);
  });

  it('refuse un jeton CSRF qui ne correspond pas au cookie', async () => {
    const client = await createClient(app);
    const res = await client.agent.post('/api/contact').set('X-XSRF-TOKEN', 'faux').send({});
    assert.equal(res.status, 403);
  });

  it('renvoie une erreur JSON générique pour un corps invalide', async () => {
    const client = await createClient(app);
    const res = await client.agent
      .post('/api/contact')
      .set('X-XSRF-TOKEN', client.xsrf)
      .set('Content-Type', 'application/json')
      .send('{mauvais json');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Corps de requête JSON invalide.');
    assert.ok(!JSON.stringify(res.body).includes('at '), 'aucune trace de pile');
  });

  it('renvoie 404 pour un point d’accès inconnu', async () => {
    const res = await request(app).get('/api/inexistant');
    assert.equal(res.status, 404);
  });
});

describe('Authentification', () => {
  it('inscrit un utilisateur, ouvre une session HttpOnly et ne renvoie pas le hachage', async () => {
    const client = await createClient(app);
    const { res, body } = await registerUser(client);
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, body.email);
    assert.equal(res.body.user.password_hash, undefined);
    const sessionCookie = res.headers['set-cookie'].find((c) => c.startsWith('tr_session='));
    assert.match(sessionCookie, /HttpOnly/);
    assert.match(sessionCookie, /SameSite=Lax/);

    const me = await client.get('/api/auth/me');
    assert.equal(me.body.user.email, body.email);
  });

  it('stocke le mot de passe haché avec Argon2id', async () => {
    const client = await createClient(app);
    const { body } = await registerUser(client);
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(body.email);
    assert.match(row.password_hash, /^\$argon2id\$/);
    assert.ok(!row.password_hash.includes(body.password));
  });

  it('empêche les comptes en double (insensible à la casse)', async () => {
    const client = await createClient(app);
    const { body } = await registerUser(client);
    const other = await createClient(app);
    const { res } = await registerUser(other, { email: body.email.toUpperCase() });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'Un compte existe déjà avec cette adresse e-mail.');
  });

  it('valide les champs d’inscription avec des messages en français', async () => {
    const client = await createClient(app);
    const res = await client.post('/api/auth/register', {
      fullName: 'A',
      email: 'pas-un-email',
      password: 'court',
      confirmPassword: 'different',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.fields.fullName, 'Le nom complet doit contenir au moins 2 caractères.');
    assert.equal(res.body.fields.email, 'Le format de l’adresse e-mail est invalide.');
    assert.equal(res.body.fields.password, 'Le mot de passe doit contenir au moins 8 caractères.');
  });

  it('refuse des mots de passe différents', async () => {
    const client = await createClient(app);
    const { res } = await registerUser(client, { confirmPassword: 'Autre12345' });
    assert.equal(res.status, 400);
    assert.equal(res.body.fields.confirmPassword, 'Les mots de passe ne correspondent pas.');
  });

  it('connecte et déconnecte un utilisateur', async () => {
    const reg = await createClient(app);
    const { body } = await registerUser(reg);

    const client = await createClient(app);
    const bad = await client.post('/api/auth/login', { email: body.email, password: 'Mauvais123' });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error, 'Adresse e-mail ou mot de passe incorrect.');

    const ok = await client.post('/api/auth/login', { email: body.email, password: body.password });
    assert.equal(ok.status, 200);
    assert.equal((await client.get('/api/users/me')).status, 200);

    const out = await client.post('/api/auth/logout');
    assert.equal(out.status, 204);
    assert.equal((await client.get('/api/users/me')).status, 401);
    assert.equal((await client.get('/api/auth/me')).body.user, null);
  });

  it('même message d’erreur pour un e-mail inconnu (pas d’énumération à la connexion)', async () => {
    const client = await createClient(app);
    const res = await client.post('/api/auth/login', { email: 'inconnu@exemple.fr', password: 'Quelconque1' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Adresse e-mail ou mot de passe incorrect.');
  });

  it('bloque la force brute après 10 tentatives', async () => {
    const client = await createClient(app);
    const email = 'cible-force-brute@exemple.fr';
    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await client.post('/api/auth/login', { email, password: `Essai${i}abc` });
    }
    assert.equal(last.status, 429);
  });

  it('refuse un cookie de session forgé', async () => {
    const res = await request(app).get('/api/users/me').set('Cookie', 'tr_session=forge');
    assert.equal(res.status, 401);
  });
});

describe('Profil', () => {
  let client;
  let account;
  before(async () => {
    client = await createClient(app);
    account = (await registerUser(client)).body;
  });

  it('met à jour le profil', async () => {
    const res = await client.put('/api/users/me', {
      fullName: 'Nouveau Nom',
      email: account.email,
      phone: '+216 71 000 000',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.fullName, 'Nouveau Nom');
    assert.equal(res.body.user.phone, '+216 71 000 000');
  });

  it('refuse de prendre l’e-mail d’un autre compte', async () => {
    const other = await createClient(app);
    const { body } = await registerUser(other);
    const res = await client.put('/api/users/me', { fullName: 'X Y', email: body.email });
    assert.equal(res.status, 409);
  });

  it('change le mot de passe après vérification de l’actuel', async () => {
    const wrong = await client.put('/api/users/me/password', {
      currentPassword: 'Faux12345',
      newPassword: 'NouveauMdp456',
      confirmPassword: 'NouveauMdp456',
    });
    assert.equal(wrong.status, 400);

    const ok = await client.put('/api/users/me/password', {
      currentPassword: account.password,
      newPassword: 'NouveauMdp456',
      confirmPassword: 'NouveauMdp456',
    });
    assert.equal(ok.status, 200);

    const fresh = await createClient(app);
    const login = await fresh.post('/api/auth/login', { email: account.email, password: 'NouveauMdp456' });
    assert.equal(login.status, 200);
  });
});

describe('Destinations', () => {
  it('liste les destinations', async () => {
    const res = await request(app).get('/api/destinations');
    assert.equal(res.status, 200);
    assert.equal(res.body.destinations.length, 10);
  });

  it('filtre par pays, type et budget', async () => {
    const byCountry = await request(app).get('/api/destinations').query({ country: 'Tunisie' });
    assert.deepEqual(byCountry.body.destinations.map((d) => d.slug), ['djerba']);

    const byType = await request(app).get('/api/destinations').query({ type: 'Plage' });
    assert.ok(byType.body.destinations.every((d) => d.travelType === 'Plage'));

    const eco = await request(app).get('/api/destinations').query({ budget: 'economique' });
    assert.ok(eco.body.destinations.length > 0);
    assert.ok(eco.body.destinations.every((d) => d.priceFrom < 800));
  });

  it('recherche par texte et neutralise les jokers SQL', async () => {
    const res = await request(app).get('/api/destinations').query({ q: 'japon' });
    assert.deepEqual(res.body.destinations.map((d) => d.slug), ['kyoto']);
    const inj = await request(app).get('/api/destinations').query({ q: "%' OR 1=1 --" });
    assert.equal(inj.status, 200);
    assert.equal(inj.body.destinations.length, 0);
  });

  it('trie par prix croissant', async () => {
    const res = await request(app).get('/api/destinations').query({ sort: 'prix-asc' });
    const prices = res.body.destinations.map((d) => d.priceFrom);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  });

  it('refuse un tri non autorisé', async () => {
    const res = await request(app).get('/api/destinations').query({ sort: 'name; DROP TABLE users' });
    assert.equal(res.status, 400);
  });

  it('renvoie le détail avec activités et départs futurs', async () => {
    const res = await request(app).get('/api/destinations/kyoto');
    assert.equal(res.status, 200);
    assert.equal(res.body.destination.activities.length, 3);
    assert.ok(res.body.destination.trips.length > 0);
  });

  it('renvoie 404 pour une destination inconnue', async () => {
    const res = await request(app).get('/api/destinations/atlantide');
    assert.equal(res.status, 404);
  });

  it('expose les filtres disponibles', async () => {
    const res = await request(app).get('/api/destinations/filters');
    assert.ok(res.body.countries.includes('Japon'));
    assert.equal(res.body.budgets.length, 3);
  });
});

describe('Réservations', () => {
  let alice;
  let bob;
  let trip;

  before(async () => {
    alice = await createClient(app);
    await registerUser(alice);
    bob = await createClient(app);
    await registerUser(bob);
    trip = (await request(app).get('/api/destinations/paris')).body.destination.trips[0];
  });

  it('exige d’être connecté', async () => {
    const anon = await createClient(app);
    assert.equal((await anon.get('/api/reservations')).status, 401);
    assert.equal((await anon.post('/api/reservations', { tripId: trip.id, travelers: 1 })).status, 401);
  });

  it('crée une réservation en attente et non payée, et décrémente les places', async () => {
    const res = await alice.post('/api/reservations', { tripId: trip.id, travelers: 2, notes: 'Chambre calme' });
    assert.equal(res.status, 201);
    assert.equal(res.body.reservation.status, 'en_attente');
    assert.equal(res.body.reservation.paymentStatus, 'non_payee');
    assert.equal(res.body.reservation.totalPrice, trip.price * 2);
    const after = db.prepare('SELECT seats_available FROM trips WHERE id = ?').get(trip.id);
    assert.equal(after.seats_available, trip.seatsAvailable - 2);
  });

  it('empêche une double réservation active sur le même départ', async () => {
    const res = await alice.post('/api/reservations', { tripId: trip.id, travelers: 1 });
    assert.equal(res.status, 409);
  });

  it('refuse plus de voyageurs que de places restantes', async () => {
    const small = db.prepare('SELECT * FROM trips WHERE seats_total < 15 LIMIT 1').get();
    db.prepare('UPDATE trips SET seats_available = 1 WHERE id = ?').run(small.id);
    const res = await bob.post('/api/reservations', { tripId: small.id, travelers: 3 });
    assert.equal(res.status, 409);
    db.prepare('UPDATE trips SET seats_available = seats_total WHERE id = ?').run(small.id);
  });

  it('refuse un départ trop proche', async () => {
    const soon = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO trips (destination_id, title, departure_date, return_date, price, seats_total, seats_available) VALUES (1, ?, ?, ?, 100, 5, 5)')
      .run('Départ imminent', soon, soon);
    const res = await bob.post('/api/reservations', { tripId: Number(lastInsertRowid), travelers: 1 });
    assert.equal(res.status, 422);
  });

  it('isole les réservations entre utilisateurs (pas d’IDOR)', async () => {
    const mine = (await alice.get('/api/reservations')).body.reservations;
    assert.equal(mine.length, 1);
    const id = mine[0].id;

    assert.equal((await bob.get('/api/reservations')).body.reservations.length, 0);
    assert.equal((await bob.get(`/api/reservations/${id}`)).status, 404);
    assert.equal((await bob.patch(`/api/reservations/${id}`, { travelers: 5 })).status, 404);
    assert.equal((await bob.post(`/api/reservations/${id}/cancel`)).status, 404);
  });

  it('modifie le nombre de voyageurs et recalcule le prix', async () => {
    const [r] = (await alice.get('/api/reservations')).body.reservations;
    const res = await alice.patch(`/api/reservations/${r.id}`, { travelers: 3, notes: '' });
    assert.equal(res.status, 200);
    assert.equal(res.body.reservation.travelers, 3);
    assert.equal(res.body.reservation.totalPrice, trip.price * 3);
    assert.equal(res.body.reservation.notes, null);
  });

  it('annule une réservation et libère les places', async () => {
    const [r] = (await alice.get('/api/reservations')).body.reservations;
    const before = db.prepare('SELECT seats_available FROM trips WHERE id = ?').get(trip.id).seats_available;
    const res = await alice.post(`/api/reservations/${r.id}/cancel`);
    assert.equal(res.status, 200);
    assert.equal(res.body.reservation.status, 'annulee');
    assert.equal(res.body.reservation.canCancel, false);
    const after = db.prepare('SELECT seats_available FROM trips WHERE id = ?').get(trip.id).seats_available;
    assert.equal(after, before + 3);

    assert.equal((await alice.post(`/api/reservations/${r.id}/cancel`)).status, 409);
    assert.equal((await alice.patch(`/api/reservations/${r.id}`, { travelers: 1 })).status, 422);
  });

  it('refuse l’annulation à moins de 48 h du départ', async () => {
    const r = (await bob.post('/api/reservations', { tripId: trip.id, travelers: 1 })).body.reservation;
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    db.prepare('UPDATE trips SET departure_date = ? WHERE id = ?').run(tomorrow, trip.id);
    const res = await bob.post(`/api/reservations/${r.id}/cancel`);
    assert.equal(res.status, 422);
    db.prepare('UPDATE trips SET departure_date = ? WHERE id = ?').run(trip.departureDate, trip.id);
  });

  it('valide les données de réservation', async () => {
    const res = await bob.post('/api/reservations', { tripId: 'abc', travelers: 20 });
    assert.equal(res.status, 400);
    assert.equal(res.body.fields.travelers, 'Maximum 9 voyageurs par réservation.');
  });
});

describe('Contact', () => {
  it('enregistre un message valide', async () => {
    const client = await createClient(app);
    const res = await client.post('/api/contact', {
      name: 'Sami Ben Ali',
      email: 'sami@exemple.fr',
      subject: 'Question sur Djerba',
      message: 'Bonjour, proposez-vous des départs en juillet ?',
    });
    assert.equal(res.status, 201);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM contact_messages').get().n, 1);
  });

  it('refuse un message invalide', async () => {
    const client = await createClient(app);
    const res = await client.post('/api/contact', { name: 'S', email: 'x', subject: '', message: 'court' });
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.message);
  });
});
