import { describe, expect, test } from 'vitest';

import {
    assembleNewPng,
    buildCardPng,
    buildOutgoingCard,
    cardDataChunkBytes,
    parsePngChunks,
    stripPngChunks,
} from './cardPngIO';
import { sampleCard, sampleV2Card } from '../test/cardFixtures';
import { createBlankPng, pngFile, textKeywords } from '../test/pngFixtures';

const sampleExportCard = (overrides = {}) => sampleCard({
    alternate_greetings: ['Hi', 'Hello'],
    creation_date: 1700000000,
    description: 'Multibyte text: café, 日本語, 🎭',
    name: 'Test Character',
    ...overrides,
});

describe('buildOutgoingCard', () => {
    test('produces a CCv3 object without mutating the live card', () => {
        const live = sampleExportCard();
        const snapshot = structuredClone(live);

        const outgoing = buildOutgoingCard(live, 1800000000);

        expect(outgoing.spec).toBe('chara_card_v3');
        expect(outgoing.spec_version).toBe('3.0');
        expect(outgoing).not.toHaveProperty('chara');
        expect(outgoing.data.creation_date).toBe(1700000000);
        expect(outgoing.data.modification_date).toBe(1800000000);
        expect(live).toEqual(snapshot);
    });

    test('stamps the creation date when the card has none', () => {
        const live = sampleExportCard();
        delete live.data.creation_date;

        expect(buildOutgoingCard(live, 1800000000).data.creation_date).toBe(1800000000);
    });

    test('does not downgrade a newer spec version', () => {
        const live = sampleExportCard();
        live.spec_version = '3.1';

        expect(buildOutgoingCard(live, 1800000000).spec_version).toBe('3.1');
    });
});

describe('buildCardPng', () => {
    test('writes a ccv3 chunk and never a legacy chara chunk', async () => {
        const png = await buildCardPng(createBlankPng(), sampleExportCard());

        const parsed = await parsePngChunks(pngFile(png), ['ccv3', 'chara']);

        expect(parsed.chunks.map((chunk) => chunk.keyword)).toEqual(['ccv3']);
        expect(parsed.chunks[0].data.spec).toBe('chara_card_v3');
    });

    test('matches the predicted size for multibyte card text', async () => {
        const card = sampleExportCard();
        const image = createBlankPng();
        const png = await buildCardPng(image, card);
        const imageOnly = (await stripPngChunks(image)).byteLength;

        expect(imageOnly + cardDataChunkBytes(card)).toBe(png.byteLength);
    });

    test('updates an existing card chunk in place instead of appending a copy', async () => {
        const withOldCard = await assembleNewPng(createBlankPng(), [
            { data: sampleCard({ name: 'Old copy' }), keyword: 'ccv3' },
            { data: sampleV2Card({ name: 'Old copy' }), keyword: 'chara' },
        ]);

        const png = await buildCardPng(withOldCard, sampleExportCard());
        const parsed = await parsePngChunks(pngFile(png), ['ccv3', 'chara']);

        expect(parsed.chunks.map((chunk) => chunk.keyword)).toEqual(['ccv3']);
        expect(parsed.chunks[0].data.data.name).toBe('Test Character');
    });

    test('leaves unrelated metadata such as Software untouched', async () => {
        const withSoftware = await assembleNewPng(createBlankPng(), [
            { data: 'Character Card Studio', keyword: 'Software' },
        ]);

        const png = await buildCardPng(withSoftware, sampleExportCard());

        expect(textKeywords(png)).toEqual(['Software', 'ccv3']);
    });
});
