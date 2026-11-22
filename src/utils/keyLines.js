/**
 * Keys are edited one per line so a regex key may contain commas without being split into
 * multiple keys. Blank lines are ignored.
 */
export function parseKeyLines(value) {
    return String(value ?? '')
        .split(/\r?\n/)
        .map((key) => key.trim())
        .filter(Boolean);
}

export function formatKeyLines(keys) {
    return (Array.isArray(keys) ? keys : []).join('\n');
}
