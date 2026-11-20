import { useRef, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import CleaningServicesOutlined from '@mui/icons-material/CleaningServicesOutlined';
import FindReplaceOutlined from '@mui/icons-material/FindReplaceOutlined';

import ConfirmationDialog from '../components/ConfirmationDialog/ConfirmationDialog';
import LinkedMediaPanel from '../components/linkedMedia/LinkedMediaPanel';
import { useCard } from '../context/cardContext';
import { useNotifications } from '../context/NotificationContext';

const ASTERISK_PATTERN = /\*(.+?)\*/g;

/** Bulk text tools: asterisk cleanup and a deliberately simple find/replace. */
export default function ToolsSection() {
    const { patchCardData } = useCard();
    const { notify } = useNotifications();
    const toFindRef = useRef(null);
    const toReplaceRef = useRef(null);
    const [confirmPurge, setConfirmPurge] = useState(false);
    const [pendingReplace, setPendingReplace] = useState(null);

    const purgeAsterisks = () => {
        patchCardData((prev) => {
            const data = prev.data;
            return {
                first_mes: data.first_mes.replace(ASTERISK_PATTERN, '$1'),
                mes_example: data.mes_example.replace(ASTERISK_PATTERN, '$1'),
                alternate_greetings: data.alternate_greetings.map((greeting) => greeting.replace(ASTERISK_PATTERN, '$1')),
                group_only_greetings: data.group_only_greetings.map((greeting) => greeting.replace(ASTERISK_PATTERN, '$1')),
            };
        });
        setConfirmPurge(false);
        notify({ title: 'Asterisks removed', severity: 'success', message: 'Greeting and example fields were cleaned.' });
    };

    const requestReplace = () => {
        const toFind = toFindRef.current?.value ?? '';
        const toReplace = toReplaceRef.current?.value ?? '';
        if (!toFind) {
            notify({ title: 'Nothing to find', severity: 'warning', message: 'Enter text to find and replace.' });
            return;
        }
        setPendingReplace([toFind, toReplace]);
    };

    const applyReplace = () => {
        if (!pendingReplace) return;
        const [toFind, toReplace] = pendingReplace;
        patchCardData((prev) => {
            const data = prev.data;
            return {
                description: data.description.replaceAll(toFind, toReplace),
                personality: data.personality.replaceAll(toFind, toReplace),
                scenario: data.scenario.replaceAll(toFind, toReplace),
                first_mes: data.first_mes.replaceAll(toFind, toReplace),
                mes_example: data.mes_example.replaceAll(toFind, toReplace),
                alternate_greetings: data.alternate_greetings.map((greeting) => greeting.replaceAll(toFind, toReplace)),
                group_only_greetings: data.group_only_greetings.map((greeting) => greeting.replaceAll(toFind, toReplace)),
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
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Purge asterisks</Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5 }} variant="body2">
                    Removes formatting asterisks from the first message, example messages and every greeting.
                </Typography>
                <Button onClick={() => setConfirmPurge(true)} startIcon={<CleaningServicesOutlined />} variant="outlined">
                    Purge asterisks
                </Button>
            </Box>

            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Find and replace</Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5 }} variant="body2">
                    Literal replacement across description, personality, scenario and all greetings. There is no
                    regex support and no undo.
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                    <TextField inputRef={toFindRef} label="Text to find" size="small" />
                    <TextField inputRef={toReplaceRef} label="Replacement" size="small" />
                </Box>
                <Button onClick={requestReplace} startIcon={<FindReplaceOutlined />} sx={{ mt: 1.5 }} variant="contained">
                    Find and replace
                </Button>
            </Box>

            <ConfirmationDialog
                dialogContent="Remove all asterisks from the first message, examples and every greeting? This action cannot be undone."
                dialogTitle="Purge asterisks?"
                handleClose={() => setConfirmPurge(false)}
                handleConfirm={purgeAsterisks}
                open={confirmPurge}
            />
            <ConfirmationDialog
                dialogContent={pendingReplace
                    ? `Replace every occurrence of "${pendingReplace[0]}" in all text fields? This action cannot be undone.`
                    : ''}
                dialogTitle="Apply find and replace?"
                handleClose={() => setPendingReplace(null)}
                handleConfirm={applyReplace}
                open={Boolean(pendingReplace)}
            />
        </Stack>
    );
}
