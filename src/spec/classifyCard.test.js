import classifyCard from './classifyCard';
import { v3CardPrototype } from './cardPrototype';

describe('classifyCard', () => {
    test('accepts current V3 cards without warnings', () => {
        const card = v3CardPrototype();
        card.data.name = 'Current';
        const result = classifyCard(card);

        expect(result.kind).toBe('v3');
        expect(result.specVersion).toBe(3.0);
        expect(result.warnings).toEqual([]);
    });

    test('accepts a newer V3 version but warns', () => {
        const card = v3CardPrototype();
        card.data.name = 'Future';
        card.spec_version = '3.1';
        const result = classifyCard(card);

        expect(result.kind).toBe('v3');
        expect(result.warnings.map((warning) => warning.code)).toContain('SPEC_VERSION_NEWER');
    });

    test('detects V2 cards', () => {
        const result = classifyCard({spec: 'chara_card_v2', spec_version: '2.0', data: {name: 'V2'}});
        expect(result.kind).toBe('v2');
        expect(result.warnings.map((warning) => warning.code)).toContain('V2_CARD');
    });

    test('treats a card with no spec as legacy', () => {
        const result = classifyCard({data: {name: 'Legacy'}});
        expect(result.kind).toBe('legacy-v2');
        expect(result.warnings.map((warning) => warning.code)).toContain('LEGACY_CARD');
    });

    test('identifies standalone lorebooks and invalid inputs', () => {
        expect(classifyCard({spec: 'lorebook_v3', data: {entries: []}}).kind).toBe('lorebook');
        expect(classifyCard(null).kind).toBe('invalid');
        expect(classifyCard({spec: 'chara_card_v3'}).kind).toBe('invalid');
        expect(classifyCard({spec: 'chara_card_v3', data: {}}).kind).toBe('invalid');
    });
});
