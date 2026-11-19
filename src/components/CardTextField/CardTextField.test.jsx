import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CardContext } from '../../context/cardContext';
import CardTextField from './CardTextField';

function renderCardField({ data = {}, ...props } = {}) {
    const changeCallback = vi.fn();
    render(
        <CardContext.Provider value={{ cardData: { data }, setCardData: vi.fn() }}>
            <CardTextField changeCallback={changeCallback} fieldName="description" {...props} />
        </CardContext.Provider>,
    );
    return { changeCallback };
}

describe('CardTextField', () => {
    test('reads the value from card context and derives a readable label', () => {
        renderCardField({ data: { description: 'A wandering scholar.' } });

        const field = screen.getByLabelText('Character Description');
        expect(field.value).toBe('A wandering scholar.');
        expect(field).toHaveAttribute('name', 'description');
    });

    test('prefers an explicit label', () => {
        renderCardField({ data: { description: 'Text' }, label: 'About' });

        expect(screen.getByLabelText('About').value).toBe('Text');
    });

    test('renders the source array as one URI per line', () => {
        renderCardField({
            data: { source: ['https://example.com/a.png', 'https://example.com/b.png'] },
            fieldName: 'source',
            label: 'Source',
            multiline: true,
        });

        expect(screen.getByLabelText('Source').value).toBe(
            'https://example.com/a.png\nhttps://example.com/b.png',
        );
    });

    test('reports edits with the field name and the new value', () => {
        const { changeCallback } = renderCardField({
            data: { description: 'Old' },
            debounceMs: 0,
        });

        fireEvent.change(screen.getByLabelText('Character Description'), {
            target: { value: 'New text' },
        });

        expect(changeCallback).toHaveBeenCalledTimes(1);
        expect(changeCallback.mock.calls[0][0].target).toMatchObject({
            name: 'description',
            value: 'New text',
        });
    });

    test('passes readOnly through to the field', () => {
        renderCardField({ data: { description: 'Locked' }, readOnly: true });

        expect(screen.getByLabelText('Character Description')).toHaveAttribute('readonly');
    });
});
