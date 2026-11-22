import { useCardStore } from "../../context/cardStoreContext";
import DeferredTextInput from "./DeferredTextInput";
import upperFirst from "../../utils/upperFirst";

function resolveLabel(label, fieldKey) {
    if (typeof label === 'string' && label.trim() !== '') return label;
    return `Character ${upperFirst(fieldKey)}`;
}

// `source` is the one V3 string field stored as an array of URIs; show one URI per line.
function sourceToText(value) {
    if (Array.isArray(value)) return value.join('\n');
    return value ?? '';
}

/**
 * Card field bound to `CardStoreContext`.
 *
 * The wrapper is intentionally thin: the shared input handles the draft/commit cycle and this
 * component only maps a CCv3 key to the value shown on screen.
 *
 * @param {string} [label]
 * @param {string} fieldKey Key inside `cardData.data`
 * @param {(value: string) => void} onValueChange Called when a stable value is ready
 * @param {boolean} [multiline]
 * @param {number} [minRows]
 * @param {boolean} [readOnly]
 * @param {boolean} [showLength]
 * @param {number} [commitDelay]
 */
export default function CardTextInput({
    label,
    fieldKey,
    onValueChange,
    multiline = false,
    minRows = 1,
    readOnly = false,
    showLength = false,
    commitDelay = 300,
}) {
    const { cardData } = useCardStore();
    const rawValue = cardData.data[fieldKey];
    const value = fieldKey === 'source' ? sourceToText(rawValue) : rawValue;

    return (
        <DeferredTextInput
            commitDelay={commitDelay}
            helpKey={fieldKey}
            id={`card-field-${fieldKey}`}
            label={resolveLabel(label, fieldKey)}
            minRows={minRows}
            multiline={multiline}
            onCommit={onValueChange}
            readOnly={readOnly}
            showLength={showLength}
            value={value}
        />
    );
}
