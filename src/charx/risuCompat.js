import { extensionFromFilename, mediaKindForExtension, normalizeExtension } from '../assets/media';
import { safeSlug } from '../assets/paths';
import { visitTextFields } from '../assets/remoteMedia';
import { embededUriToPath } from './charxPaths';

/**
 * RisuAI compatibility layer for CHARX exports.
 *
 * RisuAI does not resolve `embeded://` URIs in message text: DOMPurify drops the unknown
 * protocol, so markdown/HTML images lose their `src`. It only renders its own CBS macros, and
 * those resolve either from `emotion` assets (`{{emotion::name}}`) or from assets exported with
 * the custom `x-risu-asset` type (`{{image::name}}`, `{{audio::name}}`, `{{video::name}}`).
 *
 * This module rewrites only the exported copy of the card. The editor data keeps the canonical
 * `![alt](embeded://path)` syntax and the standard CCv3 asset types. Mirrors point at the same
 * archive entries, so the ZIP does not grow by the size of the media.
 */

/** Markdown image with an `embeded://` destination, with optional title and angle brackets. */
const MARKDOWN_MEDIA = /!\[[^\]]*]\(\s*<?(embeded:\/\/[^\s)>]+?)>?(?:\s+["'][^"']*["'])?\s*\)/gi;
const BBCODE_MEDIA = /\[img]\s*(embeded:\/\/[^\s[\]]+)\s*\[\/img]/gi;
const HTML_IMG = /<img\b[^>]*?\bsrc\s*=\s*(["'])\s*(embeded:\/\/[^"'\s]+)\s*\1[^>]*>/gi;
const HTML_MEDIA = /<(audio|video)\b[^>]*?\bsrc\s*=\s*(["'])\s*(embeded:\/\/[^"'\s]+)\s*\2[^>]*>(?:[\s\S]*?<\/\1>)?/gi;

const MACRO_KIND = {
    image: 'image',
    audio: 'audio',
    video: 'video',
};

function cloneCard(card) {
    if (typeof structuredClone === 'function') return structuredClone(card);
    return JSON.parse(JSON.stringify(card));
}

function assetStem(asset) {
    const path = embededUriToPath(asset?.uri);
    const filename = path ? path.split('/').pop() : '';
    const basename = filename ? filename.replace(/\.[^.]+$/, '') : '';
    const slug = safeSlug(basename || asset?.name, 'asset');
    return (slug || 'asset').slice(0, 80);
}

function macroFor(kind, name) {
    return `{{${kind}::${name}}}`;
}

/**
 * Builds a card whose inline media references are expressed with RisuAI CBS macros and whose
 * referenced non-emotion assets gain `x-risu-asset` mirrors.
 *
 * @param {Object} card Card as it will be written to `card.json` (assets already materialized)
 * @param {{aliases?: Map<string,string>}} [options] Original → final asset URI map for paths that
 *   were renamed during export (sanitizing, collisions, data: assets)
 * @returns {{
 *   card: Object,
 *   mirrors: Array<{type: string, uri: string, name: string, ext: string}>,
 *   converted: number,
 *   warnings: Array<{code: string, message: string}>,
 * }}
 */
export function convertCardForRisuAI(card, options = {}) {
    const {aliases = null} = options;
    const next = cloneCard(card);
    const data = next?.data;
    const warnings = [];
    const assets = Array.isArray(data?.assets) ? data.assets : [];

    if (!data || assets.length === 0) {
        return {card: next, mirrors: [], converted: 0, warnings};
    }

    // Prefer the canonical typed entry when a card already carries x-risu-asset aliases.
    const assetsByUri = new Map();
    const mirrorsByUri = new Map();
    const mirroredUris = new Set();
    const usedNames = new Map();

    for (const asset of assets) {
        if (typeof asset?.uri !== 'string') continue;
        if (asset.type === 'x-risu-asset') {
            const name = typeof asset.name === 'string' && asset.name !== '' ? asset.name : assetStem(asset);
            mirrorsByUri.set(asset.uri, name);
            mirroredUris.add(asset.uri);
            usedNames.set(name.toLowerCase(), asset.uri);
        } else {
            assetsByUri.set(asset.uri, asset);
        }
    }

    const mirrors = [];
    const missing = new Set();
    const unsupported = new Set();
    let converted = 0;

    const takeName = (base, uri) => {
        if (mirrorsByUri.has(uri)) return mirrorsByUri.get(uri);
        const available = base.toLowerCase();
        if (!usedNames.has(available) || usedNames.get(available) === uri) {
            usedNames.set(available, uri);
            mirrorsByUri.set(uri, available);
            return available;
        }
        let counter = 2;
        while (usedNames.has(`${available}-${counter}`)) counter += 1;
        const name = `${available}-${counter}`;
        usedNames.set(name, uri);
        mirrorsByUri.set(uri, name);
        return name;
    };

    const resolve = (uri, requestedKind) => {
        const targetUri = aliases?.get(uri) ?? uri;
        const asset = assetsByUri.get(targetUri);
        if (!asset) {
            missing.add(uri);
            return null;
        }

        const ext = normalizeExtension(asset.ext) || extensionFromFilename(targetUri);
        const mediaKind = mediaKindForExtension(ext);
        const kind = requestedKind === 'audio' || requestedKind === 'video' ? requestedKind : mediaKind;
        if (!MACRO_KIND[kind]) {
            unsupported.add(uri);
            return null;
        }

        if (kind === 'image' && asset.type === 'emotion') {
            const name = typeof asset.name === 'string' && asset.name !== '' ? asset.name : assetStem(asset);
            return macroFor('emotion', name);
        }

        const name = takeName(assetStem(asset), targetUri);
        if (!mirroredUris.has(targetUri)) {
            mirroredUris.add(targetUri);
            mirrors.push({
                type: 'x-risu-asset',
                uri: targetUri,
                name,
                ext: ext || 'unknown',
            });
        }
        return macroFor(kind, name);
    };

    const convertText = (value) => {
        if (typeof value !== 'string' || !value.includes('embeded://')) return value;

        let text = value.replace(MARKDOWN_MEDIA, (full, uri) => {
            const macro = resolve(uri, 'image');
            if (!macro) return full;
            converted += 1;
            return macro;
        });

        text = text.replace(BBCODE_MEDIA, (full, uri) => {
            const macro = resolve(uri, 'image');
            if (!macro) return full;
            converted += 1;
            return macro;
        });

        text = text.replace(HTML_IMG, (full, _quote, uri) => {
            const macro = resolve(uri, 'image');
            if (!macro) return full;
            converted += 1;
            return macro;
        });

        text = text.replace(HTML_MEDIA, (full, tag, _quote, uri) => {
            const macro = resolve(uri, tag.toLowerCase());
            if (!macro) return full;
            converted += 1;
            return macro;
        });

        return text;
    };

    visitTextFields(data, convertText);

    if (mirrors.length > 0) {
        data.assets = [...assets, ...mirrors];
    }

    for (const uri of missing) {
        warnings.push({
            code: 'RISU_REFERENCE_MISSING',
            message: `Text references "${uri}", but the archive has no matching asset. The reference was left unchanged.`,
        });
    }
    for (const uri of unsupported) {
        warnings.push({
            code: 'RISU_REFERENCE_UNSUPPORTED',
            message: `Text references "${uri}", but RisuAI can only display image, audio and video assets. The reference was left unchanged.`,
        });
    }

    return {card: next, mirrors, converted, warnings};
}

export default convertCardForRisuAI;
