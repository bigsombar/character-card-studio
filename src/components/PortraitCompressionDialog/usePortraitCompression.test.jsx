import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import usePortraitCompression, { ORIGINAL_TARGET, PORTRAIT_MP_PRESETS } from './usePortraitCompression';
import { compressPortraitToTarget, readPortraitInfo } from './portraitCompression';

vi.mock('./portraitCompression', async (importOriginal) => ({
    ...(await importOriginal()),
    compressPortraitToTarget: vi.fn(),
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

function compressedFile(name) {
    return new File(['compressed'], name, { type: 'image/png' });
}

describe('usePortraitCompression', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        compressPortraitToTarget.mockResolvedValue(compressedFile('default.png'));
    });

    test('measures the source and starts on the original image', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        readPortraitInfo.mockResolvedValue(original);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));

        await waitFor(() => expect(result.current.result).toEqual(original));
        expect(result.current.original).toEqual(original);
        expect(result.current.target).toBe(ORIGINAL_TARGET);
        expect(result.current.busy).toBe(false);
        expect(result.current.error).toBeNull();
        expect(readPortraitInfo).toHaveBeenCalledWith('data:original');
    });

    test('offers only megapixel presets that reduce the image', async () => {
        readPortraitInfo.mockResolvedValue(portrait(3000, 2000));
        const wide = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(wide.result.current.original).not.toBeNull());
        expect(wide.result.current.presets).toEqual(PORTRAIT_MP_PRESETS);

        readPortraitInfo.mockResolvedValue(portrait(700, 900));
        const small = renderHook(() => usePortraitCompression({ open: true, source: 'data:small' }));
        await waitFor(() => expect(small.result.current.original).not.toBeNull());
        expect(small.result.current.presets).toEqual([0.5]);
    });

    test('compresses from the original source for the selected megapixels', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const compressed = portrait(1232, 816, 80000, 'data:compressed');
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? original : compressed
        ));
        compressPortraitToTarget.mockResolvedValue(compressedFile('1mp.png'));

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectTarget(1));

        // The old result is dropped immediately, so Apply cannot use a stale preview.
        expect(result.current.busy).toBe(true);
        expect(result.current.result).toBeNull();

        await waitFor(() => expect(result.current.result).toEqual(compressed));
        expect(compressPortraitToTarget).toHaveBeenCalledWith(original.dataUrl, 1);
        expect(compressPortraitToTarget).toHaveBeenCalledTimes(1);
        expect(result.current.busy).toBe(false);
    });

    test('returns to the untouched original when "Original" is selected again', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const compressed = portrait(1232, 816, 80000, 'data:compressed');
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? original : compressed
        ));
        compressPortraitToTarget.mockResolvedValue(compressedFile('1mp.png'));

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));
        act(() => result.current.selectTarget(1));
        await waitFor(() => expect(result.current.result).toEqual(compressed));

        act(() => result.current.selectTarget(ORIGINAL_TARGET));

        // Switching back is synchronous: Apply never points at the compressed preview for a frame.
        expect(result.current.result).toEqual(original);
        expect(result.current.busy).toBe(false);
        expect(result.current.error).toBeNull();
    });

    test('ignores an in-flight resize after switching back to the original', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const pending = deferred();
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? original : portrait(1232, 816, 80000, 'data:compressed')
        ));
        compressPortraitToTarget.mockReturnValue(pending.promise);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectTarget(1));
        act(() => result.current.selectTarget(ORIGINAL_TARGET));

        await act(async () => {
            pending.resolve(compressedFile('1mp.png'));
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

    test('reports a failed resize and clears the busy state', async () => {
        const original = portrait(3000, 2000);
        readPortraitInfo.mockResolvedValue(original);
        compressPortraitToTarget.mockRejectedValue(new Error('decoder exploded'));

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: original.dataUrl }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectTarget(1));

        await waitFor(() => expect(result.current.error).toMatch(/Portrait compression failed: decoder exploded/));
        expect(result.current.busy).toBe(false);
    });

    test('ignores a stale result when the user picks another target quickly', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const first = deferred();
        const second = deferred();
        const compressedTwo = portrait(1728, 1152, 160000, 'data:2mp');
        const compressedOne = portrait(1232, 816, 80000, 'data:1mp');

        readPortraitInfo.mockImplementation(async (source) => {
            if (source === 'data:original') return original;
            if (source.includes('2mp')) return compressedTwo;
            return compressedOne;
        });
        compressPortraitToTarget
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.selectTarget(2));
        act(() => result.current.selectTarget(1));

        await act(async () => {
            second.resolve(compressedFile('1mp.png'));
            await second.promise;
        });
        await waitFor(() => expect(result.current.result).toEqual(compressedOne));

        await act(async () => {
            first.resolve(compressedFile('2mp.png'));
            await first.promise;
        });

        expect(result.current.result).toEqual(compressedOne);
    });

    test('resets the target and measurements when the source changes', async () => {
        const first = portrait(3000, 2000, 500000, 'data:first');
        const next = portrait(800, 600, 70000, 'data:next');
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:first' ? first : next
        ));

        const { result, rerender } = renderHook(
            ({ source }) => usePortraitCompression({ open: true, source }),
            { initialProps: { source: 'data:first' } },
        );
        await waitFor(() => expect(result.current.original).toEqual(first));
        act(() => result.current.selectTarget(1));
        await waitFor(() => expect(result.current.original).toEqual(first));

        rerender({ source: 'data:next' });

        await waitFor(() => expect(result.current.original).toEqual(next));
        expect(result.current.target).toBe(ORIGINAL_TARGET);
        expect(result.current.result).toEqual(next);
    });

    test('applies two batched target clicks in order instead of ignoring the second one', async () => {
        const original = portrait(3000, 2000);
        readPortraitInfo.mockResolvedValue(original);

        const { result } = renderHook(() => usePortraitCompression({ open: true, source: original.dataUrl }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => {
            result.current.selectTarget(2);
            result.current.selectTarget(ORIGINAL_TARGET);
        });

        expect(result.current.target).toBe(ORIGINAL_TARGET);
        expect(result.current.busy).toBe(false);
        expect(result.current.result).toEqual(original);
        expect(compressPortraitToTarget).not.toHaveBeenCalled();
    });

    test('keeps the current target when the active toggle is clicked again', async () => {
        readPortraitInfo.mockResolvedValue(portrait(3000, 2000));
        const { result } = renderHook(() => usePortraitCompression({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).not.toBeNull());

        act(() => result.current.selectTarget(1));
        act(() => result.current.selectTarget(null));

        expect(result.current.target).toBe(1);
    });
});
