import { useCardStore } from "../../context/cardStoreContext";
import DeferredTextInput from "../fields/DeferredTextInput";

function GreetingTextField({ helpKey, id, label, onCommit, value }) {
    return (
        <DeferredTextInput
            helpKey={helpKey}
            id={id}
            label={label}
            minRows={3}
            multiline
            onCommit={onCommit}
            value={value ?? ''}
        />
    );
}

function useGreetingList(fieldKey) {
    const { cardData } = useCardStore();
    const greetings = cardData.data[fieldKey];
    return Array.isArray(greetings) ? greetings : [];
}

/**
 * Editor for one alternate greeting.
 *
 * @param {string} [label]
 * @param {Function} onValueChange Receives the new greeting text
 * @param {number} [greetingIndex]
 * @param {string} [helpKey]
 */
export default function AlternateGreetingInput({
    label,
    onValueChange,
    greetingIndex = 0,
    helpKey,
}) {
    const greetings = useGreetingList('alternate_greetings');

    return (
        <GreetingTextField
            helpKey={helpKey}
            id={`alternate-greeting-${greetingIndex}`}
            label={label}
            onCommit={onValueChange}
            value={greetings[greetingIndex]}
        />
    );
}

/** Editor for one group-only greeting. */
export function GroupGreetingInput({
    label,
    onValueChange,
    greetingIndex = 0,
    helpKey,
}) {
    const greetings = useGreetingList('group_only_greetings');

    return (
        <GreetingTextField
            helpKey={helpKey}
            id={`group-greeting-${greetingIndex}`}
            label={label}
            onCommit={onValueChange}
            value={greetings[greetingIndex]}
        />
    );
}
