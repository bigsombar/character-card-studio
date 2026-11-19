import { Box, Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';

function textOf(item) {
    if (typeof item === 'string') return item;
    return item?.message ?? item?.code ?? 'Unknown issue';
}

function issueKey(item, index) {
    return `${item?.code ?? 'issue'}-${index}`;
}

/**
 * Shared errors/warnings block used by the export dialog and the advanced section.
 * Severity is conveyed by an icon and a text header, never by color alone.
 */
export default function ValidationPanel({ errors = [], warnings = [], title, dense = false, maxVisible }) {
    const visibleErrors = maxVisible ? errors.slice(0, maxVisible) : errors;
    const visibleWarnings = maxVisible ? warnings.slice(0, maxVisible) : warnings;
    const hiddenErrors = errors.length - visibleErrors.length;
    const hiddenWarnings = warnings.length - visibleWarnings.length;

    if (errors.length === 0 && warnings.length === 0) {
        return null;
    }

    return (
        <Box>
            {title && (
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', mb: 0.75 }} variant="overline">
                    {title}
                </Typography>
            )}

            {errors.length > 0 && (
                <Box sx={{ mb: warnings.length > 0 ? 1.5 : 0 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'error.light', mb: 0.25 }}>
                        <ErrorOutlineOutlined sx={{ fontSize: 16 }} />
                        <Typography sx={{ fontWeight: 700 }} variant="body2">
                            Errors ({errors.length}) — export is blocked
                        </Typography>
                    </Stack>
                    <List dense={dense}>
                        {visibleErrors.map((error, index) => (
                            <ListItem key={issueKey(error, index)} sx={{ px: 0, py: 0.25 }}>
                                <ListItemText primary={textOf(error)} />
                            </ListItem>
                        ))}
                    </List>
                    {hiddenErrors > 0 && (
                        <Typography color="text.secondary" variant="caption">…and {hiddenErrors} more errors.</Typography>
                    )}
                </Box>
            )}

            {warnings.length > 0 && (
                <Box>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'warning.light', mb: 0.25 }}>
                        <WarningAmberOutlined sx={{ fontSize: 16 }} />
                        <Typography sx={{ fontWeight: 700 }} variant="body2">
                            Warnings ({warnings.length}) — export is still allowed
                        </Typography>
                    </Stack>
                    <List dense={dense}>
                        {visibleWarnings.map((warning, index) => (
                            <ListItem key={issueKey(warning, index)} sx={{ px: 0, py: 0.25 }}>
                                <ListItemText primary={textOf(warning)} />
                            </ListItem>
                        ))}
                    </List>
                    {hiddenWarnings > 0 && (
                        <Chip label={`+${hiddenWarnings} more`} size="small" variant="outlined" />
                    )}
                </Box>
            )}
        </Box>
    );
}
