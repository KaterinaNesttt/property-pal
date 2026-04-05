const STORAGE_KEY = "property-pal-offline-mutations";
const RESPONSE_CACHE_KEY = "property-pal-offline-responses";

export const OFFLINE_SYNC_EVENT = "property-pal-offline-sync";

type SyncEventDetail =
  | { type: "queued"; item: OfflineMutation }
  | { type: "flush-start"; pending: number }
  | { type: "flush-complete"; synced: number; failed: number; pending: number }
  | { type: "flush-paused"; pending: number }
  | { type: "flush-error"; item: OfflineMutation; message: string };

export interface OfflineMutation {
  id: string;
  method: "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  token: string;
  enqueuedAt: string;
  attempts?: number;
  lastError?: string;
  lastErrorAt?: string;
}

export interface OfflineQueuedResult {
  __offlineQueued: true;
  queueId: string;
}

let flushPromise: Promise<void> | null = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emit(detail: SyncEventDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<SyncEventDetail>(OFFLINE_SYNC_EVENT, { detail }));
}

function readQueue(): OfflineMutation[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function readResponseCache(): Record<string, unknown> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(RESPONSE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeResponseCache(cache: Record<string, unknown>) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(RESPONSE_CACHE_KEY, JSON.stringify(cache));
}

function buildHeaders(token: string, hasBody: boolean) {
  const headers = new Headers({ Accept: "application/json" });
  headers.set("Authorization", `Bearer ${token}`);
  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export function isOfflineQueuedResult(value: unknown): value is OfflineQueuedResult {
  return Boolean(value && typeof value === "object" && "__offlineQueued" in value);
}

export function enqueueOfflineMutation(item: Omit<OfflineMutation, "id" | "enqueuedAt">): OfflineQueuedResult {
  const queued: OfflineMutation = {
    ...item,
    id: crypto.randomUUID(),
    enqueuedAt: new Date().toISOString(),
  };

  const queue = readQueue();
  queue.push(queued);
  writeQueue(queue);
  emit({ type: "queued", item: queued });

  return {
    __offlineQueued: true,
    queueId: queued.id,
  };
}

export function getPendingOfflineMutationsCount() {
  return readQueue().length;
}

export function cacheOfflineResponse(path: string, data: unknown) {
  const cache = readResponseCache();
  cache[path] = data;
  writeResponseCache(cache);
}

function extractCollectionPath(path: string) {
  const match = path.match(/^\/api\/[^/]+/);
  return match?.[0] ?? path;
}

function extractRecordId(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.length > 2 ? segments[2] : null;
}

function paymentStatus(body: Record<string, unknown>) {
  if (body.paid_at) {
    return "paid";
  }
  return new Date(String(body.due_date)).getTime() < Date.now() ? "overdue" : "pending";
}

function taskStatus(body: Record<string, unknown>) {
  if (body.status === "done") {
    return "done";
  }
  return new Date(String(body.due_date)).getTime() < Date.now() ? "overdue" : body.status;
}

function decorateRecord(collectionPath: string, record: Record<string, unknown>, cache: Record<string, unknown>) {
  const now = new Date().toISOString();
  const properties = (cache["/api/properties"] as Array<Record<string, unknown>> | undefined) ?? [];
  const tenants = (cache["/api/tenants"] as Array<Record<string, unknown>> | undefined) ?? [];

  if (collectionPath === "/api/properties") {
    return {
      owner_id: "",
      tenant_name: null,
      created_at: now,
      updated_at: now,
      ...record,
      notes: record.notes ?? null,
    };
  }

  if (collectionPath === "/api/tenants") {
    return {
      owner_id: "",
      user_id: null,
      property_name:
        properties.find((item) => item.id === record.property_id)?.name ?? null,
      is_active: 1,
      created_at: now,
      updated_at: now,
      ...record,
      notes: record.notes ?? null,
    };
  }

  if (collectionPath === "/api/payments") {
    return {
      property_name:
        properties.find((item) => item.id === record.property_id)?.name ?? null,
      tenant_name:
        tenants.find((item) => item.id === record.tenant_id)?.full_name ?? null,
      total_amount: Number(record.base_amount ?? 0) + Number(record.utilities_amount ?? 0),
      status: paymentStatus(record),
      created_at: now,
      updated_at: now,
      ...record,
      tenant_id: record.tenant_id || null,
      paid_at: record.paid_at || null,
      note: record.note ?? null,
    };
  }

  if (collectionPath === "/api/meters") {
    return {
      property_name:
        properties.find((item) => item.id === record.property_id)?.name ?? null,
      created_at: now,
      updated_at: now,
      ...record,
      note: record.note ?? null,
    };
  }

  if (collectionPath === "/api/tasks") {
    const status = taskStatus(record);
    return {
      property_name:
        properties.find((item) => item.id === record.property_id)?.name ?? null,
      tenant_name:
        tenants.find((item) => item.id === record.tenant_id)?.full_name ?? null,
      created_at: now,
      updated_at: now,
      completed_at: status === "done" ? now : null,
      ...record,
      tenant_id: record.tenant_id || null,
      status,
      reminder_at: record.reminder_at || null,
      description: record.description ?? null,
    };
  }

  return {
    created_at: now,
    updated_at: now,
    ...record,
  };
}

function applyQueuedMutations(path: string, cachedValue: unknown) {
  if (!Array.isArray(cachedValue)) {
    return cachedValue;
  }

  const collectionPath = extractCollectionPath(path);
  const queue = readQueue().filter((item) => extractCollectionPath(item.path) === collectionPath);
  const responseCache = readResponseCache();
  let records = [...cachedValue] as Array<Record<string, unknown>>;

  for (const item of queue) {
    if (item.method === "POST" && item.body && typeof item.body === "object") {
      const optimistic = decorateRecord(
        collectionPath,
        { id: item.id, ...(item.body as Record<string, unknown>) },
        responseCache,
      );
      records = [optimistic, ...records.filter((entry) => entry.id !== item.id)];
      continue;
    }

    const recordId = extractRecordId(item.path);
    if (!recordId) {
      continue;
    }

    if (item.method === "DELETE") {
      records = records.filter((entry) => entry.id !== recordId);
      continue;
    }

    if (item.method === "PUT" && item.body && typeof item.body === "object") {
      records = records.map((entry) =>
        entry.id === recordId
          ? decorateRecord(collectionPath, { ...entry, ...(item.body as Record<string, unknown>), id: recordId }, responseCache)
          : entry,
      );
    }
  }

  return records;
}

export function getOfflineResponse(path: string) {
  const cache = readResponseCache();
  if (!(path in cache)) {
    return undefined;
  }
  return applyQueuedMutations(path, cache[path]);
}

export async function flushOfflineMutations(apiBase: string) {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      emit({ type: "flush-paused", pending: readQueue().length });
      return;
    }

    let queue = readQueue();
    if (!queue.length) {
      return;
    }

    emit({ type: "flush-start", pending: queue.length });

    let synced = 0;
    let failed = 0;
    const processedIds = new Set<string>();

    while (queue.length) {
      const current = queue[0];
      if (processedIds.has(current.id)) {
        break;
      }
      processedIds.add(current.id);

      try {
        const response = await fetch(`${apiBase}${current.path}`, {
          method: current.method,
          headers: buildHeaders(current.token, current.body !== undefined),
          body: current.body !== undefined ? JSON.stringify(current.body) : undefined,
        });

        if (!response.ok) {
          failed += 1;
          const failedItem: OfflineMutation = {
            ...current,
            attempts: (current.attempts ?? 0) + 1,
            lastError: `HTTP ${response.status}`,
            lastErrorAt: new Date().toISOString(),
          };
          queue = [...queue.slice(1), failedItem];
          writeQueue(queue);
          emit({
            type: "flush-error",
            item: failedItem,
            message: `HTTP ${response.status}`,
          });
          continue;
        }

        synced += 1;
        queue = queue.slice(1);
        writeQueue(queue);
      } catch {
        emit({ type: "flush-paused", pending: queue.length });
        return;
      }
    }

    emit({ type: "flush-complete", synced, failed, pending: queue.length });
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
