import { describe, expect, test } from 'vitest';

import { sampleBook, sampleCard, sampleEntry } from '../test/cardFixtures';
import { convertCardForRisuAI } from './risuCompat';

function asset(type, name, path) {
    return {
        type,
        name,
        ext: path.split('.').pop(),
        uri: `embeded://${path}`,
    };
}

describe('convertCardForRisuAI', () => {
    test('rewrites markdown images and adds one x-risu-asset mirror', () => {
        const card = sampleCard({
            first_mes: '![Desk after hours](embeded://assets/background/images/desk-after-hours.png)\nHello.',
            assets: [asset('background', 'main', 'assets/background/images/desk-after-hours.png')],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.first_mes).toBe('{{image::desk-after-hours}}\nHello.');
        expect(result.converted).toBe(1);
        expect(result.mirrors).toEqual([{
            type: 'x-risu-asset',
            name: 'desk-after-hours',
            ext: 'png',
            uri: 'embeded://assets/background/images/desk-after-hours.png',
        }]);
        expect(result.card.data.assets).toHaveLength(2);
        expect(result.warnings).toEqual([]);
        // The input card is never modified.
        expect(card.data.first_mes).toContain('![Desk after hours](embeded://');
        expect(card.data.assets).toHaveLength(1);
    });

    test('uses the emotion macro for emotion assets and does not mirror them', () => {
        const card = sampleCard({
            alternate_greetings: ['![Happy](embeded://assets/emotion/images/happy.png)'],
            assets: [asset('emotion', 'happy', 'assets/emotion/images/happy.png')],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.alternate_greetings[0]).toBe('{{emotion::happy}}');
        expect(result.mirrors).toEqual([]);
        expect(result.card.data.assets).toHaveLength(1);
    });

    test('deduplicates mirrors across greetings and lorebook entries', () => {
        const uri = 'embeded://assets/other/images/nora-chibi.png';
        const card = sampleCard({
            first_mes: `![Chibi](${uri})`,
            alternate_greetings: [`![Chibi](${uri})`],
            assets: [asset('other', 'nora-chibi', 'assets/other/images/nora-chibi.png')],
            character_book: sampleBook({
                entries: [sampleEntry({content: `![Chibi](${uri})`})],
            }),
        });

        const result = convertCardForRisuAI(card);

        expect(result.converted).toBe(3);
        expect(result.mirrors).toHaveLength(1);
        expect(result.card.data.character_book.entries[0].content).toBe('{{image::nora-chibi}}');
    });

    test('converts HTML media tags with their matching macro', () => {
        const card = sampleCard({
            description: [
                '<img src="embeded://assets/other/images/scene.png" alt="scene">',
                '<audio controls src="embeded://assets/x_voice/audio/line.mp3"></audio>',
                "<video src='embeded://assets/x_video/video/clip.mp4'></video>",
            ].join('\n'),
            assets: [
                asset('other', 'scene', 'assets/other/images/scene.png'),
                asset('x_voice', 'line', 'assets/x_voice/audio/line.mp3'),
                asset('x_video', 'clip', 'assets/x_video/video/clip.mp4'),
            ],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.description).toBe([
            '{{image::scene}}',
            '{{audio::line}}',
            '{{video::clip}}',
        ].join('\n'));
        expect(result.mirrors.map((mirror) => mirror.ext)).toEqual(['png', 'mp3', 'mp4']);
    });

    test('keeps macro names unique when file stems collide', () => {
        const card = sampleCard({
            first_mes: [
                '![One](embeded://assets/background/images/scene.png)',
                '![Two](embeded://assets/other/images/scene.png)',
            ].join('\n'),
            assets: [
                asset('background', 'main', 'assets/background/images/scene.png'),
                asset('other', 'scene', 'assets/other/images/scene.png'),
            ],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.first_mes).toBe('{{image::scene}}\n{{image::scene-2}}');
        expect(result.mirrors.map((mirror) => mirror.name)).toEqual(['scene', 'scene-2']);
    });

    test('accepts titles and angle-bracket destinations', () => {
        const uri = 'embeded://assets/other/images/cover.png';
        const card = sampleCard({
            first_mes: `![Cover](<${uri}> "Cover art") and ![Cover](${uri} "Again")`,
            assets: [asset('other', 'cover', 'assets/other/images/cover.png')],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.first_mes).toBe('{{image::cover}} and {{image::cover}}');
        expect(result.mirrors).toHaveLength(1);
    });

    test('reuses an existing x-risu-asset alias instead of duplicating it', () => {
        const uri = 'embeded://assets/other/images/scene.png';
        const card = sampleCard({
            first_mes: `![Scene](${uri})`,
            assets: [
                asset('other', 'scene', 'assets/other/images/scene.png'),
                {type: 'x-risu-asset', name: 'scene-alias', ext: 'png', uri},
            ],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.first_mes).toBe('{{image::scene-alias}}');
        expect(result.mirrors).toEqual([]);
        expect(result.card.data.assets).toHaveLength(2);
    });

    test('follows renamed asset URIs through the alias map', () => {
        const card = sampleCard({
            first_mes: '![Desk](embeded://assets/background/images/desk-after-hours.png)',
            assets: [asset('background', 'main', 'assets/background/images/main.png')],
        });
        const aliases = new Map([[
            'embeded://assets/background/images/desk-after-hours.png',
            'embeded://assets/background/images/main.png',
        ]]);

        const result = convertCardForRisuAI(card, {aliases});

        expect(result.card.data.first_mes).toBe('{{image::main}}');
        expect(result.mirrors).toEqual([{
            type: 'x-risu-asset',
            name: 'main',
            ext: 'png',
            uri: 'embeded://assets/background/images/main.png',
        }]);
        expect(result.warnings).toEqual([]);
    });

    test('leaves unresolved references untouched and reports them', () => {
        const card = sampleCard({
            first_mes: '![Missing](embeded://assets/other/images/missing.png)',
            assets: [asset('other', 'present', 'assets/other/images/present.png')],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.first_mes).toBe('![Missing](embeded://assets/other/images/missing.png)');
        expect(result.converted).toBe(0);
        expect(result.mirrors).toEqual([]);
        expect(result.warnings.map((warning) => warning.code)).toEqual(['RISU_REFERENCE_MISSING']);
    });

    test('reports media RisuAI cannot display', () => {
        const card = sampleCard({
            first_mes: '![Doc](embeded://assets/other/other/readme.pdf)',
            assets: [{
                type: 'other',
                name: 'readme',
                ext: 'pdf',
                uri: 'embeded://assets/other/other/readme.pdf',
            }],
        });

        const result = convertCardForRisuAI(card);

        expect(result.card.data.first_mes).toBe('![Doc](embeded://assets/other/other/readme.pdf)');
        expect(result.warnings.map((warning) => warning.code)).toEqual(['RISU_REFERENCE_UNSUPPORTED']);
    });

    test('does nothing when the card has no assets', () => {
        const card = sampleCard({first_mes: '![X](embeded://assets/other/images/x.png)'});
        const result = convertCardForRisuAI(card);

        expect(result.card).toEqual(card);
        expect(result.converted).toBe(0);
        expect(result.mirrors).toEqual([]);
    });
});
