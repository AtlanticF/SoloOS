/**
 * True when the client is configured to talk to a separate-origin local server
 * (Mode 1). In local Mode-2 dev the base is the relative `/api` proxy, so the
 * Connection Gate stays inert.
 */
export function isRemoteBase(base) {
    return /^https?:\/\//i.test(base);
}
/** True when a /health payload carries the SoloOS identity signature. */
export function isSoloosHealth(data) {
    return !!data && typeof data === 'object' && data.app === 'soloos';
}
/**
 * One probe: GET `<base>/health` and report whether a SoloOS server answered.
 * `fetchFn` is injectable for testing. Never throws — unreachable ⇒ false.
 */
export async function probeServer(healthUrl, fetchFn = fetch) {
    try {
        const res = await fetchFn(healthUrl, { method: 'GET' });
        if (!res.ok)
            return false;
        return isSoloosHealth(await res.json());
    }
    catch {
        return false;
    }
}
