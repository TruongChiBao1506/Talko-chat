import { configureStore } from "@reduxjs/toolkit";
import global from "./globalSlice";

const rootReducer = {
  global,
};

const store = configureStore({
  reducer: rootReducer,
});

export default store;
