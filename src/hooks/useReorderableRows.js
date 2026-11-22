import { useCallback, useEffect, useState } from 'react';

let nextRowNumber = 1;

function createRowKey() {
    const key = `row-${nextRowNumber}`;
    nextRowNumber += 1;
    return key;
}

/**
 * Stable row identities for list editors.
 *
 * Card data stores greetings as strings and lorebook entries with a mutable positional `id`.
 * Neither is a safe accordion key: reordering a string list or renumbering entry IDs would make
 * expansion jump to another row. This hook keeps a parallel list of opaque keys that move with
 * the rows while the card data keeps its normal CCv3 shape.
 *
 * @param {number} length Current number of rows
 * @returns {{
 *   keys: string[],
 *   addRow: Function,
 *   removeRow: Function,
 *   moveRow: Function,
 *   isExpanded: Function,
 *   setExpanded: Function,
 *   expandRow: Function,
 *   collapseAll: Function
 * }}
 */
export default function useReorderableRows(length) {
    const [keys, setKeys] = useState(() => Array.from({ length }, createRowKey));
    const [expandedKeys, setExpandedKeys] = useState(() => new Set());

    // Keep the key list aligned when a card is imported, cleared or replaced externally.
    useEffect(() => {
        setKeys((previous) => {
            if (previous.length === length) return previous;
            if (previous.length > length) return previous.slice(0, length);
            return [
                ...previous,
                ...Array.from({ length: length - previous.length }, createRowKey),
            ];
        });
    }, [length]);

    // Drop expansion state for rows that no longer exist.
    useEffect(() => {
        setExpandedKeys((previous) => {
            const available = new Set(keys);
            let changed = false;
            const next = new Set();
            for (const key of previous) {
                if (available.has(key)) next.add(key);
                else changed = true;
            }
            return changed ? next : previous;
        });
    }, [keys]);

    const addRow = useCallback(({ expand = false } = {}) => {
        const key = createRowKey();
        setKeys((previous) => [...previous, key]);
        if (expand) setExpandedKeys((previous) => new Set(previous).add(key));
        return key;
    }, []);

    const removeRow = useCallback((index) => {
        const removed = keys[index];
        setKeys((previous) => previous.filter((_key, keyIndex) => keyIndex !== index));
        if (!removed) return;
        setExpandedKeys((current) => {
            const next = new Set(current);
            next.delete(removed);
            return next;
        });
    }, [keys]);

    const moveRow = useCallback((from, to) => {
        setKeys((previous) => {
            if (from === to || from < 0 || to < 0 || from >= previous.length || to >= previous.length) {
                return previous;
            }
            const next = [...previous];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    }, []);

    const isExpanded = useCallback((index) => expandedKeys.has(keys[index]), [expandedKeys, keys]);

    const setExpanded = useCallback((index, expanded) => {
        const key = keys[index];
        if (!key) return;
        setExpandedKeys((previous) => {
            const next = new Set(previous);
            if (expanded) next.add(key);
            else next.delete(key);
            return next;
        });
    }, [keys]);

    const expandRow = useCallback((index) => {
        const key = keys[index];
        if (key) setExpandedKeys((previous) => new Set(previous).add(key));
    }, [keys]);

    const collapseAll = useCallback(() => setExpandedKeys(new Set()), []);

    return {
        addRow,
        collapseAll,
        expandRow,
        isExpanded,
        keys,
        moveRow,
        removeRow,
        setExpanded,
    };
}
