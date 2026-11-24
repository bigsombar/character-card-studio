import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

import exportCharx from './charxExport';
import importCharx from './charxImport';
import { resetEditorDb } from '../storage/db';
import { sampleCard } from '../test/cardFixtures';
import { makePngFixture, encodePngBase64 } from '../test/pngTestKit';

// zip.js BlobWriter mixes realms under jsdom on Node 22 and can stringify the archive.
// Use Node's Blob for this suite only; the app/browser always has one native Blob realm.
globalThis.Blob = NodeBlob;

vi.mock('../assets/thumbnails', () => ({
    createThumbnail: vi.fn().mockResolvedValue(null),
}));

const BLANK_PNG = encodePngBase64(makePngFixture());

function charxCard() {
    return sampleCard({
        name: 'CHARX Roundtrip',
        assets: [{
            type: 'icon',
            name: 'main',
            ext: 'png',
            uri: `data:image/png;base64,${BLANK_PNG}`,
        }],
    });
}

async function asFile(blob, name) {
    return new File([await blob.arrayBuffer()], name, {type: blob.type || 'application/zip'});
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds a deliberately malformed ZIP for security tests. zip.js refuses to write unsafe
 * names itself, so the bytes are assembled manually with the stored (uncompressed) method.
 */
function makeStoredZip(entries) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const [name, text] of entries) {
        const nameBytes = encoder.encode(name);
        const data = encoder.encode(text);
        const checksum = crc32(data);

        const local = new Uint8Array(30 + nameBytes.length);
        const localView = new DataView(local.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint32(14, checksum, true);
        localView.setUint32(18, data.length, true);
        localView.setUint32(22, data.length, true);
        localView.setUint16(26, nameBytes.length, true);
        local.set(nameBytes, 30);
        localParts.push(local, data);

        const central = new Uint8Array(46 + nameBytes.length);
        const centralView = new DataView(central.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint32(16, checksum, true);
        centralView.setUint32(20, data.length, true);
        centralView.setUint32(24, data.length, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralParts.push(central);

        offset += local.length + data.length;
    }

    const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);

    const parts = [...localParts, ...centralParts, end];
    const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let position = 0;
    for (const part of parts) {
        output.set(part, position);
        position += part.length;
    }
    return output;
}

describe('CHARX export/import', () => {
    beforeEach(async () => {
        localStorage.clear();
        await resetEditorDb();
    });

    test('round-trips card.json and an embedded icon asset', async () => {
        const exported = await exportCharx(charxCard(), {useWebWorkers: false});
        expect(exported.blob.size).toBeGreaterThan(0);
        expect(exported.card.data.assets[0].uri).toMatch(/^embeded:\/\/assets\/icon\/images\//);
        expect(exported.warnings).toEqual([]);

        const imported = await importCharx(
            await asFile(exported.blob, 'roundtrip.charx'),
            {useWebWorkers: false},
        );

        expect(imported.card.data.name).toBe('CHARX Roundtrip');
        expect(imported.card.data.assets).toHaveLength(1);
        expect(imported.card.data.assets[0].uri).toMatch(/^embeded:\/\/assets\/icon\/images\//);
    });

    test('warns and omits an embedded asset whose data is missing', async () => {
        const card = sampleCard({
            name: 'Missing asset',
            assets: [{type: 'icon', name: 'main', ext: 'png', uri: 'embeded://assets/icon/images/missing.png'}],
        });

        const exported = await exportCharx(card, {useWebWorkers: false});
        expect(exported.warnings.map((warning) => warning.code)).toContain('CHARX_ASSET_MISSING');
        expect(exported.card.data.assets).toBeUndefined();
    });

    test('rejects an archive without card.json', async () => {
        const blobWriter = new BlobWriter('application/zip');
        const writer = new ZipWriter(blobWriter, {useWebWorkers: false, useCompressionStream: false});
        await writer.add('readme.txt', new TextReader('not a card'));
        await writer.close();
        const blob = await blobWriter.getData();

        await expect(importCharx(
            await asFile(blob, 'bad.charx'),
            {useWebWorkers: false},
        )).rejects.toThrow(/card\.json/i);
    });

    test('rejects archives with unsafe entry paths', async () => {
        const bytes = makeStoredZip([
            ['card.json', JSON.stringify(charxCard())],
            ['../evil.txt', 'escape attempt'],
        ]);

        await expect(importCharx(
            new File([bytes], 'zip-slip.charx', {type: 'application/zip'}),
            {useWebWorkers: false},
        )).rejects.toThrow(/unsafe filename/i);
    });

    test('rejects encrypted archives', async () => {
        const blobWriter = new BlobWriter('application/zip');
        const writer = new ZipWriter(blobWriter, {useWebWorkers: false, useCompressionStream: false, password: 'secret'});
        await writer.add('card.json', new TextReader(JSON.stringify(charxCard())), {password: 'secret'});
        await writer.close();
        const blob = await blobWriter.getData();

        await expect(importCharx(
            await asFile(blob, 'encrypted.charx'),
            {useWebWorkers: false},
        )).rejects.toThrow(/encrypted/i);
    });

    test('rejects corrupt archives and invalid card.json', async () => {
        await expect(importCharx(
            new File([new Uint8Array([80, 75, 3, 4, 0, 0, 0])], 'corrupt.charx', {type: 'application/zip'}),
            {useWebWorkers: false},
        )).rejects.toThrow();

        const blobWriter = new BlobWriter('application/zip');
        const writer = new ZipWriter(blobWriter, {useWebWorkers: false, useCompressionStream: false});
        await writer.add('card.json', new TextReader('{not json'));
        await writer.close();
        const blob = await blobWriter.getData();

        await expect(importCharx(
            await asFile(blob, 'invalid-json.charx'),
            {useWebWorkers: false},
        )).rejects.toThrow(/not valid JSON/i);
    });
});
