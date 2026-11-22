import { describe, expect, test } from 'vitest';

import { countBookEntries, resolveEmbeddedCard } from './cardPng';

function makeEmbeddedChunk(keyword, options = {}) {
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
        expect(countBookEntries(makeEmbeddedChunk('chara', { entryCount: 5 }))).toBe(5);
    });

    test('treats a missing book as zero entries', () => {
        expect(countBookEntries(makeEmbeddedChunk('chara'))).toBe(0);
    });

    test.each([
        ['a null payload', { data: null, keyword: 'chara' }],
        ['an empty payload', { data: {}, keyword: 'chara' }],
        ['a non-array entries field', makeEmbeddedChunk('chara', { book: { entries: 'unexpected array' } })],
        ['an undefined chunk', undefined],
    ])('returns zero for %s', (_label, chunk) => {
        expect(countBookEntries(chunk)).toBe(0);
    });
});

describe('embedded card resolution', () => {
    test.each([
        [[]],
        [null],
        [[null, {}, { data: null, keyword: 'ccv3' }]],
    ])('returns an empty result for unusable input', (chunks) => {
        expect(resolveEmbeddedCard(chunks)).toEqual({
            candidates: [],
            needsChoice: false,
            selected: null,
            warnings: [],
        });
    });

    test('returns a single available chunk', () => {
        const candidate = makeEmbeddedChunk('chara', { entryCount: 0 });
        expect(resolveEmbeddedCard([candidate]).selected).toBe(candidate);
    });

    describe('keyword precedence', () => {
        test('prefers ccv3 over chara in either order', () => {
            const chara = makeEmbeddedChunk('chara', { entryCount: 5 });
            const ccv3 = makeEmbeddedChunk('ccv3', { entryCount: 5 });

            expect(resolveEmbeddedCard([chara, ccv3]).selected).toBe(ccv3);
            expect(resolveEmbeddedCard([ccv3, chara]).selected).toBe(ccv3);
        });

        test('follows CCv3 precedence even when chara is richer', () => {
            const ccv3 = makeEmbeddedChunk('ccv3', { entryCount: 10 });
            const chara = makeEmbeddedChunk('chara', { entryCount: 57 });
            const result = resolveEmbeddedCard([ccv3, chara]);

            expect(result.selected).toBe(ccv3);
            expect(codes(result)).toContain('CHARA_RICHER_THAN_CCV3');
        });

        test('ignores chunks with unrelated keywords', () => {
            const other = makeEmbeddedChunk('Software', { entryCount: 100 });
            const chara = makeEmbeddedChunk('chara', { entryCount: 1 });

            expect(resolveEmbeddedCard([other, chara]).selected).toBe(chara);
        });
    });

    describe('richness and tie-breaking', () => {
        test('keeps the richer chunk within the same keyword', () => {
            const sparse = makeEmbeddedChunk('chara', { entryCount: 0 });
            const rich = makeEmbeddedChunk('chara', { entryCount: 49 });

            expect(resolveEmbeddedCard([sparse, rich]).selected).toBe(rich);
            expect(resolveEmbeddedCard([rich, sparse]).selected).toBe(rich);
        });

        test('keeps the first chunk when counts tie', () => {
            const first = makeEmbeddedChunk('chara', { entryCount: 3, name: 'first' });
            const second = makeEmbeddedChunk('chara', { entryCount: 3, name: 'second' });

            expect(resolveEmbeddedCard([first, second]).selected).toBe(first);
        });

        test('takes the richer ccv3 chunk and notes the duplicates', () => {
            const sparse = makeEmbeddedChunk('ccv3', { entryCount: 2, name: 'sparse' });
            const rich = makeEmbeddedChunk('ccv3', { entryCount: 6, name: 'rich' });
            const result = resolveEmbeddedCard([sparse, rich]);

            expect(result.selected).toBe(rich);
            expect(codes(result)).toContain('MULTIPLE_CCV3');
            expect(result.warnings.find((warning) => warning.code === 'MULTIPLE_CCV3').message).toContain('2 ccv3 chunks');
        });
    });

    describe('choice and warnings', () => {
        test('does not ask for a choice when both copies carry the same data', () => {
            const ccv3 = makeEmbeddedChunk('ccv3', { entryCount: 3, name: 'Same' });
            const chara = makeEmbeddedChunk('chara', { entryCount: 3, name: 'Same' });
            const result = resolveEmbeddedCard([ccv3, chara]);

            expect(result.selected).toBe(ccv3);
            expect(result.needsChoice).toBe(false);
            expect(result.warnings).toEqual([]);
        });

        test('ignores key order when both copies carry the same data', () => {
            const ccv3 = {
                data: { data: { description: 'Same', name: 'Same' } },
                keyword: 'ccv3',
            };
            const chara = {
                data: { data: { name: 'Same', description: 'Same' } },
                keyword: 'chara',
            };

            expect(resolveEmbeddedCard([ccv3, chara]).needsChoice).toBe(false);
        });

        test('asks for a choice when the copies differ', () => {
            const ccv3 = makeEmbeddedChunk('ccv3', { entryCount: 3, name: 'V3 name' });
            const chara = makeEmbeddedChunk('chara', { entryCount: 9, name: 'V2 name' });
            const result = resolveEmbeddedCard([ccv3, chara]);

            expect(result.selected).toBe(ccv3);
            expect(result.needsChoice).toBe(true);
            expect(result.candidates).toHaveLength(2);
            expect(result.candidates.map((candidate) => candidate.keyword)).toEqual(['ccv3', 'chara']);
        });

        test('warns when only a V2 chara chunk exists', () => {
            const chara = makeEmbeddedChunk('chara', { entryCount: 2 });
            const result = resolveEmbeddedCard([chara]);

            expect(result.selected).toBe(chara);
            expect(result.needsChoice).toBe(false);
            expect(codes(result)).toContain('ONLY_CHARA');
        });
    });
});
