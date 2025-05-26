import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from "agora-rtc-sdk-ng";
import { APP_ID, fetchToken } from '../../utils/agoraConfig';
import './style.css';

const AgoraVideoCall = ({
  channelName,
  token = null,
  uid = null,
  isVideo = true,
  onEndCall
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [client, setClient] = useState(null);
  const joinInProgress = useRef(false);

  useEffect(() => {
    // Tạo Agora client
    const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(rtcClient);

    const init = async () => {
      try {
        // Với dự án không xác thực, không cần lấy token
        const dynamicToken = null;

        // Tạo numericUid nếu uid là chuỗi
        const numericUid = typeof uid === 'string' ? Math.floor(Math.random() * 100000) : uid || null;

        // Tham gia kênh mà không cần token
        await rtcClient.join(APP_ID, channelName, null, numericUid);
        console.log('📱 Đã tham gia kênh Agora:', channelName);

        // Tạo và publish local stream
        const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        let localVideoTrack = null;

        if (isVideo) {
          localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        }

        // Lưu local stream để hiển thị
        setLocalStream({
          uid: rtcClient.uid,
          audioTrack: localAudioTrack,
          videoTrack: localVideoTrack,
        });

        // Publish tracks
        if (isVideo) {
          await rtcClient.publish([localAudioTrack, localVideoTrack]);
        } else {
          await rtcClient.publish([localAudioTrack]);
        }

        // Bắt sự kiện user mới
        rtcClient.on('user-published', async (user, mediaType) => {
          await rtcClient.subscribe(user, mediaType);

          if (mediaType === 'video') {
            setRemoteStreams(prev => {
              const existingUser = prev.find(stream => stream.uid === user.uid);
              if (existingUser) {
                return prev.map(stream =>
                  stream.uid === user.uid
                    ? { ...stream, videoTrack: user.videoTrack }
                    : stream
                );
              } else {
                return [...prev, {
                  uid: user.uid,
                  audioTrack: null,
                  videoTrack: user.videoTrack
                }];
              }
            });
          }

          if (mediaType === 'audio') {
            user.audioTrack.play();
            setRemoteStreams(prev => {
              const existingUser = prev.find(stream => stream.uid === user.uid);
              if (existingUser) {
                return prev.map(stream =>
                  stream.uid === user.uid
                    ? { ...stream, audioTrack: user.audioTrack }
                    : stream
                );
              } else {
                return [...prev, {
                  uid: user.uid,
                  audioTrack: user.audioTrack,
                  videoTrack: null
                }];
              }
            });
          }
        });

        // Xử lý khi user rời đi
        rtcClient.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            setRemoteStreams(prev =>
              prev.map(stream =>
                stream.uid === user.uid
                  ? { ...stream, videoTrack: null }
                  : stream
              )
            );
          }
        });

        rtcClient.on('user-left', (user) => {
          setRemoteStreams(prev =>
            prev.filter(stream => stream.uid !== user.uid)
          );
        });

      } catch (error) {
        console.error('Lỗi khi tham gia kênh Agora:', error);
      }
    };

    init();

    // Cleanup khi component unmount
    return () => {
      if (localStream) {
        localStream.audioTrack?.close();
        localStream.videoTrack?.close();
      }

      if (rtcClient) {
        rtcClient.removeAllListeners();
        rtcClient.leave();
      }
    };
  }, [channelName, token, uid, isVideo]);

  // Hiển thị video của người dùng
  useEffect(() => {
    if (localStream && localStream.videoTrack && isVideo) {
      localStream.videoTrack.play(`local-stream-${localStream.uid}`);
    }
  }, [localStream, isVideo]);

  // Hiển thị video của người dùng từ xa
  useEffect(() => {
    remoteStreams.forEach(stream => {
      if (stream.videoTrack) {
        stream.videoTrack.play(`remote-stream-${stream.uid}`);
      }
    });
  }, [remoteStreams]);

  const handleEndCall = () => {
    if (client) {
      client.leave();
      if (onEndCall) onEndCall();
    }
  };

  return (
    <div className="agora-call-container">
      <div className="video-container">
        {isVideo && localStream && (
          <div className="video-player local-player">
            <div id={`local-stream-${localStream.uid}`} className="video-element"></div>
            <div className="user-name">Bạn</div>
          </div>
        )}

        {remoteStreams.map(stream => (
          <div key={stream.uid} className="video-player remote-player">
            {isVideo && stream.videoTrack ? (
              <div id={`remote-stream-${stream.uid}`} className="video-element"></div>
            ) : (
              <div className="avatar-placeholder">
                <span>{stream.uid.toString().charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="user-name">Người dùng {stream.uid}</div>
          </div>
        ))}
      </div>

      <div className="call-controls">
        <button className="end-call-btn" onClick={handleEndCall}>
          Kết thúc cuộc gọi
        </button>
      </div>
    </div>
  );
};

export default AgoraVideoCall;