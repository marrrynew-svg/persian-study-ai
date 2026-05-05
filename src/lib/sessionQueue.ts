import { normalizeStudySession, type StudySessionInput } from "./studySession";

const DB_NAME = "study-session-queue";
const STORE_NAME = "pending_sessions";
const DB_VERSION = 1;

export type QueuedStudySession = ReturnType<typeof normalizeStudySession> & {
  user_id: string;
  retry_count: number;
  queued_at: string;
  last_error?: string;
};

const hasIndexedDb = () => typeof indexedDB !== "undefined";

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!hasIndexedDb()) return reject(new Error("IndexedDB unavailable"));
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "client_session_id" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error("Cannot open session queue"));
});

const tx = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Session queue operation failed"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error || new Error("Session queue transaction failed"));
  });
};

export const enqueueStudySession = async (userId: string, session: StudySessionInput) => {
  const queued: QueuedStudySession = {
    ...normalizeStudySession(session),
    user_id: userId,
    retry_count: 0,
    queued_at: new Date().toISOString(),
  };
  await tx("readwrite", (store) => store.put(queued));
  return queued;
};

export const getQueuedStudySessions = async (userId: string) => {
  const all = await tx<QueuedStudySession[]>("readonly", (store) => store.getAll());
  return all.filter((session) => session.user_id === userId);
};

export const removeQueuedStudySession = async (clientSessionId: string) => {
  await tx("readwrite", (store) => store.delete(clientSessionId));
};

export const markQueuedStudySessionFailed = async (session: QueuedStudySession, error: unknown) => {
  await tx("readwrite", (store) => store.put({
    ...session,
    retry_count: session.retry_count + 1,
    last_error: error instanceof Error ? error.message : "خطای ناشناخته در همگام‌سازی",
  }));
};