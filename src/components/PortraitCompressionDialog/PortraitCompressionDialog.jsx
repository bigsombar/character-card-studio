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
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";

import formatBytes from "../../utils/formatBytes";
import usePortraitCompression, { ORIGINAL_TARGET } from "./usePortraitCompression";
import { formatMegapixels } from "./portraitCompression";

function describeSize(info) {
    return `${info.width} × ${info.height} (${formatMegapixels(info.width, info.height)}, ${formatBytes(info.bytes)})`;
}

/**
 * Megapixel picker for the portrait dialog. The original is always offered; smaller targets only
 * appear when they actually reduce the current image.
 */
function PortraitSizePicker({ onSelect, presets, target }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Typography color="text.secondary" variant="overline">Target size</Typography>
            <ToggleButtonGroup
                exclusive
                fullWidth
                onChange={(event, nextTarget) => onSelect(nextTarget)}
                size="small"
                value={target}
            >
                <ToggleButton value={ORIGINAL_TARGET}>Original</ToggleButton>
                {presets.map((megapixels) => (
                    <ToggleButton key={megapixels} value={megapixels}>{megapixels} MP</ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Box>
    );
}

/**
 * Preview and spinner. The image fills the frame and uses `object-fit: contain`, so the whole
 * portrait stays visible with letterboxing instead of being cropped.
 */
function PortraitPreview({ busy, error, result }) {
    const showSpinner = busy || (!result && !error);

    return (
        <Box
            sx={{
                display: "flex",
                height: 240,
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
                width: "100%",
            }}
        >
            {result && (
                <Box
                    alt="Portrait preview at the chosen size"
                    component="img"
                    src={result.dataUrl}
                    sx={{
                        display: "block",
                        height: "100%",
                        objectFit: "contain",
                        opacity: busy ? 0.4 : 1,
                        width: "100%",
                    }}
                />
            )}
            {showSpinner && <CircularProgress sx={{ left: "50%", position: "absolute", top: "50%", translate: "-50% -50%" }} />}
        </Box>
    );
}

/** Compact before/after summary shown next to the dialog actions. */
function PortraitSizeSummary({ original, result }) {
    if (!original) return null;

    const changed = result && (
        result.width !== original.width
        || result.height !== original.height
        || result.bytes !== original.bytes
    );

    return (
        <Typography color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }} variant="body2">
            {describeSize(original)}
            {changed && (
                <>
                    {" → "}
                    <Box component="strong" sx={{ color: "text.primary" }}>{describeSize(result)}</Box>
                </>
            )}
        </Typography>
    );
}

/**
 * Lets the user resize the card portrait to a megapixel budget. Compression always starts from
 * `source` (the portrait as uploaded/loaded this session), so choosing another target or returning
 * to "Original" never accumulates losses from an earlier resize.
 *
 * @param {boolean} open
 * @param {string} source Data URL of the original portrait
 * @param {*} onClose
 * @param {*} onApply Called with the chosen portrait's data URL
 */
const PortraitCompressionDialog = ({ open, source, onClose, onApply }) => {
    const { busy, error, original, presets, result, selectTarget, target } = usePortraitCompression({
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
                    Pick a target size for the portrait. For roleplay apps, 1 MP is more than enough.
                </DialogContentText>
                {original && (
                    <PortraitSizePicker onSelect={selectTarget} presets={presets} target={target} />
                )}
                {original && presets.length === 0 && (
                    <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                        This portrait is already small enough, so there is nothing to shrink.
                    </Typography>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <PortraitPreview busy={busy} error={error} result={result} />
            </DialogContent>
            <DialogActions
                sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    justifyContent: "space-between",
                    px: 3,
                    pb: 2,
                }}
            >
                <PortraitSizeSummary original={original} result={result} />
                <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                    <Button onClick={onClose} variant="outlined">Cancel</Button>
                    <Button disabled={busy || !result} onClick={() => onApply(result.dataUrl)} variant="contained">Apply</Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

export default PortraitCompressionDialog;
