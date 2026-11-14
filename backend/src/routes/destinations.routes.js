import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { notFound } from '../utils/http-error.js';
import { destinationQuerySchema } from '../validation/schemas.js';

export const BUDGETS = [
  { value: 'economique', label: 'Économique (moins de 800 €)', min: 0, max: 799 },
  { value: 'modere', label: 'Modéré (800 € à 1 500 €)', min: 800, max: 1500 },
  { value: 'premium', label: 'Premium (plus de 1 500 €)', min: 1501, max: Number.MAX_SAFE_INTEGER },
];

const SORTS = {
  populaire: 'featured DESC, rating DESC, name ASC',
  'prix-asc': 'price_from ASC, name ASC',
  'prix-desc': 'price_from DESC, name ASC',
  note: 'rating DESC, name ASC',
  nom: 'name ASC',
};

const escapeLike = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export function toDestination(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    country: row.country,
    travelType: row.travel_type,
    shortDescription: row.short_description,
    description: row.description,
    priceFrom: row.price_from,
    durationDays: row.duration_days,
    rating: row.rating,
    featured: row.featured === 1,
    imageUrl: row.image_url,
    gallery: JSON.parse(row.gallery),
    highlights: JSON.parse(row.highlights),
  };
}

export function destinationRoutes(db) {
  const router = Router();

  router.get('/', validate(destinationQuerySchema, 'query'), (req, res) => {
    const { q, country, type, budget, sort = 'populaire', featured } = req.valid.query;
    const where = [];
    const params = [];

    if (q) {
      const like = `%${escapeLike(q)}%`;
      where.push(
        "(name LIKE ? ESCAPE '\\' OR country LIKE ? ESCAPE '\\' OR short_description LIKE ? ESCAPE '\\' OR travel_type LIKE ? ESCAPE '\\')",
      );
      params.push(like, like, like, like);
    }
    if (country) {
      where.push('country = ?');
      params.push(country);
    }
    if (type) {
      where.push('travel_type = ?');
      params.push(type);
    }
    if (budget) {
      const range = BUDGETS.find((b) => b.value === budget);
      where.push('price_from BETWEEN ? AND ?');
      params.push(range.min, range.max);
    }
    if (featured === 'true') where.push('featured = 1');

    // L'ordre de tri provient d'une liste blanche : aucune donnée utilisateur dans la requête.
    const sql = `SELECT * FROM destinations ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${SORTS[sort]}`;
    res.json({ destinations: db.prepare(sql).all(...params).map(toDestination) });
  });

  router.get('/filters', (_req, res) => {
    // Tri alphabétique français (« États-Unis » avant « France »).
    const collator = new Intl.Collator('fr', { sensitivity: 'base' });
    const countries = db
      .prepare('SELECT DISTINCT country FROM destinations')
      .all()
      .map((r) => r.country)
      .sort(collator.compare);
    const types = db
      .prepare('SELECT DISTINCT travel_type FROM destinations ORDER BY travel_type')
      .all()
      .map((r) => r.travel_type);
    res.json({ countries, types, budgets: BUDGETS.map(({ value, label }) => ({ value, label })) });
  });

  router.get('/:slug', (req, res) => {
    const row = db.prepare('SELECT * FROM destinations WHERE slug = ?').get(String(req.params.slug));
    if (!row) throw notFound('Cette destination n’existe pas.');

    const activities = db
      .prepare('SELECT id, name, description, duration, included FROM activities WHERE destination_id = ? ORDER BY id')
      .all(row.id)
      .map((a) => ({ ...a, included: a.included === 1 }));

    const today = new Date().toISOString().slice(0, 10);
    const trips = db
      .prepare(
        `SELECT id, title, departure_date, return_date, price, seats_total, seats_available
         FROM trips WHERE destination_id = ? AND departure_date > ? ORDER BY departure_date`,
      )
      .all(row.id, today)
      .map((t) => ({
        id: t.id,
        title: t.title,
        departureDate: t.departure_date,
        returnDate: t.return_date,
        price: t.price,
        seatsTotal: t.seats_total,
        seatsAvailable: t.seats_available,
      }));

    res.json({ destination: { ...toDestination(row), activities, trips } });
  });

  return router;
}
