/**
 * Shared utilities for e2e test scripts.
 */

/** Returns current time as HH:MM:SS.mmm */
export function ts() {
  return new Date().toISOString().slice(11, 23);
}

/**
 * Sleep for waitMs, printing a countdown tick every 5s.
 * Prevents silent gaps that look like hangs.
 */
export async function tickingSleep(waitMs, label) {
  const deadline = Date.now() + waitMs;
  console.log(`  ${ts()} [wait] ${label} — ${(waitMs / 1000).toFixed(1)}s`);
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(5000, remaining)));
    const left = deadline - Date.now();
    if (left > 500) console.log(`  ${ts()} [wait] ...${(left / 1000).toFixed(0)}s remaining`);
  }
  console.log(`  ${ts()} [wait] resuming`);
}
