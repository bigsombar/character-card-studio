import { Box, MenuItem, TextField } from "@mui/material";

import DebouncedTextField from "../DebouncedTextField/DebouncedTextField";
import FieldLabel from "../fields/FieldLabel";
import capitalize from "../../utils/capitalize";
import { useCard } from "../../context/cardContext";

function metaLabel(label, fieldName) {
    if (typeof label === 'string' && label.trim() !== '') return label;
    return `Lorebook ${capitalize(fieldName)}`;
}

function entryLabel(label, fieldName) {
    if (typeof label === 'string' && label.trim() !== '') return label;
    return `Entry ${capitalize(fieldName)}`;
}

function useLorebook() {
    const { cardData } = useCard();
    return cardData.data.character_book ?? {};
}

/**
 * Multi-line lorebook metadata field (book name, description).
 */
export function LorebookMetaString({ label = "", fieldName, changeCallback }) {
    const book = useLorebook();

    return (
        <DebouncedTextField
            helpKey={`character_book.${fieldName}`}
            label={metaLabel(label, fieldName)}
            multiline
            name={fieldName}
            onChange={changeCallback}
            value={book[fieldName] ?? ''}
        />
    );
}

/**
 * Numeric lorebook metadata field (scan depth, token budget). Number inputs have no text
 * selection API, so caret preservation is disabled.
 */
export function LorebookMetaInt({ label = "", fieldName, changeCallback }) {
    const book = useLorebook();

    return (
        <DebouncedTextField
            helpKey={`character_book.${fieldName}`}
            label={metaLabel(label, fieldName)}
            name={fieldName}
            onChange={changeCallback}
            preserveCursor={false}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            type="number"
            value={book[fieldName] ?? ''}
        />
    );
}

/**
 * Multi-line lorebook entry field (name, comment, content). The entry index is part of `name`
 * so the list handler can update the right record.
 */
export function LorebookEntryString({ label = "", fieldName, entryIndex, changeCallback, rows = 1 }) {
    const book = useLorebook();
    const entry = book.entries?.[entryIndex] ?? {};

    return (
        <DebouncedTextField
            helpKey={`character_book.entry.${fieldName}`}
            label={entryLabel(label, fieldName)}
            multiline
            name={`${fieldName}#${entryIndex}`}
            onChange={changeCallback}
            rows={rows}
            slotProps={{ inputLabel: { shrink: true } }}
            value={entry[fieldName] ?? ''}
        />
    );
}

/** Numeric lorebook entry field (insertion order, priority, id). */
export function LorebookEntryInt({ label = "", fieldName, entryIndex, changeCallback }) {
    const book = useLorebook();
    const entry = book.entries?.[entryIndex] ?? {};

    return (
        <DebouncedTextField
            helpKey={`character_book.entry.${fieldName}`}
            label={entryLabel(label, fieldName)}
            name={`${fieldName}#${entryIndex}`}
            onChange={changeCallback}
            preserveCursor={false}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            type="number"
            value={entry[fieldName] ?? ''}
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
