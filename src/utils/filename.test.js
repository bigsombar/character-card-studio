import { describe, expect, test } from 'vitest';

import { safeFilename } from './filename';

describe('safeFilename', () => {
    test('keeps normal names and appends the extension', () => {
        expect(safeFilename('Nora Bennett', 'charx')).toBe('Nora Bennett.charx');
    });

    test('replaces path and reserved characters', () => {
        expect(safeFilename('a/b\\c:d*e?f"g<h>i|j', 'json')).toBe('a_b_c_d_e_f_g_h_i_j.json');
    });

    test('falls back when the name is empty', () => {
        expect(safeFilename('   ', 'png')).toBe('character-card-v3.png');
    });

    test('limits overly long names', () => {
        const filename = safeFilename('x'.repeat(300), 'json');
        expect(filename.length).toBeLessThanOrEqual(125);
        expect(filename.endsWith('.json')).toBe(true);
    });
});
