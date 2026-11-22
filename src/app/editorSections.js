import AutoFixHighOutlined from '@mui/icons-material/AutoFixHighOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import DataObjectOutlined from '@mui/icons-material/DataObjectOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import TerminalOutlined from '@mui/icons-material/TerminalOutlined';

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
