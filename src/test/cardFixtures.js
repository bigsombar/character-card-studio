import { SPEC_NAME, SPEC_VERSION } from '../spec/constants';

/**
 * Test-only CCv3 object builders.
 *
 * Every call returns a fresh object graph, so a test can mutate the result without leaking state
 * into the next one. Optional fields are omitted from the defaults on purpose; tests that need
 * them pass overrides, which keeps each expectation explicit about what the CCv3 shape allows.
 */

export function sampleCardData(overrides = {}) {
    return {
        alternate_greetings: [],
        character_version: '',
        creator: '',
        creator_notes: '',
        description: '',
        extensions: {},
        first_mes: '',
        group_only_greetings: [],
        mes_example: '',
        name: 'Sample Hero',
        nickname: '',
        personality: '',
        post_history_instructions: '',
        scenario: '',
        system_prompt: '',
        tags: [],
        ...overrides,
    };
}

export function sampleCard(dataOverrides = {}, topLevel = {}) {
    return {
        data: sampleCardData(dataOverrides),
        spec: SPEC_NAME,
        spec_version: SPEC_VERSION,
        ...topLevel,
    };
}

export function sampleV2Card(dataOverrides = {}) {
    return {
        data: sampleCardData(dataOverrides),
        spec: 'chara_card_v2',
        spec_version: '2.0',
    };
}

export function sampleBook(overrides = {}) {
    return {
        description: undefined,
        entries: [],
        extensions: {},
        name: undefined,
        recursive_scanning: undefined,
        scan_depth: undefined,
        token_budget: undefined,
        ...overrides,
    };
}

export function sampleEntry(overrides = {}) {
    return {
        content: '',
        enabled: true,
        extensions: {},
        insertion_order: 0,
        keys: [],
        use_regex: false,
        ...overrides,
    };
}
