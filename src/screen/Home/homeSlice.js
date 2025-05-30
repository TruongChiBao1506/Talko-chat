import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const KEY = "home";
// Giả lập API với delay 0.5 giây
export const fakeApiCall = createAsyncThunk("data/fetchFake", async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: "Dữ liệu tải thành công!" });
      }, 500); // Giả lập API mất 0.5 giây
    });
  });
const homeSlice = createSlice({
    name: KEY,
    initialState:{
        isLoading: false,
    },
    reducers:{},
    extraReducers: (builder) =>{
        builder.addCase(fakeApiCall.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fakeApiCall.fulfilled, (state, action) => {
            state.isLoading = false;
        });
        builder.addCase(fakeApiCall.rejected, (state) => {
            state.isLoading = false;
        });
    }
})
export default homeSlice.reducer;