import { nowSeconds } from './dates';

/**
 * Factories for new CCv3 records.
 *
 * Each call returns a new object graph, so the editor can mutate an entry or book without sharing
 * state with another card. Optional fields stay `undefined` instead of being serialized as empty
 * values.
 */

export const emptyCard = () => ({
    data: {
        alternate_greetings: [],
        character_version: '',
        creator: '',
        creator_notes: '',
        description: '',
        extensions: {},
        first_mes: '',
        group_only_greetings: [],
        mes_example: '',
        name: '',
        personality: '',
        post_history_instructions: '',
        scenario: '',
        system_prompt: '',
        tags: [],

        // Optional V3 fields
        assets: undefined,
        character_book: undefined,
        creation_date: undefined,
        creator_notes_multilingual: undefined,
        modification_date: undefined,
        nickname: '',
        source: undefined,
    },
    spec: 'chara_card_v3',
    spec_version: '3.0',
});

/**
 * Fresh card with the creation date stamped, as CCv3 expects for new cards. The modification date
 * is left for the exporter so it always reflects the last save.
 */
export const createNewCard = () => {
    const card = emptyCard();
    card.data.creation_date = nowSeconds();
    return card;
};

export const emptyCharacterBook = () => ({
    description: undefined,
    entries: [],
    extensions: {},
    name: undefined,
    recursive_scanning: undefined,
    scan_depth: undefined,
    token_budget: undefined,
});

export const emptyBookEntry = () => ({
    content: '',
    enabled: true,
    extensions: {},
    insertion_order: 0,
    keys: [],
    use_regex: false,

    // Optional CCv3 entry fields
    case_sensitive: undefined,
    comment: undefined,
    constant: undefined,
    id: undefined,
    name: undefined,
    position: undefined,
    priority: undefined,
    secondary_keys: undefined,
    selective: undefined,
});

export const emptyAssetRecord = () => ({
    ext: '',
    name: '',
    type: '',
    uri: '',
});
