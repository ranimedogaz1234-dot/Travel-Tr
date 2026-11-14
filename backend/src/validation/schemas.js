import { z } from 'zod';

const email = z
  .string({ error: 'L’adresse e-mail est obligatoire.' })
  .trim()
  .toLowerCase()
  .max(254, { error: 'L’adresse e-mail est trop longue.' })
  .pipe(z.email({ error: 'Le format de l’adresse e-mail est invalide.' }));

const fullName = z
  .string({ error: 'Le nom complet est obligatoire.' })
  .trim()
  .min(2, { error: 'Le nom complet doit contenir au moins 2 caractères.' })
  .max(80, { error: 'Le nom complet ne peut pas dépasser 80 caractères.' });

export const newPassword = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(8, { error: 'Le mot de passe doit contenir au moins 8 caractères.' })
  .max(128, { error: 'Le mot de passe ne peut pas dépasser 128 caractères.' })
  .regex(/[A-Za-z]/, { error: 'Le mot de passe doit contenir au moins une lettre.' })
  .regex(/\d/, { error: 'Le mot de passe doit contenir au moins un chiffre.' });

const anyPassword = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(1, { error: 'Le mot de passe est obligatoire.' })
  .max(128, { error: 'Mot de passe invalide.' });

const phone = z
  .string()
  .trim()
  .max(20, { error: 'Le numéro de téléphone est trop long.' })
  .regex(/^$|^\+?[0-9 ().-]{6,20}$/, { error: 'Le numéro de téléphone est invalide.' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const registerSchema = z
  .object({
    fullName,
    email,
    password: newPassword,
    confirmPassword: z.string({ error: 'Veuillez confirmer le mot de passe.' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Les mots de passe ne correspondent pas.',
  });

export const loginSchema = z.object({ email, password: anyPassword });

export const updateProfileSchema = z.object({ fullName, email, phone });

export const changePasswordSchema = z
  .object({
    currentPassword: anyPassword,
    newPassword,
    confirmPassword: z.string({ error: 'Veuillez confirmer le mot de passe.' }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Les mots de passe ne correspondent pas.',
  });

export const destinationQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  country: z.string().trim().max(60).optional(),
  type: z.string().trim().max(40).optional(),
  budget: z.enum(['economique', 'modere', 'premium']).optional(),
  sort: z.enum(['populaire', 'prix-asc', 'prix-desc', 'note', 'nom']).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

const travelers = z.coerce
  .number({ error: 'Le nombre de voyageurs est invalide.' })
  .int({ error: 'Le nombre de voyageurs doit être un entier.' })
  .min(1, { error: 'Au moins 1 voyageur est requis.' })
  .max(9, { error: 'Maximum 9 voyageurs par réservation.' });

const notes = z
  .string()
  .trim()
  .max(500, { error: 'Les remarques ne peuvent pas dépasser 500 caractères.' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const createReservationSchema = z.object({
  tripId: z.coerce.number({ error: 'Départ invalide.' }).int().positive({ error: 'Départ invalide.' }),
  travelers,
  notes,
});

export const updateReservationSchema = z.object({ travelers, notes });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const contactSchema = z.object({
  name: fullName,
  email,
  subject: z
    .string({ error: 'Le sujet est obligatoire.' })
    .trim()
    .min(3, { error: 'Le sujet doit contenir au moins 3 caractères.' })
    .max(120, { error: 'Le sujet ne peut pas dépasser 120 caractères.' }),
  message: z
    .string({ error: 'Le message est obligatoire.' })
    .trim()
    .min(10, { error: 'Le message doit contenir au moins 10 caractères.' })
    .max(2000, { error: 'Le message ne peut pas dépasser 2000 caractères.' }),
});
