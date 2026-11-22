import { describe, expect, test } from 'vitest';

import { shrinksAt, targetDimensions } from './imageSizing';

describe('shrinksAt', () => {
    test('accepts targets that reduce at least one side', () => {
        expect(shrinksAt(3000, 2000, 1)).toBe(true);
        expect(shrinksAt(700, 900, 0.5)).toBe(true);
    });

    test('rejects targets that round back to the same dimensions', () => {
        expect(shrinksAt(560, 896, 0.5)).toBe(false);
        expect(shrinksAt(1232, 816, 1)).toBe(false);
    });

    test('rejects targets larger than the source instead of upscaling', () => {
        expect(shrinksAt(320, 240, 2)).toBe(false);
    });

    test('stays consistent with the dimensions the compressor draws into', () => {
        const target = targetDimensions(3000, 2000, 1);

        expect(target).toEqual({ height: 816, width: 1232 });
        expect(shrinksAt(3000, 2000, 1)).toBe(true);
    });
});
