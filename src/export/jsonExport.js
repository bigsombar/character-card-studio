import { buildOutgoingCard } from '../png/cardPngIO';
import { blobToDataUrl } from '../utils/blob';
import { replaceTextReferences } from '../assets/remoteMedia';
import { getAsset } from '../storage/assetStore';

/**
 * Creates a V3 JSON file. With inlineAssets enabled, embeded:// assets are converted to data URLs
 * so the JSON is self-contained outside a CHARX archive.
 *
 * @param {Object} card
 * @param {{inlineAssets?: boolean, onProgress?: Function}} [options]
 * @returns {Promise<{blob: Blob, card: Object, warnings: Array}>}
 */
export default async function exportV3Json(card, options = {}) {
    const {inlineAssets = true, onProgress = () => {}} = options;
    const outgoing = buildOutgoingCard(card);
    const assets = outgoing.data.assets ?? [];
    const warnings = [];
    const outputAssets = [];
    const textUris = {};

    for (let index = 0; index < assets.length; index++) {
        const asset = assets[index];
        onProgress({
            phase: 'assets',
            current: index,
            total: assets.length,
            message: `Preparing ${asset.name ?? `asset ${index + 1}`}…`,
        });

        if (typeof asset.uri === 'string' && asset.uri.startsWith('embeded://')) {
            if (!inlineAssets) {
                warnings.push({
                    code: 'JSON_EMBEDED_REFS',
                    message: `Asset "${asset.name ?? asset.uri}" keeps an embeded:// URI; this JSON is not self-contained without a CHARX archive.`,
                });
                outputAssets.push(asset);
                continue;
            }

            try {
                const record = await getAsset(asset.uri);
                if (!record) throw new Error('asset data is missing from IndexedDB');
                const dataUrl = await blobToDataUrl(record.blob);
                outputAssets.push({...asset, uri: dataUrl});
                textUris[asset.uri] = dataUrl;
            } catch (error) {
                warnings.push({
                    code: 'JSON_ASSET_MISSING',
                    message: `Asset "${asset.name ?? asset.uri}" could not be inlined: ${error.message}`,
                });
                outputAssets.push(asset);
            }
        } else {
            outputAssets.push(asset);
        }
    }

    const cardForJson = {
        ...outgoing,
        data: {
            ...outgoing.data,
            assets: outputAssets.length > 0 ? outputAssets : undefined,
        },
    };
    // Keep inline text references (markdown/HTML media) valid in a self-contained JSON file.
    const inlinedCard = replaceTextReferences(cardForJson, textUris).card;

    onProgress({phase: 'done', message: 'JSON ready.'});

    return {
        blob: new Blob([JSON.stringify(inlinedCard, null, 2)], {type: 'application/json'}),
        card: inlinedCard,
        warnings,
    };
}
