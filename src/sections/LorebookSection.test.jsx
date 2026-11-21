import { useCallback, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CardContext } from '../context/cardContext';
import { NotificationProvider } from '../context/NotificationContext';
import LorebookSection from './LorebookSection';

function makeEntry(overrides = {}) {
    return {
        case_sensitive: false,
        comment: 'Alice',
        constant: false,
        content: 'Alice is a brilliant polymath.',
        enabled: true,
        extensions: { role: 0 },
        id: 1,
        insertion_order: 100,
        keys: ['Alice'],
        name: 'Alice',
        position: 'before_char',
        priority: 10,
        secondary_keys: [],
        selective: true,
        use_regex: false,
        ...overrides,
    };
}

function makeCard(entries = [makeEntry()]) {
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

function renderSection(props = {}) {
    render(
        <CardContext.Provider value={{ cardData: makeCard(), patchCardData: vi.fn(), setCardData: vi.fn() }}>
            <NotificationProvider>
                <LorebookSection {...props} />
            </NotificationProvider>
        </CardContext.Provider>,
    );
}

function expandFirstEntry() {
    fireEvent.click(screen.getByText('Alice'));
}

function StatefulLorebook({ entries = [], ...props }) {
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
                    <LorebookSection {...props} />
                </NotificationProvider>
            </CardContext.Provider>
            <output data-testid="card-entries">{JSON.stringify(cardData.data.character_book.entries)}</output>
        </>
    );
}

describe('LorebookSection advanced JSON visibility', () => {
    test('hides entry extensions by default', () => {
        renderSection();
        expandFirstEntry();

        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.queryByText('Advanced JSON')).not.toBeInTheDocument();
        expect(screen.queryByText('Entry extensions (JSON)')).not.toBeInTheDocument();
    });

    test('shows entry extensions when enabled for all entries', () => {
        renderSection({ showAdvancedJson: true });
        expandFirstEntry();

        expect(screen.getByText('Advanced JSON')).toBeInTheDocument();
        expect(screen.getByText('Entry extensions (JSON)')).toBeInTheDocument();
    });

    test('keeps the book settings visible regardless of the toggle', () => {
        renderSection();

        expect(screen.getByLabelText('Lorebook Name')).toHaveValue('Fischl_WI');
        expect(screen.getByLabelText('Lorebook Description')).toHaveValue('Lore notes');
        expect(screen.getByLabelText('Lorebook extensions (JSON)')).toBeInTheDocument();
    });

    test('leaves other entries unaffected by a single entry expansion', () => {
        render(
            <CardContext.Provider value={{
                cardData: makeCard([makeEntry(), makeEntry({ content: 'Second entry', comment: 'Klee', name: 'Klee' })]),
                patchCardData: vi.fn(),
                setCardData: vi.fn(),
            }}>
                <NotificationProvider>
                    <LorebookSection showAdvancedJson />
                </NotificationProvider>
            </CardContext.Provider>,
        );

        fireEvent.click(screen.getByText('Alice'));
        expect(screen.getAllByText('Entry extensions (JSON)')).toHaveLength(1);

        fireEvent.click(screen.getByText('Klee'));
        expect(screen.getAllByText('Entry extensions (JSON)')).toHaveLength(2);
    });
});

describe('LorebookSection add similar', () => {
    test('disables Add similar when there are no entries', () => {
        render(<StatefulLorebook entries={[]} />);

        expect(screen.getByRole('button', { name: /add similar/i })).toBeDisabled();
    });

    test('Add entry starts the ID sequence at 1', () => {
        render(<StatefulLorebook entries={[]} />);

        fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

        const entries = JSON.parse(screen.getByTestId('card-entries').textContent);
        expect(entries).toHaveLength(1);
        expect(entries[0].id).toBe(1);
    });

    test('Add entry continues from the last numeric ID', () => {
        render(<StatefulLorebook entries={[makeEntry({ id: 4 }), makeEntry({ id: 9 })]} />);

        fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

        const entries = JSON.parse(screen.getByTestId('card-entries').textContent);
        expect(entries).toHaveLength(3);
        expect(entries[2].id).toBe(10);
    });

    test('copies the last entry without its identity, triggers or content', () => {
        const source = makeEntry({
            case_sensitive: true,
            comment: 'Klee',
            constant: true,
            content: 'Boom!',
            enabled: false,
            extensions: { custom: { keep: true }, role: 2 },
            id: 7,
            insertion_order: 42,
            keys: ['Klee'],
            name: 'Klee',
            position: 'after_char',
            priority: 7,
            secondary_keys: ['Bomb'],
            selective: false,
            use_regex: true,
        });

        render(<StatefulLorebook entries={[makeEntry(), source]} />);
        fireEvent.click(screen.getByRole('button', { name: /add similar/i }));

        const entries = JSON.parse(screen.getByTestId('card-entries').textContent);
        expect(entries).toHaveLength(3);
        expect(entries[2]).toMatchObject({
            case_sensitive: true,
            constant: true,
            content: '',
            enabled: false,
            extensions: { custom: { keep: true }, role: 2 },
            id: 8,
            insertion_order: 42,
            keys: [],
            position: 'after_char',
            priority: 7,
            selective: false,
            use_regex: true,
        });
        expect(entries[2].comment).toBeUndefined();
        expect(entries[2].name).toBeUndefined();
        expect(entries[2].secondary_keys).toBeUndefined();

        expect(entries[1]).toMatchObject({
            comment: 'Klee',
            content: 'Boom!',
            id: 7,
            keys: ['Klee'],
            name: 'Klee',
            secondary_keys: ['Bomb'],
        });
    });
});
