/**
 * Test-only PNG fixtures.
 *
 * The builder writes the PNG structure from the specification (signature, IHDR, IDAT, IEND) and
 * uses its own CRC-32 implementation, so parser tests validate the production CRC code instead of
 * feeding it values produced by the same function.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
})();

export function fixtureCrc32(bytes, start = 0, end = bytes.length) {
    let crc = 0xffffffff;
    for (let index = start; index < end; index += 1) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[index]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export function makeChunk(type, payload = new Uint8Array(0)) {
    const body = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    const chunk = new Uint8Array(12 + body.length);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, body.length);
    for (let index = 0; index < 4; index += 1) chunk[4 + index] = type.charCodeAt(index);
    chunk.set(body, 8);
    view.setUint32(8 + body.length, fixtureCrc32(chunk.subarray(4, 8 + body.length)));

    return chunk;
}

function concat(parts) {
    const total = parts.reduce((size, part) => size + part.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => {
        output.set(part, offset);
        offset += part.length;
    });
    return output;
}

function ihdrChunk(width, height) {
    const payload = new Uint8Array(13);
    const view = new DataView(payload.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    payload[8] = 8; // bit depth
    payload[9] = 6; // RGBA
    return makeChunk('IHDR', payload);
}

// Structurally valid compressed-data stand-ins: the tests only move chunks around and never decode
// pixels, so the IDAT payload does not need to inflate to a real image.
const DEFAULT_IDAT = new Uint8Array([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]);

/**
 * Builds a PNG with a signature, IHDR, one or more IDAT chunks and IEND.
 *
 * @param {Object} [options]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {Uint8Array[]} [options.idat] Payloads for consecutive IDAT chunks
 * @returns {ArrayBuffer}
 */
export function createPng({ width = 1, height = 1, idat = [DEFAULT_IDAT] } = {}) {
    const parts = [
        Uint8Array.from(PNG_SIGNATURE),
        ihdrChunk(width, height),
        ...idat.map((payload) => makeChunk('IDAT', payload)),
        makeChunk('IEND'),
    ];
    return concat(parts).buffer;
}

export function createBlankPng(options) {
    return createPng(options);
}

export function createMultiIdatPng() {
    return createPng({
        idat: [new Uint8Array([0x78, 0x9c]), new Uint8Array([0x03, 0x00, 0x00, 0x00, 0x00, 0x01])],
    });
}

export function insertChunkBeforeIend(png, chunk) {
    const bytes = new Uint8Array(png);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const parts = [bytes.slice(0, 8)];
    let offset = 8;

    while (offset + 8 <= bytes.length) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
        if (type === 'IEND') parts.push(chunk);
        parts.push(bytes.slice(offset, offset + 12 + length));
        offset += 12 + length;
    }

    return concat(parts).buffer;
}

export function chunkTypes(png) {
    const bytes = new Uint8Array(png);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const types = [];
    let offset = 8;

    while (offset + 8 <= bytes.length) {
        const length = view.getUint32(offset);
        types.push(String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]));
        offset += 12 + length;
    }

    return types;
}

export function textKeywords(png) {
    const bytes = new Uint8Array(png);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const keywords = [];
    let offset = 8;

    while (offset + 8 <= bytes.length) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
        if (type === 'tEXt') {
            const payload = bytes.subarray(offset + 8, offset + 8 + length);
            const separator = payload.indexOf(0);
            keywords.push(new TextDecoder().decode(separator === -1 ? payload : payload.subarray(0, separator)));
        }
        offset += 12 + length;
    }

    return keywords;
}

export function pngBase64(png) {
    const bytes = new Uint8Array(png);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
}

export function pngDataUrl(png) {
    return `data:image/png;base64,${pngBase64(png)}`;
}

export function pngFile(png, name = 'card.png') {
    return new File([png], name, { type: 'image/png' });
}
