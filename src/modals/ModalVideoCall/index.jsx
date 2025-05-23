import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, message, Slider, Tooltip, Avatar } from 'antd';
import {
    AudioOutlined, AudioMutedOutlined, CloseCircleOutlined,
    VideoCameraOutlined, VideoCameraAddOutlined, SyncOutlined,
    ReloadOutlined,
    SoundOutlined,
    QuestionCircleOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import soundManager from '../../utils/soundManager';
import stopAllSounds from '../../utils/stopAllSounds';
import peerManager from '../../utils/PeerManager';
import './style.css';

function ModalVideoCall({
    open,
    onClose,
    avatar,
    name,
    isLogin,
    rejectMessage: initialRejectMessage,
    acceptCall,
    playRingtone,
    conversationId,
    remoteUserId,
    userId,
    socket,
    cameraEnabled = false
}) {
    // State cơ bản
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(cameraEnabled);
    const [callStart, setCallStart] = useState(null);
    const [duration, setDuration] = useState(0);
    const [endingCall, setEndingCall] = useState(false);
    const [internalRejectMessage, setInternalRejectMessage] = useState('');
    const [callTimeout, setCallTimeout] = useState(false);
    const [connected, setConnected] = useState(false);
    const [peerConnected, setPeerConnected] = useState(false);
    const [audioPermission, setAudioPermission] = useState(false);
    const [videoPermission, setVideoPermission] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(100);
    const [switchingCamera, setSwitchingCamera] = useState(false);
    const [speakerOn, setSpeakerOn] = useState(true);
    const [previousVolumeLevel, setPreviousVolumeLevel] = useState(100);
    const [videoModeActive, setVideoModeActive] = useState(false);

    // Refs
    const remoteAudioRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);
    const intervalRef = useRef();
    const timeoutRef = useRef(null);
    const peerInitialized = useRef(false);
    const initialRoleRef = useRef('');
    const lastConnectionTime = useRef(0);

    // Khởi tạo Peer khi component được mount và open = true
    useEffect(() => {
        if (open && userId) {
            console.log('Khởi tạo kết nối PeerJS cho video call');

            try {
                // Khởi tạo PeerJS với userId
                const peer = peerManager.init(userId);
                if (peer) {
                    peerInitialized.current = true;
                } else {
                    console.error('Không thể khởi tạo peer');
                    message.error('Không thể thiết lập kết nối, vui lòng thử lại');
                    return;
                }

                // Thiết lập callbacks cho các sự kiện cuộc gọi
                peerManager.onCallEvent = {
                    // onStream: (stream) => {
                    //     console.log('Nhận được luồng video từ đầu bên kia');
                    //     if (remoteVideoRef.current) {
                    //         remoteVideoRef.current.srcObject = stream;
                    //         setPeerConnected(true);
                    //         console.log('Đã gán stream vào video, kết nối thành công');
                    //     }
                    // },
                    onStream: (stream) => {
                        console.log('Nhận được luồng từ đầu bên kia:',
                            stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));

                        // Lưu stream vào peerManager
                        peerManager.remoteStream = stream;

                        // Gán stream cho cả audio và video elements
                        if (remoteAudioRef.current) {
                            console.log('Gán stream vào audio element');
                            remoteAudioRef.current.srcObject = stream;
                            remoteAudioRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                            remoteAudioRef.current.muted = !speakerOn;

                            remoteAudioRef.current.play()
                                .then(() => console.log('Đã phát audio'))
                                .catch(err => console.error('Lỗi phát audio:', err));
                        }

                        if (remoteVideoRef.current) {
                            console.log('Gán stream vào video element');
                            remoteVideoRef.current.srcObject = stream;
                            remoteVideoRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                            remoteVideoRef.current.muted = !speakerOn;

                            remoteVideoRef.current.play()
                                .then(() => console.log('Đã phát video'))
                                .catch(err => console.error('Lỗi phát video:', err));
                        }

                        setPeerConnected(true);
                    },
                    onClose: () => {
                        console.log('Kết nối cuộc gọi đã đóng');
                        setPeerConnected(false);
                    },
                    onError: (err) => {
                        console.error('Lỗi kết nối cuộc gọi:', err);
                        message.error('Có lỗi kết nối: ' + (err.message || err.type || 'Không xác định'));
                        setPeerConnected(false);
                    }
                };

                // Truy cập camera và micro
                const getMediaDevices = async (retryCount = 0) => {
                    // try {
                    //     const stream = await peerManager.getUserMedia(true); // true = yêu cầu video
                    //     console.log('Đã truy cập được camera và micro');

                    //     // Hiển thị video cục bộ
                    //     if (localVideoRef.current) {
                    //         localVideoRef.current.srcObject = stream;
                    //     }

                    //     // Xác định quyền truy cập
                    //     const audioTracks = stream.getAudioTracks();
                    //     const videoTracks = stream.getVideoTracks();

                    //     setAudioPermission(audioTracks.length > 0);
                    //     setVideoPermission(videoTracks.length > 0);

                    //     // Tắt camera theo cameraEnabled prop
                    //     if (!cameraEnabled && videoTracks.length > 0) {
                    //         videoTracks.forEach(track => {
                    //             track.enabled = false;
                    //         });
                    //     }
                    // } catch (err) {
                    try {
                        console.log('Bắt đầu truy cập thiết bị với cameraEnabled:', cameraEnabled);

                        // Ưu tiên chỉ truy cập micro trước, sau đó mới xin quyền camera khi cần
                        let stream;
                        if (!cameraEnabled) {
                            // Chỉ truy cập micro nếu camera bị tắt
                            console.log('Ưu tiên truy cập chỉ micro trước để test âm thanh');
                            stream = await peerManager.getUserMedia(false); // false = không yêu cầu video
                        } else {
                            // Nếu cameraEnabled = true, xin quyền cả camera và micro
                            stream = await peerManager.getUserMedia(true);
                        }

                        console.log('Đã truy cập được audio với tracks:',
                            stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));

                        // Hiển thị video cục bộ nếu có, ngay cả khi camera tắt (sẽ hiển thị màn hình đen)
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = stream;
                        }

                        // Xác định quyền truy cập
                        const audioTracks = stream.getAudioTracks();
                        const videoTracks = stream.getVideoTracks();

                        setAudioPermission(audioTracks.length > 0);
                        setVideoPermission(videoTracks.length > 0);

                        // Đảm bảo camera bị tắt nếu cameraEnabled = false
                        if (!cameraEnabled && videoTracks.length > 0) {
                            console.log('Tắt camera theo cài đặt mặc định');
                            videoTracks.forEach(track => {
                                track.enabled = false;
                            });
                        }
                    } catch (err) {
                        console.error('Không thể truy cập camera/micro:', err);

                        if (retryCount < 2) {
                            console.log(`Thử lại lần ${retryCount + 1}...`);
                            setTimeout(() => getMediaDevices(retryCount + 1), 1000);
                        } else {
                            message.error('Không thể truy cập camera và micro, vui lòng kiểm tra quyền truy cập');
                        }
                    }
                };

                getMediaDevices();
            } catch (err) {
                console.error('Lỗi khi khởi tạo PeerJS:', err);
                message.error('Lỗi kết nối: ' + err.message);
            }

            return () => {
                console.log('Dọn dẹp kết nối PeerJS');
                peerManager.destroy();
                peerInitialized.current = false;
            };
        }
    }, [open, userId, cameraEnabled]);

    // Xử lý peer ID thông qua socket
    useEffect(() => {
        if (!open || !socket || !userId) return;

        const role = acceptCall ? 'NGƯỜI_NHẬN' : 'NGƯỜI_GỌI';
        initialRoleRef.current = role;
        console.log(`[VIDEO][${role}] Thiết lập xử lý peer ID cho video call`);

        // Thêm debugging toàn diện
        socket.on('peer-id', ({ fromUser, peerId, conversationId: convId }) => {
            console.log(`[VIDEO][${role}] Nhận được peer ID từ:`, fromUser._id, 'ID:', peerId);
            console.log('Quyền camera:', videoPermission, 'Quyền micro:', audioPermission);

            if (convId !== conversationId) {
                console.log('[VIDEO] Bỏ qua vì không phải cuộc gọi hiện tại');
                return;
            }

            // CHỈ NGƯỜI NHẬN mới chủ động gọi đến người gọi
            if (acceptCall && fromUser._id !== userId) {
                const now = Date.now();
                if (now - lastConnectionTime.current > 3000) {
                    lastConnectionTime.current = now;
                    console.log(`[VIDEO][${role}] Khởi tạo kết nối video với người gọi:`, peerId);

                    // Kiểm tra localStream có video track chưa
                    if (peerManager.localStream) {
                        const videoTracks = peerManager.localStream.getVideoTracks();
                        console.log(`[VIDEO] localStream có ${videoTracks.length} video tracks`);
                    }

                    setTimeout(() => {
                        peerManager.callTo(peerId)
                            .then(call => {
                                console.log('[VIDEO] Kết nối thành công với:', peerId);
                                // Nếu kết nối thành công nhưng không có stream video, thử nghiệm khởi động lại
                                setTimeout(() => {
                                    if (!peerConnected) {
                                        console.log('[VIDEO] Chưa nhận được stream, thử restart kết nối...');
                                        // Khởi động lại ICE connection nếu có thể
                                        if (call && call.peerConnection) {
                                            peerManager.restartIce(call.peerConnection);
                                        }
                                    }
                                }, 5000);
                            })
                            .catch(err => {
                                console.error('[VIDEO] Lỗi kết nối:', err);
                                // Thử lại sau một khoảng thời gian
                                setTimeout(() => {
                                    console.log('[VIDEO] Thử kết nối lại...');
                                    peerManager.callTo(peerId)
                                        .catch(e => console.error('[VIDEO] Vẫn không thể kết nối:', e));
                                }, 3000);
                            });
                    }, 2000);
                }
            }
        });

        // Gửi peer ID định kỳ với tần suất cao hơn
        const sendMyPeerId = () => {
            if (peerManager.peer && peerManager.peer.id) {
                console.log(`[VIDEO][${role}] Gửi peer ID cho video:`, peerManager.peer.id);
                socket.emit('peer-id', {
                    conversationId,
                    fromUser: { _id: userId },
                    peerId: peerManager.peer.id
                });
                return true;
            }
            return false;
        };

        // Gửi ID thường xuyên hơn để đảm bảo kết nối
        const peerIdInterval = setInterval(sendMyPeerId, 2000);

        if (peerManager.peer) {
            if (peerManager.peer.open) {
                sendMyPeerId();
            } else {
                peerManager.peer.on('open', () => {
                    console.log('[VIDEO] PeerJS đã mở kết nối, gửi ID ngay');
                    sendMyPeerId();
                });
            }
        }

        return () => {
            clearInterval(peerIdInterval);
            socket.off('peer-id');
        };
    }, [open, socket, acceptCall, userId, conversationId, audioPermission, videoPermission]);

    // Xử lý kết thúc cuộc gọi từ phía bên kia
    useEffect(() => {
        if (!open || !socket) return;

        socket.on('end-call', ({ fromUser, conversationId: convId }) => {
            console.log('Nhận sự kiện kết thúc cuộc gọi từ:', fromUser._id);

            if (convId !== conversationId) return;

            if (peerManager.peer) {
                socket.off('peer-id');

                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }

                peerManager.endCall();
            }

            setEndingCall(true);
            setInternalRejectMessage('Cuộc gọi đã kết thúc');
            stopAllSounds();

            setTimeout(() => {
                onClose();
            }, 2000);
        });

        return () => {
            socket.off('end-call');
        };
    }, [open, socket, conversationId, onClose]);

    // Thiết lập bộ đếm thời gian
    useEffect(() => {
        if (open && peerConnected) {
            setDuration(0);
            setCallStart(new Date());

            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            intervalRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else if (open && !peerConnected) {
            setCallStart(new Date());

            if (!intervalRef.current) {
                intervalRef.current = setInterval(() => {
                    setDuration(prev => prev + 1);
                }, 1000);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [open, peerConnected]);

    // Thiết lập timeout cho cuộc gọi không được trả lời
    useEffect(() => {
        if (open && !acceptCall && !initialRejectMessage && !endingCall) {
            const CALL_TIMEOUT = 60 * 1000; // 60 giây

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setCallTimeout(true);
                setInternalRejectMessage('Không có phản hồi từ người nhận');

                setTimeout(() => {
                    handleEndCall();
                }, 2000);
            }, CALL_TIMEOUT);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [open, acceptCall, initialRejectMessage, endingCall]);

    // Thiết lập keepalive cho kết nối WebRTC
    useEffect(() => {
        if (!peerConnected || !peerManager.currentCall?.peerConnection) return;

        console.log('Thiết lập keepalive cho WebRTC video call');

        const keepAliveInterval = setInterval(() => {
            try {
                const pc = peerManager.currentCall.peerConnection;
                const connectionState = pc.connectionState || pc.iceConnectionState;

                if (pc.dataChannel && pc.dataChannel.readyState === 'open') {
                    pc.dataChannel.send(JSON.stringify({
                        type: 'keepalive',
                        timestamp: Date.now(),
                        from: userId
                    }));
                }

                if (connectionState === 'disconnected' || connectionState === 'failed') {
                    peerManager.restartIce(pc);
                }
            } catch (e) {
                console.error('Lỗi trong keepalive:', e);
            }
        }, 8000);

        return () => clearInterval(keepAliveInterval);
    }, [peerConnected, userId]);

    // Xử lý riêng cho vấn đề quyền micro
    useEffect(() => {
        if (!open) return;

        // Hàm này sẽ kiểm tra và khởi tạo lại quyền micro nếu cần
        const checkAudioAccess = async () => {
            try {
                // Nếu đã có stream nhưng không có audio tracks
                if (peerManager.localStream && peerManager.localStream.getAudioTracks().length === 0) {
                    console.log('Video stream không có audio tracks, thử truy cập riêng audio...');

                    // Thử lấy quyền truy cập audio
                    const audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    });

                    if (audioStream && audioStream.getAudioTracks().length > 0) {
                        console.log('Đã truy cập được micro riêng');

                        // Thêm audio tracks vào stream hiện tại
                        const audioTrack = audioStream.getAudioTracks()[0];
                        peerManager.localStream.addTrack(audioTrack);

                        // Cập nhật trạng thái audio
                        setAudioPermission(true);
                        setMicOn(true);

                        // Nếu đang trong cuộc gọi, thêm track vào peer connection
                        if (peerManager.currentCall?.peerConnection) {
                            peerManager.currentCall.peerConnection.addTrack(
                                audioTrack,
                                peerManager.localStream
                            );
                        }
                    }
                }
                // Nếu đã có audio tracks nhưng state chưa cập nhật
                else if (peerManager.localStream && peerManager.localStream.getAudioTracks().length > 0 && !audioPermission) {
                    console.log('Đã có audio tracks nhưng state chưa cập nhật');
                    setAudioPermission(true);
                    setMicOn(true);
                }
            } catch (err) {
                console.error('Không thể truy cập micro riêng:', err);
            }
        };

        // Kiểm tra sau khi component đã mount
        const audioCheckTimer = setTimeout(checkAudioAccess, 2000);
        return () => clearTimeout(audioCheckTimer);
    }, [open, audioPermission]);

    useEffect(() => {
        // Khi trạng thái peerConnected thay đổi hoặc khi có video tracks thay đổi
        if (peerConnected && peerManager.remoteStream) {
            const hasVideoTracks = peerManager.remoteStream.getVideoTracks().some(t => t.enabled);
            console.log(`Đang ở chế độ: ${hasVideoTracks ? 'VIDEO' : 'AUDIO'}`);

            // Đảm bảo audio luôn được thiết lập đúng
            setTimeout(() => {
                if (remoteVideoRef.current) {
                    console.log(`Đảm bảo thiết lập audio: volume=${speakerOn ? volumeLevel / 100 : 0}, muted=${!speakerOn}`);
                    remoteVideoRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                    remoteVideoRef.current.muted = !speakerOn;
                }
            }, 300);
        }
    }, [peerConnected, speakerOn, volumeLevel]);

    useEffect(() => {
        if (peerConnected && remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            console.log("Trạng thái âm thanh:", {
                "Có stream?": !!remoteVideoRef.current.srcObject,
                "Số audio tracks:": remoteVideoRef.current.srcObject.getAudioTracks().length,
                "Audio tracks enabled?": remoteVideoRef.current.srcObject.getAudioTracks().map(t => t.enabled).join(','),
                "Volume hiện tại:": remoteVideoRef.current.volume,
                "Muted?": remoteVideoRef.current.muted,
                "Loa đang bật?": speakerOn
            });

            // Đảm bảo audio tracks không bị disabled
            remoteVideoRef.current.srcObject.getAudioTracks().forEach(track => {
                if (!track.enabled) {
                    console.log("Phát hiện audio track bị tắt, đang bật lại...");
                    track.enabled = true;
                }
            });
        }
    }, [peerConnected, speakerOn]);

    useEffect(() => {
        if (open) {
            // Thông báo cho người dùng về chế độ mặc định
            message.info(
                'Cuộc gọi đang ở chế độ chỉ nghe. Bạn có thể bật camera bất cứ lúc nào sau khi kết nối.',
                5
            );
        }
    }, [open]);

    // Thêm effect để đảm bảo stream luôn được gán cho các elements khi chuyển chế độ
    useEffect(() => {
        if (peerConnected && peerManager.remoteStream) {
            console.log('Đảm bảo stream được gán cho cả audio và video');

            // Gán lại stream cho audio element
            if (remoteAudioRef.current && !remoteAudioRef.current.srcObject) {
                remoteAudioRef.current.srcObject = peerManager.remoteStream;
                remoteAudioRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                remoteAudioRef.current.muted = !speakerOn;
            }

            // Gán lại stream cho video element
            if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
                remoteVideoRef.current.srcObject = peerManager.remoteStream;
                remoteVideoRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                remoteVideoRef.current.muted = !speakerOn;
            }
        }
    }, [peerConnected, peerManager.remoteStream, speakerOn, volumeLevel]);

    // useEffect(() => {
    //     if (!peerConnected || !peerManager.remoteStream) return;

    //     // Lấy danh sách video tracks
    //     const videoTracks = peerManager.remoteStream.getVideoTracks();
    //     console.log('Trạng thái video tracks:',
    //         videoTracks.map(t => `${t.label}: enabled=${t.enabled}, readyState=${t.readyState}`).join(', '));

    //     // Thiết lập kiểm tra định kỳ trạng thái video
    //     const videoCheckInterval = setInterval(() => {
    //         if (!peerManager.remoteStream) {
    //             clearInterval(videoCheckInterval);
    //             return;
    //         }

    //         const currentVideoTracks = peerManager.remoteStream.getVideoTracks();
    //         const hasActiveVideoTrack = currentVideoTracks.some(t => t.enabled && t.readyState === 'live');

    //         console.log(
    //             `Kiểm tra video: ${currentVideoTracks.length} tracks, ` +
    //             `active=${hasActiveVideoTrack}, ` +
    //             `tracks=${currentVideoTracks.map(t => `${t.readyState}:${t.enabled}`).join(',')}`
    //         );

    //         // Nếu không có video track hoạt động sau khi bật camera, thử khởi động lại
    //         if (cameraOn && videoPermission && !hasActiveVideoTrack) {
    //             console.log('Video không hoạt động mặc dù đã bật camera, thử khởi động lại kết nối');

    //             // Thử khởi động lại ICE connection
    //             if (peerManager.currentCall?.peerConnection) {
    //                 peerManager.restartIce(peerManager.currentCall.peerConnection);
    //             }
    //         }
    //     }, 5000);

    //     return () => clearInterval(videoCheckInterval);
    // }, [peerConnected, peerManager.remoteStream, cameraOn, videoPermission]);

    useEffect(() => {
        if (!peerConnected || !peerManager.currentCall?.peerConnection) return;

        const pc = peerManager.currentCall.peerConnection;
        console.log('Thiết lập giám sát kết nối WebRTC');

        // Theo dõi trạng thái kết nối
        const connectionStateHandler = () => {
            const connectionState = pc.connectionState || pc.iceConnectionState;
            console.log(`Trạng thái kết nối: ${connectionState}`);

            // Nếu kết nối bị ngắt, thử kết nối lại
            if (connectionState === 'disconnected' || connectionState === 'failed') {
                console.log('Kết nối bị ngắt hoặc thất bại, đang thử kết nối lại...');
                peerManager.restartIce(pc);

                // Hiển thị thông báo cho người dùng
                message.warning('Kết nối video không ổn định, đang thử kết nối lại...', 3);
            }
            else if (connectionState === 'connected' || connectionState === 'completed') {
                if (videoPermission && cameraOn) {
                    // Kiểm tra các video track đã được gửi chưa
                    const senders = pc.getSenders();
                    const videoSenders = senders.filter(s => s.track && s.track.kind === 'video');
                    console.log(`Có ${videoSenders.length} video tracks đang được gửi trong trạng thái kết nối ${connectionState}`);
                }
            }
        };

        // Theo dõi các stats để phát hiện vấn đề
        const statsInterval = setInterval(async () => {
            try {
                const stats = await pc.getStats();
                let videoSent = false;
                let videoReceived = false;
                let videoPacketsLost = 0;

                stats.forEach(report => {
                    if (report.type === 'outbound-rtp' && report.kind === 'video') {
                        videoSent = true;
                        console.log(`Đã gửi ${report.packetsSent} video packets, ${report.bytesSent} bytes`);
                    }
                    else if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        videoReceived = true;
                        videoPacketsLost = report.packetsLost || 0;
                        console.log(`Đã nhận ${report.packetsReceived} video packets, ${report.bytesReceived} bytes, mất ${videoPacketsLost} packets`);
                    }
                });

                // Phát hiện vấn đề
                if (videoPermission && cameraOn && !videoSent) {
                    console.warn('Phát hiện video không gửi được mặc dù camera đang bật!');
                    // Thử khởi động lại video tracks
                    toggleVideoRestart();
                }

                // Nếu mất gói tin quá cao, giảm chất lượng video
                if (videoPacketsLost > 50) {
                    console.warn(`Mất gói tin video cao (${videoPacketsLost}), cân nhắc giảm chất lượng`);
                    // TODO: Thêm code giảm chất lượng video nếu cần
                }

            } catch (err) {
                console.error('Lỗi khi lấy stats:', err);
            }
        }, 5000);


        // Restart video track nếu gặp vấn đề
        const toggleVideoRestart = async () => {
            try {
                if (!peerManager.localStream) return;

                const videoTracks = peerManager.localStream.getVideoTracks();
                if (videoTracks.length === 0) return;

                console.log('Thử restart video tracks để khắc phục vấn đề');

                // Tắt tất cả video tracks
                for (const track of videoTracks) {
                    track.enabled = false;
                }

                // Đợi 500ms và bật lại
                await new Promise(resolve => setTimeout(resolve, 500));

                // Bật lại tất cả video tracks
                for (const track of videoTracks) {
                    track.enabled = true;
                    console.log(`Đã restart track ${track.label}`);
                }

                // Nếu có thể, thử reinitiate connection
                if (peerManager.currentCall?.peerConnection) {
                    peerManager.restartIce(peerManager.currentCall.peerConnection);
                }

            } catch (err) {
                console.error('Lỗi khi restart video tracks:', err);
            }
        };

        // Thiết lập event listeners
        pc.addEventListener('connectionstatechange', connectionStateHandler);
        pc.addEventListener('iceconnectionstatechange', connectionStateHandler);

        // Lắng nghe video track events
        const videoTrackListeners = [];

        if (peerManager.localStream) {
            peerManager.localStream.getVideoTracks().forEach(track => {
                const onMute = () => console.log(`Video track ${track.label} bị mute`);
                const onUnmute = () => console.log(`Video track ${track.label} được unmute`);
                const onEnded = () => console.log(`Video track ${track.label} đã kết thúc`);

                track.addEventListener('mute', onMute);
                track.addEventListener('unmute', onUnmute);
                track.addEventListener('ended', onEnded);

                videoTrackListeners.push({
                    track, events: [
                        { name: 'mute', handler: onMute },
                        { name: 'unmute', handler: onUnmute },
                        { name: 'ended', handler: onEnded }
                    ]
                });
            });
        }

        // Xử lý khi component unmount
        return () => {
            clearInterval(statsInterval);
            pc.removeEventListener('connectionstatechange', connectionStateHandler);
            pc.removeEventListener('iceconnectionstatechange', connectionStateHandler);

            // Dọn dẹp track listeners
            videoTrackListeners.forEach(({ track, events }) => {
                events.forEach(event => {
                    track.removeEventListener(event.name, event.handler);
                });
            });
        };
    }, [peerConnected, peerManager.currentCall, videoPermission, cameraOn]);

    useEffect(() => {
        if (!open || !socket || !peerManager.currentCall?.peerConnection) return;

        console.log('Thiết lập xử lý tín hiệu WebRTC cho video');

        const handleSignalingData = ({ signalData, fromUser }) => {
            // Chỉ xử lý tín hiệu từ người khác
            if (fromUser._id === userId) return;

            const pc = peerManager.currentCall.peerConnection;
            if (!pc) return;

            console.log('Nhận tín hiệu WebRTC:', signalData.type);

            const handleIncomingOffer = async () => {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
                    console.log('Đã thiết lập remote description từ offer');

                    // Tạo answer
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    console.log('Đã tạo và thiết lập local answer');

                    // Gửi answer
                    socket.emit('webrtc-signaling', {
                        conversationId,
                        fromUser: { _id: userId },
                        signalData: {
                            type: 'answer',
                            sdp: pc.localDescription
                        }
                    });
                    console.log('Đã gửi answer');
                } catch (err) {
                    console.error('Lỗi khi xử lý offer:', err);
                }
            };

            const handleIncomingAnswer = async () => {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
                    console.log('Đã thiết lập remote description từ answer');
                } catch (err) {
                    console.error('Lỗi khi xử lý answer:', err);
                }
            };

            const handleIceCandidate = async () => {
                try {
                    if (signalData.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
                        console.log('Đã thêm ICE candidate');
                    }
                } catch (err) {
                    console.error('Lỗi khi thêm ICE candidate:', err);
                }
            };

            // Xử lý theo loại tín hiệu
            switch (signalData.type) {
                case 'offer':
                    handleIncomingOffer();
                    break;
                case 'answer':
                    handleIncomingAnswer();
                    break;
                case 'candidate':
                    handleIceCandidate();
                    break;
                default:
                    console.log('Loại tín hiệu không xác định:', signalData.type);
            }
        };

        // Đăng ký lắng nghe sự kiện tín hiệu
        socket.on('webrtc-signaling', handleSignalingData);

        // Lắng nghe ICE candidates mới và gửi đi
        const handleICECandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-signaling', {
                    conversationId,
                    fromUser: { _id: userId },
                    signalData: {
                        type: 'candidate',
                        candidate: event.candidate
                    }
                });
            }
        };

        const pc = peerManager.currentCall.peerConnection;
        pc.addEventListener('icecandidate', handleICECandidate);

        // Gửi track mới khi được thêm vào kết nối
        pc.addEventListener('track', event => {
            console.log('Nhận được track mới:', event.track.kind, 'enabled=', event.track.enabled);

            // QUAN TRỌNG: Đảm bảo track được bật
            if (event.track.kind === 'video') {
                event.track.enabled = true;

                // Thêm event listeners để theo dõi trạng thái track
                event.track.onmute = () => {
                    console.log('Video track bị muted');
                    setTimeout(() => {
                        try {
                            event.track.enabled = true;
                        } catch (e) { }
                    }, 100);
                };

                event.track.onunmute = () => console.log('Video track được unmuted');
                event.track.onended = () => console.log('Video track kết thúc');
            }

            // QUAN TRỌNG: Lưu stream và cập nhật giao diện ngay lập tức
            if (event.streams && event.streams[0]) {
                console.log('Cập nhật remote stream với track mới');

                // Lưu stream vào peerManager
                peerManager.remoteStream = event.streams[0];

                // Lưu các track mới vào stream
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];

                    // Cố gắng phát video ngay lập tức
                    remoteVideoRef.current.play()
                        .then(() => {
                            console.log('✅ Video đã bắt đầu phát');
                            // Kích hoạt cập nhật UI
                            setVideoModeActive(true);
                        })
                        .catch(err => {
                            console.warn('⚠️ Không thể tự động phát video:', err);
                        });
                }

                // Cập nhật UI để hiển thị video mode
                if (event.track.kind === 'video') {
                    setVideoModeActive(true);
                }
            }
        });

        return () => {
            socket.off('webrtc-signaling', handleSignalingData);
            pc.removeEventListener('icecandidate', handleICECandidate);
        };
    }, [open, socket, peerManager.currentCall, conversationId, userId]);

    useEffect(() => {
        if (!peerManager.remoteStream) return;

        const handleAddTrack = (event) => {
            console.log('Remote stream received new track:', event.track.kind);

            if (event.track.kind === 'video') {
                // Force enable video track
                event.track.enabled = true;

                // Đảm bảo UI hiển thị video
                setVideoModeActive(true);

                // Đảm bảo video element được gán stream
                if (remoteVideoRef.current) {
                    if (!remoteVideoRef.current.srcObject ||
                        remoteVideoRef.current.srcObject.id !== peerManager.remoteStream.id) {
                        remoteVideoRef.current.srcObject = peerManager.remoteStream;
                        remoteVideoRef.current.play().catch(e => console.warn('Không thể phát video:', e));
                    }
                }
            }
        };

        // Đăng ký sự kiện
        peerManager.remoteStream.addEventListener('addtrack', handleAddTrack);

        // Cleanup
        return () => {
            try {
                // Sửa: Kiểm tra null trước khi gọi removeEventListener
                if (peerManager && peerManager.remoteStream) {
                    peerManager.remoteStream.removeEventListener('addtrack', handleAddTrack);
                }
            } catch (err) {
                console.warn('Lỗi khi dọn dẹp event listeners:', err);
            }
        };
    }, [peerManager.remoteStream]);

    // Thêm useEffect để xử lý stream video
    useEffect(() => {
        // Chỉ thực hiện khi đã kết nối và có remote stream
        if (peerConnected && peerManager.remoteStream) {
            const videoTracks = peerManager.remoteStream.getVideoTracks();
            console.log(`Video tracks hiện có: ${videoTracks.length}, trạng thái:`,
                videoTracks.map(t => `${t.label}: enabled=${t.enabled}, state=${t.readyState}`).join(', '));

            if (videoTracks.length > 0) {
                const hasEnabledTrack = videoTracks.some(track => track.enabled);
                console.log('Có video track đang hoạt động:', hasEnabledTrack);

                // Đảm bảo video element có stream mới nhất
                if (remoteVideoRef.current) {
                    console.log('Gán remoteStream cho video element');

                    // Quan trọng: Gán lại stream và play
                    if (!remoteVideoRef.current.srcObject ||
                        remoteVideoRef.current.srcObject.id !== peerManager.remoteStream.id) {
                        remoteVideoRef.current.srcObject = peerManager.remoteStream;

                        // Bọc trong try-catch để tránh lỗi nếu không thể tự động phát
                        try {
                            remoteVideoRef.current.play()
                                .then(() => console.log('✅ Video đã bắt đầu phát'))
                                .catch(err => console.warn('⚠️ Không thể tự động phát video:', err));
                        } catch (err) {
                            console.error('Lỗi khi cố gắng phát video:', err);
                        }
                    }
                }
            }
        }
    }, [peerConnected, peerManager.remoteStream]);


    useEffect(() => {
        if (!peerConnected) return;

        // Lấy thông tin các video tracks
        const remoteVideoTracks = peerManager.remoteStream?.getVideoTracks() || [];
        const hasRemoteVideo = remoteVideoTracks.length > 0 &&
            remoteVideoTracks.some(t => t.enabled);

        // Điều kiện hiển thị video mode (local camera hoặc remote video)
        const shouldShowVideoMode = (videoPermission && cameraOn) || hasRemoteVideo;

        // Giám sát các giá trị để debug
        console.log('Video mode conditions:', {
            localCamera: videoPermission && cameraOn,
            remoteVideoTracks: remoteVideoTracks.length,
            hasRemoteVideo,
            currentMode: videoModeActive ? 'VIDEO' : 'AUDIO',
            shouldSwitch: videoModeActive !== shouldShowVideoMode
        });

        // Nếu đang ở chế độ video nhưng không còn điều kiện, đợi lâu hơn trước khi chuyển
        if (videoModeActive && !shouldShowVideoMode) {
            console.log('Phát hiện mất video, chờ trước khi chuyển mode...');

            const timeoutId = setTimeout(() => {
                // Kiểm tra lại điều kiện sau khi đợi
                const currentRemoteVideoTracks = peerManager.remoteStream?.getVideoTracks() || [];
                const currentHasRemoteVideo = currentRemoteVideoTracks.length > 0 &&
                    currentRemoteVideoTracks.some(t => t.enabled);
                const currentShouldShow = (videoPermission && cameraOn) || currentHasRemoteVideo;

                if (!currentShouldShow) {
                    console.log('Xác nhận mất video sau thời gian chờ, chuyển chế độ audio');
                    setVideoModeActive(false);
                } else {
                    console.log('Video đã khôi phục trong thời gian chờ, giữ chế độ video');
                }
            }, 5000); // Tăng thời gian chờ từ 2s lên 5s

            return () => clearTimeout(timeoutId);
        }
        // Nếu không ở chế độ video và có điều kiện, chuyển ngay lập tức
        else if (!videoModeActive && shouldShowVideoMode) {
            console.log('Phát hiện có video, chuyển chế độ video');
            setVideoModeActive(true);

            // Đảm bảo stream được gán đúng
            if (peerManager.remoteStream && remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = peerManager.remoteStream;
            }
        }
    }, [peerConnected, videoPermission, cameraOn, peerManager.remoteStream]);

    useEffect(() => {
        if (!peerConnected || !peerManager.remoteStream) return;

        // Biến để theo dõi lần cuối cùng thực hiện renegotiation
        let lastRenegotiationTime = 0;
        const MIN_RENEGOTIATION_INTERVAL = 5000; // Tối thiểu 5 giây giữa các lần renegotiate

        console.log('Thiết lập giám sát video duy nhất');

        // INTERVAL DUY NHẤT để giám sát video
        const videoStabilityMonitor = setInterval(() => {
            if (!peerManager.remoteStream) return;

            const videoTracks = peerManager.remoteStream.getVideoTracks();
            if (videoTracks.length === 0) return;

            // Kiểm tra trạng thái video tracks
            const activeVideoTracks = videoTracks.filter(t => t.enabled && t.readyState === 'live');
            console.log(`Video health [${new Date().toLocaleTimeString()}]: ${activeVideoTracks.length}/${videoTracks.length} tracks hoạt động`);

            // KHÔNG thay đổi trạng thái enabled của tracks trong quá trình kiểm tra
            // CHỈ kiểm tra và renegotiate khi cần thiết

            // Nếu không có track nào hoạt động và đã qua đủ thời gian tối thiểu
            if (videoTracks.length > 0 && activeVideoTracks.length === 0) {
                const now = Date.now();
                if (now - lastRenegotiationTime > MIN_RENEGOTIATION_INTERVAL) {
                    console.log('Khởi động quá trình khôi phục video sau khoảng thời gian không hoạt động');
                    lastRenegotiationTime = now;

                    if (peerManager.currentCall?.peerConnection) {
                        optimizedRenegotiateConnection(
                            peerManager.currentCall.peerConnection,
                            socket,
                            conversationId,
                            userId
                        );
                    }
                }
            }

            // Đảm bảo video được hiển thị nếu có tracks hoạt động
            if (activeVideoTracks.length > 0) {
                if (!videoModeActive) {
                    console.log('Đã phát hiện video tracks hoạt động, cập nhật UI');
                    setVideoModeActive(true);
                }

                // Đảm bảo stream được gán cho video element
                if (remoteVideoRef.current) {
                    if (!remoteVideoRef.current.srcObject ||
                        remoteVideoRef.current.srcObject.id !== peerManager.remoteStream.id) {
                        remoteVideoRef.current.srcObject = peerManager.remoteStream;
                        remoteVideoRef.current.play().catch(e => { });
                    }
                }
            }
        }, 2000); // Giảm tần suất xuống 2 giây

        // Cleanup khi unmount
        return () => {
            clearInterval(videoStabilityMonitor);
        };
    }, [peerConnected, peerManager.remoteStream]);

    const optimizedRenegotiateConnection = async (peerConnection, socket, conversationId, userId) => {
        console.log('=== Bắt đầu quá trình tối ưu kết nối video liên tục ===');

        try {
            // Bước 1: Thiết lập băng thông thấp hơn để đảm bảo truyền liên tục
            const videoSenders = peerConnection.getSenders().filter(s => s.track && s.track.kind === 'video');

            // Bước 2: Thiết lập tham số băng thông ỔN ĐỊNH (ưu tiên ổn định hơn chất lượng)
            for (const sender of videoSenders) {
                try {
                    const params = sender.getParameters();
                    if (!params.encodings) params.encodings = [{}];
                    if (params.encodings.length === 0) params.encodings.push({});

                    // Giảm băng thông để đảm bảo truyền liên tục
                    params.encodings[0].maxBitrate = 800000;  // 800kbps - ưu tiên độ ổn định
                    params.encodings[0].minBitrate = 300000;  // 300kbps minimum
                    params.encodings[0].maxFramerate = 20;    // Giảm framerate để tăng ổn định
                    params.encodings[0].priority = 'high';
                    params.encodings[0].networkPriority = 'high';
                    params.encodings[0].degradationPreference = 'maintain-framerate'; // Ưu tiên framerate thấp nhưng ổn định

                    await sender.setParameters(params);
                    console.log('✅ Thiết lập video với băng thông ổn định');
                } catch (e) {
                    console.warn('Không thể thiết lập tham số video:', e);
                }
            }

            // Bước 3: Tạo offer với ưu tiên ổn định và không restart ICE
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                iceRestart: false, // KHÔNG restart ICE để tránh ngắt kết nối
                voiceActivityDetection: false
            });

            // Bước 4: Tối ưu SDP với tham số ổn định
            offer.sdp = optimizeSdpForStableVideo(offer.sdp);

            // Bước 5: Thiết lập description và gửi offer
            await peerConnection.setLocalDescription(offer);
            socket.emit('webrtc-signaling', {
                conversationId,
                fromUser: { _id: userId },
                signalData: {
                    type: 'offer',
                    sdp: peerConnection.localDescription
                }
            });
        } catch (err) {
            console.error('Lỗi khi tối ưu kết nối video:', err);
        }
    };

    // Thêm hàm tối ưu SDP mới
    const optimizeSdpForStableVideo = (sdp) => {
        return sdp
            .replace('a=mid:video', 'a=mid:video\r\na=content:main\r\na=quality:10\r\na=fmtp:96 x-google-min-bitrate=1000;x-google-max-bitrate=2000')
            .replace(/b=AS:([0-9]+)/g, 'b=AS:2000')
            .replace('a=rtcp-fb:96 nack',
                'a=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc');
    };

    // Hàm định dạng thời gian
    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Xử lý các hành động UI
    const handleToggleMic = () => {
        const newMicState = !micOn;
        setMicOn(newMicState);
        peerManager.toggleMicrophone(newMicState);
        message.success(newMicState ? 'Đã bật micro' : 'Đã tắt micro', 1);
    };

    const handleToggleCamera = async () => {
        try {
            console.log("=== handleToggleCamera được gọi ===");

            // Nếu chưa có quyền camera, yêu cầu trước
            if (!videoPermission) {
                message.loading('Đang yêu cầu quyền truy cập camera...', 2);

                try {
                    // Yêu cầu video stream với các ràng buộc hợp lý
                    const videoStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            frameRate: { ideal: 15 }
                        }
                    });

                    console.log(`Đã nhận được video stream với ${videoStream.getVideoTracks().length} video tracks`);

                    // Kiểm tra video track hợp lệ
                    if (videoStream && videoStream.getVideoTracks().length > 0) {
                        if (peerManager.localStream) {
                            // Thêm video track vào localStream hiện có
                            const videoTrack = videoStream.getVideoTracks()[0];
                            await peerManager.addVideoTrack(videoTrack);

                            // Cập nhật UI
                            setVideoPermission(true);
                            setCameraOn(true);

                            // Gán ngay stream mới cho local video element
                            if (localVideoRef.current) {
                                localVideoRef.current.srcObject = peerManager.localStream;
                                localVideoRef.current.play().catch(err => console.warn("Không thể phát video:", err));
                            }
                            // QUAN TRỌNG: Luôn gọi renegotiation khi thêm video track
                            console.log("Thực hiện renegotiation sau khi bật camera lần đầu");
                            if (peerManager.currentCall?.peerConnection) {
                                renegotiateConnection(
                                    peerManager.currentCall.peerConnection,
                                    socket,
                                    conversationId,
                                    userId
                                );
                            }


                            message.success('Đã bật camera', 1);
                            // THÊM: Renegotiate kết nối để gửi video stream
                            // if (peerManager.currentCall?.peerConnection) {
                            //     console.log("Thực hiện renegotiation sau khi bật camera");
                            //     renegotiateConnection(
                            //         peerManager.currentCall.peerConnection,
                            //         socket,
                            //         conversationId,
                            //         userId
                            //     );
                            // }
                        } else {

                            // Nếu chưa có localStream
                            peerManager.localStream = videoStream;

                            // QUAN TRỌNG: Gán ngay stream mới cho local video element
                            if (localVideoRef.current) {
                                console.log("Gán videoStream mới cho local video element");
                                localVideoRef.current.srcObject = videoStream;

                                // Đảm bảo video element chơi stream
                                localVideoRef.current.play().catch(err => {
                                    console.warn("Không thể tự động phát video:", err);
                                });
                            }

                            setVideoPermission(true);
                            setCameraOn(true);
                            message.success('Đã bật camera', 1);
                        }
                    }
                } catch (err) {
                    console.error('Không thể truy cập camera:', err);
                    message.error('Không thể truy cập camera, vui lòng kiểm tra quyền truy cập');
                    return;
                }
            } else {
                // Chỉ toggle trạng thái nếu đã có quyền camera
                const newCameraState = !cameraOn;
                setCameraOn(newCameraState);

                // Xử lý các video track
                // if (peerManager.localStream) {
                //     const videoTracks = peerManager.localStream.getVideoTracks();
                //     console.log(`Toggle ${videoTracks.length} video tracks -> ${newCameraState ? 'BẬT' : 'TẮT'}`);

                //     videoTracks.forEach(track => {
                //         track.enabled = newCameraState;
                //         console.log(`Video track ${track.label} đã được ${newCameraState ? 'bật' : 'tắt'}`);
                //     });

                // QUAN TRỌNG: Khi bật camera, đảm bảo gán lại stream và chơi video
                // if (newCameraState && localVideoRef.current) {
                //     console.log("Gán lại localStream cho local video element khi bật camera");
                //     localVideoRef.current.srcObject = peerManager.localStream;

                //     // Đảm bảo video element chơi stream
                //     localVideoRef.current.play().catch(err => {
                //         console.warn("Không thể tự động phát video:", err);
                //     });

                //     // Thêm thời gian chờ ngắn để đảm bảo video hiển thị (workaround)
                //     setTimeout(() => {
                //         if (localVideoRef.current && !localVideoRef.current.playing) {
                //             localVideoRef.current.srcObject = peerManager.localStream;
                //             localVideoRef.current.play().catch(() => { });
                //         }
                //     }, 200);
                //     // THÊM: Renegotiate kết nối để gửi video stream
                //     if (newCameraState && peerManager.currentCall?.peerConnection) {
                //         console.log("Thực hiện renegotiation sau khi bật camera");
                //         renegotiateConnection(
                //             peerManager.currentCall.peerConnection,
                //             socket,
                //             conversationId,
                //             userId
                //         );
                //     }
                // }


                // Thông báo đối tác trạng thái video thông qua data channel
                // if (peerManager.currentCall?.peerConnection) {
                //     sendVideoStatusUpdate(peerManager.currentCall.peerConnection, newCameraState);
                // }

                // message.success(newCameraState ? 'Đã bật camera' : 'Đã tắt camera', 1);
                // }
                if (!newCameraState && peerManager.localStream) {
                    const videoTracks = peerManager.localStream.getVideoTracks();
                    videoTracks.forEach(track => {
                        track.enabled = false;
                        track.stop(); // Dừng track để giải phóng camera
                    });

                    message.success('Đã tắt camera', 1);
                }
                // Nếu bật lại camera
                else if (newCameraState) {
                    try {
                        // Lấy video stream mới vì stream cũ đã bị dừng
                        const newVideoStream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                width: { ideal: 640 },
                                height: { ideal: 480 },
                                frameRate: { ideal: 15 }
                            }
                        });

                        if (newVideoStream && newVideoStream.getVideoTracks().length > 0) {
                            const videoTrack = newVideoStream.getVideoTracks()[0];
                            await peerManager.addVideoTrack(videoTrack);

                            // Cập nhật UI
                            if (localVideoRef.current) {
                                localVideoRef.current.srcObject = peerManager.localStream;
                                localVideoRef.current.play().catch(err => console.warn("Không thể phát video:", err));
                            }

                            // Renegotiate để gửi video mới tới người nhận
                            if (peerManager.currentCall?.peerConnection) {
                                renegotiateConnection(
                                    peerManager.currentCall.peerConnection,
                                    socket,
                                    conversationId,
                                    userId
                                );
                            }
                        }

                        message.success('Đã bật camera', 1);
                    } catch (err) {
                        console.error('Lỗi khi bật lại camera:', err);
                        message.error('Không thể bật camera');
                        setCameraOn(false);
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi khi xử lý camera:', error);
            message.error('Có lỗi xảy ra khi xử lý camera');
        }
    };


    // const renegotiateConnection = async (peerConnection, socket, conversationId, userId) => {
    //     console.log('=== Bắt đầu quá trình renegotiation với video ===');
    //     try {
    //         // Lưu trữ trạng thái tracks hiện tại
    //         const videoSenders = peerConnection.getSenders().filter(s => s.track && s.track.kind === 'video');
    //         const videoTrackStates = videoSenders.map(sender => ({
    //             sender,
    //             enabled: sender.track.enabled,
    //             readyState: sender.track.readyState
    //         }));

    //         // Tạo offer với các tham số ưu tiên giữ kết nối
    //         const offer = await peerConnection.createOffer({
    //             offerToReceiveAudio: true,
    //             offerToReceiveVideo: true,
    //             iceRestart: true,
    //             voiceActivityDetection: false // Tắt VAD để tránh ngắt quãng
    //         });

    //         // Sửa đổi offer SDP để ưu tiên video
    //         offer.sdp = offer.sdp
    //             // Thêm các tham số băng thông cao cho video
    //             .replace('a=mid:video', 'a=mid:video\r\na=content:main\r\na=quality:10')
    //             // Tăng giới hạn băng thông
    //             .replace(/b=AS:([0-9]+)/g, 'b=AS:2000');

    //         // Thiết lập local description
    //         await peerConnection.setLocalDescription(offer);
    //         console.log('Đã thiết lập local description với video được tối ưu');

    //         // Gửi offer qua socket signaling
    //         socket.emit('webrtc-signaling', {
    //             conversationId,
    //             fromUser: { _id: userId },
    //             signalData: {
    //                 type: 'offer',
    //                 sdp: peerConnection.localDescription
    //             }
    //         });

    //         // Khôi phục trạng thái tracks sau khi renegotiate
    //         setTimeout(() => {
    //             videoTrackStates.forEach(({ sender, enabled, readyState }) => {
    //                 if (sender.track) {
    //                     sender.track.enabled = enabled;
    //                     console.log(`Khôi phục trạng thái track ${sender.track.id}: enabled=${enabled}`);
    //                 }
    //             });

    //             // Thiết lập tham số ưu tiên cho video
    //             videoSenders.forEach(async (sender) => {
    //                 try {
    //                     const params = sender.getParameters();
    //                     if (params.encodings && params.encodings.length > 0) {
    //                         // Tăng độ ưu tiên và băng thông cho video
    //                         params.encodings[0].maxBitrate = 2000000;  // 2Mbps
    //                         params.encodings[0].minBitrate = 500000;
    //                         params.encodings[0].maxFramerate = 24;
    //                         params.encodings[0].networkPriority = 'high';
    //                         params.encodings[0].scaleResolutionDownBy = 1.0; // Không giảm độ phân giải
    //                         params.encodings[0].active = true;

    //                         await sender.setParameters(params);
    //                         console.log('✅ Đã thiết lập tham số cao cấp cho video');
    //                     }
    //                 } catch (e) {
    //                     console.warn('⚠️ Không thể thiết lập tham số video:', e);
    //                 }
    //             });
    //         }, 500);
    //     } catch (err) {
    //         console.error('Lỗi khi renegotiate kết nối:', err);
    //     }
    // };
    // const renegotiateConnection = async (peerConnection, socket, conversationId, userId) => {
    //     console.log('=== Bắt đầu quá trình renegotiation với video ===');
    //     try {
    //         // Đảm bảo streams video được duy trì liên tục và không bị ngắt quãng
    //         const videoSenders = peerConnection.getSenders().filter(s => s.track && s.track.kind === 'video');

    //         if (videoSenders.length > 0) {
    //             console.log(`Tìm thấy ${videoSenders.length} video sender, cấu hình lại với chất lượng cao`);

    //             // 1. Thiết lập video với độ ưu tiên cao TRƯỚC khi renegotiate
    //             for (const sender of videoSenders) {
    //                 try {
    //                     const params = sender.getParameters();
    //                     if (params.encodings && params.encodings.length > 0) {
    //                         params.encodings[0].maxBitrate = 2000000;  // 2 Mbps
    //                         params.encodings[0].minBitrate = 800000;   // Tối thiểu 800kbps để ổn định
    //                         params.encodings[0].maxFramerate = 30;     // Frame rate cao
    //                         params.encodings[0].priority = 'high';
    //                         params.encodings[0].networkPriority = 'high';
    //                         params.encodings[0].active = true;

    //                         await sender.setParameters(params);
    //                     }

    //                     // Đảm bảo contentHint được thiết lập
    //                     if (sender.track) {
    //                         sender.track.contentHint = 'detail';
    //                     }
    //                 } catch (e) {
    //                     console.warn('Không thể cấu hình video track:', e);
    //                 }
    //             }
    //         }

    //         // 2. Tạo offer mới với cấu hình tối ưu cho video
    //         const offer = await peerConnection.createOffer({
    //             offerToReceiveAudio: true,
    //             offerToReceiveVideo: true,
    //             iceRestart: true,
    //             voiceActivityDetection: false // Quan trọng: tắt voice detection để truyền liên tục
    //         });

    //         // 3. Tùy chỉnh SDP để ưu tiên video
    //         offer.sdp = enhanceSdpForVideo(offer.sdp);

    //         // 4. Thiết lập local description
    //         await peerConnection.setLocalDescription(offer);
    //         console.log('Đã thiết lập local description với video được tối ưu');

    //         // 5. Gửi offer qua socket signaling
    //         socket.emit('webrtc-signaling', {
    //             conversationId,
    //             fromUser: { _id: userId },
    //             signalData: {
    //                 type: 'offer',
    //                 sdp: peerConnection.localDescription
    //             }
    //         });

    //         // 6. Giám sát trạng thái kết nối và track
    //         const monitorConnection = setInterval(() => {
    //             if (!peerConnection || peerConnection.connectionState === 'closed') {
    //                 clearInterval(monitorConnection);
    //                 return;
    //             }

    //             const currentSenders = peerConnection.getSenders().filter(s => s.track && s.track.kind === 'video');
    //             currentSenders.forEach(sender => {
    //                 if (sender.track && !sender.track.enabled) {
    //                     console.log('Phát hiện video track bị disabled, đang bật lại');
    //                     sender.track.enabled = true;
    //                 }
    //             });
    //         }, 2000);

    //         // Xóa interval sau 20 giây
    //         setTimeout(() => clearInterval(monitorConnection), 20000);

    //     } catch (err) {
    //         console.error('Lỗi khi renegotiate kết nối:', err);
    //     }
    // };
    const renegotiateConnection = async (peerConnection, socket, conversationId, userId) => {
        console.log('=== Bắt đầu quá trình renegotiation với tối ưu video liên tục ===');

        try {
            // Bước 1: Lưu trạng thái video track hiện tại
            const videoSenders = peerConnection.getSenders().filter(s => s.track && s.track.kind === 'video');

            // Bước 2: Đánh dấu tất cả video track là enabled
            videoSenders.forEach(sender => {
                if (sender.track) sender.track.enabled = true;
            });

            // Bước 3: Thiết lập tham số băng thông cao cho video trước khi renegotiate
            for (const sender of videoSenders) {
                try {
                    const params = sender.getParameters();
                    if (!params.encodings) params.encodings = [{}];
                    if (params.encodings.length === 0) params.encodings.push({});

                    params.encodings[0].maxBitrate = 2000000;  // 2Mbps
                    params.encodings[0].minBitrate = 500000;   // 500kbps minimum
                    params.encodings[0].maxFramerate = 30;
                    params.encodings[0].priority = 'high';
                    params.encodings[0].networkPriority = 'high';
                    params.encodings[0].active = true;

                    await sender.setParameters(params);
                    console.log('✅ Video bandwidth optimized');
                } catch (e) {
                    console.warn('Không thể cấu hình video track:', e);
                }
            }

            // Bước 4: Tạo SDP offer tối ưu cho video
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                iceRestart: true,
                voiceActivityDetection: false  // Tắt VAD
            });

            // Bước 5: Tối ưu SDP
            offer.sdp = offer.sdp
                .replace('a=mid:video', 'a=mid:video\r\na=content:main\r\na=quality:10')
                .replace(/a=fmtp:(\d+)/, 'a=fmtp:$1 x-google-start-bitrate=1000;x-google-min-bitrate=500;x-google-max-bitrate=2000')
                .replace(/b=AS:([0-9]+)/g, 'b=AS:2000')
                // Thêm REMB (Receiver Estimated Maximum Bitrate) và PLI (Picture Loss Indication)
                .replace('a=rtcp-fb:96 nack',
                    'a=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc');

            // Bước 6: Thiết lập local description với SDP đã tối ưu
            await peerConnection.setLocalDescription(offer);
            console.log('✅ Set local description with optimized video parameters');

            // Bước 7: Gửi offer qua socket
            socket.emit('webrtc-signaling', {
                conversationId,
                fromUser: { _id: userId },
                signalData: {
                    type: 'offer',
                    sdp: peerConnection.localDescription
                }
            });

            // Bước 8: Thêm theo dõi để đảm bảo kết nối ổn định
            const monitorId = setInterval(() => {
                try {
                    if (!peerConnection || peerConnection.connectionState === 'closed') {
                        clearInterval(monitorId);
                        return;
                    }

                    // Kiểm tra và khôi phục video tracks nếu cần
                    const currentVideoSenders = peerConnection.getSenders()
                        .filter(s => s.track && s.track.kind === 'video');

                    currentVideoSenders.forEach(sender => {
                        if (sender.track && !sender.track.enabled) {
                            sender.track.enabled = true;
                        }
                    });
                } catch (e) {
                    clearInterval(monitorId);
                }
            }, 2000);

            // Xóa interval sau 30 giây
            setTimeout(() => clearInterval(monitorId), 30000);

        } catch (err) {
            console.error('Lỗi khi renegotiate kết nối:', err);
        }
    };

    // const enhanceSdpForVideo = (sdp) => {
    //     // Tối ưu cho video: thêm các thông số chất lượng cao và băng thông
    //     return sdp
    //         .replace('a=mid:video', 'a=mid:video\r\na=content:main\r\na=quality:10\r\na=fmtp:96 x-google-min-bitrate=800;x-google-max-bitrate=2000')
    //         .replace(/b=AS:([0-9]+)/g, 'b=AS:2000')
    //         .replace('a=rtcp-fb:96 nack', 'a=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc');
    // };

    const enhanceSdpForContinuousVideo = (sdp) => {
        return sdp
            .replace('a=mid:video', 'a=mid:video\r\na=content:main\r\na=quality:10')
            .replace(/b=AS:([0-9]+)/g, 'b=AS:2000')
            // Thêm tham số để video không ngắt quãng
            .replace('a=rtcp-fb:96 nack',
                'a=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc' +
                '\r\na=fmtp:96 x-google-start-bitrate=1000;x-google-min-bitrate=500;x-google-max-bitrate=2000;' +
                'x-google-max-quantization=56');
    };


    const sendVideoStatusUpdate = (peerConnection, enabled) => {
        try {
            // Tạo data channel riêng để thông báo
            const dataChannelId = `video-status-${Date.now()}`;
            const dataChannel = peerConnection.createDataChannel(dataChannelId, {
                ordered: true,
                maxRetransmits: 3
            });

            dataChannel.onopen = () => {
                if (dataChannel.readyState === 'open') {
                    console.log('Gửi thông báo trạng thái video:', enabled);

                    // Gửi thông tin
                    dataChannel.send(JSON.stringify({
                        type: 'video-status',
                        enabled: enabled,
                        timestamp: Date.now()
                    }));

                    // Đóng data channel sau khi gửi
                    setTimeout(() => {
                        dataChannel.close();
                    }, 500);
                }
            };
        } catch (e) {
            console.warn('Không thể gửi thông báo status qua data channel:', e);
        }
    };

    const handleSwitchCamera = async () => {
        setSwitchingCamera(true);
        message.loading('Đang chuyển đổi camera...', 1);

        try {
            const newStream = await peerManager.switchCamera();
            if (newStream && localVideoRef.current) {
                localVideoRef.current.srcObject = newStream;
                message.success('Đã chuyển đổi camera', 1);
            } else {
                message.warning('Không thể chuyển đổi camera', 1);
            }
        } catch (err) {
            console.error('Lỗi khi chuyển đổi camera:', err);
            message.error('Không thể chuyển đổi camera', 1);
        } finally {
            setSwitchingCamera(false);
        }
    };

    const handleVolumeChange = (newVolume) => {
        setVolumeLevel(newVolume);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.volume = newVolume / 100;
        }
    };

    const handleEndCall = () => {
        setEndingCall(true);
        console.log('Kết thúc cuộc gọi video...');

        try {
            stopAllSounds();

            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            socket.off('peer-id');

            if (socket) {
                socket.emit('end-call', {
                    conversationId,
                    fromUser: { _id: userId }
                });
            }

            peerManager.endCall();
            message.success('Đã kết thúc cuộc gọi', 1);

            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Lỗi khi kết thúc cuộc gọi video:', err);
            onClose();
        }
    };
    // Thêm hàm xử lý toggle loa
    const handleToggleSpeaker = () => {
        const newSpeakerState = !speakerOn;
        setSpeakerOn(newSpeakerState);

        console.log(`${newSpeakerState ? 'Bật' : 'Tắt'} loa với volume ${newSpeakerState ? volumeLevel : 0}%`);

        // Cập nhật cho cả hai elements
        if (remoteAudioRef.current) {
            remoteAudioRef.current.volume = newSpeakerState ? volumeLevel / 100 : 0;
            remoteAudioRef.current.muted = !newSpeakerState;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.volume = newSpeakerState ? volumeLevel / 100 : 0;
            remoteVideoRef.current.muted = !newSpeakerState;
        }

        message.success(newSpeakerState ? 'Đã bật loa' : 'Đã tắt loa', 1);
    };

    const MutedSpeakerIcon = () => (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <SoundOutlined />
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '-3px',
                width: 'calc(100% + 6px)',
                height: '2px',
                backgroundColor: '#ff4d4f',
                transform: 'rotate(-45deg) translateY(-50%)',
            }} />
        </div>
    );

    const styles = `
    .video-loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .remote-video-container {
        position: relative;
        width: 100%;
        height: 100%;
        background-color: #111;
    }
    `;

    return (
        <>
            <style>{styles}</style>
            <Modal
                open={open}
                onCancel={onClose}
                footer={null}
                centered
                closable={false}
                width={640}
                className="video-call-modal"
                maskClosable={false}
                bodyStyle={{ padding: 0, position: 'relative', height: 480, overflow: 'hidden' }}
                style={{ top: 20 }}
            >
                {/* Audio element luôn hiện diện (ẩn) để đảm bảo âm thanh liên tục */}
                <audio
                    ref={remoteAudioRef}
                    autoPlay
                    playsInline
                    muted={!speakerOn}
                    style={{ display: 'none' }}
                    onCanPlay={() => {
                        console.log('Audio đã sẵn sàng phát');
                        if (remoteAudioRef.current) {
                            remoteAudioRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                        }
                    }}
                />

                {/* Local video luôn hiển thị khi được bật camera (dù ở chế độ audio hay video) */}
                {videoPermission && cameraOn && (
                    <div className="local-video-container" style={{
                        position: 'absolute',
                        bottom: 70,
                        right: 10,
                        width: 120,
                        height: 180,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '2px solid white',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        zIndex: 99
                    }}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                backgroundColor: '#333'
                            }}
                        />
                        {switchingCamera && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.5)'
                            }}>
                                <SyncOutlined spin style={{ fontSize: 24, color: '#fff' }} />
                            </div>
                        )}
                    </div>
                )}

                {/* Phần chính của UI - Chọn giữa chế độ video và audio dựa vào trạng thái */}
                {videoModeActive ? (
                    // CHẾ ĐỘ VIDEO - khi đã có video track hoạt động hoặc camera được bật
                    <div className="video-mode">
                        <div className="remote-video-container">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                muted={!speakerOn}
                                className="remote-video"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    backgroundColor: '#111' // Thêm background màu tối để dễ thấy khi video load
                                }}
                                onCanPlay={() => {
                                    console.log('Video đã sẵn sàng phát');
                                    // Đảm bảo UI ở chế độ video khi video sẵn sàng
                                    setVideoModeActive(true);
                                }}
                            />
                            {/* Thêm overlay loading khi đang chờ video khởi động */}
                            {(!remoteVideoRef.current?.videoWidth || remoteVideoRef.current?.videoWidth === 0) && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    zIndex: 10
                                }}>
                                    <span>Đang khởi tạo video...</span>
                                    <div style={{ marginTop: 10 }}>
                                        <div className="spinner"></div>
                                    </div>
                                </div>
                            )}
                            {/* Hiển thị trạng thái video */}
                            <div style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                padding: '5px 10px',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                color: '#fff',
                                borderRadius: 4,
                                fontSize: 12,
                                zIndex: 10
                            }}>
                                {peerManager.remoteStream?.getVideoTracks().length > 0 &&
                                    peerManager.remoteStream.getVideoTracks().some(t => t.enabled) ?
                                    "✅ Video đang truyền" :
                                    "⏳ Đang kết nối video..."}
                            </div>

                            {/* Thông tin người gọi trên video */}
                            <div className="remote-user-info" style={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                color: '#fff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                padding: '8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                backdropFilter: 'blur(3px)'
                            }}>
                                <span style={{ fontWeight: 600 }}>{name}</span>
                                <span className="call-duration" style={{ marginLeft: 8 }}>{formatDuration(duration)}</span>
                            </div>

                            {/* Nút chuyển camera (nếu có) */}
                            {videoPermission && cameraOn && (
                                <Button
                                    icon={<SyncOutlined spin={switchingCamera} />}
                                    className="switch-camera-button"
                                    shape="circle"
                                    size="small"
                                    onClick={handleSwitchCamera}
                                    disabled={!videoPermission || switchingCamera}
                                    style={{
                                        position: 'absolute',
                                        top: 10,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: 'rgba(255,255,255,0.8)'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    // CHẾ ĐỘ AUDIO - khi chưa kết nối video hoặc camera đối phương tắt
                    <div className="audio-mode">
                        <div className="audio-mode-container">
                            {/* Avatar cho người đang gọi */}
                            <div className="avatar-container">
                                <Avatar size={80} src={avatar}>
                                    {(!avatar && name) ? name.charAt(0).toUpperCase() : ''}
                                </Avatar>
                            </div>

                            {/* Tên người đang gọi */}
                            <div className="user-name" style={{ fontSize: 18, fontWeight: 600, marginTop: 16 }}>{name}</div>

                            {/* Trạng thái cuộc gọi - hiển thị cho cả người gọi và người nhận */}
                            {initialRejectMessage || internalRejectMessage ? (
                                <div className="call-status-text error" style={{ fontWeight: 500, color: '#ff4d4f', marginTop: 8 }}>
                                    {initialRejectMessage || internalRejectMessage}
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<QuestionCircleOutlined />}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Gặp vấn đề?
                                    </Button>
                                </div>
                            ) : endingCall ? (
                                <div className="call-status-text error" style={{ fontWeight: 500, color: '#ff4d4f', marginTop: 8 }}>
                                    Đã kết thúc cuộc gọi
                                </div>
                            ) : acceptCall ? (
                                <div className="call-status-text connected" style={{ marginTop: 8 }}>
                                    <div style={{ marginBottom: 4 }}>
                                        <span style={{ color: peerConnected ? '#52c41a' : '#faad14' }}>
                                            {peerConnected ? 'Đã kết nối' : 'Đang kết nối...'}
                                        </span>
                                        <span className="call-duration" style={{ marginLeft: 8 }}>{formatDuration(duration)}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                                        <span style={{ color: '#52c41a' }}>
                                            {peerConnected ? 'Đang trong cuộc gọi' : 'Thiết lập kết nối âm thanh...'}
                                        </span>
                                    </div>
                                    {!audioPermission && (
                                        <div style={{ fontSize: '12px', color: '#ff4d4f', marginTop: 4 }}>
                                            Vui lòng cho phép truy cập mic
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="call-status-text connecting" style={{ color: '#888', marginTop: 8 }}>
                                    {/* Hiển thị trạng thái cho NGƯỜI GỌI */}
                                    {peerConnected ? (
                                        <>Đang trong cuộc gọi <span className="call-duration">{formatDuration(duration)}</span></>
                                    ) : (
                                        <>Đang gọi... <span className="call-duration">{formatDuration(duration)}</span></>
                                    )}
                                </div>
                            )}

                            {/* Hiệu ứng đang gọi cho người gọi */}
                            {!peerConnected && !acceptCall && (
                                <div style={{ marginTop: 30, marginBottom: 30 }}>
                                    <div className="calling-animation">
                                        <div className="calling-wave"></div>
                                    </div>
                                </div>
                            )}

                            {/* Hướng dẫn bật camera */}
                            {peerConnected && !videoPermission && (
                                <div style={{
                                    fontSize: '13px',
                                    color: '#1890ff',
                                    marginTop: 16,
                                    textAlign: 'center',
                                    padding: '0 20px'
                                }}>
                                    <InfoCircleOutlined style={{ marginRight: 5 }} />
                                    Nhấn vào nút camera phía dưới để bật video
                                </div>
                            )}

                            {/* Hiệu ứng audio đã kết nối */}
                            {peerConnected && (
                                <div style={{
                                    width: 280,
                                    height: 80,
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '12px',
                                    marginBottom: 16,
                                    marginTop: 16,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        height: '40px',
                                        gap: '4px'
                                    }}>
                                        {/* Giả lập thanh âm thanh đơn giản */}
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <div key={i} style={{
                                                width: '4px',
                                                height: `${10 + Math.floor(Math.random() * 30)}px`,
                                                backgroundColor: speakerOn ? '#52c41a' : '#d9d9d9',
                                                borderRadius: '2px',
                                                animation: speakerOn ? 'sound-wave 1s infinite' : 'none'
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Nút chuyển sang chế độ video nếu đã kết nối */}
                            {peerConnected && !videoPermission && (
                                <Button
                                    className="switch-to-video-button"
                                    icon={<VideoCameraOutlined />}
                                    type="primary"
                                    size="large"
                                    style={{
                                        marginTop: 20,
                                        marginBottom: 20,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        height: '48px',
                                        fontSize: '16px'
                                    }}
                                    onClick={handleToggleCamera}
                                >
                                    Bật camera để chuyển sang chế độ video
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Điều khiển cuộc gọi luôn hiển thị ở cả hai chế độ */}
                <div className="video-call-controls" style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '0',
                    right: '0',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    zIndex: 100
                }}>
                    {/* Điều kiện để hiển thị các nút điều khiển */}
                    {(!initialRejectMessage && !internalRejectMessage && !endingCall) && (
                        <>
                            {/* Chỉ hiển thị nút reload nếu đã kết nối */}
                            {peerConnected && (
                                <Tooltip title="Khởi động lại kết nối">
                                    <Button
                                        shape="circle"
                                        icon={<ReloadOutlined />}
                                        onClick={() => {
                                            message.loading('Đang khởi động lại kết nối...', 2);
                                            if (peerManager.currentCall?.peerConnection) {
                                                peerManager.restartIce(peerManager.currentCall.peerConnection);
                                            }
                                            setTimeout(() => {
                                                if (peerManager.localStream && !localVideoRef.current.srcObject) {
                                                    localVideoRef.current.srcObject = peerManager.localStream;
                                                }
                                                if (peerManager.remoteStream && !remoteVideoRef.current.srcObject) {
                                                    remoteVideoRef.current.srcObject = peerManager.remoteStream;
                                                }
                                            }, 1000);
                                        }}
                                        className="control-button"
                                    />
                                </Tooltip>
                            )}

                            {/* Chỉ hiển thị các nút điều khiển media nếu đã kết nối hoặc đã chấp nhận cuộc gọi */}
                            {(peerConnected || acceptCall) && (
                                <>
                                    <Tooltip title={micOn ? "Tắt micro" : "Bật micro"}>
                                        <Button
                                            shape="circle"
                                            icon={micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
                                            onClick={handleToggleMic}
                                            disabled={endingCall}
                                            className={micOn ? "control-button-active" : "control-button"}
                                        />
                                    </Tooltip>

                                    <Tooltip title={speakerOn ? "Tắt loa" : "Bật loa"}>
                                        <Button
                                            shape="circle"
                                            icon={speakerOn ? <SoundOutlined /> : <MutedSpeakerIcon />}
                                            onClick={handleToggleSpeaker}
                                            disabled={endingCall}
                                            className={speakerOn ? "control-button-active" : "control-button"}
                                        />
                                    </Tooltip>

                                    <Tooltip title={videoPermission && cameraOn ? "Tắt camera" : "Bật camera"}>
                                        <Button
                                            shape="circle"
                                            icon={videoPermission && cameraOn ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
                                            onClick={handleToggleCamera}
                                            className={videoPermission && cameraOn ? "control-button-active" : "control-button"}
                                        />
                                    </Tooltip>
                                </>
                            )}

                            {/* Nút kết thúc cuộc gọi luôn hiển thị cho cả người gọi và người nhận */}
                            <Tooltip title="Kết thúc cuộc gọi">
                                <Button
                                    shape="circle"
                                    icon={<CloseCircleOutlined />}
                                    onClick={handleEndCall}
                                    disabled={endingCall}
                                    className="end-call-button"
                                />
                            </Tooltip>
                        </>
                    )}
                </div>

                {/* Hiển thị playRingtone khi cần */}
                {playRingtone && (
                    <audio
                        src="/sounds/call-ringtone.mp3"
                        autoPlay
                        loop
                        style={{ display: 'none' }}
                    />
                )}
            </Modal>
        </>

    );
}

export default ModalVideoCall;