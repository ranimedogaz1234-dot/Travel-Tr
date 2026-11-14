import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guards';

/** Toutes les pages sont chargées à la demande (lazy loading). */
export const routes: Routes = [
  {
    path: '',
    title: 'Travel TR — Voyages et séjours sur mesure',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'destinations',
    title: 'Destinations — Travel TR',
    loadComponent: () =>
      import('./features/destinations/destination-list/destination-list').then((m) => m.DestinationList),
  },
  {
    path: 'destinations/:slug',
    title: 'Détails de la destination — Travel TR',
    loadComponent: () =>
      import('./features/destinations/destination-detail/destination-detail').then((m) => m.DestinationDetailPage),
  },
  {
    path: 'reservations',
    title: 'Réserver un voyage — Travel TR',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reservations/booking/booking').then((m) => m.Booking),
  },
  {
    path: 'mes-reservations',
    title: 'Mes réservations — Travel TR',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservations/my-reservations/my-reservations').then((m) => m.MyReservations),
  },
  {
    path: 'connexion',
    title: 'Connexion — Travel TR',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'inscription',
    title: 'Inscription — Travel TR',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'profil',
    title: 'Mon profil — Travel TR',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'a-propos',
    title: 'À propos — Travel TR',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
  },
  {
    path: 'contact',
    title: 'Contact — Travel TR',
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
  },
  {
    path: '**',
    title: 'Page introuvable — Travel TR',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
