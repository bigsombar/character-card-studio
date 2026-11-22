import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';

import { measureImageAssets, presetsForImages } from '../../assets/assetCompression';
import { MP_PRESETS, shrinksAt } from '../../utils/imageSizing';

/**
 * Batch megapixel picker for image assets. Unlike the portrait dialog it has no preview: the
 * target applies to every locally stored image, and images already below the target are skipped.
 *
 * @param {Array<Object>} assets Current card asset metadata
 * @param {boolean} open
 * @param {Function} onClose
 * @param {Function} onCompress Runs the batch and returns the summary
 * @param {Function} onComplete Called with the compression summary after a successful run
 */
export default function CompressAssetsDialog({ assets, onClose, onCompress, onComplete, open }) {
    const [measurement, setMeasurement] = useState(null);
    const [measureProgress, setMeasureProgress] = useState({ checked: 0, total: 0 });
    const [phase, setPhase] = useState('preparing');
    const [progress, setProgress] = useState({ asset: null, completed: 0, total: 0 });
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;
        setMeasurement(null);
        setError(null);
        setPhase('preparing');
        setMeasureProgress({ checked: 0, total: assets?.length ?? 0 });
        setProgress({ asset: null, completed: 0, total: 0 });
        setSelected(null);

        measureImageAssets(assets, { onProgress: setMeasureProgress })
            .then((result) => {
                if (cancelled) return;
                const presets = presetsForImages(result.images, MP_PRESETS);
                setMeasurement({ ...result, presets });
                setSelected(presets.includes(1) ? 1 : presets[0] ?? null);
                setPhase('ready');
            })
            .catch((measureError) => {
                if (cancelled) return;
                setError(`Image assets could not be inspected: ${measureError.message}`);
                setPhase('ready');
            });

        return () => {
            cancelled = true;
        };
    }, [assets, open]);

    const running = phase === 'compressing';
    const preparing = phase === 'preparing';

    const affected = useMemo(() => {
        if (!measurement || selected === null) return 0;
        return measurement.images.filter((image) => (
            shrinksAt(image.width, image.height, selected)
        )).length;
    }, [measurement, selected]);

    const handleClose = (event, reason) => {
        if (running) return;
        onClose?.(event, reason);
    };

    const handleCompress = async () => {
        if (selected === null || running) return;

        setError(null);
        setProgress({ asset: null, completed: 0, total: 0 });
        setPhase('compressing');

        try {
            const result = await onCompress(selected, { onProgress: setProgress });
            onComplete?.(result);
        } catch (compressionError) {
            setError(`Image compression failed: ${compressionError.message}`);
            setPhase('ready');
        }
    };

    const percent = progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;
    const currentName = progress.asset?.name || progress.asset?.uri || '';

    return (
        <Dialog
            aria-describedby="compress-assets-hint"
            aria-labelledby="compress-assets-title"
            fullWidth
            maxWidth="sm"
            onClose={handleClose}
            open={open}
        >
            <DialogTitle id="compress-assets-title">Compress image assets</DialogTitle>
            <DialogContent>
                <DialogContentText id="compress-assets-hint" sx={{ mb: 2 }} variant="body2">
                    Pick a target size for every image asset. Larger images are resized and images
                    that are already small enough are left untouched. For roleplay apps, 1 MP is
                    more than enough.
                </DialogContentText>

                {preparing && (
                    <Box sx={{ py: 2 }}>
                        <LinearProgress
                            aria-label="Checking image asset sizes"
                            value={measureProgress.total > 0
                                ? Math.round((measureProgress.checked / measureProgress.total) * 100)
                                : undefined}
                            variant={measureProgress.total > 0 ? 'determinate' : 'indeterminate'}
                        />
                        <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                            Checking image sizes…
                            {measureProgress.total > 0
                                ? ` ${measureProgress.checked} of ${measureProgress.total}`
                                : ''}
                        </Typography>
                    </Box>
                )}

                {!preparing && measurement && measurement.presets.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography color="text.secondary" variant="overline">Target size</Typography>
                        <ToggleButtonGroup
                            aria-label="Target size"
                            disabled={running}
                            exclusive
                            fullWidth
                            onChange={(event, nextTarget) => {
                                if (nextTarget !== null) setSelected(nextTarget);
                            }}
                            size="small"
                            value={selected}
                        >
                            {measurement.presets.map((megapixels) => (
                                <ToggleButton key={megapixels} value={megapixels}>
                                    {megapixels} MP
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                )}

                {!preparing && measurement?.images.length === 0 && !error && (
                    <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                        No locally stored PNG, JPEG or WebP images were found. Remote, GIF and AVIF
                        assets are left as they are.
                    </Typography>
                )}

                {!preparing && measurement && measurement.images.length > 0
                    && measurement.presets.length === 0 && !error && (
                    <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                        Every image is already small enough, so there is nothing to shrink.
                    </Typography>
                )}

                {running && (
                    <Box sx={{ py: 1 }}>
                        <LinearProgress
                            aria-label="Image asset compression progress"
                            sx={{ borderRadius: 1, height: 6 }}
                            value={percent}
                            // A single large file would otherwise leave a determinate bar at zero
                            // for the whole resize, which looks frozen.
                            variant={progress.completed === 0 ? 'indeterminate' : 'determinate'}
                        />
                        <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                            {currentName
                                ? `Compressing ${currentName}… ${progress.completed} of ${progress.total}`
                                : `Preparing ${progress.total} image${progress.total === 1 ? '' : 's'}…`}
                        </Typography>
                    </Box>
                )}

                {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{ alignItems: 'center', gap: 1, justifyContent: 'space-between', px: 3, pb: 2 }}>
                <Box sx={{ alignItems: 'center', display: 'flex', minHeight: 24 }}>
                    {!preparing && measurement?.presets.length > 0 && selected !== null && (
                        <Typography
                            color="text.secondary"
                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                            variant="body2"
                        >
                            {affected} of {measurement.images.length}
                            {' '}supported image{measurement.images.length === 1 ? '' : 's'} will be resized.
                        </Typography>
                    )}
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button disabled={running} onClick={() => onClose?.()} variant="outlined">Cancel</Button>
                    <Button
                        disabled={running || preparing || selected === null || affected === 0}
                        onClick={handleCompress}
                        variant="contained"
                    >
                        {running ? 'Compressing…' : 'Compress images'}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
