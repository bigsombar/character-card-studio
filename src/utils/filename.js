/**
 * Turns a card name into a cross-platform-safe download filename.
 *
 * @param {string} name
 * @param {string} extension Extension without a leading dot
 * @returns {string}
 */
export function safeFilename(name, extension) {
    const base = String(name ?? '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, ' ')
        .slice(0, 120)
        || 'character-card-v3';
    return `${base}.${extension}`;
}

export default safeFilename;
