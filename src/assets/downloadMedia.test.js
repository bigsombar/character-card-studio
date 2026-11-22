import { afterEach, describe, expect, test, vi } from 'vitest';

import { downloadRemoteMedia, extensionFromMime, sniffExtension } from './downloadMedia';

const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const GIF_HEAD = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0]);
const MP4_HEAD = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);

const originalFetch = global.fetch;

afterEach(() => {
    global.fetch = originalFetch;
});

function responseWith(body, {contentType = 'image/png', contentLength = null, status = 200} = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: {
            get(name) {
                if (name === 'content-type') return contentType;
                if (name === 'content-length') return contentLength === null ? null : String(contentLength);
                return null;
            },
        },
        body: body
            ? {
                getReader() {
                    let sent = false;
                    return {
                        async read() {
                            if (sent) return {done: true};
                            sent = true;
                            return {done: false, value: body};
                        },
                        async cancel() {},
                        releaseLock() {},
                    };
                },
            }
            : null,
        async arrayBuffer() {
            return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
        },
    };
}

describe('sniffExtension', () => {
    test('detects common media signatures', () => {
        expect(sniffExtension(PNG_HEAD)).toBe('png');
        expect(sniffExtension(GIF_HEAD)).toBe('gif');
        expect(sniffExtension(MP4_HEAD)).toBe('mp4');
        expect(sniffExtension(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
        expect(sniffExtension(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe('webm');
    });

    test('returns an empty string for unknown data', () => {
        expect(sniffExtension(new Uint8Array([1, 2, 3, 4]))).toBe('');
    });
});

describe('extensionFromMime', () => {
    test('maps supported MIME types', () => {
        expect(extensionFromMime('image/png')).toBe('png');
        expect(extensionFromMime('audio/mpeg; codecs=mp3')).toBe('mp3');
        expect(extensionFromMime('video/webm')).toBe('webm');
        expect(extensionFromMime('text/html')).toBe('');
    });
});

describe('downloadRemoteMedia', () => {
    test('downloads media and reports progress', async () => {
        const progress = [];
        global.fetch = vi.fn(async () => responseWith(PNG_HEAD, {contentLength: PNG_HEAD.length}));

        const result = await downloadRemoteMedia('https://cdn.example.com/pic.png', {
            onProgress: (state) => progress.push(state),
        });

        expect(result).toMatchObject({ext: 'png', kind: 'image', size: PNG_HEAD.length, mime: 'image/png'});
        expect(result.blob.size).toBe(PNG_HEAD.length);
        expect(progress.at(-1)).toEqual({loaded: PNG_HEAD.length, total: PNG_HEAD.length});
    });

    test('trusts magic bytes over a misleading URL extension', async () => {
        global.fetch = vi.fn(async () => responseWith(GIF_HEAD, {contentType: 'application/octet-stream'}));
        const result = await downloadRemoteMedia('https://cdn.example.com/looks-like.png');
        expect(result.ext).toBe('gif');
        expect(result.kind).toBe('image');
    });

    test('rejects insecure HTTP links without fetching', async () => {
        global.fetch = vi.fn();
        await expect(downloadRemoteMedia('http://cdn.example.com/pic.png')).rejects.toThrow('Only HTTPS');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('rejects HTML pages and HTTP errors', async () => {
        global.fetch = vi.fn(async () => responseWith(PNG_HEAD, {contentType: 'text/html'}));
        await expect(downloadRemoteMedia('https://cdn.example.com/pic.png')).rejects.toMatchObject({
            code: 'HTML',
        });

        global.fetch = vi.fn(async () => responseWith(null, {status: 403}));
        await expect(downloadRemoteMedia('https://cdn.example.com/pic.png')).rejects.toMatchObject({
            code: 'HTTP',
            status: 403,
        });
    });

    test('uses a proxy URL and its lower size cap when requested', async () => {
        const proxy = {
            name: 'test proxy',
            maxBytes: 4,
            build: (url) => `https://proxy.example/?url=${encodeURIComponent(url)}`,
        };
        global.fetch = vi.fn(async () => responseWith(PNG_HEAD, {contentLength: PNG_HEAD.length}));

        await expect(downloadRemoteMedia('https://cdn.example.com/pic.png', {proxy})).rejects.toMatchObject({
            code: 'TOO_LARGE',
        });
        expect(global.fetch).toHaveBeenCalledWith(
            `https://proxy.example/?url=${encodeURIComponent('https://cdn.example.com/pic.png')}`,
            expect.objectContaining({credentials: 'omit'}),
        );
    });

    test('downloads through a proxy when it fits', async () => {
        const proxy = {
            name: 'test proxy',
            maxBytes: 1024 * 1024,
            build: (url) => `https://proxy.example/${url}`,
        };
        global.fetch = vi.fn(async () => responseWith(PNG_HEAD));
        const result = await downloadRemoteMedia('https://cdn.example.com/pic.png', {proxy});
        expect(result.ext).toBe('png');
    });

    test('rejects files larger than the media limit', async () => {
        global.fetch = vi.fn(async () => responseWith(PNG_HEAD, {
            contentLength: 25 * 1024 * 1024,
        }));
        await expect(downloadRemoteMedia('https://cdn.example.com/pic.png', {expectedKind: 'image'}))
            .rejects.toThrow('too large');
    });

    test('explains network and CORS failures', async () => {
        global.fetch = vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        });
        await expect(downloadRemoteMedia('https://cdn.example.com/pic.png')).rejects.toMatchObject({
            code: 'NETWORK',
        });
    });

    test('rejects unsupported file types', async () => {
        global.fetch = vi.fn(async () => responseWith(new Uint8Array([1, 2, 3, 4]), {
            contentType: 'application/octet-stream',
        }));
        await expect(downloadRemoteMedia('https://cdn.example.com/file.bin')).rejects.toThrow('not supported');
    });
});
