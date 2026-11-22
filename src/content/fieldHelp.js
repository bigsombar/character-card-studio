/**
 * Human-readable help for every editable card field.
 *
 * Keep entries short: what the field does, what it affects, and (where useful) a tiny
 * example. The UI shows them in hover/focus/tap tooltips next to field labels.
 */
export const fieldHelp = {
    name: {
        title: 'Character name',
        text: 'The display name of the character. Used as {{char}} when nickname is empty.',
    },
    nickname: {
        title: 'Nickname',
        text: 'Short name used in prompts. When set, it replaces name for {{char}}, <char> and <bot>.',
    },
    description: {
        title: 'Description',
        text: 'The main character definition: appearance, personality and behavior. This is the primary context for the LLM.',
    },
    personality: {
        title: 'Personality',
        text: 'A compact summary of character traits. Useful for a quick overview; often overlaps with description.',
    },
    scenario: {
        title: 'Scenario',
        text: 'Where and when the story takes place, including the situation the user enters.',
    },
    first_mes: {
        title: 'First message',
        text: 'The character’s opening message when a new chat starts.',
    },
    mes_example: {
        title: 'Example messages',
        text: 'Example dialogue that demonstrates the character’s voice and style. Usually uses {{user}} and {{char}}.',
    },
    creator: {
        title: 'Creator',
        text: 'Name or handle of the person who made the card.',
    },
    character_version: {
        title: 'Character version',
        text: 'Version of this character or card. Useful when you publish updates.',
    },
    creator_notes: {
        title: 'Creator notes',
        text: 'Notes for the person using the card. These are not sent to the LLM as part of the prompt.',
    },
    creator_notes_multilingual: {
        title: 'Multilingual creator notes',
        text: 'Creator notes keyed by ISO 639-1 language code, for example en, ru or ja. The editor falls back to en, then creator notes.',
    },
    tags: {
        title: 'Tags',
        text: 'Comma-separated labels used for search and categorization. They do not affect the prompt.',
    },
    source: {
        title: 'Source',
        text: 'Where the card came from: an ID or URL. Read-only here; the editor preserves existing entries instead of rewriting them.',
    },
    system_prompt: {
        title: 'System prompt',
        text: 'Instructions placed in the system prompt for this character. Overrides the frontend default when supported.',
    },
    post_history_instructions: {
        title: 'Post-history instructions',
        text: 'Instructions inserted after chat history, near the end of the prompt. Also known as PHI or UJB.',
    },
    alternate_greetings: {
        title: 'Alternate greetings',
        text: 'Additional opening messages users can pick instead of the first message. Drag to change order.',
    },
    group_only_greetings: {
        title: 'Group-only greetings',
        text: 'Extra greetings used only in group chats. They are not shown in one-on-one chats.',
    },
    group_only_greetings_item: {
        title: 'Group-only greeting',
        text: 'A greeting that is only available when the card is used in a group chat.',
    },
    creation_date: {
        title: 'Creation date',
        text: 'Unix timestamp in seconds. Set when a new card is created; read-only and never rewritten on export.',
    },
    modification_date: {
        title: 'Modification date',
        text: 'Unix timestamp in seconds. Updated automatically when the card is exported.',
    },
    'character_book.name': {
        title: 'Lorebook name',
        text: 'A human-readable name for this character’s lorebook. It is not sent to the prompt.',
    },
    'character_book.description': {
        title: 'Lorebook description',
        text: 'Optional notes about what the lorebook contains. It is not sent to the prompt.',
    },
    'character_book.scan_depth': {
        title: 'Scan depth',
        text: 'How many recent messages are checked when matching keys. Leave empty to let the frontend decide.',
    },
    'character_book.token_budget': {
        title: 'Token budget',
        text: 'Maximum tokens the lorebook may use. When the budget is exceeded, lower-priority entries are dropped first.',
    },
    'character_book.recursive_scanning': {
        title: 'Recursive scanning',
        text: 'Allow lorebook content itself to trigger other entries. Leave N/A to use the frontend default.',
    },
    'character_book.entry.name': {
        title: 'Entry name',
        text: 'Short identifier for the lorebook entry. Synced with comment for Chub/SillyTavern compatibility.',
    },
    'character_book.entry.comment': {
        title: 'Entry comment',
        text: 'Optional note shown in the editor. Synced with name for compatibility with other frontends.',
    },
    'character_book.entry.keys': {
        title: 'Keys',
        text: 'One key per line. A key activates the entry when it appears in the chat. With use_regex enabled, the whole line is treated as a regex, so commas are preserved.',
    },
    'character_book.entry.secondary_keys': {
        title: 'Secondary keys',
        text: 'One key per line. Extra keys required together with the primary keys when “selective” is enabled.',
    },
    'character_book.entry.selective': {
        title: 'Selective matching',
        text: 'Require a secondary key to match before this entry activates.',
    },
    'character_book.entry.content': {
        title: 'Entry content',
        text: 'Text inserted into the prompt when the entry matches. Decorators such as @@depth may appear here.',
    },
    'character_book.entry.use_regex': {
        title: 'Use regular expressions',
        text: 'Treat keys as regex patterns instead of plain substrings. Invalid patterns should be treated as no match.',
    },
    'character_book.entry.enabled': {
        title: 'Enabled',
        text: 'Disabled entries are never activated, regardless of keys or decorators.',
    },
    'character_book.entry.insertion_order': {
        title: 'Insertion order',
        text: 'Lower values are inserted earlier in the prompt. Entries with equal values are ordered by the frontend.',
    },
    'character_book.entry.case_sensitive': {
        title: 'Case sensitive',
        text: 'When true, key matching respects letter case. Leave N/A to use the frontend default.',
    },
    'character_book.entry.constant': {
        title: 'Always active',
        text: 'Activate the entry regardless of keys. Ignored when use_regex is enabled.',
    },
    'character_book.entry.priority': {
        title: 'Priority',
        text: 'Higher-priority entries are kept longer when the token budget is tight.',
    },
    'character_book.entry.id': {
        title: 'Entry ID',
        text: 'Optional string or number used by some frontends to identify the entry. It is not sent to the prompt.',
    },
    'character_book.entry.position': {
        title: 'Position',
        text: 'Insert the content before or after the character description. Decorators may override this.',
    },
    'assets.type': {
        title: 'Asset type',
        text: 'What the file is for: icon, background, emotion, user_icon, other, or a custom x_ type such as x_audio.',
    },
    'assets.name': {
        title: 'Asset name',
        text: 'Identifier used by the card: main for the main icon/background, happy for an emotion, or the user name for user_icon.',
    },
    'assets.ext': {
        title: 'File extension',
        text: 'Lowercase extension without a dot, for example png or webm. It must match the file contents.',
    },
    'assets.uri': {
        title: 'Asset URI',
        text: 'Where the file lives: embeded:// inside CHARX, a data URL, an HTTPS URL, or ccdefault: for the built-in asset.',
    },
    'assets.main': {
        title: 'Main asset',
        text: 'The primary icon or background. If there are several icons, exactly one must be named main.',
    },
    'assets.mediaKind': {
        title: 'Media kind',
        text: 'The editor groups files as images, audio or video. Audio and video are stored inside CHARX archives.',
    },
    extensions: {
        title: 'Card extensions',
        text: 'Free-form JSON object for app-specific data. The editor preserves unknown keys verbatim and never executes code from them.',
    },
    spec_version: {
        title: 'Spec version',
        text: 'The CCv3 spec version this card follows. Newer versions are preserved on export with a warning.',
    },
    'character_book.extensions': {
        title: 'Lorebook extensions',
        text: 'Free-form JSON object for app-specific lorebook data. It is not sent to the prompt.',
    },
    'character_book.entry.extensions': {
        title: 'Entry extensions',
        text: 'Free-form JSON object for app-specific entry data, such as decorator settings. It is preserved verbatim.',
    },
};

export default fieldHelp;
