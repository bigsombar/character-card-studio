import {
    extensionFromFilename,
    isSupportedExtension,
    MAX_FILE_BYTES,
    mediaKindForExtension,
    mimeForExtension,
} from './media';

const MIME_EXTENSION = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
};

const DEFAULT_DOWNLOAD_LIMIT = 250 * 1024 * 1024;

export function extensionFromMime(mime) {
    const normalized = String(mime ?? '').split(';')[0].trim().toLowerCase();
    return MIME_EXTENSION[normalized] ?? '';
}

function startsWith(bytes, signature) {
    if (bytes.length < signature.length) return false;
    return signature.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes, start, length) {
    let text = '';
    for (let index = 0; index < length; index++) {
        const byte = bytes[start + index];
        if (byte === undefined) return '';
        text += String.fromCharCode(byte);
    }
    return text;
}

/** Best-effort extension detection from magic bytes, so servers with wrong MIME types still work. */
export function sniffExtension(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 2) return '';

    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpg';
    if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'gif';
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'wav';
    if (ascii(bytes, 0, 4) === 'OggS') return 'ogg';
    if (ascii(bytes, 0, 3) === 'ID3') return 'mp3';
    if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'mp3';
    if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm';
    if (ascii(bytes, 4, 4) === 'ftyp') {
        const brand = ascii(bytes, 8, 4).toLowerCase();
        if (brand.startsWith('avif') || brand.startsWith('avis')) return 'avif';
        return 'mp4';
    }

    return '';
}

function limitForKind(kind) {
    return MAX_FILE_BYTES[kind] ?? DEFAULT_DOWNLOAD_LIMIT;
}

function fail(message, code, extra = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, extra);
    return error;
}

function normalizeNetworkError(error, signal) {
    if (signal?.aborted) return error;
    if (error?.name === 'AbortError') {
        return fail('The download timed out. Try again or skip this link.', 'TIMEOUT');
    }
    if (error instanceof TypeError) {
        return fail(
            'Network or CORS error: the host did not allow a browser download. Retry or skip this link.',
            'NETWORK',
        );
    }
    return error;
}

/**
 * Downloads a remote media file with progress reporting, size limits and a timeout.
 *
 * @param {string} url Original media URL (must be HTTPS)
 * @param {{
 *   signal?: AbortSignal,
 *   expectedKind?: string,
 *   onProgress?: (state:{loaded:number,total:number|null}) => void,
 *   timeoutMs?: number,
 *   bodyStallTimeoutMs?: number,
 *   proxy?: {name:string, build:(url:string)=>string, maxBytes?:number}|null
 * }} [options]
 * @returns {Promise<{blob: Blob, ext: string, kind: string, mime: string, size: number}>}
 */
export async function downloadRemoteMedia(url, options = {}) {
    const {
        signal,
        expectedKind = 'other',
        onProgress = () => {},
        timeoutMs = 60_000,
        bodyStallTimeoutMs = 30_000,
        proxy = null,
    } = options;

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        throw fail('This is not a valid URL.', 'INVALID_URL');
    }

    if (parsed.protocol !== 'https:') {
        throw fail('Only HTTPS media links can be downloaded. Insecure HTTP links were skipped.', 'INSECURE_URL');
    }

    const maxBytes = Math.min(limitForKind(expectedKind), proxy?.maxBytes ?? Number.POSITIVE_INFINITY);
    const requestUrl = proxy ? proxy.build(parsed.href) : parsed.href;
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(signal?.reason);
    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener('abort', abortFromCaller, {once: true});
    let headerTimer = setTimeout(() => {
        controller.abort(fail('The download timed out waiting for a response.', 'TIMEOUT'));
    }, timeoutMs);
    let bodyTimer = null;
    const startBodyTimer = () => {
        if (bodyTimer) clearTimeout(bodyTimer);
        bodyTimer = setTimeout(() => {
            controller.abort(fail('The download stalled while receiving the file.', 'TIMEOUT'));
        }, bodyStallTimeoutMs);
    };
    const stopBodyTimer = () => {
        if (bodyTimer) {
            clearTimeout(bodyTimer);
            bodyTimer = null;
        }
    };

    try {
        let response;
        try {
            response = await fetch(requestUrl, {
                credentials: 'omit',
                redirect: 'follow',
                signal: controller.signal,
            });
        } catch (error) {
            throw normalizeNetworkError(error, signal);
        } finally {
            // `timeoutMs` bounds the wait for response headers. Large media files get their own
            // stall timeout while the body is streamed.
            clearTimeout(headerTimer);
            headerTimer = null;
        }

        if (!response.ok) {
            throw fail(
                `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`,
                'HTTP',
                {status: response.status},
            );
        }

        const contentType = String(response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (contentType.startsWith('text/') || contentType === 'application/json') {
            throw fail(
                'The link returned a web page instead of media (hotlink protection or a login page).',
                'HTML',
            );
        }

        const declaredSize = Number(response.headers.get('content-length')) || 0;
        if (declaredSize > maxBytes) {
            throw fail(
                `File is too large (${(declaredSize / 1024 / 1024).toFixed(1)} MB). The limit is ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`,
                'TOO_LARGE',
            );
        }

        const chunks = [];
        let received = 0;

        if (response.body?.getReader) {
            const reader = response.body.getReader();
            startBodyTimer();
            try {
                for (;;) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    startBodyTimer();
                    received += value.byteLength;
                    if (received > maxBytes) {
                        await reader.cancel().catch(() => {});
                        throw fail(
                            `File exceeds the ${(maxBytes / 1024 / 1024).toFixed(0)} MB limit.`,
                            'TOO_LARGE',
                        );
                    }
                    chunks.push(value);
                    onProgress({loaded: received, total: declaredSize || null});
                }
            } finally {
                reader.releaseLock?.();
                stopBodyTimer();
            }
        } else {
            startBodyTimer();
            const buffer = new Uint8Array(await response.arrayBuffer());
            stopBodyTimer();
            received = buffer.byteLength;
            if (received > maxBytes) {
                throw fail(
                    `File exceeds the ${(maxBytes / 1024 / 1024).toFixed(0)} MB limit.`,
                    'TOO_LARGE',
                );
            }
            chunks.push(buffer);
            onProgress({loaded: received, total: received});
        }

        if (received === 0) throw fail('The downloaded file is empty.', 'EMPTY');

        const head = new Uint8Array(await new Blob(chunks).slice(0, 32).arrayBuffer());
        const urlExt = extensionFromFilename(parsed.pathname);
        const detected = [
            sniffExtension(head),
            extensionFromMime(contentType),
            urlExt,
        ].find((ext) => ext && isSupportedExtension(ext));

        if (!detected) {
            throw fail('The downloaded file type is not supported or could not be recognised.', 'UNSUPPORTED');
        }

        const kind = mediaKindForExtension(detected);
        const limit = limitForKind(kind);
        if (received > limit) {
            throw fail(
                `File is too large (${(received / 1024 / 1024).toFixed(1)} MB). The limit is ${(limit / 1024 / 1024).toFixed(0)} MB.`,
                'TOO_LARGE',
            );
        }

        return {
            blob: new Blob(chunks, {type: mimeForExtension(detected)}),
            ext: detected,
            kind,
            mime: mimeForExtension(detected),
            size: received,
        };
    } catch (error) {
        throw normalizeNetworkError(error, signal);
    } finally {
        if (headerTimer) clearTimeout(headerTimer);
        stopBodyTimer();
        signal?.removeEventListener('abort', abortFromCaller);
    }
}
