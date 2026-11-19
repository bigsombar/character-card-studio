import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import FileUpload from './FileUpload';

function makeFile(name = 'card.json') {
    return new File(['{}'], name, { type: 'application/json' });
}

describe('FileUpload', () => {
    test('shows the empty state and no delete button without a file', () => {
        render(
            <FileUpload acceptedFileTypes=".json" file={null} fileChange={vi.fn()} handleRemoveFile={vi.fn()} />,
        );

        expect(screen.getByText('No file selected')).toBeInTheDocument();
        expect(screen.getByText('Select File')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Remove selected file' })).not.toBeInTheDocument();
        expect(document.querySelector('#file-upload')).toHaveAttribute('accept', '.json');
    });

    test('shows the file name and lets the user remove it', () => {
        const handleRemoveFile = vi.fn();
        const file = makeFile();

        render(
            <FileUpload acceptedFileTypes=".json" file={file} fileChange={vi.fn()} handleRemoveFile={handleRemoveFile} />,
        );

        expect(screen.getByText('card.json')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Remove selected file' }));

        expect(handleRemoveFile).toHaveBeenCalledTimes(1);
    });

    test('can force the delete button without a file', () => {
        render(
            <FileUpload
                acceptedFileTypes=".json"
                displayDeleteButton
                file={null}
                fileChange={vi.fn()}
                handleRemoveFile={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: 'Remove selected file' })).toBeInTheDocument();
    });

    test('forwards file selections to the change handler', () => {
        const fileChange = vi.fn();
        render(
            <FileUpload acceptedFileTypes=".json,.png" file={null} fileChange={fileChange} handleRemoveFile={vi.fn()} />,
        );

        const input = document.querySelector('#file-upload');
        const file = makeFile('portrait.png');
        fireEvent.change(input, { target: { files: [file] } });

        expect(fileChange).toHaveBeenCalledTimes(1);
        expect(fileChange.mock.calls[0][0].target.files[0]).toBe(file);
    });
});
