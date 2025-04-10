import { configureStore } from "@reduxjs/toolkit";
import auth from "../screen/auth/authSlice";
import home from "../screen/Home/homeSlice";
import global from "../redux/globalSlice";
import chat from "../screen/Chat/slice/chatSlice";
import friend from "../screen/Friend/friendSlice";
import media from "../screen/Chat/slice/mediaSlice";
const rootReducer = {
  auth,
  home,
  global,
  chat,
  friend,
  media,
};
const Store = configureStore({
  reducer: rootReducer,
});

export default Store;
