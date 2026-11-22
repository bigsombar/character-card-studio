import { Box, Tooltip } from '@mui/material';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';

/**
 * Small accessible help affordance. MUI Tooltip already wires aria-describedby for
 * keyboard focus; touch users get the same content through a tap.
 */
export default function InfoTooltip({ title, text, size = 'small' }) {
    if (!text) return null;

    return (
        <Tooltip
            arrow
            describeChild
            enterTouchDelay={0}
            leaveTouchDelay={6000}
            placement="top"
            title={title ? `${title}: ${text}` : text}
        >
            <Box
                aria-label={title ? `Help: ${title}` : 'Help'}
                component="span"
                role="button"
                sx={{
                    alignItems: 'center',
                    color: 'text.secondary',
                    cursor: 'help',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    lineHeight: 0,
                    ml: 0.5,
                    outline: 'none',
                    verticalAlign: 'middle',
                    '&:focus-visible': {
                        boxShadow: '0 0 0 2px #FFE400',
                        borderRadius: '50%',
                    },
                    '&:hover': { color: 'primary.main' },
                    '@media (max-width: 899.95px), (pointer: coarse)': {
                        margin: '-14px',
                        marginLeft: '-8px',
                        minHeight: 44,
                        minWidth: 44,
                    },
                }}
                tabIndex={0}
            >
                <HelpOutlineOutlined sx={{ fontSize: size === 'small' ? 15 : 18 }} />
            </Box>
        </Tooltip>
    );
}
