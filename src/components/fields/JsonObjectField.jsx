import { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';

import FieldLabel from './FieldLabel';

/**
 * Small JSON object editor for CCv3 `extensions`, which are free-form and cannot be
 * represented by typed fields. Changes only apply when the JSON parses as an object.
 */
export default function JsonObjectField({ label, helpKey, value, onApply, rows = 3 }) {
    const serialized = JSON.stringify(value ?? {}, null, 2);
    const [text, setText] = useState(serialized);
    const [error, setError] = useState(null);

    useEffect(() => {
        setText(serialized);
        setError(null);
    }, [serialized]);

    const apply = () => {
        try {
            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Expected a JSON object such as {"key": "value"}.');
            }
            onApply(parsed);
            setError(null);
        } catch (parseError) {
            setError(parseError.message);
        }
    };

    return (
        <Box>
            <FieldLabel helpKey={helpKey} text={label} sx={{ mb: 0.5 }} />
            <TextField
                autoComplete="off"
                error={Boolean(error)}
                fullWidth
                minRows={rows}
                multiline
                onChange={(event) => {
                    setText(event.target.value);
                    setError(null);
                }}
                slotProps={{ htmlInput: {
                    'aria-label': label,
                    style: { fontFamily: 'monospace', fontSize: '0.82rem' },
                } }}
                value={text}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography color={error ? 'error.main' : 'text.secondary'} variant="caption">
                    {error ?? 'Extensions are preserved verbatim; unknown keys are never dropped.'}
                </Typography>
                <Button onClick={apply} size="small" variant="outlined">Apply JSON</Button>
            </Stack>
        </Box>
    );
}
