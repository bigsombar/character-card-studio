import { useEffect, useState } from 'react';

import AppProviders from './app/AppProviders';
import AppShell from './components/layout/AppShell';
import CardWorkspace from './components/workspace/CardWorkspace';

const SECTION_COUNT = 9;

function useSectionShortcuts(setSection) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

            const match = /^Digit([1-9])$/.exec(event.code);
            if (!match) return;

            const index = Number.parseInt(match[1], 10) - 1;
            if (index >= SECTION_COUNT) return;

            event.preventDefault();
            setSection(index);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setSection]);
}

function App() {
    const [sectionIndex, setSectionIndex] = useState(0);
    useSectionShortcuts(setSectionIndex);

    return (
        <AppProviders>
            <AppShell activeSection={sectionIndex} onSectionChange={setSectionIndex}>
                <CardWorkspace activeSection={sectionIndex} />
            </AppShell>
        </AppProviders>
    );
}

export default App;
