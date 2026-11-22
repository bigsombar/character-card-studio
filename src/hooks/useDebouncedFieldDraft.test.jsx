import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import useDebouncedFieldDraft from './useDebouncedFieldDraft';

function changeEvent(value) {
    return { target: { value } };
}

describe('useDebouncedFieldDraft', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('updates the draft immediately and commits the value after the delay', () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({ delayMs: 300, onCommit, value: 'a' }));

        act(() => result.current.handleChange(changeEvent('ab')));

        expect(result.current.draft).toBe('ab');
        expect(onCommit).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(299));
        expect(onCommit).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(1));
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('ab');
        expect(onCommit.mock.calls[0][1]).toEqual({ fieldKey: undefined, source: 'timer' });
    });

    test('commits only the latest value of a typing burst', () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({ delayMs: 200, onCommit, value: '' }));

        act(() => result.current.handleChange(changeEvent('a')));
        act(() => vi.advanceTimersByTime(100));
        act(() => result.current.handleChange(changeEvent('ab')));
        act(() => vi.advanceTimersByTime(200));

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('ab');
    });

    test('commits synchronously when the delay is zero', () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({ delayMs: 0, onCommit, value: '' }));

        act(() => result.current.handleChange(changeEvent('now')));

        expect(result.current.draft).toBe('now');
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('now');
    });

    test('flush commits a pending value with the requested source', () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({
            delayMs: 300,
            fieldKey: 'description',
            onCommit,
            value: '',
        }));

        act(() => result.current.handleChange(changeEvent('draft')));
        act(() => result.current.flush('blur'));

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('draft');
        expect(onCommit.mock.calls[0][1]).toEqual({ fieldKey: 'description', source: 'blur' });
    });

    test('flushes a pending change on unmount instead of dropping it', () => {
        const onCommit = vi.fn();
        const { result, unmount } = renderHook(() => useDebouncedFieldDraft({ delayMs: 300, onCommit, value: '' }));

        act(() => result.current.handleChange(changeEvent('last keystroke')));
        unmount();

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('last keystroke');
        expect(onCommit.mock.calls[0][1].source).toBe('unmount');
    });

    test('keeps the pending timer when the parent re-renders with a new callback', () => {
        const first = vi.fn();
        const second = vi.fn();
        const { result, rerender } = renderHook(
            ({ onCommit }) => useDebouncedFieldDraft({ delayMs: 300, onCommit, value: '' }),
            { initialProps: { onCommit: first } },
        );

        act(() => result.current.handleChange(changeEvent('draft')));
        rerender({ onCommit: second });
        act(() => vi.advanceTimersByTime(300));

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
        expect(second.mock.calls[0][0]).toBe('draft');
    });

    test('adopts external model updates without a pending edit', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedFieldDraft({ delayMs: 300, onCommit: vi.fn(), value }),
            { initialProps: { value: 'first' } },
        );

        rerender({ value: 'from import' });

        expect(result.current.draft).toBe('from import');
    });

    test('restores the caret and notifies after the draft paints', () => {
        const input = { selectionStart: 2, setSelectionRange: vi.fn() };
        const inputRef = { current: input };
        const onAfterDraftChange = vi.fn();

        const { result } = renderHook(() => useDebouncedFieldDraft({
            delayMs: 300,
            inputRef,
            onAfterDraftChange,
            onCommit: vi.fn(),
            value: '',
        }));

        act(() => result.current.handleChange(changeEvent('abcdef')));

        expect(input.setSelectionRange).toHaveBeenCalledWith(2, 2);
        expect(onAfterDraftChange).toHaveBeenCalled();
    });

    test('detects inputs without text selection support instead of throwing', () => {
        const input = {
            get selectionStart() {
                throw new Error('type="number" must not be queried for selectionStart');
            },
            setSelectionRange: vi.fn(),
        };
        const inputRef = { current: input };
        const onCommit = vi.fn();

        const { result } = renderHook(() => useDebouncedFieldDraft({
            delayMs: 0,
            inputRef,
            onCommit,
            value: '',
        }));

        expect(() => {
            act(() => result.current.handleChange(changeEvent('42')));
        }).not.toThrow();
        expect(input.setSelectionRange).not.toHaveBeenCalled();
        expect(onCommit).toHaveBeenCalledWith('42', expect.objectContaining({ source: 'timer' }));
    });

    test('does not commit intermediate IME composition values', () => {
        const onCommit = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({ delayMs: 100, onCommit, value: '' }));

        act(() => result.current.handleCompositionStart());
        act(() => result.current.handleChange(changeEvent('に')));
        act(() => result.current.handleChange(changeEvent('日本')));
        act(() => vi.advanceTimersByTime(300));

        expect(onCommit).not.toHaveBeenCalled();

        act(() => result.current.handleCompositionEnd(changeEvent('日本')));
        act(() => vi.advanceTimersByTime(100));

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('日本');
        expect(onCommit.mock.calls[0][1].source).toBe('composition');
    });
});
