import { useEffect, useRef } from 'react';

/**
 * Keeps a ref pointed at the newest value or callback.
 *
 * Timers and subscriptions read the ref when they fire, so they never need the latest closure
 * identity and never restart just because a parent re-rendered.
 *
 * @template T
 * @param {T} value
 * @returns {import('react').MutableRefObject<T>}
 */
export default function useLatestValue(value) {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}
