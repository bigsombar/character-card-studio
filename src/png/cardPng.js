import { Base64 } from 'js-base64';

import { SPEC_NAME, SPEC_VERSION } from '../spec/constants';
import { nowSeconds } from '../spec/dates';

/**
 * Card metadata helpers for PNG images.
 *
 * The raw chunk stream is read and written directly: image bytes are never decoded or re-encoded,
 * and card JSON is carried in `tEXt` chunks. `ccv3` stores the current CCv3 document while `chara`
 * remains readable for V2 imports. Metadata is inserted before IEND so IDAT ordering is preserved.
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
 * Scans a PNG chunk stream for the requested text keywords.
 *
 * Chunk lengths and CRCs are checked before a payload is accepted. A damaged chunk produces a
 * warning instead of aborting the scan, so other readable card payloads remain available.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} source
 * @param {string|string[]} [keywords] Keywords to collect; defaults to the card keywords
 * @returns {Promise<{chunks: Array<{keyword:string,data:Object}>, warnings: Array}>}
 */
export async function extractPngTextPayloads(source, keywords) {
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

function normalizeChunkList(cardPayload) {
    const list = Array.isArray(cardPayload) ? cardPayload : [cardPayload];
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
 * Writes text payloads immediately before IEND and keeps the original image chunks untouched.
 *
 * A source that is truncated before IEND receives the payloads at the end, so a damaged portrait
 * cannot make an export silently lose its card data.
 *
 * @param {ArrayBuffer|Uint8Array} source
 * @param {{keyword:string,data:Object}|Array<{keyword:string,data:Object}>} cardPayload
 * @returns {Promise<ArrayBuffer>}
 */
export async function writePngTextPayloads(source, cardPayload) {
    const bytes = await readSource(source);

    const region = buildTextChunkRegion(normalizeChunkList(cardPayload));
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
 * Drops selected text payloads and leaves unrelated metadata such as Software or Comment intact.
 *
 * Passing keywords removes matching chunks only; omitting them removes every `tEXt` chunk. Image
 * chunks are copied verbatim, so this operation cannot damage pixel data.
 *
 * @param {ArrayBuffer|Uint8Array} source
 * @param {string[]} [keywords]
 * @returns {Promise<ArrayBuffer>}
 */
export async function dropPngTextPayloads(source, keywords = null) {
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

export function countBookEntries(chunk) {
    const entries = chunk?.data?.data?.character_book?.entries;
    if (!Array.isArray(entries)) return 0;
    return entries.length;
}

function summarizeEmbeddedChunk(chunk) {
    return {
        chunk,
        entries: countBookEntries(chunk),
        keyword: chunk.keyword,
        modified: chunk.data?.data?.modification_date,
        name: chunk.data?.data?.name,
        spec: chunk.data?.spec,
        specVersion: chunk.data?.spec_version,
    };
}

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => (
            `${JSON.stringify(key)}:${canonicalJson(value[key])}`
        )).join(',')}}`;
    }
    return JSON.stringify(value);
}

function samePayload(left, right) {
    try {
        // Key order differs between writers even when the card content is identical.
        return canonicalJson(left.chunk.data) === canonicalJson(right.chunk.data);
    } catch {
        return false;
    }
}

function pickRichest(group) {
    return group.reduce((best, candidate) => (
        candidate.entries > best.entries ? candidate : best
    ));
}

/**
 * Resolves the card payloads embedded in a PNG.
 *
 * A PNG may carry both the V3 `ccv3` payload and the legacy V2 `chara` payload. The V3 copy always
 * wins by default. When the two copies carry different data, `needsChoice` is true so the import
 * surface can ask which copy the user wants instead of silently discarding one.
 *
 * Several chunks with the same keyword are reduced to the one with the most lorebook entries; a
 * warning reports the duplicates. The first chunk wins ties.
 *
 * @param {Array<{keyword:string,data:Object}>} chunks
 * @returns {{
 *   selected: {keyword:string,data:Object}|null,
 *   candidates: Array<Object>,
 *   needsChoice: boolean,
 *   warnings: Array
 * }}
 */
export function resolveEmbeddedCard(chunks) {
    const warnings = [];
    if (!Array.isArray(chunks)) {
        return { selected: null, candidates: [], needsChoice: false, warnings };
    }

    const grouped = new Map();
    for (const chunk of chunks) {
        if (!chunk || typeof chunk !== 'object' || !chunk.data) continue;
        if (!CARD_KEYWORDS.includes(chunk.keyword)) continue;
        const bucket = grouped.get(chunk.keyword) ?? [];
        bucket.push(summarizeEmbeddedChunk(chunk));
        grouped.set(chunk.keyword, bucket);
    }

    const candidates = [];
    for (const keyword of CARD_KEYWORDS) {
        const bucket = grouped.get(keyword);
        if (!bucket?.length) continue;
        if (bucket.length > 1) {
            warnings.push({
                code: keyword === 'ccv3' ? 'MULTIPLE_CCV3' : 'MULTIPLE_CHARA',
                message: `PNG contains ${bucket.length} ${keyword} chunks; the copy with the most lorebook entries is offered.`,
            });
        }
        candidates.push(pickRichest(bucket));
    }

    const ccv3 = candidates.find((candidate) => candidate.keyword === 'ccv3') ?? null;
    const chara = candidates.find((candidate) => candidate.keyword === 'chara') ?? null;
    const selected = ccv3 ?? chara;

    if (!selected) {
        return { selected: null, candidates, needsChoice: false, warnings };
    }

    if (ccv3 && chara) {
        if (chara.entries > ccv3.entries) {
            warnings.push({
                code: 'CHARA_RICHER_THAN_CCV3',
                message: 'The V2 chara copy has more lorebook entries than ccv3. V3 is selected by default; choose the V2 copy if you need those entries.',
            });
        }
    } else if (chara) {
        warnings.push({
            code: 'ONLY_CHARA',
            message: 'PNG contains only a V2 chara payload. It will be converted to V3 on import.',
        });
    }

    return {
        candidates,
        needsChoice: Boolean(ccv3 && chara && !samePayload(ccv3, chara)),
        selected: selected.chunk,
        warnings,
    };
}

/**
 * Creates a detached V3 snapshot for an export.
 *
 * The live card is not mutated. A missing `creation_date` receives the export timestamp and
 * `modification_date` always reflects this export. A declared `spec_version` is preserved;
 * otherwise the snapshot is written as 3.0. V2 is import-only and is never produced here.
 *
 * @param {Object} cardData Snapshot of the card to serialize
 * @param {number} [now] Unix-seconds stamp written into modification_date; defaults to "now"
 * @returns {Object}
 */
export function createExportSnapshot(cardData, now = nowSeconds()) {
    const outgoing = { ...cardData, data: { ...cardData.data } };
    const declared = typeof cardData?.spec_version === 'string' ? cardData.spec_version.trim() : '';

    outgoing.spec = SPEC_NAME;
    outgoing.spec_version = declared !== '' ? declared : SPEC_VERSION;
    outgoing.data.creation_date ??= now;
    outgoing.data.modification_date = now;
    return outgoing;
}

/**
 * Produces a PNG with the original portrait stream and a fresh `ccv3` metadata payload.
 *
 * Existing card payloads are removed first, so the result contains exactly one current copy of the
 * card and no stale `chara` duplicate.
 *
 * @param {ArrayBuffer} portraitBytes Portrait PNG; existing card chunks are replaced
 * @param {Object} cardData Snapshot of the card to serialize
 * @returns {Promise<ArrayBuffer>}
 */
export async function composeCardPng(portraitBytes, cardData) {
    const strippedPng = await dropPngTextPayloads(portraitBytes, CARD_KEYWORDS);
    return writePngTextPayloads(strippedPng, [{ keyword: 'ccv3', data: createExportSnapshot(cardData, nowSeconds()) }]);
}

/**
 * Estimates the byte cost of the `ccv3` payload without assembling an image.
 *
 * The portrait panel uses this to keep its size hint aligned with the export policy.
 *
 * @param {Object} cardData Snapshot of the card to serialize
 * @returns {number}
 */
export function estimateCardPayloadBytes(cardData, now = nowSeconds()) {
    return CHUNK_OVERHEAD + encodeTextPayload('ccv3', createExportSnapshot(cardData, now)).length;
}
