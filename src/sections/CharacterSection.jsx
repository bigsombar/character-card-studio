import { Box, Stack } from '@mui/material';

import CardTextField from '../components/CardTextField/CardTextField';
import { useCard } from '../context/cardContext';

const fieldGrid = {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
};

/** Core identity and voice fields: name, description, personality, scenario and greetings. */
export default function CharacterSection() {
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
            <CardTextField fieldName="name" label="Character name" changeCallback={handleChange} />

            <CardTextField
                changeCallback={handleChange}
                fieldName="description"
                label="Character description"
                multiline
                rows={10}
                showCount
            />

            <Box sx={fieldGrid}>
                <CardTextField changeCallback={handleChange} fieldName="personality" multiline rows={5} />
                <CardTextField changeCallback={handleChange} fieldName="scenario" multiline rows={5} />
            </Box>

            <CardTextField
                changeCallback={handleChange}
                fieldName="first_mes"
                label="First message"
                multiline
                rows={8}
                showCount
            />

            <CardTextField
                changeCallback={handleChange}
                fieldName="mes_example"
                label="Example messages"
                multiline
                rows={8}
            />
        </Stack>
    );
}
