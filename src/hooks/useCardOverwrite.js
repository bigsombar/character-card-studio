import { useCallback, useReducer } from 'react';

import { useCardStore } from '../context/cardStoreContext';
import { useAssets } from '../context/AssetContext';
import { useNotifications } from '../context/NotificationContext';

const EMPTY_PENDING = { card: null, warnings: [] };

function pendingReducer(state, action) {
    switch (action.type) {
        case 'prepare':
            return { card: action.card, warnings: action.warnings ?? [] };
        case 'clear':
            return EMPTY_PENDING;
        default:
            return state;
    }
}

/**
 * The confirmed replacement flow shared by the header upload and the Advanced section.
 *
 * Nothing touches the project until the user confirms: parsing and normalization only prepare a
 * pending card. Confirming moves embedded assets into IndexedDB, applies the card and reports
 * normalization warnings; cancelling discards the draft without side effects.
 *
 * @param {Object} [options]
 * @param {(card: Object) => void} [options.onApplied] Runs after the card is committed
 * @returns {{
 *   cancelOverwrite: Function,
 *   confirmOverwrite: Function,
 *   replacementPending: boolean,
 *   requestOverwrite: Function
 * }}
 */
export default function useCardOverwrite({ onApplied } = {}) {
    const { setCardData } = useCardStore();
    const { ingestCardAssets } = useAssets();
    const { notify } = useNotifications();
    const [pending, dispatch] = useReducer(pendingReducer, EMPTY_PENDING);

    const requestOverwrite = useCallback((card, warnings = []) => {
        if (!card) return;
        dispatch({ card, type: 'prepare', warnings });
    }, []);

    const cancelOverwrite = useCallback(() => {
        dispatch({ type: 'clear' });
    }, []);

    const confirmOverwrite = useCallback(async () => {
        if (!pending.card) return null;

        let nextCard = pending.card;
        try {
            nextCard = await ingestCardAssets(nextCard);
        } catch (error) {
            notify({
                title: 'Asset import warning',
                severity: 'warning',
                message: `The card was applied, but some embedded assets could not be moved to IndexedDB: ${error.message}`,
            });
        }

        setCardData(nextCard);
        onApplied?.(nextCard);

        if (pending.warnings.length > 0) {
            notify({
                title: 'Card overwritten with warnings',
                severity: 'warning',
                message: 'The JSON was applied, but some fields needed normalization.',
                warnings: pending.warnings,
            });
        }

        dispatch({ type: 'clear' });
        return nextCard;
    }, [ingestCardAssets, notify, onApplied, pending.card, pending.warnings, setCardData]);

    return {
        cancelOverwrite,
        confirmOverwrite,
        replacementPending: Boolean(pending.card),
        requestOverwrite,
    };
}
