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

import AltGreetingTextField, { GroupGreetingTextField } from '../AltGreetingTextField/AltGreetingTextField';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { useCard } from '../../context/cardContext';
import useIsMobile from '../../hooks/useIsMobile';

const KIND_CONFIG = {
    alternate: {
        fieldName: 'alternate_greetings',
        namePrefix: 'altGreeting',
        droppableId: 'droppableGreeting',
        heading: 'Alternate greeting',
        helpKey: 'alternate_greetings',
        TextFieldComponent: AltGreetingTextField,
        empty: 'No alternate greetings yet. Add one to give readers another opening scene.',
        allowPromote: true,
    },
    group: {
        fieldName: 'group_only_greetings',
        namePrefix: 'groupGreeting',
        droppableId: 'droppableGroupGreeting',
        heading: 'Group-only greeting',
        helpKey: 'group_only_greetings_item',
        TextFieldComponent: GroupGreetingTextField,
        empty: 'No group-only greetings yet. These are shown only in group chats.',
        allowPromote: false,
    },
};

/** Reorderable greeting list used by both alternate and group-only greetings. */
export default function GreetingListEditor({ kind = 'alternate' }) {
    const config = KIND_CONFIG[kind];
    const isMobile = useIsMobile();
    const { cardData, patchCardData } = useCard();
    const greetings = cardData.data[config.fieldName] ?? [];
    const [expanded, setExpanded] = useState([]);
    const [pendingDelete, setPendingDelete] = useState(-1);
    const [pendingPromote, setPendingPromote] = useState(-1);

    const updateGreetings = (nextGreetings) => {
        patchCardData({ [config.fieldName]: nextGreetings });
    };

    const handleAdd = () => {
        updateGreetings([...greetings, '']);
        setExpanded((previous) => [...previous, greetings.length]);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        const match = name.match(new RegExp(`${config.namePrefix}(\\d+)`));
        if (!match) return;
        const index = Number.parseInt(match[1], 10);
        updateGreetings(greetings.map((greeting, itemIndex) => (itemIndex === index ? value : greeting)));
    };

    const handleAccordionChange = (panel) => (_event, isExpanded) => {
        setExpanded((previous) => (
            isExpanded ? [...previous, panel] : previous.filter((item) => item !== panel)
        ));
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const items = [...greetings];
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        updateGreetings(items);
        setExpanded((previous) => previous.map((panel) => {
            if (panel === result.source.index) return result.destination.index;
            if (panel > result.source.index && panel <= result.destination.index) return panel - 1;
            if (panel < result.source.index && panel >= result.destination.index) return panel + 1;
            return panel;
        }));
    };

    const moveGreeting = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= greetings.length) return;

        const items = [...greetings];
        const [moved] = items.splice(index, 1);
        items.splice(target, 0, moved);
        updateGreetings(items);
        setExpanded((previous) => previous.map((panel) => {
            if (panel === index) return target;
            if (panel > index && panel <= target) return panel - 1;
            if (panel < index && panel >= target) return panel + 1;
            return panel;
        }));
    };

    const handleDelete = () => {
        const nextGreetings = [...greetings];
        nextGreetings.splice(pendingDelete, 1);
        updateGreetings(nextGreetings);
        setExpanded([]);
        setPendingDelete(-1);
    };

    const handlePromote = () => {
        const nextGreetings = [...greetings];
        const [promoted] = nextGreetings.splice(pendingPromote, 1);
        nextGreetings.unshift(cardData.data.first_mes);
        patchCardData({
            first_mes: promoted,
            [config.fieldName]: nextGreetings,
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
                <DragDropContext onDragEnd={handleDragEnd}>
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
                                                <Tooltip title="Drag to reorder">
                                                    <IconButton
                                                        {...dragProvided.dragHandleProps}
                                                        aria-label={`Reorder ${config.heading} ${index + 1}`}
                                                        sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0 }}
                                                    >
                                                        <DragHandle />
                                                    </IconButton>
                                                </Tooltip>
                                                <Accordion
                                                    expanded={expanded.includes(index)}
                                                    onChange={handleAccordionChange(index)}
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
                                                            changeCallback={handleChange}
                                                            fieldName={`${config.namePrefix}${index}`}
                                                            greetingIndex={index}
                                                            helpKey={config.helpKey}
                                                            label={`${config.heading} #${index + 1}`}
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
                                                                    Delete
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
                                                    <Tooltip title="Delete this greeting">
                                                        <IconButton
                                                            aria-label={`Delete greeting ${index + 1}`}
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

            <ConfirmationDialog
                dialogContent={`Delete ${config.heading.toLowerCase()} #${pendingDelete + 1}? This action cannot be undone.`}
                dialogTitle={`Delete ${config.heading.toLowerCase()}?`}
                handleClose={() => setPendingDelete(-1)}
                handleConfirm={handleDelete}
                open={pendingDelete >= 0}
            />
            <ConfirmationDialog
                dialogContent={`Promote ${config.heading.toLowerCase()} #${pendingPromote + 1} to the first message? The current first message replaces it in the list.`}
                dialogTitle="Promote greeting?"
                handleClose={() => setPendingPromote(-1)}
                handleConfirm={handlePromote}
                open={pendingPromote >= 0}
            />
        </Box>
    );
}
