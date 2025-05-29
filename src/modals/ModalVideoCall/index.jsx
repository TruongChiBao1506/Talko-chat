import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect, useMemo } from 'react';
import { Modal, Avatar, Button, Space } from 'antd';
import {
    UserOutlined,
    AppstoreOutlined,
    BorderOutlined,
    TeamOutlined,
    AudioOutlined,
    AudioMutedOutlined,
    VideoCameraOutlined,
    StopOutlined
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import AgoraVideoCall, { RemoteVideoPlayer } from '../../components/AgoraVideoCall';
import { generateChannelId } from '../../utils/agoraConfig';
import './style.css';

const ModalVideoCall = forwardRef((props, ref) => {
    const { isVisible, onCancel, conversation, currentUser, isRejected, rejectionMessage } = props;
    const agoraCallRef = useRef(null);
    const [callStatus, setCallStatus] = useState({
        isEnded: false,
        isRejected: false,
        message: '',
        duration: 0
    });
    const prevVisibleRef = useRef(false);
    const isComponentMounted = useRef(true);
    const isGroupCall = conversation.type === true || conversation.totalMembers > 2;

    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'speaker'
    const [speakerUser, setSpeakerUser] = useState(null);
    const [showParticipantsList, setShowParticipantsList] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);

    const modalTitle = isGroupCall
        ? `Cuộc gọi video nhóm: ${conversation.name} (${remoteUsers.length + 1}/${conversation.totalMembers})`
        : `Cuộc gọi video với ${conversation.name}`;

    useImperativeHandle(ref, () => ({
        cleanup: async () => {
            console.log('🧹 ModalVideoCall cleanup called');
            if (agoraCallRef.current && agoraCallRef.current.cleanup) {
                await agoraCallRef.current.cleanup();
            }
        },
        getRemoteUsers: () => {
            return agoraCallRef.current ? agoraCallRef.current.getRemoteUsers() : [];
        },
        isCallActive: () => {
            return agoraCallRef.current ? agoraCallRef.current.isCallActive() : false;
        }
    }));
    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            if (agoraCallRef.current) {
                const remoteUsersData = agoraCallRef.current.getRemoteUsers() || [];
                const audioMuted = agoraCallRef.current.isAudioMuted?.() || false;
                const videoMuted = agoraCallRef.current.isVideoMuted?.() || false;
                const videoTrack = agoraCallRef.current.getLocalVideoTrack?.() || null;

                setRemoteUsers(remoteUsersData);
                setIsAudioMuted(audioMuted);
                setIsVideoMuted(videoMuted);
                setLocalVideoTrack(videoTrack);

                // Auto-select first speaker for speaker view
                if (viewMode === 'speaker' && !speakerUser && remoteUsersData.length > 0) {
                    setSpeakerUser(remoteUsersData[0]);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isVisible, viewMode, speakerUser]);

    // Track visibility changes like audio call (từ modal cũ)
    useEffect(() => {
        console.log(`📹 Modal visibility changed: ${prevVisibleRef.current} -> ${isVisible}`);

        if (!prevVisibleRef.current && isVisible) {
            // Reset status khi modal mở
            console.log('📹 Modal opened - resetting call status');
            setCallStatus({
                isEnded: false,
                isRejected: false,
                message: '',
                duration: 0
            });
        }

        if (prevVisibleRef.current && !isVisible) {
            console.log('🔄 Video modal closing - performing cleanup');
            setTimeout(async () => {
                if (agoraCallRef.current && agoraCallRef.current.cleanup) {
                    await agoraCallRef.current.cleanup();
                }
            }, 100);
        }

        prevVisibleRef.current = isVisible;
    }, [isVisible]);
    useEffect(() => {
        // Chỉ handle khi có rejection message cụ thể
        if (isRejected && rejectionMessage && !callStatus.isRejected && rejectionMessage.trim() !== '') {
            console.log('❌ Video call REJECTED by other user:', rejectionMessage);

            setCallStatus(prev => ({
                ...prev,
                isRejected: true,
                message: rejectionMessage
            }));

            // Delay cleanup để user có thể thấy message
            setTimeout(async () => {
                if (agoraCallRef.current && agoraCallRef.current.cleanup && isComponentMounted.current) {
                    console.log('🧹 FORCE cleanup on video rejection');
                    await agoraCallRef.current.cleanup();
                }

                setTimeout(() => {
                    if (isComponentMounted.current && onCancel) {
                        console.log('🚪 Auto closing video modal after rejection');
                        onCancel();
                    }
                }, 2000);
            }, 500); // Delay ngắn để hiển thị message
        }
    }, [isRejected, rejectionMessage, callStatus.isRejected]);

    const handleCancel = async () => {
        // console.log('🚪 Video modal handleCancel called');

        // if (agoraCallRef.current && agoraCallRef.current.cleanup) {
        //     console.log('🧹 Calling cleanup before modal close');
        //     await agoraCallRef.current.cleanup();
        // }

        // if (onCancel && isComponentMounted.current) {
        //     onCancel();
        // }
        console.log('🚪 Video modal handleCancel called');

        // Reset group call states
        setViewMode('grid');
        setSpeakerUser(null);
        setShowParticipantsList(false);
        setRemoteUsers([]);

        if (agoraCallRef.current && agoraCallRef.current.cleanup) {
            console.log('🧹 Calling cleanup before modal close');
            await agoraCallRef.current.cleanup();
        }

        if (onCancel && isComponentMounted.current) {
            onCancel();
        }

    };

    // Thêm logic từ modal cũ - auto cleanup khi call ends
    const handleCallStatusChange = (statusInfo) => {
        console.log('📹 Video call status changed:', statusInfo);

        // Chỉ update khi có status thực sự quan trọng
        if (statusInfo.isEnded || statusInfo.isRejected || statusInfo.message) {
            setCallStatus({
                isEnded: statusInfo.isEnded || false,
                isRejected: statusInfo.isRejected || false,
                message: statusInfo.message || '',
                duration: statusInfo.duration || callStatus.duration // Giữ duration cũ nếu không có duration mới
            });

            // Cleanup when call ACTUALLY ends
            if ((statusInfo.isEnded && statusInfo.message) || (statusInfo.isRejected && statusInfo.message)) {
                console.log('🔚 Video call ACTUALLY ended/rejected - performing cleanup');

                setTimeout(async () => {
                    if (agoraCallRef.current && agoraCallRef.current.cleanup && isComponentMounted.current) {
                        await agoraCallRef.current.cleanup();
                    }

                    setTimeout(() => {
                        if (isComponentMounted.current && onCancel) {
                            onCancel();
                        }
                    }, 2000);
                }, 100);
            }
        }
    };

    // Cleanup khi component unmount
    useEffect(() => {
        isComponentMounted.current = true;

        return () => {
            isComponentMounted.current = false;
            console.log('📹 ModalVideoCall unmounting - cleanup');
        };
    }, []);

    // Handle rejection from other user like audio call (từ modal cũ)
    useEffect(() => {
        if (isRejected && rejectionMessage && !callStatus.isRejected) {
            console.log('❌ Video call REJECTED by other user - immediate cleanup');

            setCallStatus({
                isEnded: false,
                isRejected: true,
                message: rejectionMessage || 'Cuộc gọi video đã bị từ chối',
                duration: 0
            });

            setTimeout(async () => {
                if (agoraCallRef.current && agoraCallRef.current.cleanup && isComponentMounted.current) {
                    console.log('🧹 FORCE cleanup on video rejection');
                    await agoraCallRef.current.cleanup();
                }

                setTimeout(() => {
                    if (isComponentMounted.current && onCancel) {
                        console.log('🚪 Auto closing video modal after rejection');
                        onCancel();
                    }
                }, 2000);
            }, 100);
        }
    }, [isRejected, rejectionMessage, callStatus.isRejected]);

    // Sử dụng conversationId làm tên kênh
    const channelName = generateChannelId(conversation._id);

    // Call status overlay như modal cũ
    const CallStatusOverlay = () => {
        // Chỉ hiển thị khi có status cụ thể, KHÔNG hiển thị từ đầu
        const shouldShow = (callStatus.isEnded && callStatus.message) ||
            (callStatus.isRejected && callStatus.message) ||
            (isRejected && rejectionMessage);

        if (!shouldShow) return null;

        const formatCallDuration = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        };

        // return (
        //     <div className="call-ended-overlay">
        //         <div className="call-ended-content">
        //             <div className="call-ended-icon">
        //                 {callStatus.isRejected || isRejected ? '❌' : '📹'}
        //             </div>
        //             <div className="call-ended-message">
        //                 {callStatus.message || rejectionMessage || 'Cuộc gọi video đã kết thúc'}
        //             </div>
        //             <div className="call-ended-duration">
        //                 {callStatus.isEnded && callStatus.duration > 0 ?
        //                     `Thời gian gọi: ${formatCallDuration(callStatus.duration)}` :
        //                     'Cuộc gọi đã kết thúc'
        //                 }
        //             </div>
        //         </div>
        //     </div>
        // );
        return (
            <div className="call-ended-overlay">
                <div className="call-ended-content">
                    <div className="call-ended-icon">
                        {callStatus.isRejected || isRejected ? '❌' : '📹'}
                    </div>
                    <div className="call-ended-message">
                        {callStatus.message || rejectionMessage || 'Cuộc gọi đã kết thúc'}
                    </div>
                    <div className="call-ended-duration">
                        {callStatus.isEnded ?
                            `Thời gian gọi: ${formatCallDuration(callStatus.duration)}` :
                            'Cuộc gọi đã kết thúc'
                        }
                    </div>
                </div>
            </div>
        );
    };

    const GridVideoLayout = useMemo(() => {
        if (!isGroupCall || remoteUsers.length === 0) return null;

        const userCount = remoteUsers.length;

        // Cải thiện grid layout
        const getGridLayout = (count) => {
            if (count === 1) return { cols: 1, rows: 1, minHeight: '280px', gap: '12px' };
            if (count === 2) return { cols: 2, rows: 1, minHeight: '250px', gap: '12px' };
            if (count === 3) return { cols: 3, rows: 1, minHeight: '220px', gap: '10px' };
            if (count === 4) return { cols: 2, rows: 2, minHeight: '180px', gap: '8px' }; // Giảm gap cho 4 người
            if (count <= 6) return { cols: 3, rows: 2, minHeight: '160px', gap: '8px' };
            if (count <= 9) return { cols: 3, rows: 3, minHeight: '140px', gap: '6px' };
            return { cols: 4, rows: Math.ceil(count / 4), minHeight: '120px', gap: '6px' };
        };

        const layout = getGridLayout(userCount);

        return (
            <div
                className={`group-video-grid grid-${userCount}`}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                    gap: layout.gap,
                    width: '100%',
                    height: '100%',
                    padding: userCount <= 4 ? '16px' : '12px',
                    background: '#1a1a1a', // Thêm background thống nhất
                    borderRadius: '16px',
                    overflow: 'hidden',
                    alignItems: 'stretch',
                    justifyItems: 'stretch'
                }}
            >
                {remoteUsers.map((user, index) => (
                    <div
                        key={`group-video-${user.uid}`}
                        className="group-video-item"
                        style={{
                            position: 'relative',
                            background: 'rgba(25, 25, 25, 0.9)', // Thống nhất màu nền tối
                            borderRadius: userCount <= 4 ? '16px' : '12px',
                            overflow: 'hidden',
                            minHeight: layout.minHeight,
                            maxHeight: userCount <= 4 ? '250px' : '180px',
                            border: '2px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: viewMode === 'speaker' ? 'pointer' : 'default',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            transform: 'translateZ(0)',
                            aspectRatio: userCount <= 2 ? '16/9' : userCount <= 4 ? '4/3' : '1/1'
                        }}
                        onClick={() => {
                            if (viewMode === 'speaker') {
                                setSpeakerUser(user);
                            }
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.border = '2px solid #1890ff';
                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 8px 30px rgba(24,144,255,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.border = '2px solid rgba(255,255,255,0.1)';
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                        }}
                    >
                        {/* Video Container */}
                        <div
                            id={`remote-video-${user.uid}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                // background: 'rgba(30, 30, 30, 0.9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}
                        >
                            {!user.hasVideo ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    // background: 'rgba(40, 40, 40, 0.95)',
                                    width: '100%',
                                    height: '100%',
                                    backdropFilter: 'blur(10px)',
                                    position: 'relative'
                                }}>
                                    {/* Decorative background pattern */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        opacity: 0.1,
                                        background: `radial-gradient(circle at 30% 20%, #1890ff 0%, transparent 50%), 
                                               radial-gradient(circle at 70% 80%, #52c41a 0%, transparent 50%)`
                                    }} />

                                    <Avatar
                                        size={userCount <= 2 ? 90 : userCount <= 4 ? 70 : 50}
                                        src={user.avatar}
                                        icon={<UserOutlined />}
                                        style={{
                                            marginBottom: userCount <= 4 ? '16px' : '12px',
                                            border: '3px solid rgba(255,255,255,0.2)',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
                                            zIndex: 2
                                        }}
                                    />
                                    <div style={{
                                        fontSize: userCount <= 4 ? '16px' : '14px',
                                        fontWeight: '600',
                                        textAlign: 'center',
                                        color: 'rgba(255,255,255,0.9)', // Text màu sáng trên nền tối
                                        marginBottom: '8px',
                                        maxWidth: '90%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        zIndex: 2
                                    }}>
                                        {user.name || `User ${user.uid}`}
                                    </div>
                                    <div style={{
                                        fontSize: userCount <= 4 ? '13px' : '11px',
                                        color: '#ff9500',
                                        textAlign: 'center',
                                        background: 'rgba(255,149,0,0.2)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(255,149,0,0.3)',
                                        zIndex: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        📷 <span>Camera đã tắt</span>
                                    </div>
                                </div>
                            ) : (
                                // Video player khi có video
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        background: '#000',
                                        position: 'relative',
                                        borderRadius: '12px',
                                        overflow: 'hidden'
                                    }}
                                    ref={(element) => {
                                        if (element && user.videoTrack && user.hasVideo) {
                                            try {
                                                user.videoTrack.play(element);
                                            } catch (error) {
                                                console.error('Failed to play video:', error);
                                            }
                                        }
                                    }}
                                >
                                    {/* Video overlay gradient */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '60px',
                                        // background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                        zIndex: 2
                                    }} />

                                    {/* Name tag */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '12px',
                                        left: '12px',
                                        background: 'rgba(0,0,0,0.8)',
                                        backdropFilter: 'blur(10px)',
                                        color: 'white',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        zIndex: 3,
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        maxWidth: 'calc(100% - 24px)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {user.name || `User ${user.uid}`}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Indicators */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            display: 'flex',
                            gap: '6px',
                            zIndex: 4
                        }}>
                            <div style={{
                                background: user.hasAudio ? 'rgba(82,196,26,0.9)' : 'rgba(255,77,79,0.9)',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                color: 'white',
                                fontWeight: '500',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                🎤
                            </div>
                            <div style={{
                                background: user.hasVideo ? 'rgba(82,196,26,0.9)' : 'rgba(255,77,79,0.9)',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                color: 'white',
                                fontWeight: '500',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                📹
                            </div>
                        </div>

                        {/* Speaking Indicator */}
                        {user.isSpeaking && (
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                background: 'linear-gradient(135deg, #52c41a, #73d13d)',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600',
                                zIndex: 4,
                                boxShadow: '0 4px 15px rgba(82,196,26,0.4)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                animation: 'speakingPulse 2s infinite',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    animation: 'speakingDot 1s infinite'
                                }} />
                                Đang nói
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }, [remoteUsers, viewMode, isGroupCall]);

    const SpeakerViewLayout = useMemo(() => {
        if (viewMode !== 'speaker' || !speakerUser || remoteUsers.length === 0) return null;

        const otherUsers = remoteUsers.filter(user => user.uid !== speakerUser.uid);

        return (
            <div className="speaker-view-layout" style={{
                display: 'flex',
                height: '100%',
                gap: '16px',
                padding: '16px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                borderRadius: '16px'
            }}>
                {/* Enhanced Main Speaker */}
                <div style={{
                    flex: 1,
                    background: 'linear-gradient(145deg, #2a2a2a, #1e1e1e)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: '400px',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(24,144,255,0.3)'
                }}>
                    <div
                        id={`speaker-video-${speakerUser.uid}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(145deg, #333, #1a1a1a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {!speakerUser.hasVideo ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                color: 'white',
                                background: 'radial-gradient(circle at center, rgba(24,144,255,0.1) 0%, transparent 70%)'
                            }}>
                                <Avatar
                                    size={140}
                                    src={speakerUser.avatar}
                                    icon={<UserOutlined />}
                                    style={{
                                        border: '4px solid rgba(24,144,255,0.5)',
                                        boxShadow: '0 12px 48px rgba(24,144,255,0.2)',
                                        marginBottom: '24px'
                                    }}
                                />
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                }}>
                                    {speakerUser.name || `User ${speakerUser.uid}`}
                                </div>
                                <div style={{
                                    fontSize: '16px',
                                    opacity: 0.8,
                                    background: 'rgba(24,144,255,0.2)',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(24,144,255,0.3)'
                                }}>
                                    🎤 Người phát biểu chính
                                </div>
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#000' }} />
                        )}
                    </div>

                    {/* Enhanced Speaker Info */}
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        right: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '16px',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                    }}>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                                {speakerUser.name || `User ${speakerUser.uid}`}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.8, color: '#1890ff' }}>
                                Người phát biểu chính
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                                background: speakerUser.hasAudio ? 'rgba(82,196,26,0.9)' : 'rgba(255,77,79,0.9)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                fontSize: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: '500'
                            }}>
                                🎤
                            </div>
                            <div style={{
                                background: speakerUser.hasVideo ? 'rgba(82,196,26,0.9)' : 'rgba(255,77,79,0.9)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                fontSize: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: '500'
                            }}>
                                📹
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Other Participants Sidebar */}
                {otherUsers.length > 0 && (
                    <div style={{
                        width: '220px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <TeamOutlined style={{ color: '#1890ff' }} />
                            Người khác ({otherUsers.length})
                        </div>

                        <div style={{
                            maxHeight: '500px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255,255,255,0.3) transparent'
                        }}>
                            {otherUsers.map(user => (
                                <div
                                    key={user.uid}
                                    style={{
                                        height: '140px',
                                        background: 'linear-gradient(145deg, #2a2a2a, #1e1e1e)',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                                    }}
                                    onClick={() => setSpeakerUser(user)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.border = '2px solid #1890ff';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(24,144,255,0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.border = '2px solid rgba(255,255,255,0.1)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                                    }}
                                >
                                    <div
                                        id={`sidebar-video-${user.uid}`}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            background: 'linear-gradient(145deg, #333, #1a1a1a)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {!user.hasVideo ? (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                color: 'white',
                                                padding: '12px'
                                            }}>
                                                <Avatar
                                                    size={40}
                                                    src={user.avatar}
                                                    icon={<UserOutlined />}
                                                    style={{
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        marginBottom: '8px'
                                                    }}
                                                />
                                                <div style={{
                                                    fontSize: '11px',
                                                    textAlign: 'center',
                                                    wordBreak: 'break-word',
                                                    fontWeight: '500',
                                                    maxWidth: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {user.name || `User ${user.uid}`}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#000' }} />
                                        )}
                                    </div>

                                    {/* Enhanced status indicators */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        left: '8px',
                                        display: 'flex',
                                        gap: '4px'
                                    }}>
                                        <div style={{
                                            background: user.hasAudio ? 'rgba(82,196,26,0.9)' : 'rgba(255,77,79,0.9)',
                                            padding: '2px 6px',
                                            borderRadius: '8px',
                                            fontSize: '8px',
                                            color: 'white'
                                        }}>
                                            🎤
                                        </div>
                                        <div style={{
                                            background: user.hasVideo ? 'rgba(82,196,26,0.9)' : 'rgba(255,77,79,0.9)',
                                            padding: '2px 6px',
                                            borderRadius: '8px',
                                            fontSize: '8px',
                                            color: 'white'
                                        }}>
                                            📹
                                        </div>
                                    </div>

                                    {/* Click to switch indicator */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        background: 'rgba(24,144,255,0.8)',
                                        padding: '4px',
                                        borderRadius: '50%',
                                        fontSize: '8px',
                                        color: 'white',
                                        opacity: 0,
                                        transition: 'opacity 0.3s ease'
                                    }}>
                                        👆
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }, [viewMode, speakerUser, remoteUsers]);

    const GroupCallControls = useMemo(() => {
        if (!isGroupCall) return null;

        return (
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '90px',
                display: 'flex',
                gap: '12px',
                zIndex: 999
            }}>
                {/* Enhanced View Mode Toggle */}
                <Button
                    type="default"
                    size="middle"
                    icon={viewMode === 'grid' ? <BorderOutlined /> : <AppstoreOutlined />}
                    onClick={() => setViewMode(prev => prev === 'grid' ? 'speaker' : 'grid')}
                    style={{
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(10px)',
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '8px 16px',
                        height: '40px',
                        borderRadius: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    title={`Chuyển sang ${viewMode === 'grid' ? 'Speaker View' : 'Grid View'}`}
                >
                    {viewMode === 'grid' ? 'Speaker' : 'Grid'}
                </Button>

                {/* Enhanced Participants Counter */}
                <Button
                    type={showParticipantsList ? 'primary' : 'default'}
                    size="middle"
                    icon={<TeamOutlined />}
                    onClick={() => setShowParticipantsList(prev => !prev)}
                    style={{
                        background: showParticipantsList ?
                            'linear-gradient(135deg, #1890ff, #40a9ff)' :
                            'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(10px)',
                        borderColor: showParticipantsList ? '#1890ff' : 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '8px 16px',
                        height: '40px',
                        borderRadius: '20px',
                        boxShadow: showParticipantsList ?
                            '0 4px 20px rgba(24,144,255,0.4)' :
                            '0 4px 20px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    {remoteUsers.length + 1} người
                </Button>
            </div>
        );
    }, [isGroupCall, viewMode, showParticipantsList, remoteUsers.length]);

    return (
        <Modal
            title={modalTitle}
            open={isVisible}
            onCancel={handleCancel}
            footer={null}
            width="95%"
            style={{ maxWidth: isGroupCall ? '900px' : '750px' }}
            centered
            destroyOnClose={true}
            maskClosable={false}
            keyboard={false}
            className="video-call-modal"
            afterClose={async () => {
                console.log('📹 Video modal completely closed - final cleanup');
                if (agoraCallRef.current && agoraCallRef.current.cleanup) {
                    await agoraCallRef.current.cleanup();
                }
                // Reset all states
                setCallStatus({
                    isEnded: false,
                    isRejected: false,
                    message: '',
                    duration: 0
                });
                setViewMode('grid');
                setSpeakerUser(null);
                setShowParticipantsList(false);
                setRemoteUsers([]);
            }}
        >
            <div style={{
                position: 'relative',
                height: isGroupCall ? '600px' : '620px',
                background: '#1a1a1a',
                borderRadius: '12px',
                overflow: 'hidden',
                // paddingTop: '50px'
            }}>
                {/* Call Status Overlay */}
                <CallStatusOverlay />

                {/* Group Call Controls */}
                {GroupCallControls}

                {/* Main Video Content */}
                {isVisible && (
                    <div style={{ height: '100%', position: 'relative' }}>
                        {/* Always show AgoraVideoCall component */}
                        <AgoraVideoCall
                            ref={agoraCallRef}
                            channelName={channelName}
                            uid={currentUser._id}
                            onEndCall={handleCancel}
                            currentUser={currentUser}
                            conversation={conversation}
                            isRejected={isRejected}
                            rejectionMessage={rejectionMessage}
                            onCallEnded={handleCallStatusChange}
                        />

                        {/* Group Video Overlays (optional enhancement) */}
                        {isGroupCall && remoteUsers.length > 1 && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                pointerEvents: 'none',
                                zIndex: 5,
                                paddingTop: '50px'
                            }}>
                                {viewMode === 'speaker' && speakerUser ?
                                    SpeakerViewLayout :
                                    GridVideoLayout
                                }
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
});

ModalVideoCall.propTypes = {
    isVisible: PropTypes.bool.isRequired,
    onCancel: PropTypes.func.isRequired,
    conversation: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
    isRejected: PropTypes.bool,
    rejectionMessage: PropTypes.string,
};

ModalVideoCall.defaultProps = {
    isRejected: false,
    rejectionMessage: '',
};

export default ModalVideoCall;
