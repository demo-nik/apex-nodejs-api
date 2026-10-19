const DEFAULT_TIMEOUT_MS = 2_000;

function createProfileServiceClient({
  serviceUrl = process.env.PROFILE_SERVICE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return async function getProfile() {
    if (!serviceUrl || typeof fetchImpl !== 'function') {
      return { ok: false, kind: 'unavailable' };
    }

    let target;
    try {
      const base = new URL(serviceUrl);
      if (!['http:', 'https:'].includes(base.protocol)) return { ok: false, kind: 'unavailable' };
      target = new URL('/api/profile', base);
    } catch {
      return { ok: false, kind: 'unavailable' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const downstream = await fetchImpl(target, { signal: controller.signal, headers: { accept: 'application/json' } });
      if (!downstream.ok) return { ok: false, kind: 'downstream' };
      const profile = await downstream.json();
      return { ok: true, profile };
    } catch (error) {
      return { ok: false, kind: controller.signal.aborted || error.name === 'AbortError' ? 'timeout' : 'connection' };
    } finally {
      clearTimeout(timeout);
    }
  };
}

module.exports = { createProfileServiceClient, DEFAULT_TIMEOUT_MS };
