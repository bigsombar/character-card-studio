import { afterEach, describe, expect, test, vi } from 'vitest';

import { portraitSourceToFile, readPortraitInfo } from './portraitCompression';
import { createBlankPng, pngDataUrl } from '../../test/pngFixtures';

vi.mock('browser-image-compression', () => ({
    default: {
        loadImage: vi.fn(async () => ({ naturalHeight: 20, naturalWidth: 10 })),
    },
}));

const BLANK_PNG = pngDataUrl(createBlankPng());

const originalFetch = global.fetch;

afterEach(() => {
    global.fetch = originalFetch;
});

describe('portraitSourceToFile', () => {
    test('reads base64 data URLs', async () => {
        const file = await portraitSourceToFile(BLANK_PNG);
        expect(file).toBeInstanceOf(File);
        expect(file.name).toBe('portrait.png');
        expect(file.type).toBe('image/png');
        expect(file.size).toBeGreaterThan(0);
    });

    test('reads blob URLs, which getFilefromDataUrl cannot parse', async () => {
        global.fetch = vi.fn(async () => ({
            ok: true,
            blob: async () => new Blob([new Uint8Array([1, 2, 3])], {type: 'image/webp'}),
        }));

        const file = await portraitSourceToFile('blob:http://localhost/portrait');
        expect(global.fetch).toHaveBeenCalledWith('blob:http://localhost/portrait');
        expect(file.name).toBe('portrait.png');
        expect(file.type).toBe('image/webp');
        expect(file.size).toBe(3);
    });

    test('surfaces unreadable sources as an error', async () => {
        global.fetch = vi.fn(async () => ({ok: false, status: 404}));
        await expect(portraitSourceToFile('https://example.com/missing.png')).rejects.toThrow(
            'The portrait image could not be loaded.',
        );
    });
});

describe('readPortraitInfo', () => {
    test('reports the decoded size and the source byte length', async () => {
        const info = await readPortraitInfo(BLANK_PNG);

        expect(info).toMatchObject({ dataUrl: BLANK_PNG, height: 20, width: 10 });
        expect(info.bytes).toBeGreaterThan(0);
    });
});
