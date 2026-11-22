import { Alert, Stack } from '@mui/material';

import CardTextInput from '../components/fields/CardTextInput';
import { useCardStore } from '../context/cardStoreContext';

/** Prompt overrides and post-history instructions. */
export default function PromptsSection() {
    const { patchCardData } = useCardStore();
    const updateField = (fieldKey) => (value) => patchCardData({ [fieldKey]: value });

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                These fields override frontend defaults when the target app supports them. Unsupported apps ignore
                them instead of failing.
            </Alert>
            <CardTextInput
                fieldKey="system_prompt"
                label="System prompt"
                minRows={7}
                multiline
                onValueChange={updateField('system_prompt')}
            />
            <CardTextInput
                fieldKey="post_history_instructions"
                label="Post-history instructions"
                minRows={7}
                multiline
                onValueChange={updateField('post_history_instructions')}
            />
        </Stack>
    );
}
