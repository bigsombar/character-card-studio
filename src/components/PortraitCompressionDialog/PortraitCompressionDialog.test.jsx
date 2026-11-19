import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import PortraitCompressionDialog from './PortraitCompressionDialog';
import { compressPortraitSource, readPortraitInfo } from './portraitCompression';

vi.mock('./portraitCompression', () => ({
    compressPortraitSource: vi.fn(),
    readPortraitInfo: vi.fn(),
}));

vi.mock('browser-image-compression', () => ({
    default: {
        getDataUrlFromFile: vi.fn(async (file) => `data:image/png;base64,${file.name}`),
    },
}));

const ORIGINAL = { bytes: 500000, dataUrl: 'data:original', height: 2000, width: 3000 };
const COMPRESSED = { bytes: 80000, dataUrl: 'data:1024', height: 683, width: 1024 };

function renderDialog(overrides = {}) {
    const props = {
        onApply: vi.fn(),
        onClose: vi.fn(),
        open: true,
        source: 'data:original',
        ...overrides,
    };
    return { ...render(<PortraitCompressionDialog {...props} />), props };
}

describe('PortraitCompressionDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        readPortraitInfo.mockResolvedValue(ORIGINAL);
        compressPortraitSource.mockResolvedValue(new File(['compressed'], '1024.png', { type: 'image/png' }));
    });

    test('shows size presets and applies the untouched original by default', async () => {
        const { props } = renderDialog();

        expect(await screen.findByRole('button', { name: '2048px' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true');

        await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(props.onApply).toHaveBeenCalledWith('data:original');
    });

    test('applies the compressed result after choosing a preset', async () => {
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? ORIGINAL : COMPRESSED
        ));
        const { props } = renderDialog();

        fireEvent.click(await screen.findByRole('button', { name: '1024px' }));

        await waitFor(() => expect(compressPortraitSource).toHaveBeenCalledWith('data:original', 1024));
        expect(await screen.findByText(/1024 × 683/)).toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(props.onApply).toHaveBeenCalledWith('data:1024');
    });

    test('reports an unreadable portrait and keeps Apply disabled', async () => {
        readPortraitInfo.mockRejectedValue(new Error('broken'));

        renderDialog();

        expect(await screen.findByText(/could not be opened/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: '2048px' })).not.toBeInTheDocument();
    });

    test('hides presets that would not downscale the portrait', async () => {
        readPortraitInfo.mockResolvedValue({ bytes: 10000, dataUrl: 'data:small', height: 900, width: 700 });

        renderDialog({ source: 'data:small' });

        expect(await screen.findByRole('button', { name: '768px' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '512px' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '1024px' })).not.toBeInTheDocument();
    });

    test('explains when the portrait is already small enough', async () => {
        readPortraitInfo.mockResolvedValue({ bytes: 5000, dataUrl: 'data:tiny', height: 480, width: 360 });

        renderDialog({ source: 'data:tiny' });

        expect(await screen.findByText(/already fits within 512 px/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
    });
});
