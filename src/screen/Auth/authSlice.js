import {createSlice} from '@reduxjs/toolkit';
const KEY = 'auth';

const authSlice = createSlice({
    name: KEY,
    initialState:{
        isLoading: false
    },
    reducers:{
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        }
    },
});
const { reducer, actions } = authSlice;
export const { setLoading } = actions;

export default reducer;