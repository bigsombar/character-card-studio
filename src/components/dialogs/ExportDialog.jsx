import { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import DataObjectOutlined from '@mui/icons-material/DataObjectOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';

import { buildOutgoingCard } from '../../png/cardPngIO';
import validateCardV3 from '../../spec/validateCardV3';
import ValidationPanel from '../feedback/ValidationPanel';

const FORMATS = [
    {
        value: 'charx',
        title: 'CHARX',
        icon: ArchiveOutlined,
        badge: 'Recommended',
        description: 'ZIP archive with card.json plus every image, audio and video asset. Best for sharing and round-tripping.',
    },
    {
        value: 'json',
        title: 'V3 JSON',
        icon: DataObjectOutlined,
        description: 'A single JSON file. Embedded media can be inlined as data URLs so the file is self-contained.',
    },
    {
        value: 'png',
        title: 'V3 PNG',
        icon: ImageOutlined,
        description: 'Portrait image with ccv3 metadata. Lossy: only the main icon can be kept; audio and video are omitted.',
    },
];

function formatDescription(format) {
    return FORMATS.find((item) => item.value === format)?.title ?? 'card';
}

/**
 * Consolidated export surface for all supported formats. Validation is shown before the
 * download so structural errors are visible without triggering an export first.
 */
export default function ExportDialog({ cardData, exporting, onClose, onExport, open, progress }) {
    const [format, setFormat] = useState('charx');
    const [embedRemote, setEmbedRemote] = useState(true);
    const [inlineAssets, setInlineAssets] = useState(true);

    const validation = useMemo(() => validateCardV3(buildOutgoingCard(cardData)), [cardData]);

    const handleClose = () => {
        if (!exporting) onClose();
    };

    const handleExport = async () => {
        const result = await onExport(format, { embedRemote, inlineAssets });
        if (result?.ok) onClose();
    };

    const determinate = typeof progress?.current === 'number' && typeof progress?.total === 'number' && progress.total > 0;

    return (
        <Dialog fullWidth maxWidth="md" onClose={handleClose} open={open} aria-labelledby="export-dialog-title">
            <DialogTitle id="export-dialog-title">Export card</DialogTitle>
            <DialogContent dividers>
                <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                    CHARX is the primary format and keeps all media. JSON and PNG exist for tools that cannot read
                    archives.
                </Typography>

                <Box role="radiogroup" sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                    {FORMATS.map((item) => {
                        const Icon = item.icon;
                        const selected = format === item.value;
                        return (
                            <ButtonBase
                                aria-checked={selected}
                                key={item.value}
                                onClick={() => setFormat(item.value)}
                                role="radio"
                                sx={{
                                    alignItems: 'flex-start',
                                    bgcolor: selected ? 'rgba(20, 167, 108, 0.12)' : 'background.default',
                                    border: 2,
                                    borderColor: selected ? 'secondary.main' : 'divider',
                                    borderRadius: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                    p: 1.5,
                                    textAlign: 'left',
                                    transition: 'border-color 120ms ease, background-color 120ms ease',
                                    '&:hover': { borderColor: selected ? 'secondary.main' : 'text.disabled' },
                                    '&:focus-visible': { outline: '2px solid #FFE400', outlineOffset: 2 },
                                }}
                            >
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                                    <Icon sx={{ color: selected ? 'secondary.main' : 'text.secondary', fontSize: 20 }} />
                                    <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                                    {selected && <CheckCircleOutlineOutlined sx={{ color: 'secondary.main', fontSize: 17, ml: 'auto' }} />}
                                </Stack>
                                {item.badge && (
                                    <Typography sx={{ color: 'primary.main', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                        {item.badge}
                                    </Typography>
                                )}
                                <Typography color="text.secondary" variant="caption">{item.description}</Typography>
                            </ButtonBase>
                        );
                    })}
                </Box>

                <Box sx={{ mt: 2 }}>
                    {format === 'charx' && (
                        <FormControlLabel
                            control={<Checkbox checked={embedRemote} onChange={(event) => setEmbedRemote(event.target.checked)} />}
                            label="Download HTTPS assets and include them in the archive"
                        />
                    )}
                    {format === 'json' && (
                        <FormControlLabel
                            control={<Checkbox checked={inlineAssets} onChange={(event) => setInlineAssets(event.target.checked)} />}
                            label="Inline embeded:// media as data URLs (larger, but self-contained)"
                        />
                    )}
                    {format === 'png' && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            PNG keeps only the portrait and ccv3 data. To preserve audio, video or extra images, export CHARX instead.
                        </Alert>
                    )}
                </Box>

                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mt: 2, p: 2 }}>
                    {validation.errors.length === 0 && validation.warnings.length === 0 ? (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'success.light' }}>
                            <CheckCircleOutlineOutlined sx={{ fontSize: 18 }} />
                            <Typography sx={{ fontWeight: 600 }} variant="body2">Card is ready to export.</Typography>
                        </Stack>
                    ) : (
                        <ValidationPanel
                            errors={validation.errors}
                            maxVisible={6}
                            title="Pre-export check"
                            warnings={validation.warnings}
                        />
                    )}
                </Box>

                {exporting && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress
                            value={determinate ? Math.round((progress.current / progress.total) * 100) : undefined}
                            variant={determinate ? 'determinate' : 'indeterminate'}
                        />
                        <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="caption">
                            {progress?.message ?? `Preparing ${formatDescription(format)}…`}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button disabled={exporting} onClick={handleClose}>Cancel</Button>
                <Button disabled={exporting || !validation.ok} onClick={handleExport} variant="contained">
                    {exporting ? 'Exporting…' : `Export ${formatDescription(format)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
