import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Avatar, message, Slider, Tooltip } from 'antd';
import {
    AudioMutedOutlined,
    AudioOutlined,
    CloseCircleOutlined,
    QuestionCircleOutlined,
    SoundOutlined
} from '@ant-design/icons';
import soundManager from '../../utils/soundManager';
import stopAllSounds from '../../utils/stopAllSounds';
import peerManager from '../../utils/PeerManager';
import './style.css';

function ModalAudioCall({
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
}) {
    const [micOn, setMicOn] = useState(true);
    const [callStart, setCallStart] = useState(null);
    const [duration, setDuration] = useState(0);
    const [endingCall, setEndingCall] = useState(false);
    const [internalRejectMessage, setInternalRejectMessage] = useState('');
    const [callTimeout, setCallTimeout] = useState(false);
    const [troubleshooterVisible, setTroubleshooterVisible] = useState(false);
    const [connected, setConnected] = useState(false);
    const [peerConnected, setPeerConnected] = useState(false);
    const [audioPermission, setAudioPermission] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(100);
    const [speakerOn, setSpeakerOn] = useState(true);
    const [previousVolumeLevel, setPreviousVolumeLevel] = useState(100);

    // Tạo ref cho audio stream
    const remoteAudioRef = useRef(null);
    const localStreamRef = useRef(null);
    const intervalRef = useRef();
    const timeoutRef = useRef(null);
    const peerInitialized = useRef(false);
    const initialRoleRef = useRef('');
    // Thêm biến để theo dõi lần kết nối gần đây nhất
    const lastConnectionTime = useRef(0);

    const audioContextRef = useRef(null);
    const audioAnalyserRef = useRef(null);
    const processorNodeRef = useRef(null);
    // Cập nhật useEffect xử lý peer ID

    // Khởi tạo Peer khi component được mount và open = true
    useEffect(() => {
        if (open && userId) {
            console.log('Khởi tạo kết nối PeerJS');

            try {
                // Khởi tạo PeerJS với userId
                const peer = peerManager.init(userId);
                if (peer) {
                    peerInitialized.current = true;
                } else {
                    console.error('Không thể khởi tạo peer');
                    message.error('Không thể thiết lập kết nối âm thanh, vui lòng thử lại');
                    return;
                }

                // Thiết lập callbacks cho các sự kiện cuộc gọi
                peerManager.onCallEvent = {
                    onStream: (stream) => {
                        //     console.log('Nhận được luồng âm thanh từ đầu bên kia');
                        //     if (remoteAudioRef.current) {
                        //         console.log('Gán stream vào audio element');

                        //         // QUAN TRỌNG: Đảm bảo âm lượng tối đa
                        //         remoteAudioRef.current.volume = 1.0;
                        //         remoteAudioRef.current.srcObject = stream;

                        //         // Đảm bảo phát âm thanh ngay
                        //         remoteAudioRef.current.play()
                        //             .then(() => {
                        //                 console.log('Bắt đầu phát audio thành công');
                        //                 setPeerConnected(true);
                        //             })
                        //             .catch(err => {
                        //                 console.error('Lỗi khi phát audio:', err);
                        //                 // Thử lại sau 500ms
                        //                 setTimeout(() => {
                        //                     remoteAudioRef.current.play()
                        //                         .then(() => setPeerConnected(true))
                        //                         .catch(e => console.error('Vẫn không thể phát audio:', e));
                        //                 }, 500);
                        //             });
                        //     } else {
                        //         console.error('remoteAudioRef.current không tồn tại!');
                        //     }
                        // },
                        console.log('Nhận được luồng âm thanh từ đầu bên kia');
                        if (remoteAudioRef.current) {
                            console.log('Gán stream vào audio element');

                            remoteAudioRef.current.srcObject = stream;

                            // ⚠️ QUAN TRỌNG: Đặt âm lượng và muted dựa trên trạng thái loa
                            remoteAudioRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                            remoteAudioRef.current.muted = !speakerOn; // THÊM: Thiết lập muted

                            remoteAudioRef.current.play()
                                .then(() => {
                                    console.log('Bắt đầu phát audio thành công');
                                    setPeerConnected(true);
                                })
                                .catch(err => {
                                    console.error('Lỗi khi phát audio:', err);
                                    // Thử lại sau 500ms
                                    setTimeout(() => {
                                        remoteAudioRef.current.play()
                                            .then(() => setPeerConnected(true))
                                            .catch(e => console.error('Vẫn không thể phát audio:', e));
                                    }, 500);
                                });
                        } else {
                            console.error('remoteAudioRef.current không tồn tại!');
                        }
                    },
                    onClose: () => {
                        console.log('Kết nối cuộc gọi đã đóng');
                        setPeerConnected(false);
                    },
                    onError: (err) => {
                        console.error('Lỗi kết nối cuộc gọi:', err);
                        message.error('Có lỗi kết nối âm thanh: ' + (err.message || err.type || 'Không xác định'));
                        setPeerConnected(false);
                    }
                };

                // Truy cập micro để tạo luồng âm thanh cục bộ (với retry)
                const getMicrophone = (retryCount = 0) => {
                    peerManager.getUserMedia()
                        .then(stream => {
                            console.log('Đã truy cập được micro');
                            localStreamRef.current = stream;
                            setAudioPermission(true);
                        })
                        .catch(err => {
                            console.error('Không thể truy cập micro:', err);
                            if (retryCount < 2) {
                                console.log(`Thử lại lần ${retryCount + 1}...`);
                                setTimeout(() => getMicrophone(retryCount + 1), 1000);
                            } else {
                                setAudioPermission(false);
                                message.error('Không thể truy cập micro, vui lòng kiểm tra quyền truy cập');
                            }
                        });
                };

                getMicrophone();
            } catch (err) {
                console.error('Lỗi khi khởi tạo PeerJS:', err);
                message.error('Lỗi kết nối: ' + err.message);
            }

            // Cleanup khi component unmount
            return () => {
                console.log('Dọn dẹp kết nối PeerJS');
                peerManager.destroy();
                peerInitialized.current = false;
            };
        }
    }, [open, userId]);

    // Xử lý peer ID thông qua socket và vai trò của mỗi bên
    useEffect(() => {
        if (!open || !socket || !userId) return;



        // Xác định vai trò rõ ràng
        const role = acceptCall ? 'NGƯỜI_NHẬN' : 'NGƯỜI_GỌI';
        console.log(`[${role}] Thiết lập xử lý peer ID`);

        // Lắng nghe peer ID từ người khác
        socket.on('peer-id', ({ fromUser, peerId, conversationId: convId }) => {
            console.log(`[${role}] Nhận được peer ID từ:`, fromUser._id, 'ID:', peerId);

            // Kiểm tra cuộc gọi hiện tại
            if (convId !== conversationId) {
                console.log('Bỏ qua vì không phải cuộc gọi hiện tại');
                return;
            }

            // CHỈ NGƯỜI NHẬN mới chủ động gọi đến người gọi
            // Chỉ người nhận mới chủ động gọi đến người gọi VÀ chỉ khi không có kết nối gần đây
            if (acceptCall && fromUser._id !== userId && audioPermission) {
                // Chỉ kết nối nếu đã qua 3 giây kể từ lần kết nối gần nhất
                const now = Date.now();
                if (now - lastConnectionTime.current > 3000) {
                    lastConnectionTime.current = now;
                    console.log(`[${role}] Sẽ gọi đến người gọi:`, peerId);

                    // Thêm độ trễ để đảm bảo cả hai bên đã sẵn sàng
                    setTimeout(() => {
                        callWithErrorHandling(peerId);
                    }, 1500);
                } else {
                    console.log('Bỏ qua kết nối mới vì mới kết nối gần đây');
                }
            }

            // Thêm hàm này trong component
            const callWithErrorHandling = (peerId) => {
                peerManager.callTo(peerId)
                    .then(call => {
                        console.log('Đã thiết lập cuộc gọi thành công:', call);
                    })
                    .catch(err => {
                        console.error('Lỗi khi thiết lập cuộc gọi:', err);
                        // Thử lại sau 2 giây nếu thất bại
                        setTimeout(() => {
                            console.log('Thử kết nối lại...');
                            peerManager.callTo(peerId)
                                .catch(err => console.error('Vẫn không thể kết nối:', err));
                        }, 2000);
                    });
            };
        });

        // Hàm gửi peer ID của mình
        const sendMyPeerId = () => {
            if (peerManager.peer && peerManager.peer.id) {
                console.log(`[${role}] Gửi peer ID của mình:`, peerManager.peer.id);
                socket.emit('peer-id', {
                    conversationId,
                    fromUser: { _id: userId },
                    peerId: peerManager.peer.id
                });
                return true;
            }
            return false;
        };

        // Thiết lập cơ chế gửi ID theo định kỳ
        const peerIdInterval = setInterval(() => {
            if (peerManager.peer && peerManager.peer.id) {
                sendMyPeerId();
            }
        }, 3000); // Gửi mỗi 3 giây

        // Gửi ngay khi peer mở
        if (peerManager.peer) {
            if (peerManager.peer.open) {
                sendMyPeerId();
            } else {
                peerManager.peer.on('open', sendMyPeerId);
            }
        }

        return () => {
            clearInterval(peerIdInterval);
            socket.off('peer-id');
        };
    }, [open, socket, acceptCall, userId, remoteUserId, conversationId, audioPermission]);

    // Reset internal state when modal is opened
    useEffect(() => {
        if (open) {
            console.log('Modal cuộc gọi mở, reset state');

            // Reset các state về giá trị ban đầu (ngoại trừ duration vì đã được xử lý ở useEffect khác)
            setCallStart(null);
            setEndingCall(false);
            setInternalRejectMessage('');
            setCallTimeout(false);
            setConnected(false);
            setPeerConnected(false);

            // Đặt trạng thái microphone mặc định là bật
            setMicOn(true);

            // Giả lập kết nối thành công sau 2 giây nếu cuộc gọi được chấp nhận
            if (acceptCall) {
                setTimeout(() => {
                    setConnected(true);
                }, 1000);
            }

        }
        return () => {
            console.log('Cleanup khi modal đóng');

            if (!open) {
                console.log('Cleanup khi modal đóng');

                // Bỏ tất cả socket listeners
                if (socket) {
                    socket.off('peer-id');
                    socket.off('end-call');
                    socket.off('audio-peer-signal');
                }

                // Hủy các timers
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                // Dừng âm thanh
                stopAllSounds();

                // Đóng kết nối peer
                peerManager.destroy();
                peerInitialized.current = false;
            }
        };
    }, [open, acceptCall]);

    useEffect(() => {
        if (!open || !socket) return;

        // Lắng nghe sự kiện kết thúc cuộc gọi từ người khác
        socket.on('end-call', ({ fromUser, conversationId: convId }) => {
            console.log('Nhận sự kiện kết thúc cuộc gọi từ:', fromUser._id);

            // Kiểm tra xem đúng cuộc gọi hiện tại không
            if (convId !== conversationId) return;

            // Dừng tất cả các nỗ lực kết nối nếu đang có
            if (peerManager.peer) {
                console.log('Dừng tất cả kết nối do nhận được end-call');

                // Bỏ lắng nghe sự kiện peer-id để tránh kết nối mới
                socket.off('peer-id');

                // Hủy tất cả timeout và interval đang chạy
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                // Đóng kết nối peer hiện tại
                peerManager.endCall();
            }

            // Hiển thị thông báo đã kết thúc
            setEndingCall(true);
            setInternalRejectMessage('Cuộc gọi đã kết thúc');

            // Dừng tất cả âm thanh
            stopAllSounds();

            // Tự động đóng modal sau khoảng thời gian
            setTimeout(() => {
                onClose();
            }, 2000);
        });

        // Cleanup khi unmount
        return () => {
            socket.off('end-call');
        };
    }, [open, socket, conversationId, onClose]);

    // Khởi tạo bộ đếm thời gian khi modal được mở
    useEffect(() => {
        // Chỉ bắt đầu tính thời gian khi đã kết nối thành công
        if (open && peerConnected) {
            console.log('Bắt đầu/reset thời gian cuộc gọi khi kết nối thành công');

            // Reset về 0 khi kết nối mới thành công
            setDuration(0);
            setCallStart(new Date());

            // Xóa interval cũ nếu có
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            // Tạo interval mới
            intervalRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else if (open && !peerConnected) {
            // Nếu modal mở nhưng chưa kết nối, chỉ hiện thời gian chờ
            console.log('Hiển thị thời gian chờ kết nối');
            setCallStart(new Date());

            // Bắt đầu tính thời gian chờ
            if (!intervalRef.current) {
                intervalRef.current = setInterval(() => {
                    setDuration(prev => prev + 1);
                }, 1000);
            }
        }

        return () => {
            // Xóa interval khi component unmount hoặc khi không còn kết nối
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [open, peerConnected]);

    // Phát âm thanh ringing chỉ khi cần thiết
    useEffect(() => {
        // Luôn dừng ringtone khi cuộc gọi được chấp nhận
        if (acceptCall) {
            console.log('ModalAudioCall: Dừng ringtone vì acceptCall = true');
            stopAllSounds();
            return;
        }

        // Nếu modal đang mở và có playRingtone nhưng không phải trạng thái reject hoặc end
        if (open && playRingtone && !initialRejectMessage && !internalRejectMessage && !endingCall) {
            console.log('ModalAudioCall: Có thể phát ringtone nếu cần');
            // Các logic khác nếu cần
        } else {
            // Đảm bảo dừng âm thanh trong các trường hợp khác
            console.log('ModalAudioCall: Dừng ringtone vì không cần phát');
            stopAllSounds();
        }

        // Cleanup khi component unmount hoặc deps thay đổi
        return () => {
            console.log('ModalAudioCall: Cleanup useEffect ringtone');
            stopAllSounds();
        };
    }, [open, initialRejectMessage, internalRejectMessage, acceptCall, endingCall, playRingtone]);

    // Xử lý timeout khi không ai trả lời cuộc gọi sau một khoảng thời gian
    useEffect(() => {
        // Chỉ áp dụng cho người gọi đi và khi cuộc gọi chưa được chấp nhận
        if (open && !acceptCall && !initialRejectMessage && !endingCall) {
            // Thiết lập thời gian chờ là 60 giây
            const CALL_TIMEOUT = 60 * 1000; // 60 giây

            // Xóa timeout cũ nếu có
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Thiết lập timeout mới
            timeoutRef.current = setTimeout(() => {
                // Đánh dấu cuộc gọi đã timeout
                setCallTimeout(true);
                setInternalRejectMessage('Không có phản hồi từ người nhận');

                // Tự động đóng sau 2 giây
                setTimeout(() => {
                    handleEndCall();
                }, 2000);
            }, CALL_TIMEOUT);
        }

        // Clear timeout khi component unmount hoặc khi cuộc gọi đã được chấp nhận/từ chối
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [open, acceptCall, initialRejectMessage, endingCall, onClose]);

    useEffect(() => {
        if (open) {
            initialRoleRef.current = acceptCall ? 'Người nhận' : 'Người gọi';
        }
    }, [open]);

    // Thêm useEffect mới để điều chỉnh âm lượng và theo dõi chất lượng kết nối
    // useEffect(() => {
    //     if (peerConnected && remoteAudioRef.current && remoteAudioRef.current.srcObject) {
    //         console.log('Thiết lập xử lý âm thanh nâng cao');

    //         // Tạo AudioContext duy nhất nếu chưa có
    //         if (!audioContextRef.current) {
    //             try {
    //                 audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    //                 console.log('Đã tạo AudioContext mới:', audioContextRef.current.state);
    //             } catch (err) {
    //                 console.error('Lỗi khi tạo AudioContext:', err);
    //                 return;
    //             }
    //         }

    //         // Đảm bảo AudioContext trong trạng thái running
    //         if (audioContextRef.current.state !== 'running') {
    //             audioContextRef.current.resume().catch(err => console.error('Không thể resume AudioContext:', err));
    //         }

    //         // Thiết lập processing chain cho audio
    //         const source = audioContextRef.current.createMediaStreamSource(remoteAudioRef.current.srcObject);

    //         // QUAN TRỌNG: Thêm gainNode chính để kiểm soát tắt/bật loa
    //         const mainGainNode = audioContextRef.current.createGain();
    //         mainGainNode.gain.value = speakerOn ? (volumeLevel / 100) : 0;

    //         // Tạo bộ lọc và compressor
    //         const lowShelf = audioContextRef.current.createBiquadFilter();
    //         lowShelf.type = 'lowshelf';
    //         lowShelf.frequency.value = 300;
    //         lowShelf.gain.value = 3;

    //         const highShelf = audioContextRef.current.createBiquadFilter();
    //         highShelf.type = 'highshelf';
    //         highShelf.frequency.value = 3000;
    //         highShelf.gain.value = -1;

    //         const compressor = audioContextRef.current.createDynamicsCompressor();
    //         compressor.threshold.value = -24;
    //         compressor.knee.value = 10;
    //         compressor.ratio.value = 4;
    //         compressor.attack.value = 0.02;
    //         compressor.release.value = 0.25;

    //         // Gain node thứ hai để kiểm soát âm lượng tổng thể
    //         const gainNode = audioContextRef.current.createGain();
    //         gainNode.gain.value = 1.2;

    //         // Analyzer để theo dõi mức âm thanh
    //         const analyser = audioContextRef.current.createAnalyser();
    //         analyser.fftSize = 1024;
    //         analyser.smoothingTimeConstant = 0.8;
    //         audioAnalyserRef.current = analyser;

    //         // Kết nối chuỗi xử lý
    //         source.connect(lowShelf);
    //         lowShelf.connect(highShelf);
    //         highShelf.connect(compressor);
    //         compressor.connect(gainNode);
    //         gainNode.connect(analyser);

    //         // QUAN TRỌNG: Kết nối qua mainGainNode để kiểm soát bật/tắt loa
    //         analyser.connect(mainGainNode);
    //         mainGainNode.connect(audioContextRef.current.destination);

    //         // Lưu trữ node xử lý để cleanup và sử dụng sau này
    //         processorNodeRef.current = {
    //             source,
    //             lowShelf,
    //             highShelf,
    //             compressor,
    //             gainNode,
    //             analyser,
    //             mainGainNode // Lưu gainNode chính
    //         };

    //         console.log('Đã thiết lập hoàn tất đường dẫn xử lý âm thanh');

    //         // Tắt audio element để tránh phát âm thanh qua hai kênh
    //         remoteAudioRef.current.volume = 0;
    //     }

    //     return () => {
    //         if (processorNodeRef.current) {
    //             try {
    //                 if (processorNodeRef.current.mainGainNode) {
    //                     processorNodeRef.current.mainGainNode.disconnect();
    //                 }
    //                 if (processorNodeRef.current.analyser) {
    //                     processorNodeRef.current.analyser.disconnect();
    //                 }
    //                 // ...ngắt kết nối các node khác
    //                 console.log('Đã dọn dẹp audio processing chain');
    //             } catch (err) {
    //                 console.error('Lỗi khi dọn dẹp audio nodes:', err);
    //             }
    //         }
    //     };
    // }, [peerConnected, volumeLevel, speakerOn]);

    // Theo dõi chất lượng kết nối
    useEffect(() => {
        if (peerConnected && peerManager.currentCall?.peerConnection) {
            const pc = peerManager.currentCall.peerConnection;

            const statsInterval = setInterval(() => {
                pc.getStats().then(stats => {
                    stats.forEach(report => {
                        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                            // Theo dõi các chỉ số quan trọng
                            const packetsLost = report.packetsLost;
                            const jitter = report.jitter;

                            // Log hoặc xử lý dựa trên chỉ số
                            if (packetsLost > 20 || jitter > 0.05) {
                                console.warn('Chất lượng kết nối kém:', { packetsLost, jitter });
                                // Có thể hiển thị thông báo cho người dùng
                            }
                        }
                    });
                });
            }, 5000); // Kiểm tra mỗi 5 giây

            return () => clearInterval(statsInterval);
        }
    }, [peerConnected]);

    // useEffect(() => {
    //     if (peerConnected && remoteAudioRef.current && remoteAudioRef.current.srcObject) {
    //         try {
    //             // Tạo AudioContext
    //             const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    //             // Tạo analyzer để phân tích âm thanh
    //             const analyser = audioCtx.createAnalyser();
    //             analyser.fftSize = 2048;

    //             // Tạo element audio mới để xử lý
    //             const audioElement = new Audio();
    //             audioElement.srcObject = remoteAudioRef.current.srcObject;
    //             audioElement.autoplay = true;

    //             // Kết nối đồ thị âm thanh
    //             const source = audioCtx.createMediaStreamSource(remoteAudioRef.current.srcObject);

    //             // Tạo bộ lọc và cân bằng
    //             const lowShelf = audioCtx.createBiquadFilter();
    //             lowShelf.type = 'lowshelf';
    //             lowShelf.frequency.value = 300;
    //             lowShelf.gain.value = 3;

    //             const highShelf = audioCtx.createBiquadFilter();
    //             highShelf.type = 'highshelf';
    //             highShelf.frequency.value = 3000;
    //             highShelf.gain.value = -3;

    //             const compressor = audioCtx.createDynamicsCompressor();
    //             compressor.threshold.value = -24;
    //             compressor.knee.value = 30;
    //             compressor.ratio.value = 8;
    //             compressor.attack.value = 0.005;
    //             compressor.release.value = 0.050;

    //             // Kết nối chuỗi xử lý
    //             source.connect(lowShelf);
    //             lowShelf.connect(highShelf);
    //             highShelf.connect(compressor);
    //             compressor.connect(audioCtx.destination);

    //             return () => {
    //                 audioCtx.close();
    //             };
    //         } catch (err) {
    //             console.error("Không thể thiết lập xử lý âm thanh nâng cao:", err);
    //         }
    //     }
    // }, [peerConnected]);

    useEffect(() => {
        if (!peerConnected || !remoteAudioRef.current || !audioAnalyserRef.current) return;

        console.log('Thiết lập giám sát âm thanh');

        let silentSeconds = 0;
        let consecutiveSilentCount = 0;
        const audioMonitorInterval = setInterval(() => {
            // Sử dụng analyser đã tạo từ useEffect trước
            if (!audioAnalyserRef.current) return;

            // Tính toán mức âm thanh mà không tạo AudioContext mới
            const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
            audioAnalyserRef.current.getByteFrequencyData(dataArray);

            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

            console.log('Mức âm thanh hiện tại:', average.toFixed(2));

            if (average < 5) {
                silentSeconds++;

                // Hiệu chỉnh lại mỗi 10 giây để tránh mất âm thanh
                if (silentSeconds % 10 === 0 && silentSeconds > 0) {
                    console.log('Kiểm tra và điều chỉnh audio chain định kỳ');

                    // Tăng gain lên nếu âm thanh quá nhỏ
                    if (processorNodeRef.current && processorNodeRef.current.gainNode) {
                        const currentGain = processorNodeRef.current.gainNode.gain.value;
                        processorNodeRef.current.gainNode.gain.value = Math.min(2.0, currentGain + 0.1);
                        console.log('Đã tăng gain lên:', processorNodeRef.current.gainNode.gain.value);
                    }

                    // Đảm bảo AudioContext vẫn hoạt động
                    if (audioContextRef.current && audioContextRef.current.state !== 'running') {
                        audioContextRef.current.resume()
                            .then(() => console.log('Đã khởi động lại AudioContext'))
                            .catch(e => console.error('Lỗi khi resume AudioContext:', e));
                    }
                }

                if (silentSeconds >= 5) {
                    consecutiveSilentCount++;
                    console.warn(`Phát hiện ${silentSeconds} giây không có âm thanh (lần ${consecutiveSilentCount})`);

                    if (consecutiveSilentCount >= 3) {
                        console.error('Nhiều lần phát hiện âm thanh mất, thử khởi động lại toàn bộ kết nối');
                        restartAudioConnection();
                        consecutiveSilentCount = 0;
                    } else {
                        // Thử khởi động lại audio nhẹ nhàng
                        restartAudioSoft();
                    }

                    silentSeconds = 0;
                }
            } else {
                silentSeconds = 0;
            }
        }, 1000);

        return () => clearInterval(audioMonitorInterval);
    }, [peerConnected]);

    // const restartAudioSoft = () => {
    //     console.log('Khôi phục âm thanh nhẹ nhàng');

    //     try {
    //         // 1. Tạm ngừng audio
    //         if (remoteAudioRef.current) {
    //             remoteAudioRef.current.pause();
    //         }

    //         // 2. Thiết lập lại audio graph nếu cần
    //         if (audioContextRef.current) {
    //             if (audioContextRef.current.state !== 'running') {
    //                 audioContextRef.current.resume().catch(e => console.error('Lỗi resume AudioContext:', e));
    //             }

    //             // Điều chỉnh gain để đảm bảo âm lượng đúng
    //             if (processorNodeRef.current) {
    //                 if (processorNodeRef.current.gainNode) {
    //                     processorNodeRef.current.gainNode.gain.value = 1.5; // Điều chỉnh gain thường
    //                 }

    //                 // QUAN TRỌNG: Đảm bảo mainGainNode được cập nhật đúng
    //                 if (processorNodeRef.current.mainGainNode) {
    //                     processorNodeRef.current.mainGainNode.gain.value = speakerOn ? volumeLevel / 100 : 0;
    //                 }
    //             }
    //         }

    //         // 3. Phát lại audio
    //         setTimeout(() => {
    //             if (remoteAudioRef.current) {
    //                 // Áp dụng âm lượng dựa trên trạng thái loa
    //                 remoteAudioRef.current.volume = speakerOn ? volumeLevel / 100 : 0;

    //                 remoteAudioRef.current.play()
    //                     .then(() => console.log('Đã phát lại audio thành công'))
    //                     .catch(e => console.error('Lỗi khi phát lại audio:', e));
    //             }
    //         }, 300);
    //     } catch (e) {
    //         console.error('Lỗi khi khôi phục âm thanh nhẹ nhàng:', e);
    //     }
    // };

    const restartAudioSoft = () => {
        console.log('Khôi phục âm thanh nhẹ nhàng (đơn giản hóa)');

        try {
            // Chỉ xử lý audio element, bỏ qua AudioContext
            if (remoteAudioRef.current) {
                // Tạm dừng
                remoteAudioRef.current.pause();

                // Phát lại sau một khoảng thời gian ngắn
                setTimeout(() => {
                    // Đảm bảo âm lượng và muted phù hợp với trạng thái loa
                    remoteAudioRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                    remoteAudioRef.current.muted = !speakerOn; // THÊM: Thiết lập muted

                    remoteAudioRef.current.play()
                        .then(() => console.log('Đã phát lại audio thành công'))
                        .catch(e => console.error('Lỗi khi phát lại audio:', e));
                }, 300);
            }
        } catch (e) {
            console.error('Lỗi khi khôi phục âm thanh:', e);
        }
    };

    useEffect(() => {
        if (!peerConnected || !peerManager.currentCall?.peerConnection) return;

        console.log('Thiết lập keepalive cho WebRTC');

        // Gửi gói keepalive qua data channel định kỳ
        const keepAliveInterval = setInterval(() => {
            try {
                const pc = peerManager.currentCall.peerConnection;

                // Kiểm tra trạng thái kết nối
                const connectionState = pc.connectionState || pc.iceConnectionState;
                console.log('WebRTC connection state:', connectionState);

                // Gửi keepalive packet qua data channel
                if (pc.dataChannel && pc.dataChannel.readyState === 'open') {
                    pc.dataChannel.send(JSON.stringify({
                        type: 'keepalive',
                        timestamp: Date.now(),
                        from: userId
                    }));
                    console.log('Đã gửi keepalive packet');
                } else {
                    console.warn('Data channel không sẵn sàng để gửi keepalive');
                }

                // Khởi động lại ICE nếu kết nối không ổn định
                if (connectionState === 'disconnected' || connectionState === 'failed') {
                    console.warn('Kết nối không ổn định, thử restart ICE');
                    peerManager.restartIce(pc);
                }
            } catch (e) {
                console.error('Lỗi trong keepalive:', e);
            }
        }, 5000); // 5 giây một lần

        return () => clearInterval(keepAliveInterval);
    }, [peerConnected, userId]);

    // Thêm hàm khởi động lại kết nối âm thanh
    const restartAudioConnection = async () => {
        console.log("Đang thử khởi động lại kết nối âm thanh...");

        try {
            if (peerManager.currentCall && peerManager.currentCall.peerConnection) {
                // 1. Restart ICE connection
                peerManager.restartIce(peerManager.currentCall.peerConnection);

                // 2. Tạm ngừng và phát lại audio
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.pause();
                    setTimeout(() => {
                        remoteAudioRef.current.play()
                            .catch(e => console.error("Không thể phát lại audio:", e));
                    }, 500);
                }

                // 3. Thông báo bên kia về việc kết nối lại
                if (peerManager.currentCall.peerConnection.dataChannel) {
                    peerManager.currentCall.peerConnection.dataChannel.send(JSON.stringify({
                        type: 'connection-restart',
                        timestamp: Date.now()
                    }));
                }

                console.log("Đã thử khởi động lại kết nối âm thanh");
            }
        } catch (e) {
            console.error("Lỗi khi khởi động lại kết nối:", e);
        }
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Hàm điều chỉnh âm lượng
    // const handleVolumeChange = (newVolume) => {
    //     setVolumeLevel(newVolume);

    //     // Cập nhật âm lượng audio element
    //     if (remoteAudioRef.current) {
    //         remoteAudioRef.current.volume = speakerOn ? newVolume / 100 : 0;
    //     }

    //     // QUAN TRỌNG: Cập nhật AudioContext gain node
    //     if (processorNodeRef.current && processorNodeRef.current.mainGainNode) {
    //         processorNodeRef.current.mainGainNode.gain.value = speakerOn ? newVolume / 100 : 0;
    //     }

    //     // Cập nhật trạng thái loa dựa trên âm lượng
    //     if (newVolume === 0 && speakerOn) {
    //         setSpeakerOn(false);
    //     } else if (newVolume > 0 && !speakerOn) {
    //         setSpeakerOn(true);

    //         // Cập nhật AudioContext
    //         if (processorNodeRef.current && processorNodeRef.current.mainGainNode) {
    //             processorNodeRef.current.mainGainNode.gain.value = newVolume / 100;
    //         }
    //     }
    // };
    const handleVolumeChange = (newVolume) => {
        setVolumeLevel(newVolume);

        // Chỉ cập nhật âm lượng cho audio element khi speakerOn là true
        if (remoteAudioRef.current) {
            remoteAudioRef.current.volume = speakerOn ? newVolume / 100 : 0;

            // THÊM: Cập nhật muted khi volume = 0
            if (newVolume === 0) {
                remoteAudioRef.current.muted = true;
            } else if (speakerOn) {
                remoteAudioRef.current.muted = false;
            }
        }

        // Cập nhật trạng thái loa dựa trên âm lượng
        if (newVolume === 0 && speakerOn) {
            setSpeakerOn(false);
        } else if (newVolume > 0 && !speakerOn) {
            setSpeakerOn(true);
        }
    };

    const handleToggleMic = () => {
        const newMicState = !micOn;
        setMicOn(newMicState);

        // Thực hiện việc bật/tắt micro thực tế
        peerManager.toggleMicrophone(newMicState);

        // Hiển thị thông báo thành công
        message.success(newMicState ? 'Đã bật micro' : 'Đã tắt micro', 1);
    };

    const handleEndCall = () => {
        // Đánh dấu cuộc gọi đang kết thúc
        setEndingCall(true);
        console.log('Kết thúc cuộc gọi...');

        try {
            // 1. Dừng phát âm thanh ngay lập tức
            stopAllSounds();

            // 2. Hủy tất cả interval và timeout đang chạy
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // 3. Bỏ lắng nghe sự kiện peer-id
            socket.off('peer-id');

            // 4. Thông báo cho server và các peer khác
            if (socket) {
                console.log('Gửi tín hiệu kết thúc cuộc gọi');
                socket.emit('end-call', {
                    conversationId,
                    fromUser: { _id: userId }
                });
            }

            // 5. Đóng kết nối peer ngay lập tức
            peerManager.endCall();

            // 6. Hiển thị thông báo
            message.success('Đã kết thúc cuộc gọi', 1);

            // 7. Tự động đóng modal sau 1.5 giây
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Lỗi khi kết thúc cuộc gọi:', err);

            // Vẫn đóng modal dù có lỗi
            setTimeout(() => {
                onClose();
            }, 1500);
        }
    };
    // Thêm hàm xử lý toggle loa
    // const handleToggleSpeaker = () => {
    //     const newSpeakerState = !speakerOn;
    //     setSpeakerOn(newSpeakerState);

    //     // Lưu trữ âm lượng khi tắt loa
    //     if (!newSpeakerState) {
    //         setPreviousVolumeLevel(volumeLevel);
    //     }

    //     // Áp dụng thay đổi vào âm lượng
    //     if (remoteAudioRef.current) {
    //         remoteAudioRef.current.volume = newSpeakerState ? volumeLevel / 100 : 0;
    //     }

    //     // QUAN TRỌNG: Cập nhật AudioContext gain node
    //     if (processorNodeRef.current && processorNodeRef.current.mainGainNode) {
    //         if (newSpeakerState) {
    //             processorNodeRef.current.mainGainNode.gain.value = volumeLevel / 100;
    //         } else {
    //             processorNodeRef.current.mainGainNode.gain.value = 0;
    //         }
    //     }

    //     message.success(newSpeakerState ? 'Đã bật loa' : 'Đã tắt loa', 1);
    // };
    const handleToggleSpeaker = () => {
        const newSpeakerState = !speakerOn;
        setSpeakerOn(newSpeakerState);

        // Lưu trữ âm lượng khi tắt
        if (!newSpeakerState) {
            setPreviousVolumeLevel(volumeLevel);
        }

        // Cập nhật cả volume và muted
        if (remoteAudioRef.current) {
            console.log(`${newSpeakerState ? 'Bật' : 'Tắt'} loa - âm lượng: ${newSpeakerState ? volumeLevel : 0}%`);
            remoteAudioRef.current.volume = newSpeakerState ? volumeLevel / 100 : 0;
            remoteAudioRef.current.muted = !newSpeakerState; // THÊM: Thiết lập thuộc tính muted
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

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            closable={false}
            width={350}
            className="audio-call-modal"
            maskClosable={false} // Ngăn chặn đóng modal khi click ra ngoài
            data-active={acceptCall && !initialRejectMessage && !internalRejectMessage && !endingCall}
            data-incoming={!acceptCall && !initialRejectMessage && !internalRejectMessage && !endingCall}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24 }}>
                <Avatar size={80} src={avatar} style={{ marginBottom: 16 }}>
                    {(!avatar && name) ? name.charAt(0).toUpperCase() : ''}
                </Avatar>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{name}</div>

                {/* Thêm audio tag ẩn để phát âm thanh từ người khác */}
                <audio
                    ref={remoteAudioRef}
                    autoPlay={true}
                    playsInline={true}
                    muted={!speakerOn}
                    style={{ display: 'none' }}
                    onCanPlay={() => {
                        console.log('Audio đã sẵn sàng phát');
                        // Đảm bảo âm lượng đủ lớn
                        if (remoteAudioRef.current) {
                            remoteAudioRef.current.volume = speakerOn ? volumeLevel / 100 : 0;
                            remoteAudioRef.current.muted = !speakerOn;
                            try {
                                remoteAudioRef.current.play()
                                    .then(() => console.log('Bắt đầu phát audio'))
                                    .catch(e => console.error('Lỗi khi phát audio:', e));
                            } catch (e) {
                                console.error('Lỗi khi gọi play():', e);
                            }
                        }
                    }}
                />
                {/* Hiển thị trạng thái debug */}
                {/* <div style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    fontSize: '10px',
                    color: '#888',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    padding: '4px',
                    borderRadius: '4px'
                }}>
                    <div>ID: {peerManager.peer?.id || 'Chưa kết nối'}</div>
                    <div>Vai trò: {initialRoleRef.current || (acceptCall ? 'Người nhận' : 'Người gọi')}</div>
                    <div>Kết nối: {peerConnected ? 'OK' : 'Đang chờ...'}</div>
                    <div>Mic: {micOn ? 'Bật' : 'Tắt'}</div>
                </div> */}
                {initialRejectMessage || internalRejectMessage ? (
                    <div style={{ color: '#ff4d4f', marginBottom: 24, fontWeight: 500 }}>
                        {initialRejectMessage || internalRejectMessage}
                        <Button
                            type="link"
                            size="small"
                            icon={<QuestionCircleOutlined />}
                            onClick={() => setTroubleshooterVisible(true)}
                            style={{ marginLeft: 8 }}
                        >
                            Gặp vấn đề?
                        </Button>
                    </div>) : endingCall ? (
                        <div style={{ color: '#ff4d4f', marginBottom: 24, fontWeight: 500 }}>
                            Đã kết thúc cuộc gọi
                        </div>
                    ) : acceptCall ? (
                        <div style={{ color: '#52c41a', marginBottom: 24 }}>
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
                    <div style={{ color: '#888', marginBottom: 24 }}>
                        Chờ ... <span className="call-duration">{formatDuration(duration)}</span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    {/* Nút bật/tắt micro - chỉ hiển thị khi cuộc gọi đã được chấp nhận */}
                    {acceptCall && !initialRejectMessage && !internalRejectMessage && !endingCall && (
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
                            {/* <div className="volume-control" style={{ marginTop: 8 }}>
                                <span style={{ fontSize: '12px', marginRight: 8 }}>Âm lượng: </span>
                                <Slider
                                    style={{ width: 120 }}
                                    min={0}
                                    max={100}
                                    value={volumeLevel}
                                    onChange={handleVolumeChange}
                                    tipFormatter={value => `${value}%`}
                                />
                            </div> */}
                        </>
                    )}
                    <Button
                        shape="circle"
                        size="large"
                        icon={<CloseCircleOutlined />}
                        onClick={handleEndCall}
                        style={{ background: '#ffd6d6', color: '#ff4d4f' }}
                        title="Kết thúc cuộc gọi"
                        disabled={endingCall} // Vô hiệu hóa nút khi đang kết thúc cuộc gọi
                    />
                </div>
            </div>
        </Modal>
    );
}

export default ModalAudioCall;