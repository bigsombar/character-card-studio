import { extensionFromFilename } from './media';

const STATIC_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif']);

function isStaticImageUrl(url) {
    try {
        return STATIC_IMAGE_EXTENSIONS.has(extensionFromFilename(new URL(url).pathname));
    } catch {
        return false;
    }
}

/**
 * Opt-in fallbacks for hosts that do not send CORS headers. They are only used after a direct
 * download fails, and only when the user explicitly enabled third-party proxies.
 *
 * Generic proxies are useful for images, audio and video. Image-only services are skipped for
 * audio/video, and animated GIFs are kept away from re-encoding proxies so animation is not lost.
 */
export const CORS_PROXIES = [
    {
        id: 'cors-dev',
        name: 'cors.dev',
        note: '6 MiB per response',
        maxBytes: 6 * 1024 * 1024,
        preferred: true,
        build: (url) => `https://proxy.cors.dev/${url.split('#')[0]}`,
    },
    {
        id: 'allorigins',
        name: 'allOrigins',
        build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url.split('#')[0])}`,
    },
    {
        id: 'codetabs',
        name: 'CodeTabs',
        note: '5 MB per response',
        maxBytes: 5 * 1024 * 1024,
        build: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url.split('#')[0])}`,
    },
    {
        id: 'cors-lol',
        name: 'cors.lol',
        build: (url) => `https://api.cors.lol/?url=${encodeURIComponent(url.split('#')[0])}`,
    },
    {
        id: 'cors-workers-dev',
        name: 'CORS Workers demo',
        build: (url) => `https://test.cors.workers.dev/?${url.split('#')[0]}`,
    },
    {
        id: 'weserv',
        name: 'weserv.nl',
        note: 'static images only',
        imageOnly: true,
        preferred: true,
        supports: isStaticImageUrl,
        build: (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url.split('#')[0])}`,
    },
    {
        id: 'wsrv',
        name: 'wsrv.nl',
        note: 'static images only',
        imageOnly: true,
        preferred: true,
        supports: isStaticImageUrl,
        build: (url) => `https://wsrv.nl/?url=${encodeURIComponent(url.split('#')[0])}`,
    },
    {
        id: 'duckduckgo',
        name: 'DuckDuckGo image proxy',
        note: 'static images only',
        imageOnly: true,
        supports: isStaticImageUrl,
        build: (url) => `https://external-content.duckduckgo.com/iu/?u=${encodeURIComponent(url.split('#')[0])}`,
    },
    {
        id: 'google-focus',
        name: 'Google focus proxy',
        note: 'static images only',
        imageOnly: true,
        supports: isStaticImageUrl,
        build: (url) => `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?url=${encodeURIComponent(url.split('#')[0])}&container=focus`,
    },
    {
        id: 'thingproxy',
        name: 'ThingProxy',
        note: '100 KB per response',
        maxBytes: 100_000,
        build: (url) => `https://thingproxy.freeboard.io/fetch/${url.split('#')[0]}`,
    },
];

export function availableProxiesFor(url, kind) {
    return CORS_PROXIES.filter((proxy) => {
        if (proxy.imageOnly && kind !== 'image') return false;
        if (typeof proxy.supports === 'function' && !proxy.supports(url)) return false;
        return true;
    });
}

export function proxyDescription() {
    return CORS_PROXIES.map((proxy) => proxy.name).join(', ');
}
