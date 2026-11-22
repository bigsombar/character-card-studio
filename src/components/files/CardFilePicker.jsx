import { useRef } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * File picker strip used on the card's file bar.
 *
 * The hidden input is opened by the button so picking the same file twice still emits a change.
 * The name truncates to leave the remove control pinned to the right edge.
 *
 * @param {string} allowedExtensions Value for the input's `accept`
 * @param {boolean} [showRemoveButton] Keep the remove control visible without a selected file
 * @param {File|null} file Currently selected file
 * @param {Function} onFileChange Input change handler
 * @param {Function} onRemove Remove handler
 */
export default function CardFilePicker({
    allowedExtensions,
    showRemoveButton = false,
    file,
    onFileChange,
    onRemove,
}) {
    const inputRef = useRef(null);

    const openPicker = () => inputRef.current?.click();

    return (
        <Box sx={{ alignItems: 'center', display: 'flex', flex: 1, minWidth: 0 }}>
            <input
                accept={allowedExtensions}
                hidden
                id="card-file-input"
                onChange={onFileChange}
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
                Choose card file
            </Button>
            <Typography
                sx={{ flex: 1, ml: 2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={file ? file.name : undefined}
                variant="body2"
            >
                {file ? file.name : 'No card file selected'}
            </Typography>
            {(file || showRemoveButton) && (
                <IconButton
                    aria-label="Remove card file"
                    color="error"
                    onClick={onRemove}
                    size="small"
                    sx={{ flexShrink: 0 }}
                >
                    <DeleteIcon />
                </IconButton>
            )}
        </Box>
    );
}
