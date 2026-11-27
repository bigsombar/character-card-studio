import { useRef } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';

import {
    ACCEPTED_FILE_EXTENSIONS,
    mediaKindForAsset,
    MEDIA_LABELS,
    typeOptionsForMedia,
} from '../../assets/media';
import useAssetRecord from '../../hooks/useAssetRecord';
import { formatByteSizeShort } from '../../utils/blob';
import MediaPreview from './MediaPreview';

export default function AssetDetailsDialog({
    asset,
    assets = [],
    open,
    onClose,
    onDelete,
    onChangeType,
    onSetMain,
    onReplace,
}) {
    const replaceRef = useRef(null);
    const {record} = useAssetRecord(asset?.uri);
    const kind = mediaKindForAsset(asset);
    const canBeMain = asset?.type === 'icon' || asset?.type === 'background';
    const isMain = canBeMain && asset?.name === 'main';
    const isLocalAsset = Boolean(asset?.uri?.startsWith('embeded://'));
    const availableTypes = asset
        ? [...new Set([asset.type, ...typeOptionsForMedia(kind)])]
        : [];
    const isOnlyMainIcon = Boolean(
        asset?.type === 'icon'
        && isMain
        && !assets.some((item) => item.uri !== asset.uri && item.type === 'icon'),
    );
    const accept = ACCEPTED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',');

    if (!asset) return null;

    return (
        <Dialog fullWidth maxWidth="md" onClose={onClose} open={open} aria-labelledby="asset-details-title">
            <DialogTitle id="asset-details-title" sx={{alignItems: 'center', display: 'flex', gap: 1, justifyContent: 'space-between'}}>
                <Box sx={{minWidth: 0}}>
                    <Typography noWrap sx={{fontFamily: '"Space Grotesk Variable", sans-serif', fontSize: '1.15rem'}}>
                        {asset.name || 'Unnamed asset'}
                    </Typography>
                    <Typography color="text.secondary" sx={{fontSize: '0.7rem'}}>
                        {MEDIA_LABELS[kind]} · {isLocalAsset ? '' : `${asset.type} · `}.{asset.ext || '?'}
                    </Typography>
                </Box>
                <Chip label={isMain ? 'main' : asset.type} size="small" variant="outlined" />
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{bgcolor: 'background.default', borderRadius: 2, overflow: 'hidden'}}>
                    <MediaPreview asset={asset} variant="detail" />
                </Box>

                <Stack direction="row" spacing={1} sx={{alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mt: 2}}>
                    <Typography color="text.secondary" variant="body2">
                        {record ? `${record.mime} · ${formatByteSizeShort(record.size)}`
                            : isLocalAsset ? 'Local file not found' : 'Remote or data asset'}
                    </Typography>
                    {isLocalAsset ? (
                        <TextField
                            disabled={isOnlyMainIcon}
                            helperText={isOnlyMainIcon
                                ? 'Add another icon before changing the main icon.'
                                : undefined}
                            label="Type"
                            onChange={(event) => onChangeType?.(asset.uri, event.target.value)}
                            select
                            size="small"
                            sx={{minWidth: 180}}
                            value={asset.type}
                        >
                            {availableTypes.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </TextField>
                    ) : (
                        <Typography color="text.secondary" sx={{fontFamily: 'monospace', fontSize: '0.72rem', overflowWrap: 'anywhere'}}>
                            {asset.uri}
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{flexWrap: 'wrap', gap: 1}}>
                {canBeMain && (
                    <Tooltip title={isMain ? 'Already the main asset' : 'Use as the main icon/background'}>
                        <span>
                            <Button
                                disabled={isMain}
                                onClick={() => onSetMain(asset.uri)}
                                startIcon={isMain ? <Star /> : <StarBorder />}
                                variant="outlined"
                            >
                                {isMain ? 'Main asset' : 'Set as main'}
                            </Button>
                        </span>
                    </Tooltip>
                )}
                <input
                    ref={replaceRef}
                    accept={accept}
                    hidden
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = null;
                        if (file) onReplace(asset.uri, file);
                    }}
                    type="file"
                />
                <Button onClick={() => replaceRef.current?.click()} startIcon={<UploadFileOutlined />} variant="outlined">
                    Replace file
                </Button>
                <Button color="error" onClick={() => onDelete(asset)} startIcon={<DeleteOutlineOutlined />} variant="outlined">
                    Delete
                </Button>
                <Box sx={{flex: 1}} />
                <Button onClick={onClose} variant="contained">Close</Button>
            </DialogActions>
        </Dialog>
    );
}
