import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import useProxyConsent, { grantProxyConsent, hasProxyConsent } from './useProxyConsent';

function clearConsent() {
    document.cookie = 'ccs_proxy_consent=; Max-Age=0; Path=/';
}

beforeEach(() => {
    clearConsent();
    localStorage.clear();
});

afterEach(() => {
    clearConsent();
    localStorage.clear();
});

describe('useProxyConsent', () => {
    test('asks for consent before enabling for the first time', () => {
        const {result} = renderHook(() => useProxyConsent());

        act(() => result.current.requestChange(true));

        expect(result.current.enabled).toBe(false);
        expect(result.current.dialogOpen).toBe(true);
        expect(hasProxyConsent()).toBe(false);
    });

    test('cancelling leaves proxies disabled and does not store consent', () => {
        const {result} = renderHook(() => useProxyConsent());

        act(() => result.current.requestChange(true));
        act(() => result.current.cancel());

        expect(result.current.enabled).toBe(false);
        expect(result.current.dialogOpen).toBe(false);
        expect(hasProxyConsent()).toBe(false);
    });

    test('confirming stores the cookie and avoids future prompts', () => {
        const {result} = renderHook(() => useProxyConsent());

        act(() => result.current.requestChange(true));
        act(() => result.current.confirm());

        expect(result.current.enabled).toBe(true);
        expect(result.current.dialogOpen).toBe(false);
        expect(hasProxyConsent()).toBe(true);

        act(() => result.current.requestChange(false));
        expect(result.current.enabled).toBe(false);

        act(() => result.current.requestChange(true));
        expect(result.current.enabled).toBe(true);
        expect(result.current.dialogOpen).toBe(false);
    });

    test('does not enable from the cookie alone when the saved toggle is off', () => {
        grantProxyConsent();
        localStorage.setItem('ccs_proxy_enabled', '0');

        const {result} = renderHook(() => useProxyConsent());
        expect(result.current.enabled).toBe(false);
    });

    test('restores an enabled setting when consent already exists', () => {
        grantProxyConsent();
        localStorage.setItem('ccs_proxy_enabled', '1');

        const {result} = renderHook(() => useProxyConsent());
        expect(result.current.enabled).toBe(true);
    });
});
