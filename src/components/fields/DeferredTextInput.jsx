import { useCallback, useEffect, useRef, useState } from "react";

import { Box, TextField } from "@mui/material";

import useDebouncedFieldDraft from "../../hooks/useDebouncedFieldDraft";
import FieldLabel from "./FieldLabel";
import MacroHighlight from "./MacroHighlight";

/**
 * Buffered text input for card fields.
 *
 * The native input value and the persisted card value intentionally diverge for a short moment:
 * typing updates the visible draft immediately, while `onCommit` receives the stabilised string
 * after `commitDelay`. That keeps the caret stable and prevents a card-store write on every key.
 *
 * Multiline fields can paint a highlight layer for macros and emphasis. The layer follows the
 * textarea geometry and yields to the browser while the user is selecting text.
 *
 * @param {string} [id] DOM id and fallback accessible name
 * @param {string} [label] Static caption shown above the input
 * @param {string} [helpKey] Key in `content/fieldHelp.js`
 * @param {*} value Current persisted value
 * @param {(value: *, meta: {fieldKey: *, source: string}) => void} onCommit Receives the stable value
 * @param {number} [commitDelay] Delay before a typed value is committed
 * @param {boolean} [multiline] Render a textarea that grows with its content
 * @param {number} [minRows] Minimum visible rows for multiline mode
 * @param {boolean} [highlightMacros] Paint macros and emphasis in multiline mode
 * @param {boolean} [readOnly] Informational field that is not edited
 * @param {boolean} [showLength] Show a compact character counter
 */
const DeferredTextInput = ({
    id,
    label,
    helpKey,
    value,
    onCommit,
    commitDelay = 300,
    multiline = false,
    minRows = 1,
    highlightMacros = multiline,
    readOnly = false,
    showLength = false,
    slotProps,
    onBlur,
    ...rest
}) => {
    // While a textarea owns a non-collapsed selection, the native layer paints the text so the
    // browser's selection highlight lines up with the glyphs the user sees.
    const [showNativeText, setShowNativeText] = useState(false);
    const inputRef = useRef(null);
    const overlayRef = useRef(null);

    // The overlay shares the textarea's box. Matching its fractional content width prevents one
    // layer from wrapping a word differently from the other; scroll positions stay mirrored too.
    const syncOverlay = useCallback(() => {
        const textarea = inputRef.current;
        const overlay = overlayRef.current;
        if (!textarea || !overlay) return;

        const textareaWidth = textarea.getBoundingClientRect().width;
        if (textareaWidth > 0) {
            overlay.style.width = `${textareaWidth + 28}px`;
        }
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
    }, []);

    const {
        draft,
        flush,
        handleChange: handleDraftChange,
        handleCompositionEnd,
        handleCompositionStart,
    } = useDebouncedFieldDraft({
        delayMs: commitDelay,
        fieldKey: id,
        inputRef,
        onAfterDraftChange: syncOverlay,
        onCommit,
        value,
    });

    const syncSelectionState = useCallback(() => {
        const textarea = inputRef.current;
        if (!textarea) return;
        const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
        setShowNativeText((current) => (current === hasSelection ? current : hasSelection));
    }, []);

    useEffect(() => {
        if (highlightMacros && multiline) syncOverlay();
    }, [draft, highlightMacros, multiline, syncOverlay]);

    useEffect(() => {
        if (!highlightMacros || !multiline || typeof ResizeObserver === 'undefined') return undefined;
        const textarea = inputRef.current;
        if (!textarea) return undefined;

        const observer = new ResizeObserver(() => syncOverlay());
        observer.observe(textarea);
        window.addEventListener('resize', syncOverlay);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', syncOverlay);
        };
    }, [highlightMacros, multiline, syncOverlay]);

    useEffect(() => {
        if (!highlightMacros || !multiline) return undefined;
        const textarea = inputRef.current;
        if (!textarea) return undefined;

        const handleSelectionChange = () => syncSelectionState();
        document.addEventListener('selectionchange', handleSelectionChange);
        textarea.addEventListener('select', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            textarea.removeEventListener('select', handleSelectionChange);
        };
    }, [highlightMacros, multiline, syncSelectionState]);

    const handleChange = (event) => {
        setShowNativeText(false);
        handleDraftChange(event);
    };

    const handleBlur = (event) => {
        flush('blur');
        onBlur?.(event);
    };

    const textLength = typeof draft === "string" ? draft.length : 0;
    const lengthLabel = `${textLength} ${textLength === 1 ? 'char' : 'chars'}`;

    const htmlInputSlot = {
        'aria-label': label || id,
        readOnly,
        ...(slotProps?.htmlInput ?? {}),
        onBlur: handleBlur,
        onCompositionEnd: handleCompositionEnd,
        onCompositionStart: handleCompositionStart,
        ...(multiline ? {
            style: { ...(slotProps?.htmlInput?.style ?? {}), resize: 'none' },
        } : {}),
    };

    if (highlightMacros && multiline) {
        const providedOnScroll = htmlInputSlot.onScroll;
        htmlInputSlot.onScroll = (event) => {
            syncOverlay();
            providedOnScroll?.(event);
        };

        const wrapHandler = (provided, handler) => (event) => {
            handler(event);
            provided?.(event);
        };
        htmlInputSlot.onKeyUp = wrapHandler(htmlInputSlot.onKeyUp, syncSelectionState);
        htmlInputSlot.onMouseUp = wrapHandler(htmlInputSlot.onMouseUp, syncSelectionState);
        htmlInputSlot.onFocus = wrapHandler(htmlInputSlot.onFocus, syncSelectionState);
        htmlInputSlot.onBlur = wrapHandler(htmlInputSlot.onBlur, syncSelectionState);
    }

    const labelProps = {
        shrink: true,
        ...slotProps?.inputLabel,
    };

    const lengthProps = showLength ? {
        ...slotProps?.formHelperText,
        style: { margin: 0, textAlign: 'right', ...slotProps?.formHelperText?.style },
    } : null;

    const fieldSlotProps = {
        ...slotProps,
        htmlInput: htmlInputSlot,
        ...(highlightMacros && multiline ? {
            input: {
                ...(slotProps?.input ?? {}),
                startAdornment: (
                    <MacroHighlight hidden={showNativeText} overlayRef={overlayRef} value={draft ?? ''} />
                ),
            },
        } : {}),
        inputLabel: labelProps,
        ...(lengthProps ? { formHelperText: lengthProps } : {}),
    };

    return (
        <Box sx={{ width: '100%' }}>
            {label && <FieldLabel helpKey={helpKey} text={label} sx={{ mb: 0.5 }} />}
            <TextField
                autoComplete="off"
                fullWidth
                helperText={showLength ? lengthLabel : undefined}
                id={id}
                inputRef={inputRef}
                margin="normal"
                minRows={multiline ? minRows : undefined}
                multiline={multiline}
                onChange={handleChange}
                slotProps={fieldSlotProps}
                sx={{
                    mt: 0.5,
                    ...(highlightMacros && multiline ? {
                        '& textarea': {
                            caretColor: '#F2F0E9',
                            ...(showNativeText ? {
                                color: 'inherit',
                                WebkitTextFillColor: 'currentColor',
                            } : {
                                color: 'transparent',
                                WebkitTextFillColor: 'transparent',
                            }),
                        },
                    } : {}),
                }}
                value={draft}
                {...rest}
            />
        </Box>
    );
};

export default DeferredTextInput;
