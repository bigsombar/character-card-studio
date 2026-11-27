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

    test('changes a local asset type, moves the blob and rewrites card references', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        let asset;
        await act(async () => {
            asset = await result.current.assets.addFile(
                pngFixtureFile('scene.png'),
                {type: 'other', name: 'scene'},
            );
        });
        await waitFor(() => expect(result.current.card.cardData.data.assets).toHaveLength(1));

        await act(async () => {
            result.current.card.patchCardData({description: `Scene: ![bg](${asset.uri})`});
        });
        await waitFor(() => {
            expect(result.current.card.cardData.data.description).toContain(asset.uri);
        });

        let nextUri;
        await act(async () => {
            nextUri = await result.current.assets.changeAssetType(asset.uri, 'emotion');
        });

        expect(nextUri).toBe('embeded://assets/emotion/images/scene.png');
        expect(result.current.card.cardData.data.assets[0]).toMatchObject({
            type: 'emotion',
            name: 'scene',
            ext: 'png',
            uri: nextUri,
        });
        expect(result.current.card.cardData.data.description).toBe(`Scene: ![bg](${nextUri})`);
        expect(await getAsset(asset.uri)).toBeUndefined();
        expect(await getAsset(nextUri)).toBeTruthy();
    });

    test('blocks changing the only main icon and promotes another icon when allowed', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        let mainIcon;
        await act(async () => {
            mainIcon = await result.current.assets.addFile(
                pngFixtureFile('main.png'),
                {type: 'icon', name: 'main', main: true},
            );
        });
        await waitFor(() => expect(result.current.card.cardData.data.assets).toHaveLength(1));

        await expect(
            result.current.assets.changeAssetType(mainIcon.uri, 'background'),
        ).rejects.toThrow('Add another icon');

        await act(async () => {
            await result.current.assets.addFile(
                pngFixtureFile('alternate.png'),
                {type: 'icon', name: 'alternate'},
            );
        });
        await waitFor(() => expect(result.current.card.cardData.data.assets).toHaveLength(2));

        let nextUri;
        await act(async () => {
            nextUri = await result.current.assets.changeAssetType(mainIcon.uri, 'background');
        });

        const assets = result.current.card.cardData.data.assets;
        expect(assets.find((item) => item.uri === nextUri)).toMatchObject({
            type: 'background',
            name: 'main',
        });
        expect(assets.some((item) => item.type === 'icon' && item.name === 'main')).toBe(true);
    });

    test('rejects type changes for non-embedded assets', async () => {
        const {result} = renderHook(() => ({card: useCardStore(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        const uri = 'https://example.com/scene.png';
        await act(async () => {
            result.current.card.setCardData({
                spec: 'chara_card_v3',
                spec_version: '3.0',
                data: {
                    name: 'Remote',
                    assets: [{type: 'other', name: 'scene', ext: 'png', uri}],
                },
            });
        });
        await waitFor(() => {
            expect(result.current.card.cardData.data.assets[0].uri).toBe(uri);
        });

        await expect(
            result.current.assets.changeAssetType(uri, 'background'),
        ).rejects.toThrow('Only local embedded assets');
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
