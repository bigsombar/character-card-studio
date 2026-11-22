import { Box, Stack } from '@mui/material';

import CardTextInput from '../components/fields/CardTextInput';
import MetaValue from '../components/fields/MetaValue';
import MultilingualNotesEditor from '../components/fields/MultilingualNotesEditor';
import SourceLinks from '../components/fields/SourceLinks';
import TagsField from '../components/fields/TagsField';
import { useCardStore } from '../context/cardStoreContext';

const fieldGrid = {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
};

function formatUnixSeconds(seconds) {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return 'Not set';
    return `${new Date(seconds * 1000).toLocaleString()} · ${seconds}`;
}

/** Creator metadata, publications notes, translations, tags and spec-managed dates. */
export default function CreatorSection() {
    const { cardData, patchCardData } = useCardStore();
    const data = cardData.data;
    const updateField = (fieldKey) => (value) => patchCardData({ [fieldKey]: value });

    return (
        <Stack spacing={2}>
            <Box sx={fieldGrid}>
                <CardTextInput fieldKey="creator" onValueChange={updateField('creator')} />
                <CardTextInput
                    fieldKey="character_version"
                    label="Character version"
                    onValueChange={updateField('character_version')}
                />
            </Box>

            <CardTextInput fieldKey="nickname" onValueChange={updateField('nickname')} />

            <CardTextInput
                fieldKey="creator_notes"
                label="Creator notes"
                minRows={7}
                multiline
                onValueChange={updateField('creator_notes')}
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
