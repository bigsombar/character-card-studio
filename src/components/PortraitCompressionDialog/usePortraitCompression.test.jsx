import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import usePortraitCompression from './usePortraitCompression';
import { compressPortraitSource, readPortraitInfo } from './portraitCompression';

vi.mock('./portraitCompression', () => ({
    compressPortraitSource: vi.fn(),
    readPortraitInfo: vi.fn(),
}));

vi.mock('browser-image-compression', () => ({
    default: {
        getDataUrlFromFile: vi.fn(async (file) => `data:image/png;base64,${file.name}`),
    },
}));

function portrait(width, height, bytes = 1000, dataUrl = `data:${width}x${height}`) {
    return { bytes, dataUrl, height, width };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, reject, resolve };
}

describe('usePortraitCompression', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        compressPortraitSource.mockResolvedValue(new File(['default'], 'default.png', { type: 'image/png' }));
    });

    test('measures the source and starts on the original image', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        readPortraitInfo.mockResolvedValue(original);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));

        await waitFor(() => expect(result.current.result).toEqual(original));
        expect(result.current.original).toEqual(original);
        expect(result.current.maxSide).toBe('original');
        expect(result.current.busy).toBe(false);
        expect(result.current.error).toBeNull();
        expect(readPortraitInfo).toHaveBeenCalledWith('data:original');
    });

    test('offers only presets that actually downscale the portrait', async () => {
        readPortraitInfo.mockResolvedValue(portrait(3000, 2000));
        const wide = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(wide.result.current.original).not.toBeNull());
        expect(wide.result.current.presets).toEqual([2048, 1536, 1024, 768, 512]);

        readPortraitInfo.mockResolvedValue(portrait(700, 900));
        const small = renderHook(() => usePortraitCompression({ open: true, source: 'data:small' }));
        await waitFor(() => expect(small.result.current.original).not.toBeNull());
        expect(small.result.current.presets).toEqual([768, 512]);
    });

    test('compresses from the original source for the selected size', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const compressed = portrait(1024, 683, 80000, 'data:1024');
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? original : compressed
        ));
        compressPortraitSource.mockResolvedValue(new File(['compressed'], '1024.png', { type: 'image/png' }));

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectSize(1024));

        // Apply must be disabled immediately, not one frame after the click.
        expect(result.current.busy).toBe(true);

        await waitFor(() => expect(result.current.result).toEqual(compressed));
        expect(compressPortraitSource).toHaveBeenCalledWith(original.dataUrl, 1024);
        expect(compressPortraitSource).toHaveBeenCalledTimes(1);
        expect(result.current.busy).toBe(false);
    });

    test('returns to the untouched original when "Original" is selected again', async () => {
        const original = portrait(3000, 2000, '500000', 'data:original');
        const compressed = portrait(1024, 683, 80000, 'data:1024');
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? original : compressed
        ));
        compressPortraitSource.mockResolvedValue(new File(['compressed'], '1024.png', { type: 'image/png' }));

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));
        act(() => result.current.selectSize(1024));
        await waitFor(() => expect(result.current.result).toEqual(compressed));

        act(() => result.current.selectSize('original'));

        // Switching back is synchronous: Apply never points at the compressed preview for a frame.
        expect(result.current.result).toEqual(original);
        expect(result.current.busy).toBe(false);
        expect(result.current.error).toBeNull();
    });

    test('ignores an in-flight compression after switching back to the original', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const pending = deferred();
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? original : portrait(1024, 683, 80000, 'data:1024')
        ));
        compressPortraitSource.mockReturnValue(pending.promise);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectSize(1024));
        act(() => result.current.selectSize('original'));

        await act(async () => {
            pending.resolve(new File(['late'], '1024.png', { type: 'image/png' }));
            await pending.promise;
        });

        expect(result.current.result).toEqual(original);
        expect(result.current.busy).toBe(false);
    });

    test('reports an unreadable source', async () => {
        readPortraitInfo.mockRejectedValue(new Error('broken image'));

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:broken' }));

        await waitFor(() => expect(result.current.error).toMatch(/could not be opened/));
        expect(result.current.original).toBeNull();
        expect(result.current.result).toBeNull();
    });

    test('reports a failed compression and clears the busy state', async () => {
        const original = portrait(3000, 2000);
        readPortraitInfo.mockResolvedValue(original);
        compressPortraitSource.mockRejectedValue(new Error('decoder exploded'));

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: original.dataUrl }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectSize(1024));

        await waitFor(() => expect(result.current.error).toMatch(/Portrait compression failed: decoder exploded/));
        expect(result.current.busy).toBe(false);
    });

    test('ignores a stale result when the user picks another size quickly', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const first = deferred();
        const second = deferred();
        const compressed1024 = portrait(1024, 683, 80000, 'data:1024');
        const compressed512 = portrait(512, 341, 20000, 'data:512');

        readPortraitInfo.mockImplementation(async (source) => {
            if (source === 'data:original') return original;
            if (source === 'data:1024') return compressed1024;
            return compressed512;
        });
        compressPortraitSource
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectSize(1024));
        act(() => result.current.selectSize(512));

        await act(async () => {
            second.resolve(new File(['small'], '512.png', { type: 'image/png' }));
            await second.promise;
        });
        await waitFor(() => expect(result.current.result).toEqual(compressed512));

        await act(async () => {
            first.resolve(new File(['large'], '1024.png', { type: 'image/png' }));
            await first.promise;
        });

        expect(result.current.result).toEqual(compressed512);
    });

    test('resets the size choice and measurements when the source changes', async () => {
        const first = portrait(3000, 2000, '500000', 'data:first');
        const next = portrait(800, 600, 70000, 'data:next');
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:first' ? first : next
        ));

        const { result, rerender } = renderHook(
            ({ source }) => usePortraitCompression({ open: true, source }),
            { initialProps: { source: 'data:first' } },
        );
        await waitFor(() => expect(result.current.original).toEqual(first));
        act(() => result.current.selectSize(1024));
        await waitFor(() => expect(result.current.original).toEqual(first));

        rerender({ source: 'data:next' });

        await waitFor(() => expect(result.current.original).toEqual(next));
        expect(result.current.maxSide).toBe('original');
        expect(result.current.result).toEqual(next);
    });

    test('applies two batched size clicks in order instead of ignoring the second one', async () => {
        const original = portrait(3000, 2000);
        readPortraitInfo.mockResolvedValue(original);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: original.dataUrl }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => {
            result.current.selectSize(1024);
            result.current.selectSize('original');
        });

        expect(result.current.maxSide).toBe('original');
        expect(result.current.busy).toBe(false);
        expect(result.current.result).toEqual(original);
        expect(compressPortraitSource).not.toHaveBeenCalled();
    });

    test('keeps the current size when the active toggle is clicked again', async () => {
        readPortraitInfo.mockResolvedValue(portrait(3000, 2000));
        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).not.toBeNull());

        act(() => result.current.selectSize(1024));
        act(() => result.current.selectSize(null));

        expect(result.current.maxSide).toBe(1024);
    });
});
