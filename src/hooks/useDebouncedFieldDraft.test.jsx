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

    test('updates the draft immediately and commits after the delay', () => {
        const onChange = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({ delayMs: 300, onChange, value: 'a' }));

        act(() => result.current.handleChange(changeEvent('ab')));

        expect(result.current.draft).toBe('ab');
        expect(onChange).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(299));
        expect(onChange).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(1));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('ab');
    });

    test('commits only the latest change of a typing burst', () => {
        const onChange = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({ delayMs: 200, onChange, value: '' }));

        act(() => result.current.handleChange(changeEvent('a')));
        act(() => vi.advanceTimersByTime(100));
        act(() => result.current.handleChange(changeEvent('ab')));
        act(() => vi.advanceTimersByTime(200));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('ab');
    });

    test('commits synchronously when the delay is zero', () => {
        const onChange = vi.fn();
        const { result } = renderHook(() => useDebouncedFieldDraft({ delayMs: 0, onChange, value: '' }));

        act(() => result.current.handleChange(changeEvent('now')));

        expect(result.current.draft).toBe('now');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('now');
    });

    test('flushes a pending change on unmount instead of dropping it', () => {
        const onChange = vi.fn();
        const { result, unmount } = renderHook(() => useDebouncedFieldDraft({ delayMs: 300, onChange, value: '' }));

        act(() => result.current.handleChange(changeEvent('last keystroke')));
        unmount();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('last keystroke');
    });

    test('keeps the pending timer when the parent re-renders with a new callback', () => {
        const first = vi.fn();
        const second = vi.fn();
        const { result, rerender } = renderHook(
            ({ onChange }) => useDebouncedFieldDraft({ delayMs: 300, onChange, value: '' }),
            { initialProps: { onChange: first } },
        );

        act(() => result.current.handleChange(changeEvent('draft')));
        rerender({ onChange: second });
        act(() => vi.advanceTimersByTime(300));

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
        expect(second.mock.calls[0][0].target.value).toBe('draft');
    });

    test('adopts external model updates without a pending edit', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedFieldDraft({ delayMs: 300, onChange: vi.fn(), value }),
            { initialProps: { value: 'first' } },
        );

        rerender({ value: 'from import' });

        expect(result.current.draft).toBe('from import');
    });

    test('restores the caret and notifies after the draft renders', () => {
        const input = { selectionStart: 2, setSelectionRange: vi.fn() };
        const inputRef = { current: input };
        const onAfterDraftChange = vi.fn();

        const { result } = renderHook(() => useDebouncedFieldDraft({
            delayMs: 300,
            inputRef,
            onAfterDraftChange,
            onChange: vi.fn(),
            value: '',
        }));

        act(() => result.current.handleChange(changeEvent('abcdef')));
        act(() => vi.runOnlyPendingTimers());

        expect(input.setSelectionRange).toHaveBeenCalledWith(2, 2);
        expect(onAfterDraftChange).toHaveBeenCalled();
    });

    test('never touches selection on inputs that do not support it', () => {
        const input = {
            get selectionStart() {
                throw new Error('type="number" must not be queried for selectionStart');
            },
            setSelectionRange: vi.fn(),
        };
        const inputRef = { current: input };

        const { result } = renderHook(() => useDebouncedFieldDraft({
            delayMs: 0,
            inputRef,
            onChange: vi.fn(),
            preserveCursor: false,
            value: '',
        }));

        expect(() => {
            act(() => result.current.handleChange(changeEvent('42')));
            act(() => vi.runOnlyPendingTimers());
        }).not.toThrow();
        expect(input.setSelectionRange).not.toHaveBeenCalled();
    });
});
