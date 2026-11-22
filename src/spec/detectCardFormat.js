import { SPEC_NAME, SPEC_VERSION, SPEC_VERSION_NUMBER } from './constants';

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResult(warnings, error) {
    return { kind: 'invalid', warnings, error };
}

function readSpecVersion(raw) {
    const parsed = typeof raw === 'number' ? raw : Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function specVersionWarnings(version, raw, warnings) {
    if (version === null) {
        warnings.push({
            code: 'SPEC_VERSION_INVALID',
            message: `The card declares an unreadable spec_version ("${String(raw)}"). Export will use 3.0.`,
            path: 'spec_version',
        });
        return;
    }

    if (version > SPEC_VERSION_NUMBER) {
        warnings.push({
            code: 'SPEC_VERSION_NEWER',
            message: `This card declares CCv3 spec ${raw}. The editor targets 3.0; unknown fields and the declared version are kept.`,
            path: 'spec_version',
        });
        return;
    }

    if (version < SPEC_VERSION_NUMBER) {
        warnings.push({
            code: 'SPEC_VERSION_OLDER',
            message: `This card declares an older CCv3 spec (${raw}). Safe defaults will fill missing fields.`,
            path: 'spec_version',
        });
    }
}

/**
 * Identifies the shape of an imported card.
 *
 * The editor stores V3 cards only, while imports may also be V2, legacy or standalone
 * lorebooks. The returned `kind` tells the import pipeline which conversion to apply.
 *
 * @param {*} input Parsed JSON value from a file
 * @returns {{
 *   kind: 'v3'|'v2'|'legacy-v2'|'lorebook'|'invalid',
 *   card?: Object,
 *   specVersion?: number|null,
 *   rawSpecVersion?: string|number|undefined,
 *   warnings: Array<{code:string,message:string,path?:string}>,
 *   error?: string
 * }}
 */
export default function detectCardFormat(input) {
    const warnings = [];

    if (!isObject(input)) {
        return invalidResult(warnings, 'Cannot read this file: a character card must be a JSON object.');
    }

    if (input.spec === 'lorebook_v3') {
        return {
            kind: 'lorebook',
            card: input,
            warnings,
            error: 'This is a lorebook file, not a character card.',
        };
    }

    if (!isObject(input.data)) {
        return invalidResult(warnings, 'Cannot read this file: the card has no data object.');
    }

    if (typeof input.data.name !== 'string') {
        return invalidResult(warnings, 'Cannot read this file: the card does not define a name.');
    }

    if (input.spec === SPEC_NAME) {
        const rawSpecVersion = input.spec_version;
        const specVersion = readSpecVersion(rawSpecVersion);
        specVersionWarnings(specVersion, rawSpecVersion, warnings);

        return {
            kind: 'v3',
            card: input,
            specVersion,
            rawSpecVersion,
            warnings,
        };
    }

    if (input.spec === 'chara_card_v2') {
        warnings.push({
            code: 'V2_CARD',
            message: 'This card is Character Card V2. Import converts it to V3; V2 export is not supported.',
            path: 'spec',
        });
        return {
            kind: 'v2',
            card: input,
            rawSpecVersion: input.spec_version,
            warnings,
        };
    }

    warnings.push({
        code: 'LEGACY_CARD',
        message: `Unrecognized card spec ("${String(input.spec)}"). It will be handled as a legacy V2 card and converted to V3.`,
        path: 'spec',
    });
    return {
        kind: 'legacy-v2',
        card: input,
        rawSpecVersion: input.spec_version,
        warnings,
    };
}

export { SPEC_NAME, SPEC_VERSION };
