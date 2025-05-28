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
import AgoraVideoCall from '../../components/AgoraVideoCall';
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

        // Determine optimal grid layout
        const getGridLayout = (count) => {
            if (count === 1) return { cols: 1, rows: 1, minHeight: '300px' };
            if (count === 2) return { cols: 2, rows: 1, minHeight: '250px' };
            if (count <= 4) return { cols: 2, rows: 2, minHeight: '200px' };
            if (count <= 6) return { cols: 3, rows: 2, minHeight: '180px' };
            if (count <= 9) return { cols: 3, rows: 3, minHeight: '160px' };
            return { cols: 4, rows: Math.ceil(count / 4), minHeight: '140px' };
        };

        const layout = getGridLayout(userCount);

        return (
            <div
                className="group-video-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                    gap: '12px',
                    width: '100%',
                    height: '100%',
                    padding: '16px',
                    background: '#1a1a1a',
                    borderRadius: '12px'
                }}
            >
                {remoteUsers.map((user, index) => (
                    <div
                        key={`group-video-${user.uid}`}
                        className="group-video-item"
                        style={{
                            position: 'relative',
                            background: '#000',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            minHeight: layout.minHeight,
                            border: '2px solid transparent',
                            transition: 'all 0.3s ease',
                            cursor: viewMode === 'speaker' ? 'pointer' : 'default'
                        }}
                        onClick={() => {
                            if (viewMode === 'speaker') {
                                setSpeakerUser(user);
                            }
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.border = '2px solid #1890ff';
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.border = '2px solid transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {/* Video Container */}
                        <div
                            id={`remote-video-${user.uid}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                background: '#333',
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
                                    color: 'white'
                                }}>
                                    <Avatar
                                        size={userCount <= 2 ? 80 : userCount <= 4 ? 60 : 40}
                                        src={user.avatar}
                                        icon={<UserOutlined />}
                                    />
                                    <div style={{
                                        marginTop: '8px',
                                        fontSize: userCount <= 4 ? '14px' : '12px',
                                        fontWeight: '500',
                                        textAlign: 'center'
                                    }}>
                                        {user.name || `User ${user.uid}`}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: '#000' }} />
                            )}
                        </div>

                        {/* Participant Info Overlay */}
                        <div className="participant-info-overlay" style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: '0',
                            transition: 'opacity 0.3s ease',
                            color: 'white'
                        }}>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}>
                                {user.name || `User ${user.uid}`}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', fontSize: '14px' }}>
                                <span style={{
                                    opacity: user.hasAudio ? 1 : 0.3,
                                    filter: user.hasAudio ? 'none' : 'grayscale(100%)'
                                }}>
                                    🎤
                                </span>
                                <span style={{
                                    opacity: user.hasVideo ? 1 : 0.3,
                                    filter: user.hasVideo ? 'none' : 'grayscale(100%)'
                                }}>
                                    📹
                                </span>
                            </div>
                        </div>

                        {/* Speaking Indicator */}
                        {user.isSpeaking && (
                            <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                background: '#52c41a',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '500',
                                animation: 'pulse 1.5s infinite'
                            }}>
                                🎤 Đang nói
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }, [remoteUsers, viewMode, isGroupCall]);

    // Speaker View Layout
    const SpeakerViewLayout = useMemo(() => {
        if (viewMode !== 'speaker' || !speakerUser || remoteUsers.length === 0) return null;

        const otherUsers = remoteUsers.filter(user => user.uid !== speakerUser.uid);

        return (
            <div className="speaker-view-layout" style={{
                display: 'flex',
                height: '100%',
                gap: '12px',
                padding: '16px',
                background: '#1a1a1a',
                borderRadius: '12px'
            }}>
                {/* Main Speaker */}
                <div style={{
                    flex: 1,
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: '400px'
                }}>
                    <div
                        id={`speaker-video-${speakerUser.uid}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            background: '#333',
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
                                color: 'white'
                            }}>
                                <Avatar size={120} src={speakerUser.avatar} icon={<UserOutlined />} />
                                <div style={{ marginTop: '16px', fontSize: '24px', fontWeight: '500' }}>
                                    {speakerUser.name || `User ${speakerUser.uid}`}
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '16px', opacity: 0.7 }}>
                                    Đang phát biểu
                                </div>
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#000' }} />
                        )}
                    </div>

                    {/* Speaker Info */}
                    <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        background: 'rgba(0,0,0,0.8)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '500' }}>
                                {speakerUser.name || `User ${speakerUser.uid}`}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                Người phát biểu chính
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '18px' }}>
                            <span style={{ opacity: speakerUser.hasAudio ? 1 : 0.5 }}>🎤</span>
                            <span style={{ opacity: speakerUser.hasVideo ? 1 : 0.5 }}>📹</span>
                        </div>
                    </div>
                </div>

                {/* Other Participants Sidebar */}
                {otherUsers.length > 0 && (
                    <div style={{
                        width: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            padding: '0 8px'
                        }}>
                            Người khác ({otherUsers.length})
                        </div>

                        {otherUsers.map(user => (
                            <div
                                key={user.uid}
                                style={{
                                    height: '120px',
                                    background: '#000',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    border: '2px solid transparent',
                                    transition: 'all 0.3s ease'
                                }}
                                onClick={() => setSpeakerUser(user)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.border = '2px solid #1890ff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.border = '2px solid transparent';
                                }}
                            >
                                <div
                                    id={`sidebar-video-${user.uid}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        background: '#333',
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
                                            color: 'white'
                                        }}>
                                            <Avatar size={32} src={user.avatar} icon={<UserOutlined />} />
                                            <div style={{
                                                marginTop: '4px',
                                                fontSize: '10px',
                                                textAlign: 'center',
                                                wordBreak: 'break-word'
                                            }}>
                                                {user.name || `User ${user.uid}`}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#000' }} />
                                    )}
                                </div>

                                {/* Status indicators */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '4px',
                                    left: '4px',
                                    display: 'flex',
                                    gap: '4px',
                                    fontSize: '10px'
                                }}>
                                    <span style={{ opacity: user.hasAudio ? 1 : 0.5 }}>🎤</span>
                                    <span style={{ opacity: user.hasVideo ? 1 : 0.5 }}>📹</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }, [viewMode, speakerUser, remoteUsers]);

    const EnhancedParticipantsSidebar = useMemo(() => {
        if (!isGroupCall) return null;

        return (
            <div
                className={`participants-sidebar ${showParticipantsList ? 'show' : 'hide'}`}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: showParticipantsList ? '20px' : '-260px',
                    width: '240px',
                    maxHeight: '400px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    padding: '16px',
                    color: 'white',
                    zIndex: 1000,
                    transition: 'right 0.3s ease',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        Người tham gia
                    </div>
                    <div style={{
                        background: '#1890ff',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: '500'
                    }}>
                        {remoteUsers.length + 1}/{conversation.totalMembers}
                    </div>
                </div>

                {/* Participants List */}
                <div style={{
                    maxHeight: '260px',
                    overflowY: 'auto'
                }}>
                    {/* Current User */}
                    <div className="participant-item enhanced" style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        marginBottom: '4px',
                        borderRadius: '8px',
                        background: 'rgba(24, 144, 255, 0.2)',
                        border: '1px solid rgba(24, 144, 255, 0.3)'
                    }}>
                        <Avatar size={28} src={currentUser.avatar} icon={<UserOutlined />} />
                        <div style={{ marginLeft: '10px', flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: '500' }}>
                                {currentUser.name} (Bạn)
                            </div>
                            <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                Chủ phòng
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <span style={{
                                fontSize: '14px',
                                opacity: !isAudioMuted ? 1 : 0.3,
                                filter: !isAudioMuted ? 'none' : 'grayscale(100%)'
                            }}>
                                🎤
                            </span>
                            <span style={{
                                fontSize: '14px',
                                opacity: (!isVideoMuted && localVideoTrack) ? 1 : 0.3,
                                filter: (!isVideoMuted && localVideoTrack) ? 'none' : 'grayscale(100%)'
                            }}>
                                📹
                            </span>
                        </div>
                    </div>

                    {/* Remote Users */}
                    {remoteUsers.map(user => (
                        <div key={user.uid} className="participant-item enhanced" style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px',
                            marginBottom: '4px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.3s ease',
                            cursor: viewMode === 'speaker' ? 'pointer' : 'default',
                            position: 'relative'
                        }}
                            onClick={() => {
                                if (viewMode === 'speaker') {
                                    setSpeakerUser(user);
                                }
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                        >
                            <Avatar size={28} src={user.avatar} icon={<UserOutlined />} />
                            <div style={{ marginLeft: '10px', flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                                    {user.name || `User ${user.uid}`}
                                </div>
                                <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                    {user.isSpeaking ? '🎤 Đang nói' : 'Đã tham gia'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <span style={{
                                    fontSize: '14px',
                                    opacity: user.hasAudio ? 1 : 0.3,
                                    filter: user.hasAudio ? 'none' : 'grayscale(100%)'
                                }}>
                                    🎤
                                </span>
                                <span style={{
                                    fontSize: '14px',
                                    opacity: user.hasVideo ? 1 : 0.3,
                                    filter: user.hasVideo ? 'none' : 'grayscale(100%)'
                                }}>
                                    📹
                                </span>
                            </div>

                            {/* Speaker indicator */}
                            {viewMode === 'speaker' && speakerUser?.uid === user.uid && (
                                <div style={{
                                    position: 'absolute',
                                    left: '-2px',
                                    top: '-2px',
                                    bottom: '-2px',
                                    width: '3px',
                                    background: '#52c41a',
                                    borderRadius: '2px'
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    gap: '6px'
                }}>
                    <Button
                        size="small"
                        type={viewMode === 'grid' ? 'primary' : 'default'}
                        icon={<AppstoreOutlined />}
                        onClick={() => setViewMode('grid')}
                        style={{ flex: 1, fontSize: '11px' }}
                    >
                        Lưới
                    </Button>
                    <Button
                        size="small"
                        type={viewMode === 'speaker' ? 'primary' : 'default'}
                        icon={<BorderOutlined />}
                        onClick={() => setViewMode('speaker')}
                        style={{ flex: 1, fontSize: '11px' }}
                    >
                        Diễn giả
                    </Button>
                </div>
            </div>
        );
    }, [isGroupCall, showParticipantsList, remoteUsers, currentUser, isAudioMuted, isVideoMuted, localVideoTrack, viewMode, speakerUser, conversation.totalMembers]);

    // Group Call Controls Overlay
    const GroupCallControls = useMemo(() => {
        if (!isGroupCall) return null;

        return (
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                display: 'flex',
                gap: '8px',
                zIndex: 999
            }}>
                {/* View Mode Toggle */}
                <Button
                    type="default"
                    size="small"
                    icon={viewMode === 'grid' ? <BorderOutlined /> : <AppstoreOutlined />}
                    onClick={() => setViewMode(prev => prev === 'grid' ? 'speaker' : 'grid')}
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        fontSize: '11px'
                    }}
                    title={`Chuyển sang ${viewMode === 'grid' ? 'Speaker View' : 'Grid View'}`}
                />

                {/* Participants List Toggle */}
                <Button
                    type={showParticipantsList ? 'primary' : 'default'}
                    size="small"
                    icon={<TeamOutlined />}
                    onClick={() => setShowParticipantsList(prev => !prev)}
                    style={{
                        background: showParticipantsList ? '#1890ff' : 'rgba(0,0,0,0.7)',
                        borderColor: showParticipantsList ? '#1890ff' : 'rgba(255,255,255,0.3)',
                        color: 'white',
                        fontSize: '11px'
                    }}
                >
                    {remoteUsers.length + 1}
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
            style={{ maxWidth: isGroupCall ? '1200px' : '750px' }}
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
                overflow: 'hidden'
            }}>
                {/* Call Status Overlay */}
                <CallStatusOverlay />

                {/* Group Call Controls */}
                {GroupCallControls}

                {/* Enhanced Participants Sidebar */}
                {EnhancedParticipantsSidebar}

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
                                zIndex: 5
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