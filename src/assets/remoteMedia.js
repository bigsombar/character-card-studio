import {
    extensionFromFilename,
    isSupportedExtension,
    mediaKindForExtension,
} from './media';
import { safeSlug } from './paths';

/** Text fields that can contain user-visible media links. */
const TEXT_FIELDS = [
    'description',
    'personality',
    'scenario',
    'first_mes',
    'mes_example',
    'creator_notes',
    'system_prompt',
    'post_history_instructions',
];

const GREETING_FIELDS = ['alternate_greetings', 'group_only_greetings'];

const MARKDOWN_IMAGE = /!\[[^\]]*]\(\s*(https?:\/\/[^\s)]+?)(?:\s+["'][^"']*["'])?\s*\)/gi;
const HTML_MEDIA = /<(img|audio|video|source)\b[^>]*?\bsrc\s*=\s*["']\s*(https?:\/\/[^"'\s]+)\s*["'][^>]*>/gi;
const BBCODE_IMAGE = /\[img]\s*(https?:\/\/[^\s[\]]+)\s*\[\/img]/gi;
const BARE_URL = /https?:\/\/[^\s<>"'`]+/gi;

const KIND_BY_TAG = {
    img: 'image',
    audio: 'audio',
    video: 'video',
};

function hashString(value) {
    let hash = 5381;
    for (let index = 0; index < value.length; index++) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
    }
    return (hash >>> 0).toString(36);
}

function trimBareUrl(raw) {
    let url = raw.replace(/[.,;:!?]+$/, '');
    // Close parentheses are commonly part of prose, not the URL. Balance them.
    while (url.endsWith(')')) {
        const open = (url.match(/\(/g) ?? []).length;
        const close = (url.match(/\)/g) ?? []).length;
        if (close <= open) break;
        url = url.slice(0, -1);
    }
    return url;
}

function kindForUrl(url, fallback = null) {
    let path;
    try {
        path = new URL(url).pathname;
    } catch {
        return fallback ?? 'other';
    }
    const ext = extensionFromFilename(path);
    if (ext && isSupportedExtension(ext)) return mediaKindForExtension(ext);
    return fallback ?? 'other';
}

/**
 * Returns media-looking URLs found in one text value. Markdown images, HTML media tags and
 * BBCode images are always candidates; plain URLs only when they carry a supported extension.
 */
export function extractRemoteMedia(text) {
    if (typeof text !== 'string' || text === '') return [];

    const found = new Map();

    const add = (raw, fallbackKind, syntax) => {
        const url = trimBareUrl(raw);
        if (!url) return;
        const kind = kindForUrl(url, fallbackKind);
        const previous = found.get(url);
        if (previous) {
            previous.syntaxes.add(syntax);
            if (previous.kind === 'other') previous.kind = kind;
            return;
        }
        found.set(url, {url, kind, syntaxes: new Set([syntax])});
    };

    for (const match of text.matchAll(MARKDOWN_IMAGE)) add(match[1], 'image', 'markdown');
    for (const match of text.matchAll(BBCODE_IMAGE)) add(match[1], 'image', 'bbcode');
    for (const match of text.matchAll(HTML_MEDIA)) add(match[2], KIND_BY_TAG[match[1].toLowerCase()] ?? 'other', 'html');

    for (const match of text.matchAll(BARE_URL)) {
        const url = trimBareUrl(match[0]);
        let ext;
        try {
            ext = extensionFromFilename(new URL(url).pathname);
        } catch {
            ext = '';
        }
        if (ext && isSupportedExtension(ext)) add(url, mediaKindForExtension(ext), 'url');
    }

    return [...found.values()].map((entry) => ({url: entry.url, kind: entry.kind}));
}

/**
 * Applies `visitor` to every editable text field that can contain media references.
 * The visitor receives and returns the text value; it may return the value unchanged.
 *
 * @param {Object} data Card `data` object (mutated in place)
 * @param {(value: string, path: string) => string} visitor
 */
export function visitTextFields(data, visitor) {
    if (!data || typeof data !== 'object') return;

    for (const field of TEXT_FIELDS) {
        if (typeof data[field] === 'string') data[field] = visitor(data[field], `data.${field}`);
    }

    for (const field of GREETING_FIELDS) {
        if (!Array.isArray(data[field])) continue;
        data[field] = data[field].map((value, index) => (
            typeof value === 'string' ? visitor(value, `data.${field}[${index}]`) : value
        ));
    }

    if (data.creator_notes_multilingual && typeof data.creator_notes_multilingual === 'object') {
        for (const [code, value] of Object.entries(data.creator_notes_multilingual)) {
            if (typeof value === 'string') {
                data.creator_notes_multilingual[code] = visitor(
                    value,
                    `data.creator_notes_multilingual.${code}`,
                );
            }
        }
    }

    const book = data.character_book;
    if (book && typeof book === 'object') {
        for (const field of ['name', 'description']) {
            if (typeof book[field] === 'string') {
                book[field] = visitor(book[field], `data.character_book.${field}`);
            }
        }
        if (Array.isArray(book.entries)) {
            book.entries = book.entries.map((entry, index) => {
                if (!entry || typeof entry !== 'object') return entry;
                const next = {...entry};
                if (typeof next.content === 'string') {
                    next.content = visitor(next.content, `data.character_book.entries[${index}].content`);
                }
                if (typeof next.comment === 'string') {
                    next.comment = visitor(next.comment, `data.character_book.entries[${index}].comment`);
                }
                return next;
            });
        }
    }
}

/**
 * Collects unique remote media URLs across every editable text field, including greetings,
 * multilingual notes and lorebook entries.
 *
 * @param {Object} card
 * @returns {Array<{url:string, kind:'image'|'audio'|'video'|'other', occurrences:number, paths:string[]}>}
 */
export function collectRemoteMedia(card) {
    const data = card?.data;
    if (!data || typeof data !== 'object') return [];

    const byUrl = new Map();

    visitTextFields(data, (value, path) => {
        for (const found of extractRemoteMedia(value)) {
            const entry = byUrl.get(found.url) ?? {
                url: found.url,
                kind: found.kind,
                occurrences: 0,
                paths: new Set(),
            };
            entry.occurrences += 1;
            entry.paths.add(path);
            if (entry.kind === 'other') entry.kind = found.kind;
            byUrl.set(found.url, entry);
        }
        return value;
    });

    return [...byUrl.values()].map((entry) => ({
        ...entry,
        paths: [...entry.paths],
    }));
}

function cloneCard(card) {
    if (typeof structuredClone === 'function') return structuredClone(card);
    return JSON.parse(JSON.stringify(card));
}

/**
 * Replaces every occurrence of the urls in `mapping` across all editable text fields.
 *
 * @param {Object} card
 * @param {Object<string,string>|Map<string,string>} mapping URL → local URI
 * @returns {{card: Object, replacements: number}}
 */
export function replaceTextReferences(card, mapping) {
    const entries = mapping instanceof Map ? [...mapping.entries()] : Object.entries(mapping ?? {});
    const usable = entries
        .filter(([from, to]) => typeof from === 'string' && from !== '' && typeof to === 'string' && to !== '')
        .sort(([left], [right]) => right.length - left.length);

    if (usable.length === 0) return {card, replacements: 0};

    const next = cloneCard(card);
    let replacements = 0;

    visitTextFields(next?.data, (value) => {
        let result = value;
        for (const [from, to] of usable) {
            if (!result.includes(from)) continue;
            const parts = result.split(from);
            replacements += parts.length - 1;
            result = parts.join(to);
        }
        return result;
    });

    return {card: next, replacements};
}

/**
 * Deterministic asset name for a remote URL. It lets the downloader recognise files that were
 * already saved in an earlier session instead of creating duplicates.
 */
export function remoteAssetName(url) {
    let basename;
    try {
        const parsed = new URL(url);
        const last = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
        basename = decodeURIComponent(last).replace(/\.[^.]+$/, '') || 'remote';
    } catch {
        basename = 'remote';
    }
    const slug = (safeSlug(basename, 'remote') || 'remote').slice(0, 40);
    return `${slug}-${hashString(url)}`;
}
