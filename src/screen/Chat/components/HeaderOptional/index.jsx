import {
    LeftOutlined,
    NumberOutlined, PhoneOutlined,
    RollbackOutlined, SplitCellsOutlined, UsergroupAddOutlined,
    UserOutlined, VideoCameraOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import conversationApi from '../../../../apis/conversationApi';
import { createGroup, fetchListMessages, getLastViewOfMembers, setCurrentChannel, setCurrentConversation } from '../../slices/chatSlice';
import useWindowDimensions from '../../../../hook/useWindowDimensions';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dateUtils from '../../../../utils/dateUtils';
import ConversationAvatar from '../../components/ConservationAvatar';
import ModalAddMemberToConver from '../../../../modals/ModalAddMemberToConver';
import socket from '../../../../utils/socketClient';
import userApi from '../../../../apis/userApi';
import './style.css';
import UserCard from '../UserCard';

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
    onStartVideoCall: PropTypes.func,
    isFriend: PropTypes.bool,
    userId: PropTypes.string,
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
    onStartVideoCall: null,
    isFriend: false,
    userId: null,
};

function HeaderOptional(props) {
    const { avatar, totalMembers, name, typeConver, isLogin, lastLogin, avatarColor, onPopUpInfo, onOpenDrawer, memberInConversation = [], onStartCall, onStartVideoCall, isFriend, userId } = props;
    const type = typeof avatar;
    const { currentConversation, currentChannel, channels } = useSelector((state) => state.chat);
    const [isVisible, setIsvisible] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [typeModal, setTypeModal] = useState(1);
    const dispatch = useDispatch();
    const { width } = useWindowDimensions();
    const { user } = useSelector((state) => state.global);
    const [visibleModalUserCard, setVisibleModalUserCard] = useState(false);
    const [userIsFind, setUserIsFind] = useState({});


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

    const handleShowUserInfo = async (value) => {
        try {
            const user = await userApi.fetchUserById(value);
            console.log('user', user);
            setUserIsFind(user);
            setVisibleModalUserCard(true);
        } catch (err) {
            message.error('Không tìm thấy người dùng');
        }
    }
    const handleCloseModalUserCard = () => {
        setVisibleModalUserCard(false);
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
    const handleVoiceCall = () => {
        console.log('🔊 Voice call button clicked');
        if (onStartCall) {
            onStartCall(currentConversation, name, avatar);
        }
    };

    const handleVideoCall = () => {
        console.log('📹 Video call button clicked');
        if (onStartVideoCall) {
            onStartVideoCall(currentConversation, name, avatar);
        }
    };

    return (
        <div id='header-optional'>
            <div className='header_wrapper'>
                <div className='header_leftside'>
                    <div className='icon-header back-list' onClick={handleBackToListConver}>
                        <LeftOutlined />
                    </div>
                    <div
                        className={`icon_user ${!typeConver ? 'clickable-avatar' : ''}`}
                        onClick={() => !typeConver && userId && handleShowUserInfo(userId)}
                        title={!typeConver ? 'Xem thông tin người dùng' : ''}>
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
                            {!typeConver && (
                                <div className='relationship-status-container'>
                                    <span className={`relationship-status ${isFriend ? 'friend' : 'stranger'}`}>
                                        {isFriend ? 'Bạn bè' : 'Người lạ'}
                                    </span>
                                </div>
                            )}
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
                            onClick={handleVoiceCall}
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
            <UserCard
                user={userIsFind}
                isVisible={visibleModalUserCard}
                onCancel={handleCloseModalUserCard}
            />
        </div>
    );
}

export default HeaderOptional;