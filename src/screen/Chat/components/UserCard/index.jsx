import { ExclamationCircleOutlined, UserDeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { Button, Image, message, Modal, Avatar, Tooltip } from 'antd';
import DEFAULT_AVATAR from '../../../../assets/images/user.png';
import PropTypes from 'prop-types';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import conversationApi from '../../../../apis/conversationApi';
import friendApi from '../../../../apis/friendApi';
import {
    fetchChannels,
    fetchListFriends,
    fetchListMessages, getLastViewOfMembers, setConversations, setCurrentConversation
} from '../../../../screen/Chat/slices/chatSlice';
import {
    fetchFriends,
    fetchListMyRequestFriend,
    fetchListRequestFriend,
    fetchPhoneBook,
    setAmountNotify
} from '../../../../screen/Friend/friendSlice';
import dateUtils from '../../../../utils/dateUtils';
import getSummaryName from '../../../../utils/nameHelper';
import './style.css';
import UserCardStyle from './UserCardStyle';
import { useNavigate } from "react-router-dom";
UserCard.propTypes = {
    title: PropTypes.string,
    user: PropTypes.object.isRequired,
    isVisible: PropTypes.bool.isRequired,
    onCancel: PropTypes.func,

};

UserCard.defaultProps = {
    title: 'Thông tin',
    onCancel: null,
};


function UserCard(props) {
    const {
        title,
        isVisible,
        user,
        onCancel,
    } = props;

    const coverImage = 'https://t4.ftcdn.net/jpg/06/10/64/15/360_F_610641571_EObx7EeHbIbCjBnrbVAxJfTyfT3uelZI.jpg';
    const { status, numberCommonGroup } = user;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { amountNotify } = useSelector((state) => state.friend)
    const { conversations } = useSelector((state) => state.chat)

    const handleOnCancle = () => {
        if (onCancel) {
            onCancel();
        }
    }

    const handleClickMessage = async () => {
        try {
            const response = await conversationApi.createConversationIndividual(user._id);
            const { _id, isExists } = response;
            console.log('response', response);

            if (!isExists) {
                const conver = await conversationApi.getConversationById(_id);
                dispatch(setConversations(conver));
            }

            const tempConver = conversations.find(ele => ele._id === _id);

            if (tempConver?.type) {
                dispatch(fetchChannels({ conversationId: _id }));
            }

            dispatch(getLastViewOfMembers({ conversationId: _id }));
            dispatch(fetchListMessages({ conversationId: _id, size: 10 }));
            dispatch(setCurrentConversation(_id));

            navigate('/chat');

            handleOnCancle();
        } catch (error) {
            console.error("Error in handleClickMessage:", error);
        }
    };


    const handleDeleteFriend = () => {
        confirm();
    }

    const handleAddFriend = async () => {
        console.log('add friend', user._id)

        try {
            await friendApi.sendRequestFriend(user._id);
            dispatch(fetchListMyRequestFriend());
            dispatch(fetchPhoneBook());
            handleOnCancle();
            message.success('Gửi lời mời kết bạn thành công');
        } catch (error) {
            message.error('Gửi lời mời kết bạn thất bại');
        }
    }

    const handleOnAcceptFriend = async () => {
        await friendApi.acceptRequestFriend(user._id);
        dispatch(fetchListRequestFriend());
        dispatch(fetchFriends({ name: '' }));
        dispatch(fetchListFriends({ name: '' }));
        dispatch(setAmountNotify(amountNotify - 1))
        handleOnCancle()
        message.success('Thêm bạn thành công');
    }

    const handleCancelRequest = async () => {
        await friendApi.deleteSentRequestFriend(user._id);
        dispatch(fetchListMyRequestFriend());
        dispatch(fetchPhoneBook());
        handleOnCancle();
    }


    function confirm() {
        Modal.confirm({
            title: 'Xác nhận',
            icon: <ExclamationCircleOutlined />,
            content: <span>Bạn có thực sự muốn xóa <strong>{user.name}</strong> khỏi danh sách bạn bè </span>,
            okText: 'Xóa',
            cancelText: 'Hủy',
            onOk: handleOkModal,

        });
    }

    const handleOkModal = async () => {
        try {
            await friendApi.deleteFriend(user._id);
            dispatch(fetchFriends({ name: '' }))
            message.success('Xóa thành công');
            handleOnCancle();
            dispatch(fetchPhoneBook());
        } catch (error) {
            message.error('Xóa thất bại');
        }
    }
    const handleCopy = () => {
        // Copy text from the div
        navigator.clipboard.writeText(user.username)
            .then(() => {
                message.success('Đã sao chép!');
            })
            .catch((err) => {
                console.error('Error copying text: ', err);
                message.error('Sao chép thất bại!');
            });
    };

    return (
        <Modal
            title={title}
            open={isVisible}
            onCancel={handleOnCancle}
            footer={null}
            width={360}
            style={UserCardStyle.styleModal}

        >
            <div id="user-card">
                <div className="user-card_wrapper">
                    <div className="user-card_cover-image">
                        <Image
                            src={user?.coverImage ? user?.coverImage : coverImage}
                            preview={false}
                            style={UserCardStyle.CoverImageStyle}
                        />

                        <div className="user-card_avatar">
                            {user.avatar ? (
                                <Image
                                    fallback={DEFAULT_AVATAR}
                                    src={user.avatar}
                                    style={UserCardStyle.avatarStyle}
                                />
                            ) : (
                                <Avatar
                                    size={96}
                                    style={{ backgroundColor: user.avatarColor }}
                                >
                                    <span style={{ fontSize: '3rem' }}>
                                        {getSummaryName(user.name)}
                                    </span>
                                </Avatar>

                            )}
                        </div>
                    </div>

                    <div className="user-card-name">
                        {user.name}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        {user.username}
                        <Tooltip title="Sao chép nội dung">
                            <Button
                                icon={<CopyOutlined />}
                                onClick={handleCopy}
                                type="primary"
                                shape="default"
                                size="small"
                                style={{ marginLeft: '5px' }}
                            />
                        </Tooltip>
                    </div>

                    <div className="user-card-button">
                        {

                            (status === 'NOT_FRIEND') &&
                            (
                                <div className="user-card-button--addFriend" >
                                    <Button
                                        onClick={handleAddFriend}
                                        type="primary"
                                        style={{ width: '124px' }}
                                    >
                                        Kết bạn
                                    </Button>
                                </div>
                            )
                        }


                        {(status === 'FOLLOWER') &&
                            <>
                                <div className="user-card-button--message confirm--friend" >
                                    <Button
                                        type="primary"
                                        style={{ maxWidth: '110px' }}
                                        onClick={handleOnAcceptFriend}
                                    >
                                        Đồng ý
                                    </Button>
                                </div>

                                <div className="user-card-button--message  confirm-deny--friend" >
                                    <Button
                                        type="danger"
                                        style={{ maxWidth: '110px' }}
                                        onClick={handleOnAcceptFriend}
                                    >
                                        Từ chối
                                    </Button>
                                </div>
                            </>
                        }



                        {(status === 'YOU_FOLLOW') &&
                            <>
                                <div className="user-card-button--message ">
                                    <Button
                                        type="danger"
                                        style={{ width: '124px' }}
                                        onClick={handleCancelRequest}
                                    >
                                        Hủy yêu cầu
                                    </Button>
                                </div>
                            </>
                        }




                        <div className={`user-card-button--message ${(status === 'FRIEND') ? 'user-card-button--no-margin' : ''}`}>
                            <Button
                                onClick={handleClickMessage}
                                type="default"
                                style={(status === 'FOLLOWER') ? UserCardStyle.buttonStyle_2 : UserCardStyle.buttonStyle_1}
                            >Nhắn tin
                            </Button>
                        </div>

                    </div>

                    <div className="user-card-infomation">

                        <div className="user-card-infomation__gender user-card-infomation--flex">
                            <div className="user-card-infomation__label">
                                Giới tính
                            </div>

                            <div className="user-card-infomation__text">
                                {user.gender ? 'Nam' : 'Nữ'}
                            </div>
                        </div>


                        <div className="user-card-infomation__birthday user-card-infomation--flex">
                            <div className="user-card-infomation__label">
                                Ngày sinh
                            </div>

                            <div className="user-card-infomation__text">

                                {dateUtils.transferDateString(user.dateOfBirth?.day, user.dateOfBirth?.month, user.dateOfBirth?.year)}
                            </div>
                        </div>

                        <div className="user-card-infomation__group user-card-infomation--flex">
                            <div className="user-card-infomation__label">
                                Nhóm chung
                            </div>

                            <div className="user-card-infomation__text">
                                {`${numberCommonGroup} nhóm`}
                            </div>
                        </div>


                        <div className="user-card-infomation__birthday user-card-infomation--flex">
                            <div className="user-card-infomation__label">
                                Bạn chung
                            </div>

                            <div className="user-card-infomation__text">
                                {user.numberCommonFriend}
                            </div>
                        </div>
                    </div>


                    <div className={`user-card-button-optional ${!(status === 'FRIEND') ? 'user-card-button-optional--hidden' : ''}`}>
                        <Button
                            danger
                            icon={<UserDeleteOutlined />}
                            style={UserCardStyle.buttonFullSize}
                            size='large'
                            onClick={handleDeleteFriend}
                        >
                            Hủy kết bạn
                        </Button>
                    </div>

                </div>
            </div>

        </Modal>

    );
}

export default UserCard;