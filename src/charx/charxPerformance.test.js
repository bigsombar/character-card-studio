import { Buffer } from 'node:buffer';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import exportCharx from './charxExport';
import importCharx from './charxImport';
import { resetEditorDb } from '../storage/db';
import { sampleCard } from '../test/cardFixtures';

globalThis.Blob = NodeBlob;

vi.mock('../assets/thumbnails', () => ({
    createThumbnail: vi.fn().mockResolvedValue(null),
}));

const LARGE_BYTES = 5 * 1024 * 1024;
const LARGE_PATH = 'assets/x_video/video/large.mp4';
const LARGE_DATA_URI = (() => {
    const bytes = new Uint8Array(LARGE_BYTES);
    for (let index = 0; index < bytes.length; index++) bytes[index] = index % 251;
    return `data:video/mp4;base64,${Buffer.from(bytes).toString('base64')}`;
})();

function largeCard() {
    return sampleCard({
        name: 'Large Asset',
        assets: [{ type: 'x_video', uri: LARGE_DATA_URI, name: 'large', ext: 'mp4' }],
    });
}

describe('CHARX large asset handling', () => {
    beforeEach(async () => {
        localStorage.clear();
        await resetEditorDb();
    });

    test('round-trips a multi-megabyte asset and reports progress', async () => {
        const progress = [];
        const started = performance.now();
        const exported = await exportCharx(largeCard(), {
            useWebWorkers: false,
            onProgress: (event) => progress.push(event),
        });
        const elapsed = performance.now() - started;

        expect(exported.card.data.assets[0].uri).toBe(`embeded://${LARGE_PATH}`);
        expect(exported.blob.size).toBeGreaterThanOrEqual(LARGE_BYTES);
        expect(progress.some((event) => event.phase === 'assets')).toBe(true);
        expect(progress.at(-1)?.phase).toBe('done');

        const imported = await importCharx(
            new File([await exported.blob.arrayBuffer()], 'large.charx', { type: 'application/zip' }),
            { useWebWorkers: false },
        );

        expect(imported.card.data.assets).toHaveLength(1);
        expect(imported.card.data.assets[0].uri).toBe(`embeded://${LARGE_PATH}`);
        expect(imported.entries.find((entry) => entry.path === LARGE_PATH)?.size).toBe(LARGE_BYTES);
        expect(elapsed).toBeLessThan(30_000);
    }, 90_000);
});
