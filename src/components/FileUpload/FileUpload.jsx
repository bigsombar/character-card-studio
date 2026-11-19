import { useRef } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * File picker strip used on the card's file bar.
 *
 * The input keeps the stable `file-upload` id and opens through the button, so selecting the same
 * file twice still fires `onChange`. The file name takes the remaining width and truncates, which
 * keeps the delete button pinned to the right edge.
 *
 * @param {string} acceptedFileTypes Value for the input's `accept`
 * @param {boolean} [displayDeleteButton] Show delete even without a selected file
 * @param {File|null} file Currently selected file
 * @param {Function} fileChange Input change handler
 * @param {Function} handleRemoveFile Delete handler
 */
export default function FileUpload({
    acceptedFileTypes,
    displayDeleteButton = false,
    file,
    fileChange,
    handleRemoveFile,
}) {
    const inputRef = useRef(null);

    const openPicker = () => inputRef.current?.click();

    return (
        <Box sx={{ alignItems: 'center', display: 'flex', flex: 1, minWidth: 0 }}>
            <input
                accept={acceptedFileTypes}
                hidden
                id="file-upload"
                onChange={fileChange}
                onClick={(event) => { event.currentTarget.value = ''; }}
                ref={inputRef}
                type="file"
            />
            <Button
                onClick={openPicker}
                size="small"
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                variant="contained"
            >
                Select File
            </Button>
            <Typography
                sx={{ flex: 1, ml: 2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={file ? file.name : undefined}
                variant="body2"
            >
                {file ? file.name : 'No file selected'}
            </Typography>
            {(file || displayDeleteButton) && (
                <IconButton
                    aria-label="Remove selected file"
                    color="error"
                    onClick={handleRemoveFile}
                    size="small"
                    sx={{ flexShrink: 0 }}
                >
                    <DeleteIcon />
                </IconButton>
            )}
        </Box>
    );
}
