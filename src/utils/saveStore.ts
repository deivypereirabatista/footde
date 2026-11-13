import { CareerState } from '../types/brasfoot';

// Persistência local em IndexedDB (suporta saves grandes — a base mundial tem dezenas de
// milhares de jogadores, acima do limite de ~5 MB do localStorage).
const DB_NAME = 'brasfoot_2026';
const STORE = 'saves';
export const CAREER_VERSION = 2;
const SLOT = 'career_slot_1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function isValid(c: unknown): c is CareerState {
  const s = c as CareerState | null;
  return !!s && Array.isArray(s.clubs) && Array.isArray(s.players) && !!s.userClubId && s.version === CAREER_VERSION;
}

export async function loadCareer(): Promise<CareerState | null> {
  try {
    const db = await openDb();
    const value = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(SLOT);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

export async function saveCareer(state: CareerState): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(state, SLOT);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteCareer(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(SLOT);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
