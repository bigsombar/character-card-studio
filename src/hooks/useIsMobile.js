import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

/** True below the tablet breakpoint, where the editor switches to its mobile shell. */
export default function useIsMobile() {
    const theme = useTheme();
    return useMediaQuery(theme.breakpoints.down('md'));
}
