import { composeCardPng, createExportSnapshot } from '../png/cardPng';
import { imageSourceToPngArrayBuffer } from '../utils/imageToPng';

/**
 * Builds a lossy V3 PNG: only the main icon is retained (as ccdefault:), because PNG cannot
 * carry audio/video or additional CHARX assets. The caller should show the returned warnings.
 *
 * @param {Object} card
 * @param {string} portraitSource Object/data URL used as the actual PNG image
 * @returns {Promise<{blob: Blob, card: Object, warnings: Array}>}
 */
export default async function exportV3Png(card, portraitSource) {
    const outgoing = createExportSnapshot(card);
    const assets = outgoing.data.assets ?? [];
    const mainIcon = assets.find((asset) => asset.type === 'icon' && asset.name === 'main');
    const warnings = [];

    if (assets.length > (mainIcon ? 1 : 0)) {
        warnings.push({
            code: 'PNG_ASSETS_OMITTED',
            message: 'PNG export can only include the main icon. Audio, video and extra image assets were omitted; use CHARX to keep them.',
        });
    }
    if (!mainIcon && assets.length > 0) {
        warnings.push({
            code: 'PNG_NO_MAIN_ICON',
            message: 'No icon/main asset was found; the PNG uses the current portrait image.',
        });
    }

    const cardForPng = {
        ...outgoing,
        data: {
            ...outgoing.data,
            assets: mainIcon ? [{...mainIcon, uri: 'ccdefault:'}] : undefined,
        },
    };

    const pngArrayBuffer = await imageSourceToPngArrayBuffer(portraitSource);
    const png = await composeCardPng(pngArrayBuffer, cardForPng);

    return {
        blob: new Blob([png], {type: 'image/png'}),
        card: cardForPng,
        warnings,
    };
}
