import { mediaKindForAsset, MEDIA_KIND } from './media';
import { createThumbnail } from './thumbnails';
import { getAsset, putAsset } from '../storage/assetStore';
import { shrinksAt, targetDimensions } from '../utils/imageSizing';

/**
 * Batch compression for image assets stored in IndexedDB.
 *
 * The card metadata points at asset URIs, not at pixel sizes, so resizing keeps the URI unchanged
 * and only replaces the stored blob. Formats are never converted: a PNG stays a PNG and a JPEG
 * stays a JPEG. GIF and AVIF are skipped because a canvas re-encode would lose animation or change
 * the format behind the existing extension.
 */

const QUALITY = 0.92;

export const COMPRESSIBLE_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

function normalizeExtension(ext) {
    return String(ext ?? '').trim().replace(/^\./, '').toLowerCase();
}

export function isCompressibleImageAsset(asset) {
    if (!asset) return false;
    if (mediaKindForAsset(asset) !== MEDIA_KIND.image) return false;
    return COMPRESSIBLE_IMAGE_EXTENSIONS.includes(normalizeExtension(asset.ext));
}

/** Canvas format that matches the extension already stored in the card metadata. */
export function outputMimeForExtension(ext) {
    const normalized = normalizeExtension(ext);
    if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
    if (normalized === 'webp') return 'image/webp';
    return 'image/png';
}

async function openDrawable(blob) {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(blob);
        return {
            height: bitmap.height,
            source: bitmap,
            width: bitmap.width,
            release: () => bitmap.close?.(),
        };
    }

    if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
        throw new Error('Image resizing is not available in this environment.');
    }

    const url = URL.createObjectURL(blob);
    let image;
    try {
        image = await new Promise((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = () => reject(new Error('The image could not be decoded.'));
            element.src = url;
        });
    } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
    }

    return {
        height: image.naturalHeight || image.height,
        source: image,
        width: image.naturalWidth || image.width,
        release: () => URL.revokeObjectURL(url),
    };
}

function encodeCanvas(canvas, mime) {
    return new Promise((resolve, reject) => {
        if (typeof canvas.toBlob !== 'function') {
            reject(new Error('This browser cannot encode the resized image.'));
            return;
        }
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('The resized image could not be encoded.'));
        }, mime, mime === 'image/png' ? undefined : QUALITY);
    });
}

/**
 * Reads the decoded pixel size of an image blob.
 *
 * @param {Blob} blob
 * @returns {Promise<{width: number, height: number}>}
 */
export async function readImageDimensions(blob) {
    const drawable = await openDrawable(blob);
    try {
        return { height: drawable.height, width: drawable.width };
    } finally {
        drawable.release();
    }
}

/**
 * Resizes an image blob to the requested megapixels in its existing format.
 *
 * @param {Blob} blob
 * @param {number} megapixels
 * @param {string} ext
 * @returns {Promise<{blob: Blob, width: number, height: number, mime: string}|null>} `null` when the
 *   rounded target would not reduce the image.
 */
export async function resizeImageBlob(blob, megapixels, ext) {
    const drawable = await openDrawable(blob);
    try {
        if (!shrinksAt(drawable.width, drawable.height, megapixels)) return null;

        const target = targetDimensions(drawable.width, drawable.height, megapixels);
        const canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('The image could not be prepared for resizing.');

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(drawable.source, 0, 0, target.width, target.height);

        const mime = outputMimeForExtension(ext);
        return {
            blob: await encodeCanvas(canvas, mime),
            height: target.height,
            mime,
            width: target.width,
        };
    } finally {
        drawable.release();
    }
}

async function localRecordFor(asset) {
    if (!isCompressibleImageAsset(asset)) return null;
    try {
        const record = await getAsset(asset.uri);
        return record?.blob ? record : null;
    } catch {
        return null;
    }
}

/**
 * Loads the pixel sizes of every locally stored image asset. Used by the dialog to hide megapixel
 * presets that would not shrink anything.
 *
 * @param {Array<Object>} assets Card asset metadata
 * @param {{onProgress?: (progress: {checked: number, total: number}) => void}} [options]
 * @returns {Promise<{images: Array<{uri: string, width: number, height: number, name: string}>, skipped: number}>}
 */
export async function measureImageAssets(assets, { onProgress } = {}) {
    const list = assets ?? [];
    const images = [];
    let skipped = 0;
    let checked = 0;

    for (const asset of list) {
        if (isCompressibleImageAsset(asset)) {
            const record = await localRecordFor(asset);
            if (!record) {
                skipped += 1;
            } else {
                try {
                    const { width, height } = await readImageDimensions(record.blob);
                    images.push({ height, name: asset.name || asset.uri, uri: asset.uri, width });
                } catch {
                    skipped += 1;
                }
            }
        } else {
            skipped += 1;
        }

        checked += 1;
        onProgress?.({ checked, total: list.length });
    }

    return { images, skipped };
}

/**
 * Keeps the presets that reduce at least one measured image.
 *
 * @param {Array<{width: number, height: number}>} images
 * @param {number[]} presets
 * @returns {number[]}
 */
export function presetsForImages(images, presets) {
    return presets.filter((megapixels) => images.some((image) => (
        shrinksAt(image.width, image.height, megapixels)
    )));
}

/**
 * Resizes every locally stored image asset to the requested megapixels. Assets that are already
 * at or below the target and formats the canvas cannot safely re-encode are left untouched.
 *
 * @param {Array<Object>} assets Card asset metadata
 * @param {number} megapixels
 * @param {{onProgress?: (progress: {completed: number, total: number, asset: Object|null}) => void}} [options]
 * @returns {Promise<{
 *   resized: Array<Object>,
 *   skipped: Array<Object>,
 *   failed: Array<Object>,
 *   savedBytes: number,
 *   total: number
 * }>}
 */
export async function compressImageAssets(assets, megapixels, { onProgress } = {}) {
    const candidates = [];

    for (const asset of assets ?? []) {
        if (!isCompressibleImageAsset(asset)) {
            candidates.push({ asset, reason: 'unsupported' });
            continue;
        }
        const record = await localRecordFor(asset);
        if (!record) {
            candidates.push({ asset, reason: 'missing' });
            continue;
        }
        candidates.push({ asset, record });
    }

    const result = { failed: [], resized: [], savedBytes: 0, skipped: [], total: candidates.length };
    let completed = 0;

    onProgress?.({ asset: null, completed, total: result.total });

    for (const candidate of candidates) {
        if (!candidate.record) {
            const { asset } = candidate;
            result.skipped.push({
                name: asset.name || asset.uri,
                reason: candidate.reason ?? 'missing',
                uri: asset.uri,
            });
            completed += 1;
            onProgress?.({ asset, completed, total: result.total });
            continue;
        }

        const { asset, record } = candidate;
        // Announce the file that is being worked on, so the dialog can show its name while the
        // resize is still running instead of only after it finishes.
        onProgress?.({ asset, completed, total: result.total });

        try {
            const beforeBytes = record.blob.size;
            const resized = await resizeImageBlob(record.blob, megapixels, asset.ext);
            if (!resized) {
                result.skipped.push({ name: asset.name || asset.uri, reason: 'small', uri: asset.uri });
            } else {
                const thumb = await createThumbnail(resized.blob, MEDIA_KIND.image);
                await putAsset({
                    ...record,
                    blob: resized.blob,
                    mime: resized.mime,
                    size: resized.blob.size,
                    thumb: thumb ?? undefined,
                });
                result.resized.push({
                    afterBytes: resized.blob.size,
                    beforeBytes,
                    height: resized.height,
                    name: asset.name || asset.uri,
                    uri: asset.uri,
                    width: resized.width,
                });
                result.savedBytes += Math.max(0, beforeBytes - resized.blob.size);
            }
        } catch (error) {
            result.failed.push({ message: error.message, name: asset.name || asset.uri, uri: asset.uri });
        }

        completed += 1;
        onProgress?.({ asset, completed, total: result.total });
    }

    return result;
}
