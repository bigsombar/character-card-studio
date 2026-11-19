import { describe, expect, test } from 'vitest';

import exportV3Png from './pngExport';
import { parsePngChunks } from '../png/cardPngIO';
import { sampleCard } from '../test/cardFixtures';
import { createBlankPng, pngDataUrl } from '../test/pngFixtures';

const BLANK_PNG_DATA_URL = pngDataUrl(createBlankPng());

function pngExportCard() {
    return sampleCard({
        name: 'PNG Export',
        assets: [
            {type: 'icon', name: 'main', ext: 'png', uri: 'embeded://assets/icon/images/main.png'},
            {type: 'x_video', name: 'clip', ext: 'mp4', uri: 'embeded://assets/x_video/video/clip.mp4'},
        ],
    });
}

describe('exportV3Png', () => {
    test('keeps the main icon as ccdefault and embeds only ccv3', async () => {
        const result = await exportV3Png(pngExportCard(), BLANK_PNG_DATA_URL);
        const parsed = await parsePngChunks(
            new File([result.blob], 'card.png', {type: 'image/png'}),
            ['ccv3', 'chara'],
        );

        expect(parsed.chunks.map((chunk) => chunk.keyword)).toEqual(['ccv3']);
        expect(parsed.chunks[0].data.data.assets).toEqual([
            {type: 'icon', name: 'main', ext: 'png', uri: 'ccdefault:'},
        ]);
        expect(result.warnings.map((warning) => warning.code)).toContain('PNG_ASSETS_OMITTED');
        expect(new Uint8Array(await result.blob.slice(0, 8).arrayBuffer())).toEqual(
            new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        );
    });
});
