import { TagFilled } from '@ant-design/icons';
import PropTypes from 'prop-types';
import React from 'react';
import ConversationAvatar from '../../components/ConservationAvatar';
import ShortMessage from '../../components/ShortMessage';
import './style.css';

ConversationSingle.propTypes = {
    conversation: PropTypes.object,
    onClick: PropTypes.func,
};

function ConversationSingle({ conversation, onClick }) {
    const { _id, name, avatar, numberUnread, lastMessage, totalMembers, avatarColor } = conversation;
    const { type, createdAt } = lastMessage || {};

    const handleClick = () => {
        if (onClick) onClick(_id);
    };

    return (
        <div className='conversation-item_box' onClick={handleClick}>
            <div className='left-side-box'>
                <ConversationAvatar
                    totalMembers={totalMembers}
                    avatar={avatar}
                    type={conversation.type}
                    name={name}
                    avatarColor={avatarColor}
                />
            </div>

            {lastMessage && (
                <>
                    <div className='middle-side-box'>
                        <span className='name-box'>{name}</span>
                        <div className='lastest-message'>
                            <ShortMessage message={lastMessage} type={type} />
                        </div>
                    </div>

                    <div className='right-side-box'>
                        <span className='lastest-time'>{createdAt}</span>
                        <span className='message-count'>{numberUnread}</span>
                    </div>
                </>
            )}
        </div>
    );
}

export default ConversationSingle;
