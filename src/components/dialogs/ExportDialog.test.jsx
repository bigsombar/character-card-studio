import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import ExportDialog from './ExportDialog';
import { createNewCard } from '../../spec/cardPrototype';

function validCard() {
    const card = createNewCard();
    card.data.name = 'Export Test';
    return card;
}

describe('ExportDialog', () => {
    test('blocks export when structural errors are present', () => {
        const card = validCard();
        card.data.name = 42;

        render(
            <ExportDialog
                cardData={card}
                exporting={false}
                onClose={vi.fn()}
                onExport={vi.fn()}
                open
                progress={null}
            />,
        );

        expect(screen.getByText(/errors \(1\)/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export charx/i })).toBeDisabled();
    });

    test('selects JSON, shows the inline option and calls onExport', async () => {
        const onExport = vi.fn().mockResolvedValue({ ok: true });
        const onClose = vi.fn();

        render(
            <ExportDialog
                cardData={validCard()}
                exporting={false}
                onClose={onClose}
                onExport={onExport}
                open
                progress={null}
            />,
        );

        fireEvent.click(screen.getByRole('radio', { name: /V3 JSON/i }));
        expect(screen.getByLabelText(/inline embeded:\/\/ media/i)).toBeChecked();

        fireEvent.click(screen.getByRole('button', { name: /export v3 json/i }));

        await waitFor(() => expect(onExport).toHaveBeenCalledWith('json', { embedRemote: true, inlineAssets: true }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
