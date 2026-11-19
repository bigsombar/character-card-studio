import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import imageCompression from 'browser-image-compression';

import { compressPortraitSource, readPortraitInfo } from './portraitCompression';

export const PORTRAIT_SIZE_PRESETS = [2048, 1536, 1024, 768, 512];
export const ORIGINAL_SIZE = 'original';

const INITIAL_STATE = {
    busy: false,
    error: null,
    maxSide: ORIGINAL_SIZE,
    original: null,
    result: null,
};

/**
 * Single reducer keeps the dialog state transitions atomic. Selecting a size, returning to the
 * original and finishing a compression can happen in any order; deriving the visible result from
 * `maxSide` means Apply can never point at a preview for a size the user already left.
 */
function reducer(state, action) {
    switch (action.type) {
        case 'reset':
            return INITIAL_STATE;
        case 'measured':
            return { ...state, error: null, original: action.info };
        case 'measure-failed':
            return { ...state, error: action.message, original: null, result: null };
        case 'select':
            if (action.value === null || action.value === state.maxSide) return state;
            return {
                ...state,
                busy: action.value !== ORIGINAL_SIZE,
                error: null,
                maxSide: action.value,
            };
        case 'start-compression':
            return { ...state, busy: true, error: null };
        case 'compressed':
            return { ...state, result: action.info };
        case 'compression-failed':
            return { ...state, error: action.message };
        case 'settled':
            return { ...state, busy: false };
        default:
            return state;
    }
}

/**
 * State machine for the portrait compression dialog.
 *
 * The dialog always compresses from the portrait as loaded this session, never from a previous
 * result, so switching sizes back and forth cannot stack compression losses. Every async step is
 * tagged with a request id: closing the dialog, changing the source or picking another size
 * invalidates the in-flight request so a slow result cannot overwrite a newer one.
 *
 * @param {Object} options
 * @param {boolean} options.open Whether the dialog is visible
 * @param {string} options.source Data/blob/https URL of the portrait as currently loaded
 * @returns {{
 *   busy: boolean,
 *   error: string|null,
 *   maxSide: string|number,
 *   original: Object|null,
 *   presets: number[],
 *   result: Object|null,
 *   selectSize: Function
 * }}
 */
export default function usePortraitCompression({ open, source }) {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
    const requestRef = useRef(0);

    // A different portrait means a new measurement and a fresh size choice.
    useEffect(() => {
        requestRef.current += 1;
        dispatch({ type: 'reset' });
    }, [source]);

    // Measure the source once per source/open cycle.
    useEffect(() => {
        if (!open || state.original) return undefined;
        const request = requestRef.current + 1;
        requestRef.current = request;

        readPortraitInfo(source)
            .then((info) => {
                if (request === requestRef.current) dispatch({ type: 'measured', info });
            })
            .catch(() => {
                if (request === requestRef.current) {
                    dispatch({
                        message: 'The portrait could not be opened, so its sizes are unavailable.',
                        type: 'measure-failed',
                    });
                }
            });

        return () => {
            if (request === requestRef.current) requestRef.current += 1;
        };
    }, [open, source, state.original]);

    // Produce the preview for the selected size.
    useEffect(() => {
        if (!open || !state.original || state.maxSide === ORIGINAL_SIZE) return undefined;

        const request = requestRef.current + 1;
        requestRef.current = request;
        dispatch({ type: 'start-compression' });

        (async () => {
            const compressed = await compressPortraitSource(state.original.dataUrl, state.maxSide);
            return readPortraitInfo(await imageCompression.getDataUrlFromFile(compressed));
        })()
            .then((info) => {
                if (request === requestRef.current) dispatch({ type: 'compressed', info });
            })
            .catch((compressionError) => {
                if (request === requestRef.current) {
                    dispatch({
                        message: `Portrait compression failed: ${compressionError.message}`,
                        type: 'compression-failed',
                    });
                }
            })
            .finally(() => {
                if (request === requestRef.current) dispatch({ type: 'settled' });
            });

        return () => {
            if (request === requestRef.current) requestRef.current += 1;
        };
    }, [open, state.maxSide, state.original]);

    const longestSide = state.original ? Math.max(state.original.width, state.original.height) : 0;
    const presets = useMemo(
        () => PORTRAIT_SIZE_PRESETS.filter((size) => size < longestSide),
        [longestSide],
    );

    const selectSize = useCallback((value) => {
        // ToggleButtonGroup reports null when the active button is clicked again; the reducer
        // keeps the current size in that case.
        dispatch({ type: 'select', value });
    }, []);

    return {
        busy: state.busy,
        error: state.error,
        maxSide: state.maxSide,
        original: state.original,
        presets,
        // While "Original" is selected the measured source *is* the result; keeping that derived
        // avoids a frame where Apply still points at an older compressed preview.
        result: state.maxSide === ORIGINAL_SIZE ? state.original : state.result,
        selectSize,
    };
}
