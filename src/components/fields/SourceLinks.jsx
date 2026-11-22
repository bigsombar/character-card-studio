import { Box, Link, Stack, Typography } from '@mui/material';

import FieldLabel from './FieldLabel';

/**
 * Read-only `source` display. Only HTTPS URLs are made clickable; insecure HTTP and other
 * values stay visible as text so data is never hidden or silently rewritten.
 */
export default function SourceLinks({ source }) {
    const items = Array.isArray(source) ? source : (source ? [source] : []);

    return (
        <Box>
            <FieldLabel helpKey="source" text="Source (read-only, tracked automatically)" sx={{ mb: 0.5 }} />
            <Box sx={{ bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                {items.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">No source recorded.</Typography>
                ) : (
                    <Stack spacing={0.75}>
                        {items.map((item, index) => {
                            const https = /^https:\/\//i.test(item);
                            const http = /^http:\/\//i.test(item);
                            return (
                                <Box key={`${item}-${index}`}>
                                    {https ? (
                                        <Link
                                            href={item}
                                            rel="noopener noreferrer"
                                            target="_blank"
                                            variant="body2"
                                            sx={{ overflowWrap: 'anywhere' }}
                                        >
                                            {item}
                                        </Link>
                                    ) : (
                                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', overflowWrap: 'anywhere' }}>
                                            {item}
                                        </Typography>
                                    )}
                                    {http && (
                                        <Typography color="warning.main" variant="caption">
                                            Insecure HTTP link is shown but not opened automatically.
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
