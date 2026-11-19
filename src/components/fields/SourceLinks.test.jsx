import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import SourceLinks from './SourceLinks';

describe('SourceLinks', () => {
    test('makes HTTPS sources clickable and safe', () => {
        render(<SourceLinks source={['https://example.com/card']} />);
        const link = screen.getByRole('link', { name: 'https://example.com/card' });
        expect(link).toHaveAttribute('href', 'https://example.com/card');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('keeps insecure and non-URL sources as text', () => {
        render(<SourceLinks source={['http://example.com/card', 'local-id']} />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByText(/insecure http link/i)).toBeInTheDocument();
        expect(screen.getByText('local-id')).toBeInTheDocument();
    });

    test('renders an empty state', () => {
        render(<SourceLinks />);
        expect(screen.getByText('No source recorded.')).toBeInTheDocument();
    });
});
