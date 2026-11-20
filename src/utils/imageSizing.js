/**
 * Megapixel sizing shared by the portrait dialog and the image-asset compressor.
 *
 * Sizes are expressed in megapixels because that is what determines the exported file weight and
 * is easier to reason about than a long-edge limit. Both sides snap to a 16 px grid so the result
 * stays friendly to texture decoding on the runtime side.
 */

const GRID = 16;
const MIN_SIDE = 16;

/** Megapixel targets offered by both compression dialogs. */
export const MP_PRESETS = [2, 1.5, 1, 0.5];

function snapToGrid(value) {
    return Math.max(MIN_SIDE, Math.round(value / GRID) * GRID);
}

/**
 * Converts a megapixel target into concrete pixel dimensions while keeping the aspect ratio and
 * rounding both sides to a multiple of 16.
 *
 * @param {number} width Source width in pixels
 * @param {number} height Source height in pixels
 * @param {number} megapixels Requested megapixels
 * @returns {{width: number, height: number}}
 */
export function targetDimensions(width, height, megapixels) {
    const sourceArea = Math.max(1, width * height);
    const requestedArea = Math.max(1, megapixels * 1_000_000);
    const scale = Math.sqrt(requestedArea / sourceArea);

    return {
        height: snapToGrid(height * scale),
        width: snapToGrid(width * scale),
    };
}

/**
 * Whether a target actually reduces an image once both sides are snapped. Grid rounding can map a
 * target back to the source dimensions, and upscaling would only add bytes.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} megapixels
 * @returns {boolean}
 */
export function shrinksAt(width, height, megapixels) {
    const target = targetDimensions(width, height, megapixels);
    return target.width <= width
        && target.height <= height
        && (target.width < width || target.height < height);
}

/**
 * Human-readable megapixel count for before/after lines.
 *
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function formatMegapixels(width, height) {
    return `${Number(((width * height) / 1_000_000).toFixed(2))} MP`;
}
