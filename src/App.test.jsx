import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import App from './App';
import { resetEditorDb } from './storage/db';
import { buildCardPng } from './png/cardPngIO';
import { createBlankPng } from './test/pngFixtures';

vi.mock('./assets/thumbnails', () => ({
  createThumbnail: vi.fn().mockResolvedValue(null),
}));

afterEach(cleanup);

beforeEach(async () => {
  localStorage.clear();
  await resetEditorDb();
});

describe('App shell', () => {
  test('renders navigation, the active section and field help', async () => {
    render(<App />);
    expect(screen.getByRole('navigation', { name: /editor sections/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /character: name, description/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Character' })).toBeInTheDocument();
    expect((await screen.findAllByRole('button', { name: /help:/i })).length).toBeGreaterThan(0);
  });

  test('switches sections from the side rail', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /greetings: alternate/i }));
    expect(screen.getByRole('heading', { name: 'Greetings' })).toBeInTheDocument();
    expect(await screen.findByText('Alternate greetings')).toBeInTheDocument();
  });

  test('opens the consolidated export dialog', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^export$/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Export card' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /CHARX/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/card is ready to export/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export charx/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('radio', { name: /V3 PNG/i }));
    expect(screen.getByText(/PNG keeps only the portrait and ccv3 data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export v3 png/i })).toBeEnabled();
  });

  test('exposes multilingual creator notes and read-only dates', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /creator:/i }));

    expect(await screen.findByText(/no translations yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add language/i }));
    expect(await screen.findByLabelText(/language code for en/i)).toHaveValue('en');

    expect(screen.getByText('Creation date')).toBeInTheDocument();
    expect(screen.getByText('Modification date')).toBeInTheDocument();
  });

  test('hides the portrait column and file strip on Lorebook and Assets, then restores them', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Upload portrait' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show portrait' })).toBeInTheDocument();
    expect(screen.getByText('Select File')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /lorebook:/i }));
    await screen.findByRole('heading', { name: 'Lorebook' });
    expect(screen.queryByRole('button', { name: 'Upload portrait' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Show portrait' })).not.toBeInTheDocument();
    expect(screen.queryByText('Select File')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /assets:/i }));
    await screen.findByRole('heading', { name: 'Assets' });
    expect(screen.queryByRole('button', { name: 'Upload portrait' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Show portrait' })).not.toBeInTheDocument();
    expect(screen.queryByText('Select File')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /character: name/i }));
    expect(await screen.findByRole('button', { name: 'Upload portrait' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show portrait' })).toBeInTheDocument();
    expect(screen.getByText('Select File')).toBeInTheDocument();
  });

  test('applies raw JSON only after the overwrite confirmation', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /advanced:/i }));

    const raw = await screen.findByLabelText('Raw card JSON');
    const edited = JSON.parse(raw.value);
    edited.data.name = 'Updated via JSON';
    fireEvent.change(raw, { target: { value: JSON.stringify(edited, null, 2) } });
    fireEvent.click(screen.getByRole('button', { name: /apply raw json/i }));

    expect(await screen.findByText('Overwrite the current card?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Raw card JSON').value).toContain('Updated via JSON');
    });
  });

  test('imports a V2 JSON through the file input and warns about upcasting', async () => {
    const { container } = render(<App />);
    const v2 = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'V2 Imported Character',
        description: 'Imported from V2.',
        personality: '',
        scenario: '',
        first_mes: 'Hello.',
        mes_example: '',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        tags: [],
        alternate_greetings: [],
      },
    };
    const file = new File([JSON.stringify(v2)], 'v2-card.json', { type: 'application/json' });

    await userEvent.upload(container.querySelector('#file-upload'), file);

    expect(await screen.findByText(/card imported with warnings/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Character Card V2/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    expect(await screen.findByRole('heading', { name: 'V2 Imported Character' })).toBeInTheDocument();
  });

  test('navigates with Alt+number shortcuts', async () => {
    render(<App />);
    fireEvent.keyDown(window, { altKey: true, code: 'Digit3' });
    expect(await screen.findByRole('heading', { name: 'Creator' })).toBeInTheDocument();
  });

  test('stores the PNG image as a main icon asset on PNG import', async () => {
    const card = {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'PNG Portrait',
        description: 'Imported from a PNG.',
        tags: [],
        extensions: {},
        assets: [{ type: 'icon', name: 'main', ext: 'png', uri: 'ccdefault:' }],
        alternate_greetings: [],
        group_only_greetings: [],
      },
    };
    const png = await buildCardPng(createBlankPng(), card);
    const file = new File([png], 'png-portrait.png', { type: 'image/png' });
    const { container } = render(<App />);

    await userEvent.upload(container.querySelector('#file-upload'), file);
    expect(await screen.findByRole('heading', { name: 'PNG Portrait' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /advanced:/i }));
    const raw = await screen.findByLabelText('Raw card JSON');
    expect(raw.value).toContain('"assets"');
    expect(raw.value).toContain('"name": "main"');
    expect(raw.value).toContain('"type": "icon"');
    expect(raw.value).not.toContain('ccdefault:');
  });
});
