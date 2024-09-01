import { useRef, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const Message = ({duration= 2000, type= 'success', content= '', onClose}) => {
    const [open, setOpen] = useState(true);

    const handleClose = (event, reason) => {
        setOpen(false);
        onClose();
    };

    return (
        <Snackbar open={open} autoHideDuration={duration}
            sx={{
                marginTop: "50px"
            }}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            onClose={handleClose}>
            <Alert severity={type} variant="standard">
                {content}
            </Alert>
        </Snackbar>
    )
}

export default Message;