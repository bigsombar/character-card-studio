import { useEffect, useState } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import ErrorBoundary from './components/feedback/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import TavernCardEditor from './components/TavernCardEditor/TavernCardEditor';
import { AssetProvider } from './context/AssetContext';
import { CardProvider } from './context/CardProvider';
import { ExportProvider } from './context/ExportContext';
import { NotificationProvider } from './context/NotificationContext';
import { theme } from './theme/theme';

function App() {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const match = /^Digit([1-9])$/.exec(event.code);
      if (!match) return;
      const index = Number.parseInt(match[1], 10) - 1;
      if (index < 9) {
        event.preventDefault();
        setActiveSection(index);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <CardProvider>
          <AssetProvider>
            <NotificationProvider>
              <ExportProvider>
                <AppShell activeSection={activeSection} onSectionChange={setActiveSection}>
                  <TavernCardEditor activeSection={activeSection} />
                </AppShell>
              </ExportProvider>
            </NotificationProvider>
          </AssetProvider>
        </CardProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
