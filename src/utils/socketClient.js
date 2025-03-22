import io from 'socket.io-client';
// require('dotenv').config();
export let socket;

export function init() {
    socket = io(process.env.REACT_APP_SOCKET_URL, {
        transports: ['websocket'],
    });
}