/**
 * The port the server listens on. Defaults to 3000 (local Mode-2 dev); the
 * `serve` command (Mode 1) sets PORT=5010 so the hosted client probes one known
 * address.
 */
export function resolvePort(env: Record<string, string | undefined> = process.env): number {
  const raw = env.PORT
  const n = raw ? Number(raw) : NaN
  return Number.isInteger(n) && n > 0 ? n : 3000
}
