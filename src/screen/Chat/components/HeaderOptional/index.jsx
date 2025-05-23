import {
    LeftOutlined,
    NumberOutlined, PhoneOutlined,
    RollbackOutlined, SplitCellsOutlined, UsergroupAddOutlined,
    UserOutlined, VideoCameraOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import conversationApi from '../../../../apis/conversationApi';
import { createGroup, fetchListMessages, getLastViewOfMembers, setCurrentChannel, setCurrentConversation } from '../../slices/chatSlice';
import useWindowDimensions from '../../../../hook/useWindowDimensions';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dateUtils from '../../../../utils/dateUtils';
import ConversationAvatar from '../../components/ConservationAvatar';
import ModalAddMemberToConver from '../../../../modals/ModalAddMemberToConver';
import ModalAudioCall from '../../../../modals/ModalAudioCall';
import ModalIncomingCall from '../../../../modals/ModalIncomingCall';
import socket from '../../../../utils/socketClient';
import './style.css';

HeaderOptional.propTypes = {
    avatar: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.array,
    ]),
    totalMembers: PropTypes.number,
    name: PropTypes.string,
    typeConver: PropTypes.bool.isRequired,
    isLogin: PropTypes.bool,
    lastLogin: PropTypes.object,
    avatarColor: PropTypes.string,
    onPopUpInfo: PropTypes.func,
    onOpenDrawer: PropTypes.func,
    onStartCall: PropTypes.func, // Thêm prop onStartCall
    onStartVideoCall: PropTypes.func
};

HeaderOptional.defaultProps = {
    totalMembers: 0,
    name: '',
    isLogin: false,
    lastLogin: null,
    avatarColor: '',
    onPopUpInfo: null,
    onOpenDrawer: null,
    onStartCall: null, // Giá trị mặc định cho onStartCall
    onStartVideoCall: null
};

function HeaderOptional(props) {
    const { avatar, totalMembers, name, typeConver, isLogin, lastLogin, avatarColor, onPopUpInfo, onOpenDrawer, memberInConversation = [], onStartCall, onStartVideoCall } = props;
    const type = typeof avatar;
    const { currentConversation, currentChannel, channels } = useSelector((state) => state.chat);
    const [isVisible, setIsvisible] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [typeModal, setTypeModal] = useState(1);
    const dispatch = useDispatch();
    const { width } = useWindowDimensions();
    const { user } = useSelector((state) => state.global);


    const handleCutText = (text) => {
        if (width < 577) {
            return text.slice(0, 14) + '...';
        }
        return text;
    }



    const handlePopUpInfo = () => {
        if (onPopUpInfo) {
            onPopUpInfo()
        }
    }

    // false đơn, true là nhóm
    const handleAddMemberToGroup = () => {
        setIsvisible(true);
        if (typeConver) {
            setTypeModal(2);
        } else {
            setTypeModal(1);
        }
    };

    const handleOk = async (userIds, name) => {
        if (typeModal === 1) {
            setConfirmLoading(true);
            dispatch(
                createGroup({
                    name,
                    userIds,
                })
            );
            setConfirmLoading(false);
        } else {
            // socket (đối với user đc add): io.emit('added-group', conversationId).
            setConfirmLoading(true);
            await conversationApi.addMembersToConver(
                userIds,
                currentConversation
            );
            setConfirmLoading(false);
        }

        setIsvisible(false);
    };

    const hanleOnCancel = (value) => {
        setIsvisible(value);
    };

    const checkTime = () => {
        if (lastLogin) {
            const time = dateUtils.toTime(lastLogin);
            if (lastLogin.indexOf('ngày') || lastLogin.indexOf('giờ') || lastLogin.indexOf('phút')) {
                return true;
            }
            return false
        }
    }


    const handleViewGeneralChannel = () => {
        dispatch(setCurrentChannel(''));
        dispatch(fetchListMessages({ conversationId: currentConversation, size: 10 }));
        dispatch(getLastViewOfMembers({ conversationId: currentConversation }));

    }

    const handleOpenDraweer = () => {
        if (onOpenDrawer) {
            onOpenDrawer();
        }
    }
    const handleBackToListConver = () => {
        dispatch(setCurrentConversation(''));
    };
    // Chỉ giữ lại hàm handleVoiceCall để khởi tạo cuộc gọi
    const handleVoiceCall = () => {
        if (onStartCall) {
            console.log('Bắt đầu gọi với conversationId:', currentConversation);
            // currentConversation đã là ID, không cần truy cập _id nữa
            onStartCall(currentConversation, name, avatar);
        }
    };

    const handleVideoCall = () => {
        console.log('Click nút gọi video!');
        console.log('onStartVideoCall:', onStartVideoCall);
        console.log('currentConversation:', currentConversation);

        if (onStartVideoCall) {
            console.log('Bắt đầu gọi video với conversationId:', currentConversation);
            onStartVideoCall(currentConversation, name, avatar);
        } else {
            console.log('onStartVideoCall không được truyền xuống đúng!');
        }
    };

    return (
        <div id='header-optional'>
            <div className='header_wrapper'>
                <div className='header_leftside'>
                    <div className='icon-header back-list' onClick={handleBackToListConver}>
                        <LeftOutlined />
                    </div>
                    <div className='icon_user'>
                        {
                            <ConversationAvatar
                                avatar={avatar}
                                totalMembers={totalMembers}
                                type={typeConver}
                                name={name}
                                isActived={isLogin}
                                avatarColor={avatarColor}
                            />
                        }
                    </div>

                    <div className='info_user'>
                        <div className='info_user-name'>
                            <span>{handleCutText(name)}</span>
                        </div>

                        {currentChannel ? (
                            <div className='channel_info'>
                                <div className="channel-icon">
                                    <NumberOutlined />
                                </div>

                                <div className="channel-name">
                                    {channels.find(ele => ele._id === currentChannel).name}
                                </div>

                            </div>
                        ) : (
                            <div className='lastime-access'>
                                {typeConver ? (
                                    <div className='member-hover'>
                                        <UserOutlined />
                                        &nbsp;{totalMembers}
                                        <span>&nbsp;Thành viên</span>
                                    </div>
                                ) : (
                                    <>
                                        {
                                            isLogin ? (
                                                <span>Đang hoạt động</span>
                                            ) : (
                                                <>
                                                    {lastLogin && (
                                                        <span>
                                                            {`Truy cập ${dateUtils.toTime(lastLogin).toLowerCase()}`} {`${checkTime() ? 'trước' : ''}`}
                                                        </span>

                                                    )}
                                                </>
                                            )
                                        }
                                    </>
                                )}


                            </div>
                        )}
                    </div>
                </div>

                <div className='header_rightside'>
                    {currentChannel ? (
                        <div
                            title='Trở lại kênh chính'
                            className='icon-header back-channel'
                            onClick={handleViewGeneralChannel}
                        >
                            <RollbackOutlined />
                        </div>
                    ) : (<>
                        <div
                            className='icon-header create-group'
                            onClick={handleAddMemberToGroup}>
                            <UsergroupAddOutlined />
                        </div>
                        <div
                            className='icon-header voice-call'
                            title='Gọi thoại'
                            onClick={handleVoiceCall} // Thêm sự kiện click
                        >
                            <PhoneOutlined />
                        </div>
                        <div
                            className='icon-header video-call'
                            title='Gọi video'
                            onClick={handleVideoCall}
                        >
                            <VideoCameraOutlined />
                        </div>
                    </>
                    )}

                    <div className='icon-header pop-up-layout'>
                        <SplitCellsOutlined onClick={handlePopUpInfo} />
                    </div>

                    <div className='icon-header pop-up-responsive'>
                        <SplitCellsOutlined onClick={handleOpenDraweer} />
                    </div>


                </div>            </div>

            <ModalAddMemberToConver
                isVisible={isVisible}
                onCancel={hanleOnCancel}
                onOk={handleOk}
                loading={confirmLoading}
                typeModal={typeModal}
            />

            {/* Chỉ sử dụng modals ở đây để debug hoặc khi chuyển đổi sang ChatLayout */}
            {/* Modal đã được chuyển sang ChatLayout để quản lý tập trung */}
        </div>
    );
}

export default HeaderOptional;