import { describe, expect, test } from 'vitest';

import { imageSourceToPngArrayBuffer } from './imageToPng';
import { createBlankPng, pngDataUrl } from '../test/pngFixtures';

const BLANK_PNG = pngDataUrl(createBlankPng());

describe('imageSourceToPngArrayBuffer', () => {
    test('returns PNG bytes unchanged', async () => {
        const buffer = await imageSourceToPngArrayBuffer(BLANK_PNG);
        expect(new Uint8Array(buffer)[0]).toBe(0x89);
        expect(new Uint8Array(buffer)[1]).toBe(0x50);
    });
});
