# IdleMMO API — Rate Limiting

## How the API communicates limits

Every response from `api.idle-mmo.com` includes:

| Header | Type | Meaning |
|---|---|---|
| `X-RateLimit-Remaining` | integer | Requests left in the current window |
| `X-RateLimit-Reset` | integer (Unix epoch seconds) | When the window resets and remaining refills |

There is no hard-coded quota. These headers are the only source of truth.

## Required behaviour for all API callers

```
BEFORE each request:
  if remaining is known AND remaining ≤ 0:
    wait = max(1000ms, resetAt × 1000 − now + 500ms)
    sleep(wait)

MAKE request

READ headers from every response:
  remaining = X-RateLimit-Remaining  (if present)
  resetAt   = X-RateLimit-Reset      (if present)

IF status == 429:
  remaining = 0                       # force wait before next attempt
  wait = max(1000ms, resetAt × 1000 − now + 500ms)
  sleep(wait)
  retry same request (up to MAX_RETRIES = 10)

IF status != 200 and != 429:
  do NOT retry — skip the item, continue loop
```

### Rules

1. **Never hardcode remaining/quota.** `remaining` starts as `null` (unknown) and is only ever set from a response header.
2. **Always retry on 429 — but cap retries.** `MAX_RETRIES = 10`. After 10 consecutive 429s throw an error; do not loop forever.
3. **Use an iterative loop, not recursion.** Recursive retry functions have no natural cap and cause double-waits on every 429.
4. **500ms buffer on reset time.** `resetAt × 1000 − now + 500` gives half a second of margin before the window refills.
5. **Minimum wait of 1000ms.** Protects against malformed/missing headers or a reset time already in the past.
6. **Share rate-limit state across the loop.** One `rl` object per sync run so the remaining count stays accurate across all items.

## Reference implementation

Used in `app/api/admin/sync-prices/route.ts` and `scripts/test-sync-prices.mjs`:

```typescript
const MAX_RETRIES = 10;
const rl = { remaining: null as number | null, resetAt: 0 };

async function rateLimitedFetch(url: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (rl.remaining !== null && rl.remaining <= 0) {
      const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
      await sleep(waitMs); // use ticking sleep in scripts for visibility
    }

    const res = await fetch(url, { headers, cache: "no-store" });
    const rem = res.headers.get("x-ratelimit-remaining");
    const rst = res.headers.get("x-ratelimit-reset");
    if (rem !== null) rl.remaining = parseInt(rem, 10);
    if (rst !== null) rl.resetAt   = parseInt(rst, 10);

    if (res.status !== 429) return res;

    // 429 — wait exactly as long as the API instructs, then retry
    rl.remaining = 0;
    const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
    await sleep(waitMs);
  }

  throw new Error(`Max retries (${MAX_RETRIES}) exceeded — API returning persistent 429`);
}
```

## Observed throughput

- Rate limit window resets approximately every **60 seconds**
- Approximately **20 requests** allowed per window
- After hitting 429, the API typically needs **~57–58 seconds** to reset
- Effective throughput: ~20 items/minute

### Vercel `maxDuration` implications

| Items in type | Est. time | Fits in 300s? |
|---|---|---|
| ≤ 80 | ≤ 4 min | Yes |
| ~100 | ~5 min | Borderline |
| ≥ 120 | > 6 min | No |

Types above ~100 items (e.g. `CHEST` 158, `RECIPE` 370) will exceed Vercel's `maxDuration = 300`. Vercel terminates the function and the browser sees a network error — not an infinite loop. The code is correct; it is an infrastructure constraint.

## Applies to

All routes and scripts that call the IdleMMO API in a loop:

| File | Pattern |
|---|---|
| `app/api/admin/sync-prices/route.ts` | Inline `rateLimitedFetch` |
| `lib/idlemmo.ts` — `searchItemsByType` | Inline fetch loop with same headers |
| `scripts/test-sync-prices.mjs` | `rateLimitedFetch` + ticking sleep for visibility |
