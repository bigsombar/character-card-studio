import { useCallback, useEffect, useState } from 'react';

import default_avatar from '../assets/default_avatar.png';
import { stripPngChunks } from '../png/cardPngIO';
import { dataUrlToBlob } from '../utils/blob';
import { imageSourceToPngArrayBuffer } from '../utils/imageToPng';
import { useAssets } from '../context/AssetContext';
import { useNotifications } from '../context/NotificationContext';

const PORTRAIT_STORAGE_KEY = 'previewImage';

/**
 * Remembers the portrait across reloads. A large data URL can exceed the ~5 MB localStorage
 * quota; in that case the stale copy is dropped instead of silently restoring another card.
 */
function persistPortrait(dataUrl) {
    try {
        localStorage.setItem(PORTRAIT_STORAGE_KEY, dataUrl);
    } catch (error) {
        localStorage.removeItem(PORTRAIT_STORAGE_KEY);
        console.warn('Portrait is too large to keep across page reloads:', error);
    }
}

function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function bufferToDataUrl(buffer) {
    const blob = new Blob([buffer], { type: 'image/png' });
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// Browser image compression is only needed after a portrait upload, so keep it out of the initial
// bundle. Web-worker mode is disabled because the library otherwise loads its worker from a CDN.
async function normalizePngBlob(blob) {
    const { default: imageCompression } = await import('browser-image-compression');
    const compressed = await imageCompression(blob, { useWebWorker: false });
    return imageCompression.getDataUrlFromFile(compressed);
}

/**
 * Portrait state for the editor shell.
 *
 * The main icon asset always wins over the locally cached preview, because the asset is what the
 * CHARX and PNG exporters embed. Uploading a file strips any card chunks, normalizes non-PNG
 * images to PNG, caches the result for reloads and refreshes the main icon asset in one place.
 *
 * @param {Object} options
 * @param {File|{name: string}|null} options.file Selected card file; PNG files also seed the preview
 * @param {string|undefined} options.mainIconUrl Resolved URL of the V3 main icon asset, if any
 * @returns {{
 *   applyCompression: Function,
 *   handlePortraitUpload: Function,
 *   portraitBytes: number|null,
 *   portraitSource: string,
 *   resetPortrait: Function
 * }}
 */
export default function usePortraitPipeline({ file, mainIconUrl }) {
    const { setMainIcon } = useAssets();
    const { notify } = useNotifications();
    const [preview, setPreview] = useState(default_avatar);
    const [portraitBytes, setPortraitBytes] = useState(null);

    const updateMainIcon = useCallback(async (dataUrl) => {
        const blob = await dataUrlToBlob(dataUrl);
        const iconFile = new File([blob], 'portrait.png', { type: blob.type || 'image/png' });
        await setMainIcon(iconFile);
    }, [setMainIcon]);

    const rememberPortrait = useCallback(async (dataUrl) => {
        setPreview(dataUrl);
        persistPortrait(dataUrl);
        try {
            await updateMainIcon(dataUrl);
        } catch (error) {
            console.warn('Could not update the main icon asset:', error);
        }
    }, [updateMainIcon]);

    const resetPortrait = useCallback(() => {
        setPreview(default_avatar);
        persistPortrait(default_avatar);
    }, []);

    const applyCompression = useCallback(async (dataUrl) => {
        await rememberPortrait(dataUrl);
    }, [rememberPortrait]);

    // Restore the last portrait as soon as the shell mounts; the main icon asset (if the project
    // has one) replaces it once assets finish hydrating.
    useEffect(() => {
        const stored = localStorage.getItem(PORTRAIT_STORAGE_KEY);
        if (stored) setPreview(stored);
    }, []);

    // A PNG card carries its own portrait. Strip the card chunks before caching the image, and
    // ignore synthetic file labels (the card name) so they cannot wipe a stored portrait.
    useEffect(() => {
        let cancelled = false;
        if (!file) return undefined;
        if (!/.+\.png$/i.test(file.name)) {
            if (typeof file.size === 'number') setPreview(default_avatar);
            return undefined;
        }

        (async () => {
            try {
                const inputBuffer = await readAsArrayBuffer(file);
                const stripped = await stripPngChunks(inputBuffer, ['ccv3', 'chara']);
                const dataUrl = await bufferToDataUrl(stripped);
                if (!cancelled) {
                    setPreview(dataUrl);
                    persistPortrait(dataUrl);
                }
            } catch (error) {
                if (!cancelled) console.warn('Could not read the PNG portrait:', error);
            }
        })();

        return () => { cancelled = true; };
    }, [file]);

    const handlePortraitUpload = useCallback(async (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type.startsWith('image/') && selectedFile.type !== 'image/png') {
            const img = new Image();
            img.src = URL.createObjectURL(selectedFile);
            img.onload = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    const pngBlob = await (await fetch(pngDataUrl)).blob();
                    await rememberPortrait(await normalizePngBlob(pngBlob));
                } catch (error) {
                    console.error('Could not convert the portrait to PNG:', error);
                }
            };
            return;
        }

        if (selectedFile.type === 'image/png') {
            try {
                const inputBuffer = await readAsArrayBuffer(selectedFile);
                const stripped = await stripPngChunks(inputBuffer, ['ccv3', 'chara']);
                const pngBlob = new Blob([stripped], { type: 'image/png' });
                await rememberPortrait(await normalizePngBlob(pngBlob));
            } catch (error) {
                console.error('Could not strip PNG chunks and convert the portrait:', error);
            }
            return;
        }

        notify({ title: 'Unsupported portrait', severity: 'error', message: 'Choose an image file.' });
    }, [notify, rememberPortrait]);

    const portraitSource = mainIconUrl || preview;

    // The footer shows the exported PNG size, so measure exactly what an export would embed.
    useEffect(() => {
        let cancelled = false;
        imageSourceToPngArrayBuffer(portraitSource)
            .then(stripPngChunks)
            .then((stripped) => { if (!cancelled) setPortraitBytes(stripped.byteLength); })
            .catch(() => { if (!cancelled) setPortraitBytes(null); });
        return () => { cancelled = true; };
    }, [portraitSource]);

    return {
        applyCompression,
        handlePortraitUpload,
        portraitBytes,
        portraitSource,
        resetPortrait,
    };
}
