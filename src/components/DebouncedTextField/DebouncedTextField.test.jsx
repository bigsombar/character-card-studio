import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import DebouncedTextField from './DebouncedTextField';

const renderField = () => render(
    <DebouncedTextField
        label="Description"
        multiline
        onChange={() => {}}
        rows={3}
        value="{{char}} greets {{user}} and waits"
    />,
);

describe('DebouncedTextField macro overlay', () => {
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

describe('DebouncedTextField editing', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('shows keystrokes immediately and commits them after the debounce', () => {
        const onChange = vi.fn();
        const { container } = render(
            <DebouncedTextField
                debounceMs={300}
                label="Description"
                multiline
                onChange={onChange}
                value="old"
            />,
        );
        const textarea = container.querySelector('textarea');

        fireEvent.change(textarea, { target: { value: 'new text' } });

        expect(textarea.value).toBe('new text');
        expect(onChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('new text');
    });

    test('keeps the last keystrokes when the field unmounts before the timer fires', () => {
        const onChange = vi.fn();
        const { container, unmount } = render(
            <DebouncedTextField label="Description" multiline onChange={onChange} value="" />,
        );
        const textarea = container.querySelector('textarea');

        fireEvent.change(textarea, { target: { value: 'unsaved words' } });
        unmount();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('unsaved words');
    });

    test('adopts a new model value without losing the field', () => {
        const { container, rerender } = render(
            <DebouncedTextField label="Description" multiline onChange={vi.fn()} value="imported" />,
        );
        const textarea = container.querySelector('textarea');

        rerender(<DebouncedTextField label="Description" multiline onChange={vi.fn()} value="from another field" />);

        expect(textarea.value).toBe('from another field');
    });

    test('supports number fields without touching text selection', () => {
        const onChange = vi.fn();
        const { container } = render(
            <DebouncedTextField
                debounceMs={0}
                label="Scan depth"
                onChange={onChange}
                preserveCursor={false}
                type="number"
                value={4}
            />,
        );
        const input = container.querySelector('input');

        expect(() => fireEvent.change(input, { target: { value: '8' } })).not.toThrow();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('8');
    });

    test('updates the character count as the user types', () => {
        const { container } = render(
            <DebouncedTextField label="Description" multiline onChange={vi.fn()} showCount value="abc" />,
        );
        const textarea = container.querySelector('textarea');

        fireEvent.change(textarea, { target: { value: 'abcdef' } });

        expect(container.ownerDocument.body.textContent).toContain('6 characters');
    });
});
