import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    Typography,
} from '@mui/material';

function formatDate(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'date not set';
    return new Date(value * 1000).toLocaleString();
}

function candidateLabel(candidate) {
    const format = candidate.keyword === 'ccv3' ? 'V3' : 'V2';
    const name = candidate.name || 'Untitled character';
    const entries = candidate.entries === 1 ? '1 lorebook entry' : `${candidate.entries} lorebook entries`;
    return `${format} · ${name} · ${entries} · ${formatDate(candidate.modified)}`;
}

/**
 * Asks which embedded card payload to import when a PNG carries both V3 and V2 copies that differ.
 * The V3 entry is preselected; the V2 choice is explicit because it goes through upcasting.
 */
export default function EmbeddedCardDialog({ candidates = [], onCancel, onSelect, open }) {
    const defaultKeyword = candidates.find((candidate) => candidate.keyword === 'ccv3')?.keyword
        ?? candidates[0]?.keyword
        ?? '';
    const [selectedKeyword, setSelectedKeyword] = useState(defaultKeyword);

    useEffect(() => {
        if (open) setSelectedKeyword(defaultKeyword);
    }, [defaultKeyword, open]);

    const selected = candidates.find((candidate) => candidate.keyword === selectedKeyword);

    return (
        <Dialog
            aria-describedby="embedded-card-hint"
            aria-labelledby="embedded-card-title"
            fullWidth
            maxWidth="sm"
            onClose={onCancel}
            open={open}
        >
            <DialogTitle id="embedded-card-title">Choose embedded card</DialogTitle>
            <DialogContent>
                <DialogContentText id="embedded-card-hint" sx={{ mb: 2 }} variant="body2">
                    This PNG contains more than one card payload. V3 is recommended; a V2 copy will be
                    converted to V3 during import.
                </DialogContentText>
                <RadioGroup
                    aria-label="Embedded card copy"
                    onChange={(event) => setSelectedKeyword(event.target.value)}
                    value={selectedKeyword}
                >
                    {candidates.map((candidate) => (
                        <FormControlLabel
                            control={<Radio />}
                            key={candidate.keyword}
                            label={(
                                <Stack spacing={0.25} sx={{ py: 0.5 }}>
                                    <Typography sx={{ fontWeight: 600 }}>
                                        {candidate.keyword === 'ccv3' ? 'V3 copy' : 'V2 copy'}
                                    </Typography>
                                    <Typography color="text.secondary" variant="body2">
                                        {candidateLabel(candidate)}
                                    </Typography>
                                </Stack>
                            )}
                            value={candidate.keyword}
                            sx={{ alignItems: 'flex-start', mb: 0.5 }}
                        />
                    ))}
                </RadioGroup>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} variant="outlined">Cancel</Button>
                <Button
                    disabled={!selected}
                    onClick={() => selected && onSelect(selected)}
                    variant="contained"
                >
                    Import selected
                </Button>
            </DialogActions>
        </Dialog>
    );
}
