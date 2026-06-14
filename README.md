
## Rate limiting

`/auth/register` and `/auth/login` are rate limited per IP using an in-memory store (`express-rate-limit` defaults — correct for a single-instance deployment; if Vaultkey ever runs multiple instances, swap to `rate-limit-redis` with no other code changes).

- **Login**: 5 attempts / 15 minutes — slows credential stuffing against bcrypt hashes while allowing a couple of typo'd-password retries.
- **Register**: 3 attempts / hour — registration is rare for legitimate users; this curbs automated account creation.

Exceeding a limit returns `429` with `{ "error": "Too many requests. Try again later." }` and a `Retry-After` header.

**Known limitation**: limiting is per-IP, not per-account. Users behind shared IPs (NAT, corporate networks, mobile carriers) hit limits faster. Per-account limiting would require a successful credential lookup first — a chicken/egg problem with rate limiting itself — and is deferred.

**Fail-open**: if the rate limit store itself errors, requests are allowed through rather than blocked (express-rate-limit default). Availability prioritized over strictness on limiter failure.

## Database

User data persists in SQLite via `node:sqlite` (Node's built-in module, stable since 22.5 — no native bindings, no extra dependency). Configure the path with `DB_PATH` (defaults to `./data/vaultkey.db`; use `:memory:` for an ephemeral database).

**Known limitation — ephemeral filesystem on Render free tier**: `DB_PATH` persists across requests and restarts *within* a deploy, but a new deploy wipes `data/`. This is "persistence during a session," not "durable storage across deploys." True durability needs a Render persistent disk (paid tier) or an external database (Postgres).

**Synchronous I/O**: `node:sqlite`'s API is synchronous, so each query blocks the event loop for its duration. At this scale (one table, indexed lookups on `email`) that's sub-millisecond and negligible. Higher throughput would need a worker thread or an async driver.

The `UserStore` interface (`findByEmail`, `save`) is implemented by both `MemoryUserStore` (used in route/middleware tests, where storage isn't under test) and `SqliteUserStore` (used in production and in `tests/userStore.test.ts`, a contract suite run against both implementations to verify they behave identically).
