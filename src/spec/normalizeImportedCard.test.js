import { describe, expect, test } from 'vitest';

import normalizeImportedCard, { normalizeCharacterBook } from './normalizeImportedCard';
import { createNewCard } from '../spec/emptyCard';
import { sampleBook, sampleCard, sampleEntry, sampleV2Card } from '../test/cardFixtures';

const warningCodes = (result) => (result.warnings ?? []).map((warning) => warning.code);

describe('card normalization', () => {
    describe('shape and required fields', () => {
        test('keeps a valid V3 card as V3', () => {
            const result = normalizeImportedCard(sampleCard({ name: 'Sample Hero' }));

            expect(result.ok).toBe(true);
            expect(result.cardData.data.name).toBe('Sample Hero');
            expect(result.cardData.spec).toBe('chara_card_v3');
            expect(result.cardData.spec_version).toBe('3.0');
        });

        test.each([[null], ['not a card'], [42], [[]], [true]])('rejects %p as a card', (input) => {
            expect(normalizeImportedCard(input).ok).toBe(false);
        });

        test('refuses a standalone lorebook', () => {
            const result = normalizeImportedCard({ data: sampleBook(), spec: 'lorebook_v3' });

            expect(result.ok).toBe(false);
            expect(result.error).toMatch(/lorebook/i);
        });

        test('requires a data object and a name', () => {
            expect(normalizeImportedCard({ spec: 'chara_card_v3' }).ok).toBe(false);

            const unnamed = sampleCard();
            delete unnamed.data.name;
            expect(normalizeImportedCard(unnamed).ok).toBe(false);
        });
    });

    describe('field coercion', () => {
        test('turns malformed strings into empty strings without losing numbers', () => {
            const card = sampleCard({ personality: null, scenario: 42 });
            delete card.data.description;

            const result = normalizeImportedCard(card);

            expect(result.ok).toBe(true);
            expect(result.cardData.data.description).toBe('');
            expect(result.cardData.data.personality).toBe('');
            expect(result.cardData.data.scenario).toBe('42');
        });

        test('fills a missing nickname with an empty string', () => {
            const card = sampleCard();
            delete card.data.nickname;

            const result = normalizeImportedCard(card);

            expect(result.ok).toBe(true);
            expect(result.cardData.data.nickname).toBe('');
        });

        test('repairs array fields and stringifies their elements', () => {
            const result = normalizeImportedCard(sampleCard({
                alternate_greetings: ['ok', 42, null],
                group_only_greetings: 'unexpected array',
                tags: null,
            }));

            expect(result.ok).toBe(true);
            expect(result.cardData.data.alternate_greetings).toEqual(['ok', '42', '']);
            expect(result.cardData.data.group_only_greetings).toEqual([]);
            expect(result.cardData.data.tags).toEqual([]);
        });
    });

    describe('V3 fields and upcasting', () => {
        test('normalizes a V2 card into V3 defaults', () => {
            const result = normalizeImportedCard(sampleV2Card({
                character_book: {
                    entries: [{ content: 'world', enabled: true, insertion_order: 0, keys: ['hello'] }],
                },
                description: 'V2 description',
                name: 'V2 Character',
            }));

            expect(result.ok).toBe(true);
            expect(result.cardData.spec).toBe('chara_card_v3');
            expect(result.cardData.spec_version).toBe('3.0');
            expect(result.cardData.data.group_only_greetings).toEqual([]);
            expect(result.cardData.data.nickname).toBe('');
            expect(result.cardData.data.extensions).toEqual({});
            expect(result.cardData.data.character_book.entries[0].use_regex).toBe(false);
            expect(result.cardData.data.character_book.entries[0].extensions).toEqual({});
            expect(warningCodes(result)).toEqual(expect.arrayContaining(['V2_CARD', 'V2_UPCAST']));
        });

        test('keeps a newer spec version and reports it', () => {
            const result = normalizeImportedCard(sampleCard({ name: 'Future' }, { spec_version: '3.1' }));

            expect(result.ok).toBe(true);
            expect(result.cardData.spec_version).toBe('3.1');
            expect(warningCodes(result)).toContain('SPEC_VERSION_NEWER');
        });

        test('normalizes source, timestamps, multilingual notes and assets', () => {
            const result = normalizeImportedCard(sampleCard({
                assets: [{ custom: 'kept', ext: '.PNG', name: 'main', type: 'icon', uri: 'ccdefault:' }],
                creation_date: '1700000000',
                creator_notes_multilingual: { EN: 'Hello', 'en-US': 42 },
                modification_date: 1700000000000,
                name: 'Normalize',
                source: 'https://example.com/card',
            }));
            const data = result.cardData.data;

            expect(data.source).toEqual(['https://example.com/card']);
            expect(data.creation_date).toBe(1700000000);
            expect(data.modification_date).toBe(1700000000);
            expect(data.creator_notes_multilingual.en).toBe('Hello');
            expect(data.creator_notes_multilingual['en-us']).toBe('42');
            expect(data.assets[0].ext).toBe('png');
            expect(data.assets[0].custom).toBe('kept');
            expect(warningCodes(result)).toEqual(
                expect.arrayContaining(['SOURCE_COERCED', 'MULTILINGUAL_INVALID_CODE']),
            );
            expect(warningCodes(result).filter((code) => code.startsWith('DATE_'))).toEqual([]);
        });

        test('reads ISO timestamps without adding date warnings', () => {
            const result = normalizeImportedCard(sampleCard({ creation_date: '2023-11-14T22:13:20Z' }));

            expect(result.cardData.data.creation_date).toBe(1700000000);
            expect(warningCodes(result).filter((code) => code.startsWith('DATE_'))).toEqual([]);
        });

        test('leaves unknown keys in place at both levels', () => {
            const result = normalizeImportedCard(sampleCard({ future_field: { keep: true }, name: 'Unknown' }, {
                future_top_level: 'keep',
            }));

            expect(result.cardData.future_top_level).toBe('keep');
            expect(result.cardData.data.future_field).toEqual({ keep: true });
        });

        test('creates a new card with a creation date', () => {
            const card = createNewCard();

            expect(typeof card.data.creation_date).toBe('number');
            expect(card.data.creation_date).toBeGreaterThan(0);
        });
    });

    describe('embedded lorebooks', () => {
        test('turns malformed book fields into safe defaults', () => {
            const result = normalizeImportedCard(sampleCard({ character_book: { entries: 'unexpected array', name: 'Book' } }));

            expect(result.ok).toBe(true);
            expect(result.cardData.data.character_book.entries).toEqual([]);
            expect(result.cardData.data.character_book.extensions).toEqual({});
        });

        test('normalizes entry fields and drops entries that are not objects', () => {
            const malformedEntry = sampleEntry({
                content: 42,
                enabled: 'yes',
                keys: 'unexpected-array',
                position: 'middle',
                use_regex: 'no',
            });
            const result = normalizeImportedCard(sampleCard({
                character_book: sampleBook({ entries: [malformedEntry, 'unexpected object', null] }),
            }));
            const normalized = result.cardData.data.character_book.entries[0];

            expect(result.ok).toBe(true);
            expect(result.cardData.data.character_book.entries).toHaveLength(1);
            expect(normalized.keys).toEqual([]);
            expect(normalized.content).toBe('42');
            expect(normalized.enabled).toBe(true);
            expect(normalized.use_regex).toBe(false);
            expect(normalized.position).toBeUndefined();
            expect(normalized.extensions).toEqual({});
        });
    });
});

describe('standalone lorebook normalization', () => {
    test.each([undefined, null, 'nope'])('returns undefined for %p', (input) => {
        expect(normalizeCharacterBook(input)).toBeUndefined();
    });

    test('adds CCv3 defaults to entries', () => {
        const result = normalizeCharacterBook(sampleBook({ entries: [{ content: 'hi' }] }));

        expect(result.entries[0]).toMatchObject({
            content: 'hi',
            enabled: true,
            extensions: {},
            insertion_order: 0,
            keys: [],
            use_regex: false,
        });
    });

    test('coerces entry keys and removes malformed entries', () => {
        const result = normalizeCharacterBook(sampleBook({
            entries: [sampleEntry({ keys: 'alpha, beta', content: 7 }), null, 'nope'],
        }));

        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].keys).toEqual([]);
        expect(result.entries[0].content).toBe('7');
    });
});
