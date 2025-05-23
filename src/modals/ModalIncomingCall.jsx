import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Avatar } from 'antd';
import { PhoneOutlined, CloseCircleOutlined, VideoCameraOutlined } from '@ant-design/icons';
import soundManager from '../utils/soundManager';
import stopAllSounds from '../utils/stopAllSounds';
import './ModalIncomingCall.css';

function ModalIncomingCall({
    open,
    onAccept,
    onReject,
    fromUser,
    rejectMessage,
    isLogin,
    acceptCall,
    playRingtone,
    conversationId,
    userId,
    isVideo
}) {
    const [callStart, setCallStart] = React.useState(null);
    const [duration, setDuration] = React.useState(0);
    const intervalRef = React.useRef();
    const audioRef = React.useRef(null);
    const ringIntervalRef = React.useRef();

    // Reset state when modal is opened
    React.useEffect(() => {
        if (open) {
            setCallStart(null);
            setDuration(0);
        }
    }, [open]);

    React.useEffect(() => {
        setDuration(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [acceptCall]);
    // Xử lý âm thanh ringtone khi có cuộc gọi đến
    React.useEffect(() => {
        // Điều kiện phát ringtone: modal mở, playRingtone=true, chưa accept, chưa reject, là người nhận
        const shouldPlayRingtone = open && playRingtone && !acceptCall && !rejectMessage && fromUser && fromUser._id !== userId;

        if (shouldPlayRingtone) {
            console.log('[ModalIncomingCall] Bắt đầu phát ringtone');

            // Thử phát bằng cả soundManager với 3 cách khác nhau để đảm bảo một cách hoạt động
            try {
                // Cách 1: Sử dụng soundManager với loop
                soundManager.play('ringtone', { loop: true, force: true });

                // Cách 2: Tạo fallback Audio element
                // if (!window.__modalIncomingCallAudio) {
                //     window.__modalIncomingCallAudio = new Audio('/ringtone.mp3');
                //     window.__modalIncomingCallAudio.loop = true;
                // }

                // // Phát cả hai nguồn để tăng khả năng thành công
                // window.__modalIncomingCallAudio.play().catch(e => {
                //     console.log('[ModalIncomingCall] Fallback audio không phát được, sẽ dựa vào soundManager');
                // });

                // Cách 3: Thiết lập kiểm tra định kỳ
                // if (!window.__ringCheckInterval) {
                //     window.__ringCheckInterval = setInterval(() => {
                //         if (open && playRingtone && !acceptCall && !rejectMessage) {
                //             soundManager.play('ringtone', { loop: true, force: true });
                //         } else {
                //             if (window.__ringCheckInterval) {
                //                 clearInterval(window.__ringCheckInterval);
                //                 window.__ringCheckInterval = null;
                //             }
                //         }
                //     }, 2000);
                // }
            } catch (err) {
                console.error('[ModalIncomingCall] Lỗi phát ringtone:', err);
            }
        } else {
            // Dừng tất cả âm thanh khi không cần phát
            console.log('[ModalIncomingCall] Điều kiện không thỏa mãn, dừng ringtone');
            soundManager.stop('ringtone');
            stopAllSounds();

            // Dừng fallback audio nếu có
            if (window.__modalIncomingCallAudio) {
                try {
                    window.__modalIncomingCallAudio.pause();
                    window.__modalIncomingCallAudio.currentTime = 0;
                } catch (e) { }
            }

            // Xóa interval check
            if (window.__ringCheckInterval) {
                clearInterval(window.__ringCheckInterval);
                window.__ringCheckInterval = null;
            }
        }

        return () => {
            // Cleanup
            soundManager.stop('ringtone');
            stopAllSounds();

            if (window.__modalIncomingCallAudio) {
                try {
                    window.__modalIncomingCallAudio.pause();
                    window.__modalIncomingCallAudio.currentTime = 0;
                } catch (e) { }
            }

            if (window.__ringCheckInterval) {
                clearInterval(window.__ringCheckInterval);
                window.__ringCheckInterval = null;
            }
        };
    }, [open, playRingtone, acceptCall, rejectMessage, fromUser, userId]);

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };    // Xử lý chấp nhận cuộc gọi - đã chuẩn bị để kết nối với PeerJS
    const handleAcceptCall = () => {
        // Dừng tất cả các âm thanh đang phát (ringtone, notificationSound, và audio elements)
        stopAllSounds();
        console.log('Đã dừng tất cả âm thanh trong handleAcceptCall');

        // Gọi hàm onAccept từ component cha
        onAccept();
    };

    if (!fromUser) return null; return (
        <>
            <Modal
                open={open}
                footer={null}
                closable={false}
                centered
                width={350}
                className="incoming-call-modal"
                maskClosable={false} // Ngăn chặn đóng modal khi click ra ngoài
                title={
                    <div className="incoming-call-title">
                        {isVideo ?
                            <VideoCameraOutlined style={{ color: '#1890ff', marginRight: 8 }} /> :
                            <PhoneOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        }
                        {isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi đến'}
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24 }}>
                    <Avatar size={80} src={fromUser?.avatar} style={{ marginBottom: 16 }}>
                        {(!fromUser?.avatar && fromUser?.name) ? fromUser.name.charAt(0).toUpperCase() : ''}
                    </Avatar>
                    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{fromUser?.name}</div>
                    {rejectMessage ? (
                        <div style={{ color: '#ff4d4f', marginBottom: 24, fontWeight: 500 }}>
                            {rejectMessage}
                        </div>
                    ) : isLogin ? (
                        <div style={{ color: '#52c41a', marginBottom: 24 }}>
                            Đang kết nối... <span className="call-duration">{formatDuration(duration)}</span>
                        </div>
                    ) : (
                        <div style={{ color: '#1890ff', marginBottom: 24 }}>
                            Đang gọi đến cho bạn...
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 24 }}>
                        {rejectMessage ? null : (
                            <Button
                                shape="circle"
                                size="large"
                                icon={isVideo ? <VideoCameraOutlined /> : <PhoneOutlined />}
                                onClick={handleAcceptCall}
                                style={{ background: '#e6fffb', color: '#52c41a' }}
                                disabled={!!rejectMessage}
                                title={isVideo ? "Trả lời video" : "Trả lời cuộc gọi"}
                            />
                        )}
                        <Button
                            shape="circle"
                            size="large"
                            icon={<CloseCircleOutlined />}
                            onClick={onReject}
                            style={{ background: '#ffd6d6', color: '#ff4d4f' }}
                            disabled={!!rejectMessage}
                            title="Từ chối cuộc gọi"
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default ModalIncomingCall;