import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { compressImageAssets as compressStoredImageAssets } from '../assets/assetCompression';
import {
    defaultTypeForMedia,
    extensionFromFilename,
    mediaKindForExtension,
    mimeForExtension,
    validateAssetFile,
} from '../assets/media';
import { createAssetUri, makeUniqueUri } from '../assets/paths';
import { createThumbnail } from '../assets/thumbnails';
import { clearAssets as clearStoredAssets, clearOrphanAssets, deleteAsset as deleteStoredAsset, putAsset } from '../storage/assetStore';
import { dataUrlToBlob } from '../utils/blob';
import { useCard } from './cardContext';

const AssetContext = createContext();

function hasMainIcon(assets) {
    return assets.some((asset) => asset.type === 'icon' && asset.name === 'main');
}

function applyMain(assets, targetUri) {
    const target = assets.find((asset) => asset.uri === targetUri);
    if (!target || (target.type !== 'icon' && target.type !== 'background')) return assets;

    return assets.map((asset) => {
        if (asset.type !== target.type) return asset;
        if (asset.uri === targetUri) return {...asset, name: 'main'};
        if (asset.name === 'main') return {...asset, name: `${asset.type}-alt`};
        return asset;
    });
}

function chooseFallbackMain(assets, type) {
    const sameType = assets.filter((asset) => asset.type === type);
    if (sameType.length === 0) return assets;
    if (sameType.some((asset) => asset.name === 'main')) return assets;
    return assets.map((asset) => (
        asset.type === type && asset === sameType[0] ? {...asset, name: 'main'} : asset
    ));
}

export function AssetProvider({children}) {
    const { cardData, patchCardData } = useCard();
    const [assetVersion, setAssetVersion] = useState(0);
    const [busy, setBusy] = useState(false);

    const bumpVersion = useCallback(() => setAssetVersion((value) => value + 1), []);

    const addFiles = useCallback(async (files, optionsList = []) => {
        if (!files?.length) return [];

        setBusy(true);
        const currentAssets = cardData?.data?.assets ?? [];
        const reserved = new Set(currentAssets.map((asset) => asset.uri));
        const added = [];

        try {
            for (let index = 0; index < files.length; index++) {
                const file = files[index];
                const options = optionsList[index] ?? {};
                const validation = validateAssetFile(file);
                if (!validation.ok) {
                    throw new Error(`${file.name}: ${validation.errors.join(' ')}`);
                }

                const mediaKind = validation.mediaKind;
                const type = options.type || defaultTypeForMedia(mediaKind, hasMainIcon(currentAssets));
                const name = options.name?.trim() || file.name.replace(/\.[^.]+$/, '') || 'asset';
                const baseUri = createAssetUri({type, name, ext: validation.ext});
                const uri = makeUniqueUri(baseUri, reserved);
                reserved.add(uri);

                const thumb = await createThumbnail(file, mediaKind);
                await putAsset({
                    uri,
                    blob: file,
                    thumb: thumb ?? undefined,
                    mime: validation.mime,
                    size: validation.size,
                    ext: validation.ext,
                    mediaKind,
                    name,
                });

                added.push({
                    metadata: {type, uri, name, ext: validation.ext},
                    mediaKind,
                });
            }
        } finally {
            setBusy(false);
        }

        patchCardData((prev) => {
            const previous = prev.data.assets ?? [];
            let nextAssets = [...previous, ...added.map((item) => item.metadata)];
            let hasMain = hasMainIcon(previous);

            added.forEach((item, index) => {
                const shouldBeMain = optionsList[index]?.main || (item.metadata.type === 'icon' && !hasMain);
                if (shouldBeMain) {
                    nextAssets = applyMain(nextAssets, item.metadata.uri);
                    hasMain = true;
                }
            });

            // If a background/icon has no main after deletion/replacement, promote the first one.
            nextAssets = chooseFallbackMain(nextAssets, 'icon');
            nextAssets = chooseFallbackMain(nextAssets, 'background');

            return { assets: nextAssets };
        });

        bumpVersion();
        return added.map((item) => item.metadata);
    }, [cardData?.data?.assets, patchCardData, bumpVersion]);

    const addFile = useCallback(async (file, options = {}) => {
        const [asset] = await addFiles([file], [options]);
        return asset;
    }, [addFiles]);

    const deleteAsset = useCallback(async (uri) => {
        const asset = (cardData?.data?.assets ?? []).find((item) => item.uri === uri);
        if (!asset) return;

        patchCardData((prev) => {
            let assets = (prev.data.assets ?? []).filter((item) => item.uri !== uri);
            assets = chooseFallbackMain(assets, 'icon');
            assets = chooseFallbackMain(assets, 'background');
            return { assets };
        });

        try {
            await deleteStoredAsset(uri);
        } finally {
            bumpVersion();
        }
    }, [cardData?.data?.assets, patchCardData, bumpVersion]);

    const replaceAsset = useCallback(async (uri, file) => {
        const oldAsset = (cardData?.data?.assets ?? []).find((item) => item.uri === uri);
        if (!oldAsset) throw new Error('Asset not found.');

        const validation = validateAssetFile(file);
        if (!validation.ok) throw new Error(validation.errors.join(' '));

        const currentAssets = cardData?.data?.assets ?? [];
        const reserved = new Set(currentAssets.filter((item) => item.uri !== uri).map((item) => item.uri));
        const sameShape = validation.ext === oldAsset.ext;
        const newUri = sameShape
            ? uri
            : makeUniqueUri(createAssetUri({type: oldAsset.type, name: oldAsset.name, ext: validation.ext}), reserved);

        setBusy(true);
        try {
            const thumb = await createThumbnail(file, validation.mediaKind);
            await putAsset({
                uri: newUri,
                blob: file,
                thumb: thumb ?? undefined,
                mime: validation.mime,
                size: validation.size,
                ext: validation.ext,
                mediaKind: validation.mediaKind,
                name: oldAsset.name || 'asset',
            });

            if (newUri !== uri) await deleteStoredAsset(uri);

            patchCardData((prev) => {
                let assets = (prev.data.assets ?? []).map((item) => (
                    item.uri === uri
                        ? {...item, uri: newUri, ext: validation.ext}
                        : item
                ));
                if (oldAsset.name === 'main') assets = applyMain(assets, newUri);
                return { assets };
            });
        } finally {
            setBusy(false);
            bumpVersion();
        }
    }, [cardData?.data?.assets, patchCardData, bumpVersion]);

    const setMain = useCallback((uri) => {
        patchCardData((prev) => ({ assets: applyMain(prev.data.assets ?? [], uri) }));
    }, [patchCardData]);

    const setMainIcon = useCallback(async (file) => {
        const icon = (cardData?.data?.assets ?? []).find((asset) => asset.type === 'icon' && asset.name === 'main');
        if (icon) return replaceAsset(icon.uri, file);
        return addFile(file, {type: 'icon', name: 'main', main: true});
    }, [cardData?.data?.assets, replaceAsset, addFile]);

    const updateAssetMetadata = useCallback((uri, updates) => {
        patchCardData((prev) => ({
            assets: (prev.data.assets ?? []).map((asset) => (
                asset.uri === uri ? {...asset, ...updates} : asset
            )),
        }));
    }, [patchCardData]);

    const clearAllAssets = useCallback(async () => {
        setBusy(true);
        try {
            await clearStoredAssets();
            patchCardData({ assets: undefined });
            bumpVersion();
        } finally {
            setBusy(false);
        }
    }, [patchCardData, bumpVersion]);

    /**
     * Resizes every locally stored image asset to a megapixel budget and refreshes asset URLs so
     * the grid and the portrait pick up the new blobs.
     *
     * @param {number} megapixels
     * @param {{onProgress?: Function}} [options]
     * @returns {Promise<Object>} compression summary
     */
    const compressImageAssets = useCallback(async (megapixels, options) => {
        setBusy(true);
        try {
            const result = await compressStoredImageAssets(
                cardData?.data?.assets ?? [],
                megapixels,
                options,
            );
            if (result.resized.length > 0) bumpVersion();
            return result;
        } finally {
            setBusy(false);
        }
    }, [cardData?.data?.assets, bumpVersion]);

    /** Deletes IndexedDB blobs that are no longer referenced by the current card. */
    const cleanOrphanAssets = useCallback(async () => {
        setBusy(true);
        try {
            const removed = await clearOrphanAssets(cardData);
            if (removed.length > 0) bumpVersion();
            return removed;
        } finally {
            setBusy(false);
        }
    }, [cardData, bumpVersion]);

    /**
     * Adds a local portrait as the card's main icon asset. PNG card imports pass `replace: true`
     * because the PNG image itself is authoritative, even if the embedded JSON used `ccdefault:`.
     *
     * @param {Object} card
     * @param {File|Blob} file
     * @param {{replace?: boolean}} [options]
     * @returns {Promise<Object>} card with the asset metadata and blob stored in IndexedDB
     */
    const ensureMainIcon = useCallback(async (card, file, {replace = false} = {}) => {
        const assets = card?.data?.assets ?? [];
        const existingIndex = assets.findIndex((asset) => asset.type === 'icon' && asset.name === 'main');
        if (existingIndex !== -1 && !replace) return card;

        const iconFile = file instanceof File
            ? file
            : new File([file], 'portrait.png', {type: file?.type || 'image/png'});
        const validation = validateAssetFile(iconFile);
        if (!validation.ok) throw new Error(validation.errors.join(' '));

        const existing = existingIndex === -1 ? null : assets[existingIndex];
        const reserved = new Set(
            assets
                .filter((_asset, index) => index !== existingIndex)
                .map((asset) => asset.uri),
        );
        const baseUri = createAssetUri({type: 'icon', name: 'main', ext: validation.ext});
        const uri = makeUniqueUri(baseUri, reserved);
        const thumb = await createThumbnail(iconFile, validation.mediaKind);

        await putAsset({
            uri,
            blob: iconFile,
            thumb: thumb ?? undefined,
            mime: validation.mime,
            size: validation.size,
            ext: validation.ext,
            mediaKind: validation.mediaKind,
            name: 'main',
        });

        const metadata = {
            ...(existing ?? {}),
            type: 'icon',
            name: 'main',
            ext: validation.ext,
            uri,
        };
        const nextAssets = existingIndex === -1
            ? [...assets, metadata]
            : assets.map((asset, index) => (index === existingIndex ? metadata : asset));

        bumpVersion();
        return {
            ...card,
            data: {
                ...card.data,
                assets: nextAssets,
            },
        };
    }, [bumpVersion]);

    /**
     * Converts self-contained data: asset URIs into IndexedDB-backed embeded:// assets.
     * Remote/embedded/ccdefault assets are preserved as-is.
     */
    const ingestCardAssets = useCallback(async (card) => {
        const assets = card?.data?.assets;
        if (!Array.isArray(assets) || assets.length === 0) return card;

        const reserved = new Set(assets.map((asset) => asset.uri));
        const nextAssets = [];

        for (const asset of assets) {
            if (typeof asset.uri !== 'string' || !asset.uri.startsWith('data:')) {
                nextAssets.push(asset);
                continue;
            }

            try {
                const blob = await dataUrlToBlob(asset.uri);
                const mime = blob.type || mimeForExtension(asset.ext);
                const rawExt = mime.split('/')[1] || asset.ext || extensionFromFilename('asset.bin');
                const ext = (
                    extensionFromFilename(`asset.${rawExt}`) || asset.ext || 'bin'
                ).toLowerCase();
                const mediaKind = mediaKindForExtension(ext);
                const uri = makeUniqueUri(
                    createAssetUri({type: asset.type, name: asset.name, ext}),
                    reserved,
                );
                reserved.add(uri);

                await putAsset({
                    uri,
                    blob,
                    thumb: await createThumbnail(blob, mediaKind) ?? undefined,
                    mime,
                    size: blob.size,
                    ext,
                    mediaKind,
                    name: asset.name || 'asset',
                });

                nextAssets.push({...asset, uri, ext});
            } catch {
                nextAssets.push(asset);
            }
        }

        bumpVersion();
        return {
            ...card,
            data: {
                ...card.data,
                assets: nextAssets,
            },
        };
    }, [bumpVersion]);

    const value = useMemo(() => ({
        assetVersion,
        busy,
        addFile,
        addFiles,
        deleteAsset,
        replaceAsset,
        setMain,
        setMainIcon,
        updateAssetMetadata,
        clearAllAssets,
        cleanOrphanAssets,
        compressImageAssets,
        ensureMainIcon,
        ingestCardAssets,
    }), [
        assetVersion, busy, addFile, addFiles, deleteAsset, replaceAsset, setMain, setMainIcon,
        updateAssetMetadata, clearAllAssets, cleanOrphanAssets, compressImageAssets, ensureMainIcon,
        ingestCardAssets,
    ]);

    return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export const useAssets = () => useContext(AssetContext);
