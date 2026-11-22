import { SPEC_NAME, SPEC_VERSION } from './constants';

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Converts a V2/legacy card into a V3-shaped object. It intentionally does not try to
 * normalize every field: normalizeCardV3 runs afterwards and fills safe defaults while
 * preserving unknown fields.
 *
 * @param {Object} card
 * @returns {{card: Object, warnings: Array<{code:string,message:string,path?:string}>}}
 */
export default function upcastV2ToV3(card) {
    const warnings = [];
    const data = isObject(card.data) ? { ...card.data } : {};

    if (!isObject(data.extensions)) data.extensions = {};

    if (data.nickname === undefined) data.nickname = '';
    if (!Array.isArray(data.group_only_greetings)) data.group_only_greetings = [];

    if (isObject(data.character_book)) {
        const book = { ...data.character_book };
        if (!isObject(book.extensions)) book.extensions = {};
        book.entries = Array.isArray(book.entries)
            ? book.entries.map((entry) => {
                if (!isObject(entry)) return entry;
                return {
                    ...entry,
                    extensions: isObject(entry.extensions) ? entry.extensions : {},
                    // V2 has no use_regex field. V3 requires it, so false is the only
                    // behavior-preserving default.
                    use_regex: typeof entry.use_regex === 'boolean' ? entry.use_regex : false,
                };
            })
            : [];
        data.character_book = book;
    }

    warnings.push({
        code: 'V2_UPCAST',
        message: 'V2 card converted to V3. V3-only fields were filled with safe defaults, and V2 export is no longer available.',
        path: 'spec',
    });

    return {
        card: {
            ...card,
            spec: SPEC_NAME,
            spec_version: SPEC_VERSION,
            data,
        },
        warnings,
    };
}
