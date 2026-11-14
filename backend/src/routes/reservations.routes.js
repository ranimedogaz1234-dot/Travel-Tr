import { Router } from 'express';
import { transaction } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { conflict, notFound, unprocessable } from '../utils/http-error.js';
import { createReservationSchema, idParamSchema, updateReservationSchema } from '../validation/schemas.js';

/** Règles de réservation (affichées aussi dans l'interface). */
export const BOOKING_RULES = Object.freeze({
  /** Réservation possible jusqu'à N jours avant le départ. */
  minDaysBeforeBooking: 3,
  /** Modification possible jusqu'à N jours avant le départ. */
  minDaysBeforeModification: 7,
  /** Annulation possible jusqu'à N heures avant le départ. */
  minHoursBeforeCancellation: 48,
});

const HOUR = 3600 * 1000;
const hoursUntil = (date) => (Date.parse(`${date}T00:00:00Z`) - Date.now()) / HOUR;

const SELECT_RESERVATION = `
  SELECT r.*, t.title AS trip_title, t.departure_date, t.return_date, t.price AS trip_price,
         d.slug AS destination_slug, d.name AS destination_name, d.country AS destination_country,
         d.image_url AS destination_image
  FROM reservations r
  JOIN trips t ON t.id = r.trip_id
  JOIN destinations d ON d.id = t.destination_id`;

function toReservation(row) {
  const hours = hoursUntil(row.departure_date);
  const active = row.status === 'en_attente';
  return {
    id: row.id,
    status: row.status,
    paymentStatus: row.payment_status,
    travelers: row.travelers,
    totalPrice: row.total_price,
    notes: row.notes,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    canModify: active && hours >= BOOKING_RULES.minDaysBeforeModification * 24,
    canCancel: active && hours >= BOOKING_RULES.minHoursBeforeCancellation,
    trip: {
      id: row.trip_id,
      title: row.trip_title,
      departureDate: row.departure_date,
      returnDate: row.return_date,
      price: row.trip_price,
    },
    destination: {
      slug: row.destination_slug,
      name: row.destination_name,
      country: row.destination_country,
      imageUrl: row.destination_image,
    },
  };
}

export function reservationRoutes(db) {
  const router = Router();
  router.use(requireAuth);

  const listForUser = db.prepare(`${SELECT_RESERVATION} WHERE r.user_id = ? ORDER BY t.departure_date ASC, r.id DESC`);
  // Toujours filtrer par user_id : un utilisateur ne peut jamais lire la réservation d'un autre (IDOR).
  const findForUser = db.prepare(`${SELECT_RESERVATION} WHERE r.id = ? AND r.user_id = ?`);
  const findTrip = db.prepare('SELECT * FROM trips WHERE id = ?');
  const activeForTrip = db.prepare(
    "SELECT id FROM reservations WHERE user_id = ? AND trip_id = ? AND status = 'en_attente'",
  );
  const insertReservation = db.prepare(
    'INSERT INTO reservations (user_id, trip_id, travelers, total_price, notes) VALUES (?, ?, ?, ?, ?)',
  );
  const takeSeats = db.prepare(
    'UPDATE trips SET seats_available = seats_available - ? WHERE id = ? AND seats_available >= ?',
  );
  const releaseSeats = db.prepare(
    'UPDATE trips SET seats_available = MIN(seats_total, seats_available + ?) WHERE id = ?',
  );
  const updateReservation = db.prepare(`
    UPDATE reservations SET travelers = ?, total_price = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ? AND user_id = ?`);
  const cancelReservation = db.prepare(`
    UPDATE reservations SET status = 'annulee', cancelled_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ? AND user_id = ? AND status = 'en_attente'`);

  const loadOwn = (id, userId) => {
    const row = findForUser.get(id, userId);
    if (!row) throw notFound('Réservation introuvable.');
    return row;
  };

  router.get('/rules', (_req, res) => res.json({ rules: BOOKING_RULES }));

  router.get('/', (req, res) => {
    res.json({ reservations: listForUser.all(req.user.id).map(toReservation) });
  });

  router.get('/:id', validate(idParamSchema, 'params'), (req, res) => {
    res.json({ reservation: toReservation(loadOwn(req.valid.params.id, req.user.id)) });
  });

  router.post('/', validate(createReservationSchema), (req, res) => {
    const { tripId, travelers, notes } = req.valid.body;
    const userId = req.user.id;

    const id = transaction(db, () => {
      const trip = findTrip.get(tripId);
      if (!trip) throw notFound('Ce départ n’existe pas.');
      if (hoursUntil(trip.departure_date) < BOOKING_RULES.minDaysBeforeBooking * 24) {
        throw unprocessable(
          `Les réservations ferment ${BOOKING_RULES.minDaysBeforeBooking} jours avant le départ.`,
        );
      }
      if (activeForTrip.get(userId, tripId)) {
        throw conflict('Vous avez déjà une réservation en cours pour ce départ. Vous pouvez la modifier depuis « Mes réservations ».');
      }
      if (takeSeats.run(travelers, tripId, travelers).changes === 0) {
        throw conflict(
          trip.seats_available === 0
            ? 'Ce départ est complet.'
            : `Il ne reste que ${trip.seats_available} place(s) pour ce départ.`,
        );
      }
      return insertReservation.run(userId, tripId, travelers, trip.price * travelers, notes ?? null).lastInsertRowid;
    });

    res.status(201).json({ reservation: toReservation(findForUser.get(id, userId)) });
  });

  router.patch('/:id', validate(idParamSchema, 'params'), validate(updateReservationSchema), (req, res) => {
    const { id } = req.valid.params;
    const { travelers, notes } = req.valid.body;
    const userId = req.user.id;

    transaction(db, () => {
      const current = toReservation(loadOwn(id, userId));
      if (!current.canModify) {
        throw unprocessable(
          current.status === 'annulee'
            ? 'Une réservation annulée ne peut pas être modifiée.'
            : `Les modifications sont possibles jusqu’à ${BOOKING_RULES.minDaysBeforeModification} jours avant le départ.`,
        );
      }
      const delta = travelers - current.travelers;
      if (delta > 0 && takeSeats.run(delta, current.trip.id, delta).changes === 0) {
        throw conflict('Il n’y a pas assez de places disponibles pour ajouter ces voyageurs.');
      }
      if (delta < 0) releaseSeats.run(-delta, current.trip.id);
      updateReservation.run(travelers, current.trip.price * travelers, notes ?? null, id, userId);
    });

    res.json({ reservation: toReservation(findForUser.get(id, userId)) });
  });

  router.post('/:id/cancel', validate(idParamSchema, 'params'), (req, res) => {
    const { id } = req.valid.params;
    const userId = req.user.id;

    transaction(db, () => {
      const current = toReservation(loadOwn(id, userId));
      if (current.status === 'annulee') throw conflict('Cette réservation est déjà annulée.');
      if (!current.canCancel) {
        throw unprocessable(
          `L’annulation en ligne est possible jusqu’à ${BOOKING_RULES.minHoursBeforeCancellation} heures avant le départ.`,
        );
      }
      cancelReservation.run(id, userId);
      releaseSeats.run(current.travelers, current.trip.id);
    });

    res.json({ reservation: toReservation(findForUser.get(id, userId)) });
  });

  return router;
}
