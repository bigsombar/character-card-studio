import { fieldHelp } from './fieldHelp';

const requiredKeys = [
    'name',
    'nickname',
    'description',
    'personality',
    'scenario',
    'first_mes',
    'mes_example',
    'creator',
    'character_version',
    'creator_notes',
    'source',
    'system_prompt',
    'post_history_instructions',
    'alternate_greetings',
    'group_only_greetings',
    'character_book.name',
    'character_book.scan_depth',
    'character_book.token_budget',
    'character_book.recursive_scanning',
    'character_book.entry.keys',
    'character_book.entry.content',
    'character_book.entry.use_regex',
    'character_book.entry.enabled',
    'character_book.entry.insertion_order',
    'character_book.entry.case_sensitive',
    'character_book.entry.constant',
    'character_book.entry.priority',
    'character_book.entry.id',
    'character_book.entry.position',
    'assets.type',
    'assets.name',
    'assets.ext',
    'assets.uri',
    'assets.main',
    'extensions',
    'spec_version',
    'character_book.extensions',
    'character_book.entry.extensions',
];

describe('fieldHelp', () => {
    test('every required field has a title and help text', () => {
        for (const key of requiredKeys) {
            expect(fieldHelp[key], `missing help for ${key}`).toBeDefined();
            expect(fieldHelp[key].title).toEqual(expect.any(String));
            expect(fieldHelp[key].text).toEqual(expect.any(String));
            expect(fieldHelp[key].text.length).toBeGreaterThan(10);
        }
    });
});
