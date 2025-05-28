import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Button, Avatar, Typography, Space, Row, Col, message, Modal } from 'antd';
import Icon, {
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  VideoCameraFilled,
  StopOutlined,
  PhoneOutlined,
  UserOutlined,
  AppstoreOutlined,
  BorderOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { APP_ID, generateChannelId } from '../../utils/agoraConfig';
import socket from '../../utils/socketClient';
import './style.css';

const { Text } = Typography;

const AgoraVideoCall = forwardRef(({
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
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [client, setClient] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [endCallMessage, setEndCallMessage] = useState('');
  const [groupParticipants, setGroupParticipants] = useState([]);

  const joinInProgress = useRef(false);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const clientRef = useRef(null);
  const cleanupInProgress = useRef(false);
  const callDurationTimerRef = useRef(null);
  const isComponentMounted = useRef(true);
  const localVideoContainerRef = useRef(null);
  const updateTimeouts = useRef(new Map());
  const lastUpdateTime = useRef(new Map());

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'speaker' | 'pagination'
  const [currentPage, setCurrentPage] = useState(0);
  const [speakerUser, setSpeakerUser] = useState(null);
  const [showParticipantsList, setShowParticipantsList] = useState(false);

  // Determine if this is a group call
  const isGroupCall = conversation.type === true || conversation.totalMembers > 2;
  const [videoDisplayMode, setVideoDisplayMode] = useState('cover'); // 'cover' or 'contain'
  const IS_DEV = process.env.NODE_ENV === 'development';


  const logInfo = (message, ...args) => {
    if (IS_DEV) console.log(message, ...args);
  };

  const logError = (message, ...args) => {
    console.error(message, ...args); // Always log errors
  };

  // useImperativeHandle(ref, () => ({
  //   cleanup: async () => {
  //     console.log('🧹 Video Call cleanup called via ref');
  //     await cleanup();
  //   },
  //   getRemoteUsers: () => remoteUsers,
  //   getCallDuration: () => callDuration,
  //   isCallActive: () => !callEnded && remoteUsers.length > 0
  // }));

  useImperativeHandle(ref, () => ({
    cleanup: async () => {
      if (cleanupInProgress.current) {
        console.log('🔄 Cleanup already in progress, skipping');
        return;
      }
      await cleanup();
    },
    getRemoteUsers: () => remoteUsers,
    getCallDuration: () => callDuration,
    isCallActive: () => !callEnded && remoteUsers.length > 0,
    // ✅ ADD: Video call specific methods like audio call
    getGroupParticipants: () => groupParticipants,
    hasRemoteUsers: () => remoteUsers.length > 0,
    getTotalParticipants: () => {
      if (isGroupCall) {
        return groupParticipants.length;
      }
      return remoteUsers.length + 1; // +1 for current user
    }
  }));

  // Call duration timer
  useEffect(() => {
    if (remoteUsers.length > 0 && !callEnded) {
      callDurationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
        callDurationTimerRef.current = null;
      }
    }

    return () => {
      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
      }
    };
  }, [remoteUsers.length, callEnded]);

  useEffect(() => {
    isComponentMounted.current = true;
    setupVideoCall();

    return () => {
      console.log('🔄 AgoraVideoCall component unmounting');
      isComponentMounted.current = false;

      // Force cleanup on unmount
      const asyncCleanup = async () => {
        try {
          await forceCleanupWithRetry();
        } catch (error) {
          console.error('❌ Error in unmount cleanup:', error);
        }
      };

      asyncCleanup();
    };
  }, [channelName, uid]);

  // Thêm useEffect này để đảm bảo local video luôn được play khi có track

  useEffect(() => {
    // Monitor local video track changes and ensure it's playing
    if (localVideoTrack && localVideoContainerRef.current && !isVideoMuted) {
      console.log('🎬 Local video track changed, ensuring playback...');

      const ensureLocalVideoPlaying = async () => {
        try {
          await localVideoTrack.play(localVideoContainerRef.current);
          console.log('✅ Local video ensured playing');

          // Apply CSS optimizations
          const localVideoElement = localVideoContainerRef.current.querySelector('video');
          if (localVideoElement) {
            localVideoElement.classList.add('stable-video');
            localVideoElement.style.transition = 'none';
            localVideoElement.style.objectFit = 'cover';
            localVideoElement.style.width = '100%';
            localVideoElement.style.height = '100%';
          }
        } catch (error) {
          console.warn('⚠️ Failed to ensure local video playing:', error);
        }
      };

      // Small delay to ensure container is ready
      setTimeout(ensureLocalVideoPlaying, 100);
    }
  }, [localVideoTrack, isVideoMuted]);

  useEffect(() => {
    if (isRejected && isComponentMounted.current) {
      console.log('❌ Video call rejected - IMMEDIATE cleanup in AgoraVideoCall');

      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
        callDurationTimerRef.current = null;
      }

      cleanup().then(() => {
        if (isComponentMounted.current && onCallEnded) {
          onCallEnded({
            isRejected: true,
            message: rejectionMessage || 'Cuộc gọi video đã bị từ chối',
            duration: callDuration
          });
        }
      });
    }
  }, [isRejected]);

  useEffect(() => {
    return () => {
      updateTimeouts.current.forEach(timeout => clearTimeout(timeout));
      updateTimeouts.current.clear();
      lastUpdateTime.current.clear();
    };
  }, []);


  useEffect(() => {
    const userCount = remoteUsers.length;

    if (userCount <= 3 && viewMode !== 'grid') {
      // Small group: always use grid
      setViewMode('grid');
      setSpeakerUser(null);
      setCurrentPage(0);
    } else if (userCount >= 13 && viewMode !== 'pagination' && viewMode !== 'speaker') {
      // Very large group: suggest pagination
      setViewMode('pagination');
      setCurrentPage(0);
    } else if (userCount >= 7 && userCount <= 12 && viewMode === 'grid') {
      // Large group: suggest speaker view
      setTimeout(() => {
        Modal.confirm({
          title: 'Chuyển sang Speaker View?',
          content: `Có ${userCount} người trong cuộc gọi. Bạn có muốn chuyển sang chế độ Speaker View để dễ theo dõi hơn?`,
          okText: 'Đồng ý',
          cancelText: 'Giữ Grid View',
          icon: <TeamOutlined />,
          onOk() {
            setViewMode('speaker');
            setSpeakerUser(remoteUsers[0]);
          },
          onCancel() {
            console.log('User chose to keep grid view');
          },
        });
      }, 2000);
    }
  }, [remoteUsers.length]);

  const setupVideoCall = async () => {
    if (joinInProgress.current || !isComponentMounted.current) {
      console.log('🚫 Setup already in progress or component unmounted');
      return;
    }

    joinInProgress.current = true;
    console.log('🎥 Setting up video call...');

    try {
      // Force cleanup với retry mechanism
      await forceCleanupWithRetry();

      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const consistentUid = generateConsistentUID(currentUser._id);
      console.log(`🎯 Using consistent UID: ${consistentUid} for user: ${currentUser.name} (${currentUser._id})`);

      // Create fresh Agora client
      const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setClient(agoraClient);
      clientRef.current = agoraClient;

      // ✅ IMPROVED: Better connection state handling - NO AUTO RECONNECTION
      agoraClient.on('connection-state-change', (curState, revState) => {
        console.log('🔗 Video connection state changed:', revState, '->', curState);

        if (curState === 'DISCONNECTED') {
          console.error('❌ Agora video connection lost');
          if (isComponentMounted.current) {
            console.warn('⚠️ Connection lost - user may need to rejoin call');
          }
        } else if (curState === 'CONNECTED') {
          console.log('✅ Agora video connection established');
        } else if (curState === 'CONNECTING') {
          console.log('🔄 Agora video connecting...');
        } else if (curState === 'RECONNECTING') {
          console.log('🔄 Agora video reconnecting...');
        }
      });

      // ✅ IMPROVED: Better network quality monitoring with throttling
      let lastNetworkWarning = 0;
      agoraClient.on('network-quality', (stats) => {
        const now = Date.now();
        if (stats.downlinkNetworkQuality > 4 || stats.uplinkNetworkQuality > 4) {
          if (now - lastNetworkWarning > 10000) {
            console.warn('⚠️ Poor network quality detected:', {
              downlink: stats.downlinkNetworkQuality,
              uplink: stats.uplinkNetworkQuality
            });
            lastNetworkWarning = now;
          }
        }
      });

      // ✅ IMPROVED: Exception handling without excessive logging
      agoraClient.on('exception', (evt) => {
        console.error('❌ Agora exception:', evt.code, evt.msg);
        if (evt.code === 'FRAMERATE_INPUT_TOO_LOW') {
          console.log('📹 Adjusting frame rate...');
        } else if (evt.code === 'FRAMERATE_SENT_TOO_LOW') {
          console.log('📹 Low send frame rate detected');
        }
      });

      // Setup user-joined handler like audio call
      agoraClient.on('user-joined', async (user) => {
        if (!isComponentMounted.current) return;
        console.log('👤 User joined video call:', user.uid);

        // Kiểm tra xem user đã tồn tại chưa
        const existingUser = remoteUsers.find(u => String(u.uid) === String(user.uid));
        if (existingUser) {
          console.log('ℹ️ User already exists, skipping add:', user.uid);
          return;
        }

        let memberInfo = null;
        let userName = `User ${user.uid}`;
        let userAvatar = null;

        // ✅ IMPROVED: Better user info resolution cho individual call
        if (!isGroupCall && conversation.totalMembers === 2) {
          // Individual call: chỉ có 2 người
          const otherUserInfo = getOtherUserInfo();
          userName = otherUserInfo.name || `User ${user.uid}`;
          userAvatar = otherUserInfo.avatar;
          memberInfo = {
            _id: conversation.userId || conversation.members?.find(m => m._id !== currentUser._id)?._id,
            name: userName,
            avatar: userAvatar
          };
        } else if (isGroupCall && conversation.members && conversation.members.length > 0) {
          memberInfo = findUserByUID(user.uid, conversation.members);
          if (memberInfo) {
            userName = memberInfo.name || `User ${user.uid}`;
            userAvatar = memberInfo.avatar;
          }
        }

        console.log('🎬 Adding remote user:', {
          uid: user.uid,
          userName,
          userAvatar,
          isGroupCall,
          totalMembers: conversation.totalMembers
        });

        setRemoteUsers(prev => {
          // Double check không trùng lặp
          const exists = prev.find(u => String(u.uid) === String(user.uid));
          if (exists) {
            console.log('⚠️ User already in remoteUsers, not adding:', user.uid);
            return prev;
          }

          const newUser = {
            uid: user.uid,
            videoTrack: null,
            audioTrack: null,
            hasVideo: false,
            hasAudio: false,
            name: userName,
            avatar: userAvatar,
            memberId: memberInfo?._id || null
          };

          console.log('✅ Adding new remote user to state:', newUser);
          return [...prev, newUser];
        });

        // ✅ ONLY emit for group calls
        if (isGroupCall && conversation._id) {
          socket.emit('user-joined-video-channel', {
            conversationId: conversation._id,
            userId: memberInfo?._id || user.uid,
            agoraUid: user.uid,
            userName: userName,
            userAvatar: userAvatar
          });
        }
      });

      // Setup user-unpublished handler
      agoraClient.on('user-unpublished', (user, mediaType) => {
        if (!isComponentMounted.current) return;
        console.log('👤 User unpublished:', user.uid, mediaType);

        if (mediaType === 'video') {
          setRemoteUsers(prev =>
            prev.map(u =>
              u.uid === user.uid
                ? { ...u, videoTrack: null, hasVideo: false }
                : u
            )
          );
        } else if (mediaType === 'audio') {
          setRemoteUsers(prev =>
            prev.map(u =>
              u.uid === user.uid
                ? { ...u, audioTrack: null, hasAudio: false }
                : u
            )
          );
        }
      });
      agoraClient.on('user-published', async (user, mediaType) => {
        if (!isComponentMounted.current) return;

        console.log('👤 User published:', user.uid, mediaType);

        try {
          await agoraClient.subscribe(user, mediaType);

          if (mediaType === 'video' && user.videoTrack && isComponentMounted.current) {
            const updateKey = `video-${user.uid}`;

            // Debounce với time check
            const now = Date.now();
            const lastUpdate = lastUpdateTime.current.get(updateKey) || 0;

            if (now - lastUpdate < 200) {
              console.log('🔄 Debouncing video update for UID:', user.uid);
              return;
            }

            lastUpdateTime.current.set(updateKey, now);

            // Clear previous timeout
            if (updateTimeouts.current.has(updateKey)) {
              clearTimeout(updateTimeouts.current.get(updateKey));
            }

            // Single debounced update
            updateTimeouts.current.set(updateKey, setTimeout(() => {
              if (!isComponentMounted.current) return;

              setRemoteUsers(prev => {
                const existingUserIndex = prev.findIndex(u => u.uid === user.uid);

                if (existingUserIndex !== -1) {
                  const currentUser = prev[existingUserIndex];

                  // ✅ ONLY update if actually different
                  if (currentUser.videoTrack !== user.videoTrack || !currentUser.hasVideo) {
                    console.log('🔄 Updating existing user with video:', user.uid);

                    const updatedUsers = [...prev];
                    updatedUsers[existingUserIndex] = {
                      ...currentUser,
                      videoTrack: user.videoTrack,
                      hasVideo: true
                    };

                    return updatedUsers;
                  } else {
                    console.log('ℹ️ No video changes needed for user:', user.uid);
                  }
                } else {
                  console.warn('⚠️ User not found in remoteUsers for video update:', user.uid);
                }

                return prev; // No changes
              });

              updateTimeouts.current.delete(updateKey);
              lastUpdateTime.current.delete(updateKey);
            }, 150)); // Debounce 150ms
          }

          if (mediaType === 'audio' && user.audioTrack && isComponentMounted.current) {
            const updateKey = `audio-${user.uid}`;

            // Debounce audio updates
            const now = Date.now();
            const lastUpdate = lastUpdateTime.current.get(updateKey) || 0;

            if (now - lastUpdate < 200) {
              console.log('🔄 Debouncing audio update for UID:', user.uid);
              return;
            }

            lastUpdateTime.current.set(updateKey, now);

            try {
              await user.audioTrack.play();
              console.log('✅ Audio playing for UID:', user.uid);
            } catch (audioError) {
              console.error('❌ Audio play error:', audioError);
            }

            // Clear previous timeout
            if (updateTimeouts.current.has(updateKey)) {
              clearTimeout(updateTimeouts.current.get(updateKey));
            }

            updateTimeouts.current.set(updateKey, setTimeout(() => {
              if (!isComponentMounted.current) return;

              setRemoteUsers(prev => {
                const existingUserIndex = prev.findIndex(u => u.uid === user.uid);

                if (existingUserIndex !== -1) {
                  const currentUser = prev[existingUserIndex];

                  // ✅ ONLY update if actually different
                  if (currentUser.audioTrack !== user.audioTrack || !currentUser.hasAudio) {
                    console.log('🔄 Updating existing user with audio:', user.uid);

                    const updatedUsers = [...prev];
                    updatedUsers[existingUserIndex] = {
                      ...currentUser,
                      audioTrack: user.audioTrack,
                      hasAudio: true
                    };

                    return updatedUsers;
                  } else {
                    console.log('ℹ️ No audio changes needed for user:', user.uid);
                  }
                } else {
                  console.warn('⚠️ User not found in remoteUsers for audio update:', user.uid);
                }

                return prev; // No changes
              });

              updateTimeouts.current.delete(updateKey);
              lastUpdateTime.current.delete(updateKey);
            }, 150)); // Debounce 150ms
          }

        } catch (err) {
          console.error('❌ Error subscribing to user:', err);
        }
      });

      // Setup user-left handler like audio call
      agoraClient.on('user-left', (user) => {
        if (!isComponentMounted.current) return;
        console.log('👋 User left video call:', user.uid);

        // Emit leave event for group calls
        if (isGroupCall && conversation._id) {
          const leftUser = remoteUsers.find(u => u.uid === user.uid);
          socket.emit('user-left-video-channel', {
            conversationId: conversation._id,
            userId: leftUser?.memberId || user.uid,
            agoraUid: user.uid
          });
        }

        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));

        if (isGroupCall) {
          // ✅ GROUP CALL: Just remove user, don't end call
          const leftUser = remoteUsers.find(u => u.uid === user.uid);
          const userName = leftUser?.name || `User ${user.uid}`;
          console.log(`👥 ${userName} đã rời khỏi cuộc gọi video nhóm`);
        } else {
          // ✅ INDIVIDUAL CALL: End call when other user leaves
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
            if (onEndCall && isComponentMounted.current) onEndCall();
          }, 2000);
        }
      });

      // ✅ IMPROVED: Create tracks with better error handling
      let videoTrack = null;
      let audioTrack = null;
      let tracksToPublish = [];

      // Create audio track first
      try {
        console.log('🎤 Creating audio track...');
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: {
            sampleRate: 48000,
            bitrate: 128,
            stereo: false
          },
          AEC: true,
          AGC: true,
          ANS: true
        });

        localAudioTrackRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        tracksToPublish.push(audioTrack);
        console.log('✅ Audio track created successfully');
      } catch (audioError) {
        console.error('❌ Failed to create audio track:', audioError);
        setIsAudioMuted(true);
        try {
          console.log('🔄 Retrying audio track with basic config...');
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          localAudioTrackRef.current = audioTrack;
          setLocalAudioTrack(audioTrack);
          tracksToPublish.push(audioTrack);
          console.log('✅ Basic audio track created successfully');
        } catch (basicAudioError) {
          console.error('❌ Failed to create basic audio track:', basicAudioError);
        }
      }
      // width: { ideal: 640, min: 480, max: 960 },
      //             height: { ideal: 480, min: 360, max: 720 },
      //             frameRate: 15,
      //             bitrateMin: 400,
      //             bitrateMax: 800,
      // Create video track
      try {
        console.log('📹 Attempting to create video track...');
        videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: { ideal: 1280, min: 640, max: 1920 },
            height: { ideal: 720, min: 480, max: 1080 },
            frameRate: { ideal: 30, min: 15, max: 30 },
            bitrateMin: 800,
            bitrateMax: 2000,
          },
          facingMode: 'user',
          optimizationMode: 'detail'
        });

        localVideoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        tracksToPublish.push(videoTrack);
        console.log('✅ Video track created successfully');

        // Play local video immediately
        if (localVideoContainerRef.current && isComponentMounted.current) {
          try {
            await videoTrack.play(localVideoContainerRef.current);
            console.log('✅ Local video playing immediately');

            const localVideoElement = localVideoContainerRef.current.querySelector('video');
            if (localVideoElement) {
              localVideoElement.classList.add('stable-video');
              localVideoElement.style.transition = 'none';
              localVideoElement.style.objectFit = 'cover';
              localVideoElement.style.width = '100%';
              localVideoElement.style.height = '100%';
            }
          } catch (playError) {
            console.warn('⚠️ Failed to play local video immediately:', playError);
            setTimeout(async () => {
              if (videoTrack && localVideoContainerRef.current && isComponentMounted.current) {
                try {
                  await videoTrack.play(localVideoContainerRef.current);
                  console.log('✅ Local video playing on retry');
                  const localVideoElement = localVideoContainerRef.current.querySelector('video');
                  if (localVideoElement) {
                    localVideoElement.classList.add('stable-video');
                    localVideoElement.style.transition = 'none';
                    localVideoElement.style.objectFit = 'cover';
                    localVideoElement.style.width = '100%';
                    localVideoElement.style.height = '100%';
                  }
                } catch (retryError) {
                  console.error('❌ Local video retry failed:', retryError);
                }
              }
            }, 1000);
          }
        }

      } catch (videoError) {
        console.warn('⚠️ Failed to create video track:', videoError);
        setIsVideoMuted(true);
        try {
          console.log('🔄 Retrying video track with basic config...');
          videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: {
              width: 640,
              height: 480,
              frameRate: 15,
              bitrateMax: 800,
            }
          });

          localVideoTrackRef.current = videoTrack;
          setLocalVideoTrack(videoTrack);
          tracksToPublish.push(videoTrack);
          console.log('✅ Basic video track created successfully');

          if (localVideoContainerRef.current && isComponentMounted.current) {
            try {
              await videoTrack.play(localVideoContainerRef.current);
              console.log('✅ Basic local video playing');
              const localVideoElement = localVideoContainerRef.current.querySelector('video');
              if (localVideoElement) {
                localVideoElement.classList.add('stable-video');
                localVideoElement.style.transition = 'none';
                localVideoElement.style.objectFit = 'cover';
                localVideoElement.style.width = '100%';
                localVideoElement.style.height = '100%';
              }
            } catch (playError) {
              console.warn('⚠️ Failed to play basic local video:', playError);
            }
          }
        } catch (basicVideoError) {
          console.error('❌ Failed to create basic video track:', basicVideoError);
        }
      }

      // Check if we have at least one track
      if (tracksToPublish.length === 0) {
        throw new Error('Không thể truy cập camera và microphone');
      }

      // ✅ IMPROVED: Join with single attempt (no retry loop)
      try {
        console.log('🎥 Joining video channel...');
        await agoraClient.join(APP_ID, channelName, token, consistentUid);
        console.log('🎥 Joined video channel:', channelName, 'with UID:', consistentUid);
      } catch (joinError) {
        console.error('❌ Join failed:', joinError);
        if (joinError.code === 'UID_CONFLICT') {
          const newUid = generateConsistentUID(currentUser._id + Date.now());
          console.log('🔄 Trying with new UID due to conflict:', newUid);
          await agoraClient.join(APP_ID, channelName, token, newUid);
          console.log('🎥 Joined with new UID:', newUid);
        } else {
          throw joinError;
        }
      }

      // Publish tracks after successful join
      if (tracksToPublish.length > 0) {
        try {
          await agoraClient.publish(tracksToPublish);
          console.log('🎥 Published video tracks successfully:',
            tracksToPublish.map(t => t.trackMediaType || t.kind || 'unknown'));
        } catch (publishError) {
          console.error('❌ Failed to publish tracks:', publishError);
          setTimeout(async () => {
            try {
              await agoraClient.publish(tracksToPublish);
              console.log('✅ Tracks published on retry');
            } catch (retryError) {
              console.error('❌ Track publish retry failed:', retryError);
            }
          }, 2000);
        }
      }

      // Emit answered notification like audio call
      setTimeout(() => {
        if (conversation._id && isComponentMounted.current) {
          console.log('🎯 Emitting video call answered after join delay');

          socket.emit('video-call-answered-notification', {
            conversationId: conversation._id,
            answeredBy: consistentUid,
            isGroupCall: isGroupCall,
            userId: currentUser._id
          });

          socket.emit('call-answered-notification', {
            conversationId: conversation._id,
            answeredBy: consistentUid,
            isGroupCall: isGroupCall,
            userId: currentUser._id
          });
        }
      }, 2000);

      // Emit join event for group calls like audio
      if (isGroupCall && conversation._id) {
        socket.emit('user-joined-video-channel', {
          conversationId: conversation._id,
          userId: currentUser._id,
          agoraUid: consistentUid,
          userName: currentUser.name || currentUser.username,
          userAvatar: currentUser.avatar
        });
        console.log('📡 Đã emit user-joined-video-channel');
      }

    } catch (error) {
      console.error('🚫 Error setting up video call:', error);

      let errorMessage = 'Không thể thiết lập cuộc gọi video';

      if (error.code === 'UID_CONFLICT') {
        errorMessage = 'Cuộc gọi đang được thực hiện từ thiết bị khác. Vui lòng thử lại sau.';
      } else if (error.message.includes('Device in use')) {
        errorMessage = 'Camera đang được sử dụng. Cuộc gọi sẽ tiếp tục với âm thanh.';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'Không có quyền truy cập camera/microphone.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
      }

      setEndCallMessage(errorMessage);
      setCallEnded(true);
    } finally {
      joinInProgress.current = false;
    }
  };


  // const forceCleanupWithRetry = async () => {
  //   console.log('🧹 Force cleanup with retry...');

  //   let cleanupAttempts = 0;
  //   const maxCleanupAttempts = 3;

  //   while (cleanupAttempts < maxCleanupAttempts) {
  //     try {
  //       cleanupAttempts++;
  //       console.log(`🧹 Cleanup attempt ${cleanupAttempts}/${maxCleanupAttempts}`);

  //       // Stop and close local tracks first
  //       if (localVideoTrackRef.current) {
  //         try {
  //           localVideoTrackRef.current.stop();
  //           localVideoTrackRef.current.close();
  //           console.log('✅ Local video track stopped');
  //         } catch (error) {
  //           console.warn('⚠️ Error stopping video track:', error);
  //         }
  //         localVideoTrackRef.current = null;
  //       }

  //       if (localAudioTrackRef.current) {
  //         try {
  //           localAudioTrackRef.current.stop();
  //           localAudioTrackRef.current.close();
  //           console.log('✅ Local audio track stopped');
  //         } catch (error) {
  //           console.warn('⚠️ Error stopping audio track:', error);
  //         }
  //         localAudioTrackRef.current = null;
  //       }

  //       // Leave channel if client exists
  //       if (clientRef.current) {
  //         try {
  //           console.log('🚪 Leaving existing channel...');

  //           // Set a timeout for leave operation
  //           const leavePromise = clientRef.current.leave();
  //           const timeoutPromise = new Promise((_, reject) =>
  //             setTimeout(() => reject(new Error('Leave timeout')), 3000)
  //           );

  //           await Promise.race([leavePromise, timeoutPromise]);
  //           console.log('✅ Successfully left existing channel');

  //         } catch (leaveError) {
  //           console.warn(`⚠️ Error leaving channel (attempt ${cleanupAttempts}):`, leaveError);

  //           if (cleanupAttempts < maxCleanupAttempts) {
  //             // Wait before retry
  //             await new Promise(resolve => setTimeout(resolve, 1000));
  //             continue;
  //           }
  //         } finally {
  //           clientRef.current = null;
  //         }
  //       }

  //       // Reset states
  //       setLocalVideoTrack(null);
  //       setLocalAudioTrack(null);
  //       setRemoteUsers([]);
  //       setClient(null);

  //       console.log('✅ Force cleanup completed successfully');
  //       break; // Success, exit loop

  //     } catch (error) {
  //       console.error(`❌ Cleanup attempt ${cleanupAttempts} failed:`, error);

  //       if (cleanupAttempts >= maxCleanupAttempts) {
  //         console.error('❌ All cleanup attempts failed, proceeding anyway');
  //         // Force reset everything
  //         localVideoTrackRef.current = null;
  //         localAudioTrackRef.current = null;
  //         clientRef.current = null;
  //         setLocalVideoTrack(null);
  //         setLocalAudioTrack(null);
  //         setRemoteUsers([]);
  //         setClient(null);
  //       } else {
  //         // Wait before retry
  //         await new Promise(resolve => setTimeout(resolve, 1000));
  //       }
  //     }
  //   }
  // };
  const getGridLayout = (userCount) => {
    if (userCount === 1) return {
      flex: '1',
      minHeight: '100%',
      columns: 1,
      rows: 1
    };
    if (userCount === 2) return {
      flex: '0 0 48%',
      minHeight: '200px',
      columns: 2,
      rows: 1
    };
    if (userCount === 3) return {
      flex: '0 0 31%',
      minHeight: '180px',
      columns: 3,
      rows: 1
    };
    if (userCount === 4) return {
      flex: '0 0 48%',
      minHeight: '160px',
      columns: 2,
      rows: 2
    };
    if (userCount <= 6) return {
      flex: '0 0 31%',
      minHeight: '140px',
      columns: 3,
      rows: 2
    };
    if (userCount <= 9) return {
      flex: '0 0 31%',
      minHeight: '120px',
      columns: 3,
      rows: 3
    };
    if (userCount <= 12) return {
      flex: '0 0 23%',
      minHeight: '100px',
      columns: 4,
      rows: 3
    };

    // 13+ users: Speaker view with pagination
    return {
      flex: '0 0 31%',
      minHeight: '100px',
      columns: 3,
      rows: 3,
      needsPagination: true
    };
  };


  const forceCleanupWithRetry = async () => {
    console.log('🧹 Force cleanup with retry...');

    let cleanupAttempts = 0;
    const maxCleanupAttempts = 2; // Reduce attempts

    while (cleanupAttempts < maxCleanupAttempts) {
      try {
        cleanupAttempts++;
        console.log(`🧹 Cleanup attempt ${cleanupAttempts}/${maxCleanupAttempts}`);

        // ✅ IMPROVED: Better track cleanup
        if (localVideoTrackRef.current) {
          try {
            const track = localVideoTrackRef.current;

            // Stop playing first
            if (track.stop) {
              track.stop();
            }

            // Then close
            if (track.close) {
              track.close();
            }

            console.log('✅ Local video track stopped');
          } catch (error) {
            console.warn('⚠️ Error stopping video track:', error);
          }
          localVideoTrackRef.current = null;
        }

        if (localAudioTrackRef.current) {
          try {
            const track = localAudioTrackRef.current;

            // Stop playing first
            if (track.stop) {
              track.stop();
            }

            // Then close
            if (track.close) {
              track.close();
            }

            console.log('✅ Local audio track stopped');
          } catch (error) {
            console.warn('⚠️ Error stopping audio track:', error);
          }
          localAudioTrackRef.current = null;
        }

        // ✅ IMPROVED: Better client cleanup
        if (clientRef.current) {
          try {
            console.log('🚪 Leaving existing channel...');

            const client = clientRef.current;

            // Check connection state before leaving
            if (client.connectionState === 'CONNECTED' || client.connectionState === 'CONNECTING') {
              // Set a reasonable timeout for leave operation
              const leavePromise = client.leave();
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Leave timeout')), 5000)
              );

              await Promise.race([leavePromise, timeoutPromise]);
              console.log('✅ Successfully left existing channel');
            } else {
              console.log('✅ Client not connected, skipping leave');
            }

          } catch (leaveError) {
            console.warn(`⚠️ Error leaving channel (attempt ${cleanupAttempts}):`, leaveError);

            // For first attempt failure, try once more
            if (cleanupAttempts < maxCleanupAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          } finally {
            // Always clear the client reference
            clientRef.current = null;
          }
        }

        // Reset states
        setLocalVideoTrack(null);
        setLocalAudioTrack(null);
        setRemoteUsers([]);
        setClient(null);

        console.log('✅ Force cleanup completed successfully');
        break; // Success, exit loop

      } catch (error) {
        console.error(`❌ Cleanup attempt ${cleanupAttempts} failed:`, error);

        if (cleanupAttempts >= maxCleanupAttempts) {
          console.error('❌ All cleanup attempts failed, forcing reset');
          // Force reset everything
          localVideoTrackRef.current = null;
          localAudioTrackRef.current = null;
          clientRef.current = null;
          setLocalVideoTrack(null);
          setLocalAudioTrack(null);
          setRemoteUsers([]);
          setClient(null);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  };

  // ✅ ADD: Helper function to get other user info
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



  const cleanup = async () => {
    if (cleanupInProgress.current) {
      console.log('🧹 Cleanup already in progress');
      return;
    }

    cleanupInProgress.current = true;
    console.log('🧹 Starting video call cleanup...');

    try {
      // Clear timer
      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
        callDurationTimerRef.current = null;
      }

      // ✅ IMPROVED: Better socket event handling
      if (conversation._id && currentUser._id) {
        try {
          const consistentUid = generateConsistentUID(currentUser._id);

          if (isGroupCall) {
            socket.emit('user-left-video-channel', {
              conversationId: conversation._id,
              userId: currentUser._id,
              agoraUid: consistentUid
            });
          }
        } catch (socketError) {
          console.warn('⚠️ Error emitting leave events:', socketError);
        }
      }

      // Use the force cleanup function
      await forceCleanupWithRetry();

      console.log('✅ Video call cleanup completed');
    } catch (error) {
      console.error('❌ Error during video call cleanup:', error);
    } finally {
      cleanupInProgress.current = false;
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrackRef.current) {
      const newMutedState = !isAudioMuted;
      await localAudioTrackRef.current.setEnabled(!newMutedState);
      setIsAudioMuted(newMutedState);
      console.log('🎤 Audio', newMutedState ? 'muted' : 'unmuted');
    }
  };

  // const toggleVideo = async () => {
  //   if (!localVideoTrackRef.current) {
  //     console.warn('⚠️ No video track available to toggle');
  //     // Try to create video track if it doesn't exist
  //     try {
  //       console.log('📹 Attempting to create video track...');
  //       const videoTrack = await AgoraRTC.createCameraVideoTrack({
  //         encoderConfig: {
  //           width: 640,
  //           height: 480,
  //           frameRate: 15,
  //           bitrateMax: 1000,
  //         }
  //       });

  //       localVideoTrackRef.current = videoTrack;
  //       setLocalVideoTrack(videoTrack);
  //       setIsVideoMuted(false);

  //       // Publish the new video track
  //       if (clientRef.current) {
  //         await clientRef.current.publish([videoTrack]);
  //         console.log('✅ Video track created and published');
  //       }

  //       // Play local video
  //       if (localVideoContainerRef.current) {
  //         videoTrack.play(localVideoContainerRef.current);
  //       }

  //     } catch (error) {
  //       console.error('❌ Failed to create video track:', error);
  //       // Show user-friendly message
  //       alert('Không thể bật camera. Camera có thể đang được sử dụng bởi ứng dụng khác.');
  //     }
  //     return;
  //   }

  //   try {
  //     const newMutedState = !isVideoMuted;
  //     await localVideoTrackRef.current.setEnabled(!newMutedState);
  //     setIsVideoMuted(newMutedState);
  //     console.log('📹 Video', newMutedState ? 'disabled' : 'enabled');
  //   } catch (error) {
  //     console.error('❌ Error toggling video:', error);
  //   }
  // };
  const toggleVideo = async () => {
    if (!isComponentMounted.current) return;

    try {
      if (localVideoTrackRef.current) {
        // Đã có video track - chỉ toggle enable/disable
        const currentEnabled = localVideoTrackRef.current.enabled;
        await localVideoTrackRef.current.setEnabled(!currentEnabled);
        setIsVideoMuted(currentEnabled);
        console.log(`📹 Video ${currentEnabled ? 'disabled' : 'enabled'}`);

        // Đảm bảo video vẫn được play trong container
        if (!currentEnabled && localVideoContainerRef.current) {
          // Khi enable lại, đảm bảo video được play
          setTimeout(async () => {
            if (localVideoTrackRef.current && localVideoContainerRef.current) {
              try {
                await localVideoTrackRef.current.play(localVideoContainerRef.current);
                console.log('✅ Local video re-played after enable');

                const localVideoElement = localVideoContainerRef.current.querySelector('video');
                if (localVideoElement) {
                  localVideoElement.classList.add('stable-video');
                  localVideoElement.style.transition = 'none';
                  localVideoElement.style.objectFit = 'cover';
                  localVideoElement.style.width = '100%';
                  localVideoElement.style.height = '100%';
                }
              } catch (replayError) {
                console.warn('⚠️ Failed to replay local video:', replayError);
              }
            }
          }, 100);
        }

      } else {
        // Chưa có video track - tạo mới
        console.log('📹 Creating new video track...');

        let newVideoTrack;
        try {
          newVideoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: {
              width: { ideal: 640, min: 480, max: 960 },
              height: { ideal: 480, min: 360, max: 720 },
              frameRate: 15,
              bitrateMin: 400,
              bitrateMax: 800,
            },
            facingMode: 'user',
            optimizationMode: 'detail'
          });
        } catch (error) {
          console.warn('⚠️ Failed to create advanced video track, trying basic:', error);
          newVideoTrack = await AgoraRTC.createCameraVideoTrack();
        }

        localVideoTrackRef.current = newVideoTrack;
        setLocalVideoTrack(newVideoTrack);
        setIsVideoMuted(false);

        // Play ngay lập tức khi tạo track mới
        if (localVideoContainerRef.current) {
          try {
            await newVideoTrack.play(localVideoContainerRef.current);
            console.log('✅ New local video track playing');

            const localVideoElement = localVideoContainerRef.current.querySelector('video');
            if (localVideoElement) {
              localVideoElement.classList.add('stable-video');
              localVideoElement.style.transition = 'none';
              localVideoElement.style.objectFit = 'cover';
              localVideoElement.style.width = '100%';
              localVideoElement.style.height = '100%';
            }
          } catch (playError) {
            console.warn('⚠️ Failed to play new local video:', playError);
          }
        }

        // Publish track if client exists
        if (clientRef.current && clientRef.current.connectionState === 'CONNECTED') {
          try {
            await clientRef.current.publish([newVideoTrack]);
            console.log('✅ New video track published');
          } catch (publishError) {
            console.error('❌ Failed to publish new video track:', publishError);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error toggling video:', error);
      message.error('Không thể thay đổi trạng thái camera');
    }
  };


  const handleEndCall = async () => {
    console.log('🔚 Ending video call');
    setCallEnded(true);
    setEndCallMessage('Cuộc gọi đã kết thúc');

    await cleanup();

    if (onEndCall) {
      onEndCall();
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle rejection message
  useEffect(() => {
    if (isRejected && rejectionMessage) {
      setEndCallMessage(rejectionMessage);
      setCallEnded(true);
    }
  }, [isRejected, rejectionMessage]);

  const NetworkMonitor = ({ client }) => {
    const [networkQuality, setNetworkQuality] = useState({ uplink: 0, downlink: 0 });
    const [connectionState, setConnectionState] = useState('DISCONNECTED');

    useEffect(() => {
      if (!client) return;

      const handleNetworkQuality = (stats) => {
        setNetworkQuality({
          uplink: stats.uplinkNetworkQuality,
          downlink: stats.downlinkNetworkQuality
        });
      };

      const handleConnectionStateChange = (curState, revState) => {
        setConnectionState(curState);
        console.log('🌐 Connection state:', revState, '->', curState);
      };

      client.on('network-quality', handleNetworkQuality);
      client.on('connection-state-change', handleConnectionStateChange);

      return () => {
        client.off('network-quality', handleNetworkQuality);
        client.off('connection-state-change', handleConnectionStateChange);
      };
    }, [client]);

    // Only show in development
    if (process.env.NODE_ENV !== 'development') return null;

    const getQualityColor = (quality) => {
      if (quality === 0) return '#666';
      if (quality <= 2) return '#52c41a';
      if (quality <= 4) return '#faad14';
      return '#ff4d4f';
    };

    const getQualityText = (quality) => {
      if (quality === 0) return 'Unknown';
      if (quality <= 2) return 'Excellent';
      if (quality <= 4) return 'Good';
      return 'Poor';
    };

    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
        zIndex: 1000,
        border: '1px solid #333'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          🌐 Network Status
        </div>
        <div style={{
          color: connectionState === 'CONNECTED' ? '#52c41a' : '#faad14',
          marginBottom: '4px'
        }}>
          State: {connectionState}
        </div>
        <div style={{ color: getQualityColor(networkQuality.uplink) }}>
          ↑ Upload: {getQualityText(networkQuality.uplink)} ({networkQuality.uplink})
        </div>
        <div style={{ color: getQualityColor(networkQuality.downlink) }}>
          ↓ Download: {getQualityText(networkQuality.downlink)} ({networkQuality.downlink})
        </div>
      </div>
    );
  };

  const CallDebugInfo = ({ localAudioTrack, localVideoTrack, remoteUsers }) => {
    const [debugInfo, setDebugInfo] = useState({});

    useEffect(() => {
      const updateDebugInfo = () => {
        const info = {
          localAudio: localAudioTrack ? {
            enabled: localAudioTrack.enabled,
            volume: localAudioTrack.getVolumeLevel ? localAudioTrack.getVolumeLevel() : 0,
            readyState: localAudioTrack.getMediaStreamTrack()?.readyState,
            trackExists: true
          } : { trackExists: false },
          localVideo: localVideoTrack ? {
            enabled: localVideoTrack.enabled,
            readyState: localVideoTrack.getMediaStreamTrack()?.readyState,
            trackExists: true
          } : { trackExists: false },
          remoteUsers: remoteUsers.map(user => ({
            uid: user.uid,
            name: user.name || `User ${user.uid}`,
            hasAudio: user.hasAudio,
            hasVideo: user.hasVideo,
            audioVolume: user.audioTrack && user.audioTrack.getVolumeLevel ?
              user.audioTrack.getVolumeLevel() : 0,
            audioTrackExists: !!user.audioTrack,
            videoTrackExists: !!user.videoTrack
          })),
          totalRemoteUsers: remoteUsers.length,
          // Additional stats
          connectionStats: {
            hasLocalTracks: !!(localAudioTrack || localVideoTrack),
            hasRemoteTracks: remoteUsers.some(u => u.audioTrack || u.videoTrack),
            totalTracks: {
              local: [localAudioTrack, localVideoTrack].filter(Boolean).length,
              remote: remoteUsers.reduce((acc, u) =>
                acc + [u.audioTrack, u.videoTrack].filter(Boolean).length, 0)
            }
          }
        };
        setDebugInfo(info);
      };

      // Update immediately
      updateDebugInfo();

      // Update every 2 seconds
      const interval = setInterval(updateDebugInfo, 2000);
      return () => clearInterval(interval);
    }, [localAudioTrack, localVideoTrack, remoteUsers]);

    // Only show in development
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        maxWidth: '280px',
        zIndex: 1000,
        border: '1px solid #333'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1890ff' }}>
          🔍 Video Call Debug Info
        </div>

        <div style={{ marginBottom: '6px' }}>
          <strong>Local Tracks:</strong>
        </div>
        <div style={{ marginLeft: '8px', marginBottom: '6px' }}>
          🎤 Audio: {debugInfo.localAudio?.trackExists ?
            (debugInfo.localAudio?.enabled ? '✅' : '🔇') : '❌'}
          {debugInfo.localAudio?.volume !== undefined &&
            ` (Vol: ${Math.round(debugInfo.localAudio.volume * 100)}%)`}
        </div>
        <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
          📹 Video: {debugInfo.localVideo?.trackExists ?
            (debugInfo.localVideo?.enabled ? '✅' : '🚫') : '❌'}
        </div>

        <div style={{ marginBottom: '6px' }}>
          <strong>Remote Users: {debugInfo.totalRemoteUsers || 0}</strong>
        </div>
        {debugInfo.remoteUsers?.map(user => (
          <div key={user.uid} style={{ marginLeft: '8px', marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>{user.name}:</div>
            <div style={{ marginLeft: '8px' }}>
              🎤 {user.hasAudio ? '✅' : '❌'}
              {user.audioVolume !== undefined && user.hasAudio &&
                ` (${Math.round(user.audioVolume * 100)}%)`}
            </div>
            <div style={{ marginLeft: '8px' }}>
              📹 {user.hasVideo ? '✅' : '❌'}
            </div>
          </div>
        ))}

        {debugInfo.totalRemoteUsers === 0 && (
          <div style={{ marginLeft: '8px', color: '#ffaa00' }}>
            No remote users connected
          </div>
        )}

        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #333' }}>
          <div>📊 Tracks: L{debugInfo.connectionStats?.totalTracks?.local || 0} /
            R{debugInfo.connectionStats?.totalTracks?.remote || 0}</div>
        </div>
      </div>
    );
  };

  const toggleVideoDisplayMode = () => {
    setVideoDisplayMode(prev => prev === 'cover' ? 'contain' : 'cover');

    // Apply to all video elements
    const videoElements = document.querySelectorAll('.remote-video-container video, .local-video-player video');
    videoElements.forEach(video => {
      video.style.objectFit = videoDisplayMode === 'cover' ? 'contain' : 'cover';
    });
  };


  const AudioActivationButton = ({ onActivate }) => {
    const [isActivated, setIsActivated] = useState(false);
    const [needsActivation, setNeedsActivation] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const [isActivating, setIsActivating] = useState(false);

    useEffect(() => {
      const checkAudioContext = async () => {
        if (!hasChecked) setHasChecked(true);

        try {
          if (window.AudioContext || window.webkitAudioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;

            // Use global audio context
            if (!window.globalAudioContext) {
              window.globalAudioContext = new AudioContextClass();
            }

            const audioContext = window.globalAudioContext;
            console.log('🎵 Audio context state:', audioContext.state);

            if (audioContext.state === 'suspended') {
              setNeedsActivation(true);
              setIsActivated(false);
            } else if (audioContext.state === 'running') {
              setNeedsActivation(false);
              setIsActivated(true);
            }
          } else {
            // No audio context available
            setNeedsActivation(false);
            setIsActivated(true);
          }
        } catch (error) {
          console.error('Audio context check failed:', error);
          setNeedsActivation(false);
          setIsActivated(true);
        }
      };

      checkAudioContext();

      // Only check periodically if we have remote users with audio and need activation
      const hasRemoteAudio = remoteUsers.some(user => user.hasAudio);
      if (hasRemoteAudio && !isActivated && !isActivating) {
        const interval = setInterval(checkAudioContext, 5000);
        return () => clearInterval(interval);
      }
    }, [remoteUsers, isActivated, hasChecked, isActivating]);

    const handleActivateAudio = async () => {
      if (isActivating) return;

      setIsActivating(true);

      try {
        console.log('🎵 Activating audio context...');

        // Better audio context activation
        if (window.AudioContext || window.webkitAudioContext) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;

          if (!window.globalAudioContext) {
            window.globalAudioContext = new AudioContextClass();
          }

          const audioContext = window.globalAudioContext;

          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('✅ Audio context activated by user interaction');
          }

          // Wait a moment for context to be ready
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Better remote audio activation
        const audioUsers = remoteUsers.filter(user => user.audioTrack);
        console.log(`🎵 Attempting to activate ${audioUsers.length} remote audio tracks`);

        let successCount = 0;

        for (const user of audioUsers) {
          try {
            await user.audioTrack.play();
            successCount++;
            console.log(`✅ Remote audio activated for user ${user.uid}`);
          } catch (err) {
            console.error(`❌ Failed to activate audio for user ${user.uid}:`, err);
          }
        }

        if (successCount > 0) {
          setIsActivated(true);
          setNeedsActivation(false);

          if (onActivate) onActivate();

          console.log(`✅ Successfully activated ${successCount}/${audioUsers.length} audio tracks`);
        } else {
          console.warn('⚠️ No audio tracks were successfully activated');
        }

      } catch (error) {
        console.error('❌ Failed to activate audio context:', error);
      } finally {
        setIsActivating(false);
      }
    };

    // Better conditions for showing button
    const hasRemoteAudio = remoteUsers.some(user => user.hasAudio);
    const shouldShow = hasChecked && needsActivation && hasRemoteAudio && !isActivated;

    if (!shouldShow) return null;

    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        background: 'rgba(0,0,0,0.9)',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        border: '2px solid #1890ff'
      }}>
        <div style={{ color: 'white', marginBottom: '16px' }}>
          <AudioOutlined style={{ fontSize: '32px', marginBottom: '8px', color: '#1890ff' }} />
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Kích hoạt âm thanh</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            Nhấn để nghe âm thanh từ cuộc gọi
          </div>
        </div>
        <Button
          type="primary"
          size="large"
          onClick={handleActivateAudio}
          icon={<AudioOutlined />}
          style={{ fontWeight: 'bold' }}
          loading={isActivating}
          disabled={isActivating}
        >
          {isActivating ? 'Đang kích hoạt...' : 'Kích hoạt âm thanh'}
        </Button>
      </div>
    );
  };

  const generateConsistentUID = (userId) => {
    if (!userId) return Math.floor(Math.random() * 100000);

    let hash = 0;
    const userIdStr = userId.toString();

    for (let i = 0; i < userIdStr.length; i++) {
      const char = userIdStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Đảm bảo UID unique và trong range hợp lệ
    const consistentUid = Math.abs(hash) % 999999999 + 1;
    console.log(`🎯 Generated consistent UID: ${consistentUid} for user: ${userId}`);
    return consistentUid;
  };


  const RemoteVideoPlayer = React.memo(({ user, isMainView = false, isCompact = false }) => {
    const videoContainerRef = useRef(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Refs để track state without causing re-renders
    const isPlayingRef = useRef(false);
    const playPromiseRef = useRef(null);
    const currentTrackRef = useRef(null);
    const isInitializedRef = useRef(false);
    const playAttemptCountRef = useRef(0);
    const lastPlayTimeRef = useRef(0);
    const maxRetries = 3;

    // Deep stable user object với ref comparison
    const prevUserRef = useRef(user);
    const stableUser = useMemo(() => {
      const currentUser = {
        uid: user.uid,
        hasVideo: user.hasVideo,
        videoTrack: user.videoTrack,
        name: user.name,
        avatar: user.avatar
      };

      // Only update if actually different
      const hasChanged = !prevUserRef.current ||
        prevUserRef.current.uid !== currentUser.uid ||
        prevUserRef.current.hasVideo !== currentUser.hasVideo ||
        prevUserRef.current.videoTrack !== currentUser.videoTrack ||
        prevUserRef.current.name !== currentUser.name ||
        prevUserRef.current.avatar !== currentUser.avatar;

      if (hasChanged) {
        console.log('📋 User data changed for UID:', currentUser.uid);
        prevUserRef.current = currentUser;
        return currentUser;
      }

      // Return previous reference if no changes
      return prevUserRef.current;
    }, [
      user.uid,
      user.hasVideo,
      user.videoTrack,
      user.name,
      user.avatar
    ]);

    // Stable overlay condition
    const shouldShowOverlay = useMemo(() => {
      return !stableUser.hasVideo || !stableUser.videoTrack || !isVideoLoaded;
    }, [stableUser.hasVideo, stableUser.videoTrack, isVideoLoaded]);

    // Video track change detection với debounce
    const trackId = stableUser.videoTrack ?
      (stableUser.videoTrack.trackMediaType + '-' + stableUser.uid) :
      null;

    useEffect(() => {
      // Multiple guards để prevent duplicate calls
      if (!stableUser.videoTrack || !videoContainerRef.current) {
        // Reset flags nếu không có track
        isPlayingRef.current = false;
        playPromiseRef.current = null;
        currentTrackRef.current = null;
        isInitializedRef.current = false;
        setIsVideoLoaded(false);
        setRetryCount(0);
        return;
      }

      // Check if same track already playing
      if (currentTrackRef.current === stableUser.videoTrack && isPlayingRef.current) {
        console.log('🎬 Same track already playing, skipping:', stableUser.uid);
        return;
      }

      // Debounce multiple rapid calls
      const now = Date.now();
      if (now - lastPlayTimeRef.current < 500) {
        console.log('🎬 Debouncing play call for UID:', stableUser.uid);
        return;
      }
      lastPlayTimeRef.current = now;

      // Limit play attempts
      if (playAttemptCountRef.current >= 3) {
        console.warn('🎬 Max play attempts reached for UID:', stableUser.uid);
        return;
      }

      playAttemptCountRef.current++;
      console.log(`🎬 Play attempt ${playAttemptCountRef.current}/3 for UID:`, stableUser.uid);

      // Check if container already has video element playing this track
      const existingVideo = videoContainerRef.current.querySelector('video');
      if (existingVideo && !existingVideo.paused && isPlayingRef.current) {
        console.log('🎬 Video element already playing, skipping play() call');
        setIsVideoLoaded(true);
        currentTrackRef.current = stableUser.videoTrack;
        return;
      }

      const playVideo = async () => {
        try {
          if (!videoContainerRef.current || !stableUser.videoTrack) {
            return;
          }

          // Set flags BEFORE play
          isPlayingRef.current = true;
          currentTrackRef.current = stableUser.videoTrack;
          setIsVideoLoaded(false);

          console.log('🎬 Starting video playback for UID:', stableUser.uid);

          // Store play promise
          playPromiseRef.current = stableUser.videoTrack.play(videoContainerRef.current);
          await playPromiseRef.current;

          console.log('✅ Video play successful for UID:', stableUser.uid);

          // Style video ONLY once with timeout
          setTimeout(() => {
            if (stableUser.videoTrack &&
              videoContainerRef.current &&
              isPlayingRef.current &&
              currentTrackRef.current === stableUser.videoTrack) {

              const videoElement = videoContainerRef.current.querySelector('video');
              if (videoElement && !videoElement.dataset.agoraStyled) {
                videoElement.dataset.agoraStyled = 'true';

                // Single CSS update
                videoElement.style.cssText = `
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                object-position: center 20% !important;
                background: #000 !important;
                display: block !important;
                z-index: 3 !important;
                transition: none !important;
                transform: translateZ(0) !important;
                backface-visibility: hidden !important;
                will-change: auto !important;
              `;

                // Add event listeners ONCE
                const handlePause = (e) => {
                  if (!videoElement.ended && isPlayingRef.current) {
                    console.log('🎬 Preventing auto-pause, resuming video');
                    e.preventDefault();
                    videoElement.play().catch(err => {
                      console.warn('⚠️ Resume failed:', err);
                    });
                  }
                };

                const handlePlay = () => {
                  console.log('🎬 Video play event fired for UID:', stableUser.uid);
                  setIsVideoLoaded(true);
                  isInitializedRef.current = true;
                  playAttemptCountRef.current = 0; // Reset on success
                };

                // Remove old listeners first
                videoElement.removeEventListener('pause', handlePause);
                videoElement.removeEventListener('play', handlePlay);

                // Add new listeners
                videoElement.addEventListener('pause', handlePause, { passive: false });
                videoElement.addEventListener('play', handlePlay);

                setIsVideoLoaded(true);
                setRetryCount(0);
              }
            }
          }, 200);

        } catch (playError) {
          console.error('❌ Failed to play remote video:', playError);

          // Reset flags on error
          isPlayingRef.current = false;
          playPromiseRef.current = null;
          currentTrackRef.current = null;
          setIsVideoLoaded(false);

          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, Math.pow(2, retryCount) * 1000);
          } else {
            console.error('❌ Max retries reached for video playback');
          }
        }
      };

      // Debounce execution
      const timeoutId = setTimeout(playVideo, 100);

      return () => {
        clearTimeout(timeoutId);
      };

    }, [trackId, stableUser.uid, retryCount]); // ✅ STABLE dependencies

    // Cleanup effect
    useEffect(() => {
      return () => {
        // Reset all flags on unmount
        isPlayingRef.current = false;
        playPromiseRef.current = null;
        currentTrackRef.current = null;
        isInitializedRef.current = false;
        playAttemptCountRef.current = 0;
        lastPlayTimeRef.current = 0;

        if (videoContainerRef.current) {
          try {
            const videoElement = videoContainerRef.current.querySelector('video');
            if (videoElement) {
              delete videoElement.dataset.agoraStyled;
              // Clean removal of event listeners
              const newElement = videoElement.cloneNode(true);
              videoElement.parentNode?.replaceChild(newElement, videoElement);
            }
          } catch (error) {
            // Silent cleanup
          }
        }
      };
    }, []);

    const avatarSize = isCompact ? 40 : 80;
    const fontSize = isCompact ? '12px' : '16px';

    return (
      <div
        className={`remote-video-player ${isCompact ? 'compact' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#000',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <div
          ref={videoContainerRef}
          className="video-aspect-content"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '83%',
            background: '#000',
            zIndex: 1
          }}
        />

        {shouldShowOverlay && (
          <div className="no-video-overlay">
            <Avatar
              size={avatarSize}
              src={stableUser.avatar}
              icon={<UserOutlined />}
              style={{
                marginBottom: '16px',
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Text style={{
              color: '#666',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              {stableUser.name}
            </Text>
            {!stableUser.hasVideo && (
              <Text style={{
                color: '#ff9500',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                Camera đã tắt
              </Text>
            )}
          </div>
        )}

        {stableUser.hasVideo && stableUser.videoTrack && isVideoLoaded && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '500',
            zIndex: 4,
            maxWidth: 'calc(100% - 24px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {stableUser.name || `User ${stableUser.uid}`}
          </div>
        )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // ✅ CRITICAL: Deep comparison để prevent unnecessary re-renders
    const prev = prevProps.user;
    const next = nextProps.user;

    const isEqual = prev.uid === next.uid &&
      prev.hasVideo === next.hasVideo &&
      prev.videoTrack === next.videoTrack &&
      prev.name === next.name &&
      prev.avatar === next.avatar &&
      prevProps.isMainView === nextProps.isMainView;

    if (!isEqual) {
      console.log('🔄 RemoteVideoPlayer props changed, re-rendering for UID:', next.uid);
    }

    return isEqual;
  });
  const SpeakerViewLayout = useMemo(() => {
    if (!speakerUser || remoteUsers.length <= 2) return null;

    const otherUsers = remoteUsers.filter(u => u.uid !== speakerUser.uid);
    const maxSidebarUsers = 6; // Show max 6 users in sidebar
    const visibleSidebarUsers = otherUsers.slice(0, maxSidebarUsers);
    const hiddenUsersCount = Math.max(0, otherUsers.length - maxSidebarUsers);

    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        gap: '8px',
        padding: '8px',
        background: '#000',
        borderRadius: '8px'
      }}>
        {/* Main speaker (75% width) */}
        <div style={{
          flex: '0 0 75%',
          height: '100%',
          background: '#333',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <RemoteVideoPlayer
            user={speakerUser}
            isMainView={true}
          />

          {/* Speaker controls overlay */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 5
          }}>
            🎤 {speakerUser.name}
          </div>
        </div>

        {/* Participants sidebar (25% width) */}
        <div style={{
          flex: '0 0 23%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '6px'
        }}>
          {/* Sidebar header */}
          <div style={{
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '4px 8px',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            Participants ({otherUsers.length})
          </div>

          {/* Visible participants */}
          {visibleSidebarUsers.map((user, index) => (
            <div
              key={`sidebar-user-${user.uid}`}
              style={{
                height: '80px',
                background: '#444',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: '2px solid transparent',
                transition: 'border-color 0.2s'
              }}
              onClick={() => setSpeakerUser(user)}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#1890ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'transparent';
              }}
            >
              <RemoteVideoPlayer user={user} isCompact={true} />
            </div>
          ))}

          {/* Hidden users indicator */}
          {hiddenUsersCount > 0 && (
            <div
              style={{
                height: '60px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                border: '1px dashed rgba(255,255,255,0.3)'
              }}
              onClick={() => setShowParticipantsList(true)}
            >
              +{hiddenUsersCount} more
            </div>
          )}

          {/* Back to grid button */}
          <Button
            size="small"
            type="primary"
            ghost
            onClick={() => {
              setViewMode('grid');
              setSpeakerUser(null);
            }}
            style={{
              marginTop: 'auto',
              fontSize: '11px'
            }}
          >
            📱 Grid View
          </Button>
        </div>
      </div>
    );
  }, [speakerUser, remoteUsers, showParticipantsList]);

  const PaginatedGridLayout = useMemo(() => {
    const usersPerPage = 9; // 3x3 grid per page
    const totalPages = Math.ceil(remoteUsers.length / usersPerPage);
    const startIndex = currentPage * usersPerPage;
    const currentPageUsers = remoteUsers.slice(startIndex, startIndex + usersPerPage);

    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#000',
        borderRadius: '8px',
        position: 'relative'
      }}>
        {/* Page header */}
        <div style={{
          height: '40px',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          color: 'white'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
            👥 Page {currentPage + 1} of {totalPages} ({remoteUsers.length} total)
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="small"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            >
              ‹ Prev
            </Button>
            <Button
              size="small"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            >
              Next ›
            </Button>
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => setViewMode('speaker')}
            >
              Speaker View
            </Button>
          </div>
        </div>

        {/* Current page grid */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          padding: '8px',
          alignContent: 'flex-start',
          justifyContent: 'center'
        }}>
          {currentPageUsers.map((user, index) => (
            <div
              key={`page-user-${user.uid}`}
              style={{
                flex: '0 0 31%',
                minHeight: '120px',
                maxHeight: '150px',
                background: '#333',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={() => {
                setSpeakerUser(user);
                setViewMode('speaker');
              }}
            >
              <RemoteVideoPlayer
                user={user}
                isCompact={true}
              />
            </div>
          ))}
        </div>

        {/* Page indicators */}
        <div style={{
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          background: 'rgba(0,0,0,0.5)'
        }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i === currentPage ? '#1890ff' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer'
              }}
              onClick={() => setCurrentPage(i)}
            />
          ))}
        </div>
      </div>
    );
  }, [remoteUsers, currentPage]);

  const RemoteUsersContainer = useMemo(() => {

    const userCount = remoteUsers.length;
    const gridLayout = getGridLayout(userCount);

    // Auto switch to appropriate view mode
    const shouldUseSpeakerView = userCount >= 7 && viewMode !== 'grid';
    const shouldUsePagination = userCount > 12 && viewMode === 'pagination';

    if (shouldUseSpeakerView && !shouldUsePagination) {
      return SpeakerViewLayout;
    }

    if (shouldUsePagination) {
      return PaginatedGridLayout;
    }
    return (
      <div className="remote-video-container" style={{
        height: '100%',
        minHeight: userCount === 1 ? '540px' : '400px',
        background: '#000',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {userCount > 0 ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            gap: userCount <= 4 ? '8px' : '4px',
            padding: userCount <= 4 ? '8px' : '4px',
            alignContent: userCount >= 5 ? 'flex-start' : 'center',
            justifyContent: 'center'
          }}>
            {remoteUsers.map((user, index) => (
              <div
                key={`remote-user-${user.uid}`}
                style={{
                  flex: gridLayout.flex,
                  minHeight: userCount === 1 ? '100%' : gridLayout.minHeight,
                  maxHeight: userCount >= 9 ? '150px' : '200px',
                  background: '#333',
                  borderRadius: userCount >= 9 ? '4px' : '8px',
                  overflow: 'hidden',
                  cursor: userCount >= 7 ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (userCount >= 7) {
                    setSpeakerUser(user);
                    setViewMode('speaker');
                  }
                }}
              >
                <RemoteVideoPlayer
                  key={`remote-player-${user.uid}`}
                  user={user}
                  isMainView={userCount === 1}
                  isCompact={userCount >= 9}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="waiting-container" style={{
            width: '100%',
            height: '100%',
            minHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
            borderRadius: '8px',
            padding: '32px',
            border: '1px solid #e8e8e8'
          }}>
            <Avatar size={100} src={conversation.avatar} icon={<UserOutlined />} />
            <Text style={{ color: '#666', marginTop: '16px', fontSize: '16px' }}>
              Đang chờ {conversation.name} tham gia...
            </Text>
            {!localVideoTrack && (
              <Text style={{ color: '#ff9500', marginTop: '8px', fontSize: '14px' }}>
                Cuộc gọi chỉ có âm thanh
              </Text>
            )}
          </div>
        )}
        {userCount > 6 && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            zIndex: 5
          }}>
            👥 {userCount} người
          </div>
        )}
      </div>
    );
  }, [remoteUsers, viewMode, currentPage, speakerUser]);


  return (
    <div className="agora-video-call">
      <div className="video-call-header">
        <div className="call-info">
          <Avatar src={conversation.avatar} icon={<UserOutlined />} />
          <div>
            <Text strong>{conversation.name}</Text>
            <div>
              <Text type="secondary">
                {remoteUsers.length > 0 ? formatDuration(callDuration) : 'Đang kết nối...'}
              </Text>
              {/* {!localVideoTrack && (
                <div>
                  <Text type="warning" style={{ fontSize: '12px' }}>
                    🎤 Chế độ chỉ âm thanh
                  </Text>
                </div>
              )} */}
            </div>
          </div>
        </div>
      </div>

      <div className="video-container" style={{
        padding: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Row gutter={[8, 8]} style={{ height: '100%', flex: 1 }}>
          <Col span={24} style={{ height: '100%' }}>
            {/* ALWAYS render remote users container */}
            {RemoteUsersContainer}
          </Col>
        </Row>

        {/* ALWAYS show local video when available */}
        {localVideoTrack && (
          <div style={{
            position: 'absolute',
            bottom: '100px',
            right: '20px',
            width: '180px',
            height: '120px',
            zIndex: 10
          }}>
            <div
              ref={localVideoContainerRef}
              className="local-video-player"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                borderRadius: '8px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              {isVideoMuted && (
                <div className="video-muted-overlay">
                  <Avatar size={40} src={currentUser.avatar} icon={<UserOutlined />} />
                  <Text style={{ color: 'white', fontSize: '12px', marginTop: '4px' }}>
                    Camera tắt
                  </Text>
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                fontSize: '12px',
                background: 'rgba(0,0,0,0.5)',
                padding: '2px 8px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                Bạn
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="video-call-controls">
        <Space size="large">
          <Button
            shape="circle"
            size="large"
            icon={isAudioMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
            onClick={toggleAudio}
            className={isAudioMuted ? 'muted-btn' : 'active-btn'}
          />
          <Button
            shape="circle"
            size="large"
            icon={isVideoMuted || !localVideoTrack ? <VideoCameraOutlined /> : <StopOutlined />}
            onClick={toggleVideo}
            className={isVideoMuted || !localVideoTrack ? 'active-btn' : 'muted-btn'}
          />
          {remoteUsers.length >= 4 && (
            <Button
              shape="circle"
              size="large"
              icon={viewMode === 'grid' ? <AppstoreOutlined /> : <BorderOutlined />}
              onClick={() => {
                if (viewMode === 'grid') {
                  if (remoteUsers.length > 12) {
                    setViewMode('pagination');
                    setCurrentPage(0);
                  } else {
                    setViewMode('speaker');
                    setSpeakerUser(remoteUsers[0]);
                  }
                } else {
                  setViewMode('grid');
                  setSpeakerUser(null);
                  setCurrentPage(0);
                }
              }}
              className="active-btn"
              title={`Switch to ${viewMode === 'grid' ? 'speaker' : 'grid'} view`}
            />
          )}
          {remoteUsers.length >= 7 && (
            <Button
              shape="circle"
              size="large"
              icon={<TeamOutlined />}
              onClick={() => setShowParticipantsList(true)}
              className="active-btn"
              title="Show participants list"
            />
          )}
          <Button
            shape="circle"
            size="large"
            danger
            icon={<PhoneOutlined />}
            onClick={handleEndCall}
            className="end-call-btn"
          />
        </Space>
      </div>
    </div>
  );
});

export default AgoraVideoCall;