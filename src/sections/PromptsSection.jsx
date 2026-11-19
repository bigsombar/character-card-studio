import { Alert, Stack } from '@mui/material';

import CardTextField from '../components/CardTextField/CardTextField';
import { useCard } from '../context/cardContext';

/** Prompt overrides and post-history instructions. */
export default function PromptsSection() {
    const { setCardData } = useCard();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setCardData((prevState) => ({
            ...prevState,
            data: { ...prevState.data, [name]: value },
        }));
    };

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                These fields override frontend defaults when the target app supports them. Unsupported apps ignore
                them instead of failing.
            </Alert>
            <CardTextField
                changeCallback={handleChange}
                fieldName="system_prompt"
                label="System prompt"
                multiline
                rows={7}
            />
            <CardTextField
                changeCallback={handleChange}
                fieldName="post_history_instructions"
                label="Post-history instructions"
                multiline
                rows={7}
            />
        </Stack>
    );
}
