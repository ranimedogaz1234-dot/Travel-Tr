# Deploying Travel TR

Travel TR deploys as **one Node.js web service**: the Express API serves the compiled Angular app from the same origin. This is how the project was designed, and it matters:

- The session cookie (`tr_session`, HttpOnly) and the CSRF cookie (`XSRF-TOKEN`) are first-party, so they are not affected by browsers blocking third-party cookies.
- No CORS configuration is needed (`CORS_ORIGINS` stays empty), which is the most restrictive setting.
- The frontend calls the API with the relative path `/api`, so there is no API base URL to configure.

Hosting the frontend on a separate domain (Vercel, Netlify) and the API on another would make the cookies cross-site and break login in browsers that block third-party cookies, unless the static host proxies `/api` to the API. That adds a second service and duplicated security headers for little benefit, so it is not used here.

## Hosting: Render free web service

| Item | Free plan behavior |
|---|---|
| Cost | $0. Render's documentation describes Free services without asking for a payment method; stop if Render asks for payment details |
| Over the free allowance | **Without a payment method on file**, Render suspends Free services (instance hours, bandwidth) or disables new builds (build minutes) until the next month. Bandwidth and build overages are billed **only** if a payment method has been added, so do not add one |
| Monthly allowance | 750 instance hours per workspace (one service running all month uses ~720) |
| Sleep | Spins down after 15 minutes without traffic; the next visit waits about a minute while Render shows a loading page |
| Filesystem | **Ephemeral**: lost on every deploy, restart and spin-down |
| Persistent disk | Not available on the free plan |

Check <https://render.com/docs/free> before deploying; these limits are set by Render and can change.

### What the ephemeral filesystem means for Travel TR

The SQLite database lives on the service's filesystem. On the free plan it is **recreated from the demo catalog** whenever the service restarts, redeploys or wakes up after 15 idle minutes:

- Destinations, activities and departures are always present (they are seeded on startup), and departure dates are always in the future because they are computed relative to the seeding date.
- Accounts, reservations and contact messages created by visitors are **temporary**. A visitor can register, book, edit and cancel during a session, but the data is gone after the next restart.

For a portfolio demo this keeps the catalog fresh and avoids storing visitors' personal data long term. If accounts must survive restarts, the database needs to move off the service's disk; see [Persistent data](#persistent-data-optional).

## Configuration

All configuration is through environment variables. **No secret key is required**: session tokens are random, and only their SHA-256 hashes are stored.

| Variable | Production value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables HSTS, production rate limits, and Secure cookies by default |
| `COOKIE_SECURE` | `true` | Render serves HTTPS |
| `TRUST_PROXY` | `1` to start, then verified | Number of reverse proxies in front of the app; see below |
| `DATABASE_PATH` | `data/travel-tr.sqlite` | Relative to `backend/` |
| `PORT` | Set by Render | Do not set it manually |
| `CORS_ORIGINS` | Empty | Same origin; no CORS needed |
| `SESSION_TTL_HOURS` | `168` (default) | Session lifetime |
| `PROXY_DIAGNOSTICS` | Unset | Set to `true` only while measuring `TRUST_PROXY`, then delete |

Never commit a `.env` file; `.gitignore` already excludes it. Nothing in the Angular bundle is secret.

## Deploy

The repository contains a Render Blueprint, [`render.yaml`](../render.yaml), that declares the service.

1. Sign in to <https://dashboard.render.com> with GitHub.
2. **New → Blueprint**, select the `Travel-Tr` repository and the `main` branch.
3. Render reads `render.yaml` and shows one free web service named `travel-tr`. Confirm that the review lists exactly one resource, a web service on the **Free** plan, then click **Deploy Blueprint**.
4. In the Blueprint's settings, set **Auto Sync** to **No**. By default Render applies every pushed change to `render.yaml`, and a missing `plan` line defaults to a paid instance type; with Auto Sync off, Blueprint changes only apply when you click **Manual Sync** after reviewing them. Code changes still deploy automatically.
5. Wait for the build (`npm run build:prod`) and the health check (`/api/health`) to pass. The service URL is `https://travel-tr.onrender.com`, or a variant with a suffix if the name is taken.

If Render asks for payment details at any step, cancel: nothing in this setup needs a paid feature. The same service can also be created without the Blueprint, through **New → Web Service**, using the values from `render.yaml`:

| Field | Value |
|---|---|
| Language | Node |
| Branch | `main` |
| Root directory | Empty (repository root) |
| Build command | `npm run build:prod` |
| Start command | `npm start` |
| Instance type | Free |
| Health check path | `/api/health` (under **Advanced**) |
| Environment variables | `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY=1`, `DATABASE_PATH=data/travel-tr.sqlite` |

What the build does:

```bash
npm --prefix backend ci --omit=dev          # API, production dependencies only
npm --prefix frontend ci --include=dev      # Angular CLI is a devDependency
npm --prefix frontend run build             # -> frontend/dist/travel-tr/browser
```

`--include=dev` is required: Render exposes `NODE_ENV=production` during the build, and a plain `npm ci` would then skip the Angular CLI.

Node.js is pinned to version 26 by [`.node-version`](../.node-version). The API uses the built-in `node:sqlite` module, which needs a recent Node release.

## Verify the deployment

Replace `APP` with the service URL.

```bash
curl -s https://APP/api/health                     # {"status":"ok"}
curl -s https://APP/api/destinations | head -c 200 # JSON catalog
curl -sI https://APP/destinations/bali             # 200, text/html (SPA deep link)
curl -sI https://APP/ | grep -iE 'strict-transport|content-security|x-content-type'
```

Then, in a browser: register, book a departure, edit and cancel it, update the profile, log out and log back in, send the contact form, and check the layout on a phone.

The end-to-end suite can also run against the live site; it creates test accounts, which disappear at the next restart:

```bash
BASE_URL=https://APP CHROME_PATH="/path/to/chrome" npm run test:e2e
```

### Verify the proxy setting

Render places reverse proxies in front of the service. `TRUST_PROXY` must equal the number of proxies so that each visitor gets their own rate limits:

- **Too low:** every visitor appears to come from the proxy and shares one rate-limit bucket. After ten sign-ups in an hour, registration is refused for everyone.
- **Too high:** a client can send a fake `X-Forwarded-For` header to get a fresh rate-limit bucket on each request and bypass the login brute-force protection.

Render does not document its proxy count, so it is measured on the deployed service. The Blueprint starts with `TRUST_PROXY=1`: there is at least one proxy, and erring low only affects availability (shared limits), never security.

**1. Turn on the diagnostic.** In the Render dashboard, add the environment variable `PROXY_DIAGNOSTICS=true` (the service restarts). This enables `GET /api/health/proxy`, which returns the address used as the rate-limit key (`clientIp`), the socket address, and the forwarding headers the app received. It only reports information about the caller's own request.

**2. Read the real chain.** Note your public IP address (for example from your router or any "what is my IP" page), then:

```bash
curl -s https://APP/api/health/proxy
# {"trustProxy":1,"clientIp":"…","socketAddress":"…","headers":{"x-forwarded-for":"<your IP>, <proxy>, …", …}}
```

In `x-forwarded-for`, count the entries from your IP to the end of the list, including your IP. That count is the correct `TRUST_PROXY`. For example, `"81.2.3.4, 10.0.0.5"` with your IP first gives `2`. Repeat the request about ten times: the count must be the same every time. If it varies, do not use a fixed count; stop and reassess.

**3. Apply and confirm.** Set `TRUST_PROXY` to the measured count, wait for the restart, then check that `clientIp` is your IP, with and without a forged header:

```bash
curl -s https://APP/api/health/proxy                                   # clientIp = your IP
curl -s -H 'X-Forwarded-For: 203.0.113.9' https://APP/api/health/proxy # clientIp = still your IP
```

**4. Confirm that spoofing cannot bypass the login limit.** Use a throwaway e-mail address that has no account. Eleven failed logins, each with a different forged address, must end with `429`:

```bash
APP=https://APP; JAR=$(mktemp)
curl -s -c "$JAR" "$APP/api/auth/me" > /dev/null
XSRF=$(awk '/XSRF-TOKEN/ {print $7}' "$JAR")
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code} " -b "$JAR" -H "X-XSRF-TOKEN: $XSRF" \
    -H "Content-Type: application/json" -H "X-Forwarded-For: 203.0.113.$i" \
    -d '{"email":"spoof-check@exemple.fr","password":"Mauvais123"}' "$APP/api/auth/login"
done; echo   # expected: 401 ×10, then 429
```

**5. Confirm that visitors are separated.** Open `https://APP/api/health/proxy` from another network (for example a phone on mobile data): `clientIp` must be that network's address, not yours and not a Render address.

**6. Turn the diagnostic off.** Delete `PROXY_DIAGNOSTICS` in the dashboard, check that `/api/health/proxy` now returns `404`, and record the measured `TRUST_PROXY` in `render.yaml` through a pull request so that a later Blueprint sync keeps it.

The server logs a warning at startup if `TRUST_PROXY` is `0` in production. The automated tests in `backend/test/api.test.js` ("Derrière un proxy inverse") cover the same spoofing cases for a known hop count.

## Operations

- **Logs:** Render dashboard → service → **Logs**. Errors are logged server-side only; clients receive generic messages.
- **Redeploy:** every push to `main` triggers a deploy. Pull requests do not deploy.
- **Reset the demo data:** **Manual Deploy → Deploy latest commit** (the free plan recreates the database). Render may also restart Free services at any time, which has the same effect.
- **Roll back:** Render dashboard → **Events** → choose a previous deploy → **Rollback**. The free plan can only roll back to the two most recent previous deploys.
- **Take the site offline:** **Settings → Suspend Web Service**, or delete the service.

## Persistent data (optional)

Free options for keeping accounts and reservations across restarts, as of November 2026:

| Option | Cost | Trade-off |
|---|---|---|
| Ephemeral SQLite (current) | Free | Visitor data resets on restart; no code changes |
| Render Postgres, free plan | Free for 30 days | Expires after 30 days and is deleted 14 days later; not suitable |
| Render persistent disk | Paid plan only | Requires a paid instance plus the disk |
| Turso (hosted libSQL/SQLite) | Free plan, no card | Requires changing the data layer from the synchronous `node:sqlite` API to the asynchronous `@libsql/client` API, plus a database URL and token as secrets |

If persistence is needed later, Turso is the closest fit because it keeps the SQLite schema and SQL. Seeded departures would also need refreshing over time, since their dates are computed when the database is first created.
