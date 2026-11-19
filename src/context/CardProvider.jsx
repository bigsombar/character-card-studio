import { useEffect, useMemo, useState } from 'react';
import debounce from 'lodash.debounce';

import { CardContext } from './cardContext';
import { createNewCard } from '../spec/cardPrototype';
import loadInitialProject from '../storage/loadInitialProject';
import { saveProject } from '../storage/projectStore';

export const CardProvider = ({children}) => {
    const [cardData, setCardData] = useState(createNewCard);
    const [isHydrating, setIsHydrating] = useState(true);
    const [initialWarnings, setInitialWarnings] = useState([]);
    const [saveState, setSaveState] = useState({status: 'idle', lastSavedAt: null, error: null});

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

    const debouncedSave = useMemo(() => debounce(async (card) => {
        setSaveState((previous) => ({...previous, status: 'saving', error: null}));
        try {
            await saveProject(card);
            setSaveState({status: 'saved', lastSavedAt: new Date(), error: null});
        } catch (error) {
            setSaveState({status: 'error', lastSavedAt: null, error: error.message});
        }
    }, 1000), []);

    useEffect(() => {
        if (!isHydrating) debouncedSave(cardData);
    }, [cardData, isHydrating, debouncedSave]);

    useEffect(() => () => {
        debouncedSave.cancel();
    }, [debouncedSave]);

    return(
        <CardContext.Provider value={{ cardData, setCardData, isHydrating, initialWarnings, saveState }}>
            {children}
        </CardContext.Provider>
    );
};

export default CardProvider;
