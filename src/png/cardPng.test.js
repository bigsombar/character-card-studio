import { describe, expect, test } from 'vitest';

import { writePngTextPayloads, crc32, extractPngTextPayloads, dropPngTextPayloads } from './cardPng';
import { sampleCard, sampleV2Card } from '../test/cardFixtures';
import {
    collectChunkTypes,
    makePngFixture,
    makeMultiIdatPngFixture,
    insertFixtureChunkBeforeIend,
    encodeFixtureChunk,
    pngFixtureFile,
    collectTextKeywords,
} from '../test/pngTestKit';

function cardTextChunk(keyword, json) {
    return { data: json, keyword };
}

function locateTextChunk(arrayBuffer, keyword) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder();
    let cursor = 8;

    while (cursor + 8 <= bytes.length) {
        const length = view.getUint32(cursor);
        const type = decoder.decode(bytes.subarray(cursor + 4, cursor + 8));

        if (type === 'tEXt') {
            const payload = bytes.subarray(cursor + 8, cursor + 8 + length);
            const separator = payload.indexOf(0);
            if (decoder.decode(payload.subarray(0, separator)) === keyword) {
                return { length, offset: cursor };
            }
        }

        cursor += 12 + length;
    }

    throw new Error(`No ${keyword} chunk found`);
}

describe('crc32 checksum', () => {
    test('matches the standard PNG check value', () => {
        expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926);
    });
});

describe('stripping card chunks', () => {
    test('returns an image without tEXt chunks byte-for-byte', async () => {
        const original = makePngFixture();

        const cleaned = await dropPngTextPayloads(original);

        expect(Array.from(cleaned)).toEqual(Array.from(original));
    });

    test('removes tEXt chunks but keeps every image chunk', async () => {
        const original = makePngFixture();
        const pngWithText = await writePngTextPayloads(original, [cardTextChunk('chara', { hello: 'world' })]);
        expect(collectChunkTypes(pngWithText)).toContain('tEXt');

        const cleaned = await dropPngTextPayloads(pngWithText);

        expect(collectChunkTypes(cleaned)).not.toContain('tEXt');
        expect(collectChunkTypes(cleaned)).toEqual(collectChunkTypes(original));
    });

    test('removes only the requested card keywords', async () => {
        const pngWithText = await writePngTextPayloads(makePngFixture(), [
            cardTextChunk('chara', sampleV2Card({ name: 'Legacy' })),
            cardTextChunk('Software', 'Some editor'),
        ]);
        expect(collectTextKeywords(pngWithText)).toEqual(['chara', 'Software']);

        const stripped = await dropPngTextPayloads(pngWithText, ['ccv3', 'chara']);

        expect(collectTextKeywords(stripped)).toEqual(['Software']);
    });

    test('restores the exact image bytes after a round-trip with multiple IDAT chunks', async () => {
        const source = makeMultiIdatPngFixture();
        const assembled = await writePngTextPayloads(source, [
            cardTextChunk('ccv3', sampleCard({ name: 'V3 Character' })),
            cardTextChunk('chara', sampleV2Card({ name: 'V2 Character' })),
        ]);

        const stripped = await dropPngTextPayloads(assembled, ['ccv3', 'chara']);

        expect(new Uint8Array(stripped)).toEqual(new Uint8Array(source));
    });
});

describe('assembling and parsing card chunks', () => {
    test('round-trips one embedded card', async () => {
        const card = sampleV2Card({ name: 'Sample Hero' });
        const assembled = await writePngTextPayloads(makePngFixture(), cardTextChunk('chara', card));

        const parsed = await extractPngTextPayloads(pngFixtureFile(assembled), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings).toEqual([]);
    });

    test('round-trips several embedded cards in order', async () => {
        const v3 = sampleCard({ name: 'V3 Character' });
        const v2 = sampleV2Card({ name: 'V3 Character' });
        const assembled = await writePngTextPayloads(makePngFixture(), [
            cardTextChunk('ccv3', v3),
            cardTextChunk('chara', v2),
        ]);

        const parsed = await extractPngTextPayloads(pngFixtureFile(assembled), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([
            { data: v3, keyword: 'ccv3' },
            { data: v2, keyword: 'chara' },
        ]);
    });

    test('keeps image data contiguous and writes each card chunk once', async () => {
        const source = makeMultiIdatPngFixture();
        expect(collectChunkTypes(source).filter((type) => type === 'IDAT')).toHaveLength(2);

        const assembled = await writePngTextPayloads(source, [
            cardTextChunk('ccv3', sampleCard({ name: 'V3 Character' })),
            cardTextChunk('chara', sampleV2Card({ name: 'V2 Character' })),
        ]);

        expect(collectChunkTypes(assembled)).toEqual(['IHDR', 'IDAT', 'IDAT', 'tEXt', 'tEXt', 'IEND']);
    });

    test('still embeds card data when IEND is missing', async () => {
        const full = new Uint8Array(makePngFixture());
        const withoutIend = full.slice(0, full.length - 12).buffer;

        const assembled = await writePngTextPayloads(withoutIend, [cardTextChunk('chara', sampleV2Card({ name: 'No IEND' }))]);

        expect(collectChunkTypes(assembled)).toEqual(['IHDR', 'IDAT', 'tEXt']);
    });

    test('returns no chunks when no keyword matches', async () => {
        const parsed = await extractPngTextPayloads(pngFixtureFile(makePngFixture()), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([]);
        expect(parsed.warnings).toEqual([]);
    });

    test('skips tEXt chunks with unrelated keywords', async () => {
        const assembled = await writePngTextPayloads(makePngFixture(), [cardTextChunk('unrelated', { foo: 'bar' })]);

        const parsed = await extractPngTextPayloads(pngFixtureFile(assembled), ['chara']);

        expect(parsed.chunks).toEqual([]);
    });

    test('uses the card keywords by default', async () => {
        const card = sampleCard({ name: 'Default keywords' });
        const assembled = await writePngTextPayloads(makePngFixture(), [
            cardTextChunk('ccv3', card),
            cardTextChunk('Software', 'Some editor'),
        ]);

        const parsed = await extractPngTextPayloads(assembled);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'ccv3' }]);
        expect(parsed.warnings).toEqual([]);
    });

    test('reports an invalid signature through warnings', async () => {
        const parsed = await extractPngTextPayloads(pngFixtureFile(new Uint8Array([1, 2, 3, 4])), ['ccv3']);

        expect(parsed.chunks).toEqual([]);
        expect(parsed.warnings[0].code).toBe('PNG_SIGNATURE_INVALID');
    });

    test('keeps a valid chara chunk when a ccv3 chunk is malformed', async () => {
        const fallback = sampleV2Card({ name: 'Fallback' });
        const assembled = await writePngTextPayloads(makePngFixture(), cardTextChunk('chara', fallback));
        const malformedCcv3 = encodeFixtureChunk('tEXt', new TextEncoder().encode('ccv3\0not-valid-base64'));
        const corrupted = insertFixtureChunkBeforeIend(assembled, malformedCcv3);

        const parsed = await extractPngTextPayloads(pngFixtureFile(corrupted), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([{ data: fallback, keyword: 'chara' }]);
        expect(parsed.warnings.map((warning) => warning.code)).toContain('CARD_CHUNK_INVALID');
    });
});

describe('unusual PNG input', () => {
    test('accepts a bare ArrayBuffer as well as a File', async () => {
        const card = sampleCard({ name: 'Buffer input' });
        const assembled = await writePngTextPayloads(makePngFixture(), cardTextChunk('ccv3', card));

        const parsed = await extractPngTextPayloads(assembled, ['ccv3']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'ccv3' }]);
        expect(parsed.warnings).toEqual([]);
    });

    test('drops a chunk with a broken CRC but keeps the valid copy', async () => {
        const fallback = sampleV2Card({ name: 'CRC Check' });
        const assembled = await writePngTextPayloads(makePngFixture(), [
            cardTextChunk('ccv3', sampleCard({ name: 'CRC Check' })),
            cardTextChunk('chara', fallback),
        ]);
        const corrupted = new Uint8Array(assembled);
        const { length, offset } = locateTextChunk(corrupted.buffer, 'ccv3');
        corrupted[offset + 8 + length + 3] ^= 0xff;

        const parsed = await extractPngTextPayloads(pngFixtureFile(corrupted), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([{ data: fallback, keyword: 'chara' }]);
        const crcWarning = parsed.warnings.find((warning) => warning.code === 'PNG_CRC_MISMATCH');
        expect(crcWarning).toBeDefined();
        expect(crcWarning.message).toMatch(/byte \d+/);
    });

    test('ignores private ancillary chunks and keeps parsing', async () => {
        const card = sampleV2Card({ name: 'Private chunk' });
        const assembled = await writePngTextPayloads(makePngFixture(), cardTextChunk('chara', card));
        const withPrivate = insertFixtureChunkBeforeIend(
            assembled,
            encodeFixtureChunk('prVt', new TextEncoder().encode('editor-specific metadata')),
        );

        const parsed = await extractPngTextPayloads(pngFixtureFile(withPrivate), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings).toEqual([]);
        expect(collectChunkTypes(withPrivate)).toContain('prVt');
    });

    test('stops at an impossible chunk type and reports it', async () => {
        const card = sampleV2Card({ name: 'Bad type' });
        const assembled = await writePngTextPayloads(makePngFixture(), cardTextChunk('chara', card));
        const withInvalid = insertFixtureChunkBeforeIend(assembled, encodeFixtureChunk('1BAD', new Uint8Array([1, 2, 3])));

        const parsed = await extractPngTextPayloads(pngFixtureFile(withInvalid), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings.map((warning) => warning.code)).toContain('PNG_CHUNK_TYPE_INVALID');
    });

    test('reports a truncated tail and keeps earlier chunks', async () => {
        const card = sampleV2Card({ name: 'Truncated' });
        const assembled = await writePngTextPayloads(makePngFixture(), cardTextChunk('chara', card));
        const truncated = new Uint8Array(assembled).slice(0, assembled.byteLength - 5);

        const parsed = await extractPngTextPayloads(pngFixtureFile(truncated), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings.map((warning) => warning.code)).toContain('PNG_CHUNK_TRUNCATED');
    });
});
