import { Box, Typography } from '@mui/material';

import { fieldHelp } from '../../content/fieldHelp';
import InfoTooltip from './InfoTooltip';

/**
 * External field label with a consistent uppercase treatment and an optional help tooltip.
 * Keeping the label outside the input also avoids MUI's floating-label animation, which makes
 * long card fields harder to scan.
 */
export default function FieldLabel({ text, helpKey, help, sx }) {
    const helpEntry = help ?? (helpKey ? fieldHelp[helpKey] : undefined);

    return (
        <Box
            sx={{
                alignItems: 'center',
                display: 'flex',
                minHeight: 20,
                ...sx,
            }}
        >
            <Typography
                component="span"
                sx={{
                    color: 'text.secondary',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    lineHeight: 1.5,
                    textTransform: 'uppercase',
                }}
            >
                {text}
            </Typography>
            {helpEntry && <InfoTooltip text={helpEntry.text} title={helpEntry.title} />}
        </Box>
    );
}
