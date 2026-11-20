import { describe, expect, test } from 'vitest';

import selectPreferredCardChunk, { countLorebookEntries, selectImportChunk } from './cardPngIO';

function makeChunk(keyword, options = {}) {
    const { book, entryCount, name = keyword } = options;
    let characterBook = book;

    if (typeof characterBook === 'undefined' && typeof entryCount === 'number') {
        characterBook = {
            entries: Array.from({ length: entryCount }, (_, index) => ({ id: index })),
        };
    }

    return {
        data: { data: { character_book: characterBook, name } },
        keyword,
    };
}

const codes = (result) => result.warnings.map((warning) => warning.code);

describe('lorebook entry counting', () => {
    test('counts the entries in a populated book', () => {
        expect(countLorebookEntries(makeChunk('chara', { entryCount: 5 }))).toBe(5);
    });

    test('treats a missing book as zero entries', () => {
        expect(countLorebookEntries(makeChunk('chara'))).toBe(0);
    });

    test.each([
        ['a null payload', { data: null, keyword: 'chara' }],
        ['an empty payload', { data: {}, keyword: 'chara' }],
        ['a non-array entries field', makeChunk('chara', { book: { entries: 'not an array' } })],
        ['an undefined chunk', undefined],
    ])('returns zero for %s', (_label, chunk) => {
        expect(countLorebookEntries(chunk)).toBe(0);
    });
});

describe('card chunk selection', () => {
    test.each([
        [[]],
        [null],
        [[null, {}, { data: null, keyword: 'ccv3' }]],
    ])('returns an empty result for unusable input', (chunks) => {
        expect(selectImportChunk(chunks)).toEqual({ chunk: null, warnings: [] });
    });

    test('returns a single available chunk', () => {
        const candidate = makeChunk('chara', { entryCount: 0 });
        expect(selectPreferredCardChunk([candidate])).toBe(candidate);
    });

    describe('keyword precedence', () => {
        test('prefers ccv3 over chara in either order', () => {
            const chara = makeChunk('chara', { entryCount: 5 });
            const ccv3 = makeChunk('ccv3', { entryCount: 5 });

            expect(selectPreferredCardChunk([chara, ccv3])).toBe(ccv3);
            expect(selectPreferredCardChunk([ccv3, chara])).toBe(ccv3);
        });

        test('follows CCv3 precedence even when chara is richer', () => {
            const ccv3 = makeChunk('ccv3', { entryCount: 10 });
            const chara = makeChunk('chara', { entryCount: 57 });
            const result = selectImportChunk([ccv3, chara]);

            expect(result.chunk).toBe(ccv3);
            expect(codes(result)).toContain('CHARA_RICHER_THAN_CCV3');
        });

        test('ignores chunks with unrelated keywords', () => {
            const other = makeChunk('Software', { entryCount: 100 });
            const chara = makeChunk('chara', { entryCount: 1 });

            expect(selectPreferredCardChunk([other, chara])).toBe(chara);
        });
    });

    describe('richness and tie-breaking', () => {
        test('keeps the richer chunk within the same keyword', () => {
            const sparse = makeChunk('chara', { entryCount: 0 });
            const rich = makeChunk('chara', { entryCount: 49 });

            expect(selectPreferredCardChunk([sparse, rich])).toBe(rich);
            expect(selectPreferredCardChunk([rich, sparse])).toBe(rich);
        });

        test('keeps the first chunk when counts tie', () => {
            const first = makeChunk('chara', { entryCount: 3, name: 'first' });
            const second = makeChunk('chara', { entryCount: 3, name: 'second' });

            expect(selectPreferredCardChunk([first, second])).toBe(first);
        });

        test('takes the richer ccv3 chunk and notes the duplicates', () => {
            const sparse = makeChunk('ccv3', { entryCount: 2, name: 'sparse' });
            const rich = makeChunk('ccv3', { entryCount: 6, name: 'rich' });
            const result = selectImportChunk([sparse, rich]);

            expect(result.chunk).toBe(rich);
            expect(codes(result)).toContain('MULTIPLE_CCV3');
            expect(result.warnings.find((warning) => warning.code === 'MULTIPLE_CCV3').message).toContain('2 ccv3 chunks');
        });
    });

    describe('warnings', () => {
        test('accepts the standard single ccv3 + chara pair silently', () => {
            const ccv3 = makeChunk('ccv3', { entryCount: 3 });
            const chara = makeChunk('chara', { entryCount: 3 });

            expect(selectPreferredCardChunk([ccv3, chara])).toBe(ccv3);
            expect(selectImportChunk([ccv3, chara]).warnings).toEqual([]);
        });

        test('warns when only a V2 chara chunk exists', () => {
            const chara = makeChunk('chara', { entryCount: 2 });
            const result = selectImportChunk([chara]);

            expect(result.chunk).toBe(chara);
            expect(codes(result)).toContain('ONLY_CHARA');
        });
    });
});
