import { Base64 } from 'js-base64';

import { SPEC_NAME, SPEC_VERSION } from '../spec/constants';
import { nowSeconds } from '../spec/dates';

/**
 * Single place for reading and writing character-card metadata inside PNG files.
 *
 * The module works directly on the byte layout from the PNG specification
 * (https://www.w3.org/TR/png/): an 8-byte signature followed by length-prefixed chunks, each with
 * a 4-byte type, its payload and a CRC-32 over type+payload. Card state travels in `tEXt` chunks
 * as base64-encoded JSON under the `ccv3` / `chara` keywords.
 */

const PNG_SIGNATURE = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURE_LENGTH = PNG_SIGNATURE.length;
const CHUNK_OVERHEAD = 12; // 4 bytes length + 4 bytes type + 4 bytes CRC
const CARD_KEYWORDS = Object.freeze(['ccv3', 'chara']);
const TYPE_CODE = Object.freeze({ tEXt: [0x74, 0x45, 0x58, 0x74] });

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let bit = 0; bit < 8; bit += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

/**
 * Standard CRC-32 (polynomial 0xEDB88320, reflected), used by every PNG chunk.
 *
 * @param {Uint8Array} bytes
 * @param {number} [start]
 * @param {number} [end]
 * @returns {number} unsigned 32-bit checksum
 */
export function crc32(bytes, start = 0, end = bytes.length) {
    let crc = 0xffffffff;
    for (let i = start; i < end; i += 1) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function hasPngSignature(bytes) {
    if (bytes.length < SIGNATURE_LENGTH) return false;
    return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function readType(bytes, offset) {
    return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function isChunkType(type) {
    return /^[A-Za-z]{4}$/.test(type);
}

function decodeLatin1(bytes) {
    // tEXt is defined as ISO-8859-1; decode byte-per-char in slices so large payloads cannot
    // overflow the argument limit of String.fromCharCode.
    let text = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        text += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return text;
}

const isArrayBuffer = (value) => Object.prototype.toString.call(value) === '[object ArrayBuffer]';

function asBytes(source) {
    // Cross-realm safe: files and fetch responses can produce ArrayBuffers from another realm,
    // where `instanceof ArrayBuffer` is false.
    if (isArrayBuffer(source)) return new Uint8Array(source);
    if (ArrayBuffer.isView(source)) {
        return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    }
    return null;
}

async function readSource(source) {
    const bytes = asBytes(source);
    if (bytes) return bytes;
    if (source && typeof source.arrayBuffer === 'function') {
        return new Uint8Array(await source.arrayBuffer());
    }
    throw new TypeError('Expected a PNG File/Blob, an ArrayBuffer or a Uint8Array.');
}

function* chunkRanges(bytes, { stopAtIend = false } = {}) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = SIGNATURE_LENGTH;

    while (offset + 8 <= bytes.length) {
        const length = view.getUint32(offset);
        const dataStart = offset + 8;
        const crcStart = dataStart + length;
        const end = crcStart + 4;

        if (end > bytes.length) {
            yield { end: bytes.length, malformed: 'truncated', offset, start: offset };
            return;
        }

        const type = readType(bytes, offset + 4);
        if (!isChunkType(type)) {
            yield { end: bytes.length, malformed: 'type', offset, start: offset };
            return;
        }

        yield { crcStart, dataStart, end, length, start: offset, type };
        if (stopAtIend && type === 'IEND') return;
        offset = end;
    }

    if (offset < bytes.length) {
        yield { end: bytes.length, malformed: 'truncated', offset, start: offset };
    }
}

function isCrcValid(bytes, range) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const stored = view.getUint32(range.crcStart);
    return stored === crc32(bytes, range.start + 4, range.crcStart);
}

function normalizeKeywords(keywords) {
    if (keywords === undefined || keywords === null) return new Set(CARD_KEYWORDS);
    return new Set(Array.isArray(keywords) ? keywords : [keywords]);
}

/**
 * Reads embedded card chunks without trusting malformed data: the signature, every chunk length
 * and every CRC are validated, and one broken chunk cannot hide the others.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} source
 * @param {string|string[]} [keywords] Keywords to collect; defaults to the card keywords
 * @returns {Promise<{chunks: Array<{keyword:string,data:Object}>, warnings: Array}>}
 */
export async function parsePngChunks(source, keywords) {
    const bytes = await readSource(source);
    const requested = normalizeKeywords(keywords);
    const warnings = [];

    if (!hasPngSignature(bytes)) {
        return {
            chunks: [],
            warnings: [{
                code: 'PNG_SIGNATURE_INVALID',
                message: 'File does not have a valid PNG signature.',
            }],
        };
    }

    const chunks = [];
    const warnedTypes = new Set();

    for (const range of chunkRanges(bytes, { stopAtIend: true })) {
        if (range.malformed) {
            warnings.push(range.malformed === 'truncated'
                ? {
                    code: 'PNG_CHUNK_TRUNCATED',
                    message: `PNG chunk at byte ${range.start} is truncated; parsing stopped.`,
                }
                : {
                    code: 'PNG_CHUNK_TYPE_INVALID',
                    message: `PNG chunk at byte ${range.start} has an invalid type; parsing stopped.`,
                });
            break;
        }

        if (!isCrcValid(bytes, range)) {
            if (!warnedTypes.has(range.type)) {
                warnedTypes.add(range.type);
                warnings.push({
                    code: 'PNG_CRC_MISMATCH',
                    message: `The ${range.type} chunk at byte ${range.start} failed CRC validation and was ignored.`,
                });
            }
            continue;
        }

        if (range.type !== 'tEXt') continue;

        const payload = bytes.subarray(range.dataStart, range.dataStart + range.length);
        const separator = payload.indexOf(0);
        if (separator === -1) continue;

        const keyword = decodeLatin1(payload.subarray(0, separator));
        if (requested && !requested.has(keyword)) continue;

        const text = decodeLatin1(payload.subarray(separator + 1));
        try {
            chunks.push({ keyword, data: JSON.parse(Base64.decode(text)) });
        } catch {
            warnings.push({
                code: 'CARD_CHUNK_INVALID',
                message: `The "${keyword}" chunk could not be decoded as base64 JSON and was skipped.`,
            });
        }
    }

    return { chunks, warnings };
}

function normalizeChunkList(dataJson) {
    const list = Array.isArray(dataJson) ? dataJson : [dataJson];
    return list.filter((item) => item && typeof item === 'object' && typeof item.keyword === 'string');
}

function encodeTextPayload(keyword, data) {
    return new TextEncoder().encode(`${keyword}\0${Base64.encode(JSON.stringify(data))}`);
}

function buildTextChunkRegion(items) {
    const encoded = items.map((item) => encodeTextPayload(item.keyword, item.data));
    const total = encoded.reduce((size, payload) => size + CHUNK_OVERHEAD + payload.length, 0);
    const region = new Uint8Array(total);
    const view = new DataView(region.buffer);

    let offset = 0;
    encoded.forEach((payload) => {
        view.setUint32(offset, payload.length);
        region.set(TYPE_CODE.tEXt, offset + 4);
        region.set(payload, offset + 8);
        view.setUint32(offset + 8 + payload.length, crc32(region, offset + 4, offset + 8 + payload.length));
        offset += CHUNK_OVERHEAD + payload.length;
    });

    return region;
}

/**
 * Inserts `tEXt` card chunks right before IEND (keeping IDAT chunks contiguous) and returns a new
 * PNG. A source without IEND still gets the card data appended so an export never silently loses
 * the character.
 *
 * @param {ArrayBuffer|Uint8Array} source
 * @param {{keyword:string,data:Object}|Array<{keyword:string,data:Object}>} dataJson
 * @returns {Promise<ArrayBuffer>}
 */
export async function assembleNewPng(source, dataJson) {
    const bytes = await readSource(source);

    const region = buildTextChunkRegion(normalizeChunkList(dataJson));
    const output = new Uint8Array(bytes.length + region.length);
    output.set(bytes.subarray(0, Math.min(SIGNATURE_LENGTH, bytes.length)));

    let writeOffset = Math.min(SIGNATURE_LENGTH, bytes.length);
    let inserted = false;

    for (const range of chunkRanges(bytes)) {
        if (range.malformed) {
            output.set(bytes.subarray(range.start), writeOffset);
            writeOffset += bytes.length - range.start;
            break;
        }
        if (range.type === 'IEND' && !inserted) {
            output.set(region, writeOffset);
            writeOffset += region.length;
            inserted = true;
        }
        output.set(bytes.subarray(range.start, range.end), writeOffset);
        writeOffset += range.end - range.start;
    }

    if (!inserted) {
        output.set(region, writeOffset);
        writeOffset += region.length;
    }

    return writeOffset === output.length ? output.buffer : output.buffer.slice(0, writeOffset);
}

function textKeyword(bytes, range) {
    const payload = bytes.subarray(range.dataStart, range.dataStart + range.length);
    const separator = payload.indexOf(0);
    return separator === -1 ? null : decodeLatin1(payload.subarray(0, separator));
}

/**
 * Removes `tEXt` card chunks while keeping unrelated metadata such as Software or Comment.
 *
 * With `keywords`, only matching chunks are removed; without it, every `tEXt` chunk is removed.
 * The remaining chunks are copied verbatim, so re-encoding can never damage image data.
 *
 * @param {ArrayBuffer|Uint8Array} source
 * @param {string[]} [keywords]
 * @returns {Promise<ArrayBuffer>}
 */
export async function stripPngChunks(source, keywords = null) {
    const bytes = await readSource(source);

    const only = Array.isArray(keywords) ? new Set(keywords) : null;
    const kept = [{ end: Math.min(SIGNATURE_LENGTH, bytes.length), start: 0 }];
    let total = kept[0].end;

    for (const range of chunkRanges(bytes)) {
        if (range.malformed) {
            kept.push({ end: bytes.length, start: range.start });
            total += bytes.length - range.start;
            break;
        }

        let remove = range.type === 'tEXt' && !only;
        if (range.type === 'tEXt' && only) {
            const keyword = textKeyword(bytes, range);
            remove = keyword !== null && only.has(keyword);
        }

        if (!remove) {
            kept.push({ end: range.end, start: range.start });
            total += range.end - range.start;
        }
    }

    const output = new Uint8Array(total);
    let offset = 0;
    kept.forEach((range) => {
        output.set(bytes.subarray(range.start, range.end), offset);
        offset += range.end - range.start;
    });

    return output.buffer;
}

export function countLorebookEntries(chunk) {
    const entries = chunk?.data?.data?.character_book?.entries;
    if (!Array.isArray(entries)) return 0;
    return entries.length;
}

/**
 * Chooses which embedded card copy to import.
 *
 * CCv3 says to use ccv3 when both ccv3 and chara are present. We follow that rule, but report a
 * warning if the V2 copy appears richer, so the user can see why data may look different.
 * The precedence lives in CARD_KEYWORDS: earlier keywords win, and duplicates of the same keyword
 * resolve to the chunk with the most lorebook entries (first chunk wins ties).
 *
 * @param {Array<{keyword:string,data:Object}>} chunks
 * @returns {{chunk: Object|null, warnings: Array}}
 */
export function selectImportChunk(chunks) {
    const warnings = [];
    if (!Array.isArray(chunks)) return { chunk: null, warnings };

    const candidates = new Map();
    chunks.forEach((chunk) => {
        if (!chunk || typeof chunk !== 'object' || !chunk.data) return;
        if (!CARD_KEYWORDS.includes(chunk.keyword)) return;

        const entries = countLorebookEntries(chunk);
        const current = candidates.get(chunk.keyword);
        if (!current) {
            candidates.set(chunk.keyword, { best: chunk, bestEntries: entries, count: 1 });
            return;
        }
        current.count += 1;
        if (entries > current.bestEntries) {
            current.best = chunk;
            current.bestEntries = entries;
        }
    });

    const ccv3 = candidates.get('ccv3');
    if (ccv3) {
        if (ccv3.count > 1) {
            warnings.push({
                code: 'MULTIPLE_CCV3',
                message: `PNG contains ${ccv3.count} ccv3 chunks; the one with the most lorebook entries was selected.`,
            });
        }
        const chara = candidates.get('chara');
        if (chara && chara.bestEntries > ccv3.bestEntries) {
            warnings.push({
                code: 'CHARA_RICHER_THAN_CCV3',
                message: 'The V2 chara chunk has more lorebook entries than ccv3. CCv3 takes precedence; use the V2 copy manually if needed.',
            });
        }
        return { chunk: ccv3.best, warnings };
    }

    const chara = candidates.get('chara');
    if (chara) {
        warnings.push({
            code: 'ONLY_CHARA',
            message: 'PNG contains only a V2 chara chunk. It will be converted to V3 on import.',
        });
        return { chunk: chara.best, warnings };
    }

    return { chunk: null, warnings };
}

/**
 * Backwards-compatible helper that returns only the selected chunk.
 *
 * @param {Array<{keyword:string,data:Object}>} chunks
 * @returns {{keyword:string,data:Object}|null}
 */
export default function selectPreferredCardChunk(chunks) {
    return selectImportChunk(chunks).chunk;
}

/**
 * Builds the V3 object embedded in exports without mutating the state it is built from.
 * Export is V3-only; V2 is accepted on import and never written back.
 *
 * @param {Object} cardData Snapshot of the card to serialize
 * @param {number} [now] Unix-seconds stamp written into modification_date; defaults to "now"
 * @returns {Object}
 */
export function buildOutgoingCard(cardData, now = nowSeconds()) {
    const outgoing = { ...cardData, data: { ...cardData.data } };
    const declared = typeof cardData?.spec_version === 'string' ? cardData.spec_version.trim() : '';

    outgoing.spec = SPEC_NAME;
    outgoing.spec_version = declared !== '' ? declared : SPEC_VERSION;
    outgoing.data.creation_date ??= now;
    outgoing.data.modification_date = now;
    return outgoing;
}

/**
 * Assembles an exportable V3 character card PNG from a portrait image and card state.
 *
 * @param {ArrayBuffer} imageArrayBuffer Portrait PNG; any existing card chunks are dropped
 * @param {Object} cardData Snapshot of the card to serialize
 * @returns {Promise<ArrayBuffer>}
 */
export async function buildCardPng(imageArrayBuffer, cardData) {
    const strippedPng = await stripPngChunks(imageArrayBuffer, CARD_KEYWORDS);
    return assembleNewPng(strippedPng, [{ keyword: 'ccv3', data: buildOutgoingCard(cardData, nowSeconds()) }]);
}

/**
 * Byte size of the tEXt chunk buildCardPng embeds for this card, computed without assembling the PNG.
 *
 * @param {Object} cardData Snapshot of the card to serialize
 * @returns {number}
 */
export function cardDataChunkBytes(cardData, now = nowSeconds()) {
    return CHUNK_OVERHEAD + encodeTextPayload('ccv3', buildOutgoingCard(cardData, now)).length;
}
