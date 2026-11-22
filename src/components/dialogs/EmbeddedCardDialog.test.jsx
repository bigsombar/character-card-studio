import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import EmbeddedCardDialog from './EmbeddedCardDialog';

const candidates = [
    {
        chunk: { data: { spec: 'chara_card_v3' }, keyword: 'ccv3' },
        entries: 4,
        keyword: 'ccv3',
        modified: 1700000000,
        name: 'V3 Hero',
        spec: 'chara_card_v3',
    },
    {
        chunk: { data: { spec: 'chara_card_v2' }, keyword: 'chara' },
        entries: 12,
        keyword: 'chara',
        modified: 1700000100,
        name: 'V2 Hero',
        spec: 'chara_card_v2',
    },
];

describe('EmbeddedCardDialog', () => {
    test('preselects the V3 copy and imports the selected payload', () => {
        const onSelect = vi.fn();
        render(
            <EmbeddedCardDialog
                candidates={candidates}
                onCancel={vi.fn()}
                onSelect={onSelect}
                open
            />,
        );

        expect(screen.getByRole('radio', { name: /V3 copy/i })).toBeChecked();
        fireEvent.click(screen.getByRole('button', { name: 'Import selected' }));

        expect(onSelect).toHaveBeenCalledWith(candidates[0]);
    });

    test('lets the user choose the V2 copy explicitly', () => {
        const onSelect = vi.fn();
        render(
            <EmbeddedCardDialog
                candidates={candidates}
                onCancel={vi.fn()}
                onSelect={onSelect}
                open
            />,
        );

        fireEvent.click(screen.getByRole('radio', { name: /V2 copy/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Import selected' }));

        expect(onSelect).toHaveBeenCalledWith(candidates[1]);
    });

    test('cancel closes without importing', () => {
        const onCancel = vi.fn();
        const onSelect = vi.fn();
        render(
            <EmbeddedCardDialog
                candidates={candidates}
                onCancel={onCancel}
                onSelect={onSelect}
                open
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
