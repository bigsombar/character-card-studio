import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";

import formatBytes from "../../utils/formatBytes";
import usePortraitCompression, { ORIGINAL_SIZE } from "./usePortraitCompression";

/**
 * Size picker for the portrait dialog. The original is always offered; preset edges only appear
 * when they actually reduce the longest side.
 */
function PortraitSizePicker({ maxSide, onSelect, presets }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Typography color="text.secondary" variant="overline">Maximum long edge</Typography>
            <ToggleButtonGroup
                exclusive
                fullWidth
                onChange={(event, nextSize) => onSelect(nextSize)}
                size="small"
                value={maxSide}
            >
                <ToggleButton value={ORIGINAL_SIZE}>Original</ToggleButton>
                {presets.map((edge) => (
                    <ToggleButton key={edge} value={edge}>{edge}px</ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Box>
    );
}

/**
 * Preview and byte-size comparison. The measured source and the chosen result are shown together
 * so the trade-off is visible before the user confirms.
 */
function PortraitPreview({ busy, error, original, result }) {
    const showSpinner = busy || (!result && !error);

    return (
        <Box sx={{ display: "grid", gap: 1.25, justifyItems: "center" }}>
            <Box sx={{ display: "grid", height: 240, placeItems: "center", position: "relative", width: "100%" }}>
                {result && (
                    <Box
                        alt="Portrait preview at the chosen size"
                        component="img"
                        src={result.dataUrl}
                        sx={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", opacity: busy ? 0.4 : 1 }}
                    />
                )}
                {showSpinner && <CircularProgress sx={{ position: "absolute" }} />}
            </Box>
            {original && result && (
                <Typography color="text.secondary" variant="body2">
                    {formatBytes(original.bytes)} ({original.width} × {original.height})
                    {" → "}
                    <Box component="strong" sx={{ color: "text.primary" }}>
                        {formatBytes(result.bytes)} ({result.width} × {result.height})
                    </Box>
                </Typography>
            )}
        </Box>
    );
}

/**
 * Lets the user downscale the card portrait to cut the exported PNG's size. Compression always
 * starts from `source` (the portrait as uploaded/loaded this session), so choosing another size or
 * returning to "Original" never accumulates losses from an earlier compression.
 *
 * @param {boolean} open
 * @param {string} source Data URL of the original portrait
 * @param {*} onClose
 * @param {*} onApply Called with the chosen portrait's data URL
 */
const PortraitCompressionDialog = ({ open, source, onClose, onApply }) => {
    const { busy, error, maxSide, original, presets, result, selectSize } = usePortraitCompression({
        open,
        source,
    });

    return (
        <Dialog
            aria-describedby="portrait-compression-hint"
            fullWidth
            maxWidth="sm"
            onClose={onClose}
            open={open}
        >
            <DialogTitle>Compress portrait</DialogTitle>
            <DialogContent>
                <DialogContentText id="portrait-compression-hint" sx={{ mb: 2 }} variant="body2">
                    A portrait often accounts for most of a card's weight. Capping its long edge removes a large
                    share of the download, and frontends rarely need more than 1024 px.
                </DialogContentText>
                {original && (
                    <PortraitSizePicker maxSide={maxSide} onSelect={selectSize} presets={presets} />
                )}
                {original && presets.length === 0 && (
                    <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                        No smaller sizes are offered because this portrait already fits within 512 px.
                    </Typography>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <PortraitPreview busy={busy} error={error} original={original} result={result} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">Cancel</Button>
                <Button disabled={busy || !result} onClick={() => onApply(result.dataUrl)} variant="contained">Apply</Button>
            </DialogActions>
        </Dialog>
    );
};

export default PortraitCompressionDialog;
