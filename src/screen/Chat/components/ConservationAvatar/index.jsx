import { UserOutlined } from '@ant-design/icons';
import { Avatar, Badge, Tooltip } from 'antd';
import DEFAULT_AVATAR from '../../../../assets/images/user.png';
import AvatarCustom from '../../../../components/AvatarCustom';
import PropTypes from 'prop-types';
import React from 'react';
import COVERSATION_STYLE from './ConservationAvatarStyle';
import './style.css';

ConversationAvatar.propTypes = {
    dimension: PropTypes.number,
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

ConversationAvatar.defaultProps = {
    dimension: 28,
    isGroupCard: false,
    isActived: false,
    avatar: '',
    sizeAvatar: 48,
    frameSize: 48,
    avatarColor: '',
};

function ConversationAvatar({
    avatar,
    dimension,
    isGroupCard,
    totalMembers,
    type,
    name,
    isActived,
    sizeAvatar,
    frameSize,
    avatarColor,
    onClick = null,
}) {
    const renderAvatar = () => {
        if (!Array.isArray(avatar) || totalMembers < 1) return null;
        return avatar.slice(0, totalMembers).map((user, index) => (
            <Avatar
                key={index}
                size={dimension}
                src={user?.avatar || undefined}
                icon={!user?.avatar ? <UserOutlined /> : undefined}
                style={{
                    backgroundColor: user?.avatar ? 'transparent' : user?.avatarColor,
                    ...(totalMembers === 3 && index === 2 ? COVERSATION_STYLE.styleGroup3(dimension) : {}),
                }}
            />
        ));
    };

    const renderGroupManyUser = () => {
        if (!Array.isArray(avatar) || totalMembers < 4) return null;
        return (
            <>
                {avatar.slice(0, 3).map((user, index) => (
                    <div key={index} className="per-user">
                        <Avatar
                            size={dimension}
                            src={user?.avatar || undefined}
                            icon={!user?.avatar ? <UserOutlined /> : undefined}
                            style={{
                                backgroundColor: user?.avatar ? 'transparent' : user?.avatarColor,
                                marginTop: index === 2 ? (dimension / 6) * -1 : 0,
                            }}
                        />
                    </div>
                ))}
                <div className="per-user">
                    <Tooltip placement="top">
                        <Avatar
                            size={dimension}
                            style={{
                                backgroundColor: '#7562d8',
                                color: '#fff',
                                marginTop: (dimension / 6) * -1,
                            }}
                        >
                            +{totalMembers - 3}
                        </Avatar>
                    </Tooltip>
                </div>
            </>
        );
    };

    const handleOnClick = (e) => {
        if (onClick) {
            onClick(e);
        }
    }
    
    return (
        <div className="avatar_conversation" onClick={handleOnClick}>
            {typeof avatar === 'string' ? (
                <Badge dot={isActived} offset={[-5, 40]} color="green">
                    <AvatarCustom size={sizeAvatar} src={avatar || DEFAULT_AVATAR} color={avatarColor} name={name} />
                </Badge>
            ) : (
                <div className="conversation-item_box">
                    <div className="left-side-box">
                        <div
                            className="icon-users-group"
                            style={{
                                width: `${frameSize}px`,
                                height: `${frameSize}px`,
                                ...(isGroupCard ? COVERSATION_STYLE.friendCardAvatar(dimension) : {}),
                            }}
                        >
                            {totalMembers > 3 ? (
                                <div id="group-many-user">{renderGroupManyUser()}</div>
                            ) : (
                                <Avatar.Group maxCount={3} maxPopoverPlacement="none">
                                    {renderAvatar()}
                                </Avatar.Group>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ConversationAvatar;
