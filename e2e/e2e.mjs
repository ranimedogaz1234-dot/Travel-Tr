// Test de bout en bout de Travel TR dans Chrome headless.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SHOTS = process.env.SHOTS_DIR ?? new URL('./captures/', import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
let step = '';

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

page.on('console', (msg) => {
  // Les photos Unsplash ne sont pas joignables depuis cet environnement isolé (repli affiché).
  if (msg.type() === 'error' && !(msg.location()?.url ?? '').includes('images.unsplash.com')) {
    consoleErrors.push(`[${step}] ${msg.text()} ${msg.location()?.url ?? ''}`);
  }
});
page.on('pageerror', (err) => consoleErrors.push(`[${step}] PAGEERROR ${err.message}`));
page.on('requestfailed', (req) => {
  const url = req.url();
  // ERR_ABORTED : requête interrompue par une navigation volontaire du test.
  if (!url.includes('images.unsplash.com') && req.failure()?.errorText !== 'net::ERR_ABORTED') consoleErrors.push(`[${step}] REQFAIL ${url} ${req.failure()?.errorText}`);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (sel) => page.$eval(sel, (el) => el.textContent.trim());
const texts = (sel) => page.$$eval(sel, (els) => els.map((e) => e.textContent.trim()));
const path = () => new URL(page.url()).pathname + new URL(page.url()).search;

async function check(name, fn) {
  step = name;
  try {
    await fn();
    results.push(['OK', name]);
  } catch (err) {
    results.push(['ÉCHEC', `${name} — ${err.message}`]);
    await page.screenshot({ path: `${SHOTS}/FAIL-${results.length}.png` }).catch(() => {});
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function waitText(sel, expected, timeout = 5000) {
  await page.waitForFunction(
    (s, e) => [...document.querySelectorAll(s)].some((el) => el.textContent.includes(e)),
    { timeout },
    sel,
    expected,
  );
}
async function goto(url) {
  await page.goto(BASE + url, { waitUntil: 'networkidle0' });
}
async function revealAll() {
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')));
  await sleep(700);
}
async function shot(name, fullPage = true) {
  await revealAll();
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
}
async function clickByText(sel, label) {
  const handles = await page.$$(sel);
  for (const h of handles) {
    const t = await h.evaluate((el) => el.textContent.trim());
    if (t.includes(label)) {
      await h.click();
      return;
    }
  }
  throw new Error(`Élément « ${label} » introuvable (${sel})`);
}
async function type(sel, value) {
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(sel, value);
}

const email = `e2e-${Date.now()}@exemple.fr`;
const password = 'Voyage2026ok';

// ---------- Pages publiques ----------
await check('Accueil : chargement, titre et destinations à la une', async () => {
  await goto('/');
  assert((await page.title()).includes('Travel TR'), 'titre');
  await page.waitForSelector('app-destination-card');
  const cards = await page.$$('app-destination-card');
  assert(cards.length === 6, `6 cartes attendues, ${cards.length}`);
  assert((await text('h1')).includes('Explorez le monde'), 'h1');
  await shot('01-accueil');
});

await check('Navigation principale : chaque lien ouvre la bonne page', async () => {
  const expected = [
    ['Destinations', '/destinations', 'Nos destinations'],
    ['À propos', '/a-propos', 'À propos de Travel TR'],
    ['Contact', '/contact', 'Contactez-nous'],
    ['Accueil', '/', 'Explorez le monde'],
  ];
  for (const [label, url, h1] of expected) {
    await clickByText('nav.nav ul a', label);
    await page.waitForFunction((u) => location.pathname === u, {}, url);
    await waitText('h1', h1);
  }
});

await check('Lien « Réservations » non connecté → redirection vers Connexion', async () => {
  await clickByText('nav.nav ul a', 'Réservations');
  await page.waitForFunction(() => location.pathname === '/connexion');
  assert(path().includes('returnUrl=%2Freservations'), path());
  await waitText('.alert--info', 'Veuillez vous connecter');
});

await check('Recherche depuis l’accueil (« japon » → Kyoto)', async () => {
  await goto('/');
  await page.type('#hero-q', 'japon');
  await page.click('form.search button[type=submit]');
  await page.waitForFunction(() => location.search.includes('q=japon'));
  await page.waitForSelector('app-destination-card');
  const names = await texts('app-destination-card h3');
  assert(names.length === 1 && names[0] === 'Kyoto', JSON.stringify(names));
});

await check('Filtres destinations : pays, budget, type, tri, réinitialisation', async () => {
  await goto('/destinations');
  await page.waitForSelector('app-destination-card');
  assert((await page.$$('app-destination-card')).length === 10, '10 destinations');
  await page.select('#f-country', 'Tunisie');
  await page.waitForFunction(() => location.search.includes('country=Tunisie'));
  await page.waitForFunction(() => document.querySelectorAll('app-destination-card').length === 1);
  assert((await texts('app-destination-card h3'))[0] === 'Djerba', 'Djerba');
  await page.click('.link-btn'); // Réinitialiser
  await page.waitForFunction(() => document.querySelectorAll('app-destination-card').length === 10);
  await clickByText('label.radio', 'Premium');
  await page.waitForFunction(() => location.search.includes('budget=premium'));
  await sleep(400);
  const prices = await page.$$eval('app-destination-card .price strong', (els) =>
    els.map((e) => Number(e.textContent.replace(/[^\d]/g, ''))),
  );
  assert(prices.length > 0 && prices.every((p) => p > 1500), JSON.stringify(prices));
  await page.select('#f-sort', 'prix-asc');
  await page.waitForFunction(() => location.search.includes('sort=prix-asc'));
  await sleep(400);
  const sorted = await page.$$eval('app-destination-card .price strong', (els) =>
    els.map((e) => Number(e.textContent.replace(/[^\d]/g, ''))),
  );
  assert(JSON.stringify(sorted) === JSON.stringify([...sorted].sort((a, b) => a - b)), 'tri');
  await page.select('#f-type', 'Aventure');
  await page.waitForFunction(() => location.search.includes('type=Aventure'));
  await sleep(300);
  // Rafraîchissement : les filtres sont conservés dans l'URL
  await page.reload({ waitUntil: 'networkidle0' });
  assert((await page.$eval('#f-type', (e) => e.value)) === 'Aventure', 'filtre conservé après rafraîchissement');
  await page.click('.link-btn');
  await page.waitForFunction(() => document.querySelectorAll('app-destination-card').length === 10);
  await shot('02-destinations');
});

await check('Recherche sans résultat : état vide + réinitialisation', async () => {
  await goto('/destinations?q=zzzzz');
  await waitText('app-empty-state h3', 'Aucune destination');
  await clickByText('app-empty-state button', 'Réinitialiser');
  await page.waitForFunction(() => document.querySelectorAll('app-destination-card').length === 10);
});

await check('Carte destination → page de détails (photos, activités, départs)', async () => {
  await goto('/destinations');
  await page.waitForSelector('app-destination-card');
  await page.click('a[href="/destinations/kyoto"]');
  await page.waitForFunction(() => location.pathname === '/destinations/kyoto');
  await waitText('h1', 'Kyoto');
  assert((await page.$$('.activity')).length === 3, 'activités');
  assert((await page.$$('.trip')).length >= 1, 'départs');
  assert((await page.title()).includes('Kyoto'), 'titre dynamique');
  await shot('03-detail');
});

await check('Galerie : changement de photo', async () => {
  await goto('/destinations/paris');
  await page.waitForSelector('.thumb');
  const thumbs = await page.$$('.thumb');
  await thumbs[1].click();
  await page.waitForFunction(() => document.querySelectorAll('.thumb')[1].classList.contains('active'));
});

await check('Destination inconnue → message « introuvable »', async () => {
  await goto('/destinations/atlantide');
  await waitText('h1', 'Destination introuvable');
});

await check('Page 404 pour une URL invalide (accès direct)', async () => {
  await goto('/cette-page-nexiste-pas');
  await waitText('h1', 'perdue en chemin');
  await shot('10-404', false);
});

// ---------- Inscription ----------
let tripId;
await check('« Réserver » sans compte → connexion, puis lien vers inscription', async () => {
  await goto('/destinations/kyoto');
  await page.waitForSelector('.trip a.btn');
  tripId = await page.$eval('.trip a.btn', (a) => new URL(a.href).searchParams.get('depart'));
  await page.click('.trip a.btn');
  await page.waitForFunction(() => location.pathname === '/connexion');
  await clickByText('.switch a', 'S’inscrire');
  await page.waitForFunction(() => location.pathname === '/inscription');
  assert(path().includes('returnUrl='), 'returnUrl conservé');
});

await check('Inscription : validation des champs en français', async () => {
  await page.click('form button[type=submit]');
  await waitText('.field-error', 'Ce champ est obligatoire.');
  await page.type('#reg-email', 'pas-un-email');
  await page.type('#reg-password', 'court');
  await page.type('#reg-confirm', 'autre');
  await page.click('#reg-name');
  await sleep(200);
  const errors = await texts('.field-error');
  assert(errors.includes('Le format de l’adresse e-mail est invalide.'), JSON.stringify(errors));
  assert(errors.includes('Le mot de passe doit contenir au moins 8 caractères.'), JSON.stringify(errors));
  assert(errors.includes('Les mots de passe ne correspondent pas.'), JSON.stringify(errors));
  await shot('05-inscription-erreurs', false);
});

await check('Inscription réussie → retour vers la réservation pré-remplie', async () => {
  await type('#reg-name', 'Amira Ben Salah');
  await type('#reg-email', email);
  await type('#reg-password', password);
  await type('#reg-confirm', password);
  await page.click('form button[type=submit]');
  await page.waitForFunction(() => location.pathname === '/reservations', { timeout: 10000 });
  await waitText('.toast', 'Bienvenue chez Travel TR');
  await page.waitForSelector('.trip.selected');
  assert((await page.$eval('#b-destination', (e) => e.value)) === 'kyoto', 'destination pré-remplie');
  const checked = await page.$eval('.trip.selected input', (e) => e.value);
  assert(checked === tripId, `départ pré-sélectionné ${checked} vs ${tripId}`);
  assert((await text('.user-name')) === 'Amira', 'nom dans l’en-tête');
});

// ---------- Réservation ----------
let reservationId;
await check('Réservation : 2 voyageurs, total, statut en attente / non payée', async () => {
  await page.select('#b-travelers', '1: 2');
  await page.type('#b-notes', 'Chambre au calme, merci.');
  const total = await text('.summary .total dd');
  assert(total.replace(/\s/g, '').length > 0, 'total');
  await shot('06-reservation');
  await page.click('form.booking-form button[type=submit]');
  await page.waitForFunction(() => location.pathname === '/mes-reservations', { timeout: 10000 });
  reservationId = new URL(page.url()).searchParams.get('nouvelle');
  await page.waitForSelector('.res.is-new');
  const badges = await texts('.res.is-new .badge');
  assert(badges.some((b) => b.includes('En attente')), JSON.stringify(badges));
  assert(badges.some((b) => b.includes('Non payée')), JSON.stringify(badges));
  assert((await text('.res.is-new .res-facts')).includes('2 voyageurs'), 'voyageurs');
});

await check('Double réservation du même départ refusée', async () => {
  await goto(`/reservations?destination=kyoto&depart=${tripId}`);
  await page.waitForSelector('.trip.selected');
  await page.click('form.booking-form button[type=submit]');
  await waitText('.alert--error', 'déjà une réservation');
});

await check('Modifier une réservation (3 voyageurs)', async () => {
  await goto('/mes-reservations');
  await page.waitForSelector('.res');
  await clickByText('.res-actions button', 'Modifier');
  await page.waitForSelector('dialog[open] #e-travelers');
  await page.select('#e-travelers', '2: 3');
  await clickByText('dialog[open] .actions button', 'Enregistrer');
  await waitText('.toast', 'modifiée');
  assert((await text('.res .res-facts')).includes('3 voyageurs'), 'mise à jour');
  await shot('07-mes-reservations');
});

await check('Rafraîchissement : la session et les données persistent', async () => {
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.res');
  assert(path().startsWith('/mes-reservations'), path());
  assert((await text('.user-name')) === 'Amira', 'toujours connecté');
});

await check('Annuler une réservation (boîte de confirmation)', async () => {
  await clickByText('.res-actions button', 'Annuler');
  await page.waitForSelector('dialog[open]');
  await clickByText('dialog[open] .actions button', 'Conserver');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await clickByText('.res-actions button', 'Annuler');
  await page.waitForSelector('dialog[open]');
  await clickByText('dialog[open] .actions button', 'Oui, annuler');
  await waitText('.toast', 'annulée');
  await waitText('.res .badge', 'Annulée');
  await clickByText('.tabs button', 'Annulées');
  assert((await page.$$('.res')).length === 1, 'onglet annulées');
});

// ---------- Profil ----------
await check('Profil : accès direct, modification du téléphone', async () => {
  await goto('/profil');
  await waitText('h1', 'Mon profil');
  assert((await page.$eval('#p-email', (e) => e.value)) === email, 'e-mail');
  await type('#p-phone', '+216 71 123 456');
  await page.click('form:first-of-type button[type=submit]');
  await waitText('.toast', 'mises à jour');
  await page.reload({ waitUntil: 'networkidle0' });
  assert((await page.$eval('#p-phone', (e) => e.value)) === '+216 71 123 456', 'téléphone enregistré');
  await shot('08-profil', false);
});

await check('Profil : mot de passe actuel incorrect refusé', async () => {
  await page.type('#p-current', 'Mauvais123');
  await page.type('#p-new', 'Nouveau2026ok');
  await page.type('#p-confirm', 'Nouveau2026ok');
  await clickByText('button[type=submit]', 'Modifier le mot de passe');
  await waitText('.alert--error', 'Le mot de passe actuel est incorrect.');
});

// ---------- Contact ----------
await check('Contact : validation puis envoi réussi', async () => {
  await goto('/contact');
  assert((await page.$eval('#c-email', (e) => e.value)) === email, 'pré-rempli');
  await page.click('form button[type=submit]');
  await waitText('.field-error', 'Ce champ est obligatoire.');
  await page.select('#c-subject', 'Question sur une destination');
  await page.type('#c-message', 'Bonjour, proposez-vous des départs pour Kyoto en avril ?');
  await page.click('form button[type=submit]');
  await waitText('.alert--success', 'bien été enregistré');
  await shot('09-contact', false);
});

// ---------- Déconnexion / connexion ----------
await check('Déconnexion via le menu utilisateur', async () => {
  await page.click('.user-button');
  await page.waitForSelector('.dropdown');
  await clickByText('.dropdown button', 'Se déconnecter');
  await waitText('.toast', 'déconnecté');
  await page.waitForFunction(() => location.pathname === '/');
  await page.waitForSelector('a[href="/connexion"]');
});

await check('Pages privées protégées après déconnexion (accès direct)', async () => {
  for (const url of ['/mes-reservations', '/profil', '/reservations']) {
    await goto(url);
    await page.waitForFunction(() => location.pathname === '/connexion');
  }
});

await check('Connexion : mauvais mot de passe puis succès avec retour à la page demandée', async () => {
  await goto('/profil');
  await page.waitForFunction(() => location.pathname === '/connexion');
  await page.type('#login-email', email);
  await page.type('#login-password', 'Mauvais999');
  await page.click('form button[type=submit]');
  await waitText('.alert--error', 'Adresse e-mail ou mot de passe incorrect.');
  await shot('04-connexion', false);
  await page.type('#login-password', password);
  await page.click('form button[type=submit]');
  await page.waitForFunction(() => location.pathname === '/profil', { timeout: 10000 });
});

await check('Pages Connexion/Inscription inaccessibles une fois connecté', async () => {
  await goto('/connexion');
  await page.waitForFunction(() => location.pathname === '/mes-reservations');
});

await check('Inscription avec un e-mail existant refusée', async () => {
  const ctx = await browser.createBrowserContext();
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/inscription', { waitUntil: 'networkidle0' });
  await p2.type('#reg-name', 'Autre Personne');
  await p2.type('#reg-email', email.toUpperCase());
  await p2.type('#reg-password', password);
  await p2.type('#reg-confirm', password);
  await p2.click('form button[type=submit]');
  await p2.waitForFunction(() => document.body.textContent.includes('Un compte existe déjà'), { timeout: 8000 });
  await ctx.close();
});

await check('Isolation : un autre utilisateur ne voit pas ces réservations', async () => {
  const ctx = await browser.createBrowserContext();
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/inscription', { waitUntil: 'networkidle0' });
  await p2.type('#reg-name', 'Karim Test');
  await p2.type('#reg-email', `autre-${Date.now()}@exemple.fr`);
  await p2.type('#reg-password', password);
  await p2.type('#reg-confirm', password);
  await p2.click('form button[type=submit]');
  await p2.waitForFunction(() => location.pathname === '/destinations', { timeout: 10000 });
  const status = await p2.evaluate(async (id) => (await fetch(`/api/reservations/${id}`)).status, reservationId);
  assert(status === 404, `statut ${status}`);
  await p2.goto(BASE + '/mes-reservations', { waitUntil: 'networkidle0' });
  await p2.waitForFunction(() => document.body.textContent.includes('aucune réservation'));
  await ctx.close();
});

// ---------- Responsive ----------
await check('Mobile (390 px) : menu burger et navigation', async () => {
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await goto('/');
  await page.waitForSelector('app-destination-card');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!overflow, 'pas de défilement horizontal');
  await shot('11-mobile-accueil', false);
  await page.click('.burger');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.nav')).visibility === 'visible');
  await sleep(300);
  await page.screenshot({ path: `${SHOTS}/12-mobile-menu.png` });
  await clickByText('nav.nav ul a', 'Destinations');
  await page.waitForFunction(() => location.pathname === '/destinations');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.nav')).visibility === 'hidden');
  await clickByText('.filters-toggle', 'Afficher les filtres');
  await page.waitForSelector('.filters.is-open');
});

await check('Tablette (820 px) et mobile : aucune page ne déborde horizontalement', async () => {
  for (const width of [820, 390]) {
    await page.setViewport({ width, height: 1000 });
    for (const url of ['/', '/destinations', '/destinations/bali', '/mes-reservations', '/reservations', '/profil', '/a-propos', '/contact', '/nope']) {
      await goto(url);
      await sleep(300);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 0, `${url} déborde de ${over}px à ${width}px`);
    }
  }
  await page.setViewport({ width: 1440, height: 900 });
});

await check('Page À propos (capture)', async () => {
  await goto('/a-propos');
  await shot('13-a-propos');
});

await browser.close();

console.log('\n===== RÉSULTATS E2E =====');
for (const [s, n] of results) console.log(`${s.padEnd(6)} ${n}`);
const failed = results.filter(([s]) => s !== 'OK').length;
console.log(`\n${results.length - failed}/${results.length} scénarios réussis`);
console.log(`\nErreurs console (hors images Unsplash bloquées dans cet environnement) : ${consoleErrors.length}`);
for (const e of consoleErrors) console.log('  ' + e);
process.exit(failed ? 1 : 0);
