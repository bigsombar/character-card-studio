import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import DeferredTextInput from './DeferredTextInput';

const renderField = (props = {}) => render(
    <DeferredTextInput
        label="Description"
        multiline
        onCommit={() => {}}
        value="{{char}} greets {{user}} and waits"
        {...props}
    />,
);

describe('DeferredTextInput macro overlay', () => {
    test('paints macros with an inherited font weight so both text layers line up', () => {
        const { container } = renderField();
        const spans = [...container.querySelectorAll('[data-macro-highlight] span')];

        expect(spans.map((span) => span.textContent)).toEqual(['{{char}}', '{{user}}']);
        spans.forEach((span) => {
            expect(getComputedStyle(span).fontWeight).toBe('400');
        });
    });

    test('swaps to the native text layer while the textarea holds a selection', () => {
        const { container } = renderField();
        const textarea = container.querySelector('textarea');
        const overlay = container.querySelector('[data-macro-highlight]');

        expect(overlay).toHaveStyle({ visibility: 'visible' });
        expect(getComputedStyle(textarea).color).toBe('rgba(0, 0, 0, 0)');

        textarea.focus();
        textarea.setSelectionRange(0, 12);
        fireEvent.select(textarea);

        expect(overlay).toHaveStyle({ visibility: 'hidden' });
        expect(getComputedStyle(textarea).color).not.toBe('rgba(0, 0, 0, 0)');

        textarea.setSelectionRange(12, 12);
        fireEvent.select(textarea);

        expect(overlay).toHaveStyle({ visibility: 'visible' });
        expect(getComputedStyle(textarea).color).toBe('rgba(0, 0, 0, 0)');
    });
});

describe('DeferredTextInput editing', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('shows keystrokes immediately and commits the value after the delay', () => {
        const onCommit = vi.fn();
        const { container } = renderField({ commitDelay: 300, onCommit, value: 'old' });
        const textarea = container.querySelector('textarea');

        fireEvent.change(textarea, { target: { value: 'new text' } });

        expect(textarea.value).toBe('new text');
        expect(onCommit).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('new text');
    });

    test('commits the latest value when the field loses focus', () => {
        const onCommit = vi.fn();
        const { container } = renderField({ commitDelay: 300, onCommit, value: '' });
        const textarea = container.querySelector('textarea');

        fireEvent.change(textarea, { target: { value: 'blurred text' } });
        fireEvent.blur(textarea);

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('blurred text');
        expect(onCommit.mock.calls[0][1].source).toBe('blur');
    });

    test('keeps the last keystrokes when the field unmounts before the timer fires', () => {
        const onCommit = vi.fn();
        const { container, unmount } = renderField({ onCommit, value: '' });
        const textarea = container.querySelector('textarea');

        fireEvent.change(textarea, { target: { value: 'unsaved words' } });
        unmount();

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('unsaved words');
        expect(onCommit.mock.calls[0][1].source).toBe('unmount');
    });

    test('adopts a new model value without losing the field', () => {
        const { container, rerender } = renderField({ onCommit: vi.fn(), value: 'imported' });
        const textarea = container.querySelector('textarea');

        rerender(
            <DeferredTextInput
                label="Description"
                multiline
                onCommit={vi.fn()}
                value="from another field"
            />,
        );

        expect(textarea.value).toBe('from another field');
    });

    test('supports number fields without touching text selection', () => {
        const onCommit = vi.fn();
        const { container } = render(
            <DeferredTextInput
                commitDelay={0}
                label="Scan depth"
                onCommit={onCommit}
                type="number"
                value={4}
            />,
        );
        const input = container.querySelector('input');

        expect(() => fireEvent.change(input, { target: { value: '8' } })).not.toThrow();
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit.mock.calls[0][0]).toBe('8');
    });

    test('shows a compact character count as the user types', () => {
        const { container } = renderField({ onCommit: vi.fn(), showLength: true, value: 'abc' });
        const textarea = container.querySelector('textarea');

        fireEvent.change(textarea, { target: { value: 'abcdef' } });

        expect(container.ownerDocument.body.textContent).toContain('6 chars');
    });
});
