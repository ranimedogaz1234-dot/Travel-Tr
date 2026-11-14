# Rapport de sécurité — Travel TR

Ce document décrit les mesures de sécurité mises en œuvre, les vérifications réalisées avant publication et les risques résiduels connus. Aucun logiciel n’est exempt de vulnérabilités : ce rapport reflète l’état du projet au moment de sa publication.

## 1. Secrets et configuration

| Contrôle | Résultat |
|----------|----------|
| Recherche de clés d’API, jetons, mots de passe et clés privées dans le code | Aucun secret trouvé |
| Recherche dans l’historique Git avant publication | Aucun secret trouvé (dépôt créé à partir de zéro) |
| Fichiers `.env` exclus de Git | Oui (`.gitignore`), seul `.env.example` est versionné |
| Base de données exclue de Git | Oui (`backend/data/`, `*.sqlite`) |
| Secrets dans le frontend Angular | Aucun : le frontend ne contient que le chemin relatif `/api` |
| Données personnelles réelles | Aucune : catalogue fictif, aucun compte préexistant |

L’application ne nécessite **aucune clé secrète** : les jetons de session et CSRF sont générés aléatoirement (`crypto.randomBytes`) à l’exécution.

## 2. Authentification et sessions

- **Hachage Argon2id** (m = 19 Mio, t = 2, p = 1, paramètres OWASP) ; les mots de passe ne sont jamais stockés ni journalisés en clair.
- **Politique de mot de passe** : 8 à 128 caractères, au moins une lettre et un chiffre (vérifiée côté client *et* serveur).
- **Sessions côté serveur** : jeton aléatoire de 256 bits dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production. Seul le hachage SHA-256 du jeton est stocké en base : une fuite de la base ne permet pas de réutiliser les sessions.
- **Rotation de session** à chaque connexion (prévention de la fixation de session) ; suppression à la déconnexion ; purge horaire des sessions expirées.
- **Changement de mot de passe** : vérification du mot de passe actuel, déconnexion des autres sessions.
- **Anti force brute** : 10 tentatives de connexion par tranche de 15 minutes et par couple IP + e-mail ; limites aussi sur l’inscription, le contact et le changement de mot de passe.
- **Pas d’énumération de comptes à la connexion** : même message et temps de réponse comparable (vérification Argon2 factice) que l’e-mail existe ou non.
  - *Limite assumée* : l’inscription indique qu’un e-mail est déjà utilisé (exigence fonctionnelle « empêcher les comptes en double »), ce qui permet de tester l’existence d’un compte ; la limitation de débit réduit ce risque.

## 3. Autorisation et contrôle d’accès

- Les gardes de route Angular ne servent qu’à l’ergonomie ; **toute la sécurité est appliquée par l’API**.
- Les routes `/api/users/*` et `/api/reservations/*` exigent une session valide (`401` sinon).
- Chaque requête sur une réservation est filtrée par `user_id` : la réservation d’un autre utilisateur renvoie `404` (pas d’IDOR, pas de fuite d’existence). Vérifié par les tests d’API et E2E.
- Les règles métier (places disponibles, délais de réservation, de modification et d’annulation, doublons) sont appliquées côté serveur dans des transactions SQLite.

## 4. Protection contre les vulnérabilités courantes

| Risque | Mesure |
|--------|--------|
| **XSS** | Interpolation Angular (échappement automatique), aucun `innerHTML` ni `bypassSecurityTrust*`, icônes rendues élément par élément ; **CSP** : `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'` |
| **CSRF** | Cookie `SameSite=Lax` + jeton à double soumission (`XSRF-TOKEN` / `X-XSRF-TOKEN`) vérifié en temps constant sur toute requête modifiante |
| **Injection SQL** | Requêtes préparées exclusivement ; jokers `LIKE` échappés ; ordre de tri choisi dans une liste blanche |
| **Validation des entrées** | Schémas Zod sur tous les corps, paramètres et chaînes de requête ; corps JSON limité à 20 Ko |
| **Redirection ouverte** | `returnUrl` accepté uniquement s’il s’agit d’un chemin interne (`/…`, pas `//…`) |
| **Fuite d’informations** | Gestionnaire d’erreurs générique (pas de trace de pile ni d’erreur SQL), en-tête `X-Powered-By` supprimé, `Cache-Control: no-store` sur l’API |
| **CORS** | Désactivé par défaut (même origine) ; liste blanche explicite via `CORS_ORIGINS` |
| **Clickjacking** | `frame-ancestors 'none'` et `X-Frame-Options` |
| **Transport** | `Strict-Transport-Security` et cookies `Secure` en production (HTTPS obligatoire) |
| **Téléversement de fichiers** | Non applicable (aucun envoi de fichier) |

## 5. Dépendances

`npm audit` exécuté sur `backend/`, `frontend/` et `e2e/` : **0 vulnérabilité connue** au moment de la publication. La première version de `puppeteer-core` (outil de test uniquement) dépendait d’une version vulnérable de `zod` ; elle a été mise à jour vers la version 25.

## 6. Tests de sécurité automatisés

Les tests d’API (`backend/test/api.test.js`) vérifient notamment :
- les en-têtes de sécurité et l’absence de `X-Powered-By` ;
- le rejet des requêtes sans jeton CSRF ou avec un jeton invalide ;
- le hachage Argon2id des mots de passe ;
- le refus des doublons d’e-mail (insensible à la casse) ;
- le blocage de la force brute (HTTP 429) ;
- le rejet des cookies de session forgés ;
- l’isolation des réservations entre utilisateurs (lecture, modification, annulation) ;
- la neutralisation des tentatives d’injection dans la recherche et le tri.

## 7. Risques résiduels et recommandations pour la production

- **Réinitialisation du mot de passe** : non implémentée, car elle nécessite un service d’envoi d’e-mails. À ajouter avec des jetons à usage unique et à durée limitée.
- **Vérification de l’adresse e-mail** à l’inscription : non implémentée (même raison).
- **Limitation de débit en mémoire** : adaptée à une instance unique ; utiliser un stockage partagé (Redis) si plusieurs instances.
- **SQLite** : adapté à une démonstration ; prévoir sauvegardes et chiffrement du disque, ou PostgreSQL, pour un usage réel.
- **CSP `style-src 'unsafe-inline'`** : nécessaire aux styles de composants injectés par Angular ; les scripts restent strictement limités à `'self'`.
- **Photos externes** : chargées depuis `images.unsplash.com` (autorisé dans la CSP) ; un repli s’affiche si le service est indisponible.
- Déployer impérativement derrière **HTTPS** avec `NODE_ENV=production` et `TRUST_PROXY` correctement réglé.
