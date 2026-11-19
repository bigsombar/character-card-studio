import { describe, expect, test } from 'vitest';

import formatBytes from './formatBytes';

const KIB = 1024;
const MIB = KIB * KIB;

describe('formatBytes', () => {
    test.each([
        [0, '0 B'],
        [1, '1 B'],
        [1023, '1023 B'],
        [1.5 * KIB, '1.5 KB'],
        [4 * KIB, '4.0 KB'],
        [10 * KIB, '10 KB'],
        [200 * KIB, '200 KB'],
        [950 * KIB, '950 KB'],
        [MIB - 1, '1.00 MB'],
        [MIB, '1.00 MB'],
        [1.5 * MIB, '1.50 MB'],
        [3.456 * MIB, '3.46 MB'],
        [12.5 * MIB, '12.50 MB'],
    ])('renders %p bytes as %p', (bytes, expected) => {
        expect(formatBytes(bytes)).toBe(expected);
    });

    test('falls back to zero for values that are not usable sizes', () => {
        expect(formatBytes(-1)).toBe('0 B');
        expect(formatBytes(Number.NaN)).toBe('0 B');
        expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
        expect(formatBytes(undefined)).toBe('0 B');
    });
});
