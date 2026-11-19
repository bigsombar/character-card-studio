import { describe, expect, test, vi } from 'vitest';

const storage = vi.hoisted(() => ({ record: null }));

vi.mock('../storage/assetStore', () => ({
    getAsset: async () => storage.record,
}));

import exportV3Json from './jsonExport';
import { sampleCard } from '../test/cardFixtures';
import { createBlankPng, pngBase64 } from '../test/pngFixtures';

const BLANK_PNG = pngBase64(createBlankPng());

function jsonCard(asset) {
    return sampleCard({
        name: 'JSON export',
        assets: asset ? [asset] : undefined,
    });
}

describe('exportV3Json', () => {
    test('keeps data URL assets and sets dates', async () => {
        const result = await exportV3Json(jsonCard({
            type: 'icon', name: 'main', ext: 'png', uri: `data:image/png;base64,${BLANK_PNG}`,
        }));
        const parsed = JSON.parse(await result.blob.text());

        expect(parsed.spec).toBe('chara_card_v3');
        expect(parsed.data.assets[0].uri.startsWith('data:image/png')).toBe(true);
        expect(parsed.data.creation_date).toBeTypeOf('number');
        expect(parsed.data.modification_date).toBeTypeOf('number');
    });

    test('warns when embeded URI is left non-inlined', async () => {
        const result = await exportV3Json(
            jsonCard({type: 'icon', name: 'main', ext: 'png', uri: 'embeded://assets/icon/images/main.png'}),
            {inlineAssets: false},
        );

        expect(result.warnings.map((warning) => warning.code)).toContain('JSON_EMBEDED_REFS');
    });

    test('inlines embeded text references as data URLs', async () => {
        const uri = 'embeded://assets/other/images/inline-text.png';
        const bytes = Uint8Array.from(atob(BLANK_PNG), (char) => char.charCodeAt(0));
        storage.record = {
            blob: new Blob([bytes], {type: 'image/png'}),
            size: bytes.length,
        };

        const card = jsonCard({type: 'other', name: 'inline-text', ext: 'png', uri});
        card.data.description = 'Look ![image](embeded://assets/other/images/inline-text.png)';
        const result = await exportV3Json(card);
        const parsed = JSON.parse(await result.blob.text());

        expect(parsed.data.description).toContain('data:image/png;base64,');
        expect(parsed.data.description).not.toContain('embeded://');
    });
});
