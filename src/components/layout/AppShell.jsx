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
                        position: 'relative',
                    }}
                >
                    {children}
                    {isPagesBuild && (
                        <Typography
                            component="p"
                            sx={{
                                bottom: 10,
                                color: 'text.secondary',
                                fontSize: '0.65rem',
                                lineHeight: 1.2,
                                m: 0,
                                opacity: 0.75,
                                pointerEvents: 'none',
                                position: 'absolute',
                                right: 12,
                                zIndex: 2,
                            }}
                        >
                            DEV build ·{' '}
                            <Link
                                href="https://character-card-studio.bigsombar.workers.dev/"
                                rel="noopener noreferrer"
                                sx={{
                                    color: 'inherit',
                                    pointerEvents: 'auto',
                                    '&:hover': { color: 'text.primary' },
                                }}
                                target="_blank"
                                underline="hover"
                            >
                                release build
                            </Link>
                        </Typography>
                    )}
                </Box>
                {isMobile && <MobileNav activeSection={activeSection} onSectionChange={onSectionChange} />}
            </Box>
        </Box>
    );
}
