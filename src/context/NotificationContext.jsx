import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import NoticeDialog from '../components/dialogs/NoticeDialog';

const NotificationContext = createContext(null);

/**
 * Single notification host for imports, exports, assets and validation results.
 * Replaces per-component notice dialogs so feedback looks and behaves the same everywhere.
 */
export function NotificationProvider({ children }) {
    const [notice, setNotice] = useState(null);

    const notify = useCallback((nextNotice) => {
        setNotice(typeof nextNotice === 'string' ? { message: nextNotice } : nextNotice);
    }, []);

    const dismiss = useCallback(() => setNotice(null), []);

    const value = useMemo(() => ({ notify, dismiss, notice }), [notify, dismiss, notice]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <NoticeDialog notice={notice} onClose={dismiss} open={Boolean(notice)} />
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used inside NotificationProvider.');
    return context;
}
