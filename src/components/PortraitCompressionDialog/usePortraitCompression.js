import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import imageCompression from 'browser-image-compression';

import { compressPortraitToTarget, readPortraitInfo } from './portraitCompression';

export const PORTRAIT_MP_PRESETS = [2, 1.5, 1, 0.5];
export const ORIGINAL_TARGET = 'original';

const INITIAL_STATE = {
    busy: false,
    error: null,
    original: null,
    result: null,
    target: ORIGINAL_TARGET,
};

/**
 * Single reducer keeps the dialog state transitions atomic. Selecting a target, returning to the
 * original and finishing a resize can happen in any order; deriving the visible result from
 * `target` means Apply can never point at a preview for a size the user already left.
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
            if (action.value === null || action.value === state.target) return state;
            return {
                ...state,
                busy: action.value !== ORIGINAL_TARGET,
                error: null,
                result: null,
                target: action.value,
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
 * The dialog always resizes from the portrait as loaded this session, never from a previous
 * result, so switching targets back and forth cannot stack compression losses. Every async step is
 * tagged with a request id: closing the dialog, changing the source or picking another target
 * invalidates the in-flight request so a slow result cannot overwrite a newer one.
 *
 * @param {Object} options
 * @param {boolean} options.open Whether the dialog is visible
 * @param {string} options.source Data/blob/https URL of the portrait as currently loaded
 * @returns {{
 *   busy: boolean,
 *   error: string|null,
 *   original: Object|null,
 *   presets: number[],
 *   result: Object|null,
 *   selectTarget: Function,
 *   target: string|number
 * }}
 */
export default function usePortraitCompression({ open, source }) {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
    const requestRef = useRef(0);

    // A different portrait means a new measurement and a fresh target choice.
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

    // Produce the preview for the selected megapixel target.
    useEffect(() => {
        if (!open || !state.original || state.target === ORIGINAL_TARGET) return undefined;

        const request = requestRef.current + 1;
        requestRef.current = request;
        dispatch({ type: 'start-compression' });

        (async () => {
            const compressed = await compressPortraitToTarget(state.original.dataUrl, state.target);
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
    }, [open, state.target, state.original]);

    const sourcePixels = state.original ? state.original.width * state.original.height : 0;
    const presets = useMemo(
        () => PORTRAIT_MP_PRESETS.filter((megapixels) => megapixels * 1_000_000 < sourcePixels),
        [sourcePixels],
    );

    const selectTarget = useCallback((value) => {
        // ToggleButtonGroup reports null when the active button is clicked again; the reducer
        // keeps the current target in that case.
        dispatch({ type: 'select', value });
    }, []);

    return {
        busy: state.busy,
        error: state.error,
        original: state.original,
        presets,
        // While "Original" is selected the measured source *is* the result; keeping that derived
        // avoids a frame where Apply still points at an older resized preview.
        result: state.target === ORIGINAL_TARGET ? state.original : state.result,
        selectTarget,
        target: state.target,
    };
}
