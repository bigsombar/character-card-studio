import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import PortraitCompressionDialog from './PortraitCompressionDialog';
import { compressPortraitToTarget, readPortraitInfo } from './portraitCompression';

vi.mock('./portraitCompression', async (importOriginal) => ({
    ...(await importOriginal()),
    compressPortraitToTarget: vi.fn(),
    readPortraitInfo: vi.fn(),
}));

vi.mock('browser-image-compression', () => ({
    default: {
        getDataUrlFromFile: vi.fn(async (file) => `data:image/png;base64,${file.name}`),
    },
}));

const ORIGINAL = { bytes: 500000, dataUrl: 'data:original', height: 2000, width: 3000 };
const COMPRESSED = { bytes: 80000, dataUrl: 'data:1mp', height: 816, width: 1232 };

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
        compressPortraitToTarget.mockResolvedValue(new File(['compressed'], '1mp.png', { type: 'image/png' }));
    });

    test('shows megapixel presets and applies the untouched original by default', async () => {
        const { props } = renderDialog();

        expect(await screen.findByRole('button', { name: '2 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1.5 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '0.5 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/1 MP is more than enough/)).toBeInTheDocument();
        expect(screen.getByText(/3000 × 2000 \(6 MP, 488 KB\)/)).toBeInTheDocument();

        await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(props.onApply).toHaveBeenCalledWith('data:original');
    });

    test('applies the resized result after choosing a megapixel target', async () => {
        readPortraitInfo.mockImplementation(async (source) => (
            source === 'data:original' ? ORIGINAL : COMPRESSED
        ));
        const { props } = renderDialog();

        fireEvent.click(await screen.findByRole('button', { name: '1 MP' }));

        await waitFor(() => expect(compressPortraitToTarget).toHaveBeenCalledWith('data:original', 1));
        expect(await screen.findByText(/1232 × 816/)).toBeInTheDocument();
        expect(await screen.findByText(/1.01 MP/)).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Portrait preview at the chosen size' })).toHaveAttribute('src', 'data:1mp');
        await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(props.onApply).toHaveBeenCalledWith('data:1mp');
    });

    test('reports an unreadable portrait and keeps Apply disabled', async () => {
        readPortraitInfo.mockRejectedValue(new Error('broken'));

        renderDialog();

        expect(await screen.findByText(/could not be opened/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: '2 MP' })).not.toBeInTheDocument();
    });

    test('hides presets that would not reduce the portrait', async () => {
        readPortraitInfo.mockResolvedValue({ bytes: 10000, dataUrl: 'data:small', height: 900, width: 700 });

        renderDialog({ source: 'data:small' });

        expect(await screen.findByRole('button', { name: '0.5 MP' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '1 MP' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '2 MP' })).not.toBeInTheDocument();
    });

    test('explains when the portrait is already small enough', async () => {
        readPortraitInfo.mockResolvedValue({ bytes: 5000, dataUrl: 'data:tiny', height: 480, width: 360 });

        renderDialog({ source: 'data:tiny' });

        expect(await screen.findByText(/already small enough/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '0.5 MP' })).not.toBeInTheDocument();
    });
});
