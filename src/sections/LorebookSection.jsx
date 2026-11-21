import { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    ButtonBase,
    Dialog,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ChevronRight from '@mui/icons-material/ChevronRight';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import DragHandle from '@mui/icons-material/DragHandle';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';

import ConfirmationDialog from '../components/ConfirmationDialog/ConfirmationDialog';
import FieldLabel from '../components/fields/FieldLabel';
import JsonObjectField from '../components/fields/JsonObjectField';
import DebouncedTextField from '../components/DebouncedTextField/DebouncedTextField';
import Surface from '../components/layout/Surface';
import {
    CompactBooleanField,
    LorebookEntryInt,
    LorebookEntryString,
    LorebookMetaInt,
    LorebookMetaString,
} from '../components/LorebookTextFields/LorebookTextFields';
import { useCard } from '../context/cardContext';
import { useNotifications } from '../context/NotificationContext';
import useIsMobile from '../hooks/useIsMobile';
import { downloadBlob } from '../utils/blob';
import { safeFilename } from '../utils/filename';
import { formatKeyLines, parseKeyLines } from '../utils/keyLines';
import { v3CharacterBookPrototype, v3CharacterBookEntryPrototype } from '../spec/cardPrototype';

const NUMERIC_META_FIELDS = new Set(['scan_depth', 'token_budget']);
const NUMERIC_ENTRY_FIELDS = new Set(['insertion_order', 'priority']);

function coerceNumber(value, { blank } = {}) {
    if (value === '' || value === undefined || value === null) return blank;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : blank;
}

function coerceId(value) {
    if (value === '' || value === undefined || value === null) return undefined;
    return /^-?\d+$/.test(value) ? Number(value) : value;
}

function numericId(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
}

// New entries continue the numeric ID sequence. If the last entry has no usable ID, fall back to
// the highest numeric ID in the book so a new entry still gets a unique value.
function nextEntryId(entries) {
    const lastId = numericId(entries[entries.length - 1]?.id);
    if (lastId !== null) return lastId + 1;

    const numericIds = entries
        .map((entry) => numericId(entry.id))
        .filter((id) => id !== null);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
}

function FieldGroup({ title, children, sx }) {
    return (
        <Box
            sx={{
                backgroundColor: 'background.default',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 1.5, md: 2 },
                ...sx,
            }}
        >
            <Typography
                component="div"
                sx={{
                    color: 'text.secondary',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    mb: 1.25,
                    textTransform: 'uppercase',
                }}
            >
                {title}
            </Typography>
            {children}
        </Box>
    );
}

const TWO_COLUMN_GRID = {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
};

const PAIR_GRID = {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
};

const FLAG_GRID = {
    alignItems: 'start',
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
};

function EntryPositionField({ entryIndex, value, onChange }) {
    return (
        <Box>
            <FieldLabel helpKey="character_book.entry.position" sx={{ mb: 0.5 }} text="Position" />
            <TextField
                fullWidth
                onChange={(event) => onChange(entryIndex, event.target.value || undefined)}
                select
                slotProps={{ select: { 'aria-label': 'Entry position' } }}
                value={value ?? ''}
            >
                <MenuItem value="">N/A</MenuItem>
                <MenuItem value="before_char">Before character</MenuItem>
                <MenuItem value="after_char">After character</MenuItem>
            </TextField>
        </Box>
    );
}

function EntryKeysField({ entryIndex, fieldName, label, value, onChange }) {
    return (
        <DebouncedTextField
            fullWidth
            helpKey={`character_book.entry.${fieldName}`}
            label={label}
            multiline
            name={`${fieldName}#${entryIndex}`}
            onChange={onChange}
            rows={3}
            value={formatKeyLines(value)}
        />
    );
}

function entryLabel(entry, index) {
    return entry.name || entry.comment || `Entry #${index + 1}`;
}

/**
 * The complete CCv3 entry form. Shared by the desktop accordion and the mobile full-screen
 * detail view so both surfaces keep the same fields and validation behavior.
 */
function EntryFields({ entry, index, onEntryChange, onEntryKeysChange, onUpdateEntry, showAdvancedJson }) {
    return (
        <Stack spacing={2}>
            <FieldGroup title="Identity">
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                            xs: '1fr',
                            lg: 'minmax(0, 2fr) minmax(160px, 1fr)',
                        },
                    }}
                >
                    <LorebookEntryString
                        changeCallback={onEntryChange}
                        entryIndex={index}
                        fieldName="name"
                        label="Name / comment"
                    />
                    <DebouncedTextField
                        helpKey="character_book.entry.id"
                        label="Entry ID"
                        name={`id#${index}`}
                        onChange={onEntryChange}
                        value={entry.id ?? ''}
                    />
                </Box>
            </FieldGroup>

            <FieldGroup title="Triggers">
                <Box sx={TWO_COLUMN_GRID}>
                    <EntryKeysField
                        entryIndex={index}
                        fieldName="keys"
                        label="Keys (one per line)"
                        onChange={onEntryKeysChange}
                        value={entry.keys}
                    />
                    <EntryKeysField
                        entryIndex={index}
                        fieldName="secondary_keys"
                        label="Secondary keys (one per line)"
                        onChange={onEntryKeysChange}
                        value={entry.secondary_keys}
                    />
                </Box>
            </FieldGroup>

            <FieldGroup title="Ordering">
                <Box sx={PAIR_GRID}>
                    <LorebookEntryInt
                        changeCallback={onEntryChange}
                        entryIndex={index}
                        fieldName="insertion_order"
                        label="Insertion order"
                    />
                    <LorebookEntryInt
                        changeCallback={onEntryChange}
                        entryIndex={index}
                        fieldName="priority"
                        label="Priority"
                    />
                    <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                        <EntryPositionField
                            entryIndex={index}
                            onChange={(entryIndex, value) => onUpdateEntry(entryIndex, (current) => ({
                                ...current,
                                position: value,
                            }))}
                            value={entry.position}
                        />
                    </Box>
                </Box>
            </FieldGroup>

            <FieldGroup title="Flags">
                <Box sx={FLAG_GRID}>
                    <CompactBooleanField
                        helpKey="character_book.entry.enabled"
                        label="Enabled"
                        onChange={(value) => onUpdateEntry(index, (current) => ({ ...current, enabled: value }))}
                        required
                        value={entry.enabled}
                    />
                    <CompactBooleanField
                        helpKey="character_book.entry.selective"
                        label="Require secondary key"
                        onChange={(value) => onUpdateEntry(index, (current) => ({ ...current, selective: value }))}
                        value={entry.selective}
                    />
                    <CompactBooleanField
                        helpKey="character_book.entry.case_sensitive"
                        label="Case sensitive"
                        onChange={(value) => onUpdateEntry(index, (current) => ({ ...current, case_sensitive: value }))}
                        value={entry.case_sensitive}
                    />
                    <CompactBooleanField
                        helpKey="character_book.entry.constant"
                        label="Always active"
                        onChange={(value) => onUpdateEntry(index, (current) => ({ ...current, constant: value }))}
                        value={entry.constant}
                    />
                    <CompactBooleanField
                        helpKey="character_book.entry.use_regex"
                        label="Use regular expressions"
                        onChange={(value) => onUpdateEntry(index, (current) => ({ ...current, use_regex: value }))}
                        required
                        value={entry.use_regex}
                    />
                </Box>
            </FieldGroup>

            <FieldGroup title="Entry text">
                <LorebookEntryString
                    changeCallback={onEntryChange}
                    entryIndex={index}
                    fieldName="content"
                    label="Content"
                    rows={6}
                />
            </FieldGroup>

            {showAdvancedJson && (
                <FieldGroup title="Advanced JSON">
                    <JsonObjectField
                        helpKey="character_book.entry.extensions"
                        label="Entry extensions (JSON)"
                        onApply={(extensions) => onUpdateEntry(index, (current) => ({ ...current, extensions }))}
                        rows={2}
                        value={entry.extensions}
                    />
                </FieldGroup>
            )}
        </Stack>
    );
}

/**
 * Full CCv3 character_book editor, including the V3-only fields that the old generic
 * panel skipped: use_regex, position, id and per-entry extensions.
 */
export default function LorebookSection({ onImportFile, showAdvancedJson = false }) {
    const isMobile = useIsMobile();
    const { cardData, patchCardData } = useCard();
    const { notify } = useNotifications();
    const book = cardData.data.character_book;
    const [expanded, setExpanded] = useState([]);
    const [confirmDeleteBook, setConfirmDeleteBook] = useState(false);
    const [confirmBackfill, setConfirmBackfill] = useState(false);
    const [pendingDeleteEntry, setPendingDeleteEntry] = useState(-1);
    const [mobileEntryIndex, setMobileEntryIndex] = useState(null);
    const mobileEntry = mobileEntryIndex !== null ? book?.entries?.[mobileEntryIndex] : undefined;

    const mismatchedEntries = useMemo(() => {
        if (!book?.entries) return [];
        return book.entries
            .map((entry, index) => ({ index, entry }))
            .filter(({ entry }) => {
                const name = entry.name ?? '';
                const comment = entry.comment ?? '';
                return name !== comment && (!name || !comment);
            });
    }, [book]);

    const updateBook = (updater) => {
        patchCardData((prev) => ({ character_book: updater(prev.data.character_book) }));
    };

    const addLorebook = () => updateBook(() => v3CharacterBookPrototype());

    const addEntry = () => {
        const newIndex = book?.entries?.length ?? 0;
        updateBook((previous) => {
            const entries = previous?.entries ?? [];
            return {
                ...previous,
                entries: [
                    ...entries,
                    { ...v3CharacterBookEntryPrototype(), id: nextEntryId(entries) },
                ],
            };
        });
        setExpanded((previous) => [...previous, newIndex]);
        if (isMobile) setMobileEntryIndex(newIndex);
    };

    const addSimilarEntry = () => {
        const newIndex = book?.entries?.length ?? 0;
        updateBook((previous) => {
            const entries = previous?.entries ?? [];
            const source = entries[entries.length - 1];
            if (!source) return previous;

            return {
                ...previous,
                entries: [
                    ...entries,
                    {
                        ...source,
                        comment: undefined,
                        content: '',
                        id: nextEntryId(entries),
                        keys: [],
                        name: undefined,
                        secondary_keys: undefined,
                    },
                ],
            };
        });
        setExpanded((previous) => [...previous, newIndex]);
        if (isMobile) setMobileEntryIndex(newIndex);
    };

    const deleteBook = () => {
        patchCardData({ character_book: undefined });
        setConfirmDeleteBook(false);
    };

    const deleteEntry = () => {
        const deletedIndex = pendingDeleteEntry;
        updateBook((previous) => ({
            ...previous,
            entries: previous.entries.filter((_entry, index) => index !== deletedIndex),
        }));
        setExpanded([]);
        setPendingDeleteEntry(-1);
        if (isMobile) {
            setMobileEntryIndex((current) => {
                if (current === null) return null;
                if (current === deletedIndex) return null;
                return current > deletedIndex ? current - 1 : current;
            });
        }
    };

    const moveEntry = (index, direction) => {
        const target = index + direction;
        if (!book?.entries || target < 0 || target >= book.entries.length) return;

        updateBook((previous) => {
            const entries = [...previous.entries];
            const [moved] = entries.splice(index, 1);
            entries.splice(target, 0, moved);
            return { ...previous, entries };
        });
        setExpanded([]);
        setMobileEntryIndex((current) => {
            if (current === index) return target;
            if (current === target) return index;
            return current;
        });
    };

    const closeMobileEntry = () => setMobileEntryIndex(null);

    const handleMetaChange = (event) => {
        const { name, value } = event.target;
        updateBook((previous) => ({
            ...previous,
            [name]: NUMERIC_META_FIELDS.has(name) ? coerceNumber(value, { blank: undefined }) : value,
        }));
    };

    const updateEntry = (index, updater) => {
        updateBook((previous) => ({
            ...previous,
            entries: previous.entries.map((entry, entryIndex) => (entryIndex === index ? updater(entry) : entry)),
        }));
    };

    const handleEntryChange = (event) => {
        const { name, value } = event.target;
        const match = name.match(/^([^\d]+)#([\d]+)/);
        if (!match) return;
        const fieldName = match[1];
        const index = Number.parseInt(match[2], 10);

        updateEntry(index, (entry) => {
            if (fieldName === 'name') return { ...entry, name: value, comment: value };
            if (NUMERIC_ENTRY_FIELDS.has(fieldName)) {
                return { ...entry, [fieldName]: coerceNumber(value, { blank: fieldName === 'insertion_order' ? 0 : undefined }) };
            }
            if (fieldName === 'id') return { ...entry, id: coerceId(value) };
            return { ...entry, [fieldName]: value };
        });
    };

    const handleEntryKeysChange = (event) => {
        const { name, value } = event.target;
        const match = name.match(/^([^\d]+)#([\d]+)/);
        if (!match) return;
        const fieldName = match[1];
        const index = Number.parseInt(match[2], 10);
        const keys = parseKeyLines(value);
        updateEntry(index, (entry) => ({ ...entry, [fieldName]: keys }));
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        updateBook((previous) => {
            const items = [...previous.entries];
            const [moved] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, moved);
            return { ...previous, entries: items };
        });
        setExpanded((previous) => previous.map((panel) => {
            if (panel === result.source.index) return result.destination.index;
            if (panel > result.source.index && panel <= result.destination.index) return panel - 1;
            if (panel < result.source.index && panel >= result.destination.index) return panel + 1;
            return panel;
        }));
    };

    const backfillNames = () => {
        updateBook((previous) => ({
            ...previous,
            entries: previous.entries.map((entry) => {
                const value = entry.name || entry.comment || '';
                return { ...entry, name: value, comment: value };
            }),
        }));
        setConfirmBackfill(false);
    };

    const downloadLorebook = () => {
        const payload = { spec: 'lorebook_v3', data: book };
        const blob = new Blob([JSON.stringify(payload, null, 4)], { type: 'application/json' });
        downloadBlob(blob, safeFilename(book?.name || 'lorebook', 'json'));
        notify({ title: 'Lorebook exported', severity: 'success', message: 'The lorebook JSON was downloaded.' });
    };

    const handleImport = (event) => {
        onImportFile?.(event);
        event.target.value = '';
    };

    if (!book) {
        return (
            <Box sx={{
                alignItems: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                justifyContent: 'center',
                minHeight: 280,
                p: 4,
                textAlign: 'center',
            }}>
                <MenuBookOutlined sx={{ color: 'text.disabled', fontSize: 48 }} />
                <Typography sx={{ fontWeight: 600 }}>No lorebook attached</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 560 }} variant="body2">
                    Add a character book to keep world info with the card, or import an existing lorebook from a
                    card, CHARX archive or standalone JSON file.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button onClick={addLorebook} startIcon={<Add />} variant="contained">Attach new lorebook</Button>
                    <Button component="label" startIcon={<UploadFileOutlined />} variant="outlined">
                        Import existing
                        <input accept=".json,.png,.charx" hidden onChange={handleImport} type="file" />
                    </Button>
                </Stack>
            </Box>
        );
    }

    return (
        <>
            <Box
                sx={{
                    alignItems: 'start',
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(320px, 1fr) minmax(0, 2fr)' },
                }}
            >
                <Stack spacing={2} sx={{ minWidth: 0, order: { xs: 2, md: 1 } }}>
                    <Surface sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                        <Typography
                            component="div"
                            sx={{
                                color: 'text.secondary',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                            }}
                        >
                            Character book
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                            Metadata, retrieval settings and local extensions.
                        </Typography>
                    </Box>
                    <Tooltip title="Delete this lorebook">
                        <IconButton aria-label="Delete lorebook" color="error" onClick={() => setConfirmDeleteBook(true)}>
                            <DeleteOutline />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Stack spacing={2}>
                    <FieldGroup title="Metadata">
                        <Stack spacing={2}>
                            <LorebookMetaString changeCallback={handleMetaChange} fieldName="name" />
                            <LorebookMetaString changeCallback={handleMetaChange} fieldName="description" />
                        </Stack>
                    </FieldGroup>

                    <FieldGroup title="Retrieval">
                        <Box sx={PAIR_GRID}>
                            <LorebookMetaInt changeCallback={handleMetaChange} fieldName="scan_depth" label="Scan depth" />
                            <LorebookMetaInt changeCallback={handleMetaChange} fieldName="token_budget" label="Token budget" />
                        </Box>
                    </FieldGroup>

                    <FieldGroup title="Options">
                        <Box
                            sx={{
                                alignItems: 'center',
                                display: 'grid',
                                gap: 2,
                                gridTemplateColumns: { xs: '1fr', xl: 'minmax(200px, 260px) minmax(0, 1fr)' },
                            }}
                        >
                            <CompactBooleanField
                                helpKey="character_book.recursive_scanning"
                                label="Recursive scanning"
                                onChange={(value) => updateBook((previous) => ({ ...previous, recursive_scanning: value }))}
                                value={book.recursive_scanning}
                            />
                            <Typography color="text.secondary" variant="caption">
                                Allow matched entries to trigger other entries while the book is scanned.
                            </Typography>
                        </Box>
                    </FieldGroup>

                    <JsonObjectField
                        helpKey="character_book.extensions"
                        label="Lorebook extensions (JSON)"
                        onApply={(extensions) => updateBook((previous) => ({ ...previous, extensions }))}
                        rows={2}
                        value={book.extensions}
                    />
                </Stack>
            </Surface>

                    <Stack spacing={1}>
                        <Button fullWidth onClick={downloadLorebook} startIcon={<DownloadOutlined />} variant="outlined">
                            Download lorebook
                        </Button>
                        <Button fullWidth component="label" startIcon={<UploadFileOutlined />} variant="outlined">
                            Import from card
                            <input accept=".json,.png,.charx" hidden onChange={handleImport} type="file" />
                        </Button>
                    </Stack>
                </Stack>

                <Stack spacing={2} sx={{ minWidth: 0, order: { xs: 1, md: 2 } }}>
                    <Stack
                        direction="row"
                        sx={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}
                    >
                        <Box>
                            <Typography
                                component="h3"
                                sx={{
                                    fontFamily: '"Space Grotesk Variable", "Space Grotesk", sans-serif',
                                    fontSize: '1.05rem',
                                    fontWeight: 600,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                Entries
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="caption">
                                {book.entries.length} entr{book.entries.length === 1 ? 'y' : 'ies'}
                            </Typography>
                        </Box>
                        {!isMobile && (
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                                <Button
                                    disabled={book.entries.length === 0}
                                    onClick={addSimilarEntry}
                                    startIcon={<ContentCopyOutlined />}
                                    variant="outlined"
                                >
                                    Add similar
                                </Button>
                                <Button onClick={addEntry} startIcon={<Add />} variant="contained">Add entry</Button>
                            </Stack>
                        )}
                    </Stack>

                    {mismatchedEntries.length > 0 && (
                        <Alert
                            action={<Button color="inherit" onClick={() => setConfirmBackfill(true)} size="small">Backfill</Button>}
                            severity="warning"
                        >
                            {mismatchedEntries.length} entr{mismatchedEntries.length === 1 ? 'y has' : 'ies have'} mismatched
                            names and comments. Backfill copies the non-empty value to both fields.
                        </Alert>
                    )}

                    {book.entries.length === 0 ? (
                        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary" variant="body2">
                                No entries yet. Add one to define keywords and the text they inject.
                            </Typography>
                        </Box>
                    ) : isMobile ? (
                        <Stack spacing={1}>
                            {book.entries.map((entry, index) => {
                                const keyCount = entry.keys?.length ?? 0;
                                const secondaryCount = entry.secondary_keys?.length ?? 0;

                                return (
                                    <ButtonBase
                                        key={`mobile-entry-${index}`}
                                        onClick={() => setMobileEntryIndex(index)}
                                        sx={{
                                            alignItems: 'center',
                                            bgcolor: 'background.paper',
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            display: 'flex',
                                            gap: 1,
                                            justifyContent: 'space-between',
                                            p: 1.5,
                                            textAlign: 'left',
                                            width: '100%',
                                            '&:focus-visible': { outline: '2px solid #FFE400', outlineOffset: 2 },
                                        }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography noWrap sx={{ fontWeight: 600 }}>
                                                {entryLabel(entry, index)}
                                                {!entry.enabled && ' · disabled'}
                                            </Typography>
                                            <Typography color="text.secondary" noWrap sx={{ display: 'block' }} variant="caption">
                                                {keyCount} key{keyCount === 1 ? '' : 's'}
                                                {secondaryCount > 0 && ` · ${secondaryCount} secondary`}
                                                {entry.content?.trim() && ` · ${entry.content.trim().slice(0, 80)}`}
                                            </Typography>
                                        </Box>
                                        <ChevronRight sx={{ color: 'text.secondary', flexShrink: 0 }} />
                                    </ButtonBase>
                                );
                            })}
                        </Stack>
                    ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="droppableLorebook">
                                {(provided) => (
                                    <Box ref={provided.innerRef} {...provided.droppableProps}>
                                {book.entries.map((entry, index) => (
                                    <Draggable draggableId={`lorebook-entry-${index}`} index={index} key={`lorebook-entry-${index}`}>
                                        {(dragProvided) => (
                                            <Box
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                sx={{ display: 'flex', gap: 1.5 }}
                                                style={dragProvided.draggableProps.style}
                                            >
                                                <Tooltip title="Drag to reorder">
                                                    <IconButton
                                                        {...dragProvided.dragHandleProps}
                                                        aria-label={`Reorder entry ${index + 1}`}
                                                        sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0 }}
                                                    >
                                                        <DragHandle />
                                                    </IconButton>
                                                </Tooltip>
                                                <Accordion
                                                    expanded={expanded.includes(index)}
                                                    onChange={(_event, isExpanded) => setExpanded((previous) => (
                                                        isExpanded ? [...previous, index] : previous.filter((item) => item !== index)
                                                    ))}
                                                    slotProps={{ transition: { unmountOnExit: true } }}
                                                    sx={{ mb: 2, minWidth: 0, mt: 1, width: '100%' }}
                                                >
                                                    <AccordionSummary expandIcon={<ArrowDropDown />}>
                                                        <Typography noWrap sx={{ fontWeight: 600 }}>
                                                            {entryLabel(entry, index)}
                                                            {!entry.enabled && ' · disabled'}
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ pt: 0 }}>
                                                        <EntryFields
                                                            entry={entry}
                                                            index={index}
                                                            onEntryChange={handleEntryChange}
                                                            onEntryKeysChange={handleEntryKeysChange}
                                                            onUpdateEntry={updateEntry}
                                                            showAdvancedJson={showAdvancedJson}
                                                        />
                                                    </AccordionDetails>
                                                </Accordion>
                                                <Tooltip title="Delete this entry">
                                                    <IconButton
                                                        aria-label={`Delete entry ${index + 1}`}
                                                        color="error"
                                                        onClick={() => setPendingDeleteEntry(index)}
                                                        sx={{ flexShrink: 0 }}
                                                    >
                                                        <DeleteOutline />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </Box>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

                    {isMobile && (
                        <Box
                            sx={{
                                bgcolor: 'background.default',
                                borderTop: 1,
                                borderColor: 'divider',
                                bottom: 0,
                                display: 'flex',
                                gap: 1,
                                mt: 1,
                                position: 'sticky',
                                pt: 1,
                                zIndex: 2,
                            }}
                        >
                            <Button
                                disabled={book.entries.length === 0}
                                onClick={addSimilarEntry}
                                startIcon={<ContentCopyOutlined />}
                                sx={{ flex: 1 }}
                                variant="outlined"
                            >
                                Add similar
                            </Button>
                            <Button onClick={addEntry} startIcon={<Add />} sx={{ flex: 1 }} variant="contained">
                                Add entry
                            </Button>
                        </Box>
                    )}
                </Stack>
            </Box>

            <Dialog
                aria-labelledby="lorebook-entry-title"
                fullScreen
                onClose={closeMobileEntry}
                open={Boolean(mobileEntry)}
            >
                {mobileEntry && (
                    <Box sx={{ bgcolor: 'background.default', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box
                            component="header"
                            sx={{
                                alignItems: 'center',
                                borderBottom: 1,
                                borderColor: 'divider',
                                display: 'flex',
                                gap: 0.5,
                                minHeight: 56,
                                pt: 'env(safe-area-inset-top)',
                                px: 1,
                            }}
                        >
                            <IconButton aria-label="Back to entries" onClick={closeMobileEntry}>
                                <ArrowBack />
                            </IconButton>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography component="h2" id="lorebook-entry-title" noWrap sx={{ fontWeight: 600 }}>
                                    {entryLabel(mobileEntry, mobileEntryIndex)}
                                </Typography>
                                <Typography color="text.secondary" variant="caption">
                                    Entry {mobileEntryIndex + 1} of {book.entries.length}
                                </Typography>
                            </Box>
                            <IconButton
                                aria-label="Move entry up"
                                disabled={mobileEntryIndex === 0}
                                onClick={() => moveEntry(mobileEntryIndex, -1)}
                            >
                                <ArrowUpward />
                            </IconButton>
                            <IconButton
                                aria-label="Move entry down"
                                disabled={mobileEntryIndex === book.entries.length - 1}
                                onClick={() => moveEntry(mobileEntryIndex, 1)}
                            >
                                <ArrowDownward />
                            </IconButton>
                            <IconButton
                                aria-label="Delete entry"
                                color="error"
                                onClick={() => setPendingDeleteEntry(mobileEntryIndex)}
                            >
                                <DeleteOutline />
                            </IconButton>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2, pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
                            <EntryFields
                                entry={mobileEntry}
                                index={mobileEntryIndex}
                                onEntryChange={handleEntryChange}
                                onEntryKeysChange={handleEntryKeysChange}
                                onUpdateEntry={updateEntry}
                                showAdvancedJson={showAdvancedJson}
                            />
                        </Box>
                    </Box>
                )}
            </Dialog>

            <ConfirmationDialog
                dialogContent="Delete this lorebook and all of its entries? This action cannot be undone."
                dialogTitle="Delete lorebook?"
                handleClose={() => setConfirmDeleteBook(false)}
                handleConfirm={deleteBook}
                open={confirmDeleteBook}
            />
            <ConfirmationDialog
                dialogContent={`Delete lorebook entry #${pendingDeleteEntry + 1}? This action cannot be undone.`}
                dialogTitle="Delete lorebook entry?"
                handleClose={() => setPendingDeleteEntry(-1)}
                handleConfirm={deleteEntry}
                open={pendingDeleteEntry >= 0}
            />
            <ConfirmationDialog
                dialogContent="Copy non-empty names or comments to the missing field for all mismatched entries?"
                dialogTitle="Backfill entry names and comments?"
                handleClose={() => setConfirmBackfill(false)}
                handleConfirm={backfillNames}
                open={confirmBackfill}
            />
        </>
    );
}
