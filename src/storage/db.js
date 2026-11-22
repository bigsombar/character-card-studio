import { openDB } from 'idb';

export const DB_NAME = 'ccv3-editor';
export const DB_VERSION = 1;
export const PROJECT_STORE = 'project';
export const ASSET_STORE = 'assets';

let dbPromise = null;

export function isIndexedDbAvailable() {
    return typeof indexedDB !== 'undefined';
}

export function openEditorDb() {
    if (!isIndexedDbAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    }

    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(PROJECT_STORE)) {
                    db.createObjectStore(PROJECT_STORE, {keyPath: 'id'});
                }
                if (!db.objectStoreNames.contains(ASSET_STORE)) {
                    db.createObjectStore(ASSET_STORE, {keyPath: 'uri'});
                }
            },
        });
    }

    return dbPromise;
}

/** Test helper. */
export async function resetEditorDb() {
    if (dbPromise) {
        const db = await dbPromise;
        db.close();
        dbPromise = null;
    }
    if (isIndexedDbAvailable()) {
        await new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
        });
    }
}
