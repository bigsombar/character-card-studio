import { MEDIA_KIND } from './media';

function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        if (typeof canvas.toBlob !== 'function') {
            resolve(null);
            return;
        }
        canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.82);
    });
}

async function imageThumbnail(file) {
    if (typeof document === 'undefined') return null;

    let source;
    let width;
    let height;
    let revoke = null;

    if (typeof createImageBitmap === 'function') {
        source = await createImageBitmap(file);
        width = source.width;
        height = source.height;
    } else {
        const url = URL.createObjectURL(file);
        revoke = url;
        source = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });
        width = source.naturalWidth || source.width;
        height = source.naturalHeight || source.height;
    }

    try {
        const largestSide = 360;
        const scale = Math.min(1, largestSide / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        return await canvasToBlob(canvas);
    } finally {
        if (typeof source.close === 'function') source.close();
        if (revoke) URL.revokeObjectURL(revoke);
    }
}

async function videoThumbnail(file) {
    if (typeof document === 'undefined') return null;

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;

    try {
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
        });

        const target = Math.min(0.5, Math.max(0, (video.duration || 1) / 4));
        await new Promise((resolve, reject) => {
            video.onseeked = resolve;
            video.onerror = reject;
            video.currentTime = target;
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 202;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return await canvasToBlob(canvas);
    } finally {
        video.removeAttribute('src');
        video.load();
        URL.revokeObjectURL(url);
    }
}

/**
 * Best-effort thumbnail generation. Failures are non-fatal: the asset still works,
 * the grid just uses a placeholder or the full blob.
 */
export async function createThumbnail(file, mediaKind) {
    try {
        if (mediaKind === MEDIA_KIND.image) return await imageThumbnail(file);
        if (mediaKind === MEDIA_KIND.video) return await videoThumbnail(file);
        return null;
    } catch {
        return null;
    }
}
