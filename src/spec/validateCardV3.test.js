import normalizeCardV3 from './normalizeCardV3';
import validateCardV3 from './validateCardV3';
import { v3CardPrototype, v3CharacterBookEntryPrototype } from './cardPrototype';

function normalizedCard(overrides = {}) {
    const card = v3CardPrototype();
    card.data.name = 'Validation Test';
    return normalizeCardV3({...card, ...overrides}).cardData;
}

describe('validateCardV3', () => {
    test('accepts a normalized V3 card', () => {
        const result = validateCardV3(normalizedCard());
        expect(result.ok).toBe(true);
        expect(result.errors).toEqual([]);
    });

    test('reports missing name and required strings', () => {
        const card = normalizedCard();
        delete card.data.name;
        card.data.description = 42;
        const result = validateCardV3(card);

        expect(result.ok).toBe(false);
        expect(result.errors.map((error) => error.code)).toEqual(
            expect.arrayContaining(['NAME_INVALID', 'STRING_FIELD_INVALID']),
        );
    });

    test('reports invalid icon main rules', () => {
        const card = normalizedCard();
        card.data.assets = [
            {type: 'icon', uri: 'ccdefault:', name: 'one', ext: 'png'},
            {type: 'icon', uri: 'ccdefault:', name: 'two', ext: 'png'},
        ];
        const result = validateCardV3(card);

        expect(result.ok).toBe(false);
        expect(result.errors.map((error) => error.code)).toContain('ICON_MAIN_INVALID');
    });

    test('reports invalid regex keys as warnings', () => {
        const card = normalizedCard();
        const entry = v3CharacterBookEntryPrototype();
        entry.keys = ['[broken'];
        entry.use_regex = true;
        card.data.character_book = {extensions: {}, entries: [entry]};

        const result = validateCardV3(card);

        expect(result.ok).toBe(true);
        expect(result.warnings.map((warning) => warning.code)).toContain('REGEX_INVALID');
    });

    test('warns about a newer spec version', () => {
        const card = normalizedCard();
        card.spec_version = '3.1';
        const result = validateCardV3(card);

        expect(result.warnings.map((warning) => warning.code)).toContain('SPEC_VERSION_NEWER');
    });

    test('warns about custom asset types without the x_ prefix', () => {
        const card = normalizedCard();
        card.data.assets = [{type: 'video', uri: 'https://example.com/a.mp4', name: 'clip', ext: 'mp4'}];
        const result = validateCardV3(card);

        expect(result.ok).toBe(true);
        expect(result.warnings.map((warning) => warning.code)).toContain('ASSET_TYPE_CUSTOM');
    });
});
