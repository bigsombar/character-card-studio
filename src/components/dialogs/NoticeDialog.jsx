import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';

function warningText(warning) {
    if (typeof warning === 'string') return warning;
    return warning?.message ?? warning?.code ?? 'Unknown warning';
}

/**
 * Shows the result of a card import, including V2-upcast and malformed-field warnings.
 * Import is non-blocking: the card is already loaded when this dialog opens.
 */
export default function NoticeDialog({ open, notice, onClose }) {
    if (!notice) return null;

    const warnings = notice.warnings ?? [];
    const errors = notice.errors ?? [];

    return (
        <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open} aria-labelledby="notice-dialog-title">
            <DialogTitle id="notice-dialog-title">{notice.title ?? 'Import result'}</DialogTitle>
            <DialogContent dividers>
                <Alert severity={notice.severity ?? (errors.length ? 'error' : warnings.length ? 'warning' : 'success')}>
                    {notice.message}
                </Alert>

                {errors.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', mb: 0.5 }} variant="overline">
                            Errors
                        </Typography>
                        <List dense>
                            {errors.map((error, index) => (
                                <ListItem key={`${error?.code ?? 'error'}-${index}`} sx={{ px: 0 }}>
                                    <ListItemText primary={warningText(error)} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                {warnings.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', mb: 0.5 }} variant="overline">
                            Warnings
                        </Typography>
                        <List dense>
                            {warnings.map((warning, index) => (
                                <ListItem key={`${warning?.code ?? 'warning'}-${index}`} sx={{ px: 0 }}>
                                    <ListItemText primary={warningText(warning)} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Close</Button>
            </DialogActions>
        </Dialog>
    );
}
