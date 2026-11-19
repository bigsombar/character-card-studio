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
        <CardContext.Provider value={{ cardData: makeCard(), setCardData: vi.fn() }}>
            <NotificationProvider>
                <LorebookSection {...props} />
            </NotificationProvider>
        </CardContext.Provider>,
    );
}

function expandFirstEntry() {
    fireEvent.click(screen.getByText('Alice'));
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
