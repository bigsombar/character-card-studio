import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import ErrorBoundary from '../components/feedback/ErrorBoundary';
import { AssetProvider } from '../context/AssetContext';
import { CardStoreProvider } from '../context/CardStoreProvider';
import { ExportProvider } from '../context/ExportContext';
import { NotificationProvider } from '../context/NotificationContext';
import { theme } from '../theme/theme';

/**
 * Global providers and theme boundaries for the editor.
 *
 * Keeping this composition outside `App` lets the shell stay focused on layout and navigation.
 */
export default function AppProviders({ children }) {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ErrorBoundary>
                <CardStoreProvider>
                    <AssetProvider>
                        <NotificationProvider>
                            <ExportProvider>
                                {children}
                            </ExportProvider>
                        </NotificationProvider>
                    </AssetProvider>
                </CardStoreProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
}
