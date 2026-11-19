import { SPEC_NAME, SPEC_VERSION_NUMBER } from './constants';

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function addError(errors, code, message, path) {
    errors.push({ code, message, path });
}

function addWarning(warnings, code, message, path) {
    warnings.push({ code, message, path });
}

function validateEntry(entry, index, errors, warnings) {
    const path = `character_book.entries[${index}]`;
    if (!isObject(entry)) {
        addError(errors, 'ENTRY_INVALID', `${path} must be an object.`, path);
        return;
    }

    if (!isStringArray(entry.keys)) addError(errors, 'KEYS_INVALID', `${path}.keys must be an array of strings.`, `${path}.keys`);
    if (typeof entry.content !== 'string') addError(errors, 'CONTENT_INVALID', `${path}.content must be a string.`, `${path}.content`);
    if (typeof entry.enabled !== 'boolean') addError(errors, 'ENABLED_INVALID', `${path}.enabled must be a boolean.`, `${path}.enabled`);
    if (typeof entry.insertion_order !== 'number' || !Number.isFinite(entry.insertion_order)) {
        addError(errors, 'INSERTION_ORDER_INVALID', `${path}.insertion_order must be a number.`, `${path}.insertion_order`);
    }
    if (typeof entry.use_regex !== 'boolean') addError(errors, 'USE_REGEX_INVALID', `${path}.use_regex must be a boolean.`, `${path}.use_regex`);
    if (!isObject(entry.extensions)) addError(errors, 'ENTRY_EXTENSIONS_INVALID', `${path}.extensions must be an object.`, `${path}.extensions`);

    if (entry.case_sensitive !== undefined && typeof entry.case_sensitive !== 'boolean') {
        addError(errors, 'CASE_SENSITIVE_INVALID', `${path}.case_sensitive must be a boolean or undefined.`, `${path}.case_sensitive`);
    }
    if (entry.constant !== undefined && typeof entry.constant !== 'boolean') {
        addError(errors, 'CONSTANT_INVALID', `${path}.constant must be a boolean or undefined.`, `${path}.constant`);
    }
    if (entry.selective !== undefined && typeof entry.selective !== 'boolean') {
        addError(errors, 'SELECTIVE_INVALID', `${path}.selective must be a boolean or undefined.`, `${path}.selective`);
    }
    if (entry.secondary_keys !== undefined && !isStringArray(entry.secondary_keys)) {
        addError(errors, 'SECONDARY_KEYS_INVALID', `${path}.secondary_keys must be an array of strings or undefined.`, `${path}.secondary_keys`);
    }
    if (entry.name !== undefined && typeof entry.name !== 'string') {
        addError(errors, 'ENTRY_NAME_INVALID', `${path}.name must be a string or undefined.`, `${path}.name`);
    }
    if (entry.comment !== undefined && typeof entry.comment !== 'string') {
        addError(errors, 'ENTRY_COMMENT_INVALID', `${path}.comment must be a string or undefined.`, `${path}.comment`);
    }
    if (entry.id !== undefined && typeof entry.id !== 'string' && !(typeof entry.id === 'number' && Number.isFinite(entry.id))) {
        addError(errors, 'ENTRY_ID_INVALID', `${path}.id must be a string, number, or undefined.`, `${path}.id`);
    }
    if (entry.priority !== undefined && (typeof entry.priority !== 'number' || !Number.isFinite(entry.priority))) {
        addError(errors, 'ENTRY_PRIORITY_INVALID', `${path}.priority must be a number or undefined.`, `${path}.priority`);
    }
    if (entry.position !== undefined && entry.position !== 'before_char' && entry.position !== 'after_char') {
        addError(errors, 'ENTRY_POSITION_INVALID', `${path}.position must be "before_char", "after_char", or undefined.`, `${path}.position`);
    }

    if (entry.use_regex) {
        for (const [keyIndex, key] of entry.keys.entries()) {
            try {
                // Validation only; the editor does not execute regex matching.
                new RegExp(key);
            } catch {
                addWarning(warnings, 'REGEX_INVALID', `${path}.keys[${keyIndex}] is not a valid regular expression.`, `${path}.keys[${keyIndex}]`);
            }
        }
    }
}

function validateLorebook(book, errors, warnings) {
    if (book === undefined) return;
    if (!isObject(book)) {
        addError(errors, 'LOREBOOK_INVALID', 'character_book must be an object or undefined.', 'character_book');
        return;
    }

    if (book.name !== undefined && typeof book.name !== 'string') addError(errors, 'LOREBOOK_NAME_INVALID', 'character_book.name must be a string or undefined.', 'character_book.name');
    if (book.description !== undefined && typeof book.description !== 'string') addError(errors, 'LOREBOOK_DESCRIPTION_INVALID', 'character_book.description must be a string or undefined.', 'character_book.description');
    if (book.scan_depth !== undefined && (typeof book.scan_depth !== 'number' || !Number.isFinite(book.scan_depth))) addError(errors, 'SCAN_DEPTH_INVALID', 'character_book.scan_depth must be a number or undefined.', 'character_book.scan_depth');
    if (book.token_budget !== undefined && (typeof book.token_budget !== 'number' || !Number.isFinite(book.token_budget))) addError(errors, 'TOKEN_BUDGET_INVALID', 'character_book.token_budget must be a number or undefined.', 'character_book.token_budget');
    if (book.recursive_scanning !== undefined && typeof book.recursive_scanning !== 'boolean') addError(errors, 'RECURSIVE_SCANNING_INVALID', 'character_book.recursive_scanning must be a boolean or undefined.', 'character_book.recursive_scanning');
    if (!isObject(book.extensions)) addError(errors, 'LOREBOOK_EXTENSIONS_INVALID', 'character_book.extensions must be an object.', 'character_book.extensions');
    if (!Array.isArray(book.entries)) {
        addError(errors, 'ENTRIES_INVALID', 'character_book.entries must be an array.', 'character_book.entries');
        return;
    }

    book.entries.forEach((entry, index) => validateEntry(entry, index, errors, warnings));
}

const KNOWN_ASSET_TYPES = new Set(['icon', 'background', 'emotion', 'user_icon', 'other']);

function validateAssets(assets, errors, warnings) {
    if (assets === undefined) return;
    if (!Array.isArray(assets)) {
        addError(errors, 'ASSETS_INVALID', 'assets must be an array or undefined.', 'assets');
        return;
    }

    const icons = [];
    const backgrounds = [];

    assets.forEach((asset, index) => {
        const path = `assets[${index}]`;
        if (!isObject(asset)) {
            addError(errors, 'ASSET_INVALID', `${path} must be an object.`, path);
            return;
        }

        for (const field of ['type', 'uri', 'name', 'ext']) {
            if (typeof asset[field] !== 'string') {
                addError(errors, 'ASSET_FIELD_INVALID', `${path}.${field} must be a string.`, `${path}.${field}`);
            }
        }

        if (typeof asset.ext === 'string' && asset.ext !== 'unknown' && asset.ext !== asset.ext.toLowerCase()) {
            addError(errors, 'ASSET_EXT_CASE', `${path}.ext must be lowercase.`, `${path}.ext`);
        }
        if (typeof asset.ext === 'string' && asset.ext.includes('.')) {
            addError(errors, 'ASSET_EXT_DOT', `${path}.ext must not include a dot.`, `${path}.ext`);
        }
        if (typeof asset.type === 'string'
            && asset.type !== ''
            && !KNOWN_ASSET_TYPES.has(asset.type)
            && !asset.type.startsWith('x_')) {
            addWarning(warnings, 'ASSET_TYPE_CUSTOM', `${path}.type is custom and should use the "x_" prefix.`, `${path}.type`);
        }

        if (asset.type === 'icon') icons.push({ asset, path });
        if (asset.type === 'background') backgrounds.push({ asset, path });

        if (asset.uri === 'ccdefault:') return;

        const supported = /^(png|jpe?g|webp|avif|gif|mp3|wav|ogg|mp4|webm)$/i;
        if (typeof asset.ext === 'string' && asset.ext !== 'unknown' && !supported.test(asset.ext)) {
            addWarning(warnings, 'ASSET_EXT_UNSUPPORTED', `${path}.ext (${asset.ext}) is not one of the currently previewable formats.`, `${path}.ext`);
        }
        if (typeof asset.uri === 'string' && /^http:\/\//i.test(asset.uri)) {
            addWarning(warnings, 'ASSET_HTTP', `${path}.uri uses insecure HTTP. The editor may ignore it.`, `${path}.uri`);
        }
    });

    if (icons.length > 1) {
        const mainIcons = icons.filter(({ asset }) => asset.name === 'main');
        if (mainIcons.length !== 1) {
            addError(errors, 'ICON_MAIN_INVALID', `When there are multiple icon assets, exactly one must be named "main" (found ${mainIcons.length}).`, 'assets');
        }
    }

    const mainBackgrounds = backgrounds.filter(({ asset }) => asset.name === 'main');
    if (mainBackgrounds.length > 1) {
        addError(errors, 'BACKGROUND_MAIN_INVALID', 'There must be at most one background asset named "main".', 'assets');
    }
}

/**
 * Validates a normalized V3 card against structural MUST rules. Content-level SHOULD issues are
 * returned as warnings so the editor can still export after confirmation.
 *
 * @param {Object} card
 * @returns {{ok:boolean, errors:Array, warnings:Array}}
 */
export default function validateCardV3(card) {
    const errors = [];
    const warnings = [];

    if (!isObject(card)) {
        addError(errors, 'CARD_INVALID', 'Card must be a JSON object.', '');
        return { ok: false, errors, warnings };
    }

    if (card.spec !== SPEC_NAME) addError(errors, 'SPEC_INVALID', `spec must be "${SPEC_NAME}".`, 'spec');
    if (typeof card.spec_version !== 'string') {
        addError(errors, 'SPEC_VERSION_INVALID', 'spec_version must be a string.', 'spec_version');
    } else {
        const version = Number.parseFloat(card.spec_version);
        if (!Number.isFinite(version)) {
            addError(errors, 'SPEC_VERSION_INVALID', 'spec_version must be a parsable number.', 'spec_version');
        } else if (version > SPEC_VERSION_NUMBER) {
            addWarning(warnings, 'SPEC_VERSION_NEWER', `Card uses newer spec_version ${card.spec_version}; only 3.0 features are understood.`, 'spec_version');
        }
    }

    if (!isObject(card.data)) {
        addError(errors, 'DATA_INVALID', 'Card must contain a data object.', 'data');
        return { ok: false, errors, warnings };
    }

    const data = card.data;
    if (typeof data.name !== 'string') addError(errors, 'NAME_INVALID', 'data.name must be a string.', 'data.name');

    for (const field of [
        'description', 'personality', 'scenario', 'first_mes', 'mes_example', 'creator_notes',
        'system_prompt', 'post_history_instructions', 'creator', 'character_version', 'nickname',
    ]) {
        if (typeof data[field] !== 'string') addError(errors, 'STRING_FIELD_INVALID', `data.${field} must be a string.`, `data.${field}`);
    }

    for (const field of ['tags', 'alternate_greetings', 'group_only_greetings']) {
        if (!isStringArray(data[field])) addError(errors, 'ARRAY_FIELD_INVALID', `data.${field} must be an array of strings.`, `data.${field}`);
    }

    if (!isObject(data.extensions)) addError(errors, 'EXTENSIONS_INVALID', 'data.extensions must be an object.', 'data.extensions');

    if (data.source !== undefined && !isStringArray(data.source)) {
        addError(errors, 'SOURCE_INVALID', 'data.source must be an array of strings or undefined.', 'data.source');
    }

    if (data.creator_notes_multilingual !== undefined) {
        if (!isObject(data.creator_notes_multilingual)) {
            addError(errors, 'MULTILINGUAL_INVALID', 'creator_notes_multilingual must be an object or undefined.', 'data.creator_notes_multilingual');
        } else {
            for (const [code, text] of Object.entries(data.creator_notes_multilingual)) {
                if (!/^[a-z]{2}$/.test(code)) {
                    addWarning(warnings, 'MULTILINGUAL_CODE_INVALID', `creator_notes_multilingual key "${code}" is not a lowercase ISO 639-1 code.`, `data.creator_notes_multilingual.${code}`);
                }
                if (typeof text !== 'string') {
                    addError(errors, 'MULTILINGUAL_TEXT_INVALID', `creator_notes_multilingual.${code} must be a string.`, `data.creator_notes_multilingual.${code}`);
                }
            }
        }
    }

    for (const field of ['creation_date', 'modification_date']) {
        if (data[field] !== undefined && (typeof data[field] !== 'number' || !Number.isFinite(data[field]))) {
            addError(errors, 'DATE_INVALID', `data.${field} must be a number or undefined.`, `data.${field}`);
        }
    }

    validateAssets(data.assets, errors, warnings);
    validateLorebook(data.character_book, errors, warnings);

    return { ok: errors.length === 0, errors, warnings };
}
