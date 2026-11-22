import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

import { createExportSnapshot } from '../png/cardPng';
import { dataUrlToBlob } from '../utils/blob';
import { extensionFromFilename, mediaKindForExtension, mimeForExtension, normalizeExtension } from '../assets/media';
import { getAsset } from '../storage/assetStore';
import {
    CHARX_CARD_PATH,
    embededUriToPath,
    pathToEmbededUri,
    sanitizeExportPath,
} from './charxPaths';

const MIME_EXTENSION = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
};

function extensionFromMime(mime) {
    return MIME_EXTENSION[String(mime ?? '').toLowerCase()] ?? '';
}

function assetExtension(asset, path, blob) {
    return normalizeExtension(asset?.ext)
        || extensionFromFilename(path)
        || extensionFromMime(blob?.type)
        || 'bin';
}

async function materializeAsset(asset, {embedRemote, reserved, warnings}) {
    if (!asset || typeof asset.uri !== 'string') {
        return {asset: null, entry: null};
    }

    if (asset.uri === 'ccdefault:') {
        return {asset, entry: null};
    }

    if (asset.uri.startsWith('data:')) {
        try {
            const blob = await dataUrlToBlob(asset.uri);
            if (!blob.size) throw new Error('decoded file is empty');
            const ext = assetExtension(asset, '', blob);
            const path = sanitizeExportPath({...asset, ext}, reserved);
            reserved.add(path);
            return {
                asset: {...asset, uri: pathToEmbededUri(path), ext},
                entry: {path, blob},
            };
        } catch (error) {
            warnings.push({
                code: 'CHARX_ASSET_DATA_INVALID',
                message: `Asset "${asset.name ?? asset.uri}" could not be decoded and was omitted: ${error.message}`,
            });
            return {asset: null, entry: null};
        }
    }

    if (asset.uri.startsWith('embeded://')) {
        const record = await getAsset(asset.uri);
        if (!record) {
            warnings.push({
                code: 'CHARX_ASSET_MISSING',
                message: `Asset "${asset.name ?? asset.uri}" is referenced by the card but missing from IndexedDB; it was omitted.`,
            });
            return {asset: null, entry: null};
        }

        const existingPath = embededUriToPath(asset.uri);
        const path = sanitizeExportPath(asset, reserved);
        reserved.add(path);
        const ext = assetExtension(asset, path || existingPath, record.blob);
        return {
            asset: {...asset, uri: pathToEmbededUri(path), ext},
            entry: {path, blob: record.blob},
        };
    }

    if (/^https:\/\//i.test(asset.uri)) {
        if (!embedRemote) return {asset, entry: null};

        try {
            const response = await fetch(asset.uri);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            if (!blob.size) throw new Error('downloaded file is empty');
            const ext = assetExtension(asset, '', blob);
            const path = sanitizeExportPath({...asset, ext}, reserved);
            reserved.add(path);
            return {
                asset: {...asset, uri: pathToEmbededUri(path), ext},
                entry: {path, blob},
            };
        } catch (error) {
            warnings.push({
                code: 'CHARX_REMOTE_ASSET_SKIPPED',
                message: `Remote asset "${asset.name ?? asset.uri}" could not be downloaded; the CHARX will keep its HTTPS URL instead. ${error.message}`,
            });
            return {asset, entry: null};
        }
    }

    if (/^http:\/\//i.test(asset.uri)) {
        warnings.push({
            code: 'CHARX_HTTP_ASSET',
            message: `Asset "${asset.name ?? asset.uri}" uses insecure HTTP and was left as a URL.`,
        });
        return {asset, entry: null};
    }

    warnings.push({
        code: 'CHARX_ASSET_URI_UNSUPPORTED',
        message: `Asset "${asset.name ?? asset.uri}" uses an unsupported URI scheme and was left as-is.`,
    });
    return {asset, entry: null};
}

/**
 * Builds a CCv3 .charx archive with card.json at the root and assets under
 * assets/{type}/{images|audio|video|other}/...
 *
 * @param {Object} card
 * @param {{onProgress?: Function, embedRemote?: boolean, useWebWorkers?: boolean}} [options]
 * @returns {Promise<{blob: Blob, card: Object, warnings: Array, entries: Array}>}
 */
export default async function exportCharx(card, options = {}) {
    const {
        onProgress = () => {},
        embedRemote = true,
        useWebWorkers = true,
    } = options;

    const outgoing = createExportSnapshot(card);
    const inputAssets = Array.isArray(outgoing.data.assets) ? outgoing.data.assets : [];
    const warnings = [];
    const reserved = new Set([CHARX_CARD_PATH]);
    const entries = [];
    const outputAssets = [];

    for (let index = 0; index < inputAssets.length; index++) {
        const asset = inputAssets[index];
        onProgress({
            phase: 'assets',
            current: index,
            total: inputAssets.length,
            message: `Preparing ${asset.name ?? `asset ${index + 1}`}…`,
        });

        const result = await materializeAsset(asset, {embedRemote, reserved, warnings});
        if (result.asset) outputAssets.push(result.asset);
        if (result.entry) entries.push(result.entry);
    }

    const cardForArchive = {
        ...outgoing,
        data: {
            ...outgoing.data,
            assets: outputAssets.length > 0 ? outputAssets : undefined,
        },
    };
    const cardJson = JSON.stringify(cardForArchive, null, 2);

    onProgress({phase: 'writing', current: entries.length, total: entries.length + 1, message: 'Writing CHARX…'});

    const blobWriter = new BlobWriter('application/zip');
    const writer = new ZipWriter(blobWriter, {useWebWorkers, useCompressionStream: false});
    try {
        await writer.add(CHARX_CARD_PATH, new TextReader(cardJson), {level: 6});
        for (const entry of entries) {
            // Media is already compressed; storing it avoids wasting CPU and memory.
            await writer.add(entry.path, new BlobReader(entry.blob), {level: 0});
        }
        await writer.close();
    } catch (error) {
        try { await writer.close(); } catch { /* already closed */ }
        throw error;
    }

    const blob = await blobWriter.getData();
    onProgress({phase: 'done', current: entries.length + 1, total: entries.length + 1, message: 'CHARX ready.'});

    return {
        blob,
        card: cardForArchive,
        warnings,
        entries: entries.map((entry) => ({
            path: entry.path,
            size: entry.blob.size,
            mediaKind: mediaKindForExtension(extensionFromFilename(entry.path)),
            mime: entry.blob.type || mimeForExtension(extensionFromFilename(entry.path)),
        })),
    };
}
