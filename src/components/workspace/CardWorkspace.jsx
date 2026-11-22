import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
    Box,
    Checkbox,
    FormControlLabel,
    LinearProgress,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';

import ConfirmActionDialog from '../dialogs/ConfirmActionDialog';
import EmbeddedCardDialog from '../dialogs/EmbeddedCardDialog';
import CardFilePicker from '../files/CardFilePicker';
import { EDITOR_SECTIONS } from '../../app/editorSections';
import SectionHeader from '../layout/SectionHeader';
import { estimateCardPayloadBytes, extractPngTextPayloads, resolveEmbeddedCard, dropPngTextPayloads } from '../../png/cardPng';
import formatByteSize from '../../utils/formatByteSize';
import { collectRemoteMedia } from '../../assets/remoteMedia';
import useAssetUrl from '../../hooks/useAssetUrl';
import useCardOverwrite from '../../hooks/useCardOverwrite';
import useIsMobile from '../../hooks/useIsMobile';
import usePortraitPipeline from '../../hooks/usePortraitPipeline';
import normalizeImportedCard, { normalizeCharacterBook } from '../../spec/normalizeImportedCard';
import { useCardStore } from '../../context/cardStoreContext';
import { useAssets } from '../../context/AssetContext';
import { useExport } from '../../context/ExportContext';
import { useNotifications } from '../../context/NotificationContext';
import { createNewCard } from '../../spec/emptyCard';
import PortraitPanel from '../portrait/PortraitPanel';

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
const PortraitResizeDialog = lazy(() => import('../portrait/PortraitResizeDialog'));
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

const CardWorkspace = ({ activeSection = 0 }) => {
    const isMobile = useIsMobile();
    const { cardData, patchCardData, setCardData, initialWarnings, isHydrating } = useCardStore();
    const { clearAllAssets, ensureMainIcon, ingestCardAssets } = useAssets();
    const { notify } = useNotifications();
    const { progress: exportProgress } = useExport();

    const activeSectionMeta = EDITOR_SECTIONS.find((section) => section.value === activeSection) ?? EDITOR_SECTIONS[0];
    const SectionComponent = SECTION_COMPONENTS[activeSection] ?? CharacterSection;

    const initialFileNameSet = useRef(false);
    const initialWarningsShown = useRef(false);

    const [confirmClear, setConfirmClear] = useState(false);
    const [portraitVisible, setPortraitVisible] = useState(true);
    const showPortraitPanel = portraitVisible && !isMobile && !PORTRAITLESS_SECTIONS.has(activeSection);
    const [file, setFile] = useState(null);
    const [importProgress, setImportProgress] = useState(null);
    const [linkedMediaPromptOpen, setLinkedMediaPromptOpen] = useState(false);
    // Per-entry extensions can be very large, so the lorebook keeps them collapsed until asked for.
    const [showEntryAdvancedJson, setShowEntryAdvancedJson] = useState(false);
    const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
    const [embeddedChoice, setEmbeddedChoice] = useState(null);

    const mainIconAsset = (cardData.data.assets ?? []).find((asset) => asset.type === 'icon' && asset.name === 'main');
    const { url: mainIconUrl } = useAssetUrl(mainIconAsset?.uri);
    const {
        applyCompression,
        exportBytes,
        handlePortraitUpload,
        portraitSource,
        resetPortrait,
    } = usePortraitPipeline({ file, mainIconUrl });

    const readFileBuffer = (infile) => new Promise((resolve, reject) => {
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
        replacementPending,
        requestOverwrite,
    } = useCardOverwrite({ onApplied: maybePromptForLinkedMedia });

    const commitImportedCard = async (importedCard, importMeta = {}) => {
        const check = normalizeImportedCard(importedCard);
        if (!check.ok) {
            notify({
                title: 'Import failed',
                severity: 'error',
                message: check.error,
                errors: check.errors,
                warnings: check.warnings,
            });
            return false;
        }

        let cardDataToLoad = check.cardData;
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

        const warnings = [...(importMeta.warnings ?? []), ...(check.warnings ?? [])];
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

    const applyLorebook = (lorebook) => patchCardData({ character_book: lorebook });

    const applyPngChunk = async (chunk, {
        lorebookOnly = false,
        parseWarnings = [],
        pickedFile,
        resolutionWarnings = [],
    } = {}) => {
        const importedCard = chunk.data;

        if (lorebookOnly) {
            const lorebookSource = typeof importedCard?.data === 'object' && importedCard.data !== null
                ? importedCard.data.character_book
                : undefined;
            if (typeof lorebookSource === 'undefined') {
                notify({
                    title: 'No lorebook found',
                    severity: 'error',
                    message: 'The selected PNG does not contain a character_book.',
                });
                return;
            }
            applyLorebook(normalizeCharacterBook(lorebookSource));
            return;
        }

        // The PNG image itself is the card's portrait. Store a chunk-free copy as a real
        // V3 main icon asset so it survives reload and is embedded by CHARX/PNG export.
        let portraitFile = null;
        const portraitWarnings = [];
        try {
            const sourceBytes = await readFileBuffer(pickedFile);
            const cleanedBytes = await dropPngTextPayloads(sourceBytes, ['ccv3', 'chara']);
            portraitFile = new File([cleanedBytes], 'card-portrait.png', {type: 'image/png'});
        } catch (error) {
            portraitWarnings.push({
                code: 'PNG_PORTRAIT_FAILED',
                message: `The PNG portrait could not be prepared as a main icon asset: ${error.message}`,
            });
        }

        await commitImportedCard(importedCard, {
            format: chunk.keyword === 'ccv3' ? 'PNG (ccv3)' : 'PNG (chara / V2)',
            portraitFile,
            warnings: [...parseWarnings, ...resolutionWarnings, ...portraitWarnings],
        });
    };

    async function handleCardFile(event, lorebookOnly = false) {
        const pickedFile = event.target.files?.[0];
        if (!pickedFile) return;
        if (!lorebookOnly) setFile(pickedFile);

        if (/.+\.png$/i.test(pickedFile.name)) {
            let parsed;
            try {
                parsed = await extractPngTextPayloads(pickedFile, ['ccv3', 'chara']);
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

            const resolution = resolveEmbeddedCard(chunks);
            if (!resolution.selected) {
                notify({
                    title: 'PNG contains no card data',
                    severity: 'error',
                    message: 'This PNG has no readable ccv3 or chara chunk.',
                    warnings: [...parseWarnings, ...resolution.warnings],
                });
                return;
            }

            const context = {
                lorebookOnly,
                parseWarnings,
                pickedFile,
                resolutionWarnings: resolution.warnings,
            };

            if (resolution.needsChoice) {
                setEmbeddedChoice({
                    ...context,
                    candidates: resolution.candidates,
                });
                return;
            }

            await applyPngChunk(resolution.selected, context);
        } else if (/.+\.charx$/i.test(pickedFile.name)) {
            setImportProgress({ message: 'Reading CHARX…' });
            try {
                const { default: importCharx } = await import('../../charx/charxImport');
                const imported = await importCharx(pickedFile, { onProgress: setImportProgress });
                if (lorebookOnly) {
                    const lorebook = imported.card?.data?.character_book;
                    if (!lorebook) {
                        notify({
                            title: 'No lorebook found',
                            severity: 'error',
                            message: 'The selected CHARX does not contain a character_book.',
                        });
                        return;
                    }
                    applyLorebook(lorebook);
                    return;
                }
                await commitImportedCard(imported.card, {
                    format: 'CHARX',
                    warnings: imported.warnings,
                });
            } catch (error) {
                notify({ title: 'CHARX import failed', severity: 'error', message: error.message });
            } finally {
                setImportProgress(null);
            }
        } else if (/.+\.json$/i.test(pickedFile.name)) {
            let jsonPayload;
            try {
                jsonPayload = JSON.parse(await pickedFile.text());
            } catch (error) {
                notify({
                    title: 'JSON import failed',
                    severity: 'error',
                    message: `The selected file is not valid JSON: ${error.message}`,
                });
                return;
            }

            if (lorebookOnly) {
                const isLorebookFile = typeof jsonPayload === 'object'
                    && jsonPayload !== null
                    && jsonPayload.spec === 'lorebook_v3';
                const lorebookSource = isLorebookFile ? jsonPayload.data : jsonPayload?.data?.character_book;
                if (typeof lorebookSource === 'undefined') {
                    notify({
                        title: 'No lorebook found',
                        severity: 'error',
                        message: 'This JSON has no lorebook attached.',
                    });
                    return;
                }
                applyLorebook(normalizeCharacterBook(lorebookSource));
                return;
            }

            await commitImportedCard(jsonPayload, { format: 'JSON' });
        } else {
            notify({
                title: 'Unsupported file type',
                severity: 'error',
                message: 'Unsupported file. Choose a .charx, .json, or .png card.',
            });
        }
    }

    const applyPortraitResize = async (dataUrl) => {
        await applyCompression(dataUrl);
        setResizeDialogOpen(false);
    };

    const clearCard = async () => {
        const newCard = createNewCard();
        try {
            await clearAllAssets();
        } catch (error) {
            console.warn('Could not clear asset storage:', error);
        }
        setFile(null);
        setConfirmClear(false);
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

    // Serializing the full card on each keystroke is not free with large lorebooks, so the size
    // estimate below trails the editor at low priority instead of running synchronously.
    const deferredCard = useDeferredValue(cardData);
    const cardChunkEstimate = useMemo(() => estimateCardPayloadBytes(deferredCard), [deferredCard]);
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
                <CardFilePicker
                    allowedExtensions=".json,.png,.charx"
                    file={file}
                    onFileChange={handleCardFile}
                    onRemove={() => setConfirmClear(true)}
                    showRemoveButton
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
            {!isMobile && !PORTRAITLESS_SECTIONS.has(activeSection) && (
                <FormControlLabel
                    control={<Checkbox checked={portraitVisible} onChange={() => setPortraitVisible(!portraitVisible)} size="small" />}
                    label="Show portrait"
                    sx={{ mr: 0, whiteSpace: 'nowrap' }}
                />
            )}
            {activeSection === 4 && (
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
                <PortraitResizeDialog
                    onCommit={applyPortraitResize}
                    onDismiss={() => setResizeDialogOpen(false)}
                    open={resizeDialogOpen}
                    portraitSource={portraitSource}
                />
            </Suspense>
            <Suspense fallback={null}>
                <LinkedMediaImportDialog
                    onClose={() => setLinkedMediaPromptOpen(false)}
                    open={linkedMediaPromptOpen}
                />
            </Suspense>
            <EmbeddedCardDialog
                candidates={embeddedChoice?.candidates ?? []}
                onCancel={() => setEmbeddedChoice(null)}
                onSelect={(candidate) => {
                    const pending = embeddedChoice;
                    setEmbeddedChoice(null);
                    if (pending) void applyPngChunk(candidate.chunk, pending);
                }}
                open={Boolean(embeddedChoice)}
            />
            <ConfirmActionDialog
                dialogContent="This wipes every field of the card. There is no undo — export first if unsure."
                dialogTitle="Clear all fields?"
                handleClose={() => setConfirmClear(false)}
                handleConfirm={clearCard}
                open={confirmClear}
            />
            <ConfirmActionDialog
                dialogContent="This will replace every field in the current card. Export a backup first if you may need the old version."
                dialogTitle="Replace the entire card?"
                handleClose={cancelOverwrite}
                handleConfirm={confirmOverwrite}
                open={replacementPending}
            />

            {!showPortraitPanel
                && !PORTRAITLESS_SECTIONS.has(activeSection)
                && (!isMobile || activeSection === 0)
                && fileToolbar}

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
                            flex: { xs: '0 0 auto', md: '0 0 400px' },
                            flexDirection: 'column',
                            gap: 2,
                            maxWidth: '100%',
                            minHeight: 0,
                            minWidth: 0,
                        }}
                    >
                        {fileToolbar}
                        <PortraitPanel
                            displayPortrait={portraitSource}
                            fileName={file ? file.name : 'Uploaded portrait'}
                            onCompress={() => setResizeDialogOpen(true)}
                            onUpload={handlePortraitUpload}
                            sizeHint={activeSection === 0 && exportBytes !== null
                                ? `Portrait ${formatByteSize(exportBytes)} + card data ${formatByteSize(cardChunkEstimate)}`
                                : undefined}
                            sizeLabel={activeSection === 0 && exportBytes !== null
                                ? `PNG size: ${formatByteSize(exportBytes + cardChunkEstimate)}`
                                : undefined}
                        />
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
                        <Box sx={{ flex: 1, mr: { xs: 0, md: -1 }, overflow: 'auto', pr: { xs: 0, md: 1 } }}>
                            {isMobile && activeSection === 0 && portraitVisible && (
                                <Box sx={{ mb: 2 }}>
                                    <PortraitPanel
                                        compact
                                        displayPortrait={portraitSource}
                                        fileName={file ? file.name : 'Uploaded portrait'}
                                        onCompress={() => setResizeDialogOpen(true)}
                                        onUpload={handlePortraitUpload}
                                        sizeHint={exportBytes !== null
                                            ? `Portrait ${formatByteSize(exportBytes)} + card data ${formatByteSize(cardChunkEstimate)}`
                                            : undefined}
                                        sizeLabel={exportBytes !== null
                                            ? `PNG size: ${formatByteSize(exportBytes + cardChunkEstimate)}`
                                            : undefined}
                                    />
                                </Box>
                            )}
                            {activeSection === 4 && (
                                <SectionHeader
                                    actions={panelActions}
                                    description={activeSectionMeta.hint}
                                    sx={{ flexWrap: 'wrap', mb: 1, rowGap: 1 }}
                                    title={activeSectionMeta.label}
                                />
                            )}
                            <Suspense fallback={<LinearProgress aria-label="Loading section" sx={{ mt: 2 }} />}>
                                <SectionComponent
                                    {...(activeSection === 4 ? {
                                        onImportFile: (event) => handleCardFile(event, true),
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

export default CardWorkspace;
