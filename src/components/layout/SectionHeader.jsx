import { Box, Typography } from '@mui/material';

import { fieldHelp } from '../../content/fieldHelp';
import InfoTooltip from '../fields/InfoTooltip';

/** Section heading with optional description, help tooltip and right-side actions. */
export default function SectionHeader({ title, description, helpKey, actions, sx }) {
    const helpEntry = helpKey ? fieldHelp[helpKey] : undefined;

    return (
        <Box
            sx={{
                alignItems: 'flex-start',
                display: 'flex',
                gap: 2,
                justifyContent: 'space-between',
                mb: 2,
                ...sx,
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Box sx={{ alignItems: 'center', display: 'flex' }}>
                    <Typography
                        component="h2"
                        sx={{
                            fontFamily: '"Space Grotesk Variable", "Space Grotesk", sans-serif',
                            fontSize: { xs: '1.25rem', md: '1.5rem' },
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                        }}
                    >
                        {title}
                    </Typography>
                    {helpEntry && <InfoTooltip text={helpEntry.text} title={helpEntry.title} />}
                </Box>
                {description && (
                    <Typography color="text.secondary" sx={{ fontSize: '0.85rem', mt: 0.5 }}>
                        {description}
                    </Typography>
                )}
            </Box>
            {actions && <Box sx={{ alignItems: 'center', display: 'flex', flexShrink: 0, gap: 1 }}>{actions}</Box>}
        </Box>
    );
}
