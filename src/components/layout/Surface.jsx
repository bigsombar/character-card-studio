import { Box } from '@mui/material';

/** Reusable bordered surface for groups of fields and dialogs. */
export default function Surface({ children, sx, ...rest }) {
    return (
        <Box
            sx={{
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 2, md: 3 },
                ...sx,
            }}
            {...rest}
        >
            {children}
        </Box>
    );
}
