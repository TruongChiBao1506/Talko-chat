import { configureStore } from '@reduxjs/toolkit';
import auth from '../screen/Auth/authSlice';
import home from '../screen/Home/homeSlice';
import global from '../redux/globalSlice';
const rootReducer = {
    auth,
    home,
    global
}
const Store = configureStore({
    reducer: rootReducer
});

export default Store;