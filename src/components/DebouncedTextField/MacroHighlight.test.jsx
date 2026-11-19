import { render } from '@testing-library/react';

import MacroHighlight, { splitHighlightSegments, splitMacroSegments } from './MacroHighlight';

describe('splitMacroSegments', () => {
    test('returns plain text as a single segment', () => {
        expect(splitMacroSegments('No macros here')).toEqual(['No macros here']);
    });

    test('splits {{user}} and {{char}} out of the text', () => {
        expect(splitMacroSegments('Hi {{user}}, I am {{char}}.')).toEqual([
            'Hi ',
            '{{user}}',
            ', I am ',
            '{{char}}',
            '.',
        ]);
    });

    test('is case-insensitive and tolerates inner whitespace', () => {
        expect(splitMacroSegments('{{ USER }} and {{Char}}')).toEqual([
            '',
            '{{ USER }}',
            ' and ',
            '{{Char}}',
            '',
        ]);
    });

    test('handles empty and non-string values', () => {
        expect(splitMacroSegments('')).toEqual(['']);
        expect(splitMacroSegments(undefined)).toEqual(['']);
        expect(splitMacroSegments(42)).toEqual(['42']);
    });
});

describe('MacroHighlight', () => {
    test('renders macro tokens as highlighted spans', () => {
        const { container } = render(<MacroHighlight value="{{char}} meets {{user}}" />);
        const spans = [...container.querySelectorAll('span')];
        expect(spans.map((span) => span.textContent)).toEqual(['{{char}}', '{{user}}']);
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });

    test('styles quotes and italics without changing the macro color', () => {
        const { container } = render(
            <MacroHighlight value={'{{char}} *smiles* and says “hello” then "bye"'} />,
        );
        const spans = [...container.querySelectorAll('span')];
        expect(spans.map((span) => span.textContent)).toEqual([
            '{{char}}',
            '*smiles*',
            '“hello”',
            '"bye"',
        ]);
        expect(spans[0]).toHaveStyle({ color: '#14A76C' });
        expect(spans[1]).toHaveStyle({ color: '#B3B3B3', fontStyle: 'italic' });
        expect(spans[2]).toHaveStyle({ color: '#EBD200' });
        expect(spans[3]).toHaveStyle({ color: '#EBD200' });
    });
});

describe('splitHighlightSegments', () => {
    test('keeps plain text unstyled', () => {
        expect(splitHighlightSegments('No markup here')).toEqual([
            { text: 'No markup here' },
        ]);
    });

    test('tags macros, italics and quotes independently', () => {
        expect(splitHighlightSegments('*waves* {{user}} "hi"')).toEqual([
            { style: 'italic', text: '*waves*' },
            { text: ' ' },
            { style: 'macro', text: '{{user}}' },
            { text: ' ' },
            { style: 'quote', text: '"hi"' },
        ]);
    });

    test('does not treat spaced asterisks as emphasis', () => {
        expect(splitHighlightSegments('5 * 3 * 2')).toEqual([
            { text: '5 * 3 * 2' },
        ]);
    });

    test('handles empty values', () => {
        expect(splitHighlightSegments('')).toEqual([]);
        expect(splitHighlightSegments(undefined)).toEqual([]);
    });
});
