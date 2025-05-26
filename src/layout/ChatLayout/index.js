import { Col, Modal, Row, message } from 'antd';
import conversationApi from '../../apis/conversationApi';
import { setTabActive, setJoinFriendLayout } from '../../redux/globalSlice';
import NotFoundPage from '../../components/NotFoundPage/NotFoundPage';
import Chat from '../../screen/Chat';
import NavbarContainer from '../../screen/Chat/containers/NavbarContainer';
import notificationSound from '../../utils/notificationSound';
import ModalVideoCall from '../../modals/ModalVideoCall';
import ModalVoiceCall from '../../modals/ModalVoiceCall';
import {
    addMessage,
    addMessageInChannel,
    fetchAllSticker,
    fetchConversationById,
    fetchListClassify,
    fetchListColor,
    fetchListConversations,
    updateAvatarWhenUpdateMember,
    updateFriendChat,
} from '../../screen/Chat/slices/chatSlice';
import Friend from '../../screen/Friend';
import {
    fetchFriends,
    fetchListGroup,
    fetchListMyRequestFriend,
    fetchListRequestFriend,
    setAmountNotify,
    setMyRequestFriend,
    setNewFriend,
    setNewRequestFriend,
    updateFriend,
    updateMyRequestFriend,
    updateRequestFriends,
} from '../../screen/Friend/friendSlice';
import useWindowUnloadEffect from '../../hook/useWindowUnloadEffect';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socketClient';
import callRingtone from '../../utils/CallRingtone';
import './style.css'

function ChatLayout() {
    const location = useLocation();
    const url = location.pathname;
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { conversations, currentConversation } = useSelector((state) => state.chat);
    const { isJoinChatLayout, user } = useSelector((state) => state.global);
    const { amountNotify } = useSelector((state) => state.friend);
    const [idNewMessage, setIdNewMessage] = useState('');
    const [codeRevoke, setCodeRevoke] = useState('');
    const codeRevokeRef = useRef();

    const [videoCallVisible, setVideoCallVisible] = useState(false);
    const [voiceCallVisible, setVoiceCallVisible] = useState(false);
    const [callInfo, setCallInfo] = useState({
        _id: null,
        name: '',
        avatar: '',
    });
    const [callRejected, setCallRejected] = useState(false);
    const [rejectionMessage, setRejectionMessage] = useState('');


    const currentCallModalRef = useRef(null);

    const voiceCallRef = useRef(null);
    const videoCallRef = useRef(null);

    const callTimeoutRef = useRef(null);
    const CALL_TIMEOUT_DURATION = 10000;

    // ========== SOCKET CONNECTION SETUP ==========
    useEffect(() => {
        socket.on('connect', () => {
            console.log('Socket connected successfully with ID:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('disconnect');
        };
    }, []);

    // ========== REDUX DISPATCH SETUP ==========
    useEffect(() => {
        dispatch(fetchListRequestFriend());
        dispatch(fetchListMyRequestFriend());
        dispatch(fetchFriends({ name: '' }));
        dispatch(fetchListGroup({ name: '', type: 2 }));
        dispatch(fetchListClassify());
        dispatch(fetchListColor());
        dispatch(fetchListConversations({}));
        dispatch(fetchAllSticker());
        dispatch(setTabActive(1));
    }, []);

    // ========== USER JOIN SOCKET ==========
    useEffect(() => {
        const userId = user._id;
        if (userId) {
            console.log('📞 Registering user for calls:', userId);
            socket.emit('join', userId);

            handleResetNotificationCache(userId);
            notificationSound.setCurrentUser(userId);
        }
    }, [user]);

    // ========== JOIN CONVERSATIONS ==========
    useEffect(() => {
        if (conversations.length === 0) return;
        const conversationIds = conversations.map(conv => conv._id);
        socket.emit('join-conversations', conversationIds);
    }, [conversations]);

    // ========== MESSAGE HANDLING ==========
    useEffect(() => {
        const currentUserId = user?._id;

        socket.off('new-message');
        socket.on('new-message', (conversationId, newMessage) => {
            const senderId = newMessage.user._id;
            if (notificationSound.isRecentlySentMessage(newMessage._id)) {
                // Không phát âm thanh
            } else if (currentUserId && senderId && (senderId === currentUserId || String(senderId) === String(currentUserId))) {
                notificationSound.markMessageAsSent(newMessage._id);
            } else {
                playNotificationSound(newMessage._id, senderId);
            }
            dispatch(addMessage(newMessage));
            setIdNewMessage(newMessage._id);
        });

        socket.on('update-member', async (conversationId) => {
            const data = await conversationApi.getConversationById(conversationId);
            const { avatar, totalMembers } = data;
            dispatch(updateAvatarWhenUpdateMember({ conversationId, avatar, totalMembers }));
        });

        socket.on('new-message-of-channel', (conversationId, channelId, message) => {
            const currentUserId = user?._id;
            const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;

            if (notificationSound.isRecentlySentMessage(message._id)) {
                // Không phát âm thanh
            } else if (currentUserId && senderId && (senderId === currentUserId || String(senderId) === String(currentUserId))) {
                notificationSound.markMessageAsSent(message._id);
            } else {
                playNotificationSound(message._id, senderId);
            }

            dispatch(addMessageInChannel({ conversationId, channelId, message }));
            setIdNewMessage(message._id);
        });

        socket.off('create-conversation');
        socket.on('create-conversation', (conversationId) => {
            console.log('tạo nhóm', conversationId);
            dispatch(fetchConversationById({ conversationId }));
        });

        return () => {
            socket.off('new-message');
            socket.off('new-message-of-channel');
            socket.off('update-member');
            socket.off('create-conversation');
        };
    }, [user]);

    // ========== OTHER SOCKET EVENTS ==========
    useEffect(() => {
        socket.on('create-individual-conversation', (converId) => {
            socket.emit('join-conversation', converId);
            dispatch(fetchConversationById({ conversationId: converId }));
        });

        socket.on('create-individual-conversation-when-was-friend', (conversationId) => {
            dispatch(fetchConversationById({ conversationId }));
        });

        socket.on('accept-friend', (value) => {
            dispatch(setNewFriend(value));
            dispatch(setMyRequestFriend(value._id));
        });

        socket.on('send-friend-invite', (value) => {
            dispatch(setNewRequestFriend(value));
            dispatch(setAmountNotify(amountNotify + 1));
        });

        socket.on('deleted-friend-invite', (_id) => {
            dispatch(updateMyRequestFriend(_id));
        });

        socket.on('deleted-invite-was-send', (_id) => {
            dispatch(updateRequestFriends(_id));
        });

        socket.on('deleted-friend', (_id) => {
            dispatch(updateFriend(_id));
            dispatch(updateFriendChat(_id));
        });

        socket.on('revoke-token', ({ key }) => {
            if (codeRevokeRef.current !== key) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.reload();
            }
        });

        dispatch(setJoinFriendLayout(true));

        return () => {
            socket.off('create-individual-conversation');
            socket.off('create-individual-conversation-when-was-friend');
            socket.off('accept-friend');
            socket.off('send-friend-invite');
            socket.off('deleted-friend-invite');
            socket.off('deleted-invite-was-send');
            socket.off('deleted-friend');
            socket.off('revoke-token');
        };
    }, [user, navigate, amountNotify]);


    // Xử lý cuộc gọi đến
    useEffect(() => {
        if (!socket || !user) return;

        console.log('🛠️ Setting up call event listeners');

        // Sự kiện cuộc gọi thoại đến
        socket.on('incoming-voice-call', (data) => {
            console.log('🔊 Đã nhận sự kiện incoming-voice-call:', data);
            const { conversationId, caller } = data;

            // Tìm thông tin cuộc trò chuyện
            const conversation = conversations.find(conv => conv._id === conversationId);

            if (!conversation) {
                console.warn('❌ Không tìm thấy cuộc trò chuyện cho cuộc gọi đến:', conversationId);
                return;
            }

            console.log('📞 Hiển thị thông báo cuộc gọi thoại từ:', caller.name);

            callRingtone.play();
            // Hiển thị thông báo cuộc gọi đến
            const modal = Modal.confirm({
                title: 'Cuộc gọi thoại đến',
                content: `${caller.name || conversation.name} đang gọi thoại cho bạn`,
                okText: 'Trả lời',
                cancelText: 'Từ chối',
                onOk: () => {
                    callRingtone.stop();

                    clearCallTimeout();
                    setCallInfo({
                        _id: conversation._id,
                        name: conversation.name,
                        avatar: conversation.avatar,
                        type: conversation.type,
                        totalMembers: conversation.totalMembers,
                        members: conversation.members,
                        userId: conversation.userId
                    });
                    setVoiceCallVisible(true);
                    currentCallModalRef.current = null;
                },
                onCancel: () => {
                    callRingtone.stop();
                    // Gửi sự kiện từ chối cuộc gọi
                    socket.emit('reject-voice-call', {
                        conversationId,
                        rejectedBy: {
                            userId: user._id,
                            name: user.name || user.username
                        }
                    });
                    console.log('❌ Đã từ chối cuộc gọi thoại từ:', caller.name);
                    currentCallModalRef.current = null;
                }
            });
            // Lưu reference của modal hiện tại
            currentCallModalRef.current = modal;
        });

        // Sự kiện cuộc gọi video đến
        socket.on('new-user-call', (data) => {
            console.log('📹 Đã nhận sự kiện new-user-call:', data);
            const { conversationId, newUserId, userName } = data;

            // Tìm thông tin cuộc trò chuyện
            const conversation = conversations.find(conv => conv._id === conversationId);

            if (!conversation) {
                console.warn('❌ Không tìm thấy cuộc trò chuyện cho cuộc gọi đến:', conversationId);
                return;
            }

            console.log('📞 Hiển thị thông báo cuộc gọi video từ:', userName || newUserId);

            callRingtone.play();
            // Hiển thị thông báo cuộc gọi đến
            const modal = Modal.confirm({
                title: 'Cuộc gọi video đến',
                content: `${userName || conversation.name} đang gọi video cho bạn`,
                okText: 'Trả lời',
                cancelText: 'Từ chối',
                onOk: () => {
                    callRingtone.stop();

                    clearCallTimeout();

                    setCallInfo({
                        _id: conversation._id,
                        name: conversation.name,
                        avatar: conversation.avatar
                    });
                    setVideoCallVisible(true);
                    currentCallModalRef.current = null;
                },
                onCancel: () => {
                    callRingtone.stop();
                    // Gửi sự kiện từ chối cuộc gọi
                    socket.emit('reject-video-call', {
                        conversationId,
                        rejectedBy: {
                            userId: user._id,
                            name: user.name || user.username
                        }
                    });
                    console.log('❌ Đã từ chối cuộc gọi video từ:', userName);
                    currentCallModalRef.current = null;
                }
            });
            // Lưu reference của modal hiện tại
            currentCallModalRef.current = modal;
        });
        // Biến để tránh hiển thị nhiều lần
        let lastCancelledCallId = null;
        let lastCancelledTime = 0;
        // Xử lý khi người gọi hủy cuộc gọi thoại
        socket.on('voice-call-cancelled', (data) => {
            console.log('🚫 Cuộc gọi thoại đã bị hủy bởi người gọi:', data);
            const { callerInfo, conversationId, reason } = data;

            clearCallTimeout();

            // KIỂM TRA để tránh hiển thị nhiều thông báo
            const now = Date.now();
            const cancelKey = `${conversationId}-${callerInfo?.userId}`;

            if (lastCancelledCallId === cancelKey && (now - lastCancelledTime) < 2000) {
                console.log('🚫 Bỏ qua thông báo hủy cuộc gọi trùng lặp');
                return;
            }

            lastCancelledCallId = cancelKey;
            lastCancelledTime = now;

            // Dừng âm thanh chuông
            callRingtone.stop();

            // Đóng modal confirm nếu đang hiển thị
            if (currentCallModalRef.current) {
                currentCallModalRef.current.destroy();
                currentCallModalRef.current = null;
            }

            // Hiển thị thông báo ngắn CHỈ MỘT LẦN
            message.info(`${callerInfo?.name || 'Người gọi'} đã hủy cuộc gọi`);
        });

        // Xử lý khi người gọi hủy cuộc gọi video
        socket.on('video-call-cancelled', (data) => {
            console.log('🚫 Cuộc gọi video đã bị hủy bởi người gọi:', data);
            const { callerInfo, conversationId, reason } = data;


            // KIỂM TRA để tránh hiển thị nhiều thông báo
            const now = Date.now();
            const cancelKey = `${conversationId}-${callerInfo?.userId}`;

            if (lastCancelledCallId === cancelKey && (now - lastCancelledTime) < 2000) {
                console.log('🚫 Bỏ qua thông báo hủy cuộc gọi video trùng lặp');
                return;
            }

            lastCancelledCallId = cancelKey;
            lastCancelledTime = now;

            clearCallTimeout();

            // Dừng âm thanh chuông
            callRingtone.stop();

            // Đóng modal confirm nếu đang hiển thị
            if (currentCallModalRef.current) {
                currentCallModalRef.current.destroy();
                currentCallModalRef.current = null;
            }

            // Hiển thị thông báo ngắn CHỈ MỘT LẦN
            message.info(`${callerInfo?.name || 'Người gọi'} đã hủy cuộc gọi`);
        });
        // THÊM: Xử lý khi cuộc gọi thoại bị từ chối
        socket.on('voice-call-rejected', async (data) => {
            console.log('❌ Cuộc gọi thoại bị từ chối:', data);
            const { rejectedBy } = data;

            clearCallTimeout();

            if (voiceCallRef.current && voiceCallRef.current.cleanup) {
                await voiceCallRef.current.cleanup();
            }

            setRejectionMessage(`${rejectedBy.name} đã từ chối cuộc gọi`);
            setCallRejected(true);

            // Tự động đóng modal sau 2 giây
            setTimeout(() => {
                setVoiceCallVisible(false);
                setCallRejected(false);
                setRejectionMessage('');
            }, 2000);
        });

        // THÊM: Xử lý khi cuộc gọi video bị từ chối
        socket.on('video-call-rejected', async (data) => {
            console.log('❌ Cuộc gọi video bị từ chối:', data);
            const { rejectedBy } = data;

            clearCallTimeout();

            if (voiceCallRef.current && voiceCallRef.current.cleanup) {
                await voiceCallRef.current.cleanup();
            }

            setRejectionMessage(`${rejectedBy.name} đã từ chối cuộc gọi`);
            setCallRejected(true);

            // Tự động đóng modal sau 2 giây
            setTimeout(() => {
                setVideoCallVisible(false);
                setCallRejected(false);
                setRejectionMessage('');
            }, 2000);
        });

        // socket.off('call-answered-notification');
        // THÊM vào ChatLayout useEffect call events:
        socket.on('call-answered-notification', (data) => {
            console.log('📞 Call answered notification received:', data);
            const { conversationId, isGroupCall, userId } = data;
            clearCallTimeout();
            // Clear timeout nếu là cuộc gọi hiện tại
            // if (callInfo._id === conversationId) {
            //     console.log('✅ Call was answered - clearing timeout');
            //     clearCallTimeout();
            // }
            if (callTimeoutRef.current && (voiceCallVisible || videoCallVisible)) {
                console.log('✅ Active call detected - clearing timeout');
                clearCallTimeout();
            }
        });

        // socket.on('individual-call-answered', (data) => {
        //     console.log('📞 Individual call answered:', data);
        //     const { conversationId } = data;

        //     if (callInfo._id === conversationId) {
        //         console.log('✅ Individual call answered - clearing timeout');
        //         clearCallTimeout();
        //     }
        // });
        // socket.off('group-call-participants-updated');
        // xử lý nhóm người tham gia hiện tại cũng xóa thời gian chờ
        socket.on('group-call-participants-updated', (data) => {
            console.log('👥 Group call participants updated:', data);
            const { conversationId, newParticipant } = data;
            clearCallTimeout();
            // if (callInfo._id === conversationId && newParticipant) {
            //     console.log('✅ New participant joined group call - clearing timeout');
            //     clearCallTimeout();
            // }
            if (callTimeoutRef.current && voiceCallVisible && newParticipant) {
                console.log('✅ New participant joined - clearing timeout');
                clearCallTimeout();
            }
        });

        // Cleanup
        return () => {
            socket.off('incoming-voice-call');
            socket.off('new-user-call');
            socket.off('voice-call-cancelled');
            socket.off('video-call-cancelled');
            socket.off('voice-call-rejected');
            socket.off('video-call-rejected');
            socket.off('call-answered-notification');
            // socket.off('individual-call-answered');
            socket.off('group-call-participants-updated');

            callRingtone.stop();
            clearCallTimeout();
        };
    }, [socket, user, conversations]);

    useEffect(() => {
        if (!socket || !conversations || !conversations.length || !user) return;

        console.log('🔄 Joining conversation rooms');

        // Join vào tất cả các phòng trò chuyện
        conversations.forEach(conversation => {
            const conversationId = conversation._id;

            // Join vào phòng chính - quan trọng nhất cho thông báo cuộc gọi
            socket.emit('join-conversation', conversationId);
            console.log('📱 Đã join vào phòng chính:', conversationId);

            // Join vào các phòng cuộc gọi
            socket.emit('join-conversation', `${conversationId}call`);
            socket.emit('join-conversation', `${conversationId}audio-call`);
            console.log('📱 Đã join vào phòng cuộc gọi:',
                `${conversationId}call`, `${conversationId}audio-call`);
        });

    }, [socket, conversations, user]);

    useEffect(() => {
        // Reset trạng thái từ chối khi modal đóng
        if (!voiceCallVisible && !videoCallVisible) {
            setTimeout(() => {
                setCallRejected(false);
                setRejectionMessage('');
            }, 300); // Đợi animation kết thúc
        }
    }, [voiceCallVisible, videoCallVisible]);

    useEffect(() => {
        if (voiceCallVisible || videoCallVisible) {
            // Dừng âm thanh khi modal cuộc gọi được mở (đã trả lời)
            callRingtone.stop();

            // Đóng modal confirm nếu đang mở
            if (currentCallModalRef.current) {
                currentCallModalRef.current.destroy();
                currentCallModalRef.current = null;
            }
        }
    }, [voiceCallVisible, videoCallVisible]);

    // Thêm useEffect để clear timeout khi modal voice call mở
    useEffect(() => {
        if (voiceCallVisible && callTimeoutRef.current) {
            // Delay một chút để AgoraAudioCall component mount xong
            const timeoutId = setTimeout(() => {
                if (voiceCallRef.current && voiceCallRef.current.getRemoteUsers) {
                    const remoteUsers = voiceCallRef.current.getRemoteUsers();
                    const groupParticipants = voiceCallRef.current.getGroupParticipants ?
                        voiceCallRef.current.getGroupParticipants() : [];

                    console.log('🔍 Checking call connection after modal open:', {
                        remoteUsers: remoteUsers?.length || 0,
                        groupParticipants: groupParticipants?.length || 0,
                        hasTimeout: !!callTimeoutRef.current
                    });

                    // Clear timeout nếu đã có kết nối hoặc sau 5 giây (user đã tham gia)
                    if (remoteUsers?.length > 0 || groupParticipants?.length > 1) {
                        console.log('✅ Connection detected - clearing timeout');
                        clearCallTimeout();
                    }
                }
            }, 5000); // Đợi 5 giây sau khi modal mở

            return () => clearTimeout(timeoutId);
        }
    }, [voiceCallVisible]);

    useEffect(() => {
        if (videoCallVisible && callTimeoutRef.current) {
            const timeoutId = setTimeout(() => {
                console.log('✅ Video call modal opened - clearing timeout after delay');
                clearCallTimeout();
            }, 5000);

            return () => clearTimeout(timeoutId);
        }
    }, [videoCallVisible]);

    // ========== CALL HANDLER FUNCTIONS ==========
    const getOtherUserInConversation = (conversationId) => {
        console.log('🔍 [DEBUG] getOtherUserInConversation called with:', {
            conversationId,
            conversations: conversations?.length,
            user: user?._id
        });

        if (!conversationId || !conversations || !user) {
            console.warn('❌ Missing required data:', {
                conversationId: !!conversationId,
                conversations: !!conversations,
                user: !!user
            });
            return null;
        }

        const conversation = conversations.find(conv => conv._id === conversationId);

        console.log('🔍 [DEBUG] Found conversation:', conversation);

        if (!conversation) {
            console.warn('❌ Conversation not found:', conversationId);
            return null;
        }

        // ✅ XỬ LÝ INDIVIDUAL CONVERSATION (type = false, totalMembers = 2)
        if (conversation.type === false && conversation.totalMembers === 2) {
            if (conversation.userId) {
                const result = {
                    _id: conversation.userId,
                    name: conversation.name,
                    avatar: conversation.avatar
                };

                console.log('✅ [DEBUG] Found other user in 1-1 conversation:', result);
                return result;
            } else {
                console.error('❌ No userId found in individual conversation');
                return null;
            }
        }

        // ✅ XỬ LÝ GROUP CONVERSATION (type = true hoặc totalMembers > 2)
        if (conversation.type === true || conversation.totalMembers > 2) {
            const result = {
                _id: conversationId,
                name: conversation.name,
                avatar: conversation.avatar
            };

            console.log('✅ [DEBUG] Found group conversation:', result);
            return result;
        }

        console.warn('❌ Could not determine conversation type or find other user');
        return null;
    };

    // Xử lý timeout cho cuộc gọi
    const startCallTimeout = (callType, conversationId) => {
        console.log(`⏰ Bắt đầu timeout ${callType} cho conversation:`, conversationId);

        // Clear timeout cũ nếu có
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
        }

        callTimeoutRef.current = setTimeout(() => {
            console.log(`⏰ ${callType} timeout - người nhận không phản hồi`);

            // Dừng âm thanh chuông
            callRingtone.stop();

            // Đóng modal confirm nếu đang hiển thị
            if (currentCallModalRef.current) {
                currentCallModalRef.current.destroy();
                currentCallModalRef.current = null;
            }

            // Gửi sự kiện hủy cuộc gọi do timeout
            const eventName = callType === 'voice' ? 'cancel-voice-call' : 'cancel-video-call';
            socket.emit(eventName, {
                conversationId,
                callerInfo: {
                    userId: user._id,
                    name: user.name || user.username
                },
                reason: 'timeout' // Thêm reason để phân biệt
            });

            // Hiển thị thông báo timeout
            message.warning('Không có phản hồi từ người nhận. Cuộc gọi đã kết thúc.');

            // Đóng modal cuộc gọi nếu đang mở
            if (callType === 'voice') {
                setVoiceCallVisible(false);
            } else {
                setVideoCallVisible(false);
            }

            // Reset states
            setCallRejected(false);
            setRejectionMessage('');

        }, CALL_TIMEOUT_DURATION);
    };

    const clearCallTimeout = () => {
        if (callTimeoutRef.current) {
            console.log('⏰ Clearing call timeout');
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
    };

    const handleStartVoiceCall = () => {
        console.log('🔊 Bắt đầu cuộc gọi thoại', currentConversation);
        // Kiểm tra xem có cuộc trò chuyện đang hoạt động không
        if (!currentConversation) {
            message.error('Vui lòng chọn cuộc trò chuyện trước khi gọi');
            return;
        }

        // Lấy thông tin cuộc trò chuyện hiện tại
        const conversationId = currentConversation; // Sử dụng trực tiếp, vì đây là ID

        // Tìm thông tin chi tiết về cuộc trò chuyện
        const conversationDetails = conversations.find(conv => conv._id === conversationId);

        if (!conversationDetails) {
            message.error('Không tìm thấy thông tin cuộc trò chuyện');
            return;
        }

        const isGroupCall = conversationDetails.type === true || conversationDetails.totalMembers > 2;

        if (isGroupCall) {
            console.log('🎙️ Starting GROUP voice call');
        } else {
            console.log('🎙️ Starting INDIVIDUAL voice call');
        }

        setCallRejected(false);
        setRejectionMessage('');

        setCallInfo({
            _id: conversationId,
            name: conversationDetails.name,
            avatar: conversationDetails.avatar,
            type: conversationDetails.type, // Quan trọng: truyền type
            totalMembers: conversationDetails.totalMembers, // Quan trọng: truyền totalMembers
            members: conversationDetails.members, // Quan trọng: truyền members
            userId: conversationDetails.userId // Quan trọng: truyền userId
        });

        setVoiceCallVisible(true);

        startCallTimeout('voice', conversationId);

        // Gửi sự kiện với đầy đủ thông tin
        socket.emit('subscribe-call-audio', {
            conversationId,
            newUserId: user._id,
            userName: user.name || user.username,
            userAvatar: user.avatar || '',
            isGroupCall
        });

        console.log('🔊 Đã gửi sự kiện subscribe-call-audio với dữ liệu:', {
            conversationId,
            newUserId: user._id,
            userName: user.name || user.username,
            userAvatar: user.avatar || '',
            isGroupCall
        });
    };

    const handleStartVideoCall = () => {
        // Kiểm tra xem có cuộc trò chuyện đang hoạt động không
        if (!currentConversation) {
            message.error('Vui lòng chọn cuộc trò chuyện trước khi gọi');
            return;
        }

        // Lấy thông tin cuộc trò chuyện hiện tại
        const conversationId = currentConversation; // Sử dụng trực tiếp, vì đây là ID

        // Tìm thông tin chi tiết về cuộc trò chuyện
        const conversationDetails = conversations.find(conv => conv._id === conversationId);

        if (!conversationDetails) {
            message.error('Không tìm thấy thông tin cuộc trò chuyện');
            return;
        }

        setCallRejected(false);
        setRejectionMessage('');

        setCallInfo({
            _id: conversationId,
            name: conversationDetails.name,
            avatar: conversationDetails.avatar,
            type: conversationDetails.type,
            totalMembers: conversationDetails.totalMembers,
            members: conversationDetails.members,
            userId: conversationDetails.userId
        });

        setVideoCallVisible(true);

        startCallTimeout('voice', conversationId);

        // Gửi sự kiện với đầy đủ thông tin
        socket.emit('subscribe-call-video', {
            conversationId,
            newUserId: user._id,
            userName: user.name || user.username,
            userAvatar: user.avatar || '',
            peerId: user._id
        });

        console.log('📹 Đã gửi sự kiện subscribe-call-video với dữ liệu:', {
            conversationId,
            newUserId: user._id,
            userName: user.name || user.username,
            userAvatar: user.avatar || '',
            peerId: user._id
        });
    };

    const handleEndVideoCall = async () => {
        console.log('🔚 Kết thúc cuộc gọi video');

        clearCallTimeout();

        // Cleanup trước khi gửi cancel signal
        if (videoCallRef.current && videoCallRef.current.cleanup) {
            await videoCallRef.current.cleanup();
        }

        if (callInfo._id && !callRejected) {
            socket.emit('cancel-video-call', {
                conversationId: callInfo._id,
                callerInfo: {
                    userId: user._id,
                    name: user.name || user.username
                }
            });
            console.log('🚫 Đã gửi cancel-video-call từ ChatLayout');
        }

        callRingtone.stop();
        setVideoCallVisible(false);
        if (!callRejected) {
            setCallRejected(false);
            setRejectionMessage('');
        }
    };

    const handleEndVoiceCall = async () => {
        console.log('🔚 Kết thúc cuộc gọi thoại');

        clearCallTimeout();

        // Cleanup trước khi gửi cancel signal
        if (voiceCallRef.current && voiceCallRef.current.cleanup) {
            await voiceCallRef.current.cleanup();
        }

        // Gửi thông báo hủy cuộc gọi CHỈ KHI chưa có người tham gia
        const hasRemoteUsers = voiceCallRef.current &&
            voiceCallRef.current.getRemoteUsers &&
            voiceCallRef.current.getRemoteUsers().length > 0;

        if (callInfo._id && !callRejected && !hasRemoteUsers) {
            socket.emit('cancel-voice-call', {
                conversationId: callInfo._id,
                callerInfo: {
                    userId: user._id,
                    name: user.name || user.username
                }
            });
            console.log('🚫 Đã gửi cancel-voice-call từ ChatLayout');
        }

        callRingtone.stop();
        setVoiceCallVisible(false);
        if (!callRejected) {
            setCallRejected(false);
            setRejectionMessage('');
        }
    };

    // ========== HELPER FUNCTIONS ==========
    const playNotificationSound = (messageId = null, senderId = null) => {
        if (senderId && user && (senderId === user._id || String(senderId) === String(user._id))) {
            console.log('Không phát âm thanh - tin nhắn của mình:', senderId);
            return Promise.resolve(false);
        }
        return notificationSound.play({ messageId, senderId }).then(played => played);
    };

    const handleResetNotificationCache = (userId = null) => {
        notificationSound.resetCache(userId);
    };

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    useWindowUnloadEffect(async () => {
        async function leaveApp() {
            callRingtone.destroy();
            socket.emit('leave', user._id);
            await sleep(2000);
        }
        await leaveApp();
    }, true);

    const handleSetCodeRevoke = (code) => {
        setCodeRevoke(code);
        codeRevokeRef.current = code;
    };

    return (
        <div>
            <Row gutter={[0, 0]}>
                <Col span={1} xl={{ span: 1 }} lg={{ span: 1 }} md={{ span: 2 }} sm={{ span: 3 }} xs={{ span: 4 }}>
                    <NavbarContainer onSaveCodeRevoke={handleSetCodeRevoke} />
                </Col>

                <Col span={23} xl={{ span: 23 }} lg={{ span: 23 }} md={{ span: 22 }} sm={{ span: 21 }} xs={{ span: 20 }}>
                    <Routes>
                        <Route
                            path=""
                            element={
                                <Chat
                                    socket={socket}
                                    authed={true}
                                    idNewMessage={idNewMessage}
                                    onStartCall={handleStartVoiceCall}
                                    onStartVideoCall={handleStartVideoCall}
                                />
                            }
                        />
                        <Route path="friends" element={<Friend socket={socket} authed={true} />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Col>
            </Row>

            {/* Modal cuộc gọi video */}
            <ModalVideoCall
                ref={videoCallRef}
                isVisible={videoCallVisible}
                onCancel={handleEndVideoCall}
                conversation={callInfo}
                currentUser={user}
                isRejected={callRejected}
                rejectionMessage={rejectionMessage}
            />

            {/* Modal cuộc gọi thoại */}
            <ModalVoiceCall
                ref={voiceCallRef}
                isVisible={voiceCallVisible}
                onCancel={handleEndVoiceCall}
                conversation={callInfo}
                currentUser={user}
                isRejected={callRejected}
                rejectionMessage={rejectionMessage}
                onUserJoined={clearCallTimeout}
            />
        </div>
    );
}

export default ChatLayout;