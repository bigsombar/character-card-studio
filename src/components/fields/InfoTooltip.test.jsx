import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import InfoTooltip from './InfoTooltip';

describe('InfoTooltip', () => {
    test('exposes help text on focus and via aria-describedby', async () => {
        render(<InfoTooltip text="The character name." title="Name" />);

        const help = screen.getByRole('button', { name: /help: name/i });
        fireEvent.mouseOver(help);

        const tooltip = await screen.findByRole('tooltip');
        expect(tooltip).toHaveTextContent('Name: The character name.');
        expect(help).toHaveAttribute('aria-describedby', tooltip.id);
    });
});
