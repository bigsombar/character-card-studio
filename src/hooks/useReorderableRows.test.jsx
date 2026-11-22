import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import useReorderableRows from './useReorderableRows';

describe('useReorderableRows', () => {
    test('keeps expansion attached to the same row after a move', () => {
        const { result } = renderHook(() => useReorderableRows(3));

        act(() => result.current.setExpanded(0, true));
        act(() => result.current.moveRow(0, 2));

        expect(result.current.isExpanded(0)).toBe(false);
        expect(result.current.isExpanded(2)).toBe(true);
    });

    test('drops expansion when the expanded row is removed', () => {
        const { result } = renderHook(() => useReorderableRows(3));

        act(() => result.current.setExpanded(1, true));
        act(() => result.current.removeRow(1));

        expect(result.current.isExpanded(0)).toBe(false);
        expect(result.current.isExpanded(1)).toBe(false);
    });

    test('keeps unrelated expansion when another row is removed', () => {
        const { result } = renderHook(() => useReorderableRows(3));

        act(() => result.current.setExpanded(2, true));
        act(() => result.current.removeRow(0));

        expect(result.current.isExpanded(1)).toBe(true);
    });

    test('adds a row and optionally expands it', () => {
        const { result } = renderHook(() => useReorderableRows(1));

        act(() => result.current.addRow({ expand: true }));

        expect(result.current.keys).toHaveLength(2);
        expect(result.current.isExpanded(1)).toBe(true);
    });

    test('adopts external length changes without losing valid expansion', () => {
        const { result, rerender } = renderHook(
            ({ length }) => useReorderableRows(length),
            { initialProps: { length: 2 } },
        );

        act(() => result.current.setExpanded(0, true));
        rerender({ length: 4 });

        expect(result.current.keys).toHaveLength(4);
        expect(result.current.isExpanded(0)).toBe(true);

        rerender({ length: 1 });

        expect(result.current.keys).toHaveLength(1);
        expect(result.current.isExpanded(0)).toBe(true);
    });
});
