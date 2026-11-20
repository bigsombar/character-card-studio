import { useCard } from '../../context/cardContext';
import DebouncedTextField from '../DebouncedTextField/DebouncedTextField';

/** Comma-separated tag editor backed by the `tags: string[]` field. */
export default function TagsField() {
    const { cardData, patchCardData } = useCard();
    const tags = cardData.data.tags ?? [];

    const handleChange = (event) => {
        const nextTags = event.target.value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        patchCardData({ tags: nextTags });
    };

    return (
        <DebouncedTextField
            helpKey="tags"
            label="Tags (comma separated)"
            name="tags"
            onChange={handleChange}
            rows={2}
            value={tags.join(', ')}
            multiline
        />
    );
}
