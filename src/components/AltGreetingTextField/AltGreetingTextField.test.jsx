import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CardContext } from '../../context/cardContext';
import AltGreetingTextField, { GroupGreetingTextField } from './AltGreetingTextField';

function renderInCard(data, field) {
    const changeCallback = vi.fn();
    render(
        <CardContext.Provider value={{ cardData: { data }, setCardData: vi.fn() }}>
            {field(changeCallback)}
        </CardContext.Provider>,
    );
    return { changeCallback };
}

describe('AltGreetingTextField', () => {
    test('shows the greeting at the requested index', () => {
        renderInCard(
            { alternate_greetings: ['First', 'Second', 'Third'] },
            (changeCallback) => (
                <AltGreetingTextField
                    changeCallback={changeCallback}
                    fieldName="altGreeting1"
                    greetingIndex={1}
                    label="Alternate greeting #2"
                />
            ),
        );

        const field = screen.getByLabelText('Alternate greeting #2');
        expect(field.value).toBe('Second');
        expect(field).toHaveAttribute('name', 'altGreeting1');
    });

    test('renders an empty field when the greeting list is missing', () => {
        renderInCard({}, (changeCallback) => (
            <AltGreetingTextField changeCallback={changeCallback} fieldName="altGreeting0" label="Alternate" />
        ));

        expect(screen.getByLabelText('Alternate').value).toBe('');
    });

    test('group greetings use the group-only list', () => {
        renderInCard(
            { group_only_greetings: ['Group hello', 'Group bye'] },
            (changeCallback) => (
                <GroupGreetingTextField
                    changeCallback={changeCallback}
                    fieldName="groupGreeting1"
                    greetingIndex={1}
                    label="Group-only greeting #2"
                />
            ),
        );

        expect(screen.getByLabelText('Group-only greeting #2').value).toBe('Group bye');
    });
});
