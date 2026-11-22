import { Alert } from '@mui/material';

import GreetingListEditor from '../components/greetings/GreetingListEditor';

/** Greetings used exclusively when the card participates in a group chat. */
export default function GroupsSection() {
    return (
        <>
            <Alert severity="info" sx={{ mb: 2 }}>
                Group-only greetings never appear in one-on-one chats. Some frontends ignore them entirely.
            </Alert>
            <GreetingListEditor kind="group" />
        </>
    );
}
