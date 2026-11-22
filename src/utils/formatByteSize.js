const KIB = 1024;
const MIB = KIB * KIB;

const BYTE_UNITS = [
    { factor: 1, label: 'B' },
    { factor: KIB, label: 'KB' },
    { factor: MIB, label: 'MB' },
];

/**
 * Compact byte size for status lines, asset cards and the portrait dialog.
 *
 * Whole bytes are used below 1 KiB. Larger values use one decimal place; if that rounding
 * would display 1024.0 in the current unit, the next larger unit is used instead.
 *
 * @param {number} bytes
 * @returns {string}
 */
export default function formatByteSize(bytes) {
    const size = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;

    let unitIndex = 0;
    if (size >= KIB) unitIndex = 1;
    if (size >= MIB) unitIndex = 2;

    let amount = size / BYTE_UNITS[unitIndex].factor;

    if (unitIndex < BYTE_UNITS.length - 1 && Number(amount.toFixed(1)) >= KIB) {
        unitIndex += 1;
        amount = size / BYTE_UNITS[unitIndex].factor;
    }

    return unitIndex === 0
        ? `${Math.round(amount)} B`
        : `${amount.toFixed(1)} ${BYTE_UNITS[unitIndex].label}`;
}
