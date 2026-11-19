import { normalizeUnixSeconds } from './dates';

function normalize(value) {
    const warnings = [];
    const result = normalizeUnixSeconds(value, 'creation_date', warnings);
    return {result, warnings};
}

describe('normalizeUnixSeconds', () => {
    test('keeps valid second timestamps', () => {
        const {result, warnings} = normalize(1700000000);
        expect(result).toBe(1700000000);
        expect(warnings).toEqual([]);
    });

    test('keeps zero as an explicit unknown value', () => {
        expect(normalize(0).result).toBe(0);
    });

    test('converts numeric strings without warning', () => {
        const {result, warnings} = normalize('1700000000');
        expect(result).toBe(1700000000);
        expect(warnings).toEqual([]);
    });

    test('converts millisecond timestamps to seconds without warning', () => {
        const {result, warnings} = normalize(1700000000000);
        expect(result).toBe(1700000000);
        expect(warnings).toEqual([]);
    });

    test('converts ISO 8601 date strings to seconds without warning', () => {
        const {result, warnings} = normalize('2023-11-14T22:13:20.000Z');
        expect(result).toBe(1700000000);
        expect(warnings).toEqual([]);
    });

    test('accepts Date instances', () => {
        expect(normalize(new Date(1700000000000)).result).toBe(1700000000);
    });

    test('drops invalid and negative dates silently', () => {
        expect(normalize('not a date').result).toBeUndefined();
        expect(normalize('not a date').warnings).toEqual([]);
        expect(normalize(-1).result).toBeUndefined();
    });
});
