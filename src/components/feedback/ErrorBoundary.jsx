import { Component } from 'react';
import { Alert, AlertTitle, Box, Button, Stack } from '@mui/material';

/**
 * Last-resort boundary so an unexpected render error shows a recoverable message instead of a
 * blank page. Card data stays in IndexedDB/localStorage, so a reload is safe.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Unhandled editor error:', error, info);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', p: 3 }}>
                <Stack spacing={2} sx={{ maxWidth: 560, width: '100%' }}>
                    <Alert severity="error">
                        <AlertTitle>The editor hit an unexpected error</AlertTitle>
                        Your card is autosaved locally. Reload the page to continue; if the problem repeats, export a
                        backup first and check the browser console.
                    </Alert>
                    <Alert severity="warning" variant="outlined">
                        {this.state.error?.message ?? String(this.state.error)}
                    </Alert>
                    <Button onClick={() => window.location.reload()} variant="contained">Reload editor</Button>
                </Stack>
            </Box>
        );
    }
}
