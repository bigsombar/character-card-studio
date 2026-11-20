import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import CompressAssetsDialog from './CompressAssetsDialog';
import { measureImageAssets } from '../../assets/assetCompression';

vi.mock('../../assets/assetCompression', async (importOriginal) => ({
    ...(await importOriginal()),
    measureImageAssets: vi.fn(),
}));

const ASSETS = [
    { ext: 'png', name: 'main', uri: 'embeded://assets/icon/images/main.png' },
    { ext: 'png', name: 'smile', uri: 'embeded://assets/emotion/images/smile.png' },
];

const SUMMARY = {
    failed: [],
    resized: [{ afterBytes: 80, beforeBytes: 500, height: 816, name: 'main', uri: ASSETS[0].uri, width: 1232 }],
    savedBytes: 420,
    skipped: [{ name: 'smile', reason: 'small', uri: ASSETS[1].uri }],
    total: 2,
};

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, reject, resolve };
}

function renderDialog(overrides = {}) {
    const props = {
        assets: ASSETS,
        onClose: vi.fn(),
        onCompress: vi.fn().mockResolvedValue(SUMMARY),
        onComplete: vi.fn(),
        open: true,
        ...overrides,
    };
    return { ...render(<CompressAssetsDialog {...props} />), props };
}

describe('CompressAssetsDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        measureImageAssets.mockResolvedValue({
            images: [
                { height: 2000, name: 'main', uri: ASSETS[0].uri, width: 3000 },
                { height: 896, name: 'smile', uri: ASSETS[1].uri, width: 560 },
            ],
            skipped: 0,
        });
    });

    test('shows the megapixel presets and defaults to the recommended target', async () => {
        renderDialog();

        expect(await screen.findByRole('button', { name: '2 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1.5 MP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1 MP' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: '0.5 MP' })).toBeInTheDocument();
        expect(screen.getByText('1 of 2 supported images will be resized.')).toBeInTheDocument();
        expect(screen.getByText(/1 MP is more than enough/)).toBeInTheDocument();
        expect(measureImageAssets).toHaveBeenCalledWith(ASSETS, { onProgress: expect.any(Function) });
    });

    test('hides presets that would not shrink any image', async () => {
        measureImageAssets.mockResolvedValue({
            images: [{ height: 896, name: 'smile', uri: ASSETS[1].uri, width: 560 }],
            skipped: 0,
        });

        renderDialog({ assets: [ASSETS[1]] });

        expect(await screen.findByText(/nothing to shrink/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '0.5 MP' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Compress images' })).toBeDisabled();
    });

    test('explains when no local image can be compressed', async () => {
        measureImageAssets.mockResolvedValue({ images: [], skipped: 2 });

        renderDialog();

        expect(await screen.findByText(/No locally stored PNG, JPEG or WebP images/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Compress images' })).toBeDisabled();
    });

    test('compresses the chosen target and closes through the completion callback', async () => {
        const { props } = renderDialog();

        fireEvent.click(await screen.findByRole('button', { name: '0.5 MP' }));
        fireEvent.click(screen.getByRole('button', { name: 'Compress images' }));

        await waitFor(() => expect(props.onCompress).toHaveBeenCalledWith(0.5, expect.any(Object)));
        expect(props.onComplete).toHaveBeenCalledWith(SUMMARY);
        expect(props.onClose).not.toHaveBeenCalled();
    });

    test('shows determinate progress and a file name while compressing', async () => {
        const pending = deferred();
        renderDialog({
            onCompress: vi.fn(async (megapixels, { onProgress }) => {
                onProgress({ asset: { name: 'main', uri: ASSETS[0].uri }, completed: 1, total: 2 });
                return pending.promise;
            }),
        });

        fireEvent.click(await screen.findByRole('button', { name: 'Compress images' }));

        expect(await screen.findByText('Compressing main… 1 of 2')).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: 'Image asset compression progress' }))
            .toHaveAttribute('aria-valuenow', '50');
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

        await act(async () => {
            pending.resolve(SUMMARY);
            await pending.promise;
        });
    });

    test('keeps the dialog open and reports a failed inspection', async () => {
        measureImageAssets.mockRejectedValue(new Error('storage unavailable'));

        const { props } = renderDialog();

        expect(await screen.findByText(/could not be inspected/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Compress images' })).toBeDisabled();
        expect(props.onClose).not.toHaveBeenCalled();
    });
});
