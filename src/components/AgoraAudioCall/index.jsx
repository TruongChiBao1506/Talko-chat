import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import AgoraRTC from "agora-rtc-sdk-ng";
import { APP_ID, fetchToken } from '../../utils/agoraConfig';
import socket from '../../utils/socketClient';
import './style.css';
import { AudioMutedOutlined, AudioOutlined, PhoneOutlined } from '@ant-design/icons';

const AgoraAudioCall = forwardRef(({
    channelName,
    token = null,
    uid = null,
    onEndCall,
    currentUser = {},
    conversation = {},
    isRejected = false,
    rejectionMessage = '',
    onCallEnded = null,
}, ref) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [client, setClient] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callEnded, setCallEnded] = useState(false);
    const [endCallMessage, setEndCallMessage] = useState('');
    const [groupParticipants, setGroupParticipants] = useState([]);

    const joinInProgress = useRef(false);
    const localAudioTrackRef = useRef(null);
    const clientRef = useRef(null);
    const cleanupInProgress = useRef(false);
    const callDurationTimerRef = useRef(null);
    const isComponentMounted = useRef(true);

    // NEW: Determine if this is a group call
    const isGroupCall = conversation.type === true || conversation.totalMembers > 2;

    useImperativeHandle(ref, () => ({
        cleanup: forceCleanup,
        getCallDuration: () => callDuration,
        getEndCallMessage: () => endCallMessage,
        getRemoteUsers: () => remoteUsers,
        // NEW: Get group participants
        getGroupParticipants: () => groupParticipants,
        hasRemoteUsers: () => remoteUsers.length > 0,
        // NEW: Get total participants count
        getTotalParticipants: () => {
            if (isGroupCall) {
                return groupParticipants.length; // Includes current user from socket
            }
            return remoteUsers.length + 1; // +1 for current user
        }
    }));

    const safeAudioTrackOperation = async (track, operation, operationName) => {
        if (!track) {
            console.log(`❌ ${operationName}: Track is null/undefined`);
            return false;
        }

        try {
            switch (operation) {
                case 'setEnabled':
                    if (typeof track.setEnabled === 'function') {
                        track.setEnabled(false);
                        console.log(`✅ ${operationName}: setEnabled(false) success`);
                    }
                    break;
                case 'stop':
                    if (typeof track.stop === 'function') {
                        await track.stop();
                        console.log(`✅ ${operationName}: stop() success`);
                    }
                    break;
                case 'close':
                    if (typeof track.close === 'function') {
                        track.close();
                        console.log(`✅ ${operationName}: close() success`);
                    }
                    break;
            }
            return true;
        } catch (error) {
            console.warn(`⚠️ ${operationName} error:`, error.message);
            return false;
        }
    };

    const forceCleanup = async () => {
        if (cleanupInProgress.current) {
            console.log('🔄 Cleanup already in progress, skipping');
            return;
        }

        cleanupInProgress.current = true;
        console.log('🧹 Force cleanup initiated');

        try {
            if (callDurationTimerRef.current) {
                clearInterval(callDurationTimerRef.current);
                callDurationTimerRef.current = null;
                console.log('⏹️ Call duration timer stopped');
            }

            if (localAudioTrackRef.current) {
                console.log('🎙️ Cleaning up local audio track');
                const track = localAudioTrackRef.current;

                await safeAudioTrackOperation(track, 'setEnabled', 'Local track setEnabled');
                await safeAudioTrackOperation(track, 'stop', 'Local track stop');
                await safeAudioTrackOperation(track, 'close', 'Local track close');

                localAudioTrackRef.current = null;
            }

            if (remoteUsers && remoteUsers.length > 0) {
                console.log('🔊 Cleaning up remote audio tracks');
                for (const user of remoteUsers) {
                    if (user.audioTrack) {
                        await safeAudioTrackOperation(user.audioTrack, 'stop', `Remote track ${user.uid} stop`);
                    }
                }
            }

            if (clientRef.current) {
                console.log('📴 Cleaning up Agora client');
                try {
                    const client = clientRef.current;

                    if (client && typeof client.removeAllListeners === 'function') {
                        client.removeAllListeners();
                        console.log('📴 Removed all client listeners');
                    }

                    if (client && client.connectionState &&
                        (client.connectionState === 'CONNECTED' ||
                            client.connectionState === 'CONNECTING')) {
                        await client.leave();
                        console.log('📴 Left Agora channel successfully');
                    }

                } catch (err) {
                    console.warn('⚠️ Error during client cleanup:', err.message);
                } finally {
                    clientRef.current = null;
                }
            }

            if (isComponentMounted.current) {
                setLocalStream(null);
                setRemoteUsers([]);
                setClient(null);
                setIsMuted(false);
                setCallEnded(false);
            }

            console.log('✅ Force cleanup completed successfully');

        } catch (error) {
            console.error('❌ Error during force cleanup:', error);
        } finally {
            cleanupInProgress.current = false;
        }
    };

    useEffect(() => {
        if (isRejected && isComponentMounted.current) {
            console.log('❌ Call rejected - IMMEDIATE cleanup in AgoraAudioCall');

            if (callDurationTimerRef.current) {
                clearInterval(callDurationTimerRef.current);
                callDurationTimerRef.current = null;
            }

            forceCleanup().then(() => {
                if (isComponentMounted.current && onCallEnded) {
                    onCallEnded({
                        isRejected: true,
                        message: rejectionMessage || 'Cuộc gọi đã bị từ chối',
                        duration: callDuration
                    });
                }
            });
        }
    }, [isRejected]);

    useEffect(() => {
        isComponentMounted.current = true;
        const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(rtcClient);
        clientRef.current = rtcClient;

        return () => {
            console.log('🔄 Component unmounting - running cleanup');
            isComponentMounted.current = false;

            if (callDurationTimerRef.current) {
                clearInterval(callDurationTimerRef.current);
                callDurationTimerRef.current = null;
            }

            forceCleanup();
        };
    }, []);

    useEffect(() => {
        if (!client || !isComponentMounted.current) return;

        const setupCall = async () => {
            if (joinInProgress.current) {
                console.log('⚠️ Join đã đang trong tiến trình, bỏ qua');
                return;
            }

            joinInProgress.current = true;

            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('🎤 Đã được cấp quyền microphone');


                const consistentUid = generateConsistentUID(currentUser._id);
                console.log(`🎯 Using consistent UID: ${consistentUid} for user: ${currentUser.name} (${currentUser._id})`);
                // const numericUid = typeof uid === 'string' ? Math.floor(Math.random() * 100000) : uid || null;
                await client.join(APP_ID, channelName, null, consistentUid);
                console.log('📱 Đã tham gia kênh Agora:', channelName, 'với UID:', consistentUid);


                setTimeout(() => {
                    if (conversation._id && isComponentMounted.current) {
                        console.log('🎯 Emitting call-answered after join delay');
                        socket.emit('call-answered-notification', {
                            conversationId: conversation._id,
                            answeredBy: consistentUid,
                            isGroupCall: isGroupCall,
                            userId: currentUser._id
                        });
                    }
                }, 2000);
                // Emit join event for group calls
                if (isGroupCall && conversation._id) {
                    socket.emit('user-joined-agora-channel', {
                        conversationId: conversation._id,
                        userId: currentUser._id,
                        agoraUid: consistentUid,
                        userName: currentUser.name || currentUser.username,
                        userAvatar: currentUser.avatar
                    });
                    console.log('📡 Đã emit user-joined-agora-channel');
                }

                const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack().catch(err => {
                    console.error('Không thể khởi tạo microphone:', err);
                    return null;
                });

                if (!localAudioTrack || !isComponentMounted.current) {
                    console.error('Không có microphone hoặc component đã unmount');
                    return;
                }

                localAudioTrackRef.current = localAudioTrack;

                if (isComponentMounted.current) {
                    setLocalStream({
                        uid: client.uid,
                        audioTrack: localAudioTrack
                    });
                }

                await client.publish([localAudioTrack]);
                console.log('🎙️ Đã publish audio track');

                client.on('user-joined', async (user) => {
                    if (!isComponentMounted.current) return;
                    console.log('👤 Người dùng tham gia kênh:', user.uid);

                    let memberInfo = null;
                    let userName = `User ${user.uid}`;
                    let userAvatar = null;

                    if (isGroupCall && conversation.members && conversation.members.length > 0) {
                        console.log('🔍 Searching for member by UID mapping...');

                        // NEW: Find member by UID mapping
                        memberInfo = findUserByUID(user.uid, conversation.members);

                        if (memberInfo) {
                            userName = memberInfo.name || `Thành viên ${user.uid}`;
                            userAvatar = memberInfo.avatar;
                            console.log(`✅ Found member by UID mapping:`, {
                                name: userName,
                                avatar: !!userAvatar,
                                memberId: memberInfo._id,
                                agoraUid: user.uid
                            });
                        } else {
                            console.log(`❌ No member found for Agora UID: ${user.uid}`);

                            // FALLBACK: Use member index approach
                            const memberIndex = remoteUsers.length;
                            if (memberIndex < conversation.members.length) {
                                memberInfo = conversation.members[memberIndex];
                                userName = memberInfo.name || `Thành viên ${memberIndex + 1}`;
                                userAvatar = memberInfo.avatar;
                                console.log(`🔄 Using fallback member at index ${memberIndex}:`, userName);
                            } else {
                                userName = `Thành viên ${user.uid}`;
                                console.log(`⚠️ Using default name: ${userName}`);
                            }
                        }
                    } else if (!isGroupCall) {
                        // Individual call logic remains the same
                        const otherUserInfo = getOtherUserInfo();
                        userName = otherUserInfo.name || `User ${user.uid}`;
                        userAvatar = otherUserInfo.avatar;
                    } else {
                        console.log('⚠️ No conversation members available');
                        userName = `User ${user.uid}`;
                    }

                    console.log(`👤 Adding remote user: ${userName} (UID: ${user.uid})`);
                    // Emit join event cho TẤT CẢ loại cuộc gọi
                    // if (conversation._id) {
                    //     socket.emit('user-joined-agora-channel', {
                    //         conversationId: conversation._id,
                    //         userId: memberInfo?._id || user.uid,
                    //         agoraUid: user.uid,
                    //         userName: userName,
                    //         userAvatar: userAvatar,
                    //         callType: isGroupCall ? 'group' : 'individual'
                    //     });
                    //     console.log(`📡 Emitted user-joined for ${isGroupCall ? 'group' : 'individual'} call`);
                    // }
                    // THÊM: Emit join event when remote user joins
                    if (isGroupCall && conversation._id) {
                        // Find member info for this user
                        const memberInfo = findUserByUID(user.uid, conversation.members);

                        socket.emit('user-joined-agora-channel', {
                            conversationId: conversation._id,
                            userId: memberInfo?._id || user.uid,
                            agoraUid: user.uid,
                            userName: memberInfo?.name || `User ${user.uid}`,
                            userAvatar: memberInfo?.avatar
                        });
                    }

                    setRemoteUsers(prev => {
                        const existingUser = prev.find(u => u.uid === user.uid);
                        if (!existingUser) {
                            return [...prev, {
                                uid: user.uid,
                                audioTrack: null,
                                hasAudio: false,
                                // NEW: Add member info for group calls
                                name: memberInfo?.name || `User ${user.uid}`,
                                avatar: memberInfo?.avatar || null,
                                memberId: memberInfo?._id || null
                            }];
                        }
                        return prev;
                    });

                });

                client.on('user-published', async (user, mediaType) => {
                    if (!isComponentMounted.current) return;
                    console.log('👤 Người dùng mới tham gia:', user.uid, mediaType);
                    try {
                        await client.subscribe(user, mediaType);

                        if (mediaType === 'audio' && user.audioTrack && isComponentMounted.current) {
                            user.audioTrack.play();

                            // Clear timeout ngay khi có user published audio
                            // if (remoteUsers.length === 0) {
                            //     console.log('🎯 FIRST AUDIO PUBLISHED - Emitting call answered');
                            //     socket.emit('call-answered', {
                            //         conversationId: conversation._id,
                            //         answeredBy: user.uid
                            //     });
                            // }

                            // ✅ CRITICAL: Emit cho TẤT CẢ loại cuộc gọi
                            // const isFirstUser = remoteUsers.length === 0;

                            // if (isFirstUser && conversation._id) {
                            //     console.log('🎯 FIRST AUDIO USER - Clearing timeout via socket event');

                            //     // EMIT BOTH EVENTS để đảm bảo timeout được clear
                            //     socket.emit('call-answered', {
                            //         conversationId: conversation._id,
                            //         answeredBy: user.uid,
                            //         isGroupCall: isGroupCall
                            //     });

                            //     // Emit user-joined cho individual calls
                            //     if (!isGroupCall) {
                            //         socket.emit('user-joined-agora-channel', {
                            //             conversationId: conversation._id,
                            //             userId: currentUser._id,
                            //             agoraUid: user.uid,
                            //             userName: `Individual Call User`,
                            //             userAvatar: null
                            //         });
                            //     }
                            // }

                            setRemoteUsers(prev =>
                                prev.map(u =>
                                    u.uid === user.uid
                                        ? { ...u, audioTrack: user.audioTrack, hasAudio: true }
                                        : u
                                )
                            );
                        }
                    } catch (err) {
                        console.error('Error subscribing to user:', err);
                    }
                });

                client.on('user-unpublished', (user, mediaType) => {
                    if (!isComponentMounted.current) return;
                    console.log('👤 Người dùng unpublish media:', user.uid, mediaType);
                    if (mediaType === 'audio') {
                        setRemoteUsers(prev =>
                            prev.map(u =>
                                u.uid === user.uid
                                    ? { ...u, audioTrack: null, hasAudio: false }
                                    : u
                            )
                        );
                    }
                });

                // UPDATED: Handle user-left differently for group vs individual
                client.on('user-left', (user) => {
                    if (!isComponentMounted.current) return;
                    console.log('👋 Người dùng rời đi:', user.uid);

                    // Emit leave event
                    if (isGroupCall && conversation._id) {
                        const leftUser = remoteUsers.find(u => u.uid === user.uid);
                        socket.emit('user-left-agora-channel', {
                            conversationId: conversation._id,
                            userId: leftUser?.memberId || user.uid,
                            agoraUid: user.uid
                        });
                    }

                    // Remove user from remoteUsers list
                    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));

                    if (isGroupCall) {
                        // GROUP CALL: Just show notification, don't end call
                        const leftUser = remoteUsers.find(u => u.uid === user.uid);
                        const userName = leftUser?.name || `User ${user.uid}`;
                        console.log(`👥 ${userName} đã rời khỏi cuộc gọi nhóm`);

                        // Optionally show a brief notification
                        // message.info(`${userName} đã rời khỏi cuộc gọi`);

                    } else {
                        // INDIVIDUAL CALL: End call when other user leaves
                        const userName = conversation.name || `User ${user.uid}`;
                        const message = `${userName} đã kết thúc cuộc gọi`;
                        setEndCallMessage(message);
                        setCallEnded(true);

                        if (onCallEnded && isComponentMounted.current) {
                            onCallEnded({
                                isEnded: true,
                                message: message,
                                duration: callDuration
                            });
                        }

                        setTimeout(() => {
                            if (isComponentMounted.current) {
                                forceCleanup();
                                if (onEndCall) onEndCall();
                            }
                        }, 2000);
                    }
                });

            } catch (error) {
                console.error('❌ Lỗi khi tham gia kênh Agora Audio:', error);
            } finally {
                joinInProgress.current = false;
            }
        };

        setupCall();

        return () => {
            console.log('🔄 Setup effect cleanup');
            // Cleanup - emit leave when component unmounts
            if (isGroupCall && conversation._id && currentUser._id) {
                socket.emit('user-left-agora-channel', {
                    conversationId: conversation._id,
                    userId: currentUser._id,
                    agoraUid: generateConsistentUID(currentUser._id)
                });
            }
        };
    }, [client, channelName, uid]);

    // Listen for group participants updates
    useEffect(() => {
        if (!isGroupCall || !socket) return;

        socket.on('group-call-participants-updated', (data) => {
            console.log('👥 Group call participants updated:', data);
            const { participants, newParticipant, leftParticipant } = data;

            // Update group participants list
            setGroupParticipants(participants || []);

            if (newParticipant) {
                console.log('👤 New participant joined:', newParticipant.userName);
            }

            if (leftParticipant) {
                console.log('👋 Participant left:', leftParticipant.userId);
            }
        });

        return () => {
            socket.off('group-call-participants-updated');
        };
    }, [isGroupCall, socket]);

    useEffect(() => {
        if (!isComponentMounted.current) return;

        callDurationTimerRef.current = setInterval(() => {
            if (isComponentMounted.current) {
                setCallDuration(prev => prev + 1);
            }
        }, 1000);

        return () => {
            if (callDurationTimerRef.current) {
                clearInterval(callDurationTimerRef.current);
                callDurationTimerRef.current = null;
            }
        };
    }, []);

    // NEW: Get user info based on call type
    const getOtherUserInfo = () => {
        if (!isGroupCall && conversation.totalMembers === 2) {
            // Individual conversation logic
            if (conversation.userId && conversation.userId !== currentUser._id) {
                return {
                    name: conversation.name,
                    avatar: conversation.avatar
                };
            }

            if (conversation.members && conversation.members.length > 0) {
                const otherMember = conversation.members.find(member =>
                    member._id !== currentUser._id
                );
                if (otherMember) {
                    return {
                        name: otherMember.name,
                        avatar: otherMember.avatar
                    };
                }
            }

            return {
                name: conversation.name,
                avatar: conversation.avatar
            };
        }

        // Group conversation
        return {
            name: conversation.name,
            avatar: conversation.avatar
        };
    };

    const generateConsistentUID = (userId) => {
        if (!userId) return Math.floor(Math.random() * 100000);

        // Convert MongoDB ObjectId to consistent number
        let hash = 0;
        const userIdStr = userId.toString();

        for (let i = 0; i < userIdStr.length; i++) {
            const char = userIdStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        // Ensure positive number within Agora's UID range (1 to 2^32 - 1)
        const consistentUid = Math.abs(hash) % 999999999 + 1;

        console.log(`🎯 Generated consistent UID: ${consistentUid} for user: ${userId}`);
        return consistentUid;
    };

    const findUserByUID = (targetUid, members) => {
        if (!members || !Array.isArray(members)) return null;

        // Try to find member whose generated UID matches targetUid
        for (const member of members) {
            const memberUid = generateConsistentUID(member._id);
            if (memberUid === targetUid) {
                console.log(`✅ Found member by UID mapping:`, {
                    member: member.name,
                    memberId: member._id,
                    generatedUid: memberUid,
                    targetUid
                });
                return member;
            }
        }

        console.log(`❌ No member found for UID: ${targetUid}`);
        return null;
    };

    const formatCallDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // const getUserAvatar = (user) => {
    //     if (user.avatar) {
    //         return typeof user.avatar === 'string' ? user.avatar : user.avatar[0];
    //     }
    //     return null;
    // };
    const getUserAvatar = (user) => {
        if (!user) return null;

        // Handle participant object from socket
        if (user.userAvatar) {
            return typeof user.userAvatar === 'string' ? user.userAvatar : user.userAvatar[0];
        }

        // Handle user object from conversation
        if (user.avatar) {
            return typeof user.avatar === 'string' ? user.avatar : user.avatar[0];
        }

        return null;
    };

    const getAvatarFromName = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    const handleToggleMute = () => {
        if (!isComponentMounted.current) return;

        if (localStream && localStream.audioTrack && localAudioTrackRef.current) {
            try {
                const track = localAudioTrackRef.current;
                const newMuteState = !isMuted;

                if (track && typeof track.setEnabled === 'function') {
                    track.setEnabled(!newMuteState);
                    setIsMuted(newMuteState);
                    console.log(`🎤 Mute toggled: ${newMuteState ? 'muted' : 'unmuted'}`);
                }
            } catch (err) {
                console.warn('⚠️ Error toggling mute:', err.message);
            }
        }
    };

    const handleEndCall = async () => {
        if (!isComponentMounted.current) return;

        console.log('🔚 End call button clicked');

        // Send cancel signal if no one has joined yet
        if (remoteUsers.length === 0 && conversation._id) {
            socket.emit('cancel-voice-call', {
                conversationId: conversation._id,
                callerInfo: {
                    userId: currentUser._id,
                    name: currentUser.name || currentUser.username
                }
            });
            console.log('🚫 Đã gửi cancel-voice-call từ AgoraAudioCall');
        }

        const message = isGroupCall
            ? 'Bạn đã rời khỏi cuộc gọi nhóm'
            : 'Bạn đã kết thúc cuộc gọi';
        setEndCallMessage(message);

        if (onCallEnded && isComponentMounted.current) {
            onCallEnded({
                isEnded: true,
                message: message,
                duration: callDuration,
                endedByUser: true
            });
        }

        await forceCleanup();
        if (onEndCall && isComponentMounted.current) onEndCall();
    };

    // NEW: Render different UI for group vs individual calls
    const renderUsersDisplay = () => {
        if (isGroupCall) {
            // GROUP CALL: Show ALL participants (from socket + current user)

            // Combine current user + group participants
            const allParticipants = [
                // Current user always first
                {
                    userId: currentUser._id,
                    agoraUid: generateConsistentUID(currentUser._id),
                    userName: currentUser.name || 'Bạn',
                    userAvatar: currentUser.avatar,
                    isCurrentUser: true,
                    hasAudio: !isMuted
                },
                // Add group participants from socket
                ...groupParticipants
                    .filter(p => p.userId !== currentUser._id) // Exclude current user to avoid duplicate
                    .map(participant => {
                        // Find corresponding remote user for audio status
                        const remoteUser = remoteUsers.find(r => r.uid === participant.agoraUid);

                        return {
                            userId: participant.userId,
                            agoraUid: participant.agoraUid,
                            userName: participant.userName,
                            userAvatar: participant.userAvatar,
                            isCurrentUser: false,
                            hasAudio: remoteUser?.hasAudio || false,
                            audioTrack: remoteUser?.audioTrack || null
                        };
                    })
            ];

            return (
                <div className="group-audio-users">
                    <div className="group-call-title">
                        <h3>{conversation.name}</h3>
                        <span className="participants-count">
                            {allParticipants.length} người tham gia
                        </span>
                    </div>

                    <div className="audio-users-grid">
                        {allParticipants.map(participant => (
                            <div
                                key={participant.userId}
                                className={`audio-user-item ${participant.isCurrentUser ? 'current-user' : ''}`}
                            >
                                <div className={`audio-avatar ${participant.isCurrentUser
                                    ? (isMuted ? 'muted' : 'speaking')
                                    : (participant.hasAudio ? 'speaking' : 'not-speaking')
                                    }`}>
                                    {getUserAvatar(participant) ? (
                                        <img
                                            src={getUserAvatar(participant)}
                                            alt={participant.userName}
                                            className="avatar-image"
                                        />
                                    ) : (
                                        <span className="avatar-text">
                                            {getAvatarFromName(participant.userName)}
                                        </span>
                                    )}

                                    {/* Mute indicator */}
                                    {(participant.isCurrentUser && isMuted) ||
                                        (!participant.isCurrentUser && !participant.hasAudio) ? (
                                        <div className="mute-indicator">
                                            <AudioMutedOutlined />
                                        </div>
                                    ) : null}
                                </div>
                                <div className="user-name">
                                    {participant.isCurrentUser ? 'Bạn' : participant.userName}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        } else {
            // INDIVIDUAL CALL: Show single user (existing logic)
            const otherUserInfo = getOtherUserInfo();
            const hasRemoteUser = remoteUsers.length > 0;
            const remoteUser = hasRemoteUser ? remoteUsers[0] : null;
            return (
                <div className="individual-audio-users">
                    <div className={`audio-user main-user ${!hasRemoteUser ? 'waiting' : 'connected'}`}>
                        <div className={`audio-avatar large-avatar ${hasRemoteUser ? (remoteUser.hasAudio ? 'speaking' : '') : 'waiting-call'}`}>
                            {getUserAvatar(otherUserInfo) ? (
                                <img
                                    src={getUserAvatar(otherUserInfo)}
                                    alt={otherUserInfo.name || 'Người khác'}
                                    className="avatar-image"
                                />
                            ) : (
                                <span className="avatar-text">
                                    {getAvatarFromName(otherUserInfo.name || 'Người khác')}
                                </span>
                            )}
                        </div>
                        <div className="user-name-label">
                            {otherUserInfo.name || 'Người khác'}
                        </div>
                    </div>

                    <div className="my-mic-status">
                        <div className="mic-indicator">
                            {isMuted ? (
                                <AudioMutedOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
                            ) : (
                                <AudioOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                            )}
                        </div>
                        <span className="mic-label">
                            {isMuted ? 'Mic tắt' : 'Mic bật'}
                        </span>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className={`agora-audio-call-container ${isGroupCall ? 'group-call' : 'individual-call'}`}>
            <div className="call-duration">
                {formatCallDuration(callDuration)}
            </div>

            <div className="audio-users-container">
                {renderUsersDisplay()}
            </div>

            <div className="audio-call-controls">
                <button
                    className={`control-btn mic-btn ${isMuted ? 'muted' : 'active'}`}
                    onClick={handleToggleMute}
                    title={isMuted ? 'Bật microphone' : 'Tắt microphone'}
                >
                    <span className="btn-icon">
                        {isMuted ? (
                            <AudioMutedOutlined style={{ fontSize: '28px' }} />
                        ) : (
                            <AudioOutlined style={{ fontSize: '28px' }} />
                        )}
                    </span>
                    <span className="btn-text">
                        {isMuted ? 'Bật mic' : 'Tắt mic'}
                    </span>
                </button>

                <button
                    className="control-btn end-call-btn"
                    onClick={handleEndCall}
                    title={isGroupCall ? 'Rời khỏi cuộc gọi' : 'Kết thúc cuộc gọi'}
                >
                    <span className="btn-icon">
                        <PhoneOutlined
                            style={{
                                fontSize: '28px',
                                transform: 'rotate(135deg)'
                            }}
                        />
                    </span>
                    <span className="btn-text">
                        {isGroupCall ? 'Rời cuộc gọi' : 'Kết thúc'}
                    </span>
                </button>
            </div>
        </div>
    );
});

export default AgoraAudioCall;