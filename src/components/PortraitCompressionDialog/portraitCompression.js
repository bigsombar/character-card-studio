import imageCompression from 'browser-image-compression';

import { targetDimensions } from '../../utils/imageSizing';

export { formatMegapixels, targetDimensions } from '../../utils/imageSizing';

/**
 * Portrait compression helpers.
 *
 * The selected portrait can resolve to a `data:` URL, a `blob:` object URL (local IndexedDB
 * assets) or an `https:` URL. browser-image-compression's `getFilefromDataUrl` only understands
 * base64 data URLs and throws on blob URLs, so every source is normalised through `fetch` first.
 */

export async function portraitSourceToFile(source, name = 'portrait.png') {
    const response = await fetch(source);
    if (!response.ok) {
        throw new Error('The portrait image could not be loaded.');
    }
    const blob = await response.blob();
    return new File([blob], name, {type: blob.type || 'image/png'});
}

/**
 * Resizes the portrait to the requested megapixels and returns a PNG file whose dimensions are
 * both multiples of 16. Drawing into a canvas keeps the whole image; nothing is cropped.
 *
 * @param {string} source data:, blob: or https: URL
 * @param {number} megapixels
 * @returns {Promise<File>}
 */
export async function compressPortraitToTarget(source, megapixels) {
    const image = await imageCompression.loadImage(source);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const { width, height } = targetDimensions(sourceWidth, sourceHeight, megapixels);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('The portrait could not be prepared for resizing.');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
        if (typeof canvas.toBlob !== 'function') {
            reject(new Error('This browser cannot resize the portrait.'));
            return;
        }
        canvas.toBlob((value) => {
            if (value) resolve(value);
            else reject(new Error('The portrait could not be encoded as PNG.'));
        }, 'image/png');
    });

    return new File([blob], `portrait-${width}x${height}.png`, {type: 'image/png'});
}

/**
 * Reads the pixels and byte size behind a portrait source so the dialog can show "before" and
 * "after" numbers without decoding the image twice.
 *
 * @param {string} source data:, blob: or https: URL
 * @returns {Promise<{dataUrl: string, width: number, height: number, bytes: number}>}
 */
export async function readPortraitInfo(source) {
    const [image, file] = await Promise.all([
        imageCompression.loadImage(source),
        portraitSourceToFile(source),
    ]);
    return {
        bytes: file.size,
        dataUrl: source,
        height: image.naturalHeight,
        width: image.naturalWidth,
    };
}
