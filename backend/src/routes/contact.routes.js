import { Router } from 'express';
import { contactLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { contactSchema } from '../validation/schemas.js';

/** Enregistre les messages du formulaire de contact en base (aucun e-mail n'est envoyé). */
export function contactRoutes(db) {
  const router = Router();
  const insert = db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)');

  router.post('/', contactLimiter, validate(contactSchema), (req, res) => {
    const { name, email, subject, message } = req.valid.body;
    insert.run(name, email, subject, message);
    res.status(201).json({ message: 'Votre message a bien été enregistré. Notre équipe vous répondra par e-mail.' });
  });

  return router;
}
