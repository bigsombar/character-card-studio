import detectCardFormat from '../spec/detectCardFormat';
import { SPEC_VERSION, SPEC_VERSION_NUMBER } from '../spec/constants';
import normalizeCardV3, { normalizeCharacterBook } from '../spec/normalizeCardV3';
import upcastV2ToV3 from '../spec/upcastV2';

export { normalizeCharacterBook };

function toErrorResult(classification) {
    const errors = [{ code: 'IMPORT_INVALID', message: classification.error ?? 'The file cannot be read as a character card.' }];
    return {
        ok: false,
        error: classification.error ?? 'The file cannot be read as a character card.',
        errors,
        warnings: classification.warnings ?? [],
    };
}

/**
 * Runs the import pipeline for a parsed JSON value.
 *
 * Detects the input shape, upcasts V2 or legacy documents, then normalizes the result into the
 * single V3 shape used by the editor. The source version is reported in `source` so callers can
 * explain where the card came from. V2 is never produced by this function.
 *
 * @param {*} parsedJson
 * @returns {{
 *   ok: boolean,
 *   cardData?: Object,
 *   error?: string,
 *   errors: Array,
 *   warnings: Array,
 *   source?: {kind:string, specVersion:number|null}
 * }}
 */
export default function normalizeImportedCard(parsedJson) {
    const classification = detectCardFormat(parsedJson);

    if (classification.kind === 'invalid' || classification.kind === 'lorebook') {
        return toErrorResult(classification);
    }

    let card = classification.card;
    const warnings = [...classification.warnings];

    if (classification.kind === 'v2' || classification.kind === 'legacy-v2') {
        const upcast = upcastV2ToV3(card);
        card = upcast.card;
        warnings.push(...upcast.warnings);
    }

    const preserveNewerVersion = classification.kind === 'v3'
        && typeof classification.specVersion === 'number'
        && classification.specVersion > SPEC_VERSION_NUMBER;

    const specVersion = preserveNewerVersion
        ? (classification.rawSpecVersion ?? String(classification.specVersion))
        : SPEC_VERSION;

    const normalized = normalizeCardV3(card, { specVersion });
    warnings.push(...(normalized.warnings ?? []));

    if (!normalized.ok) {
        return {
            ok: false,
            error: normalized.errors?.[0]?.message ?? 'Card could not be normalized.',
            errors: normalized.errors ?? [],
            warnings,
        };
    }

    return {
        ok: true,
        cardData: normalized.cardData,
        errors: [],
        warnings,
        source: {
            kind: classification.kind,
            specVersion: classification.specVersion ?? null,
        },
    };
}
