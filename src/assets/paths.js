import { mediaKindForExtension, normalizeExtension } from './media';

const MEDIA_DIRECTORY = {
    image: 'images',
    audio: 'audio',
    video: 'video',
    other: 'other',
};

function hashString(value) {
    let hash = 5381;
    for (let index = 0; index < value.length; index++) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
    }
    return (hash >>> 0).toString(36);
}

export function safeType(type, fallback = 'other') {
    const normalized = String(type ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return normalized || fallback;
}

export function safeSlug(name, fallback = 'asset') {
    const raw = String(name ?? '').trim();
    const ascii = raw
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\.[^.]+$/, '')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

    if (ascii) return ascii;
    if (!raw) return fallback;
    return `${fallback}-${hashString(raw)}`;
}

export function mediaDirectoryForExt(ext) {
    return MEDIA_DIRECTORY[mediaKindForExtension(ext)] ?? MEDIA_DIRECTORY.other;
}

export function createAssetUri({ type, name, ext, slug }) {
    const safeExt = normalizeExtension(ext);
    const safeName = safeSlug(slug || name);
    const directory = mediaDirectoryForExt(safeExt);
    return `embeded://assets/${safeType(type)}/${directory}/${safeName}.${safeExt}`;
}

export function makeUniqueUri(uri, existingUris) {
    const taken = existingUris instanceof Set ? existingUris : new Set(existingUris ?? []);
    if (!taken.has(uri)) return uri;

    const dot = uri.lastIndexOf('.');
    const slash = uri.lastIndexOf('/');
    const extensionStart = dot > slash ? dot : uri.length;
    const prefix = uri.slice(0, extensionStart);
    const suffix = uri.slice(extensionStart);

    let counter = 2;
    while (taken.has(`${prefix}-${counter}${suffix}`)) counter++;
    return `${prefix}-${counter}${suffix}`;
}
