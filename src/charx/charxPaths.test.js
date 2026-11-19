import { describe, expect, test } from 'vitest';

import {
    CHARX_CARD_PATH,
    defaultCharxPath,
    embededUriToPath,
    isAsciiZipPath,
    isSafeZipPath,
    makeUniqueCharxPath,
    pathToEmbededUri,
} from './charxPaths';

describe('charxPaths', () => {
    test('accepts safe asset paths', () => {
        expect(isSafeZipPath('assets/icon/images/main.png')).toBe(true);
        expect(isAsciiZipPath('assets/x_audio/audio/intro.mp3')).toBe(true);
        expect(isSafeZipPath('./card.json')).toBe(true);
        expect(CHARX_CARD_PATH).toBe('card.json');
    });

    test('rejects path traversal and absolute paths', () => {
        expect(isSafeZipPath('../card.json')).toBe(false);
        expect(isSafeZipPath('assets/../../evil.png')).toBe(false);
        expect(isSafeZipPath('/assets/icon.png')).toBe(false);
        expect(isSafeZipPath('assets\\icon.png')).toBe(false);
        expect(isSafeZipPath('C:/assets/icon.png')).toBe(false);
        expect(isSafeZipPath('assets//icon.png')).toBe(false);
    });

    test('converts embeded URIs and builds canonical paths', () => {
        expect(embededUriToPath('embeded://assets/icon/images/main.png')).toBe('assets/icon/images/main.png');
        expect(embededUriToPath('https://example.com/a.png')).toBeNull();
        expect(pathToEmbededUri('assets/icon/images/main.png')).toBe('embeded://assets/icon/images/main.png');
        expect(defaultCharxPath({type: 'icon', name: 'main', ext: 'png'})).toBe('assets/icon/images/main.png');
    });

    test('makes duplicate paths unique', () => {
        expect(makeUniqueCharxPath('assets/icon/images/main.png', new Set(['assets/icon/images/main.png']))).toBe(
            'assets/icon/images/main-2.png',
        );
    });
});
