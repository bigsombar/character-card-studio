import { useCallback, useState } from 'react';

const CONSENT_COOKIE = 'ccs_proxy_consent';
const ENABLED_STORAGE_KEY = 'ccs_proxy_enabled';
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(name) {
    if (typeof document === 'undefined') return '';
    const prefix = `${name}=`;
    const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

function readEnabledFlag() {
    try {
        return typeof localStorage !== 'undefined' && localStorage.getItem(ENABLED_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeEnabledFlag(enabled) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? '1' : '0');
        }
    } catch {
        // Storage can be unavailable in private modes; the checkbox still works for this session.
    }
}

export function hasProxyConsent() {
    return readCookie(CONSENT_COOKIE) === '1';
}

export function grantProxyConsent() {
    if (typeof document === 'undefined') return;
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=1; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Controls the opt-in third-party proxy setting and the one-time risk acknowledgement. Consent is
 * stored in a cookie so the warning is not shown again every time the checkbox is toggled.
 */
export default function useProxyConsent() {
    const [enabled, setEnabled] = useState(() => hasProxyConsent() && readEnabledFlag());
    const [dialogOpen, setDialogOpen] = useState(false);

    const requestChange = useCallback((next) => {
        if (!next) {
            setEnabled(false);
            writeEnabledFlag(false);
            return;
        }
        if (hasProxyConsent()) {
            setEnabled(true);
            writeEnabledFlag(true);
        } else {
            setDialogOpen(true);
        }
    }, []);

    const confirm = useCallback(() => {
        grantProxyConsent();
        writeEnabledFlag(true);
        setEnabled(true);
        setDialogOpen(false);
    }, []);

    const cancel = useCallback(() => {
        setDialogOpen(false);
    }, []);

    return {enabled, dialogOpen, requestChange, confirm, cancel};
}
