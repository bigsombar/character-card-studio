import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
    Button,
    Box,
    Checkbox,
    FormControlLabel,
    LinearProgress,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';

import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import FileUpload from '../FileUpload/FileUpload';
import { EDITOR_SECTIONS } from '../layout/SideRail';
import SectionHeader from '../layout/SectionHeader';
import { cardDataChunkBytes, parsePngChunks, selectImportChunk, stripPngChunks } from '../../png/cardPngIO';
import formatBytes from '../../utils/formatBytes';
import { collectRemoteMedia } from '../../assets/remoteMedia';
import useAssetUrl from '../../hooks/useAssetUrl';
import useCardOverwrite from '../../hooks/useCardOverwrite';
import usePortraitPipeline from '../../hooks/usePortraitPipeline';
import normalizeCardData, { normalizeLorebook } from '../../utils/normalizeCardData';
import { useCard } from '../../context/cardContext';
import { useAssets } from '../../context/AssetContext';
import { useExport } from '../../context/ExportContext';
import { useNotifications } from '../../context/NotificationContext';
import { createNewCard } from '../../spec/cardPrototype';
import PortraitPanel from '../editor/PortraitPanel';

// Section modules are split into their own chunks: the lorebook and greeting editors pull in
// drag-and-drop code that most sessions never need on first paint.
const CharacterSection = lazy(() => import('../../sections/CharacterSection'));
const GreetingsSection = lazy(() => import('../../sections/GreetingsSection'));
const CreatorSection = lazy(() => import('../../sections/CreatorSection'));
const PromptsSection = lazy(() => import('../../sections/PromptsSection'));
const LorebookSection = lazy(() => import('../../sections/LorebookSection'));
const AssetsSection = lazy(() => import('../../sections/AssetsSection'));
const GroupsSection = lazy(() => import('../../sections/GroupsSection'));
const ToolsSection = lazy(() => import('../../sections/ToolsSection'));
const AdvancedSection = lazy(() => import('../../sections/AdvancedSection'));
const PortraitCompressionDialog = lazy(() => import('../PortraitCompressionDialog/PortraitCompressionDialog'));
const LinkedMediaImportDialog = lazy(() => import('../linkedMedia/LinkedMediaImportDialog'));

const SECTION_COMPONENTS = {
    0: CharacterSection,
    1: GreetingsSection,
    2: CreatorSection,
    3: PromptsSection,
    4: LorebookSection,
    5: AssetsSection,
    6: GroupsSection,
    7: ToolsSection,
    8: AdvancedSection,
};

// These views are data-heavy and benefit from the full editor width; the portrait column adds
// no value there and is hidden regardless of the "Show portrait" preference.
const PORTRAITLESS_SECTIONS = new Set([4, 5]);

const TavernCardEditor = ({ activeSection = 0 }) => {
    const { cardData, setCardData, initialWarnings, isHydrating } = useCard();
    const { clearAllAssets, ensureMainIcon, ingestCardAssets } = useAssets();
    const { notify } = useNotifications();
    const { progress: exportProgress } = useExport();

    const activeSectionMeta = EDITOR_SECTIONS.find((section) => section.value === activeSection) ?? EDITOR_SECTIONS[0];
    const SectionComponent = SECTION_COMPONENTS[activeSection] ?? CharacterSection;

    const initialFileNameSet = useRef(false);
    const initialWarningsShown = useRef(false);

    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const [displayImage, setDisplayImage] = useState(true);
    const showPortraitPanel = displayImage && !PORTRAITLESS_SECTIONS.has(activeSection);
    const [file, setFile] = useState(null);
    const [importProgress, setImportProgress] = useState(null);
    const [linkedMediaPromptOpen, setLinkedMediaPromptOpen] = useState(false);
    // Per-entry extensions can be very large, so the lorebook keeps them collapsed until asked for.
    const [showEntryAdvancedJson, setShowEntryAdvancedJson] = useState(false);
    const [compressDialogOpen, setCompressDialogOpen] = useState(false);

    const mainIconAsset = (cardData.data.assets ?? []).find((asset) => asset.type === 'icon' && asset.name === 'main');
    const { url: mainIconUrl } = useAssetUrl(mainIconAsset?.uri);
    const {
        applyCompression,
        handlePortraitUpload,
        portraitBytes,
        portraitSource,
        resetPortrait,
    } = usePortraitPipeline({ file, mainIconUrl });

    const readToBuffer = (infile) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(infile);
    });

    const maybePromptForLinkedMedia = useCallback((card) => {
        try {
            if (collectRemoteMedia(card).length > 0) setLinkedMediaPromptOpen(true);
        } catch {
            // Scanning is best-effort; an import must never fail because of it.
        }
    }, []);

    const {
        cancelOverwrite,
        confirmOverwrite,
        overwriteConfirmation,
        requestOverwrite,
        requestOverwriteFromFile,
    } = useCardOverwrite({ onApplied: maybePromptForLinkedMedia });

    const loadCardIntoState = async (parsedCardData, importMeta = {}) => {
        const result = normalizeCardData(parsedCardData);
        if (!result.ok) {
            notify({
                title: 'Import failed',
                severity: 'error',
                message: result.error,
                errors: result.errors,
                warnings: result.warnings,
            });
            return false;
        }

        let cardDataToLoad = result.cardData;
        try {
            cardDataToLoad = await ingestCardAssets(cardDataToLoad);
        } catch (error) {
            notify({
                title: 'Asset import warning',
                severity: 'warning',
                message: `The card was loaded, but some embedded assets could not be moved to IndexedDB: ${error.message}`,
            });
        }

        if (importMeta.portraitFile) {
            try {
                cardDataToLoad = await ensureMainIcon(cardDataToLoad, importMeta.portraitFile, {replace: true});
            } catch (error) {
                notify({
                    title: 'Portrait import warning',
                    severity: 'warning',
                    message: `The card was loaded, but the PNG portrait could not be stored as a main icon: ${error.message}`,
                });
            }
        }

        setCardData(cardDataToLoad);
        maybePromptForLinkedMedia(cardDataToLoad);

        const warnings = [...(importMeta.warnings ?? []), ...(result.warnings ?? [])];
        if (warnings.length > 0) {
            notify({
                title: 'Card imported with warnings',
                severity: 'warning',
                message: `${importMeta.format ?? 'Card'} was imported as CCv3. Review the warnings below.`,
                warnings,
            });
        }

        return true;
    };

    const handleLorebookImportLogic = (newLorebook) => {
        setCardData((prevState) => ({
            ...prevState,
            data: { ...prevState.data, character_book: newLorebook },
        }));
    };

    async function handleFileSelect(event, importLorebook = false) {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        if (!importLorebook) setFile(selectedFile);

        if (/.+\.png$/i.test(selectedFile.name)) {
            let parsed;
            try {
                parsed = await parsePngChunks(selectedFile, ['ccv3', 'chara']);
            } catch (error) {
                notify({ title: 'PNG import failed', severity: 'error', message: error.message });
                return;
            }

            const { chunks, warnings: parseWarnings } = parsed;
            if (chunks.length === 0) {
                notify({
                    title: 'PNG contains no card data',
                    severity: 'error',
                    message: 'This PNG has no readable ccv3 or chara chunk.',
                    warnings: parseWarnings,
                });
                return;
            }

            const selection = selectImportChunk(chunks);
            if (!selection.chunk) {
                notify({
                    title: 'PNG contains no card data',
                    severity: 'error',
                    message: 'This PNG has no readable ccv3 or chara chunk.',
                    warnings: [...parseWarnings, ...selection.warnings],
                });
                return;
            }

            const parsedCardData = selection.chunk.data;

            if (importLorebook) {
                const lorebookSource = typeof parsedCardData?.data === 'object' && parsedCardData.data !== null
                    ? parsedCardData.data.character_book
                    : undefined;
                if (typeof lorebookSource === 'undefined') {
                    notify({
                        title: 'No lorebook found',
                        severity: 'error',
                        message: 'The selected PNG does not contain a character_book.',
                    });
                    return;
                }
                handleLorebookImportLogic(normalizeLorebook(lorebookSource));
                return;
            }

            // The PNG image itself is the card's portrait. Store a chunk-free copy as a real
            // V3 main icon asset so it survives reload and is embedded by CHARX/PNG export.
            let portraitFile = null;
            const portraitWarnings = [];
            try {
                const inputBuffer = await readToBuffer(selectedFile);
                const strippedBuffer = await stripPngChunks(inputBuffer, ['ccv3', 'chara']);
                portraitFile = new File([strippedBuffer], 'portrait.png', {type: 'image/png'});
            } catch (error) {
                portraitWarnings.push({
                    code: 'PNG_PORTRAIT_FAILED',
                    message: `The PNG portrait could not be prepared as a main icon asset: ${error.message}`,
                });
            }

            await loadCardIntoState(parsedCardData, {
                format: selection.chunk.keyword === 'ccv3' ? 'PNG (ccv3)' : 'PNG (chara / V2)',
                portraitFile,
                warnings: [...parseWarnings, ...selection.warnings, ...portraitWarnings],
            });
        } else if (/.+\.charx$/i.test(selectedFile.name)) {
            setImportProgress({ message: 'Reading CHARX…' });
            try {
                const { default: importCharx } = await import('../../charx/charxImport');
                const imported = await importCharx(selectedFile, { onProgress: setImportProgress });
                if (importLorebook) {
                    const lorebook = imported.card?.data?.character_book;
                    if (!lorebook) {
                        notify({
                            title: 'No lorebook found',
                            severity: 'error',
                            message: 'The selected CHARX does not contain a character_book.',
                        });
                        return;
                    }
                    handleLorebookImportLogic(lorebook);
                    return;
                }
                await loadCardIntoState(imported.card, {
                    format: 'CHARX',
                    warnings: imported.warnings,
                });
            } catch (error) {
                notify({ title: 'CHARX import failed', severity: 'error', message: error.message });
            } finally {
                setImportProgress(null);
            }
        } else if (/.+\.json$/i.test(selectedFile.name)) {
            let parsedJson;
            try {
                parsedJson = JSON.parse(await selectedFile.text());
            } catch (error) {
                notify({
                    title: 'JSON import failed',
                    severity: 'error',
                    message: `Please upload a valid .json file: ${error.message}`,
                });
                return;
            }

            if (importLorebook) {
                const lorebookSource = typeof parsedJson === 'object' && parsedJson !== null && parsedJson.spec === 'lorebook_v3'
                    ? parsedJson.data
                    : parsedJson?.data?.character_book;
                if (typeof lorebookSource === 'undefined') {
                    notify({
                        title: 'No lorebook found',
                        severity: 'error',
                        message: 'The selected JSON does not contain a lorebook.',
                    });
                    return;
                }
                handleLorebookImportLogic(normalizeLorebook(lorebookSource));
                return;
            }

            await loadCardIntoState(parsedJson, { format: 'JSON' });
        } else {
            notify({
                title: 'Unsupported file type',
                severity: 'error',
                message: 'Please upload a valid card file type (.charx, .json or .png).',
            });
        }
    }

    const handleOverwriteFileInput = (event) => {
        void requestOverwriteFromFile(event.target.files?.[0]);
    };

    const handleApplyCompression = async (dataUrl) => {
        await applyCompression(dataUrl);
        setCompressDialogOpen(false);
    };

    const handleRemoveFile = async () => {
        const newCard = createNewCard();
        try {
            await clearAllAssets();
        } catch (error) {
            console.warn('Could not clear asset storage:', error);
        }
        setFile(null);
        setDeleteConfirmation(false);
        resetPortrait();
        setCardData(newCard);
    };

    useEffect(() => {
        if (!initialFileNameSet.current && cardData?.data?.name) {
            setFile({ name: cardData.data.name });
            initialFileNameSet.current = true;
        }
    }, [cardData?.data?.name]);

    useEffect(() => {
        if (!isHydrating && initialWarnings?.length && !initialWarningsShown.current) {
            initialWarningsShown.current = true;
            notify({
                title: 'Project restored with warnings',
                severity: 'warning',
                message: 'The stored project loaded, but some fields needed normalization.',
                warnings: initialWarnings,
            });
        }
    }, [initialWarnings, isHydrating, notify]);

    // Re-serializing the whole card on every keystroke commit is cheap but not free with a big
    // lorebook, so let React schedule it at low priority.
    const deferredCardData = useDeferredValue(cardData);
    const cardDataBytes = useMemo(() => cardDataChunkBytes(deferredCardData), [deferredCardData]);
    const statusMessage = importProgress?.message ?? exportProgress?.message;

    // The file strip belongs to the portrait column, so it no longer stretches across the empty
    // space above the editor. With the portrait hidden it becomes a normal full-width strip.
    const fileToolbar = (
        <Stack
            direction="row"
            sx={{
                alignItems: 'center',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                flexShrink: 0,
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'space-between',
                minHeight: 56,
                overflowX: 'auto',
                px: 2,
                py: 1,
            }}
        >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                <FileUpload
                    acceptedFileTypes=".json,.png,.charx"
                    displayDeleteButton
                    file={file}
                    fileChange={handleFileSelect}
                    handleRemoveFile={() => setDeleteConfirmation(true)}
                />
                {isHydrating && <Typography color="text.secondary" variant="caption">Loading project…</Typography>}
            </Stack>
        </Stack>
    );

    const panelActions = (
        <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
            {statusMessage && (
                <Typography color="text.secondary" sx={{ whiteSpace: 'nowrap' }} variant="caption">
                    {statusMessage}
                </Typography>
            )}
            {!PORTRAITLESS_SECTIONS.has(activeSection) && (
                <FormControlLabel
                    control={<Checkbox checked={displayImage} onChange={() => setDisplayImage(!displayImage)} size="small" />}
                    label="Show portrait"
                    sx={{ mr: 0, whiteSpace: 'nowrap' }}
                />
            )}
            {activeSection === 4 ? (
                <Tooltip
                    describeChild
                    title="Show the Advanced JSON (extensions) fields on every lorebook entry"
                >
                    <FormControlLabel
                        control={(
                            <Switch
                                checked={showEntryAdvancedJson}
                                onChange={(event) => setShowEntryAdvancedJson(event.target.checked)}
                                size="small"
                            />
                        )}
                        label="Advanced JSON"
                        labelPlacement="start"
                        sx={{ mr: 0, whiteSpace: 'nowrap' }}
                    />
                </Tooltip>
            ) : file && (
                <div>
                    <input
                        accept=".json"
                        hidden
                        id="json-upload"
                        onChange={handleOverwriteFileInput}
                        onClick={(event) => { event.target.value = null; }}
                        type="file"
                    />
                    <label htmlFor="json-upload">
                        <Tooltip describeChild title="Overwrite the contents of this card with a JSON while retaining the display picture">
                            <Button component="span" sx={{ whiteSpace: 'nowrap' }} variant="outlined">Overwrite with JSON</Button>
                        </Tooltip>
                    </label>
                </div>
            )}
        </Stack>
    );

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                height: '100%',
                overflow: 'hidden',
                p: { xs: 1.5, md: 2.5 },
            }}
        >
            <Suspense fallback={null}>
                <PortraitCompressionDialog
                    onApply={handleApplyCompression}
                    onClose={() => setCompressDialogOpen(false)}
                    open={compressDialogOpen}
                    source={portraitSource}
                />
            </Suspense>
            <Suspense fallback={null}>
                <LinkedMediaImportDialog
                    onClose={() => setLinkedMediaPromptOpen(false)}
                    open={linkedMediaPromptOpen}
                />
            </Suspense>
            <ConfirmationDialog
                dialogContent="Are you sure you want to clear all fields? This action cannot be undone."
                dialogTitle="Clear all fields?"
                handleClose={() => setDeleteConfirmation(false)}
                handleConfirm={handleRemoveFile}
                open={deleteConfirmation}
            />
            <ConfirmationDialog
                dialogContent="Are you sure you want to overwrite the current fields with this JSON? This action cannot be undone."
                dialogTitle="Overwrite the current card?"
                handleClose={cancelOverwrite}
                handleConfirm={confirmOverwrite}
                open={overwriteConfirmation}
            />

            {!showPortraitPanel && !PORTRAITLESS_SECTIONS.has(activeSection) && fileToolbar}

            <Box
                sx={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                    minHeight: 0,
                    overflow: 'hidden',
                }}
            >
                {showPortraitPanel && (
                    <Box
                        sx={{
                            display: 'flex',
                            flex: { xs: '0 0 auto', md: '2 1 0' },
                            flexDirection: 'column',
                            gap: 2,
                            minHeight: 0,
                            minWidth: 0,
                        }}
                    >
                        {fileToolbar}
                        <Box
                            sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                                display: 'flex',
                                flex: 1,
                                minHeight: 0,
                                overflow: 'hidden',
                            }}
                        >
                            <PortraitPanel
                                displayPortrait={portraitSource}
                                fileName={file ? file.name : 'Uploaded portrait'}
                                onCompress={() => setCompressDialogOpen(true)}
                                onUpload={handlePortraitUpload}
                                sizeHint={activeSection === 0 && portraitBytes !== null
                                    ? `Portrait ${formatBytes(portraitBytes)} + card data ${formatBytes(cardDataBytes)}`
                                    : undefined}
                                sizeLabel={activeSection === 0 && portraitBytes !== null
                                    ? `PNG size: ${formatBytes(portraitBytes + cardDataBytes)}`
                                    : undefined}
                            />
                        </Box>
                    </Box>
                )}
                <Box
                    sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        display: 'flex',
                        flex: showPortraitPanel ? { xs: '1 1 auto', md: '5 1 0' } : '1 1 0',
                        flexDirection: 'column',
                        minHeight: 0,
                        minWidth: 0,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            flex: 1,
                            flexDirection: 'column',
                            minHeight: 0,
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        {activeSection !== 4 && (
                            <SectionHeader
                                actions={panelActions}
                                description={activeSectionMeta.hint}
                                sx={{ flexShrink: 0, flexWrap: 'wrap', rowGap: 1 }}
                                title={activeSectionMeta.label}
                            />
                        )}
                        <Box sx={{ flex: 1, mr: -1, overflow: 'auto', pr: 1 }}>
                            {activeSection === 4 && (
                                <SectionHeader
                                    actions={panelActions}
                                    description={activeSectionMeta.hint}
                                    sx={{ flexWrap: 'wrap', mb: 1, rowGap: 1 }}
                                    title={activeSectionMeta.label}
                                />
                            )}
                            <Suspense fallback={<LinearProgress sx={{ mt: 2 }} />}>
                                <SectionComponent
                                    {...(activeSection === 4 ? {
                                        onImportFile: (event) => handleFileSelect(event, true),
                                        showAdvancedJson: showEntryAdvancedJson,
                                    } : {})}
                                    {...(activeSection === 8 ? { onApplyCard: requestOverwrite } : {})}
                                />
                            </Suspense>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default TavernCardEditor;
