import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import AdvancedSection from './AdvancedSection';
import { CardContext } from '../context/cardContext';
import { NotificationProvider } from '../context/NotificationContext';
import { createNewCard } from '../spec/cardPrototype';

function makeCard(name = 'Alice') {
    const card = createNewCard();
    card.data.name = name;
    card.data.description = 'Original description.';
    return card;
}

function setup(initialCard = makeCard()) {
    const onApplyCard = vi.fn();
    const setCardData = vi.fn();
    const view = (cardData) => (
        <CardContext.Provider value={{ cardData, setCardData }}>
            <NotificationProvider>
                <AdvancedSection onApplyCard={onApplyCard} />
            </NotificationProvider>
        </CardContext.Provider>
    );
    const rendered = render(view(initialCard));

    return {
        ...rendered,
        onApplyCard,
        rerenderCard: (cardData) => rendered.rerender(view(cardData)),
        setCardData,
    };
}

function rawJsonField() {
    return screen.getByLabelText('Raw card JSON');
}

function parsedTextarea() {
    return JSON.parse(rawJsonField().value);
}

describe('AdvancedSection', () => {
    test('starts from the live card serialized as readable JSON', () => {
        setup();

        expect(parsedTextarea().data.name).toBe('Alice');
        expect(rawJsonField().value).toContain('\n  "data"');
    });

    test('applies edited JSON through normalization', () => {
        const card = makeCard();
        const { onApplyCard } = setup(card);
        const edited = { ...card, data: { ...card.data, description: 'Edited description.' } };

        fireEvent.change(rawJsonField(), { target: { value: JSON.stringify(edited, null, 2) } });
        expect(screen.getByText('Unapplied changes')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Apply raw JSON' }));

        expect(onApplyCard).toHaveBeenCalledTimes(1);
        expect(onApplyCard.mock.calls[0][0].data.description).toBe('Edited description.');
        expect(onApplyCard.mock.calls[0][1]).toEqual(expect.any(Array));
        expect(screen.queryByText('Unapplied changes')).not.toBeInTheDocument();
    });

    test('reports invalid JSON without replacing the card', () => {
        const { onApplyCard } = setup();

        fireEvent.change(rawJsonField(), { target: { value: '{ not json' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply raw JSON' }));

        expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
        expect(onApplyCard).not.toHaveBeenCalled();
        expect(screen.getByText('Unapplied changes')).toBeInTheDocument();
    });

    test('keeps a rejected draft when normalization fails', () => {
        const { onApplyCard } = setup();
        const withoutName = makeCard();
        delete withoutName.data.name;

        fireEvent.change(rawJsonField(), { target: { value: JSON.stringify(withoutName, null, 2) } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply raw JSON' }));

        expect(screen.getAllByRole('alert').some((alert) => /name/i.test(alert.textContent))).toBe(true);
        expect(onApplyCard).not.toHaveBeenCalled();
    });

    test('reset restores the current card and clears the draft flag', () => {
        setup();

        fireEvent.change(rawJsonField(), { target: { value: '{"changed":true}' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

        expect(parsedTextarea().data.name).toBe('Alice');
        expect(screen.queryByText('Unapplied changes')).not.toBeInTheDocument();
    });

    test('follows an external card change while the draft is clean', async () => {
        const { rerenderCard } = setup(makeCard('Alice'));

        rerenderCard(makeCard('Beatrice'));

        await waitFor(() => expect(parsedTextarea().data.name).toBe('Beatrice'));
    });

    test('keeps an edited draft when the card changes underneath', () => {
        const { rerenderCard } = setup(makeCard('Alice'));

        fireEvent.change(rawJsonField(), { target: { value: '{"draft":true}' } });
        rerenderCard(makeCard('Beatrice'));

        expect(rawJsonField().value).toBe('{"draft":true}');
    });
});
