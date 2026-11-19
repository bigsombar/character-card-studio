import { dataUrlToBlob } from '../utils/blob';
import normalizeCardData from '../utils/normalizeCardData';
import { createNewCard } from '../spec/cardPrototype';
import { createAssetUri, makeUniqueUri } from '../assets/paths';
import { extensionFromFilename, mediaKindForExtension } from '../assets/media';
import { clearOrphanAssets, putAsset } from './assetStore';
import { loadProject, saveProject } from './projectStore';

function readLegacyCard() {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('cardData');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function migrateLegacyPreview(card, warnings) {
    if (typeof localStorage === 'undefined') return card;
    const preview = localStorage.getItem('previewImage');
    if (!preview) return card;

    const existingIcon = (card.data.assets ?? []).find((asset) => asset.type === 'icon' && asset.name === 'main');
    if (existingIcon) return card;

    try {
        const blob = await dataUrlToBlob(preview);
        if (!blob.size) return card;

        const mime = blob.type || 'image/png';
        const rawExt = mime.split('/')[1] || 'png';
        const ext = extensionFromFilename(`preview.${rawExt}`) || 'png';
        const mediaKind = mediaKindForExtension(ext);
        const existingUris = new Set((card.data.assets ?? []).map((asset) => asset.uri));
        const uri = makeUniqueUri(createAssetUri({type: 'icon', name: 'main', ext}), existingUris);

        await putAsset({
            uri,
            blob,
            mime,
            size: blob.size,
            ext,
            mediaKind,
            name: 'main',
        });

        return {
            ...card,
            data: {
                ...card.data,
                assets: [
                    ...(card.data.assets ?? []),
                    {type: 'icon', uri, name: 'main', ext},
                ],
            },
        };
    } catch (error) {
        warnings.push({
            code: 'LEGACY_PREVIEW_MIGRATION_FAILED',
            message: `The old portrait could not be migrated to an asset: ${error.message}`,
        });
        return card;
    }
}

/**
 * Loads the current project from IndexedDB. If there is no project yet, it migrates the
 * old localStorage card/preview once, then removes the legacy keys after a successful save.
 */
export default async function loadInitialProject() {
    const warnings = [];

    try {
        const existing = await loadProject();
        if (existing?.card) {
            const normalized = normalizeCardData(existing.card);
            if (normalized.ok) {
                try {
                    await clearOrphanAssets(normalized.cardData);
                } catch {
                    // Non-fatal: the project still loads even if orphan cleanup fails.
                }
                return {card: normalized.cardData, warnings: normalized.warnings ?? [], source: 'indexeddb'};
            }
            warnings.push({
                code: 'PROJECT_NORMALIZE_FAILED',
                message: normalized.error ?? 'The stored project could not be normalized.',
            });
        }
    } catch (error) {
        warnings.push({
            code: 'INDEXEDDB_UNAVAILABLE',
            message: `IndexedDB is unavailable; the editor will not persist changes after reload. ${error.message}`,
        });
    }

    const legacy = readLegacyCard();
    if (!legacy) return null;

    const normalized = normalizeCardData(legacy);
    if (!normalized.ok) {
        warnings.push({
            code: 'LEGACY_CARD_INVALID',
            message: normalized.error ?? 'The legacy stored card could not be loaded.',
        });
        return {card: createNewCard(), warnings, source: 'localStorage'};
    }

    let card = await migrateLegacyPreview(normalized.cardData, warnings);
    warnings.push(...(normalized.warnings ?? []));

    let saved = false;
    try {
        await saveProject(card);
        saved = true;
    } catch (error) {
        warnings.push({
            code: 'LEGACY_SAVE_FAILED',
            message: `The legacy card was loaded but could not be moved to IndexedDB: ${error.message}`,
        });
    }

    if (saved && typeof localStorage !== 'undefined') {
        localStorage.removeItem('cardData');
        localStorage.removeItem('previewImage');
    }

    return {card, warnings, source: 'localStorage'};
}
