import { Box, Stack } from '@mui/material';

import CardTextInput from '../components/fields/CardTextInput';
import { useCardStore } from '../context/cardStoreContext';

const fieldGrid = {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
};

/** Core identity and voice fields: name, description, personality, scenario and greetings. */
export default function CharacterSection() {
    const { patchCardData } = useCardStore();
    const updateField = (fieldKey) => (value) => patchCardData({ [fieldKey]: value });

    return (
        <Stack spacing={2}>
            <CardTextInput fieldKey="name" label="Character name" onValueChange={updateField('name')} />

            <CardTextInput
                fieldKey="description"
                label="Character description"
                minRows={10}
                multiline
                onValueChange={updateField('description')}
                showLength
            />

            <Box sx={fieldGrid}>
                <CardTextInput
                    fieldKey="personality"
                    minRows={5}
                    multiline
                    onValueChange={updateField('personality')}
                />
                <CardTextInput
                    fieldKey="scenario"
                    minRows={5}
                    multiline
                    onValueChange={updateField('scenario')}
                />
            </Box>

            <CardTextInput
                fieldKey="first_mes"
                label="First message"
                minRows={8}
                multiline
                onValueChange={updateField('first_mes')}
                showLength
            />

            <CardTextInput
                fieldKey="mes_example"
                label="Example messages"
                minRows={8}
                multiline
                onValueChange={updateField('mes_example')}
            />
        </Stack>
    );
}
