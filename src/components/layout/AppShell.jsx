import { Box, Link, Typography } from '@mui/material';

import SideRail from './SideRail';
import TopBar from './TopBar';

/**
 * Application shell: dark canvas, vertical section rail, top bar and a scroll-contained workspace.
 * The editor itself remains responsible for its content and dialogs.
 */
export default function AppShell({ activeSection, onSectionChange, children }) {
    return (
        <Box
            sx={{
                bgcolor: 'background.default',
                color: 'text.primary',
                display: 'flex',
                height: '100vh',
                overflow: 'hidden',
            }}
        >
            <SideRail activeSection={activeSection} onSectionChange={onSectionChange} />
            <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
                <TopBar />
                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        overflow: 'hidden',
                    }}
                >
                    {children}
                </Box>
                <Box
                    component="footer"
                    sx={{
                        borderTop: 1,
                        borderColor: 'divider',
                        flexShrink: 0,
                        px: 2,
                        py: 0.5,
                        textAlign: 'right',
                    }}
                >
                    <Typography
                        component="span"
                        sx={{ color: 'rgba(242, 240, 233, 0.6)', fontSize: '0.62rem' }}
                    >
                        <Link
                            href="https://icons8.com/icon/MTivAq0U9TSN/anime"
                            rel="noopener noreferrer"
                            target="_blank"
                            underline="hover"
                            sx={{ color: 'inherit' }}
                        >
                            Anime
                        </Link>{' '}
                        icon by{' '}
                        <Link
                            href="https://icons8.com"
                            rel="noopener noreferrer"
                            target="_blank"
                            underline="hover"
                            sx={{ color: 'inherit' }}
                        >
                            Icons8
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
