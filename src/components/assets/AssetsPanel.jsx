import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    InputAdornment,
    LinearProgress,
    TextField,
    Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Compress from '@mui/icons-material/Compress';
import DeleteSweepOutlined from '@mui/icons-material/DeleteSweepOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import Search from '@mui/icons-material/Search';

import { mediaKindForAsset, MEDIA_KIND } from '../../assets/media';
import { useAssets } from '../../context/AssetContext';
import { useCard } from '../../context/cardContext';
import { useNotifications } from '../../context/NotificationContext';
import { getStorageEstimate } from '../../storage/assetStore';
import { formatBytesShort } from '../../utils/blob';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import AddAssetsDialog from './AddAssetsDialog';
import AssetCard from './AssetCard';
import AssetDetailsDialog from './AssetDetailsDialog';
import CompressAssetsDialog from './CompressAssetsDialog';

const FILTERS = [
    {value: 'all', label: 'All'},
    {value: MEDIA_KIND.image, label: 'Images'},
    {value: MEDIA_KIND.audio, label: 'Audio'},
    {value: MEDIA_KIND.video, label: 'Video'},
];

export default function AssetsPanel() {
    const { cardData } = useCard();
    const {
        assetVersion,
        busy,
        cleanOrphanAssets,
        compressImageAssets,
        deleteAsset,
        replaceAsset,
        setMain,
    } = useAssets();
    const { notify } = useNotifications();
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [compressOpen, setCompressOpen] = useState(false);
    const [selectedUri, setSelectedUri] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingClean, setPendingClean] = useState(false);
    const [storage, setStorage] = useState(null);
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getStorageEstimate()
            .then((estimate) => { if (!cancelled) setStorage(estimate); })
            .catch(() => { if (!cancelled) setStorage(null); });
        return () => { cancelled = true; };
    }, [assetVersion]);

    const assets = useMemo(() => cardData.data.assets ?? [], [cardData.data.assets]);
    const selectedAsset = assets.find((asset) => asset.uri === selectedUri) ?? null;

    const counts = useMemo(() => {
        const result = {all: assets.length, image: 0, audio: 0, video: 0, other: 0};
        for (const asset of assets) result[mediaKindForAsset(asset)] += 1;
        return result;
    }, [assets]);

    const visibleAssets = useMemo(() => {
        const query = search.trim().toLowerCase();
        return assets.filter((asset) => {
            if (filter !== 'all' && mediaKindForAsset(asset) !== filter) return false;
            if (!query) return true;
            return `${asset.name} ${asset.type} ${asset.ext}`.toLowerCase().includes(query);
        });
    }, [assets, filter, search]);

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            await deleteAsset(pendingDelete.uri);
            if (selectedUri === pendingDelete.uri) setSelectedUri(null);
            setNotice(null);
        } catch (error) {
            setNotice({severity: 'error', message: `Could not delete asset: ${error.message}`});
        } finally {
            setPendingDelete(null);
        }
    };

    const handleReplace = async (uri, file) => {
        try {
            await replaceAsset(uri, file);
            setNotice({severity: 'success', message: 'Asset replaced.'});
        } catch (error) {
            setNotice({severity: 'error', message: `Could not replace asset: ${error.message}`});
        }
    };

    const handleCompressed = (result) => {
        setCompressOpen(false);

        const resized = result.resized.length;
        const failed = result.failed.length;
        const alreadySmall = result.skipped.filter((item) => item.reason === 'small').length;
        const parts = [];

        if (resized > 0) {
            parts.push(`${resized} image${resized === 1 ? '' : 's'} resized`);
            if (result.savedBytes > 0) parts.push(`${formatBytesShort(result.savedBytes)} freed`);
        } else if (failed === 0) {
            parts.push('No images needed resizing');
        }
        if (alreadySmall > 0) {
            parts.push(
                `${alreadySmall} image${alreadySmall === 1 ? ' was' : 's were'} already small enough`,
            );
        }
        if (failed > 0) {
            parts.push(`${failed} image${failed === 1 ? '' : 's'} could not be resized`);
        }

        notify({
            title: resized > 0
                ? 'Image assets compressed'
                : failed > 0 ? 'Compression failed' : 'Nothing to compress',
            severity: failed > 0 ? (resized > 0 ? 'warning' : 'error') : 'success',
            message: `${parts.join('. ')}${parts.length > 0 ? '.' : ''}`,
        });
    };

    const handleCleanOrphans = async () => {
        try {
            const removed = await cleanOrphanAssets();
            notify({
                title: removed.length > 0 ? 'Orphaned files removed' : 'Nothing to clean',
                severity: 'success',
                message: removed.length > 0
                    ? `${removed.length} unreferenced file${removed.length === 1 ? ' was' : 's were'} removed from IndexedDB.`
                    : 'Every stored file is referenced by the current card.',
            });
        } catch (error) {
            notify({ title: 'Cleanup failed', severity: 'error', message: error.message });
        } finally {
            setPendingClean(false);
        }
    };

    return (
        <Box>
            <Box sx={{alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', mb: 2}}>
                <Box sx={{alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 1}}>
                    {FILTERS.map((item) => (
                        <Chip
                            color={filter === item.value ? 'primary' : 'default'}
                            key={item.value}
                            label={`${item.label} (${counts[item.value] ?? 0})`}
                            onClick={() => setFilter(item.value)}
                            variant={filter === item.value ? 'filled' : 'outlined'}
                        />
                    ))}
                </Box>
                <Box sx={{alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end'}}>
                    <TextField
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search assets"
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                                ),
                            },
                        }}
                        value={search}
                    />
                    <Button onClick={() => setAddOpen(true)} startIcon={<Add />} variant="contained">
                        Add media
                    </Button>
                    <Button
                        disabled={counts.image === 0}
                        onClick={() => setCompressOpen(true)}
                        startIcon={<Compress />}
                        variant="outlined"
                    >
                        Compress images
                    </Button>
                    <Button onClick={() => setPendingClean(true)} startIcon={<DeleteSweepOutlined />} variant="outlined">
                        Clean orphans
                    </Button>
                </Box>
            </Box>

            {storage && (
                <Typography color="text.secondary" sx={{ mb: 1.5 }} variant="caption">
                    Browser storage: {formatBytesShort(storage.usage)} used
                    {typeof storage.quota === 'number' ? ` of ${formatBytesShort(storage.quota)}` : ''}.
                </Typography>
            )}

            {busy && <LinearProgress aria-label="Loading assets" sx={{mb: 2}} />}
            {notice && <Alert onClose={() => setNotice(null)} severity={notice.severity} sx={{mb: 2}}>{notice.message}</Alert>}

            {visibleAssets.length === 0 ? (
                <Box sx={{
                    alignItems: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    justifyContent: 'center',
                    minHeight: 260,
                    p: 4,
                    textAlign: 'center',
                }}>
                    <ImageOutlined sx={{color: 'text.disabled', fontSize: 48}} />
                    <Typography sx={{fontWeight: 600}}>
                        {assets.length === 0 ? 'No media assets yet' : 'No assets match this filter'}
                    </Typography>
                    <Typography color="text.secondary" sx={{maxWidth: 520}} variant="body2">
                        Add portraits, backgrounds, emotion images, audio clips or short videos. Files are stored in
                        IndexedDB and are included in CHARX exports.
                    </Typography>
                    <Button onClick={() => setAddOpen(true)} startIcon={<Add />} sx={{mt: 1}} variant="outlined">
                        Add media
                    </Button>
                </Box>
            ) : (
                <Box sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                }}>
                    {visibleAssets.map((asset) => (
                        <AssetCard
                            asset={asset}
                            key={asset.uri}
                            onDelete={(item) => {
                                setSelectedUri(null);
                                setPendingDelete(item);
                            }}
                            onOpen={setSelectedUri}
                            onSetMain={setMain}
                        />
                    ))}
                </Box>
            )}

            <AddAssetsDialog onClose={() => setAddOpen(false)} open={addOpen} />
            <CompressAssetsDialog
                assets={assets}
                onClose={() => setCompressOpen(false)}
                onCompress={compressImageAssets}
                onComplete={handleCompressed}
                open={compressOpen}
            />
            <AssetDetailsDialog
                asset={selectedAsset}
                onClose={() => setSelectedUri(null)}
                onDelete={(item) => {
                    setSelectedUri(null);
                    setPendingDelete(item);
                }}
                onReplace={handleReplace}
                onSetMain={setMain}
                open={Boolean(selectedAsset)}
            />
            <ConfirmationDialog
                dialogContent={`Are you sure you want to delete "${pendingDelete?.name ?? 'this asset'}"? The file will be removed from IndexedDB.`}
                dialogTitle="Delete asset?"
                handleClose={() => setPendingDelete(null)}
                handleConfirm={handleDelete}
                open={Boolean(pendingDelete)}
            />
            <ConfirmationDialog
                dialogContent="Remove files from IndexedDB that are not referenced by the current card? This cannot be undone."
                dialogTitle="Clean orphaned files?"
                handleClose={() => setPendingClean(false)}
                handleConfirm={handleCleanOrphans}
                open={pendingClean}
            />
        </Box>
    );
}
