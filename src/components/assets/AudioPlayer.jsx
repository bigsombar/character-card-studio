import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
import VolumeUp from '@mui/icons-material/VolumeUp';

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

/** Compact, keyboard-accessible audio player used in the asset grid and details dialog. */
export default function AudioPlayer({src, compact = false, title = 'Audio asset'}) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        const onLoaded = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        const onTime = () => setCurrentTime(audio.currentTime || 0);
        const onEnded = () => setPlaying(false);
        const onError = () => setError('This browser cannot play this audio format.');

        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
        };
    }, [src]);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        try {
            if (audio.paused) {
                await audio.play();
                setPlaying(true);
            } else {
                audio.pause();
                setPlaying(false);
            }
        } catch {
            setError('Playback was blocked. Press play again.');
        }
    };

    const handleSeek = (_event, value) => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(value)) return;
        audio.currentTime = value;
        setCurrentTime(value);
    };

    if (error) {
        return (
            <Box sx={{alignItems: 'center', color: 'error.main', display: 'flex', gap: 1, minHeight: 48, px: 1}}>
                <VolumeUp fontSize="small" />
                <Typography variant="caption">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{alignItems: 'center', display: 'flex', gap: 1, width: '100%'}}>
            <audio ref={audioRef} preload="metadata" src={src} />
            <Tooltip title={playing ? 'Pause' : `Play ${title}`}>
                <IconButton aria-label={playing ? 'Pause audio' : 'Play audio'} onClick={togglePlay} size="small">
                    {playing ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                </IconButton>
            </Tooltip>
            <Slider
                aria-label="Audio position"
                max={duration || 0}
                onChange={handleSeek}
                size="small"
                step={0.1}
                sx={{flex: 1, mx: 1}}
                value={Math.min(currentTime, duration || 0)}
            />
            <Typography sx={{color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.68rem', whiteSpace: 'nowrap'}}>
                {formatTime(currentTime)} / {formatTime(duration)}
            </Typography>
            {!compact && <VolumeUp sx={{color: 'text.secondary', fontSize: 17}} />}
        </Box>
    );
}
