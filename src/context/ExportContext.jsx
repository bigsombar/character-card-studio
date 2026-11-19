import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import default_avatar from '../assets/default_avatar.png';
import ExportDialog from '../components/dialogs/ExportDialog';
import useAssetUrl from '../hooks/useAssetUrl';
import validateCardV3 from '../spec/validateCardV3';
import { buildOutgoingCard } from '../png/cardPngIO';
import { downloadBlob } from '../utils/blob';
import { safeFilename } from '../utils/filename';
import { useCard } from './cardContext';
import { useNotifications } from './NotificationContext';

const ExportContext = createContext(null);

const FORMAT_EXTENSION = { charx: 'charx', json: 'json', png: 'png' };
const FORMAT_LABEL = { charx: 'CHARX', json: 'V3 JSON', png: 'V3 PNG' };

function storedPortrait() {
    try {
        return localStorage.getItem('previewImage') || default_avatar;
    } catch {
        return default_avatar;
    }
}

/**
 * Owns export state so the top bar, toolbar and export dialog all trigger the same flow.
 * Heavy archive/PNG modules are imported on demand to keep the initial bundle small.
 */
export function ExportProvider({ children }) {
    const { cardData } = useCard();
    const { notify } = useNotifications();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(null);
    const busyRef = useRef(false);

    const mainIconAsset = (cardData?.data?.assets ?? [])
        .find((asset) => asset.type === 'icon' && asset.name === 'main');
    const { url: mainIconUrl } = useAssetUrl(mainIconAsset?.uri);
    const pngPortrait = mainIconUrl || storedPortrait();

    const exportCard = useCallback(async (format, options = {}) => {
        if (busyRef.current) return { ok: false, reason: 'busy' };

        const outgoing = buildOutgoingCard(cardData);
        const validation = validateCardV3(outgoing);
        if (!validation.ok) {
            notify({
                title: 'Export blocked',
                severity: 'error',
                message: 'The card has structural CCv3 errors. Fix them before exporting.',
                errors: validation.errors,
                warnings: validation.warnings,
            });
            return { ok: false, validation };
        }

        busyRef.current = true;
        setExporting(true);
        setProgress({ message: `Preparing ${FORMAT_LABEL[format] ?? 'card'}…` });

        try {
            let result;
            if (format === 'charx') {
                const { default: exportCharx } = await import('../charx/charxExport');
                result = await exportCharx(outgoing, {
                    embedRemote: options.embedRemote ?? true,
                    onProgress: setProgress,
                });
            } else if (format === 'json') {
                const { default: exportV3Json } = await import('../export/jsonExport');
                result = await exportV3Json(outgoing, {
                    inlineAssets: options.inlineAssets ?? true,
                    onProgress: setProgress,
                });
            } else if (format === 'png') {
                const { default: exportV3Png } = await import('../export/pngExport');
                result = await exportV3Png(cardData, pngPortrait);
            } else {
                throw new Error(`Unknown export format: ${format}`);
            }

            const extension = FORMAT_EXTENSION[format] ?? 'json';
            downloadBlob(result.blob, safeFilename(result.card?.data?.name ?? outgoing.data.name, extension));

            const warnings = [...validation.warnings, ...(result.warnings ?? [])];
            notify({
                title: `${FORMAT_LABEL[format] ?? 'Card'} exported`,
                severity: warnings.length > 0 ? 'warning' : 'success',
                message: warnings.length > 0
                    ? `The ${FORMAT_LABEL[format] ?? 'card'} file was downloaded. Review the warnings below.`
                    : `The ${FORMAT_LABEL[format] ?? 'card'} file was downloaded.`,
                warnings,
            });

            return { ok: true, warnings, result };
        } catch (error) {
            notify({
                title: `${FORMAT_LABEL[format] ?? 'Card'} export failed`,
                severity: 'error',
                message: error.message,
            });
            return { ok: false, error };
        } finally {
            busyRef.current = false;
            setExporting(false);
            setProgress(null);
        }
    }, [cardData, notify, pngPortrait]);

    const openExportDialog = useCallback(() => setDialogOpen(true), []);
    const closeExportDialog = useCallback(() => setDialogOpen(false), []);

    const value = useMemo(() => ({
        closeExportDialog,
        dialogOpen,
        exportCard,
        exporting,
        openExportDialog,
        progress,
    }), [closeExportDialog, dialogOpen, exportCard, exporting, openExportDialog, progress]);

    return (
        <ExportContext.Provider value={value}>
            {children}
            <ExportDialog
                cardData={cardData}
                exporting={exporting}
                onClose={closeExportDialog}
                onExport={exportCard}
                open={dialogOpen}
                progress={progress}
            />
        </ExportContext.Provider>
    );
}

export function useExport() {
    const context = useContext(ExportContext);
    if (!context) throw new Error('useExport must be used inside ExportProvider.');
    return context;
}
