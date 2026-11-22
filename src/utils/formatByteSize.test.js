import formatByteSize from './formatByteSize';

describe('formatByteSize', () => {
    test('keeps small values in whole bytes', () => {
        expect(formatByteSize(0)).toBe('0 B');
        expect(formatByteSize(1)).toBe('1 B');
        expect(formatByteSize(1023)).toBe('1023 B');
    });

    test('treats missing or invalid sizes as zero', () => {
        expect(formatByteSize(undefined)).toBe('0 B');
        expect(formatByteSize(null)).toBe('0 B');
        expect(formatByteSize(Number.NaN)).toBe('0 B');
        expect(formatByteSize(-5)).toBe('0 B');
    });

    test('uses one decimal for kilobytes and megabytes', () => {
        expect(formatByteSize(1024)).toBe('1.0 KB');
        expect(formatByteSize(1536)).toBe('1.5 KB');
        expect(formatByteSize(10 * 1024)).toBe('10.0 KB');
        expect(formatByteSize(1024 * 1024)).toBe('1.0 MB');
        expect(formatByteSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });

    test('rolls over to the next unit instead of showing 1024.0', () => {
        expect(formatByteSize(1024 * 1024 - 1)).toBe('1.0 MB');
        expect(formatByteSize(1023.96 * 1024)).toBe('1.0 MB');
    });
});
