import { useCard } from "../../context/cardContext";
import DebouncedTextField from "../DebouncedTextField/DebouncedTextField";

function GreetingTextField({ helpKey, label, name, onChange, value }) {
    return (
        <DebouncedTextField
            helpKey={helpKey}
            label={label}
            multiline
            name={name}
            onChange={onChange}
            rows={3}
            value={value ?? ''}
        />
    );
}

function useGreetingList(fieldName) {
    const { cardData } = useCard();
    const greetings = cardData.data[fieldName];
    return Array.isArray(greetings) ? greetings : [];
}

/**
 * Editor for one alternate greeting. The greeting index is part of the `name` so the shared
 * list handler can tell which item changed.
 *
 * @param {string} [label]
 * @param {string} fieldName
 * @param {Function} changeCallback
 * @param {number} [greetingIndex]
 * @param {string} [helpKey]
 */
export default function AltGreetingTextField({
    label,
    fieldName,
    changeCallback,
    greetingIndex = 0,
    helpKey,
}) {
    const greetings = useGreetingList('alternate_greetings');

    return (
        <GreetingTextField
            helpKey={helpKey}
            label={label}
            name={fieldName}
            onChange={changeCallback}
            value={greetings[greetingIndex]}
        />
    );
}

/** Editor for one group-only greeting. */
export function GroupGreetingTextField({
    label,
    fieldName,
    changeCallback,
    greetingIndex = 0,
    helpKey,
}) {
    const greetings = useGreetingList('group_only_greetings');

    return (
        <GreetingTextField
            helpKey={helpKey}
            label={label}
            name={fieldName}
            onChange={changeCallback}
            value={greetings[greetingIndex]}
        />
    );
}
