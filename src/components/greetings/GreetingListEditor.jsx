import { useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import DragHandle from '@mui/icons-material/DragHandle';
import KeyboardDoubleArrowUp from '@mui/icons-material/KeyboardDoubleArrowUp';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';

import AlternateGreetingInput, { GroupGreetingInput } from './AlternateGreetingInput';
import ConfirmActionDialog from '../dialogs/ConfirmActionDialog';
import { useCardStore } from '../../context/cardStoreContext';
import useIsMobile from '../../hooks/useIsMobile';
import useReorderableRows from '../../hooks/useReorderableRows';

const KIND_CONFIG = {
    alternate: {
        fieldKey: 'alternate_greetings',
        droppableId: 'greeting-drop-zone',
        heading: 'Alternate greeting',
        helpKey: 'alternate_greetings',
        TextFieldComponent: AlternateGreetingInput,
        empty: 'No alternate greetings yet. Add one to give readers another opening scene.',
        allowPromote: true,
    },
    group: {
        fieldKey: 'group_only_greetings',
        droppableId: 'group-greeting-drop-zone',
        heading: 'Group-only greeting',
        helpKey: 'group_only_greetings_item',
        TextFieldComponent: GroupGreetingInput,
        empty: 'No group-only greetings yet. These are shown only in group chats.',
        allowPromote: false,
    },
};

/** Reorderable greeting list used by both alternate and group-only greetings. */
export default function GreetingListEditor({ kind = 'alternate' }) {
    const config = KIND_CONFIG[kind];
    const isMobile = useIsMobile();
    const { cardData, patchCardData } = useCardStore();
    const greetings = cardData.data[config.fieldKey] ?? [];
    const rows = useReorderableRows(greetings.length);
    const [pendingDelete, setPendingDelete] = useState(-1);
    const [pendingPromote, setPendingPromote] = useState(-1);

    const updateGreetings = (nextGreetings) => {
        patchCardData({ [config.fieldKey]: nextGreetings });
    };

    const handleAdd = () => {
        updateGreetings([...greetings, '']);
        rows.addRow({ expand: true });
    };

    const handleGreetingChange = (index, value) => {
        updateGreetings(greetings.map((greeting, itemIndex) => (itemIndex === index ? value : greeting)));
    };

    const onEntryToggle = (index) => (_event, isExpanded) => {
        rows.setExpanded(index, isExpanded);
    };

    const reorderGreeting = (result) => {
        if (!result.destination || result.source.index === result.destination.index) return;
        const items = [...greetings];
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        updateGreetings(items);
        rows.moveRow(result.source.index, result.destination.index);
    };

    const moveGreeting = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= greetings.length) return;

        const items = [...greetings];
        const [moved] = items.splice(index, 1);
        items.splice(target, 0, moved);
        updateGreetings(items);
        rows.moveRow(index, target);
    };

    const handleDelete = () => {
        const nextGreetings = [...greetings];
        nextGreetings.splice(pendingDelete, 1);
        updateGreetings(nextGreetings);
        rows.removeRow(pendingDelete);
        setPendingDelete(-1);
    };

    const handlePromote = () => {
        const nextGreetings = [...greetings];
        const [promoted] = nextGreetings.splice(pendingPromote, 1);
        nextGreetings.unshift(cardData.data.first_mes);
        patchCardData({
            first_mes: promoted,
            [config.fieldKey]: nextGreetings,
        });
        setPendingPromote(-1);
    };

    return (
        <Box>
            <Button onClick={handleAdd} sx={{ mb: 2 }} variant="contained">Add greeting</Button>

            {greetings.length === 0 ? (
                <Box sx={{
                    alignItems: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    justifyContent: 'center',
                    minHeight: 200,
                    p: 4,
                    textAlign: 'center',
                }}>
                    <ForumOutlined sx={{ color: 'text.disabled', fontSize: 44 }} />
                    <Typography color="text.secondary" sx={{ maxWidth: 520 }} variant="body2">
                        {config.empty}
                    </Typography>
                </Box>
            ) : (
                <DragDropContext onDragEnd={reorderGreeting}>
                    <Droppable droppableId={config.droppableId}>
                        {(provided) => (
                            <Box ref={provided.innerRef} {...provided.droppableProps}>
                                {greetings.map((text, index) => (
                                    <Draggable
                                        draggableId={`${config.droppableId}#${index}`}
                                        index={index}
                                        key={`${config.droppableId}#${index}`}
                                    >
                                        {(dragProvided) => (
                                            <Box
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}
                                                style={dragProvided.draggableProps.style}
                                            >
                                                <Tooltip title="Drag to change order">
                                                    <IconButton
                                                        {...dragProvided.dragHandleProps}
                                                        aria-label={`Reorder ${config.heading} ${index + 1}`}
                                                        sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0 }}
                                                    >
                                                        <DragHandle />
                                                    </IconButton>
                                                </Tooltip>
                                                <Accordion
                                                    expanded={rows.isExpanded(index)}
                                                    onChange={onEntryToggle(index)}
                                                    slotProps={{ transition: { unmountOnExit: true } }}
                                                    sx={{
                                                        mb: 2,
                                                        minWidth: 0,
                                                        mt: 1,
                                                        width: '100%',
                                                        '& .MuiAccordionSummary-content': { minWidth: 0 },
                                                    }}
                                                >
                                                    <AccordionSummary expandIcon={<ArrowDropDown />}>
                                                        <Typography noWrap sx={{ fontWeight: 600 }}>
                                                            {config.heading} #{index + 1}
                                                            {text ? ` — ${text.slice(0, 48)}${text.length > 48 ? '…' : ''}` : ' — empty'}
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <config.TextFieldComponent
                                                            greetingIndex={index}
                                                            helpKey={config.helpKey}
                                                            label={`${config.heading} #${index + 1}`}
                                                            onValueChange={(value) => handleGreetingChange(index, value)}
                                                        />
                                                        {isMobile && (
                                                            <Stack
                                                                direction="row"
                                                                spacing={0.5}
                                                                sx={{
                                                                    alignItems: 'center',
                                                                    flexWrap: 'wrap',
                                                                    justifyContent: 'flex-end',
                                                                    mt: 1.5,
                                                                }}
                                                            >
                                                                <IconButton
                                                                    aria-label={`Move greeting ${index + 1} up`}
                                                                    disabled={index === 0}
                                                                    onClick={() => moveGreeting(index, -1)}
                                                                    size="small"
                                                                >
                                                                    <ArrowUpward fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                    aria-label={`Move greeting ${index + 1} down`}
                                                                    disabled={index === greetings.length - 1}
                                                                    onClick={() => moveGreeting(index, 1)}
                                                                    size="small"
                                                                >
                                                                    <ArrowDownward fontSize="small" />
                                                                </IconButton>
                                                                {config.allowPromote && (
                                                                    <Button
                                                                        onClick={() => setPendingPromote(index)}
                                                                        size="small"
                                                                        startIcon={<KeyboardDoubleArrowUp />}
                                                                    >
                                                                        Promote
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    color="error"
                                                                    onClick={() => setPendingDelete(index)}
                                                                    size="small"
                                                                    startIcon={<DeleteOutline />}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </Stack>
                                                        )}
                                                    </AccordionDetails>
                                                </Accordion>
                                                {!isMobile && config.allowPromote && (
                                                    <Tooltip title="Promote this greeting to the first message">
                                                        <IconButton
                                                            aria-label={`Promote greeting ${index + 1}`}
                                                            onClick={() => setPendingPromote(index)}
                                                            sx={{ flexShrink: 0 }}
                                                        >
                                                            <KeyboardDoubleArrowUp />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {!isMobile && (
                                                    <Tooltip title="Remove greeting">
                                                        <IconButton
                                                            aria-label={`Remove greeting ${index + 1}`}
                                                            color="error"
                                                            onClick={() => setPendingDelete(index)}
                                                            sx={{ flexShrink: 0 }}
                                                        >
                                                            <DeleteOutline />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
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

            <ConfirmActionDialog
                dialogContent={`${config.heading} #${pendingDelete + 1} will be removed from the list. There is no undo.`}
                dialogTitle="Remove this greeting?"
                handleClose={() => setPendingDelete(-1)}
                handleConfirm={handleDelete}
                open={pendingDelete >= 0}
            />
            <ConfirmActionDialog
                dialogContent={`Promote ${config.heading.toLowerCase()} #${pendingPromote + 1} to the first message? The current first message replaces it in the list.`}
                dialogTitle="Promote greeting?"
                handleClose={() => setPendingPromote(-1)}
                handleConfirm={handlePromote}
                open={pendingPromote >= 0}
            />
        </Box>
    );
}
