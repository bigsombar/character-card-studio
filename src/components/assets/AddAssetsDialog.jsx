import { useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';

import {
    ACCEPTED_FILE_EXTENSIONS,
    MAX_TOTAL_ASSET_BYTES,
    defaultTypeForMedia,
    typeOptionsForMedia,
    validateAssetFile,
} from '../../assets/media';
import { useAssets } from '../../context/AssetContext';
import { useCard } from '../../context/cardContext';
import { formatBytesShort } from '../../utils/blob';

let draftCounter = 0;

export default function AddAssetsDialog({open, onClose}) {
    const { cardData } = useCard();
    const { addFiles } = useAssets();
    const inputRef = useRef(null);
    const [drafts, setDrafts] = useState([]);
    const [error, setError] = useState(null);
    const [adding, setAdding] = useState(false);

    const hasIcon = (cardData.data.assets ?? []).some((asset) => asset.type === 'icon' && asset.name === 'main');
    const accept = ACCEPTED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',');

    const totalSize = useMemo(() => drafts.reduce((sum, draft) => sum + (draft.file?.size ?? 0), 0), [drafts]);

    const handleFiles = (fileList) => {
        const files = Array.from(fileList ?? []);
        if (!files.length) return;
        setError(null);

        setDrafts((previous) => {
            let iconAlreadyExists = hasIcon || previous.some((draft) => draft.type === 'icon' && draft.main);
            const next = [...previous];

            for (const file of files) {
                const validation = validateAssetFile(file);
                const type = defaultTypeForMedia(validation.mediaKind, iconAlreadyExists);
                const main = validation.mediaKind === 'image' && type === 'icon' && !iconAlreadyExists;
                if (type === 'icon' && main) iconAlreadyExists = true;

                next.push({
                    id: `${Date.now()}-${draftCounter++}`,
                    file,
                    validation,
                    type,
                    name: file.name.replace(/\.[^.]+$/, '') || 'asset',
                    main,
                });
            }

            return next;
        });
    };

    const updateDraft = (id, updates) => {
        setDrafts((previous) => previous.map((draft) => (
            draft.id === id ? {...draft, ...updates} : draft
        )));
    };

    const removeDraft = (id) => {
        setDrafts((previous) => previous.filter((draft) => draft.id !== id));
    };

    const handleClose = () => {
        if (adding) return;
        setDrafts([]);
        setError(null);
        onClose();
    };

    const handleAdd = async () => {
        const validDrafts = drafts.filter((draft) => draft.validation.ok);
        if (!validDrafts.length) {
            setError('Add at least one valid file.');
            return;
        }
        if (totalSize > MAX_TOTAL_ASSET_BYTES) {
            setError(`This batch is too large. The total asset budget is ${Math.round(MAX_TOTAL_ASSET_BYTES / 1024 / 1024)} MB.`);
            return;
        }

        setAdding(true);
        setError(null);
        try {
            await addFiles(
                validDrafts.map((draft) => draft.file),
                validDrafts.map((draft) => ({type: draft.type, name: draft.name, main: draft.main})),
            );
            setDrafts([]);
            onClose();
        } catch (addError) {
            setError(addError.message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <Dialog fullWidth maxWidth="md" onClose={handleClose} open={open} aria-labelledby="add-assets-title">
            <DialogTitle id="add-assets-title">Add assets</DialogTitle>
            <DialogContent dividers>
                <Box
                    aria-label="Choose asset files"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                        event.preventDefault();
                        handleFiles(event.dataTransfer.files);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            inputRef.current?.click();
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    sx={{
                        alignItems: 'center',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        justifyContent: 'center',
                        minHeight: 150,
                        p: 3,
                        textAlign: 'center',
                        '&:hover': {borderColor: 'primary.main', bgcolor: 'action.hover'},
                    }}
                >
                    <UploadFileOutlined sx={{color: 'primary.main', fontSize: 34}} />
                    <Typography sx={{fontWeight: 600}}>Drop files here or click to choose</Typography>
                    <Typography color="text.secondary" variant="body2">
                        Images: {ACCEPTED_FILE_EXTENSIONS.filter((ext) => ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'].includes(ext)).map((ext) => `.${ext}`).join(', ')}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                        Audio: .mp3, .wav, .ogg · Video: .mp4, .webm
                    </Typography>
                    <input
                        ref={inputRef}
                        accept={accept}
                        hidden
                        multiple
                        onChange={(event) => {
                            handleFiles(event.target.files);
                            event.target.value = null;
                        }}
                        type="file"
                    />
                </Box>

                {error && <Alert severity="error" sx={{mt: 2}}>{error}</Alert>}

                {drafts.length > 0 && (
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2}}>
                        <Typography color="text.secondary" variant="body2">
                            {drafts.length} file{drafts.length === 1 ? '' : 's'} · {formatBytesShort(totalSize)}
                        </Typography>
                        {drafts.map((draft) => (
                            <Box
                                key={draft.id}
                                sx={{
                                    alignItems: 'center',
                                    border: 1,
                                    borderColor: draft.validation.ok ? 'divider' : 'error.main',
                                    borderRadius: 2,
                                    display: 'grid',
                                    gap: 1,
                                    gridTemplateColumns: {xs: '1fr', sm: 'minmax(0, 1fr) 170px 160px auto'},
                                    p: 1.5,
                                }}
                            >
                                <Box sx={{minWidth: 0}}>
                                    <Typography noWrap sx={{fontWeight: 600}} variant="body2">{draft.file.name}</Typography>
                                    <Typography color="text.secondary" sx={{fontSize: '0.7rem'}}>
                                        {draft.validation.mediaKind} · {formatBytesShort(draft.file.size)} · .{draft.validation.ext || '?'}
                                    </Typography>
                                    {!draft.validation.ok && (
                                        <Typography color="error.main" sx={{fontSize: '0.72rem', mt: 0.5}}>
                                            {draft.validation.errors.join(' ')}
                                        </Typography>
                                    )}
                                    {draft.validation.warnings.map((warning) => (
                                        <Typography color="warning.main" key={warning} sx={{fontSize: '0.72rem', mt: 0.5}}>
                                            {warning}
                                        </Typography>
                                    ))}
                                </Box>

                                <TextField
                                    label="Name"
                                    onChange={(event) => updateDraft(draft.id, {name: event.target.value})}
                                    size="small"
                                    value={draft.name}
                                />

                                <TextField
                                    label="Type"
                                    onChange={(event) => {
                                        const type = event.target.value;
                                        updateDraft(draft.id, {
                                            type,
                                            main: type === 'icon' || type === 'background' ? draft.main : false,
                                        });
                                    }}
                                    select
                                    size="small"
                                    value={draft.type}
                                >
                                    {typeOptionsForMedia(draft.validation.mediaKind).map((type) => (
                                        <MenuItem key={type} value={type}>{type}</MenuItem>
                                    ))}
                                </TextField>

                                <Box sx={{alignItems: 'center', display: 'flex', gap: 0.5}}>
                                    {(draft.type === 'icon' || draft.type === 'background') && (
                                        <Tooltip title="Set as main">
                                            <FormControlLabel
                                                control={(
                                                    <Checkbox
                                                        checked={draft.main}
                                                        onChange={(event) => updateDraft(draft.id, {main: event.target.checked})}
                                                        size="small"
                                                    />
                                                )}
                                                label="main"
                                                sx={{mr: 0}}
                                            />
                                        </Tooltip>
                                    )}
                                    <IconButton aria-label="Remove file" color="error" onClick={() => removeDraft(draft.id)} size="small">
                                        <DeleteOutlineOutlined fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button disabled={adding} onClick={handleClose} variant="outlined">Cancel</Button>
                <Button
                    disabled={adding || drafts.length === 0}
                    onClick={handleAdd}
                    startIcon={<Add />}
                    variant="contained"
                >
                    {adding ? 'Adding…' : 'Add assets'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
