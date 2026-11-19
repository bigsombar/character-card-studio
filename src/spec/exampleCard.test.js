import exampleCard from '../../examples/safe-office-worker.json';
import normalizeCardData from '../utils/normalizeCardData';
import validateCardV3 from './validateCardV3';

describe('safe example card', () => {
    test('normalizes and validates as a CCv3 card', () => {
        const normalized = normalizeCardData(exampleCard);
        expect(normalized.ok).toBe(true);
        expect(normalized.warnings).toEqual([]);

        const validation = validateCardV3(normalized.cardData);
        expect(validation.errors).toEqual([]);
        expect(validation.warnings).toEqual([]);
    });
});
