import { configureStore } from "@reduxjs/toolkit";
import global from "./globalSlice";
import account from "screen/Account/accountSlice";

const rootReducer = {
  global,
  account,
};

const store = configureStore({
  reducer: rootReducer,
});

export default store;
