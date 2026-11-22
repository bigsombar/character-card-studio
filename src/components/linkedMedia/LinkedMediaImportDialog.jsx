import { useMemo } from 'react';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';

import { collectRemoteMedia } from '../../assets/remoteMedia';
import { useCardStore } from '../../context/cardStoreContext';
import LinkedMediaPanel from './LinkedMediaPanel';

/**
 * Offered after importing a card that links to remote images/audio/video. The user can download
 * the files, replace the text links, or skip the whole step.
 */
export default function LinkedMediaImportDialog({open, onClose}) {
    const {cardData} = useCardStore();
    const references = useMemo(() => collectRemoteMedia(cardData), [cardData]);

    return (
        <Dialog aria-labelledby="linked-media-title" fullWidth maxWidth="md" onClose={onClose} open={open}>
            <DialogTitle id="linked-media-title">Remote media found</DialogTitle>
            <DialogContent>
                <Typography color="text.secondary" sx={{mb: 2}} variant="body2">
                    This card contains {references.length} external media link{references.length === 1 ? '' : 's'} in
                    its text fields. You can download them into the local asset database and replace the URLs with
                    local asset references, or skip this step and keep the original links. Only HTTPS links are
                    accepted; some hosts block browser downloads for security reasons.
                </Typography>
                <Alert severity="warning" sx={{mb: 2}}>
                    CORS-protected links cannot be downloaded in this window. To try them, enable the potentially
                    unsafe third-party proxy option in <strong>Tools → Linked media</strong>. Proxy services can see
                    the requested URLs and files, and you must accept that risk first.
                </Alert>
                {open && <LinkedMediaPanel allowProxies={false} compact showDescription={false} />}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">Skip for now</Button>
            </DialogActions>
        </Dialog>
    );
}
