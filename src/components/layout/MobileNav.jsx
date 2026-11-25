import { useState } from 'react';
import {
    Box,
    ButtonBase,
    Divider,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material';
import MoreHoriz from '@mui/icons-material/MoreHoriz';

import { EDITOR_SECTIONS } from '../../app/editorSections';

const PRIMARY_SECTIONS = [0, 1, 4, 5];
const MORE_SECTIONS = [2, 3, 6, 7, 8];

function sectionByValue(value) {
    return EDITOR_SECTIONS.find((section) => section.value === value);
}

const navItemSx = {
    alignItems: 'center',
    borderRadius: 1.5,
    color: 'text.secondary',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: 0.25,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 0,
    position: 'relative',
    '&:hover': {
        backgroundColor: 'action.hover',
        color: 'text.primary',
    },
    '&:focus-visible': {
        outline: '2px solid #FFE400',
        outlineOffset: -2,
    },
    '&[aria-current="page"]': {
        color: 'primary.main',
    },
    '&[aria-current="page"]::before': {
        backgroundColor: 'primary.main',
        borderRadius: 2,
        content: '""',
        height: 3,
        left: 8,
        position: 'absolute',
        right: 8,
        top: 0,
    },
};

/**
 * Mobile section switcher. Four primary sections stay in thumb reach; the remaining five live in
 * a bottom sheet so the editor does not lose vertical space to a second navigation row.
 */
export default function MobileNav({ activeSection, onSectionChange }) {
    const [moreOpen, setMoreOpen] = useState(false);
    const moreActive = MORE_SECTIONS.includes(activeSection);

    const selectSection = (value) => {
        onSectionChange(value);
        setMoreOpen(false);
    };

    return (
        <>
            <Box
                aria-label="Editor sections"
                component="nav"
                sx={{
                    bgcolor: 'background.default',
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexShrink: 0,
                    gap: 0.5,
                    pb: 'env(safe-area-inset-bottom)',
                    px: 0.75,
                    py: 0.5,
                }}
            >
                {PRIMARY_SECTIONS.map((value) => {
                    const section = sectionByValue(value);
                    const Icon = section.icon;
                    const active = activeSection === value;

                    return (
                        <ButtonBase
                            aria-current={active ? 'page' : undefined}
                            key={value}
                            onClick={() => selectSection(value)}
                            sx={navItemSx}
                        >
                            <Icon sx={{ fontSize: 21 }} />
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: '0.6rem',
                                    fontWeight: active ? 700 : 600,
                                    letterSpacing: '0.03em',
                                    lineHeight: 1.1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {section.label}
                            </Typography>
                        </ButtonBase>
                    );
                })}

                <ButtonBase
                    aria-current={moreActive ? 'page' : undefined}
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen(true)}
                    sx={navItemSx}
                >
                    <MoreHoriz sx={{ fontSize: 21 }} />
                    <Typography
                        component="span"
                        sx={{
                            fontSize: '0.6rem',
                            fontWeight: moreActive ? 700 : 600,
                            letterSpacing: '0.03em',
                            lineHeight: 1.1,
                            textTransform: 'uppercase',
                        }}
                    >
                        More
                    </Typography>
                </ButtonBase>
            </Box>

            <Drawer
                anchor="bottom"
                onClose={() => setMoreOpen(false)}
                open={moreOpen}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: 'background.paper',
                            borderTop: 1,
                            borderColor: 'divider',
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                            pb: 'env(safe-area-inset-bottom)',
                        },
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography
                        component="h2"
                        sx={{
                            fontFamily: '"Space Grotesk Variable", "Space Grotesk", sans-serif',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            mb: 1,
                        }}
                    >
                        More sections
                    </Typography>
                    <List disablePadding>
                        {MORE_SECTIONS.map((value) => {
                            const section = sectionByValue(value);
                            const Icon = section.icon;
                            const active = activeSection === value;

                            return (
                                <ListItemButton
                                    aria-current={active ? 'page' : undefined}
                                    key={value}
                                    onClick={() => selectSection(value)}
                                    sx={{
                                        borderRadius: 1.5,
                                        mb: 0.5,
                                        minHeight: 52,
                                        '&[aria-current="page"]': {
                                            backgroundColor: 'action.selected',
                                            color: 'primary.main',
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                                        <Icon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={section.label}
                                        secondary={section.hint}
                                        slotProps={{ secondary: { sx: { color: 'text.secondary' } } }}
                                    />
                                </ListItemButton>
                            );
                        })}
                    </List>
                    <Divider sx={{ my: 1 }} />
                    <Typography color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.08em' }}>
                        LOCAL / V3
                    </Typography>
                </Box>
            </Drawer>
        </>
    );
}
