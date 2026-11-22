import { Alert, Box } from '@mui/material';

import AssetsPanel from '../components/assets/AssetsPanel';

/**
 * Media section wrapper. Asset CRUD, previews, playback and the main-icon action all live in
 * AssetsPanel/AssetContext; CHARX is the export format that carries these files.
 */
export default function AssetsSection() {
    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                Images, audio and video are stored in IndexedDB and embedded into CHARX archives. PNG and JSON
                exports cannot carry audio or video.
            </Alert>
            <AssetsPanel />
        </Box>
    );
}
