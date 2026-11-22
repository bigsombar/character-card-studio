/**
 * Convert an image URL/blob into a PNG ArrayBuffer. The PNG exporter needs actual PNG image
 * data because it strips and embeds tEXt chunks; icon assets may be JPEG, WebP, AVIF or GIF.
 */
export async function imageSourceToPngArrayBuffer(source) {
    const response = await fetch(source);
    if (!response.ok) throw new Error('Could not read the image source.');
    const blob = await response.blob();

    if (blob.type === 'image/png') return blob.arrayBuffer();

    if (typeof document === 'undefined') {
        throw new Error('Image conversion is not available in this environment.');
    }

    const url = URL.createObjectURL(blob);
    let image;
    try {
        image = await new Promise((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = reject;
            element.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngArtifact = await new Promise((resolve) => {
            canvas.toBlob((result) => resolve(result), 'image/png');
        });
        if (!pngArtifact) throw new Error('Could not convert the image to PNG.');
        return pngArtifact.arrayBuffer();
    } finally {
        URL.revokeObjectURL(url);
    }
}

export default imageSourceToPngArrayBuffer;
