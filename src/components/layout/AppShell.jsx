import { Box } from '@mui/material';

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
                {isMobile && <MobileNav activeSection={activeSection} onSectionChange={onSectionChange} />}
            </Box>
        </Box>
    );
}
