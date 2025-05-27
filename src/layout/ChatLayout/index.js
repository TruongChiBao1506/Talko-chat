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
    const rejectedMembersRef = useRef(new Set());

    const [videoCallRejectedMembers, setVideoCallRejectedMembers] = useState(new Set());
    const videoCallTimeoutRef = useRef(null);

    const lastCancelledCallRef = useRef({ id: null, time: 0 });


    // useEffect(() => {
    //     return () => {
    //         // Clear all timeouts on unmount
    //         clearCallTimeout();

    //         // Stop ringtone
    //         callRingtone.stop();

    //         // Clear modal references
    //         if (currentCallModalRef.current) {
    //             currentCallModalRef.current.destroy();
    //             currentCallModalRef.current = null;
    //         }
    //     };
    // }, []);
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

            lastCancelledCallRef.current = { id: cancelKey, time: now };

            clearVideoCallTimeout("video_call_cancelled");

            // Dừng âm thanh chuông
            callRingtone.stop();

            // Đóng modal confirm nếu đang hiển thị
            if (currentCallModalRef.current) {
                currentCallModalRef.current.destroy();
                currentCallModalRef.current = null;
            }

            // Hiển thị thông báo ngắn CHỈ MỘT LẦN
            const messageText = reason === 'timeout'
                ? `${callerInfo?.name || 'Người gọi'} không phản hồi - cuộc gọi đã kết thúc`
                : `${callerInfo?.name || 'Người gọi'} đã hủy cuộc gọi video`;

            message.info(messageText);
        });
        // THÊM: Xử lý khi cuộc gọi thoại bị từ chối
        socket.on('voice-call-rejected', async (data) => {
            console.log('❌ Cuộc gọi thoại bị từ chối:', data);
            const { rejectedBy, conversationId } = data;

            // Kiểm tra xem có phải cuộc gọi hiện tại không
            if (callInfo._id !== conversationId) {
                console.log('❌ Rejection không phải cho cuộc gọi hiện tại');
                return;
            }

            // Tìm conversation để check loại cuộc gọi
            const conversation = conversations.find(conv => conv._id === conversationId);
            const isGroupCall = conversation && (conversation.type === true || conversation.totalMembers > 2);

            if (isGroupCall) {
                // ✅ GROUP CALL: Chỉ hiển thị thông báo, KHÔNG đóng modal
                console.log('👥 Group call rejection - showing notification only');

                // Track rejected member
                rejectedMembersRef.current.add(rejectedBy.userId);

                // Hiển thị thông báo ngắn
                message.info(`${rejectedBy.name} đã từ chối cuộc gọi nhóm`);

                // Check xem có phải tất cả members đã từ chối chưa
                const totalOtherMembers = conversation.totalMembers - 1; // Trừ người gọi
                const rejectedCount = rejectedMembersRef.current.size;

                console.log('📊 Group call rejection status:', {
                    totalOtherMembers,
                    rejectedCount,
                    rejectedMembers: Array.from(rejectedMembersRef.current)
                });

                // Chỉ đóng modal nếu TẤT CẢ thành viên khác đã từ chối
                if (rejectedCount >= totalOtherMembers) {
                    console.log('❌ All group members rejected - ending call');

                    clearCallTimeout();

                    if (voiceCallRef.current && voiceCallRef.current.cleanup) {
                        await voiceCallRef.current.cleanup();
                    }

                    setRejectionMessage('Tất cả thành viên đã từ chối cuộc gọi nhóm');
                    setCallRejected(true);

                    // Reset rejected members
                    rejectedMembersRef.current.clear();

                    // Đóng modal sau 3 giây
                    setTimeout(() => {
                        setVoiceCallVisible(false);
                        setCallRejected(false);
                        setRejectionMessage('');
                    }, 3000);
                }

            } else {
                // ✅ INDIVIDUAL CALL: Đóng modal như cũ
                console.log('👤 Individual call rejection - closing modal');

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
            }
        });

        // Xử lý khi cuộc gọi video bị từ chối
        // socket.on('video-call-rejected', async (data) => {
        //     // console.log('❌ Cuộc gọi video bị từ chối:', data);
        //     // const { rejectedBy } = data;

        //     // clearCallTimeout();

        //     // if (voiceCallRef.current && voiceCallRef.current.cleanup) {
        //     //     await voiceCallRef.current.cleanup();
        //     // }

        //     // setRejectionMessage(`${rejectedBy.name} đã từ chối cuộc gọi`);
        //     // setCallRejected(true);

        //     // // Tự động đóng modal sau 2 giây
        //     // setTimeout(() => {
        //     //     setVideoCallVisible(false);
        //     //     setCallRejected(false);
        //     //     setRejectionMessage('');
        //     // }, 2000);
        //     console.log('❌ Cuộc gọi video bị từ chối:', data);
        //     const { rejectedBy, conversationId } = data;

        //     // Kiểm tra xem có phải cuộc gọi hiện tại không
        //     if (callInfo._id !== conversationId) {
        //         console.log('❌ Video rejection không phải cho cuộc gọi hiện tại');
        //         return;
        //     }

        //     // Tìm conversation để check loại cuộc gọi
        //     const conversation = conversations.find(conv => conv._id === conversationId);
        //     const isGroupCall = conversation && (conversation.type === true || conversation.totalMembers > 2);

        //     if (isGroupCall) {
        //         // ✅ GROUP CALL: Chỉ hiển thị thông báo, KHÔNG đóng modal
        //         console.log('👥 Group video call rejection - showing notification only');

        //         // Track rejected member
        //         rejectedMembersRef.current.add(rejectedBy.userId);

        //         // Hiển thị thông báo ngắn
        //         message.info(`${rejectedBy.name} đã từ chối cuộc gọi video nhóm`);

        //         // Check xem có phải tất cả members đã từ chối chưa
        //         const totalOtherMembers = conversation.totalMembers - 1; // Trừ người gọi
        //         const rejectedCount = rejectedMembersRef.current.size;

        //         // Chỉ đóng modal nếu TẤT CẢ thành viên khác đã từ chối
        //         if (rejectedCount >= totalOtherMembers) {
        //             console.log('❌ All group members rejected video call - ending call');

        //             clearCallTimeout();

        //             if (videoCallRef.current && videoCallRef.current.cleanup) {
        //                 await videoCallRef.current.cleanup();
        //             }

        //             setRejectionMessage('Tất cả thành viên đã từ chối cuộc gọi video nhóm');
        //             setCallRejected(true);

        //             // Reset rejected members
        //             rejectedMembersRef.current.clear();

        //             // Đóng modal sau 3 giây
        //             setTimeout(() => {
        //                 setVideoCallVisible(false);
        //                 setCallRejected(false);
        //                 setRejectionMessage('');
        //             }, 3000);
        //         }

        //     } else {
        //         // ✅ INDIVIDUAL CALL: Đóng modal như cũ
        //         console.log('👤 Individual video call rejection - closing modal');

        //         clearCallTimeout();

        //         if (voiceCallRef.current && voiceCallRef.current.cleanup) {
        //             await voiceCallRef.current.cleanup();
        //         }

        //         setRejectionMessage(`${rejectedBy.name} đã từ chối cuộc gọi`);
        //         setCallRejected(true);

        //         // Tự động đóng modal sau 2 giây
        //         setTimeout(() => {
        //             setVideoCallVisible(false);
        //             setCallRejected(false);
        //             setRejectionMessage('');
        //         }, 2000);
        //     }
        // });

        // socket.off('call-answered-notification');
        // THÊM vào ChatLayout useEffect call events:
        socket.on('call-answered-notification', (data) => {
            console.log('📞 Call answered notification received:', data);
            const { conversationId, isGroupCall, userId } = data;
            rejectedMembersRef.current.clear();
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
            rejectedMembersRef.current.clear();
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
            // socket.off('video-call-rejected');
            socket.off('call-answered-notification');
            // socket.off('individual-call-answered');
            socket.off('group-call-participants-updated');

            callRingtone.stop();
            clearCallTimeout();
        };
    }, [socket, user, conversations]);

    // Thêm vào video call event handlers
    useEffect(() => {
        if (!socket || !user) return;

        console.log('🛠️ Setting up VIDEO call event listeners');

        // ✅ IMPROVED: Video call incoming
        socket.on('incoming-video-call', (data) => {
            console.log('📹 Đã nhận sự kiện incoming-video-call:', data);
            const { conversationId, caller, isGroupCall } = data;

            const conversation = conversations.find(conv => conv._id === conversationId);

            if (!conversation) {
                console.log('❌ Không tìm thấy conversation:', conversationId);
                return;
            }

            console.log('📹 Hiển thị thông báo cuộc gọi video từ:', caller.name);

            callRingtone.play();

            const modal = Modal.confirm({
                title: 'Cuộc gọi video đến',
                content: `${caller.name || conversation.name} đang gọi video cho bạn`,
                okText: 'Trả lời',
                cancelText: 'Từ chối',
                onOk: () => {
                    console.log('✅ User accepted video call');
                    callRingtone.stop();

                    setCallInfo({
                        _id: conversationId,
                        name: conversation.name,
                        avatar: conversation.avatar,
                        type: conversation.type,
                        totalMembers: conversation.totalMembers,
                        members: conversation.members,
                        userId: conversation.userId
                    });

                    setVideoCallVisible(true);

                    // ✅ CRITICAL: Emit acceptance immediately
                    socket.emit('video-call-answered-notification', {
                        conversationId,
                        answeredBy: user._id,
                        isGroupCall: isGroupCall || false,
                        userId: user._id
                    });
                },
                onCancel: () => {
                    console.log('❌ User rejected video call');
                    callRingtone.stop();

                    socket.emit('reject-video-call', {
                        conversationId,
                        rejectedBy: {
                            userId: user._id,
                            name: user.name || user.username
                        }
                    });
                }
            });

            currentCallModalRef.current = modal;
        });
        socket.on('video-call-rejected', async (data) => {
            console.log('❌ Cuộc gọi video bị từ chối:', data);
            const { rejectedBy, conversationId } = data;

            if (callInfo._id !== conversationId) {
                console.log('❌ Video rejection không phải cho cuộc gọi hiện tại');
                return;
            }

            const conversation = conversations.find(conv => conv._id === conversationId);
            const isGroupCall = conversation && (conversation.type === true || conversation.totalMembers > 2);

            if (isGroupCall) {
                // ✅ GROUP CALL: Only show notification, don't close modal
                console.log('👥 Group video call rejection - showing notification only');

                setVideoCallRejectedMembers(prev => new Set([...prev, rejectedBy.userId]));
                message.info(`${rejectedBy.name} đã từ chối cuộc gọi video nhóm`);

                const totalOtherMembers = conversation.totalMembers - 1;

                setVideoCallRejectedMembers(currentRejected => {
                    const newRejected = new Set([...currentRejected, rejectedBy.userId]);

                    if (newRejected.size >= totalOtherMembers) {
                        console.log('❌ All group members rejected video call - ending call');

                        clearCallTimeout();

                        if (videoCallRef.current && videoCallRef.current.cleanup) {
                            videoCallRef.current.cleanup();
                        }

                        setRejectionMessage('Tất cả thành viên đã từ chối cuộc gọi video nhóm');
                        setCallRejected(true);

                        setTimeout(() => {
                            setVideoCallVisible(false);
                            setCallRejected(false);
                            setRejectionMessage('');
                            setVideoCallRejectedMembers(new Set());
                        }, 3000);
                    }

                    return newRejected;
                });

            } else {
                // ✅ INDIVIDUAL CALL: Close modal immediately like audio call
                console.log('👤 Individual video call rejection - closing modal');

                clearCallTimeout();

                if (videoCallRef.current && videoCallRef.current.cleanup) {
                    await videoCallRef.current.cleanup();
                }

                setRejectionMessage(`${rejectedBy.name} đã từ chối cuộc gọi`);
                setCallRejected(true);

                setTimeout(() => {
                    setVideoCallVisible(false);
                    setCallRejected(false);
                    setRejectionMessage('');
                }, 2000);
            }
        });

        // ✅ IMPROVED: Video call answered notification
        socket.on('video-call-answered-notification', (data) => {
            // console.log('📹 Video call answered notification received:', data);
            // const { conversationId } = data;

            // setVideoCallRejectedMembers(new Set());
            // clearVideoCallTimeout('video_call_answered_via_socket');

            // if (videoCallTimeoutRef.current && videoCallVisible) {
            //     clearTimeout(videoCallTimeoutRef.current);
            //     videoCallTimeoutRef.current = null;
            //     console.log('✅ Video call timeout cleared - call answered');
            // }
            console.log('📹 Video call answered notification received:', data);
            const { conversationId, answeredBy } = data;

            // ✅ CRITICAL: Chỉ xử lý nếu là cuộc gọi hiện tại
            if (callInfo._id !== conversationId) {
                console.log('Answer notification for different conversation, ignoring');
                return;
            }

            // ✅ CRITICAL: Chỉ clear timeout nếu có người trả lời
            if (answeredBy && videoCallVisible) {
                console.log('Video call answered by:', answeredBy, '- clearing timeout');

                setVideoCallRejectedMembers(new Set());
                clearVideoCallTimeout('video_call_answered_via_socket');

                console.log('Video call timeout cleared - call answered');
            } else {
                console.log('No answerer or not in video call - keeping timeout');
            }
        });

        // ✅ IMPROVED: Video call participants updated
        socket.on('video-call-participants-updated', (data) => {
            // console.log('👥 Video call participants updated:', data);
            // const { conversationId, newParticipant } = data;

            // setVideoCallRejectedMembers(new Set());
            // clearVideoCallTimeout('video_participant_joined_via_socket');

            // if (videoCallTimeoutRef.current && videoCallVisible && newParticipant) {
            //     clearTimeout(videoCallTimeoutRef.current);
            //     videoCallTimeoutRef.current = null;
            //     console.log('✅ Video call timeout cleared - new participant');
            // }
            console.log('👥 Video call participants updated:', data);
            const { conversationId, newParticipant } = data;

            // ✅ CRITICAL: Chỉ xử lý nếu là cuộc gọi hiện tại
            if (callInfo._id !== conversationId) {
                console.log('Participants update for different conversation, ignoring');
                return;
            }

            // Chỉ clear timeout nếu THỰC SỰ có participant mới
            if (newParticipant && videoCallVisible) {
                console.log('✅ NEW participant joined video call - clearing timeout');

                setVideoCallRejectedMembers(new Set());
                clearVideoCallTimeout('video_participant_joined_via_socket');

                console.log('✅ Video call timeout cleared - new participant joined');
            } else {
                console.log('No new participant or not in video call - keeping timeout');
            }
        });


        // Cleanup video call events
        return () => {
            socket.off('incoming-video-call');
            socket.off('video-call-answered-notification');
            socket.off('video-call-participants-updated');
            socket.off('video-call-rejected');
            // clearVideoCallTimeout('cleanup_video_call_events');
        };
    }, [socket, user, conversations, videoCallVisible, videoCallRejectedMembers]);

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


    // Reset video call states
    useEffect(() => {
        if (!videoCallVisible) {
            setTimeout(() => {
                setVideoCallRejectedMembers(new Set());
            }, 300);
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
    // const startCallTimeout = (callType, conversationId) => {
    //     console.log(`⏰ Bắt đầu timeout ${callType} cho conversation:`, conversationId);

    //     // Reset rejected members khi bắt đầu cuộc gọi mới
    //     rejectedMembersRef.current.clear();

    //     if (callType === 'video') {
    //         setVideoCallRejectedMembers(new Set());
    //     }

    //     // Clear timeout cũ nếu có
    //     if (callTimeoutRef.current) {
    //         clearTimeout(callTimeoutRef.current);
    //     }

    //     callTimeoutRef.current = setTimeout(() => {
    //         console.log(`⏰ ${callType} timeout - người nhận không phản hồi`);


    //         rejectedMembersRef.current.clear();

    //         if (callType === 'video') {
    //             setVideoCallRejectedMembers(new Set());
    //         }
    //         // Dừng âm thanh chuông
    //         callRingtone.stop();

    //         // Đóng modal confirm nếu đang hiển thị
    //         if (currentCallModalRef.current) {
    //             currentCallModalRef.current.destroy();
    //             currentCallModalRef.current = null;
    //         }

    //         // Gửi sự kiện hủy cuộc gọi do timeout
    //         // const eventName = callType === 'voice' ? 'cancel-voice-call' : 'cancel-video-call';
    //         // socket.emit(eventName, {
    //         //     conversationId,
    //         //     callerInfo: {
    //         //         userId: user._id,
    //         //         name: user.name || user.username
    //         //     },
    //         //     reason: 'timeout' // Thêm reason để phân biệt
    //         // });

    //         // // Hiển thị thông báo timeout
    //         // message.warning('Không có phản hồi từ người nhận. Cuộc gọi đã kết thúc.');

    //         // // Đóng modal cuộc gọi nếu đang mở
    //         // if (callType === 'voice') {
    //         //     setVoiceCallVisible(false);
    //         // } else {
    //         //     setVideoCallVisible(false);
    //         // }

    //         // // Reset states
    //         // setCallRejected(false);
    //         // setRejectionMessage('');

    //         const performTimeoutCleanup = async () => {
    //             try {
    //                 if (callType === 'video' && videoCallRef.current && videoCallRef.current.cleanup) {
    //                     console.log('🧹 Cleaning up video call on timeout');
    //                     await videoCallRef.current.cleanup();
    //                 } else if (callType === 'voice' && voiceCallRef.current && voiceCallRef.current.cleanup) {
    //                     console.log('🧹 Cleaning up voice call on timeout');
    //                     await voiceCallRef.current.cleanup();
    //                 }
    //             } catch (error) {
    //                 console.error('❌ Error during timeout cleanup:', error);
    //             }

    //             // Send cancel event after cleanup
    //             const eventName = callType === 'voice' ? 'cancel-voice-call' : 'cancel-video-call';
    //             socket.emit(eventName, {
    //                 conversationId,
    //                 callerInfo: {
    //                     userId: user._id,
    //                     name: user.name || user.username,
    //                     avatar: user.avatar
    //                 },
    //                 reason: 'timeout'
    //             });

    //             // Hiển thị thông báo timeout
    //             message.warning('Không có phản hồi từ người nhận. Cuộc gọi đã kết thúc.');

    //             // Đóng modal cuộc gọi
    //             if (callType === 'voice') {
    //                 setVoiceCallVisible(false);
    //             } else {
    //                 setVideoCallVisible(false);
    //             }

    //             // Reset states
    //             setCallRejected(false);
    //             setRejectionMessage('');
    //         };

    //         performTimeoutCleanup();

    //     }, CALL_TIMEOUT_DURATION);
    // };

    const startCallTimeout = (callType, conversationId) => {
        console.log(`⏰ Bắt đầu timeout ${callType} cho conversation:`, conversationId);

        // Reset rejected members khi bắt đầu cuộc gọi mới
        rejectedMembersRef.current.clear();

        if (callType === 'video') {
            setVideoCallRejectedMembers(new Set());
        }

        // Clear timeout cũ nếu có
        if (callTimeoutRef.current) {
            console.log('⏰ Clearing existing timeout before setting new one');
            clearTimeout(callTimeoutRef.current);
        }

        console.log(`⏰ Setting ${callType} timeout for ${CALL_TIMEOUT_DURATION}ms`);

        callTimeoutRef.current = setTimeout(() => {
            console.log(`⏰ ${callType} TIMEOUT REACHED - người nhận không phản hồi sau ${CALL_TIMEOUT_DURATION}ms`);

            rejectedMembersRef.current.clear();

            if (callType === 'video') {
                setVideoCallRejectedMembers(new Set());
            }

            // Dừng âm thanh chuông
            callRingtone.stop();

            // Đóng modal confirm nếu đang hiển thị
            if (currentCallModalRef.current) {
                currentCallModalRef.current.destroy();
                currentCallModalRef.current = null;
            }

            const performTimeoutCleanup = async () => {
                try {
                    if (callType === 'video' && videoCallRef.current && videoCallRef.current.cleanup) {
                        console.log('🧹 Cleaning up video call on timeout');
                        await videoCallRef.current.cleanup();
                    } else if (callType === 'voice' && voiceCallRef.current && voiceCallRef.current.cleanup) {
                        console.log('🧹 Cleaning up voice call on timeout');
                        await voiceCallRef.current.cleanup();
                    }
                } catch (error) {
                    console.error('❌ Error during timeout cleanup:', error);
                }

                // Send cancel event after cleanup
                const eventName = callType === 'voice' ? 'cancel-voice-call' : 'cancel-video-call';
                socket.emit(eventName, {
                    conversationId,
                    callerInfo: {
                        userId: user._id,
                        name: user.name || user.username,
                        avatar: user.avatar
                    },
                    reason: 'timeout'
                });

                // Hiển thị thông báo timeout
                message.warning('Không có phản hồi từ người nhận. Cuộc gọi đã kết thúc.');

                // Đóng modal cuộc gọi
                if (callType === 'voice') {
                    setVoiceCallVisible(false);
                } else {
                    setVideoCallVisible(false);
                }

                // Reset states
                setCallRejected(false);
                setRejectionMessage('');
            };

            performTimeoutCleanup();

        }, CALL_TIMEOUT_DURATION);

        console.log(`⏰ Timeout set successfully - will trigger in ${CALL_TIMEOUT_DURATION}ms`);
    };

    const clearCallTimeout = () => {
        if (callTimeoutRef.current) {
            console.log('⏰ Clearing call timeout');
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
    };

    // Video call timeout functions riêng - KHÔNG đụng voice call
    const startVideoCallTimeout = (conversationId) => {
        console.log(`⏰ Bắt đầu VIDEO timeout cho conversation:`, conversationId);

        setVideoCallRejectedMembers(new Set());

        // Clear existing video timeout
        if (videoCallTimeoutRef.current) {
            console.log('⏰ Clearing existing VIDEO timeout');
            clearTimeout(videoCallTimeoutRef.current);
        }

        console.log(`⏰ Setting VIDEO timeout for ${CALL_TIMEOUT_DURATION}ms`);

        videoCallTimeoutRef.current = setTimeout(() => {
            console.log(`⏰ VIDEO TIMEOUT REACHED - người nhận không phản hồi sau ${CALL_TIMEOUT_DURATION}ms`);

            setVideoCallRejectedMembers(new Set());
            callRingtone.stop();

            if (currentCallModalRef.current) {
                currentCallModalRef.current.destroy();
                currentCallModalRef.current = null;
            }

            const performVideoTimeoutCleanup = async () => {
                try {
                    if (videoCallRef.current && videoCallRef.current.cleanup) {
                        console.log('🧹 Cleaning up VIDEO call on timeout');
                        await videoCallRef.current.cleanup();
                    }
                } catch (error) {
                    console.error('❌ Error during VIDEO timeout cleanup:', error);
                }

                socket.emit('cancel-video-call', {
                    conversationId,
                    callerInfo: {
                        userId: user._id,
                        name: user.name || user.username,
                        avatar: user.avatar
                    },
                    reason: 'timeout'
                });

                message.warning('Không có phản hồi từ người nhận. Cuộc gọi video đã kết thúc.');
                setVideoCallVisible(false);
                setCallRejected(false);
                setRejectionMessage('');
            };

            performVideoTimeoutCleanup();

        }, CALL_TIMEOUT_DURATION);

        console.log(`⏰ VIDEO timeout set successfully`);
    };

    const clearVideoCallTimeout = (reason = 'unknown') => {
        if (videoCallTimeoutRef.current) {
            console.log(`⏰ Clearing VIDEO timeout - reason: ${reason}`);
            clearTimeout(videoCallTimeoutRef.current);
            videoCallTimeoutRef.current = null;
            console.log('✅ VIDEO timeout cleared successfully');
        } else {
            console.log(`ℹ️ No VIDEO timeout to clear - reason: ${reason}`);
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

    // const handleStartVideoCall = () => {
    //     console.log('📹 Bắt đầu cuộc gọi video', currentConversation);

    //     if (!currentConversation) {
    //         message.error('Vui lòng chọn cuộc trò chuyện trước khi gọi');
    //         return;
    //     }

    //     const conversationId = currentConversation;
    //     const conversationDetails = conversations.find(conv => conv._id === conversationId);

    //     if (!conversationDetails) {
    //         message.error('Không tìm thấy thông tin cuộc trò chuyện');
    //         return;
    //     }

    //     const isGroupCall = conversationDetails.type === true || conversationDetails.totalMembers > 2;

    //     if (isGroupCall) {
    //         console.log('📹 Starting GROUP video call');
    //     } else {
    //         console.log('📹 Starting INDIVIDUAL video call');
    //     }

    //     setCallRejected(false);
    //     setRejectionMessage('');

    //     setCallInfo({
    //         _id: conversationId,
    //         name: conversationDetails.name,
    //         avatar: conversationDetails.avatar,
    //         type: conversationDetails.type,
    //         totalMembers: conversationDetails.totalMembers,
    //         members: conversationDetails.members,
    //         userId: conversationDetails.userId
    //     });

    //     setVideoCallVisible(true);

    //     startVideoCallTimeout(conversationId); // ✅ Use separate video timeout

    //     // ✅ SEPARATE: Video call socket event
    //     socket.emit('subscribe-call-video', {
    //         conversationId,
    //         newUserId: user._id,
    //         userName: user.name || user.username,
    //         userAvatar: user.avatar || '',
    //         isGroupCall
    //     });

    //     console.log('📹 Đã gửi sự kiện subscribe-call-video');
    // };

    const handleStartVideoCall = () => {
        console.log('📹 Bắt đầu cuộc gọi video', currentConversation);

        if (!currentConversation) {
            message.error('Vui lòng chọn cuộc trò chuyện trước khi gọi');
            return;
        }

        const conversationId = currentConversation;
        const conversationDetails = conversations.find(conv => conv._id === conversationId);

        if (!conversationDetails) {
            message.error('Không tìm thấy thông tin cuộc trò chuyện');
            return;
        }

        const isGroupCall = conversationDetails.type === true || conversationDetails.totalMembers > 2;

        console.log(`📹 Starting ${isGroupCall ? 'GROUP' : 'INDIVIDUAL'} video call`);

        setCallRejected(false);
        setRejectionMessage('');
        setVideoCallRejectedMembers(new Set());

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

        // Dùng VIDEO timeout riêng
        startVideoCallTimeout(conversationId);

        socket.emit('subscribe-call-video', {
            conversationId,
            newUserId: user._id,
            userName: user.name || user.username,
            userAvatar: user.avatar || '',
            isGroupCall
        });

        console.log('📹 Video call initiated với VIDEO timeout:', CALL_TIMEOUT_DURATION / 1000, 'seconds');
    };

    // const handleEndVideoCall = async () => {
    //     console.log('🔚 Kết thúc cuộc gọi video');

    //     setVideoCallRejectedMembers(new Set());
    //     clearVideoCallTimeout();

    //     if (videoCallRef.current && videoCallRef.current.cleanup) {
    //         await videoCallRef.current.cleanup();
    //     }

    //     if (callInfo._id && !callRejected) {
    //         socket.emit('cancel-video-call', {
    //             conversationId: callInfo._id,
    //             callerInfo: {
    //                 userId: user._id,
    //                 name: user.name || user.username
    //             }
    //         });
    //         console.log('🚫 Đã gửi cancel-video-call từ ChatLayout');
    //     }

    //     callRingtone.stop();
    //     setVideoCallVisible(false);
    //     if (!callRejected) {
    //         setCallRejected(false);
    //         setRejectionMessage('');
    //     }
    // };
    const handleEndVideoCall = async () => {
        console.log('🔚 Kết thúc cuộc gọi video');

        // ✅ CRITICAL: Clear VIDEO timeout riêng
        clearVideoCallTimeout('user_ended_video_call');

        setVideoCallRejectedMembers(new Set());

        if (videoCallRef.current && videoCallRef.current.cleanup) {
            try {
                await videoCallRef.current.cleanup();
            } catch (error) {
                console.error('❌ Error during video call cleanup:', error);
            }
        }

        if (callInfo._id && !callRejected) {
            socket.emit('cancel-video-call', {
                conversationId: callInfo._id,
                callerInfo: {
                    userId: user._id,
                    name: user.name || user.username,
                    avatar: user.avatar
                },
                reason: 'user_ended'
            });
            console.log('🚫 Đã gửi cancel-video-call từ ChatLayout');
        }

        callRingtone.stop();

        if (currentCallModalRef.current) {
            currentCallModalRef.current.destroy();
            currentCallModalRef.current = null;
        }

        setVideoCallVisible(false);

        if (!callRejected) {
            setCallRejected(false);
            setRejectionMessage('');
        }
    };


    const handleEndVoiceCall = async () => {
        console.log('🔚 Kết thúc cuộc gọi thoại');

        rejectedMembersRef.current.clear();
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