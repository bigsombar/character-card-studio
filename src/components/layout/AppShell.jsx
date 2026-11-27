import { Box, Link, Typography } from '@mui/material';

import useIsMobile from '../../hooks/useIsMobile';
import MobileNav from './MobileNav';
import SideRail from './SideRail';
import TopBar from './TopBar';

/**
 * Application shell: dark canvas, vertical section rail, top bar and a scroll-contained workspace.
 * The editor itself remains responsible for its content and dialogs.
 */
export default function AppShell({ activeSection, onSectionChange, children }) {
    const isMobile = useIsMobile();
    const isPagesBuild =
        typeof window !== 'undefined' && window.location.hostname === 'bigsombar.github.io';

    return (
        <Box
            sx={{
                bgcolor: 'background.default',
                color: 'text.primary',
                display: 'flex',
                height: '100vh',
                '@supports (height: 100dvh)': {
                    height: '100dvh',
                },
                overflow: 'hidden',
            }}
        >
            {!isMobile && <SideRail activeSection={activeSection} onSectionChange={onSectionChange} />}
            <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
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
                {isPagesBuild && (
                    <Box
                        aria-label="Build information"
                        component="footer"
                        sx={{
                            borderColor: 'divider',
                            borderTop: 1,
                            color: 'text.secondary',
                            flexShrink: 0,
                            px: { xs: 1.5, md: 3 },
                            py: 0.75,
                            textAlign: 'center',
                        }}
                    >
                        <Typography component="p" sx={{ fontSize: '0.68rem', lineHeight: 1.4, m: 0 }}>
                            DEV build. The release build is available at{' '}
                            <Link
                                href="https://character-card-studio.bigsombar.workers.dev/"
                                rel="noopener noreferrer"
                                target="_blank"
                                underline="hover"
                            >
                                character-card-studio.bigsombar.workers.dev
                            </Link>
                            .
                        </Typography>
                    </Box>
                )}
                {isMobile && <MobileNav activeSection={activeSection} onSectionChange={onSectionChange} />}
            </Box>
        </Box>
    );
}
