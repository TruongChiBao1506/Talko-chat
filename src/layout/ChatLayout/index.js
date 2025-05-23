import { Col, Modal, Row, message } from 'antd';
import conversationApi from '../../apis/conversationApi';
import { setTabActive, setJoinFriendLayout } from '../../redux/globalSlice';
import NotFoundPage from '../../components/NotFoundPage/NotFoundPage';
import Chat from '../../screen/Chat';
import NavbarContainer from '../../screen/Chat/containers/NavbarContainer';
import notificationSound from '../../utils/notificationSound';
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
import ModalIncomingCall from '../../modals/ModalIncomingCall';
import ModalAudioCall from '../../modals/ModalAudioCall';
import soundManager from '../../utils/soundManager';
import stopAllSounds from '../../utils/stopAllSounds';
import ModalVideoCall from '../../modals/ModalVideoCall';

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

    // Audio Call states
    const [incomingCall, setIncomingCall] = useState(null);
    const [showIncomingModal, setShowIncomingModal] = useState(false);
    const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
    const [rejectMessage, setRejectMessage] = useState('');
    const [acceptCall, setAcceptCall] = useState(false);
    const [playRingtone, setPlayRingtone] = useState(false);
    const [callInfo, setCallInfo] = useState(null); // Người/nhóm được gọi
    // State cho modal video call
    const [videoCallVisible, setVideoCallVisible] = useState(false);
    const [videoCallData, setVideoCallData] = useState({
        conversationId: null,
        remoteUserId: null,
        name: '',
        avatar: '',
        acceptCall: false,
        playRingtone: false,
        rejectMessage: ''
    });


    // Thêm state để quản lý unlock audio
    const [audioUnlocked, setAudioUnlocked] = useState(() => sessionStorage.getItem('audioUnlocked') === 'true');
    const [showUnlockAudio, setShowUnlockAudio] = useState(() => sessionStorage.getItem('audioUnlocked') !== 'true');

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

    useEffect(() => {
        dispatch(fetchListRequestFriend());
        dispatch(fetchListMyRequestFriend());
        dispatch(
            fetchFriends({
                name: '',
            })
        );
        dispatch(
            fetchListGroup({
                name: '',
                type: 2,
            })
        );
        dispatch(fetchListClassify());
        dispatch(fetchListColor());
        dispatch(fetchListConversations({}));
        dispatch(fetchAllSticker());
        dispatch(setTabActive(1));
        // dispatch(fetchInfoWebs());
    }, []);
    useEffect(() => {
        const userId = user._id;
        if (userId) {
            console.log('Tham gia socket với user ID:', userId);
            socket.emit('join', userId);

            // Reset cache khi người dùng thay đổi hoặc mới tham gia
            // Cũng cập nhật ID người dùng cho notificationSound
            handleResetNotificationCache(userId);

            // Thiết lập ID người dùng cho hệ thống âm thanh
            notificationSound.setCurrentUser(userId);
        }
    }, [user]);

    useEffect(() => {
        if (conversations.length === 0) return;

        const conversationIds = conversations.map(
            (conversationEle) => conversationEle._id
        );
        socket.emit('join-conversations', conversationIds);
    }, [conversations]);

    useEffect(() => {
        socket.on('create-individual-conversation', (converId) => {
            socket.emit('join-conversation', converId);
            dispatch(fetchConversationById({ conversationId: converId }));
        });
    }, []);

    useEffect(() => {
        socket.on(
            'create-individual-conversation-when-was-friend',
            (conversationId) => {
                dispatch(fetchConversationById({ conversationId }));
            }
        );
    }, []);

    // Hàm phát âm thanh thông báo sử dụng NotificationSoundManager
    const playNotificationSound = (messageId = null, senderId = null) => {
        // Thêm kiểm tra senderId tại đây để đảm bảo không phát âm thanh cho tin nhắn của chính mình
        if (senderId && user && (senderId === user._id || String(senderId) === String(user._id))) {
            console.log('Không phát âm thanh - đã xác định là tin nhắn của mình qua ID:', senderId);
            return Promise.resolve(false);
        }

        return notificationSound.play({ messageId, senderId })
            .then(played => {
                return played;
            });
    };
    useEffect(() => {
        // Lưu ID người dùng hiện tại vào biến độc lập để đảm bảo tham chiếu luôn đúng
        const currentUserId = user?._id;

        // Loại bỏ listener cũ trước khi thêm listener mới
        socket.off('new-message');
        socket.on('new-message', (conversationId, newMessage) => {

            // Lưu trữ ID của người gửi tin nhắn
            // Cách xác định ID người gửi phụ thuộc vào cấu trúc dữ liệu
            const senderId = newMessage.user._id;

            // Kiểm tra trực tiếp nếu đã đánh dấu tin nhắn này là của mình
            if (notificationSound.isRecentlySentMessage(newMessage._id)) {
                // Không phát âm thanh
            }
            // Kiểm tra dựa trên ID người gửi
            else if (currentUserId && senderId &&
                (senderId === currentUserId || String(senderId) === String(currentUserId))) {
                // Đảm bảo đánh dấu tin nhắn như là đã gửi
                notificationSound.markMessageAsSent(newMessage._id);
            } else {
                playNotificationSound(newMessage._id, senderId);
            }
            dispatch(addMessage(newMessage));
            setIdNewMessage(newMessage._id);
        });

        socket.on('update-member', async (conversationId) => {
            const data = await conversationApi.getConversationById(
                conversationId
            );
            const { avatar, totalMembers } = data;
            dispatch(
                updateAvatarWhenUpdateMember({
                    conversationId,
                    avatar,
                    totalMembers,
                })
            );
        }); socket.on(
            'new-message-of-channel',
            (conversationId, channelId, message) => {
                // Lưu trữ ID của người gửi tin nhắn và lấy ID người dùng hiện tại từ closure
                const currentUserId = user?._id;

                // Cách xác định ID người gửi phụ thuộc vào cấu trúc dữ liệu
                const senderId = typeof message.senderId === 'object'
                    ? message.senderId._id
                    : message.senderId;

                // Kiểm tra trực tiếp nếu đã đánh dấu tin nhắn này là của mình
                if (notificationSound.isRecentlySentMessage(message._id)) {
                    // Không phát âm thanh
                }
                // Kiểm tra dựa trên ID người gửi
                else if (currentUserId && senderId &&
                    (senderId === currentUserId || String(senderId) === String(currentUserId))) {
                    // Đảm bảo đánh dấu tin nhắn như là đã gửi
                    notificationSound.markMessageAsSent(message._id);
                } else {
                    playNotificationSound(message._id, senderId);
                }

                dispatch(
                    addMessageInChannel({ conversationId, channelId, message })
                ); setIdNewMessage(message._id);
            }
        );
        socket.off('create-conversation');
        socket.on('create-conversation', (conversationId) => {
            console.log('tạo nhóm', conversationId);
            dispatch(fetchConversationById({ conversationId }));
        });

        // Hàm xử lý khi component unmount
        return () => {
            console.log('Cleanup: removing socket listeners');
            socket.off('new-message');
            socket.off('new-message-of-channel');
            socket.off('update-member');
            socket.off('create-conversation');
        };
    }, [user]); // Thêm user vào dependency array

    useEffect(() => {
        return () => {
            // Cleanup khi ChatLayout unmount
            console.log('ChatLayout unmounted - cleaning up all sounds');
            stopAllSounds();
        };
    }, []);

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Xử lý khi có sự cố với bộ nhớ cache thông báo
    const handleResetNotificationCache = (userId = null) => {
        notificationSound.resetCache(userId);
    };

    // Xử lý khi chấp nhận cuộc gọi
    const handleAcceptCall = () => {
        if (!incomingCall) {
            console.error('Không thể chấp nhận cuộc gọi: không có thông tin cuộc gọi đến');
            return;
        }
        console.log('Chấp nhận cuộc gọi từ:', incomingCall.fromUser?.name, 'isVideo:', incomingCall.isVideo);

        // Dừng tất cả âm thanh đang phát
        stopAllSounds();

        const fromUser = {
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
        };

        // Gửi thông báo chấp nhận cuộc gọi qua socket
        socket.emit('accept-call', {
            conversationId: incomingCall.conversationId,
            fromUser,
            isVideo: incomingCall.isVideo
        });

        // Đóng modal incoming call trước
        setShowIncomingModal(false);
        setPlayRingtone(false);

        // Phân biệt rõ luồng xử lý video vs audio
        setTimeout(() => {
            if (incomingCall.isVideo) {
                console.log('Mở modal VIDEO call');
                setVideoCallVisible(true);
                setVideoCallData({
                    conversationId: incomingCall.conversationId,
                    remoteUserId: incomingCall.fromUser._id,
                    name: incomingCall.fromUser.name,
                    avatar: incomingCall.fromUser.avatar,
                    acceptCall: true,
                    playRingtone: false,
                    rejectMessage: ''
                });
                // Đảm bảo audio call không mở
                setIsAudioCallOpen(false);
            } else {
                console.log('Mở modal AUDIO call');
                setIsAudioCallOpen(true);
                setAcceptCall(true);
                // Đảm bảo video call không mở
                setVideoCallVisible(false);
            }
        }, 200);
    };
    // const handleAcceptCall = () => {
    //     if (!incomingCall) {
    //         console.error('Không thể chấp nhận cuộc gọi: không có thông tin cuộc gọi đến');
    //         return;
    //     }
    //     console.log('Chấp nhận cuộc gọi từ:', incomingCall.fromUser?.name);

    //     // Dừng tất cả âm thanh đang phát
    //     stopAllSounds();
    //     console.log('ChatLayout: Đã dừng tất cả âm thanh trong handleAcceptCall');

    //     const fromUser = {
    //         _id: user._id,
    //         name: user.name,
    //         avatar: user.avatar,
    //     };
    //     // Gửi thông báo chấp nhận cuộc gọi qua socket
    //     socket.emit('accept-call', {
    //         conversationId: incomingCall.conversationId,
    //         fromUser,
    //     });

    //     // Cập nhật trạng thái trước khi hiển thị modal mới
    //     setAcceptCall(true);         // Đánh dấu cuộc gọi đã được chấp nhận
    //     setPlayRingtone(false);      // Tắt ringtone ngay lập tức
    //     setShowIncomingModal(false); // Đóng modal cuộc gọi đến

    //     // Chờ một khoảng thời gian ngắn để đảm bảo các state đã được cập nhật
    //     setTimeout(() => {
    //         setIsAudioCallOpen(true);    // Mở modal cuộc gọi

    //         // Dừng lại âm thanh một lần nữa để đảm bảo
    //         stopAllSounds();
    //     }, 100);
    // };

    // Xử lý khi từ chối cuộc gọi
    const handleRejectCall = () => {
        if (!incomingCall) {
            console.error('Không thể từ chối cuộc gọi: không có thông tin cuộc gọi đến');
            return;
        }

        console.log('Từ chối cuộc gọi từ:', incomingCall.fromUser?.name);

        const fromUser = {
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
        };

        // Gửi thông báo từ chối cuộc gọi qua socket
        socket.emit('reject-call', {
            conversationId: incomingCall.conversationId,
            fromUser,
        });
        // Cập nhật trạng thái
        setShowIncomingModal(false);  // Đóng modal cuộc gọi đến
        setPlayRingtone(false);       // Dừng âm thanh

        // Dừng tất cả âm thanh đang phát
        stopAllSounds();
        console.log('ChatLayout: Đã dừng tất cả âm thanh trong handleRejectCall');

        // Đặt hẹn giờ để xóa dữ liệu cuộc gọi
        setTimeout(() => {
            setIncomingCall(null);    // Xóa thông tin cuộc gọi đến
        }, 500);
    };

    // Xử lý khi kết thúc cuộc gọi
    const handleEndCall = () => {
        console.log('Kết thúc cuộc gọi');

        const conversationId = callInfo?.conversationId || incomingCall?.conversationId;

        if (conversationId) {
            socket.emit('end-call', {
                conversationId,
                fromUser: {
                    _id: user._id,
                    name: user.name,
                    avatar: user.avatar,
                },
            });
        } else {
            console.warn('Không thể gửi sự kiện kết thúc cuộc gọi: thiếu conversationId');
        }

        // Dừng tất cả âm thanh đang phát
        stopAllSounds();

        // Reset tất cả trạng thái cuộc gọi
        setIsAudioCallOpen(false);
        setAcceptCall(false);
        setPlayRingtone(false);
        setVideoCallVisible(false);

        // Reset thông tin cuộc gọi
        setTimeout(() => {
            setCallInfo(null);
            setIncomingCall(null);
            setRejectMessage('');
            setShowIncomingModal(false);
            setVideoCallData({
                conversationId: null,
                remoteUserId: null,
                name: '',
                avatar: '',
                acceptCall: false,
                playRingtone: false,
                rejectMessage: ''
            });
        }, 300);
    };
    // const handleEndCall = () => {
    //     console.log('Kết thúc cuộc gọi');

    //     const conversationId = callInfo?.conversationId || incomingCall?.conversationId;

    //     if (conversationId) {
    //         socket.emit('end-call', {
    //             conversationId,
    //             fromUser: {
    //                 _id: user._id,
    //                 name: user.name,
    //                 avatar: user.avatar,
    //             },
    //         });
    //     } else {
    //         console.warn('Không thể gửi sự kiện kết thúc cuộc gọi: thiếu conversationId');
    //     }

    //     // Dừng tất cả âm thanh đang phát
    //     stopAllSounds();
    //     console.log('ChatLayout: Đã dừng tất cả âm thanh trong handleEndCall');

    //     // Đóng modal và reset tất cả state
    //     setIsAudioCallOpen(false);
    //     setAcceptCall(false);
    //     setPlayRingtone(false);

    //     // Đặt hẹn giờ để reset các state khác (tránh hiệu ứng nhấp nháy UI)
    //     setTimeout(() => {
    //         setCallInfo(null);
    //         setIncomingCall(null);
    //         setRejectMessage('');
    //         setShowIncomingModal(false);
    //     }, 300);
    // };


    // Khởi tạo cuộc gọi mới - hàm này sẽ truyền xuống các component con
    const handleStartCall = (conversationId, name, avatar) => {
        console.log('handleStartCall được gọi với:', { conversationId, name, avatar });

        // Kiểm tra conversationId hợp lệ
        if (!conversationId) {
            console.error('Không thể bắt đầu cuộc gọi: ID cuộc trò chuyện không xác định');
            message.error('Không thể bắt đầu cuộc gọi, vui lòng thử lại');
            return;
        }

        // Nếu đang có cuộc gọi, không cho phép bắt đầu cuộc gọi mới
        if (isAudioCallOpen || showIncomingModal) {
            console.log('Đang có cuộc gọi khác, không thể bắt đầu cuộc gọi mới');
            return;
        }

        // Reset các state
        setRejectMessage('');
        setAcceptCall(false);
        setShowIncomingModal(false); // Đảm bảo modal incoming không hiện

        // Lưu thông tin người/nhóm được gọi
        setCallInfo({
            name,
            avatar,
            conversationId
        });

        // Khởi tạo thông tin người gọi
        const fromUser = {
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
        };

        const toUser = {
            name,
            avatar,
        };

        console.log(`Bắt đầu cuộc gọi đến ${name} (conversationId: ${conversationId})`);

        // Gửi sự kiện gọi qua socket
        socket.emit('call-user', {
            conversationId,
            fromUser,
            toUser
        });

        // Hiển thị modal cuộc gọi đi
        setIsAudioCallOpen(true);
        setPlayRingtone(false); // Không phát âm thanh ringtone ở phía người gọi
    };
    useWindowUnloadEffect(async () => {
        async function leaveApp() {
            socket.emit('leave', user._id);
            await sleep(2000);
        }

        await leaveApp();
    }, true);

    useEffect(() => {
        socket.on('accept-friend', (value) => {
            dispatch(setNewFriend(value));
            dispatch(setMyRequestFriend(value._id));
        });

        // Enhanced logging for socket connection events
        socket.on('connect', () => {
            console.log('Socket connected with ID:', socket.id);

            // Re-join rooms after reconnection to ensure notifications work
            if (user && user._id) {
                console.log('Re-joining user room after reconnect:', user._id);
                socket.emit('join', user._id);
            }
        }); socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        // Remove any existing call-related listeners to prevent duplicates
        socket.off('incoming-call');
        socket.off('start-call');
        socket.off('call-rejected');
        socket.off('end-call');

        // Lắng nghe sự kiện có cuộc gọi đến
        socket.on('incoming-call', (data) => {
            console.log('[INCOMING CALL] Received:', data);
            console.log('[INCOMING CALL] isVideo:', data.isVideo);

            // Kiểm tra dữ liệu hợp lệ
            if (!data || !data.conversationId) {
                console.error('Nhận cuộc gọi đến không hợp lệ - thiếu conversationId:', data);
                return;
            }

            // Kiểm tra xem có phải người gọi không
            const isCurrentUserCaller = data.fromUser && data.fromUser._id === user._id;
            if (isCurrentUserCaller) {
                console.log('[INCOMING CALL] Bỏ qua vì đây là người gọi');
                return;
            }

            // Kiểm tra có cuộc gọi khác không
            if (isAudioCallOpen || showIncomingModal || videoCallVisible) {
                console.log('[INCOMING CALL] Từ chối vì đang có cuộc gọi khác');
                socket.emit('reject-call', {
                    conversationId: data.conversationId,
                    fromUser: {
                        _id: user._id,
                        name: user.name,
                        avatar: user.avatar,
                    }
                });
                return;
            }

            // QUAN TRỌNG: Lưu thông tin cuộc gọi đến state
            console.log('[INCOMING CALL] Hiển thị modal thông báo cho người dùng');

            // Lưu thông tin cuộc gọi vào state
            setIncomingCall({
                ...data,
                isVideo: !!data.isVideo // Đảm bảo là boolean
            });

            // Phát chuông
            soundManager.play('ringtone', { loop: true });

            // Hiển thị modal thông báo
            setShowIncomingModal(true);
            setAcceptCall(false);
            setRejectMessage('');
            setPlayRingtone(true);

            // Nếu là cuộc gọi video, chuẩn bị dữ liệu cho modal video
            if (data.isVideo) {
                setVideoCallData({
                    conversationId: data.conversationId,
                    remoteUserId: data.fromUser._id,
                    name: data.fromUser.name,
                    avatar: data.fromUser.avatar,
                    acceptCall: false,
                    playRingtone: false,
                    rejectMessage: ''
                });
            }
        });
        // socket.on('incoming-call', (data) => {
        //     console.log('Incoming call data:', data);

        //     // Kiểm tra dữ liệu hợp lệ
        //     if (!data || !data.conversationId) {
        //         console.error('Nhận cuộc gọi đến không hợp lệ - thiếu conversationId:', data);
        //         return;
        //     }

        //     // Kiểm tra kỹ xem người dùng hiện tại có phải là người gọi không
        //     const isCurrentUserCaller = data.fromUser && data.fromUser._id === user._id;

        //     if (isCurrentUserCaller) {
        //         console.log('Cuộc gọi do người dùng hiện tại tạo, không hiển thị modal incoming');
        //         return; // Dừng xử lý, không hiển thị modal cuộc gọi đến cho người gọi
        //     }

        //     // Nếu đang có cuộc gọi khác, từ chối cuộc gọi mới
        //     if (isAudioCallOpen || showIncomingModal) {
        //         console.log('Đang có cuộc gọi khác, từ chối cuộc gọi mới');
        //         socket.emit('reject-call', {
        //             conversationId: data.conversationId,
        //             fromUser: {
        //                 _id: user._id,
        //                 name: user.name,
        //                 avatar: user.avatar,
        //             }
        //         });
        //         return;
        //     }

        //     // Lưu thông tin cuộc gọi và hiển thị modal cuộc gọi đến
        //     setIncomingCall(data);
        //     setShowIncomingModal(true);
        //     setAcceptCall(false);
        //     setRejectMessage('');
        //     setPlayRingtone(true);

        //     console.log('Modal cuộc gọi đến được hiển thị với showIncomingModal =', true);

        //     // Hiển thị notification trình duyệt nếu có quyền
        //     if ("Notification" in window) {
        //         if (Notification.permission === "granted") {
        //             const notification = new Notification("Cuộc gọi từ " + (data.fromUser?.name || "Người dùng"), {
        //                 body: "Nhấp vào đây để trả lời",
        //                 icon: data.fromUser?.avatar || "/Talko.png"
        //             });
        //             notification.onclick = function () {
        //                 window.focus();
        //             };
        //         } else if (Notification.permission !== "denied") {
        //             Notification.requestPermission();
        //         }
        //     } console.log("Phát âm thanh ringtone cho người nhận cuộc gọi");

        //     // Kiểm tra xem audio đã được unlock chưa
        //     const isAudioUnlocked = sessionStorage.getItem('audioUnlocked') === 'true';

        //     if (!isAudioUnlocked) {
        //         console.log('Hiển thị màn hình unlock audio vì audio chưa được unlock');
        //         setShowUnlockAudio(true);
        //     }

        //     // Kết hợp nhiều cách phát âm thanh để đảm bảo ít nhất một cách hoạt động
        //     // Tạo biến để theo dõi interval ID
        //     let ringCheckIntervalId = null;

        //     // 1. Phát trực tiếp thông qua soundManager - phương thức chính
        //     try {
        //         const played = soundManager.play('ringtone', { force: isAudioUnlocked });
        //         console.log('Kết quả phát âm thanh ringtone qua soundManager:', played);

        //         // Thiết lập phát lại định kỳ nếu bị gián đoạn
        //         ringCheckIntervalId = setInterval(() => {
        //             // Nếu modal đã đóng hoặc cuộc gọi đã được chấp nhận, dừng interval và âm thanh
        //             if (!showIncomingModal || acceptCall) {
        //                 clearInterval(ringCheckIntervalId);
        //                 stopAllSounds();
        //                 console.log('Dừng phát ringtone vì', !showIncomingModal ? 'modal đã đóng' : 'cuộc gọi đã được chấp nhận');
        //                 return;
        //             }

        //             try {
        //                 const ringtoneSound = soundManager.sounds.ringtone;
        //                 if (ringtoneSound && ringtoneSound.instance &&
        //                     (ringtoneSound.instance.paused || ringtoneSound.instance.ended)) {
        //                     console.log('Phát lại ringtone (đã bị gián đoạn)');
        //                     soundManager.play('ringtone');
        //                 }
        //             } catch (err) {
        //                 console.error('Lỗi khi kiểm tra trạng thái ringtone:', err);
        //             }
        //         }, 2000);

        //         // Lưu ID của interval để có thể xóa trong các event handler khác
        //         window.currentRingInterval = ringCheckIntervalId;
        //     } catch (err) {
        //         console.error('Lỗi khi phát âm thanh qua soundManager:', err);
        //     }

        //     // 2. Phát qua notificationSound như phương án dự phòng
        //     // notificationSound.play({ volume: 0.8, force: true })
        //     //     .then(played => {
        //     //         if (played) {
        //     //             console.log('Đã phát âm thanh thông báo cuộc gọi qua notificationSound');
        //     //         } else {                        console.log('Không thể phát âm thanh tự động qua notificationSound');

        //     //             // 3. Phát khi có tương tác người dùng nếu cả hai cách trên đều thất bại
        //     //             function playOnClick() {
        //     //                 try {
        //     //                     soundManager.play('ringtone');
        //     //                     notificationSound.play({ volume: 0.8, force: true });
        //     //                     console.log('Đã phát âm thanh sau khi người dùng tương tác');
        //     //                 } catch (err) {
        //     //                     console.error('Lỗi khi phát âm thanh sau tương tác:', err);
        //     //                 }
        //     //                 document.removeEventListener('click', playOnClick);
        //     //             }

        //     //             // Lưu reference vào window để có thể xóa từ các lệnh khác
        //     //             window.currentPlayOnClickHandler = playOnClick;
        //     //             document.addEventListener('click', playOnClick, { once: true });
        //     //         }
        //     //     });
        // });

        // Lắng nghe sự kiện bắt đầu cuộc gọi (khi có người chấp nhận)
        socket.on('start-call', (data) => {
            console.log('Cuộc gọi được chấp nhận:', data, 'isVideo:', data.isVideo);

            // Dừng tất cả âm thanh đang phát
            stopAllSounds();

            // Cập nhật trạng thái
            setAcceptCall(true);
            setPlayRingtone(false);
            setRejectMessage('');
            setShowIncomingModal(false);

            // Sử dụng cờ isVideo để quyết định hiển thị modal nào
            if (data.isVideo) {
                console.log('Mở modal video call vì đây là cuộc gọi video');

                // Cập nhật thông tin cho modal video
                setVideoCallData({
                    conversationId: data.conversationId,
                    remoteUserId: data.fromUser._id,
                    name: data.fromUser.name,
                    avatar: data.fromUser.avatar || callInfo?.avatar,
                    acceptCall: true,
                    playRingtone: false,
                    rejectMessage: ''
                });

                // Hiển thị modal video call và đảm bảo modal audio call KHÔNG mở
                setVideoCallVisible(true);
                setIsAudioCallOpen(false);
            } else {
                console.log('Mở modal audio call vì đây là cuộc gọi thoại');
                // Hiển thị modal audio call và đảm bảo modal video call KHÔNG mở
                setIsAudioCallOpen(true);
                setVideoCallVisible(false);
            }
        });
        // socket.on('start-call', (data) => {
        //     console.log('Cuộc gọi được chấp nhận:', data);

        //     // Dừng tất cả âm thanh đang phát
        //     stopAllSounds();
        //     console.log('Đã dừng tất cả âm thanh trong sự kiện start-call');

        //     // Cập nhật trạng thái hiển thị modal
        //     setAcceptCall(true);      // Đánh dấu cuộc gọi đã được chấp nhận
        //     setPlayRingtone(false);   // Dừng âm thanh ringtone trước tiên 
        //     setRejectMessage('');     // Xóa thông báo từ chối
        //     setShowIncomingModal(false); // Đảm bảo đóng modal cuộc gọi đến nếu đang mở
        //     // Đợi một chút để đảm bảo state đã được cập nhật
        //     setTimeout(() => {
        //         setIsAudioCallOpen(true); // Hiển thị modal cuộc gọi

        //         // Dừng âm thanh một lần nữa để đảm bảo
        //         stopAllSounds();
        //     }, 100);
        // });   

        // Lắng nghe sự kiện bị từ chối cuộc gọi
        socket.on('call-rejected', (data) => {
            console.log('Cuộc gọi bị từ chối:', data);

            // Ngay lập tức dừng tất cả âm thanh và interval
            stopAllSounds();

            // Cập nhật trạng thái
            setShowIncomingModal(false); // Đóng modal cuộc gọi đến nếu đang mở
            setRejectMessage('Cuộc gọi đã bị từ chối'); // Hiển thị thông báo từ chối
            setIsAudioCallOpen(true); // Giữ modal cuộc gọi mở để hiển thị thông báo
            setPlayRingtone(false); // Dừng âm thanh ringtone

            // Tự động đóng sau 2 giây
            setTimeout(() => {
                setRejectMessage('');
                setAcceptCall(false);
                setIsAudioCallOpen(false);
                setIncomingCall(null);
                setCallInfo(null);
            }, 2000);
        });        // Lắng nghe sự kiện kết thúc cuộc gọi
        socket.on('end-call', (data) => {
            console.log('Cuộc gọi kết thúc:', data);

            // Ngay lập tức dừng tất cả âm thanh và interval
            stopAllSounds();

            // Hiển thị thông báo kết thúc cuộc gọi
            setRejectMessage('Đã kết thúc cuộc gọi');
            setPlayRingtone(false);
            setShowIncomingModal(false);

            // Nếu modal cuộc gọi chưa mở, mở nó để hiển thị thông báo
            if (!isAudioCallOpen) {
                setIsAudioCallOpen(true);
            }

            // Tự động đóng và reset trạng thái sau 2 giây
            setTimeout(() => {
                setRejectMessage('');
                setAcceptCall(false);
                setIsAudioCallOpen(false);
                setIncomingCall(null);
                setCallInfo(null);
            }, 2000);
        });

        socket.on('send-friend-invite', (value) => {
            dispatch(setNewRequestFriend(value));
            dispatch(setAmountNotify(amountNotify + 1));
        });

        // xóa lời mời kết bạn
        socket.on('deleted-friend-invite', (_id) => {
            dispatch(updateMyRequestFriend(_id));
        });

        //  xóa gởi lời mời kết bạn cho người khác
        socket.on('deleted-invite-was-send', (_id) => {
            dispatch(updateRequestFriends(_id));
        });

        // xóa kết bạn
        socket.on('deleted-friend', (_id) => {
            dispatch(updateFriend(_id));
            dispatch(updateFriendChat(_id));
        });
        // revokeToken

        socket.on('revoke-token', ({ key }) => {
            if (codeRevokeRef.current !== key) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.reload();
            }
        }); dispatch(setJoinFriendLayout(true))
    }, [user, navigate]);

    const handleSetCodeRevoke = (code) => {
        setCodeRevoke(code);
        codeRevokeRef.current = code;
    };
    // Hàm unlock audio khi người dùng click
    const handleUnlockAudio = async () => {
        try {
            // Phát một âm thanh ngắn để mở khóa
            const audio = new Audio();
            audio.volume = 0.01; // Âm lượng rất nhỏ
            await audio.play();

            // Cập nhật trạng thái
            setAudioUnlocked(true);
            setShowUnlockAudio(false);

            // Lưu trạng thái vào sessionStorage và soundManager
            sessionStorage.setItem('audioUnlocked', 'true');
            soundManager.setAudioUnlocked(true);

            console.log('Đã mở khóa âm thanh thành công');

            // Nếu đang có cuộc gọi đến, thử phát ringtone
            if (showIncomingModal && incomingCall) {
                soundManager.play('ringtone', { force: true });
            }
        } catch (error) {
            console.error('Không thể mở khóa âm thanh:', error);
            // Vẫn đánh dấu là đã mở khóa dù không thành công
            // vì người dùng đã thực hiện tương tác
            setAudioUnlocked(true);
            setShowUnlockAudio(false);
            sessionStorage.setItem('audioUnlocked', 'true');
            soundManager.setAudioUnlocked(true);
        }
    };

    // Hàm xử lý tương tác người dùng để unlock audio
    const handleUserInteraction = async () => {
        try {
            // Tạo audio context mới để mở khóa âm thanh
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Tạo một oscillator ngắn để kích hoạt audio
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(0, audioContext.currentTime); // Tần số 0 để không nghe thấy
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.001);

            // Cập nhật trạng thái
            setAudioUnlocked(true);
            sessionStorage.setItem('audioUnlocked', 'true');
            setShowUnlockAudio(false);
            soundManager.setAudioUnlocked(true);

            console.log('Audio đã được mở khóa thành công bằng tương tác người dùng');

            // Phát âm thanh thông báo cuộc gọi đến ngay lập tức
            if (incomingCall) {
                try {
                    console.log('Phát ringtone sau khi mở khóa audio');
                    // Phát với force=true và loop=true để đảm bảo tiếp tục phát
                    soundManager.play('ringtone', { force: true, loop: true });

                    // Thêm phương án dự phòng
                    setTimeout(() => {
                        if (incomingCall && showIncomingModal) {
                            soundManager.play('ringtone', { force: true, loop: true });
                        }
                    }, 500);
                } catch (err) {
                    console.error('Lỗi khi phát ringtone sau khi mở khóa:', err);
                }
            }
        } catch (error) {
            console.error('Lỗi khi mở khóa âm thanh:', error);

            // Vẫn đánh dấu là đã mở khóa dù lỗi, để người dùng có thể thử lại
            setAudioUnlocked(true);
            sessionStorage.setItem('audioUnlocked', 'true');
            setShowUnlockAudio(false);
            soundManager.setAudioUnlocked(true);

            // Thử phát âm thanh ngay cả khi có lỗi
            if (incomingCall) {
                soundManager.play('ringtone', { force: true, loop: true });
            }
        }
    };

    // Hàm xử lý khi nút gọi video được nhấn
    const handleStartVideoCall = (conversationId, name, avatar) => {
        console.log('Khởi tạo cuộc gọi video với conversation ID:', conversationId);

        // Kiểm tra conversationId hợp lệ
        if (!conversationId) {
            console.error('Không thể bắt đầu cuộc gọi video: ID cuộc trò chuyện không xác định');
            message.error('Không thể bắt đầu cuộc gọi, vui lòng thử lại');
            return;
        }

        // Nếu đang có cuộc gọi, không cho phép bắt đầu cuộc gọi mới
        if (isAudioCallOpen || showIncomingModal || videoCallVisible) {
            console.log('Đang có cuộc gọi khác, không thể bắt đầu cuộc gọi video mới');
            return;
        }

        // Lấy thông tin người nhận từ conversation
        const otherUser = getOtherUserInConversation(conversationId);

        // Thiết lập dữ liệu cho cuộc gọi video
        setVideoCallData({
            conversationId,
            remoteUserId: otherUser?._id,
            name: name || otherUser?.name,
            avatar: avatar || otherUser?.avatar,
            acceptCall: false,  // Người gọi
            playRingtone: true,
            rejectMessage: ''
        });

        // Hiển thị modal gọi video
        setVideoCallVisible(true);

        // Thông báo cho người nhận về cuộc gọi video - ĐẢM BẢO isVideo: true
        console.log('Gửi socket event "call-user" với isVideo:true');
        socket.emit('call-user', {
            conversationId,
            fromUser: {
                _id: user._id,
                name: user.name,
                avatar: user.avatar
            },
            toUser: otherUser,
            isVideo: true  // KIỂM TRA tham số này khi debug
        });
    };


    // Hàm để lấy thông tin người dùng khác trong cuộc trò chuyện 1-1
    const getOtherUserInConversation = (conversationId) => {
        if (!conversationId || !conversations || !user) return null;

        // Tìm cuộc trò chuyện trong danh sách
        const conversation = conversations.find(conv => conv._id === conversationId);
        if (!conversation) return null;

        // Nếu là cuộc trò chuyện nhóm, không xác định được người dùng cụ thể
        if (conversation.type === 1) { // Giả sử type 0 là 1-1, type 1 là nhóm
            return {
                _id: conversationId, // Trả về ID conversation làm ID người nhận trong trường hợp nhóm
                name: conversation.name,
                avatar: conversation.avatar
            };
        }

        // Nếu là 1-1, tìm người còn lại
        if (conversation.members && conversation.members.length > 0) {
            // Lọc ra thành viên không phải người dùng hiện tại
            const otherMember = conversation.members.find(
                member => member._id !== user._id
            );

            if (otherMember) {
                return {
                    _id: otherMember._id,
                    name: otherMember.name || conversation.name,
                    avatar: otherMember.avatar || conversation.avatar
                };
            }
        }

        // Nếu không tìm thấy, trả về thông tin từ conversation
        return {
            _id: null,
            name: conversation.name,
            avatar: conversation.avatar
        };
    };

    return (
        <div>
            <Row gutter={[0, 0]}>
                <Col
                    span={1}
                    xl={{ span: 1 }}
                    lg={{ span: 1 }}
                    md={{ span: 2 }}
                    sm={{ span: 3 }}
                    xs={{ span: 4 }}
                >
                    <NavbarContainer onSaveCodeRevoke={handleSetCodeRevoke} />
                </Col>

                <Col
                    span={23}
                    xl={{ span: 23 }}
                    lg={{ span: 23 }}
                    md={{ span: 22 }}
                    sm={{ span: 21 }}
                    xs={{ span: 20 }}
                >
                    <Routes>
                        <Route
                            path=""
                            element={
                                <Chat
                                    socket={socket}
                                    authed={true}
                                    idNewMessage={idNewMessage}
                                    onStartCall={handleStartCall} // Truyền hàm bắt đầu gọi xuống
                                    onStartVideoCall={handleStartVideoCall} // Truyền hàm bắt đầu gọi video xuống
                                />
                            }
                        />
                        <Route path="friends" element={<Friend socket={socket} authed={true} />} />
                        <Route path="*" element={<NotFoundPage />} />                    </Routes>
                </Col>
            </Row>

            {/* Video Call Modal */}
            {videoCallVisible && (
                <ModalVideoCall
                    open={videoCallVisible}
                    onClose={() => {
                        setVideoCallVisible(false);
                        handleEndCall();
                    }}
                    avatar={videoCallData.avatar}
                    name={videoCallData.name}
                    isLogin={!!user}
                    rejectMessage={videoCallData.rejectMessage}
                    acceptCall={videoCallData.acceptCall}
                    playRingtone={videoCallData.playRingtone}
                    conversationId={videoCallData.conversationId}
                    remoteUserId={videoCallData.remoteUserId}
                    userId={user?._id}
                    socket={socket}
                />
            )}
            {/* Modal xử lý cuộc gọi đến - chỉ hiển thị khi có cuộc gọi đến */}
            {showIncomingModal && incomingCall && (
                <ModalIncomingCall
                    key={`incoming-call-${incomingCall.conversationId}-${Date.now()}`}
                    open={showIncomingModal}
                    fromUser={incomingCall.fromUser}
                    onAccept={handleAcceptCall}
                    onReject={handleRejectCall}
                    rejectMessage={rejectMessage}
                    isLogin={false}
                    acceptCall={acceptCall}
                    playRingtone={audioUnlocked && playRingtone}
                    conversationId={incomingCall.conversationId}
                    userId={user._id}
                    isVideo={incomingCall.isVideo}
                />
            )}

            {/* Modal xử lý cuộc gọi đi hoặc đã kết nối - hiển thị khi gọi hoặc đã kết nối */}
            {isAudioCallOpen && (
                <ModalAudioCall
                    open={isAudioCallOpen}
                    onClose={handleEndCall}
                    avatar={callInfo?.avatar || incomingCall?.fromUser?.avatar}
                    name={callInfo?.name || incomingCall?.fromUser?.name}
                    isLogin={true}
                    acceptCall={acceptCall}
                    rejectMessage={rejectMessage}
                    // Chỉ phát ringtone khi gọi đi và không có modal cuộc gọi đến
                    playRingtone={audioUnlocked && playRingtone && !showIncomingModal}
                    conversationId={callInfo?.conversationId || incomingCall?.conversationId}
                    userId={user._id}
                    remoteUserId={incomingCall?.fromUser?._id}
                    socket={socket}
                />
            )}
        </div>
    );
}
export default ChatLayout;