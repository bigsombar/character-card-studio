import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    FormControlLabel,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import AudiotrackOutlined from '@mui/icons-material/AudiotrackOutlined';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import CloudDownloadOutlined from '@mui/icons-material/CloudDownloadOutlined';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import MovieOutlined from '@mui/icons-material/MovieOutlined';
import PublishedWithChangesOutlined from '@mui/icons-material/PublishedWithChangesOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';

import { downloadRemoteMedia } from '../../assets/downloadMedia';
import { availableProxiesFor } from '../../assets/corsProxies';
import { collectRemoteMedia, remoteAssetName, replaceTextReferences } from '../../assets/remoteMedia';
import { useAssets } from '../../context/AssetContext';
import { useCard } from '../../context/cardContext';
import { useNotifications } from '../../context/NotificationContext';
import { getAsset, listAssets } from '../../storage/assetStore';
import formatBytes from '../../utils/formatBytes';
import useProxyConsent from '../../hooks/useProxyConsent';
import ProxyConsentDialog from './ProxyConsentDialog';

const PROXY_TIMEOUT_MS = 5_000;
const MAX_CONCURRENT_DOWNLOADS = 4;
const RETRYABLE_HTTP_STATUS = new Set([401, 403, 429, 451, 500, 502, 503, 504]);

function shouldTryProxy(error) {
    if (['NETWORK', 'HTML', 'TIMEOUT'].includes(error?.code)) return true;
    return error?.code === 'HTTP' && RETRYABLE_HTTP_STATUS.has(error.status);
}

const TYPE_BY_KIND = {
    image: 'other',
    audio: 'x_audio',
    video: 'x_video',
};

const KIND_ICON = {
    image: <ImageOutlined fontSize="small" />,
    audio: <AudiotrackOutlined fontSize="small" />,
    video: <MovieOutlined fontSize="small" />,
};

function isReady(status) {
    return status === 'done' || status === 'exists';
}

/**
 * Scans the card for remote media links, downloads them into IndexedDB, and replaces the URLs in
 * every text field with the resulting `embeded://` asset URIs.
 */
export default function LinkedMediaPanel({compact = false, showDescription = true, allowProxies = true}) {
    const {cardData, setCardData} = useCard();
    const {addFile} = useAssets();
    const {notify} = useNotifications();
    const proxyConsent = useProxyConsent();
    const proxiesActive = allowProxies && proxyConsent.enabled;

    const references = useMemo(() => collectRemoteMedia(cardData), [cardData]);
    const [items, setItems] = useState({});
    const [running, setRunning] = useState(false);
    const [replacing, setReplacing] = useState(false);
    const abortRef = useRef(null);

    useEffect(() => () => {
        abortRef.current?.abort();
    }, []);

    const localByUrl = useMemo(() => {
        const names = new Map((cardData?.data?.assets ?? []).map((asset) => [asset.name, asset]));
        const result = {};
        for (const reference of references) {
            const asset = names.get(remoteAssetName(reference.url));
            if (asset) result[reference.url] = asset.uri;
        }
        return result;
    }, [cardData?.data?.assets, references]);

    const updateItem = useCallback((url, patch) => {
        setItems((previous) => ({...previous, [url]: {...previous[url], ...patch}}));
    }, []);

    const downloadOne = useCallback(async (reference, signal, proxyOffset = 0) => {
        const existingUri = localByUrl[reference.url];
        if (existingUri) {
            const record = await getAsset(existingUri);
            if (record) {
                updateItem(reference.url, {
                    status: 'exists',
                    stage: 'local',
                    uri: existingUri,
                    size: record.size,
                    error: null,
                });
                return;
            }
            // Metadata survived but the blob did not. Drop the stale entry and fetch a fresh copy.
            setCardData((previous) => ({
                ...previous,
                data: {
                    ...previous.data,
                    assets: (previous.data.assets ?? []).filter((asset) => asset.uri !== existingUri),
                },
            }));
        }

        updateItem(reference.url, {
            status: 'downloading',
            stage: 'Direct',
            error: null,
            loaded: 0,
            total: null,
            progress: 0,
        });

        const name = remoteAssetName(reference.url);
        const reusable = (await listAssets()).find((record) => record.name === name);
        if (reusable) {
            const type = TYPE_BY_KIND[reusable.mediaKind] ?? 'other';
            setCardData((previous) => {
                const assets = previous.data.assets ?? [];
                if (assets.some((asset) => asset.uri === reusable.uri)) return previous;
                return {
                    ...previous,
                    data: {
                        ...previous.data,
                        assets: [...assets, {type, uri: reusable.uri, name: reusable.name, ext: reusable.ext}],
                    },
                };
            });
            updateItem(reference.url, {
                status: 'exists',
                stage: 'local',
                uri: reusable.uri,
                size: reusable.size,
                loaded: reusable.size,
                total: reusable.size,
                progress: 100,
                error: null,
            });
            return;
        }

        let lastUpdate = 0;
        const handleProgress = ({loaded, total}) => {
            const now = Date.now();
            if (now - lastUpdate < 120 && loaded !== total) return;
            lastUpdate = now;
            updateItem(reference.url, {
                loaded,
                total,
                progress: total ? Math.min(100, (loaded / total) * 100) : null,
            });
        };

        let result;
        let route = 'Direct';

        try {
            result = await downloadRemoteMedia(reference.url, {
                expectedKind: reference.kind,
                onProgress: handleProgress,
                signal,
            });
        } catch (error) {
            if (signal.aborted) throw error;
            if (!proxiesActive || !shouldTryProxy(error)) throw error;

            const available = availableProxiesFor(reference.url, reference.kind);
            if (available.length === 0) throw error;

            const preferred = available.filter((proxy) => proxy.preferred);
            const start = preferred.length > 0
                ? preferred[proxyOffset % preferred.length]
                : available[proxyOffset % available.length];
            const attempts = [start, ...available.filter((proxy) => proxy !== start)];

            // cors.dev is the most reliable generic route; keep it as the second attempt when a
            // file starts on a less-known fallback, so parallel files do not all queue behind it.
            if (start.id !== 'cors-dev') {
                const corsDevIndex = attempts.findIndex((proxy) => proxy.id === 'cors-dev');
                if (corsDevIndex > 1) {
                    const [corsDev] = attempts.splice(corsDevIndex, 1);
                    attempts.splice(1, 0, corsDev);
                }
            }

            const failures = [];
            for (const proxy of attempts) {
                if (signal.aborted) throw error;
                updateItem(reference.url, {
                    stage: proxy.name,
                    loaded: 0,
                    total: null,
                    progress: 0,
                });
                try {
                    result = await downloadRemoteMedia(reference.url, {
                        expectedKind: reference.kind,
                        onProgress: handleProgress,
                        proxy,
                        signal,
                        timeoutMs: PROXY_TIMEOUT_MS,
                    });
                    route = proxy.name;
                    break;
                } catch (proxyError) {
                    if (signal.aborted) throw proxyError;
                    failures.push(`${proxy.name}: ${proxyError.message}`);
                }
            }

            if (!result) {
                throw new Error(
                    `Direct download failed (${error.message}). Proxy attempts failed: ${failures.join('; ')}`,
                    {cause: error},
                );
            }
        }

        const file = new File([result.blob], `${name}.${result.ext}`, {type: result.mime});
        const metadata = await addFile(file, {
            type: TYPE_BY_KIND[result.kind] ?? 'other',
            name,
        });

        updateItem(reference.url, {
            status: 'done',
            stage: route,
            uri: metadata.uri,
            size: result.size,
            loaded: result.size,
            total: result.size,
            progress: 100,
            error: null,
        });
    }, [addFile, localByUrl, proxiesActive, setCardData, updateItem]);

    const startDownloads = useCallback(async (urls) => {
        if (running) return;
        const targets = references.filter((reference) => urls.includes(reference.url));
        if (targets.length === 0) return;

        setRunning(true);
        const controller = new AbortController();
        abortRef.current = controller;
        let cursor = 0;

        const worker = async () => {
            for (;;) {
                if (controller.signal.aborted) return;
                const index = cursor;
                cursor += 1;
                if (index >= targets.length) return;
                const reference = targets[index];
                try {
                    await downloadOne(reference, controller.signal, index);
                } catch (error) {
                    if (controller.signal.aborted) {
                        updateItem(reference.url, {status: 'cancelled', error: null});
                        return;
                    }
                    const hint = allowProxies && !proxyConsent.enabled && shouldTryProxy(error)
                        ? ' Enable third-party proxies above to try fallback routes.'
                        : '';
                    updateItem(reference.url, {
                        status: 'error',
                        stage: null,
                        error: `${error.message}${hint}`,
                    });
                }
            }
        };

        try {
            const workers = Array.from(
                {length: Math.min(MAX_CONCURRENT_DOWNLOADS, targets.length)},
                () => worker(),
            );
            await Promise.all(workers);
        } finally {
            setRunning(false);
            abortRef.current = null;
        }
    }, [allowProxies, downloadOne, proxyConsent.enabled, references, running, updateItem]);

    const cancelDownloads = () => {
        abortRef.current?.abort();
    };

    const replaceLinks = async () => {
        if (replacing) return;
        setReplacing(true);
        const mapping = {};
        let missing = 0;

        try {
            for (const reference of references) {
                let uri = items[reference.url]?.uri ?? localByUrl[reference.url];
                if (uri) {
                    const record = await getAsset(uri).catch(() => null);
                    if (!record) uri = null;
                }
                if (uri) mapping[reference.url] = uri;
                else missing += 1;
            }
        } finally {
            setReplacing(false);
        }

        if (Object.keys(mapping).length === 0) {
            notify({
                title: 'Nothing to replace',
                severity: 'warning',
                message: 'Download the linked media first, or retry the links that failed.',
            });
            return;
        }

        const {card, replacements} = replaceTextReferences(cardData, mapping);
        setCardData(card);
        setItems({});
        notify({
            title: 'Links replaced',
            severity: missing > 0 ? 'warning' : 'success',
            message: missing > 0
                ? `${replacements} link(s) now point to local assets. ${missing} link(s) were skipped because no local copy is available.`
                : `${replacements} link(s) now point to local assets stored in IndexedDB.`,
        });
    };

    const statusFor = (url) => items[url] ?? (localByUrl[url]
        ? {status: 'exists', uri: localByUrl[url]}
        : {status: 'idle'});

    const readyCount = references.filter((reference) => isReady(statusFor(reference.url).status)).length;
    const failedCount = references.filter((reference) => statusFor(reference.url).status === 'error').length;
    const finishedCount = references.filter((reference) => (
        ['done', 'exists', 'error', 'cancelled'].includes(statusFor(reference.url).status)
    )).length;
    const activeStates = references
        .map((reference) => statusFor(reference.url))
        .filter((status) => status.status === 'downloading');
    const activeCount = activeStates.length;
    const inFlightFraction = activeStates.reduce((sum, status) => (
        sum + (status.total ? Math.min(1, (status.loaded ?? 0) / status.total) : 0)
    ), 0);
    const overall = references.length > 0
        ? Math.min(100, ((finishedCount + inFlightFraction) / references.length) * 100)
        : 0;
    const hasKnownProgress = activeStates.some((status) => status.total);

    const kindCounts = references.reduce((counts, reference) => {
        counts[reference.kind] = (counts[reference.kind] ?? 0) + 1;
        return counts;
    }, {});
    const occurrences = references.reduce((total, reference) => total + reference.occurrences, 0);

    if (references.length === 0) {
        return (
            <Alert severity="info">
                No external image, GIF, audio or video links were found in the card text fields.
            </Alert>
        );
    }

    return (
        <>
            <Stack spacing={2}>
            {showDescription && (
                <Typography color="text.secondary" variant="body2">
                    Links found in descriptions, greetings, prompts, multilingual notes and lorebook entries can be
                    downloaded into the local asset database. Only HTTPS links are accepted; hosts that block browser
                    downloads need the opt-in proxy fallback below. Direct limits are 20 MB per image, 50 MB per audio
                    file and 250 MB per video.
                </Typography>
            )}

            <Stack direction="row" sx={{alignItems: 'center', flexWrap: 'wrap', gap: 1}}>
                <Chip label={`${references.length} unique link${references.length === 1 ? '' : 's'}`} size="small" />
                <Chip label={`${occurrences} occurrence${occurrences === 1 ? '' : 's'}`} size="small" variant="outlined" />
                {Object.entries(kindCounts).map(([kind, count]) => (
                    <Chip
                        icon={KIND_ICON[kind]}
                        key={kind}
                        label={`${count} ${kind}`}
                        size="small"
                        variant="outlined"
                    />
                ))}
                {readyCount > 0 && <Chip color="success" label={`${readyCount} local`} size="small" />}
            </Stack>

            {allowProxies && (
                <Box
                    sx={{
                        bgcolor: 'rgba(255, 101, 47, 0.07)',
                        border: 1,
                        borderColor: 'rgba(255, 101, 47, 0.45)',
                        borderRadius: 2,
                        p: 1.25,
                    }}
                >
                    <Stack direction="row" sx={{alignItems: 'center', flexWrap: 'wrap', gap: 1}}>
                        <FormControlLabel
                            control={(
                                <Checkbox
                                    checked={proxyConsent.enabled}
                                    disabled={running}
                                    onChange={(event) => proxyConsent.requestChange(event.target.checked)}
                                    sx={{
                                        color: 'error.main',
                                        '&.Mui-checked': {color: 'error.main'},
                                    }}
                                />
                            )}
                            label="Enable third-party proxies for CORS-protected media"
                            sx={{
                                mr: 0,
                                '& .MuiFormControlLabel-label': {fontSize: '0.86rem', fontWeight: 600},
                            }}
                        />
                        <Chip color="error" label="Risky" size="small" variant="outlined" />
                    </Stack>
                    <Typography color="text.secondary" sx={{display: 'block', mt: 0.5}} variant="caption">
                        Only tries public CORS services after a direct download fails. Files download in parallel,
                        each proxy gets up to 5 seconds to respond, and services can see the requested URL and the
                        file. They may impose their own size limits (cors.dev currently caps responses at 6 MB) and
                        require a one-time risk confirmation.
                    </Typography>
                </Box>
            )}

            {(running || finishedCount > 0) && (
                <Box>
                    <LinearProgress
                        aria-label="Media download progress"
                        sx={{borderRadius: 1, height: 6}}
                        value={overall}
                        variant={running && !hasKnownProgress ? 'indeterminate' : 'determinate'}
                    />
                    <Typography color="text.secondary" sx={{mt: 0.75}} variant="caption">
                        {`${finishedCount} of ${references.length} processed`}
                        {running && activeCount > 0 ? ` · ${activeCount} downloading in parallel` : ''}
                    </Typography>
                </Box>
            )}

            {failedCount > 0 && (
                <Alert severity="warning">
                    {failedCount} link{failedCount === 1 ? '' : 's'} could not be downloaded. Retry failed links,
                    or replace only the ones that succeeded.
                </Alert>
            )}

            <Stack direction="row" sx={{flexWrap: 'wrap', gap: 1}}>
                <Button
                    disabled={running || replacing || readyCount === references.length}
                    onClick={() => startDownloads(references.map((reference) => reference.url))}
                    startIcon={<CloudDownloadOutlined />}
                    variant="contained"
                >
                    {readyCount === references.length ? 'All media downloaded' : 'Download linked media'}
                </Button>
                {failedCount > 0 && (
                    <Button
                        disabled={running || replacing}
                        onClick={() => startDownloads(
                            references
                                .filter((reference) => statusFor(reference.url).status === 'error')
                                .map((reference) => reference.url),
                        )}
                        startIcon={<ReplayOutlined />}
                        variant="outlined"
                    >
                        Retry failed
                    </Button>
                )}
                <Button
                    disabled={running || replacing || readyCount === 0}
                    onClick={replaceLinks}
                    startIcon={<PublishedWithChangesOutlined />}
                    variant="outlined"
                >
                    Replace links with local assets
                </Button>
                {running && (
                    <Button color="error" onClick={cancelDownloads} variant="text">
                        Cancel
                    </Button>
                )}
            </Stack>

            <List
                dense
                disablePadding
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    maxHeight: compact ? 220 : 340,
                    overflow: 'auto',
                }}
            >
                {references.map((reference) => {
                    const status = statusFor(reference.url);
                    const state = status.status;
                    return (
                        <ListItem
                            alignItems="flex-start"
                            divider
                            key={reference.url}
                            sx={{gap: 1, px: 1.5, py: 1}}
                        >
                            <Box sx={{color: 'text.secondary', mt: 0.4}}>
                                {KIND_ICON[reference.kind] ?? KIND_ICON.image}
                            </Box>
                            <Box sx={{flex: 1, minWidth: 0}}>
                                <Typography
                                    sx={{
                                        display: 'block',
                                        fontSize: '0.78rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={reference.url}
                                >
                                    {reference.url}
                                </Typography>
                                {state === 'downloading' && (
                                    <LinearProgress
                                        sx={{borderRadius: 1, height: 4, mt: 0.75}}
                                        value={status.progress ?? 0}
                                        variant={status.total ? 'determinate' : 'indeterminate'}
                                    />
                                )}
                                {state === 'downloading' && (
                                    <Typography color="text.secondary" variant="caption">
                                        {status.stage && status.stage !== 'Direct' ? `${status.stage} · ` : ''}
                                        {status.total
                                            ? `${formatBytes(status.loaded ?? 0)} of ${formatBytes(status.total)}`
                                            : `${formatBytes(status.loaded ?? 0)} downloaded`}
                                    </Typography>
                                )}
                                {state === 'done' && (
                                    <Typography color="text.secondary" variant="caption">
                                        Saved locally · {formatBytes(status.size ?? 0)}
                                        {status.stage && status.stage !== 'Direct' && status.stage !== 'local'
                                            ? ` · via ${status.stage}`
                                            : ''}
                                    </Typography>
                                )}
                                {state === 'exists' && (
                                    <Typography color="text.secondary" variant="caption">
                                        Already available in local assets
                                    </Typography>
                                )}
                                {state === 'cancelled' && (
                                    <Typography color="text.secondary" variant="caption">
                                        Download cancelled
                                    </Typography>
                                )}
                                {state === 'error' && (
                                    <Typography color="error" sx={{display: 'block'}} variant="caption">
                                        {status.error}
                                    </Typography>
                                )}
                            </Box>
                            {state === 'downloading' && <CircularProgress size={18} sx={{mt: 0.4}} />}
                            {(state === 'done' || state === 'exists') && (
                                <CheckCircleOutlineRounded color="success" fontSize="small" sx={{mt: 0.4}} />
                            )}
                            {state === 'error' && (
                                <>
                                    <ErrorOutlineRounded color="error" fontSize="small" sx={{mt: 0.4}} />
                                    <Tooltip title="Retry this link">
                                        <span>
                                            <IconButton
                                                aria-label="Retry this link"
                                                disabled={running || replacing}
                                                onClick={() => startDownloads([reference.url])}
                                                size="small"
                                            >
                                                <ReplayOutlined fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </>
                            )}
                        </ListItem>
                    );
                })}
            </List>
            </Stack>
            {allowProxies && (
                <ProxyConsentDialog
                    onCancel={proxyConsent.cancel}
                    onConfirm={proxyConsent.confirm}
                    open={proxyConsent.dialogOpen}
                />
            )}
        </>
    );
}
