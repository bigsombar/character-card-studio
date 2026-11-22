import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import App from './App';
import AssetCard from './components/assets/AssetCard';
import { resetEditorDb } from './storage/db';

// jsdom cannot compute rendered colors, so the contrast rule is covered by Lighthouse instead.
const axeOptions = {
    rules: {
        'color-contrast': { enabled: false },
    },
};

async function expectNoViolations() {
    const results = await axe.run(document.body, axeOptions);
    const summary = results.violations.map((violation) => ({
        id: violation.id,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
    expect(summary).toEqual([]);
}

afterEach(cleanup);

beforeEach(async () => {
    localStorage.clear();
    await resetEditorDb();
});

describe('accessibility smoke tests', () => {
    test('character editor has no axe violations', async () => {
        render(<App />);
        await screen.findAllByRole('button', { name: /help:/i });
        await expectNoViolations();
    }, 15_000);

    test('export dialog has no axe violations', async () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /^export$/i }));
        await screen.findByRole('dialog');
        await expectNoViolations();
    }, 15_000);

    test('asset card has no axe violations', async () => {
        render(
            <main>
                <AssetCard
                    asset={{ type: 'icon', uri: 'ccdefault:', name: 'main', ext: 'png' }}
                    onDelete={() => {}}
                    onOpen={() => {}}
                    onSetMain={() => {}}
                />
            </main>,
        );
        await expectNoViolations();
    }, 15_000);
});
