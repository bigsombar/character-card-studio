import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import AutoFixHighOutlined from '@mui/icons-material/AutoFixHighOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import DataObjectOutlined from '@mui/icons-material/DataObjectOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import TerminalOutlined from '@mui/icons-material/TerminalOutlined';

import brandIcon from '../../assets/brand-icon.svg';

export const EDITOR_SECTIONS = [
    { value: 0, label: 'Character', icon: PersonOutlined, hint: 'Name, description and first message' },
    { value: 1, label: 'Greetings', icon: ChatBubbleOutlineOutlined, hint: 'Alternate greetings' },
    { value: 2, label: 'Creator', icon: BadgeOutlined, hint: 'Creator metadata and notes' },
    { value: 3, label: 'Prompts', icon: TerminalOutlined, hint: 'System prompt and post-history instructions' },
    { value: 4, label: 'Lorebook', icon: MenuBookOutlined, hint: 'World info and lorebook entries' },
    { value: 5, label: 'Assets', icon: ImageOutlined, hint: 'Images, audio and video stored in the card' },
    { value: 6, label: 'Groups', icon: GroupsOutlined, hint: 'Group-only greetings' },
    { value: 7, label: 'Tools', icon: AutoFixHighOutlined, hint: 'Macros and bulk actions' },
    { value: 8, label: 'Advanced', icon: DataObjectOutlined, hint: 'Raw JSON and low-level fields' },
];

export default function SideRail({ activeSection, onSectionChange }) {
    return (
        <Box
            aria-label="Editor sections"
            component="nav"
            sx={{
                alignItems: 'center',
                bgcolor: 'background.default',
                borderRight: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                gap: 0.5,
                overflowY: 'auto',
                py: 2,
                width: { xs: 72, sm: 84, lg: 92 },
            }}
        >
            <Box
                alt="Character Card Studio"
                component="img"
                src={brandIcon}
                sx={{
                    borderRadius: '10px',
                    display: 'block',
                    height: 48,
                    mb: 2,
                    width: 48,
                }}
            />

            {EDITOR_SECTIONS.map(({ value, label, icon: Icon, hint }) => {
                const active = activeSection === value;
                return (
                    <Tooltip arrow key={value} placement="right" title={`${label}: ${hint}`}>
                        <ButtonBase
                            aria-current={active ? 'page' : undefined}
                            focusRipple
                            onClick={() => onSectionChange(value)}
                            sx={{
                                alignItems: 'center',
                                borderRadius: 2,
                                color: active ? 'primary.main' : 'text.secondary',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                minHeight: 56,
                                py: 1,
                                position: 'relative',
                                width: { xs: 60, sm: 68, lg: 76 },
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                    color: active ? 'primary.main' : 'text.primary',
                                },
                                '&:focus-visible': {
                                    outline: '2px solid #FFE400',
                                    outlineOffset: 2,
                                },
                                '&::before': active ? {
                                    backgroundColor: 'primary.main',
                                    borderRadius: 2,
                                    content: '""',
                                    height: 22,
                                    left: -8,
                                    position: 'absolute',
                                    width: 3,
                                } : undefined,
                            }}
                        >
                            <Icon sx={{ fontSize: 21 }} />
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: '0.58rem',
                                    fontWeight: active ? 700 : 600,
                                    letterSpacing: '0.04em',
                                    lineHeight: 1,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {label}
                            </Typography>
                        </ButtonBase>
                    </Tooltip>
                );
            })}

            <Box sx={{ flex: 1 }} />
            <Tooltip arrow placement="right" title="Open the GitHub repository">
                <IconButton
                    aria-label="Open the GitHub repository"
                    component="a"
                    href="https://github.com/bigsombar/character-card-studio"
                    rel="noopener noreferrer"
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        mb: 1.5,
                        '&:hover': {
                            color: 'primary.main',
                        },
                        '&:focus-visible': {
                            outline: '2px solid #FFE400',
                            outlineOffset: 2,
                        },
                    }}
                    target="_blank"
                >
                    <GitHubIcon sx={{ fontSize: 21 }} />
                </IconButton>
            </Tooltip>
            <Tooltip arrow placement="right" title="Local-only CCv3 editor">
                <Typography
                    sx={{
                        color: 'text.secondary',
                        fontFamily: 'monospace',
                        fontSize: '0.62rem',
                        letterSpacing: '0.08em',
                        writingMode: 'vertical-rl',
                    }}
                >
                    LOCAL / V3
                </Typography>
            </Tooltip>
        </Box>
    );
}
