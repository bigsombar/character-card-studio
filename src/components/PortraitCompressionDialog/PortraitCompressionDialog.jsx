import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from "@mui/material";

import formatBytes from "../../utils/formatBytes";
import usePortraitCompression from "./usePortraitCompression";

/**
 * Lets the user downscale the card portrait to cut the exported PNG's size. Always compresses from
 * `source` (the portrait as uploaded/loaded this session), so picking a different size, or "Original",
 * never stacks losses from an earlier compression.
 *
 * @param {boolean} open
 * @param {string} source Data URL of the original portrait
 * @param {*} onClose
 * @param {*} onApply Called with the chosen portrait's data URL
 */
const PortraitCompressionDialog = ({open, source, onClose, onApply}) => {
    const { busy, error, maxSide, original, presets, result, selectSize } = usePortraitCompression({
        open,
        source,
    });

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby="compress-portrait-title" fullWidth maxWidth="sm">
            <DialogTitle id="compress-portrait-title">Compress portrait</DialogTitle>
            <DialogContent>
                <Typography color="text.secondary" variant="body2" sx={{mb: 2}}>
                    A portrait often accounts for most of a card's weight. Capping its long edge removes a large
                    share of the download, and frontends rarely need more than 1024 px.
                </Typography>
                {original &&
                    <>
                        <Typography variant="overline" color="text.secondary">Maximum long edge</Typography>
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            onChange={(event, value) => { selectSize(value); }}
                            size="small"
                            sx={{mb: 2}}
                            value={maxSide}
                        >
                            <ToggleButton value="original">Original</ToggleButton>
                            {presets.map((size) => <ToggleButton key={size} value={size}>{size}px</ToggleButton>)}
                        </ToggleButtonGroup>
                        {presets.length === 0 &&
                            <Typography color="text.secondary" variant="body2" sx={{mb: 2}}>
                                No smaller sizes are offered because this portrait already fits within 512 px.
                            </Typography>
                        }
                    </>
                }
                {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
                <Stack spacing={1.5} sx={{alignItems: 'center'}}>
                    <Box sx={{height: 240, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative"}}>
                        {result && <img alt="Portrait preview at the chosen size" src={result.dataUrl} style={{maxHeight: "100%", maxWidth: "100%", objectFit: "contain", opacity: busy ? 0.4 : 1}}/>}
                        {(busy || (!result && !error)) && <CircularProgress sx={{position: "absolute"}}/>}
                    </Box>
                    {original && result &&
                        <Typography variant="body2">
                            {original.width} × {original.height} · {formatBytes(original.bytes)}
                            {" → "}
                            <strong>{result.width} × {result.height} · {formatBytes(result.bytes)}</strong>
                        </Typography>
                    }
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">Cancel</Button>
                <Button disabled={busy || !result} onClick={() => onApply(result.dataUrl)} variant="contained">Apply</Button>
            </DialogActions>
        </Dialog>
    );
};

export default PortraitCompressionDialog;
