import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import UploadOutlined from '@mui/icons-material/UploadOutlined';

import exampleAvatar from '../../assets/example_avatar.png';

// Leave room for the app chrome, file strip, buttons and captions so the portrait card never needs
// its own scrollbar while still keeping the image at its natural aspect ratio.
const DESKTOP_CHROME_HEIGHT = 380;
const MAX_IMAGE_WIDTH = { compact: 320, full: 400 };
const PANEL_PADDING = { compact: 12, full: 16 };

function imageFitSize({ availableWidth, compact, naturalSize, viewportHeight }) {
    if (!naturalSize || !availableWidth) return null;

    const padding = compact ? PANEL_PADDING.compact : PANEL_PADDING.full;
    const maxWidth = Math.min(
        compact ? MAX_IMAGE_WIDTH.compact : MAX_IMAGE_WIDTH.full,
        Math.max(0, availableWidth - padding * 2),
    );
    const maxHeight = compact
        ? Math.max(240, Math.round(viewportHeight * 0.6))
        : Math.max(240, viewportHeight - DESKTOP_CHROME_HEIGHT);
    const scale = Math.min(maxWidth / naturalSize.width, maxHeight / naturalSize.height);

    return {
        height: Math.max(1, Math.round(naturalSize.height * scale)),
        width: Math.max(1, Math.round(naturalSize.width * scale)),
    };
}

/**
 * Portrait column: click the image to replace it, or use the explicit upload button.
 * The resolved main icon wins over the legacy stored preview, matching export behavior.
 */
export default function PortraitPanel({ compact = false, displayPortrait, fileName, onCompress, onUpload, sizeLabel, sizeHint }) {
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const [availableWidth, setAvailableWidth] = useState(0);
    const [naturalSize, setNaturalSize] = useState(null);
    const [viewportHeight, setViewportHeight] = useState(() => (
        typeof window === 'undefined' ? 900 : window.innerHeight
    ));
    const isDefaultPortrait = displayPortrait === exampleAvatar;

    useLayoutEffect(() => {
        const element = containerRef.current;
        if (!element) return undefined;

        const measure = () => setAvailableWidth(element.clientWidth);
        measure();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }

        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const updateViewportHeight = () => setViewportHeight(window.innerHeight);
        window.addEventListener('resize', updateViewportHeight);
        return () => window.removeEventListener('resize', updateViewportHeight);
    }, []);

    const fittedSize = imageFitSize({ availableWidth, compact, naturalSize, viewportHeight });
    const padding = compact ? PANEL_PADDING.compact : PANEL_PADDING.full;
    const cardWidth = fittedSize ? fittedSize.width + padding * 2 + 2 : null;

    const handleImageLoad = (event) => {
        const { naturalHeight, naturalWidth } = event.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0) {
            setNaturalSize({ height: naturalHeight, width: naturalWidth });
        }
    };

    return (
        <Box
            ref={containerRef}
            sx={{
                display: 'flex',
                justifyContent: 'center',
                minWidth: 0,
                width: '100%',
            }}
        >
            <Box
                sx={{
                    alignItems: 'center',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: compact ? 1 : 1.5,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    p: compact ? 1.5 : 2,
                    width: compact && cardWidth ? `${cardWidth}px` : '100%',
                }}
            >
                <Box
                    alt={isDefaultPortrait ? 'Default portrait' : fileName || 'Uploaded portrait'}
                    aria-label="Change portrait"
                    component="img"
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            inputRef.current?.click();
                        }
                    }}
                    onLoad={handleImageLoad}
                    role="button"
                    src={displayPortrait}
                    sx={{
                        borderRadius: 2,
                        cursor: 'pointer',
                        display: 'block',
                        height: fittedSize ? `${fittedSize.height}px` : 'auto',
                        maxWidth: '100%',
                        width: fittedSize ? `${fittedSize.width}px` : '100%',
                        '&:focus-visible': { outline: '2px solid #FFE400', outlineOffset: 2 },
                    }}
                    tabIndex={0}
                />

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                    <Button onClick={() => inputRef.current?.click()} size="small" startIcon={<UploadOutlined />} variant="outlined">
                        Upload portrait
                    </Button>
                    {!isDefaultPortrait && (
                        <Button onClick={onCompress} size="small" variant="text">Compress</Button>
                    )}
                </Stack>
                {!compact && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center' }} variant="caption">
                        The portrait is also the main icon asset and is used by PNG export.
                    </Typography>
                )}
                {sizeLabel && (
                    <Tooltip title={sizeHint ?? ''}>
                        <Typography color="text.secondary" variant="caption">
                            {sizeLabel}
                        </Typography>
                    </Tooltip>
                )}

                <input accept="image/*" hidden onChange={onUpload} ref={inputRef} type="file" />
            </Box>
        </Box>
    );
}
