import React from 'react';
import { Modal } from 'antd';
import PropTypes from 'prop-types';
import AgoraVideoCall from '../../components/AgoraVideoCall';
import './style.css';
import { generateChannelId } from '../../utils/agoraConfig';

ModalVideoCall.propTypes = {
  isVisible: PropTypes.bool,
  onCancel: PropTypes.func,
  conversation: PropTypes.object,
  currentUser: PropTypes.object,
};

ModalVideoCall.defaultProps = {
  isVisible: false,
  onCancel: null,
  conversation: {},
  currentUser: {},
};

function ModalVideoCall(props) {
  const { isVisible, onCancel, conversation, currentUser } = props;
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  // Sử dụng conversationId làm tên kênh
  const channelName = generateChannelId(conversation._id);
  
  return (
    <Modal
      title={`Cuộc gọi video với ${conversation.name}`}
      visible={isVisible}
      onCancel={handleCancel}
      footer={null}
      width="80%"
      centered
      destroyOnClose
      maskClosable={false}
      keyboard={false}
      className="video-call-modal"
    >
      <AgoraVideoCall
        channelName={channelName}
        uid={currentUser._id}
        isVideo={true}
        onEndCall={handleCancel}
      />
    </Modal>
  );
}

export default ModalVideoCall;