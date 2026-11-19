import { Box, Skeleton, Typography } from '@mui/material';
import AudiotrackOutlined from '@mui/icons-material/AudiotrackOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';

import useAssetUrl from '../../hooks/useAssetUrl';
import { mediaKindForAsset, MEDIA_KIND } from '../../assets/media';
import AudioPlayer from './AudioPlayer';

function Placeholder({kind, message}) {
    const Icon = kind === MEDIA_KIND.audio ? AudiotrackOutlined
        : kind === MEDIA_KIND.video ? VideocamOutlined
            : ImageOutlined;

    return (
        <Box sx={{
            alignItems: 'center',
            bgcolor: 'background.default',
            color: 'text.secondary',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            height: '100%',
            justifyContent: 'center',
            minHeight: 80,
            p: 1,
            textAlign: 'center',
        }}>
            <Icon sx={{fontSize: 30}} />
            {message && <Typography sx={{fontSize: '0.65rem'}}>{message}</Typography>}
        </Box>
    );
}

/**
 * Renders an asset in the grid (variant="card") or in the details dialog (variant="detail").
 * Remote/data/embedded URIs all go through useAssetUrl so object URLs are revoked on cleanup.
 */
export default function MediaPreview({asset, variant = 'card', onOpen}) {
    const kind = mediaKindForAsset(asset);
    const isCard = variant === 'card';
    const {url, loading, error} = useAssetUrl(asset?.uri, {
        thumb: isCard && kind !== MEDIA_KIND.audio,
        fallbackToFull: isCard && kind === MEDIA_KIND.image,
    });

    if (!asset) return <Placeholder kind={MEDIA_KIND.other} message="No asset" />;
    if (loading) return <Skeleton height={isCard ? 160 : 260} variant="rectangular" />;
    if (error || !url) return <Placeholder kind={kind} message={error || 'Preview unavailable'} />;

    if (kind === MEDIA_KIND.audio) {
        return (
            <Box
                onClick={(event) => event.stopPropagation()}
                sx={{bgcolor: 'background.default', borderRadius: 1, minHeight: 80, p: 1}}
            >
                <AudioPlayer compact={isCard} src={url} title={asset.name} />
            </Box>
        );
    }

    if (kind === MEDIA_KIND.video) {
        if (isCard) {
            return (
                <Box
                    onClick={onOpen}
                    sx={{cursor: onOpen ? 'pointer' : 'default', height: '100%', minHeight: 120, position: 'relative'}}
                >
                    <Box
                        alt={asset.name}
                        component="img"
                        src={url}
                        sx={{display: 'block', height: '100%', objectFit: 'cover', width: '100%'}}
                    />
                    <Box sx={{
                        alignItems: 'center',
                        bgcolor: 'rgba(0, 0, 0, 0.45)',
                        borderRadius: '50%',
                        display: 'flex',
                        height: 38,
                        justifyContent: 'center',
                        left: '50%',
                        position: 'absolute',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 38,
                    }}>
                        <PlayArrow sx={{color: 'primary.main'}} />
                    </Box>
                </Box>
            );
        }

        return (
            <Box
                autoPlay={false}
                component="video"
                controls
                playsInline
                preload="metadata"
                src={url}
                sx={{bgcolor: 'black', borderRadius: 1, display: 'block', maxHeight: '60vh', width: '100%'}}
            />
        );
    }

    return (
        <Box
            alt={asset.name}
            component="img"
            onClick={onOpen}
            src={url}
            sx={{
                bgcolor: 'background.default',
                cursor: onOpen ? 'zoom-in' : 'default',
                display: 'block',
                height: isCard ? '100%' : 'auto',
                maxHeight: isCard ? undefined : '60vh',
                objectFit: isCard ? 'cover' : 'contain',
                width: '100%',
            }}
        />
    );
}
