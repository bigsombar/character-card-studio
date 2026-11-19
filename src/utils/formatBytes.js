const KIB = 1024;
const MIB = KIB * KIB;

/**
 * Short byte size for status lines and the portrait dialog.
 *
 * Exact bytes stay readable below one KiB; the first ten KiB keep one decimal so small edits are
 * visible; above that the value is rounded to whole KiB to keep the line compact. The MB switch
 * happens half a KiB early so rounding can never produce "1024 KB".
 *
 * @param {number} bytes
 * @returns {string}
 */
export default function formatBytes(bytes) {
    const value = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;

    if (value < KIB) return `${Math.round(value)} B`;
    if (value < 10 * KIB) return `${(value / KIB).toFixed(1)} KB`;
    if (value < MIB - KIB / 2) return `${Math.round(value / KIB)} KB`;
    return `${(value / MIB).toFixed(2)} MB`;
}
