import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Modal } from 'antd';
import PropTypes from 'prop-types';
import AgoraAudioCall from '../../components/AgoraAudioCall';
import './style.css';
import { generateChannelId } from '../../utils/agoraConfig';

const ModalVoiceCall = forwardRef((props, ref) => {
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
  const modalTitle = isGroupCall
    ? `Cuộc gọi nhóm: ${conversation.name}`
    : `Cuộc gọi thoại với ${conversation.name}`;

  useImperativeHandle(ref, () => ({
    cleanup: async () => {
      console.log('🧹 ModalVoiceCall cleanup called from parent');
      if (agoraCallRef.current && agoraCallRef.current.cleanup) {
        await agoraCallRef.current.cleanup();
      }
    }
  }));

  // IMPROVED: Track visibility changes
  useEffect(() => {
    console.log(`📱 Modal visibility changed: ${prevVisibleRef.current} -> ${isVisible}`);

    if (prevVisibleRef.current && !isVisible) {
      // Modal đang chuyển từ visible sang invisible
      console.log('🔄 Modal closing - performing cleanup');
      setTimeout(async () => {
        if (agoraCallRef.current && agoraCallRef.current.cleanup) {
          await agoraCallRef.current.cleanup();
        }
      }, 100);
    }

    prevVisibleRef.current = isVisible;
  }, [isVisible]);

  const handleCancel = async () => {
    console.log('🚪 Modal handleCancel called');

    // Force cleanup trước khi đóng modal
    if (agoraCallRef.current && agoraCallRef.current.cleanup) {
      console.log('🧹 Calling cleanup before modal close');
      await agoraCallRef.current.cleanup();
    }

    // KHÔNG tạo stream mới trong cleanup
    if (onCancel && isComponentMounted.current) {
      onCancel();
    }
  };

  const handleCallStatusChange = (statusInfo) => {
    console.log('📞 Call status changed:', statusInfo);

    setCallStatus({
      isEnded: statusInfo.isEnded || false,
      isRejected: statusInfo.isRejected || false,
      message: statusInfo.message || '',
      duration: statusInfo.duration || 0
    });

    // QUAN TRỌNG: Cleanup ngay khi có trạng thái kết thúc
    if (statusInfo.isEnded || statusInfo.isRejected) {
      console.log('🔚 Call ended/rejected - performing immediate cleanup');

      setTimeout(async () => {
        if (agoraCallRef.current && agoraCallRef.current.cleanup && isComponentMounted.current) {
          await agoraCallRef.current.cleanup();
        }

        // Auto close modal sau khi cleanup
        setTimeout(() => {
          if (isComponentMounted.current && onCancel) {
            onCancel();
          }
        }, 2000);
      }, 100);
    }
  };

  // Cleanup khi component unmount
  useEffect(() => {
    isComponentMounted.current = true;

    return () => {
      console.log('🔄 ModalVoiceCall unmounting');
      isComponentMounted.current = false;

      // Final cleanup on unmount
      if (agoraCallRef.current && agoraCallRef.current.cleanup) {
        agoraCallRef.current.cleanup();
      }
    };
  }, []);

  // CRITICAL: Handle rejection from other user
  useEffect(() => {
    if (isRejected && !callStatus.isRejected && isComponentMounted.current) {
      console.log('❌ Call REJECTED by other user - immediate cleanup');

      // Update status immediately
      setCallStatus({
        isEnded: false,
        isRejected: true,
        message: rejectionMessage || 'Cuộc gọi đã bị từ chối',
        duration: 0
      });

      // CRITICAL: Force cleanup immediately when rejected
      setTimeout(async () => {
        if (agoraCallRef.current && agoraCallRef.current.cleanup && isComponentMounted.current) {
          console.log('🧹 FORCE cleanup on rejection');
          await agoraCallRef.current.cleanup();
        }

        // Auto close modal
        setTimeout(() => {
          if (isComponentMounted.current && onCancel) {
            console.log('🚪 Auto closing modal after rejection');
            onCancel();
          }
        }, 2000);
      }, 100);
    }
  }, [isRejected, rejectionMessage, callStatus.isRejected]);


  // Effect để clear timeout khi có remote users
  // useEffect(() => {
  //   if (agoraCallRef.current && agoraCallRef.current.getRemoteUsers) {
  //     const checkRemoteUsers = () => {
  //       const remoteUsers = agoraCallRef.current.getRemoteUsers();
  //       if (remoteUsers && remoteUsers.length > 0) {
  //         console.log('✅ Có remote users - clearing call timeout');
  //         // Call parent's clearCallTimeout through props
  //         if (props.onUserJoined) {
  //           props.onUserJoined();
  //         }
  //       }
  //     };

  //     // Check every 2 seconds
  //     const interval = setInterval(checkRemoteUsers, 2000);

  //     return () => {
  //       clearInterval(interval);
  //     };
  //   }
  // }, [agoraCallRef.current, props.onUserJoined]);

  // useEffect(() => {
  //   if (!agoraCallRef.current) return;

  //   const checkForConnection = () => {
  //     if (agoraCallRef.current) {
  //       const remoteUsers = agoraCallRef.current.getRemoteUsers();

  //       console.log('🔍 ModalVoiceCall checking connection:', {
  //         remoteUsers: remoteUsers?.length || 0,
  //         isGroupCall
  //       });

  //       // Clear timeout nếu có remote users
  //       if (remoteUsers && remoteUsers.length > 0) {
  //         console.log('✅ Modal detected remote users - calling onUserJoined');
  //         if (props.onUserJoined) {
  //           props.onUserJoined();
  //         }
  //         return true;
  //       }
  //     }
  //     return false;
  //   };

  //   // Check ngay lập tức
  //   if (checkForConnection()) {
  //     return;
  //   }

  //   // Tiếp tục check định kỳ với tần suất cao hơn
  //   const interval = setInterval(() => {
  //     if (checkForConnection()) {
  //       clearInterval(interval);
  //     }
  //   }, 1000); // Check mỗi 1 giây

  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, [props.onUserJoined, isVisible]);

  // useEffect(() => {
  //   if (!agoraCallRef.current) return;

  //   const checkForConnection = () => {
  //     if (agoraCallRef.current) {
  //       const remoteUsers = agoraCallRef.current.getRemoteUsers();
  //       const groupParticipants = agoraCallRef.current.getGroupParticipants();
  //       const totalParticipants = agoraCallRef.current.getTotalParticipants();

  //       console.log('🔍 Checking call connection:', {
  //         remoteUsers: remoteUsers?.length || 0,
  //         groupParticipants: groupParticipants?.length || 0,
  //         totalParticipants: totalParticipants || 0,
  //         isGroupCall
  //       });

  //       // Clear timeout nếu có bất kỳ connection nào
  //       const hasConnection = (remoteUsers && remoteUsers.length > 0) ||
  //         (groupParticipants && groupParticipants.length > 1) ||
  //         (totalParticipants && totalParticipants > 1);

  //       if (hasConnection) {
  //         console.log('✅ Call connected - calling onUserJoined');
  //         if (props.onUserJoined) {
  //           props.onUserJoined();
  //         }
  //         return true;
  //       }
  //     }
  //     return false;
  //   };

  //   // Check ngay lập tức
  //   if (checkForConnection()) {
  //     return;
  //   }

  //   // Tiếp tục check định kỳ với tần suất cao hơn
  //   const interval = setInterval(() => {
  //     if (checkForConnection()) {
  //       clearInterval(interval);
  //     }
  //   }, 500); // Check mỗi 0.5 giây thay vì 2 giây

  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, [props.onUserJoined, isVisible, isGroupCall]);


  const channelName = generateChannelId(conversation._id);

  const CallStatusOverlay = () => {
    if (!callStatus.isEnded && !callStatus.isRejected && !isRejected) return null;

    const formatCallDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    return (
      <div className="call-ended-overlay">
        <div className="call-ended-content">
          <div className="call-ended-icon">
            {callStatus.isRejected || isRejected ? '❌' : '📞'}
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

  // return (
  //   <Modal
  //     title={`Cuộc gọi thoại với ${conversation.name}`}
  //     visible={isVisible}
  //     onCancel={handleCancel}
  //     footer={null}
  //     width="500px"
  //     centered
  //     destroyOnClose={true}
  //     maskClosable={false}
  //     keyboard={false}
  //     className="voice-call-modal"
  //     afterClose={async () => {
  //       console.log('📴 Modal completely closed - final audio cleanup');
  //       if (agoraCallRef.current && agoraCallRef.current.cleanup) {
  //         await agoraCallRef.current.cleanup();
  //       }
  //       // Reset states
  //       setCallStatus({
  //         isEnded: false,
  //         isRejected: false,
  //         message: '',
  //         duration: 0
  //       });
  //     }}
  //   >
  //     <div className="voice-call-container">
  //       <CallStatusOverlay />
  //       <AgoraAudioCall
  //         ref={agoraCallRef}
  //         channelName={channelName}
  //         uid={currentUser._id}
  //         onEndCall={handleCancel}
  //         onCallEnded={handleCallStatusChange}
  //         currentUser={currentUser}
  //         conversation={conversation}
  //         isRejected={isRejected}
  //         rejectionMessage={rejectionMessage}
  //       />
  //     </div>
  //   </Modal>
  // );
  return (
    <Modal
      title={modalTitle}
      visible={isVisible}
      onCancel={handleCancel}
      footer={null}
      width={isGroupCall ? "700px" : "500px"} // Wider for group calls
      centered
      destroyOnClose={true}
      maskClosable={false}
      keyboard={false}
      className={`voice-call-modal ${isGroupCall ? 'group-call-modal' : ''}`}
      afterClose={async () => {
        console.log('📴 Modal completely closed - final audio cleanup');
        if (agoraCallRef.current && agoraCallRef.current.cleanup) {
          await agoraCallRef.current.cleanup();
        }
        setCallStatus({
          isEnded: false,
          isRejected: false,
          message: '',
          duration: 0
        });
      }}
    >
      <div className="voice-call-container">
        <CallStatusOverlay />
        <AgoraAudioCall
          ref={agoraCallRef}
          channelName={channelName}
          uid={currentUser._id}
          onEndCall={handleCancel}
          onCallEnded={handleCallStatusChange}
          currentUser={currentUser}
          conversation={conversation}
          isRejected={isRejected}
          rejectionMessage={rejectionMessage}
        />
      </div>
    </Modal>
  );
});

ModalVoiceCall.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  conversation: PropTypes.object.isRequired,
  currentUser: PropTypes.object.isRequired,
  isRejected: PropTypes.bool,
  rejectionMessage: PropTypes.string,
};

export default ModalVoiceCall;