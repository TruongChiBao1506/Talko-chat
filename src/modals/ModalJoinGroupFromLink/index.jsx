import { Col, Divider, message, Modal, Row } from 'antd';
import conversationApi from '../../apis/conversationApi';
import ConversationAvatar from '../../screen/Chat/components/ConservationAvatar';
import PersonalIcon from '../../screen/Chat/components/PersonalIcon';
import PropTypes from 'prop-types';
import React from 'react';
import MODAL_JOIN_FROM_LINK_STYLE from './ModalJoinGroupFromLinkStyle';
import './style.css';

ModalJoinGroupFromLink.propTypes = {
    isVisible: PropTypes.bool.isRequired,
    info: PropTypes.object,
};

ModalJoinGroupFromLink.defaultProps = {
    info: {}
}

function ModalJoinGroupFromLink({ isVisible, info, onCancel }) {
    console.log('info', info);


    const { _id, name, users } = info;

    const handleCancel = () => {
        if (onCancel) {
            onCancel()
        }
    }
    const tempAvatar = users.map(ele => ({
        avatar: ele.avatar,
        avatarColor: ele.avatarColor
    }))


    const handleOk = async () => {

        try {
            await conversationApi.joinGroupFromLink(_id);
            handleCancel();
            message.success('Tham gia nhóm thành công');
            window.location.reload();
        } catch (error) {
            console.log(error);

        }
    }





    return (
        <Modal
            title="Thông tin nhóm"
            open={isVisible}
            onOk={handleOk}
            onCancel={handleCancel}
            okText='Tham gia'
            cancelText='Hủy'
            bodyStyle={MODAL_JOIN_FROM_LINK_STYLE.BODY_MODAL}
            width={MODAL_JOIN_FROM_LINK_STYLE.WIDTH}
            style={MODAL_JOIN_FROM_LINK_STYLE.STYLE}
        >
            <div className="modal-join-link">
                <div className="modal-join-link_info">
                    <div className="modal-join-link_avatar">
                        <ConversationAvatar
                            totalMembers={users.length}
                            avatar={tempAvatar}
                            type={true}
                            isGroupCard={true}
                        />
                    </div>

                    <div className="modal-join-link_name">
                        {name}
                    </div>

                    <div className="modal-join-link_members">
                        {`${users.length} thành viên`}
                    </div>

                </div>
                <Divider />

                <div className="modal-join-link_list-member">

                    <Row gutter={[8, 8]}>
                        {users.map((ele, index) => (
                            <Col span={8} key={index} >
                                <div className="member-item">
                                    <div className="member-item_avatar">
                                        <PersonalIcon
                                            avatar={ele.avatar}
                                            name={ele.name}
                                            color={ele.avatarColor}

                                        />
                                    </div>
                                    <div className="member-item_name">
                                        {`${ele.name}`}
                                    </div>
                                </div>
                            </Col>
                        ))}

                    </Row>

                </div>
            </div>
        </Modal>
    );
}

export default ModalJoinGroupFromLink;