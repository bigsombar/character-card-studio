import { describe, expect, test } from 'vitest';

import {
    collectRemoteMedia,
    extractRemoteMedia,
    remoteAssetName,
    replaceTextReferences,
} from './remoteMedia';

const CARD = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
        name: 'Media card',
        description: 'Start ![alt](https://cdn.example.com/a.gif) end',
        personality: 'Plain text with https://example.com/page (not media)',
        scenario: '<img src="https://cdn.example.com/still.png">',
        first_mes: 'Video <video src="https://cdn.example.com/clip.mp4"></video>',
        mes_example: 'Audio https://cdn.example.com/voice.mp3.',
        creator_notes: 'Read https://example.com/notes',
        system_prompt: '',
        post_history_instructions: 'again ![x](https://cdn.example.com/a.gif)',
        tags: [],
        alternate_greetings: ['[img]https://cdn.example.com/alt.webp[/img]'],
        group_only_greetings: [],
        creator_notes_multilingual: {en: 'Sound https://cdn.example.com/theme.ogg'},
        extensions: {keep: true},
        character_book: {
            name: 'Book',
            description: 'Cover https://cdn.example.com/cover.jpg',
            entries: [
                {content: 'Entry ![e](https://cdn.example.com/entry.png)', comment: 'comment'},
            ],
        },
    },
    unknown_top_level: 'keep',
};

describe('extractRemoteMedia', () => {
    test('finds markdown images, HTML media, BBCode and bare media URLs', () => {
        const urls = extractRemoteMedia(CARD.data.description).map((item) => item.url);
        expect(urls).toEqual(['https://cdn.example.com/a.gif']);

        expect(extractRemoteMedia('<audio src="https://cdn.example.com/a.mp3"></audio>')[0]).toMatchObject({
            kind: 'audio',
        });
        expect(extractRemoteMedia('[img]https://cdn.example.com/x.webp[/img]')[0]).toMatchObject({
            kind: 'image',
        });
        expect(extractRemoteMedia('See https://cdn.example.com/v.webm.')[0]).toMatchObject({
            kind: 'video',
        });
    });

    test('ignores ordinary links and already-local URIs', () => {
        expect(extractRemoteMedia('https://example.com/page')).toEqual([]);
        expect(extractRemoteMedia('embeded://assets/other/images/a.png')).toEqual([]);
        expect(extractRemoteMedia('data:image/png;base64,AAAA')).toEqual([]);
    });

    test('trims prose punctuation from bare URLs', () => {
        const [match] = extractRemoteMedia('(https://cdn.example.com/pic.png)');
        expect(match.url).toBe('https://cdn.example.com/pic.png');
    });
});

describe('collectRemoteMedia', () => {
    test('deduplicates URLs and records occurrences and paths', () => {
        const found = collectRemoteMedia(CARD);
        const gif = found.find((item) => item.url === 'https://cdn.example.com/a.gif');
        expect(gif).toMatchObject({kind: 'image', occurrences: 2});
        expect(gif.paths).toEqual(expect.arrayContaining(['data.description', 'data.post_history_instructions']));

        expect(found.map((item) => item.url)).toEqual(expect.arrayContaining([
            'https://cdn.example.com/still.png',
            'https://cdn.example.com/clip.mp4',
            'https://cdn.example.com/voice.mp3',
            'https://cdn.example.com/alt.webp',
            'https://cdn.example.com/theme.ogg',
            'https://cdn.example.com/cover.jpg',
            'https://cdn.example.com/entry.png',
        ]));
        expect(found.map((item) => item.url)).not.toContain('https://example.com/page');
    });

    test('returns an empty list for a card without media links', () => {
        expect(collectRemoteMedia({data: {name: 'Empty', description: 'Nothing here'}})).toEqual([]);
    });
});

describe('replaceTextReferences', () => {
    test('replaces every occurrence across top-level and nested text fields', () => {
        const mapping = {
            'https://cdn.example.com/a.gif': 'embeded://assets/other/images/a.gif',
            'https://cdn.example.com/still.png': 'embeded://assets/other/images/still.png',
            'https://cdn.example.com/cover.jpg': 'embeded://assets/other/images/cover.jpg',
        };
        const {card, replacements} = replaceTextReferences(CARD, mapping);

        expect(replacements).toBe(4);
        expect(card.data.description).toContain('embeded://assets/other/images/a.gif');
        expect(card.data.post_history_instructions).toContain('embeded://assets/other/images/a.gif');
        expect(card.data.scenario).toContain('embeded://assets/other/images/still.png');
        expect(card.data.character_book.description).toContain('embeded://assets/other/images/cover.jpg');
        expect(card.data.character_book.entries[0].content).toContain('cdn.example.com/entry.png');
        expect(card.data.first_mes).toContain('cdn.example.com/clip.mp4');
        expect(card.data.extensions).toEqual({keep: true});
        expect(card.unknown_top_level).toBe('keep');
        expect(CARD.data.description).toContain('https://cdn.example.com/a.gif');
    });

    test('handles nested URLs without corrupting longer matches', () => {
        const card = {data: {description: 'https://x.test/a.png https://x.test/a.png?v=2', extensions: {}}};
        const {card: next, replacements} = replaceTextReferences(card, {
            'https://x.test/a.png': 'embeded://one',
            'https://x.test/a.png?v=2': 'embeded://two',
        });
        expect(replacements).toBe(2);
        expect(next.data.description).toBe('embeded://one embeded://two');
    });
});

describe('remoteAssetName', () => {
    test('is deterministic and safe', () => {
        const url = 'https://cdn.example.com/files/Hello%20World%21.GIF?token=1';
        const name = remoteAssetName(url);
        expect(name).toMatch(/^[a-z0-9._-]+$/);
        expect(name).toBe(remoteAssetName(url));
        expect(name.length).toBeLessThanOrEqual(60);
        expect(name).not.toBe(remoteAssetName('https://cdn.example.com/files/other.gif'));
    });
});
