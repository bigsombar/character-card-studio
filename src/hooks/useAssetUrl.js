import { useEffect, useState } from 'react';

import { getAsset } from '../storage/assetStore';
import { useAssets } from '../context/AssetContext';

/**
 * Resolves data:/https:/ccdefault:/embeded:// asset URIs to a URL usable by <img>/<audio>/<video>.
 * Object URLs are created lazily and revoked on cleanup.
 */
export default function useAssetUrl(uri, {thumb = false, fallbackToFull = false} = {}) {
    const assets = useAssets();
    const version = assets?.assetVersion ?? 0;
    const [state, setState] = useState({url: null, record: null, loading: Boolean(uri), error: null});

    useEffect(() => {
        if (!uri) {
            setState({url: null, record: null, loading: false, error: null});
            return undefined;
        }

        if (uri === 'ccdefault:') {
            setState({url: null, record: null, loading: false, error: null});
            return undefined;
        }

        if (uri.startsWith('data:')) {
            if (!/^data:(image|audio|video)\//i.test(uri)) {
                setState({url: null, record: null, loading: false, error: 'Unsupported data URI type.'});
                return undefined;
            }
            setState({url: uri, record: null, loading: false, error: null});
            return undefined;
        }

        if (/^https:\/\//i.test(uri)) {
            setState({url: uri, record: null, loading: false, error: null});
            return undefined;
        }

        if (/^http:\/\//i.test(uri)) {
            // The spec allows applications to ignore insecure HTTP assets, and loading them would
            // downgrade the page. Keep the metadata, but never render it.
            setState({url: null, record: null, loading: false, error: 'Insecure HTTP asset URLs are not loaded.'});
            return undefined;
        }

        if (!uri.startsWith('embeded://')) {
            setState({url: null, record: null, loading: false, error: 'Unsupported asset URI scheme.'});
            return undefined;
        }

        let cancelled = false;
        let objectUrl = null;
        setState({url: null, record: null, loading: true, error: null});

        (async () => {
            try {
                const record = await getAsset(uri);
                if (!record) throw new Error('Asset data is missing from IndexedDB.');
                const blob = thumb
                    ? (record.thumb ?? (fallbackToFull ? record.blob : null))
                    : record.blob;
                if (!blob) throw new Error('Asset preview is not available.');
                objectUrl = URL.createObjectURL(blob);
                if (cancelled) {
                    URL.revokeObjectURL(objectUrl);
                    objectUrl = null;
                } else {
                    setState({url: objectUrl, record, loading: false, error: null});
                }
            } catch (error) {
                if (!cancelled) setState({url: null, record: null, loading: false, error: error.message});
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [uri, thumb, fallbackToFull, version]);

    return state;
}
