import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AssetProvider, useAssets } from './AssetContext';
import { CardProvider } from './CardProvider';
import { useCard } from './cardContext';
import { resetEditorDb } from '../storage/db';
import { getAsset, putAsset } from '../storage/assetStore';
import { createBlankPng, pngDataUrl } from '../test/pngFixtures';

const BLANK_PNG_DATA_URL = pngDataUrl(createBlankPng());

vi.mock('../assets/thumbnails', () => ({
    createThumbnail: vi.fn().mockResolvedValue(null),
}));

function wrapper({children}) {
    return (
        <CardProvider>
            <AssetProvider>{children}</AssetProvider>
        </CardProvider>
    );
}

function pngFile(name = 'avatar.png') {
    return new File([new Uint8Array([1, 2, 3, 4])], name, {type: 'image/png'});
}

describe('AssetProvider', () => {
    beforeEach(async () => {
        localStorage.clear();
        await resetEditorDb();
    });

    test('adds an asset to the card and IndexedDB, then deletes it', async () => {
        const {result} = renderHook(() => ({card: useCard(), assets: useAssets()}), {wrapper});

        await waitFor(() => expect(result.current.assets).toBeDefined());

        await act(async () => {
            await result.current.assets.addFile(pngFile(), {type: 'icon', name: 'main', main: true});
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
        const {result} = renderHook(() => ({card: useCard(), assets: useAssets()}), {wrapper});
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

    test('removes orphaned blobs without touching referenced assets', async () => {
        const {result} = renderHook(() => ({card: useCard(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        await act(async () => {
            await result.current.assets.addFile(pngFile('kept.png'), {type: 'icon', name: 'main', main: true});
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
        const {result} = renderHook(() => ({card: useCard(), assets: useAssets()}), {wrapper});
        await waitFor(() => expect(result.current.assets).toBeDefined());

        const card = {spec: 'chara_card_v3', spec_version: '3.0', data: {name: 'PNG Portrait'}};
        let next;
        await act(async () => {
            next = await result.current.assets.ensureMainIcon(card, pngFile('portrait.png'));
        });

        expect(next.data.assets).toHaveLength(1);
        expect(next.data.assets[0]).toMatchObject({type: 'icon', name: 'main', ext: 'png'});
        expect(next.data.assets[0].uri).toMatch(/^embeded:\/\/assets\/icon\/images\/main/);
        expect(await getAsset(next.data.assets[0].uri)).toBeTruthy();

        let unchanged;
        await act(async () => {
            unchanged = await result.current.assets.ensureMainIcon(next, pngFile('second.png'));
        });
        expect(unchanged.data.assets).toHaveLength(1);
    });

    test('replaces a ccdefault main icon with the PNG image on import', async () => {
        const {result} = renderHook(() => ({card: useCard(), assets: useAssets()}), {wrapper});
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
            next = await result.current.assets.ensureMainIcon(card, pngFile('portrait.png'), {replace: true});
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
