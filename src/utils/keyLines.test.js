import { describe, expect, test } from 'vitest';

import { formatKeyLines, parseKeyLines } from './keyLines';

describe('keyLines', () => {
    test('parses one key per line and trims blanks', () => {
        expect(parseKeyLines('office\n  work  \n\n')).toEqual(['office', 'work']);
    });

    test('preserves commas inside regex keys', () => {
        expect(parseKeyLines('^hello, world$\nfoo,bar')).toEqual(['^hello, world$', 'foo,bar']);
    });

    test('handles CRLF and non-string input', () => {
        expect(parseKeyLines('a\r\nb')).toEqual(['a', 'b']);
        expect(parseKeyLines(undefined)).toEqual([]);
    });

    test('formats keys for the editor', () => {
        expect(formatKeyLines(['a', 'b,c'])).toBe('a\nb,c');
        expect(formatKeyLines(undefined)).toBe('');
    });
});
