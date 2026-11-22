/**
 * Independent PNG fixtures for tests.
 *
 * The encoder writes the byte layout from the PNG specification and checksum implementation from
 * RFC 1952 separately from production code, so a bug in the card PNG writer cannot validate
 * itself. Pixel data is intentionally a tiny valid-looking zlib stream; these tests inspect chunk
 * structure, not decoded images.
 */

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DEFAULT_IDAT = new Uint8Array([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]);

/**
 * Bitwise CRC-32 with the reflected 0xEDB88320 polynomial. Deliberately table-free so it does not
 * share an implementation detail with the production chunk writer.
 */
export function independentCrc32(bytes, start = 0, end = bytes.length) {
    let crc = 0xffffffff;
    for (let index = start; index < end; index += 1) {
        crc ^= bytes[index];
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export function encodeFixtureChunk(type, payload = new Uint8Array(0)) {
    const typeBytes = new TextEncoder().encode(type);
    if (typeBytes.length !== 4) throw new Error(`PNG chunk type must be four bytes: ${type}`);

    const body = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    const chunk = new Uint8Array(12 + body.length);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, body.length);
    chunk.set(typeBytes, 4);
    chunk.set(body, 8);
    view.setUint32(8 + body.length, independentCrc32(chunk.subarray(4, 8 + body.length)));
    return chunk;
}

function joinParts(parts) {
    const size = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
}

function ihdrChunk(width, height) {
    const payload = new Uint8Array(13);
    const view = new DataView(payload.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    payload[8] = 8;
    payload[9] = 6;
    return encodeFixtureChunk('IHDR', payload);
}

/**
 * Builds a structurally valid PNG container.
 *
 * @param {{width?: number, height?: number, idatChunks?: Uint8Array[]}} [options]
 * @returns {ArrayBuffer}
 */
export function makePngFixture({ width = 1, height = 1, idatChunks = [DEFAULT_IDAT] } = {}) {
    const parts = [
        PNG_MAGIC,
        ihdrChunk(width, height),
        ...idatChunks.map((payload) => encodeFixtureChunk('IDAT', payload)),
        encodeFixtureChunk('IEND'),
    ];
    return joinParts(parts).buffer;
}

export function makeMultiIdatPngFixture() {
    return makePngFixture({
        idatChunks: [
            new Uint8Array([0x78, 0x9c]),
            new Uint8Array([0x03, 0x00, 0x00, 0x00, 0x00, 0x01]),
        ],
    });
}

export function insertFixtureChunkBeforeIend(png, chunk) {
    const bytes = new Uint8Array(png);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const parts = [bytes.slice(0, 8)];
    let offset = 8;

    while (offset + 8 <= bytes.length) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7],
        );
        if (type === 'IEND') parts.push(chunk);
        parts.push(bytes.slice(offset, offset + 12 + length));
        offset += 12 + length;
    }

    return joinParts(parts).buffer;
}

function* fixtureChunks(png) {
    const bytes = png instanceof Uint8Array ? png : new Uint8Array(png);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8;

    while (offset + 8 <= bytes.byteLength) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7],
        );
        yield { payload: bytes.subarray(offset + 8, offset + 8 + length), type };
        offset += 12 + length;
    }
}

export function collectChunkTypes(png) {
    return [...fixtureChunks(png)].map((chunk) => chunk.type);
}

export function collectTextKeywords(png) {
    const keywords = [];
    for (const chunk of fixtureChunks(png)) {
        if (chunk.type !== 'tEXt') continue;
        const separator = chunk.payload.indexOf(0);
        const keyword = separator === -1 ? chunk.payload : chunk.payload.subarray(0, separator);
        keywords.push(new TextDecoder().decode(keyword));
    }
    return keywords;
}

export function encodePngBase64(png) {
    const bytes = new Uint8Array(png);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
}

export function pngFixtureDataUrl(png) {
    return `data:image/png;base64,${encodePngBase64(png)}`;
}

export function pngFixtureFile(png, name = 'card.png') {
    return new File([png], name, { type: 'image/png' });
}
