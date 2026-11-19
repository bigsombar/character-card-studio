import { BlobReader, BlobWriter, TextWriter, ZipReader } from '@zip.js/zip.js';

import { extensionFromFilename, mediaKindForExtension, mimeForExtension, normalizeExtension } from '../assets/media';
import { createThumbnail } from '../assets/thumbnails';
import normalizeCardData from '../utils/normalizeCardData';
import { putAsset } from '../storage/assetStore';
import {
    CHARX_CARD_PATH,
    MAX_CARD_JSON_BYTES,
    MAX_CHARX_BYTES,
    MAX_CHARX_ENTRIES,
    MAX_UNCOMPRESSED_BYTES,
    embededUriToPath,
    isSafeZipPath,
} from './charxPaths';

function totalUncompressedSize(entries) {
    return entries.reduce((total, entry) => total + (entry.directory ? 0 : (entry.uncompressedSize || 0)), 0);
}

/**
 * Reads a CHARX archive, validates it, stores embedded assets in IndexedDB and returns a
 * normalized V3 card. `card.json` must be at the root.
 *
 * @param {File|Blob} file
 * @param {{onProgress?: Function, useWebWorkers?: boolean}} [options]
 * @returns {Promise<{card: Object, warnings: Array, entries: Array}>}
 */
export default async function importCharx(file, options = {}) {
    const {onProgress = () => {}, useWebWorkers = true} = options;
    const warnings = [];

    if (!file || typeof file.size !== 'number') throw new Error('No CHARX file selected.');
    if (file.size > MAX_CHARX_BYTES) throw new Error('CHARX archive is too large.');

    const reader = new ZipReader(new BlobReader(file), {useWebWorkers, useCompressionStream: false});
    try {
        onProgress({phase: 'reading', message: 'Reading CHARX archive…'});
        let entries;
        try {
            entries = await reader.getEntries();
        } catch (error) {
            throw new Error(`CHARX archive could not be read: ${error.message}`, {cause: error});
        }

        if (entries.length > MAX_CHARX_ENTRIES) {
            throw new Error(`CHARX contains too many entries (${entries.length}).`);
        }
        if (totalUncompressedSize(entries) > MAX_UNCOMPRESSED_BYTES) {
            throw new Error('CHARX uncompressed size exceeds the safety limit.');
        }

        for (const entry of entries) {
            if (!isSafeZipPath(entry.filename)) {
                throw new Error(`CHARX contains an unsafe entry path: ${entry.filename}`);
            }
            if (entry.encrypted) {
                throw new Error(`CHARX entry "${entry.filename}" is encrypted; encrypted archives are not supported.`);
            }
        }

        const cardEntry = entries.find((entry) => !entry.directory && entry.filename === CHARX_CARD_PATH)
            ?? entries.find((entry) => !entry.directory && entry.filename === `./${CHARX_CARD_PATH}`);

        if (!cardEntry) {
            throw new Error('CHARX is missing card.json at its root.');
        }
        if (cardEntry.uncompressedSize > MAX_CARD_JSON_BYTES) {
            throw new Error('card.json is too large.');
        }
        if (cardEntry.filename === `./${CHARX_CARD_PATH}`) {
            warnings.push({
                code: 'CHARX_CARD_PATH_DOT',
                message: 'card.json was found as "./card.json" instead of "card.json". The archive was imported anyway.',
            });
        }

        const cardText = await cardEntry.getData(new TextWriter());
        let parsed;
        try {
            parsed = JSON.parse(cardText);
        } catch (error) {
            throw new Error(`card.json is not valid JSON: ${error.message}`, {cause: error});
        }

        const normalized = normalizeCardData(parsed);
        if (!normalized.ok) throw new Error(normalized.error);
        warnings.push(...(normalized.warnings ?? []));

        const entriesByPath = new Map(entries.map((entry) => [entry.filename, entry]));
        const assets = normalized.cardData.data.assets ?? [];
        const nextAssets = [];

        for (let index = 0; index < assets.length; index++) {
            const asset = assets[index];
            onProgress({
                phase: 'assets',
                current: index,
                total: assets.length,
                message: `Importing ${asset.name ?? `asset ${index + 1}`}…`,
            });

            const path = embededUriToPath(asset.uri);
            if (!path) {
                nextAssets.push(asset);
                continue;
            }

            const entry = entriesByPath.get(path);
            if (!entry || entry.directory) {
                warnings.push({
                    code: 'CHARX_ASSET_MISSING',
                    message: `Asset "${asset.name ?? asset.uri}" references "${path}", but that file is missing from the archive.`,
                });
                nextAssets.push(asset);
                continue;
            }

            try {
                const ext = normalizeExtension(asset.ext)
                    || extensionFromFilename(path)
                    || 'bin';
                const mediaKind = mediaKindForExtension(ext);
                const mime = mimeForExtension(ext);
                const blob = await entry.getData(new BlobWriter(mime));
                const thumb = await createThumbnail(blob, mediaKind).catch(() => null);

                await putAsset({
                    uri: asset.uri,
                    blob,
                    thumb: thumb ?? undefined,
                    mime: blob.type || mime,
                    size: blob.size,
                    ext,
                    mediaKind,
                    name: asset.name || 'asset',
                });

                nextAssets.push({...asset, ext});
            } catch (error) {
                warnings.push({
                    code: 'CHARX_ASSET_IMPORT_FAILED',
                    message: `Asset "${asset.name ?? asset.uri}" could not be imported: ${error.message}`,
                });
                nextAssets.push(asset);
            }
        }

        onProgress({phase: 'done', message: 'CHARX imported.'});

        return {
            card: {
                ...normalized.cardData,
                data: {
                    ...normalized.cardData.data,
                    assets: nextAssets.length > 0 ? nextAssets : undefined,
                },
            },
            warnings,
            entries: entries
                .filter((entry) => !entry.directory)
                .map((entry) => ({path: entry.filename, size: entry.uncompressedSize || 0})),
        };
    } finally {
        await reader.close();
    }
}
