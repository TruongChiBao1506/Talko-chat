import Peer from 'peerjs';

class PeerManager {
    constructor() {
        this.peer = null;
        this.currentCall = null;
        this.localStream = null;
        this.remoteStream = null;
        this.onCallEvent = {
            onStream: () => { },
            onClose: () => { },
            onError: () => { }
        };
        this.isInitialized = false;
    }

    // Khởi tạo kết nối PeerJS
    init(userId) {
        // Nếu đã khởi tạo và có ID giống, thì không cần khởi tạo lại
        if (this.isInitialized && this.peer && this.peer.id && this.peer.id.includes(userId)) {
            console.log('PeerManager đã được khởi tạo trước đó với ID phù hợp');
            return this.peer;
        }

        // Nếu đã khởi tạo nhưng ID khác hoặc có vấn đề, hủy kết nối cũ
        if (this.peer) {
            console.log('Hủy kết nối cũ trước khi khởi tạo mới');
            this.destroy();
            this.peer = null;
        }

        // Tạo ID duy nhất bằng cách thêm timestamp
        const timestamp = Date.now().toString().slice(-6);
        const peerId = `talko_${userId}_${timestamp}`;

        console.log('Khởi tạo PeerManager với ID mới:', peerId);

        try {
            this.peer = new Peer(peerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: "stun:stun.relay.metered.ca:80" },
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: "stun:stun1.l.google.com:19302" },
                        { urls: "stun:stun2.l.google.com:19302" },
                        { urls: "stun:stun3.l.google.com:19302" },
                        { urls: "stun:stun4.l.google.com:19302" },
                        {
                            urls: "turn:global.relay.metered.ca:80",
                            username: "a29ee85e5d1630593ecdd6c9",
                            credential: "eUmnwajrL/Nr+oTG",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:80?transport=tcp",
                            username: "a29ee85e5d1630593ecdd6c9",
                            credential: "eUmnwajrL/Nr+oTG",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:443",
                            username: "a29ee85e5d1630593ecdd6c9",
                            credential: "eUmnwajrL/Nr+oTG",
                        },
                        {
                            urls: "turns:global.relay.metered.ca:443?transport=tcp",
                            username: "a29ee85e5d1630593ecdd6c9",
                            credential: "eUmnwajrL/Nr+oTG",
                        },
                        {
                            urls: 'turn:numb.viagenie.ca',
                            credential: 'muazkh',
                            username: 'webrtc@live.com'
                        }
                    ],
                    iceCandidatePoolSize: 10,             // Tăng pool size
                    iceTransportPolicy: 'all',            // Thử cả UDP và TCP
                    bundlePolicy: 'max-bundle',           // Tối ưu hóa bundle
                    rtcpMuxPolicy: 'require',             // Yêu cầu RTCP multiplexing
                    sdpSemantics: 'unified-plan',          // Sử dụng Unified Plan
                    encodedInsertableStreams: false,
                    extmapAllowMixed: true,
                    // Tăng thời gian timeout của ICE
                    iceConnectionReceivingTimeout: 15000,
                    iceCheckingTimeout: 15000
                },
                // Cấu hình cho video call
                constraints: {
                    // Đây là constraints mặc định cho các cuộc gọi
                    // audio: true,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: {
                        width: { ideal: 480, max: 640 },
                        height: { ideal: 360, max: 480 },
                        frameRate: { ideal: 15, max: 20 },
                        facingMode: 'user'
                    }
                },
                // Giảm timeout cho các kết nối
                pingInterval: 3000,  // Tăng tần suất ping
                debug: 2
            });

            this.setupPeerEvents();
            this.isInitialized = true;
            return this.peer;
        } catch (err) {
            console.error('Lỗi khi khởi tạo PeerJS:', err);
            this.isInitialized = false;
            return null;
        }
    }

    // Thiết lập các sự kiện cho peer
    setupPeerEvents() {
        this.peer.on('open', (id) => {
            console.log('Kết nối PeerJS đã mở với ID:', id);
        });

        this.peer.on('error', (err) => {
            console.error('Lỗi PeerJS:', err.type, err);

            // Xử lý lỗi cụ thể
            if (err.type === 'peer-unavailable') {
                console.log('Peer không khả dụng, có thể đang khởi tạo hoặc đã ngắt kết nối');
            }

            this.onCallEvent.onError(err);
        });

        this.peer.on('call', (call) => {
            console.log('Nhận cuộc gọi từ peer:', call.peer);
            this.handleIncomingCall(call);
        });

        this.peer.on('disconnected', () => {
            console.log('PeerJS bị ngắt kết nối, đang thử kết nối lại...');
            this.peer.reconnect();
        });
    }

    // Xử lý cuộc gọi đến
    handleIncomingCall(call) {
        console.log('Xử lý cuộc gọi đến từ peer:', call.peer);

        this.currentCall = call;

        // Trả lời cuộc gọi với stream âm thanh từ micro
        if (this.localStream) {
            console.log('Trả lời cuộc gọi với stream âm thanh hiện có');
            call.answer(this.localStream);

            call.on('stream', (remoteStream) => {
                console.log('Đã nhận luồng âm thanh từ người gọi');
                this.remoteStream = remoteStream;
                this.onCallEvent.onStream(remoteStream);
            });

            call.on('close', () => {
                console.log('Cuộc gọi đã đóng');
                this.onCallEvent.onClose();
            });

            call.on('error', (err) => {
                console.error('Lỗi trong cuộc gọi:', err);
                this.onCallEvent.onError(err);
            });
        } else {
            console.log('Chưa có stream, truy cập micro và trả lời cuộc gọi');
            this.getUserMedia()
                .then(stream => {
                    console.log('Đã lấy được stream, trả lời cuộc gọi');
                    call.answer(stream);

                    call.on('stream', (remoteStream) => {
                        console.log('Đã nhận luồng âm thanh từ người gọi');
                        this.remoteStream = remoteStream;
                        this.onCallEvent.onStream(remoteStream);
                    });
                })
                .catch(err => {
                    console.error('Lỗi khi truy cập micro:', err);
                    this.onCallEvent.onError(err);
                });
        }
    }

    // Gọi đến một peer khác
    callTo(remotePeerId) {
        console.log('Gọi đến peer:', remotePeerId);

        return new Promise((resolve, reject) => {
            if (!this.peer) {
                console.error('Chưa khởi tạo peer');
                reject(new Error('Chưa khởi tạo peer'));
                return;
            }

            // Đảm bảo có localStream trước khi gọi
            if (!this.localStream) {
                console.log('Chưa có localStream, lấy trước khi gọi');
                this.getUserMedia()
                    .then(stream => {
                        console.log('Đã lấy được stream, gọi đến peer:', remotePeerId);
                        this.makeCallWithStream(remotePeerId, stream)
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(err => {
                        console.error('Lỗi khi lấy stream:', err);
                        this.onCallEvent.onError(err);
                        reject(err);
                    });
            } else {
                console.log('Đã có localStream, gọi trực tiếp');
                this.makeCallWithStream(remotePeerId, this.localStream)
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    // Hàm gọi thực tế với stream đã có - cũng trả về Promise
    makeCallWithStream(remotePeerId, stream) {
        console.log('Thực hiện cuộc gọi đến:', remotePeerId);
        console.log('Stream gọi đi có tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`));

        return new Promise((resolve, reject) => {
            try {
                const call = this.peer.call(remotePeerId, stream);
                this.currentCall = call;

                if (!call) {
                    const err = new Error('Không thể tạo cuộc gọi, có thể peer ID không tồn tại');
                    console.error(err);
                    reject(err);
                    return;
                }

                // Xử lý stream nhận được
                call.on('stream', (remoteStream) => {
                    console.log('Đã nhận stream từ người được gọi với tracks:',
                        remoteStream.getTracks().map(t => `${t.kind}:${t.label}`));

                    // Xử lý video tracks
                    const videoTracks = remoteStream.getVideoTracks();
                    if (videoTracks.length > 0) {
                        console.log(`Nhận được ${videoTracks.length} video tracks`);

                        // Đảm bảo tất cả video tracks đều được bật
                        videoTracks.forEach(track => {
                            track.contentHint = 'motion'; // Đặt content hint cho video track
                            track.enabled = true;
                            track.onmute = null;
                            track.onunmute = null;
                            track.onended = null;

                            // Thêm event listeners để theo dõi trạng thái track
                            track.onmute = () => {
                                console.warn('⚠️ Video track bị mute, thử unmute lại');
                                setTimeout(() => track.enabled = true, 100);
                            };

                            // track.onended = () => {
                            //     console.warn('⚠️ Video track kết thúc, thử khởi động lại kết nối');
                            //     if (call.peerConnection) this.restartIce(call.peerConnection);
                            // };
                            // Xóa bỏ các event listeners cũ nếu có
                            if (track._monitorInterval) {
                                clearInterval(track._monitorInterval);
                            }

                            // Thêm giám sát liên tục cho video track
                            track._monitorInterval = setInterval(() => {
                                if (!track.enabled && track.readyState === 'live') {
                                    console.log('Track đang tắt, kích hoạt lại');
                                    track.enabled = true;
                                }
                            }, 2000);
                        });
                    }

                    // QUAN TRỌNG: Thiết lập các cài đặt tối ưu cho âm thanh ngay lập tức
                    const audioTracks = remoteStream.getAudioTracks();
                    try {
                        if (!call.peerConnection.videoKeepAliveChannel) {
                            const dataChannel = call.peerConnection.createDataChannel('video-keep-alive');
                            call.peerConnection.videoKeepAliveChannel = dataChannel;

                            dataChannel.onopen = () => {
                                console.log('Video keep-alive channel opened');

                                // Thiết lập ping liên tục để giữ kết nối video
                                const pingInterval = setInterval(() => {
                                    if (dataChannel.readyState === 'open') {
                                        dataChannel.send(JSON.stringify({
                                            type: 'video-ping',
                                            timestamp: Date.now()
                                        }));
                                    } else {
                                        clearInterval(pingInterval);
                                    }
                                }, 1000);

                                // Lưu interval ID vào call để có thể clear khi kết thúc
                                if (!call._intervals) call._intervals = [];
                                call._intervals.push(pingInterval);
                            };
                        }
                    } catch (e) {
                        console.warn('Không thể tạo data channel cho video:', e);
                    }

                    if (audioTracks.length > 0) {
                        // Bật âm thanh và tối ưu cài đặt cho mỗi track
                        audioTracks.forEach(track => {
                            track.enabled = true;

                            // Thêm event listeners để phát hiện vấn đề
                            track.onmute = () => {
                                console.warn('⚠️ Audio track bị mute');
                                // Thử unmute ngay lập tức
                                setTimeout(() => {
                                    track.enabled = true;
                                }, 100);
                            };

                            track.onended = () => {
                                console.error('❌ Audio track kết thúc bất ngờ');
                                // Thử khởi động lại ICE connection
                                if (call.peerConnection) {
                                    this.restartIce(call.peerConnection);
                                }
                            };
                        });

                        console.log('✅ Đã tối ưu audio tracks');
                    }

                    // Lưu trữ stream để sử dụng
                    this.remoteStream = remoteStream;
                    this.onCallEvent.onStream(remoteStream);
                });
                try {
                    // Tạo data channel đặc biệt để giữ kết nối video
                    const videoKeepAlive = call.peerConnection.createDataChannel("video-keep-alive", {
                        ordered: true,
                        maxRetransmitTime: 3000
                    });

                    videoKeepAlive.onopen = () => {
                        console.log("Kênh giữ kết nối video đã mở");

                        // Gửi ping mỗi 2 giây để giữ kết nối video ổn định
                        const keepAliveInterval = setInterval(() => {
                            if (videoKeepAlive.readyState === "open") {
                                videoKeepAlive.send(JSON.stringify({
                                    type: "keep-alive",
                                    timestamp: Date.now()
                                }));
                            } else {
                                clearInterval(keepAliveInterval);
                            }
                        }, 2000);

                        // Thêm interval vào call để cleanup
                        if (!call._intervals) call._intervals = [];
                        call._intervals.push(keepAliveInterval);
                    };

                    call._videoKeepAlive = videoKeepAlive;
                } catch (err) {
                    console.warn("Không thể tạo data channel giữ kết nối:", err);
                }
                // Thiết lập tham số mạng tối ưu cho video
                // if (call.peerConnection) {
                //     setTimeout(() => {
                //         if (!call || !call.peerConnection || call._isClosed) {
                //             console.log('Bỏ qua cài đặt video - kết nối đã đóng');
                //             return;
                //         }
                //         const videoSenders = call.peerConnection.getSenders()
                //             .filter(sender => sender.track && sender.track.kind === 'video');

                //         videoSenders.forEach(async (sender) => {
                //             try {
                //                 const params = sender.getParameters();
                //                 if (params.encodings && params.encodings.length > 0) {
                //                     // Thiết lập băng thông cao hơn cho video
                //                     params.encodings[0].maxBitrate = 2000000;  // 2 Mbps
                //                     params.encodings[0].minBitrate = 800000;   // Tối thiểu 800kbps
                //                     params.encodings[0].maxFramerate = 30;     // Frame rate cao
                //                     params.encodings[0].priority = 'high';
                //                     params.encodings[0].networkPriority = 'high';
                //                     params.encodings[0].scaleResolutionDownBy = 1.0;
                //                     params.encodings[0].active = true;

                //                     await sender.setParameters(params);
                //                     console.log('✅ Thiết lập băng thông video cao thành công');
                //                 }
                //             } catch (e) {
                //                 console.warn('⚠️ Không thể thiết lập tham số video:', e);
                //             }
                //         });
                //     }, 1000);
                // }
                // Thêm giám sát ICE connection
                if (call.peerConnection) {
                    const pc = call.peerConnection;

                    // Kiểm tra và khởi động lại ICE khi cần
                    pc.oniceconnectionstatechange = () => {
                        const state = pc.iceConnectionState;
                        console.log(`ICE connection state changed: ${state}`);

                        // Khởi động lại ICE khi kết nối không ổn định
                        if (state === 'disconnected' || state === 'failed') {
                            console.log('ICE connection không ổn định, thử khởi động lại...');
                            this.restartIce(pc);
                        }
                    };

                    // Thêm giám sát stats để phát hiện mất gói
                    const statsInterval = setInterval(() => {
                        if (!pc || pc.connectionState === 'closed') {
                            clearInterval(statsInterval);
                            return;
                        }

                        pc.getStats().then(stats => {
                            let hasVideoIssues = false;

                            stats.forEach(report => {
                                // Kiểm tra vấn đề trong gói video nhận được
                                if (report.type === 'inbound-rtp' && report.kind === 'video' && report.packetsLost > 0) {
                                    const lossRate = report.packetsLost / (report.packetsReceived + report.packetsLost);

                                    // Nếu tỷ lệ mất gói > 15%, khởi động lại ICE
                                    if (lossRate > 0.15) {
                                        console.log(`Phát hiện mất gói video cao: ${(lossRate * 100).toFixed(1)}%`);
                                        hasVideoIssues = true;
                                    }
                                }
                            });

                            // Khởi động lại ICE nếu cần
                            if (hasVideoIssues && pc.iceConnectionState === 'connected') {
                                console.log('Khởi động lại ICE do phát hiện vấn đề video');
                                this.restartIce(pc);
                            }
                        });
                    }, 10000); // 10 giây check một lần

                    // Lưu interval để dọn dẹp khi kết thúc
                    if (!call._intervals) call._intervals = [];
                    call._intervals.push(statsInterval);
                }
                if (call.peerConnection) {
                    const timeoutId = setTimeout(() => {
                        // Kiểm tra call và peerConnection còn tồn tại không
                        if (!call || !call.peerConnection || call._isClosed) {
                            console.log('Bỏ qua cài đặt video - kết nối đã đóng');
                            return;
                        }

                        try {
                            const videoSenders = call.peerConnection.getSenders()
                                .filter(sender => sender.track && sender.track.kind === 'video');

                            // Thêm kiểm tra mảng rỗng
                            if (videoSenders.length === 0) {
                                console.log('Không tìm thấy video sender');
                                return;
                            }

                            videoSenders.forEach(async (sender) => {
                                try {
                                    const params = sender.getParameters();
                                    if (params.encodings && params.encodings.length > 0) {
                                        // Thiết lập băng thông cao hơn cho video
                                        params.encodings[0].maxBitrate = 2000000;  // 2 Mbps
                                        params.encodings[0].minBitrate = 800000;   // Tối thiểu 800kbps
                                        params.encodings[0].maxFramerate = 30;     // Frame rate cao
                                        params.encodings[0].priority = 'high';
                                        params.encodings[0].networkPriority = 'high';
                                        params.encodings[0].degradationPreference = 'maintain-framerate';
                                        params.encodings[0].scaleResolutionDownBy = 1.0;
                                        params.encodings[0].active = true;

                                        await sender.setParameters(params);
                                        console.log('✅ Thiết lập băng thông video cao thành công');
                                    }
                                } catch (e) {
                                    console.warn('⚠️ Không thể thiết lập tham số video:', e);
                                }
                            });
                        } catch (err) {
                            console.log('Bỏ qua lỗi getSenders:', err);
                        }
                    }, 1000);

                    // Lưu ID của timeout vào call để có thể clear khi kết thúc
                    call._timeoutIds = call._timeoutIds || [];
                    call._timeoutIds.push(timeoutId);
                }

                // Các event handlers khác
                call.on('close', () => {
                    // console.log('Cuộc gọi đã đóng');
                    // this.onCallEvent.onClose();
                    console.log('Cuộc gọi đã đóng');
                    // Clear tất cả timeout đã đăng ký
                    if (call._timeoutIds && call._timeoutIds.length > 0) {
                        call._timeoutIds.forEach(id => clearTimeout(id));
                        call._timeoutIds = [];
                    }
                    call._isClosed = true;
                    this.onCallEvent.onClose();
                });

                call.on('error', (err) => {
                    console.error('Lỗi trong cuộc gọi:', err);
                    this.onCallEvent.onError(err);
                });

                // QUAN TRỌNG: Thiết lập ưu tiên cao cho audio ngay khi kết nối được thiết lập
                if (call.peerConnection) {
                    // Thêm event listener cho kết nối ICE thành công
                    call.peerConnection.oniceconnectionstatechange = () => {
                        const state = call.peerConnection.iceConnectionState;
                        console.log('ICE connection state:', state);

                        if (state === 'connected' || state === 'completed') {
                            // Khi kết nối ICE thành công, thiết lập ưu tiên cao cho audio
                            try {
                                const audioSenders = call.peerConnection.getSenders()
                                    .filter(s => s.track && s.track.kind === 'audio');

                                if (audioSenders.length > 0) {
                                    audioSenders.forEach(sender => {
                                        const params = sender.getParameters();
                                        if (params.encodings && params.encodings.length > 0) {
                                            // Thiết lập ưu tiên cao và băng thông đủ cho audio
                                            params.encodings[0].priority = 'high';
                                            params.encodings[0].networkPriority = 'high';
                                            params.encodings[0].maxBitrate = 64000; // 64kbps - đủ cho âm thanh chất lượng tốt
                                            const videoSenders = call.peerConnection.getSenders()
                                                .filter(s => s.track && s.track.kind === 'video');

                                            if (videoSenders.length > 0) {
                                                videoSenders.forEach(sender => {
                                                    const params = sender.getParameters();
                                                    if (params.encodings && params.encodings.length > 0) {
                                                        // Thiết lập băng thông phù hợp cho video stream
                                                        params.encodings[0].maxBitrate = 1000000; // 1Mbps cho video chất lượng tốt
                                                        params.encodings[0].maxFramerate = 30;    // Đảm bảo 30fps

                                                        // Đảm bảo video được truyền liên tục 
                                                        params.encodings[0].networkPriority = 'medium';

                                                        sender.setParameters(params)
                                                            .then(() => console.log('✅ Đã thiết lập tham số cho video stream'))
                                                            .catch(e => console.warn('⚠️ Không thể thiết lập tham số video:', e));
                                                    }
                                                });
                                            }
                                            sender.setParameters(params)
                                                .then(() => console.log('✅ Đã thiết lập tham số ưu tiên cho audio'))
                                                .catch(e => console.warn('⚠️ Không thể thiết lập tham số audio:', e));
                                        }
                                    });
                                }

                                // Thiết lập chất lượng dịch vụ cho audio
                                call.peerConnection.setQoS({ audio: true, video: false })
                                    .catch(e => { });

                            } catch (e) {
                                console.warn('Không thể thiết lập tham số audio:', e);
                            }
                        }
                    };
                }

                // Resolve the call object
                resolve(call);
            } catch (err) {
                console.error('Lỗi khi gọi:', err);
                this.onCallEvent.onError(err);
                reject(err);
            }
        });
    }
    // makeCallWithStream(remotePeerId, stream) {
    //     console.log('Thực hiện cuộc gọi đến:', remotePeerId);

    //     return new Promise((resolve, reject) => {
    //         try {
    //             const call = this.peer.call(remotePeerId, stream);
    //             this.currentCall = call;

    //             if (!call) {
    //                 const err = new Error('Không thể tạo cuộc gọi, có thể peer ID không tồn tại');
    //                 console.error(err);
    //                 reject(err);
    //                 return;
    //             }

    //             call.on('stream', (remoteStream) => {
    //                 console.log('Đã nhận luồng âm thanh từ người được gọi');
    //                 // Kiểm tra chất lượng luồng âm thanh nhận được
    //                 const audioTracks = remoteStream.getAudioTracks();
    //                 // Kiểm tra và khôi phục audio track nếu bị mất
    //                 const audioTrackMonitor = setInterval(() => {
    //                     if (!call.peerConnection) {
    //                         clearInterval(audioTrackMonitor);
    //                         return;
    //                     }

    //                     const activeTracks = remoteStream.getAudioTracks().filter(track => track.readyState === 'live');

    //                     if (activeTracks.length === 0) {
    //                         console.warn('Không phát hiện audio track hoạt động, thử khôi phục...');

    //                         // Thông báo cho bên kia biết để thử khởi động lại luồng âm thanh
    //                         if (call.peerConnection.dataChannel) {
    //                             try {
    //                                 call.peerConnection.dataChannel.send(JSON.stringify({
    //                                     type: 'audio-restart-request',
    //                                     timestamp: Date.now()
    //                                 }));
    //                             } catch (e) {
    //                                 console.error('Không thể gửi yêu cầu khởi động lại âm thanh:', e);
    //                             }
    //                         }
    //                     }
    //                 }, 2000);
    //                 if (audioTracks.length > 0) {
    //                     const settings = audioTracks[0].getSettings();
    //                     console.log('Audio stream settings:', settings);

    //                     // Kiểm tra xem audio track có hoạt động không
    //                     const audioLevel = audioTracks[0].getLevel ? audioTracks[0].getLevel() : 'N/A';
    //                     console.log('Audio level:', audioLevel);
    //                 }

    //                 // Kiểm tra sức khỏe kết nối
    //                 const statsInterval = setInterval(() => {
    //                     if (!call.peerConnection) {
    //                         clearInterval(statsInterval);
    //                         return;
    //                     }

    //                     call.peerConnection.getStats(null).then(stats => {
    //                         stats.forEach(report => {
    //                             if (report.type === 'inbound-rtp' && report.kind === 'audio') {
    //                                 console.log('Audio stats:', {
    //                                     packetsLost: report.packetsLost,
    //                                     packetsReceived: report.packetsReceived,
    //                                     bytesReceived: report.bytesReceived,
    //                                     jitter: report.jitter,
    //                                     timestamp: report.timestamp
    //                                 });
    //                             }
    //                         });
    //                     });
    //                 }, 5000);

    //                 // Thông báo khi có track bị dừng
    //                 audioTracks.forEach(track => {
    //                     track.onended = () => console.log('Audio track ended unexpectedly');
    //                     track.onmute = () => console.log('Audio track muted unexpectedly');
    //                     track.onunmute = () => console.log('Audio track unmuted');
    //                 });
    //                 this.remoteStream = remoteStream;
    //                 this.onCallEvent.onStream(remoteStream);
    //                 // Thiết lập các tham số băng thông phù hợp
    //                 const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'audio');
    //                 if (sender) {
    //                     try {
    //                         const params = sender.getParameters();
    //                         if (params.encodings && params.encodings.length > 0) {
    //                             params.encodings[0].maxBitrate = 32000; // 32kbps cho thoại
    //                             params.encodings[0].priority = 'high';
    //                             sender.setParameters(params);
    //                         }
    //                     } catch (err) {
    //                         console.warn('Không thể thiết lập tham số băng thông:', err);
    //                     }
    //                 }
    //                 // Thêm cơ chế keepalive để duy trì kết nối
    //                 const keepAliveInterval = setInterval(() => {
    //                     if (!call.peerConnection) {
    //                         clearInterval(keepAliveInterval);
    //                         return;
    //                     }

    //                     // Gửi gói keepalive qua data channel
    //                     try {
    //                         if (call.peerConnection.dataChannel &&
    //                             call.peerConnection.dataChannel.readyState === 'open') {
    //                             call.peerConnection.dataChannel.send(JSON.stringify({
    //                                 type: 'keepalive',
    //                                 timestamp: Date.now()
    //                             }));
    //                             console.log('Sent keepalive packet');
    //                         }
    //                     } catch (e) {
    //                         console.warn('Không thể gửi keepalive:', e);
    //                     }

    //                     // Kiểm tra trạng thái kết nối
    //                     const connState = call.peerConnection.connectionState ||
    //                         call.peerConnection.iceConnectionState;
    //                     if (connState === 'failed' || connState === 'disconnected') {
    //                         console.warn(`Phát hiện kết nối không ổn định: ${connState}, thử khôi phục...`);
    //                         this.restartIce(call.peerConnection);
    //                     }
    //                 }, 5000);


    //             });


    //             call.on('close', () => {
    //                 console.log('Cuộc gọi đã đóng');
    //                 this.onCallEvent.onClose();
    //             });

    //             call.on('error', (err) => {
    //                 console.error('Lỗi trong cuộc gọi:', err);
    //                 this.onCallEvent.onError(err);
    //                 reject(err);
    //             });

    //             // Resolve call object sau 500ms để đảm bảo các event listeners được thiết lập
    //             setTimeout(() => resolve(call), 500);
    //         } catch (err) {
    //             console.error('Lỗi khi gọi:', err);
    //             this.onCallEvent.onError(err);
    //             reject(err);
    //         }
    //     });
    // }

    // Truy cập micro để tạo localStream
    async getUserMedia(includeVideo = false) {
        // try {
        //     const stream = await navigator.mediaDevices.getUserMedia({
        //         audio: {
        //             echoCancellation: true,
        //             noiseSuppression: true,
        //             autoGainControl: true
        //         },
        //         video: false
        //     });

        //     console.log('Đã lấy được luồng âm thanh từ micro');
        //     this.localStream = stream;
        //     return stream;
        // } catch (err) {
        //     console.error('Lỗi khi truy cập micro:', err);
        //     throw err;
        // }
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 48000,
                    sampleSize: 16,

                    googEchoCancellation: true,    // Bật echo cancellation của Google
                    googAutoGainControl: true,     // Tăng cường AGC cho Chrome
                    googNoiseSuppression: true,    // Tăng cường NS cho Chrome
                    googHighpassFilter: true,      // Lọc tần số thấp
                    googTypingNoiseDetection: true // Giảm tiếng gõ bàn phím
                },
                video: includeVideo ? {
                    width: { ideal: 640, min: 640 },
                    height: { ideal: 360, min: 360 },
                    facingMode: "user"
                } : false
            };
            // Nếu chỉ cần âm thanh, ưu tiên lấy âm thanh trước
            if (!includeVideo) {
                console.log('Ưu tiên truy cập âm thanh trước');
                try {
                    // Thử lấy chỉ âm thanh
                    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                        audio: constraints.audio,
                        video: false
                    });

                    console.log('Đã lấy được stream âm thanh với tracks:',
                        audioOnlyStream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));

                    this.localStream = audioOnlyStream;
                    return audioOnlyStream;
                } catch (audioErr) {
                    console.error('Lỗi khi truy cập riêng âm thanh:', audioErr);
                    throw audioErr;
                }
            }
            console.log('Yêu cầu truy cập với video:', includeVideo);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Log ra để debug
            const videoTracks = stream.getVideoTracks();
            console.log(`Đã lấy được stream với ${videoTracks.length} video tracks`);
            if (videoTracks.length > 0) {
                console.log('Video track settings:', videoTracks[0].getSettings());
            }

            this.localStream = stream;
            return stream;
        } catch (err) {
            console.error(`Lỗi khi truy cập thiết bị ${includeVideo ? 'âm thanh và video' : 'âm thanh'}:`, err);
            throw err;
        }
    }
    restartIce(peerConnection) {
        if (!peerConnection) return;

        try {
            console.log('Đang khởi động lại kết nối ICE...');

            // Restart ICE cho connection hiện tại
            if (peerConnection.restartIce) {
                peerConnection.restartIce();
            } else {
                // Fallback cho trình duyệt cũ
                const offerOptions = {
                    iceRestart: true,
                    offerToReceiveAudio: true
                };

                peerConnection.createOffer(offerOptions)
                    .then(offer => peerConnection.setLocalDescription(offer))
                    .then(() => {
                        console.log('Đã khởi động lại ICE thành công');
                    })
                    .catch(err => {
                        console.error('Lỗi khi khởi động lại ICE:', err);
                    });
            }
        } catch (e) {
            console.error('Không thể khởi động lại ICE:', e);
        }
    }
    // Bật/tắt micro
    toggleMicrophone(enabled) {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = enabled;
            });
            console.log(`Đã ${enabled ? 'bật' : 'tắt'} micro`);
            return enabled;
        }
        return false;
    }

    // Kết thúc cuộc gọi
    // endCall() {
    //     console.log('Kết thúc cuộc gọi trong PeerManager');

    //     try {
    //         // Đóng cuộc gọi hiện tại nếu có
    //         if (this.currentCall) {
    //             this.currentCall.close();
    //             this.currentCall = null;
    //             console.log('Đã đóng currentCall');
    //         }

    //         // Dừng tất cả các kết nối data
    //         if (this.peer) {
    //             const connections = this.peer.connections;
    //             // Đóng tất cả kết nối hiện tại
    //             for (const [peerId, conns] of Object.entries(connections)) {
    //                 conns.forEach(conn => {
    //                     try {
    //                         conn.close();
    //                         console.log(`Đã đóng kết nối với ${peerId}`);
    //                     } catch (e) {
    //                         console.error(`Lỗi khi đóng kết nối với ${peerId}:`, e);
    //                     }
    //                 });
    //             }
    //         }

    //         // Dừng luồng âm thanh
    //         this.stopLocalStream();
    //     } catch (err) {
    //         console.error('Lỗi khi kết thúc cuộc gọi:', err);
    //     }
    // }
    endCall() {
        console.log('Kết thúc cuộc gọi trong PeerManager');

        try {
            // Lưu trữ reference hiện tại
            const currentCall = this.currentCall;
            this.currentCall = null;

            // Đóng cuộc gọi hiện tại nếu có
            if (currentCall) {
                // Dọn dẹp tất cả intervals
                if (currentCall._intervals && currentCall._intervals.length > 0) {
                    currentCall._intervals.forEach(id => clearInterval(id));
                    currentCall._intervals = [];
                }

                if (currentCall._timeoutIds && currentCall._timeoutIds.length > 0) {
                    currentCall._timeoutIds.forEach(id => clearTimeout(id));
                    currentCall._timeoutIds = [];
                }

                // Dọn dẹp tất cả tracks liên quan
                if (currentCall.peerConnection) {
                    const senders = currentCall.peerConnection.getSenders();
                    senders.forEach(sender => {
                        if (sender.track) {
                            // Dọn dẹp bất kỳ interval nào gắn với track
                            if (sender.track._monitorInterval) {
                                clearInterval(sender.track._monitorInterval);
                                sender.track._monitorInterval = null;
                            }

                            // Dừng track
                            sender.track.stop();
                        }
                    });
                }

                // Đánh dấu là đã đóng trước khi thực sự đóng
                currentCall._isClosed = true;

                // Đóng kết nối
                currentCall.close();
                console.log('Đã đóng currentCall');
            }

            // Dừng luồng âm thanh và video
            this.stopLocalStream();
            this.remoteStream = null;
        } catch (err) {
            console.error('Lỗi khi kết thúc cuộc gọi:', err);
        }
    }

    // Dừng luồng âm thanh cục bộ
    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log('Đã dừng audio track');
            });
            this.localStream = null;
        }
    }

    // Dừng và đóng tất cả kết nối
    destroy() {
        console.log('Hủy PeerManager');
        this.endCall();

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
            this.isInitialized = false;
        }
    }

    // Bật/tắt camera
    // toggleCamera(enabled) {
    //     console.log(`toggleCamera(${enabled}) được gọi`);

    //     if (this.localStream) {
    //         const videoTracks = this.localStream.getVideoTracks();

    //         // Log trạng thái tracks
    //         console.log(`Đang có ${videoTracks.length} video tracks trong localStream`);

    //         // QUAN TRỌNG: Xử lý video tracks dựa trên tham số enabled
    //         if (enabled) {
    //             // Nếu bật camera, đảm bảo tất cả tracks đều được kích hoạt
    //             videoTracks.forEach(track => {
    //                 track.enabled = true;
    //                 console.log(`Đã BẬT video track: ${track.label}`);
    //             });
    //         } else {
    //             // Nếu tắt camera, THỰC SỰ dừng các tracks
    //             videoTracks.forEach(track => {
    //                 // Đầu tiên tắt track
    //                 track.enabled = false;

    //                 // Sau đó dừng track - điều này sẽ giải phóng camera hoàn toàn
    //                 // NHƯNG sẽ yêu cầu phải lấy lại stream khi bật lại camera
    //                 track.stop();
    //                 console.log(`Đã TẮT và DỪNG video track: ${track.label}`);
    //             });

    //             // Thông báo với bên kia rằng video đã tắt hoàn toàn
    //             if (this.currentCall?.peerConnection) {
    //                 try {
    //                     const dataChannel = this.currentCall.peerConnection.createDataChannel('video-status-update');
    //                     dataChannel.onopen = () => {
    //                         dataChannel.send(JSON.stringify({
    //                             type: 'video-disabled',
    //                             timestamp: Date.now()
    //                         }));

    //                         // Tự đóng data channel sau khi gửi
    //                         setTimeout(() => {
    //                             dataChannel.close();
    //                         }, 500);
    //                     };
    //                 } catch (e) {
    //                     console.warn('Không thể tạo data channel:', e);
    //                 }
    //             }
    //         }

    //         return enabled;
    //     }

    //     console.warn('toggleCamera: không có localStream');
    //     return false;
    // }
    toggleCamera(enabled) {
        console.log(`toggleCamera(${enabled}) được gọi`);

        if (!this.localStream) {
            console.warn('toggleCamera: không có localStream');
            return false;
        }

        // Cải thiện xử lý video tracks 
        const videoTracks = this.localStream.getVideoTracks();
        console.log(`Đang có ${videoTracks.length} video tracks trong localStream`);

        // Tạo danh sách enabled/disabled để tránh race condition
        const trackIdsToEnable = enabled ? videoTracks.map(t => t.id) : [];

        // Xử lý từng track riêng biệt
        videoTracks.forEach(track => {
            const shouldEnable = trackIdsToEnable.includes(track.id);

            // Đảm bảo track không bị thay đổi trạng thái nhiều lần
            if (track.enabled !== shouldEnable) {
                track.enabled = shouldEnable;
                console.log(`${shouldEnable ? 'BẬT' : 'TẮT'} video track: ${track.label}`);

                // Chỉ dừng khi tắt
                if (!shouldEnable) {
                    track.stop();
                    console.log(`DỪNG video track: ${track.label}`);
                }
            }
        });

        return enabled;
    }

    // Chuyển đổi camera trước/sau (cho thiết bị di động)
    async switchCamera() {
        try {
            // Lưu trạng thái hiện tại của các track
            const audioEnabled = this.localStream?.getAudioTracks()[0]?.enabled || true;
            const videoEnabled = this.localStream?.getVideoTracks()[0]?.enabled || true;

            // Lấy thiết bị hiện tại
            const currentVideoTrack = this.localStream?.getVideoTracks()[0];
            const currentSettings = currentVideoTrack?.getSettings();
            const currentFacingMode = currentSettings?.facingMode || 'user';

            // Chuyển đổi facingMode
            const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            console.log(`Chuyển camera từ ${currentFacingMode} sang ${newFacingMode}`);

            // Dừng các track hiện tại
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }

            // Tạo stream mới với camera đã chuyển đổi
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    facingMode: newFacingMode
                }
            });

            // Áp dụng trạng thái enabled từ stream cũ
            if (newStream) {
                newStream.getAudioTracks().forEach(track => {
                    track.enabled = audioEnabled;
                });
                newStream.getVideoTracks().forEach(track => {
                    track.enabled = videoEnabled;
                });
            }

            // Thay thế stream hiện tại
            this.localStream = newStream;

            // Cập nhật stream cho các cuộc gọi hiện tại
            if (this.currentCall && this.currentCall.peerConnection) {
                const senders = this.currentCall.peerConnection.getSenders();
                const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');

                if (videoSender) {
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    await videoSender.replaceTrack(newVideoTrack);
                }
            }

            return newStream;
        } catch (err) {
            console.error('Lỗi khi chuyển đổi camera:', err);
            throw err;
        }
    }
    // async addVideoTrack(videoTrack) {
    //     try {
    //         console.log('Thêm video track mới vào kết nối với ID:', videoTrack.id);

    //         // Kiểm tra xem đã có localStream chưa
    //         if (!this.localStream) {
    //             console.error('Không thể thêm video track vì chưa có localStream');
    //             return false;
    //         }

    //         // 1. Xóa tất cả video track cũ
    //         const oldVideoTracks = this.localStream.getVideoTracks();
    //         console.log(`Đang xóa ${oldVideoTracks.length} video track cũ`);

    //         oldVideoTracks.forEach(track => {
    //             console.log(`Dừng và xóa track: ${track.id}`);
    //             track.stop();
    //             this.localStream.removeTrack(track);
    //         });

    //         // 2. Thêm video track mới vào localStream
    //         console.log('Thêm track vào localStream:', videoTrack.id);
    //         this.localStream.addTrack(videoTrack);

    //         // Log trạng thái stream sau khi thêm
    //         const tracks = this.localStream.getTracks();
    //         console.log(`localStream hiện có ${tracks.length} tracks:`,
    //             tracks.map(t => `${t.kind}:${t.id}:${t.enabled}`).join(', '));

    //         // 3. Nếu đang có cuộc gọi, cập nhật peer connection
    //         if (this.currentCall && this.currentCall.peerConnection) {
    //             const pc = this.currentCall.peerConnection;
    //             console.log('PeerConnection state:', pc.connectionState || pc.iceConnectionState);

    //             // Tìm video sender hiện tại
    //             const senders = pc.getSenders();
    //             console.log(`Kiểm tra ${senders.length} sender hiện có`);

    //             const videoSender = senders.find(s => s.track && s.track.kind === 'video');

    //             // Thêm track vào peer connection
    //             if (videoSender) {
    //                 console.log('Thay thế video track trong sender hiện có:', videoSender.track?.id);
    //                 await videoSender.replaceTrack(videoTrack);
    //                 console.log('Đã thay thế track thành công');
    //             } else {
    //                 console.log('Thêm video track mới vào peer connection');
    //                 const sender = pc.addTrack(videoTrack, this.localStream);
    //                 console.log('Đã thêm track, tạo sender mới:', sender.track?.id);
    //             }

    //             // Đảm bảo đã thiết lập các listeners cho track
    //             videoTrack.onmute = () => console.log(`Video track ${videoTrack.id} bị muted`);
    //             videoTrack.onunmute = () => console.log(`Video track ${videoTrack.id} được unmuted`);
    //             videoTrack.onended = () => console.log(`Video track ${videoTrack.id} kết thúc`);

    //             return true;
    //         }

    //         console.log('Không có cuộc gọi/peer connection để cập nhật');
    //         return false;
    //     } catch (err) {
    //         console.error('Lỗi khi thêm video track:', err);
    //         return false;
    //     }
    // }
    async addVideoTrack(videoTrack) {
        try {
            console.log('Thêm video track mới vào kết nối với ID:', videoTrack.id);

            // Kiểm tra xem đã có localStream chưa
            if (!this.localStream) {
                console.error('Không thể thêm video track vì chưa có localStream');
                return false;
            }

            // 1. Xóa tất cả video track cũ
            const oldVideoTracks = this.localStream.getVideoTracks();
            if (oldVideoTracks.length > 0) {
                console.log(`Đang xóa ${oldVideoTracks.length} video track cũ`);
                oldVideoTracks.forEach(track => {
                    track.stop();
                    this.localStream.removeTrack(track);
                });
            }

            // 2. Đảm bảo video track được bật trước khi thêm
            videoTrack.enabled = true;
            videoTrack.contentHint = 'motion'; // Gợi ý cho codec xử lý chuyển động tốt hơn

            // 3. Thêm video track vào localStream
            this.localStream.addTrack(videoTrack);

            // 4. Log trạng thái stream
            const tracks = this.localStream.getTracks();
            console.log(`localStream hiện có ${tracks.length} tracks:`,
                tracks.map(t => `${t.kind}:${t.id}:${t.enabled}`).join(', '));

            // 5. Cập nhật kết nối nếu đang có cuộc gọi
            if (this.currentCall && this.currentCall.peerConnection) {
                const pc = this.currentCall.peerConnection;

                // Tìm video sender hiện có
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');

                let sender;
                // Thêm hoặc thay thế track
                if (videoSender) {
                    console.log('Thay thế video track trong sender hiện có');
                    await videoSender.replaceTrack(videoTrack);
                    sender = videoSender;
                } else {
                    console.log('Thêm video track mới vào peer connection');
                    sender = pc.addTrack(videoTrack, this.localStream);
                }

                // QUAN TRỌNG: Thiết lập ưu tiên video và băng thông cao
                try {
                    const params = sender.getParameters();
                    if (!params.encodings) {
                        params.encodings = [{}];
                    }
                    if (params.encodings.length === 0) {
                        params.encodings.push({});
                    }

                    // Set video parameters for continuous streaming
                    params.encodings[0].maxBitrate = 1500000;  // 1.5Mbps
                    params.encodings[0].minBitrate = 500000;   // Minimum 500kbps
                    params.encodings[0].maxFramerate = 30;
                    params.encodings[0].priority = 'high';
                    params.encodings[0].networkPriority = 'high';
                    params.encodings[0].active = true;

                    await sender.setParameters(params);
                    console.log('✅ Đã cài đặt tham số chất lượng cao cho video');

                    // Renegotiate the connection to ensure video is transmitted
                    this.restartIce(pc);
                } catch (e) {
                    console.warn('⚠️ Không thể thiết lập tham số video:', e);
                }

                return true;
            }

            console.log('Thêm track thành công, không có cuộc gọi để cập nhật');
            return true;
        } catch (err) {
            console.error('Lỗi khi thêm video track:', err);
            return false;
        }
    }
}

// Singleton instance
const peerManager = new PeerManager();
export default peerManager;