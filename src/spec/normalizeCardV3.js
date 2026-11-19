import { SPEC_NAME, SPEC_VERSION } from './constants';
import { normalizeUnixSeconds } from './dates';

const STRING_FIELDS = [
    'description',
    'personality',
    'scenario',
    'first_mes',
    'mes_example',
    'creator_notes',
    'system_prompt',
    'post_history_instructions',
    'creator',
    'character_version',
    'nickname',
];

const ARRAY_FIELDS = ['tags', 'alternate_greetings', 'group_only_greetings'];
const POSITIONS = new Set(['before_char', 'after_char']);
const LANGUAGE_CODE = /^[a-z]{2}$/;

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pushWarning(warnings, code, message, path) {
    warnings.push({ code, message, path });
}

function coerceString(value, path, warnings, fallback = '') {
    if (typeof value === 'string') return value;
    if (value === undefined || value === null) return fallback;
    pushWarning(warnings, 'FIELD_COERCED', `${path} was not a string and was converted.`, path);
    return String(value);
}

function coerceOptionalString(value, path, warnings) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value;
    pushWarning(warnings, 'FIELD_COERCED', `${path} was not a string and was converted.`, path);
    return String(value);
}

function coerceStringArray(value, path, warnings, { optional = false } = {}) {
    if (value === undefined && optional) return undefined;
    if (!Array.isArray(value)) {
        if (value !== undefined) {
            pushWarning(warnings, 'FIELD_COERCED', `${path} was not an array and was replaced with an empty array.`, path);
        }
        return [];
    }
    return value.map((item, index) => {
        if (typeof item === 'string') return item;
        pushWarning(warnings, 'FIELD_COERCED', `${path}[${index}] was not a string and was converted.`, `${path}[${index}]`);
        return item === undefined || item === null ? '' : String(item);
    });
}

function coerceObject(value, path, warnings) {
    if (isObject(value)) return value;
    pushWarning(warnings, 'EXTENSIONS_COERCED', `${path} was not an object and was replaced with {}.`, path);
    return {};
}

function coerceOptionalBool(value, path, warnings) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    pushWarning(warnings, 'FIELD_COERCED', `${path} was not a boolean and was dropped.`, path);
    return undefined;
}

function coerceRequiredBool(value, path, warnings, fallback) {
    if (typeof value === 'boolean') return value;
    if (value !== undefined && value !== null) {
        pushWarning(warnings, 'FIELD_COERCED', `${path} was not a boolean and was replaced with ${String(fallback)}.`, path);
    }
    return fallback;
}

function coerceNumber(value, path, warnings, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            pushWarning(warnings, 'FIELD_COERCED', `${path} was a string and was converted to a number.`, path);
            return numeric;
        }
    }
    pushWarning(warnings, 'FIELD_COERCED', `${path} was not a number and was replaced with ${String(fallback)}.`, path);
    return fallback;
}

function coerceOptionalNumber(value, path, warnings) {
    return coerceNumber(value, path, warnings, undefined);
}

function normalizeSource(value, warnings) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
        pushWarning(warnings, 'SOURCE_COERCED', 'source was a string and was converted to a one-element array.', 'source');
        return [value];
    }
    if (!Array.isArray(value)) {
        pushWarning(warnings, 'SOURCE_INVALID', 'source was not an array and was dropped.', 'source');
        return undefined;
    }
    return value.map((item, index) => {
        if (typeof item === 'string') return item;
        pushWarning(warnings, 'SOURCE_COERCED', `source[${index}] was not a string and was converted.`, `source[${index}]`);
        return item === undefined || item === null ? '' : String(item);
    });
}

function normalizeMultilingualNotes(value, warnings) {
    if (value === undefined || value === null) return undefined;
    if (!isObject(value)) {
        pushWarning(warnings, 'MULTILINGUAL_INVALID', 'creator_notes_multilingual was not an object and was dropped.', 'creator_notes_multilingual');
        return undefined;
    }

    const result = {};
    for (const [rawKey, rawValue] of Object.entries(value)) {
        const code = rawKey.trim().toLowerCase();
        if (!LANGUAGE_CODE.test(code)) {
            pushWarning(
                warnings,
                'MULTILINGUAL_INVALID_CODE',
                `creator_notes_multilingual key "${rawKey}" is not an ISO 639-1 language code.`,
                `creator_notes_multilingual.${rawKey}`,
            );
        }
        if (typeof rawValue !== 'string') {
            pushWarning(
                warnings,
                'MULTILINGUAL_COERCED',
                `creator_notes_multilingual.${rawKey} was not a string and was converted.`,
                `creator_notes_multilingual.${rawKey}`,
            );
        }
        result[code] = rawValue === undefined || rawValue === null ? '' : String(rawValue);
    }
    return result;
}

function normalizeAsset(asset, index, warnings) {
    const path = `assets[${index}]`;
    if (!isObject(asset)) {
        pushWarning(warnings, 'ASSET_INVALID', `${path} was not an object and was dropped.`, path);
        return null;
    }

    const ext = coerceOptionalString(asset.ext, `${path}.ext`, warnings);
    const normalizedExt = ext === undefined ? undefined : ext.trim().replace(/^\./, '').toLowerCase();

    return {
        ...asset,
        type: coerceString(asset.type, `${path}.type`, warnings),
        uri: coerceString(asset.uri, `${path}.uri`, warnings),
        name: coerceString(asset.name, `${path}.name`, warnings),
        ext: normalizedExt ?? '',
    };
}

function normalizeAssets(value, warnings) {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value)) {
        pushWarning(warnings, 'ASSETS_INVALID', 'assets was not an array and was dropped.', 'assets');
        return undefined;
    }
    return value
        .map((asset, index) => normalizeAsset(asset, index, warnings))
        .filter((asset) => asset !== null);
}

function normalizeEntry(entry, index, warnings) {
    const path = `character_book.entries[${index}]`;
    if (!isObject(entry)) {
        pushWarning(warnings, 'ENTRY_INVALID', `${path} was not an object and was dropped.`, path);
        return null;
    }

    const position = entry.position;
    const normalizedPosition = position === undefined || position === null
        ? undefined
        : (POSITIONS.has(position) ? position : undefined);

    if (position !== undefined && position !== null && normalizedPosition === undefined) {
        pushWarning(warnings, 'POSITION_INVALID', `${path}.position must be "before_char" or "after_char".`, `${path}.position`);
    }

    const id = entry.id;
    const normalizedId = typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id))
        ? id
        : undefined;
    if (id !== undefined && id !== null && normalizedId === undefined) {
        pushWarning(warnings, 'ID_INVALID', `${path}.id must be a string or number.`, `${path}.id`);
    }

    return {
        ...entry,
        keys: coerceStringArray(entry.keys, `${path}.keys`, warnings),
        content: coerceString(entry.content, `${path}.content`, warnings),
        extensions: coerceObject(entry.extensions, `${path}.extensions`, warnings),
        enabled: coerceRequiredBool(entry.enabled, `${path}.enabled`, warnings, true),
        insertion_order: coerceNumber(entry.insertion_order, `${path}.insertion_order`, warnings, 0),
        case_sensitive: coerceOptionalBool(entry.case_sensitive, `${path}.case_sensitive`, warnings),
        use_regex: coerceRequiredBool(entry.use_regex, `${path}.use_regex`, warnings, false),
        constant: coerceOptionalBool(entry.constant, `${path}.constant`, warnings),
        name: coerceOptionalString(entry.name, `${path}.name`, warnings),
        priority: coerceOptionalNumber(entry.priority, `${path}.priority`, warnings),
        id: normalizedId,
        comment: coerceOptionalString(entry.comment, `${path}.comment`, warnings),
        selective: coerceOptionalBool(entry.selective, `${path}.selective`, warnings),
        secondary_keys: coerceStringArray(entry.secondary_keys, `${path}.secondary_keys`, warnings, { optional: true }),
        position: normalizedPosition,
    };
}

/**
 * Normalizes a lorebook (character-specific or standalone) without dropping unknown fields.
 *
 * @param {*} book
 * @param {string} [path]
 * @param {Array} [warnings]
 * @returns {Object|undefined}
 */
export function normalizeLorebook(book, path = 'character_book', warnings = []) {
    if (book === undefined || book === null) return undefined;
    if (!isObject(book)) {
        pushWarning(warnings, 'LOREBOOK_INVALID', `${path} was not an object and was dropped.`, path);
        return undefined;
    }

    let entries = [];
    if (Array.isArray(book.entries)) {
        entries = book.entries
            .map((entry, index) => normalizeEntry(entry, index, warnings))
            .filter((entry) => entry !== null);
    } else if (book.entries !== undefined) {
        pushWarning(warnings, 'ENTRIES_COERCED', `${path}.entries was not an array and was replaced with [].`, `${path}.entries`);
    }

    return {
        ...book,
        name: coerceOptionalString(book.name, `${path}.name`, warnings),
        description: coerceOptionalString(book.description, `${path}.description`, warnings),
        scan_depth: coerceOptionalNumber(book.scan_depth, `${path}.scan_depth`, warnings),
        token_budget: coerceOptionalNumber(book.token_budget, `${path}.token_budget`, warnings),
        recursive_scanning: coerceOptionalBool(book.recursive_scanning, `${path}.recursive_scanning`, warnings),
        extensions: isObject(book.extensions) ? book.extensions : {},
        entries,
    };
}

/**
 * Full V3 normalization. It is intentionally conservative: unknown fields are preserved, and
 * malformed values are coerced with warnings instead of being silently thrown away.
 *
 * @param {Object} card
 * @param {{specVersion?: string|number}} [options]
 * @returns {{ok:true, cardData:Object, warnings:Array}|{ok:false, errors:Array, warnings:Array}}
 */
export default function normalizeCardV3(card, options = {}) {
    const warnings = [];
    const errors = [];

    if (!isObject(card)) {
        return {
            ok: false,
            errors: [{ code: 'CARD_INVALID', message: 'Card must be a JSON object.' }],
            warnings,
        };
    }

    if (!isObject(card.data)) {
        return {
            ok: false,
            errors: [{ code: 'DATA_MISSING', message: 'Card is missing a "data" object.' }],
            warnings,
        };
    }

    if (typeof card.data.name !== 'string') {
        return {
            ok: false,
            errors: [{ code: 'NAME_MISSING', message: 'Card is missing a character name.' }],
            warnings,
        };
    }

    const data = { ...card.data };

    for (const field of STRING_FIELDS) {
        data[field] = coerceString(data[field], field, warnings);
    }

    for (const field of ARRAY_FIELDS) {
        data[field] = coerceStringArray(data[field], field, warnings);
    }

    data.extensions = coerceObject(data.extensions, 'extensions', warnings);
    data.source = normalizeSource(data.source, warnings);
    data.creator_notes_multilingual = normalizeMultilingualNotes(data.creator_notes_multilingual, warnings);
    data.assets = normalizeAssets(data.assets, warnings);
    data.creation_date = normalizeUnixSeconds(data.creation_date, 'creation_date', warnings);
    data.modification_date = normalizeUnixSeconds(data.modification_date, 'modification_date', warnings);
    data.character_book = normalizeLorebook(data.character_book, 'character_book', warnings);

    const specVersion = options.specVersion === undefined || options.specVersion === null
        ? SPEC_VERSION
        : String(options.specVersion);

    return {
        ok: true,
        cardData: {
            ...card,
            spec: SPEC_NAME,
            spec_version: specVersion,
            data,
        },
        warnings,
        errors,
    };
}
