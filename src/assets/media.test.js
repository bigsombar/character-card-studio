import {
    MEDIA_KIND,
    extensionFromFilename,
    mediaKindForExtension,
    typeOptionsForMedia,
    validateAssetFile,
} from './media';

function makeFile(name, type, size = 10) {
    return new File([new Uint8Array(size)], name, {type});
}

describe('media helpers', () => {
    test('detects extensions and media kinds', () => {
        expect(extensionFromFilename('portrait.PNG')).toBe('png');
        expect(extensionFromFilename('no-extension')).toBe('');
        expect(mediaKindForExtension('jpg')).toBe(MEDIA_KIND.image);
        expect(mediaKindForExtension('webm')).toBe(MEDIA_KIND.video);
        expect(mediaKindForExtension('ogg')).toBe(MEDIA_KIND.audio);
        expect(mediaKindForExtension('exe')).toBe(MEDIA_KIND.other);
    });

    test('offers media-appropriate type options', () => {
        expect(typeOptionsForMedia(MEDIA_KIND.image)).toContain('icon');
        expect(typeOptionsForMedia(MEDIA_KIND.audio)).toContain('x_audio');
        expect(typeOptionsForMedia(MEDIA_KIND.video)).toContain('x_video');
    });

    test('accepts supported files', () => {
        const result = validateAssetFile(makeFile('card-portrait.png', 'image/png'));
        expect(result.ok).toBe(true);
        expect(result.ext).toBe('png');
        expect(result.mediaKind).toBe(MEDIA_KIND.image);
        expect(result.errors).toEqual([]);
    });

    test('rejects unsupported and empty files', () => {
        const result = validateAssetFile(makeFile('malware.exe', 'application/octet-stream'));
        expect(result.ok).toBe(false);
        expect(result.errors.join(' ')).toMatch(/unsupported/i);

        const empty = validateAssetFile(makeFile('empty.png', 'image/png', 0));
        expect(empty.ok).toBe(false);
        expect(empty.errors.join(' ')).toMatch(/empty/i);
    });

    test('warns about MIME/extension mismatch', () => {
        const result = validateAssetFile(makeFile('clip.mp4', 'image/png'));
        expect(result.ok).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
    });
});
