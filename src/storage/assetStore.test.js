import { beforeEach, describe, expect, test } from 'vitest';

import { clearOrphanAssets, deleteAsset, getAsset, listAssetUris, putAsset } from './assetStore';
import { resetEditorDb } from './db';

function blob(size = 4) {
    return new Blob([new Uint8Array(size)], {type: 'image/png'});
}

describe('assetStore', () => {
    beforeEach(async () => {
        localStorage.clear();
        await resetEditorDb();
    });

    test('stores, reads, and deletes asset records', async () => {
        await putAsset({
            uri: 'embeded://assets/icon/images/main.png',
            blob: blob(),
            mime: 'image/png',
            size: 4,
            ext: 'png',
            mediaKind: 'image',
            name: 'main',
        });

        const record = await getAsset('embeded://assets/icon/images/main.png');
        expect(record.name).toBe('main');
        expect(record.size).toBe(4);

        await deleteAsset(record.uri);
        expect(await getAsset(record.uri)).toBeUndefined();
    });

    test('removes orphan assets not referenced by the card', async () => {
        await putAsset({uri: 'embeded://a.png', blob: blob(), mime: 'image/png', size: 4, ext: 'png', mediaKind: 'image', name: 'a'});
        await putAsset({uri: 'embeded://b.png', blob: blob(), mime: 'image/png', size: 4, ext: 'png', mediaKind: 'image', name: 'b'});

        const orphans = await clearOrphanAssets({
            data: {assets: [{uri: 'embeded://a.png'}]},
        });

        expect(orphans).toEqual(['embeded://b.png']);
        expect(await listAssetUris()).toEqual(['embeded://a.png']);
    });
});
