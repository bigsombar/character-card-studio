import { describe, expect, test } from 'vitest';

import { availableProxiesFor, CORS_PROXIES, proxyDescription } from './corsProxies';

const TARGET = 'https://cdn.example.com/files/a b.png?x=1#fragment';

describe('CORS_PROXIES', () => {
    test('contains a broad, documented fallback list', () => {
        expect(CORS_PROXIES.map((proxy) => proxy.name)).toEqual([
            'cors.dev',
            'allOrigins',
            'CodeTabs',
            'cors.lol',
            'CORS Workers demo',
            'weserv.nl',
            'wsrv.nl',
            'DuckDuckGo image proxy',
            'Google focus proxy',
            'ThingProxy',
        ]);
        expect(CORS_PROXIES).toHaveLength(10);
        expect(proxyDescription()).toContain('cors.dev');
        expect(proxyDescription()).toContain('ThingProxy');
    });

    test('builds proxy URLs without leaking fragments', () => {
        const urls = Object.fromEntries(CORS_PROXIES.map((proxy) => [proxy.id, proxy.build(TARGET)]));
        const encoded = encodeURIComponent('https://cdn.example.com/files/a b.png?x=1');

        expect(urls['cors-dev']).toBe('https://proxy.cors.dev/https://cdn.example.com/files/a b.png?x=1');
        expect(urls['allorigins']).toBe(`https://api.allorigins.win/raw?url=${encoded}`);
        expect(urls['codetabs']).toBe(`https://api.codetabs.com/v1/proxy?quest=${encoded}`);
        expect(urls['cors-lol']).toBe(`https://api.cors.lol/?url=${encoded}`);
        expect(urls['cors-workers-dev']).toBe('https://test.cors.workers.dev/?https://cdn.example.com/files/a b.png?x=1');
        expect(urls['weserv']).toBe(`https://images.weserv.nl/?url=${encoded}`);
        expect(urls['wsrv']).toBe(`https://wsrv.nl/?url=${encoded}`);
        expect(urls['duckduckgo']).toBe(`https://external-content.duckduckgo.com/iu/?u=${encoded}`);
        expect(urls['google-focus']).toBe(
            `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?url=${encoded}&container=focus`,
        );
        expect(urls['thingproxy']).toBe('https://thingproxy.freeboard.io/fetch/https://cdn.example.com/files/a b.png?x=1');
        for (const url of Object.values(urls)) expect(url).not.toContain('fragment');
    });

    test('keeps image-only and animated-GIF-incompatible proxies out of generic downloads', () => {
        expect(availableProxiesFor('https://cdn.example.com/clip.mp4', 'video').map((proxy) => proxy.id))
            .toEqual(['cors-dev', 'allorigins', 'codetabs', 'cors-lol', 'cors-workers-dev', 'thingproxy']);
        expect(availableProxiesFor('https://cdn.example.com/anim.gif', 'image').map((proxy) => proxy.id))
            .toEqual(['cors-dev', 'allorigins', 'codetabs', 'cors-lol', 'cors-workers-dev', 'thingproxy']);
        expect(availableProxiesFor('https://cdn.example.com/still.png', 'image')).toHaveLength(10);
    });
});
