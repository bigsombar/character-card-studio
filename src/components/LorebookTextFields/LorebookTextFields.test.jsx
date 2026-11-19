import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CardContext } from '../../context/cardContext';
import {
    CompactBooleanField,
    LorebookEntryInt,
    LorebookEntryString,
    LorebookMetaInt,
    LorebookMetaString,
} from './LorebookTextFields';

function renderInBook(character_book, field) {
    render(
        <CardContext.Provider value={{ cardData: { data: { character_book } }, setCardData: vi.fn() }}>
            {field()}
        </CardContext.Provider>,
    );
}

describe('Lorebook field wrappers', () => {
    test('LorebookMetaString reads the book value', () => {
        renderInBook(
            { name: 'World', description: 'Lore notes' },
            () => <LorebookMetaString changeCallback={vi.fn()} fieldName="description" label="Lorebook description" />,
        );

        const field = screen.getByLabelText('Lorebook description');
        expect(field.value).toBe('Lore notes');
        expect(field).toHaveAttribute('name', 'description');
    });

    test('LorebookMetaInt renders a numeric input', () => {
        renderInBook(
            { scan_depth: 4 },
            () => <LorebookMetaInt changeCallback={vi.fn()} fieldName="scan_depth" label="Scan depth" />,
        );

        const field = screen.getByLabelText('Scan depth');
        expect(field).toHaveAttribute('type', 'number');
        expect(field.value).toBe('4');
    });

    test('LorebookEntryString targets the requested entry', () => {
        renderInBook(
            { entries: [{ content: 'Zero' }, {}, { content: 'Second entry' }] },
            () => (
                <LorebookEntryString
                    changeCallback={vi.fn()}
                    entryIndex={2}
                    fieldName="content"
                    label="Entry text"
                    rows={4}
                />
            ),
        );

        const field = screen.getByLabelText('Entry text');
        expect(field.value).toBe('Second entry');
        expect(field).toHaveAttribute('name', 'content#2');
    });

    test('LorebookEntryInt targets the requested entry', () => {
        renderInBook(
            { entries: [{}, { insertion_order: 100 }] },
            () => (
                <LorebookEntryInt
                    changeCallback={vi.fn()}
                    entryIndex={1}
                    fieldName="insertion_order"
                    label="Insertion order"
                />
            ),
        );

        const field = screen.getByLabelText('Insertion order');
        expect(field.value).toBe('100');
        expect(field).toHaveAttribute('name', 'insertion_order#1');
    });

    test('missing entries render empty fields instead of crashing', () => {
        renderInBook(
            {},
            () => <LorebookEntryString changeCallback={vi.fn()} entryIndex={5} fieldName="content" label="Entry text" />,
        );

        expect(screen.getByLabelText('Entry text').value).toBe('');
    });
});

describe('CompactBooleanField', () => {
    test('required booleans only offer False and True', () => {
        render(<CompactBooleanField label="Enabled" onChange={() => {}} required value />);

        fireEvent.mouseDown(screen.getByRole('combobox'));

        expect(screen.getByRole('option', {name: 'False'})).toBeInTheDocument();
        expect(screen.getByRole('option', {name: 'True'})).toBeInTheDocument();
        expect(screen.queryByRole('option', {name: 'N/A'})).not.toBeInTheDocument();
    });

    test('required null values fall back to False', () => {
        render(<CompactBooleanField label="Enabled" onChange={() => {}} required value={null} />);

        expect(screen.getByRole('combobox')).toHaveTextContent('False');
    });

    test('optional booleans keep an explicit N/A state', () => {
        const onChange = vi.fn();
        render(<CompactBooleanField label="Case sensitive" onChange={onChange} value={false} />);

        fireEvent.mouseDown(screen.getByRole('combobox'));
        fireEvent.click(screen.getByRole('option', {name: 'N/A'}));

        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    test('maps True and False selections to booleans', () => {
        const onChange = vi.fn();
        render(<CompactBooleanField label="Always active" onChange={onChange} value={false} />);

        fireEvent.mouseDown(screen.getByRole('combobox'));
        fireEvent.click(screen.getByRole('option', {name: 'True'}));
        expect(onChange).toHaveBeenCalledWith(true);
    });
});
