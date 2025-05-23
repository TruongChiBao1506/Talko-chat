import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Store from './redux/Store';
import { Provider } from 'react-redux';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={Store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Audio call debugging helpers
window.debugAudioCall = {
    // Log the current socket info and connections
    logSocketInfo: () => {
        const state = Store.getState();
        const socket = state.chat.socket;
        const user = state.global.user;
        
        console.log('==== AUDIO CALL DEBUG ====');
        console.log('Current user:', user ? {
            id: user._id,
            name: user.name
        } : 'Not logged in');
        
        console.log('Socket connected:', socket ? 'Yes' : 'No');
        if (socket) {
            console.log('Socket ID:', socket.id);
            console.log('Socket connected state:', socket.connected);
            
            // Request room info from server
            socket.emit('debug-rooms');
        }
        
        return 'Debug info logged to console';
    },
    
    // Manually emit an accept call event
    emitAcceptCall: (targetUserId, conversationId) => {
        const state = Store.getState();
        const socket = state.chat.socket;
        const user = state.global.user;
        
        if (!socket || !user) {
            console.error('Socket or user not available');
            return 'Socket or user not available';
        }
        
        if (!targetUserId) {
            console.error('Target user ID is required');
            return 'Target user ID is required';
        }
        
        console.log(`Manually accepting call from ${targetUserId}`);
        socket.emit('audio-call-accepted', {
            from: user._id,
            to: targetUserId,
            conversationId: conversationId || 'unknown'
        });
        
        return `Manually accepted call from ${targetUserId}`;
    }
};
