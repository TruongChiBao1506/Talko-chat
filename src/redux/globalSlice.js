import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import meApi from "../apis/meApi";

const KEY = "global";

export const fetchUserProfile = createAsyncThunk(
  `${KEY}/fetchUser`,
  async (params, thunkApi) => {
    const user = await meApi.fetchProfile();
    return user;
  }
);

const globalSlice = createSlice({
  name: KEY,
  initialState: {
    isLoading: false,
    isLogin: false,
    user: null,
    isJoinChatLayout: false,
    isJoinFriendLayout: false,
    tabActive: 0,
    updatedImages: {},
  },

  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setLogin: (state, action) => {
      state.isLogin = action.payload;
    },
    setJoinChatLayout: (state, action) => {
      state.isJoinChatLayout = action.payload;
    },
    setJoinFriendLayout: (state, action) => {
      state.isJoinFriendLayout = action.payload;
    },
    setTabActive: (state, action) => {
      state.tabActive = action.payload;
    },
    setAvatarProfile: (state, action) => {
      state.user.avatar = action.payload;
    },
    updateImageMessage: (state, action) => {
      const { messageId, newImageUrl } = action.payload;
      state.updatedImages[messageId] = newImageUrl;
      console.log(
        `Image updated in redux store: messageId=${messageId}, newUrl=${newImageUrl}`
      );
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchUserProfile.pending, (state, action) => {
      console.log("pending");
      state.isLoading = false;
    });
    builder.addCase(fetchUserProfile.fulfilled, (state, action) => {
      console.log("fulfilled");
      state.isLoading = true;
      state.isLogin = true;
      state.user = action.payload;
    });
    builder.addCase(fetchUserProfile.rejected, (state, action) => {
      console.log("rejected");
      state.isLoading = true;
      state.isLogin = false;
      localStorage.removeItem("token");
    });
  },
});

const { reducer, actions } = globalSlice;
export const {
  setLoading,
  setLogin,
  setJoinChatLayout,
  setJoinFriendLayout,
  setTabActive,
  setAvatarProfile,
  updateImageMessage,
} = actions;
export default reducer;
