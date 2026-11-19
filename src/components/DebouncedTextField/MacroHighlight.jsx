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
    macro: { color: tokens.color.jade },
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
 * Splits text into the segments the mirror layer renders, each with an optional style kind:
 * `macro` for {{user}} / {{char}}, `italic` for *text*, `quote` for "text", or no style for the
 * rest. Macros win over emphasis, so a *...* span that contains a macro keeps a green macro and
 * plain asterisks rather than being repainted as italic.
 */
export function splitHighlightSegments(value) {
    const segments = [];

    splitMacroSegments(value).forEach((part, index) => {
        if (part === '') return;
        if (index % 2 === 1) {
            segments.push({ style: 'macro', text: part });
            return;
        }

        let cursor = 0;
        for (const match of part.matchAll(EMPHASIS_PATTERN)) {
            if (match.index > cursor) {
                segments.push({ text: part.slice(cursor, match.index) });
            }
            segments.push({
                style: match[0].startsWith('*') ? 'italic' : 'quote',
                text: match[0],
            });
            cursor = match.index + match[0].length;
        }
        if (cursor < part.length) {
            segments.push({ text: part.slice(cursor) });
        }
    });

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
