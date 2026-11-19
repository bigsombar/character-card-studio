import { useCallback, useEffect, useRef, useState } from 'react';

import useLatestValue from './useLatestValue';

/**
 * Draft state plus a debounced commit for controlled text fields.
 *
 * A controlled MUI input fed directly from a debounced model value jumps the caret to the end on
 * every keystroke, because the rendered value lags behind the DOM value. This hook keeps a local
 * draft that updates immediately, commits the latest change after `delayMs`, and restores the caret
 * after React has rendered the draft. The callback is read through a ref so parent re-renders do
 * not recreate the pending timer and cancel an in-flight edit.
 *
 * @param {Object} options
 * @param {string} options.value Model value from card state
 * @param {React.RefObject<HTMLInputElement|HTMLTextAreaElement>} options.inputRef Element to restore the caret in
 * @param {number} [options.delayMs] Debounce delay; 0 commits synchronously
 * @param {Function} options.onChange Receives the original change event when the draft is committed
 * @param {Function} [options.onAfterDraftChange] Runs after the draft render (used to sync overlays)
 * @param {boolean} [options.preserveCursor] Restore selection after each change; must be false for
 * inputs whose type does not support text selection (e.g. type="number")
 * @returns {{draft: *, handleChange: Function, flush: Function, cancel: Function}}
 */
export default function useDebouncedFieldDraft({
    value,
    inputRef,
    delayMs = 300,
    onChange,
    onAfterDraftChange,
    preserveCursor = true,
}) {
    const [draft, setDraft] = useState(value);
    const onChangeRef = useLatestValue(onChange);
    const afterDraftRef = useLatestValue(onAfterDraftChange);
    const delayRef = useLatestValue(delayMs);
    const pendingEventRef = useRef(null);
    const timerRef = useRef(null);

    // Import, undo, normalization and sibling edits all arrive as a new model value. Adopt it so
    // the field never shows stale text, while a pending debounce keeps the user's latest keystroke.
    useEffect(() => {
        setDraft(value);
    }, [value]);

    const commitPending = useCallback(() => {
        timerRef.current = null;
        const event = pendingEventRef.current;
        pendingEventRef.current = null;
        if (event) onChangeRef.current?.(event);
    }, [onChangeRef]);

    const flush = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }
        commitPending();
    }, [commitPending]);

    const cancel = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pendingEventRef.current = null;
    }, []);

    const handleChange = useCallback((event) => {
        const nextValue = event.target.value;
        const cursor = preserveCursor && inputRef?.current ? inputRef.current.selectionStart : null;

        setDraft(nextValue);

        // Wait for the draft render before touching selection: on a controlled textarea React may
        // otherwise restart the caret from the DOM value while it is still the previous one.
        setTimeout(() => {
            const input = inputRef?.current;
            if (input && cursor !== null) {
                input.setSelectionRange(cursor, cursor);
            }
            afterDraftRef.current?.();
        }, 0);

        if (delayRef.current > 0) {
            pendingEventRef.current = event;
            if (timerRef.current !== null) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(commitPending, delayRef.current);
            return;
        }

        onChangeRef.current?.(event);
    }, [afterDraftRef, commitPending, delayRef, inputRef, onChangeRef, preserveCursor]);

    // Do not drop the last keystrokes when the user switches sections immediately after typing.
    useEffect(() => () => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            const event = pendingEventRef.current;
            pendingEventRef.current = null;
            if (event) onChangeRef.current?.(event);
        }
    }, [onChangeRef]);

    return { cancel, draft, flush, handleChange };
}
