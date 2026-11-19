import { createAssetUri, makeUniqueUri, safeSlug, safeType } from './paths';

describe('asset paths', () => {
    test('sanitizes types and slugs', () => {
        expect(safeType('Icon')).toBe('icon');
        expect(safeType('../evil')).toBe('evil');
        expect(safeType('x-audio voice')).toBe('x_audio_voice');
        expect(safeSlug('Main Portrait.png')).toBe('main-portrait');
        expect(safeSlug('Кот-девочка.png')).toMatch(/^asset-[a-z0-9]+$/);
        expect(safeSlug('', 'asset')).toBe('asset');
    });

    test('creates embeded:// URIs in the media directory', () => {
        expect(createAssetUri({type: 'icon', name: 'main', ext: 'PNG'})).toBe(
            'embeded://assets/icon/images/main.png',
        );
        expect(createAssetUri({type: 'x_audio', name: 'intro', ext: 'mp3'})).toBe(
            'embeded://assets/x_audio/audio/intro.mp3',
        );
        expect(createAssetUri({type: 'x_video', name: 'clip', ext: 'webm'})).toBe(
            'embeded://assets/x_video/video/clip.webm',
        );
    });

    test('makes duplicate URIs unique', () => {
        const existing = new Set(['embeded://assets/icon/images/main.png']);
        expect(makeUniqueUri('embeded://assets/icon/images/main.png', existing)).toBe(
            'embeded://assets/icon/images/main-2.png',
        );
    });
});
