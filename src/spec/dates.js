/** Unix timestamp helpers for CCv3 creation_date / modification_date. */

export function nowSeconds(date = new Date()) {
    return Math.floor(date.getTime() / 1000);
}

// A seconds timestamp above this value would be in the year 5138, so real-world values this large
// are milliseconds (cards from editors that follow JavaScript's Date.now() conventions).
const MILLISECONDS_THRESHOLD = 1e11;

function toSeconds(value) {
    if (value instanceof Date) {
        const time = value.getTime();
        return Number.isFinite(time) ? Math.floor(time / 1000) : undefined;
    }

    let numeric;

    if (typeof value === 'number') {
        numeric = value;
    } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return undefined;

        const asNumber = Number(trimmed);
        if (Number.isFinite(asNumber)) {
            numeric = asNumber;
        } else {
            // Imported cards sometimes carry an ISO 8601 / human-readable date instead of a
            // Unix timestamp. Accept anything the platform can parse.
            const parsed = Date.parse(trimmed);
            if (!Number.isFinite(parsed)) return undefined;
            numeric = parsed / 1000;
        }
    } else {
        return undefined;
    }

    if (!Number.isFinite(numeric) || numeric < 0) return undefined;

    // Cards occasionally store microseconds or nanoseconds too; keep dividing until the value
    // falls into the seconds range.
    while (numeric >= MILLISECONDS_THRESHOLD) numeric /= 1000;

    return Math.floor(numeric);
}

/**
 * Converts any date format found in imported cards to the Unix seconds CCv3 expects.
 *
 * Supported inputs: second timestamps, millisecond timestamps, numeric strings, ISO 8601 and
 * other strings parseable by `Date.parse`. Conversion is silent: the user sees a valid card, not
 * a formatting warning. Unusable values are dropped.
 */
export function normalizeUnixSeconds(value) {
    return toSeconds(value);
}

export function formatUnixSeconds(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unknown';
    if (value === 0) return 'Unknown (0)';
    return new Date(value * 1000).toLocaleString();
}
