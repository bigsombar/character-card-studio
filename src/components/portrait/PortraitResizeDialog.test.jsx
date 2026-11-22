import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import PortraitResizeDialog from './PortraitResizeDialog';
import { resizePortraitToTarget, inspectPortrait } from './portraitResize';

vi.mock('./portraitResize', async (importOriginal) => ({
    ...(await importOriginal()),
    resizePortraitToTarget: vi.fn(),
    inspectPortrait: vi.fn(),
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
        onCommit: vi.fn(),
        onDismiss: vi.fn(),
        open: true,
        portraitSource: 'data:original',
        ...overrides,
    };
    return { ...render(<PortraitResizeDialog {...props} />), props };
}

describe('PortraitResizeDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        inspectPortrait.mockResolvedValue(ORIGINAL);
        resizePortraitToTarget.mockResolvedValue(new File(['compressed'], '1mp.png', { type: 'image/png' }));
    });

    test('shows megapixel presets and applies the untouched original by default', async () => {
        const { props } = renderDialog();

        expect(await screen.findByRole('button', { name: '2 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1.5 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '0.5 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/1 MP is more than enough/)).toBeInTheDocument();
        expect(screen.getByText(/3000 × 2000 \(6 MP, 488.3 KB\)/)).toBeInTheDocument();

        await waitFor(() => expect(screen.getByRole('button', { name: 'Use this size' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Use this size' }));

        expect(props.onCommit).toHaveBeenCalledWith('data:original');
    });

    test('applies the resized result after choosing a megapixel target', async () => {
        inspectPortrait.mockImplementation(async (source) => (
            source === 'data:original' ? ORIGINAL : COMPRESSED
        ));
        const { props } = renderDialog();

        fireEvent.click(await screen.findByRole('button', { name: '1 MP' }));

        await waitFor(() => expect(resizePortraitToTarget).toHaveBeenCalledWith('data:original', 1));
        expect(await screen.findByText(/1232 × 816/)).toBeInTheDocument();
        expect(await screen.findByText(/1.01 MP/)).toBeInTheDocument();
        expect(await screen.findByText(/Saves 410.2 KB/)).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Portrait preview at the chosen size' })).toHaveAttribute('src', 'data:1mp');
        await waitFor(() => expect(screen.getByRole('button', { name: 'Use this size' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Use this size' }));

        expect(props.onCommit).toHaveBeenCalledWith('data:1mp');
    });

    test('reports an unreadable portrait and keeps Use this size disabled', async () => {
        inspectPortrait.mockRejectedValue(new Error('broken'));

        renderDialog();

        expect(await screen.findByText(/could not be opened/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Use this size' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: '2 MP' })).not.toBeInTheDocument();
    });

});
