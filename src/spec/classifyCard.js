import { SPEC_NAME, SPEC_VERSION, SPEC_VERSION_NUMBER } from './constants';

/**
 * Determines what kind of card a parsed JSON object is.
 * The editor only ever stores V3, but it must understand V2 and future V3 versions on input.
 *
 * @param {*} parsed
 * @returns {{
 *   kind: 'v3'|'v2'|'legacy-v2'|'lorebook'|'invalid',
 *   card?: Object,
 *   specVersion?: number|null,
 *   rawSpecVersion?: string|number|undefined,
 *   warnings: Array<{code:string,message:string,path?:string}>,
 *   error?: string
 * }}
 */
export default function classifyCard(parsed) {
    const warnings = [];

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {
            kind: 'invalid',
            warnings,
            error: 'File does not contain a valid card: expected a JSON object.',
        };
    }

    if (parsed.spec === 'lorebook_v3') {
        return {
            kind: 'lorebook',
            card: parsed,
            warnings,
            error: 'Uploaded file was a lorebook, not a card.',
        };
    }

    if (typeof parsed.data !== 'object' || parsed.data === null || Array.isArray(parsed.data)) {
        return {
            kind: 'invalid',
            warnings,
            error: 'File does not contain a valid card: missing a "data" object.',
        };
    }

    if (typeof parsed.data.name !== 'string') {
        return {
            kind: 'invalid',
            warnings,
            error: 'File does not contain a valid card: missing a character name.',
        };
    }

    if (parsed.spec === SPEC_NAME) {
        const rawSpecVersion = parsed.spec_version;
        const specVersion = typeof rawSpecVersion === 'number'
            ? rawSpecVersion
            : Number.parseFloat(rawSpecVersion);

        if (!Number.isFinite(specVersion)) {
            warnings.push({
                code: 'SPEC_VERSION_INVALID',
                message: `spec_version is not a valid number ("${String(rawSpecVersion)}"). The editor will export 3.0.`,
                path: 'spec_version',
            });
        } else if (specVersion > SPEC_VERSION_NUMBER) {
            warnings.push({
                code: 'SPEC_VERSION_NEWER',
                message: `This card uses CCv3 spec ${rawSpecVersion}. The editor understands 3.0 and will preserve unknown fields and the original version.`,
                path: 'spec_version',
            });
        } else if (specVersion < SPEC_VERSION_NUMBER) {
            warnings.push({
                code: 'SPEC_VERSION_OLDER',
                message: `This card uses an older CCv3 spec (${rawSpecVersion}). Missing fields will be filled with safe defaults.`,
                path: 'spec_version',
            });
        }

        return {
            kind: 'v3',
            card: parsed,
            specVersion: Number.isFinite(specVersion) ? specVersion : null,
            rawSpecVersion,
            warnings,
        };
    }

    if (parsed.spec === 'chara_card_v2') {
        warnings.push({
            code: 'V2_CARD',
            message: 'This is a Character Card V2. It will be converted to V3 on import; V2 export is no longer supported.',
            path: 'spec',
        });
        return {
            kind: 'v2',
            card: parsed,
            rawSpecVersion: parsed.spec_version,
            warnings,
        };
    }

    warnings.push({
        code: 'LEGACY_CARD',
        message: `Unknown or missing spec ("${String(parsed.spec)}"). The card will be treated as a legacy V2 card and converted to V3.`,
        path: 'spec',
    });
    return {
        kind: 'legacy-v2',
        card: parsed,
        rawSpecVersion: parsed.spec_version,
        warnings,
    };
}

export { SPEC_NAME, SPEC_VERSION };
