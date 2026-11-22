import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material';

import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';

import './index.css';
import App from './App';

function mountApp() {
    const container = document.getElementById('app');
    if (!container) {
        throw new Error('Application root element was not found.');
    }

    createRoot(container).render(
        <StrictMode>
            <StyledEngineProvider injectFirst>
                <App />
            </StyledEngineProvider>
        </StrictMode>,
    );
}

mountApp();
