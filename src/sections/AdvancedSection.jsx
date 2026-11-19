import { useEffect, useMemo, useReducer } from 'react';
import {
    Alert,
    Box,
    Button,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';

import JsonObjectField from '../components/fields/JsonObjectField';
import MetaValue from '../components/fields/MetaValue';
import ValidationPanel from '../components/feedback/ValidationPanel';
import { useCard } from '../context/cardContext';
import { useNotifications } from '../context/NotificationContext';
import validateCardV3 from '../spec/validateCardV3';
import { buildOutgoingCard } from '../png/cardPngIO';
import normalizeCardData from '../utils/normalizeCardData';

const serializeCard = (card) => JSON.stringify(card, null, 2);

const EMPTY_EDITOR = {
    dirty: false,
    error: null,
    text: '',
    warnings: [],
};

/**
 * Editor state transitions in one place: an untouched textarea follows the live card, while a
 * dirty one keeps the user's text until it is applied or reset.
 */
function editorReducer(state, action) {
    switch (action.type) {
        case 'load':
            return state.dirty ? state : { ...state, text: action.text };
        case 'edit':
            return { dirty: true, error: null, text: action.text, warnings: [] };
        case 'reset':
            return { dirty: false, error: null, text: action.text, warnings: [] };
        case 'reject':
            return { ...state, error: action.error, warnings: action.warnings ?? [] };
        case 'accept':
            return { ...state, dirty: false, error: null, warnings: action.warnings ?? [] };
        default:
            return state;
    }
}

/**
 * Power-user surface: raw JSON, free-form extensions, structural validation and a
 * normalization escape hatch. Runtime decorators/CBS are intentionally never executed.
 */
export default function AdvancedSection({ onApplyCard }) {
    const { cardData, setCardData } = useCard();
    const { notify } = useNotifications();
    const [editor, dispatch] = useReducer(editorReducer, cardData, (card) => ({
        ...EMPTY_EDITOR,
        text: serializeCard(card),
    }));

    // Normalization, undo and imports all replace the card underneath the editor.
    useEffect(() => {
        dispatch({ type: 'load', text: serializeCard(cardData) });
    }, [cardData]);

    const validation = useMemo(() => validateCardV3(buildOutgoingCard(cardData)), [cardData]);

    const handleChange = (event) => {
        dispatch({ type: 'edit', text: event.target.value });
    };

    const handleReset = () => {
        dispatch({ type: 'reset', text: serializeCard(cardData) });
    };

    const handleApplyJson = () => {
        let parsed;
        try {
            parsed = JSON.parse(editor.text);
        } catch (parseError) {
            dispatch({ error: `Invalid JSON: ${parseError.message}`, type: 'reject' });
            return;
        }

        const result = normalizeCardData(parsed);
        if (!result.ok) {
            dispatch({ error: result.error, type: 'reject', warnings: result.warnings });
            return;
        }

        dispatch({ type: 'accept', warnings: result.warnings });
        onApplyCard?.(result.cardData, result.warnings ?? []);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard?.writeText(serializeCard(cardData));
            notify({ title: 'JSON copied', severity: 'success', message: 'The current card JSON is on the clipboard.' });
        } catch (copyError) {
            notify({ title: 'Copy failed', severity: 'error', message: copyError.message });
        }
    };

    const handleNormalize = () => {
        const result = normalizeCardData(cardData);
        if (!result.ok) {
            notify({ title: 'Normalization failed', severity: 'error', message: result.error, warnings: result.warnings });
            return;
        }
        setCardData(result.cardData);
        notify({
            title: 'Card normalized',
            severity: result.warnings?.length ? 'warning' : 'success',
            message: result.warnings?.length
                ? 'Defaults were applied and malformed fields were coerced.'
                : 'Defaults were applied; no malformed fields were found.',
            warnings: result.warnings,
        });
    };

    const entryCount = cardData.data.character_book?.entries?.length ?? 0;
    const assetCount = cardData.data.assets?.length ?? 0;

    return (
        <Stack spacing={2.5}>
            <Alert severity="info" icon={<TuneOutlined />}>
                Advanced fields are preserved verbatim. The editor validates structure only; it never executes
                decorators, macros or CIS/CBS scripts.
            </Alert>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                <MetaValue helpKey="spec_version" label="Spec" value={`${cardData.spec ?? 'chara_card_v3'} · ${cardData.spec_version ?? '3.0'}`} />
                <MetaValue label="Content" value={`${entryCount} lorebook entr${entryCount === 1 ? 'y' : 'ies'} · ${assetCount} asset${assetCount === 1 ? '' : 's'}`} />
            </Box>

            <JsonObjectField
                helpKey="extensions"
                label="Card extensions (data.extensions)"
                onApply={(extensions) => setCardData((prevState) => ({
                    ...prevState,
                    data: { ...prevState.data, extensions },
                }))}
                rows={5}
                value={cardData.data.extensions}
            />

            <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Structural validation</Typography>
                {validation.errors.length === 0 && validation.warnings.length === 0 ? (
                    <Alert severity="success">No structural errors or warnings.</Alert>
                ) : (
                    <ValidationPanel errors={validation.errors} maxVisible={8} warnings={validation.warnings} />
                )}
            </Box>

            <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Button onClick={handleApplyJson} variant="contained">Apply raw JSON</Button>
                    <Button disabled={!editor.dirty} onClick={handleReset} startIcon={<RestartAltOutlined />} variant="outlined">Reset</Button>
                    <Button onClick={handleCopy} startIcon={<ContentCopyOutlined />} variant="outlined">Copy JSON</Button>
                    <Button onClick={handleNormalize} variant="outlined">Normalize card</Button>
                    {editor.dirty && <Typography color="text.secondary" variant="body2">Unapplied changes</Typography>}
                </Stack>
                {editor.error && <Alert severity="error" sx={{ mb: 1 }}>{editor.error}</Alert>}
                {editor.warnings.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                        <ValidationPanel maxVisible={5} warnings={editor.warnings} />
                    </Alert>
                )}
                <TextField
                    autoComplete="off"
                    fullWidth
                    minRows={22}
                    multiline
                    onChange={handleChange}
                    slotProps={{ htmlInput: {
                        'aria-label': 'Raw card JSON',
                        style: { fontFamily: 'monospace', fontSize: '0.8rem' },
                    } }}
                    value={editor.text}
                />
            </Box>
        </Stack>
    );
}
