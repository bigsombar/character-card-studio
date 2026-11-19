// jsdom doesn't implement IndexedDB; fake-indexeddb provides it for storage tests.
import 'fake-indexeddb/auto';

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement these, but the PNG chunk utilities rely on them and browsers provide them natively.
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
