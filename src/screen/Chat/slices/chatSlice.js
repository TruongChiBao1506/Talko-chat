import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import channelApi from '../../../apis/channelApi';
import ClassifyApi from '../../../apis/classifyApi';
import conversationApi from '../../../apis/conversationApi';
import friendApi from '../../../apis/friendApi';
import messageApi from '../../../apis/messageApi';

const KEY = 'chat';


// =====CLASSIFY-API=====
// Fetch danh sách phân loại
export const fetchListClassify = createAsyncThunk(
    `${KEY}/fetchListClassify`,
    async (params, thunkApi) => {
        const classifies = await ClassifyApi.getClassifies();
        return classifies;
    }
);
// Fetch danh sách màu
export const fetchListColor = createAsyncThunk(
    `${KEY}/fetchListColor`,
    async (params, thunkApi) => {
        const colors = await ClassifyApi.getColors();
        return colors;
    }
);


// =====CHANNEL-API=====
// Fetch danh sách kênh
export const fetchChannels = createAsyncThunk(
    `${KEY}/fetchChannels`,
    async (params, _) => {
        const { conversationId } = params;
        const data = await channelApi.fetchChannel(conversationId);
        return data;
    }
);
export const fetchMessageInChannel = createAsyncThunk(
    `${KEY}/fetchMessageInChannel`,
    async (params, _) => {
        const { channelId, page, size } = params;
        const data = await channelApi.getMessageInChannel(
            channelId,
            page,
            size
        );

        return {
            messages: data,
            channelId,
        };
    }
);
export const getLastViewChannel = createAsyncThunk(
    `${KEY}/getLastViewChannel`,
    async (params, _) => {
        const { channelId } = params;
        const lastViews = await channelApi.getLastViewChannel(channelId);

        return lastViews;
    }
);
export const fetchNextPageMessageOfChannel = createAsyncThunk(
    `${KEY}/fetchNextPageMessageOfChannel`,
    async (params, thunkApi) => {
        const { page, size, channelId } = params;

        const messages = await channelApi.getMessageInChannel(
            channelId,
            page,
            size
        );
        return messages;
    }
);
// =====FRIEND-API=====
// Fetch danh sách bạn bè
export const fetchListFriends = createAsyncThunk(
    `${KEY}/fetchListFriends`,
    async (params, thunkApi) => {
        const { name } = params;
        const friends = await friendApi.fetchFriends(name);
        return friends;
    }
);


// =====MESSAGE-API=====
export const fetchListMessages = createAsyncThunk(
    `${KEY}/fetchListMessages`,
    async (params, thunkApi) => {
        const { conversationId, page, size } = params;

        const messages = await messageApi.fetchListMessages(
            conversationId,
            page,
            size
        );

        return {
            messages,
            conversationId,
        };
    }
);

export const fetchNextPageMessage = createAsyncThunk(
    `${KEY}/fetchNextPageMessage`,
    async (params, thunkApi) => {
        const { conversationId, page, size } = params;

        const messages = await messageApi.fetchListMessages(
            conversationId,
            page,
            size
        );

        return {
            messages,
        };
    }
);



// =====CONVERSATION-API=====
// Create a group chat
export const createGroup = createAsyncThunk(
    `${KEY}/createGroup`,
    async (params, thunkApi) => {
        const { name, userIds } = params;
        const idNewGroup = await conversationApi.createGroup(name, userIds);
        return idNewGroup;
    }
);
export const fetchListConversations = createAsyncThunk(
    `${KEY}/fetchListConversations`,
    async (params, thunkApi) => {
        const { name, type } = params;
        const conversations = await conversationApi.fetchListConversations(
            name,
            type
        );

        return conversations;
    }
);
// Lấy thời điểm xem cuối cùng của các thành viên trong cuộc trò chuyện
export const getLastViewOfMembers = createAsyncThunk(
    `${KEY}/getLastViewOfMembers`,
    async (params, _) => {
        const { conversationId } = params;
        const lastViews = await conversationApi.getLastViewOfMembers(
            conversationId
        );
        return lastViews;
    }
);
export const fetchConversationById = createAsyncThunk(
    `${KEY}/fetchConversationById`,
    async (params, thunkApi) => {
        const { conversationId } = params;
        const conversation = await conversationApi.getConversationById(
            conversationId
        );

        return conversation;
    }
);
export const deleteConversation = createAsyncThunk(
    `${KEY}/deleteConversation/`,
    async (params, thunkApi) => {
        const { conversationId } = params;
        await conversationApi.deleteConversation(conversationId);
        return conversationId;
    }
);
// Lấy danh sách thành viên trong cuộc trò chuyện
export const getMembersConversation = createAsyncThunk(
    `${KEY}/getMembersConversation`,
    async (params, thunkApi) => {
        const { conversationId } = params;
        const members = await conversationApi.getMemberInConversation(
            conversationId
        );
        return members;
    }
);



const chatSlice = createSlice({
    name: KEY,
    initialState: {
        isLoading: false,
        conversations: [],
        currentConversation: '',
        currentChannel: '',
        friends: [],
        memberInConversation: [],
        type: false,
        classifies: [],
        colors: [],
        lastViewOfMember:[]

    },
    reducers: {
        setConversations: (state, action) => {
            const conversation = action.payload;
            state.conversations = [conversation, ...state.conversations];
        },
        setCurrentConversation: (state, action) => {
            state.currentConversation = action.payload;
        },
        setCurrentChannel: (state, action) => {
            state.currentChannel = action.payload;
        },
        setTypeOfConversation: (state, action) => {
            const conversationId = action.payload;
            const conversation = state.conversations.find(
                (ele) => ele._id === conversationId
            );
            if (conversation) {
                state.type = conversation.type;
            }
        },
        setToTalUnread: (state, action) => {
            let tempCount = 0;
            state.conversations.forEach((ele, index) => {
                if (ele.numberUnread > 0) tempCount += 1;
            });
            state.toTalUnread = tempCount;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchListConversations.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchListConversations.fulfilled, (state, action) => {
                state.isLoading = false;
                state.conversations = action.payload;
            })
            .addCase(fetchListConversations.rejected, (state) => {
                state.isLoading = false;
            })
            .addCase(fetchListMessages.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchListMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                
                const { conversationId, messages } = action.payload;
                const conversationIndex = state.conversations.findIndex(
                    (conversation) => conversation._id === conversationId
                );
    
                if (conversationIndex !== -1) {
                    state.conversations[conversationIndex] = {
                        ...state.conversations[conversationIndex],
                        numberUnread: 0,
                    };
                }
    
                state.currentConversation = conversationId;
                state.messages = messages.data;
                state.currentPage = messages.page;
                state.totalPages = messages.totalPages;
            })
            .addCase(fetchListMessages.rejected, (state) => {
                state.isLoading = false;
            })
            .addCase(fetchNextPageMessage.fulfilled, (state, action) => {
                const { messages } = action.payload;
    
                state.messages = [...messages.data, ...state.messages];
                state.currentPage = messages.page;
            })
            .addCase(fetchNextPageMessage.rejected, (state) => {
                state.isLoading = false;
            })
            .addCase(fetchNextPageMessage.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getLastViewOfMembers.fulfilled, (state, action) => {
                state.lastViewOfMember = action.payload;
            })
            // classify
            .addCase(fetchListClassify.fulfilled, (state, action) => {
                state.classifies = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchListClassify.rejected, (state, action) => {
                state.classifies = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchListClassify.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchListColor.fulfilled, (state, action) => {
                state.colors = action.payload;
            })
            .addCase(fetchListFriends.pending, (state, actions) => {
                state.isLoading = true;
            })
            .addCase(fetchListFriends.fulfilled, (state, action) => {
                state.friends = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchListFriends.rejected, (state, action) => {
                state.isLoading = false;
            })
            .addCase(fetchConversationById.fulfilled, (state, action) => {
                const conversations = action.payload;
                state.conversations = [conversations, ...state.conversations];
            })
            .addCase(getMembersConversation.fulfilled, (state, action) => {
                const tempMembers = [...action.payload];
                const temp = [];

                tempMembers.forEach((member) => {
                    state.friends.forEach((friend) => {
                        if (member._id === friend._id) {
                            member = { ...member, isFriend: true };
                        }
                    });
                    temp.push(member);
                });

                state.memberInConversation = temp;
            })

            .addCase(fetchChannels.fulfilled, (state, action) => {
                state.channels = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchChannels.rejected, (state) => {
                state.isLoading = false;
            })
            .addCase(fetchChannels.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMessageInChannel.fulfilled, (state, action) => {
                state.isLoading = false;

                // Lấy dữ liệu từ action.payload
                const { messages, channelId } = action.payload;
                const channelIndex = state.channels.findIndex(
                    (channel) => channel._id === channelId
                );

                if (channelIndex !== -1) {
                    state.channels[channelIndex] = {
                        ...state.channels[channelIndex],
                        numberUnread: 0,
                    };
                }

                state.currentChannel = channelId;
                state.messages = messages.data;
                state.currentPage = messages.page;
                state.totalPages = messages.totalPages;
            })
            .addCase(fetchMessageInChannel.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMessageInChannel.rejected, (state) => {
                state.isLoading = false;
            });




    }
});

const { reducer, actions } = chatSlice;
export const {
    setConversations,
    setCurrentConversation,
    setCurrentChannel,
    setTypeOfConversation,
    setToTalUnread
    
} = actions;

export default reducer;
