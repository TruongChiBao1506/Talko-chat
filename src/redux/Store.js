import { configureStore } from '@reduxjs/toolkit';
import auth from '../screen/auth/authSlice';
import home from '../screen/Home/homeSlice';
import global from '../redux/globalSlice';
import chat from '../screen/Chat/slices/chatSlice';
import friend from '../screen/Friend/friendSlice';
import media from '../screen/Chat/slices/mediaSlice';
const rootReducer = {
    auth,
    home,
    global,
    chat,
    friend,
    media
}
const Store = configureStore({
    reducer: rootReducer
});

export default Store;