import detectCardFormat from './detectCardFormat';
import { emptyCard } from './emptyCard';

describe('detectCardFormat', () => {
    test('accepts current V3 cards without warnings', () => {
        const card = emptyCard();
        card.data.name = 'Current';
        const result = detectCardFormat(card);

        expect(result.kind).toBe('v3');
        expect(result.specVersion).toBe(3.0);
        expect(result.warnings).toEqual([]);
    });

    test('accepts a newer V3 version but warns', () => {
        const card = emptyCard();
        card.data.name = 'Future';
        card.spec_version = '3.1';
        const result = detectCardFormat(card);

        expect(result.kind).toBe('v3');
        expect(result.warnings.map((warning) => warning.code)).toContain('SPEC_VERSION_NEWER');
    });

    test('detects V2 cards', () => {
        const result = detectCardFormat({spec: 'chara_card_v2', spec_version: '2.0', data: {name: 'V2'}});
        expect(result.kind).toBe('v2');
        expect(result.warnings.map((warning) => warning.code)).toContain('V2_CARD');
    });

    test('treats a card with no spec as legacy', () => {
        const result = detectCardFormat({data: {name: 'Legacy'}});
        expect(result.kind).toBe('legacy-v2');
        expect(result.warnings.map((warning) => warning.code)).toContain('LEGACY_CARD');
    });

    test('identifies standalone lorebooks and invalid inputs', () => {
        expect(detectCardFormat({spec: 'lorebook_v3', data: {entries: []}}).kind).toBe('lorebook');
        expect(detectCardFormat(null).kind).toBe('invalid');
        expect(detectCardFormat({spec: 'chara_card_v3'}).kind).toBe('invalid');
        expect(detectCardFormat({spec: 'chara_card_v3', data: {}}).kind).toBe('invalid');
    });

    test('explains why an input cannot be read as a card', () => {
        expect(detectCardFormat(null).error).toBe('Cannot read this file: a character card must be a JSON object.');
        expect(detectCardFormat({spec: 'lorebook_v3'}).error).toBe('This is a lorebook file, not a character card.');
        expect(detectCardFormat({spec: 'chara_card_v3'}).error).toBe('Cannot read this file: the card has no data object.');
        expect(detectCardFormat({spec: 'chara_card_v3', data: {}}).error)
            .toBe('Cannot read this file: the card does not define a name.');
    });
});
