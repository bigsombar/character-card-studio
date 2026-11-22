import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import usePortraitResize, { ORIGINAL_TARGET, PORTRAIT_MP_PRESETS } from './usePortraitResize';
import { resizePortraitToTarget, inspectPortrait } from './portraitResize';

vi.mock('./portraitResize', async (importOriginal) => ({
    ...(await importOriginal()),
    resizePortraitToTarget: vi.fn(),
    inspectPortrait: vi.fn(),
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

describe('usePortraitResize', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resizePortraitToTarget.mockResolvedValue(compressedFile('default.png'));
    });

    test('measures the source and starts on the original image', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        inspectPortrait.mockResolvedValue(original);

        const { result } = renderHook(() => usePortraitResize({ open: true, source: 'data:original' }));

        await waitFor(() => expect(result.current.preview).toEqual(original));
        expect(result.current.original).toEqual(original);
        expect(result.current.selectedTarget).toBe(ORIGINAL_TARGET);
        expect(result.current.isWorking).toBe(false);
        expect(result.current.error).toBeNull();
        expect(inspectPortrait).toHaveBeenCalledWith('data:original');
    });

    test('offers only megapixel presets that reduce the image', async () => {
        inspectPortrait.mockResolvedValue(portrait(3000, 2000));
        const wide = renderHook(() => usePortraitResize({ open: true, source: 'data:original' }));
        await waitFor(() => expect(wide.result.current.original).not.toBeNull());
        expect(wide.result.current.targets).toEqual(PORTRAIT_MP_PRESETS);

        inspectPortrait.mockResolvedValue(portrait(700, 900));
        const small = renderHook(() => usePortraitResize({ open: true, source: 'data:small' }));
        await waitFor(() => expect(small.result.current.original).not.toBeNull());
        expect(small.result.current.targets).toEqual([0.5]);
    });

    test('hides presets that round back to the same dimensions', async () => {
        inspectPortrait.mockResolvedValue(portrait(560, 896));
        const same = renderHook(() => usePortraitResize({ open: true, source: 'data:same' }));
        await waitFor(() => expect(same.result.current.original).not.toBeNull());
        expect(same.result.current.targets).toEqual([]);

        inspectPortrait.mockResolvedValue(portrait(1232, 816));
        const almostOne = renderHook(() => usePortraitResize({ open: true, source: 'data:almost-one' }));
        await waitFor(() => expect(almostOne.result.current.original).not.toBeNull());
        expect(almostOne.result.current.targets).toEqual([0.5]);
    });

    test('compresses from the original source for the selected megapixels', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const compressed = portrait(1232, 816, 80000, 'data:compressed');
        inspectPortrait.mockImplementation(async (source) => (
            source === 'data:original' ? original : compressed
        ));
        resizePortraitToTarget.mockResolvedValue(compressedFile('1mp.png'));

        const { result } = renderHook(() => usePortraitResize({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.chooseTarget(1));

        // There is no previous result yet, so the dialog falls back to the original preview.
        expect(result.current.isWorking).toBe(true);
        expect(result.current.preview).toBeNull();

        await waitFor(() => expect(result.current.preview).toEqual(compressed));
        expect(resizePortraitToTarget).toHaveBeenCalledWith(original.dataUrl, 1);
        expect(resizePortraitToTarget).toHaveBeenCalledTimes(1);
        expect(result.current.isWorking).toBe(false);
    });

    test('keeps the previous preview visible while another target is resizing', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const compressedOne = portrait(1232, 816, 80000, 'data:1mp');
        const compressedTwo = portrait(1728, 1152, 160000, 'data:2mp');
        inspectPortrait.mockImplementation(async (source) => {
            if (source === 'data:original') return original;
            if (source.includes('2mp')) return compressedTwo;
            return compressedOne;
        });
        resizePortraitToTarget.mockResolvedValue(compressedFile('1mp.png'));

        const { result } = renderHook(() => usePortraitResize({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));
        act(() => result.current.chooseTarget(1));
        await waitFor(() => expect(result.current.preview).toEqual(compressedOne));

        const pending = deferred();
        resizePortraitToTarget.mockReturnValue(pending.promise);
        act(() => result.current.chooseTarget(2));

        expect(result.current.isWorking).toBe(true);
        expect(result.current.preview).toEqual(compressedOne);

        await act(async () => {
            pending.resolve(compressedFile('2mp.png'));
            await pending.promise;
        });
        await waitFor(() => expect(result.current.preview).toEqual(compressedTwo));
    });

    test('returns to the untouched original when "Original" is selected again', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const compressed = portrait(1232, 816, 80000, 'data:compressed');
        inspectPortrait.mockImplementation(async (source) => (
            source === 'data:original' ? original : compressed
        ));
        resizePortraitToTarget.mockResolvedValue(compressedFile('1mp.png'));

        const { result } = renderHook(() => usePortraitResize({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));
        act(() => result.current.chooseTarget(1));
        await waitFor(() => expect(result.current.preview).toEqual(compressed));

        act(() => result.current.chooseTarget(ORIGINAL_TARGET));

        // Switching back is synchronous: Apply never points at the compressed preview for a frame.
        expect(result.current.preview).toEqual(original);
        expect(result.current.isWorking).toBe(false);
        expect(result.current.error).toBeNull();
    });

    test('ignores an in-flight resize after switching back to the original', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const pending = deferred();
        inspectPortrait.mockImplementation(async (source) => (
            source === 'data:original' ? original : portrait(1232, 816, 80000, 'data:compressed')
        ));
        resizePortraitToTarget.mockReturnValue(pending.promise);

        const { result } = renderHook(() => usePortraitResize({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.chooseTarget(1));
        act(() => result.current.chooseTarget(ORIGINAL_TARGET));

        await act(async () => {
            pending.resolve(compressedFile('1mp.png'));
            await pending.promise;
        });

        expect(result.current.preview).toEqual(original);
        expect(result.current.isWorking).toBe(false);
    });

    test('reports an unreadable source', async () => {
        inspectPortrait.mockRejectedValue(new Error('broken image'));

        const { result } = renderHook(() => usePortraitResize({ open: true, source: 'data:broken' }));

        await waitFor(() => expect(result.current.error).toMatch(/could not be opened/));
        expect(result.current.original).toBeNull();
        expect(result.current.preview).toBeNull();
    });

    test('reports a failed resize and clears the busy state', async () => {
        const original = portrait(3000, 2000);
        inspectPortrait.mockResolvedValue(original);
        resizePortraitToTarget.mockRejectedValue(new Error('decoder exploded'));

        const { result } = renderHook(() => usePortraitResize({ open: true, source: original.dataUrl }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.chooseTarget(1));

        await waitFor(() => expect(result.current.error).toMatch(/Portrait compression failed: decoder exploded/));
        expect(result.current.isWorking).toBe(false);
    });

    test('ignores a stale result when the user picks another target quickly', async () => {
        const original = portrait(3000, 2000, 500000, 'data:original');
        const first = deferred();
        const second = deferred();
        const compressedTwo = portrait(1728, 1152, 160000, 'data:2mp');
        const compressedOne = portrait(1232, 816, 80000, 'data:1mp');

        inspectPortrait.mockImplementation(async (source) => {
            if (source === 'data:original') return original;
            if (source.includes('2mp')) return compressedTwo;
            return compressedOne;
        });
        resizePortraitToTarget
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const { result } = renderHook(() => usePortraitResize({ open: true, source: 'data:original' }));
        await waitFor(() => expect(result.current.original).toEqual(original));

        act(() => result.current.chooseTarget(2));
        act(() => result.current.chooseTarget(1));

        await act(async () => {
            second.resolve(compressedFile('1mp.png'));
            await second.promise;
        });
        await waitFor(() => expect(result.current.preview).toEqual(compressedOne));

        await act(async () => {
            first.resolve(compressedFile('2mp.png'));
            await first.promise;
        });

        expect(result.current.preview).toEqual(compressedOne);
    });

    test('resets the target and measurements when the source changes', async () => {
        const first = portrait(3000, 2000, 500000, 'data:first');
        const next = portrait(800, 600, 70000, 'data:next');
        inspectPortrait.mockImplementation(async (source) => (
            source === 'data:first' ? first : next
        ));

        const { result, rerender } = renderHook(
            ({ source }) => usePortraitResize({ open: true, source }),
            { initialProps: { source: 'data:first' } },
        );
        await waitFor(() => expect(result.current.original).toEqual(first));
        act(() => result.current.chooseTarget(1));
        await waitFor(() => expect(result.current.original).toEqual(first));

        rerender({ source: 'data:next' });

        await waitFor(() => expect(result.current.original).toEqual(next));
        expect(result.current.selectedTarget).toBe(ORIGINAL_TARGET);
        expect(result.current.preview).toEqual(next);
    });

});
