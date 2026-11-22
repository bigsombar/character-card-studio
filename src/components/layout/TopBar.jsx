import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import IosShareOutlined from '@mui/icons-material/IosShareOutlined';

import { useCardStore } from '../../context/cardStoreContext';
import { useExport } from '../../context/ExportContext';

function SaveState() {
    const { isHydrating, saveState } = useCardStore();

    if (isHydrating) {
        return <Typography color="text.secondary" variant="caption">Loading project…</Typography>;
    }
    if (saveState?.status === 'error') {
        return (
            <Tooltip title={saveState.error || 'Your edits are still here, but could not be saved to IndexedDB.'}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'error.main', whiteSpace: 'nowrap' }}>
                    <ErrorOutlineOutlined sx={{ fontSize: 15 }} />
                    <Typography variant="caption">Not saved</Typography>
                </Stack>
            </Tooltip>
        );
    }
    if (saveState?.status === 'saving') {
        return <Typography color="text.secondary" variant="caption">Saving…</Typography>;
    }
    if (saveState?.savedAt) {
        return (
            <Tooltip title="Autosaved to IndexedDB on this device">
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'success.main', whiteSpace: 'nowrap' }}>
                    <CheckCircleOutlineOutlined sx={{ fontSize: 15 }} />
                    <Typography variant="caption">Saved {saveState.savedAt.toLocaleTimeString()}</Typography>
                </Stack>
            </Tooltip>
        );
    }
    return <Typography color="text.secondary" variant="caption">Not saved yet</Typography>;
}

/** Editor top bar: identity, save state and the primary export action. */
export default function TopBar() {
    const { cardData } = useCardStore();
    const { exporting, openExportDialog } = useExport();
    const name = cardData?.data?.name?.trim() || 'Untitled character';

    return (
        <Box
            component="header"
            sx={{
                alignItems: 'center',
                bgcolor: 'background.default',
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                flexShrink: 0,
                gap: 1.5,
                justifyContent: 'space-between',
                minHeight: { xs: 56, md: 64 },
                pt: 'env(safe-area-inset-top)',
                px: { xs: 1.5, md: 3 },
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    noWrap
                    sx={{
                        color: 'text.secondary',
                        display: { xs: 'none', sm: 'block' },
                        fontFamily: 'monospace',
                        fontSize: '0.65rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                    }}
                >
                    CARD STUDIO // V3 EDITOR
                </Typography>
                <Typography
                    component="h1"
                    noWrap
                    sx={{
                        fontFamily: '"Space Grotesk Variable", "Space Grotesk", sans-serif',
                        fontSize: { xs: '0.95rem', md: '1.2rem' },
                        fontWeight: 600,
                        lineHeight: 1.2,
                    }}
                >
                    {name}
                </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <SaveState />
                </Box>
                <Chip
                    color="secondary"
                    label={cardData?.spec_version ? `v${cardData.spec_version}` : 'v3.0'}
                    size="small"
                    sx={{ display: { xs: 'none', sm: 'flex' }, fontWeight: 700, letterSpacing: '0.04em' }}
                    variant="outlined"
                />
                <Button
                    disabled={exporting}
                    onClick={openExportDialog}
                    size="small"
                    startIcon={<IosShareOutlined />}
                    variant="contained"
                >
                    {exporting ? 'Exporting…' : 'Export'}
                </Button>
            </Stack>
        </Box>
    );
}
