import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CardContext } from '../context/cardContext';
import { createNewCard } from '../spec/cardPrototype';
import useCardOverwrite from './useCardOverwrite';

const mocks = vi.hoisted(() => ({
    ingestCardAssets: vi.fn(),
    notify: vi.fn(),
}));

vi.mock('../context/AssetContext', () => ({
    useAssets: () => ({ ingestCardAssets: mocks.ingestCardAssets }),
}));

vi.mock('../context/NotificationContext', () => ({
    useNotifications: () => ({ notify: mocks.notify }),
}));

function cardWithName(name) {
    const card = createNewCard();
    card.data.name = name;
    return card;
}

function wrapper(setCardData) {
    return ({ children }) => (
        <CardContext.Provider value={{ cardData: cardWithName('Live'), setCardData }}>
            {children}
        </CardContext.Provider>
    );
}

function setup() {
    const setCardData = vi.fn();
    const onApplied = vi.fn();
    const hook = renderHook(
        () => useCardOverwrite({ onApplied }),
        { wrapper: wrapper(setCardData) },
    );
    return { ...hook, onApplied, setCardData };
}

describe('useCardOverwrite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('holds a prepared card until the user confirms', () => {
        mocks.ingestCardAssets.mockReset().mockImplementation(async (card) => card);
        const { result } = setup();
        const next = cardWithName('Next');

        expect(result.current.overwriteConfirmation).toBe(false);
        act(() => result.current.requestOverwrite(next, []));

        expect(result.current.overwriteConfirmation).toBe(true);
    });

    test('cancel discards the prepared card without touching the project', () => {
        const { result, setCardData, onApplied } = setup();

        act(() => result.current.requestOverwrite(cardWithName('Next'), []));
        act(() => result.current.cancelOverwrite());

        expect(result.current.overwriteConfirmation).toBe(false);
        expect(setCardData).not.toHaveBeenCalled();
        expect(onApplied).not.toHaveBeenCalled();
    });

    test('confirm commits the card, ingests assets and reports the result', async () => {
        const ingested = cardWithName('Ingested');
        mocks.ingestCardAssets.mockReset().mockResolvedValue(ingested);
        const { result, setCardData, onApplied } = setup();

        act(() => result.current.requestOverwrite(cardWithName('Next'), []));
        await act(async () => {
            await result.current.confirmOverwrite();
        });

        expect(setCardData).toHaveBeenCalledWith(ingested);
        expect(onApplied).toHaveBeenCalledWith(ingested);
        expect(result.current.overwriteConfirmation).toBe(false);
    });

    test('warns about normalization issues after the card is applied', async () => {
        mocks.ingestCardAssets.mockReset().mockImplementation(async (card) => card);
        const { result } = setup();
        const warnings = [{ code: 'EXAMPLE', message: 'Example warning.' }];

        act(() => result.current.requestOverwrite(cardWithName('Next'), warnings));
        await act(async () => {
            await result.current.confirmOverwrite();
        });

        expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Card overwritten with warnings',
            warnings,
        }));
    });

    test('applies the card even when asset ingestion fails', async () => {
        mocks.ingestCardAssets.mockReset().mockRejectedValue(new Error('IndexedDB is full'));
        const { result, setCardData } = setup();
        const next = cardWithName('Next');

        act(() => result.current.requestOverwrite(next, []));
        await act(async () => {
            await result.current.confirmOverwrite();
        });

        expect(setCardData).toHaveBeenCalledWith(next);
        expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Asset import warning',
        }));
    });

    test('parses a JSON file and prepares it for confirmation', async () => {
        mocks.ingestCardAssets.mockReset().mockImplementation(async (card) => card);
        const { result } = setup();
        const file = new File(
            [JSON.stringify(cardWithName('From file'))],
            'card.json',
            { type: 'application/json' },
        );

        await act(async () => {
            await result.current.requestOverwriteFromFile(file);
        });

        expect(result.current.overwriteConfirmation).toBe(true);
    });

    test('reports malformed JSON without opening the confirmation', async () => {
        const { result } = setup();
        const file = new File(['{ not json'], 'broken.json', { type: 'application/json' });

        await act(async () => {
            await result.current.requestOverwriteFromFile(file);
        });

        expect(result.current.overwriteConfirmation).toBe(false);
        expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'JSON import failed' }));
    });

    test('rejects a JSON file that is not a card', async () => {
        const { result } = setup();
        const file = new File(['{"spec":"something-else"}'], 'wrong.json', { type: 'application/json' });

        await act(async () => {
            await result.current.requestOverwriteFromFile(file);
        });

        expect(result.current.overwriteConfirmation).toBe(false);
        expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Import failed' }));
    });

    test('ignores an empty file selection', async () => {
        const { result } = setup();

        await act(async () => {
            await result.current.requestOverwriteFromFile(undefined);
        });

        expect(result.current.overwriteConfirmation).toBe(false);
        expect(mocks.notify).not.toHaveBeenCalled();
    });
});
