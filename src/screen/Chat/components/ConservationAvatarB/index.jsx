import { UserOutlined } from '@ant-design/icons';
import { Avatar, Badge, Tooltip } from 'antd';
import DEFAULT_AVATAR from '../../../../assets/images/user.png';
import AvatarCustom from 'components/AvatarCustom';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import COVERSATION_STYLE from './ConversationAvatarStyle';
import './style.scss';

const ConversationAvatar = ({
    avatar,
    demension = 28,
    isGroupCard = false,
    totalMembers,
    type,
    name,
    isActived = false,
    sizeAvatar = 48,
    frameSize = 48,
    avatarColor = '',
}) => {
    // Hàm tạo style cho avatar
    const getAvatarStyle = (index) => ({
        ...(totalMembers === 3 && index === 2 ? COVERSATION_STYLE.styleGroup3(demension) : {}),
        backgroundColor: avatar[index]?.avatarColor || '',
    });

    // Tạo danh sách avatar nhóm
    const avatars = useMemo(() => {
        return Array.from({ length: Math.min(totalMembers, 3) }, (_, index) => (
            <Avatar
                key={index}
                style={getAvatarStyle(index)}
                size={demension}
                src={avatar[index]?.avatar || DEFAULT_AVATAR}
                icon={!avatar[index]?.avatar && <UserOutlined />}
            />
        ));
    }, [totalMembers, avatar, demension]);

    // Tạo avatar nhóm lớn (>3 thành viên)
    const groupAvatars = useMemo(() => (
        <>
            {avatars.map((avt, index) => (
                <div className="per-user" key={index}>{avt}</div>
            ))}
            <div className="per-user">
                <Tooltip placement="top">
                    <Avatar style={{ backgroundColor: '#7562d8', color: '#fff' }} size={demension}>
                        {totalMembers - 3}
                    </Avatar>
                </Tooltip>
            </div>
        </>
    ), [avatars, totalMembers, demension]);

    return (
        <div className="avatar_conversation">
            {typeof avatar === 'string' ? (
                <Badge dot={isActived} offset={[-5, 40]} color="green">
                    <AvatarCustom size={sizeAvatar} src={avatar} color={avatarColor} name={name} />
                </Badge>
            ) : (
                <div className="conversation-item_box">
                    <div className="left-side-box">
                        <div
                            className="icon-users-group"
                            style={{ width: `${frameSize}px`, height: `${frameSize}px` }}
                        >
                            {totalMembers > 3 ? (
                                <div id="group-many-user">{groupAvatars}</div>
                            ) : (
                                <Avatar.Group maxCount={3} maxPopoverPlacement="none">
                                    {avatars}
                                </Avatar.Group>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

ConversationAvatar.propTypes = {
    demension: PropTypes.number,
    isGroupCard: PropTypes.bool,
    totalMembers: PropTypes.number.isRequired,
    type: PropTypes.bool.isRequired,
    name: PropTypes.string.isRequired,
    isActived: PropTypes.bool,
    avatar: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    sizeAvatar: PropTypes.number,
    frameSize: PropTypes.number,
    avatarColor: PropTypes.string,
};

export default ConversationAvatar;
