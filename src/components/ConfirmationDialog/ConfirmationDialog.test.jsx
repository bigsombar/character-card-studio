import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import ConfirmationDialog from './ConfirmationDialog';

function renderDialog(overrides = {}) {
    const handlers = { handleClose: vi.fn(), handleConfirm: vi.fn() };
    render(
        <ConfirmationDialog
            dialogContent="This action cannot be undone."
            dialogTitle="Delete greeting?"
            open
            {...handlers}
            {...overrides}
        />,
    );
    return handlers;
}

describe('ConfirmationDialog', () => {
    test('renders the title and content', () => {
        renderDialog();

        expect(screen.getByRole('dialog', { name: 'Delete greeting?' })).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    test('Cancel dismisses without confirming', () => {
        const handlers = renderDialog();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(handlers.handleClose).toHaveBeenCalledTimes(1);
        expect(handlers.handleConfirm).not.toHaveBeenCalled();
    });

    test('Confirm runs the destructive action', () => {
        const handlers = renderDialog();

        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

        expect(handlers.handleConfirm).toHaveBeenCalledTimes(1);
        expect(handlers.handleClose).not.toHaveBeenCalled();
    });

    test('stays closed when open is false', () => {
        renderDialog({ open: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
