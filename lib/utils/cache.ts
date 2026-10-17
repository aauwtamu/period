// Each Vercel instance owns this cache. A generation prevents an old in-flight
// read from repopulating it after a successful write invalidates it.
export function createCache<T>(ttl: number, clock = Date.now) {
  let cached: { value: T; until: number } | undefined;
  let pending: Promise<T> | undefined;
  let generation = 0;
  return {
    invalidate() {
      generation++;
      cached = undefined;
      pending = undefined;
    },
    async get(read: () => Promise<T>): Promise<T> {
      if (cached && cached.until > clock()) return cached.value;
      if (pending) return pending;
      const started = generation;
      const request = read()
        .then((value) => {
          if (started === generation) cached = { value, until: clock() + ttl };
          return value;
        })
        .finally(() => {
          if (started === generation) pending = undefined;
        });
      pending = request;
      return request;
    },
  };
}
