import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';

import { useCard } from '../../context/cardContext';
import FieldLabel from './FieldLabel';

const SUGGESTED_CODES = ['en', 'ru', 'ja', 'zh', 'de', 'fr', 'es', 'pt', 'ko'];
const LANGUAGE_CODE = /^[a-z]{0,2}$/;

/**
 * Edits `creator_notes_multilingual` as a list of { language code, notes } rows.
 * Keys are lowercased ISO 639-1 codes; an empty map is stored as undefined.
 */
export default function MultilingualNotesEditor() {
    const { cardData, patchCardData } = useCard();
    const notes = cardData.data.creator_notes_multilingual ?? {};
    const rows = Object.entries(notes);

    const commit = (nextNotes) => {
        patchCardData({
            creator_notes_multilingual: Object.keys(nextNotes).length > 0 ? nextNotes : undefined,
        });
    };

    const addRow = () => {
        const code = SUGGESTED_CODES.find((candidate) => !Object.hasOwn(notes, candidate)) ?? '';
        if (Object.hasOwn(notes, code)) return;
        commit({ ...notes, [code]: '' });
    };

    const handleCodeChange = (oldCode, rawValue) => {
        const nextCode = rawValue.trim().toLowerCase();
        if (!LANGUAGE_CODE.test(nextCode)) return;
        if (nextCode === oldCode) return;
        if (nextCode && Object.hasOwn(notes, nextCode)) return;

        const nextNotes = {};
        for (const [code, text] of Object.entries(notes)) {
            nextNotes[code === oldCode ? nextCode : code] = text;
        }
        commit(nextNotes);
    };

    const handleTextChange = (code, text) => {
        commit({ ...notes, [code]: text });
    };

    const handleRemove = (code) => {
        const nextNotes = { ...notes };
        delete nextNotes[code];
        commit(nextNotes);
    };

    return (
        <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <FieldLabel helpKey="creator_notes_multilingual" text="Creator notes by language" />
                <Button onClick={addRow} size="small" startIcon={<Add />} variant="text">Add language</Button>
            </Stack>

            {rows.length === 0 ? (
                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography color="text.secondary" variant="body2">
                        No translations yet. Add a language to provide localized creator notes; readers fall back to
                        English, then to the main creator notes.
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={1.25}>
                    {rows.map(([code, text]) => (
                        <Box
                            key={code || 'empty-code'}
                            sx={{
                                alignItems: 'flex-start',
                                display: 'grid',
                                gap: 1,
                                gridTemplateColumns: '96px minmax(0, 1fr) auto',
                            }}
                        >
                            <TextField
                                onChange={(event) => handleCodeChange(code, event.target.value)}
                                placeholder="en"
                                size="small"
                                slotProps={{ htmlInput: {
                                    'aria-label': `Language code for ${code || 'new translation'}`,
                                    maxLength: 2,
                                    style: { fontFamily: 'monospace', textTransform: 'lowercase' },
                                } }}
                                value={code}
                            />
                            <TextField
                                fullWidth
                                minRows={2}
                                multiline
                                onChange={(event) => handleTextChange(code, event.target.value)}
                                placeholder="Localized creator notes…"
                                size="small"
                                slotProps={{ htmlInput: { 'aria-label': `Creator notes in ${code || 'new language'}` } }}
                                value={text}
                            />
                            <IconButton aria-label={`Remove ${code || 'empty'} translation`} color="error" onClick={() => handleRemove(code)}>
                                <DeleteOutline />
                            </IconButton>
                        </Box>
                    ))}
                </Stack>
            )}
            <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="caption">
                Use lowercase ISO 639-1 codes. Duplicate codes and codes longer than two letters are rejected here.
            </Typography>
        </Box>
    );
}
