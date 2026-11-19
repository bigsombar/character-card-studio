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
    Typography,
} from '@mui/material';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';

import { CORS_PROXIES } from '../../assets/corsProxies';

/**
 * One-time risk acknowledgement for the opt-in CORS proxy fallback. The confirmation is stored in
 * a cookie by the caller; cancelling leaves the proxies disabled.
 */
export default function ProxyConsentDialog({open, onCancel, onConfirm}) {
    return (
        <Dialog aria-labelledby="proxy-consent-title" fullWidth maxWidth="sm" onClose={onCancel} open={open}>
            <DialogTitle id="proxy-consent-title">Enable third-party proxies?</DialogTitle>
            <DialogContent sx={{maxHeight: '70vh'}}>
                <Alert severity="error" sx={{mb: 2}}>
                    This option is potentially unsafe and is disabled by default. The site author is not
                    responsible for files downloaded through third-party services or for any damage they may
                    cause to your device.
                </Alert>
                <Typography sx={{mb: 1.5}} variant="body2">
                    When a host blocks a direct download with CORS, the editor can retry the request through
                    these public services. Files are downloaded in parallel and each proxy gets up to 5 seconds
                    to respond before the next one is tried:
                </Typography>
                <Box
                    component="ul"
                    sx={{color: 'text.secondary', m: 0, mb: 2, pl: 2.5, typography: 'body2'}}
                >
                    {CORS_PROXIES.map((proxy) => (
                        <li key={proxy.id}>
                            {proxy.name}
                            {proxy.note ? ` — ${proxy.note}` : ''}
                        </li>
                    ))}
                </Box>
                <List dense disablePadding>
                    {[
                        'Proxy operators can see the requested URLs and the file contents passing through their servers.',
                        'Downloaded files may be modified, incomplete or malicious. Scan them with your own tools before opening.',
                        'Availability, speed and size limits are not guaranteed and can change without notice.',
                        'Direct downloads remain the default; proxies are only tried after a direct request fails.',
                    ].map((text) => (
                        <ListItem disableGutters key={text} sx={{alignItems: 'flex-start', gap: 1}}>
                            <WarningAmberRounded color="error" fontSize="small" sx={{mt: 0.35}} />
                            <Typography variant="body2">{text}</Typography>
                        </ListItem>
                    ))}
                </List>
                <Typography color="text.secondary" sx={{mt: 1}} variant="caption">
                    Only enable this if you understand and accept the risk. You can disable it at any time.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} variant="outlined">Cancel</Button>
                <Button color="error" onClick={onConfirm} variant="contained">
                    I understand, enable proxies
                </Button>
            </DialogActions>
        </Dialog>
    );
}
