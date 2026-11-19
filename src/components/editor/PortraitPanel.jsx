import { useRef } from 'react';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import PersonOutline from '@mui/icons-material/PersonOutlineOutlined';
import UploadOutlined from '@mui/icons-material/UploadOutlined';

import default_avatar from '../../assets/default_avatar.png';

/**
 * Portrait column: click the image to replace it, or use the explicit upload button.
 * The resolved main icon wins over the legacy stored preview, matching export behavior.
 */
export default function PortraitPanel({ displayPortrait, fileName, onCompress, onUpload, sizeLabel, sizeHint }) {
    const inputRef = useRef(null);

    return (
        <Box
            sx={{
                alignItems: 'center',
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                gap: 1.5,
                height: '100%',
                minWidth: 0,
                overflow: 'auto',
                p: 2,
            }}
        >
            <Box
                aria-label="Change portrait"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                role="button"
                sx={{
                    alignItems: 'center',
                    aspectRatio: { xs: '16 / 10', md: undefined },
                    bgcolor: 'background.default',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    flex: { xs: '0 0 auto', md: 1 },
                    justifyContent: 'center',
                    maxHeight: { xs: 240, md: 'none' },
                    overflow: 'hidden',
                    width: '100%',
                    '&:focus-visible': { outline: '2px solid #FFE400', outlineOffset: 2 },
                }}
                tabIndex={0}
            >
                {displayPortrait !== default_avatar ? (
                    <img
                        alt={fileName || 'Uploaded portrait'}
                        src={displayPortrait}
                        style={{ height: '100%', objectFit: 'cover', width: '100%' }}
                    />
                ) : (
                    <PersonOutline sx={{ color: 'text.disabled', fontSize: 96 }} />
                )}
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                <Button onClick={() => inputRef.current?.click()} size="small" startIcon={<UploadOutlined />} variant="outlined">
                    Upload portrait
                </Button>
                {displayPortrait !== default_avatar && (
                    <Button onClick={onCompress} size="small" variant="text">Compress</Button>
                )}
            </Stack>
            <Typography color="text.secondary" sx={{ textAlign: 'center' }} variant="caption">
                The portrait is also the main icon asset and is used by PNG export.
            </Typography>
            {sizeLabel && (
                <Tooltip title={sizeHint ?? ''}>
                    <Typography color="text.secondary" variant="caption">
                        {sizeLabel}
                    </Typography>
                </Tooltip>
            )}

            <input accept="image/*" hidden onChange={onUpload} ref={inputRef} type="file" />
        </Box>
    );
}
