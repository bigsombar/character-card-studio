export const MEDIA_KIND = {
    image: 'image',
    audio: 'audio',
    video: 'video',
    other: 'other',
};

export const MEDIA_LABELS = {
    image: 'Images',
    audio: 'Audio',
    video: 'Video',
    other: 'Other',
};

export const EXTENSIONS_BY_MEDIA = {
    image: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'],
    audio: ['mp3', 'wav', 'ogg'],
    video: ['mp4', 'webm'],
};

const SUPPORTED_EXTENSIONS = new Set(Object.values(EXTENSIONS_BY_MEDIA).flat());

const MIME_BY_EXTENSION = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
};

export const MAX_FILE_BYTES = {
    image: 20 * 1024 * 1024,
    audio: 50 * 1024 * 1024,
    video: 250 * 1024 * 1024,
    other: 20 * 1024 * 1024,
};

export const MAX_TOTAL_ASSET_BYTES = 500 * 1024 * 1024;

export const ACCEPTED_FILE_EXTENSIONS = Object.values(EXTENSIONS_BY_MEDIA).flat();

export function normalizeExtension(value) {
    return String(value ?? '')
        .trim()
        .replace(/^\./, '')
        .toLowerCase();
}

export function extensionFromFilename(filename) {
    const base = String(filename ?? '').split(/[\\/]/).pop() ?? '';
    const dot = base.lastIndexOf('.');
    return dot === -1 ? '' : normalizeExtension(base.slice(dot + 1));
}

export function mediaKindForExtension(ext) {
    const normalized = normalizeExtension(ext);
    if (EXTENSIONS_BY_MEDIA.image.includes(normalized)) return MEDIA_KIND.image;
    if (EXTENSIONS_BY_MEDIA.audio.includes(normalized)) return MEDIA_KIND.audio;
    if (EXTENSIONS_BY_MEDIA.video.includes(normalized)) return MEDIA_KIND.video;
    return MEDIA_KIND.other;
}

export function mediaKindForAsset(asset) {
    if (!asset) return MEDIA_KIND.other;
    if (asset.uri === 'ccdefault:') {
        return asset.type === 'x_audio' ? MEDIA_KIND.audio
            : asset.type === 'x_video' ? MEDIA_KIND.video
                : MEDIA_KIND.image;
    }
    return mediaKindForExtension(asset.ext);
}

export function mimeForExtension(ext) {
    return MIME_BY_EXTENSION[normalizeExtension(ext)] ?? 'application/octet-stream';
}

export function isSupportedExtension(ext) {
    return SUPPORTED_EXTENSIONS.has(normalizeExtension(ext));
}

export function defaultTypeForMedia(mediaKind, hasIcon = false) {
    if (mediaKind === MEDIA_KIND.image) return hasIcon ? 'other' : 'icon';
    if (mediaKind === MEDIA_KIND.audio) return 'x_audio';
    if (mediaKind === MEDIA_KIND.video) return 'x_video';
    return 'other';
}

export function typeOptionsForMedia(mediaKind) {
    if (mediaKind === MEDIA_KIND.image) {
        return ['icon', 'background', 'emotion', 'user_icon', 'other'];
    }
    if (mediaKind === MEDIA_KIND.audio) {
        return ['x_audio', 'x_voice', 'x_sfx', 'x_bgm', 'other'];
    }
    if (mediaKind === MEDIA_KIND.video) {
        return ['x_video', 'x_background', 'other'];
    }
    return ['other'];
}

export function validateAssetFile(file) {
    const errors = [];
    const warnings = [];
    const ext = extensionFromFilename(file?.name);
    const mediaKind = mediaKindForExtension(ext);
    const mime = file?.type || mimeForExtension(ext);

    if (!file) {
        return {ok: false, errors: ['No asset file was provided.'], warnings, ext, mediaKind, mime, size: 0};
    }
    if (!ext || !isSupportedExtension(ext)) {
        errors.push(`Unsupported file type${ext ? ` ".${ext}"` : ''}. Allowed: ${ACCEPTED_FILE_EXTENSIONS.map((item) => `.${item}`).join(', ')}.`);
    }
    if (!file.size) errors.push('The file is empty.');

    const limit = MAX_FILE_BYTES[mediaKind] ?? MAX_FILE_BYTES.other;
    if (file.size > limit) {
        errors.push(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit: ${(limit / 1024 / 1024).toFixed(0)} MB.`);
    }

    if (file.type && !file.type.startsWith(`${mediaKind}/`) && mediaKind !== MEDIA_KIND.other) {
        warnings.push(`File type "${file.type}" does not look like ${mediaKind}; the extension will be used.`);
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        ext,
        mediaKind,
        mime,
        size: file.size,
    };
}
