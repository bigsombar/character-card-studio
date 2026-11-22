import { describe, expect, test } from 'vitest';

import removeEmphasisMarkup from './emphasis';

describe('removeEmphasisMarkup', () => {
    test.each([
        ['*smiles*', 'smiles'],
        ['**very**', 'very'],
        ['***both***', 'both'],
        ['a *small* pause', 'a small pause'],
        ['**bold** and *italic*', 'bold and italic'],
        ['*one*\n**two**', 'one\ntwo'],
    ])('removes paired markers: %s', (input, expected) => {
        expect(removeEmphasisMarkup(input)).toBe(expected);
    });

    test.each([
        ['2 * 3 * 4'],
        ['*unclosed'],
        ['**unclosed'],
        ['* padded *'],
        ['** padded **'],
        ['***'],
        [''],
        ['plain text'],
    ])('preserves text that is not paired emphasis: %s', (input) => {
        expect(removeEmphasisMarkup(input)).toBe(input);
    });

    test('leaves non-string input empty', () => {
        expect(removeEmphasisMarkup(undefined)).toBe('');
        expect(removeEmphasisMarkup(null)).toBe('');
    });
});
