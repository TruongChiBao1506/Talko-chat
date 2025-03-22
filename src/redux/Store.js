import { configureStore } from '@reduxjs/toolkit';
import auth from '../screen/Auth/authSlice';
import home from '../screen/Home/homeSlice';
import global from '../redux/globalSlice';
import chat from '../screen/Chat/slices/chatSlice';
import friend from '../screen/Friend/friendSlice';
const rootReducer = {
    auth,
    home,
    global,
    chat,
    friend
}
const Store = configureStore({
    reducer: rootReducer
});

export default Store;