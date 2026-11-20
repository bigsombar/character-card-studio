import { describe, expect, test } from 'vitest';

import { assembleNewPng, crc32, parsePngChunks, stripPngChunks } from './cardPngIO';
import { sampleCard, sampleV2Card } from '../test/cardFixtures';
import {
    chunkTypes,
    createBlankPng,
    createMultiIdatPng,
    insertChunkBeforeIend,
    makeChunk,
    pngFile,
    textKeywords,
} from '../test/pngFixtures';

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
        const original = createBlankPng();

        const cleaned = await stripPngChunks(original);

        expect(Array.from(cleaned)).toEqual(Array.from(original));
    });

    test('removes tEXt chunks but keeps every image chunk', async () => {
        const original = createBlankPng();
        const withText = await assembleNewPng(original, [cardTextChunk('chara', { hello: 'world' })]);
        expect(chunkTypes(withText)).toContain('tEXt');

        const cleaned = await stripPngChunks(withText);

        expect(chunkTypes(cleaned)).not.toContain('tEXt');
        expect(chunkTypes(cleaned)).toEqual(chunkTypes(original));
    });

    test('removes only the requested card keywords', async () => {
        const withText = await assembleNewPng(createBlankPng(), [
            cardTextChunk('chara', sampleV2Card({ name: 'Legacy' })),
            cardTextChunk('Software', 'Some editor'),
        ]);
        expect(textKeywords(withText)).toEqual(['chara', 'Software']);

        const stripped = await stripPngChunks(withText, ['ccv3', 'chara']);

        expect(textKeywords(stripped)).toEqual(['Software']);
    });

    test('restores the exact image bytes after a round-trip with multiple IDAT chunks', async () => {
        const source = createMultiIdatPng();
        const assembled = await assembleNewPng(source, [
            cardTextChunk('ccv3', sampleCard({ name: 'V3 Character' })),
            cardTextChunk('chara', sampleV2Card({ name: 'V2 Character' })),
        ]);

        const stripped = await stripPngChunks(assembled, ['ccv3', 'chara']);

        expect(new Uint8Array(stripped)).toEqual(new Uint8Array(source));
    });
});

describe('assembling and parsing card chunks', () => {
    test('round-trips one embedded card', async () => {
        const card = sampleV2Card({ name: 'Test Character' });
        const assembled = await assembleNewPng(createBlankPng(), cardTextChunk('chara', card));

        const parsed = await parsePngChunks(pngFile(assembled), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings).toEqual([]);
    });

    test('round-trips several embedded cards in order', async () => {
        const v3 = sampleCard({ name: 'V3 Character' });
        const v2 = sampleV2Card({ name: 'V3 Character' });
        const assembled = await assembleNewPng(createBlankPng(), [
            cardTextChunk('ccv3', v3),
            cardTextChunk('chara', v2),
        ]);

        const parsed = await parsePngChunks(pngFile(assembled), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([
            { data: v3, keyword: 'ccv3' },
            { data: v2, keyword: 'chara' },
        ]);
    });

    test('keeps image data contiguous and writes each card chunk once', async () => {
        const source = createMultiIdatPng();
        expect(chunkTypes(source).filter((type) => type === 'IDAT')).toHaveLength(2);

        const assembled = await assembleNewPng(source, [
            cardTextChunk('ccv3', sampleCard({ name: 'V3 Character' })),
            cardTextChunk('chara', sampleV2Card({ name: 'V2 Character' })),
        ]);

        expect(chunkTypes(assembled)).toEqual(['IHDR', 'IDAT', 'IDAT', 'tEXt', 'tEXt', 'IEND']);
    });

    test('still embeds card data when IEND is missing', async () => {
        const full = new Uint8Array(createBlankPng());
        const withoutIend = full.slice(0, full.length - 12).buffer;

        const assembled = await assembleNewPng(withoutIend, [cardTextChunk('chara', sampleV2Card({ name: 'No IEND' }))]);

        expect(chunkTypes(assembled)).toEqual(['IHDR', 'IDAT', 'tEXt']);
    });

    test('returns no chunks when no keyword matches', async () => {
        const parsed = await parsePngChunks(pngFile(createBlankPng()), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([]);
        expect(parsed.warnings).toEqual([]);
    });

    test('skips tEXt chunks with unrelated keywords', async () => {
        const assembled = await assembleNewPng(createBlankPng(), [cardTextChunk('unrelated', { foo: 'bar' })]);

        const parsed = await parsePngChunks(pngFile(assembled), ['chara']);

        expect(parsed.chunks).toEqual([]);
    });

    test('uses the card keywords by default', async () => {
        const card = sampleCard({ name: 'Default keywords' });
        const assembled = await assembleNewPng(createBlankPng(), [
            cardTextChunk('ccv3', card),
            cardTextChunk('Software', 'Some editor'),
        ]);

        const parsed = await parsePngChunks(assembled);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'ccv3' }]);
        expect(parsed.warnings).toEqual([]);
    });

    test('reports an invalid signature through warnings', async () => {
        const parsed = await parsePngChunks(pngFile(new Uint8Array([1, 2, 3, 4])), ['ccv3']);

        expect(parsed.chunks).toEqual([]);
        expect(parsed.warnings[0].code).toBe('PNG_SIGNATURE_INVALID');
    });

    test('keeps a valid chara chunk when a ccv3 chunk is malformed', async () => {
        const fallback = sampleV2Card({ name: 'Fallback' });
        const assembled = await assembleNewPng(createBlankPng(), cardTextChunk('chara', fallback));
        const malformedCcv3 = makeChunk('tEXt', new TextEncoder().encode('ccv3\0not-valid-base64'));
        const corrupted = insertChunkBeforeIend(assembled, malformedCcv3);

        const parsed = await parsePngChunks(pngFile(corrupted), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([{ data: fallback, keyword: 'chara' }]);
        expect(parsed.warnings.map((warning) => warning.code)).toContain('CARD_CHUNK_INVALID');
    });
});

describe('unusual PNG input', () => {
    test('accepts a bare ArrayBuffer as well as a File', async () => {
        const card = sampleCard({ name: 'Buffer input' });
        const assembled = await assembleNewPng(createBlankPng(), cardTextChunk('ccv3', card));

        const parsed = await parsePngChunks(assembled, ['ccv3']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'ccv3' }]);
        expect(parsed.warnings).toEqual([]);
    });

    test('drops a chunk with a broken CRC but keeps the valid copy', async () => {
        const fallback = sampleV2Card({ name: 'CRC Check' });
        const assembled = await assembleNewPng(createBlankPng(), [
            cardTextChunk('ccv3', sampleCard({ name: 'CRC Check' })),
            cardTextChunk('chara', fallback),
        ]);
        const corrupted = new Uint8Array(assembled);
        const { length, offset } = locateTextChunk(corrupted.buffer, 'ccv3');
        corrupted[offset + 8 + length + 3] ^= 0xff;

        const parsed = await parsePngChunks(pngFile(corrupted), ['ccv3', 'chara']);

        expect(parsed.chunks).toEqual([{ data: fallback, keyword: 'chara' }]);
        const crcWarning = parsed.warnings.find((warning) => warning.code === 'PNG_CRC_MISMATCH');
        expect(crcWarning).toBeDefined();
        expect(crcWarning.message).toMatch(/byte \d+/);
    });

    test('ignores private ancillary chunks and keeps parsing', async () => {
        const card = sampleV2Card({ name: 'Private chunk' });
        const assembled = await assembleNewPng(createBlankPng(), cardTextChunk('chara', card));
        const withPrivate = insertChunkBeforeIend(
            assembled,
            makeChunk('prVt', new TextEncoder().encode('editor-specific metadata')),
        );

        const parsed = await parsePngChunks(pngFile(withPrivate), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings).toEqual([]);
        expect(chunkTypes(withPrivate)).toContain('prVt');
    });

    test('stops at an impossible chunk type and reports it', async () => {
        const card = sampleV2Card({ name: 'Bad type' });
        const assembled = await assembleNewPng(createBlankPng(), cardTextChunk('chara', card));
        const withInvalid = insertChunkBeforeIend(assembled, makeChunk('1BAD', new Uint8Array([1, 2, 3])));

        const parsed = await parsePngChunks(pngFile(withInvalid), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings.map((warning) => warning.code)).toContain('PNG_CHUNK_TYPE_INVALID');
    });

    test('reports a truncated tail and keeps earlier chunks', async () => {
        const card = sampleV2Card({ name: 'Truncated' });
        const assembled = await assembleNewPng(createBlankPng(), cardTextChunk('chara', card));
        const truncated = new Uint8Array(assembled).slice(0, assembled.byteLength - 5);

        const parsed = await parsePngChunks(pngFile(truncated), ['chara']);

        expect(parsed.chunks).toEqual([{ data: card, keyword: 'chara' }]);
        expect(parsed.warnings.map((warning) => warning.code)).toContain('PNG_CHUNK_TRUNCATED');
    });
});
