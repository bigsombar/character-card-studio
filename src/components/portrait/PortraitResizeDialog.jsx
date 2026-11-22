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

import formatByteSize from "../../utils/formatByteSize";
import usePortraitResize, { ORIGINAL_TARGET } from "./usePortraitResize";
import { formatMegapixels } from "./portraitResize";

function describeSize(info) {
    return `${info.width} × ${info.height} (${formatMegapixels(info.width, info.height)}, ${formatByteSize(info.bytes)})`;
}

/** Target picker. Only sizes that actually reduce the measured portrait are shown. */
function PortraitSizePicker({ onChoose, selected, targets }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Typography color="text.secondary" variant="overline">Target size</Typography>
            <ToggleButtonGroup
                exclusive
                fullWidth
                onChange={(event, nextTarget) => onChoose(nextTarget)}
                size="small"
                value={selected}
            >
                <ToggleButton value={ORIGINAL_TARGET}>Original</ToggleButton>
                {targets.map((megapixels) => (
                    <ToggleButton key={megapixels} value={megapixels}>{megapixels} MP</ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Box>
    );
}

/**
 * Preview frame used while a target is being prepared. The previous preview stays visible under a
 * translucent spinner so the dialog does not collapse between target changes.
 */
function PortraitPreview({ error, isWorking, original, preview }) {
    const visible = preview ?? (isWorking ? original : null);
    const showSpinner = isWorking || (!preview && !error);

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
            {visible && (
                <Box
                    alt="Portrait preview at the chosen size"
                    component="img"
                    src={visible.dataUrl}
                    sx={{
                        display: "block",
                        height: "100%",
                        objectFit: "contain",
                        opacity: isWorking ? 0.4 : 1,
                        width: "100%",
                    }}
                />
            )}
            {showSpinner && (
                <CircularProgress
                    aria-label="Preparing portrait preview"
                    sx={{ left: "50%", position: "absolute", top: "50%", translate: "-50% -50%" }}
                />
            )}
        </Box>
    );
}

/** Before/after summary with the measured byte saving. */
function PortraitSizeSummary({ original, preview, savedBytes }) {
    if (!original) return null;

    const changed = preview && (
        preview.width !== original.width
        || preview.height !== original.height
        || preview.bytes !== original.bytes
    );

    return (
        <Box>
            <Typography color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }} variant="body2">
                {describeSize(original)}
                {changed && (
                    <>
                        {" → "}
                        <Box component="strong" sx={{ color: "text.primary" }}>{describeSize(preview)}</Box>
                    </>
                )}
            </Typography>
            {savedBytes > 0 && (
                <Typography color="success.main" variant="caption">
                    Saves {formatByteSize(savedBytes)}
                </Typography>
            )}
        </Box>
    );
}

/**
 * Portrait resizing dialog.
 *
 * The preview is always regenerated from the source portrait, never from the previous preview.
 * `onCommit` receives only the data URL the user explicitly applies; dismissing the dialog leaves
 * the card untouched.
 *
 * @param {boolean} open
 * @param {string} portraitSource Data URL of the portrait loaded this session
 * @param {Function} onDismiss Called when the dialog closes without changes
 * @param {Function} onCommit Called with the chosen preview data URL
 */
const PortraitResizeDialog = ({ open, portraitSource, onDismiss, onCommit }) => {
    const {
        chooseTarget,
        error,
        isWorking,
        original,
        preview,
        savedBytes,
        selectedTarget,
        targets,
    } = usePortraitResize({
        open,
        source: portraitSource,
    });

    return (
        <Dialog
            aria-describedby="portrait-resize-hint"
            fullWidth
            maxWidth="sm"
            onClose={onDismiss}
            open={open}
        >
            <DialogTitle>Resize portrait</DialogTitle>
            <DialogContent>
                <DialogContentText id="portrait-resize-hint" sx={{ mb: 2 }} variant="body2">
                    Choose a target size for the portrait. For roleplay apps, 1 MP is more than enough.
                </DialogContentText>
                {original && (
                    <PortraitSizePicker
                        onChoose={chooseTarget}
                        selected={selectedTarget}
                        targets={targets}
                    />
                )}
                {original && targets.length === 0 && (
                    <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                        This portrait is already small enough, so there is nothing to shrink.
                    </Typography>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <PortraitPreview
                    error={error}
                    isWorking={isWorking}
                    original={original}
                    preview={preview}
                />
            </DialogContent>
            <DialogActions
                sx={{
                    alignItems: "stretch",
                    flexDirection: "column",
                    gap: 1,
                    px: 3,
                    pb: 2,
                }}
            >
                {/* Reserve the summary height so longer before/after strings cannot resize the dialog. */}
                <Box sx={{ alignItems: "center", display: "flex", minHeight: 44 }}>
                    <PortraitSizeSummary original={original} preview={preview} savedBytes={savedBytes} />
                </Box>
                <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", width: "100%" }}>
                    <Button onClick={onDismiss} variant="outlined">Cancel</Button>
                    <Button
                        disabled={isWorking || !preview}
                        onClick={() => onCommit(preview.dataUrl)}
                        variant="contained"
                    >
                        Use this size
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

export default PortraitResizeDialog;
