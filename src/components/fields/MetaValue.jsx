import { Box, Typography } from '@mui/material';

import FieldLabel from './FieldLabel';

/** Read-only display for computed/spec-derived values such as dates and source. */
export default function MetaValue({ label, helpKey, value, hint }) {
    return (
        <Box>
            <FieldLabel helpKey={helpKey} text={label} sx={{ mb: 0.5 }} />
            <Box
                sx={{
                    bgcolor: 'background.default',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    minHeight: 40,
                    px: 1.5,
                    py: 1,
                }}
            >
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-word' }}>
                    {value}
                </Typography>
                {hint && <Typography color="text.secondary" variant="caption">{hint}</Typography>}
            </Box>
        </Box>
    );
}
