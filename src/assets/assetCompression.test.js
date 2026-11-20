import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
    compressImageAssets,
    isCompressibleImageAsset,
    measureImageAssets,
    outputMimeForExtension,
    presetsForImages,
    readImageDimensions,
    resizeImageBlob,
} from './assetCompression';
import { getAsset, putAsset } from '../storage/assetStore';
import { createThumbnail } from './thumbnails';

vi.mock('../storage/assetStore', () => ({
    getAsset: vi.fn(),
    putAsset: vi.fn(),
}));

vi.mock('./thumbnails', () => ({
    createThumbnail: vi.fn(),
}));

const originalCreateImageBitmap = global.createImageBitmap;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;

function blob(bytes = 64) {
    return new Blob([new Uint8Array(bytes)], { type: 'image/png' });
}

function record(uri, bytes = 5000) {
    return {
        blob: blob(bytes),
        ext: 'png',
        mediaKind: 'image',
        mime: 'image/png',
        name: uri,
        size: bytes,
        uri,
    };
}

describe('asset compression helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createThumbnail.mockResolvedValue(null);

        global.createImageBitmap = vi.fn(async () => ({
            close: vi.fn(),
            height: 2000,
            width: 3000,
        }));
        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }));
        HTMLCanvasElement.prototype.toBlob = vi.fn(function toBlob(callback, mime) {
            callback(new Blob([new Uint8Array(256)], { type: mime }));
        });
    });

    afterEach(() => {
        global.createImageBitmap = originalCreateImageBitmap;
        HTMLCanvasElement.prototype.getContext = originalGetContext;
        HTMLCanvasElement.prototype.toBlob = originalToBlob;
    });

    test('accepts only formats the canvas can re-encode without changing the extension', () => {
        expect(isCompressibleImageAsset({ ext: 'png', uri: 'embeded://a.png' })).toBe(true);
        expect(isCompressibleImageAsset({ ext: 'jpg', uri: 'embeded://a.jpg' })).toBe(true);
        expect(isCompressibleImageAsset({ ext: 'jpeg', uri: 'embeded://a.jpeg' })).toBe(true);
        expect(isCompressibleImageAsset({ ext: 'webp', uri: 'embeded://a.webp' })).toBe(true);
        expect(isCompressibleImageAsset({ ext: 'gif', uri: 'embeded://a.gif' })).toBe(false);
        expect(isCompressibleImageAsset({ ext: 'avif', uri: 'embeded://a.avif' })).toBe(false);
        expect(isCompressibleImageAsset({ ext: 'mp3', uri: 'embeded://a.mp3' })).toBe(false);
        expect(isCompressibleImageAsset(null)).toBe(false);
    });

    test('maps extensions to matching canvas encoders', () => {
        expect(outputMimeForExtension('png')).toBe('image/png');
        expect(outputMimeForExtension('.jpg')).toBe('image/jpeg');
        expect(outputMimeForExtension('JPEG')).toBe('image/jpeg');
        expect(outputMimeForExtension('webp')).toBe('image/webp');
    });

    test('reads the decoded dimensions and releases the bitmap', async () => {
        const close = vi.fn();
        global.createImageBitmap = vi.fn(async () => ({ close, height: 2000, width: 3000 }));

        expect(await readImageDimensions(blob())).toEqual({ height: 2000, width: 3000 });
        expect(close).toHaveBeenCalled();
    });

    test('resizes to the snapped target and keeps the format', async () => {
        const resized = await resizeImageBlob(blob(), 1, 'png');

        expect(resized).toMatchObject({ height: 816, mime: 'image/png', width: 1232 });
    });

    test('returns null instead of upscaling or resizing by a no-op amount', async () => {
        global.createImageBitmap = vi.fn(async () => ({ close: vi.fn(), height: 896, width: 560 }));

        expect(await resizeImageBlob(blob(), 0.5, 'png')).toBeNull();
    });

    test('offers only presets that shrink at least one image', () => {
        expect(presetsForImages([{ height: 900, width: 700 }], [2, 1.5, 1, 0.5])).toEqual([0.5]);
        expect(presetsForImages([{ height: 896, width: 560 }], [2, 1.5, 1, 0.5])).toEqual([]);
    });

    test('measures local images and counts the rest as skipped', async () => {
        getAsset.mockImplementation(async (uri) => (
            uri === 'embeded://assets/icon/images/main.png' ? record(uri) : undefined
        ));

        const assets = [
            { ext: 'png', name: 'main', uri: 'embeded://assets/icon/images/main.png' },
            { ext: 'mp3', name: 'voice', uri: 'embeded://assets/x_audio/audio/voice.mp3' },
            { ext: 'png', name: 'remote', uri: 'https://example.com/remote.png' },
        ];

        const progress = [];
        expect(await measureImageAssets(assets, { onProgress: (value) => progress.push(value) })).toEqual({
            images: [{
                height: 2000,
                name: 'main',
                uri: 'embeded://assets/icon/images/main.png',
                width: 3000,
            }],
            skipped: 2,
        });
        expect(progress).toEqual([
            { checked: 1, total: 3 },
            { checked: 2, total: 3 },
            { checked: 3, total: 3 },
        ]);
    });

    test('resizes eligible images, leaves small ones alone and reports progress', async () => {
        const bigUri = 'embeded://assets/icon/images/main.png';
        const smallUri = 'embeded://assets/emotion/images/smile.png';
        const audioUri = 'embeded://assets/x_audio/audio/voice.mp3';
        const remoteUri = 'https://example.com/remote.png';

        global.createImageBitmap = vi.fn(async (source) => (
            source.size === 200
                ? { close: vi.fn(), height: 896, width: 560 }
                : { close: vi.fn(), height: 2000, width: 3000 }
        ));

        getAsset.mockImplementation(async (uri) => {
            if (uri === audioUri || uri === remoteUri) return undefined;
            if (uri === smallUri) return record(uri, 200);
            return record(uri, 5000);
        });

        const progress = [];
        const result = await compressImageAssets([
            { ext: 'png', name: 'main', uri: bigUri },
            { ext: 'png', name: 'smile', uri: smallUri },
            { ext: 'mp3', name: 'voice', uri: audioUri },
            { ext: 'png', name: 'remote', uri: remoteUri },
        ], 1, { onProgress: (value) => progress.push(value) });

        expect(result.resized).toHaveLength(1);
        expect(result.resized[0]).toMatchObject({ height: 816, name: 'main', uri: bigUri, width: 1232 });
        expect(result.skipped).toEqual(expect.arrayContaining([
            expect.objectContaining({ reason: 'small', uri: smallUri }),
            expect.objectContaining({ reason: 'unsupported', uri: audioUri }),
            expect.objectContaining({ reason: 'missing', uri: remoteUri }),
        ]));
        expect(result.failed).toEqual([]);
        expect(putAsset).toHaveBeenCalledTimes(1);
        expect(putAsset.mock.calls[0][0]).toMatchObject({ uri: bigUri, mime: 'image/png' });

        expect(progress[0]).toEqual({ asset: null, completed: 0, total: 4 });
        expect(progress.at(-1)).toMatchObject({ completed: 4, total: 4 });
    });

    test('continues with the remaining images when one cannot be decoded', async () => {
        global.createImageBitmap = vi.fn(async () => {
            throw new Error('broken image');
        });
        getAsset.mockImplementation(async (uri) => record(uri));

        const result = await compressImageAssets([
            { ext: 'png', name: 'broken', uri: 'embeded://assets/a.png' },
        ], 1);

        expect(result.failed).toEqual([
            expect.objectContaining({ message: 'broken image', name: 'broken' }),
        ]);
        expect(result.resized).toEqual([]);
        expect(putAsset).not.toHaveBeenCalled();
    });
});
