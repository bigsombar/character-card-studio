import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

import { TextDecoder, TextEncoder } from 'node:util';

// jsdom omits a few browser globals that the card and PNG modules expect.
globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;
