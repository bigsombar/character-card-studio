import { createTheme } from '@mui/material/styles';

import { tokens } from './tokens';

const { color, font, shape } = tokens;

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: color.yellow,
            light: '#FFEB57',
            dark: '#C7B200',
            contrastText: color.onAccent,
        },
        secondary: {
            main: color.jade,
            light: '#31C78A',
            dark: '#0F7E50',
            contrastText: color.onAccent,
        },
        error: {
            main: color.orange,
            light: '#FF8B60',
            dark: '#CC4A1E',
            contrastText: color.onAccent,
        },
        warning: {
            main: color.yellow,
            light: '#FFEB57',
            dark: '#C7B200',
            contrastText: color.onAccent,
        },
        success: {
            main: color.jade,
            light: '#31C78A',
            dark: '#0F7E50',
            contrastText: color.onAccent,
        },
        info: {
            main: color.jade,
            contrastText: color.onAccent,
        },
        background: {
            default: color.bg,
            paper: color.surface,
        },
        text: {
            primary: color.text,
            secondary: color.textMuted,
            disabled: color.textDisabled,
        },
        divider: color.border,
        action: {
            hover: 'rgba(255, 228, 0, 0.08)',
            selected: 'rgba(20, 167, 108, 0.16)',
            focus: 'rgba(255, 228, 0, 0.24)',
        },
    },
    shape: {
        borderRadius: shape.input,
    },
    typography: {
        fontFamily: font.body,
        h1: { fontFamily: font.display, fontWeight: 600, letterSpacing: '-0.03em' },
        h2: { fontFamily: font.display, fontWeight: 600, letterSpacing: '-0.02em' },
        h3: { fontFamily: font.display, fontWeight: 600, letterSpacing: '-0.02em' },
        h4: { fontFamily: font.display, fontWeight: 600, letterSpacing: '-0.01em' },
        h5: { fontFamily: font.display, fontWeight: 600 },
        h6: { fontFamily: font.display, fontWeight: 600 },
        subtitle1: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
        overline: {
            fontWeight: 700,
            letterSpacing: '0.12em',
            fontSize: '0.68rem',
            lineHeight: 1.6,
        },
        caption: { color: color.textMuted },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: color.bg,
                    color: color.text,
                    fontFamily: font.body,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                },
                '::selection': {
                    backgroundColor: color.yellow,
                    color: color.onAccent,
                },
                '*': {
                    scrollbarWidth: 'thin',
                    // Chromium and Firefox ignore ::-webkit-scrollbar when the standard
                    // scrollbar-color is set, and otherwise fall back to a white track that
                    // clashes with the dark UI.
                    scrollbarColor: '#747474 #363636',
                },
                '*::-webkit-scrollbar': {
                    width: 10,
                    height: 10,
                },
                '*::-webkit-scrollbar-thumb': {
                    backgroundColor: '#747474',
                    borderRadius: 8,
                    border: '2px solid transparent',
                    backgroundClip: 'content-box',
                },
                '*::-webkit-scrollbar-track': {
                    backgroundColor: '#363636',
                },
                // Respect the OS "reduce motion" preference for transitions and smooth scrolling.
                '@media (prefers-reduced-motion: reduce)': {
                    '*, *::before, *::after': {
                        animationDuration: '0.01ms !important',
                        animationIterationCount: '1 !important',
                        scrollBehavior: 'auto !important',
                        transitionDuration: '0.01ms !important',
                    },
                },
            },
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    borderRadius: shape.input,
                    minHeight: 38,
                    paddingInline: 16,
                },
                containedPrimary: {
                    '&:hover': { backgroundColor: '#FFEB57' },
                },
                outlined: {
                    borderColor: color.border,
                    '&:hover': {
                        borderColor: color.jade,
                        backgroundColor: 'rgba(20, 167, 108, 0.08)',
                    },
                },
                text: {
                    '&:hover': { backgroundColor: 'rgba(255, 228, 0, 0.08)' },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: shape.input,
                    '&:hover': { backgroundColor: 'rgba(255, 228, 0, 0.08)' },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: color.surface,
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: color.bgDeep,
                    borderRadius: shape.input,
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: color.border,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#5A5A5A',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: color.yellow,
                        borderWidth: 2,
                    },
                },
                input: {
                    color: color.text,
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: color.textMuted,
                    '&.Mui-focused': { color: color.yellow },
                },
            },
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    color: color.textMuted,
                    marginLeft: 2,
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: '#111111',
                    border: `1px solid ${color.border}`,
                    color: color.text,
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                    maxWidth: 320,
                    padding: '8px 10px',
                },
                arrow: { color: '#111111' },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: { height: 2, borderRadius: 2, backgroundColor: color.yellow },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 44,
                    fontWeight: 600,
                    textTransform: 'none',
                },
            },
        },
        MuiAccordion: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: color.surface,
                    border: `1px solid ${color.border}`,
                    borderRadius: shape.input,
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                        borderColor: '#5A5A5A',
                    },
                },
            },
        },
        MuiAccordionSummary: {
            styleOverrides: {
                root: {
                    minHeight: 48,
                    '&.Mui-expanded': { minHeight: 48 },
                },
                content: { margin: '10px 0' },
            },
        },
        MuiAccordionDetails: {
            styleOverrides: {
                root: { padding: '8px 24px 24px' },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontWeight: 600,
                },
                outlined: { borderColor: color.border },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: color.surface,
                    backgroundImage: 'none',
                    border: `1px solid ${color.border}`,
                    borderRadius: shape.surface,
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: { fontFamily: font.display, fontWeight: 600 },
            },
        },
        MuiDivider: {
            styleOverrides: {
                root: { borderColor: color.border },
            },
        },
        MuiCheckbox: {
            styleOverrides: {
                root: { color: color.textMuted },
            },
        },
        MuiSwitch: {
            styleOverrides: {
                root: { color: color.textMuted },
            },
        },
        MuiSelect: {
            styleOverrides: {
                icon: { color: color.textMuted },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(20, 167, 108, 0.18)',
                    },
                },
            },
        },
    },
});

export default theme;
