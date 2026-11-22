import { useCallback, useEffect, useMemo, useState } from 'react';
import debounce from 'lodash.debounce';

import { CardStoreContext } from './cardStoreContext';
import { createNewCard } from '../spec/emptyCard';
import loadInitialProject from '../storage/loadInitialProject';
import { saveProject } from '../storage/projectStore';

export const CardStoreProvider = ({children}) => {
    const [cardData, setCardData] = useState(createNewCard);
    // Patch only the `data` payload; the spec header and unknown top-level keys stay untouched.
    const patchCardData = useCallback((patch) => {
        setCardData((prev) => {
            const resolved = typeof patch === 'function' ? patch(prev) : patch;
            return { ...prev, data: { ...prev.data, ...resolved } };
        });
    }, [setCardData]);
    const [isHydrating, setIsHydrating] = useState(true);
    const [initialWarnings, setInitialWarnings] = useState([]);
    const [saveState, setSaveState] = useState({status: 'idle', savedAt: null, error: null});

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const loaded = await loadInitialProject();
                if (cancelled) return;
                if (loaded?.card) setCardData(loaded.card);
                if (loaded?.warnings?.length) setInitialWarnings(loaded.warnings);
            } catch (error) {
                if (!cancelled) {
                    setInitialWarnings([{
                        code: 'PROJECT_LOAD_FAILED',
                        message: `The project could not be loaded: ${error.message}`,
                    }]);
                }
            } finally {
                if (!cancelled) setIsHydrating(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const queueProjectSave = useMemo(() => debounce(async (card) => {
        setSaveState((previous) => ({...previous, status: 'saving', error: null}));
        try {
            await saveProject(card);
            setSaveState({status: 'saved', savedAt: new Date(), error: null});
        } catch (error) {
            setSaveState({status: 'error', savedAt: null, error: error.message});
        }
    }, 1000), []);

    useEffect(() => {
        if (!isHydrating) queueProjectSave(cardData);
    }, [cardData, isHydrating, queueProjectSave]);

    useEffect(() => () => {
        queueProjectSave.cancel();
    }, [queueProjectSave]);

    return(
        <CardStoreContext.Provider value={{ cardData, setCardData, patchCardData, isHydrating, initialWarnings, saveState }}>
            {children}
        </CardStoreContext.Provider>
    );
};

export default CardStoreProvider;
