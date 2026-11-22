import { useRef, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import CleaningServicesOutlined from '@mui/icons-material/CleaningServicesOutlined';
import FindReplaceOutlined from '@mui/icons-material/FindReplaceOutlined';

import ConfirmActionDialog from '../components/dialogs/ConfirmActionDialog';
import LinkedMediaPanel from '../components/linkedMedia/LinkedMediaPanel';
import { useCardStore } from '../context/cardStoreContext';
import { useNotifications } from '../context/NotificationContext';
import removeEmphasisMarkup from '../utils/emphasis';

/** Bulk text tools: emphasis cleanup and a deliberately simple find/replace. */
export default function ToolsSection() {
    const { patchCardData } = useCardStore();
    const { notify } = useNotifications();
    const findInputRef = useRef(null);
    const replacementInputRef = useRef(null);
    const [confirmRemoveEmphasis, setConfirmRemoveEmphasis] = useState(false);
    const [pendingReplace, setPendingReplace] = useState(null);

    const stripEmphasis = () => {
        patchCardData((prev) => {
            const data = prev.data;
            return {
                first_mes: removeEmphasisMarkup(data.first_mes),
                mes_example: removeEmphasisMarkup(data.mes_example),
                alternate_greetings: data.alternate_greetings.map(removeEmphasisMarkup),
                group_only_greetings: data.group_only_greetings.map(removeEmphasisMarkup),
            };
        });
        setConfirmRemoveEmphasis(false);
        notify({
            title: 'Emphasis markup removed',
            severity: 'success',
            message: 'Message and greeting fields were cleaned.',
        });
    };

    const requestReplace = () => {
        const findText = findInputRef.current?.value ?? '';
        const replacementText = replacementInputRef.current?.value ?? '';
        if (!findText) {
            notify({ title: 'Nothing to find', severity: 'warning', message: 'Enter text to find and replace.' });
            return;
        }
        setPendingReplace([findText, replacementText]);
    };

    const applyReplace = () => {
        if (!pendingReplace) return;
        const [findText, replacementText] = pendingReplace;
        patchCardData((prev) => {
            const data = prev.data;
            return {
                description: data.description.replaceAll(findText, replacementText),
                personality: data.personality.replaceAll(findText, replacementText),
                scenario: data.scenario.replaceAll(findText, replacementText),
                first_mes: data.first_mes.replaceAll(findText, replacementText),
                mes_example: data.mes_example.replaceAll(findText, replacementText),
                alternate_greetings: data.alternate_greetings.map((greeting) => greeting.replaceAll(findText, replacementText)),
                group_only_greetings: data.group_only_greetings.map((greeting) => greeting.replaceAll(findText, replacementText)),
            };
        });
        setPendingReplace(null);
        notify({ title: 'Text replaced', severity: 'success', message: 'The replacement was applied to all text fields.' });
    };

    return (
        <Stack spacing={3}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Linked media</Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5 }} variant="body2">
                    Download images, GIFs, audio and video linked from the card text, then replace those URLs with
                    local assets that are embedded into CHARX exports.
                </Typography>
                <LinkedMediaPanel />
            </Box>

            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Remove emphasis markup</Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5 }} variant="body2">
                    Removes paired *…*, **…** and ***…*** markers from the first message, example messages and every
                    greeting. Literal asterisks and unclosed markers are preserved.
                </Typography>
                <Button
                    onClick={() => setConfirmRemoveEmphasis(true)}
                    startIcon={<CleaningServicesOutlined />}
                    variant="outlined"
                >
                    Remove emphasis markup
                </Button>
            </Box>

            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Find and replace</Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5 }} variant="body2">
                    Literal replacement across description, personality, scenario and all greetings. There is no
                    regex support and no undo.
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' } }}>
                    <TextField inputRef={findInputRef} label="Find text" size="small" />
                    <TextField inputRef={replacementInputRef} label="Replacement" size="small" />
                </Box>
                <Button onClick={requestReplace} startIcon={<FindReplaceOutlined />} sx={{ mt: 1.5 }} variant="contained">
                    Find and replace
                </Button>
            </Box>

            <ConfirmActionDialog
                dialogContent="Paired emphasis markers will be removed from the first message, examples and every greeting. There is no undo."
                dialogTitle="Remove emphasis markup?"
                handleClose={() => setConfirmRemoveEmphasis(false)}
                handleConfirm={stripEmphasis}
                open={confirmRemoveEmphasis}
            />
            <ConfirmActionDialog
                dialogContent={pendingReplace
                    ? `Replace every occurrence of "${pendingReplace[0]}" in all text fields? There is no undo.`
                    : ''}
                dialogTitle="Apply find and replace?"
                handleClose={() => setPendingReplace(null)}
                handleConfirm={applyReplace}
                open={Boolean(pendingReplace)}
            />
        </Stack>
    );
}
