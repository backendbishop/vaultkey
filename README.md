
## Rate limiting

`/auth/register` and `/auth/login` are rate limited per IP using an in-memory store (`express-rate-limit` defaults — correct for a single-instance deployment; if Vaultkey ever runs multiple instances, swap to `rate-limit-redis` with no other code changes).

- **Login**: 5 attempts / 15 minutes — slows credential stuffing against bcrypt hashes while allowing a couple of typo'd-password retries.
- **Register**: 3 attempts / hour — registration is rare for legitimate users; this curbs automated account creation.

Exceeding a limit returns `429` with `{ "error": "Too many requests. Try again later." }` and a `Retry-After` header.

**Known limitation**: limiting is per-IP, not per-account. Users behind shared IPs (NAT, corporate networks, mobile carriers) hit limits faster. Per-account limiting would require a successful credential lookup first — a chicken/egg problem with rate limiting itself — and is deferred.

**Fail-open**: if the rate limit store itself errors, requests are allowed through rather than blocked (express-rate-limit default). Availability prioritized over strictness on limiter failure.
