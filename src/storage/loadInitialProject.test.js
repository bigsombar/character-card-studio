import { beforeEach, describe, expect, test } from 'vitest';

import loadInitialProject from './loadInitialProject';
import { getAsset } from './assetStore';
import { loadProject } from './projectStore';
import { resetEditorDb } from './db';
import { v3CardPrototype } from '../spec/cardPrototype';
import { createBlankPng, pngBase64 } from '../test/pngFixtures';

const BLANK_PNG = pngBase64(createBlankPng());

describe('loadInitialProject', () => {
    beforeEach(async () => {
        localStorage.clear();
        await resetEditorDb();
    });

    test('migrates the legacy localStorage card and preview into IndexedDB', async () => {
        const card = v3CardPrototype();
        card.data.name = 'Legacy Nora';
        localStorage.setItem('cardData', JSON.stringify(card));
        localStorage.setItem('previewImage', `data:image/png;base64,${BLANK_PNG}`);

        const loaded = await loadInitialProject();

        expect(loaded.card.data.name).toBe('Legacy Nora');
        expect(loaded.card.data.assets).toHaveLength(1);
        expect(loaded.card.data.assets[0]).toMatchObject({type: 'icon', name: 'main', ext: 'png'});

        const stored = await loadProject();
        expect(stored.card.data.name).toBe('Legacy Nora');
        expect(await getAsset(loaded.card.data.assets[0].uri)).toBeTruthy();
        expect(localStorage.getItem('cardData')).toBeNull();
        expect(localStorage.getItem('previewImage')).toBeNull();
    });

    test('returns null when there is no project and no legacy data', async () => {
        expect(await loadInitialProject()).toBeNull();
    });
});
