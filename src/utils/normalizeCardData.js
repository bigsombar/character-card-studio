import classifyCard from '../spec/classifyCard';
import { SPEC_VERSION, SPEC_VERSION_NUMBER } from '../spec/constants';
import normalizeCardV3, { normalizeLorebook } from '../spec/normalizeCardV3';
import upcastV2ToV3 from '../spec/upcastV2';

export { normalizeLorebook };

function toErrorResult(classification) {
    const errors = [{ code: 'IMPORT_INVALID', message: classification.error ?? 'File is not a valid card.' }];
    return {
        ok: false,
        error: classification.error ?? 'File is not a valid card.',
        errors,
        warnings: classification.warnings ?? [],
    };
}

/**
 * Classifies, upcasts (V2/legacy), and fully normalizes a parsed card. The result is always a
 * V3-shaped card in state; V2 is input-only.
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
export default function normalizeCardData(parsedJson) {
    const classification = classifyCard(parsedJson);

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
