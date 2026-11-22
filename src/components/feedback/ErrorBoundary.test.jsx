import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import ErrorBoundary from './ErrorBoundary';

function Boom() {
    throw new Error('boom from test');
}

describe('ErrorBoundary', () => {
    test('renders a recoverable fallback instead of a blank page', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>,
        );

        expect(screen.getByText(/the editor hit an unexpected error/i)).toBeInTheDocument();
        expect(screen.getByText('boom from test')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload editor/i })).toBeInTheDocument();
        consoleError.mockRestore();
    });
});
