import { useCallback, useEffect, useRef, useState } from "react";

import { Box, TextField } from "@mui/material";

import useDebouncedFieldDraft from "../../hooks/useDebouncedFieldDraft";
import FieldLabel from "../fields/FieldLabel";
import MacroHighlight from "./MacroHighlight";

/**
 * Shared MUI TextField wrapper for card fields.
 *
 * The field keeps a local draft so typing feels instant while card state is committed on a
 * debounce; `useDebouncedFieldDraft` owns that draft, the timer and caret restoration.
 *
 * Multiline fields also render a highlight layer that colors {{user}} / {{char}} macros, greys out
 * *italic* spans and tints "quoted" text, which makes card markup easy to spot in long text.
 *
 * @param {string} label
 * @param {string} name Passed through as the underlying input's `name`, and as `e.target.name` in onChange
 * @param {*} onChange onChange callback, called with the raw change event
 * @param {string} value Current value from card state
 * @param {number} [debounceMs] Debounce delay in ms; pass 0 to call onChange synchronously
 * @param {boolean} [multiline]
 * @param {int} [rows]
 * @param {boolean} [highlightMacros] Highlights {{user}} / {{char}}. Defaults to `multiline`.
 * @param {boolean} [preserveCursor] Restore cursor position after each change. Must be false for
 * inputs whose type doesn't support text selection (e.g. type="number"), which throw when
 * selectionStart/setSelectionRange are accessed.
 * @param {boolean} [readOnly] Renders the field as informational/non-editable (e.g. a V3 field
 * like "source" that the spec says shouldn't be user-edited), rather than disabled.
 * @param {boolean} [showCount] Shows a live character count as helper text.
 */
const DebouncedTextField = ({label, helpKey, name, onChange, value, debounceMs = 300, multiline = false, rows, highlightMacros = multiline, preserveCursor = true, readOnly = false, showCount = false, slotProps, ...rest}) => {
    // True while the textarea holds a non-collapsed selection. The overlay is hidden then and the
    // real textarea text becomes visible, so the selection highlight is painted around the same
    // glyphs the user sees instead of a translucent rectangle coming from a hidden text layer.
    const [showNativeText, setShowNativeText] = useState(false);
    const inputRef = useRef(null);
    const overlayRef = useRef(null);

    // The highlight layer sits in the same box as the textarea. Match its exact (fractional)
    // content width so both layers wrap lines identically - rounding the width can push a word
    // onto the next line in one layer but not the other - and keep their scroll positions in sync.
    const syncOverlay = useCallback(() => {
        const textarea = inputRef.current;
        const overlay = overlayRef.current;
        if (!textarea || !overlay) return;
        const textareaWidth = textarea.getBoundingClientRect().width;
        if (textareaWidth > 0) {
            // The overlay is border-box with 14px of horizontal padding, matching MUI's input.
            overlay.style.width = `${textareaWidth + 28}px`;
        }
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
    }, []);

    const { draft, handleChange: handleDraftChange } = useDebouncedFieldDraft({
        delayMs: debounceMs,
        inputRef,
        onAfterDraftChange: syncOverlay,
        onChange,
        preserveCursor,
        value,
    });

    // Selection state drives which layer paints the text. Reading it from the textarea itself
    // keeps the two layers in sync no matter how the selection was created (mouse, keyboard,
    // Ctrl+A, programmatic).
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
        // Browser zoom and window resizes change the textarea's content width without always
        // being reported by ResizeObserver in the same frame, and a stale overlay width makes the
        // two text layers wrap differently again.
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

    const charCount = typeof draft === "string" ? draft.length : 0;

    const htmlInputSlot = {
        'aria-label': label || name,
        readOnly,
        ...(slotProps?.htmlInput ?? {}),
        ...(multiline ? {
            // Multiline fields grow with their content, so the native resize handle is unnecessary.
            style: {...(slotProps?.htmlInput?.style ?? {}), resize: 'none'},
        } : {}),
    };

    if (highlightMacros && multiline) {
        const providedOnScroll = htmlInputSlot.onScroll;
        htmlInputSlot.onScroll = (event) => {
            syncOverlay();
            providedOnScroll?.(event);
        };

        // Mouse/keyboard selection changes do not always emit a document `selectionchange`
        // synchronously in every browser, so the local events keep the two layers in step.
        const wrapHandler = (provided, handler) => (event) => {
            handler(event);
            provided?.(event);
        };
        htmlInputSlot.onKeyUp = wrapHandler(htmlInputSlot.onKeyUp, syncSelectionState);
        htmlInputSlot.onMouseUp = wrapHandler(htmlInputSlot.onMouseUp, syncSelectionState);
        htmlInputSlot.onFocus = wrapHandler(htmlInputSlot.onFocus, syncSelectionState);
        htmlInputSlot.onBlur = wrapHandler(htmlInputSlot.onBlur, syncSelectionState);
    }

    const mergedSlotProps = {
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
        // Labels always sit above the field, as a static caption, rather than floating
        // in/out of the border on focus.
        inputLabel: {
            shrink: true,
            ...(slotProps?.inputLabel ?? {}),
        },
        ...(showCount ? {
            formHelperText: {
                style: {textAlign: 'right', margin: 0},
                ...(slotProps?.formHelperText ?? {}),
            },
        } : {}),
    };

    return(
        <Box sx={{width: '100%'}}>
            {label && <FieldLabel helpKey={helpKey} text={label} sx={{mb: 0.5}} />}
            <TextField
                autoComplete="off"
                fullWidth
                helperText={showCount ? `${charCount} character${charCount === 1 ? '' : 's'}` : undefined}
                inputRef={inputRef}
                margin="normal"
                minRows={multiline ? rows : undefined}
                multiline={multiline}
                name={name}
                onChange={handleChange}
                slotProps={mergedSlotProps}
                sx={{
                    mt: 0.5,
                    ...(highlightMacros && multiline ? {
                        // Normally the overlay paints the visible text and the textarea only keeps
                        // the caret/selection behavior. While the textarea holds a selection we do
                        // the opposite: the native text and the (solid, high-contrast) selection
                        // highlight are painted together by the browser, so they line up exactly.
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

export default DebouncedTextField;
