import { Box, Stack } from '@mui/material';

import CardTextField from '../components/CardTextField/CardTextField';
import MetaValue from '../components/fields/MetaValue';
import MultilingualNotesEditor from '../components/fields/MultilingualNotesEditor';
import SourceLinks from '../components/fields/SourceLinks';
import TagsField from '../components/fields/TagsField';
import { useCard } from '../context/cardContext';

const fieldGrid = {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
};

function formatUnixSeconds(seconds) {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return 'Not set';
    return `${new Date(seconds * 1000).toLocaleString()} · ${seconds}`;
}

/** Creator metadata, publications notes, translations, tags and spec-managed dates. */
export default function CreatorSection() {
    const { cardData, setCardData } = useCard();
    const data = cardData.data;

    const handleChange = (event) => {
        const { name, value } = event.target;
        setCardData((prevState) => ({
            ...prevState,
            data: { ...prevState.data, [name]: value },
        }));
    };

    return (
        <Stack spacing={2}>
            <Box sx={fieldGrid}>
                <CardTextField changeCallback={handleChange} fieldName="creator" />
                <CardTextField changeCallback={handleChange} fieldName="character_version" label="Character version" />
            </Box>

            <CardTextField changeCallback={handleChange} fieldName="nickname" />

            <CardTextField
                changeCallback={handleChange}
                fieldName="creator_notes"
                label="Creator notes"
                multiline
                rows={7}
            />

            <MultilingualNotesEditor />

            <TagsField />

            <SourceLinks source={data.source} />

            <Box sx={fieldGrid}>
                <MetaValue
                    helpKey="creation_date"
                    hint="Unix seconds. Set once for new cards and preserved on export."
                    label="Creation date"
                    value={formatUnixSeconds(data.creation_date)}
                />
                <MetaValue
                    helpKey="modification_date"
                    hint="Unix seconds. Stamped automatically when the card is exported."
                    label="Modification date"
                    value={formatUnixSeconds(data.modification_date)}
                />
            </Box>
        </Stack>
    );
}
