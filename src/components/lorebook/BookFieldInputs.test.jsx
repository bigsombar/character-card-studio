import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CompactBooleanField } from './BookFieldInputs';

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
