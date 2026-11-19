import { nowSeconds } from './dates';

/**
 * Fresh CCv3 object shapes used when the editor creates a card, lorebook or entry.
 *
 * Fields left `undefined` are optional in the CCv3 specification. Values are built per call so
 * callers can freely mutate the returned object without affecting subsequent cards.
 */

export const v3CardPrototype = () => ({
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
    const card = v3CardPrototype();
    card.data.creation_date = nowSeconds();
    return card;
};

export const v3CharacterBookPrototype = () => ({
    description: undefined,
    entries: [],
    extensions: {},
    name: undefined,
    recursive_scanning: undefined,
    scan_depth: undefined,
    token_budget: undefined,
});

export const v3CharacterBookEntryPrototype = () => ({
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

export const v3AssetPrototype = () => ({
    ext: '',
    name: '',
    type: '',
    uri: '',
});
