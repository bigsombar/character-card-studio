import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import useAssetUrl from './useAssetUrl';

describe('useAssetUrl', () => {
    test('resolves image, audio and video data URIs', () => {
        const image = renderHook(() => useAssetUrl('data:image/png;base64,AAAA'));
        expect(image.result.current.url).toBe('data:image/png;base64,AAAA');
        expect(image.result.current.error).toBeNull();

        const audio = renderHook(() => useAssetUrl('data:audio/mpeg;base64,AAAA'));
        expect(audio.result.current.url).toContain('data:audio/mpeg');

        const video = renderHook(() => useAssetUrl('data:video/mp4;base64,AAAA'));
        expect(video.result.current.url).toContain('data:video/mp4');
    });

    test('rejects non-media data URIs', () => {
        const { result } = renderHook(() => useAssetUrl('data:text/html;base64,AAAA'));
        expect(result.current.url).toBeNull();
        expect(result.current.error).toMatch(/unsupported data uri/i);
    });

    test('loads HTTPS assets but blocks insecure HTTP', () => {
        const https = renderHook(() => useAssetUrl('https://example.com/portrait.png'));
        expect(https.result.current.url).toBe('https://example.com/portrait.png');

        const http = renderHook(() => useAssetUrl('http://example.com/portrait.png'));
        expect(http.result.current.url).toBeNull();
        expect(http.result.current.error).toMatch(/insecure http/i);
    });

    test('rejects unknown URI schemes without touching IndexedDB', () => {
        const { result } = renderHook(() => useAssetUrl('javascript:alert(1)'));
        expect(result.current.url).toBeNull();
        expect(result.current.error).toMatch(/unsupported asset uri scheme/i);
    });

    test('treats ccdefault as a built-in asset', () => {
        const { result } = renderHook(() => useAssetUrl('ccdefault:'));
        expect(result.current).toMatchObject({ url: null, loading: false, error: null });
    });
});
