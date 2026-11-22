import { createAssetUri, makeUniqueUri, mediaDirectoryForExt, safeSlug, safeType } from '../assets/paths';
import { normalizeExtension } from '../assets/media';

export const CHARX_CARD_PATH = 'card.json';
export const MAX_CHARX_BYTES = 1024 * 1024 * 1024;
export const MAX_CHARX_ENTRIES = 1000;
export const MAX_CARD_JSON_BYTES = 10 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;

const ASCII_PATH = /^[A-Za-z0-9._/-]+$/;

export function isSafeZipPath(path) {
    if (typeof path !== 'string' || path.length === 0) return false;
    if (path.includes('\0') || path.includes('\\') || path.startsWith('/')) return false;
    if (/^[A-Za-z]:/.test(path)) return false;
    const parts = path.split('/');
    return parts.every((part) => part !== '..' && part !== '');
}

export function isAsciiZipPath(path) {
    return isSafeZipPath(path) && ASCII_PATH.test(path);
}

export function embededUriToPath(uri) {
    if (typeof uri !== 'string' || !uri.startsWith('embeded://')) return null;
    const path = uri.slice('embeded://'.length);
    return isSafeZipPath(path) ? path : null;
}

export function pathToEmbededUri(path) {
    return `embeded://${path}`;
}

export function defaultCharxPath(asset) {
    const ext = normalizeExtension(asset?.ext) || 'bin';
    const uri = createAssetUri({
        type: asset?.type,
        name: asset?.name,
        ext,
    });
    return uri.slice('embeded://'.length);
}

export function makeUniqueCharxPath(path, reserved) {
    const taken = reserved instanceof Set ? reserved : new Set(reserved ?? []);
    const uniqueUri = makeUniqueUri(`embeded://${path}`, new Set([...taken].map((item) => `embeded://${item}`)));
    return uniqueUri.slice('embeded://'.length);
}

export function assetPathInfo(asset) {
    const ext = normalizeExtension(asset?.ext) || 'bin';
    return {
        type: safeType(asset?.type),
        mediaDirectory: mediaDirectoryForExt(ext),
        slug: safeSlug(asset?.name),
        ext,
    };
}

export function sanitizeExportPath(asset, reserved) {
    const existing = embededUriToPath(asset?.uri);
    const path = existing && isAsciiZipPath(existing) && existing.startsWith('assets/')
        ? existing
        : defaultCharxPath(asset);
    return makeUniqueCharxPath(path, reserved);
}
