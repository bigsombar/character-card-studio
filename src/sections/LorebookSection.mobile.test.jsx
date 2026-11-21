import { useCallback, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CardContext } from '../context/cardContext';
import { NotificationProvider } from '../context/NotificationContext';
import LorebookSection from './LorebookSection';

vi.mock('../hooks/useIsMobile', () => ({
    default: () => true,
}));

function makeEntry(overrides = {}) {
    return {
        case_sensitive: false,
        comment: 'Alice',
        constant: false,
        content: 'Alice is a brilliant polymath.',
        enabled: true,
        extensions: {},
        id: 1,
        insertion_order: 100,
        keys: ['Alice', 'Polymath'],
        name: 'Alice',
        position: 'before_char',
        priority: 10,
        secondary_keys: [],
        selective: false,
        use_regex: false,
        ...overrides,
    };
}

function makeCard(entries) {
    return {
        data: {
            character_book: {
                description: 'Lore notes',
                entries,
                extensions: {},
                name: 'Fischl_WI',
                recursive_scanning: false,
                scan_depth: 50,
                token_budget: 500,
            },
            name: 'Test',
        },
        spec: 'chara_card_v3',
        spec_version: '3.0',
    };
}

function StatefulLorebook({ entries = [], showAdvancedJson = false }) {
    const [cardData, setCardData] = useState(makeCard(entries));
    const patchCardData = useCallback((patch) => {
        setCardData((previous) => {
            const resolved = typeof patch === 'function' ? patch(previous) : patch;
            return { ...previous, data: { ...previous.data, ...resolved } };
        });
    }, []);

    return (
        <>
            <CardContext.Provider value={{ cardData, patchCardData, setCardData }}>
                <NotificationProvider>
                    <LorebookSection showAdvancedJson={showAdvancedJson} />
                </NotificationProvider>
            </CardContext.Provider>
            <output data-testid="card-entries">{JSON.stringify(cardData.data.character_book.entries)}</output>
        </>
    );
}

describe('LorebookSection mobile master-detail', () => {
    test('opens an entry in a full-screen editor and returns to the list', async () => {
        render(<StatefulLorebook entries={[makeEntry()]} />);

        expect(screen.getByRole('button', { name: /^Alice/ })).toBeInTheDocument();
        expect(screen.queryByText('Identity')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^Alice/ }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Identity')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Move entry up' })).toBeDisabled();
        expect(within(dialog).getByRole('button', { name: 'Move entry down' })).toBeDisabled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Back to entries' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    test('moves an entry down and keeps the same entry open', async () => {
        render(<StatefulLorebook entries={[
            makeEntry(),
            makeEntry({ comment: 'Klee', content: 'Klee loves bombs.', id: 2, name: 'Klee' }),
        ]} />);

        fireEvent.click(screen.getByRole('button', { name: /^Alice/ }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Move entry down' }));

        const entries = JSON.parse(screen.getByTestId('card-entries').textContent);
        expect(entries.map((entry) => entry.name)).toEqual(['Klee', 'Alice']);
        expect(entries.map((entry) => entry.id)).toEqual([1, 2]);
        expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    });

    test('moves entries from the list without opening the editor', () => {
        render(<StatefulLorebook entries={[
            makeEntry(),
            makeEntry({ comment: 'Klee', content: 'Klee loves bombs.', id: 2, name: 'Klee' }),
        ]} />);

        fireEvent.click(screen.getByRole('button', { name: 'Move Alice down' }));

        const entries = JSON.parse(screen.getByTestId('card-entries').textContent);
        expect(entries.map((entry) => entry.name)).toEqual(['Klee', 'Alice']);
        expect(entries.map((entry) => entry.id)).toEqual([1, 2]);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('keeps Add similar disabled until an entry exists and opens new entries', async () => {
        const { unmount } = render(<StatefulLorebook entries={[]} />);

        expect(screen.getByRole('button', { name: 'Add similar' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Add entry' })).toBeEnabled();
        unmount();

        render(<StatefulLorebook entries={[makeEntry()]} />);
        expect(screen.getByRole('button', { name: 'Add similar' })).toBeEnabled();

        fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Entry #2')).toBeInTheDocument();
        expect(within(dialog).getByText('Identity')).toBeInTheDocument();
    });
});

