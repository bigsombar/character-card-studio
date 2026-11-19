import { openEditorDb, PROJECT_STORE } from './db';

const PROJECT_ID = 'current';

export async function loadProject() {
    const db = await openEditorDb();
    return db.get(PROJECT_STORE, PROJECT_ID);
}

export async function saveProject(card) {
    const db = await openEditorDb();
    const record = {
        id: PROJECT_ID,
        card,
        schemaVersion: 1,
        updatedAt: Date.now(),
    };
    await db.put(PROJECT_STORE, record);
    return record;
}

export async function clearProject() {
    const db = await openEditorDb();
    await db.delete(PROJECT_STORE, PROJECT_ID);
}
