import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import imageCompression from 'browser-image-compression';

import { MP_PRESETS, shrinksAt } from '../../utils/imageSizing';
import { resizePortraitToTarget, inspectPortrait } from './portraitResize';

export const PORTRAIT_MP_PRESETS = MP_PRESETS;
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
                // Keep the previous preview while the new size is being produced. The Apply button
                // is disabled by `busy`, and replacing the image with a spinner would make the
                // dialog flash on every target change.
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
 * State machine for the portrait resize dialog.
 *
 * Each preview is produced from the portrait loaded in this session, never from the previous
 * preview, so changing targets cannot stack re-encode losses. Async work carries a request id:
 * closing the dialog, replacing the portrait or choosing another target invalidates earlier work
 * before it can overwrite newer state.
 *
 * @param {Object} options
 * @param {boolean} options.open Whether the dialog is visible
 * @param {string} options.source Data/blob/https URL of the portrait as currently loaded
 * @returns {{
 *   isWorking: boolean,
 *   error: string|null,
 *   original: Object|null,
 *   targets: number[],
 *   preview: Object|null,
 *   savedBytes: number,
 *   selectedTarget: string|number,
 *   chooseTarget: Function
 * }}
 */
export default function usePortraitResize({ open, source }) {
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

        inspectPortrait(source)
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
            const compressed = await resizePortraitToTarget(state.original.dataUrl, state.target);
            return inspectPortrait(await imageCompression.getDataUrlFromFile(compressed));
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

    // Compare the already-rounded dimensions: a target close to the source area can snap back
    // to the same 16 px grid, and offering it would suggest a resize that changes nothing.
    const targets = useMemo(() => {
        if (!state.original) return [];
        return PORTRAIT_MP_PRESETS.filter((megapixels) => (
            shrinksAt(state.original.width, state.original.height, megapixels)
        ));
    }, [state.original]);

    const chooseTarget = useCallback((value) => {
        // ToggleButtonGroup reports null when the active button is clicked again; the reducer
        // keeps the current target in that case.
        dispatch({ type: 'select', value });
    }, []);

    const preview = state.target === ORIGINAL_TARGET ? state.original : state.result;
    const savedBytes = state.original && preview && preview.bytes < state.original.bytes
        ? state.original.bytes - preview.bytes
        : 0;

    return {
        chooseTarget,
        error: state.error,
        isWorking: state.busy,
        original: state.original,
        preview,
        savedBytes,
        selectedTarget: state.target,
        targets,
    };
}
