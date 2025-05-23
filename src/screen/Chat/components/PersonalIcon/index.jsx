import { KeyOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Badge } from 'antd';
import PropTypes from 'prop-types';
import React from 'react';
import getSummaryName from '../../../../utils/nameHelper';
import './style.css';

PersonalIcon.propTypes = {
    avatar: PropTypes.string,
    isActive: PropTypes.bool,
    demention: PropTypes.number,
    common: PropTypes.bool,
    isHost: PropTypes.bool,
    name: PropTypes.string,
    color: PropTypes.string,
    noneUser: PropTypes.bool,
};

PersonalIcon.defaultProps = {
    avatar: '',
    isActive: false,
    demention: 48,
    common: true,
    isHost: false,
    name: '',
    color: '',
    noneUser: false,
};

function PersonalIcon({ avatar, isActive, demention, common, isHost, name, color, noneUser }) {
    // Xác định className dựa trên trạng thái
    const className = `user-icon ${common ? 'common' : ''} ${isActive ? '' : 'no-online'}`;

    // Xác định vị trí Badge (trạng thái hoạt động hoặc chủ phòng)
    const badgeOffset = isHost ? [-5, 36] : [-5, 40];

    // Xác định nội dung của Badge (biểu tượng chủ phòng)
    const badgeContent = isHost ? (
        <KeyOutlined
            style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '3.84px',
                borderRadius: '50%',
                color: 'yellow',
                fontSize: '14px',
            }}
        />
    ) : null;

    // Xác định nội dung Avatar
    let avatarComponent;
    if (noneUser) {
        avatarComponent = <Avatar style={{ backgroundColor: '#87d068' }} size={demention} icon={<UserOutlined />} />;
    } else if (avatar) {
        avatarComponent = <Avatar size={demention} src={avatar} />;
    } else {
        avatarComponent = (
            <Avatar size={demention} style={{ backgroundColor: color || '#4c92ff' }}>
                {getSummaryName(name)}
            </Avatar>
        );
    }

    return (
        <div className={className}>
            <Badge dot={isActive} offset={badgeOffset} color="green" count={badgeContent}>
                {avatarComponent}
            </Badge>
        </div>
    );
}

export default PersonalIcon;
