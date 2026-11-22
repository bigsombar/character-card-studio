import { Box, MenuItem, TextField } from "@mui/material";

import DeferredTextInput from "../fields/DeferredTextInput";
import FieldLabel from "../fields/FieldLabel";
import upperFirst from "../../utils/upperFirst";
import { useCardStore } from "../../context/cardStoreContext";

function metaLabel(label, fieldKey) {
    if (typeof label === 'string' && label.trim() !== '') return label;
    return `Lorebook ${upperFirst(fieldKey)}`;
}

function entryLabel(label, fieldKey) {
    if (typeof label === 'string' && label.trim() !== '') return label;
    return `Entry ${upperFirst(fieldKey)}`;
}

function useLorebook() {
    const { cardData } = useCardStore();
    return cardData.data.character_book ?? {};
}

/** Book-level text setting. The parent receives the key and the stable value. */
export function BookSettingTextField({ label = "", fieldKey, onValueChange }) {
    const book = useLorebook();

    return (
        <DeferredTextInput
            helpKey={`character_book.${fieldKey}`}
            id={`book-setting-${fieldKey}`}
            label={metaLabel(label, fieldKey)}
            minRows={3}
            multiline
            onCommit={(value) => onValueChange(fieldKey, value)}
            value={book[fieldKey] ?? ''}
        />
    );
}

/** Book-level numeric setting. Numeric inputs do not use the text-selection API. */
export function BookSettingNumberField({ label = "", fieldKey, onValueChange }) {
    const book = useLorebook();

    return (
        <DeferredTextInput
            helpKey={`character_book.${fieldKey}`}
            id={`book-setting-${fieldKey}`}
            label={metaLabel(label, fieldKey)}
            onCommit={(value) => onValueChange(fieldKey, value)}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            type="number"
            value={book[fieldKey] ?? ''}
        />
    );
}

/** Entry text field. The callback receives the row index, field key and stable value. */
export function BookEntryTextField({ label = "", fieldKey, entryIndex, onValueChange, minRows = 1 }) {
    const book = useLorebook();
    const entry = book.entries?.[entryIndex] ?? {};

    return (
        <DeferredTextInput
            helpKey={`character_book.entry.${fieldKey}`}
            id={`entry-${entryIndex}-${fieldKey}`}
            label={entryLabel(label, fieldKey)}
            minRows={minRows}
            multiline
            onCommit={(value) => onValueChange(entryIndex, fieldKey, value)}
            value={entry[fieldKey] ?? ''}
        />
    );
}

/** Entry numeric field. The callback receives the row index, field key and stable value. */
export function BookEntryNumberField({ label = "", fieldKey, entryIndex, onValueChange }) {
    const book = useLorebook();
    const entry = book.entries?.[entryIndex] ?? {};

    return (
        <DeferredTextInput
            helpKey={`character_book.entry.${fieldKey}`}
            id={`entry-${entryIndex}-${fieldKey}`}
            label={entryLabel(label, fieldKey)}
            onCommit={(value) => onValueChange(entryIndex, fieldKey, value)}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            type="number"
            value={entry[fieldKey] ?? ''}
        />
    );
}

function selectValue(value) {
    if (value === undefined || value === null) return 'undefined';
    return value ? 'true' : 'false';
}

/**
 * Compact tri-state boolean select used by the lorebook flag groups. Optional CCv3 booleans keep
 * an explicit N/A state; required booleans only expose False/True.
 */
export function CompactBooleanField({ label, helpKey, value, onChange, required = false }) {
    const current = required && (value === undefined || value === null) ? 'false' : selectValue(value);

    return (
        <Box>
            <FieldLabel helpKey={helpKey} sx={{ mb: 0.5 }} text={label} />
            <TextField
                fullWidth
                onChange={(event) => {
                    const next = event.target.value;
                    onChange(next === 'undefined' ? undefined : next === 'true');
                }}
                select
                size="small"
                slotProps={{ select: { 'aria-label': label } }}
                value={current}
            >
                {!required && <MenuItem value="undefined">N/A</MenuItem>}
                <MenuItem value="false">False</MenuItem>
                <MenuItem value="true">True</MenuItem>
            </TextField>
        </Box>
    );
}
