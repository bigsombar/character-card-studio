import { useCard } from "../../context/cardContext";
import DebouncedTextField from "../DebouncedTextField/DebouncedTextField";
import capitalize from "../../utils/capitalize";

function resolveLabel(label, fieldName) {
    if (typeof label === 'string' && label.trim() !== '') return label;
    return `Character ${capitalize(fieldName)}`;
}

// `source` is the one V3 string field stored as an array of URIs; show one URI per line.
function sourceToText(value) {
    if (Array.isArray(value)) return value.join('\n');
    return value ?? '';
}

/**
 * Card-field wrapper around the shared text field. Reads the value from card context and keeps
 * the `source` array readable as a multi-line list of URIs.
 *
 * @param {string} label Visible label; falls back to the field name
 * @param {string} fieldName Key inside `cardData.data`
 * @param {Function} changeCallback onChange for card state
 * @param {boolean} [multiline]
 * @param {number} [rows]
 * @param {boolean} [readOnly]
 * @param {boolean} [showCount]
 * @param {number} [debounceMs]
 */
export default function CardTextField({
    label,
    fieldName,
    changeCallback,
    multiline = false,
    rows = 1,
    readOnly = false,
    showCount = false,
    debounceMs = 300,
}) {
    const { cardData } = useCard();
    const rawValue = cardData.data[fieldName];
    const value = fieldName === 'source' ? sourceToText(rawValue) : rawValue;

    return (
        <DebouncedTextField
            debounceMs={debounceMs}
            helpKey={fieldName}
            label={resolveLabel(label, fieldName)}
            multiline={multiline}
            name={fieldName}
            onChange={changeCallback}
            readOnly={readOnly}
            rows={rows}
            showCount={showCount}
            value={value}
        />
    );
}
