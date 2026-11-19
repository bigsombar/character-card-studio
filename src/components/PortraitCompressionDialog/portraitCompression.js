import imageCompression from 'browser-image-compression';

/**
 * Compression helpers for the portrait dialog.
 *
 * The selected portrait can resolve to a `data:` URL, a `blob:` object URL (local IndexedDB
 * assets) or an `https:` URL. browser-image-compression's `getFilefromDataUrl` only understands
 * base64 data URLs and throws on blob URLs, so normalise every source through `fetch` first.
 */
export async function portraitSourceToFile(source, name = 'portrait.png') {
    const response = await fetch(source);
    if (!response.ok) {
        throw new Error('The portrait image could not be loaded.');
    }
    const blob = await response.blob();
    return new File([blob], name, {type: blob.type || 'image/png'});
}

export async function compressPortraitSource(source, maxSide) {
    const file = await portraitSourceToFile(source);
    // Keep everything local: the library's web-worker mode imports its script from a CDN by
    // default, which would be a third-party request from a local-first editor.
    return imageCompression(file, {
        fileType: 'image/png',
        maxWidthOrHeight: maxSide,
        useWebWorker: false,
    });
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
