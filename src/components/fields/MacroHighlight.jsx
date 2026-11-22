import { Fragment } from 'react';

import { tokens } from '../../theme/tokens';

// {{user}} / {{char}} are case-insensitive in most card runtimes, so highlight those spellings
// too instead of only the canonical lowercase forms.
const MACRO_PATTERN = /(\{\{\s*(?:user|char)\s*\}\})/gi;

// *italic* and "quoted" spans. The italic branch requires a non-space next to the opening star so
// arithmetic like "5 * 3 * 2" is left alone. Typographic quotes are supported for imported cards
// that use them instead of straight ones.
const EMPHASIS_PATTERN = /("[^"\n]*"|«[^»\n]*»|“[^”\n]*”|\*\S(?:[^*\n]*\S)?\*)/g;

const SEGMENT_STYLES = {
    italic: { color: tokens.color.textMuted, fontStyle: 'italic' },
    // A macro keeps its own upright glyphs even when it sits inside an italic sentence.
    macro: { color: tokens.color.jade, fontStyle: 'normal' },
    quote: { color: tokens.color.yellowMuted },
};

/**
 * Splits text into alternating plain / macro segments. Even indexes are plain text, odd indexes
 * are macro tokens (the regex has a single capture group).
 */
export function splitMacroSegments(value) {
    const text = typeof value === 'string' ? value : value == null ? '' : String(value);
    if (text === '') return [''];
    return text.split(MACRO_PATTERN);
}

/**
 * Splits a chunk into macros and plain text, applying the surrounding emphasis style to the
 * plain pieces. Macros keep their own green, upright style even inside *italic* or "quoted" text.
 */
function pushMacroAwareSegments(segments, chunk, emphasisStyle) {
    splitMacroSegments(chunk).forEach((part, index) => {
        if (part === '') return;
        if (index % 2 === 1) {
            segments.push({ style: 'macro', text: part });
            return;
        }
        segments.push(emphasisStyle ? { style: emphasisStyle, text: part } : { text: part });
    });
}

/**
 * Splits text into the segments the mirror layer renders, each with an optional style kind:
 * `macro` for {{user}} / {{char}}, `italic` for *text*, `quote` for "text", or no style for the
 * rest.
 *
 * Emphasis is detected before macros, so `*...{{char}}...*` stays one italic sentence: the text
 * around the macro is grey italic, while the macro itself remains green and upright.
 */
export function splitHighlightSegments(value) {
    const text = typeof value === 'string' ? value : value == null ? '' : String(value);
    if (text === '') return [];

    const segments = [];
    let cursor = 0;

    for (const match of text.matchAll(EMPHASIS_PATTERN)) {
        if (match.index > cursor) {
            pushMacroAwareSegments(segments, text.slice(cursor, match.index), null);
        }
        const style = match[0].startsWith('*') ? 'italic' : 'quote';
        pushMacroAwareSegments(segments, match[0], style);
        cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
        pushMacroAwareSegments(segments, text.slice(cursor), null);
    }

    return segments;
}

/**
 * Mirror of a textarea's contents with {{user}} / {{char}} highlighted. It is rendered behind a
 * transparent-text textarea so the editable field keeps native selection, caret and scrolling.
 *
 * The mirror must lay text out *identically* to the real textarea, otherwise the caret, the
 * selection rectangles and the visible glyphs drift apart (most visible at high browser zoom).
 * That is why emphasis/special spans only change color and, for italics, use the synthesized
 * oblique face (no extra font metrics), never font weight/size/letter spacing.
 *
 * `hidden` is used while the user has a non-collapsed selection: at that point the real textarea
 * takes over again so the browser can paint the selected text and its highlight as one layer.
 */
export default function MacroHighlight({ hidden = false, overlayRef, value }) {
    const segments = splitHighlightSegments(value);

    return (
        <div
            aria-hidden="true"
            data-macro-highlight=""
            ref={overlayRef}
            style={{
                bottom: 0,
                boxSizing: 'border-box',
                color: 'inherit',
                font: 'inherit',
                left: 0,
                letterSpacing: 'inherit',
                lineHeight: 'inherit',
                overflow: 'hidden',
                overflowWrap: 'break-word',
                padding: '16.5px 14px',
                pointerEvents: 'none',
                position: 'absolute',
                top: 0,
                visibility: hidden ? 'hidden' : 'visible',
                whiteSpace: 'pre-wrap',
                width: '100%',
                wordBreak: 'normal',
                zIndex: 0,
            }}
        >
            {segments.map((segment, index) => (
                segment.style ? (
                    <span key={index} style={SEGMENT_STYLES[segment.style]}>{segment.text}</span>
                ) : (
                    <Fragment key={index}>{segment.text}</Fragment>
                )
            ))}
            {'\n'}
        </div>
    );
}
