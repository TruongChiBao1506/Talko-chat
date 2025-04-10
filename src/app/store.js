import { configureStore } from "@reduxjs/toolkit";
import global from "./globalSlice";
import account from "screen/Account/accountSlice";
import chat from "screen/Chat/slice/chatSlice";
import friend from "screen/Friend/friendSlice";
// import admin from 'screen/Admin/adminSlice';
import media from "screen/Chat/slice/mediaSlice";
import home from "screen/Home/homeSlice";
// import callVideo from 'screen/CallVideo/callVideoSlice';

const rootReducer = {
  global,
  account,
  chat,
  friend,
  // admin,
  media,
  // callVideo,
  home,
};

const store = configureStore({
  reducer: rootReducer,
});

export default store;
