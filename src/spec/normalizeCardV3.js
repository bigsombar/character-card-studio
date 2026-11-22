import { SPEC_NAME, SPEC_VERSION } from './constants';
import { normalizeUnixSeconds } from './dates';

const CARD_TEXT_KEYS = [
    'character_version',
    'creator',
    'creator_notes',
    'description',
    'first_mes',
    'mes_example',
    'nickname',
    'personality',
    'post_history_instructions',
    'scenario',
    'system_prompt',
];

const CARD_LIST_KEYS = ['tags', 'alternate_greetings', 'group_only_greetings'];
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
    pushWarning(warnings, 'FIELD_COERCED', `${path} must be text; the value was converted.`, path);
    return String(value);
}

function coerceOptionalString(value, path, warnings) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value;
    pushWarning(warnings, 'FIELD_COERCED', `${path} must be text; the value was converted.`, path);
    return String(value);
}

function coerceStringArray(value, path, warnings, { optional = false } = {}) {
    if (value === undefined && optional) return undefined;
    if (!Array.isArray(value)) {
        if (value !== undefined) {
            pushWarning(warnings, 'FIELD_COERCED', `${path} must be a list; an empty list was used instead.`, path);
        }
        return [];
    }
    return value.map((item, index) => {
        if (typeof item === 'string') return item;
        pushWarning(warnings, 'FIELD_COERCED', `${path}[${index}] must be text; the value was converted.`, `${path}[${index}]`);
        return item === undefined || item === null ? '' : String(item);
    });
}

function coerceObject(value, path, warnings) {
    if (isObject(value)) return value;
    pushWarning(warnings, 'EXTENSIONS_COERCED', `${path} must be an object; an empty object was used instead.`, path);
    return {};
}

function coerceOptionalBool(value, path, warnings) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    pushWarning(warnings, 'FIELD_COERCED', `${path} must be a boolean; the value was ignored.`, path);
    return undefined;
}

function coerceRequiredBool(value, path, warnings, fallback) {
    if (typeof value === 'boolean') return value;
    if (value !== undefined && value !== null) {
        pushWarning(warnings, 'FIELD_COERCED', `${path} must be a boolean; ${String(fallback)} was used instead.`, path);
    }
    return fallback;
}

function coerceNumber(value, path, warnings, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            pushWarning(warnings, 'FIELD_COERCED', `${path} used text for a numeric value; it was converted.`, path);
            return numeric;
        }
    }
    pushWarning(warnings, 'FIELD_COERCED', `${path} must be a number; ${String(fallback)} was used instead.`, path);
    return fallback;
}

function coerceOptionalNumber(value, path, warnings) {
    return coerceNumber(value, path, warnings, undefined);
}

function normalizeSource(value, warnings) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
        pushWarning(warnings, 'SOURCE_COERCED', 'source was text; it was wrapped in a single-item list.', 'source');
        return [value];
    }
    if (!Array.isArray(value)) {
        pushWarning(warnings, 'SOURCE_INVALID', 'source must be a list and was ignored.', 'source');
        return undefined;
    }
    return value.map((item, index) => {
        if (typeof item === 'string') return item;
        pushWarning(warnings, 'SOURCE_COERCED', `source[${index}] must be text; the value was converted.`, `source[${index}]`);
        return item === undefined || item === null ? '' : String(item);
    });
}

function normalizeMultilingualNotes(value, warnings) {
    if (value === undefined || value === null) return undefined;
    if (!isObject(value)) {
        pushWarning(warnings, 'MULTILINGUAL_INVALID', 'creator_notes_multilingual must be an object and was ignored.', 'creator_notes_multilingual');
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
                `creator_notes_multilingual.${rawKey} must be text; the value was converted.`,
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
        pushWarning(warnings, 'ASSET_INVALID', `${path} must be an object and was ignored.`, path);
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
        pushWarning(warnings, 'ASSETS_INVALID', 'assets must be a list and was ignored.', 'assets');
        return undefined;
    }
    return value
        .map((asset, index) => normalizeAsset(asset, index, warnings))
        .filter((asset) => asset !== null);
}

function normalizeEntry(entry, index, warnings) {
    const path = `character_book.entries[${index}]`;
    if (!isObject(entry)) {
        pushWarning(warnings, 'ENTRY_INVALID', `${path} must be an object and was ignored.`, path);
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
export function normalizeCharacterBook(book, path = 'character_book', warnings = []) {
    if (book === undefined || book === null) return undefined;
    if (!isObject(book)) {
        pushWarning(warnings, 'LOREBOOK_INVALID', `${path} must be an object and was ignored.`, path);
        return undefined;
    }

    let entries = [];
    if (Array.isArray(book.entries)) {
        entries = book.entries
            .map((entry, index) => normalizeEntry(entry, index, warnings))
            .filter((entry) => entry !== null);
    } else if (book.entries !== undefined) {
        pushWarning(warnings, 'ENTRIES_COERCED', `${path}.entries must be a list; an empty list was used instead.`, `${path}.entries`);
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
 * Normalizes the editor's V3 card shape.
 *
 * Unknown fields survive the pass untouched. Values with the wrong runtime type are either
 * converted or replaced with a safe default, and every such decision is reported in `warnings` so
 * the import surface can show what changed.
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
            errors: [{ code: 'CARD_INVALID', message: 'The card value must be a JSON object.' }],
            warnings,
        };
    }

    if (!isObject(card.data)) {
        return {
            ok: false,
            errors: [{ code: 'DATA_MISSING', message: 'The card has no data object.' }],
            warnings,
        };
    }

    if (typeof card.data.name !== 'string') {
        return {
            ok: false,
            errors: [{ code: 'NAME_MISSING', message: 'The card does not define a name.' }],
            warnings,
        };
    }

    const data = { ...card.data };

    for (const field of CARD_TEXT_KEYS) {
        data[field] = coerceString(data[field], field, warnings);
    }

    for (const field of CARD_LIST_KEYS) {
        data[field] = coerceStringArray(data[field], field, warnings);
    }

    data.extensions = coerceObject(data.extensions, 'extensions', warnings);
    data.source = normalizeSource(data.source, warnings);
    data.creator_notes_multilingual = normalizeMultilingualNotes(data.creator_notes_multilingual, warnings);
    data.assets = normalizeAssets(data.assets, warnings);
    data.creation_date = normalizeUnixSeconds(data.creation_date, 'creation_date', warnings);
    data.modification_date = normalizeUnixSeconds(data.modification_date, 'modification_date', warnings);
    data.character_book = normalizeCharacterBook(data.character_book, 'character_book', warnings);

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
