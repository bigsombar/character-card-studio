import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import useLatestValue from './useLatestValue';

function readCaretPosition(input) {
    if (!input) return null;
    try {
        const position = input.selectionStart;
        return typeof position === 'number' ? position : null;
    } catch {
        // Number, date and other non-text inputs do not expose a text selection API.
        return null;
    }
}

/**
 * Buffered text state for controlled inputs.
 *
 * The visible draft changes on every keystroke while `onCommit` receives a stable string after
 * `delayMs`, on blur, or when the field unmounts. Keeping those two values separate avoids writing
 * to the card store on every key and keeps the caret stable during React re-renders.
 *
 * Composition events (IME, CJK input, emoji pickers) are treated as one edit: intermediate values
 * stay in the draft and only the final composition result reaches `onCommit`.
 *
 * @param {Object} options
 * @param {*} options.value Value from the card store
 * @param {React.RefObject<HTMLInputElement|HTMLTextAreaElement>} [options.inputRef]
 * @param {number} [options.delayMs] Commit delay; 0 commits immediately
 * @param {(value: *, meta: {fieldKey: *, source: string}) => void} [options.onCommit]
 * @param {Function} [options.onAfterDraftChange] Runs after the draft is painted
 * @param {string} [options.fieldKey] Included in the commit metadata
 * @returns {{
 *   cancel: Function,
 *   draft: *,
 *   flush: Function,
 *   handleChange: Function,
 *   handleCompositionEnd: Function,
 *   handleCompositionStart: Function
 * }}
 */
export default function useDebouncedFieldDraft({
    value,
    inputRef,
    delayMs = 300,
    onCommit,
    onAfterDraftChange,
    fieldKey,
}) {
    const [draft, setDraft] = useState(value);
    const latestCommit = useLatestValue(onCommit);
    const latestAfterDraftChange = useLatestValue(onAfterDraftChange);
    const latestFieldKey = useLatestValue(fieldKey);
    const latestDelay = useLatestValue(delayMs);
    const pendingValueRef = useRef(null);
    const pendingSourceRef = useRef('timer');
    const timerRef = useRef(null);
    const caretRef = useRef(null);
    const composingRef = useRef(false);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    const commitPending = useCallback((source) => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const nextValue = pendingValueRef.current;
        const resolvedSource = source ?? pendingSourceRef.current;
        pendingValueRef.current = null;
        if (nextValue === null) return;

        latestCommit.current?.(nextValue, {
            fieldKey: latestFieldKey.current,
            source: resolvedSource,
        });
    }, [latestCommit, latestFieldKey]);

    const scheduleCommit = useCallback((nextValue, source = 'timer') => {
        pendingValueRef.current = nextValue;
        pendingSourceRef.current = source;

        if (latestDelay.current > 0) {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => commitPending(), latestDelay.current);
            return;
        }

        commitPending(source);
    }, [commitPending, latestDelay]);

    const flush = useCallback((source = 'manual') => {
        commitPending(source);
    }, [commitPending]);

    const cancel = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pendingValueRef.current = null;
    }, []);

    const handleChange = useCallback((event) => {
        const nextValue = event.target.value;
        const caret = readCaretPosition(inputRef?.current);
        if (caret !== null) caretRef.current = caret;

        setDraft(nextValue);

        if (composingRef.current) {
            pendingValueRef.current = nextValue;
            return;
        }

        scheduleCommit(nextValue);
    }, [inputRef, scheduleCommit]);

    const handleCompositionStart = useCallback(() => {
        composingRef.current = true;
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleCompositionEnd = useCallback((event) => {
        composingRef.current = false;
        const nextValue = event.target.value;
        setDraft(nextValue);
        scheduleCommit(nextValue, 'composition');
    }, [scheduleCommit]);

    // Restore the caret after React paints the draft. This is synchronous with layout, so the
    // browser never shows a frame where the cursor jumps to the end of the field.
    useLayoutEffect(() => {
        const input = inputRef?.current;
        if (input && caretRef.current !== null) {
            const position = caretRef.current;
            caretRef.current = null;
            try {
                input.setSelectionRange(position, position);
            } catch {
                // Inputs without a text selection API keep their native behaviour.
            }
        }
        latestAfterDraftChange.current?.();
    }, [draft, inputRef, latestAfterDraftChange]);

    useEffect(() => () => {
        commitPending('unmount');
    }, [commitPending]);

    return {
        cancel,
        draft,
        flush,
        handleChange,
        handleCompositionEnd,
        handleCompositionStart,
    };
}
