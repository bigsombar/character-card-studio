import { useEffect, useState } from 'react';

import { getAsset } from '../storage/assetStore';
import { useAssets } from '../context/AssetContext';

/** Returns the IndexedDB record (blob metadata) for a local asset URI. */
export default function useAssetRecord(uri) {
    const assets = useAssets();
    const version = assets?.assetVersion ?? 0;
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(Boolean(uri));

    useEffect(() => {
        let cancelled = false;
        if (!uri || uri.startsWith('data:') || /^https?:\/\//i.test(uri) || uri === 'ccdefault:') {
            setRecord(null);
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        (async () => {
            try {
                const next = await getAsset(uri);
                if (!cancelled) setRecord(next ?? null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [uri, version]);

    return {record, loading};
}
