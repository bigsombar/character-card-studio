import { ASSET_STORE, openEditorDb } from './db';

/**
 * @typedef {{
 *   uri: string,
 *   blob: Blob,
 *   thumb?: Blob,
 *   mime: string,
 *   size: number,
 *   ext: string,
 *   mediaKind: string,
 *   name: string,
 *   updatedAt: number
 * }} AssetRecord
 */

export async function putAsset(record) {
    const db = await openEditorDb();
    const stored = {...record, updatedAt: Date.now()};
    await db.put(ASSET_STORE, stored);
    return stored;
}

export async function getAsset(uri) {
    const db = await openEditorDb();
    return db.get(ASSET_STORE, uri);
}

export async function deleteAsset(uri) {
    const db = await openEditorDb();
    await db.delete(ASSET_STORE, uri);
}

export async function deleteAssets(uris) {
    const db = await openEditorDb();
    const tx = db.transaction(ASSET_STORE, 'readwrite');
    await Promise.all([...uris].map((uri) => tx.store.delete(uri)));
    await tx.done;
}

/** All stored asset records; used to reconnect a re-imported card with media saved earlier. */
export async function listAssets() {
    const db = await openEditorDb();
    return db.getAll(ASSET_STORE);
}

export async function listAssetUris() {
    const db = await openEditorDb();
    return db.getAllKeys(ASSET_STORE);
}

export async function clearAssets() {
    const db = await openEditorDb();
    await db.clear(ASSET_STORE);
}

export async function clearOrphanAssets(card) {
    const keep = new Set((card?.data?.assets ?? []).map((asset) => asset.uri));
    const uris = await listAssetUris();
    const orphans = uris.filter((uri) => !keep.has(uri));
    if (orphans.length > 0) await deleteAssets(orphans);
    return orphans;
}

export async function getStorageEstimate() {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    try {
        return await navigator.storage.estimate();
    } catch {
        return null;
    }
}
