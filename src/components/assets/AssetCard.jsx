import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';

import useAssetRecord from '../../hooks/useAssetRecord';
import { mediaKindForAsset, MEDIA_LABELS } from '../../assets/media';
import { formatBytesShort } from '../../utils/blob';
import MediaPreview from './MediaPreview';

export default function AssetCard({asset, onOpen, onDelete, onSetMain}) {
    const {record} = useAssetRecord(asset.uri);
    const kind = mediaKindForAsset(asset);
    const isMain = asset.name === 'main';
    const canBeMain = asset.type === 'icon' || asset.type === 'background';

    const open = () => onOpen(asset.uri);

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: isMain ? 'secondary.main' : 'divider',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                overflow: 'hidden',
                transition: 'border-color 120ms ease, transform 120ms ease',
                '&:hover': {
                    borderColor: isMain ? 'secondary.main' : 'text.disabled',
                    transform: 'translateY(-1px)',
                },
            }}
        >
            <Box
                onClick={open}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open();
                    }
                }}
                role="button"
                tabIndex={0}
                sx={{
                    cursor: 'pointer',
                    display: 'block',
                    '&:focus-visible': { outline: '2px solid #FFE400', outlineOffset: -2 },
                }}
            >
                <Box sx={{aspectRatio: '16 / 9', bgcolor: 'background.default', overflow: 'hidden', position: 'relative'}}>
                    <MediaPreview asset={asset} onOpen={open} variant="card" />
                    <Chip
                        label={MEDIA_LABELS[kind] ?? 'Other'}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(23, 23, 23, 0.78)',
                            color: 'text.primary',
                            fontSize: '0.62rem',
                            left: 8,
                            position: 'absolute',
                            top: 8,
                        }}
                    />
                    {isMain && (
                        <Tooltip title="Main asset">
                            <Star sx={{color: 'primary.main', fontSize: 18, position: 'absolute', right: 8, top: 8}} />
                        </Tooltip>
                    )}
                </Box>

                <Typography noWrap sx={{fontWeight: 600, minWidth: 0, px: 1.25, pt: 1.25}} variant="body2">
                    {asset.name || 'Unnamed asset'}
                </Typography>
            </Box>

            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between', p: 1.25, pt: 0.5}}>
                <Typography color="text.secondary" sx={{fontFamily: 'monospace', fontSize: '0.68rem', minWidth: 0}}>
                    {asset.type} · .{asset.ext || '?'} {record ? `· ${formatBytesShort(record.size)}` : ''}
                </Typography>
                <Box sx={{display: 'flex', flexShrink: 0}}>
                    {canBeMain && (
                        <Tooltip title={isMain ? 'Already main' : 'Set as main'}>
                            <IconButton
                                aria-label={isMain ? 'Main asset' : 'Set as main asset'}
                                disabled={isMain}
                                onClick={() => onSetMain(asset.uri)}
                                size="small"
                            >
                                {isMain ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Delete asset">
                        <IconButton
                            aria-label="Delete asset"
                            color="error"
                            onClick={() => onDelete(asset)}
                            size="small"
                        >
                            <DeleteOutlineOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );
}
