const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173',
]

/**
 * The CORS allowlist. Defaults to the local dev origins; extra origins (e.g. a
 * hosted Vercel client connecting to this local server — Mode 1) can be added
 * via SOLOOS_ALLOWED_ORIGINS (comma-separated). Local behavior is unchanged
 * when the variable is unset, so this is a zero-rework seam for the hosted client.
 */
export function resolveAllowedOrigins(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const extra = (env.SOLOOS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return Array.from(new Set([...DEFAULT_ORIGINS, ...extra]))
}
