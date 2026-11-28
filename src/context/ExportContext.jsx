import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import exampleAvatar from '../assets/example_avatar.png';
import ExportDialog from '../components/dialogs/ExportDialog';
import useAssetUrl from '../hooks/useAssetUrl';
import { PORTRAIT_STORAGE_KEY } from '../hooks/usePortraitPipeline';
import validateCardV3 from '../spec/validateCardV3';
import { createExportSnapshot } from '../png/cardPng';
import { downloadBlob } from '../utils/blob';
import { safeFilename } from '../utils/filename';
import { useCardStore } from './cardStoreContext';
import { useNotifications } from './NotificationContext';

const ExportContext = createContext(null);

const FORMAT_EXTENSION = { charx: 'charx', json: 'json', png: 'png' };
const FORMAT_LABEL = { charx: 'CHARX', json: 'V3 JSON', png: 'V3 PNG' };

function storedPortrait() {
    try {
        return localStorage.getItem(PORTRAIT_STORAGE_KEY) || exampleAvatar;
    } catch {
        return exampleAvatar;
    }
}

/**
 * Owns export state so the top bar, toolbar and export dialog all trigger the same flow.
 * Heavy archive/PNG modules are imported on demand to keep the initial bundle small.
 */
export function ExportProvider({ children }) {
    const { cardData } = useCardStore();
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

        const outgoing = createExportSnapshot(cardData);
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
                    risuCompat: options.risuCompat ?? false,
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
            const nameSuffix = format === 'charx' && options.risuCompat ? ' (RisuAI)' : '';
            downloadBlob(
                result.blob,
                safeFilename(`${result.card?.data?.name ?? outgoing.data.name}${nameSuffix}`, extension),
            );

            const warnings = [...validation.warnings, ...(result.warnings ?? [])];
            const risuSummary = result.risuCompat;
            const risuNote = risuSummary
                ? ` ${risuSummary.converted} media reference${risuSummary.converted === 1 ? '' : 's'} converted and ${risuSummary.mirrors} RisuAI asset alias${risuSummary.mirrors === 1 ? '' : 'es'} added.`
                : '';
            notify({
                title: `${FORMAT_LABEL[format] ?? 'Card'} exported`,
                severity: warnings.length > 0 ? 'warning' : 'success',
                message: warnings.length > 0
                    ? `The ${FORMAT_LABEL[format] ?? 'card'} file was downloaded. Review the warnings below.${risuNote}`
                    : `The ${FORMAT_LABEL[format] ?? 'card'} file was downloaded.${risuNote}`,
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
