import "server-only";

type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<unknown>>();
const MAX = 500;

/** Tiny in-memory TTL cache shared by all requests on one server instance. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await fn();
  if (store.size >= MAX) store.delete(store.keys().next().value as string);
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}
