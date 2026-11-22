import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AssetProvider, useAssets } from './AssetContext';
import { CardStoreProvider } from './CardStoreProvider';
import { useCardStore } from './cardStoreContext';
import { resetEditorDb } from '../storage/db';
import { getAsset, putAsset } from '../storage/assetStore';
import { compressImageAssets as compressStoredImageAssets } from '../assets/assetCompression';
import { makePngFixture, pngFixtureDataUrl } from '../test/pngTestKit';

const BLANK_PNG_DATA_URL = pngFixtureDataUrl(makePngFixture());

vi.mock('../assets/thumbnails', () => ({
    createThumbnail: vi.fn().mockResolvedValue(null),
}));

vi.mock('../assets/assetCompression', () => ({
    compressImageAssets: vi.fn(),
}));

function wrapper({children}) {
    return (
        <CardStoreProvider>
            <AssetProvider>{children}</AssetProvider>
        </CardStoreProvider>
    );
}

function pngFixtureFile(name = 'avatar.png') {
    return new File([new Uint8Array([1, 2, 3, 4])], name, {type: 'image/png'});
}

describe('AssetProvider', () => {
    beforeEach(async () => {
        localStorage.clear();
        await resetEditorDb();
    });

    test('adds an asset to the card and IndexedDB, then deletes it', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});

        await waitFor(() => expect(result.current.assets).toBeDefined());

        await act(async () => {
            await result.current.assets.addFile(pngFixtureFile(), {type: 'icon', name: 'main', main: true});
        });

        await waitFor(() => {
            expect(result.current.card.cardData.data.assets).toHaveLength(1);
        });

        const asset = result.current.card.cardData.data.assets[0];
        expect(asset).toMatchObject({type: 'icon', name: 'main', ext: 'png'});
        expect(asset.uri).toMatch(/^embeded:\/\/assets\/icon\/images\/main/);
        expect(await getAsset(asset.uri)).toBeTruthy();

        await act(async () => {
            await result.current.assets.deleteAsset(asset.uri);
        });

        await waitFor(() => {
            expect(result.current.card.cardData.data.assets ?? []).toHaveLength(0);
        });
        expect(await getAsset(asset.uri)).toBeUndefined();
    });

    test('ingests data URL assets into IndexedDB', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        const card = {
            spec: 'chara_card_v3',
            spec_version: '3.0',
            data: {
                name: 'Data URL',
                assets: [{
                    type: 'icon',
                    name: 'main',
                    ext: 'png',
                    uri: BLANK_PNG_DATA_URL,
                }],
            },
        };

        const ingested = await result.current.assets.ingestCardAssets(card);
        expect(ingested.data.assets[0].uri).toMatch(/^embeded:\/\//);
        expect(await getAsset(ingested.data.assets[0].uri)).toBeTruthy();
    });

    test('compresses image assets and refreshes asset URLs only when something changed', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        await act(async () => {
            await result.current.assets.addFile(pngFixtureFile(), {type: 'icon', name: 'main', main: true});
        });
        await waitFor(() => expect(result.current.card.cardData.data.assets).toHaveLength(1));

        const assets = result.current.card.cardData.data.assets;
        const versionBefore = result.current.assets.assetVersion;

        compressStoredImageAssets.mockResolvedValue({
            failed: [],
            resized: [{ name: 'avatar', uri: assets[0].uri }],
            savedBytes: 128,
            skipped: [],
            total: 1,
        });

        let summary;
        await act(async () => {
            summary = await result.current.assets.compressImageAssets(1, {onProgress: vi.fn()});
        });

        expect(compressStoredImageAssets).toHaveBeenCalledWith(assets, 1, expect.any(Object));
        expect(summary.resized).toHaveLength(1);
        await waitFor(() => expect(result.current.assets.assetVersion).toBe(versionBefore + 1));

        compressStoredImageAssets.mockResolvedValue({
            failed: [],
            resized: [],
            savedBytes: 0,
            skipped: [{name: 'avatar', reason: 'small', uri: assets[0].uri}],
            total: 1,
        });

        await act(async () => {
            summary = await result.current.assets.compressImageAssets(0.5);
        });

        expect(summary.resized).toHaveLength(0);
        expect(result.current.assets.assetVersion).toBe(versionBefore + 1);
    });

    test('removes orphaned blobs without touching referenced assets', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        await act(async () => {
            await result.current.assets.addFile(pngFixtureFile('kept.png'), {type: 'icon', name: 'main', main: true});
        });

        const kept = result.current.card.cardData.data.assets[0];
        const orphanUri = 'embeded://assets/x_audio/audio/orphan.mp3';
        await putAsset({
            uri: orphanUri,
            blob: new Blob([new Uint8Array([1, 2, 3])], {type: 'audio/mpeg'}),
            mime: 'audio/mpeg',
            size: 3,
            ext: 'mp3',
            mediaKind: 'audio',
            name: 'orphan',
        });

        let removed;
        await act(async () => {
            removed = await result.current.assets.cleanOrphanAssets();
        });

        expect(removed).toContain(orphanUri);
        expect(await getAsset(orphanUri)).toBeUndefined();
        expect(await getAsset(kept.uri)).toBeTruthy();
    });

    test('stores a PNG portrait as a main icon when the card has no assets', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        const card = {spec: 'chara_card_v3', spec_version: '3.0', data: {name: 'PNG Portrait'}};
        let next;
        await act(async () => {
            next = await result.current.assets.ensureMainIcon(card, pngFixtureFile('card-portrait.png'));
        });

        expect(next.data.assets).toHaveLength(1);
        expect(next.data.assets[0]).toMatchObject({type: 'icon', name: 'main', ext: 'png'});
        expect(next.data.assets[0].uri).toMatch(/^embeded:\/\/assets\/icon\/images\/main/);
        expect(await getAsset(next.data.assets[0].uri)).toBeTruthy();

        let unchanged;
        await act(async () => {
            unchanged = await result.current.assets.ensureMainIcon(next, pngFixtureFile('second.png'));
        });
        expect(unchanged.data.assets).toHaveLength(1);
    });

    test('replaces a ccdefault main icon with the PNG image on import', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        const card = {
            spec: 'chara_card_v3',
            spec_version: '3.0',
            data: {
                name: 'PNG Default',
                assets: [{type: 'icon', name: 'main', ext: 'png', uri: 'ccdefault:', custom: 'kept'}],
            },
        };
        let next;
        await act(async () => {
            next = await result.current.assets.ensureMainIcon(card, pngFixtureFile('card-portrait.png'), {replace: true});
        });

        expect(next.data.assets).toHaveLength(1);
        expect(next.data.assets[0]).toMatchObject({
            type: 'icon',
            name: 'main',
            ext: 'png',
            custom: 'kept',
        });
        expect(next.data.assets[0].uri).toMatch(/^embeded:\/\/assets\/icon\/images\/main/);
        expect(await getAsset(next.data.assets[0].uri)).toBeTruthy();
    });
});
