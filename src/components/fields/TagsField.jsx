import { useCardStore } from '../../context/cardStoreContext';
import DeferredTextInput from './DeferredTextInput';

/** Comma-separated tag editor backed by the `tags: string[]` field. */
export default function TagsField() {
    const { cardData, patchCardData } = useCardStore();
    const tags = cardData.data.tags ?? [];

    const handleCommit = (nextValue) => {
        const nextTags = nextValue
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        patchCardData({ tags: nextTags });
    };

    return (
        <DeferredTextInput
            helpKey="tags"
            id="card-field-tags"
            label="Tags (comma separated)"
            minRows={2}
            multiline
            onCommit={handleCommit}
            value={tags.join(', ')}
        />
    );
}
