import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

/**
 * Generic confirmation dialog used for destructive actions. The app is dark-only, so the actions
 * use the same primary/error colors everywhere instead of switching on a theme mode.
 *
 * @param {boolean} open
 * @param {Function} handleClose Dismiss handler, also used by the Cancel button
 * @param {React.ReactNode} dialogTitle
 * @param {React.ReactNode} dialogContent
 * @param {Function} handleConfirm Confirmation handler
 */
export default function ConfirmActionDialog({ open, handleClose, dialogTitle, dialogContent, handleConfirm }) {
    return (
        <Dialog
            aria-describedby="confirm-action-description"
            aria-labelledby="confirm-action-title"
            onClose={handleClose}
            open={open}
        >
            <DialogTitle id="confirm-action-title">{dialogTitle}</DialogTitle>
            <DialogContent>
                <DialogContentText id="confirm-action-description">
                    {dialogContent}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button color="primary" onClick={handleClose} variant="contained">Cancel</Button>
                <Button color="error" onClick={handleConfirm} variant="contained">Confirm</Button>
            </DialogActions>
        </Dialog>
    );
}
