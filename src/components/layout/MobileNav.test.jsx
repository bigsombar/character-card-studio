import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import MobileNav from './MobileNav';

function renderNav(activeSection = 0) {
    const onSectionChange = vi.fn();
    render(<MobileNav activeSection={activeSection} onSectionChange={onSectionChange} />);
    return { onSectionChange };
}

describe('MobileNav', () => {
    test('keeps the primary sections in the bottom bar', () => {
        const { onSectionChange } = renderNav();

        expect(screen.getByRole('button', { name: 'Character' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Greetings' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Lorebook' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Assets' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Lorebook' }));
        expect(onSectionChange).toHaveBeenCalledWith(4);
    });

    test('switches to a secondary section from the More sheet', () => {
        const { onSectionChange } = renderNav();

        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        expect(screen.getByRole('heading', { name: 'More sections' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^advanced/i }));
        expect(onSectionChange).toHaveBeenCalledWith(8);
    });
});
